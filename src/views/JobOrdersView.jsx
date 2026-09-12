import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { STAGE_STATUS_COLORS, PRODUCTION_STAGES } from '../types';
import { formatINR } from '../utils/reportEngine';
import { JobDetailModal } from '../components/modals/JobDetailModal';
import { JobCardPrintModal } from '../components/modals/JobCardPrintModal';
import {
  Factory,
  Search,
  Filter,
  Plus,
  Printer,
  Sliders,
  Calendar,
  Layers,
  Cpu,
  User,
  Scissors,
  CheckSquare,
  Truck,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
  ChevronRight,
  Eye,
  Edit
} from 'lucide-react';

export const JobOrdersView = ({ onNavigate }) => {
  const { salesOrders, workers, employees, machines, vendors } = useERP();

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [machineFilter, setMachineFilter] = useState('ALL');

  const [selectedJobForDetail, setSelectedJobForDetail] = useState(null);
  const [selectedJobForPrint, setSelectedJobForPrint] = useState(null);

  // Flatten all sales order line items into rich Job Orders
  const allJobOrders = useMemo(() => {
    const jobs = [];
    (salesOrders || []).forEach((o) => {
      (o.items || []).forEach((it, idx) => {
        const jcId = it.jobCardId || `JC-${o.id.split('-').pop()}-${idx + 1}`;
        const itemStatus = it.productionStatus || o.productionStatus || 'New';
        const itemDeliveryDate = it.deliveryDate || o.deliveryDate;

        // Costing calculations
        const estCost = Number(it.estimatedCost || 0);
        const actCost = Number(it.actualCost || estCost);
        const sellPrice = Number(it.amount || (it.sellingRate * (it.qty || 1)) || 0);
        const grossProfit = sellPrice - actCost;
        const grossMarginPct = sellPrice > 0 ? ((grossProfit / sellPrice) * 100).toFixed(1) : 0;

        // Check if delayed
        const isPastDue = itemDeliveryDate && new Date(itemDeliveryDate) < new Date(new Date().toISOString().split('T')[0]) && itemStatus !== 'Delivered';

        jobs.push({
          id: it.id || `JOB-${idx + 1}`,
          jobCardId: jcId,
          orderId: o.id,
          orderDate: o.orderDate || o.createdAt?.split('T')[0],
          deliveryDate: itemDeliveryDate,
          isDelayed: isPastDue,
          customerId: o.customerId,
          customerName: o.customerName,
          customerMobile: o.customerMobile,
          careOfName: o.careOfName,
          salesPersonName: o.salesPersonName,
          itemIndex: idx + 1,
          item: it,
          productName: it.customTitle ? `${it.productName} — (${it.customTitle})` : it.productName,
          category: it.category || 'Print Job',
          qty: it.qty || 1,
          unit: it.unit || 'Sq.Ft',
          dimensions: it.totalSqFt ? `${it.totalSqFt} Sq.Ft (${it.width}x${it.height})` : `${it.width || 0}x${it.height || 0} ${it.unit || ''}`,
          material: it.material || 'Standard Substrate',
          productionStatus: itemStatus,
          jobPriority: it.jobPriority || 'Normal',
          assignedDesigner: it.designerName || '',
          assignedOperator: it.assignedOperatorName || it.printerName || '',
          assignedMachine: it.assignedMachineName || '',
          estimatedCost: estCost,
          actualCost: actCost,
          sellingPrice: sellPrice,
          grossProfit: grossProfit,
          grossMarginPct: grossMarginPct,
          wastageQty: it.wastageQty || 0,
          wastagePct: it.wastagePct || 0,
          outsource: !!it.outsource,
          vendorName: it.vendorName || '',
          orderRemarks: o.remarks
        });
      });
    });
    return jobs;
  }, [salesOrders]);

  // Filtered Job Orders
  const filteredJobs = useMemo(() => {
    return allJobOrders.filter((job) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        job.jobCardId.toLowerCase().includes(q) ||
        job.orderId.toLowerCase().includes(q) ||
        job.productName.toLowerCase().includes(q) ||
        (job.customerName && job.customerName.toLowerCase().includes(q)) ||
        (job.material && job.material.toLowerCase().includes(q)) ||
        (job.assignedOperator && job.assignedOperator.toLowerCase().includes(q)) ||
        (job.assignedMachine && job.assignedMachine.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (stageFilter !== 'ALL') {
        if (stageFilter === 'Designing' && job.productionStatus !== 'Designing' && job.productionStatus !== 'Design') return false;
        if (stageFilter === 'Printing' && job.productionStatus !== 'Printing') return false;
        if (stageFilter === 'Finishing' && job.productionStatus !== 'Finishing') return false;
        if (stageFilter === 'Quality Check' && job.productionStatus !== 'Quality Check') return false;
        if (stageFilter === 'Ready for Delivery' && job.productionStatus !== 'Ready for Delivery') return false;
        if (stageFilter === 'Delivered' && job.productionStatus !== 'Delivered') return false;
      }

      if (statusFilter === 'DELAYED' && !job.isDelayed) return false;
      if (statusFilter === 'OUTSOURCE' && !job.outsource) return false;

      if (priorityFilter !== 'ALL' && job.jobPriority !== priorityFilter) return false;
      if (machineFilter !== 'ALL' && job.assignedMachine !== machineFilter) return false;

      return true;
    });
  }, [allJobOrders, searchQuery, stageFilter, statusFilter, priorityFilter, machineFilter]);

  // Key KPI metrics
  const totalJobsCount = allJobOrders.length;
  const activeJobsCount = allJobOrders.filter((j) => j.productionStatus !== 'Delivered' && j.productionStatus !== 'Cancelled').length;
  const delayedJobsCount = allJobOrders.filter((j) => j.isDelayed).length;
  const readyJobsCount = allJobOrders.filter((j) => j.productionStatus === 'Ready for Delivery').length;

  return (
    <div className="view-container">
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Factory size={24} color="#2563eb" /> Job Orders Production Central
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            The central production engine of ScreenArts ERP • Track specifications, machine queues, costing & delivery
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigate ? onNavigate('production') : window.dispatchEvent(new CustomEvent('ERP_NAVIGATE_PRODUCTION'))}
            className="btn btn-secondary"
            style={{ fontWeight: 700 }}
          >
            <Factory size={16} /> Production Board
          </button>
          <button
            onClick={() => onNavigate ? onNavigate('sales-orders', { create: true }) : window.dispatchEvent(new CustomEvent('ERP_NAVIGATE_ORDER_CREATE', { detail: {} }))}
            className="btn btn-primary"
          >
            <Plus size={16} /> + New Job Order
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800 }}>ACTIVE SHOP-FLOOR JOBS</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {activeJobsCount} Jobs
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Total Registered: {totalJobsCount}</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 800 }}>DELAYED / OVERDUE JOBS</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', margin: '0.2rem 0' }}>
            {delayedJobsCount} Delayed
          </div>
          <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>Action Required on Floor</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #059669' }}>
          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 800 }}>READY FOR DELIVERY</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', margin: '0.2rem 0' }}>
            {readyJobsCount} Ready
          </div>
          <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>Awaiting Dispatch</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #7c3aed' }}>
          <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 800 }}>ESTIMATED PRODUCTION VALUE</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {formatINR(allJobOrders.reduce((sum, j) => sum + j.sellingPrice, 0))}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
            Gross Profit: {formatINR(allJobOrders.reduce((sum, j) => sum + j.grossProfit, 0))}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Stage Buttons */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Jobs' },
              { id: 'Designing', label: 'Designing' },
              { id: 'Printing', label: 'Printing' },
              { id: 'Finishing', label: 'Finishing' },
              { id: 'Quality Check', label: 'QC' },
              { id: 'Ready for Delivery', label: 'Ready' },
              { id: 'Delivered', label: 'Delivered' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStageFilter(st.id)}
                className={`btn btn-sm ${stageFilter === st.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.76rem', padding: '0.25rem 0.6rem' }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div style={{ width: '300px', position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Job#, Customer, Product, Machine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Filters:</span>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto', fontSize: '0.75rem' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">🚨 Urgent Priority</option>
            <option value="High">⚠️ High Priority</option>
            <option value="Normal">Normal Priority</option>
            <option value="Low">Low Priority</option>
          </select>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto', fontSize: '0.75rem' }}
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
          >
            <option value="ALL">All Machines</option>
            {(machines || []).map((m) => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>

          <button
            onClick={() => setStatusFilter(statusFilter === 'DELAYED' ? 'ALL' : 'DELAYED')}
            className={`btn btn-sm ${statusFilter === 'DELAYED' ? 'btn-danger' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem' }}
          >
            🔴 Show Delayed Only ({delayedJobsCount})
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === 'OUTSOURCE' ? 'ALL' : 'OUTSOURCE')}
            className={`btn btn-sm ${statusFilter === 'OUTSOURCE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem' }}
          >
            📦 Outsourced Jobs Only
          </button>
        </div>
      </div>

      {/* Job Orders Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Job #</th>
                <th>Product & Specifications</th>
                <th>Customer & Care Of</th>
                <th>Qty / Dimensions</th>
                <th>Due Date</th>
                <th>Stage & Status</th>
                <th>Assigned Staff / Machine</th>
                <th style={{ textAlign: 'right' }}>Selling Price</th>
                <th style={{ textAlign: 'right' }}>Est. Cost</th>
                <th style={{ textAlign: 'right' }}>Profit (Margin)</th>
                <th style={{ textAlign: 'center', width: '120px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No Job Orders matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((j) => {
                  const statusStyle = STAGE_STATUS_COLORS[j.productionStatus] || STAGE_STATUS_COLORS['In Progress'] || { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' };

                  return (
                    <tr key={`${j.orderId}-${j.jobCardId}`}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.45rem', borderRadius: '4px', border: '1px solid #ddd6fe', display: 'inline-block', fontSize: '0.78rem' }}>
                          {j.jobCardId}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                          Ref: {j.orderId}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{j.productName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{j.material}</div>
                        {j.outsource && (
                          <span className="badge badge-purple" style={{ fontSize: '0.66rem', marginTop: '2px' }}>
                            Outsourced: {j.vendorName || 'Vendor'}
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{j.customerName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {j.careOfName ? `C/O: ${j.careOfName}` : `📱 ${j.customerMobile || 'N/A'}`}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: '#2563eb' }}>{j.qty} {j.unit}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{j.dimensions}</div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: j.isDelayed ? '#dc2626' : '#d97706' }}>
                          {j.deliveryDate || 'Standard'}
                        </div>
                        {j.isDelayed && (
                          <span className="badge badge-rose" style={{ fontSize: '0.66rem' }}>
                            Delayed
                          </span>
                        )}
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            background: statusStyle.bg,
                            color: statusStyle.text,
                            border: `1px solid ${statusStyle.border}`,
                            display: 'inline-block'
                          }}
                        >
                          {j.productionStatus}
                        </span>
                        <div style={{ marginTop: '2px' }}>
                          <span className={`badge ${j.jobPriority === 'Urgent' ? 'badge-rose' : j.jobPriority === 'High' ? 'badge-amber' : 'badge-slate'}`} style={{ fontSize: '0.66rem' }}>
                            {j.jobPriority}
                          </span>
                        </div>
                      </td>

                      <td style={{ fontSize: '0.75rem' }}>
                        {j.assignedOperator && <div>👤 {j.assignedOperator}</div>}
                        {j.assignedMachine && <div style={{ color: '#64748b' }}>⚙️ {j.assignedMachine}</div>}
                        {!j.assignedOperator && !j.assignedMachine && <span style={{ color: '#94a3b8' }}>Unassigned</span>}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {formatINR(j.sellingPrice)}
                      </td>

                      <td style={{ textAlign: 'right', color: '#64748b' }}>
                        {formatINR(j.actualCost || j.estimatedCost)}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700, color: j.grossProfit >= 0 ? '#059669' : '#dc2626' }}>
                        {formatINR(j.grossProfit)}
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>({j.grossMarginPct}%)</span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedJobForDetail(j)}
                            className="btn btn-sm btn-primary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                            title="Open Full 7-Tab Job Detail Screen"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            onClick={() => setSelectedJobForPrint(j)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                            title="Print Shop-Floor Job Card"
                          >
                            <Printer size={13} />
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
      </div>

      {/* 7-Tab Job Detail Modal */}
      {selectedJobForDetail && (
        <JobDetailModal
          job={selectedJobForDetail}
          isOpen={true}
          onClose={() => setSelectedJobForDetail(null)}
          onPrintJobCard={(j) => setSelectedJobForPrint(j)}
        />
      )}

      {/* Job Card Print Modal */}
      {selectedJobForPrint && (
        <JobCardPrintModal
          selectedItemCard={selectedJobForPrint}
          isOpen={true}
          onClose={() => setSelectedJobForPrint(null)}
        />
      )}
    </div>
  );
};
