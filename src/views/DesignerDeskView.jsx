import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Palette,
  Users,
  Search,
  Plus,
  Save,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Upload,
  Eye,
  Trash2,
  Calendar,
  Phone,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  ExternalLink,
  History,
  Check,
  X,
  RefreshCw,
  Sliders,
  DollarSign,
  Maximize2,
  Minimize2,
  UserCheck,
  UserPlus,
  Package,
  Share2,
  Copy,
  Printer
} from 'lucide-react';
import { CreateCustomerModal } from '../components/modals/CreateCustomerModal';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { resolveItemPricingAndCost } from '../utils/pricingEngine';

export const DesignerDeskView = ({ onNavigate }) => {
  const {
    customers,
    products,
    productMaterialSpecs,
    productPricingSlabs,
    customerPricingRules,
    productBoms,
    productYieldConfigs,
    salesOrders,
    employees,
    activeUser,
    activeRole,
    designerSessions,
    createDesignerSession,
    updateDesignerSession,
    submitSessionToSales,
    uploadSessionArtwork,
    addOrderAmendment
  } = useERP();

  // Active Desk Workspace Sub-Tabs: 'WORKSPACE' | 'SESSIONS_LIST' | 'ARTWORK_QUEUE'
  const [deskTab, setDeskTab] = useState('WORKSPACE');

  // Working Modes:
  // MODE A: Designer Handles Product Entry & Permitted Pricing
  // MODE B: Designer Adds Products -> Handover to Sales for Pricing
  // MODE C: Working on Existing Sales Order (Artwork / Amendments)
  const [workingMode, setWorkingMode] = useState('MODE_A');

  // Current Designer Context Identifier
  const currentDesignerName = activeUser?.name || 'Designer';
  const currentDesignerId = activeUser?.employeeId || activeUser?.id || 'DES-01';

  // Active Session State
  const [activeSession, setActiveSession] = useState(null);
  const [sessionRequirements, setSessionRequirements] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // Selected Customer
  const [selectedCust, setSelectedCust] = useState(null);
  const [custSearchTerm, setCustSearchTerm] = useState('');
  const [isCustDropdownOpen, setIsCustDropdownOpen] = useState(false);
  const [isCreateCustModalOpen, setIsCreateCustModalOpen] = useState(false);

  // Linked / Target Order Context
  const [linkedOrderId, setLinkedOrderId] = useState(null);
  const [linkedOrderNumber, setLinkedOrderNumber] = useState(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [isOrderSearchOpen, setIsOrderSearchOpen] = useState(false);

  // Line Items in Active Workspace
  const createBlankItem = (id = 1) => ({
    id: `ITEM-${Date.now()}-${id}`,
    productId: '',
    productName: '',
    customTitle: '',
    specId: '',
    specName: '',
    material: '',
    description: '',
    width: '',
    height: '',
    qty: 1,
    unit: 'Sq.Ft',
    sellingRate: '',
    pricingResponsibility: 'SALES', // 'DESIGNER' | 'SALES' | 'AUTO' | 'MANAGER_APPROVAL'
    pricingStatus: 'PENDING',       // 'COMPLETE' | 'PENDING'
    discount: 0,
    gstRate: 18,
    taxType: 'ETR',
    estimatedCost: 0,
    artworkUrl: '',
    artworkName: '',
    artworkStatus: 'Pending',
    designNotes: '',
    artworkNotes: '',
    isAmendment: false
  });

  const [workspaceItems, setWorkspaceItems] = useState([createBlankItem(1)]);

  // Auto-save & Status Feedback State
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'dirty' | 'error'
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const autoSaveTimerRef = useRef(null);

  // Artwork Modal State
  const [artworkModalItemIdx, setArtworkModalItemIdx] = useState(null);
  const [artworkFileUrl, setArtworkFileUrl] = useState('');
  const [artworkFileName, setArtworkFileName] = useState('');
  const [artworkDimensions, setArtworkDimensions] = useState('');
  const [artworkProofStatus, setArtworkProofStatus] = useState('Draft');
  const [artworkRevisionReason, setArtworkRevisionReason] = useState('');
  const [artworkIsProductionReady, setArtworkIsProductionReady] = useState(false);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState(null);

  // Session Selector / Drawer Modal State
  const [isSessionDrawerOpen, setIsSessionDrawerOpen] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('ALL');

  // Submit confirmation modal / feedback
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submissionSuccessModal, setSubmissionSuccessModal] = useState(null);

  // -------------------------------------------------------------
  // Filtered Customer & Order Lookups
  // -------------------------------------------------------------
  const filteredCustomers = useMemo(() => {
    if (!custSearchTerm.trim()) return (customers || []).slice(0, 10);
    const q = custSearchTerm.toLowerCase();
    return (customers || []).filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [customers, custSearchTerm]);

  const filteredOrders = useMemo(() => {
    if (!orderSearchTerm.trim()) return (salesOrders || []).slice(0, 10);
    const q = orderSearchTerm.toLowerCase();
    return (salesOrders || []).filter(o =>
      (o.id && o.id.toLowerCase().includes(q)) ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [salesOrders, orderSearchTerm]);

  // Customer previous orders
  const customerPastOrders = useMemo(() => {
    if (!selectedCust?.id) return [];
    return (salesOrders || []).filter(o => o.customerId === selectedCust.id).slice(0, 5);
  }, [salesOrders, selectedCust]);

  // -------------------------------------------------------------
  // Start or Load Session Logic
  // -------------------------------------------------------------
  const startNewWalkInSession = useCallback(async (customCustomer = null) => {
    try {
      setSaveStatus('saving');
      const targetCust = customCustomer || null;
      const res = await createDesignerSession({
        customerName: targetCust ? targetCust.name : 'Walk-in Customer',
        customerId: targetCust ? targetCust.id : null,
        customerMobile: targetCust ? targetCust.mobile : '',
        customerEmail: targetCust ? targetCust.email : '',
        designerName: currentDesignerName,
        designerId: currentDesignerId,
        designRequirements: '',
        sessionNotes: '',
        draftItems: [createBlankItem(1)]
      });

      if (res && res.session) {
        setActiveSession(res.session);
        setSelectedCust(targetCust);
        setCustSearchTerm(targetCust ? `${targetCust.name} (${targetCust.mobile || ''})` : '');
        setSessionRequirements('');
        setSessionNotes('');
        setLinkedOrderId(null);
        setLinkedOrderNumber(null);
        setWorkspaceItems([createBlankItem(1)]);
        setWorkingMode('MODE_A');
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error("Failed to start walk-in session:", err);
      setSaveStatus('error');
    }
  }, [createDesignerSession, currentDesignerName, currentDesignerId]);

  // Auto-initiate first session if empty on initial mount
  useEffect(() => {
    if (!activeSession && (!designerSessions || designerSessions.length === 0)) {
      startNewWalkInSession();
    } else if (!activeSession && designerSessions && designerSessions.length > 0) {
      // Resume latest active session if one exists
      const latestActive = designerSessions.find(s => s.sessionStatus === 'Active') || designerSessions[0];
      loadExistingSession(latestActive);
    }
  }, []);

  const loadExistingSession = (session) => {
    if (!session) return;
    setActiveSession(session);
    setSessionRequirements(session.designRequirements || '');
    setSessionNotes(session.sessionNotes || '');
    setLinkedOrderId(session.salesOrderId || null);
    setLinkedOrderNumber(session.orderNumber || null);

    // Find customer
    if (session.customerId) {
      const foundCust = (customers || []).find(c => c.id === session.customerId);
      setSelectedCust(foundCust || { id: session.customerId, name: session.customerName, mobile: session.customerMobile });
      setCustSearchTerm(session.customerName ? `${session.customerName} (${session.customerMobile || ''})` : '');
    } else {
      setSelectedCust(session.customerName ? { name: session.customerName, mobile: session.customerMobile } : null);
      setCustSearchTerm(session.customerName || '');
    }

    // Load items
    let loadedItems = [];
    if (Array.isArray(session.draftItems) && session.draftItems.length > 0) {
      loadedItems = session.draftItems;
    } else {
      loadedItems = [createBlankItem(1)];
    }
    setWorkspaceItems(loadedItems);

    if (session.salesOrderId) {
      setWorkingMode('MODE_C');
    } else {
      setWorkingMode('MODE_A');
    }

    setSaveStatus('saved');
    setLastSavedTime(new Date().toLocaleTimeString());
    setIsSessionDrawerOpen(false);
  };

  // -------------------------------------------------------------
  // Product Selection & Pricing Resolver
  // -------------------------------------------------------------
  const handleSelectProduct = (itemIdx, productId) => {
    const prod = (products || []).find(p => p.id === productId);
    if (!prod) return;

    // Find default material spec
    const specsForProd = (productMaterialSpecs || []).filter(s => s.productId === productId);
    const defaultSpec = specsForProd.find(s => s.isDefault) || specsForProd[0];

    const allowDesignerPricing = Boolean(prod.allowDesignerPricing);
    const defaultPricingResp = prod.defaultPricingResponsibility || (allowDesignerPricing ? 'DESIGNER' : 'SALES');

    // Auto resolve price
    const resolved = resolveItemPricingAndCost({
      item: {
        productId,
        specId: defaultSpec?.id || '',
        width: 1,
        height: 1,
        qty: 1,
        unit: prod.unit || 'Sq.Ft'
      },
      product: prod,
      spec: defaultSpec,
      customer: selectedCust,
      allSlabs: (productPricingSlabs || []).filter(s => s.productId === productId),
      customerRules: customerPricingRules || [],
      bom: (productBoms || []).find(b => b.productId === productId),
      yieldConfig: (productYieldConfigs || []).find(y => y.productId === productId)
    });

    const isDesignerRole = activeRole === 'Designer';
    const rateToUse = allowDesignerPricing || !isDesignerRole ? (resolved?.rate || prod.defaultRate || '') : '';
    const initialPricingStatus = (rateToUse && Number(rateToUse) > 0) ? 'COMPLETE' : 'PENDING';

    setWorkspaceItems(prev => {
      const next = [...prev];
      next[itemIdx] = {
        ...next[itemIdx],
        productId: prod.id,
        productName: prod.name,
        customTitle: prod.name,
        unit: prod.unit || 'Sq.Ft',
        specId: defaultSpec?.id || '',
        specName: defaultSpec?.specName || '',
        material: defaultSpec?.materialName || prod.defaultMaterial || '',
        gstRate: prod.gstRate || 18,
        sellingRate: rateToUse,
        pricingResponsibility: defaultPricingResp,
        pricingStatus: initialPricingStatus,
        estimatedCost: resolved?.totalEstimatedCost || prod.estimatedCost || 0
      };
      return next;
    });

    triggerDirtyAutoSave();
  };

  const handleSelectSpec = (itemIdx, specId) => {
    const spec = (productMaterialSpecs || []).find(s => s.id === specId);
    if (!spec) return;

    setWorkspaceItems(prev => {
      const next = [...prev];
      const cur = next[itemIdx];
      const prod = (products || []).find(p => p.id === cur.productId);
      const allowDesignerPricing = Boolean(prod?.allowDesignerPricing);
      const isDesignerRole = activeRole === 'Designer';

      const rateToUse = allowDesignerPricing || !isDesignerRole ? (spec.sellingPrice || cur.sellingRate) : '';

      next[itemIdx] = {
        ...cur,
        specId: spec.id,
        specName: spec.specName,
        material: spec.materialName || cur.material,
        sellingRate: rateToUse || cur.sellingRate,
        estimatedCost: spec.costPrice || cur.estimatedCost
      };
      return next;
    });

    triggerDirtyAutoSave();
  };

  const handleUpdateItemField = (itemIdx, field, value) => {
    setWorkspaceItems(prev => {
      const next = [...prev];
      next[itemIdx] = { ...next[itemIdx], [field]: value };

      // If user enters rate directly, update pricingStatus
      if (field === 'sellingRate') {
        const numRate = parseFloat(value);
        if (!isNaN(numRate) && numRate > 0) {
          next[itemIdx].pricingStatus = 'COMPLETE';
        } else {
          next[itemIdx].pricingStatus = 'PENDING';
        }
      }

      return next;
    });
    triggerDirtyAutoSave();
  };

  // Add Product button (Section 7: Extra Product / Additional Work)
  const handleAddNewProductRow = () => {
    const isAmendmentItem = workingMode === 'MODE_C' || Boolean(linkedOrderId);
    const newItem = {
      ...createBlankItem(workspaceItems.length + 1),
      isAmendment: isAmendmentItem,
      description: isAmendmentItem ? 'Additional product requested during design session' : ''
    };
    setWorkspaceItems(prev => [...prev, newItem]);
    triggerDirtyAutoSave();
  };

  const handleRemoveProductRow = (itemIdx) => {
    if (workspaceItems.length <= 1) {
      setWorkspaceItems([createBlankItem(1)]);
    } else {
      setWorkspaceItems(prev => prev.filter((_, idx) => idx !== itemIdx));
    }
    triggerDirtyAutoSave();
  };

  // -------------------------------------------------------------
  // Dynamic Calculation Helper for Item Totals
  // -------------------------------------------------------------
  const calculateItemAmount = (item) => {
    const qty = Number(item.qty || 1);
    const rate = Number(item.sellingRate || 0);
    const width = Number(item.width || 0);
    const height = Number(item.height || 0);
    const unit = (item.unit || 'Sq.Ft').toLowerCase();

    let area = qty;
    if (unit === 'sq.ft' || unit === 'sqft') {
      if (width > 0 && height > 0) {
        area = width * height * qty;
      }
    } else if (unit === 'rft' || unit === 'running ft') {
      area = (width > 0 ? width : height > 0 ? height : 1) * qty;
    }

    const subtotal = rate * area;
    const discount = Number(item.discount || 0);
    const taxable = Math.max(0, subtotal - discount);
    const tax = (taxable * Number(item.gstRate || 18)) / 100;
    const total = taxable + tax;

    return {
      chargeableArea: area,
      subtotal,
      taxable,
      tax,
      total: Math.round(total * 100) / 100
    };
  };

  // Total Summary
  const workspaceTotals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;
    let pendingPriceItemsCount = 0;

    workspaceItems.forEach(it => {
      const calc = calculateItemAmount(it);
      subtotal += calc.taxable;
      taxTotal += calc.tax;
      grandTotal += calc.total;
      if (it.pricingStatus === 'PENDING' || !it.sellingRate || Number(it.sellingRate) <= 0) {
        pendingPriceItemsCount += 1;
      }
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      grandTotal: Math.round(grandTotal),
      pendingPriceItemsCount,
      allPriced: pendingPriceItemsCount === 0
    };
  }, [workspaceItems]);

  // -------------------------------------------------------------
  // Auto-Save Draft Session (Real SQLite Persistence)
  // -------------------------------------------------------------
  const triggerDirtyAutoSave = () => {
    setSaveStatus('dirty');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveSessionDraft();
    }, 1800); // Debounced auto-save after 1.8s
  };

  const saveSessionDraft = async () => {
    if (!activeSession?.id) return;
    try {
      setSaveStatus('saving');
      const payload = {
        customerId: selectedCust?.id || null,
        customerName: selectedCust?.name || 'Walk-in Customer',
        customerMobile: selectedCust?.mobile || '',
        customerEmail: selectedCust?.email || '',
        salesOrderId: linkedOrderId || null,
        orderNumber: linkedOrderNumber || null,
        designRequirements: sessionRequirements,
        sessionNotes: sessionNotes,
        draftItems: workspaceItems,
        version: activeSession.version
      };

      const res = await updateDesignerSession(activeSession.id, payload);
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
      if (res?.version) {
        setActiveSession(prev => ({ ...prev, version: res.version }));
      }
    } catch (err) {
      console.warn("Auto-save session warning:", err);
      setSaveStatus('error');
    }
  };

  // -------------------------------------------------------------
  // Artwork Drawer & Proof Management (Section 8)
  // -------------------------------------------------------------
  const openArtworkModal = (itemIdx) => {
    setArtworkModalItemIdx(itemIdx);
    const item = workspaceItems[itemIdx];
    setArtworkFileUrl(item.artworkUrl || '');
    setArtworkFileName(item.artworkName || (item.productName ? `${item.productName}_artwork.pdf` : 'artwork.pdf'));
    setArtworkDimensions(item.width && item.height ? `${item.width} x ${item.height} ${item.unit}` : '');
    setArtworkProofStatus(item.artworkStatus || 'Draft');
    setArtworkRevisionReason('');
    setArtworkIsProductionReady(false);
  };

  const handleSaveArtworkToItem = async () => {
    if (artworkModalItemIdx === null) return;
    try {
      setIsUploadingArtwork(true);
      const item = workspaceItems[artworkModalItemIdx];

      // Save artwork record to backend
      if (activeSession?.id && artworkFileUrl) {
        await uploadSessionArtwork(activeSession.id, {
          fileName: artworkFileName,
          fileUrl: artworkFileUrl,
          dimensions: artworkDimensions,
          notes: artworkRevisionReason || item.designNotes,
          itemId: item.id,
          orderId: linkedOrderId || activeSession.salesOrderId
        });
      }

      setWorkspaceItems(prev => {
        const next = [...prev];
        next[artworkModalItemIdx] = {
          ...next[artworkModalItemIdx],
          artworkUrl: artworkFileUrl,
          artworkName: artworkFileName,
          artworkStatus: artworkProofStatus,
          artworkNotes: artworkRevisionReason || next[artworkModalItemIdx].artworkNotes
        };
        return next;
      });

      setArtworkModalItemIdx(null);
      setIsUploadingArtwork(false);
      triggerDirtyAutoSave();
    } catch (err) {
      console.error("Failed to upload artwork:", err);
      setIsUploadingArtwork(false);
      alert('Failed to save artwork: ' + err.message);
    }
  };

  // File upload simulation / local file reader for fast counter interaction
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArtworkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setArtworkFileUrl(uploadEvent.target?.result);
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------
  // Submit Session to Sales Order / Confirmation
  // -------------------------------------------------------------
  const handleSubmitSession = async () => {
    if (!activeSession?.id) return;

    // Validate valid customer
    if (!selectedCust?.name && !custSearchTerm.trim()) {
      alert('Please enter or select a customer for this session.');
      return;
    }

    // Validate line items
    const invalidItem = workspaceItems.find(i => !i.productId && !i.productName);
    if (invalidItem) {
      alert('Please select a product for all rows before submitting.');
      return;
    }

    try {
      setIsSubmittingOrder(true);

      // If Mode C or linked to confirmed order, and adding amendment lines:
      if (linkedOrderId && workspaceItems.some(i => i.isAmendment)) {
        const amendmentLines = workspaceItems.filter(i => i.isAmendment);
        await addOrderAmendment(linkedOrderId, {
          items: amendmentLines,
          reason: sessionNotes || 'Additional work added in Designer Desk'
        });
        setSubmissionSuccessModal({
          orderId: linkedOrderId,
          orderNumber: linkedOrderNumber || linkedOrderId,
          pricingStatus: workspaceTotals.allPriced ? 'PRICING_COMPLETE' : 'PRICING_PENDING',
          message: `Amendment items added to existing Order #${linkedOrderNumber || linkedOrderId}.`
        });
        setIsSubmittingOrder(false);
        return;
      }

      // Standard Submission (Mode A or Mode B)
      const res = await submitSessionToSales(activeSession.id, {
        customerId: selectedCust?.id || null,
        customerName: selectedCust?.name || custSearchTerm || 'Walk-in Customer',
        customerMobile: selectedCust?.mobile || '',
        customerEmail: selectedCust?.email || '',
        salesOrderId: linkedOrderId || activeSession.salesOrderId || null,
        orderType: 'Direct',
        notes: sessionNotes || sessionRequirements || '',
        items: workspaceItems
      });

      setIsSubmittingOrder(false);
      setSubmissionSuccessModal({
        orderId: res.orderId,
        orderNumber: res.orderNumber,
        pricingStatus: res.pricingStatus,
        hasPendingPricing: res.hasPendingPricing,
        message: res.message
      });
    } catch (err) {
      console.error("Submission failed:", err);
      setIsSubmittingOrder(false);
      alert('Failed to submit order: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '1.25rem', color: '#f8fafc', minHeight: '90vh' }}>
      {/* ----------------------------------------------------------------- */}
      {/* 1. TOP HEADER & WORKFLOW MODE BAR                                 */}
      {/* ----------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1rem 1.25rem',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '12px',
        border: '1px solid #334155',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        marginBottom: '1.25rem'
      }}>
        {/* Title & Active Session Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(59,130,246,0.4)'
          }}>
            <Palette size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
                Designer Desk
              </h1>
              {activeSession && (
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '20px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.3)'
                }}>
                  {activeSession.sessionNumber}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              <span>Designer: <strong style={{ color: '#e2e8f0' }}>{currentDesignerName}</strong></span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={13} />
                Started: {activeSession?.startedAt ? new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
              </span>
              <span>•</span>
              <span style={{
                color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'saving' ? '#f59e0b' : saveStatus === 'dirty' ? '#fbbf24' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                {saveStatus === 'saved' && <Check size={13} />}
                {saveStatus === 'saving' && <RefreshCw size={13} className="animate-spin" />}
                {saveStatus === 'saved' ? `Saved ${lastSavedTime || ''}` : saveStatus === 'saving' ? 'Auto-saving...' : 'Unsaved changes'}
              </span>
            </div>
          </div>
        </div>

        {/* Working Mode Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#0f172a',
          padding: '0.3rem',
          borderRadius: '10px',
          border: '1px solid #334155'
        }}>
          <button
            onClick={() => setWorkingMode('MODE_A')}
            title="Designer enters products and prices permitted retail items"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '7px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: workingMode === 'MODE_A' ? '#3b82f6' : 'transparent',
              color: workingMode === 'MODE_A' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            Mode A: Full Order & Pricing
          </button>
          <button
            onClick={() => setWorkingMode('MODE_B')}
            title="Designer adds specs & artwork; Sales enters commercial rates"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '7px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: workingMode === 'MODE_B' ? '#8b5cf6' : 'transparent',
              color: workingMode === 'MODE_B' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            Mode B: Submit to Sales Pricing
          </button>
          <button
            onClick={() => { setWorkingMode('MODE_C'); setIsOrderSearchOpen(true); }}
            title="Open existing sales order to revise artwork or add extra products"
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '7px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: workingMode === 'MODE_C' ? '#10b981' : 'transparent',
              color: workingMode === 'MODE_C' ? '#ffffff' : '#94a3b8',
              transition: 'all 0.15s ease'
            }}
          >
            Mode C: Existing Sales Order
          </button>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => startNewWalkInSession()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              background: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={15} />
            New Walk-in
          </button>

          <button
            onClick={() => setIsSessionDrawerOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              background: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <History size={15} />
            Sessions ({(designerSessions || []).length})
          </button>

          <button
            onClick={saveSessionDraft}
            disabled={saveStatus === 'saving'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #0284c7',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Save size={15} />
            Save Draft
          </button>

          <button
            onClick={handleSubmitSession}
            disabled={isSubmittingOrder}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              background: workspaceTotals.allPriced
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            }}
          >
            {isSubmittingOrder ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            {workspaceTotals.allPriced ? 'Confirm Order' : 'Submit to Sales Queue'}
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. CUSTOMER WORKSPACE HEADER                                      */}
      {/* ----------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        {/* Customer Details & Fast Search Card */}
        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          border: '1px solid #334155',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Customer Details
            </span>
            <button
              onClick={() => setIsCreateCustModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <UserPlus size={13} />
              + New Customer
            </button>
          </div>

          {/* Customer Searchable Input */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search Customer by Name, Mobile or Code..."
                value={custSearchTerm}
                onChange={(e) => {
                  setCustSearchTerm(e.target.value);
                  setIsCustDropdownOpen(true);
                }}
                onFocus={() => setIsCustDropdownOpen(true)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.8rem 0.55rem 2.2rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '7px',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}
              />
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', color: '#64748b' }} />
              {custSearchTerm && (
                <button
                  onClick={() => {
                    setCustSearchTerm('');
                    setSelectedCust(null);
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {isCustDropdownOpen && filteredCustomers.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '105%',
                left: 0,
                right: 0,
                zIndex: 30,
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                maxHeight: '220px',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}>
                {filteredCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCust(c);
                      setCustSearchTerm(`${c.name}${c.mobile ? ` (${c.mobile})` : ''}`);
                      setIsCustDropdownOpen(false);
                      triggerDirtyAutoSave();
                    }}
                    style={{
                      padding: '0.5rem 0.8rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #1e293b',
                      fontSize: '0.82rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <strong style={{ color: '#e2e8f0' }}>{c.name}</strong>
                      <span style={{ color: '#94a3b8', marginLeft: '0.5rem' }}>{c.mobile || 'No Mobile'}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{c.customer_code || c.code || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Customer Summary Badge */}
          {selectedCust ? (
            <div style={{
              background: '#0f172a',
              borderRadius: '7px',
              padding: '0.65rem 0.85rem',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#38bdf8' }}>{selectedCust.name}</span>
                <span style={{ fontSize: '0.7rem', background: '#1e293b', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#94a3b8' }}>
                  {selectedCust.type || selectedCust.customer_type || 'Regular'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.76rem' }}>
                <span>Mobile: <strong style={{ color: '#e2e8f0' }}>{selectedCust.mobile || '—'}</strong></span>
                {selectedCust.gstin && <span>GSTIN: <strong style={{ color: '#e2e8f0' }}>{selectedCust.gstin}</strong></span>}
                {Number(selectedCust.outstandingAmount || selectedCust.outstanding || 0) > 0 && (
                  <span style={{ color: '#f87171' }}>
                    Outstanding: ₹{Number(selectedCust.outstandingAmount || selectedCust.outstanding).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
              Walk-in counter customer selected (Select registered customer above or create new)
            </div>
          )}
        </div>

        {/* Existing Order Link / Previous Orders Card */}
        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          border: '1px solid #334155',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Linked Sales Order Context
            </span>
            {linkedOrderId && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                Linked: #{linkedOrderNumber || linkedOrderId}
              </span>
            )}
          </div>

          {/* Quick Search Sales Order */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search existing Sales Order (e.g. SO-2026-0001)..."
              value={orderSearchTerm}
              onChange={(e) => {
                setOrderSearchTerm(e.target.value);
                setIsOrderSearchOpen(true);
              }}
              onFocus={() => setIsOrderSearchOpen(true)}
              style={{
                width: '100%',
                padding: '0.55rem 0.8rem 0.55rem 2.2rem',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '7px',
                color: '#fff',
                fontSize: '0.85rem'
              }}
            />
            <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '0.75rem', color: '#64748b' }} />

            {isOrderSearchOpen && filteredOrders.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '105%',
                left: 0,
                right: 0,
                zIndex: 30,
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
              }}>
                {filteredOrders.map(o => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setLinkedOrderId(o.id);
                      setLinkedOrderNumber(o.orderNumber || o.id);
                      setOrderSearchTerm(`${o.orderNumber || o.id} (${o.customerName})`);
                      setIsOrderSearchOpen(false);
                      setWorkingMode('MODE_C');

                      // If customer matches or load order items
                      if (o.customerId && (!selectedCust || selectedCust.id !== o.customerId)) {
                        const cust = (customers || []).find(c => c.id === o.customerId);
                        if (cust) {
                          setSelectedCust(cust);
                          setCustSearchTerm(`${cust.name} (${cust.mobile || ''})`);
                        }
                      }

                      // Load order items into workspace
                      if (Array.isArray(o.items) && o.items.length > 0) {
                        const mapped = o.items.map(it => ({
                          ...it,
                          id: it.id,
                          productId: it.productId,
                          productName: it.productName,
                          customTitle: it.customTitle,
                          specId: it.specId,
                          specName: it.specName,
                          material: it.material,
                          width: it.width,
                          height: it.height,
                          qty: it.qty,
                          unit: it.unit || 'Sq.Ft',
                          sellingRate: it.sellingRate,
                          pricingResponsibility: it.pricingResponsibility || 'SALES',
                          pricingStatus: it.pricingStatus || 'COMPLETE',
                          artworkUrl: it.artworkUrl,
                          artworkStatus: it.artworkStatus || 'Approved',
                          isAmendment: false
                        }));
                        setWorkspaceItems(mapped);
                      }
                      triggerDirtyAutoSave();
                    }}
                    style={{
                      padding: '0.5rem 0.8rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #1e293b',
                      fontSize: '0.82rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#1e293b'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <strong style={{ color: '#38bdf8' }}>{o.orderNumber || o.id}</strong>
                      <span style={{ color: '#cbd5e1', marginLeft: '0.5rem' }}>{o.customerName}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>₹{Number(o.grandTotal || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past customer orders chips */}
          {customerPastOrders.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Customer Orders:</span>
              {customerPastOrders.map(po => (
                <button
                  key={po.id}
                  onClick={() => {
                    setLinkedOrderId(po.id);
                    setLinkedOrderNumber(po.orderNumber || po.id);
                    setOrderSearchTerm(po.orderNumber || po.id);
                    setWorkingMode('MODE_C');
                    triggerDirtyAutoSave();
                  }}
                  style={{
                    fontSize: '0.72rem',
                    background: linkedOrderId === po.id ? '#3b82f6' : '#0f172a',
                    color: linkedOrderId === po.id ? '#fff' : '#cbd5e1',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.2rem 0.45rem',
                    cursor: 'pointer'
                  }}
                >
                  {po.orderNumber || po.id} (₹{po.grandTotal})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customer Requirements & Design Notes Card */}
        <div style={{
          background: '#1e293b',
          borderRadius: '10px',
          border: '1px solid #334155',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Customer Requirements & Notes
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Saved with session</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1 }}>
            <textarea
              placeholder="Customer's artwork/concept brief, colors, branding..."
              value={sessionRequirements}
              onChange={(e) => {
                setSessionRequirements(e.target.value);
                triggerDirtyAutoSave();
              }}
              style={{
                width: '100%',
                height: '75px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '0.5rem',
                color: '#fff',
                fontSize: '0.8rem',
                resize: 'none'
              }}
            />
            <textarea
              placeholder="Internal designer notes, bleed, DPI, special instructions..."
              value={sessionNotes}
              onChange={(e) => {
                setSessionNotes(e.target.value);
                triggerDirtyAutoSave();
              }}
              style={{
                width: '100%',
                height: '75px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '0.5rem',
                color: '#fff',
                fontSize: '0.8rem',
                resize: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. PRODUCT ENTRY TABLE (USING EXISTING PRODUCT MASTER)           */}
      {/* ----------------------------------------------------------------- */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        marginBottom: '1.25rem'
      }}>
        {/* Table Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1.25rem',
          background: '#0f172a',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              Products & Artwork Matrix
            </h2>
            <span style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              background: '#1e293b',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid #334155'
            }}>
              {workspaceItems.length} Product Line{workspaceItems.length > 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleAddNewProductRow}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(59,130,246,0.3)'
              }}
            >
              <Plus size={15} />
              Add Product
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '0.75rem 0.6rem', width: '38px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '0.75rem 0.8rem', minWidth: '220px' }}>Product & Specifications</th>
                <th style={{ padding: '0.75rem 0.6rem', width: '130px' }}>Dimensions (W x H)</th>
                <th style={{ padding: '0.75rem 0.6rem', width: '110px' }}>Qty & Unit</th>
                <th style={{ padding: '0.75rem 0.6rem', width: '130px' }}>Artwork & Preview</th>
                <th style={{ padding: '0.75rem 0.6rem', minWidth: '160px' }}>Pricing Responsibility</th>
                <th style={{ padding: '0.75rem 0.6rem', width: '110px' }}>Rate (₹)</th>
                <th style={{ padding: '0.75rem 0.6rem', width: '110px', textAlign: 'right' }}>Total (₹)</th>
                <th style={{ padding: '0.75rem 0.6rem', width: '45px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {workspaceItems.map((item, idx) => {
                const prod = (products || []).find(p => p.id === item.productId);
                const specsForProd = (productMaterialSpecs || []).filter(s => s.productId === item.productId);
                const allowDesignerPricing = Boolean(prod?.allowDesignerPricing);
                const isDesignerUser = activeRole === 'Designer';
                const canEditPrice = !isDesignerUser || allowDesignerPricing || item.pricingResponsibility === 'DESIGNER';
                const calc = calculateItemAmount(item);

                return (
                  <tr
                    key={item.id || idx}
                    style={{
                      borderBottom: '1px solid #334155',
                      background: item.isAmendment ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Index & Amendment Flag */}
                    <td style={{ padding: '0.65rem 0.6rem', textAlign: 'center', color: '#64748b' }}>
                      {idx + 1}
                      {item.isAmendment && (
                        <div style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 700 }}>AMD</div>
                      )}
                    </td>

                    {/* Product Master & Material Specification */}
                    <td style={{ padding: '0.65rem 0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleSelectProduct(idx, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.83rem',
                            fontWeight: 600
                          }}
                        >
                          <option value="">-- Select Product Master --</option>
                          {(products || []).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.unit || 'Sq.Ft'}) {p.allowDesignerPricing ? '★ Retail' : ''}
                            </option>
                          ))}
                        </select>

                        {/* Specifications / Materials */}
                        {specsForProd.length > 0 && (
                          <select
                            value={item.specId || ''}
                            onChange={(e) => handleSelectSpec(idx, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.35rem 0.6rem',
                              background: '#1e293b',
                              border: '1px solid #475569',
                              borderRadius: '5px',
                              color: '#cbd5e1',
                              fontSize: '0.78rem'
                            }}
                          >
                            <option value="">-- Material Specification --</option>
                            {specsForProd.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.specName} ({s.materialName}) - ₹{s.sellingPrice}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>

                    {/* Dimensions (W x H) */}
                    <td style={{ padding: '0.65rem 0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          placeholder="W"
                          value={item.width || ''}
                          onChange={(e) => handleUpdateItemField(idx, 'width', e.target.value)}
                          style={{
                            width: '48px',
                            padding: '0.4rem 0.35rem',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '5px',
                            color: '#fff',
                            fontSize: '0.8rem',
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ color: '#64748b' }}>×</span>
                        <input
                          type="number"
                          placeholder="H"
                          value={item.height || ''}
                          onChange={(e) => handleUpdateItemField(idx, 'height', e.target.value)}
                          style={{
                            width: '48px',
                            padding: '0.4rem 0.35rem',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '5px',
                            color: '#fff',
                            fontSize: '0.8rem',
                            textAlign: 'center'
                          }}
                        />
                      </div>
                      {item.width && item.height && (
                        <div style={{ fontSize: '0.7rem', color: '#38bdf8', marginTop: '0.2rem' }}>
                          Area: {calc.chargeableArea} {item.unit}
                        </div>
                      )}
                    </td>

                    {/* Qty & Unit */}
                    <td style={{ padding: '0.65rem 0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <input
                          type="number"
                          min="1"
                          value={item.qty || ''}
                          onChange={(e) => handleUpdateItemField(idx, 'qty', e.target.value)}
                          style={{
                            width: '50px',
                            padding: '0.4rem 0.4rem',
                            background: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '5px',
                            color: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{item.unit || 'Pcs'}</span>
                      </div>
                    </td>

                    {/* Artwork & Preview */}
                    <td style={{ padding: '0.65rem 0.6rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {item.artworkUrl ? (
                          <div
                            onClick={() => setPreviewImageModal(item.artworkUrl)}
                            title="Click to zoom artwork"
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              border: '1px solid #38bdf8',
                              cursor: 'pointer',
                              background: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <img src={item.artworkUrl} alt="Artwork" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            background: '#0f172a',
                            border: '1px dashed #475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b'
                          }}>
                            <ImageIcon size={16} />
                          </div>
                        )}

                        <button
                          onClick={() => openArtworkModal(idx)}
                          title="Manage artwork, version history & customer approval"
                          style={{
                            padding: '0.35rem 0.55rem',
                            borderRadius: '5px',
                            background: item.artworkUrl ? 'rgba(56, 189, 248, 0.15)' : '#334155',
                            color: item.artworkUrl ? '#38bdf8' : '#e2e8f0',
                            border: '1px solid #475569',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {item.artworkUrl ? 'Versions' : 'Upload'}
                        </button>
                      </div>
                    </td>

                    {/* Pricing Responsibility Badge */}
                    <td style={{ padding: '0.65rem 0.6rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {allowDesignerPricing ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            🎨 Designer Allowed
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: 'rgba(139, 92, 246, 0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                          }}>
                            💼 Sales Pricing Queue
                          </span>
                        )}

                        <span style={{
                          fontSize: '0.68rem',
                          color: item.pricingStatus === 'COMPLETE' ? '#10b981' : '#f59e0b',
                          fontWeight: 600
                        }}>
                          {item.pricingStatus === 'COMPLETE' ? '✓ Price Ready' : '⏳ Pricing Pending'}
                        </span>
                      </div>
                    </td>

                    {/* Selling Rate Input (Permitted vs Restricted) */}
                    <td style={{ padding: '0.65rem 0.6rem' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="number"
                          placeholder={canEditPrice ? '0.00' : 'Sales'}
                          value={item.sellingRate ?? ''}
                          disabled={!canEditPrice}
                          onChange={(e) => handleUpdateItemField(idx, 'sellingRate', e.target.value)}
                          style={{
                            width: '85px',
                            padding: '0.4rem 0.5rem',
                            background: canEditPrice ? '#0f172a' : 'rgba(15, 23, 42, 0.5)',
                            border: canEditPrice ? '1px solid #334155' : '1px dashed #475569',
                            borderRadius: '5px',
                            color: canEditPrice ? '#38bdf8' : '#94a3b8',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textAlign: 'right',
                            cursor: canEditPrice ? 'text' : 'not-allowed'
                          }}
                        />
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td style={{ padding: '0.65rem 0.6rem', textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                      {calc.total > 0 ? `₹${calc.total.toLocaleString()}` : <span style={{ color: '#64748b', fontSize: '0.78rem' }}>Pending</span>}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.65rem 0.6rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveProductRow(idx)}
                        title="Delete product line"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '0.2rem'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
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

        {/* Table Footer with Summary Breakdown */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: '#0f172a',
          borderTop: '1px solid #334155',
          gap: '1rem'
        }}>
          {/* Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {workspaceTotals.pendingPriceItemsCount > 0 ? (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid rgba(245, 158, 11, 0.25)'
              }}>
                <AlertTriangle size={14} />
                {workspaceTotals.pendingPriceItemsCount} item(s) will route to Sales Pricing Queue upon submit
              </span>
            ) : (
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid rgba(16, 185, 129, 0.25)'
              }}>
                <CheckCircle2 size={14} />
                All line items priced and ready for instant confirmation
              </span>
            )}
          </div>

          {/* Grand Totals */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', textAlign: 'right' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Taxable Subtotal:</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>₹{workspaceTotals.subtotal.toLocaleString()}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Tax (GST):</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0' }}>₹{workspaceTotals.taxTotal.toLocaleString()}</div>
            </div>
            <div style={{ borderLeft: '1px solid #334155', paddingLeft: '1.5rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Total:</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8' }}>₹{workspaceTotals.grandTotal.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. ARTWORK & PROOFING DRAWER / MODAL (SECTION 8)                  */}
      {/* ----------------------------------------------------------------- */}
      {artworkModalItemIdx !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #475569',
            width: '100%',
            maxWidth: '540px',
            boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              background: '#0f172a',
              borderBottom: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Palette size={20} style={{ color: '#38bdf8' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                  Artwork Management & Proofing
                </h3>
              </div>
              <button
                onClick={() => setArtworkModalItemIdx(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* File Upload Zone */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem', display: 'block' }}>
                  Upload Artwork File (Image, PDF Preview)
                </label>
                <div style={{
                  border: '2px dashed #475569',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: '#0f172a',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="artwork-desk-upload"
                  />
                  <label htmlFor="artwork-desk-upload" style={{ cursor: 'pointer' }}>
                    <Upload size={28} style={{ color: '#38bdf8', marginBottom: '0.4rem' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                      Click to Browse or Drag File Here
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                      PNG, JPG, SVG, WebP or PDF preview
                    </div>
                  </label>
                </div>
              </div>

              {/* Artwork URL / Link Input */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem', display: 'block' }}>
                  Or Direct Image / Cloud File URL
                </label>
                <input
                  type="text"
                  placeholder="https://... or paste cloud file link"
                  value={artworkFileUrl}
                  onChange={(e) => setArtworkFileUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.8rem',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              {/* Artwork Preview if Available */}
              {artworkFileUrl && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: '#0f172a',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #475569' }}>
                    <img src={artworkFileUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, fontSize: '0.8rem' }}>
                    <strong style={{ color: '#e2e8f0' }}>{artworkFileName || 'Artwork File'}</strong>
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>Dimensions: {artworkDimensions || 'Custom'}</div>
                  </div>
                </div>
              )}

              {/* Customer Proof Status */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', display: 'block' }}>
                  Customer Approval Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                  {[
                    { id: 'Draft', label: 'Draft' },
                    { id: 'Waiting Customer Approval', label: 'Proof Sent' },
                    { id: 'Approved', label: 'Approved' },
                    { id: 'Revision Requested', label: 'Revision' }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setArtworkProofStatus(st.id)}
                      style={{
                        padding: '0.45rem 0.2rem',
                        borderRadius: '6px',
                        border: '1px solid #475569',
                        background: artworkProofStatus === st.id ? '#3b82f6' : '#0f172a',
                        color: artworkProofStatus === st.id ? '#fff' : '#94a3b8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Revision Reason / Designer Notes */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.35rem', display: 'block' }}>
                  Revision Reason / Customer Comments
                </label>
                <input
                  type="text"
                  placeholder="e.g. Changed contact number, increased logo size..."
                  value={artworkRevisionReason}
                  onChange={(e) => setArtworkRevisionReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.8rem',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              {/* Final Production Ready Flag */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: '#e2e8f0' }}>
                <input
                  type="checkbox"
                  checked={artworkIsProductionReady}
                  onChange={(e) => setArtworkIsProductionReady(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                />
                <span>Flag as <strong>Final Production Artwork</strong> (Approved for print queue)</span>
              </label>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              padding: '0.85rem 1.25rem',
              background: '#0f172a',
              borderTop: '1px solid #334155'
            }}>
              <button
                onClick={() => setArtworkModalItemIdx(null)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #475569',
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveArtworkToItem}
                disabled={isUploadingArtwork}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 1rem',
                  borderRadius: '6px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {isUploadingArtwork ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Attach Artwork
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5. ZOOM IMAGE PREVIEW MODAL                                       */}
      {/* ----------------------------------------------------------------- */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 110,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '85vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <img src={previewImageModal} alt="Enlarged Artwork" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }} />
            <button
              onClick={() => setPreviewImageModal(null)}
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-12px',
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 6. SESSIONS DRAWER / HISTORY MODAL (SECTION 2A)                   */}
      {/* ----------------------------------------------------------------- */}
      {isSessionDrawerOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 90,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '480px',
            height: '100%',
            background: '#1e293b',
            borderLeft: '1px solid #475569',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.5)'
          }}>
            {/* Drawer Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              background: '#0f172a',
              borderBottom: '1px solid #334155'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                  Customer Design Sessions
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Active counter drafts & history
                </span>
              </div>
              <button
                onClick={() => setIsSessionDrawerOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Filter / Search Bar */}
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Search sessions by customer, number, designer..."
                value={sessionSearchQuery}
                onChange={(e) => setSessionSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.8rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.82rem'
                }}
              />
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {['ALL', 'Active', 'Saved Draft', 'Submitted to Sales', 'Converted to Order'].map(st => (
                  <button
                    key={st}
                    onClick={() => setSessionStatusFilter(st)}
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: sessionStatusFilter === st ? '#3b82f6' : '#0f172a',
                      color: sessionStatusFilter === st ? '#fff' : '#94a3b8',
                      cursor: 'pointer'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Sessions List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {(designerSessions || []).filter(s => {
                if (sessionStatusFilter !== 'ALL' && s.sessionStatus !== sessionStatusFilter) return false;
                if (!sessionSearchQuery.trim()) return true;
                const q = sessionSearchQuery.toLowerCase();
                return (
                  (s.sessionNumber && s.sessionNumber.toLowerCase().includes(q)) ||
                  (s.customerName && s.customerName.toLowerCase().includes(q)) ||
                  (s.designerName && s.designerName.toLowerCase().includes(q))
                );
              }).map(s => {
                const isActive = activeSession?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => loadExistingSession(s)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '8px',
                      background: isActive ? 'rgba(59, 130, 246, 0.15)' : '#0f172a',
                      border: isActive ? '1px solid #3b82f6' : '1px solid #334155',
                      marginBottom: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.85rem' }}>
                        {s.sessionNumber}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: s.sessionStatus === 'Active' ? 'rgba(16, 185, 129, 0.15)' : s.sessionStatus === 'Submitted to Sales' ? 'rgba(139, 92, 246, 0.15)' : '#334155',
                        color: s.sessionStatus === 'Active' ? '#10b981' : s.sessionStatus === 'Submitted to Sales' ? '#c084fc' : '#94a3b8'
                      }}>
                        {s.sessionStatus}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>
                      {s.customerName || 'Walk-in Customer'}
                    </div>

                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Designer: {s.designerName}</span>
                      <span>{s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleDateString() : ''}</span>
                    </div>

                    {s.orderNumber && (
                      <div style={{ fontSize: '0.72rem', color: '#10b981', marginTop: '0.3rem', fontWeight: 600 }}>
                        Linked Order: #{s.orderNumber}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 7. SUBMISSION SUCCESS MODAL                                       */}
      {/* ----------------------------------------------------------------- */}
      {submissionSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 120,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #475569',
            width: '100%',
            maxWidth: '460px',
            padding: '1.5rem',
            textAlign: 'center',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: submissionSuccessModal.hasPendingPricing ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: submissionSuccessModal.hasPendingPricing ? '#c084fc' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
              {submissionSuccessModal.hasPendingPricing ? 'Order Submitted to Sales Queue' : 'Sales Order Confirmed!'}
            </h3>

            <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: '1.45', margin: '0 0 1.25rem 0' }}>
              {submissionSuccessModal.message}
            </p>

            <div style={{
              background: '#0f172a',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: '#94a3b8',
              display: 'flex',
              justifyContent: 'space-around'
            }}>
              <div>
                Order ID: <strong style={{ color: '#38bdf8' }}>{submissionSuccessModal.orderNumber}</strong>
              </div>
              <div>
                Status: <strong style={{ color: submissionSuccessModal.hasPendingPricing ? '#f59e0b' : '#10b981' }}>{submissionSuccessModal.pricingStatus}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setSubmissionSuccessModal(null);
                  startNewWalkInSession();
                }}
                style={{
                  padding: '0.55rem 1.15rem',
                  borderRadius: '7px',
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + New Customer Session
              </button>
              {onNavigate && (
                <button
                  onClick={() => {
                    setSubmissionSuccessModal(null);
                    if (submissionSuccessModal.hasPendingPricing) {
                      onNavigate('sales-pricing-queue');
                    } else {
                      onNavigate('sales-orders', { selectId: submissionSuccessModal.orderId });
                    }
                  }}
                  style={{
                    padding: '0.55rem 1.15rem',
                    borderRadius: '7px',
                    background: '#334155',
                    color: '#e2e8f0',
                    border: '1px solid #475569',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  View in {submissionSuccessModal.hasPendingPricing ? 'Sales Queue' : 'Orders'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 8. CREATE CUSTOMER MODAL (SECTION 2A)                             */}
      {/* ----------------------------------------------------------------- */}
      {isCreateCustModalOpen && (
        <CreateCustomerModal
          isOpen={isCreateCustModalOpen}
          onClose={() => setIsCreateCustModalOpen(false)}
          onCustomerCreated={(newCust) => {
            setSelectedCust(newCust);
            setCustSearchTerm(`${newCust.name} (${newCust.mobile || ''})`);
            setIsCreateCustModalOpen(false);
            triggerDirtyAutoSave();
          }}
          initialMobile={custSearchTerm.match(/\d{5,}/)?.[0] || ''}
        />
      )}
    </div>
  );
};

export default DesignerDeskView;
