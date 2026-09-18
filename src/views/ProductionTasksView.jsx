import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useERP } from '../context/ERPContext';
import { formatINR } from '../utils/reportEngine';
import api from '../utils/api';
import {
  UserCheck,
  Play,
  Pause,
  Check,
  RotateCcw,
  Plus,
  Search,
  Filter,
  Layers,
  List,
  Table,
  Download,
  Printer,
  ArrowUpDown,
  Clock,
  Timer,
  AlertCircle,
  CheckCircle2,
  Factory,
  Cpu,
  User,
  Trash2,
  Edit,
  Save,
  X,
  Calendar,
  ChevronRight,
  TrendingUp,
  Sliders,
  Settings,
  PackageCheck,
  Package,
  Box,
  Zap,
  CheckSquare,
  Briefcase,
  Shield,
  Activity,
  Eye
} from 'lucide-react';

export const ProductionTasksView = ({ onNavigate = null }) => {
  const {
    productionTasks,
    productionProcesses,
    employees,
    machines,
    salesOrders,
    createProductionTask,
    updateProductionTask,
    executeTaskAction,
    deleteProductionTask,
    addProductionProcess,
    updateProductionProcess,
    deleteProductionProcess,
    activeUser,
    takeProductionTask,
    takeJobOrderItem,
    reassignProductionTask
  } = useERP();

  // ========================================================================
  // ROLE DETECTION: Admin/Manager vs Normal Staff
  // ========================================================================
  const userPermissions = useMemo(() => {
    if (!activeUser) return [];
    return Array.isArray(activeUser.permissions) ? activeUser.permissions : [];
  }, [activeUser]);

  const isAdminOrManager = useMemo(() => {
    if (!activeUser) return true; // fallback to admin
    const role = (activeUser.role || '').toLowerCase();
    if (role === 'admin' || role === 'super admin' || role === 'manager') return true;
    return userPermissions.includes('production.view_all');
  }, [activeUser, userPermissions]);

  const userEmployeeId = activeUser?.employeeId || '';
  const userName = activeUser?.name || 'Staff';
  const userDepartment = activeUser?.department || 'Production';
  const userRole = activeUser?.role || 'Staff';
  const userAllowedProcesses = useMemo(() => {
    if (!activeUser) return [];
    return Array.isArray(activeUser.allowedProcesses) ? activeUser.allowedProcesses : [];
  }, [activeUser]);

  // Staff-specific tab state: 'my_work' | 'available' | 'completed_today'
  const [staffTab, setStaffTab] = useState('my_work');

  // Available tasks state (fetched from backend for staff)
  const [availableWork, setAvailableWork] = useState({ tasks: [], availableItems: [], allowedProcesses: [] });
  const [availableLoading, setAvailableLoading] = useState(false);
  const [takeWorkLoading, setTakeWorkLoading] = useState(null); // task id being taken

  // Reassign modal state
  const [reassignModal, setReassignModal] = useState(null); // { task, ... }
  const [reassignTarget, setReassignTarget] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Timeline modal state
  const [timelineModal, setTimelineModal] = useState(null);

  const handleOpenTimeline = async (task) => {
    setTimelineModal({ task, logs: [], loading: true });
    try {
      const res = await api.fetchTaskTimeline(task.id);
      setTimelineModal({ task, logs: res.timeline || [], loading: false });
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      setTimelineModal({ task, logs: [], loading: false, error: err.message });
    }
  };

  // Staff-scoped computed values
  const myTasks = useMemo(() => {
    if (isAdminOrManager) return [];
    return (productionTasks || []).filter(t =>
      t.employeeId === userEmployeeId ||
      t.assignedEmployeeId === userEmployeeId ||
      t.assignedUserId === (activeUser?.userId || activeUser?.id)
    );
  }, [productionTasks, userEmployeeId, activeUser, isAdminOrManager]);

  const myActiveTasks = useMemo(() =>
    myTasks.filter(t => ['Started', 'In Progress', 'Resumed'].includes(t.status)),
  [myTasks]);

  const myPausedTasks = useMemo(() =>
    myTasks.filter(t => t.status === 'Paused'),
  [myTasks]);

  const myPendingTasks = useMemo(() =>
    myTasks.filter(t => t.status === 'Pending' || t.status === 'Assigned'),
  [myTasks]);

  const myCompletedToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return myTasks.filter(t =>
      t.status === 'Completed' &&
      (
        (t.completedAt && t.completedAt.startsWith(today)) ||
        (t.createdAt && t.createdAt.startsWith(today)) ||
        t.taskDate === today
      )
    );
  }, [myTasks]);

  const myTotalMinutesToday = useMemo(() =>
    myTasks.reduce((sum, t) => sum + Number(t.totalDurationMinutes || 0), 0),
  [myTasks]);

  // Fetch available work for staff
  const fetchAvailableWork = useCallback(async () => {
    if (isAdminOrManager) return;
    setAvailableLoading(true);
    try {
      const data = await api.fetchAvailableProductionTasks();
      if (data && data.success) {
        setAvailableWork({
          tasks: data.tasks || [],
          availableItems: data.availableItems || [],
          allowedProcesses: data.allowedProcesses || []
        });
      }
    } catch (err) {
      console.error('fetchAvailableWork error:', err);
    }
    setAvailableLoading(false);
  }, [isAdminOrManager]);

  useEffect(() => {
    if (!isAdminOrManager && staffTab === 'available') {
      fetchAvailableWork();
    }
  }, [isAdminOrManager, staffTab, fetchAvailableWork]);

  // Staff: Atomic Take Work handler
  const handleTakeWork = async (taskId) => {
    setTakeWorkLoading(taskId);
    try {
      await takeProductionTask(taskId);
      // Refresh available work list after taking
      await fetchAvailableWork();
    } catch (err) {
      alert(err.message || 'Failed to claim work. It may have already been taken.');
    }
    setTakeWorkLoading(null);
  };

  // Staff: Atomic Take Job Order Item handler
  const handleTakeJobItem = async (orderId, itemId, processName, startImmediately = true) => {
    setTakeWorkLoading(`${orderId}-${itemId}-${processName}`);
    try {
      await takeJobOrderItem({ orderId, itemId, processName, startImmediately });
      await fetchAvailableWork();
    } catch (err) {
      alert(err.message || 'Failed to claim this item. It may have already been taken.');
    }
    setTakeWorkLoading(null);
  };

  // Admin: Reassign handler
  const handleReassignSubmit = async () => {
    if (!reassignModal || !reassignTarget) return;
    try {
      const emp = (employees || []).find(e => e.id === reassignTarget);
      await reassignProductionTask(reassignModal.id, {
        newEmployeeId: reassignTarget,
        newEmployeeName: emp?.name || reassignTarget,
        reason: reassignReason || 'Admin reassignment'
      });
      setReassignModal(null);
      setReassignTarget('');
      setReassignReason('');
    } catch (err) {
      alert(err.message || 'Failed to reassign task');
    }
  };

  // Navigation sub-tab: 'board' | 'list' | 'available_items' | 'workload' | 'processes'
  const [activeTab, setActiveTab] = useState('board');
  const [sortBy, setSortBy] = useState('date_desc');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [processFilter, setProcessFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [availableStageFilter, setAvailableStageFilter] = useState('ALL');

  // Take / Assign Task Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmployeeForAssign, setSelectedEmployeeForAssign] = useState(null);
  const [taskForm, setTaskForm] = useState({
    orderId: '',
    itemId: '',
    itemIndex: 1,
    itemTitle: '',
    itemDimensions: '',
    itemMaterial: '',
    employeeId: '',
    processName: 'Digital Printing',
    quantity: 1,
    unit: 'Nos',
    priority: 'Normal',
    machineId: '',
    remarks: '',
    status: 'Pending'
  });

  // Active Job Orders & Available Line Items
  const activeJobOrders = useMemo(() => {
    return (salesOrders || []).filter((o) => !['Delivered', 'Cancelled'].includes(o.productionStatus));
  }, [salesOrders]);

  const totalAvailableItemsCount = useMemo(() => {
    return activeJobOrders.reduce((sum, o) => sum + (o.items ? o.items.length : 0), 0);
  }, [activeJobOrders]);

  // Rework Modal state
  const [reworkPromptTask, setReworkPromptTask] = useState(null);
  const [reworkReason, setReworkReason] = useState('');
  const [reworkQtyInput, setReworkQtyInput] = useState('');

  // Process Master Form state
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [processForm, setProcessForm] = useState({
    name: '',
    department: 'Finishing',
    defaultRate: 0,
    unit: 'Nos',
    description: '',
    isActive: true
  });

  // Format minutes to string e.g. "1h 45m" or "35m"
  const formatDuration = (mins) => {
    const total = Number(mins || 0);
    if (total <= 0) return '0m';
    const h = Math.floor(total / 60);
    const m = Math.round(total % 60);
    if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`;
    return `${m}m`;
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return (productionTasks || []).filter((task) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (task.orderNumber && task.orderNumber.toLowerCase().includes(q)) ||
        (task.orderId && task.orderId.toLowerCase().includes(q)) ||
        (task.customerName && task.customerName.toLowerCase().includes(q)) ||
        (task.processName && task.processName.toLowerCase().includes(q)) ||
        (task.employeeName && task.employeeName.toLowerCase().includes(q)) ||
        (task.itemTitle && task.itemTitle.toLowerCase().includes(q));

      const matchEmp = employeeFilter === 'ALL' || task.employeeId === employeeFilter;
      const matchProc = processFilter === 'ALL' || task.processName === processFilter;
      const matchStatus = statusFilter === 'ALL' || task.status === statusFilter;

      return matchQuery && matchEmp && matchProc && matchStatus;
    });
  }, [productionTasks, searchQuery, employeeFilter, processFilter, statusFilter]);

  // Sorted tasks for List View
  const sortedTasks = useMemo(() => {
    const list = [...filteredTasks];
    if (sortBy === 'date_desc') {
      return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    if (sortBy === 'date_asc') {
      return list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
    if (sortBy === 'duration_desc') {
      return list.sort((a, b) => Number(b.totalDurationMinutes || 0) - Number(a.totalDurationMinutes || 0));
    }
    if (sortBy === 'priority') {
      const pWeights = { Urgent: 3, High: 2, Normal: 1, Low: 0 };
      return list.sort((a, b) => (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0));
    }
    if (sortBy === 'order') {
      return list.sort((a, b) => String(a.orderNumber || a.orderId || '').localeCompare(String(b.orderNumber || b.orderId || '')));
    }
    if (sortBy === 'employee') {
      return list.sort((a, b) => String(a.employeeName || '').localeCompare(String(b.employeeName || '')));
    }
    if (sortBy === 'process') {
      return list.sort((a, b) => String(a.processName || '').localeCompare(String(b.processName || '')));
    }
    return list;
  }, [filteredTasks, sortBy]);

  // Export CSV for filtered and sorted tasks
  const handleExportCSV = () => {
    if (!sortedTasks || sortedTasks.length === 0) {
      alert('No tasks to export.');
      return;
    }

    const headers = [
      'Task ID',
      'Order #',
      'Customer',
      'Item Description',
      'Process',
      'Assigned Employee',
      'Machine',
      'Quantity',
      'Unit',
      'Priority',
      'Status',
      'Active Duration (Mins)',
      'Active Duration (Formatted)',
      'Rework Defect Cause',
      'Rework Qty',
      'Remarks',
      'Created At'
    ];

    const rows = sortedTasks.map((t) => [
      `"${t.id || ''}"`,
      `"${t.orderNumber || t.orderId || ''}"`,
      `"${(t.customerName || '').replace(/"/g, '""')}"`,
      `"${(t.itemTitle || '').replace(/"/g, '""')}"`,
      `"${(t.processName || '').replace(/"/g, '""')}"`,
      `"${(t.employeeName || '').replace(/"/g, '""')}"`,
      `"${(t.machineName || 'Manual').replace(/"/g, '""')}"`,
      t.quantity || 1,
      `"${t.unit || 'Nos'}"`,
      `"${t.priority || 'Normal'}"`,
      `"${t.status || ''}"`,
      t.totalDurationMinutes || 0,
      `"${formatDuration(t.totalDurationMinutes)}"`,
      `"${(t.reworkReason || t.reworkNotes || '').replace(/"/g, '""')}"`,
      t.reworkQty || 0,
      `"${(t.remarks || '').replace(/"/g, '""')}"`,
      `"${t.createdAt || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Production_Tasks_List_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Quick action handler
  const handleTaskAction = async (taskId, action, notes = '') => {
    await executeTaskAction(taskId, { action, notes });
  };

  // Rework submit
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

  // Open assign / take task modal (optionally pre-selecting an employee, order, item, and immediate start)
  const openAssignModal = (emp = null, prefillOrder = null, prefillItem = null, startImmediately = false) => {
    setSelectedEmployeeForAssign(emp);
    const ord = prefillOrder
      ? (typeof prefillOrder === 'object' ? prefillOrder : (salesOrders || []).find((o) => o.id === prefillOrder || o.orderNumber === prefillOrder))
      : (salesOrders && salesOrders.length > 0 ? salesOrders[0] : null);

    const items = ord?.items || [];
    const item = prefillItem
      ? (typeof prefillItem === 'object' ? prefillItem : items.find((i) => i.id === prefillItem))
      : (items.length > 0 ? items[0] : null);

    const itemIdx = item ? items.findIndex((i) => i.id === item.id) + 1 : 1;
    const itemDims = item ? (item.dimensions || (item.totalSqFt ? `${item.totalSqFt} Sq.Ft (${item.width}x${item.height})` : (item.width ? `${item.width}x${item.height} ${item.unit || ''}` : ''))) : '';

    setTaskForm({
      orderId: ord ? ord.id : '',
      itemId: item ? (item.id || '') : '',
      itemIndex: itemIdx || 1,
      itemTitle: item ? (item.productName || item.customTitle || 'Printing Item') : 'Printing Item',
      itemDimensions: itemDims,
      itemMaterial: item?.material || '',
      employeeId: emp ? (typeof emp === 'object' ? emp.id : emp) : (employees && employees.length > 0 ? employees[0].id : ''),
      processName: 'Digital Printing',
      quantity: item?.qty || 1,
      unit: item?.unit || 'Nos',
      priority: item?.jobPriority || ord?.priority || 'Normal',
      machineId: '',
      remarks: '',
      status: startImmediately ? 'In Progress' : 'Pending'
    });
    setIsAssignModalOpen(true);
  };

  const handleOrderChange = (selectedOrderId) => {
    const ord = (salesOrders || []).find((o) => o.id === selectedOrderId);
    const items = ord?.items || [];
    const firstItem = items[0] || null;
    const itemDims = firstItem ? (firstItem.dimensions || (firstItem.totalSqFt ? `${firstItem.totalSqFt} Sq.Ft (${firstItem.width}x${firstItem.height})` : (firstItem.width ? `${firstItem.width}x${firstItem.height} ${firstItem.unit || ''}` : ''))) : '';

    setTaskForm((prev) => ({
      ...prev,
      orderId: selectedOrderId,
      itemId: firstItem ? (firstItem.id || '') : '',
      itemIndex: firstItem ? 1 : 1,
      itemTitle: firstItem ? (firstItem.productName || firstItem.customTitle || 'Printing Item') : 'Printing Item',
      itemDimensions: itemDims,
      itemMaterial: firstItem?.material || '',
      quantity: firstItem?.qty || 1,
      unit: firstItem?.unit || 'Nos',
      priority: firstItem?.jobPriority || ord?.priority || prev.priority
    }));
  };

  const handleItemChange = (selectedItemId) => {
    const ord = (salesOrders || []).find((o) => o.id === taskForm.orderId);
    const items = ord?.items || [];
    const item = items.find((i) => i.id === selectedItemId);
    if (!item) return;

    const itemIdx = items.findIndex((i) => i.id === item.id) + 1;
    const itemDims = item.dimensions || (item.totalSqFt ? `${item.totalSqFt} Sq.Ft (${item.width}x${item.height})` : (item.width ? `${item.width}x${item.height} ${item.unit || ''}` : ''));

    setTaskForm((prev) => ({
      ...prev,
      itemId: item.id || '',
      itemIndex: itemIdx,
      itemTitle: item.productName || item.customTitle || 'Printing Item',
      itemDimensions: itemDims,
      itemMaterial: item.material || '',
      quantity: item.qty || prev.quantity || 1,
      unit: item.unit || prev.unit || 'Nos',
      priority: item.jobPriority || prev.priority
    }));
  };

  // Submit assign / take task
  const handleAssignSubmit = async (e, forceStatus = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!taskForm.employeeId || !taskForm.processName) {
      alert('Please choose an employee and a process.');
      return;
    }

    const empObj = (employees || []).find((em) => em.id === taskForm.employeeId);
    const mchObj = (machines || []).find((m) => m.id === taskForm.machineId);
    const ordObj = (salesOrders || []).find((o) => o.id === taskForm.orderId) || {};
    const items = ordObj.items || [];
    const selectedItem = items.find((i) => i.id === taskForm.itemId) || items[0] || {};
    const itemIdx = taskForm.itemIndex || (selectedItem ? items.findIndex((i) => i.id === selectedItem.id) + 1 : 1);
    const itemDims = taskForm.itemDimensions || selectedItem.dimensions || (selectedItem.totalSqFt ? `${selectedItem.totalSqFt} Sq.Ft (${selectedItem.width}x${selectedItem.height})` : (selectedItem.width ? `${selectedItem.width}x${selectedItem.height} ${selectedItem.unit || ''}` : ''));
    const itemMaterial = taskForm.itemMaterial || selectedItem.material || '';

    const effectiveStatus = forceStatus || taskForm.status || 'Pending';

    await createProductionTask({
      employeeId: taskForm.employeeId,
      employeeName: empObj ? empObj.name : 'Assigned Staff',
      orderId: taskForm.orderId || (ordObj.id || 'ORD-GEN'),
      orderNumber: ordObj.orderNumber || ordObj.id || 'ORD-GEN',
      customerName: ordObj.customerName || 'Walk-in Customer',
      itemId: selectedItem.id || taskForm.itemId || '',
      itemIndex: itemIdx,
      itemTitle: selectedItem.productName || taskForm.itemTitle || 'Printing Item',
      itemDimensions: itemDims,
      itemMaterial: itemMaterial,
      processName: taskForm.processName,
      quantity: Number(taskForm.quantity || selectedItem.qty || 1),
      unit: taskForm.unit || selectedItem.unit || 'Nos',
      priority: taskForm.priority || selectedItem.jobPriority || 'Normal',
      machineId: taskForm.machineId || '',
      machineName: mchObj ? mchObj.name : '',
      remarks: taskForm.remarks || '',
      status: effectiveStatus
    });

    setIsAssignModalOpen(false);
  };

  // Process master add/edit submit
  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (!processForm.name) return;

    if (editingProcess) {
      await updateProductionProcess(editingProcess.id, processForm);
    } else {
      await addProductionProcess(processForm);
    }
    setIsProcessModalOpen(false);
    setEditingProcess(null);
  };

  const openAddProcessModal = () => {
    setEditingProcess(null);
    setProcessForm({
      name: '',
      department: 'Finishing',
      defaultRate: 0,
      unit: 'Nos',
      description: '',
      isActive: true
    });
    setIsProcessModalOpen(true);
  };

  const openEditProcessModal = (proc) => {
    setEditingProcess(proc);
    setProcessForm({
      name: proc.name,
      department: proc.department || 'Finishing',
      defaultRate: proc.defaultRate || 0,
      unit: proc.unit || 'Nos',
      description: proc.description || '',
      isActive: proc.isActive !== false
    });
    setIsProcessModalOpen(true);
  };

  // KPI Calculations
  const totalTasksCount = (productionTasks || []).length;
  const inProgressCount = (productionTasks || []).filter((t) => ['Started', 'In Progress', 'Resumed'].includes(t.status)).length;
  const pausedCount = (productionTasks || []).filter((t) => t.status === 'Paused').length;
  const completedCount = (productionTasks || []).filter((t) => t.status === 'Completed').length;
  const reworkCount = (productionTasks || []).filter((t) => t.status === 'Rework').length;
  const totalDurationMins = (productionTasks || []).reduce((sum, t) => sum + Number(t.totalDurationMinutes || 0), 0);
  const totalHoursLogged = (totalDurationMins / 60).toFixed(1);

  // Kanban Columns Definition
  const kanbanColumns = [
    { id: 'pending', title: 'Pending / Assigned', statuses: ['Pending', 'Assigned'], color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
    { id: 'in_progress', title: 'In Progress (Active)', statuses: ['Started', 'In Progress', 'Resumed'], color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    { id: 'paused', title: 'Paused / On Hold', statuses: ['Paused'], color: '#d97706', bg: '#fefce8', border: '#fde68a' },
    { id: 'qc', title: 'Quality Check', statuses: ['Quality Check'], color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
    { id: 'completed', title: 'Completed', statuses: ['Completed'], color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    { id: 'rework', title: 'Rework / Defect', statuses: ['Rework'], color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
  ];

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '88vh' }}>

      {/* ========================================================================= */}
      {/* STAFF MODE: MY PRODUCTION HUB (Login-User Scoped View) */}
      {/* ========================================================================= */}
      {!isAdminOrManager && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Staff Personal Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '14px',
            padding: '1.25rem 1.5rem',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                fontWeight: 900,
                color: '#ffffff',
                border: '3px solid rgba(255,255,255,0.2)'
              }}>
                {userName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  👤 {userName}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>
                    {userDepartment} • {userRole}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '0.12rem 0.5rem',
                    borderRadius: '20px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    color: '#4ade80',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                    Online
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.02em' }}>
                MY PRODUCTION HUB
              </h3>
            </div>
          </div>

          {/* Staff Personal KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem' }}>
            <div style={{ background: '#ffffff', padding: '0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>MY ASSIGNED</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>{myTasks.length}</div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Total tasks</span>
            </div>
            <div style={{ background: '#eff6ff', padding: '0.9rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>IN PROGRESS</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb', marginTop: '0.2rem' }}>{myActiveTasks.length}</div>
              <span style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>Active now</span>
            </div>
            <div style={{ background: '#fefce8', padding: '0.9rem', borderRadius: '10px', border: '1px solid #fef08a' }}>
              <span style={{ fontSize: '0.7rem', color: '#ca8a04', fontWeight: 700, textTransform: 'uppercase' }}>PAUSED</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ca8a04', marginTop: '0.2rem' }}>{myPausedTasks.length}</div>
              <span style={{ fontSize: '0.72rem', color: '#854d0e' }}>On hold</span>
            </div>
            <div style={{ background: '#f0fdf4', padding: '0.9rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>COMPLETED TODAY</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '0.2rem' }}>{myCompletedToday.length}</div>
              <span style={{ fontSize: '0.72rem', color: '#15803d' }}>Finished</span>
            </div>
            <div style={{ background: '#faf5ff', padding: '0.9rem', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
              <span style={{ fontSize: '0.7rem', color: '#9333ea', fontWeight: 700, textTransform: 'uppercase' }}>MY WORK HOURS</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7e22ce', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Timer size={18} /> {(myTotalMinutesToday / 60).toFixed(1)}h
              </div>
              <span style={{ fontSize: '0.72rem', color: '#6b21a8' }}>Pure working</span>
            </div>
          </div>

          {/* Staff Sub-Tab Navigation */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '0.5rem', background: '#ffffff', borderRadius: '8px 8px 0 0', padding: '0.25rem 0.5rem 0' }}>
            {[
              { id: 'my_work', label: 'My Assigned Work', icon: Briefcase, count: myActiveTasks.length + myPausedTasks.length + myPendingTasks.length },
              { id: 'available', label: 'Available Work / Take Work', icon: Zap, count: availableWork.tasks.length + availableWork.availableItems.length },
              { id: 'completed_today', label: 'My Completed Today', icon: CheckCircle2, count: myCompletedToday.length }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = staffTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStaffTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? '#2563eb' : '#64748b',
                    background: 'none',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <Icon size={17} color={isActive ? '#2563eb' : '#64748b'} />
                  {tab.label}
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '12px',
                    background: isActive ? '#dbeafe' : '#f1f5f9',
                    color: isActive ? '#1d4ed8' : '#64748b'
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ================================================================= */}
          {/* STAFF TAB 1: MY ASSIGNED WORK */}
          {/* ================================================================= */}
          {staffTab === 'my_work' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {myTasks.filter(t => t.status !== 'Completed').length === 0 ? (
                <div style={{ background: '#ffffff', padding: '3rem 1.5rem', textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <Briefcase size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                  <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No active tasks assigned to you</h5>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                    Go to the <strong>"Available Work"</strong> tab to pick up new tasks.
                  </p>
                </div>
              ) : (
                myTasks.filter(t => t.status !== 'Completed').map(task => {
                  const isStarted = ['Started', 'In Progress', 'Resumed'].includes(task.status);
                  const isPaused = task.status === 'Paused';
                  const isPending = task.status === 'Pending' || task.status === 'Assigned';
                  const isRework = task.status === 'Rework';

                  let cardBorder = '#e2e8f0';
                  let cardBg = '#ffffff';
                  if (isStarted) { cardBorder = '#3b82f6'; cardBg = '#eff6ff'; }
                  else if (isPaused) { cardBorder = '#f59e0b'; cardBg = '#fffbeb'; }
                  else if (isRework) { cardBorder = '#ef4444'; cardBg = '#fef2f2'; }

                  return (
                    <div key={task.id} style={{
                      background: cardBg,
                      border: `2px solid ${cardBorder}`,
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                      boxShadow: isStarted ? '0 4px 12px rgba(59, 130, 246, 0.12)' : '0 2px 4px rgba(0,0,0,0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem'
                    }}>
                      {/* Top: Order # + Status + Priority */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.88rem', color: '#0f172a' }}>
                            #{task.orderNumber || task.orderId}
                          </span>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '12px',
                            background: isStarted ? '#dbeafe' : isPaused ? '#fef3c7' : isPending ? '#f1f5f9' : isRework ? '#fee2e2' : '#f1f5f9',
                            color: isStarted ? '#1e40af' : isPaused ? '#92400e' : isPending ? '#475569' : isRework ? '#991b1b' : '#475569'
                          }}>
                            {isStarted && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb', display: 'inline-block', marginRight: '0.3rem', verticalAlign: 'middle' }} />}
                            {task.status}
                          </span>
                        </div>
                        {task.priority && task.priority !== 'Normal' && (
                          <span style={{
                            fontSize: '0.68rem', fontWeight: 900, padding: '0.12rem 0.4rem', borderRadius: '4px',
                            background: task.priority === 'Urgent' ? '#fef2f2' : '#fffbeb',
                            color: task.priority === 'Urgent' ? '#dc2626' : '#d97706',
                            border: `1px solid ${task.priority === 'Urgent' ? '#fecaca' : '#fde68a'}`
                          }}>
                            {task.priority.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Process + Item + Customer */}
                      <div>
                        <span style={{
                          display: 'inline-block', fontSize: '0.78rem', fontWeight: 800, padding: '0.18rem 0.55rem',
                          borderRadius: '5px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd'
                        }}>
                          {task.processName}
                        </span>
                        <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#f1f5f9', color: '#334155', padding: '0.05rem 0.35rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}>
                            Item #{task.itemIndex || 1}
                          </span>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{task.itemTitle || 'Printing Item'}</strong>
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '0.15rem' }}>
                          Customer: <strong>{task.customerName || 'Walk-in'}</strong> • Qty: <strong>{task.quantity} {task.unit || 'Nos'}</strong>
                          {task.itemDimensions && ` • ${task.itemDimensions}`}
                        </div>
                      </div>

                      {/* Timer + Machine */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#7e22ce', fontWeight: 800 }}>
                          <Timer size={15} /> {formatDuration(task.totalDurationMinutes)}
                          {isStarted && <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 600, marginLeft: '0.3rem' }}>⏱ Running...</span>}
                        </div>
                        {task.machineName ? (
                          <span style={{ color: '#475569' }}>⚙️ {task.machineName}</span>
                        ) : (
                          <span>Manual</span>
                        )}
                      </div>

                      {/* Remarks */}
                      {task.remarks && (
                        <div style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic', background: '#fdfdfd', padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px dashed #e2e8f0' }}>
                          "{task.remarks}"
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.4rem',
                        marginTop: '0.2rem',
                        borderTop: '1px solid #f1f5f9',
                        paddingTop: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                        {(isPending || isRework) && (
                          <button type="button" onClick={() => handleTaskAction(task.id, 'START')}
                            style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                            <Play size={13} fill="#fff" /> Start Work
                          </button>
                        )}
                        {isStarted && (
                          <button type="button" onClick={() => handleTaskAction(task.id, 'PAUSE')}
                            style={{ background: '#d97706', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                            <Pause size={13} /> Pause
                          </button>
                        )}
                        {isPaused && (
                          <button type="button" onClick={() => handleTaskAction(task.id, 'RESUME')}
                            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                            <Play size={13} fill="#fff" /> Resume
                          </button>
                        )}
                        {(isStarted || isPaused) && (
                          <button type="button" onClick={() => handleTaskAction(task.id, 'COMPLETE')}
                            style={{ background: '#059669', color: '#fff', border: 'none', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                            <Check size={13} /> Done
                          </button>
                        )}
                        {(isStarted) && (
                          <button type="button" title="Report Quality Issue / Rework" onClick={() => setReworkPromptTask(task)}
                            style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.35rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}>
                            <RotateCcw size={13} />
                          </button>
                        )}
                        <button type="button" title="View Activity Timeline" onClick={() => handleOpenTimeline(task)}
                          style={{ background: '#f5f3ff', color: '#7e22ce', border: '1px solid #ddd6fe', padding: '0.35rem 0.5rem', borderRadius: '6px', cursor: 'pointer' }}>
                          <Activity size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STAFF TAB 2: AVAILABLE WORK / TAKE WORK */}
          {/* ================================================================= */}
          {staffTab === 'available' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Info banner */}
              <div style={{
                background: '#ecfdf5', border: '1px solid #86efac', borderRadius: '10px', padding: '0.85rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#065f46'
              }}>
                <Zap size={20} color="#059669" />
                <div>
                  <strong>Take Work</strong> — Click the green "Take Work" button to claim a task. Once taken, it will appear in <strong>My Assigned Work</strong>.
                  {userAllowedProcesses.length > 0 && (
                    <div style={{ fontSize: '0.78rem', marginTop: '0.2rem', color: '#047857' }}>
                      Your qualified processes: <strong>{userAllowedProcesses.join(', ')}</strong>
                    </div>
                  )}
                </div>
              </div>

              {availableLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                  ⏳ Loading available work...
                </div>
              ) : (
                <>
                  {/* Unassigned existing tasks */}
                  {availableWork.tasks.length > 0 && (
                    <div>
                      <h5 style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                        📋 Unassigned Tasks ({availableWork.tasks.length})
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {availableWork.tasks.map(task => (
                          <div key={task.id} style={{
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
                          }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>#{task.orderNumber || task.orderId}</span>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>
                                  {task.processName}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.2rem' }}>
                                {task.itemTitle || 'Printing Item'} • Customer: <strong>{task.customerName || 'Walk-in'}</strong> • Qty: <strong>{task.quantity} {task.unit || 'Nos'}</strong>
                              </div>
                            </div>
                            <button type="button"
                              disabled={takeWorkLoading === task.id}
                              onClick={() => handleTakeWork(task.id)}
                              style={{
                                background: takeWorkLoading === task.id ? '#94a3b8' : '#059669',
                                color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.82rem',
                                padding: '0.5rem 1rem', borderRadius: '8px',
                                display: 'flex', alignItems: 'center', gap: '0.35rem',
                                boxShadow: '0 2px 6px rgba(5,150,105,0.2)', cursor: takeWorkLoading === task.id ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <Zap size={15} fill="#fff" /> {takeWorkLoading === task.id ? 'Claiming...' : 'TAKE WORK'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Available order items to claim */}
                  {availableWork.availableItems.length > 0 && (
                    <div>
                      <h5 style={{ margin: '0.5rem 0 0.5rem', fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                        📦 Order Items Ready to Take ({availableWork.availableItems.length})
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {availableWork.availableItems.map(item => {
                          const loadKey = `${item.orderId}-${item.itemId}-${item.processName}`;
                          return (
                            <div key={item.id} style={{
                              background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
                            }}>
                              <div style={{ flex: 1, minWidth: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>#{item.orderNumber}</span>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>
                                    {item.processName}
                                  </span>
                                  {item.priority && item.priority !== 'Normal' && (
                                    <span style={{
                                      fontSize: '0.65rem', fontWeight: 900, padding: '0.1rem 0.3rem', borderRadius: '3px',
                                      background: item.priority === 'Urgent' ? '#fef2f2' : '#fffbeb',
                                      color: item.priority === 'Urgent' ? '#dc2626' : '#d97706'
                                    }}>
                                      {item.priority}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.2rem' }}>
                                  <strong>{item.itemTitle}</strong> • {item.customerName} • Qty: <strong>{item.quantity} {item.unit || 'Nos'}</strong>
                                  {item.dimensions && ` • ${item.dimensions}`}
                                </div>
                                {item.deliveryDate && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>
                                    <Calendar size={11} style={{ verticalAlign: 'middle' }} /> Due: <strong>{item.deliveryDate}</strong>
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button type="button"
                                  disabled={takeWorkLoading === loadKey}
                                  onClick={() => handleTakeJobItem(item.orderId, item.itemId, item.processName, false)}
                                  style={{
                                    background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1',
                                    fontWeight: 700, fontSize: '0.78rem', padding: '0.4rem 0.75rem', borderRadius: '6px',
                                    cursor: takeWorkLoading === loadKey ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  📥 Take & Queue
                                </button>
                                <button type="button"
                                  disabled={takeWorkLoading === loadKey}
                                  onClick={() => handleTakeJobItem(item.orderId, item.itemId, item.processName, true)}
                                  style={{
                                    background: takeWorkLoading === loadKey ? '#94a3b8' : '#059669',
                                    color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.82rem',
                                    padding: '0.45rem 0.85rem', borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                    boxShadow: '0 2px 6px rgba(5,150,105,0.2)', cursor: takeWorkLoading === loadKey ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  <Zap size={14} fill="#fff" /> {takeWorkLoading === loadKey ? 'Claiming...' : 'TAKE & START'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {availableWork.tasks.length === 0 && availableWork.availableItems.length === 0 && (
                    <div style={{ background: '#fff', padding: '3rem 1.5rem', textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                      <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No available work at the moment</h5>
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                        All tasks have been assigned. Check back soon or refresh the page.
                      </p>
                      <button type="button" onClick={fetchAvailableWork} style={{
                        marginTop: '0.75rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                        padding: '0.4rem 0.85rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer'
                      }}>
                        <RotateCcw size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> Refresh Available Work
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* STAFF TAB 3: MY COMPLETED TODAY */}
          {/* ================================================================= */}
          {staffTab === 'completed_today' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {myCompletedToday.length === 0 ? (
                <div style={{ background: '#fff', padding: '3rem 1.5rem', textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <CheckCircle2 size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                  <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No completed tasks today yet</h5>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>Complete your assigned work to see them here.</p>
                </div>
              ) : (
                <>
                  <div style={{
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.75rem 1rem',
                    fontSize: '0.85rem', color: '#15803d', fontWeight: 700
                  }}>
                    ✅ {myCompletedToday.length} task{myCompletedToday.length > 1 ? 's' : ''} completed today •
                    Total active time: <strong>{formatDuration(myCompletedToday.reduce((s, t) => s + Number(t.totalDurationMinutes || 0), 0))}</strong>
                  </div>
                  {myCompletedToday.map(task => (
                    <div key={task.id} style={{
                      background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem 1rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <CheckCircle2 size={16} color="#16a34a" />
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>#{task.orderNumber || task.orderId}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>
                            {task.processName}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.15rem' }}>
                          {task.itemTitle || 'Printing Item'} • {task.customerName || 'Walk-in'} • Qty: {task.quantity} {task.unit || 'Nos'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7e22ce', fontWeight: 800, fontSize: '0.82rem' }}>
                        <Timer size={14} /> {formatDuration(task.totalDurationMinutes)}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADMIN MODE: Full Employee Production & Multi-Task Hub */}
      {/* ========================================================================= */}
      {isAdminOrManager && (<>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <UserCheck size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Employee Production & Multi-Task Hub
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Manage shop floor tasks, dynamic employee task switching, active production timers & process allocation.
              </span>
            </div>
          </div>
        </div>

        {/* Top Buttons & Sub-Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('production')}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, padding: '0.55rem 1rem' }}
            title="Switch to ScreenArts Visual Production Board"
          >
            <Factory size={16} color="#2563eb" /> ScreenArts Visual Board
          </button>

          <button
            type="button"
            onClick={() => openAssignModal(null, null, null, true)}
            className="btn btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 800,
              padding: '0.55rem 1.15rem',
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
              cursor: 'pointer'
            }}
            title="Take a specific line item from an open Job Order"
          >
            <PackageCheck size={17} /> 📥 Take Job Order Item
          </button>

          <button
            type="button"
            onClick={() => openAssignModal()}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, padding: '0.55rem 1rem' }}
          >
            <Plus size={16} /> Quick Assign Task
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '0.5rem', background: '#ffffff', borderRadius: '8px 8px 0 0', padding: '0.25rem 0.5rem 0', overflowX: 'auto' }}>
        {[
          { id: 'board', label: 'Task Kanban Board', icon: Layers, count: inProgressCount + pausedCount },
          { id: 'list', label: 'Task List View', icon: List, count: filteredTasks.length },
          { id: 'available_items', label: 'Take Job Items (Available)', icon: PackageCheck, count: totalAvailableItemsCount },
          { id: 'workload', label: 'Employee Workload & Capacity', icon: User, count: employees.length },
          { id: 'processes', label: 'Process Master Directory', icon: Settings, count: (productionProcesses || []).length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                fontSize: '0.88rem',
                fontWeight: isActive ? 800 : 600,
                color: isActive ? '#2563eb' : '#64748b',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                cursor: 'pointer'
              }}
            >
              <Icon size={17} color={isActive ? '#2563eb' : '#64748b'} />
              {tab.label}
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '12px',
                  background: isActive ? '#dbeafe' : '#f1f5f9',
                  color: isActive ? '#1d4ed8' : '#64748b'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
        <div style={{ background: '#ffffff', padding: '0.9rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL TASKS</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '0.2rem' }}>{totalTasksCount}</div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Across all print orders</span>
        </div>

        <div style={{ background: '#eff6ff', padding: '0.9rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>IN PROGRESS</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb', marginTop: '0.2rem' }}>{inProgressCount}</div>
          <span style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>Live on shop floor</span>
        </div>

        <div style={{ background: '#fefce8', padding: '0.9rem', borderRadius: '10px', border: '1px solid #fef08a' }}>
          <span style={{ fontSize: '0.72rem', color: '#ca8a04', fontWeight: 700, textTransform: 'uppercase' }}>PAUSED</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ca8a04', marginTop: '0.2rem' }}>{pausedCount}</div>
          <span style={{ fontSize: '0.75rem', color: '#854d0e' }}>On hold / waiting</span>
        </div>

        <div style={{ background: '#f0fdf4', padding: '0.9rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>COMPLETED</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '0.2rem' }}>{completedCount}</div>
          <span style={{ fontSize: '0.75rem', color: '#15803d' }}>Ready or dispatched</span>
        </div>

        <div style={{ background: '#fef2f2', padding: '0.9rem', borderRadius: '10px', border: '1px solid #fecaca' }}>
          <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>REWORK / DEFECT</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '0.2rem' }}>{reworkCount}</div>
          <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Quality rejection</span>
        </div>

        <div style={{ background: '#faf5ff', padding: '0.9rem', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
          <span style={{ fontSize: '0.72rem', color: '#9333ea', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL ACTIVE HOURS</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7e22ce', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Timer size={20} /> {totalHoursLogged} hrs
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6b21a8' }}>Pure working duration</span>
        </div>
      </div>

      {/* Filter Strip */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background: '#ffffff',
          padding: '0.85rem 1rem',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Search tasks by Employee, Order #, Process, Item or Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '0.85rem',
              color: '#0f172a'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Employee Filter */}
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="ALL">All Employees</option>
            {(employees || []).map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Process Filter */}
          <select
            value={processFilter}
            onChange={(e) => setProcessFilter(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="ALL">All Processes</option>
            {(productionProcesses || []).map((proc) => (
              <option key={proc.id} value={proc.name}>
                {proc.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Paused">Paused</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Completed">Completed</option>
            <option value="Rework">Rework</option>
          </select>

          {/* View Switcher: Board vs List View */}
          {(activeTab === 'board' || activeTab === 'list') && (
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '6px', border: '1px solid #cbd5e1', marginLeft: '0.25rem' }}>
              <button
                type="button"
                onClick={() => setActiveTab('board')}
                title="Switch to Kanban Board View"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: activeTab === 'board' ? 700 : 500,
                  color: activeTab === 'board' ? '#2563eb' : '#64748b',
                  background: activeTab === 'board' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '5px',
                  boxShadow: activeTab === 'board' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <Layers size={13} /> Board
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                title="Switch to List / Table View"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: activeTab === 'list' ? 700 : 500,
                  color: activeTab === 'list' ? '#2563eb' : '#64748b',
                  background: activeTab === 'list' ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '5px',
                  boxShadow: activeTab === 'list' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer'
                }}
              >
                <List size={13} /> List View
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: KANBAN TASK BOARD */}
      {/* ========================================================================= */}
      {activeTab === 'board' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            alignItems: 'start',
            overflowX: 'auto'
          }}
        >
          {kanbanColumns.map((col) => {
            const columnTasks = filteredTasks.filter((t) => col.statuses.includes(t.status));

            return (
              <div
                key={col.id}
                style={{
                  background: '#f8fafc',
                  border: `1.5px solid ${col.border}`,
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '75vh'
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: col.bg,
                    borderBottom: `1.5px solid ${col.border}`,
                    borderRadius: '11px 11px 0 0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: col.color
                      }}
                    />
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: col.color }}>
                      {col.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      background: '#ffffff',
                      color: col.color,
                      border: `1px solid ${col.border}`
                    }}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Tasks List */}
                <div
                  style={{
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    overflowY: 'auto',
                    flex: 1
                  }}
                >
                  {columnTasks.length === 0 ? (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                      No tasks in this stage
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isStarted = ['Started', 'In Progress', 'Resumed'].includes(task.status);
                      const isPaused = task.status === 'Paused';
                      const isCompleted = task.status === 'Completed';
                      const isRework = task.status === 'Rework';
                      const isPending = task.status === 'Pending' || task.status === 'Assigned';

                      return (
                        <div
                          key={task.id}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '10px',
                            padding: '0.85rem',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                          }}
                        >
                          {/* Top Row: Order #, Visual Stage, & Priority */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ fontWeight: 800, fontSize: '0.78rem', color: '#0f172a' }}>
                                #{task.orderNumber || task.orderId}
                              </span>
                              {(() => {
                                const parentOrder = (salesOrders || []).find(o => o.id === task.orderId || o.orderNumber === task.orderNumber || o.id === task.orderNumber);
                                const stageName = parentOrder?.productionStatus || 'In Production';
                                return (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigate && onNavigate('production');
                                    }}
                                    style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      padding: '0.1rem 0.35rem',
                                      borderRadius: '4px',
                                      background: '#f1f5f9',
                                      color: '#2563eb',
                                      border: '1px solid #cbd5e1',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.2rem'
                                    }}
                                    title="View on ScreenArts Visual Production Board"
                                  >
                                    <Factory size={9} color="#2563eb" /> {stageName} ↗
                                  </button>
                                );
                              })()}
                            </div>
                            {task.priority && task.priority !== 'Normal' ? (
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 900,
                                  padding: '0.1rem 0.35rem',
                                  borderRadius: '4px',
                                  background: task.priority === 'Urgent' ? '#fef2f2' : '#fffbeb',
                                  color: task.priority === 'Urgent' ? '#dc2626' : '#d97706',
                                  border: `1px solid ${task.priority === 'Urgent' ? '#fecaca' : '#fde68a'}`
                                }}
                              >
                                {task.priority.toUpperCase()}
                              </span>
                            ) : null}
                          </div>

                          {/* Process Badge & Customer */}
                          <div>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '4px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd'
                              }}
                            >
                              {task.processName}
                            </span>
                            <div style={{ marginTop: '0.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.66rem', fontWeight: 800, background: '#f1f5f9', color: '#334155', padding: '0.05rem 0.35rem', borderRadius: '3px', border: '1px solid #cbd5e1' }}>
                                  Item #{task.itemIndex || 1}
                                </span>
                                <strong style={{ fontSize: '0.8rem', color: '#0f172a' }}>
                                  {task.itemTitle || 'Printing Item'}
                                </strong>
                              </div>
                              {(task.itemDimensions || task.itemMaterial) && (
                                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.15rem' }}>
                                  {task.itemDimensions ? `${task.itemDimensions} • ` : ''}{task.itemMaterial || ''}
                                </div>
                              )}
                              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                                Customer: <strong style={{ color: '#334155' }}>{task.customerName || 'N/A'}</strong> • Qty: <strong>{task.quantity} {task.unit || 'Nos'}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Employee & Machine Info */}
                          <div
                            style={{
                              background: '#f8fafc',
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <div
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 800
                                }}
                              >
                                {(task.employeeName || 'E').slice(0, 1)}
                              </div>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{task.employeeName}</span>
                            </div>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>
                              {task.quantity} {task.unit || 'Nos'}
                            </span>
                          </div>

                          {/* Active Duration & Machine */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#7e22ce', fontWeight: 800 }}>
                              <Timer size={13} /> {formatDuration(task.totalDurationMinutes)}
                            </div>
                            {task.machineName ? (
                              <span style={{ color: '#475569' }}>⚙️ {task.machineName}</span>
                            ) : (
                              <span>Manual</span>
                            )}
                          </div>

                          {/* Remarks if any */}
                          {task.remarks && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', background: '#fdfdfd', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px dashed #e2e8f0' }}>
                              "{task.remarks}"
                            </div>
                          )}

                          {/* Action Controller Buttons on Card */}
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              gap: '0.3rem',
                              marginTop: '0.2rem',
                              borderTop: '1px solid #f1f5f9',
                              paddingTop: '0.4rem'
                            }}
                          >
                            {/* Start */}
                            {(isPending || isRework) && (
                              <button
                                type="button"
                                onClick={() => handleTaskAction(task.id, 'START')}
                                className="btn btn-sm"
                                style={{ background: '#16a34a', color: '#ffffff', border: 'none', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <Play size={11} fill="#ffffff" /> Start
                              </button>
                            )}

                            {/* Pause */}
                            {isStarted && (
                              <button
                                type="button"
                                onClick={() => handleTaskAction(task.id, 'PAUSE')}
                                className="btn btn-sm"
                                style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <Pause size={11} /> Pause
                              </button>
                            )}

                            {/* Resume */}
                            {isPaused && (
                              <button
                                type="button"
                                onClick={() => handleTaskAction(task.id, 'RESUME')}
                                className="btn btn-sm"
                                style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <Play size={11} fill="#ffffff" /> Resume
                              </button>
                            )}

                            {/* Complete */}
                            {(isStarted || isPaused) && (
                              <button
                                type="button"
                                onClick={() => handleTaskAction(task.id, 'COMPLETE')}
                                className="btn btn-sm"
                                style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '0.25rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              >
                                <Check size={11} /> Done
                              </button>
                            )}

                            {/* Rework */}
                            {(isCompleted || isStarted) && (
                              <button
                                type="button"
                                title="Rework / Quality Issue"
                                onClick={() => setReworkPromptTask(task)}
                                className="btn btn-sm"
                                style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '0.25rem 0.4rem', borderRadius: '4px' }}
                              >
                                <RotateCcw size={11} />
                              </button>
                            )}

                            {/* Reassign (Admin / Manager) */}
                            <button
                              type="button"
                              title="Reassign Task"
                              onClick={() => {
                                setReassignModal(task);
                                setReassignTarget(task.employeeId || '');
                                setReassignReason('');
                              }}
                              className="btn btn-sm"
                              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.25rem 0.4rem', borderRadius: '4px' }}
                            >
                              <UserCheck size={11} />
                            </button>

                            {/* Timeline / Audit */}
                            <button
                              type="button"
                              title="Task Timeline & Audit"
                              onClick={() => handleOpenTimeline(task)}
                              className="btn btn-sm"
                              style={{ background: '#f5f3ff', color: '#7e22ce', border: '1px solid #ddd6fe', padding: '0.25rem 0.4rem', borderRadius: '4px' }}
                            >
                              <Activity size={11} />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              title="Delete Task"
                              onClick={() => {
                                if (window.confirm(`Delete this ${task.processName} task?`)) {
                                  deleteProductionTask(task.id);
                                }
                              }}
                              className="btn btn-sm"
                              style={{ background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', padding: '0.25rem 0.4rem', borderRadius: '4px' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: TASK LIST VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Quick Filter Status Pills + Sort & Action Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            {/* Status Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginRight: '0.2rem' }}>
                Status:
              </span>
              {[
                { id: 'ALL', label: 'All Tasks', count: totalTasksCount, color: '#0f172a', bg: '#f1f5f9' },
                { id: 'In Progress', label: 'In Progress', count: inProgressCount, color: '#2563eb', bg: '#eff6ff' },
                { id: 'Paused', label: 'Paused', count: pausedCount, color: '#d97706', bg: '#fefce8' },
                { id: 'Pending', label: 'Pending', count: (productionTasks || []).filter((t) => t.status === 'Pending' || t.status === 'Assigned').length, color: '#64748b', bg: '#f8fafc' },
                { id: 'Completed', label: 'Completed', count: completedCount, color: '#16a34a', bg: '#f0fdf4' },
                { id: 'Rework', label: 'Rework', count: reworkCount, color: '#dc2626', bg: '#fef2f2' }
              ].map((pill) => {
                const isSelected = statusFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStatusFilter(pill.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: isSelected ? 800 : 600,
                      borderRadius: '20px',
                      background: isSelected ? pill.color : pill.bg,
                      color: isSelected ? '#ffffff' : pill.color,
                      border: `1px solid ${isSelected ? pill.color : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{pill.label}</span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '0.05rem 0.35rem',
                        borderRadius: '10px',
                        background: isSelected ? 'rgba(255,255,255,0.25)' : '#ffffff',
                        color: isSelected ? '#ffffff' : pill.color
                      }}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sort Controls & Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: '#64748b' }}>
                <ArrowUpDown size={14} />
                <span>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '0.35rem 0.55rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 600
                  }}
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="priority">Priority (Urgent First)</option>
                  <option value="duration_desc">Active Duration (Highest)</option>
                  <option value="order">Order Number (A-Z)</option>
                  <option value="employee">Employee Name (A-Z)</option>
                  <option value="process">Process Name (A-Z)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="btn btn-secondary btn-sm"
                title="Export current view to CSV"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  fontWeight: 700,
                  borderRadius: '6px'
                }}
              >
                <Download size={14} /> Export CSV
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="btn btn-secondary btn-sm"
                title="Print Task Work Sheet"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem',
                  padding: '0.35rem 0.75rem',
                  fontWeight: 700,
                  borderRadius: '6px'
                }}
              >
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              overflow: 'hidden'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Task / Order #
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Customer & Item
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Process
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Assigned Employee
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Machine / Station
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Qty & Unit
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Priority
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      Active Time
                    </th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <AlertCircle size={32} color="#cbd5e1" />
                          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#475569' }}>
                            No Production Tasks Found
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '380px' }}>
                            No tasks match your current filter criteria or search query. Try clearing filters or create a new task.
                          </div>
                          <button
                            type="button"
                            onClick={() => openAssignModal()}
                            className="btn btn-primary btn-sm"
                            style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                          >
                            <Plus size={15} /> Quick Assign Task
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedTasks.map((task, idx) => {
                      const isStarted = ['Started', 'In Progress', 'Resumed'].includes(task.status);
                      const isPaused = task.status === 'Paused';
                      const isCompleted = task.status === 'Completed';
                      const isRework = task.status === 'Rework';
                      const isPending = task.status === 'Pending' || task.status === 'Assigned';
                      const isQC = task.status === 'Quality Check';

                      // Status pill formatting
                      let statusBadgeBg = '#f1f5f9';
                      let statusBadgeColor = '#475569';
                      let statusBadgeBorder = '#e2e8f0';

                      if (isStarted) {
                        statusBadgeBg = '#eff6ff';
                        statusBadgeColor = '#1d4ed8';
                        statusBadgeBorder = '#bfdbfe';
                      } else if (isPaused) {
                        statusBadgeBg = '#fefce8';
                        statusBadgeColor = '#b45309';
                        statusBadgeBorder = '#fde68a';
                      } else if (isCompleted) {
                        statusBadgeBg = '#f0fdf4';
                        statusBadgeColor = '#15803d';
                        statusBadgeBorder = '#bbf7d0';
                      } else if (isRework) {
                        statusBadgeBg = '#fef2f2';
                        statusBadgeColor = '#b91c1c';
                        statusBadgeBorder = '#fecaca';
                      } else if (isQC) {
                        statusBadgeBg = '#faf5ff';
                        statusBadgeColor = '#7e22ce';
                        statusBadgeBorder = '#e9d5ff';
                      }

                      // Priority pill formatting
                      let priorityBg = '#f1f5f9';
                      let priorityColor = '#64748b';
                      let priorityBorder = '#e2e8f0';

                      if (task.priority === 'Urgent') {
                        priorityBg = '#fef2f2';
                        priorityColor = '#dc2626';
                        priorityBorder = '#fecaca';
                      } else if (task.priority === 'High') {
                        priorityBg = '#fffbeb';
                        priorityColor = '#d97706';
                        priorityBorder = '#fde68a';
                      } else if (task.priority === 'Normal') {
                        priorityBg = '#eff6ff';
                        priorityColor = '#2563eb';
                        priorityBorder = '#dbeafe';
                      }

                      return (
                        <tr
                          key={task.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fcfcfd')}
                        >
                          {/* Task / Order # */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                              #{task.orderNumber || task.orderId}
                            </div>
                            {(() => {
                              const parentOrder = (salesOrders || []).find(o => o.id === task.orderId || o.orderNumber === task.orderNumber || o.id === task.orderNumber);
                              const stageName = parentOrder?.productionStatus || 'Printing';
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate && onNavigate('production');
                                  }}
                                  style={{
                                    fontSize: '0.66rem',
                                    fontWeight: 700,
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: '4px',
                                    background: '#f8fafc',
                                    color: '#2563eb',
                                    border: '1px solid #cbd5e1',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                    marginTop: '0.2rem'
                                  }}
                                  title="View on ScreenArts Visual Production Board"
                                >
                                  <Factory size={9} /> {stageName} ↗
                                </button>
                              );
                            })()}
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                              ID: {task.id}
                            </div>
                          </td>

                          {/* Customer & Item */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#1e293b' }}>
                              {task.customerName || 'Walk-in Customer'}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#0f172a', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, background: '#e2e8f0', color: '#334155', padding: '0.05rem 0.35rem', borderRadius: '3px' }}>
                                Item #{task.itemIndex || 1}
                              </span>
                              <strong>{task.itemTitle || 'Printing Job'}</strong>
                            </div>
                            {(task.itemDimensions || task.itemMaterial) && (
                              <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.1rem' }}>
                                {task.itemDimensions ? `${task.itemDimensions} • ` : ''}{task.itemMaterial || ''}
                              </div>
                            )}
                            {task.remarks && (
                              <div style={{ fontSize: '0.7rem', color: '#854d0e', background: '#fffbeb', padding: '0.15rem 0.4rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.2rem' }}>
                                Note: {task.remarks}
                              </div>
                            )}
                          </td>

                          {/* Process & Department */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '5px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: '1px solid #bae6fd'
                              }}
                            >
                              {task.processName}
                            </span>
                          </td>

                          {/* Assigned Employee */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: '#e0e7ff',
                                  color: '#4338ca',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: 800
                                }}
                              >
                                {(task.employeeName || 'E').slice(0, 1)}
                              </div>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{task.employeeName}</span>
                            </div>
                          </td>

                          {/* Machine / Station */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {task.machineName ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', color: '#334155', fontWeight: 600 }}>
                                ⚙️ {task.machineName}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Manual / Bench</span>
                            )}
                          </td>

                          {/* Qty & Unit */}
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                            {task.quantity} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{task.unit || 'Nos'}</span>
                          </td>

                          {/* Priority */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: priorityBg,
                                color: priorityColor,
                                border: `1px solid ${priorityBorder}`
                              }}
                            >
                              {task.priority || 'Normal'}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                background: statusBadgeBg,
                                color: statusBadgeColor,
                                border: `1px solid ${statusBadgeBorder}`
                              }}
                            >
                              {isStarted && (
                                <span
                                  style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: '#2563eb',
                                    display: 'inline-block'
                                  }}
                                />
                              )}
                              {task.status}
                            </span>

                            {/* Defect / Rework Note badge if present */}
                            {(task.reworkReason || isRework) && (
                              <div
                                style={{
                                  marginTop: '0.25rem',
                                  fontSize: '0.68rem',
                                  color: '#dc2626',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <AlertCircle size={11} />
                                {task.reworkReason ? task.reworkReason : 'Defect logged'}
                                {task.reworkQty > 0 ? ` (${task.reworkQty} pcs)` : ''}
                              </div>
                            )}
                          </td>

                          {/* Active Duration */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                color: '#7e22ce',
                                background: '#faf5ff',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid #e9d5ff'
                              }}
                            >
                              <Timer size={13} /> {formatDuration(task.totalDurationMinutes)}
                            </div>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.35rem' }}>
                              {/* Start */}
                              {(isPending || isRework) && (
                                <button
                                  type="button"
                                  onClick={() => handleTaskAction(task.id, 'START')}
                                  className="btn btn-sm"
                                  title="Start Work Timer"
                                  style={{
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    borderRadius: '5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                >
                                  <Play size={11} fill="#ffffff" /> Start
                                </button>
                              )}

                              {/* Pause */}
                              {isStarted && (
                                <button
                                  type="button"
                                  onClick={() => handleTaskAction(task.id, 'PAUSE')}
                                  className="btn btn-sm"
                                  title="Pause Active Timer"
                                  style={{
                                    background: '#d97706',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    borderRadius: '5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                >
                                  <Pause size={11} /> Pause
                                </button>
                              )}

                              {/* Resume */}
                              {isPaused && (
                                <button
                                  type="button"
                                  onClick={() => handleTaskAction(task.id, 'RESUME')}
                                  className="btn btn-sm"
                                  title="Resume Active Timer"
                                  style={{
                                    background: '#2563eb',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    borderRadius: '5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                >
                                  <Play size={11} fill="#ffffff" /> Resume
                                </button>
                              )}

                              {/* Done / Complete */}
                              {(isStarted || isPaused) && (
                                <button
                                  type="button"
                                  onClick={() => handleTaskAction(task.id, 'COMPLETE')}
                                  className="btn btn-sm"
                                  title="Mark Completed"
                                  style={{
                                    background: '#059669',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    borderRadius: '5px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem'
                                  }}
                                >
                                  <Check size={11} /> Done
                                </button>
                              )}

                              {/* Rework */}
                              {(isCompleted || isStarted) && (
                                <button
                                  type="button"
                                  title="Log Defect / Send to Rework"
                                  onClick={() => setReworkPromptTask(task)}
                                  className="btn btn-sm"
                                  style={{
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fca5a5',
                                    padding: '0.25rem 0.45rem',
                                    borderRadius: '5px'
                                  }}
                                >
                                  <RotateCcw size={11} />
                                </button>
                              )}

                              {/* Reassign */}
                              <button
                                type="button"
                                title="Reassign Task"
                                onClick={() => {
                                  setReassignModal(task);
                                  setReassignTarget(task.employeeId || '');
                                  setReassignReason('');
                                }}
                                className="btn btn-sm"
                                style={{
                                  background: '#eff6ff',
                                  color: '#2563eb',
                                  border: '1px solid #bfdbfe',
                                  padding: '0.25rem 0.45rem',
                                  borderRadius: '5px'
                                }}
                              >
                                <UserCheck size={11} />
                              </button>

                              {/* Timeline / Audit */}
                              <button
                                type="button"
                                title="Task Timeline & Audit"
                                onClick={() => handleOpenTimeline(task)}
                                className="btn btn-sm"
                                style={{
                                  background: '#f5f3ff',
                                  color: '#7e22ce',
                                  border: '1px solid #ddd6fe',
                                  padding: '0.25rem 0.45rem',
                                  borderRadius: '5px'
                                }}
                              >
                                <Activity size={11} />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                title="Delete Task"
                                onClick={() => {
                                  if (window.confirm(`Delete this ${task.processName} task for #${task.orderNumber || task.orderId}?`)) {
                                    deleteProductionTask(task.id);
                                  }
                                }}
                                className="btn btn-sm"
                                style={{
                                  background: '#f8fafc',
                                  color: '#94a3b8',
                                  border: '1px solid #e2e8f0',
                                  padding: '0.25rem 0.45rem',
                                  borderRadius: '5px'
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Summary */}
            <div
              style={{
                padding: '0.75rem 1rem',
                background: '#f8fafc',
                borderTop: '1.5px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.78rem',
                color: '#64748b'
              }}
            >
              <div>
                Showing <strong>{sortedTasks.length}</strong> of <strong>{totalTasksCount}</strong> total production tasks
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div>
                  Completed: <strong style={{ color: '#16a34a' }}>{sortedTasks.filter((t) => t.status === 'Completed').length}</strong>
                </div>
                <div>
                  Active Working Duration:{' '}
                  <strong style={{ color: '#7e22ce' }}>
                    {(sortedTasks.reduce((acc, t) => acc + Number(t.totalDurationMinutes || 0), 0) / 60).toFixed(1)} hrs
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB: TAKE JOB ITEMS (AVAILABLE TO CLAIM) */}
      {/* ========================================================================= */}
      {activeTab === 'available_items' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PackageCheck size={20} color="#059669" />
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                  Open Job Orders & Line Items Available to Take
                </h4>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                One Job Order contains multiple line items. Shop floor employees can take individual items independently without locking the whole order.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', minWidth: '220px' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search order, item, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.45rem 0.6rem 0.45rem 2rem',
                    fontSize: '0.82rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    width: '100%'
                  }}
                />
              </div>

              {/* Stage Filter */}
              <select
                value={availableStageFilter}
                onChange={(e) => setAvailableStageFilter(e.target.value)}
                style={{ padding: '0.45rem 0.6rem', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="ALL">All Production Stages</option>
                <option value="Quotation">Quotation</option>
                <option value="New">New Order</option>
                <option value="Designing">Designing</option>
                <option value="Printing">Printing</option>
                <option value="Finishing">Finishing</option>
                <option value="Quality Check">Quality Check</option>
                <option value="Ready for Delivery">Ready for Delivery</option>
              </select>
            </div>
          </div>

          {/* Orders & Items List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(() => {
              const q = searchQuery.toLowerCase().trim();
              const filteredOrders = activeJobOrders.filter((ord) => {
                const matchStage = availableStageFilter === 'ALL' || ord.productionStatus === availableStageFilter;
                const matchQuery = !q ||
                  (ord.orderNumber && ord.orderNumber.toLowerCase().includes(q)) ||
                  (ord.id && ord.id.toLowerCase().includes(q)) ||
                  (ord.customerName && ord.customerName.toLowerCase().includes(q)) ||
                  (ord.items && ord.items.some(it =>
                    (it.productName && it.productName.toLowerCase().includes(q)) ||
                    (it.material && it.material.toLowerCase().includes(q)) ||
                    (it.category && it.category.toLowerCase().includes(q))
                  ));
                return matchStage && matchQuery;
              });

              if (filteredOrders.length === 0) {
                return (
                  <div style={{ background: '#ffffff', padding: '3rem 1.5rem', textAlign: 'center', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <Package size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
                    <h5 style={{ margin: 0, fontWeight: 700, color: '#334155' }}>No active job order items found matching filters</h5>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>All active orders may be completed or no items match your search query.</p>
                  </div>
                );
              }

              return filteredOrders.map((ord) => {
                const items = ord.items || [];
                const isUrgent = ord.priority === 'Urgent' || (items.some(i => i.jobPriority === 'Urgent'));

                return (
                  <div
                    key={ord.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: isUrgent ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Order Card Header */}
                    <div
                      style={{
                        padding: '0.85rem 1.25rem',
                        background: isUrgent ? '#fef2f2' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#0f172a' }}>
                          #{ord.orderNumber || ord.id}
                        </span>

                        <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                          Customer: <strong style={{ color: '#0f172a' }}>{ord.customerName}</strong>
                        </span>

                        {ord.deliveryDate && (
                          <span style={{ fontSize: '0.76rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Calendar size={13} /> Due: <strong>{ord.deliveryDate}</strong>
                          </span>
                        )}

                        {isUrgent && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 900, background: '#ef4444', color: '#ffffff', padding: '0.1rem 0.45rem', borderRadius: '4px' }}>
                            URGENT
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Visual Stage Button */}
                        <button
                          type="button"
                          onClick={() => onNavigate && onNavigate('production')}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '5px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title="Open on ScreenArts Visual Board"
                        >
                          <Factory size={12} /> Stage: {ord.productionStatus || 'In Production'} ↗
                        </button>

                        <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                          {items.length} Line {items.length === 1 ? 'Item' : 'Items'}
                        </span>
                      </div>
                    </div>

                    {/* Order Line Items */}
                    <div style={{ padding: '0.85rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {items.map((it, idx) => {
                        const itDims = it.dimensions || (it.totalSqFt ? `${it.totalSqFt} Sq.Ft (${it.width}x${it.height})` : (it.width ? `${it.width}x${it.height} ${it.unit || ''}` : ''));
                        const itTasks = (productionTasks || []).filter(t => (t.orderId === ord.id || t.orderNumber === ord.orderNumber) && (t.itemId === it.id || (idx === 0 && !t.itemId)));

                        return (
                          <div
                            key={it.id || idx}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '0.85rem 1rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.75rem'
                            }}
                          >
                            {/* Left Item Details */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '6px',
                                  background: '#e0f2fe',
                                  color: '#0284c7',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.75rem',
                                  flexShrink: 0
                                }}
                              >
                                #{idx + 1}
                              </div>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                                    {it.productName || it.customTitle || 'Printing Item'}
                                  </strong>
                                  {it.category && (
                                    <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#e2e8f0', padding: '0.05rem 0.35rem', borderRadius: '3px' }}>
                                      {it.category}
                                    </span>
                                  )}
                                </div>

                                <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '0.2rem' }}>
                                  {itDims ? `${itDims} • ` : ''}Required Qty: <strong style={{ color: '#0f172a' }}>{it.qty || 1} {it.unit || 'Nos'}</strong>
                                  {it.material ? ` • Substrate: ${it.material}` : ''}
                                </div>

                                {/* Item Active Processes Strip */}
                                <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                                    Processes on this Item:
                                  </span>
                                  {itTasks.length > 0 ? (
                                    itTasks.map(t => (
                                      <span
                                        key={t.id}
                                        style={{
                                          fontSize: '0.68rem',
                                          fontWeight: 700,
                                          padding: '0.12rem 0.45rem',
                                          borderRadius: '4px',
                                          background: t.status === 'Completed' ? '#dcfce7' : ['Started', 'In Progress', 'Resumed'].includes(t.status) ? '#dbeafe' : '#fef3c7',
                                          color: t.status === 'Completed' ? '#166534' : ['Started', 'In Progress', 'Resumed'].includes(t.status) ? '#1e40af' : '#92400e',
                                          border: `1px solid ${t.status === 'Completed' ? '#86efac' : ['Started', 'In Progress', 'Resumed'].includes(t.status) ? '#bfdbfe' : '#fde68a'}`
                                        }}
                                      >
                                        ● {t.employeeName}: {t.processName} ({t.status})
                                      </span>
                                    ))
                                  ) : (
                                    <span style={{ fontSize: '0.7rem', color: '#059669', fontStyle: 'italic', fontWeight: 600 }}>
                                      ⚪ No processes taken yet — Ready to take
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Action: Take This Item Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => openAssignModal(null, ord, it, true)}
                                className="btn btn-sm"
                                style={{
                                  background: '#059669',
                                  color: '#ffffff',
                                  fontWeight: 800,
                                  fontSize: '0.78rem',
                                  padding: '0.45rem 0.85rem',
                                  borderRadius: '6px',
                                  border: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                                  cursor: 'pointer'
                                }}
                                title={`Take / Claim process on Item #${idx + 1} (${it.productName})`}
                              >
                                <Zap size={13} fill="#ffffff" /> Take This Item Process
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: EMPLOYEE WORKLOAD & CAPACITY */}
      {/* ========================================================================= */}
      {activeTab === 'workload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                Employee Real-Time Floor Status & Workload
              </h4>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Track who is actively working on what order and process, who is paused, and who is available for assignment.
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {(employees || []).map((emp) => {
              const empTasks = (productionTasks || []).filter((t) => t.employeeId === emp.id);
              const activeTask = empTasks.find((t) => ['Started', 'In Progress', 'Resumed'].includes(t.status));
              const pausedTask = empTasks.find((t) => t.status === 'Paused');
              const completedTasks = empTasks.filter((t) => t.status === 'Completed');
              const totalActiveMins = empTasks.reduce((sum, t) => sum + Number(t.totalDurationMinutes || 0), 0);

              let statusState = 'Free / Available';
              let statusColor = '#64748b';
              let statusBg = '#f1f5f9';
              let currentActionDesc = 'No active task currently running';

              if (activeTask) {
                statusState = 'Active Working';
                statusColor = '#16a34a';
                statusBg = '#dcfce7';
                currentActionDesc = `Working on ${activeTask.processName} (#${activeTask.orderNumber || activeTask.orderId})`;
              } else if (pausedTask) {
                statusState = 'Task Paused';
                statusColor = '#d97706';
                statusBg = '#fef3c7';
                currentActionDesc = `Paused on ${pausedTask.processName} (#${pausedTask.orderNumber || pausedTask.orderId})`;
              }

              return (
                <div
                  key={emp.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem'
                  }}
                >
                  {/* Top Employee Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          fontWeight: 900
                        }}
                      >
                        {emp.name.slice(0, 1)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{emp.name}</div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {emp.designation || 'Operator'} • {emp.department || 'Production'}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '20px',
                        background: statusBg,
                        color: statusColor,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />
                      {statusState}
                    </span>
                  </div>

                  {/* Current Active Status Box */}
                  <div
                    style={{
                      background: activeTask ? '#f0fdf4' : pausedTask ? '#fffbeb' : '#f8fafc',
                      border: `1px solid ${activeTask ? '#bbf7d0' : pausedTask ? '#fde68a' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '0.65rem 0.8rem',
                      fontSize: '0.78rem'
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                      CURRENT SHOP FLOOR OPERATION
                    </span>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
                      {currentActionDesc}
                    </div>
                    {activeTask && (
                      <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}>
                        <Timer size={13} /> Active Duration: {formatDuration(activeTask.totalDurationMinutes)}
                      </div>
                    )}
                  </div>

                  {/* Employee Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                    <div style={{ background: '#f8fafc', padding: '0.45rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>ASSIGNED</span>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{empTasks.length}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '0.45rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>COMPLETED</span>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#16a34a' }}>{completedTasks.length}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '0.45rem', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700 }}>WORK HOURS</span>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#7e22ce' }}>{formatDuration(totalActiveMins)}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.3rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => openAssignModal(emp, null, null, true)}
                      className="btn btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.74rem',
                        padding: '0.35rem 0.75rem',
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title={`Pick / Take an available job order item for ${emp.name}`}
                    >
                      <PackageCheck size={13} /> Take Item for {emp.name.split(' ')[0]}
                    </button>

                    <button
                      type="button"
                      onClick={() => openAssignModal(emp)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', padding: '0.35rem 0.75rem' }}
                    >
                      <Plus size={13} /> Quick Assign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PROCESS MASTER DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'processes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                Standard Process Master Directory
              </h4>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Preconfigured printing & finishing operations available for employee assignment across all job cards.
              </span>
            </div>
            <button
              type="button"
              onClick={openAddProcessModal}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
            >
              <Plus size={15} /> Add New Process
            </button>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>PROCESS NAME</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>DEPARTMENT / CATEGORY</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>DESCRIPTION & SPEC</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>DEFAULT COST RATE</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800 }}>STATUS</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 800, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {(productionProcesses || []).map((proc) => (
                  <tr key={proc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: proc.isActive !== false ? '#16a34a' : '#94a3b8'
                          }}
                        />
                        {proc.name}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          color: '#475569'
                        }}
                      >
                        {proc.department || 'Production'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                      {proc.description || 'Standard print shop process'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                      {proc.defaultRate ? `${formatINR(proc.defaultRate)} / ${proc.unit || 'Unit'}` : 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          background: proc.isActive !== false ? '#dcfce7' : '#f1f5f9',
                          color: proc.isActive !== false ? '#15803d' : '#64748b'
                        }}
                      >
                        {proc.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => openEditProcessModal(proc)}
                          className="btn btn-sm"
                          style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.3rem 0.5rem', borderRadius: '4px' }}
                        >
                          <Edit size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete process ${proc.name}?`)) {
                              deleteProductionProcess(proc.id);
                            }
                          }}
                          className="btn btn-sm"
                          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.3rem 0.5rem', borderRadius: '4px' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>)}

      {/* ========================================================================= */}
      {/* TAKE / ASSIGN JOB ORDER ITEM MODAL */}
      {/* ========================================================================= */}
      {isAssignModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAssignModalOpen(false)} style={{ zIndex: 99999 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', width: '95vw', padding: '1.5rem', maxHeight: '92vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PackageCheck size={22} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                    Take / Assign Job Order Item
                  </h4>
                  <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Select order and choose specific line item. Workers take individual items, not the entire order wholesale.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => handleAssignSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Select Job Order */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Step 1: Select Job Order <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="form-control"
                  value={taskForm.orderId}
                  onChange={(e) => handleOrderChange(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Job Order --</option>
                  {(salesOrders || []).map((ord) => (
                    <option key={ord.id} value={ord.id}>
                      #{ord.orderNumber || ord.id} — {ord.customerName} ({ord.items ? ord.items.length : 0} items) • {ord.productionStatus || 'In Production'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Interactive Line Item Picker */}
              {(() => {
                const currentOrder = (salesOrders || []).find((o) => o.id === taskForm.orderId);
                const items = currentOrder?.items || [];

                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem', margin: 0 }}>
                        <PackageCheck size={16} /> Step 2: Select Specific Line Item to Take ({items.length} items in Order) <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Each item can be taken independently
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#94a3b8' }}>
                        Please select an order above to view its items
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                        {items.map((it, idx) => {
                          const isSelected = (taskForm.itemId === it.id) || (!taskForm.itemId && idx === 0);
                          const itDims = it.dimensions || (it.totalSqFt ? `${it.totalSqFt} Sq.Ft (${it.width}x${it.height})` : (it.width ? `${it.width}x${it.height} ${it.unit || ''}` : ''));
                          const itTasks = (productionTasks || []).filter((t) => (t.orderId === currentOrder?.id || t.orderNumber === currentOrder?.orderNumber) && (t.itemId === it.id || (idx === 0 && !t.itemId)));

                          return (
                            <div
                              key={it.id || idx}
                              onClick={() => handleItemChange(it.id)}
                              style={{
                                padding: '0.7rem 0.85rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: isSelected ? '#ecfdf5' : '#ffffff',
                                border: isSelected ? '2px solid #059669' : '1px solid #e2e8f0',
                                boxShadow: isSelected ? '0 2px 8px rgba(5, 150, 105, 0.15)' : 'none',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '0.75rem',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                                <input
                                  type="radio"
                                  name="modalItemRadio"
                                  checked={isSelected}
                                  onChange={() => handleItemChange(it.id)}
                                  style={{ marginTop: '0.25rem', accentColor: '#059669', cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 900, background: isSelected ? '#059669' : '#64748b', color: '#ffffff', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>
                                      Item #{idx + 1}
                                    </span>
                                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                                      {it.productName || it.customTitle || 'Printing Item'}
                                    </strong>
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem' }}>
                                    {itDims ? `${itDims} • ` : ''}Qty: <strong style={{ color: '#0f172a' }}>{it.qty || 1} {it.unit || 'Nos'}</strong>
                                    {it.material ? ` • Substrate: ${it.material}` : ''}
                                  </div>

                                  {/* Tasks already associated with this item */}
                                  <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                    {itTasks.length > 0 ? (
                                      itTasks.map((t) => (
                                        <span
                                          key={t.id}
                                          style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 700,
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '4px',
                                            background: t.status === 'Completed' ? '#dcfce7' : ['Started', 'In Progress', 'Resumed'].includes(t.status) ? '#dbeafe' : '#fef3c7',
                                            color: t.status === 'Completed' ? '#166534' : ['Started', 'In Progress', 'Resumed'].includes(t.status) ? '#1e40af' : '#92400e',
                                            border: '1px solid rgba(0,0,0,0.08)'
                                          }}
                                        >
                                          ● {t.employeeName}: {t.processName} ({t.status})
                                        </span>
                                      ))
                                    ) : (
                                      <span style={{ fontSize: '0.68rem', color: '#059669', fontStyle: 'italic', fontWeight: 600 }}>
                                        ✓ Ready to Take (No active tasks yet)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {isSelected && (
                                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', background: '#ffffff', padding: '0.2rem 0.5rem', borderRadius: '20px', border: '1px solid #86efac', whiteSpace: 'nowrap' }}>
                                  ✓ Selected Item
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Employee & Process in 2 Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Assign / Claim Employee <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={taskForm.employeeId}
                    onChange={(e) => setTaskForm({ ...taskForm, employeeId: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Choose Employee --</option>
                    {(employees || []).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || 'Production'} • {emp.designation || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Process / Operation to Perform <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={taskForm.processName}
                    onChange={(e) => setTaskForm({ ...taskForm, processName: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {(productionProcesses || []).map((proc) => (
                      <option key={proc.id} value={proc.name}>
                        {proc.name} {proc.department ? `(${proc.department})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity, Unit & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={taskForm.quantity}
                    onChange={(e) => setTaskForm({ ...taskForm, quantity: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Unit
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={taskForm.unit}
                    onChange={(e) => setTaskForm({ ...taskForm, unit: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Priority
                  </label>
                  <select
                    className="form-control"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Machine & Instructions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Machine / Workstation (Optional)
                  </label>
                  <select
                    className="form-control"
                    value={taskForm.machineId}
                    onChange={(e) => setTaskForm({ ...taskForm, machineId: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- No Machine / Manual Bench --</option>
                    {(machines || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Task Remarks / Notes
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 5mm margin, check color registration"
                    value={taskForm.remarks}
                    onChange={(e) => setTaskForm({ ...taskForm, remarks: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              {/* Modal Buttons: Queue or Start Immediately */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={(e) => handleAssignSubmit(e, 'Pending')}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 700, padding: '0.5rem 1rem' }}
                    title="Assign in Pending Queue"
                  >
                    📥 Take & Add to Queue
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleAssignSubmit(e, 'In Progress')}
                    className="btn btn-sm"
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 800,
                      padding: '0.5rem 1.25rem',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
                      cursor: 'pointer'
                    }}
                    title="Assign and start working immediately"
                  >
                    <Timer size={15} /> ⚡ Take & Start Work Now
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REWORK MODAL PROMPT */}
      {/* ========================================================================= */}
      {reworkPromptTask && (
        <div className="modal-overlay" onClick={() => setReworkPromptTask(null)} style={{ zIndex: 99999 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '95vw', padding: '1.5rem', borderTop: '4px solid #ef4444' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #fecaca', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', fontWeight: 800 }}>
                <RotateCcw size={20} /> Quality Defect Rework: {reworkPromptTask.processName}
              </div>
              <button
                type="button"
                onClick={() => setReworkPromptTask(null)}
                style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReworkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.3rem' }}>
                  Defective / Rejected Quantity
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder={reworkPromptTask.quantity || 1}
                  value={reworkQtyInput}
                  onChange={(e) => setReworkQtyInput(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #fca5a5' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.3rem' }}>
                  Reason for Rejection / Rework Instructions
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g., Uneven laser engraving depth, improper die cut margin, color smudging"
                  value={reworkReason}
                  onChange={(e) => setReworkReason(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #fca5a5' }}
                />
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
                  style={{ background: '#dc2626', color: '#ffffff', fontWeight: 700, padding: '0.5rem 1.25rem' }}
                >
                  Confirm Rework
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PROCESS MASTER ADD/EDIT MODAL */}
      {/* ========================================================================= */}
      {isProcessModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProcessModalOpen(false)} style={{ zIndex: 99999 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '95vw', padding: '1.5rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} color="#2563eb" />
                <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                  {editingProcess ? 'Edit Production Process' : 'Add New Production Process'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsProcessModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Process Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Seal Making, Scoring, Eyeletting"
                  value={processForm.name}
                  onChange={(e) => setProcessForm({ ...processForm, name: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Department
                  </label>
                  <select
                    className="form-control"
                    value={processForm.department}
                    onChange={(e) => setProcessForm({ ...processForm, department: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Pre-Press">Pre-Press</option>
                    <option value="Printing">Printing</option>
                    <option value="Finishing">Finishing</option>
                    <option value="Fabrication">Fabrication</option>
                    <option value="Post-Press">Post-Press</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Default Rate (INR)
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={processForm.defaultRate}
                    onChange={(e) => setProcessForm({ ...processForm, defaultRate: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Description / Instructions
                </label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Standard instructions for this process"
                  value={processForm.description}
                  onChange={(e) => setProcessForm({ ...processForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="procActive"
                  checked={processForm.isActive}
                  onChange={(e) => setProcessForm({ ...processForm, isActive: e.target.checked })}
                />
                <label htmlFor="procActive" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Active Process (Visible in assignment lists)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsProcessModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  style={{ fontWeight: 700, padding: '0.5rem 1.25rem' }}
                >
                  {editingProcess ? 'Update Process' : 'Save Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REASSIGN TASK MODAL (ADMIN / MANAGER) */}
      {/* ========================================================================= */}
      {reassignModal && (
        <div className="modal-overlay" onClick={() => setReassignModal(null)} style={{ zIndex: 99999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '92vw', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Reassign Task
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Transfer ownership with audit logging</span>
                </div>
              </div>
              <button type="button" onClick={() => setReassignModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div><strong>Task:</strong> #{reassignModal.orderNumber || reassignModal.orderId} — {reassignModal.processName}</div>
              <div><strong>Item:</strong> {reassignModal.itemTitle || 'Production Item'} ({reassignModal.quantity} {reassignModal.unit || 'Nos'})</div>
              <div><strong>Current Assignee:</strong> <span style={{ color: '#d97706', fontWeight: 700 }}>{reassignModal.employeeName || 'Unassigned'}</span></div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Select New Assignee *
              </label>
              <select
                value={reassignTarget}
                onChange={e => setReassignTarget(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              >
                <option value="">-- Choose Employee / Worker --</option>
                {(employees || []).filter(e => e.isActive !== false).map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.department || 'Production'} • {e.role || 'Staff'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Reason for Reassignment (Logged to audit trail)
              </label>
              <input
                type="text"
                placeholder="e.g. Workload balancing, shift transition, urgent re-prioritization"
                value={reassignReason}
                onChange={e => setReassignReason(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setReassignModal(null)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                type="button"
                disabled={!reassignTarget}
                onClick={handleReassignSubmit}
                className="btn btn-primary btn-sm"
                style={{ fontWeight: 700, background: '#2563eb', padding: '0.5rem 1.25rem' }}
              >
                Confirm Reassign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TASK ACTIVITY & AUDIT TIMELINE MODAL */}
      {/* ========================================================================= */}
      {timelineModal && (
        <div className="modal-overlay" onClick={() => setTimelineModal(null)} style={{ zIndex: 99999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '92vw', padding: '1.5rem', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    Task Timeline & Audit Log
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Complete lifecycle tracking and event logs</span>
                </div>
              </div>
              <button type="button" onClick={() => setTimelineModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div><strong>Task:</strong> #{timelineModal.task?.orderNumber || timelineModal.task?.orderId} — {timelineModal.task?.processName}</div>
              <div><strong>Item:</strong> {timelineModal.task?.itemTitle || 'Production Item'} • Qty: {timelineModal.task?.quantity}</div>
              <div><strong>Assigned To:</strong> {timelineModal.task?.employeeName || 'Unassigned'} • Status: <span style={{ fontWeight: 800, color: '#2563eb' }}>{timelineModal.task?.status}</span></div>
            </div>

            {timelineModal.loading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Loading activity logs...</div>
              </div>
            ) : (!timelineModal.logs || timelineModal.logs.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <Clock size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#475569' }}>No Activity Recorded Yet</div>
                <div style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>Lifecycle timestamps will appear as actions are dispatched.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid #e2e8f0', marginLeft: '0.75rem' }}>
                {timelineModal.logs.map((log, idx) => {
                  const isComplete = log.action === 'COMPLETED';
                  const isStart = log.action === 'STARTED' || log.action === 'RESUMED' || log.action === 'ASSIGNED' || log.action === 'CLAIMED';
                  const isPause = log.action === 'PAUSED';
                  const isRework = log.action === 'REWORK';
                  const isReassign = log.action === 'REASSIGNED';
                  const dotColor = isComplete ? '#16a34a' : isRework ? '#dc2626' : isPause ? '#d97706' : isReassign ? '#7e22ce' : '#2563eb';

                  return (
                    <div key={idx} style={{ position: 'relative', fontSize: '0.82rem' }}>
                      <div style={{
                        position: 'absolute', left: '-1.95rem', top: '3px', width: '12px', height: '12px',
                        borderRadius: '50%', background: dotColor,
                        border: '2px solid #fff', boxShadow: `0 0 0 2px ${dotColor}`
                      }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                        <span style={{ fontWeight: 800, color: dotColor, fontSize: '0.85rem' }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                        </span>
                      </div>
                      {(log.logged_by || log.employee_name || log.employeeName) && (
                        <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '0.1rem' }}>
                          By: <strong>{log.logged_by || log.employee_name || log.employeeName}</strong>
                        </div>
                      )}
                      {log.notes && (
                        <div style={{ fontSize: '0.76rem', color: '#334155', fontStyle: 'italic', marginTop: '0.15rem', background: '#f1f5f9', padding: '0.3rem 0.5rem', borderRadius: '4px' }}>
                          "{log.notes}"
                        </div>
                      )}
                      {(log.duration_minutes > 0 || log.durationMinutes > 0) && (
                        <div style={{ fontSize: '0.72rem', color: '#7e22ce', fontWeight: 700, marginTop: '0.15rem' }}>
                          Duration: {log.duration_minutes || log.durationMinutes} mins
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setTimelineModal(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
