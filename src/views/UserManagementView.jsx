import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { api } from '../utils/api';
import {
  Shield, UserCheck, Users, Lock, Unlock, Key, Check, X,
  AlertTriangle, Search, Filter, Plus, Edit3, Save, RefreshCw,
  FileText, CheckSquare, Square, Sliders, Eye, Clock, Activity,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp, ChevronRight
} from 'lucide-react';

export const UserManagementView = () => {
  const { session } = useERP();
  const currentUser = session?.user;
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'SUPER ADMIN';

  // State
  const [loading, setLoading] = useState(true);
  const [matrix, setMatrix] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // UI Navigation Tabs
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'matrix' | 'roles' | 'audit'

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'Disabled' | 'Locked' | 'No User'
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Modals & Drawers
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isManageDrawerOpen, setIsManageDrawerOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [isUnsavedWarningOpen, setIsUnsavedWarningOpen] = useState(false);

  // Manage Form State for Selected Employee
  const [editRole, setEditRole] = useState('');
  const [editStatus, setEditStatus] = useState('Active');
  const [editDesignation, setEditDesignation] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [selectedProcesses, setSelectedProcesses] = useState(new Set());
  const [originalPermissions, setOriginalPermissions] = useState(new Set());
  const [originalProcesses, setOriginalProcesses] = useState(new Set());
  const [originalRole, setOriginalRole] = useState('');
  const [originalStatus, setOriginalStatus] = useState('Active');
  const [changeReason, setChangeReason] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    modules: true,
    production: true,
    sales: false,
    accounting: false,
    hr: false,
    inventory: false,
    processes: true,
    sensitive: false
  });

  // Create User Form State
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    username: '',
    email: '',
    password: '',
    role: 'Printing Operator',
    designation: '',
    status: 'Active',
    allowedProcesses: []
  });

  // Toast / Notification
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (msg, type = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Load Matrix Data from Database
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getControlMatrix();
      if (res.success) {
        setMatrix(res.matrix || []);
        setRoles(res.roles || []);
        setPermissions(res.permissions || []);
        setRolePermissions(res.rolePermissions || []);
      }
    } catch (err) {
      console.error('Failed to load control matrix:', err);
      showFeedback(err.message || 'Error loading employee control data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    try {
      const res = await api.getPermissionAuditLogs();
      if (res.success) {
        setAuditLogs(res.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  useEffect(() => {
    loadData();
    loadAuditLogs();
  }, []);

  // Standard Process List
  const ALL_PROCESSES = [
    'Flex Printing', 'Digital Printing', 'Eco-Solvent Printing', 'UV Flatbed Printing',
    'Machine Operation', 'Designing', 'Lamination', 'Plotter Cutting',
    'Acrylic Laser Cutting', 'CNC Router Engraving', 'Letter Bending',
    'Channel Letter Fabrication', 'LED Module Wiring', 'Welding & Iron Framing',
    'Eyeletting', 'Thermal Lamination', 'Foam Sheet Pasting', 'Die Cutting',
    'Scoring & Creasing', 'Hardcover Book Binding', 'Quality Inspection',
    'Packing & Wrapping', 'Dispatch', 'Site Installation'
  ];

  // Group Permissions by Category / Module
  const groupedPermissions = useMemo(() => {
    const groups = {
      modules: [],
      production: [],
      sales: [],
      billing: [],
      accounting: [],
      hr: [],
      inventory: [],
      sensitive: []
    };

    permissions.forEach(p => {
      if (p.is_sensitive) {
        groups.sensitive.push(p);
      }
      if (p.id.startsWith('module.')) {
        groups.modules.push(p);
      } else if (p.module === 'Production' || p.category?.includes('Production')) {
        groups.production.push(p);
      } else if (p.module === 'Sales' || p.category?.includes('Sales')) {
        groups.sales.push(p);
      } else if (p.module === 'Billing' || p.category?.includes('Billing')) {
        groups.billing.push(p);
      } else if (p.module === 'Accounting' || p.category?.includes('Accounting')) {
        groups.accounting.push(p);
      } else if (p.module === 'HR' || p.category?.includes('HR') || p.category?.includes('Payroll')) {
        groups.hr.push(p);
      } else if (p.module === 'Inventory' || p.category?.includes('Inventory')) {
        groups.inventory.push(p);
      }
    });

    return groups;
  }, [permissions]);

  // Check if form has unsaved modifications
  const hasUnsavedChanges = useMemo(() => {
    if (!selectedEmployee) return false;
    if (editRole !== originalRole) return true;
    if (editStatus !== originalStatus) return true;

    if (selectedPermissions.size !== originalPermissions.size) return true;
    for (let p of selectedPermissions) {
      if (!originalPermissions.has(p)) return true;
    }

    if (selectedProcesses.size !== originalProcesses.size) return true;
    for (let pr of selectedProcesses) {
      if (!originalProcesses.has(pr)) return true;
    }

    return false;
  }, [selectedEmployee, editRole, editStatus, selectedPermissions, selectedProcesses, originalPermissions, originalProcesses, originalRole, originalStatus]);

  // Handle Employee Selection for Management
  const handleOpenManage = (emp) => {
    if (hasUnsavedChanges) {
      setIsUnsavedWarningOpen(true);
      return;
    }
    openManageDrawer(emp);
  };

  const openManageDrawer = (emp) => {
    setSelectedEmployee(emp);
    setEditRole(emp.userRole || emp.role || 'Printing Operator');
    setEditStatus(emp.accountStatus === 'Not Created' ? 'Active' : emp.accountStatus);
    setEditDesignation(emp.designation || '');
    setOriginalRole(emp.userRole || emp.role || 'Printing Operator');
    setOriginalStatus(emp.accountStatus === 'Not Created' ? 'Active' : emp.accountStatus);
    setChangeReason('');

    const permsSet = new Set(emp.effectivePermissions || []);
    const procsSet = new Set(emp.effectiveProcesses || []);
    setSelectedPermissions(permsSet);
    setSelectedProcesses(procsSet);
    setOriginalPermissions(new Set(permsSet));
    setOriginalProcesses(new Set(procsSet));

    setIsManageDrawerOpen(true);
  };

  // Toggle Single Permission Checkbox
  const togglePermission = (permId) => {
    const next = new Set(selectedPermissions);
    if (next.has(permId)) {
      next.delete(permId);
      // If unchecking a module, also uncheck related granular perms if appropriate
      if (permId.startsWith('module.')) {
        const modKey = permId.replace('module.', '');
        permissions.forEach(p => {
          if (p.id.startsWith(`${modKey}.`)) {
            next.delete(p.id);
          }
        });
      }
    } else {
      next.add(permId);
      // If checking a granular perm, auto-enable its parent module
      const parts = permId.split('.');
      if (parts.length === 2 && !permId.startsWith('module.')) {
        const modId = `module.${parts[0]}`;
        if (permissions.some(p => p.id === modId)) {
          next.add(modId);
        }
      }
    }
    setSelectedPermissions(next);
  };

  // Toggle Single Process Checkbox
  const toggleProcess = (procName) => {
    const next = new Set(selectedProcesses);
    if (next.has(procName)) {
      next.delete(procName);
    } else {
      next.add(procName);
    }
    setSelectedProcesses(next);
  };

  // Apply Role Template Defaults
  const applyRoleTemplate = (roleName) => {
    setEditRole(roleName);
    const targetRole = roles.find(r => r.name === roleName || r.id === roleName);
    if (targetRole) {
      const templatePerms = rolePermissions
        .filter(rp => rp.role_id === targetRole.id)
        .map(rp => rp.permission_id);
      
      const newPerms = new Set(templatePerms);
      setSelectedPermissions(newPerms);

      // Default processes based on role
      const newProcs = new Set();
      if (roleName.includes('Print') || roleName === 'Printing Operator') {
        newProcs.add('Flex Printing');
        newProcs.add('Digital Printing');
        newProcs.add('Eco-Solvent Printing');
        newProcs.add('UV Flatbed Printing');
        newProcs.add('Machine Operation');
      } else if (roleName.includes('Finish') || roleName === 'Finishing Staff') {
        newProcs.add('Lamination');
        newProcs.add('Scoring & Creasing');
        newProcs.add('Hardcover Book Binding');
        newProcs.add('Eyeletting');
        newProcs.add('Foam Sheet Pasting');
      } else if (roleName.includes('Design')) {
        newProcs.add('Designing');
      } else if (roleName === 'Admin' || roleName === 'Management') {
        ALL_PROCESSES.forEach(p => newProcs.add(p));
      }
      setSelectedProcesses(newProcs);
    }
  };

  // Quick Login Access Toggle (ON / OFF)
  const handleToggleLoginAccess = async (emp, targetStatus) => {
    if (!emp.userId) {
      showFeedback('No user account created yet. Click "Create User" first.', 'warning');
      return;
    }

    try {
      const res = await api.updateUserStatus(
        emp.userId,
        targetStatus,
        `Login Access toggled to ${targetStatus} by ${currentUser?.name || 'Admin'}`
      );
      if (res.success) {
        showFeedback(`Login access for ${emp.name} is now ${targetStatus === 'Active' ? 'ON' : 'OFF'}.`);
        loadData();
        loadAuditLogs();
        if (selectedEmployee?.id === emp.id) {
          setEditStatus(targetStatus);
          setOriginalStatus(targetStatus);
        }
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to update login access', 'error');
    }
  };

  // Calculate Differences for Save Confirmation Dialog (Requirement 30)
  const permissionDiffs = useMemo(() => {
    const diffs = [];
    if (!selectedEmployee) return diffs;

    // Status change
    if (editStatus !== originalStatus) {
      diffs.push({
        label: 'Account Status',
        oldVal: originalStatus,
        newVal: editStatus,
        type: 'status'
      });
    }

    // Role change
    if (editRole !== originalRole) {
      diffs.push({
        label: 'Role Template',
        oldVal: originalRole,
        newVal: editRole,
        type: 'role'
      });
    }

    // Permissions diffs
    permissions.forEach(p => {
      const had = originalPermissions.has(p.id);
      const has = selectedPermissions.has(p.id);
      if (had !== has) {
        diffs.push({
          label: `${p.name} (${p.code || p.id})`,
          oldVal: had ? 'ON' : 'OFF',
          newVal: has ? 'ON' : 'OFF',
          isSensitive: p.is_sensitive,
          type: 'perm'
        });
      }
    });

    // Processes diffs
    ALL_PROCESSES.forEach(pr => {
      const had = originalProcesses.has(pr);
      const has = selectedProcesses.has(pr);
      if (had !== has) {
        diffs.push({
          label: `Process: ${pr}`,
          oldVal: had ? 'ALLOWED' : 'REVOKED',
          newVal: has ? 'ALLOWED' : 'REVOKED',
          type: 'process'
        });
      }
    });

    return diffs;
  }, [selectedEmployee, editRole, editStatus, originalRole, originalStatus, originalPermissions, selectedPermissions, originalProcesses, selectedProcesses, permissions]);

  // Execute Save Permissions
  const handleConfirmSave = async () => {
    if (!selectedEmployee || !selectedEmployee.userId) return;

    try {
      setLoading(true);

      // 1. Status update if changed
      if (editStatus !== originalStatus) {
        await api.updateUserStatus(
          selectedEmployee.userId,
          editStatus,
          changeReason || 'Account status updated'
        );
      }

      // 2. Overrides calculation
      // Find active role permissions
      const targetRole = roles.find(r => r.name === editRole || r.id === editRole);
      const rolePerms = new Set(
        targetRole
          ? rolePermissions.filter(rp => rp.role_id === targetRole.id).map(rp => rp.permission_id)
          : []
      );

      const overrides = [];
      permissions.forEach(p => {
        const inRole = rolePerms.has(p.id);
        const inSelected = selectedPermissions.has(p.id);
        if (inSelected && !inRole) {
          overrides.push({ permissionId: p.id, isGranted: true });
        } else if (!inSelected && inRole) {
          overrides.push({ permissionId: p.id, isGranted: false });
        }
      });

      // 3. Update permissions API
      const res = await api.updateUserPermissions(selectedEmployee.userId, {
        role: editRole,
        roleId: targetRole?.id,
        overrides,
        allowedProcesses: Array.from(selectedProcesses),
        reason: changeReason || 'Permission updates applied'
      });

      if (res.success) {
        showFeedback(`Permissions for ${selectedEmployee.name} updated successfully!`);
        setIsConfirmSaveOpen(false);
        setIsManageDrawerOpen(false);
        loadData();
        loadAuditLogs();
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to save permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Create User Account
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.employeeId || !createForm.username || !createForm.password) {
      showFeedback('Please fill in all required fields.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await api.createUser(createForm);
      if (res.success) {
        showFeedback(res.message || 'User account created successfully!');
        setIsCreateModalOpen(false);
        setCreateForm({
          employeeId: '',
          username: '',
          email: '',
          password: '',
          role: 'Printing Operator',
          designation: '',
          status: 'Active',
          allowedProcesses: []
        });
        loadData();
        loadAuditLogs();
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to create user account', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return matrix.filter(emp => {
      const matchSearch =
        searchTerm === '' ||
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchTerm.toLowerCase());

      let matchStatus = true;
      if (statusFilter === 'Active') matchStatus = emp.accountStatus === 'Active';
      else if (statusFilter === 'Disabled') matchStatus = emp.accountStatus === 'Disabled';
      else if (statusFilter === 'Locked') matchStatus = emp.accountStatus === 'Locked';
      else if (statusFilter === 'No User') matchStatus = !emp.hasUserAccount || emp.accountStatus === 'Not Created';

      const matchDept = deptFilter === 'ALL' || emp.department === deptFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [matrix, searchTerm, statusFilter, deptFilter]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set();
    matrix.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set).sort();
  }, [matrix]);

  // Unlinked employees for Create User modal
  const unlinkedEmployees = useMemo(() => {
    return matrix.filter(e => !e.hasUserAccount || e.accountStatus === 'Not Created');
  }, [matrix]);

  return (
    <div className="view-container" style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Toast Feedback Notification */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            padding: '1rem 1.5rem',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            backgroundColor: feedback.type === 'error' ? '#fef2f2' : feedback.type === 'warning' ? '#fffbeb' : '#ecfdf5',
            color: feedback.type === 'error' ? '#991b1b' : feedback.type === 'warning' ? '#92400e' : '#065f46',
            border: `1px solid ${feedback.type === 'error' ? '#fecaca' : feedback.type === 'warning' ? '#fde68a' : '#a7f3d0'}`
          }}
        >
          {feedback.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.6rem', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <Shield size={26} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Employee User Control
              </h1>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                Create employee login accounts and control module permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Bar Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('employees')}
            className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <Users size={16} /> Employee Roster
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`btn ${activeTab === 'matrix' ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <Sliders size={16} /> Permission Matrix
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`btn ${activeTab === 'roles' ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <Key size={16} /> Roles & Templates
          </button>
          <button
            onClick={() => { setActiveTab('audit'); loadAuditLogs(); }}
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <Activity size={16} /> Audit Trail
          </button>

          {isAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-success"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', marginLeft: '0.5rem', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}
            >
              <Plus size={16} /> Create User Account
            </button>
          )}

          <button
            onClick={() => { loadData(); loadAuditLogs(); }}
            className="btn btn-light"
            title="Refresh"
            style={{ padding: '0.55rem' }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* TAB 1: EMPLOYEE ROSTER & USER CONTROLS */}
      {activeTab === 'employees' && (
        <>
          {/* Search & Filter Bar */}
          <div
            style={{
              background: '#ffffff',
              padding: '1rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.25rem',
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <Search size={17} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search employee / code / department / username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.85rem 0.55rem 2.4rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* Account Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={15} color="#64748b" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background: '#fff'
                }}
              >
                <option value="ALL">All Statuses ({matrix.length})</option>
                <option value="Active">Active ({matrix.filter(m => m.accountStatus === 'Active').length})</option>
                <option value="Disabled">Disabled ({matrix.filter(m => m.accountStatus === 'Disabled').length})</option>
                <option value="Locked">Locked ({matrix.filter(m => m.accountStatus === 'Locked').length})</option>
                <option value="No User">No User Account ({matrix.filter(m => !m.hasUserAccount || m.accountStatus === 'Not Created').length})</option>
              </select>
            </div>

            {/* Department Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Department:</span>
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  background: '#fff'
                }}
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Employee Master Table */}
          <div className="card" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div className="table-responsive">
              <table className="erp-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Employee</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Code</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Department</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Designation</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>User Account</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Login Access</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Access Summary</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Last Login</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                        No employees found matching the current search and filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelf = currentUser?.userId === emp.userId;
                      const hasAccount = emp.hasUserAccount && emp.accountStatus !== 'Not Created';
                      const isActive = emp.accountStatus === 'Active';
                      const isDisabled = emp.accountStatus === 'Disabled';
                      const isLocked = emp.accountStatus === 'Locked';

                      return (
                        <tr
                          key={emp.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            transition: 'background 0.15s',
                            backgroundColor: isDisabled ? '#fdf2f2' : '#ffffff'
                          }}
                        >
                          {/* Employee Name & Avatar */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: emp.userRole === 'Admin' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : '#e2e8f0',
                                  color: emp.userRole === 'Admin' ? '#fff' : '#334155',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                  flexShrink: 0
                                }}
                              >
                                {emp.name?.charAt(0)?.toUpperCase() || 'E'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                                  {emp.name}
                                  {isSelf && (
                                    <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                      You
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  {emp.email || emp.mobile || '—'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Code */}
                          <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
                            {emp.employeeCode || emp.id}
                          </td>

                          {/* Department */}
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>
                            <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                              {emp.department || 'General'}
                            </span>
                          </td>

                          {/* Designation */}
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: '#475569' }}>
                            {emp.designation || emp.role || 'Staff'}
                          </td>

                          {/* User Account */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {hasAccount ? (
                              <div>
                                <div style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <Key size={13} /> {emp.username}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  Role: <strong style={{ color: '#0f172a' }}>{emp.userRole || 'Staff'}</strong>
                                </div>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                No Account
                              </span>
                            )}
                          </td>

                          {/* Login Access Toggle (ON / OFF) */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {hasAccount ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                  disabled={!isAdmin}
                                  onClick={() => handleToggleLoginAccess(emp, isActive ? 'Disabled' : 'Active')}
                                  style={{
                                    padding: '0.35rem 0.65rem',
                                    borderRadius: '20px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: isAdmin ? 'pointer' : 'default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    transition: 'all 0.2s',
                                    backgroundColor: isActive ? '#ecfdf5' : '#fef2f2',
                                    color: isActive ? '#065f46' : '#991b1b',
                                    border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`
                                  }}
                                  title={isAdmin ? `Click to switch login access to ${isActive ? 'OFF' : 'ON'}` : 'Requires Administrator permissions'}
                                >
                                  {isActive ? (
                                    <>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                                      <span>ON</span>
                                    </>
                                  ) : (
                                    <>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                                      <span>OFF</span>
                                    </>
                                  )}
                                </button>
                                {isLocked && (
                                  <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#b91c1c', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                    LOCKED
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Not Created
                              </span>
                            )}
                          </td>

                          {/* Access Summary */}
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: emp.userRole === 'Admin' ? '#eff6ff' : emp.hasUserAccount ? '#f0fdf4' : '#f8fafc',
                                color: emp.userRole === 'Admin' ? '#1d4ed8' : emp.hasUserAccount ? '#15803d' : '#94a3b8',
                                border: `1px solid ${emp.userRole === 'Admin' ? '#bfdbfe' : emp.hasUserAccount ? '#bbf7d0' : '#e2e8f0'}`
                              }}
                            >
                              <Shield size={12} />
                              {emp.accessSummary}
                            </span>
                          </td>

                          {/* Last Login */}
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#64748b' }}>
                            {emp.lastLogin ? (
                              <div>
                                <div style={{ color: '#0f172a', fontWeight: 600 }}>
                                  {new Date(emp.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </div>
                                <div style={{ fontSize: '0.7rem' }}>
                                  {new Date(emp.lastLogin).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Never</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            {hasAccount ? (
                              <button
                                onClick={() => handleOpenManage(emp)}
                                className="btn btn-sm btn-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                              >
                                <Sliders size={14} /> Manage
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setCreateForm(prev => ({
                                    ...prev,
                                    employeeId: emp.id,
                                    username: (emp.code || emp.name).toLowerCase().replace(/[^a-z0-9]/g, ''),
                                    email: emp.email || `${emp.id.toLowerCase()}@screenarts.in`,
                                    role: emp.department === 'Printing' ? 'Printing Operator' : emp.department === 'Design' ? 'Designer' : emp.department === 'Accounts' ? 'Accountant' : 'Sales Executive',
                                    designation: emp.designation || emp.role || ''
                                  }));
                                  setIsCreateModalOpen(true);
                                }}
                                className="btn btn-sm btn-outline-primary"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                              >
                                <Plus size={14} /> Create User
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: FULL PERMISSION MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Global Role Permission Matrix</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Default permissions bundled with each system role template. Overrides take precedence for specific employees.
              </p>
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <table className="erp-table" style={{ width: '100%', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2 }}>
                  <th style={{ padding: '0.75rem', width: '220px' }}>Permission</th>
                  <th style={{ padding: '0.75rem', width: '90px' }}>Module</th>
                  {roles.map(r => (
                    <th key={r.id} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem' }}>
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: p.is_sensitive ? '#b91c1c' : '#1e293b' }}>
                      {p.is_sensitive && <AlertTriangle size={13} style={{ display: 'inline', marginRight: '0.3rem', color: '#dc2626' }} />}
                      {p.name}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', color: '#64748b' }}>{p.module}</td>
                    {roles.map(r => {
                      const isAssigned = r.name === 'Admin' || rolePermissions.some(rp => rp.role_id === r.id && rp.permission_id === p.id);
                      return (
                        <td key={r.id} style={{ textAlign: 'center', padding: '0.6rem' }}>
                          {isAssigned ? (
                            <Check size={16} color="#059669" style={{ display: 'inline' }} />
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ROLES & TEMPLATES */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {roles.map(r => {
            const bundledPerms = rolePermissions.filter(rp => rp.role_id === r.id);
            const userCount = matrix.filter(m => m.userRole === r.name).length;
            return (
              <div key={r.id} className="card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{r.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{r.description || 'System Role Template'}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#eff6ff', color: '#2563eb' }}>
                    {userCount} User{userCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
                  <strong>{r.name === 'Admin' ? 'All (81)' : bundledPerms.length}</strong> permissions active by default.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxHeight: '150px', overflowY: 'auto' }}>
                  {r.name === 'Admin' ? (
                    <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 700 }}>
                      Full System Bypass (ALL / *)
                    </span>
                  ) : (
                    bundledPerms.slice(0, 10).map(bp => {
                      const pObj = permissions.find(p => p.id === bp.permission_id);
                      return (
                        <span key={bp.id} style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#334155', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                          {pObj?.name || bp.permission_id}
                        </span>
                      );
                    })
                  )}
                  {bundledPerms.length > 10 && (
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', padding: '0.15rem 0.4rem' }}>
                      +{bundledPerms.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>Permission & Account Audit Trail</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Every permission grant, revocation, and status change is immutably logged with actor identity.
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="erp-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '0.75rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                  <th style={{ padding: '0.75rem' }}>Changed By</th>
                  <th style={{ padding: '0.75rem' }}>Target Employee</th>
                  <th style={{ padding: '0.75rem' }}>Details / Change</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      No permission audit events recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => {
                    let detailsObj = {};
                    try {
                      detailsObj = typeof log.details === 'string' ? JSON.parse(log.details) : log.details || {};
                    } catch (e) {}

                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#64748b', fontSize: '0.8rem' }}>
                          {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#f1f5f9', color: '#1e293b' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>
                          {log.employee_name || log.user_id}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: '#2563eb' }}>
                          {detailsObj.targetEmployeeName || log.record_number || detailsObj.targetEmployeeId || '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.8rem' }}>
                          {detailsObj.permission ? (
                            <span>
                              <strong>{detailsObj.permission}</strong>:{' '}
                              <span style={{ color: detailsObj.old_value === 'ON' ? '#059669' : '#dc2626' }}>{detailsObj.old_value}</span>
                              {' → '}
                              <span style={{ color: detailsObj.new_value === 'ON' ? '#059669' : '#dc2626', fontWeight: 700 }}>{detailsObj.new_value}</span>
                            </span>
                          ) : detailsObj.oldStatus && detailsObj.newStatus ? (
                            <span>
                              Status changed from <strong>{detailsObj.oldStatus}</strong> to <strong>{detailsObj.newStatus}</strong>
                            </span>
                          ) : (
                            <span>{log.details}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAWER / MODAL: EMPLOYEE USER CONTROL & GRANULAR PERMISSIONS */}
      {/* ========================================================================= */}
      {isManageDrawerOpen && selectedEmployee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              height: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '-10px 0 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s ease-out'
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: selectedEmployee.userRole === 'Admin' ? 'linear-gradient(135deg, #2563eb, #1e40af)' : '#3b82f6',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem'
                  }}
                >
                  {selectedEmployee.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    {selectedEmployee.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{selectedEmployee.employeeCode}</span>
                    <span>•</span>
                    <span>{selectedEmployee.department}</span>
                    <span>•</span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{selectedEmployee.designation}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (hasUnsavedChanges) {
                    setIsUnsavedWarningOpen(true);
                  } else {
                    setIsManageDrawerOpen(false);
                  }
                }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.4rem', color: '#64748b' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Drawer Body - Scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {/* 1. LOGIN ACCOUNT & ACCESS STATUS */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Key size={18} color="#2563eb" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Login Account & Status</h4>
                  </div>
                  {/* ON / OFF Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: editStatus === 'Active' ? '#059669' : '#dc2626' }}>
                      Login Access: [{editStatus === 'Active' ? 'ON' : 'OFF'}]
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditStatus(editStatus === 'Active' ? 'Disabled' : 'Active')}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        border: `1px solid ${editStatus === 'Active' ? '#059669' : '#dc2626'}`,
                        backgroundColor: editStatus === 'Active' ? '#ecfdf5' : '#fef2f2',
                        color: editStatus === 'Active' ? '#065f46' : '#991b1b'
                      }}
                    >
                      Toggle to {editStatus === 'Active' ? 'OFF' : 'ON'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Username:</span>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedEmployee.username}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Email:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEmployee.userEmail || selectedEmployee.email || '—'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Last Login:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {selectedEmployee.lastLogin ? new Date(selectedEmployee.lastLogin).toLocaleString('en-IN') : 'Never'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Login Count:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEmployee.loginCount || 0} times</div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Account Created:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {selectedEmployee.userCreatedAt ? new Date(selectedEmployee.userCreatedAt).toLocaleDateString('en-IN') : '—'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Created By:</span>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedEmployee.createdByName || 'System'}</div>
                  </div>
                </div>

                {/* Status Selector */}
                <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Explicit Status:</span>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    <option value="Active">Active (Permits login)</option>
                    <option value="Disabled">Disabled (Blocks login immediately)</option>
                    <option value="Locked">Locked (Temporarily locked)</option>
                    <option value="Pending">Pending (Awaiting initial activation)</option>
                  </select>
                </div>
              </div>

              {/* 2. ROLE TEMPLATE SELECTION */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Shield size={16} color="#2563eb" /> Current Assigned Role Template
                  </label>
                  <button
                    type="button"
                    onClick={() => applyRoleTemplate(editRole)}
                    className="btn btn-sm btn-outline-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    Reset to Role Defaults
                  </button>
                </div>
                <select
                  value={editRole}
                  onChange={(e) => applyRoleTemplate(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.name}>{r.name} — {r.description}</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Selecting a role template automatically ticks its standard permissions. You can customize individual checkboxes below.
                </div>
              </div>

              {/* 3. MODULE ACCESS (TICK / UNTICK CHECKBOXES - Requirement 5 & 6) */}
              <div style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedSections(p => ({ ...p, modules: !p.modules }))}
                  style={{ padding: '0.85rem 1rem', background: '#f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckSquare size={16} color="#2563eb" /> MODULE ACCESS CONTROL
                  </div>
                  {expandedSections.modules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.modules && (
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem' }}>
                    {groupedPermissions.modules.map(p => {
                      const isChecked = selectedPermissions.has(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 0.65rem',
                            borderRadius: '6px',
                            background: isChecked ? '#eff6ff' : '#f8fafc',
                            border: `1px solid ${isChecked ? '#bfdbfe' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: isChecked ? 700 : 500,
                            color: isChecked ? '#1d4ed8' : '#475569'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            style={{ accentColor: '#2563eb', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. PRODUCTION PROCESS ACCESS (Requirement 12) */}
              <div style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedSections(p => ({ ...p, processes: !p.processes }))}
                  style={{ padding: '0.85rem 1rem', background: '#f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sliders size={16} color="#059669" /> PRODUCTION PROCESS ACCESS ({selectedProcesses.size} Active)
                  </div>
                  {expandedSections.processes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.processes && (
                  <div style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                      Determines which tasks appear in this employee's <strong>AVAILABLE WORK</strong> pool and can be taken via <strong>TAKE WORK</strong>.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                      {ALL_PROCESSES.map(proc => {
                        const isAllowed = selectedProcesses.has(proc);
                        return (
                          <label
                            key={proc}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              background: isAllowed ? '#f0fdf4' : '#ffffff',
                              border: `1px solid ${isAllowed ? '#bbf7d0' : '#e2e8f0'}`,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: isAllowed ? 700 : 500,
                              color: isAllowed ? '#15803d' : '#475569'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isAllowed}
                              onChange={() => toggleProcess(proc)}
                              style={{ accentColor: '#10b981', width: '15px', height: '15px' }}
                            />
                            <span>{proc}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5. GRANULAR PERMISSIONS: PRODUCTION FLOOR & MANAGEMENT (Requirement 7) */}
              <div style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedSections(p => ({ ...p, production: !p.production }))}
                  style={{ padding: '0.85rem 1rem', background: '#f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sliders size={16} color="#4f46e5" /> PRODUCTION DETAILED ACTIONS
                  </div>
                  {expandedSections.production ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.production && (
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                    {groupedPermissions.production.map(p => {
                      const isChecked = selectedPermissions.has(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '6px',
                            background: isChecked ? '#eef2ff' : '#fff',
                            border: `1px solid ${isChecked ? '#c7d2fe' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: isChecked ? 600 : 400,
                            color: isChecked ? '#3730a3' : '#475569'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            style={{ accentColor: '#4f46e5', width: '15px', height: '15px' }}
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 6. SALES & BILLING PERMISSIONS (Requirement 8) */}
              <div style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedSections(p => ({ ...p, sales: !p.sales }))}
                  style={{ padding: '0.85rem 1rem', background: '#f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sliders size={16} color="#0284c7" /> SALES & BILLING CASHIERING ACTIONS
                  </div>
                  {expandedSections.sales ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.sales && (
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                    {[...groupedPermissions.sales, ...groupedPermissions.billing].map(p => {
                      const isChecked = selectedPermissions.has(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '6px',
                            background: isChecked ? '#f0f9ff' : '#fff',
                            border: `1px solid ${isChecked ? '#bae6fd' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: isChecked ? 600 : 400,
                            color: isChecked ? '#0369a1' : '#475569'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            style={{ accentColor: '#0284c7', width: '15px', height: '15px' }}
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 7. ACCOUNTING PERMISSIONS (Requirement 9) */}
              <div style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedSections(p => ({ ...p, accounting: !p.accounting }))}
                  style={{ padding: '0.85rem 1rem', background: '#f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sliders size={16} color="#d97706" /> ACCOUNTING & LEDGER DETAILED ACTIONS
                  </div>
                  {expandedSections.accounting ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.accounting && (
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                    {groupedPermissions.accounting.map(p => {
                      const isChecked = selectedPermissions.has(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '6px',
                            background: isChecked ? '#fffbeb' : '#fff',
                            border: `1px solid ${isChecked ? '#fde68a' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: isChecked ? 600 : 400,
                            color: isChecked ? '#b45309' : '#475569'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            style={{ accentColor: '#d97706', width: '15px', height: '15px' }}
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 8. HR & PAYROLL PERMISSIONS (Requirement 10) */}
              <div style={{ marginBottom: '1.5rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedSections(p => ({ ...p, hr: !p.hr }))}
                  style={{ padding: '0.85rem 1rem', background: '#f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sliders size={16} color="#e11d48" /> HR & ATTENDANCE ACTIONS
                  </div>
                  {expandedSections.hr ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.hr && (
                  <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                    {groupedPermissions.hr.map(p => {
                      const isChecked = selectedPermissions.has(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '6px',
                            background: isChecked ? '#fff1f2' : '#fff',
                            border: `1px solid ${isChecked ? '#fecdd3' : '#e2e8f0'}`,
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: isChecked ? 600 : 400,
                            color: isChecked ? '#be123c' : '#475569'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            style={{ accentColor: '#e11d48', width: '15px', height: '15px' }}
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 9. SENSITIVE ACTIONS REQUIRING EXPLICIT ELEVATION (Requirement 21) */}
              <div style={{ marginBottom: '1.5rem', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedSections(p => ({ ...p, sensitive: !p.sensitive }))}
                  style={{ padding: '0.85rem 1rem', background: '#fee2e2', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertTriangle size={16} color="#dc2626" /> DANGEROUS & SENSITIVE PERMISSIONS
                  </div>
                  {expandedSections.sensitive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {expandedSections.sensitive && (
                  <div style={{ padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#7f1d1d', margin: '0 0 0.75rem 0' }}>
                      These actions have high financial or security impact. Only grant to trusted administrators or authorized managers.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                      {groupedPermissions.sensitive.map(p => {
                        const isChecked = selectedPermissions.has(p.id);
                        return (
                          <label
                            key={p.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              background: isChecked ? '#fee2e2' : '#ffffff',
                              border: `1px solid ${isChecked ? '#f87171' : '#fca5a5'}`,
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: isChecked ? 700 : 500,
                              color: isChecked ? '#7f1d1d' : '#991b1b'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermission(p.id)}
                              style={{ accentColor: '#dc2626', width: '15px', height: '15px' }}
                            />
                            <span>{p.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Reason for Audit Log */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Reason for Permission Change (Logged to Audit Trail):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assigned to printing shift / Authorized for material issue"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Drawer Footer Buttons */}
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {hasUnsavedChanges && (
                  <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertTriangle size={14} /> You have unsaved changes
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (hasUnsavedChanges) setIsUnsavedWarningOpen(true);
                    else setIsManageDrawerOpen(false);
                  }}
                  className="btn btn-outline-secondary"
                  style={{ fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!hasUnsavedChanges}
                  onClick={() => setIsConfirmSaveOpen(true)}
                  className="btn btn-primary"
                  style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SAVE CONFIRMATION WITH PERMISSION DIFF (Requirement 30) */}
      {/* ========================================================================= */}
      {isConfirmSaveOpen && selectedEmployee && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Confirm Access Changes
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                You are updating permissions for <strong>{selectedEmployee.name}</strong> ({selectedEmployee.employeeCode}).
              </p>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', maxHeight: '350px', overflowY: 'auto' }}>
              {permissionDiffs.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No changes detected.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {permissionDiffs.map((d, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        background: d.isSensitive ? '#fff5f5' : '#f8fafc',
                        border: `1px solid ${d.isSensitive ? '#fed7d7' : '#e2e8f0'}`,
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontWeight: 600, color: d.isSensitive ? '#991b1b' : '#334155' }}>
                        {d.isSensitive && <AlertTriangle size={13} style={{ display: 'inline', marginRight: '0.3rem', color: '#dc2626' }} />}
                        {d.label}
                      </span>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        <span style={{ color: d.oldVal === 'ON' || d.oldVal === 'Active' || d.oldVal === 'ALLOWED' ? '#059669' : '#dc2626' }}>
                          {d.oldVal}
                        </span>
                        {' → '}
                        <strong style={{ color: d.newVal === 'ON' || d.newVal === 'Active' || d.newVal === 'ALLOWED' ? '#059669' : '#dc2626' }}>
                          {d.newVal}
                        </strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setIsConfirmSaveOpen(false)}
                className="btn btn-outline-secondary"
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmSave}
                className="btn btn-primary"
                style={{ fontWeight: 700, fontSize: '0.85rem' }}
              >
                {loading ? 'Saving...' : 'Yes, Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UNSAVED CHANGES WARNING (Requirement 31) */}
      {/* ========================================================================= */}
      {isUnsavedWarningOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fffbeb',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Unsaved Permission Changes
            </h4>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              You have modified permissions for <strong>{selectedEmployee?.name}</strong>. Leaving now will discard these changes.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsUnsavedWarningOpen(false)}
                className="btn btn-primary"
                style={{ fontWeight: 700, fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              >
                Stay & Continue Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsUnsavedWarningOpen(false);
                  setIsManageDrawerOpen(false);
                }}
                className="btn btn-outline-danger"
                style={{ fontWeight: 600, fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              >
                Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE USER ACCOUNT (Requirement 3) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Create Employee User Account
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Link a real authenticated login account to an existing employee record.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ padding: '1.5rem', maxHeight: '460px', overflowY: 'auto' }}>
                {/* 1. Select Existing Employee */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Select Employee <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    required
                    value={createForm.employeeId}
                    onChange={(e) => {
                      const emp = matrix.find(m => m.id === e.target.value);
                      setCreateForm(prev => ({
                        ...prev,
                        employeeId: e.target.value,
                        username: emp ? (emp.code || emp.name).toLowerCase().replace(/[^a-z0-9]/g, '') : '',
                        email: emp?.email || `${e.target.value.toLowerCase()}@screenarts.in`,
                        designation: emp?.designation || emp?.role || ''
                      }));
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    <option value="">-- Choose Employee Without Account --</option>
                    {unlinkedEmployees.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.employeeCode || e.id}) — {e.department} ({e.designation || e.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Username */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Username <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. vikas.p"
                      value={createForm.username}
                      onChange={(e) => setCreateForm(p => ({ ...p, username: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. vikas@screenarts.in"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(p => ({ ...p, email: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Password / Temp Password <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Min. 6 characters"
                      value={createForm.password}
                      onChange={(e) => setCreateForm(p => ({ ...p, password: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Role Template */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Role Template <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm(p => ({ ...p, role: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Designation */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Printing Operator"
                      value={createForm.designation}
                      onChange={(e) => setCreateForm(p => ({ ...p, designation: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* Initial Account Status */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                      Account Status
                    </label>
                    <select
                      value={createForm.status}
                      onChange={(e) => setCreateForm(p => ({ ...p, status: e.target.value }))}
                      style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      <option value="Active">Active (Permits login)</option>
                      <option value="Disabled">Disabled (Suspended)</option>
                      <option value="Pending">Pending (Activation required)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-outline-secondary"
                  style={{ fontWeight: 600, fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-success"
                  style={{ fontWeight: 700, fontSize: '0.85rem' }}
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementView;
