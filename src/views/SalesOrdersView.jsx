import React, { useState, useEffect } from 'react';
import { useERP } from '../context/ERPContext';
import { CUSTOMER_TYPES, TAX_TYPES, PAYMENT_METHODS, DEFAULT_UNITS, PRODUCTION_STATUS } from '../types';
import { CreateCustomerModal } from '../components/modals/CreateCustomerModal';
import { CreateProductModal } from '../components/modals/CreateProductModal';
import { CreateEmployeeModal } from '../components/modals/CreateEmployeeModal';
import CreateCareOfModal from '../components/modals/CreateCareOfModal';
import { CreateVendorModal } from '../components/modals/CreateVendorModal';
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
  MessageSquare,
  X,
  History,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export const SalesOrdersView = ({ initialCreate = false, initialSelectId = null, initialType = 'Direct', initialCust = null, onNavigate = null }) => {
  const {
    salesOrders,
    customers,
    products,
    productMaterialSpecs,
    employees,
    salesPersons,
    careOfPersons,
    designers,
    vendors,
    companyBankAccounts,
    companyProfile,
    activeUser,
    activeRole,
    trackWhatsAppSent,
    createSalesOrder,
    convertQuotationToSalesOrder,
    updateQuotationStatus,
    updateSalesOrder,
    cancelSalesOrder,
    deleteSalesOrder,
    orderAuditLogs,
    updateVendorBill
  } = useERP();

  const [isCreateEmpModalOpen, setIsCreateEmpModalOpen] = useState(false);
  const [createEmpDept, setCreateEmpDept] = useState('Sales');
  const [empTargetType, setEmpTargetType] = useState('sales'); // 'sales' or 'designer'
  const [empTargetIndex, setEmpTargetIndex] = useState(0);

  const [viewMode, setViewMode] = useState(initialCreate ? 'create' : 'list');
  const [selectedOrderId, setSelectedOrderId] = useState(initialSelectId);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [activeTabFilter, setActiveTabFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Cancellation & Deletion Modal States
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('Customer requested cancellation');
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [editReasonInput, setEditReasonInput] = useState('');

  // Modals state
  const [isCreateCustModalOpen, setIsCreateCustModalOpen] = useState(false);
  const [isCreateProdModalOpen, setIsCreateProdModalOpen] = useState(false);
  const [isCreateCareOfModalOpen, setIsCreateCareOfModalOpen] = useState(false);
  const [isCreateVendorModalOpen, setIsCreateVendorModalOpen] = useState(false);
  const [activeProdTargetIndex, setActiveProdTargetIndex] = useState(0);
  const [activeVendorTargetIndex, setActiveVendorTargetIndex] = useState(0);
  const [printJobCardOrder, setPrintJobCardOrder] = useState(null);
  const [printInvoiceOrder, setPrintInvoiceOrder] = useState(null);

  // Multi-Vendor Outsource Jobs Modal State (1 or More Vendors per Line Item)
  const [outsourceModalIdx, setOutsourceModalIdx] = useState(null);
  const [tempOutsourceJobs, setTempOutsourceJobs] = useState([]);

  const openMultiVendorModal = (itemIndex) => {
    setOutsourceModalIdx(itemIndex);
    const currentItem = items[itemIndex];
    const existingJobs = Array.isArray(currentItem.outsourceJobs) && currentItem.outsourceJobs.length > 0
      ? currentItem.outsourceJobs
      : currentItem.vendorId
        ? [{
            id: 1,
            vendorId: currentItem.vendorId,
            vendorName: currentItem.vendorName || '',
            processName: 'Printing / Job Work',
            estCost: currentItem.internalEstOutsourceCost || 0,
            notes: ''
          }]
        : [{
            id: 1,
            vendorId: vendors[0]?.id || '',
            vendorName: vendors[0]?.name || '',
            processName: 'Printing / Job Work',
            estCost: 0,
            notes: ''
          }];
    setTempOutsourceJobs(existingJobs);
  };

  const saveMultiVendorJobs = () => {
    if (outsourceModalIdx === null) return;
    const newItems = [...items];
    const totalEstCost = tempOutsourceJobs.reduce((sum, j) => sum + (parseFloat(j.estCost) || 0), 0);
    const primaryJob = tempOutsourceJobs[0] || {};
    const primaryVendor = (vendors || []).find(v => v.id === primaryJob.vendorId);

    newItems[outsourceModalIdx] = {
      ...newItems[outsourceModalIdx],
      outsource: tempOutsourceJobs.length > 0,
      outsourceJobs: tempOutsourceJobs,
      vendorId: primaryJob.vendorId || '',
      vendorName: tempOutsourceJobs.length > 1 ? `${tempOutsourceJobs.length} Vendors Outsourced` : (primaryVendor?.name || primaryJob.vendorName || ''),
      internalEstOutsourceCost: totalEstCost
    };
    setItems(newItems);
    setOutsourceModalIdx(null);
  };

  // Form State for New Sales Order / Quotation
  const [custSearchTerm, setCustSearchTerm] = useState(initialCust ? `${initialCust.name}${initialCust.mobile ? ` (${initialCust.mobile})` : ''}` : '');
  const [selectedCust, setSelectedCust] = useState(initialCust || null);

  const [orderHeader, setOrderHeader] = useState({
    orderType: initialType || 'Direct',
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
      material: 'Standard Substrate',
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
  const filteredCusts = (custSearchTerm || '').trim()
    ? (customers || []).filter(
        (c) =>
          (c.mobile || '').includes(custSearchTerm) ||
          (c.name || '').toLowerCase().includes(custSearchTerm.toLowerCase()) ||
          (c.code || '').toLowerCase().includes(custSearchTerm.toLowerCase())
      )
    : [];

  const handleSelectCustomer = (cust) => {
    if (!cust) return;
    const mappedCust = {
      ...cust,
      id: cust.id,
      code: cust.code || '',
      name: cust.name || '',
      mobile: cust.mobile || '',
      email: cust.email || '',
      gstin: cust.gstin || '',
      type: cust.type || 'Retail Customer',
      address: cust.address || '',
      state: cust.state || 'Maharashtra (27)',
      credit_limit: Number(cust.credit_limit ?? cust.creditLimit ?? 0),
      creditLimit: Number(cust.credit_limit ?? cust.creditLimit ?? 0),
      outstanding: Number(cust.outstanding ?? cust.outstandingAmount ?? 0),
      outstandingAmount: Number(cust.outstanding ?? cust.outstandingAmount ?? 0),
      total_orders: Number(cust.total_orders ?? cust.totalOrders ?? 0),
      totalOrders: Number(cust.total_orders ?? cust.totalOrders ?? 0)
    };
    setSelectedCust(mappedCust);
    setCustSearchTerm(`${mappedCust.name}${mappedCust.mobile ? ` (${mappedCust.mobile})` : ''}`);
  };

  // Handle Edit Order action
  const handleEditOrder = (order) => {
    if (!order) return;
    setEditingOrderId(order.id);
    const cust = (customers || []).find((c) => c.id === order.customerId);
    if (cust) {
      handleSelectCustomer(cust);
    } else {
      setSelectedCust({
        id: order.customerId || '',
        name: order.customerName || '',
        mobile: order.customerMobile || '',
        state: order.customerState || 'Maharashtra (27)',
        address: order.customerAddress || '',
        gstin: order.customerGstin || '',
        outstanding: Number(order.outstanding ?? 0),
        credit_limit: Number(order.credit_limit ?? 0),
        type: 'Customer'
      });
      setCustSearchTerm(order.customerName || '');
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
        material: it.material || 'Standard Substrate',
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
        material: p?.defaultMaterial || p?.default_material || 'Standard Substrate',
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

  const isInterstate = selectedCust?.state ? !selectedCust.state.includes('Maharashtra') : false;
  const cgst = isInterstate ? 0 : totalGst / 2;
  const sgst = isInterstate ? 0 : totalGst / 2;
  const igst = isInterstate ? totalGst : 0;

  const subtotal = parseFloat((totalTaxable || 0).toFixed(2));
  const rawGrandTotal = subtotal + cgst + sgst + igst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = parseFloat((grandTotal - rawGrandTotal).toFixed(2));
  const balanceAmount = Math.max(0, grandTotal - (parseFloat(paymentInfo.advanceAmount) || 0));

  const grossProfit = subtotal - totalEstCost;
  const profitMarginPct = subtotal > 0 ? parseFloat(((grossProfit / subtotal) * 100).toFixed(1)) : 0;

  // Submit & Save Order (Create or Update)
  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (isSavingOrder) return;

    if (!selectedCust) {
      alert('Please select or create a Customer for this order.');
      return;
    }

    const sp = (salesPersons || []).find((s) => s.id === orderHeader.salesPersonId);
    const co = (careOfPersons || []).find((c) => c.id === orderHeader.careOfId);

    const isQuote = orderHeader.orderType === 'Quotation';

    const payload = {
      orderType: orderHeader.orderType || 'Direct',
      quotationStatus: isQuote ? 'Draft' : null,
      orderDate: orderHeader.orderDate,
      deliveryDate: orderHeader.deliveryDate,
      taxMode: orderHeader.taxMode,
      customerId: selectedCust.id,
      customerName: selectedCust.name || '',
      customerMobile: selectedCust.mobile || '',
      customerState: selectedCust.state || 'Maharashtra (27)',
      salesPersonId: orderHeader.salesPersonId || '',
      salesPersonName: sp?.name || 'House Sales',
      careOfId: orderHeader.careOfId || '',
      careOfName: co?.name || 'Production Coordinator',
      orderSource: orderHeader.orderSource || 'Walk-in Counter',
      referenceNo: orderHeader.referenceNo || '',
      remarks: orderHeader.remarks || '',
      items: (items || []).map((it) => {
        const vendorObj = (vendors || []).find((v) => v.id === it.vendorId);
        const designerObj = (designers || []).find((d) => d.id === it.designerId);
        return {
          ...it,
          vendorName: vendorObj?.name || '',
          designerName: designerObj?.name || ''
        };
      }),
      advanceAmount: parseFloat(paymentInfo.advanceAmount) || 0,
      paymentMethod: paymentInfo.paymentMethod,
      bankAccountId: paymentInfo.bankAccountId || '',
      bankAccountName: paymentInfo.bankAccountName || (companyBankAccounts || []).find((b) => b.id === paymentInfo.bankAccountId)?.bankName || '',
      deliveryMode: 'Local Express Delivery'
    };

    try {
      setIsSavingOrder(true);
      if (editingOrderId) {
        await updateSalesOrder(editingOrderId, payload, editReasonInput || 'Order parameters modified');
        alert(`${isQuote ? 'Quotation' : 'Sales Order'} ${editingOrderId} updated successfully!`);
        setSelectedOrderId(editingOrderId);
        setEditingOrderId(null);
        setEditReasonInput('');
      } else {
        const newOrder = await createSalesOrder(payload);
        const createdId = newOrder?.id || 'New Record';
        if (isQuote) {
          alert(`Quotation ${createdId} created successfully!\nYou can convert it to a Sales Order anytime with one click.`);
        } else {
          alert(`Sales Order ${createdId} confirmed successfully!\nJob Card automatically created in Production Queue.`);
        }
        if (newOrder?.id) {
          setSelectedOrderId(newOrder.id);
        }
      }
      setViewMode('detail');
    } catch (err) {
      alert(`Error saving order: ${err.message}`);
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Confirm and Execute Cancel Order
  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrder) return;
    try {
      setIsCancellingOrder(true);
      await cancelSalesOrder(cancellingOrder.id, cancelReasonInput);
      alert(`Order ${cancellingOrder.id} has been marked as CANCELLED.\n\nCustomer dues adjusted & recorded in the Order Audit Log.`);
      setCancellingOrder(null);
      setCancelReasonInput('Customer requested cancellation');
    } catch (err) {
      alert(`Error cancelling order: ${err.message}`);
    } finally {
      setIsCancellingOrder(false);
    }
  };

  // Delete Order with Reason Prompt
  const handleDeleteOrderClick = async (order) => {
    if (!order) return;
    const confirmReason = window.prompt(
      `⚠️ WARNING: Are you sure you want to permanently delete order "${order.id}"?\n\nThis will remove the order record from the active ERP database.\nA permanent snapshot will be preserved in the Order Revision & Audit Logs.\n\nEnter deletion reason:`,
      "Administrative order cleanup"
    );
    if (confirmReason !== null) {
      try {
        await deleteSalesOrder(order.id, confirmReason || 'Purged by user');
        alert(`Order ${order.id} deleted successfully. View the snapshot in Order Revision & Audit Logs.`);
        if (selectedOrderId === order.id) {
          setSelectedOrderId(null);
          setViewMode('list');
        }
      } catch (err) {
        alert(`Error deleting order: ${err.message}`);
      }
    }
  };

  // Convert Quotation to Sales Order 1-Click action
  const handleConvertQuotation = async (quotationId) => {
    if (window.confirm(`Convert Quotation "${quotationId}" to a Direct Sales Order?\n\nThis will instantly generate a new Sales Order and push job cards to the Production Queue.`)) {
      try {
        const newSo = await convertQuotationToSalesOrder(quotationId);
        alert(`Success! Quotation ${quotationId} has been converted into Sales Order ${newSo.id}.`);
        setSelectedOrderId(newSo.id);
        setViewMode('detail');
      } catch (err) {
        alert(`Error converting quotation: ${err.message}`);
      }
    }
  };

  // Filtered Orders List
  const filteredOrders = (salesOrders || []).filter((o) => {
    const matchesSearch =
      (o.id || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (o.customerName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (o.customerMobile || '').includes(searchQuery || '');

    if (activeTabFilter === 'ALL') return matchesSearch;
    if (activeTabFilter === 'DIRECT') return matchesSearch && (o.orderType === 'Direct' || !o.orderType) && !o.convertedFromQuotation && o.productionStatus !== 'Cancelled';
    if (activeTabFilter === 'QUOTATIONS') return matchesSearch && o.orderType === 'Quotation' && o.productionStatus !== 'Cancelled';
    if (activeTabFilter === 'CONVERTED') return matchesSearch && (o.convertedFromQuotation || o.quotationStatus === 'Converted');
    if (activeTabFilter === 'PRODUCTION') return matchesSearch && o.orderType !== 'Quotation' && ['New', 'Design', 'Printing', 'Outsource', 'Finishing', 'Quality Check'].includes(o.productionStatus);
    if (activeTabFilter === 'DELIVERED') return matchesSearch && o.productionStatus === 'Delivered';
    if (activeTabFilter === 'CANCELLED') return matchesSearch && (o.productionStatus === 'Cancelled' || o.isCancelled);
    return matchesSearch;
  });

  const selectedOrder = (salesOrders || []).find((o) => o.id === selectedOrderId) || (salesOrders || [])[0] || null;

  return (
    <div className="view-container">
      {/* View Header Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
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

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate ? onNavigate('sales-order-audit') : window.dispatchEvent(new CustomEvent('ERP_NAVIGATE_AUDIT'))}
            className="btn btn-secondary"
            style={{ color: '#7c3aed', borderColor: '#ddd6fe', background: '#f5f3ff', fontWeight: 700 }}
            title="Open central audit trail of all order edits, cancellations, and deletions"
          >
            <History size={16} color="#7c3aed" /> Order Revision & Audit Logs ({orderAuditLogs?.length || 0})
          </button>
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

      {/* CREATE SALES ORDER OR QUOTATION VIEW */}
      {viewMode === 'create' && (
        <form onSubmit={handleSaveOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* WORKFLOW TYPE SELECTOR */}
          <div className="card" style={{ borderLeft: orderHeader.orderType === 'Quotation' ? '4px solid #f59e0b' : '4px solid #2563eb', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>DOCUMENT TYPE & WORKFLOW</span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0.2rem 0', color: '#0f172a' }}>
                  {orderHeader.orderType === 'Quotation' ? '📄 Quotation Creation (Workflow 2)' : '🛒 Direct Sales Order (Workflow 1)'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {orderHeader.orderType === 'Quotation'
                    ? 'Generates a QT-YYYY-XXXX quotation. Can be converted to an active Sales Order anytime with 1-click.'
                    : 'Generates a direct SO-YYYY-XXXX order into the production & job work pipeline without requiring a quote.'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setOrderHeader(prev => ({ ...prev, orderType: 'Direct' }))}
                  className={`btn ${orderHeader.orderType === 'Direct' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontWeight: 700 }}
                >
                  Direct Sales Order
                </button>
                <button
                  type="button"
                  onClick={() => setOrderHeader(prev => ({ ...prev, orderType: 'Quotation' }))}
                  className={`btn ${orderHeader.orderType === 'Quotation' ? 'btn-warning' : 'btn-secondary'}`}
                  style={{ background: orderHeader.orderType === 'Quotation' ? '#d97706' : undefined, color: orderHeader.orderType === 'Quotation' ? '#fff' : undefined, fontWeight: 700 }}
                >
                  Optional Quotation
                </button>
              </div>
            </div>
          </div>

          {/* CUSTOMER SEARCH & SELECTION SECTION */}
          <div className="card" style={{ borderTop: '4px solid #2563eb' }}>
            <div className="card-header">
              <div className="card-title">
                <User size={18} color="#2563eb" /> Customer Search & Selection
              </div>
              <button
                type="button"
                onClick={() => setIsCreateCustModalOpen(true)}
                className="btn btn-primary btn-sm"
              >
                <UserPlus size={14} /> + Create New Customer
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedCust ? '1.2fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
              <div style={{ position: 'relative' }}>
                <label className="form-label">
                  <Search size={14} /> Search Customer by Mobile / Name / Code
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type mobile number or customer name..."
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
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{c.name || 'Unnamed'}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            Mob: {c.mobile || 'N/A'} | Code: {c.code || 'N/A'} | Type: {c.type || 'Retail'}
                          </div>
                        </div>
                        <span className="badge badge-slate">{c.state || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Customer Details Card */}
              {selectedCust && (
                <div style={{ background: '#eff6ff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.95rem' }}>
                      {selectedCust.name || 'Unnamed Customer'} <span className="badge badge-blue">{selectedCust.type || 'Customer'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCust(null);
                        setCustSearchTerm('');
                      }}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
                    >
                      Change
                    </button>
                  </div>
                  <div>GSTIN: <strong>{selectedCust.gstin || 'Unregistered'}</strong></div>
                  <div>Address: {selectedCust.address || 'N/A'} ({selectedCust.state || 'Maharashtra (27)'})</div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed #bfdbfe' }}>
                    <span style={{ color: '#e11d48', fontWeight: 700 }}>
                      Outstanding: ₹{Number(selectedCust.outstanding ?? selectedCust.outstandingAmount ?? 0).toLocaleString()}
                    </span>
                    <span>Credit Limit: ₹{Number(selectedCust.credit_limit ?? selectedCust.creditLimit ?? 0).toLocaleString()}</span>
                  </div>
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
                    if (e.target.value === '__ADD_NEW_EMPLOYEE__') {
                      setCreateEmpDept('Sales');
                      setEmpTargetType('sales');
                      setIsCreateEmpModalOpen(true);
                      return;
                    }
                    const salesEmps = (employees || []).filter(e => e.department === 'Sales' || e.role === 'Sales');
                    const sp = salesEmps.find((s) => s.id === e.target.value) || salesPersons.find((s) => s.id === e.target.value);
                    setOrderHeader({ ...orderHeader, salesPersonId: e.target.value, salesPersonName: sp?.name || '' });
                  }}
                >
                  <option value="__ADD_NEW_EMPLOYEE__" style={{ fontWeight: 800, color: '#2563eb' }}>
                    + Create New Sales Employee...
                  </option>
                  <optgroup label="Sales Executives & Account Managers">
                    {((employees || []).filter(e => e.department === 'Sales' || e.role === 'Sales').length > 0
                      ? (employees || []).filter(e => e.department === 'Sales' || e.role === 'Sales')
                      : salesPersons
                    ).map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.designation || 'Sales'})</option>
                    ))}
                  </optgroup>
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
                <Scissors size={18} color="#2563eb" /> Product Line Items (Target Delivery & Costing)
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
                    <th style={{ width: '270px' }}>Product</th>
                    <th style={{ width: '65px' }}>Qty</th>
                    <th style={{ width: '120px' }}>Delivery Date</th>
                    <th style={{ width: '80px' }}>Design?</th>
                    <th style={{ width: '110px' }}>Outsource?</th>
                    <th style={{ width: '120px' }}>Est. Cost Price (₹) / Internal</th>
                    <th style={{ width: '85px' }}>Selling Rate (₹)</th>
                    <th style={{ width: '70px' }}>GST %</th>
                    <th style={{ width: '110px' }}>Amount (₹)</th>
                    <th style={{ width: '30px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const calc = calculateItemAmount(item);
                    const productSpecs = (productMaterialSpecs || []).filter(
                      (s) => s.productId === item.productId || (s.productName && s.productName === item.productName)
                    );
                    const isCustomItem = item.isCustom || (item.productName && item.productName.includes('Custom'));
                    const activeSpec = productSpecs.find((s) => s.id === item.specId || (s.specName && item.material === s.specName)) || productSpecs.find((s) => s.isDefault) || productSpecs[0];

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
                              const pSpecs = p ? (productMaterialSpecs || []).filter((s) => s.productId === p.id && s.status !== 'Inactive') : [];
                              const defSpec = pSpecs.find((s) => s.isDefault) || pSpecs[0];
                              const defaultCost = defSpec ? defSpec.costPrice : (p?.estimatedCost ?? p?.estimated_cost ?? items[idx]?.estimatedCost ?? 0);

                              const newItems = [...items];
                              const isCustom = p?.isCustom || e.target.value.includes('Custom');
                              newItems[idx] = {
                                ...newItems[idx],
                                productName: e.target.value,
                                productId: p?.id || '',
                                isCustom: isCustom,
                                specId: defSpec?.id || '',
                                specName: defSpec?.specName || '',
                                sellingRate: defSpec ? defSpec.sellingPrice : (p?.defaultRate || newItems[idx].sellingRate),
                                estimatedCost: defaultCost,
                                internalEstOutsourceCost: defaultCost,
                                unit: defSpec ? defSpec.unit : (p?.unit || newItems[idx].unit),
                                material: defSpec ? (defSpec.materialName || defSpec.specName) : (p?.defaultMaterial || newItems[idx].material),
                                description: defSpec ? (defSpec.description || defSpec.specName) : newItems[idx].description,
                                gstRate: defSpec ? defSpec.gstRate : (p?.gstRate || newItems[idx].gstRate),
                                hsnCode: defSpec ? defSpec.hsnCode : (p?.hsnCode || '9989')
                              };
                              setItems(newItems);
                            }}
                          >
                            <option value="__ADD_NEW__" style={{ fontWeight: 800, color: '#2563eb' }}>
                              + Create New Master Product...
                            </option>
                            <optgroup label="Product Catalog (Selling Rate | Est Cost Price)">
                              {products.map((pr) => {
                                const rateVal = pr.defaultRate ?? pr.default_rate ?? 0;
                                const costVal = pr.estimatedCost ?? pr.estimated_cost ?? 0;
                                return (
                                  <option key={pr.id} value={pr.name}>
                                    {pr.name} (Selling: ₹{rateVal} | Est Cost: ₹{costVal}/{pr.unit || 'Sq.Ft'})
                                  </option>
                                );
                              })}
                            </optgroup>
                          </select>

                          {/* Dynamic Material Specification Dropdown */}
                          {productSpecs.length > 0 && (
                            <select
                              className="form-select form-select-sm"
                              style={{ marginTop: '4px', background: '#eff6ff', borderColor: '#93c5fd', fontWeight: 700, color: '#1e40af' }}
                              value={activeSpec?.id || ''}
                              onChange={(e) => {
                                const selectedSpec = productSpecs.find((s) => s.id === e.target.value);
                                if (selectedSpec) {
                                  const newItems = [...items];
                                  newItems[idx] = {
                                    ...newItems[idx],
                                    specId: selectedSpec.id,
                                    specName: selectedSpec.specName,
                                    sellingRate: selectedSpec.sellingPrice,
                                    estimatedCost: selectedSpec.costPrice,
                                    internalEstOutsourceCost: selectedSpec.costPrice,
                                    unit: selectedSpec.unit,
                                    material: selectedSpec.materialName || selectedSpec.specName,
                                    description: selectedSpec.description || selectedSpec.specName,
                                    gstRate: selectedSpec.gstRate,
                                    hsnCode: selectedSpec.hsnCode
                                  };
                                  setItems(newItems);
                                }
                              }}
                            >
                              {productSpecs.map((s) => (
                                <option key={s.id} value={s.id}>
                                  Spec: {s.specName} (₹{s.sellingPrice}/{s.unit}){s.isDefault ? ' ★ Default' : ''}
                                </option>
                              ))}
                            </select>
                          )}

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

                        {/* Design Required (Default NO, Optional Designer) */}
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={item.designerRequired || item.designRequired || 'NO'}
                            onChange={(e) => {
                              const newItems = [...items];
                              newItems[idx].designerRequired = e.target.value;
                              newItems[idx].designRequired = e.target.value;
                              setItems(newItems);
                            }}
                          >
                            <option value="NO">NO (No Design Required)</option>
                            <option value="YES">YES (Design Required)</option>
                          </select>
                          {(item.designerRequired === 'YES' || item.designRequired === 'YES') && (
                            <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <select
                                className="form-select form-select-sm"
                                style={{ borderColor: !item.designerId ? '#f59e0b' : '#cbd5e1', fontWeight: !item.designerId ? 700 : 400 }}
                                value={item.designerId || ''}
                                onChange={(e) => {
                                  if (e.target.value === '__ADD_NEW_DESIGNER__') {
                                    setCreateEmpDept('Design');
                                    setEmpTargetType('designer');
                                    setEmpTargetIndex(idx);
                                    setIsCreateEmpModalOpen(true);
                                    return;
                                  }
                                  const newItems = [...items];
                                  newItems[idx].designerId = e.target.value;
                                  const dObj = (designers || []).find((d) => d.id === e.target.value) || (employees || []).find((em) => em.id === e.target.value);
                                  newItems[idx].designerName = dObj?.name || '';
                                  setItems(newItems);
                                }}
                              >
                                <option value="">⚡ Unassigned (Auto-push to Design Queue)</option>
                                <option value="__ADD_NEW_DESIGNER__" style={{ fontWeight: 800, color: '#2563eb' }}>
                                  + Create New Designer...
                                </option>
                                <optgroup label="Assign Specific Designer (Optional)">
                                  {((employees || []).filter(e => e.department === 'Design' || e.role === 'Designer').length > 0
                                    ? (employees || []).filter(e => e.department === 'Design' || e.role === 'Designer')
                                    : designers
                                  ).map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                  ))}
                                </optgroup>
                              </select>

                              {/* Priority Dropdown */}
                              <select
                                className="form-select form-select-sm"
                                style={{ fontSize: '0.72rem' }}
                                value={item.jobPriority || 'Normal'}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[idx].jobPriority = e.target.value;
                                  setItems(newItems);
                                }}
                              >
                                <option value="Normal">Priority: Normal</option>
                                <option value="High">Priority: High ⚠️</option>
                                <option value="Urgent">Priority: Urgent 🚨</option>
                                <option value="Low">Priority: Low</option>
                              </select>
                            </div>
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
                                if (e.target.checked && (!newItems[idx].outsourceJobs || newItems[idx].outsourceJobs.length === 0)) {
                                  newItems[idx].outsourceJobs = [{
                                    id: 1,
                                    vendorId: vendors[0]?.id || '',
                                    vendorName: vendors[0]?.name || '',
                                    processName: 'Printing / Job Work',
                                    estCost: newItems[idx].internalEstOutsourceCost || 0,
                                    notes: ''
                                  }];
                                  newItems[idx].vendorId = vendors[0]?.id || '';
                                  newItems[idx].vendorName = vendors[0]?.name || '';
                                }
                                setItems(newItems);
                              }}
                            />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Outsource</span>
                          </div>
                          {item.outsource && (
                            <div style={{ marginTop: '3px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <select
                                className="form-select form-select-sm"
                                value={item.vendorId || ''}
                                onChange={(e) => {
                                  if (e.target.value === '__ADD_NEW_VENDOR__') {
                                    setActiveVendorTargetIndex(idx);
                                    setIsCreateVendorModalOpen(true);
                                    return;
                                  }
                                  const newItems = [...items];
                                  const vObj = vendors.find((v) => v.id === e.target.value);
                                  newItems[idx].vendorId = e.target.value;
                                  newItems[idx].vendorName = vObj?.name || '';
                                  if (newItems[idx].outsourceJobs && newItems[idx].outsourceJobs.length > 0) {
                                    newItems[idx].outsourceJobs[0].vendorId = e.target.value;
                                    newItems[idx].outsourceJobs[0].vendorName = vObj?.name || '';
                                  }
                                  setItems(newItems);
                                }}
                              >
                                <option value="">Select Vendor</option>
                                <option value="__ADD_NEW_VENDOR__" style={{ fontWeight: 800, color: '#7c3aed' }}>
                                  + Create New Outsource Vendor...
                                </option>
                                <optgroup label="Registered Vendors">
                                  {vendors.map((v) => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                  ))}
                                </optgroup>
                              </select>

                              <button
                                type="button"
                                onClick={() => openMultiVendorModal(idx)}
                                className="btn btn-outline btn-xs"
                                style={{ fontSize: '0.68rem', fontWeight: 700, borderColor: '#7c3aed', color: '#7c3aed', background: '#faf5ff', padding: '1px 4px' }}
                              >
                                <Building2 size={11} style={{ marginRight: '2px' }} />
                                {item.outsourceJobs && item.outsourceJobs.length > 1
                                  ? `🏬 ${item.outsourceJobs.length} Vendors (₹${item.internalEstOutsourceCost})`
                                  : '+ Assign 1 or More Vendors'}
                              </button>
                            </div>
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
                            ₹{Number(calc.grossLineTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Taxable: ₹{Number(calc.taxableVal ?? 0).toFixed(1)}
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
                  <strong>₹{Number(subtotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                </div>

                {orderHeader.taxMode.includes('NTR') ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600 }}>
                    <span>GST (No Tax Mode):</span>
                    <span>₹0.00 (Exempted)</span>
                  </div>
                ) : isInterstate ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>IGST ({orderHeader.taxMode.includes('ITR') ? 'Incl.' : '18%'}):</span>
                    <span>₹{Number(igst ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>CGST ({orderHeader.taxMode.includes('ITR') ? 'Incl.' : '9%'}):</span>
                      <span>₹{Number(cgst ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                      <span>SGST ({orderHeader.taxMode.includes('ITR') ? 'Incl.' : '9%'}):</span>
                      <span>₹{Number(sgst ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Round Off:</span>
                  <span>₹{roundOff}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '0.5rem', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                  <span>Grand Total:</span>
                  <span>₹{Number(grandTotal ?? 0).toLocaleString()}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e11d48', fontWeight: 800 }}>
                  <span>Balance Payable:</span>
                  <span>₹{Number(balanceAmount ?? 0).toLocaleString()}</span>
                </div>

                <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '0.4rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span>Estimated Cost: ₹{Number(totalEstCost ?? 0).toLocaleString()}</span>
                  <span style={{ color: '#059669', fontWeight: 800 }}>
                    Gross Profit: ₹{Number(grossProfit ?? 0).toLocaleString()} ({profitMarginPct}%)
                  </span>
                </div>
              </div>

              {editingOrderId && (
                <div style={{ marginTop: '1rem', background: '#fef3c7', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                    Reason for Revision / Modification (Recorded in Audit Trail):
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., Client changed dimensions from 8x3 to 10x4 ft"
                    value={editReasonInput}
                    onChange={(e) => setEditReasonInput(e.target.value)}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  <Check size={18} /> {editingOrderId ? '💾 Save & Log Order Revision' : 'Confirm Order & Auto-Generate Job Cards'}
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
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: 'ALL' },
                  { id: 'DIRECT', label: 'DIRECT ORDERS' },
                  { id: 'QUOTATIONS', label: 'QUOTATIONS' },
                  { id: 'CONVERTED', label: 'CONVERTED' },
                  { id: 'PRODUCTION', label: 'PRODUCTION QUEUE' },
                  { id: 'DELIVERED', label: 'DELIVERED' },
                  { id: 'CANCELLED', label: 'CANCELLED' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabFilter(tab.id)}
                    className={`btn btn-sm ${activeTabFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ width: '320px', position: 'relative' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ paddingLeft: '32px' }}
                  placeholder="Search SO#, QT#, Customer, Mobile..."
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
                    <th>Doc ID / Type</th>
                    <th>Order Date</th>
                    <th>Delivery Date</th>
                    <th>Customer Name</th>
                    <th>Sales Person</th>
                    <th>Status / Workflow</th>
                    <th>Grand Total</th>
                    <th>Advance</th>
                    <th>Balance</th>
                    <th>Profit Margin</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => {
                    const isQuote = order.orderType === 'Quotation';
                    return (
                      <tr key={order.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: isQuote ? '#d97706' : '#1e40af' }}>{order.id}</div>
                          {isQuote ? (
                            <span className="badge badge-amber" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                              Quotation ({order.quotationStatus || 'Draft'})
                            </span>
                          ) : order.convertedFromQuotation ? (
                            <span className="badge badge-emerald" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                              Converted (from {order.quotationId})
                            </span>
                          ) : (
                            <span className="badge badge-blue" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                              Direct SO
                            </span>
                          )}
                        </td>
                        <td>{order.orderDate}</td>
                        <td style={{ fontWeight: 600, color: '#d97706' }}>{order.deliveryDate}</td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{order.customerName}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{order.customerMobile}</div>
                        </td>
                        <td>{order.salesPersonName}</td>
                        <td>
                          {isQuote ? (
                            <span className="badge badge-amber">{order.quotationStatus || 'Quotation'}</span>
                          ) : order.productionStatus === 'Cancelled' ? (
                            <span className="badge badge-rose" style={{ background: '#ffe4e6', color: '#e11d48', fontWeight: 800 }}>
                              <XCircle size={11} style={{ marginRight: '2px', verticalAlign: 'middle' }} /> Cancelled
                            </span>
                          ) : (
                            <span className={`badge ${
                              order.productionStatus === 'Ready for Delivery' ? 'badge-emerald' :
                              order.productionStatus === 'Delivered' ? 'badge-slate' :
                              order.productionStatus === 'Printing' ? 'badge-blue' : 'badge-amber'
                            }`}>
                              {order.productionStatus}
                            </span>
                          )}
                        </td>
                        <td style={{ fontWeight: 800 }}>₹{Number(order?.grandTotal ?? 0).toLocaleString()}</td>
                        <td style={{ color: '#059669', fontWeight: 600 }}>₹{Number(order?.advanceAmount ?? 0).toLocaleString()}</td>
                        <td style={{ color: (order?.balanceAmount || 0) > 0 ? '#e11d48' : '#059669', fontWeight: 700 }}>
                          ₹{Number(order?.balanceAmount ?? 0).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge ${order.profitMarginPct >= 50 ? 'badge-emerald' : 'badge-amber'}`}>
                            {order.profitMarginPct}%
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setViewMode('detail');
                              }}
                              className="btn btn-sm btn-secondary"
                            >
                              View
                            </button>
                            {isQuote && order.quotationStatus !== 'Converted' && (
                              <button
                                onClick={() => handleConvertQuotation(order.id)}
                                className="btn btn-sm btn-success"
                                style={{ background: '#059669', color: '#fff', fontWeight: 800, border: 'none' }}
                                title="Convert Quotation to Direct Sales Order with 1-click"
                              >
                                ⚡ Convert
                              </button>
                            )}
                            <button
                              onClick={() => handleEditOrder(order)}
                              className="btn btn-sm btn-secondary"
                              title="Edit Record"
                              style={{ color: '#d97706', fontWeight: 700 }}
                            >
                              <Edit size={14} /> Edit
                            </button>
                            {!isQuote && (
                              <button
                                onClick={() => setPrintJobCardOrder(order)}
                                className="btn btn-sm btn-secondary"
                                title="Print Job Card"
                              >
                                <Printer size={14} color="#2563eb" />
                              </button>
                            )}
                            <button
                              onClick={() => setPrintInvoiceOrder(order)}
                              className="btn btn-sm btn-secondary"
                              title={isQuote ? "Print Quotation PDF" : "Print Tax Invoice"}
                            >
                              <FileText size={14} color="#059669" />
                            </button>
                            {order.productionStatus !== 'Cancelled' && (
                              <button
                                onClick={() => setCancellingOrder(order)}
                                className="btn btn-sm btn-secondary"
                                style={{ color: '#e11d48', borderColor: '#fecdd3' }}
                                title="Cancel Order"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrderClick(order)}
                              className="btn btn-sm btn-secondary"
                              style={{ color: '#64748b' }}
                              title="Delete Order (Purge to Audit Trail)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAIL VIEW */}
      {viewMode === 'detail' && selectedOrder && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Cancelled Banner if applicable */}
          {(selectedOrder.productionStatus === 'Cancelled' || selectedOrder.isCancelled) && (
            <div style={{
              padding: '0.85rem 1.25rem',
              background: '#ffe4e6',
              border: '1px solid #fecdd3',
              borderRadius: '8px',
              color: '#9f1239',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                <XCircle size={22} color="#e11d48" />
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>THIS ORDER IS CANCELLED</div>
                  {selectedOrder.cancelReason && (
                    <div style={{ fontWeight: 500, fontSize: '0.8rem', color: '#881337', marginTop: '2px' }}>
                      Reason: "{selectedOrder.cancelReason}" • Cancelled by {selectedOrder.cancelledBy || 'Staff'}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => onNavigate ? onNavigate('sales-order-audit') : window.dispatchEvent(new CustomEvent('ERP_NAVIGATE_AUDIT'))}
                className="btn btn-sm btn-secondary"
                style={{ background: '#fff', color: '#e11d48', borderColor: '#fecdd3', fontWeight: 700 }}
              >
                <History size={14} /> View in Revision & Audit Logs
              </button>
            </div>
          )}

          {/* Header Summary */}
          <div className="card" style={{ background: '#f8fafc', borderLeft: selectedOrder.productionStatus === 'Cancelled' ? '4px solid #e11d48' : '4px solid #1e40af' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className={`badge ${selectedOrder.productionStatus === 'Cancelled' ? 'badge-rose' : 'badge-blue'}`}>
                  {selectedOrder.productionStatus}
                </span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.3rem 0' }}>
                  {selectedOrder.id} — {selectedOrder.customerName}
                </h2>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Order Date: <strong>{selectedOrder.orderDate}</strong> | Promised Delivery: <strong style={{ color: '#d97706' }}>{selectedOrder.deliveryDate}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedOrder.orderType === 'Quotation' && selectedOrder.quotationStatus !== 'Converted' && (
                  <button
                    onClick={() => handleConvertQuotation(selectedOrder.id)}
                    className="btn"
                    style={{ background: '#059669', color: '#ffffff', fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    ⚡ Convert to Sales Order
                  </button>
                )}
                <button onClick={() => handleEditOrder(selectedOrder)} className="btn btn-secondary" style={{ color: '#d97706', fontWeight: 700 }}>
                  <Edit size={16} /> Edit {selectedOrder.orderType === 'Quotation' ? 'Quotation' : 'Order'}
                </button>
                {selectedOrder.productionStatus !== 'Cancelled' && (
                  <button
                    onClick={() => setCancellingOrder(selectedOrder)}
                    className="btn btn-secondary"
                    style={{ color: '#e11d48', borderColor: '#fecdd3', fontWeight: 700 }}
                  >
                    <XCircle size={16} /> Cancel Order
                  </button>
                )}
                <button
                  onClick={() => handleDeleteOrderClick(selectedOrder)}
                  className="btn btn-secondary"
                  style={{ color: '#64748b' }}
                  title="Purge Order from active list"
                >
                  <Trash2 size={16} />
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
                    {(selectedOrder?.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>{it.productName}</td>
                        <td>{it.width && it.height ? `${it.width} × ${it.height} ${it.unit}` : it.unit}</td>
                        <td style={{ fontWeight: 700 }}>{it.qty}</td>
                        <td>{it.outsource ? <span className="badge badge-violet">{it.vendorName}</span> : 'In-House'}</td>
                        <td>₹{it.estimatedCost}</td>
                        <td>₹{it.actualVendorBill || it.estimatedVendorCost || 0}</td>
                        <td>₹{it.sellingRate}</td>
                        <td style={{ fontWeight: 800 }}>₹{Number(it?.amount ?? 0).toLocaleString()}</td>
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
                  <strong>₹{Number(selectedOrder?.subtotal ?? 0).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>GST Tax:</span>
                  <span>₹{(Number(selectedOrder?.cgst ?? 0) + Number(selectedOrder?.sgst ?? 0) + Number(selectedOrder?.igst ?? 0)).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '0.4rem', fontSize: '1.1rem', fontWeight: 800 }}>
                  <span>Grand Total:</span>
                  <span>₹{Number(selectedOrder?.grandTotal ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                  <span>Advance Received:</span>
                  <span>₹{Number(selectedOrder?.advanceAmount ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: (selectedOrder?.balanceAmount || 0) > 0 ? '#e11d48' : '#059669', fontWeight: 800 }}>
                  <span>Balance Amount:</span>
                  <span>₹{Number(selectedOrder?.balanceAmount ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', marginTop: '0.4rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gross Profit:</span>
                  <strong style={{ color: '#059669' }}>₹{Number(selectedOrder?.grossProfit ?? 0).toLocaleString()} ({selectedOrder?.profitMarginPct || 0}%)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Order Revision History & Edit Audit Trail */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="#7c3aed" /> Order Revision History & Edit Audit Trail
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {selectedOrder.lastEditedBy && (
                  <span className="badge badge-violet" style={{ fontSize: '0.72rem' }}>
                    Last edited by {selectedOrder.lastEditedBy} on {selectedOrder.lastEditedAt}
                  </span>
                )}
                <button
                  onClick={() => onNavigate ? onNavigate('sales-order-audit') : window.dispatchEvent(new CustomEvent('ERP_NAVIGATE_AUDIT'))}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.74rem', color: '#7c3aed', fontWeight: 700 }}
                >
                  <History size={13} /> View Full ERP Audit Log
                </button>
              </div>
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
        onCustomerCreated={(cust) => {
          handleSelectCustomer(cust);
          setIsCreateCustModalOpen(false);
        }}
        initialMobile={/^\d+$/.test(custSearchTerm.trim()) ? custSearchTerm.trim() : ''}
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
          setIsCreateProdModalOpen(false);
        }}
      />

      <CreateVendorModal
        isOpen={isCreateVendorModalOpen}
        onClose={() => setIsCreateVendorModalOpen(false)}
        onVendorCreated={(v) => {
          const newItems = [...items];
          if (newItems[activeVendorTargetIndex]) {
            newItems[activeVendorTargetIndex] = {
              ...newItems[activeVendorTargetIndex],
              vendorId: v.id,
              vendorName: v.name,
              outsource: true
            };
            setItems(newItems);
          }
          setIsCreateVendorModalOpen(false);
        }}
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
          setIsCreateCareOfModalOpen(false);
        }}
      />

      <JobCardPrintModal
        order={printJobCardOrder}
        isOpen={!!printJobCardOrder}
        onClose={() => setPrintJobCardOrder(null)}
      />

      <TaxInvoicePrintModal
        order={printInvoiceOrder}
        isOpen={!!printInvoiceOrder}
        onClose={() => setPrintInvoiceOrder(null)}
      />
      <CreateEmployeeModal
        isOpen={isCreateEmpModalOpen}
        onClose={() => setIsCreateEmpModalOpen(false)}
        defaultDepartment={createEmpDept}
        onEmployeeCreated={(newEmp) => {
          if (empTargetType === 'sales') {
            setOrderHeader((prev) => ({
              ...prev,
              salesPersonId: newEmp.id,
              salesPersonName: newEmp.name
            }));
          } else if (empTargetType === 'designer') {
            setItems((prev) => {
              const updated = [...prev];
              if (updated[empTargetIndex]) {
                updated[empTargetIndex].designerId = newEmp.id;
              }
              return updated;
            });
          }
        }}
      />

      {/* 1 OR MORE OUTSOURCE VENDORS & PROCESSES MODAL */}
      {outsourceModalIdx !== null && (
        <div className="modal-overlay" onClick={() => setOutsourceModalIdx(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '750px', width: '95%' }}
          >
            <div className="modal-header" style={{ background: '#f5f3ff', borderBottom: '1px solid #ddd6fe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={22} color="#7c3aed" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#5b21b6' }}>
                  Assign Outsource Vendors & Processes (1 or More)
                </h3>
              </div>
              <button onClick={() => setOutsourceModalIdx(null)} className="btn-secondary btn-icon" style={{ border: 'none' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem' }}>
              <div style={{ padding: '0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <strong>Item:</strong> {items[outsourceModalIdx]?.productName} ({items[outsourceModalIdx]?.qty} {items[outsourceModalIdx]?.unit})
                <br />
                <span style={{ color: '#475569' }}>
                  Assign 1 or multiple vendors and specialized outsourced processes (e.g. Printing, Stitching, Embroidery, Lamination, Framing) for this order line item.
                </span>
              </div>

              {/* Vendor Jobs List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {tempOutsourceJobs.map((job, jIdx) => (
                  <div
                    key={jIdx}
                    style={{
                      padding: '0.85rem',
                      background: '#faf5ff',
                      border: '1px solid #ddd6fe',
                      borderRadius: '8px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Scissors size={14} /> Outsource Process #{jIdx + 1}
                      </span>
                      {tempOutsourceJobs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setTempOutsourceJobs(tempOutsourceJobs.filter((_, i) => i !== jIdx))}
                          className="btn btn-outline btn-xs"
                          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                        >
                          <Trash2 size={13} /> Remove Process
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 0.9fr', gap: '0.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                          Outsource Vendor *
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={job.vendorId || ''}
                          onChange={(e) => {
                            if (e.target.value === '__ADD_NEW_VENDOR__') {
                              setIsCreateVendorModalOpen(true);
                              return;
                            }
                            const vObj = vendors.find(v => v.id === e.target.value);
                            const updated = [...tempOutsourceJobs];
                            updated[jIdx].vendorId = e.target.value;
                            updated[jIdx].vendorName = vObj?.name || '';
                            setTempOutsourceJobs(updated);
                          }}
                        >
                          <option value="">-- Select Outsource Vendor --</option>
                          <option value="__ADD_NEW_VENDOR__" style={{ fontWeight: 800, color: '#7c3aed' }}>
                            + Create New Outsource Vendor...
                          </option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                          Process / Work Type *
                        </label>
                        <select
                          className="form-select form-select-sm"
                          value={job.processName || 'Printing / Job Work'}
                          onChange={(e) => {
                            const updated = [...tempOutsourceJobs];
                            updated[jIdx].processName = e.target.value;
                            setTempOutsourceJobs(updated);
                          }}
                        >
                          <option value="Printing / Job Work">Flex / Offset / DTG Printing</option>
                          <option value="Stitching & Sewing">Stitching & Tailoring</option>
                          <option value="Embroidery Work">Embroidery & Patchwork</option>
                          <option value="Lamination & Coating">Lamination & UV Coating</option>
                          <option value="Framing & Mounting">Framing & Board Mounting</option>
                          <option value="Fabrication & Welding">Metal/Board Fabrication</option>
                          <option value="Courier & Logistics">Courier / Delivery Service</option>
                          <option value="Custom Outsource Job">Custom Outsource Work</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '2px' }}>
                          Est. Cost (₹) *
                        </label>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{ fontWeight: 700, color: '#6d28d9', borderColor: '#c4b5fd' }}
                          placeholder="₹ Cost"
                          value={job.estCost || ''}
                          onChange={(e) => {
                            const updated = [...tempOutsourceJobs];
                            updated[jIdx].estCost = e.target.value;
                            setTempOutsourceJobs(updated);
                          }}
                        />
                      </div>
                    </div>

                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ marginTop: '0.4rem', fontSize: '0.75rem' }}
                      placeholder="Vendor instructions / job specifications..."
                      value={job.notes || ''}
                      onChange={(e) => {
                        const updated = [...tempOutsourceJobs];
                        updated[jIdx].notes = e.target.value;
                        setTempOutsourceJobs(updated);
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Add Another Vendor / Process Button */}
              <button
                type="button"
                onClick={() => {
                  setTempOutsourceJobs([
                    ...tempOutsourceJobs,
                    {
                      id: tempOutsourceJobs.length + 1,
                      vendorId: vendors[0]?.id || '',
                      vendorName: vendors[0]?.name || '',
                      processName: 'Stitching & Sewing',
                      estCost: 0,
                      notes: ''
                    }
                  ]);
                }}
                className="btn btn-outline btn-sm"
                style={{ borderColor: '#7c3aed', color: '#7c3aed', fontWeight: 700, marginBottom: '1rem', width: '100%' }}
              >
                + Add Another Outsource Vendor / Process (1 or More)
              </button>

              {/* Summary of Total Outsource Costs for Item */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', fontSize: '0.9rem' }}>
                <span style={{ fontWeight: 700, color: '#5b21b6' }}>
                  Total Outsource Cost for this Line Item ({tempOutsourceJobs.length} Process{tempOutsourceJobs.length > 1 ? 'es' : ''}):
                </span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#6d28d9' }}>
                  ₹{tempOutsourceJobs.reduce((sum, j) => sum + (parseFloat(j.estCost) || 0), 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="modal-footer" style={{ background: '#faf5ff', borderTop: '1px solid #ddd6fe' }}>
              <button onClick={() => setOutsourceModalIdx(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={saveMultiVendorJobs} className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
                <Check size={16} /> Save Outsource Vendors ({tempOutsourceJobs.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL ORDER MODAL */}
      {cancellingOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem', color: '#e11d48' }}>
              <AlertTriangle size={28} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                  Cancel Order {cancellingOrder.id}?
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Customer: <strong>{cancellingOrder.customerName}</strong> • Grand Total: ₹{Number(cancellingOrder.grandTotal || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
              Cancelling will mark this order status as <strong>Cancelled</strong>, halt shop floor job work, reverse customer outstanding dues (-₹{Number(cancellingOrder.balanceAmount || 0).toLocaleString()}), and create an entry in the central audit trail.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                Reason for Cancellation (Required):
              </label>
              <textarea
                className="form-input"
                rows={3}
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                placeholder="e.g., Customer postponed campaign, design rejected, duplicate entry..."
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="btn btn-secondary"
                disabled={isCancellingOrder}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="btn"
                style={{ background: '#e11d48', color: '#fff', fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                disabled={isCancellingOrder || !cancelReasonInput.trim()}
              >
                <XCircle size={16} />
                {isCancellingOrder ? 'Cancelling...' : 'Confirm Order Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
