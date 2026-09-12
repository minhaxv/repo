import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { STAGE_STATUS_COLORS, PRODUCTION_STAGES } from '../types';
import { JobCardPrintModal } from '../components/modals/JobCardPrintModal';
import { JobDetailModal } from '../components/modals/JobDetailModal';
import {
  Factory,
  LayoutGrid,
  List,
  Printer,
  Clock,
  UserCheck,
  Building2,
  Palette,
  Scissors,
  Search,
  Filter,
  ShieldAlert,
  CheckCircle2,
  Play,
  Check,
  Cpu,
  User,
  AlertTriangle,
  ChevronRight,
  Eye,
  Calendar,
  Layers,
  ArrowRight,
  Sliders,
  Trash2
} from 'lucide-react';

export const ProductionView = ({ initialStageFilter = 'ALL' }) => {
  const {
    salesOrders,
    employees,
    machines,
    updateJobOrderStage,
    updateItemProductionStatus
  } = useERP();

  const [viewType, setViewType] = useState('kanban'); // 'kanban' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState('ALL');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState('ALL');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedDepartmentTab, setSelectedDepartmentTab] = useState(initialStageFilter); // 'ALL' | 'Designing' | 'Printing' | 'Finishing' | 'Quality Check' | 'Ready for Delivery' | 'Delivered'

  const [selectedJobDetail, setSelectedJobDetail] = useState(null);
  const [selectedJobCardPrint, setSelectedJobCardPrint] = useState(null);

  // 6 Production Board Stages
  const stages = [
    { key: 'Designing', label: 'DESIGNING', icon: Palette, color: '#8b5cf6' },
    { key: 'Printing', label: 'PRINTING', icon: Printer, color: '#2563eb' },
    { key: 'Finishing', label: 'FINISHING', icon: Scissors, color: '#d97706' },
    { key: 'Quality Check', label: 'QUALITY CHECK', icon: CheckCircle2, color: '#059669' },
    { key: 'Ready for Delivery', label: 'READY', icon: CheckCircle2, color: '#0284c7' },
    { key: 'Delivered', label: 'DELIVERY', icon: Factory, color: '#16a34a' }
  ];

  // Flatten all sales order line items into rich Job Cards
  const allJobCards = useMemo(() => {
    const cards = [];
    (salesOrders || []).forEach((o) => {
      (o.items || []).forEach((it, idx) => {
        const jcId = it.jobCardId || `JC-${o.id.split('-').pop()}-${idx + 1}`;
        let itemStatus = it.productionStatus || o.productionStatus || 'New';
        if (itemStatus === 'New') itemStatus = it.designerRequired === 'YES' ? 'Designing' : 'Printing';
        if (itemStatus === 'Design') itemStatus = 'Designing';
        if (itemStatus === 'Ready') itemStatus = 'Ready for Delivery';

        const itemDeliveryDate = it.deliveryDate || o.deliveryDate;
        const todayStr = new Date().toISOString().split('T')[0];
        const isPastDue = itemDeliveryDate && new Date(itemDeliveryDate) < new Date(todayStr) && itemStatus !== 'Delivered';

        // Calculate progress percentage
        let progressPct = 15;
        if (itemStatus === 'Designing') progressPct = it.designStatus === 'Completed' ? 30 : 15;
        else if (itemStatus === 'Printing') progressPct = 45;
        else if (itemStatus === 'Finishing') progressPct = 70;
        else if (itemStatus === 'Quality Check') progressPct = 85;
        else if (itemStatus === 'Ready for Delivery') progressPct = 95;
        else if (itemStatus === 'Delivered') progressPct = 100;

        cards.push({
          id: it.id || `JC-ITEM-${idx + 1}`,
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
          progressPct,
          outsource: !!it.outsource,
          vendorName: it.vendorName || '',
          orderRemarks: o.remarks
        });
      });
    });
    return cards;
  }, [salesOrders]);

  // Filtered Job Cards
  const filteredCards = useMemo(() => {
    return allJobCards.filter((card) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        card.jobCardId.toLowerCase().includes(q) ||
        card.orderId.toLowerCase().includes(q) ||
        card.productName.toLowerCase().includes(q) ||
        (card.customerName && card.customerName.toLowerCase().includes(q)) ||
        (card.material && card.material.toLowerCase().includes(q)) ||
        (card.assignedOperator && card.assignedOperator.toLowerCase().includes(q)) ||
        (card.assignedMachine && card.assignedMachine.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedDepartmentTab !== 'ALL') {
        if (selectedDepartmentTab === 'Designing' && card.productionStatus !== 'Designing') return false;
        if (selectedDepartmentTab === 'Printing' && card.productionStatus !== 'Printing') return false;
        if (selectedDepartmentTab === 'Finishing' && card.productionStatus !== 'Finishing') return false;
        if (selectedDepartmentTab === 'Quality Check' && card.productionStatus !== 'Quality Check') return false;
        if (selectedDepartmentTab === 'Ready for Delivery' && card.productionStatus !== 'Ready for Delivery') return false;
        if (selectedDepartmentTab === 'Delivered' && card.productionStatus !== 'Delivered') return false;
      }

      if (selectedCustomerFilter !== 'ALL' && card.customerName !== selectedCustomerFilter) return false;
      if (selectedMachineFilter !== 'ALL' && card.assignedMachine !== selectedMachineFilter) return false;
      if (selectedEmployeeFilter !== 'ALL' && card.assignedOperator !== selectedEmployeeFilter && card.assignedDesigner !== selectedEmployeeFilter) return false;
      if (selectedPriorityFilter !== 'ALL' && card.jobPriority !== selectedPriorityFilter) return false;
      if (selectedStatusFilter === 'DELAYED' && !card.isDelayed) return false;

      return true;
    });
  }, [allJobCards, searchQuery, selectedDepartmentTab, selectedCustomerFilter, selectedMachineFilter, selectedEmployeeFilter, selectedPriorityFilter, selectedStatusFilter]);

  // Handle 1-click stage advance
  const handleAdvanceStage = async (card, nextStage) => {
    await updateJobOrderStage(
      card.orderId,
      card.item?.id || card.jobCardId,
      nextStage,
      'In Progress',
      '',
      '',
      '',
      '',
      `Advanced to ${nextStage} from Production Board`
    );
  };

  // Get next stage helper
  const getNextStageKey = (currentStage) => {
    switch (currentStage) {
      case 'Designing': return 'Printing';
      case 'Printing': return 'Finishing';
      case 'Finishing': return 'Quality Check';
      case 'Quality Check': return 'Ready for Delivery';
      case 'Ready for Delivery': return 'Delivered';
      default: return null;
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Factory size={24} color="#2563eb" /> ScreenArts Visual Production Board
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Visual multi-stage Kanban tracking Designing, Printing, Finishing, QC, Ready & Delivery across shop floor machines.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setViewType('kanban')}
            className={`btn btn-sm ${viewType === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <LayoutGrid size={15} /> Board View
          </button>
          <button
            onClick={() => setViewType('list')}
            className={`btn btn-sm ${viewType === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <List size={15} /> List View
          </button>
        </div>
      </div>

      {/* Department Tabs & Filter Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Department Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Floor Jobs' },
              { id: 'Designing', label: '🎨 Designing' },
              { id: 'Printing', label: '🖨️ Printing Floor' },
              { id: 'Finishing', label: '✂️ Finishing' },
              { id: 'Quality Check', label: '✅ Quality Check' },
              { id: 'Ready for Delivery', label: '📦 Ready' },
              { id: 'Delivered', label: '🚚 Delivered' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedDepartmentTab(tab.id)}
                className={`btn btn-sm ${selectedDepartmentTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.76rem', padding: '0.25rem 0.6rem' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Job#, Customer, Machine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Filters:</span>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto', fontSize: '0.75rem' }}
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">🚨 Urgent</option>
            <option value="High">⚠️ High</option>
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
          </select>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto', fontSize: '0.75rem' }}
            value={selectedMachineFilter}
            onChange={(e) => setSelectedMachineFilter(e.target.value)}
          >
            <option value="ALL">All Machines</option>
            {(machines || []).map((m) => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>

          <select
            className="form-select form-select-sm"
            style={{ width: 'auto', fontSize: '0.75rem' }}
            value={selectedEmployeeFilter}
            onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
          >
            <option value="ALL">All Operators</option>
            {(employees || []).map((e) => (
              <option key={e.id} value={e.name}>{e.name} ({e.role || e.department})</option>
            ))}
          </select>

          <button
            onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'DELAYED' ? 'ALL' : 'DELAYED')}
            className={`btn btn-sm ${selectedStatusFilter === 'DELAYED' ? 'btn-danger' : 'btn-secondary'}`}
            style={{ fontSize: '0.75rem' }}
          >
            🔴 Show Delayed Only
          </button>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewType === 'kanban' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(290px, 1fr))',
            gap: '0.85rem',
            overflowX: 'auto',
            paddingBottom: '1rem'
          }}
        >
          {stages.map((st) => {
            const cardsInStage = filteredCards.filter((c) => c.productionStatus === st.key);
            const Icon = st.icon;

            return (
              <div
                key={st.key}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '78vh'
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '0.45rem',
                    borderBottom: '2px solid #cbd5e1'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Icon size={16} color={st.color} />
                    <span>{st.label}</span>
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                    {cardsInStage.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {cardsInStage.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                      No jobs in {st.label}
                    </div>
                  ) : (
                    cardsInStage.map((card) => {
                      const nextStage = getNextStageKey(card.productionStatus);
                      const isUrgent = card.jobPriority === 'Urgent';
                      const isHigh = card.jobPriority === 'High';

                      return (
                        <div
                          key={`${card.orderId}-${card.jobCardId}`}
                          className="card"
                          style={{
                            padding: '0.75rem',
                            borderLeft: isUrgent ? '4px solid #ef4444' : isHigh ? '4px solid #f59e0b' : '4px solid #2563eb',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem'
                          }}
                        >
                          {/* Card Top Row: Job# and Priority */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#7c3aed',
                                background: '#f5f3ff',
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px',
                                border: '1px solid #ddd6fe'
                              }}
                            >
                              {card.jobCardId}
                            </span>
                            <span
                              className={`badge ${isUrgent ? 'badge-rose' : isHigh ? 'badge-amber' : 'badge-slate'}`}
                              style={{ fontSize: '0.65rem' }}
                            >
                              {card.jobPriority}
                            </span>
                          </div>

                          {/* Customer & Product */}
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a', lineHeight: 1.3 }}>
                              {card.productName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '1px' }}>
                              👤 <strong>{card.customerName}</strong> {card.careOfName ? `(C/O: ${card.careOfName})` : ''}
                            </div>
                          </div>

                          {/* Qty, Dimensions & Material */}
                          <div style={{ fontSize: '0.74rem', color: '#64748b', background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '6px' }}>
                            <div>📐 {card.dimensions} • <strong>{card.qty} {card.unit}</strong></div>
                            <div style={{ color: '#0284c7', fontWeight: 600 }}>{card.material}</div>
                          </div>

                          {/* Staff & Machine */}
                          <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>👤 {card.assignedOperator || card.assignedDesigner || 'Unassigned'}</span>
                            <span>⚙️ {card.assignedMachine || 'No Machine'}</span>
                          </div>

                          {/* Due Date & Urgency Indicator */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                            <span style={{ color: card.isDelayed ? '#dc2626' : '#d97706', fontWeight: 700 }}>
                              🕒 Due: {card.deliveryDate || 'N/A'}
                            </span>
                            {card.isDelayed && (
                              <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>
                                Delayed
                              </span>
                            )}
                          </div>

                          {/* Progress Bar */}
                          <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${card.progressPct}%`, height: '100%', backgroundColor: '#2563eb' }} />
                          </div>

                          {/* Card Action Buttons */}
                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.3rem', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9' }}>
                            <button
                              onClick={() => setSelectedJobDetail(card)}
                              className="btn btn-sm btn-secondary"
                              style={{ flex: 1, padding: '0.25rem', fontSize: '0.72rem' }}
                              title="Open Full 7-Tab Job Detail Screen"
                            >
                              <Eye size={12} /> Detail
                            </button>

                            <button
                              onClick={() => setSelectedJobCardPrint(card)}
                              className="btn btn-sm btn-secondary btn-icon"
                              style={{ padding: '0.25rem 0.4rem' }}
                              title="Print Job Card"
                            >
                              <Printer size={12} />
                            </button>

                            {nextStage && (
                              <button
                                onClick={() => handleAdvanceStage(card, nextStage)}
                                className="btn btn-sm btn-primary"
                                style={{ flex: 1.2, padding: '0.25rem', fontSize: '0.72rem' }}
                                title={`Advance to ${nextStage}`}
                              >
                                {nextStage === 'Delivered' ? 'Deliver' : nextStage.split(' ')[0]} <ChevronRight size={12} />
                              </button>
                            )}
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

      {/* LIST VIEW */}
      {viewType === 'list' && (
        <div className="card">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Qty / Specs</th>
                  <th>Due Date</th>
                  <th>Stage</th>
                  <th>Assigned Staff / Machine</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) => {
                  const statusStyle = STAGE_STATUS_COLORS[card.productionStatus] || STAGE_STATUS_COLORS['In Progress'];
                  const nextStage = getNextStageKey(card.productionStatus);

                  return (
                    <tr key={`${card.orderId}-${card.jobCardId}`}>
                      <td>
                        <strong style={{ color: '#7c3aed' }}>{card.jobCardId}</strong>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>SO: {card.orderId}</div>
                      </td>
                      <td>
                        <strong>{card.productName}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{card.material}</div>
                      </td>
                      <td>
                        <strong>{card.customerName}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{card.customerMobile || 'N/A'}</div>
                      </td>
                      <td>
                        <strong>{card.qty} {card.unit}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{card.dimensions}</div>
                      </td>
                      <td>
                        <strong style={{ color: card.isDelayed ? '#dc2626' : '#d97706' }}>{card.deliveryDate || 'N/A'}</strong>
                        {card.isDelayed && <span className="badge badge-rose" style={{ display: 'block', width: 'fit-content', marginTop: '2px', fontSize: '0.65rem' }}>Delayed</span>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px', background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}>
                          {card.productionStatus}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem' }}>
                        <div>👤 {card.assignedOperator || card.assignedDesigner || 'Unassigned'}</div>
                        {card.assignedMachine && <div style={{ color: '#64748b' }}>⚙️ {card.assignedMachine}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button onClick={() => setSelectedJobDetail(card)} className="btn btn-sm btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                            <Eye size={12} /> View
                          </button>
                          <button onClick={() => setSelectedJobCardPrint(card)} className="btn btn-sm btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>
                            <Printer size={12} />
                          </button>
                          {nextStage && (
                            <button onClick={() => handleAdvanceStage(card, nextStage)} className="btn btn-sm btn-success" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                              Next <ArrowRight size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7-Tab Job Detail Modal */}
      {selectedJobDetail && (
        <JobDetailModal
          job={selectedJobDetail}
          isOpen={true}
          onClose={() => setSelectedJobDetail(null)}
          onPrintJobCard={(j) => setSelectedJobCardPrint(j)}
        />
      )}

      {/* Job Card Print Modal */}
      {selectedJobCardPrint && (
        <JobCardPrintModal
          selectedItemCard={selectedJobCardPrint}
          isOpen={true}
          onClose={() => setSelectedJobCardPrint(null)}
        />
      )}
    </div>
  );
};
