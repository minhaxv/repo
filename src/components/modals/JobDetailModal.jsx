import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { STAGE_STATUS_COLORS, PRODUCTION_STAGES, STAGE_STATUS } from '../../types';
import { formatINR } from '../../utils/reportEngine';
import {
  X,
  Factory,
  Printer,
  Palette,
  Scissors,
  CheckSquare,
  Truck,
  DollarSign,
  FileText,
  Clock,
  User,
  Phone,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Play,
  Check,
  Pause,
  Upload,
  Calendar,
  Layers,
  Cpu,
  Trash2,
  History,
  TrendingUp,
  CreditCard,
  Building2,
  Image as ImageIcon,
  ExternalLink,
  Edit,
  Save,
  RotateCcw,
  Plus,
  Timer
} from 'lucide-react';

export const JobDetailModal = ({ job, isOpen, onClose, onPrintJobCard }) => {
  const {
    salesOrders,
    employees,
    machines,
    vendors,
    updateJobOrderStage,
    updateJobWastage,
    updateJobCosting,
    assignJobMachineAndOperator,
    recordPayment,
    companyBankAccounts,
    activeUser,
    productionProcesses,
    productionTasks,
    createProductionTask,
    updateProductionTask,
    executeTaskAction,
    deleteProductionTask
  } = useERP();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'production' | 'materials' | 'costing' | 'outsourcing' | 'payments' | 'files' | 'history'

  // Stage update form state
  const [selectedStageName, setSelectedStageName] = useState('Printing');
  const [stageStatusInput, setStageStatusInput] = useState('In Progress');
  const [stageOperatorId, setStageOperatorId] = useState('');
  const [stageMachineId, setStageMachineId] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  // Wastage form state
  const [wasteProducedQty, setWasteProducedQty] = useState('');
  const [wasteMaterialUsed, setWasteMaterialUsed] = useState('');
  const [wasteReason, setWasteReason] = useState('Setup Scrap / Color Calibration');

  // Costing edit state
  const [isEditingCost, setIsEditingCost] = useState(false);
  const [costForm, setCostForm] = useState({
    estMaterial: 0,
    estPrinting: 0,
    estFinishing: 0,
    estLabour: 0,
    estMachine: 0,
    estOutsourcing: 0,
    estOther: 0,
    actMaterial: 0,
    actPrinting: 0,
    actFinishing: 0,
    actLabour: 0,
    actMachine: 0,
    actOutsourcing: 0,
    actOther: 0
  });

  // Quick Payment state
  const [isPayingOpen, setIsPayingOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payBankId, setPayBankId] = useState('');

  // Multi-Task Employee Production state
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    employeeId: '',
    processName: 'Seal Making',
    quantity: '',
    unit: 'Nos',
    priority: 'Normal',
    machineId: '',
    remarks: '',
    status: 'Pending'
  });
  const [reworkPromptTask, setReworkPromptTask] = useState(null);
  const [reworkReason, setReworkReason] = useState('');
  const [reworkQtyInput, setReworkQtyInput] = useState('');

  if (!isOpen || !job) return null;

  // Find parent order from live context
  const parentOrder = (salesOrders || []).find((o) => o.id === job.orderId) || {};
  const currentItem = (parentOrder.items || []).find((i) => (i.id === job.itemId || i.jobCardId === job.jobCardId)) || job.item || {};

  // Current Stages Timeline
  const stagesList = [
    { key: 'Designing', label: 'Designing', icon: Palette, color: '#8b5cf6' },
    { key: 'Printing', label: 'Printing', icon: Printer, color: '#2563eb' },
    { key: 'Finishing', label: 'Finishing', icon: Scissors, color: '#d97706' },
    { key: 'Quality Check', label: 'Quality Check', icon: CheckSquare, color: '#059669' },
    { key: 'Ready for Delivery', label: 'Ready for Delivery', icon: CheckCircle2, color: '#0284c7' },
    { key: 'Delivered', label: 'Delivered', icon: Truck, color: '#16a34a' }
  ];

  const currentStagesTimeline = currentItem.stageTimeline || [
    { stage: 'Designing', status: currentItem.designerRequired === 'YES' ? (currentItem.designStatus === 'Completed' ? 'Completed' : 'In Progress') : 'Completed', operatorName: currentItem.designerName || '' },
    { stage: 'Printing', status: currentItem.productionStatus === 'Printing' ? 'In Progress' : (['Finishing', 'Quality Check', 'Ready for Delivery', 'Delivered'].includes(currentItem.productionStatus) ? 'Completed' : 'Pending'), machineName: currentItem.assignedMachineName || '' },
    { stage: 'Finishing', status: currentItem.productionStatus === 'Finishing' ? 'In Progress' : (['Quality Check', 'Ready for Delivery', 'Delivered'].includes(currentItem.productionStatus) ? 'Completed' : 'Pending') },
    { stage: 'Quality Check', status: currentItem.productionStatus === 'Quality Check' ? 'In Progress' : (['Ready for Delivery', 'Delivered'].includes(currentItem.productionStatus) ? 'Completed' : 'Pending') },
    { stage: 'Ready for Delivery', status: ['Ready for Delivery', 'Delivered'].includes(currentItem.productionStatus) ? 'Completed' : 'Pending' },
    { stage: 'Delivered', status: currentItem.productionStatus === 'Delivered' ? 'Completed' : 'Pending' }
  ];

  // Current item costing breakdown
  const estBreakdown = currentItem.estimatedCostBreakdown || {
    material: Number(currentItem.estimatedCost || 0) * 0.45,
    printing: Number(currentItem.estimatedCost || 0) * 0.25,
    finishing: Number(currentItem.estimatedCost || 0) * 0.15,
    labour: Number(currentItem.estimatedCost || 0) * 0.10,
    machine: Number(currentItem.estimatedCost || 0) * 0.05,
    outsourcing: Number(currentItem.internalEstOutsourceCost || currentItem.estimatedVendorCost || 0),
    other: 0
  };

  const actBreakdown = currentItem.actualCostBreakdown || {
    material: Number(currentItem.actualCost || currentItem.estimatedCost || 0) * 0.45,
    printing: Number(currentItem.actualCost || currentItem.estimatedCost || 0) * 0.25,
    finishing: Number(currentItem.actualCost || currentItem.estimatedCost || 0) * 0.15,
    labour: Number(currentItem.actualCost || currentItem.estimatedCost || 0) * 0.10,
    machine: Number(currentItem.actualCost || currentItem.estimatedCost || 0) * 0.05,
    outsourcing: Number(currentItem.actualVendorBill || currentItem.internalEstOutsourceCost || 0),
    other: 0
  };

  const totalEstCost = Object.values(estBreakdown).reduce((sum, v) => sum + Number(v || 0), 0);
  const totalActCost = Object.values(actBreakdown).reduce((sum, v) => sum + Number(v || 0), 0);
  const costVariance = totalActCost - totalEstCost;
  const sellingPrice = Number(currentItem.amount || (currentItem.sellingRate * (currentItem.qty || 1)) || 0);
  const grossProfit = sellingPrice - totalActCost;
  const grossMarginPct = sellingPrice > 0 ? ((grossProfit / sellingPrice) * 100).toFixed(1) : 0;

  // Wastage calculations
  const reqQty = Number(currentItem.qty || 1);
  const prodQty = Number(currentItem.producedQty || reqQty);
  const matUsed = Number(currentItem.materialUsed || prodQty);
  const wasteQty = Number(currentItem.wastageQty || Math.max(0, matUsed - prodQty));
  const wastePct = matUsed > 0 ? ((wasteQty / matUsed) * 100).toFixed(1) : 0;

  // Handle stage update submission
  const handleStageSubmit = async (e) => {
    e.preventDefault();
    const opObj = (employees || []).find((em) => em.id === stageOperatorId);
    const mchObj = (machines || []).find((m) => m.id === stageMachineId);

    await updateJobOrderStage(
      job.orderId,
      job.itemId || job.jobCardId,
      selectedStageName,
      stageStatusInput,
      stageOperatorId,
      opObj?.name || '',
      stageMachineId,
      mchObj?.name || '',
      stageNotes
    );

    setIsUpdatingStage(false);
    setStageNotes('');
  };

  // Handle wastage submission
  const handleWastageSubmit = async (e) => {
    e.preventDefault();
    const p = parseFloat(wasteProducedQty) || reqQty;
    const u = parseFloat(wasteMaterialUsed) || p;
    const w = Math.max(0, u - p);
    const pct = u > 0 ? parseFloat(((w / u) * 100).toFixed(1)) : 0;

    await updateJobWastage(job.orderId, job.itemId || job.jobCardId, {
      producedQty: p,
      materialUsed: u,
      wastageQty: w,
      wastagePct: pct,
      unit: currentItem.unit || 'Units',
      reason: wasteReason
    });

    setWasteProducedQty('');
    setWasteMaterialUsed('');
  };

  // Handle costing save
  const handleCostingSave = async () => {
    await updateJobCosting(job.orderId, job.itemId || job.jobCardId, {
      estimatedBreakdown: {
        material: Number(costForm.estMaterial),
        printing: Number(costForm.estPrinting),
        finishing: Number(costForm.estFinishing),
        labour: Number(costForm.estLabour),
        machine: Number(costForm.estMachine),
        outsourcing: Number(costForm.estOutsourcing),
        other: Number(costForm.estOther)
      },
      actualBreakdown: {
        material: Number(costForm.actMaterial),
        printing: Number(costForm.actPrinting),
        finishing: Number(costForm.actFinishing),
        labour: Number(costForm.actLabour),
        machine: Number(costForm.actMachine),
        outsourcing: Number(costForm.actOutsourcing),
        other: Number(costForm.actOther)
      }
    });
    setIsEditingCost(false);
  };

  // Handle quick collection
  const handleCollectPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;
    const bank = (companyBankAccounts || []).find((b) => b.id === payBankId);

    await recordPayment(
      job.orderId,
      amt,
      payMethod,
      `REC-${Date.now().toString().slice(-4)}`,
      bank?.id || '',
      bank?.bankName || ''
    );

    setIsPayingOpen(false);
    setPayAmount('');
  };

  // Multi-Task Production Handlers
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.employeeId || !taskForm.processName) {
      alert("Please select an Employee and a Process.");
      return;
    }

    const empObj = (employees || []).find((em) => em.id === taskForm.employeeId);
    const mchObj = (machines || []).find((m) => m.id === taskForm.machineId);
    const procObj = (productionProcesses || []).find((p) => p.name === taskForm.processName);
    const qtyVal = Number(taskForm.quantity || currentItem.qty || 1);

    await createProductionTask({
      employeeId: taskForm.employeeId,
      employeeName: empObj ? empObj.name : 'Assigned Worker',
      orderId: job.orderId,
      orderNumber: parentOrder.orderNumber || parentOrder.id || job.orderId,
      customerName: parentOrder.customerName || job.customerName || '',
      itemId: currentItem.id || job.itemId || '',
      itemTitle: currentItem.productName || job.productName || 'Printing Item',
      processId: procObj ? procObj.id : '',
      processName: taskForm.processName,
      quantity: qtyVal,
      unit: taskForm.unit || currentItem.unit || 'Nos',
      priority: taskForm.priority || 'Normal',
      machineId: taskForm.machineId || '',
      machineName: mchObj ? mchObj.name : '',
      remarks: taskForm.remarks || '',
      status: taskForm.status || 'Pending'
    });

    setIsAssignTaskOpen(false);
    setTaskForm({
      employeeId: '',
      processName: 'Seal Making',
      quantity: '',
      unit: 'Nos',
      priority: 'Normal',
      machineId: '',
      remarks: '',
      status: 'Pending'
    });
  };

  const handleTaskAction = async (taskId, action, notes = '') => {
    await executeTaskAction(taskId, { action, notes });
  };

  const handleReworkSubmit = async (e) => {
    e.preventDefault();
    if (!reworkPromptTask) return;
    await executeTaskAction(reworkPromptTask.id, {
      action: 'REWORK',
      notes: reworkReason || 'Quality defect - rework required',
      reworkQty: Number(reworkQtyInput || 0),
      rejectedQty: Number(reworkQtyInput || 0)
    });
    setReworkPromptTask(null);
    setReworkReason('');
    setReworkQtyInput('');
  };

  const statusStyle = STAGE_STATUS_COLORS[currentItem.productionStatus] || STAGE_STATUS_COLORS['In Progress'] || { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' };

  const orderTasks = (productionTasks || []).filter(
    (t) =>
      t.orderId === job.orderId ||
      t.orderNumber === job.orderId ||
      (parentOrder && (t.orderId === parentOrder.id || t.orderNumber === parentOrder.orderNumber))
  );

  const completedTasksCount = orderTasks.filter((t) => t.status === 'Completed').length;
  const inProgressTasksCount = orderTasks.filter((t) => ['Started', 'In Progress', 'Resumed'].includes(t.status)).length;
  const pausedTasksCount = orderTasks.filter((t) => t.status === 'Paused').length;
  const reworkTasksCount = orderTasks.filter((t) => t.status === 'Rework').length;
  const totalOrderActiveMinutes = orderTasks.reduce((acc, t) => acc + Number(t.totalDurationMinutes || 0), 0);
  const totalOrderActiveHours = Math.floor(totalOrderActiveMinutes / 60);
  const totalOrderActiveRemMins = totalOrderActiveMinutes % 60;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1080px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 900
              }}
            >
              <Factory size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  {job.jobCardId || `JC-${job.orderId}`}
                </h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '20px',
                    background: statusStyle.bg,
                    color: statusStyle.text,
                    border: `1px solid ${statusStyle.border}`
                  }}
                >
                  {currentItem.productionStatus || 'In Production'}
                </span>
                {job.jobPriority === 'Urgent' && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#ef4444', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    URGENT
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Order #{parentOrder.orderNumber || job.orderId} • Customer: <strong style={{ color: '#ffffff' }}>{job.customerName || parentOrder.customerName}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onPrintJobCard && (
              <button
                onClick={() => onPrintJobCard(job)}
                className="btn btn-sm btn-secondary"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <Printer size={14} /> Print Job Card
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', cursor: 'pointer', borderRadius: '6px', padding: '0.4rem', display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div
          style={{
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            overflowX: 'auto',
            padding: '0 1rem'
          }}
        >
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'employee-tasks', label: `Employee Tasks (${orderTasks.length})`, icon: UserCheck, highlight: true },
            { id: 'production', label: 'Production Timeline', icon: Factory },
            { id: 'materials', label: 'Materials & Wastage', icon: Layers },
            { id: 'costing', label: 'Costing & Margin', icon: DollarSign },
            { id: 'outsourcing', label: 'Outsourcing', icon: Building2 },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'files', label: 'Files & Artwork', icon: ImageIcon },
            { id: 'history', label: 'Activity History', icon: History }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? '#2563eb' : t.highlight ? '#1d4ed8' : '#64748b',
                  border: 'none',
                  background: 'none',
                  borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={15} color={isActive ? '#2563eb' : '#64748b'} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Top Quick Info Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>PRODUCT & QUANTITY</span>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a', marginTop: '0.2rem' }}>
                    {job.productName || currentItem.productName}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 700 }}>
                    {currentItem.qty || 1} {currentItem.unit || 'Units'} ({currentItem.totalSqFt ? `${currentItem.totalSqFt} Sq.Ft` : `${currentItem.width || 0}x${currentItem.height || 0}`})
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>DUE DATE & SCHEDULE</span>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#d97706', marginTop: '0.2rem' }}>
                    {currentItem.deliveryDate || parentOrder.deliveryDate || 'Standard 48 Hrs'}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Ordered: {parentOrder.orderDate || 'Today'}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>JOB SELLING VALUE</span>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', marginTop: '0.2rem' }}>
                    {formatINR(sellingPrice)}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700 }}>
                    Est. Profit: {formatINR(grossProfit)} ({grossMarginPct}%)
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>CUSTOMER BALANCE</span>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: Number(parentOrder.balanceAmount || 0) > 0 ? '#dc2626' : '#059669', marginTop: '0.2rem' }}>
                    {formatINR(parentOrder.balanceAmount || 0)}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Status: <strong>{parentOrder.paymentStatus || 'Pending'}</strong>
                  </span>
                </div>
              </div>

              {/* TWO CLEAN BOXES: PRODUCT & SPECIFICATIONS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                {/* BOX 1: PRODUCT */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                    <Layers size={16} color="#2563eb" />
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      BOX 1: PRODUCT DETAILS
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.84rem' }}>
                    <div><strong style={{ color: '#475569' }}>Product Name:</strong> {job.productName || currentItem.productName}</div>
                    <div><strong style={{ color: '#475569' }}>Category:</strong> <span className="badge badge-blue">{currentItem.category || 'Commercial Print'}</span></div>
                    <div><strong style={{ color: '#475569' }}>Base Substrate / Media:</strong> {currentItem.material || 'Standard Substrate Grade'}</div>
                    <div><strong style={{ color: '#475569' }}>Product Unit:</strong> {currentItem.unit || 'Sq.Ft'}</div>
                    <div><strong style={{ color: '#475569' }}>HSN Code / GST:</strong> {currentItem.hsnCode || '9989'} ({currentItem.gstRate || 18}% GST)</div>
                  </div>
                </div>

                {/* BOX 2: SPECIFICATION */}
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                    <Scissors size={16} color="#7c3aed" />
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      BOX 2: PRODUCTION SPECIFICATIONS
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.84rem' }}>
                    <div><strong style={{ color: '#475569' }}>Size / Dimensions:</strong> {currentItem.width || 0} × {currentItem.height || 0} {currentItem.unit || 'Sq.Ft'} {currentItem.totalSqFt ? `(${currentItem.totalSqFt} Sq.Ft)` : ''}</div>
                    <div><strong style={{ color: '#475569' }}>Quantity:</strong> {currentItem.qty || 1} {currentItem.unit || 'Units'}</div>
                    <div><strong style={{ color: '#475569' }}>Color / Sides:</strong> {currentItem.colorMode || '4C Full Color'} • {currentItem.sides || 'Single Sided'}</div>
                    <div><strong style={{ color: '#475569' }}>Finishing Specs:</strong> {currentItem.finishingSpec || currentItem.description || 'Standard Edge Trim & Packaging'}</div>
                    <div><strong style={{ color: '#475569' }}>Assigned Machine:</strong> {currentItem.assignedMachineName || 'Auto-Allocated / Pending'}</div>
                  </div>
                </div>
              </div>

              {/* Stakeholders & Assignment Card */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem', backgroundColor: '#ffffff' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
                  CUSTOMER & STAFF ASSIGNMENTS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', fontSize: '0.82rem' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>CUSTOMER CONTACT</span>
                    <strong>{job.customerName || parentOrder.customerName}</strong>
                    <div style={{ color: '#64748b' }}>📱 {job.customerMobile || parentOrder.customerMobile || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>CARE OF / PARTNER</span>
                    <strong>{parentOrder.careOfName || job.careOfName || 'Direct Customer (None)'}</strong>
                    <div style={{ color: '#64748b' }}>Sales Rep: {parentOrder.salesPersonName || 'Direct'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>ASSIGNED DESIGNER</span>
                    <strong>{currentItem.designerName || 'Unassigned / Not Required'}</strong>
                    <div style={{ color: '#64748b' }}>Status: {currentItem.designStatus || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.72rem', fontWeight: 700 }}>ASSIGNED OPERATOR</span>
                    <strong>{currentItem.assignedOperatorName || 'Shop Floor Team'}</strong>
                    <div style={{ color: '#64748b' }}>Machine: {currentItem.assignedMachineName || 'Pending'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MULTI-TASK EMPLOYEE PRODUCTION & WORK LOGS */}
          {activeTab === 'employee-tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Header & Quick Action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserCheck size={20} color="#2563eb" /> Multi-Task Employee Production & Work Logs
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Assign multiple workers to different processes, track Start/Pause/Resume/Complete intervals, and monitor pure active production durations.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignTaskOpen(true)}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, padding: '0.5rem 0.9rem' }}
                >
                  <Plus size={16} /> Assign Production Task
                </button>
              </div>

              {/* KPI Strip */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL TASKS</span>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#0f172a', marginTop: '0.15rem' }}>
                    {orderTasks.length}
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>COMPLETED</span>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#16a34a', marginTop: '0.15rem' }}>
                    {completedTasksCount}
                  </div>
                </div>
                <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>IN PROGRESS</span>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#2563eb', marginTop: '0.15rem' }}>
                    {inProgressTasksCount}
                  </div>
                </div>
                <div style={{ background: '#fefce8', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef08a' }}>
                  <span style={{ fontSize: '0.7rem', color: '#ca8a04', fontWeight: 700, textTransform: 'uppercase' }}>PAUSED</span>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#ca8a04', marginTop: '0.15rem' }}>
                    {pausedTasksCount}
                  </div>
                </div>
                <div style={{ background: '#fef2f2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>REWORK</span>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#dc2626', marginTop: '0.15rem' }}>
                    {reworkTasksCount}
                  </div>
                </div>
                <div style={{ background: '#faf5ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                  <span style={{ fontSize: '0.7rem', color: '#9333ea', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL ACTIVE DURATION</span>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#7e22ce', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Timer size={18} /> {totalOrderActiveHours}h {totalOrderActiveRemMins}m
                  </div>
                </div>
              </div>

              {/* Task Assignment Drawer / Modal Dialog */}
              {isAssignTaskOpen && (
                <div
                  style={{
                    border: '1.5px solid #2563eb',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    background: '#f8fafc',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <UserCheck size={18} color="#2563eb" />
                      <h5 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                        Assign New Production Process Task to Employee
                      </h5>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAssignTaskOpen(false)}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.2rem' }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                      {/* Employee Select */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Select Employee <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          className="form-control"
                          value={taskForm.employeeId}
                          onChange={(e) => setTaskForm({ ...taskForm, employeeId: e.target.value })}
                          required
                          style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="">-- Choose Employee --</option>
                          {(employees || []).map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} ({emp.department || 'Production'} • {emp.designation || 'Staff'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Process Select */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Process / Operation <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          className="form-control"
                          value={taskForm.processName}
                          onChange={(e) => setTaskForm({ ...taskForm, processName: e.target.value })}
                          required
                          style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          {(productionProcesses || []).map((proc) => (
                            <option key={proc.id} value={proc.name}>
                              {proc.name} {proc.department ? `(${proc.department})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity & Unit */}
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ flex: 2 }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                            Task Quantity
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder={currentItem.qty || 1}
                            value={taskForm.quantity}
                            onChange={(e) => setTaskForm({ ...taskForm, quantity: e.target.value })}
                            style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                            Unit
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={taskForm.unit}
                            onChange={(e) => setTaskForm({ ...taskForm, unit: e.target.value })}
                            style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </div>
                      </div>

                      {/* Machine (Optional) */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Machine (Optional)
                        </label>
                        <select
                          className="form-control"
                          value={taskForm.machineId}
                          onChange={(e) => setTaskForm({ ...taskForm, machineId: e.target.value })}
                          style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="">-- No Machine / Manual --</option>
                          {(machines || []).map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.model || m.type || 'Standard'})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Priority */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Priority
                        </label>
                        <select
                          className="form-control"
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                          style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>

                      {/* Initial Status */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                          Initial Status
                        </label>
                        <select
                          className="form-control"
                          value={taskForm.status}
                          onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                          style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">Start Immediately (In Progress)</option>
                        </select>
                      </div>
                    </div>

                    {/* Remarks / Special Instructions */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                        Process Instructions / Remarks
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g., Red rubber stamp with wooden handle, ensure fine laser depth"
                        value={taskForm.remarks}
                        onChange={(e) => setTaskForm({ ...taskForm, remarks: e.target.value })}
                        style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsAssignTaskOpen(false)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '0.45rem 0.9rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        style={{ padding: '0.45rem 1.25rem', fontWeight: 700 }}
                      >
                        Confirm & Assign Task
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Rework Modal Dialog Prompt */}
              {reworkPromptTask && (
                <div
                  style={{
                    border: '1.5px solid #ef4444',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    background: '#fff5f5',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.12)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #fecaca', paddingBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', fontWeight: 800, fontSize: '0.95rem' }}>
                      <RotateCcw size={18} /> Log Quality Rework for {reworkPromptTask.processName} ({reworkPromptTask.employeeName})
                    </div>
                    <button
                      type="button"
                      onClick={() => setReworkPromptTask(null)}
                      style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer' }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleReworkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.2rem' }}>
                          Defective / Rework Qty
                        </label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder={reworkPromptTask.quantity || 1}
                          value={reworkQtyInput}
                          onChange={(e) => setReworkQtyInput(e.target.value)}
                          required
                          style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #fca5a5' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.2rem' }}>
                          Defect Cause / Rework Notes
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., Color shade mismatch, miscut edge, seal alignment skewed"
                          value={reworkReason}
                          onChange={(e) => setReworkReason(e.target.value)}
                          required
                          style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #fca5a5' }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setReworkPromptTask(null)}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-danger btn-sm"
                        style={{ background: '#dc2626', color: '#ffffff', fontWeight: 700, padding: '0.4rem 1rem' }}
                      >
                        Flag for Rework
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tasks List / Table */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
                <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#334155' }}>
                    PROCESS TASKS LOG ({orderTasks.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Status transitions dynamically compute pure active hours.
                  </span>
                </div>

                {orderTasks.length === 0 ? (
                  <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                    <UserCheck size={36} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                    <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No Employee Tasks Assigned Yet</h5>
                    <p style={{ margin: '0.4rem 0 1rem', fontSize: '0.82rem' }}>
                      Click "+ Assign Production Task" above to allocate employees like Afsal, Niyas, or Rahman to specific print or finishing processes.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAssignTaskOpen(true)}
                      className="btn btn-primary btn-sm"
                    >
                      <Plus size={14} /> Assign First Process Task
                    </button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>EMPLOYEE</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>PROCESS / OPERATION</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>QTY & MACHINE</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>TIMING & ACTIVE DURATION</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>STATUS</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>REMARKS</th>
                          <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800, textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderTasks.map((t) => {
                          const isStarted = ['Started', 'In Progress', 'Resumed'].includes(t.status);
                          const isPaused = t.status === 'Paused';
                          const isCompleted = t.status === 'Completed';
                          const isRework = t.status === 'Rework';
                          const isPending = t.status === 'Pending' || t.status === 'Assigned';

                          const activeMins = Number(t.totalDurationMinutes || 0);
                          const actH = Math.floor(activeMins / 60);
                          const actM = Math.round(activeMins % 60);
                          const durationStr = actH > 0 ? `${actH}h ${actM}m` : `${actM}m`;

                          const badgeStyle = isCompleted
                            ? { bg: '#dcfce7', text: '#15803d', border: '#86efac' }
                            : isStarted
                            ? { bg: '#eff6ff', text: '#1d4ed8', border: '#93c5fd' }
                            : isPaused
                            ? { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }
                            : isRework
                            ? { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' }
                            : { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

                          return (
                            <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              {/* Employee */}
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div
                                    style={{
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '50%',
                                      background: '#e0e7ff',
                                      color: '#4338ca',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 800,
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {(t.employeeName || 'E').slice(0, 1)}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>{t.employeeName}</div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.employeeId}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Process */}
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontWeight: 700,
                                    fontSize: '0.76rem',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px',
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    border: '1px solid #bae6fd'
                                  }}
                                >
                                  {t.processName}
                                </span>
                                {t.priority && t.priority !== 'Normal' && (
                                  <span style={{ marginLeft: '0.35rem', fontSize: '0.68rem', fontWeight: 800, color: '#ef4444' }}>
                                    ● {t.priority}
                                  </span>
                                )}
                              </td>

                              {/* Quantity & Machine */}
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <div style={{ fontWeight: 700, color: '#334155' }}>
                                  {t.quantity} {t.unit || 'Nos'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  {t.machineName ? `⚙️ ${t.machineName}` : 'Manual Process'}
                                </div>
                              </td>

                              {/* Timing & Active Duration */}
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <div style={{ fontWeight: 800, color: '#7e22ce', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <Timer size={13} /> {durationStr}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  {t.startTime ? t.startTime.slice(11, 16) : 'Not started'} {t.endTime ? `→ ${t.endTime.slice(11, 16)}` : ''}
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td style={{ padding: '0.65rem 0.85rem' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '20px',
                                    background: badgeStyle.bg,
                                    color: badgeStyle.text,
                                    border: `1px solid ${badgeStyle.border}`
                                  }}
                                >
                                  {t.status}
                                </span>
                              </td>

                              {/* Remarks */}
                              <td style={{ padding: '0.65rem 0.85rem', maxWidth: '200px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {t.remarks || '—'}
                                </div>
                              </td>

                              {/* Action Buttons */}
                              <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                                  {/* START */}
                                  {(isPending || isRework) && (
                                    <button
                                      type="button"
                                      title="Start Task"
                                      onClick={() => handleTaskAction(t.id, 'START')}
                                      className="btn btn-sm"
                                      style={{ background: '#16a34a', color: '#ffffff', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    >
                                      <Play size={12} fill="#ffffff" /> Start
                                    </button>
                                  )}

                                  {/* PAUSE */}
                                  {isStarted && (
                                    <button
                                      type="button"
                                      title="Pause Task"
                                      onClick={() => handleTaskAction(t.id, 'PAUSE')}
                                      className="btn btn-sm"
                                      style={{ background: '#d97706', color: '#ffffff', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    >
                                      <Pause size={12} /> Pause
                                    </button>
                                  )}

                                  {/* RESUME */}
                                  {isPaused && (
                                    <button
                                      type="button"
                                      title="Resume Task"
                                      onClick={() => handleTaskAction(t.id, 'RESUME')}
                                      className="btn btn-sm"
                                      style={{ background: '#2563eb', color: '#ffffff', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    >
                                      <Play size={12} fill="#ffffff" /> Resume
                                    </button>
                                  )}

                                  {/* COMPLETE */}
                                  {(isStarted || isPaused) && (
                                    <button
                                      type="button"
                                      title="Complete Task"
                                      onClick={() => handleTaskAction(t.id, 'COMPLETE')}
                                      className="btn btn-sm"
                                      style={{ background: '#059669', color: '#ffffff', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    >
                                      <Check size={12} /> Done
                                    </button>
                                  )}

                                  {/* REWORK */}
                                  {(isCompleted || isStarted) && (
                                    <button
                                      type="button"
                                      title="Flag for Rework"
                                      onClick={() => setReworkPromptTask(t)}
                                      className="btn btn-sm"
                                      style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.25rem 0.45rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px' }}
                                    >
                                      <RotateCcw size={12} />
                                    </button>
                                  )}

                                  {/* DELETE */}
                                  <button
                                    type="button"
                                    title="Delete Task"
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to remove this ${t.processName} task for ${t.employeeName}?`)) {
                                        deleteProductionTask(t.id);
                                      }
                                    }}
                                    className="btn btn-sm"
                                    style={{ background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', padding: '0.25rem 0.45rem', borderRadius: '4px' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTION TIMELINE & STAGE CONTROLLER */}
          {activeTab === 'production' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                    Visual Production Pipeline & Stage Progress
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Track real-time status transitions across Designing, Printing, Finishing, QC & Dispatch.
                  </span>
                </div>
                <button
                  onClick={() => setIsUpdatingStage(!isUpdatingStage)}
                  className="btn btn-sm btn-primary"
                >
                  <Edit size={14} /> Update Stage Status
                </button>
              </div>

              {/* Visual Step-by-Step Pipeline */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {stagesList.map((st, idx) => {
                  const Icon = st.icon;
                  const currentInfo = currentStagesTimeline.find((s) => s.stage === st.key) || {};
                  const stageState = currentInfo.status || 'Pending';
                  const isDone = stageState === 'Completed';
                  const isInProg = stageState === 'In Progress';
                  const isDelayed = stageState === 'Delayed';
                  const colorConfig = STAGE_STATUS_COLORS[stageState] || STAGE_STATUS_COLORS['Pending'];

                  return (
                    <div
                      key={st.key}
                      style={{
                        border: `1.5px solid ${isInProg ? '#2563eb' : isDone ? '#16a34a' : isDelayed ? '#dc2626' : '#cbd5e1'}`,
                        borderRadius: '10px',
                        padding: '0.85rem',
                        backgroundColor: isInProg ? '#eff6ff' : isDone ? '#f0fdf4' : isDelayed ? '#fef2f2' : '#f8fafc',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Icon size={16} color={st.color} />
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                            {st.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: colorConfig.text, background: colorConfig.bg, padding: '0.1rem 0.35rem', borderRadius: '4px', border: `1px solid ${colorConfig.border}` }}>
                          {stageState}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {currentInfo.operatorName && <div>👤 {currentInfo.operatorName}</div>}
                        {currentInfo.machineName && <div>⚙️ {currentInfo.machineName}</div>}
                        {currentInfo.updatedAt && <div>🕒 {new Date(currentInfo.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stage Update Form Drawer */}
              {isUpdatingStage && (
                <form
                  onSubmit={handleStageSubmit}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e40af' }}>
                    ⚡ Update Job Order Production Stage
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Select Stage</label>
                      <select
                        className="form-select form-select-sm"
                        value={selectedStageName}
                        onChange={(e) => setSelectedStageName(e.target.value)}
                      >
                        <option value="Designing">1. Designing</option>
                        <option value="Printing">2. Printing</option>
                        <option value="Finishing">3. Finishing</option>
                        <option value="Quality Check">4. Quality Check</option>
                        <option value="Ready for Delivery">5. Ready for Delivery</option>
                        <option value="Delivered">6. Delivered</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Status</label>
                      <select
                        className="form-select form-select-sm"
                        value={stageStatusInput}
                        onChange={(e) => setStageStatusInput(e.target.value)}
                      >
                        <option value="In Progress">In Progress (Active)</option>
                        <option value="Completed">Completed (Passed)</option>
                        <option value="Delayed">Delayed (Attention Needed)</option>
                        <option value="Pending">Pending (Queue)</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Assign Operator</label>
                      <select
                        className="form-select form-select-sm"
                        value={stageOperatorId}
                        onChange={(e) => setStageOperatorId(e.target.value)}
                      >
                        <option value="">-- Choose Operator --</option>
                        {(employees || []).map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.department || emp.role})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Assign Machine</label>
                      <select
                        className="form-select form-select-sm"
                        value={stageMachineId}
                        onChange={(e) => setStageMachineId(e.target.value)}
                      >
                        <option value="">-- Choose Machine --</option>
                        {(machines || []).map((mch) => (
                          <option key={mch.id} value={mch.id}>{mch.name} ({mch.status})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Stage Remarks / Operator Notes</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="e.g. 500 pcs printed, passed to trimming guillotine..."
                      value={stageNotes}
                      onChange={(e) => setStageNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setIsUpdatingStage(false)} className="btn btn-sm btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-primary">
                      <Save size={14} /> Save Stage Progress
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: MATERIALS & WASTAGE */}
          {activeTab === 'materials' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                  Material Consumption & Wastage Tracking
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Automatic wastage percentage calculation linked directly to actual production job costing.
                </span>
              </div>

              {/* Wastage KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>REQUIRED QUANTITY</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{reqQty} {currentItem.unit || 'Units'}</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ACTUAL PRODUCED</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>{prodQty} {currentItem.unit || 'Units'}</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>RAW MATERIAL CONSUMED</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#d97706' }}>{matUsed} {currentItem.unit || 'Units'}</div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>SCRAP / WASTAGE</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626' }}>
                    {wasteQty} {currentItem.unit || 'Units'} ({wastePct}%)
                  </div>
                </div>
              </div>

              {/* Log Wastage Form */}
              <form
                onSubmit={handleWastageSubmit}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>
                  ⚙️ Record Production Run Output & Scrap
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Good Produced Qty</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      placeholder={`e.g. ${reqQty}`}
                      value={wasteProducedQty}
                      onChange={(e) => setWasteProducedQty(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Total Material Used (Feed Qty)</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      placeholder={`e.g. ${Math.round(reqQty * 1.08)}`}
                      value={wasteMaterialUsed}
                      onChange={(e) => setWasteMaterialUsed(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Scrap Reason</label>
                    <select
                      className="form-select form-select-sm"
                      value={wasteReason}
                      onChange={(e) => setWasteReason(e.target.value)}
                    >
                      <option value="Setup Scrap / Color Calibration">Setup Scrap / Color Calibration</option>
                      <option value="Head Banding / Ink Smudge">Head Banding / Ink Smudge</option>
                      <option value="Trimming & Edge Bleed Waste">Trimming & Edge Bleed Waste</option>
                      <option value="Media Jam / Wrinkle">Media Jam / Wrinkle</option>
                      <option value="Lamination Bubble Defect">Lamination Bubble Defect</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-sm btn-primary">
                    <Trash2 size={14} /> Log Wastage Entry
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: COSTING & MARGIN */}
          {activeTab === 'costing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                    Estimated vs Actual Job Costing Breakdown
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Calculate cost variances across materials, machine runtime, labour and finishing.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setCostForm({
                      estMaterial: estBreakdown.material,
                      estPrinting: estBreakdown.printing,
                      estFinishing: estBreakdown.finishing,
                      estLabour: estBreakdown.labour,
                      estMachine: estBreakdown.machine,
                      estOutsourcing: estBreakdown.outsourcing,
                      estOther: estBreakdown.other,
                      actMaterial: actBreakdown.material,
                      actPrinting: actBreakdown.printing,
                      actFinishing: actBreakdown.finishing,
                      actLabour: actBreakdown.labour,
                      actMachine: actBreakdown.machine,
                      actOutsourcing: actBreakdown.outsourcing,
                      actOther: actBreakdown.other
                    });
                    setIsEditingCost(!isEditingCost);
                  }}
                  className="btn btn-sm btn-primary"
                >
                  <Edit size={14} /> {isEditingCost ? 'Cancel Edit' : 'Edit Costing'}
                </button>
              </div>

              {/* Side-by-Side Costing Table */}
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Cost Head</th>
                      <th style={{ textAlign: 'right' }}>Estimated Cost (₹)</th>
                      <th style={{ textAlign: 'right' }}>Actual Cost (₹)</th>
                      <th style={{ textAlign: 'right' }}>Variance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'material', label: '1. Raw Material / Substrate', est: estBreakdown.material, act: actBreakdown.material },
                      { key: 'printing', label: '2. Printing Cost (Ink/Toner)', est: estBreakdown.printing, act: actBreakdown.printing },
                      { key: 'finishing', label: '3. Finishing & Lamination', est: estBreakdown.finishing, act: actBreakdown.finishing },
                      { key: 'labour', label: '4. Operator Labour', est: estBreakdown.labour, act: actBreakdown.labour },
                      { key: 'machine', label: '5. Machine Depreciation/Power', est: estBreakdown.machine, act: actBreakdown.machine },
                      { key: 'outsourcing', label: '6. Outsourcing Job Work', est: estBreakdown.outsourcing, act: actBreakdown.outsourcing },
                      { key: 'other', label: '7. Packaging & Other Charges', est: estBreakdown.other, act: actBreakdown.other }
                    ].map((row) => {
                      const diff = row.act - row.est;
                      return (
                        <tr key={row.key}>
                          <td style={{ fontWeight: 700 }}>{row.label}</td>
                          <td style={{ textAlign: 'right' }}>
                            {isEditingCost ? (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                style={{ textAlign: 'right', width: '110px', display: 'inline-block' }}
                                value={costForm[`est${row.key.charAt(0).toUpperCase() + row.key.slice(1)}`]}
                                onChange={(e) => setCostForm({ ...costForm, [`est${row.key.charAt(0).toUpperCase() + row.key.slice(1)}`]: e.target.value })}
                              />
                            ) : (
                              formatINR(row.est)
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {isEditingCost ? (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                style={{ textAlign: 'right', width: '110px', display: 'inline-block' }}
                                value={costForm[`act${row.key.charAt(0).toUpperCase() + row.key.slice(1)}`]}
                                onChange={(e) => setCostForm({ ...costForm, [`act${row.key.charAt(0).toUpperCase() + row.key.slice(1)}`]: e.target.value })}
                              />
                            ) : (
                              formatINR(row.act)
                            )}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: diff > 0 ? '#dc2626' : '#16a34a' }}>
                            {diff >= 0 ? '+' : ''}{formatINR(diff)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td>TOTAL JOB COST</td>
                      <td style={{ textAlign: 'right', color: '#1e40af' }}>{formatINR(totalEstCost)}</td>
                      <td style={{ textAlign: 'right', color: '#0f172a' }}>{formatINR(totalActCost)}</td>
                      <td style={{ textAlign: 'right', color: costVariance > 0 ? '#dc2626' : '#16a34a' }}>
                        {costVariance >= 0 ? '+' : ''}{formatINR(costVariance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {isEditingCost && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button onClick={() => setIsEditingCost(false)} className="btn btn-sm btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleCostingSave} className="btn btn-sm btn-primary">
                    <Save size={14} /> Save Updated Costing
                  </button>
                </div>
              )}

              {/* Profit Summary Card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div className="card">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>SELLING PRICE</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{formatINR(sellingPrice)}</div>
                </div>
                <div className="card">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ACTUAL COST</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#dc2626' }}>{formatINR(totalActCost)}</div>
                </div>
                <div className="card">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>GROSS PROFIT</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>{formatINR(grossProfit)}</div>
                </div>
                <div className="card">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>GROSS MARGIN %</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>{grossMarginPct}%</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: OUTSOURCING */}
          {activeTab === 'outsourcing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                  Outsourced Job Work Tracking
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Monitor vendor dispatch, job work pricing, customer billing and delivery turnaround.
                </span>
              </div>

              {currentItem.outsource ? (
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>OUTSOURCE VENDOR</span>
                      <strong>{currentItem.vendorName || 'Selected Vendor'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>PROCESS / OPERATION</span>
                      <strong>{currentItem.outsourceProcess || 'Special Printing / Fabrication'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ESTIMATED VENDOR COST</span>
                      <strong style={{ color: '#dc2626' }}>{formatINR(currentItem.internalEstOutsourceCost || currentItem.estimatedVendorCost || 0)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ACTUAL VENDOR BILL</span>
                      <strong style={{ color: '#0f172a' }}>{formatINR(currentItem.actualVendorBill || 0)}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '10px' }}>
                  This job order is produced in-house on ScreenArts production machines and is not outsourced.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: PAYMENTS */}
          {activeTab === 'payments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                    Payment & Settlement Status
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Track advance, collections, unpaid balances, and record instant payment receipts.
                  </span>
                </div>
                {Number(parentOrder.balanceAmount || 0) > 0 && (
                  <button onClick={() => setIsPayingOpen(!isPayingOpen)} className="btn btn-sm btn-primary">
                    <CreditCard size={14} /> + Collect Payment
                  </button>
                )}
              </div>

              {/* Payment Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div className="card">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ORDER GRAND TOTAL</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{formatINR(parentOrder.grandTotal || sellingPrice)}</div>
                </div>
                <div className="card">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ADVANCE PAID</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>{formatINR(parentOrder.advanceAmount || 0)}</div>
                </div>
                <div className="card">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>BALANCE DUE</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: Number(parentOrder.balanceAmount || 0) > 0 ? '#dc2626' : '#059669' }}>
                    {formatINR(parentOrder.balanceAmount || 0)}
                  </div>
                </div>
                <div className="card">
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>PAYMENT STATUS</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>{parentOrder.paymentStatus || 'Pending'}</div>
                </div>
              </div>

              {/* Collect Payment Form Drawer */}
              {isPayingOpen && (
                <form
                  onSubmit={handleCollectPayment}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e40af' }}>
                    💵 Collect Payment for Order #{job.orderId}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Amount (₹)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder={`Balance: ${parentOrder.balanceAmount || 0}`}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Payment Method</label>
                      <select
                        className="form-select form-select-sm"
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value)}
                      >
                        <option value="UPI">UPI / QR Code</option>
                        <option value="Cash">Cash Counter</option>
                        <option value="Bank Transfer">Bank NEFT/RTGS</option>
                        <option value="Card">Credit/Debit Card</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Deposit Account</label>
                      <select
                        className="form-select form-select-sm"
                        value={payBankId}
                        onChange={(e) => setPayBankId(e.target.value)}
                      >
                        <option value="">-- Cash Counter / Default --</option>
                        {(companyBankAccounts || []).map((b) => (
                          <option key={b.id} value={b.id}>{b.bankName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setIsPayingOpen(false)} className="btn btn-sm btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-sm btn-primary">
                      Record Payment
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 7: FILES & ARTWORK */}
          {activeTab === 'files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                  Artwork, Proofs & Production Files
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Manage customer vector assets, approval proofs, and shop floor print-ready RIP files.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.4rem' }}>
                    🖼️ Customer Vector Artwork
                  </div>
                  {currentItem.artworkUrl ? (
                    <div>
                      <a href={currentItem.artworkUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontSize: '0.82rem', textDecoration: 'underline' }}>
                        View Uploaded Artwork File
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>No vector file attached yet</span>
                  )}
                </div>

                <div style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '1rem', backgroundColor: '#f8fafc' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.4rem' }}>
                    ✅ Customer Proof Approval
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#059669', fontWeight: 700 }}>
                    Status: {currentItem.artworkStatus || 'Approved by Customer'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ACTIVITY HISTORY */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                  Chronological Job Order Activity Trail
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Every revision, stage transition and payment update logged with actor timestamp.
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(parentOrder.editHistory || [
                  { id: 1, summary: 'Job Order registered in ERP Production Queue', editedBy: parentOrder.salesPersonName || 'Sales Staff', editedAt: parentOrder.orderDate }
                ]).map((hist, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem 1rem',
                      background: '#f8fafc',
                      borderLeft: '4px solid #2563eb',
                      borderRadius: '6px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{hist.summary}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                      By: <strong>{hist.editedBy}</strong> • Time: {hist.editedAt}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Job: <strong>{job.jobCardId || `JC-${job.orderId}`}</strong> • Priority: <strong>{job.jobPriority || 'Normal'}</strong>
          </div>
          <button onClick={onClose} className="btn btn-secondary btn-sm">
            Close Screen
          </button>
        </div>
      </div>
    </div>
  );
};
