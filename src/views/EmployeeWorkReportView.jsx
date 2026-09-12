import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { formatINR, exportToCSV, printReportPDF } from '../utils/reportEngine';
import {
  FileText,
  UserCheck,
  Calendar,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  Search,
  Timer,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Layers,
  Factory,
  ChevronRight,
  TrendingUp,
  Award,
  RefreshCw,
  X
} from 'lucide-react';

export const EmployeeWorkReportView = () => {
  const {
    productionTasks,
    productionProcesses,
    employees,
    companyProfile,
    salesOrders
  } = useERP();

  // Filters state
  const [datePreset, setDatePreset] = useState('ALL'); // 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'ALL' | 'CUSTOM'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedProcess, setSelectedProcess] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [orderQuery, setOrderQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');

  // Selected Employee for Timeline Drilldown
  const [timelineEmployeeId, setTimelineEmployeeId] = useState('');

  // Helper to format minutes
  const formatDuration = (mins) => {
    const total = Number(mins || 0);
    if (total <= 0) return '0m';
    const h = Math.floor(total / 60);
    const m = Math.round(total % 60);
    if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''}`;
    return `${m}m`;
  };

  // Resolve preset dates
  const effectiveDateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    switch (datePreset) {
      case 'TODAY':
        return { start: todayStr, end: todayStr };
      case 'YESTERDAY': {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        const s = d.toISOString().split('T')[0];
        return { start: s, end: s };
      }
      case 'THIS_WEEK': {
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff)).toISOString().split('T')[0];
        return { start: monday, end: todayStr };
      }
      case 'THIS_MONTH': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        return { start, end: todayStr };
      }
      case 'CUSTOM':
        return { start: startDate, end: endDate };
      case 'ALL':
      default:
        return { start: '', end: '' };
    }
  }, [datePreset, startDate, endDate]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return (productionTasks || []).filter((task) => {
      // Date filter
      const taskDate = task.startTime ? task.startTime.split('T')[0] : (task.createdAt ? task.createdAt.split('T')[0] : '');
      if (effectiveDateRange.start && taskDate && taskDate < effectiveDateRange.start) return false;
      if (effectiveDateRange.end && taskDate && taskDate > effectiveDateRange.end) return false;

      // Employee
      if (selectedEmployeeId !== 'ALL' && task.employeeId !== selectedEmployeeId) return false;

      // Process
      if (selectedProcess !== 'ALL' && task.processName !== selectedProcess) return false;

      // Status
      if (selectedStatus !== 'ALL' && task.status !== selectedStatus) return false;

      // Priority
      if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) return false;

      // Order query
      if (orderQuery) {
        const oq = orderQuery.toLowerCase().trim();
        const ordMatch =
          (task.orderNumber && task.orderNumber.toLowerCase().includes(oq)) ||
          (task.orderId && task.orderId.toLowerCase().includes(oq));
        if (!ordMatch) return false;
      }

      // Customer query
      if (customerQuery) {
        const cq = customerQuery.toLowerCase().trim();
        if (!task.customerName || !task.customerName.toLowerCase().includes(cq)) return false;
      }

      // Department filter
      if (selectedDepartment !== 'ALL') {
        const emp = (employees || []).find((e) => e.id === task.employeeId);
        if (emp && emp.department !== selectedDepartment) return false;
      }

      return true;
    });
  }, [
    productionTasks,
    effectiveDateRange,
    selectedEmployeeId,
    selectedProcess,
    selectedStatus,
    selectedPriority,
    orderQuery,
    customerQuery,
    selectedDepartment,
    employees
  ]);

  // Top 8 KPI Metrics
  const kpiMetrics = useMemo(() => {
    const totalTasks = filteredTasks.length;
    const distinctOrders = new Set(filteredTasks.map((t) => t.orderId || t.orderNumber)).size;
    const totalQty = filteredTasks.reduce((sum, t) => sum + Number(t.quantity || 0), 0);
    const completedTasks = filteredTasks.filter((t) => t.status === 'Completed').length;
    const inProgressTasks = filteredTasks.filter((t) => ['Started', 'In Progress', 'Resumed'].includes(t.status)).length;
    const pausedTasks = filteredTasks.filter((t) => t.status === 'Paused').length;
    const reworkTasks = filteredTasks.filter((t) => t.status === 'Rework').length;
    const totalMins = filteredTasks.reduce((sum, t) => sum + Number(t.totalDurationMinutes || 0), 0);
    const totalHours = (totalMins / 60).toFixed(1);

    return {
      totalTasks,
      distinctOrders,
      totalQty,
      completedTasks,
      inProgressTasks,
      pausedTasks,
      reworkTasks,
      totalHours
    };
  }, [filteredTasks]);

  // Process-Wise Employee Breakdown Matrix Data
  const processMatrix = useMemo(() => {
    const matrix = {};
    const processSet = new Set();
    const empSet = new Set();

    filteredTasks.forEach((t) => {
      const empName = t.employeeName || 'Unknown';
      const proc = t.processName || 'General';
      processSet.add(proc);
      empSet.add(empName);

      if (!matrix[empName]) matrix[empName] = {};
      if (!matrix[empName][proc]) {
        matrix[empName][proc] = { minutes: 0, count: 0 };
      }
      matrix[empName][proc].minutes += Number(t.totalDurationMinutes || 0);
      matrix[empName][proc].count += 1;
    });

    return {
      matrix,
      processes: Array.from(processSet).sort(),
      employeesList: Array.from(empSet).sort()
    };
  }, [filteredTasks]);

  // Timeline Drilldown Data for Selected Employee
  const activeTimelineEmp = timelineEmployeeId || (employees && employees[0]?.id) || '';
  const timelineTasks = useMemo(() => {
    if (!activeTimelineEmp) return [];
    return (productionTasks || [])
      .filter((t) => t.employeeId === activeTimelineEmp)
      .sort((a, b) => {
        const timeA = a.startTime || a.createdAt || '';
        const timeB = b.startTime || b.createdAt || '';
        return timeA.localeCompare(timeB);
      });
  }, [productionTasks, activeTimelineEmp]);

  const timelineEmpObj = (employees || []).find((e) => e.id === activeTimelineEmp) || {};

  // Export handlers
  const handleExportCSV = () => {
    const headers = [
      'Task ID',
      'Date',
      'Employee ID',
      'Employee Name',
      'Order Number',
      'Customer',
      'Item Description',
      'Process',
      'Quantity',
      'Unit',
      'Machine',
      'Start Time',
      'End Time',
      'Active Duration (Mins)',
      'Status',
      'Priority',
      'Remarks'
    ];

    const rows = filteredTasks.map((t) => [
      t.id,
      t.startTime ? t.startTime.slice(0, 10) : '',
      t.employeeId,
      t.employeeName,
      t.orderNumber || t.orderId,
      t.customerName,
      t.itemTitle,
      t.processName,
      t.quantity,
      t.unit || 'Nos',
      t.machineName || 'Manual',
      t.startTime ? t.startTime.slice(11, 19) : '',
      t.endTime ? t.endTime.slice(11, 19) : '',
      t.totalDurationMinutes || 0,
      t.status,
      t.priority || 'Normal',
      `"${(t.remarks || '').replace(/"/g, '""')}"`
    ]);

    exportToCSV('Employee_Daily_Work_Report', headers, rows);
  };

  const handleExportExcel = () => {
    let tableHtml = `
      <table border="1">
        <thead>
          <tr style="background-color: #2563eb; color: #ffffff;">
            <th>Task ID</th>
            <th>Date</th>
            <th>Employee</th>
            <th>Order #</th>
            <th>Customer</th>
            <th>Item</th>
            <th>Process</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Machine</th>
            <th>Start Time</th>
            <th>End Time</th>
            <th>Active Duration (Mins)</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
    `;

    filteredTasks.forEach((t) => {
      tableHtml += `
        <tr>
          <td>${t.id}</td>
          <td>${t.startTime ? t.startTime.slice(0, 10) : ''}</td>
          <td>${t.employeeName} (${t.employeeId})</td>
          <td>#${t.orderNumber || t.orderId}</td>
          <td>${t.customerName || ''}</td>
          <td>${t.itemTitle || ''}</td>
          <td>${t.processName}</td>
          <td>${t.quantity}</td>
          <td>${t.unit || 'Nos'}</td>
          <td>${t.machineName || 'Manual'}</td>
          <td>${t.startTime ? t.startTime.slice(11, 16) : ''}</td>
          <td>${t.endTime ? t.endTime.slice(11, 16) : ''}</td>
          <td>${t.totalDurationMinutes || 0}</td>
          <td>${t.status}</td>
          <td>${t.priority || 'Normal'}</td>
          <td>${t.remarks || ''}</td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table>`;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Employee_Work_Report_${new Date().toISOString().slice(0, 10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    const cols = [
      { key: 'employeeName', label: 'Employee', align: 'left' },
      { key: 'orderNumber', label: 'Order #', align: 'left', accessor: (r) => `#${r.orderNumber || r.orderId}` },
      { key: 'customerName', label: 'Customer', align: 'left' },
      { key: 'processName', label: 'Process', align: 'left' },
      { key: 'quantity', label: 'Qty', align: 'center', accessor: (r) => `${r.quantity} ${r.unit || 'Nos'}` },
      { key: 'machineName', label: 'Machine', align: 'left', accessor: (r) => r.machineName || 'Manual' },
      { key: 'time', label: 'Time Window', align: 'left', accessor: (r) => `${r.startTime ? r.startTime.slice(11, 16) : ''} - ${r.endTime ? r.endTime.slice(11, 16) : 'Active'}` },
      { key: 'totalDurationMinutes', label: 'Active Time', align: 'right', accessor: (r) => formatDuration(r.totalDurationMinutes) },
      { key: 'status', label: 'Status', align: 'center' }
    ];

    printReportPDF(
      'Employee Daily Production & Work Log Report',
      filteredTasks,
      cols,
      companyProfile,
      `Date Filter: ${datePreset} • Total Logged Time: ${kpiMetrics.totalHours} hrs • Total Tasks: ${kpiMetrics.totalTasks}`
    );
  };

  const resetAllFilters = () => {
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setSelectedEmployeeId('ALL');
    setSelectedDepartment('ALL');
    setSelectedProcess('ALL');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
    setOrderQuery('');
    setCustomerQuery('');
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', minHeight: '88vh' }}>
      {/* Header & Export Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
            <FileText size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              Employee Daily Work Report & Production Logs
            </h2>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Comprehensive auditable record of all multi-task floor operations, employee active duration, process allocation & quality rework.
            </span>
          </div>
        </div>

        {/* Action Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handlePrintReport}
            className="btn btn-sm btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <Printer size={15} /> Print / PDF
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="btn btn-sm btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <FileSpreadsheet size={15} color="#16a34a" /> Export Excel
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn btn-sm btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* TOP 8 KPI SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.75rem' }}>
        <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL TASKS</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '0.15rem' }}>{kpiMetrics.totalTasks}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>DISTINCT ORDERS</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb', marginTop: '0.15rem' }}>{kpiMetrics.distinctOrders}</div>
        </div>

        <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>TOTAL QUANTITY</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '0.15rem' }}>{kpiMetrics.totalQty}</div>
        </div>

        <div style={{ background: '#f0fdf4', padding: '0.85rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>COMPLETED</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '0.15rem' }}>{kpiMetrics.completedTasks}</div>
        </div>

        <div style={{ background: '#eff6ff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
          <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase' }}>IN PROGRESS</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#2563eb', marginTop: '0.15rem' }}>{kpiMetrics.inProgressTasks}</div>
        </div>

        <div style={{ background: '#fefce8', padding: '0.85rem', borderRadius: '10px', border: '1px solid #fef08a' }}>
          <span style={{ fontSize: '0.7rem', color: '#ca8a04', fontWeight: 700, textTransform: 'uppercase' }}>PAUSED</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ca8a04', marginTop: '0.15rem' }}>{kpiMetrics.pausedTasks}</div>
        </div>

        <div style={{ background: '#fef2f2', padding: '0.85rem', borderRadius: '10px', border: '1px solid #fecaca' }}>
          <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase' }}>REWORK</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '0.15rem' }}>{kpiMetrics.reworkTasks}</div>
        </div>

        <div style={{ background: '#faf5ff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
          <span style={{ fontSize: '0.7rem', color: '#9333ea', fontWeight: 700, textTransform: 'uppercase' }}>ACTIVE WORK HOURS</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7e22ce', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Timer size={18} /> {kpiMetrics.totalHours}h
          </div>
        </div>
      </div>

      {/* FILTER BAR PANEL */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}
      >
        {/* Date Preset Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Calendar size={14} /> Date Presets:
          </span>
          {[
            { id: 'TODAY', label: 'Today' },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'ALL', label: 'All Time' },
            { id: 'CUSTOM', label: 'Custom' }
          ].map((dp) => (
            <button
              key={dp.id}
              type="button"
              onClick={() => setDatePreset(dp.id)}
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: datePreset === dp.id ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                background: datePreset === dp.id ? '#eff6ff' : '#f8fafc',
                color: datePreset === dp.id ? '#2563eb' : '#475569',
                cursor: 'pointer'
              }}
            >
              {dp.label}
            </button>
          ))}

          {datePreset === 'CUSTOM' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={resetAllFilters}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <RefreshCw size={12} /> Reset Filters
          </button>
        </div>

        {/* Detailed Filter Dropdowns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
          {/* Employee */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
              EMPLOYEE
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Employees</option>
              {(employees || []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.designation || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
              DEPARTMENT
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Departments</option>
              <option value="Production">Production</option>
              <option value="Printing">Printing</option>
              <option value="Finishing">Finishing</option>
              <option value="Designing">Designing</option>
              <option value="Fabrication">Fabrication</option>
            </select>
          </div>

          {/* Process */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
              PROCESS / OPERATION
            </label>
            <select
              value={selectedProcess}
              onChange={(e) => setSelectedProcess(e.target.value)}
              style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Processes</option>
              {(productionProcesses || []).map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
              STATUS
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Paused">Paused</option>
              <option value="Quality Check">Quality Check</option>
              <option value="Completed">Completed</option>
              <option value="Rework">Rework</option>
            </select>
          </div>

          {/* Order Search */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
              ORDER # SEARCH
            </label>
            <input
              type="text"
              placeholder="e.g. 10, ORD-1001"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          {/* Customer Search */}
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.2rem' }}>
              CUSTOMER SEARCH
            </label>
            <input
              type="text"
              placeholder="e.g. Acme, Modern"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
      </div>

      {/* PRIMARY WORK LOG TABLE */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
            DAILY WORK LOG RECORDS ({filteredTasks.length})
          </span>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Pure active duration computed interval-by-interval across all pauses.
          </span>
        </div>

        {filteredTasks.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={36} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 700, color: '#475569' }}>No Work Logs Match Current Filters</div>
            <p style={{ fontSize: '0.8rem', margin: '0.25rem 0 0' }}>Try changing or resetting your date range and employee filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>DATE & TIME</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>EMPLOYEE</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>ORDER #</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>CUSTOMER</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>ITEM / PRODUCT</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>PROCESS</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>QTY</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>MACHINE</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>TIME WINDOW</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>ACTIVE DURATION</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>STATUS</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>REMARKS / DEFECTS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t) => {
                  const isCompleted = t.status === 'Completed';
                  const isStarted = ['Started', 'In Progress', 'Resumed'].includes(t.status);
                  const isPaused = t.status === 'Paused';
                  const isRework = t.status === 'Rework';

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
                      {/* Date */}
                      <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap', color: '#475569' }}>
                        {t.startTime ? t.startTime.slice(0, 10) : (t.createdAt ? t.createdAt.slice(0, 10) : 'Today')}
                      </td>

                      {/* Employee */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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
                              fontWeight: 800,
                              fontSize: '0.7rem'
                            }}
                          >
                            {(t.employeeName || 'E').slice(0, 1)}
                          </div>
                          <div>
                            <strong style={{ color: '#0f172a' }}>{t.employeeName}</strong>
                            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{t.employeeId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Order # */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{ fontWeight: 800, color: '#2563eb' }}>
                          #{t.orderNumber || t.orderId}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: '0.65rem 0.85rem', color: '#334155' }}>
                        {t.customerName || 'Walk-in'}
                      </td>

                      {/* Item */}
                      <td style={{ padding: '0.65rem 0.85rem', color: '#0f172a', fontWeight: 600 }}>
                        {t.itemTitle || 'Print Item'}
                      </td>

                      {/* Process */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '0.12rem 0.45rem',
                            borderRadius: '4px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd'
                          }}
                        >
                          {t.processName}
                        </span>
                      </td>

                      {/* Qty */}
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 700 }}>
                        {t.quantity} {t.unit || 'Nos'}
                      </td>

                      {/* Machine */}
                      <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', fontSize: '0.75rem' }}>
                        {t.machineName ? `⚙️ ${t.machineName}` : 'Manual'}
                      </td>

                      {/* Time Window */}
                      <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap', fontSize: '0.75rem', color: '#475569' }}>
                        {t.startTime ? t.startTime.slice(11, 16) : '—'} → {t.endTime ? t.endTime.slice(11, 16) : 'Ongoing'}
                      </td>

                      {/* Active Duration */}
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#7e22ce' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Timer size={13} /> {formatDuration(t.totalDurationMinutes)}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            padding: '0.12rem 0.45rem',
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
                      <td style={{ padding: '0.65rem 0.85rem', color: '#64748b', maxWidth: '240px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.remarks || '—'}
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

      {/* PROCESS-WISE EMPLOYEE BREAKDOWN MATRIX */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
        <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
            Process-Wise Employee Hours & Task Matrix
          </h4>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Cross-tabulation showing how each worker's active production time is distributed across various printing & finishing operations.
          </span>
        </div>

        {processMatrix.employeesList.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8' }}>No matrix data available</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800, position: 'sticky', left: 0, background: '#f1f5f9' }}>EMPLOYEE</th>
                  {processMatrix.processes.map((proc) => (
                    <th key={proc} style={{ padding: '0.65rem 0.85rem', fontWeight: 800, textAlign: 'center' }}>
                      {proc}
                    </th>
                  ))}
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 800, textAlign: 'right', background: '#f1f5f9' }}>TOTAL ACTIVE TIME</th>
                </tr>
              </thead>
              <tbody>
                {processMatrix.employeesList.map((emp) => {
                  let empTotalMins = 0;
                  processMatrix.processes.forEach((proc) => {
                    const cell = processMatrix.matrix[emp]?.[proc];
                    if (cell) empTotalMins += cell.minutes;
                  });

                  return (
                    <tr key={emp} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#0f172a', position: 'sticky', left: 0, background: '#ffffff' }}>
                        {emp}
                      </td>
                      {processMatrix.processes.map((proc) => {
                        const cell = processMatrix.matrix[emp]?.[proc];
                        return (
                          <td key={proc} style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                            {cell ? (
                              <div>
                                <span style={{ fontWeight: 800, color: '#2563eb' }}>{formatDuration(cell.minutes)}</span>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>({cell.count} tasks)</div>
                              </div>
                            ) : (
                              <span style={{ color: '#cbd5e1' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 900, color: '#7e22ce', textAlign: 'right' }}>
                        {formatDuration(empTotalMins)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EMPLOYEE CHRONOLOGICAL TIMELINE DRILLDOWN */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
        <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
              Employee Chronological Daily Timeline Drilldown
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Inspect a worker's continuous shift history (e.g. Afsal working on Seal Making, then Sticker Cutting, then Scoring).
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Select Worker:</span>
            <select
              value={activeTimelineEmp}
              onChange={(e) => setTimelineEmployeeId(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              {(employees || []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.designation || 'Staff'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {timelineTasks.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
              No recorded timeline entries for this employee yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative', paddingLeft: '1.5rem' }}>
              {/* Vertical line */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  bottom: '10px',
                  left: '18px',
                  width: '2px',
                  background: '#cbd5e1'
                }}
              />

              {timelineTasks.map((t, idx) => {
                const startTimeStr = t.startTime ? t.startTime.slice(11, 16) : 'Start';
                const endTimeStr = t.endTime ? t.endTime.slice(11, 16) : 'Active';

                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', position: 'relative' }}>
                    {/* Node Circle */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-1.5rem',
                        top: '4px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: t.status === 'Completed' ? '#16a34a' : t.status === 'Paused' ? '#d97706' : '#2563eb',
                        border: '2px solid #ffffff',
                        boxShadow: '0 0 0 2px #cbd5e1'
                      }}
                    />

                    {/* Timeline Card */}
                    <div
                      style={{
                        flex: 1,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a' }}>
                            {startTimeStr} – {endTimeStr}
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.45rem',
                              borderRadius: '4px',
                              background: '#e0f2fe',
                              color: '#0369a1'
                            }}
                          >
                            {t.processName}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 800 }}>
                            Order #{t.orderNumber || t.orderId}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                          Customer: <strong>{t.customerName}</strong> • Item: {t.itemTitle} ({t.quantity} {t.unit || 'Nos'})
                          {t.machineName && ` • Machine: ${t.machineName}`}
                        </div>
                        {t.remarks && (
                          <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', marginTop: '0.15rem' }}>
                            "{t.remarks}"
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 900, color: '#7e22ce', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Timer size={14} /> {formatDuration(t.totalDurationMinutes)}
                        </div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '12px',
                            background: t.status === 'Completed' ? '#dcfce7' : t.status === 'Paused' ? '#fef3c7' : '#eff6ff',
                            color: t.status === 'Completed' ? '#15803d' : t.status === 'Paused' ? '#b45309' : '#1d4ed8'
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
