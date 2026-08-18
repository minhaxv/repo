import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import {
  Palette,
  Upload,
  CheckCircle2,
  Clock,
  Image,
  ExternalLink,
  Search,
  Filter,
  UserCheck,
  AlertTriangle,
  Play,
  Pause,
  Send,
  MessageSquare,
  Sparkles,
  Zap,
  CheckSquare,
  Users,
  FileText,
  Calendar,
  ChevronRight,
  RefreshCw,
  Plus
} from 'lucide-react';

export const DesignersView = () => {
  const {
    salesOrders,
    designers,
    employees,
    activeUser,
    activeRole,
    takeDesignJob,
    updateDesignJobStatus,
    updateArtworkStatus,
    workerJobIncentives,
    calculateJobProfitAndIncentive
  } = useERP();

  // Active Queue Tab
  const [activeTab, setActiveTab] = useState('UNASSIGNED'); // UNASSIGNED | MY_JOBS | WAITING_CUSTOMER | COMPLETED | ALL

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterDesigner, setFilterDesigner] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCustomer, setFilterCustomer] = useState('');

  // Modals & Action Drawer State
  const [activeJobAction, setActiveJobAction] = useState(null); // { job, mode: 'UPLOAD' | 'NOTE' | 'PAUSE' | 'REVISION' }
  const [inputUrl, setInputUrl] = useState('');
  const [inputNote, setInputNote] = useState('');

  // Current Designer Context Identifier
  const currentDesignerName = activeUser?.name || 'Authorized Designer';
  const currentDesignerObj = (employees || []).find(e => e.name === activeUser?.name) || (designers || [])[0] || { id: 'DES-01', name: currentDesignerName };

  // Flatten all sales order line items requiring design
  const allDesignJobs = useMemo(() => {
    const jobs = [];
    (salesOrders || []).forEach((o) => {
      (o.items || []).forEach((it) => {
        if (it.designerRequired === 'YES' || it.designRequired === 'YES' || it.designerId || (it.artworkStatus && it.artworkStatus !== 'Approved')) {
          jobs.push({
            orderId: o.id,
            orderDate: o.orderDate || o.createdAt?.split('T')[0],
            deliveryDate: o.deliveryDate,
            customerId: o.customerId,
            customerName: o.customerName,
            customerMobile: o.customerMobile,
            salesPersonName: o.salesPersonName || 'Direct',
            orderRemarks: o.remarks || '',
            orderType: o.orderType || 'Direct',
            item: it,
            jobPriority: it.jobPriority || 'Normal',
            estimatedDesignTime: it.estimatedDesignTime || 1.5,
            designStatus: it.designStatus || (it.designerId ? 'Assigned' : 'Pending'),
            artworkStatus: it.artworkStatus || 'Pending',
            designerId: it.designerId || '',
            designerName: it.designerName || ''
          });
        }
      });
    });
    return jobs;
  }, [salesOrders]);

  // Separate Queue Counts for KPI Cards & Tab Badges
  const unassignedJobs = useMemo(() => allDesignJobs.filter(j => !j.designerId || j.designStatus === 'Pending'), [allDesignJobs]);
  const myAssignedJobs = useMemo(() => allDesignJobs.filter(j => j.designerId && (j.designerId === currentDesignerObj.id || j.designerName === currentDesignerName) && j.designStatus !== 'Completed'), [allDesignJobs, currentDesignerObj, currentDesignerName]);
  const waitingCustomerJobs = useMemo(() => allDesignJobs.filter(j => j.designStatus === 'Waiting for Customer' || j.artworkStatus === 'Waiting Customer Approval'), [allDesignJobs]);
  const completedJobs = useMemo(() => allDesignJobs.filter(j => j.designStatus === 'Completed' || j.artworkStatus === 'Approved'), [allDesignJobs]);

  // Urgent Count
  const urgentUnassignedCount = unassignedJobs.filter(j => j.jobPriority === 'Urgent' || j.jobPriority === 'High').length;

  // Filtered Jobs Array for Active Tab
  const filteredJobs = useMemo(() => {
    let list = allDesignJobs;

    if (activeTab === 'UNASSIGNED') {
      list = unassignedJobs;
    } else if (activeTab === 'MY_JOBS') {
      list = myAssignedJobs;
    } else if (activeTab === 'WAITING_CUSTOMER') {
      list = waitingCustomerJobs;
    } else if (activeTab === 'COMPLETED') {
      list = completedJobs;
    }

    return list.filter((job) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        job.orderId.toLowerCase().includes(q) ||
        job.customerName.toLowerCase().includes(q) ||
        job.item.productName.toLowerCase().includes(q) ||
        job.salesPersonName.toLowerCase().includes(q) ||
        (job.item.material || '').toLowerCase().includes(q);

      const matchesPriority = filterPriority === 'ALL' || job.jobPriority === filterPriority;
      const matchesDesigner = filterDesigner === 'ALL' || job.designerId === filterDesigner || job.designerName === filterDesigner;
      const matchesStatus = filterStatus === 'ALL' || job.designStatus === filterStatus;
      const matchesCustomer = !filterCustomer || job.customerId === filterCustomer || job.customerName.toLowerCase().includes(filterCustomer.toLowerCase());

      return matchesSearch && matchesPriority && matchesDesigner && matchesStatus && matchesCustomer;
    });
  }, [allDesignJobs, unassignedJobs, myAssignedJobs, waitingCustomerJobs, completedJobs, activeTab, searchQuery, filterPriority, filterDesigner, filterStatus, filterCustomer]);

  // Handlers for Designer Lifecycle Actions
  const handleTakeJob = async (job) => {
    await takeDesignJob(job.orderId, job.item.id, currentDesignerObj.id, currentDesignerName);
    alert(`⚡ Job ${job.orderId} (${job.item.productName}) self-assigned to ${currentDesignerName}!`);
  };

  const handleStartDesign = async (job) => {
    await updateDesignJobStatus(job.orderId, job.item.id, 'START');
    alert(`🚀 Design timer started for ${job.orderId}! Status: In Progress`);
  };

  const handleRequestCustomerApproval = async (job) => {
    const defaultProof = job.item.artworkUrl || "https://images.unsplash.com/photo-1542744095-291d1f67b221?auto=format&fit=crop&w=800&q=80";
    const proofUrl = prompt("Enter Artwork Proof URL for Customer Review:", defaultProof);
    if (proofUrl === null) return;

    await updateDesignJobStatus(job.orderId, job.item.id, 'REQUEST_APPROVAL', { artworkUrl: proofUrl });
    alert(`📱 Proof sent for Customer Approval! Status set to Waiting for Customer.`);
  };

  const handleMarkCompleted = async (job) => {
    if (!job.item.artworkUrl) {
      const proofUrl = prompt("Enter Final Approved Artwork URL / File Link:", "https://images.unsplash.com/photo-1542744095-291d1f67b221?auto=format&fit=crop&w=800&q=80");
      if (proofUrl) {
        await updateDesignJobStatus(job.orderId, job.item.id, 'COMPLETE', { artworkUrl: proofUrl });
      } else {
        await updateDesignJobStatus(job.orderId, job.item.id, 'COMPLETE');
      }
    } else {
      await updateDesignJobStatus(job.orderId, job.item.id, 'COMPLETE');
    }
    alert(`✅ Job ${job.orderId} (${job.item.productName}) Design Completed!\n\n🚀 Automatically transferred into PRINTING stage and 0.5% Designer Profit Incentive credited!`);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!activeJobAction) return;

    const { job, mode } = activeJobAction;
    if (mode === 'UPLOAD') {
      if (!inputUrl) {
        alert("Please provide a valid image / proof URL");
        return;
      }
      await updateDesignJobStatus(job.orderId, job.item.id, 'UPLOAD', { artworkUrl: inputUrl });
      alert("Artwork proof uploaded successfully!");
    } else if (mode === 'PAUSE') {
      await updateDesignJobStatus(job.orderId, job.item.id, 'PAUSE', { note: inputNote });
      alert("Job paused and moved back to pending queue.");
    } else if (mode === 'NOTE') {
      await updateDesignJobStatus(job.orderId, job.item.id, 'NOTE', { note: inputNote });
      alert("Internal design note added.");
    } else if (mode === 'REVISION') {
      await updateDesignJobStatus(job.orderId, job.item.id, 'REVISION', { note: inputNote });
      alert("Revision request recorded.");
    }

    setActiveJobAction(null);
    setInputUrl('');
    setInputNote('');
  };

  return (
    <div className="view-container">
      {/* Module Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={24} color="#8b5cf6" /> Design Work Queue & Studio Workspace
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Self-assign artwork jobs, manage design status lifecycle, upload proofs, and auto-hand off to Production
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#ede9fe', padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
          <UserCheck size={18} color="#7c3aed" />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#5b21b6' }}>Logged-in Designer: {currentDesignerName}</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Unassigned Queue KPI */}
        <div
          className="card"
          onClick={() => setActiveTab('UNASSIGNED')}
          style={{ cursor: 'pointer', borderLeft: '4px solid #f59e0b', background: activeTab === 'UNASSIGNED' ? '#fffbeb' : '#ffffff' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>UNASSIGNED QUEUE</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#92400e', margin: '0.2rem 0' }}>
                {unassignedJobs.length} Jobs
              </h3>
            </div>
            <div style={{ background: '#fef3c7', padding: '0.45rem', borderRadius: '8px', color: '#d97706' }}>
              <Zap size={22} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: urgentUnassignedCount > 0 ? '#dc2626' : '#d97706', fontWeight: 700 }}>
            {urgentUnassignedCount > 0 ? `🚨 ${urgentUnassignedCount} High / Urgent Priority` : 'Open for Self-Assignment'}
          </span>
        </div>

        {/* My Active Jobs KPI */}
        <div
          className="card"
          onClick={() => setActiveTab('MY_JOBS')}
          style={{ cursor: 'pointer', borderLeft: '4px solid #8b5cf6', background: activeTab === 'MY_JOBS' ? '#f5f3ff' : '#ffffff' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 800, textTransform: 'uppercase' }}>MY ACTIVE JOBS</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#5b21b6', margin: '0.2rem 0' }}>
                {myAssignedJobs.length} Assigned
              </h3>
            </div>
            <div style={{ background: '#ede9fe', padding: '0.45rem', borderRadius: '8px', color: '#7c3aed' }}>
              <Palette size={22} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#6d28d9', fontWeight: 600 }}>Assigned to {currentDesignerName}</span>
        </div>

        {/* Waiting for Customer KPI */}
        <div
          className="card"
          onClick={() => setActiveTab('WAITING_CUSTOMER')}
          style={{ cursor: 'pointer', borderLeft: '4px solid #2563eb', background: activeTab === 'WAITING_CUSTOMER' ? '#eff6ff' : '#ffffff' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>WAITING APPROVAL</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a', margin: '0.2rem 0' }}>
                {waitingCustomerJobs.length} Jobs
              </h3>
            </div>
            <div style={{ background: '#dbeafe', padding: '0.45rem', borderRadius: '8px', color: '#2563eb' }}>
              <Clock size={22} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>Client Proofing Stage</span>
        </div>

        {/* Completed Today KPI */}
        <div
          className="card"
          onClick={() => setActiveTab('COMPLETED')}
          style={{ cursor: 'pointer', borderLeft: '4px solid #10b981', background: activeTab === 'COMPLETED' ? '#ecfdf5' : '#ffffff' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 800, textTransform: 'uppercase' }}>COMPLETED & APPROVED</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#065f46', margin: '0.2rem 0' }}>
                {completedJobs.length} Jobs
              </h3>
            </div>
            <div style={{ background: '#d1fae5', padding: '0.45rem', borderRadius: '8px', color: '#059669' }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>Auto-Moved to Production</span>
        </div>
      </div>

      {/* Main Workstation Filter & Tabs Navigation */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        {/* Tab Headers */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setActiveTab('UNASSIGNED')}
            className={`btn btn-sm ${activeTab === 'UNASSIGNED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700, position: 'relative' }}
          >
            ⚡ Unassigned Queue
            <span className="badge badge-amber" style={{ marginLeft: '0.4rem' }}>{unassignedJobs.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('MY_JOBS')}
            className={`btn btn-sm ${activeTab === 'MY_JOBS' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700, background: activeTab === 'MY_JOBS' ? '#7c3aed' : '', borderColor: activeTab === 'MY_JOBS' ? '#7c3aed' : '' }}
          >
            🎨 My Active Tasks
            <span className="badge badge-purple" style={{ marginLeft: '0.4rem' }}>{myAssignedJobs.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('WAITING_CUSTOMER')}
            className={`btn btn-sm ${activeTab === 'WAITING_CUSTOMER' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            ⏳ Client Approval Pending
            <span className="badge badge-blue" style={{ marginLeft: '0.4rem' }}>{waitingCustomerJobs.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`btn btn-sm ${activeTab === 'COMPLETED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700, background: activeTab === 'COMPLETED' ? '#059669' : '', borderColor: activeTab === 'COMPLETED' ? '#059669' : '' }}
          >
            ✅ Completed & Approved Archive
            <span className="badge badge-emerald" style={{ marginLeft: '0.4rem' }}>{completedJobs.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`btn btn-sm ${activeTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            👥 All Studio Jobs ({allDesignJobs.length})
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Live Search */}
          <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search Order #, Product, Customer, Sales Person..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2.1rem', fontSize: '0.82rem', height: '36px' }}
            />
          </div>

          {/* Priority Filter */}
          <div style={{ minWidth: '140px' }}>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '36px', fontWeight: 600 }}
            >
              <option value="ALL">All Priorities</option>
              <option value="Urgent">🚨 Urgent</option>
              <option value="High">⚠️ High</option>
              <option value="Normal">ℹ️ Normal</option>
              <option value="Low">💤 Low</option>
            </select>
          </div>

          {/* Designer Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={filterDesigner}
              onChange={(e) => setFilterDesigner(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '36px', fontWeight: 600 }}
            >
              <option value="ALL">All Designers</option>
              {designers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '36px', fontWeight: 600 }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending (Unassigned)</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Customer">Waiting for Customer</option>
              <option value="Revision Required">Revision Required</option>
              <option value="Approved">Approved</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterPriority('ALL');
              setFilterDesigner('ALL');
              setFilterStatus('ALL');
              setFilterCustomer('');
            }}
            className="btn btn-sm btn-secondary"
            style={{ height: '36px' }}
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Main Table Matrix of Design Jobs */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="#7c3aed" />
            {activeTab === 'UNASSIGNED' && 'Unassigned Design Queue (Click "Take Job" to Self-Assign)'}
            {activeTab === 'MY_JOBS' && `My Assigned Active Studio Jobs (${currentDesignerName})`}
            {activeTab === 'WAITING_CUSTOMER' && 'Jobs Awaiting Client Proof Approval'}
            {activeTab === 'COMPLETED' && 'Completed Artwork Archive'}
            {activeTab === 'ALL' && 'Master Studio Design Jobs Registry'}
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            Showing {filteredJobs.length} design jobs
          </span>
        </div>

        <div className="table-responsive" style={{ maxHeight: '650px', overflowY: 'auto' }}>
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ minWidth: '100px' }}>Order #</th>
                <th style={{ minWidth: '150px' }}>Customer & Mobile</th>
                <th style={{ minWidth: '200px' }}>Product & Spec</th>
                <th style={{ minWidth: '90px' }}>Priority</th>
                <th style={{ minWidth: '110px' }}>Delivery Date</th>
                <th style={{ minWidth: '100px' }}>Est. Hours</th>
                <th style={{ minWidth: '140px' }}>Assigned Designer</th>
                <th style={{ minWidth: '140px' }}>Design Status</th>
                <th style={{ minWidth: '130px' }}>Artwork Proof</th>
                <th style={{ minWidth: '220px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={36} color="#10b981" />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>No design jobs found matching current filters.</span>
                      <span style={{ fontSize: '0.78rem' }}>Check another tab or reset filter controls above.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, idx) => {
                  const isUnassigned = !job.designerId || job.designStatus === 'Pending';
                  const isMyJob = job.designerId && (job.designerId === currentDesignerObj.id || job.designerName === currentDesignerName);

                  return (
                    <tr key={`${job.orderId}-${job.item.id}-${idx}`} style={{ background: job.jobPriority === 'Urgent' ? '#fff1f2' : 'inherit' }}>
                      {/* Order # & Type */}
                      <td>
                        <div style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.85rem' }}>{job.orderId}</div>
                        <span className="badge badge-secondary" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                          {job.orderType}
                        </span>
                      </td>

                      {/* Customer & Mobile */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{job.customerName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {job.customerMobile ? `Mob: ${job.customerMobile}` : ''}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>
                          Sales: {job.salesPersonName}
                        </div>
                      </td>

                      {/* Product & Spec */}
                      <td>
                        {(() => {
                          const order = (salesOrders || []).find(o => o.id === job.orderId);
                          const { itemProfit, incentiveAmount } = calculateJobProfitAndIncentive ? calculateJobProfitAndIncentive(job.item, order, 0.5) : { itemProfit: 0, incentiveAmount: 0 };
                          return (
                            <>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{job.item.productName}</div>
                              <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                                {job.item.material || 'Standard Substrate'} | {job.item.width && job.item.height ? `${job.item.width}x${job.item.height} ${job.item.unit}` : 'Custom Size'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.15rem 0.35rem', borderRadius: '4px', marginTop: '3px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                ⚡ Designer 0.5% Profit Incentive: ₹{incentiveAmount.toFixed(2)} (Job Profit: ₹{itemProfit.toLocaleString()})
                              </div>
                              {job.orderRemarks && (
                                <div style={{ fontSize: '0.7rem', color: '#d97706', fontStyle: 'italic', marginTop: '2px' }}>
                                  Notes: "{job.orderRemarks}"
                                </div>
                              )}
                              {job.item.internalNotes && (
                                <div style={{ fontSize: '0.7rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.35rem', borderRadius: '4px', marginTop: '3px' }}>
                                  Design Note: {job.item.internalNotes.split('\n').pop()}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </td>

                      {/* Priority Badge */}
                      <td>
                        <span className={`badge ${
                          job.jobPriority === 'Urgent' ? 'badge-rose' :
                          job.jobPriority === 'High' ? 'badge-amber' :
                          job.jobPriority === 'Low' ? 'badge-secondary' : 'badge-blue'
                        }`}>
                          {job.jobPriority === 'Urgent' && '🚨 '}
                          {job.jobPriority === 'High' && '⚠️ '}
                          {job.jobPriority}
                        </span>
                      </td>

                      {/* Delivery Date */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}>
                          <Calendar size={13} /> {job.deliveryDate || 'ASAP'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          Logged: {job.orderDate}
                        </div>
                      </td>

                      {/* Est. Hours */}
                      <td style={{ fontWeight: 700, color: '#475569', fontSize: '0.82rem' }}>
                        {job.estimatedDesignTime} hrs
                      </td>

                      {/* Assigned Designer */}
                      <td>
                        {job.designerName ? (
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>{job.designerName}</div>
                            {isMyJob && <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>You</span>}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 800 }}>⚡ Unassigned</span>
                        )}
                      </td>

                      {/* Design Status Badge */}
                      <td>
                        <span className={`badge ${
                          job.designStatus === 'Completed' || job.artworkStatus === 'Approved' ? 'badge-emerald' :
                          job.designStatus === 'In Progress' ? 'badge-blue' :
                          job.designStatus === 'Waiting for Customer' ? 'badge-amber' :
                          job.designStatus === 'Revision Required' ? 'badge-rose' :
                          job.designStatus === 'Assigned' ? 'badge-purple' : 'badge-amber'
                        }`}>
                          {job.designStatus || job.artworkStatus || 'Pending'}
                        </span>
                      </td>

                      {/* Artwork Proof Preview */}
                      <td>
                        {job.item.artworkUrl ? (
                          <a
                            href={job.item.artworkUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Image size={14} /> View Proof <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>No proof attached</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {/* Self Assign Button if Unassigned */}
                          {isUnassigned && (
                            <button
                              onClick={() => handleTakeJob(job)}
                              className="btn btn-sm"
                              style={{ background: '#f59e0b', color: '#ffffff', fontWeight: 800, border: 'none', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              title="Self-assign this job to yourself"
                            >
                              ⚡ Take Job
                            </button>
                          )}

                          {/* Actions for Assigned Designer / Admin */}
                          {(!isUnassigned || activeRole === 'Admin') && (
                            <>
                              {job.designStatus !== 'In Progress' && job.designStatus !== 'Completed' && (
                                <button
                                  onClick={() => handleStartDesign(job)}
                                  className="btn btn-sm btn-primary"
                                  style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                                  title="Start active design timer"
                                >
                                  <Play size={12} /> Start
                                </button>
                              )}

                              <button
                                onClick={() => setActiveJobAction({ job, mode: 'UPLOAD' })}
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                                title="Attach / Upload Artwork Proof URL"
                              >
                                <Upload size={12} color="#2563eb" /> Upload
                              </button>

                              <button
                                onClick={() => handleRequestCustomerApproval(job)}
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem', color: '#1d4ed8' }}
                                title="Send proof link for customer review"
                              >
                                <Send size={12} /> Approval
                              </button>

                              {job.designStatus !== 'Completed' && (
                                <button
                                  onClick={() => handleMarkCompleted(job)}
                                  className="btn btn-sm"
                                  style={{ background: '#059669', color: '#ffffff', fontWeight: 800, border: 'none', padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                                  title="Finish Design & Send to Printing Queue"
                                >
                                  🖨️ Finish Design ➔ Send to Printing
                                </button>
                              )}

                              <button
                                onClick={() => setActiveJobAction({ job, mode: 'NOTE' })}
                                className="btn btn-sm btn-secondary"
                                style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem' }}
                                title="Add internal note / revision spec"
                              >
                                <MessageSquare size={12} /> Note
                              </button>
                            </>
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

      {/* Action Modal (Upload / Note / Pause) */}
      {activeJobAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.5rem', borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
              {activeJobAction.mode === 'UPLOAD' && '🖼️ Upload Artwork Proof File / URL'}
              {activeJobAction.mode === 'NOTE' && '📝 Add Internal Studio Note'}
              {activeJobAction.mode === 'PAUSE' && '⏸️ Pause Job & Note Reason'}
              {activeJobAction.mode === 'REVISION' && '⚠️ Mark Client Revision Needed'}
            </h3>

            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
              <strong>Job:</strong> {activeJobAction.job.orderId} — {activeJobAction.job.item.productName} ({activeJobAction.job.customerName})
            </div>

            <form onSubmit={handleModalSubmit}>
              {activeJobAction.mode === 'UPLOAD' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.3rem' }}>
                    Artwork Image / Proof File URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/... or cloud file link"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem' }}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '0.3rem' }}>
                    Paste Google Drive, Dropbox, Unsplash, or RIP file server link
                  </span>
                </div>
              )}

              {(activeJobAction.mode === 'NOTE' || activeJobAction.mode === 'PAUSE' || activeJobAction.mode === 'REVISION') && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '0.3rem' }}>
                    Notes / Revisions / Instructions
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Type details or customer feedback..."
                    value={inputNote}
                    onChange={(e) => setInputNote(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setActiveJobAction(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
