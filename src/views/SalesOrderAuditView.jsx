import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import {
  History,
  Search,
  Filter,
  Download,
  Printer,
  Calendar,
  User,
  AlertTriangle,
  XCircle,
  Trash2,
  Edit3,
  PlusCircle,
  RefreshCw,
  Eye,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  ShoppingCart
} from 'lucide-react';

export const SalesOrderAuditView = ({ onNavigate }) => {
  const {
    orderAuditLogs,
    salesOrders,
    activeUser,
    activeRole,
    companyProfile,
    clearAuditLogs
  } = useERP();

  const [activeTabFilter, setActiveTabFilter] = useState('ALL'); // 'ALL' | 'EDITED' | 'CANCELLED' | 'DELETED' | 'CREATED' | 'CONVERTED'
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'WEEK' | 'MONTH'
  const [selectedUserFilter, setSelectedUserFilter] = useState('ALL');
  const [selectedLogForDetail, setSelectedLogForDetail] = useState(null);

  // Unique list of actors
  const uniqueActors = useMemo(() => {
    const actors = new Set();
    (orderAuditLogs || []).forEach(log => {
      if (log.actor) actors.add(log.actor);
    });
    return Array.from(actors);
  }, [orderAuditLogs]);

  // Statistics calculation
  const stats = useMemo(() => {
    const logs = orderAuditLogs || [];
    const total = logs.length;
    const edits = logs.filter(l => l.actionType === 'EDITED').length;
    const cancellations = logs.filter(l => l.actionType === 'CANCELLED');
    const deletions = logs.filter(l => l.actionType === 'DELETED');
    const creations = logs.filter(l => l.actionType === 'CREATED' || l.actionType === 'CONVERTED').length;

    const totalCancelledValue = cancellations.reduce((sum, l) => sum + (Number(l.previousAmount) || 0), 0);
    const totalDeletedValue = deletions.reduce((sum, l) => sum + (Number(l.previousAmount) || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = logs.filter(l => l.timestamp?.startsWith(todayStr)).length;

    return {
      total,
      edits,
      cancellationsCount: cancellations.length,
      totalCancelledValue,
      deletionsCount: deletions.length,
      totalDeletedValue,
      creations,
      todayCount
    };
  }, [orderAuditLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return (orderAuditLogs || []).filter(log => {
      // Tab filter
      if (activeTabFilter !== 'ALL' && log.actionType !== activeTabFilter) {
        return false;
      }

      // User filter
      if (selectedUserFilter !== 'ALL' && log.actor !== selectedUserFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'ALL' && log.timestamp) {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          if (logDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'WEEK') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (logDate < oneWeekAgo) return false;
        } else if (dateFilter === 'MONTH') {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (logDate < oneMonthAgo) return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = (log.orderId || log.orderNumber || '').toLowerCase().includes(query);
        const matchesCust = (log.customerName || '').toLowerCase().includes(query) || (log.customerMobile || '').includes(query);
        const matchesActor = (log.actor || '').toLowerCase().includes(query);
        const matchesReason = (log.reason || '').toLowerCase().includes(query);
        const matchesSummary = (log.changesSummary || []).some(s => s.toLowerCase().includes(query));
        return matchesId || matchesCust || matchesActor || matchesReason || matchesSummary;
      }

      return true;
    });
  }, [orderAuditLogs, activeTabFilter, selectedUserFilter, dateFilter, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) {
      alert("No audit logs to export based on current filters.");
      return;
    }

    const headers = ["Log ID", "Date & Time", "Action Type", "Order ID", "Customer Name", "Customer Mobile", "Modified By", "Role", "Previous Amount", "New Amount", "Reason", "Changes Summary"];
    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${l.formattedTime || l.timestamp}"`,
      `"${l.actionType}"`,
      `"${l.orderId || l.orderNumber}"`,
      `"${(l.customerName || '').replace(/"/g, '""')}"`,
      `"${l.customerMobile || ''}"`,
      `"${(l.actor || '').replace(/"/g, '""')}"`,
      `"${l.role || ''}"`,
      l.previousAmount !== undefined ? l.previousAmount : '',
      l.newAmount !== undefined ? l.newAmount : '',
      `"${(l.reason || '').replace(/"/g, '""')}"`,
      `"${(l.changesSummary || []).join('; ').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_order_audit_trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Window
  const handlePrintAudit = () => {
    window.print();
  };

  const getActionBadge = (actionType) => {
    switch (actionType) {
      case 'EDITED':
        return (
          <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800 }}>
            <Edit3 size={12} /> EDITED / REVISED
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800, background: '#ffe4e6', color: '#e11d48', border: '1px solid #fecdd3' }}>
            <XCircle size={12} /> CANCELLED
          </span>
        );
      case 'DELETED':
        return (
          <span className="badge badge-slate" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
            <Trash2 size={12} /> PURGED / DELETED
          </span>
        );
      case 'CREATED':
        return (
          <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800 }}>
            <PlusCircle size={12} /> CREATED
          </span>
        );
      case 'CONVERTED':
        return (
          <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800 }}>
            <RefreshCw size={12} /> CONVERTED
          </span>
        );
      default:
        return <span className="badge badge-slate">{actionType}</span>;
    }
  };

  return (
    <div className="view-container">
      {/* Top Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={26} color="#7c3aed" />
            Sales Order Revision, Edit & Cancellation Log
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Full immutable audit trail of every modification, item revision, price change, cancellation, and deletion across PrintFlow ERP.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary" title="Export current audit logs to CSV spreadsheet">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={handlePrintAudit} className="btn btn-secondary" title="Print Audit Trail">
            <Printer size={15} /> Print Log
          </button>
          {onNavigate && (
            <button onClick={() => onNavigate('sales-orders')} className="btn btn-primary" style={{ background: '#2563eb' }}>
              <ShoppingCart size={15} /> Go to Sales Orders
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Total Activity */}
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #7c3aed', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>TOTAL AUDIT LOGS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <History size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '0.35rem' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '0.2rem' }}>
            {stats.todayCount} actions recorded today
          </div>
        </div>

        {/* Revisions & Edits */}
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #d97706', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ORDER REVISIONS / EDITS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Edit3 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '0.35rem' }}>
            {stats.edits}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Specs, size, pricing & dates updated
          </div>
        </div>

        {/* Cancellations */}
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #e11d48', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>CANCELLED ORDERS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ffe4e6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
              <XCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#e11d48', marginTop: '0.35rem' }}>
            {stats.cancellationsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            ₹{stats.totalCancelledValue.toLocaleString()} total order value cancelled
          </div>
        </div>

        {/* Deletions */}
        <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid #475569', background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>DELETED RECORDS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <Trash2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', marginTop: '0.35rem' }}>
            {stats.deletionsCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            Snapshots safely archived in audit log
          </div>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        {/* Action Type Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem', marginBottom: '0.85rem' }}>
          {[
            { id: 'ALL', label: 'All Activities', count: stats.total },
            { id: 'EDITED', label: 'Edits & Modifications', count: stats.edits },
            { id: 'CANCELLED', label: 'Cancellations', count: stats.cancellationsCount },
            { id: 'DELETED', label: 'Purged / Deleted', count: stats.deletionsCount },
            { id: 'CREATED', label: 'Created Orders', count: stats.creations }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id)}
              className={`btn btn-sm ${activeTabFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                borderRadius: '20px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search & Secondary Filter Dropdowns */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by SO#, customer, actor, mobile, reason, or change detail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2rem', height: '38px', width: '100%', fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Date Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={15} color="#64748b" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="form-input"
              style={{ height: '38px', fontSize: '0.82rem', width: '140px' }}
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>

          {/* User Filter Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <User size={15} color="#64748b" />
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="form-input"
              style={{ height: '38px', fontSize: '0.82rem', width: '170px' }}
            >
              <option value="ALL">All Staff Members</option>
              {uniqueActors.map(actor => (
                <option key={actor} value={actor}>{actor}</option>
              ))}
            </select>
          </div>

          {(searchQuery || dateFilter !== 'ALL' || selectedUserFilter !== 'ALL' || activeTabFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDateFilter('ALL');
                setSelectedUserFilter('ALL');
                setActiveTabFilter('ALL');
              }}
              className="btn btn-sm btn-secondary"
              style={{ height: '38px', color: '#e11d48' }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Activity Feed Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
            Activity Feed ({filteredLogs.length} Records Found)
          </div>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Showing chronological sequence of all order revisions
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748b' }}>
            <History size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: '0 0 0.4rem 0' }}>No matching audit logs found</h4>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Try clearing search keywords or selecting "All Activities".</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="erp-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Date & Time</th>
                  <th style={{ width: '140px' }}>Action Type</th>
                  <th style={{ width: '140px' }}>Order ID</th>
                  <th>Customer</th>
                  <th>Modified By</th>
                  <th>Revision Details & Reasons</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Amount Impact</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isExistingOrder = (salesOrders || []).some(o => o.id === log.orderId);
                  return (
                    <tr
                      key={log.id}
                      style={{
                        backgroundColor: log.actionType === 'CANCELLED' ? '#fff1f2' : log.actionType === 'DELETED' ? '#f8fafc' : undefined
                      }}
                    >
                      {/* Timestamp */}
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {log.formattedTime?.split(',')[0] || log.timestamp?.split('T')[0]}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.72rem' }}>
                          {log.formattedTime?.split(',')[1] || ''}
                        </div>
                      </td>

                      {/* Action Type Badge */}
                      <td>{getActionBadge(log.actionType)}</td>

                      {/* Order ID */}
                      <td>
                        <div style={{ fontWeight: 800, color: log.actionType === 'DELETED' ? '#64748b' : '#1e40af', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {log.orderId || log.orderNumber}
                        </div>
                        {isExistingOrder && onNavigate && (
                          <button
                            onClick={() => onNavigate('sales-orders', { selectId: log.orderId })}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              marginTop: '2px'
                            }}
                            title="Open Sales Order Details"
                          >
                            View Order <ArrowRight size={10} />
                          </button>
                        )}
                      </td>

                      {/* Customer */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{log.customerName}</div>
                        {log.customerMobile && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.customerMobile}</div>
                        )}
                      </td>

                      {/* Actor */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={13} color="#64748b" /> {log.actor}
                        </div>
                        <span className="badge badge-slate" style={{ fontSize: '0.66rem', padding: '0.1rem 0.35rem' }}>
                          {log.role || 'Staff'}
                        </span>
                      </td>

                      {/* Summary & Reasons */}
                      <td>
                        {log.reason && (
                          <div style={{
                            background: log.actionType === 'CANCELLED' ? '#ffe4e6' : '#f1f5f9',
                            color: log.actionType === 'CANCELLED' ? '#9f1239' : '#334155',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            marginBottom: '0.35rem',
                            display: 'inline-block'
                          }}>
                            <strong>Reason:</strong> {log.reason}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {(log.changesSummary || []).slice(0, 3).map((change, cIdx) => (
                            <div key={cIdx} style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                              <span style={{ color: '#7c3aed', fontWeight: 800 }}>•</span> {change}
                            </div>
                          ))}
                          {(log.changesSummary || []).length > 3 && (
                            <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>
                              +{(log.changesSummary || []).length - 3} more changes...
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Financial Impact */}
                      <td style={{ textAlign: 'right' }}>
                        {log.actionType === 'CANCELLED' ? (
                          <div>
                            <div style={{ fontWeight: 800, color: '#e11d48' }}>-₹{Number(log.previousAmount || 0).toLocaleString()}</div>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Cancelled</span>
                          </div>
                        ) : log.actionType === 'DELETED' ? (
                          <div>
                            <div style={{ fontWeight: 800, color: '#64748b' }}>₹{Number(log.previousAmount || 0).toLocaleString()}</div>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Deleted</span>
                          </div>
                        ) : log.actionType === 'EDITED' ? (
                          <div>
                            <div style={{ fontWeight: 800, color: (log.diffAmount || 0) >= 0 ? '#059669' : '#e11d48' }}>
                              {(log.diffAmount || 0) >= 0 ? '+' : ''}₹{Number(log.diffAmount || 0).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              New: ₹{Number(log.newAmount || 0).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>
                            ₹{Number(log.newAmount || 0).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* View Diff / Modal Button */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedLogForDetail(log)}
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title="View Full Before/After Details"
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AUDIT LOG FULL DETAILS MODAL */}
      {selectedLogForDetail && (
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
          <div className="card" style={{
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 0,
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              background: selectedLogForDetail.actionType === 'CANCELLED' ? '#fff1f2' : '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                  {getActionBadge(selectedLogForDetail.actionType)}
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    Log ID: {selectedLogForDetail.id}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {selectedLogForDetail.actionTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLogForDetail(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.2rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Meta Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>ORDER REFERENCE</span>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e40af' }}>{selectedLogForDetail.orderId}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>CUSTOMER</span>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{selectedLogForDetail.customerName}</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{selectedLogForDetail.customerMobile}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>MODIFIED BY</span>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#334155' }}>{selectedLogForDetail.actor}</div>
                  <span className="badge badge-slate" style={{ fontSize: '0.68rem' }}>{selectedLogForDetail.role || 'Staff'}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>TIMESTAMP</span>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{selectedLogForDetail.formattedTime}</div>
                </div>
              </div>

              {/* Reason Box */}
              {selectedLogForDetail.reason && (
                <div style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  background: selectedLogForDetail.actionType === 'CANCELLED' ? '#ffe4e6' : '#eff6ff',
                  borderLeft: selectedLogForDetail.actionType === 'CANCELLED' ? '4px solid #e11d48' : '4px solid #3b82f6'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: selectedLogForDetail.actionType === 'CANCELLED' ? '#9f1239' : '#1e40af', marginBottom: '0.25rem' }}>
                    REASON / AUTHORIZATION NOTES
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>
                    "{selectedLogForDetail.reason}"
                  </div>
                </div>
              )}

              {/* Change Summaries Checklist */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
                  Itemized Modifications & Audit Trail:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(selectedLogForDetail.changesSummary || []).map((summary, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.65rem 0.85rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#334155',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <ShieldCheck size={16} color="#059669" />
                      <span>{summary}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Snapshot Details for Deleted/Cancelled Orders */}
              {selectedLogForDetail.snapshot && selectedLogForDetail.snapshot.items && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.6rem' }}>
                    Archived Order Items Snapshot ({selectedLogForDetail.snapshot.items.length} items):
                  </h4>
                  <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table className="erp-table" style={{ margin: 0, fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Item Name</th>
                          <th>Size / Unit</th>
                          <th>Qty</th>
                          <th>Rate</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLogForDetail.snapshot.items.map((it, iIdx) => (
                          <tr key={iIdx}>
                            <td style={{ fontWeight: 700 }}>{it.productName}</td>
                            <td>{it.width && it.height ? `${it.width} × ${it.height} ${it.unit}` : it.unit}</td>
                            <td>{it.qty}</td>
                            <td>₹{it.sellingRate}</td>
                            <td style={{ textAlign: 'right', fontWeight: 800 }}>₹{Number(it.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                {(salesOrders || []).some(o => o.id === selectedLogForDetail.orderId) && onNavigate && (
                  <button
                    onClick={() => {
                      const id = selectedLogForDetail.orderId;
                      setSelectedLogForDetail(null);
                      onNavigate('sales-orders', { selectId: id });
                    }}
                    className="btn btn-secondary"
                  >
                    <ShoppingCart size={15} color="#2563eb" /> Open Order In Sales Hub
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedLogForDetail(null)}
                className="btn btn-primary"
              >
                Close Audit Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
