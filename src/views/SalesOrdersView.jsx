import React, { useState, useEffect } from 'react';
import { useERP } from '../context/ERPContext';
import { CUSTOMER_TYPES, TAX_TYPES, PAYMENT_METHODS, DEFAULT_UNITS, MATERIAL_PRESETS, PRODUCTION_STATUS } from '../types';
import { CreateCustomerModal } from '../components/modals/CreateCustomerModal';
import { CreateProductModal } from '../components/modals/CreateProductModal';
import CreateCareOfModal from '../components/modals/CreateCareOfModal';
import { JobCardPrintModal } from '../components/modals/JobCardPrintModal';
import { TaxInvoicePrintModal } from '../components/modals/TaxInvoicePrintModal';
import { handleSendWhatsApp } from '../utils/whatsapp';
import {
  Plus,
  Search,
  ShoppingCart,
  User,
  UserPlus,
  Trash2,
  Check,
  Printer,
  FileText,
  DollarSign,
  Calculator,
  ArrowLeft,
  Calendar,
  Building,
  Building2,
  Clock,
  ShieldAlert,
  Sliders,
  Scissors,
  Edit,
  UserCheck,
  MessageSquare
} from 'lucide-react';

export const SalesOrdersView = ({ initialCreate = false, initialSelectId = null }) => {
  const {
    salesOrders,
    customers,
    products,
    salesPersons,
    careOfPersons,
    designers,
    vendors,
    companyBankAccounts,
    companyProfile,
    activeUser,
    trackWhatsAppSent,
    createSalesOrder,
    updateSalesOrder,
    updateVendorBill
  } = useERP();

  const [viewMode, setViewMode] = useState(initialCreate ? 'create' : 'list');
  const [selectedOrderId, setSelectedOrderId] = useState(initialSelectId);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [activeTabFilter, setActiveTabFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateCustModalOpen, setIsCreateCustModalOpen] = useState(false);
  const [isCreateProdModalOpen, setIsCreateProdModalOpen] = useState(false);
  const [isCreateCareOfModalOpen, setIsCreateCareOfModalOpen] = useState(false);
  const [activeProdTargetIndex, setActiveProdTargetIndex] = useState(0);
  const [printJobCardOrder, setPrintJobCardOrder] = useState(null);
  const [printInvoiceOrder, setPrintInvoiceOrder] = useState(null);

  // Form State for New Sales Order
  const [custSearchTerm, setCustSearchTerm] = useState('');
  const [selectedCust, setSelectedCust] = useState(null);

  const [orderHeader, setOrderHeader] = useState({
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    salesPersonId: salesPersons[0]?.id || '',
    salesPersonName: salesPersons[0]?.name || '',
    careOfId: careOfPersons[0]?.id || '',
    careOfName: careOfPersons[0]?.name || '',
    orderSource: 'Walk-in Counter',
    referenceNo: '',
    remarks: '',
    taxMode: TAX_TYPES.ETR
  });

  const [items, setItems] = useState([
    {
      id: 1,
      productName: products[0]?.name || 'Star Flex Banner Printing (240gsm Frontlit)',
      customTitle: '',
      description: '',
      width: 10,
      height: 4,
      unit: 'Sq.Ft',
      qty: 1,
      deliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      material: MATERIAL_PRESETS[0],
      designerRequired: 'NO',
      designerId: '',
      designerName: '',
      outsource: false,
      vendorId: '',
      vendorName: '',
      estimatedCost: products[0]?.estimatedCost || 7.5,
      internalEstOutsourceCost: 0,
      actualVendorBill: 0,
      sellingRate: products[0]?.defaultRate || 15,
      discount: 0,
      gstRate: 18,
      isCustom: false
    }
  ]);

  const [paymentInfo, setPaymentInfo] = useState({
    advanceAmount: 0,
    paymentMethod: PAYMENT_METHODS.UPI,
    bankAccountId: '',
    bankAccountName: ''
  });

  // Open specific order if passed via prop
  useEffect(() => {
    if (initialSelectId) {
      setSelectedOrderId(initialSelectId);
      setViewMode('detail');
    }
  }, [initialSelectId]);

  // Customer search lookup
  const filteredCusts = custSearchTerm.trim()
    ? customers.filter(
        (c) =>
          c.mobile.includes(custSearchTerm) ||
          c.name.toLowerCase().includes(custSearchTerm.toLowerCase()) ||
          c.code.toLowerCase().includes(custSearchTerm.toLowerCase())
      )
    : [];

  const handleSelectCustomer = (cust) => {
    setSelectedCust(cust);
    setCustSearchTerm(`${cust.name} (${cust.mobile})`);
  };

  // Handle Edit Order action
  const handleEditOrder = (order) => {
    setEditingOrderId(order.id);
    const cust = customers.find((c) => c.id === order.customerId);
    if (cust) {
      setSelectedCust(cust);
      setCustSearchTerm(`${cust.name} (${cust.mobile})`);
    } else {
      setSelectedCust({
        id: order.customerId,
        name: order.customerName,
        mobile: order.customerMobile,
        state: order.customerState || 'Maharashtra (27)',
        outstanding: 0,
        creditLimit: 0,
        type: 'Customer'
      });
      setCustSearchTerm(order.customerName);
    }
    setOrderHeader({
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      salesPersonId: order.salesPersonId || salesPersons[0]?.id || '',
      salesPersonName: order.salesPersonName || '',
      careOfId: order.careOfId || careOfPersons[0]?.id || '',
      careOfName: order.careOfName || '',
      orderSource: order.orderSource || 'Walk-in Counter',
      referenceNo: order.referenceNo || '',
      remarks: order.remarks || '',
      taxMode: order.taxMode || TAX_TYPES.ETR
    });
    setItems(
      order.items.map((it, idx) => ({
        id: idx + 1,
        productName: it.productName,
        customTitle: it.customTitle || '',
        description: it.description || '',
        width: it.width || 0,
        height: it.height || 0,
        unit: it.unit || 'Sq.Ft',
        qty: it.qty || 1,
        deliveryDate: it.deliveryDate || order.deliveryDate,
        material: it.material || MATERIAL_PRESETS[0],
        designerRequired: it.designerRequired || 'NO',
        designerId: it.designerId || '',
        designerName: it.designerName || '',
        outsource: it.outsource || false,
        vendorId: it.vendorId || '',
        vendorName: it.vendorName || '',
        estimatedCost: it.estimatedCost || 0,
        internalEstOutsourceCost: it.internalEstOutsourceCost || 0,
        actualVendorBill: it.actualVendorBill || 0,
        sellingRate: it.sellingRate || 0,
        discount: it.discount || 0,
        gstRate: it.gstRate || 18,
        isCustom: it.isCustom || (it.productName && it.productName.includes('Custom'))
      }))
    );
    setPaymentInfo({
      advanceAmount: order.advanceAmount || 0,
      paymentMethod: order.paymentMethod || PAYMENT_METHODS.UPI,
      bankAccountId: order.bankAccountId || '',
      bankAccountName: order.bankAccountName || ''
    });
    setViewMode('create');
  };

  // Add Product Row
  const addProductRow = () => {
    const p = products[0];
    setItems((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        productName: p?.name || 'Star Flex Banner Printing (240gsm Frontlit)',
        customTitle: '',
        description: '',
        width: 4,
        height: 3,
        unit: 'Sq.Ft',
        qty: 1,
        deliveryDate: orderHeader.deliveryDate,
        material: MATERIAL_PRESETS[0],
        designerRequired: 'NO',
        designerId: '',
        designerName: '',
        outsource: false,
        vendorId: '',
        vendorName: '',
        estimatedCost: p?.estimatedCost || 10,
        internalEstOutsourceCost: 0,
        actualVendorBill: 0,
        sellingRate: p?.defaultRate || 20,
        discount: 0,
        gstRate: 18,
        isCustom: false
      }
    ]);
  };

  // Remove Product Row
  const removeProductRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Line item calculation helper (ORDER-BASED TAX MODE: ETR, ITR, NTR)
  const calculateItemAmount = (item) => {
    const w = parseFloat(item.width) || 0;
    const h = parseFloat(item.height) || 0;
    const qty = parseFloat(item.qty) || 1;
    const rate = parseFloat(item.sellingRate) || 0;
    const disc = parseFloat(item.discount) || 0;
    const itemGstRate = parseFloat(item.gstRate) || 18;
    const tType = orderHeader.taxMode || TAX_TYPES.ETR;

    let sqft = 0;
    if (item.unit === 'Sq.Ft') sqft = w * h * qty;
    else if (item.unit === 'Sq.Inch') sqft = (w * h * qty) / 144;
    else if (item.unit === 'Sq.Meter') sqft = w * h * qty * 10.7639;

    let grossLineTotal = 0;
    if (item.unit && item.unit.startsWith('Sq')) {
      grossLineTotal = Math.max(0, (sqft * rate) - disc);
    } else {
      grossLineTotal = Math.max(0, (qty * rate) - disc);
    }

    let taxableVal = grossLineTotal;
    let gstVal = 0;

    if (tType.includes('ITR')) {
      // Inclusive Tax: GST is included inside grossLineTotal
      taxableVal = grossLineTotal / (1 + (itemGstRate / 100));
      gstVal = grossLineTotal - taxableVal;
    } else if (tType.includes('NTR')) {
      // No Tax: GST is 0
      taxableVal = grossLineTotal;
      gstVal = 0;
    } else {
      // ETR (Exclusive Tax): GST is added on top
      taxableVal = grossLineTotal;
      gstVal = grossLineTotal * (itemGstRate / 100);
    }

    const estCost = (parseFloat(item.estimatedCost) || 0) * (item.unit && item.unit.startsWith('Sq') ? sqft : qty);
    return {
      sqft: parseFloat(sqft.toFixed(2)),
      grossLineTotal,
      taxableVal,
      gstVal,
      estCost
    };
  };

  // Form Summary Totals
  let totalTaxable = 0;
  let totalGst = 0;
  let totalEstCost = 0;

  items.forEach((item) => {
    const calc = calculateItemAmount(item);
    totalTaxable += calc.taxableVal;
    totalGst += calc.gstVal;
    totalEstCost += calc.estCost;
  });

  const isInterstate = selectedCust?.state && !selectedCust.state.includes('Maharashtra');
  const cgst = isInterstate ? 0 : totalGst / 2;
  const sgst = isInterstate ? 0 : totalGst / 2;
  const igst = isInterstate ? totalGst : 0;

  const subtotal = parseFloat(totalTaxable.toFixed(2));
  const rawGrandTotal = subtotal + cgst + sgst + igst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = parseFloat((grandTotal - rawGrandTotal).toFixed(2));
  const balanceAmount = Math.max(0, grandTotal - (parseFloat(paymentInfo.advanceAmount) || 0));

  const grossProfit = subtotal - totalEstCost;
  const profitMarginPct = subtotal > 0 ? parseFloat(((grossProfit / subtotal) * 100).toFixed(1)) : 0;

  // Submit & Save Order (Create or Update)
  const handleSaveOrder = (e) => {
    e.preventDefault();
    if (!selectedCust) {
      alert('Please select or create a Customer for this order.');
      return;
    }

    const sp = salesPersons.find((s) => s.id === orderHeader.salesPersonId);
    const co = careOfPersons.find((c) => c.id === orderHeader.careOfId);

    const payload = {
      orderDate: orderHeader.orderDate,
      deliveryDate: orderHeader.deliveryDate,
      taxMode: orderHeader.taxMode,
      customerId: selectedCust.id,
      customerName: selectedCust.name,
      customerMobile: selectedCust.mobile,
      customerState: selectedCust.state,
      salesPersonId: orderHeader.salesPersonId,
      salesPersonName: sp?.name || 'House Sales',
      careOfId: orderHeader.careOfId,
      careOfName: co?.name || 'Production Coordinator',
      orderSource: orderHeader.orderSource,
      referenceNo: orderHeader.referenceNo,
      remarks: orderHeader.remarks,
      items: items.map((it) => {
        const vendorObj = vendors.find((v) => v.id === it.vendorId);
        const designerObj = designers.find((d) => d.id === it.designerId);
        return {
          ...it,
          vendorName: vendorObj?.name || '',
          designerName: designerObj?.name || ''
        };
      }),
      advanceAmount: parseFloat(paymentInfo.advanceAmount) || 0,
      paymentMethod: paymentInfo.paymentMethod,
      bankAccountId: paymentInfo.bankAccountId,
      bankAccountName: paymentInfo.bankAccountName || companyBankAccounts.find((b) => b.id === paymentInfo.bankAccountId)?.bankName || '',
      deliveryMode: 'Local Express Delivery'
    };

    if (editingOrderId) {
      updateSalesOrder(editingOrderId, payload);
      alert(`Sales Order ${editingOrderId} updated successfully!`);
      setSelectedOrderId(editingOrderId);
      setEditingOrderId(null);
    } else {
      const newOrder = createSalesOrder(payload);
      alert(`Order ${newOrder.id} confirmed successfully!\nJob Card automatically created in Production Queue.`);
      setSelectedOrderId(newOrder.id);
    }
    setViewMode('detail');
  };

  // Filtered Orders List
  const filteredOrders = salesOrders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerMobile.includes(searchQuery);

    if (activeTabFilter === 'ALL') return matchesSearch;
    if (activeTabFilter === 'PRODUCTION') return matchesSearch && ['New', 'Design', 'Printing', 'Outsource', 'Finishing', 'Quality Check'].includes(o.productionStatus);
    if (activeTabFilter === 'READY') return matchesSearch && o.productionStatus === 'Ready for Delivery';
    if (activeTabFilter === 'DELIVERED') return matchesSearch && o.productionStatus === 'Delivered';
    return matchesSearch;
  });

  const selectedOrder = salesOrders.find((o) => o.id === selectedOrderId) || salesOrders[0];

  return (
    <div className="view-container">
      {/* View Header Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={24} color="#2563eb" />
            {viewMode === 'create' ? 'Create New Sales Order' : viewMode === 'detail' ? `Sales Order ${selectedOrder?.id}` : 'Sales Orders Hub'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {viewMode === 'create'
              ? 'Job Card auto-generated upon order confirmation • Multi-item dynamic calculation'
              : 'Sales Order is the central engine of PrintFlow ERP'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          {viewMode !== 'list' && (
            <button onClick={() => setViewMode('list')} className="btn btn-secondary">
              <ArrowLeft size={16} /> Back to Order List
            </button>
          )}
          {viewMode !== 'create' && (
            <button onClick={() => setViewMode('create')} className="btn btn-primary">
              <Plus size={16} /> + New Sales Order (Alt+N)
            </button>
          )}
        </div>
      </div>

      {/* CREATE SALES ORDER VIEW */}
      {viewMode === 'create' && (
        <form onSubmit={handleSaveOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* CUSTOMER SEARCH & SELECTION SECTION */}
          <div className="card" style={{ borderTop: '4px solid #2563eb' }}>
            <div className="card-header">
              <div className="card-title">
                <User size={18} color="#2563eb" /> Customer Search & Selection
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCustModalOpen(true)}
                className="btn btn-secondary btn-sm"
                style={{ color: '#2563eb', fontWeight: 700 }}
              >
                <UserPlus size={14} /> + Create New Customer (Popup)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ position: 'relative' }}>
                <label className="form-label">
                  <Search size={14} /> Search Customer by Mobile / Name / Customer Code
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type 10-digit mobile number or customer name..."
                  value={custSearchTerm}
                  onChange={(e) => {
                    setCustSearchTerm(e.target.value);
                    if (selectedCust) setSelectedCust(null);
                  }}
                  autoFocus
                />

                {/* Instant Search Results Dropdown */}
                {custSearchTerm && !selectedCust && filteredCusts.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 50,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}>
                    {filteredCusts.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        style={{
                          padding: '0.6rem 0.85rem',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                      >
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{c.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Mob: {c.mobile} | Code: {c.code} | Type: {c.type}
                          </div>
                        </div>
                        <span className="badge badge-slate">{c.state}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Customer Details Card */}
              {selectedCust ? (
                <div style={{ background: '#eff6ff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                    {selectedCust.name} <span className="badge badge-blue">{selectedCust.type}</span>
                  </div>
                  <div>GSTIN: <strong>{selectedCust.gstin || 'Unregistered'}</strong></div>
                  <div>Address: {selectedCust.address} ({selectedCust.state})</div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed #bfdbfe' }}>
                    <span style={{ color: '#e11d48', fontWeight: 700 }}>
                      Outstanding: ₹{selectedCust.outstanding.toLocaleString()}
                    </span>
                    <span>Credit Limit: ₹{selectedCust.creditLimit.toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px dashed #cbd5e1', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                  No Customer Selected. Type mobile number above or click "+ Create New Customer".
                </div>
              )}
            </div>
          </div>

          {/* HEADER METADATA ROW */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Order Header & Staff Assignment</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label"><Calendar size={14} /> Order Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={orderHeader.orderDate}
                  onChange={(e) => setOrderHeader({ ...orderHeader, orderDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Sales Person</label>
                <select
                  className="form-select"
                  value={orderHeader.salesPersonId}
                  onChange={(e) => {
                    const sp = salesPersons.find((s) => s.id === e.target.value);
                    setOrderHeader({ ...orderHeader, salesPersonId: e.target.value, salesPersonName: sp?.name || '' });
                  }}
                >
                  {salesPersons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.commissionRate}%)</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Care Of Person (Referred Agent)</label>
                <select
                  className="form-select"
                  value={orderHeader.careOfId}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW_CAREOF__') {
                      setIsCreateCareOfModalOpen(true);
                      return;
                    }
                    const co = careOfPersons.find((c) => c.id === e.target.value);
                    setOrderHeader({ ...orderHeader, careOfId: e.target.value, careOfName: co?.name || '' });
                  }}
                >
                  <option value="__ADD_NEW_CAREOF__" style={{ fontWeight: 800, color: '#2563eb' }}>
                    + Create New Care Of Person...
                  </option>
                  <optgroup label="Referred Agents Directory">
                    {careOfPersons.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.role || 'Agent'})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Order Source</label>
                <select
                  className="form-select"
                  value={orderHeader.orderSource}
                  onChange={(e) => setOrderHeader({ ...orderHeader, orderSource: e.target.value })}
                >
                  <option value="Walk-in Counter">Walk-in Counter</option>
                  <option value="WhatsApp Inquiry">WhatsApp Inquiry</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Email Quote">Email Quote</option>
                  <option value="Field Visit">Field Visit</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Ref / PO Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. PO-9921"
                  value={orderHeader.referenceNo}
                  onChange={(e) => setOrderHeader({ ...orderHeader, referenceNo: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* DYNAMIC PRODUCT ITEMS TABLE */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Scissors size={18} color="#2563eb" /> Product Line Items (Target Delivery, Material & Costing)
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveProdTargetIndex(items.length - 1);
                    setIsCreateProdModalOpen(true);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#2563eb', fontWeight: 700 }}
                >
                  <Plus size={14} /> + New Master Product
                </button>
                <button type="button" onClick={addProductRow} className="btn btn-primary btn-sm">
                  <Plus size={14} /> Add Product Line
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>#</th>
                    <th style={{ width: '260px' }}>Product</th>
                    <th style={{ width: '65px' }}>Qty</th>
                    <th style={{ width: '120px' }}>Delivery Date</th>
                    <th style={{ width: '140px' }}>Material</th>
                    <th style={{ width: '80px' }}>Design?</th>
                    <th style={{ width: '110px' }}>Outsource?</th>
                    <th style={{ width: '100px' }}>Est Outsource Cost (Internal)</th>
                    <th style={{ width: '85px' }}>Selling Rate (₹)</th>
                    <th style={{ width: '70px' }}>GST %</th>
                    <th style={{ width: '110px' }}>Amount (₹)</th>
                    <th style={{ width: '30px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const calc = calculateItemAmount(item);
                    const isCustomItem = item.isCustom || item.productName.includes('Custom');
                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{idx + 1}</td>

                        {/* Product Selector with inline + Add New Product */}
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={item.productName}
                            onChange={(e) => {
                              if (e.target.value === '__ADD_NEW__') {
                                setActiveProdTargetIndex(idx);
                                setIsCreateProdModalOpen(true);
                                return;
                              }
                              const p = products.find((pr) => pr.name === e.target.value);
                              const newItems = [...items];
                              const isCustom = p?.isCustom || e.target.value.includes('Custom');
                              newItems[idx] = {
                                ...newItems[idx],
                                productName: e.target.value,
                                isCustom: isCustom,
                                sellingRate: p?.defaultRate || newItems[idx].sellingRate,
                                estimatedCost: p?.estimatedCost || newItems[idx].estimatedCost,
                                unit: p?.unit || newItems[idx].unit,
                                material: p?.defaultMaterial || newItems[idx].material,
                                gstRate: p?.gstRate || newItems[idx].gstRate
                              };
                              setItems(newItems);
                            }}
                          >
                            <option value="__ADD_NEW__" style={{ fontWeight: 800, color: '#2563eb' }}>
                              + Create New Master Product...
                            </option>
                            <optgroup label="Product Catalog">
                              {products.map((pr) => (
                                <option key={pr.id} value={pr.name}>{pr.name}</option>
                              ))}
                            </optgroup>
                          </select>

                          {/* Free-text Custom Item Name if Custom Job */}
                          {isCustomItem && (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              style={{ marginTop: '3px', borderColor: '#8b5cf6', background: '#f5f3ff', fontWeight: 600 }}
                              placeholder="Type Custom Job Title / Name..."
                              value={item.customTitle || ''}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].customTitle = e.target.value;
                                setItems(newItems);
                              }}
                            />
                          )}

                          <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{ marginTop: '3px' }}
                            placeholder="Item notes / specifications..."
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].description = e.target.value;
                              setItems(newItems);
                            }}
                          />
                        </td>

                        {/* Quantity */}
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.qty}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].qty = e.target.value;
                              setItems(newItems);
                            }}
                          />
                        </td>

                        {/* Line Item Target Delivery Date */}
                        <td>
                          <input
                            type="date"
                            className="form-control form-control-sm"
                            style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d97706' }}
                            value={item.deliveryDate || orderHeader.deliveryDate}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].deliveryDate = e.target.value;
                              setItems(newItems);
                            }}
                          />
                        </td>

                        {/* Material */}
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={item.material}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].material = e.target.value;
                              setItems(newItems);
                            }}
                          >
                            {MATERIAL_PRESETS.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </td>

                        {/* Designer Required */}
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={item.designerRequired}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].designerRequired = e.target.value;
                              setItems(newItems);
                            }}
                          >
                            <option value="NO">NO</option>
                            <option value="YES">YES</option>
                          </select>
                          {item.designerRequired === 'YES' && (
                            <select
                              className="form-select form-select-sm"
                              style={{ marginTop: '3px' }}
                              value={item.designerId}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].designerId = e.target.value;
                                setItems(newItems);
                              }}
                            >
                              <option value="">Assign Designer</option>
                              {designers.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* Outsource */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <input
                              type="checkbox"
                              checked={item.outsource}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].outsource = e.target.checked;
                                setItems(newItems);
                              }}
                            />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Outsource</span>
                          </div>
                          {item.outsource && (
                            <select
                              className="form-select form-select-sm"
                              style={{ marginTop: '3px' }}
                              value={item.vendorId}
                              onChange={(e) => {
                                const newItems = [...items];
                                newItems[idx].vendorId = e.target.value;
                                setItems(newItems);
                              }}
                            >
                              <option value="">Select Vendor</option>
                              {vendors.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* Internal Est Outsource Cost (Reference Only) */}
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            style={{ borderColor: '#8b5cf6', background: '#faf5ff', fontWeight: 600 }}
                            placeholder="₹ Est Cost"
                            value={item.internalEstOutsourceCost || ''}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].internalEstOutsourceCost = e.target.value;
                              setItems(newItems);
                            }}
                          />
                          <span style={{ fontSize: '0.62rem', color: '#7c3aed', fontWeight: 600, display: 'block', marginTop: '1px' }}>
                            Internal Ref Only
                          </span>
                        </td>

                        {/* Selling Rate */}
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.sellingRate}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].sellingRate = e.target.value;
                              setItems(newItems);
                            }}
                          />
                        </td>

                        {/* GST % */}
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={item.gstRate || 18}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].gstRate = e.target.value;
                              setItems(newItems);
                            }}
                          >
                            <option value={18}>18%</option>
                            <option value={12}>12%</option>
                            <option value={5}>5%</option>
                            <option value={0}>0%</option>
                          </select>
                        </td>

                        {/* Amount */}
                        <td>
                          <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.88rem' }}>
                            ₹{calc.grossLineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Taxable: ₹{calc.taxableVal.toFixed(1)}
                          </span>
                        </td>

                        {/* Remove */}
                        <td>
                          <button
                            type="button"
                            onClick={() => removeProductRow(idx)}
                            className="btn-secondary btn-icon"
                            style={{ border: 'none', color: '#f43f5e' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* COSTING & PAYMENT SUMMARY FOOTER */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
            {/* Left: Payment, Tax Mode & Remarks Box */}
            <div className="card" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <div className="card-header" style={{ paddingBottom: '0.6rem', marginBottom: '0.85rem' }}>
                <div className="card-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                  <DollarSign size={18} color="#10b981" /> Payment Collection & Tax Mode Settings
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* PROMINENT ETR / ITR / NTR TAX MODE SELECTOR IN PAYMENT BOX */}
                <div style={{ background: '#f8fafc', padding: '0.75rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e40af', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Calculator size={14} /> ORDER GST TAX TYPE</span>
                    <span className="badge badge-blue" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                      {orderHeader.taxMode.includes('ETR') && '+ GST Added On Subtotal'}
                      {orderHeader.taxMode.includes('ITR') && 'GST Included Inside Rates'}
                      {orderHeader.taxMode.includes('NTR') && '0% Tax Exempted'}
                    </span>
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    {/* ETR (+ TAX) Button */}
                    <button
                      type="button"
                      onClick={() => setOrderHeader({ ...orderHeader, taxMode: TAX_TYPES.ETR })}
                      style={{
                        padding: '0.6rem 0.4rem',
                        borderRadius: '8px',
                        border: orderHeader.taxMode.includes('ETR') ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: orderHeader.taxMode.includes('ETR') ? '#eff6ff' : '#ffffff',
                        color: orderHeader.taxMode.includes('ETR') ? '#1e40af' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: orderHeader.taxMode.includes('ETR') ? '0 2px 4px rgba(37,99,235,0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>ETR</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.9, fontWeight: 700, color: '#2563eb' }}>+ TAX (Exclusive)</span>
                    </button>

                    {/* ITR (INCLUDE TAX) Button */}
                    <button
                      type="button"
                      onClick={() => setOrderHeader({ ...orderHeader, taxMode: TAX_TYPES.ITR })}
                      style={{
                        padding: '0.6rem 0.4rem',
                        borderRadius: '8px',
                        border: orderHeader.taxMode.includes('ITR') ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                        background: orderHeader.taxMode.includes('ITR') ? '#f5f3ff' : '#ffffff',
                        color: orderHeader.taxMode.includes('ITR') ? '#5b21b6' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: orderHeader.taxMode.includes('ITR') ? '0 2px 4px rgba(124,58,237,0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>ITR</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.9, fontWeight: 700, color: '#7c3aed' }}>INCLUDE TAX</span>
                    </button>

                    {/* NTR (NO TAX) Button */}
                    <button
                      type="button"
                      onClick={() => setOrderHeader({ ...orderHeader, taxMode: TAX_TYPES.NTR })}
                      style={{
                        padding: '0.6rem 0.4rem',
                        borderRadius: '8px',
                        border: orderHeader.taxMode.includes('NTR') ? '2px solid #059669' : '1px solid #cbd5e1',
                        background: orderHeader.taxMode.includes('NTR') ? '#ecfdf5' : '#ffffff',
                        color: orderHeader.taxMode.includes('NTR') ? '#047857' : '#475569',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        boxShadow: orderHeader.taxMode.includes('NTR') ? '0 2px 4px rgba(5,150,105,0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>NTR</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.9, fontWeight: 700, color: '#059669' }}>NO TAX (0% Tax)</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Advance Amount (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669', borderColor: '#a7f3d0' }}
                      value={paymentInfo.advanceAmount}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, advanceAmount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700 }}>Payment Method</label>
                    <select
                      className="form-select"
                      value={paymentInfo.paymentMethod}
                      onChange={(e) => setPaymentInfo({ ...paymentInfo, paymentMethod: e.target.value })}
                    >
                      {Object.values(PAYMENT_METHODS).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Building2 size={14} /> Deposit Bank Account
                    </label>
                    <select
                      className="form-select"
                      style={{ fontWeight: 700, background: '#eff6ff', color: '#1e40af' }}
                      value={paymentInfo.bankAccountId || companyBankAccounts[0]?.id || ''}
                      onChange={(e) => {
                        const bank = companyBankAccounts.find((b) => b.id === e.target.value);
                        setPaymentInfo({
                          ...paymentInfo,
                          bankAccountId: e.target.value,
                          bankAccountName: bank?.bankName || ''
                        });
                      }}
                    >
                      {companyBankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} ({b.accountNo.slice(-4)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Order Remarks / Production Notes</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Eyelets every 2ft, deliver via local express tempo..."
                    value={orderHeader.remarks}
                    onChange={(e) => setOrderHeader({ ...orderHeader, remarks: e.target.value })}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Right: Live Tax & Profit Breakdown */}
            <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
              <div className="card-header" style={{ paddingBottom: '0.6rem', marginBottom: '0.85rem' }}>
                <div className="card-title" style={{ fontSize: '1rem', fontWeight: 800 }}>
                  <Calculator size={18} color="#2563eb" /> Live Billing & Margin Summary
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal (Taxable Amount):</span>
                  <strong>₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>

                {orderHeader.taxMode.includes('NTR') ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600 }}>
                    <span>GST (No Tax Mode):</span>
                    <span>₹0.00 (Exempted)</span>
                  </div>
                ) : isInterstate ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>IGST ({orderHeader.taxMode.includes('ITR') ? 'Incl.' : '18%'}):</span>
                    <span>₹{igst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>CGST ({orderHeader.taxMode.includes('ITR') ? 'Incl.' : '9%'}):</span>
                      <span>₹{cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>SGST ({orderHeader.taxMode.includes('ITR') ? 'Incl.' : '9%'}):</span>
                      <span>₹{sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Round Off:</span>
                  <span>₹{roundOff}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '0.5rem', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toLocaleString()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e11d48', fontWeight: 800 }}>
                  <span>Balance Payable:</span>
                  <span>₹{balanceAmount.toLocaleString()}</span>
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '0.4rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>Estimated Cost: ₹{totalEstCost.toLocaleString()}</span>
                  <span style={{ color: '#059669', fontWeight: 800 }}>
                    Gross Profit: ₹{grossProfit.toLocaleString()} ({profitMarginPct}%)
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  <Check size={18} /> Confirm Order & Auto-Generate Job Cards
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SALES ORDERS LIST VIEW */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filters & Search Bar */}
          <div className="card" style={{ padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['ALL', 'PRODUCTION', 'READY', 'DELIVERED'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveTabFilter(filter)}
                    className={`btn btn-sm ${activeTabFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div style={{ width: '320px', position: 'relative' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Search SO#, Customer, Mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Orders Master Table */}
          <div className="card">
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>SO Number</th>
                    <th>Order Date</th>
                    <th>Delivery Date</th>
                    <th>Customer Name</th>
                    <th>Sales Person</th>
                    <th>Care Of</th>
                    <th>Production Status</th>
                    <th>Grand Total</th>
                    <th>Advance</th>
                    <th>Balance</th>
                    <th>Profit Margin</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td style={{ fontWeight: 800, color: '#1e40af' }}>{order.id}</td>
                      <td>{order.orderDate}</td>
                      <td style={{ fontWeight: 600, color: '#d97706' }}>{order.deliveryDate}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{order.customerName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{order.customerMobile}</div>
                      </td>
                      <td>{order.salesPersonName}</td>
                      <td>{order.careOfName}</td>
                      <td>
                        <span className={`badge ${
                          order.productionStatus === 'Ready for Delivery' ? 'badge-emerald' :
                          order.productionStatus === 'Delivered' ? 'badge-slate' :
                          order.productionStatus === 'Printing' ? 'badge-blue' : 'badge-amber'
                        }`}>
                          {order.productionStatus}
                        </span>
                      </td>
                      <td style={{ fontWeight: 800 }}>₹{order.grandTotal.toLocaleString()}</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>₹{order.advanceAmount.toLocaleString()}</td>
                      <td style={{ color: order.balanceAmount > 0 ? '#e11d48' : '#059669', fontWeight: 700 }}>
                        ₹{order.balanceAmount.toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${order.profitMarginPct >= 50 ? 'badge-emerald' : 'badge-amber'}`}>
                          {order.profitMarginPct}%
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              setSelectedOrderId(order.id);
                              setViewMode('detail');
                            }}
                            className="btn btn-sm btn-secondary"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="btn btn-sm btn-secondary"
                            title="Edit Order"
                            style={{ color: '#d97706', fontWeight: 700 }}
                          >
                            <Edit size={14} /> Edit
                          </button>
                          <button
                            onClick={() => setPrintJobCardOrder(order)}
                            className="btn btn-sm btn-secondary"
                            title="Print Job Card"
                          >
                            <Printer size={14} color="#2563eb" />
                          </button>
                          <button
                            onClick={() => setPrintInvoiceOrder(order)}
                            className="btn btn-sm btn-secondary"
                            title="Print Tax Invoice"
                          >
                            <FileText size={14} color="#059669" />
                          </button>
                          <button
                            onClick={() =>
                              handleSendWhatsApp({
                                order,
                                companyProfile,
                                activeUser,
                                trackWhatsAppSent,
                                onDownloadPdf: () => setPrintInvoiceOrder(order)
                              })
                            }
                            className="btn btn-sm btn-secondary"
                            title={order.customerMobile ? "Send WhatsApp Click-to-Chat & Invoice" : "Customer mobile number is missing."}
                            style={{ color: '#25D366', fontWeight: 800 }}
                          >
                            <MessageSquare size={14} color="#25D366" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAIL VIEW */}
      {viewMode === 'detail' && selectedOrder && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header Summary */}
          <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid #1e40af' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-blue">{selectedOrder.productionStatus}</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.3rem 0' }}>
                  {selectedOrder.id} — {selectedOrder.customerName}
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Order Date: <strong>{selectedOrder.orderDate}</strong> | Promised Delivery: <strong style={{ color: '#d97706' }}>{selectedOrder.deliveryDate}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={() => handleEditOrder(selectedOrder)} className="btn btn-secondary" style={{ color: '#d97706', fontWeight: 700 }}>
                  <Edit size={16} /> Edit Order
                </button>
                <button onClick={() => setPrintJobCardOrder(selectedOrder)} className="btn btn-secondary">
                  <Printer size={16} color="#2563eb" /> Shop Floor Job Card
                </button>
                <button onClick={() => setPrintInvoiceOrder(selectedOrder)} className="btn btn-primary">
                  <FileText size={16} /> GST Tax Invoice
                </button>
                <button
                  onClick={() =>
                    handleSendWhatsApp({
                      order: selectedOrder,
                      companyProfile,
                      activeUser,
                      trackWhatsAppSent,
                      onDownloadPdf: () => setPrintInvoiceOrder(selectedOrder)
                    })
                  }
                  disabled={!selectedOrder.customerMobile}
                  className="btn"
                  style={{
                    background: selectedOrder.customerMobile ? '#25D366' : '#cbd5e1',
                    color: '#ffffff',
                    fontWeight: 800,
                    border: 'none',
                    cursor: selectedOrder.customerMobile ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                  title={selectedOrder.customerMobile ? "Send WhatsApp Click-to-Chat & Invoice PDF" : "Customer mobile number is missing."}
                >
                  <MessageSquare size={16} color="#fff" /> 📱 Send WhatsApp
                </button>
              </div>
            </div>
          </div>

          {/* Grid details */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
            {/* Line Items Detail */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Order Line Items ({selectedOrder.items.length})</div>
              </div>
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Size & Unit</th>
                      <th>Qty</th>
                      <th>Outsource Vendor</th>
                      <th>Est Cost</th>
                      <th>Actual Vendor Bill</th>
                      <th>Selling Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{it.productName}</td>
                        <td>{it.width && it.height ? `${it.width} × ${it.height} ${it.unit}` : it.unit}</td>
                        <td style={{ fontWeight: 700 }}>{it.qty}</td>
                        <td>{it.outsource ? <span className="badge badge-violet">{it.vendorName}</span> : 'In-House'}</td>
                        <td>₹{it.estimatedCost}</td>
                        <td>₹{it.actualVendorBill || it.estimatedVendorCost || 0}</td>
                        <td>₹{it.sellingRate}</td>
                        <td style={{ fontWeight: 800 }}>₹{it.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Order Ledger & Profitability</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <strong>₹{selectedOrder.subtotal.toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST Tax:</span>
                  <span>₹{(selectedOrder.cgst + selectedOrder.sgst + selectedOrder.igst).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontSize: '1.1rem', fontWeight: 800 }}>
                  <span>Grand Total:</span>
                  <span>₹{selectedOrder.grandTotal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>Advance Received:</span>
                  <span>₹{selectedOrder.advanceAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: selectedOrder.balanceAmount > 0 ? '#e11d48' : '#059669', fontWeight: 800 }}>
                  <span>Balance Amount:</span>
                  <span>₹{selectedOrder.balanceAmount.toLocaleString()}</span>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '0.4rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Profit:</span>
                  <strong style={{ color: '#059669' }}>₹{selectedOrder.grossProfit.toLocaleString()} ({selectedOrder.profitMarginPct}%)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Order Revision History & Edit Audit Trail */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="#7c3aed" /> Order Revision History & Edit Audit Trail
              </div>
              {selectedOrder.lastEditedBy && (
                <span className="badge badge-violet" style={{ fontSize: '0.72rem' }}>
                  Last edited by {selectedOrder.lastEditedBy} on {selectedOrder.lastEditedAt}
                </span>
              )}
            </div>
            {(!selectedOrder.editHistory || selectedOrder.editHistory.length === 0) ? (
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', padding: '0.4rem 0' }}>
                No revisions recorded. Order was created cleanly without edits.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {selectedOrder.editHistory.map((audit) => (
                  <div key={audit.id} style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', borderLeft: '3px solid #7c3aed', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <strong style={{ color: '#0f172a' }}>{audit.editedBy} ({audit.role || 'Staff'})</strong>
                      <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: 600 }}>{audit.editedAt}</span>
                    </div>
                    <div style={{ color: '#475569' }}>{audit.summary}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      <CreateCustomerModal
        isOpen={isCreateCustModalOpen}
        onClose={() => setIsCreateCustModalOpen(false)}
        onCustomerCreated={(cust) => handleSelectCustomer(cust)}
        initialMobile={custSearchTerm}
      />

      <CreateProductModal
        isOpen={isCreateProdModalOpen}
        onClose={() => setIsCreateProdModalOpen(false)}
        onProductCreated={(prod) => {
          const newItems = [...items];
          if (newItems[activeProdTargetIndex]) {
            newItems[activeProdTargetIndex] = {
              ...newItems[activeProdTargetIndex],
              productName: prod.name,
              sellingRate: prod.defaultRate,
              estimatedCost: prod.estimatedCost,
              unit: prod.unit,
              material: prod.defaultMaterial,
              gstRate: prod.gstRate
            };
            setItems(newItems);
          }
        }}
      />

      <JobCardPrintModal
        order={printJobCardOrder}
        isOpen={!!printJobCardOrder}
        onClose={() => setPrintJobCardOrder(null)}
      />

      <CreateCareOfModal
        isOpen={isCreateCareOfModalOpen}
        onClose={() => setIsCreateCareOfModalOpen(false)}
        onCreated={(co) => {
          setOrderHeader((prev) => ({
            ...prev,
            careOfId: co.id,
            careOfName: co.name
          }));
        }}
      />

      <TaxInvoicePrintModal
        order={printInvoiceOrder}
        isOpen={!!printInvoiceOrder}
        onClose={() => setPrintInvoiceOrder(null)}
      />
    </div>
  );
};
