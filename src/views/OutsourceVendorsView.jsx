import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { PRODUCTION_STATUS } from '../types';
import { CreateVendorModal } from '../components/modals/CreateVendorModal';
import EditVendorModal from '../components/modals/EditVendorModal';
import {
  Building2,
  Plus,
  Calculator,
  Check,
  Calendar,
  Scissors,
  Edit,
  Phone,
  Receipt,
  Eye,
  CreditCard,
  AlertCircle,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  CheckSquare
} from 'lucide-react';

export const OutsourceVendorsView = ({ initialTab = 'outsource-bills', onNavigate }) => {
  const {
    vendors,
    salesOrders,
    outsourceBills = [],
    outsourcePayments = [],
    createOutsourceBill,
    recordOutsourcePayment,
    updateVendorBill,
    updateItemProductionStatus
  } = useERP();

  // Active top-level sub-view tab
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab === 'outsource-jobs') return 'jobs';
    if (initialTab === 'vendors' || initialTab === 'suppliers') return 'vendors';
    return 'bills';
  });

  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [searchBillQuery, setSearchBillQuery] = useState('');
  const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  // Modals state
  const [viewingBill, setViewingBill] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreateBillOpen, setIsCreateBillOpen] = useState(false);
  const [selectedItemForLegacyBill, setSelectedItemForLegacyBill] = useState(null);

  // Payment Entry Form State (Vendor -> Bill Number -> Bill Details -> Payment)
  const [payForm, setPayForm] = useState({
    vendorId: '',
    billNumber: '',
    amount: '',
    paymentMethod: 'Cash',
    refNo: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [paymentError, setPaymentError] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Create Bill Form State
  const [createBillForm, setCreateBillForm] = useState({
    vendorId: '',
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    notes: '',
    workOrders: [
      { workOrder: '', description: '', amount: '' }
    ]
  });
  const [createBillError, setCreateBillError] = useState('');
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);

  // Legacy single item bill form
  const [legacyBillForm, setLegacyBillForm] = useState({
    actualBillAmount: 0,
    billDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Paid'
  });

  const statuses = [
    PRODUCTION_STATUS.NEW,
    PRODUCTION_STATUS.DESIGN,
    PRODUCTION_STATUS.PRINTING,
    PRODUCTION_STATUS.OUTSOURCE,
    PRODUCTION_STATUS.FINISHING,
    PRODUCTION_STATUS.QUALITY_CHECK,
    PRODUCTION_STATUS.READY,
    PRODUCTION_STATUS.DELIVERED
  ];

  // Extract all outsourced product line items (Product-Based Job Work)
  const outsourcedProductJobs = useMemo(() => {
    const list = [];
    (salesOrders || []).forEach((o) => {
      (o.items || []).forEach((it, idx) => {
        if (Array.isArray(it.outsourceJobs) && it.outsourceJobs.length > 0) {
          it.outsourceJobs.forEach((job, jIdx) => {
            if (job.vendorId) {
              const jcId = `${it.jobCardId || `JC-${o.id.split('-').pop()}-${idx + 1}`}-${jIdx + 1}`;
              list.push({
                jobCardId: jcId,
                orderId: o.id,
                customerName: o.customerName,
                orderDate: o.orderDate,
                deliveryDate: it.deliveryDate || o.deliveryDate,
                item: {
                  ...it,
                  vendorId: job.vendorId,
                  vendorName: job.vendorName,
                  processName: job.processName || 'Outsource Work',
                  estimatedVendorCost: parseFloat(job.estCost) || 0,
                  actualVendorBill: parseFloat(job.actualVendorBill) || 0
                }
              });
            }
          });
        } else if (it.outsource || it.vendorId) {
          const jcId = it.jobCardId || `JC-${o.id.split('-').pop()}-${idx + 1}`;
          list.push({
            jobCardId: jcId,
            orderId: o.id,
            customerName: o.customerName,
            orderDate: o.orderDate,
            deliveryDate: it.deliveryDate || o.deliveryDate,
            item: it
          });
        }
      });
    });
    return list;
  }, [salesOrders]);

  const filteredJobs = useMemo(() => {
    return vendorFilter === 'ALL'
      ? outsourcedProductJobs
      : outsourcedProductJobs.filter((j) => j.item.vendorId === vendorFilter);
  }, [outsourcedProductJobs, vendorFilter]);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return (outsourceBills || []).filter((b) => {
      const matchVendor = vendorFilter === 'ALL' || b.vendorId === vendorFilter;
      const matchSearch =
        !searchBillQuery ||
        (b.billNumber || '').toLowerCase().includes(searchBillQuery.toLowerCase()) ||
        (b.vendorName || '').toLowerCase().includes(searchBillQuery.toLowerCase()) ||
        (b.status || '').toLowerCase().includes(searchBillQuery.toLowerCase());
      return matchVendor && matchSearch;
    });
  }, [outsourceBills, vendorFilter, searchBillQuery]);

  // Selected Bill in Payment Form
  const selectedBillForPayment = useMemo(() => {
    if (!payForm.vendorId || !payForm.billNumber) return null;
    return (outsourceBills || []).find(
      (b) =>
        b.vendorId === payForm.vendorId &&
        b.billNumber.trim().toLowerCase() === payForm.billNumber.trim().toLowerCase()
    );
  }, [outsourceBills, payForm.vendorId, payForm.billNumber]);

  // Bills available for the selected vendor in payment form
  const vendorBillsForPayment = useMemo(() => {
    if (!payForm.vendorId) return [];
    return (outsourceBills || []).filter((b) => b.vendorId === payForm.vendorId);
  }, [outsourceBills, payForm.vendorId]);

  // Open Payment Modal for a specific bill
  const handleOpenPaymentModalForBill = (bill) => {
    setPayForm({
      vendorId: bill.vendorId,
      billNumber: bill.billNumber,
      amount: bill.outstandingAmount > 0 ? bill.outstandingAmount : '',
      paymentMethod: 'Cash',
      refNo: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPaymentError('');
    setIsPaymentModalOpen(true);
  };

  // Open General Payment Modal
  const handleOpenGeneralPaymentModal = () => {
    const defaultVendor = (vendors || [])[0]?.id || '';
    const defVendorBills = (outsourceBills || []).filter((b) => b.vendorId === defaultVendor);
    const defaultBill = defVendorBills[0]?.billNumber || '';
    const initialAmt = defVendorBills[0]?.outstandingAmount > 0 ? defVendorBills[0].outstandingAmount : '';

    setPayForm({
      vendorId: defaultVendor,
      billNumber: defaultBill,
      amount: initialAmt,
      paymentMethod: 'Cash',
      refNo: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setPaymentError('');
    setIsPaymentModalOpen(true);
  };

  // Handle vendor change in Payment form
  const handleVendorChangeInPayment = (vId) => {
    const vBills = (outsourceBills || []).filter((b) => b.vendorId === vId);
    const firstBill = vBills[0];
    setPayForm((prev) => ({
      ...prev,
      vendorId: vId,
      billNumber: firstBill ? firstBill.billNumber : '',
      amount: firstBill && firstBill.outstandingAmount > 0 ? firstBill.outstandingAmount : ''
    }));
    setPaymentError('');
  };

  // Handle bill change in Payment form
  const handleBillChangeInPayment = (billNo) => {
    const targetBill = (outsourceBills || []).find(
      (b) => b.vendorId === payForm.vendorId && b.billNumber === billNo
    );
    setPayForm((prev) => ({
      ...prev,
      billNumber: billNo,
      amount: targetBill && targetBill.outstandingAmount > 0 ? targetBill.outstandingAmount : ''
    }));
    setPaymentError('');
  };

  // Save Single Payment against Bill
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!selectedBillForPayment) {
      setPaymentError('Please select a valid Bill Number.');
      return;
    }

    const payAmt = Number(payForm.amount);
    if (!payAmt || payAmt <= 0) {
      setPaymentError('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    if (payAmt > selectedBillForPayment.outstandingAmount + 0.01) {
      setPaymentError(
        `Payment amount (₹${payAmt.toLocaleString('en-IN')}) cannot exceed current bill outstanding balance of ₹${selectedBillForPayment.outstandingAmount.toLocaleString('en-IN')}.`
      );
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError('');

    try {
      const res = await recordOutsourcePayment({
        billId: selectedBillForPayment.id,
        billNumber: selectedBillForPayment.billNumber,
        vendorId: selectedBillForPayment.vendorId,
        vendorName: selectedBillForPayment.vendorName,
        amount: payAmt,
        paymentMethod: payForm.paymentMethod,
        refNo: payForm.refNo,
        paymentDate: payForm.paymentDate,
        notes: payForm.notes
      });

      const pId = res?.paymentId || 'PAY-SUCCESS';
      alert(
        `Payment ${pId} of ₹${payAmt.toLocaleString('en-IN')} recorded successfully for Bill ${selectedBillForPayment.billNumber} (${selectedBillForPayment.vendorName})!\nRemaining Outstanding: ₹${Math.max(0, selectedBillForPayment.outstandingAmount - payAmt).toLocaleString('en-IN')}`
      );

      setIsPaymentModalOpen(false);
      if (viewingBill && viewingBill.id === selectedBillForPayment.id) {
        setViewingBill(null);
      }
    } catch (err) {
      setPaymentError(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Create Bill Handlers
  const handleOpenCreateBill = () => {
    const defaultVendor = (vendors || [])[0]?.id || '';
    setCreateBillForm({
      vendorId: defaultVendor,
      billNumber: '',
      billDate: new Date().toISOString().split('T')[0],
      notes: '',
      workOrders: [
        { workOrder: 'WO-001', description: 'Outsource Printing / Finishing', amount: '' }
      ]
    });
    setCreateBillError('');
    setIsCreateBillOpen(true);
  };

  const handleAddWorkOrderRow = () => {
    setCreateBillForm((prev) => ({
      ...prev,
      workOrders: [
        ...prev.workOrders,
        { workOrder: `WO-00${prev.workOrders.length + 1}`, description: '', amount: '' }
      ]
    }));
  };

  const handleRemoveWorkOrderRow = (index) => {
    if (createBillForm.workOrders.length <= 1) return;
    setCreateBillForm((prev) => ({
      ...prev,
      workOrders: prev.workOrders.filter((_, i) => i !== index)
    }));
  };

  const handleWorkOrderRowChange = (index, field, value) => {
    setCreateBillForm((prev) => {
      const updated = [...prev.workOrders];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, workOrders: updated };
    });
  };

  const handleSaveCreateBill = async (e) => {
    e.preventDefault();
    if (!createBillForm.vendorId) {
      setCreateBillError('Please select a vendor.');
      return;
    }
    if (!createBillForm.billNumber || !createBillForm.billNumber.trim()) {
      setCreateBillError('Please enter a Bill Number.');
      return;
    }

    const trimmedNo = createBillForm.billNumber.trim();
    // Duplicate check
    const isDup = (outsourceBills || []).some(
      (b) =>
        b.vendorId === createBillForm.vendorId &&
        b.billNumber.trim().toLowerCase() === trimmedNo.toLowerCase()
    );
    if (isDup) {
      setCreateBillError(
        `Duplicate Bill Number: A bill with number "${trimmedNo}" already exists for this vendor. Please specify a unique bill number.`
      );
      return;
    }

    const validWOs = (createBillForm.workOrders || [])
      .map((wo, i) => ({
        workOrder: wo.workOrder.trim() || `WO-00${i + 1}`,
        description: wo.description.trim() || 'Job Work',
        amount: Number(wo.amount) || 0
      }))
      .filter((wo) => wo.amount > 0);

    if (validWOs.length === 0) {
      setCreateBillError('Please enter at least 1 Work Order with an amount greater than ₹0.');
      return;
    }

    setIsSubmittingBill(true);
    setCreateBillError('');

    try {
      const selectedVendorObj = (vendors || []).find((v) => v.id === createBillForm.vendorId);
      await createOutsourceBill({
        vendorId: createBillForm.vendorId,
        vendorName: selectedVendorObj?.name || 'Outsource Vendor',
        billNumber: trimmedNo,
        billDate: createBillForm.billDate,
        notes: createBillForm.notes,
        workOrders: validWOs
      });

      alert(`Outsource Bill "${trimmedNo}" with ${validWOs.length} Work Orders created successfully!`);
      setIsCreateBillOpen(false);
    } catch (err) {
      setCreateBillError(err.message || 'Failed to create Outsource Bill.');
    } finally {
      setIsSubmittingBill(false);
    }
  };

  // Legacy single item bill handlers
  const handleOpenLegacyBillModal = (job) => {
    setSelectedItemForLegacyBill(job);
    setLegacyBillForm({
      actualBillAmount: job.item.actualVendorBill || job.item.estimatedVendorCost || 0,
      billDate: job.item.vendorBillDate || new Date().toISOString().split('T')[0],
      paymentStatus: job.item.vendorPaymentStatus || 'Paid'
    });
  };

  const handleSaveLegacyVendorBill = (e) => {
    e.preventDefault();
    if (!selectedItemForLegacyBill) return;

    updateVendorBill(
      selectedItemForLegacyBill.orderId,
      selectedItemForLegacyBill.item.id,
      legacyBillForm.actualBillAmount,
      legacyBillForm.billDate,
      legacyBillForm.paymentStatus
    );

    alert(`Vendor Bill updated for ${selectedItemForLegacyBill.jobCardId}`);
    setSelectedItemForLegacyBill(null);
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 800,
              margin: 0,
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Building2 size={24} color="#7c3aed" /> Outsource Work & Bills Management
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Consolidated vendor bills with multiple work orders, single payment entries, and ledger reconciliation
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenGeneralPaymentModal}
            className="btn btn-primary"
            style={{ background: '#059669', borderColor: '#059669', fontWeight: 700 }}
          >
            <CreditCard size={16} /> + Outsource Payment Entry
          </button>
          <button
            onClick={handleOpenCreateBill}
            className="btn btn-primary"
            style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700 }}
          >
            <Receipt size={16} /> + Create Outsource Bill
          </button>
          <button
            onClick={() => setIsCreateVendorOpen(true)}
            className="btn btn-secondary"
            style={{ fontWeight: 600 }}
          >
            <Plus size={16} /> + Add Vendor
          </button>
        </div>
      </div>

      {/* Top Section Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.25rem',
          overflowX: 'auto',
          paddingBottom: '0.2rem'
        }}
      >
        <button
          onClick={() => setActiveTab('bills')}
          style={{
            padding: '0.55rem 1.1rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'bills' ? '3px solid #7c3aed' : '3px solid transparent',
            color: activeTab === 'bills' ? '#7c3aed' : '#64748b',
            fontWeight: activeTab === 'bills' ? 800 : 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Receipt size={16} /> Outsource Bills & Payments ({outsourceBills.length})
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '0.55rem 1.1rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'jobs' ? '3px solid #7c3aed' : '3px solid transparent',
            color: activeTab === 'jobs' ? '#7c3aed' : '#64748b',
            fontWeight: activeTab === 'jobs' ? 800 : 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Scissors size={16} /> Work Orders / Job Cards ({outsourcedProductJobs.length})
        </button>

        <button
          onClick={() => setActiveTab('vendors')}
          style={{
            padding: '0.55rem 1.1rem',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'vendors' ? '3px solid #7c3aed' : '3px solid transparent',
            color: activeTab === 'vendors' ? '#7c3aed' : '#64748b',
            fontWeight: activeTab === 'vendors' ? 800 : 600,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Building2 size={16} /> Vendors Directory ({(vendors || []).length})
        </button>
      </div>

      {/* Vendor Filter Ribbon */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          background: '#f8fafc',
          padding: '0.65rem 0.85rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}
      >
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Filter Vendor:</span>
        <button
          onClick={() => setVendorFilter('ALL')}
          className="btn btn-sm"
          style={{
            background: vendorFilter === 'ALL' ? '#7c3aed' : '#ffffff',
            color: vendorFilter === 'ALL' ? '#ffffff' : '#334155',
            borderColor: vendorFilter === 'ALL' ? '#7c3aed' : '#cbd5e1',
            fontSize: '0.75rem',
            fontWeight: 700
          }}
        >
          All Vendors ({(outsourceBills || []).length} Bills)
        </button>
        {(vendors || []).map((v) => {
          const vBills = (outsourceBills || []).filter((b) => b.vendorId === v.id);
          return (
            <button
              key={v.id}
              onClick={() => setVendorFilter(v.id)}
              className="btn btn-sm"
              style={{
                background: vendorFilter === v.id ? '#7c3aed' : '#ffffff',
                color: vendorFilter === v.id ? '#ffffff' : '#334155',
                borderColor: vendorFilter === v.id ? '#7c3aed' : '#cbd5e1',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {v.name} ({vBills.length})
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OUTSOURCE BILLS & BILL-BASED PAYMENTS LIST (PRIMARY USER FOCUS)    */}
      {/* ========================================================================= */}
      {activeTab === 'bills' && (
        <div>
          {/* KPI Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            <div className="card" style={{ borderLeft: '4px solid #7c3aed', padding: '1rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                TOTAL OUTSOURCE BILLS
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                ₹{filteredBills.reduce((s, b) => s + (b.totalAmount || 0), 0).toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600 }}>
                {filteredBills.length} Consolidated Vendor Bills
              </span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #059669', padding: '1rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>TOTAL PAID</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                ₹{filteredBills.reduce((s, b) => s + (b.paidAmount || 0), 0).toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                Single Transaction Payments Recorded
              </span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #e11d48', padding: '1rem' }}>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700 }}>
                OUTSTANDING PAYABLES
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e11d48', marginTop: '0.2rem' }}>
                ₹{filteredBills.reduce((s, b) => s + (b.outstandingAmount || 0), 0).toLocaleString('en-IN')}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#e11d48', fontWeight: 600 }}>
                Pending Vendor Bill Payments
              </span>
            </div>
          </div>

          {/* Bill Table Card */}
          <div className="card" style={{ padding: 0 }}>
            <div
              className="card-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid #e2e8f0',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}
            >
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={18} color="#7c3aed" /> Outsource Bills Register (Vendor → Bill Number → Payment)
              </div>
              <div style={{ width: '260px', position: 'relative' }}>
                <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Search Bill No, Vendor..."
                  value={searchBillQuery}
                  onChange={(e) => setSearchBillQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Bill No.</th>
                    <th>Vendor</th>
                    <th style={{ textAlign: 'center' }}>Work Orders</th>
                    <th style={{ textAlign: 'right' }}>Bill Amount</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Outstanding</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                        No Outsource Bills found. Click <strong>"+ Create Outsource Bill"</strong> to log a consolidated vendor bill.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => {
                      const isFullyPaid = b.outstandingAmount <= 0;
                      return (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 800, color: '#7c3aed' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Receipt size={14} />
                              {b.billNumber}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Date: {b.billDate}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.vendorName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className="badge badge-violet"
                              style={{ cursor: 'pointer' }}
                              onClick={() => setViewingBill(b)}
                              title="Click to view work orders"
                            >
                              {b.workOrderCount || (b.workOrders || []).length} WOs
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            ₹{(b.totalAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                            ₹{(b.paidAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 800,
                              color: isFullyPaid ? '#059669' : '#e11d48'
                            }}
                          >
                            ₹{(b.outstandingAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              className={`badge ${
                                isFullyPaid
                                  ? 'badge-emerald'
                                  : b.paidAmount > 0
                                  ? 'badge-amber'
                                  : 'badge-rose'
                              }`}
                            >
                              {b.status || (isFullyPaid ? 'Paid' : b.paidAmount > 0 ? 'Partially Paid' : 'Unpaid')}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                              <button
                                onClick={() => setViewingBill(b)}
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                title="View Bill & Payment History"
                              >
                                <Eye size={13} /> View
                              </button>

                              {isFullyPaid ? (
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    color: '#059669',
                                    padding: '0.25rem 0.5rem',
                                    background: '#dcfce7',
                                    borderRadius: '4px'
                                  }}
                                >
                                  Paid ✓
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleOpenPaymentModalForBill(b)}
                                  className="btn btn-sm btn-primary"
                                  style={{
                                    background: '#059669',
                                    borderColor: '#059669',
                                    padding: '0.25rem 0.65rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                  }}
                                  title="Record single payment against this bill"
                                >
                                  <CreditCard size={13} /> Payment
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: OUTSOURCED WORK ORDERS / JOB CARDS REGISTER                        */}
      {/* ========================================================================= */}
      {activeTab === 'jobs' && (
        <div className="card" style={{ padding: 0 }}>
          <div
            className="card-header"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.25rem'
            }}
          >
            <div className="card-title">
              <Scissors size={18} color="#7c3aed" /> Outsourced Work Orders & Job Cards
            </div>
            <span className="badge badge-violet">{filteredJobs.length} Outsourced Products</span>
          </div>

          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Job Card #</th>
                  <th>SO #</th>
                  <th>Customer</th>
                  <th>Outsourced Product</th>
                  <th>Assigned Vendor</th>
                  <th>Delivery Date</th>
                  <th>Est. Cost</th>
                  <th>Actual Bill</th>
                  <th>Stage Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No outsourced product jobs found for this selection.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 800, color: '#7c3aed' }}>{job.jobCardId}</td>
                      <td style={{ fontWeight: 700, color: '#1e40af' }}>{job.orderId}</td>
                      <td style={{ fontWeight: 700 }}>{job.customerName}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{job.item.productName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                          Size: {job.item.width && job.item.height ? `${job.item.width}×${job.item.height} ${job.item.unit}` : job.item.unit} | Qty: {job.item.qty}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-violet">{job.item.vendorName || 'Outsource Vendor'}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#d97706' }}>{job.deliveryDate}</td>
                      <td>₹{job.item.estimatedVendorCost || 0}</td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>₹{job.item.actualVendorBill || 0}</td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          style={{ fontSize: '0.74rem', fontWeight: 800 }}
                          value={job.item.productionStatus || PRODUCTION_STATUS.OUTSOURCE}
                          onChange={(e) => updateItemProductionStatus(job.orderId, job.item.id, e.target.value)}
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenLegacyBillModal(job)}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '0.75rem' }}
                        >
                          <Calculator size={13} /> Reconcile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VENDORS DIRECTORY                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'vendors' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {(vendors || []).map((v) => {
            const vJobs = outsourcedProductJobs.filter((j) => j.item.vendorId === v.id);
            const vBills = (outsourceBills || []).filter((b) => b.vendorId === v.id);
            const totalBillAmt = vBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
            const totalOutAmt = vBills.reduce((s, b) => s + (b.outstandingAmount || 0), 0);

            return (
              <div
                key={v.id}
                className="card"
                style={{
                  borderTop: '4px solid #7c3aed',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{v.name}</div>
                  <button
                    type="button"
                    onClick={() => setEditingVendor(v)}
                    className="btn btn-sm btn-secondary"
                    style={{ border: 'none', color: '#7c3aed', padding: '0.2rem 0.4rem' }}
                    title="Edit Supplier / Vendor"
                  >
                    <Edit size={14} />
                  </button>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {v.category || 'Outsource Vendor'} | Active Jobs: {vJobs.length}
                </div>
                {v.mobile && (
                  <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                    <Phone size={12} color="#2563eb" /> {v.mobile}
                  </div>
                )}
                <div style={{ marginTop: '0.6rem', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <div>Total Billed: <strong>₹{totalBillAmt.toLocaleString('en-IN')}</strong> ({vBills.length} Bills)</div>
                  <div style={{ color: totalOutAmt > 0 ? '#e11d48' : '#059669', fontWeight: 700, marginTop: '0.2rem' }}>
                    Outstanding: ₹{totalOutAmt.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      setVendorFilter(v.id);
                      setActiveTab('bills');
                    }}
                    className="btn btn-sm btn-primary"
                    style={{ flex: 1, background: '#7c3aed', borderColor: '#7c3aed', fontSize: '0.75rem' }}
                  >
                    View Bills
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: OUTSOURCE PAYMENT ENTRY MODAL (SECTION 2, 3, 12 OF USER PROMPT)  */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPaymentModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px', width: '92%' }}
          >
            <div
              className="modal-header"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff' }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} /> Outsource Payment Entry
              </h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
                {paymentError && (
                  <div
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #f87171',
                      color: '#b91c1c',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* 1. Vendor Selection */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Vendor / Worker <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  <select
                    className="form-select"
                    value={payForm.vendorId}
                    onChange={(e) => handleVendorChangeInPayment(e.target.value)}
                    required
                  >
                    <option value="">[ Select Vendor ]</option>
                    {(vendors || []).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.pendingPayment ? `(₹${v.pendingPayment.toLocaleString('en-IN')} Due)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Bill Number Selection */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Bill Number <span style={{ color: '#e11d48' }}>*</span>
                  </label>
                  {vendorBillsForPayment.length > 0 ? (
                    <select
                      className="form-select"
                      value={payForm.billNumber}
                      onChange={(e) => handleBillChangeInPayment(e.target.value)}
                      required
                    >
                      <option value="">[ Select Bill Number ]</option>
                      {vendorBillsForPayment.map((b) => (
                        <option key={b.id} value={b.billNumber}>
                          {b.billNumber} — Total: ₹{b.totalAmount.toLocaleString('en-IN')} | Outstanding: ₹{b.outstandingAmount.toLocaleString('en-IN')} ({b.status})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', padding: '0.4rem 0' }}>
                      No bills found for this vendor. Please create a bill first.
                    </div>
                  )}
                </div>

                {/* 3. Automatically Loaded Bill Information Card */}
                {selectedBillForPayment && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Bill Date:</span>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                          {selectedBillForPayment.billDate}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Work Orders:</span>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#7c3aed' }}>
                          {selectedBillForPayment.workOrderCount || (selectedBillForPayment.workOrders || []).length} Orders
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Total Bill Amount:</span>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          ₹{selectedBillForPayment.totalAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Already Paid:</span>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#059669' }}>
                          ₹{selectedBillForPayment.paidAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Current Outstanding:</span>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#e11d48' }}>
                          ₹{selectedBillForPayment.outstandingAmount.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Section 3: SHOW INCLUDED WORK ORDERS (Read-Only) */}
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                        Included Work Orders in this Bill:
                      </span>
                      <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                            <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left' }}>Work Order</th>
                            <th style={{ padding: '0.3rem 0.5rem', textAlign: 'left' }}>Description</th>
                            <th style={{ padding: '0.3rem 0.5rem', textAlign: 'right' }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedBillForPayment.workOrders || []).map((wo, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.3rem 0.5rem', fontWeight: 700, color: '#7c3aed' }}>
                                {wo.workOrder || wo.jobCardId || `WO-${i + 1}`}
                              </td>
                              <td style={{ padding: '0.3rem 0.5rem', color: '#475569' }}>
                                {wo.description || wo.productName || 'Outsource Work'}
                              </td>
                              <td style={{ padding: '0.3rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>
                                ₹{Number(wo.amount || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '1px solid #cbd5e1' }}>
                            <td colSpan="2" style={{ padding: '0.35rem 0.5rem' }}>Total</td>
                            <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: '#0f172a' }}>
                              ₹{selectedBillForPayment.totalAmount.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. Payment Amount Input with quick Pay Full chip */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      Payment Amount (₹) <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    {selectedBillForPayment && selectedBillForPayment.outstandingAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayForm((prev) => ({ ...prev, amount: selectedBillForPayment.outstandingAmount }))}
                        style={{
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#047857',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Pay Full (₹{selectedBillForPayment.outstandingAmount.toLocaleString('en-IN')})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={selectedBillForPayment?.outstandingAmount || 9999999}
                    placeholder="Enter payment amount"
                    className="form-control"
                    style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}
                    value={payForm.amount}
                    onChange={(e) => {
                      setPayForm({ ...payForm, amount: e.target.value });
                      setPaymentError('');
                    }}
                    required
                  />
                </div>

                {/* 5. Payment Method */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Payment Method</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {['Cash', 'Bank', 'UPI', 'Other'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPayForm({ ...payForm, paymentMethod: method })}
                        style={{
                          padding: '0.5rem',
                          border: payForm.paymentMethod === method ? '2px solid #059669' : '1px solid #cbd5e1',
                          background: payForm.paymentMethod === method ? '#ecfdf5' : '#ffffff',
                          color: payForm.paymentMethod === method ? '#047857' : '#475569',
                          fontWeight: 700,
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6. Reference No. and Payment Date in 2 columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Reference No.</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR / Cheque / Slip #"
                      className="form-control"
                      value={payForm.refNo}
                      onChange={(e) => setPayForm({ ...payForm, refNo: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>Payment Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={payForm.paymentDate}
                      onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* 7. Notes */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="Optional transaction remarks..."
                    className="form-control"
                    value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#059669', borderColor: '#059669', fontWeight: 800 }}
                  disabled={isSubmittingPayment || !selectedBillForPayment}
                >
                  <Check size={16} /> {isSubmittingPayment ? 'Saving Payment...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW BILL DETAILS & PAYMENT HISTORY (SECTION 9 OF USER PROMPT)   */}
      {/* ========================================================================= */}
      {viewingBill && (
        <div className="modal-overlay" onClick={() => setViewingBill(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '620px', width: '92%' }}
          >
            <div
              className="modal-header"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff' }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={20} /> Bill: {viewingBill.billNumber}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#ddd6fe' }}>
                  Vendor: {viewingBill.vendorName} | Bill Date: {viewingBill.billDate}
                </span>
              </div>
              <button
                onClick={() => setViewingBill(null)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', padding: '1.25rem' }}>
              {/* Top KPI Banner */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  background: '#f8fafc',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Bill Amount</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    ₹{(viewingBill.totalAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Total Paid</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>
                    ₹{(viewingBill.paidAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>Outstanding</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: viewingBill.outstandingAmount <= 0 ? '#059669' : '#e11d48' }}>
                    ₹{(viewingBill.outstandingAmount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Work Orders Included in Bill */}
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>
                  Work Orders in Bill ({viewingBill.workOrderCount || (viewingBill.workOrders || []).length})
                </h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Work Order</th>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Description</th>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingBill.workOrders || []).map((wo, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '0.4rem 0.6rem', fontWeight: 700, color: '#7c3aed' }}>
                            {wo.workOrder || wo.jobCardId || `WO-${i + 1}`}
                          </td>
                          <td style={{ padding: '0.4rem 0.6rem', color: '#475569' }}>
                            {wo.description || wo.productName || 'Outsource Work'}
                          </td>
                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontWeight: 700 }}>
                            ₹{Number(wo.amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 9: PAYMENT HISTORY */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <CreditCard size={15} color="#059669" /> Payment History
                  </h4>
                  <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {(viewingBill.payments || []).length} Transaction(s)
                  </span>
                </div>

                {(viewingBill.payments && viewingBill.payments.length > 0) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {viewingBill.payments.map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.55rem 0.75rem',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '6px',
                          fontSize: '0.82rem'
                        }}
                      >
                        <div>
                          <strong style={{ color: '#047857' }}>{p.id}</strong>
                          <span style={{ margin: '0 0.4rem', color: '#94a3b8' }}>—</span>
                          <span style={{ color: '#1e293b', fontWeight: 700 }}>₹{Number(p.amount).toLocaleString('en-IN')}</span>
                          <span style={{ margin: '0 0.4rem', color: '#94a3b8' }}>—</span>
                          <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>{p.paymentMethod || 'Cash'}</span>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {p.paymentDate || p.createdAt?.split('T')[0]}
                          {p.refNo && <span style={{ marginLeft: '0.3rem', color: '#475569' }}>({p.refNo})</span>}
                        </div>
                      </div>
                    ))}

                    <div
                      style={{
                        marginTop: '0.25rem',
                        padding: '0.5rem 0.75rem',
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem'
                      }}
                    >
                      <span><strong>Total Paid:</strong> ₹{(viewingBill.paidAmount || 0).toLocaleString('en-IN')}</span>
                      <span style={{ color: viewingBill.outstandingAmount > 0 ? '#e11d48' : '#059669', fontWeight: 800 }}>
                        <strong>Outstanding:</strong> ₹{(viewingBill.outstandingAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '1rem', textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#94a3b8', fontSize: '0.82rem' }}>
                    No payments have been recorded against this bill yet.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setViewingBill(null)} className="btn btn-secondary">
                Close
              </button>
              {viewingBill.outstandingAmount > 0 && (
                <button
                  onClick={() => {
                    const b = viewingBill;
                    setViewingBill(null);
                    handleOpenPaymentModalForBill(b);
                  }}
                  className="btn btn-primary"
                  style={{ background: '#059669', borderColor: '#059669', fontWeight: 700 }}
                >
                  <CreditCard size={15} /> Make Payment (₹{viewingBill.outstandingAmount.toLocaleString('en-IN')})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE OUTSOURCE BILL (BUNDLING MULTIPLE WORK ORDERS)            */}
      {/* ========================================================================= */}
      {isCreateBillOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateBillOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '620px', width: '92%' }}
          >
            <div
              className="modal-header"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff' }}
            >
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Receipt size={18} /> Create Outsource Bill
              </h3>
              <button
                onClick={() => setIsCreateBillOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCreateBill}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', padding: '1.25rem' }}>
                {createBillError && (
                  <div
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #f87171',
                      color: '#b91c1c',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>{createBillError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Vendor / Supplier <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <select
                      className="form-select"
                      value={createBillForm.vendorId}
                      onChange={(e) => {
                        setCreateBillForm({ ...createBillForm, vendorId: e.target.value });
                        setCreateBillError('');
                      }}
                      required
                    >
                      <option value="">[ Select Vendor ]</option>
                      {(vendors || []).map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Vendor Bill No. <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BILL-125, INV-990"
                      className="form-control"
                      value={createBillForm.billNumber}
                      onChange={(e) => {
                        setCreateBillForm({ ...createBillForm, billNumber: e.target.value });
                        setCreateBillError('');
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Bill Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={createBillForm.billDate}
                    onChange={(e) => setCreateBillForm({ ...createBillForm, billDate: e.target.value })}
                    required
                  />
                </div>

                {/* Work Orders List Input */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                      Work Orders Included in this Bill:
                    </label>
                    <button
                      type="button"
                      onClick={handleAddWorkOrderRow}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem' }}
                    >
                      + Add Work Order
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {createBillForm.workOrders.map((wo, index) => (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 100px 30px', gap: '0.4rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="e.g. WO-001"
                          className="form-control form-control-sm"
                          value={wo.workOrder}
                          onChange={(e) => handleWorkOrderRowChange(index, 'workOrder', e.target.value)}
                          required
                        />
                        <input
                          type="text"
                          placeholder="Work description / process..."
                          className="form-control form-control-sm"
                          value={wo.description}
                          onChange={(e) => handleWorkOrderRowChange(index, 'description', e.target.value)}
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="₹ Amount"
                          className="form-control form-control-sm"
                          style={{ textAlign: 'right', fontWeight: 700 }}
                          value={wo.amount}
                          onChange={(e) => handleWorkOrderRowChange(index, 'amount', e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveWorkOrderRow(index)}
                          disabled={createBillForm.workOrders.length <= 1}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: createBillForm.workOrders.length <= 1 ? '#cbd5e1' : '#e11d48',
                            cursor: createBillForm.workOrders.length <= 1 ? 'default' : 'pointer',
                            fontSize: '1rem',
                            padding: 0
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 800,
                      fontSize: '0.88rem'
                    }}
                  >
                    <span>Total Bill Amount ({createBillForm.workOrders.length} Work Orders):</span>
                    <span style={{ color: '#7c3aed' }}>
                      ₹{createBillForm.workOrders.reduce((sum, wo) => sum + (Number(wo.amount) || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="Optional notes..."
                    className="form-control"
                    value={createBillForm.notes}
                    onChange={(e) => setCreateBillForm({ ...createBillForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateBillOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmittingBill}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#7c3aed', borderColor: '#7c3aed', fontWeight: 800 }}
                  disabled={isSubmittingBill}
                >
                  <Check size={16} /> {isSubmittingBill ? 'Saving Bill...' : 'Save Outsource Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: LEGACY LOG VENDOR BILL (PRESERVES EXISTING RECONCILIATION)        */}
      {/* ========================================================================= */}
      {selectedItemForLegacyBill && (
        <div className="modal-overlay" onClick={() => setSelectedItemForLegacyBill(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Log Vendor Bill — {selectedItemForLegacyBill.jobCardId}</h3>
              <button onClick={() => setSelectedItemForLegacyBill(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleSaveLegacyVendorBill}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
                <div style={{ background: '#f5f3ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd6fe', fontSize: '0.85rem' }}>
                  <div>Job Card #: <strong>{selectedItemForLegacyBill.jobCardId}</strong> (SO: {selectedItemForLegacyBill.orderId})</div>
                  <div>Vendor: <strong>{selectedItemForLegacyBill.item.vendorName}</strong></div>
                  <div>Product: <strong>{selectedItemForLegacyBill.item.productName}</strong></div>
                  <div>Initial Est Cost: <strong>₹{selectedItemForLegacyBill.item.estimatedVendorCost}</strong></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Actual Vendor Invoice Bill Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed' }}
                    value={legacyBillForm.actualBillAmount}
                    onChange={(e) => setLegacyBillForm({ ...legacyBillForm, actualBillAmount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label"><Calendar size={14} /> Vendor Invoice Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={legacyBillForm.billDate}
                    onChange={(e) => setLegacyBillForm({ ...legacyBillForm, billDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vendor Payment Status</label>
                  <select
                    className="form-select"
                    value={legacyBillForm.paymentStatus}
                    onChange={(e) => setLegacyBillForm({ ...legacyBillForm, paymentStatus: e.target.value })}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Unpaid">Unpaid / Pending</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedItemForLegacyBill(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
                  <Check size={16} /> Save & Recalculate Profit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Profile Creation & Edit Modals */}
      <CreateVendorModal
        isOpen={isCreateVendorOpen}
        onClose={() => setIsCreateVendorOpen(false)}
        onVendorCreated={(v) => {
          setVendorFilter(v.id);
          setIsCreateVendorOpen(false);
        }}
      />

      <EditVendorModal
        isOpen={!!editingVendor}
        vendor={editingVendor}
        onClose={() => setEditingVendor(null)}
      />
    </div>
  );
};
