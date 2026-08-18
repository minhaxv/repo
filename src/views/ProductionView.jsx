import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { PRODUCTION_STATUS } from '../types';
import { JobCardPrintModal } from '../components/modals/JobCardPrintModal';
import { Factory, LayoutGrid, List, Printer, Clock, UserCheck, Building2, Palette, Scissors, Search, Filter, ShieldAlert } from 'lucide-react';

export const ProductionView = () => {
  const { salesOrders, workers, employees, updateItemProductionStatus, assignItemWorkers, calculateJobProfitAndIncentive } = useERP();
  const [viewType, setViewType] = useState('kanban'); // 'kanban' or 'table'
  const [selectedJobCardData, setSelectedJobCardData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const statuses = [
    PRODUCTION_STATUS.NEW,
    PRODUCTION_STATUS.DESIGN,
    PRODUCTION_STATUS.PRINTING,
    PRODUCTION_STATUS.OUTSOURCE,
    PRODUCTION_STATUS.FINISHING,
    PRODUCTION_STATUS.QUALITY_CHECK,
    PRODUCTION_STATUS.READY,
    PRODUCTION_STATUS.DELIVERED
  ];

  // Flatten all sales order line items into individual Product Job Cards
  const allProductJobCards = [];
  salesOrders.forEach((o) => {
    (o.items || []).forEach((it, idx) => {
      const jcId = it.jobCardId || `JC-${o.id.split('-').pop()}-${idx + 1}`;
      const itemStatus = it.productionStatus || o.productionStatus || PRODUCTION_STATUS.NEW;
      const itemDeliveryDate = it.deliveryDate || o.deliveryDate;

      allProductJobCards.push({
        jobCardId: jcId,
        orderId: o.id,
        orderDate: o.orderDate,
        customerName: o.customerName,
        customerMobile: o.customerMobile,
        careOfName: o.careOfName,
        salesPersonName: o.salesPersonName,
        itemIndex: idx + 1,
        item: it,
        productName: it.customTitle ? `${it.productName} — (${it.customTitle})` : it.productName,
        productionStatus: itemStatus,
        deliveryDate: itemDeliveryDate,
        orderRemarks: o.remarks
      });
    });
  });

  // Filter Product Job Cards by Search & Category
  const filteredJobCards = allProductJobCards.filter((card) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      card.jobCardId.toLowerCase().includes(q) ||
      card.orderId.toLowerCase().includes(q) ||
      card.productName.toLowerCase().includes(q) ||
      card.customerName.toLowerCase().includes(q) ||
      (card.item.material && card.item.material.toLowerCase().includes(q));

    if (categoryFilter === 'ALL') return matchesSearch;
    if (categoryFilter === 'OUTSOURCE') return matchesSearch && (card.item.outsource || card.item.vendorId);
    if (categoryFilter === 'DESIGN') return matchesSearch && card.item.designerRequired === 'YES';
    if (categoryFilter === 'FLEX') return matchesSearch && (card.productName.includes('Flex') || card.item.material.includes('Flex'));
    if (categoryFilter === 'VINYL') return matchesSearch && (card.productName.includes('Vinyl') || card.item.material.includes('Vinyl'));
    if (categoryFilter === 'SIGNAGE') return matchesSearch && (card.productName.includes('Sign') || card.productName.includes('Acrylic') || card.productName.includes('Metal'));

    return matchesSearch;
  });

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Factory size={24} color="#2563eb" /> Product-Based Shop-Floor Production Kanban
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Each Product Line Item has its own unique Job Card, promised delivery date, and production stage tracking.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setViewType('kanban')}
            className={`btn btn-sm ${viewType === 'kanban' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <LayoutGrid size={16} /> Kanban Board
          </button>
          <button
            onClick={() => setViewType('table')}
            className={`btn btn-sm ${viewType === 'table' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <List size={16} /> List View
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Job Cards' },
              { id: 'OUTSOURCE', label: 'Outsourced Jobs' },
              { id: 'DESIGN', label: 'Design Required' },
              { id: 'FLEX', label: 'Flex Printing' },
              { id: 'VINYL', label: 'Digital Vinyl' },
              { id: 'SIGNAGE', label: 'Signage & LED' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCategoryFilter(f.id)}
                className={`btn btn-sm ${categoryFilter === f.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search JC#, Product, Customer, Material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* PRODUCT-BASED KANBAN BOARD */}
      {viewType === 'kanban' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, minmax(280px, 1fr))',
          gap: '0.85rem',
          overflowX: 'auto',
          paddingBottom: '1rem'
        }}>
          {statuses.map((status) => {
            const cardsInStatus = filteredJobCards.filter((c) => c.productionStatus === status);

            return (
              <div
                key={status}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '78vh'
                }}
              >
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBottom: '0.4rem',
                  borderBottom: '2px solid #cbd5e1'
                }}>
                  <span>{status}</span>
                  <span className="badge badge-blue">{cardsInStatus.length}</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {cardsInStatus.map((card) => (
                    <div
                      key={card.jobCardId}
                      className="card"
                      style={{
                        padding: '0.75rem',
                        borderLeft: card.item.outsource ? '4px solid #7c3aed' : '4px solid #2563eb',
                        backgroundColor: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      {/* Job Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid #ddd6fe' }}>
                            {card.jobCardId}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '0.3rem' }}>
                            ({card.orderId})
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectedJobCardData(card)}
                          className="btn-secondary btn-icon"
                          style={{ border: 'none', padding: '0.15rem' }}
                          title="Print Product Job Card"
                        >
                          <Printer size={14} color="#3b82f6" />
                        </button>
                      </div>

                      {/* Product Name & Specs */}
                      <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', marginBottom: '0.25rem', lineHeight: '1.2' }}>
                        {card.productName}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#334155', background: '#f1f5f9', padding: '0.25rem 0.4rem', borderRadius: '4px', marginBottom: '0.35rem' }}>
                        <strong>Dimensions:</strong> {card.item.width && card.item.height ? `${card.item.width}×${card.item.height} ${card.item.unit}` : `N/A (${card.item.unit})`}
                        {card.item.totalSqFt > 0 && <span> ({card.item.totalSqFt} sqft)</span>}
                        <span style={{ fontWeight: 700, marginLeft: '0.3rem', color: '#1e40af' }}>Qty: {card.item.qty}</span>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '0.35rem' }}>
                        <strong>Material:</strong> {card.item.material}
                      </div>

                      {/* 0.5% Profit Incentive & Worker Assignments */}
                      {(() => {
                        const order = salesOrders.find(o => o.id === card.orderId);
                        const { itemProfit, incentiveAmount } = calculateJobProfitAndIncentive ? calculateJobProfitAndIncentive(card.item, order, 0.5) : { itemProfit: 0, incentiveAmount: 0 };
                        const allStaff = [...(workers || []), ...(employees || [])];

                        return (
                          <div style={{ background: '#f8fafc', padding: '0.35rem 0.5rem', borderRadius: '6px', margin: '0.35rem 0', border: '1px solid #e2e8f0', fontSize: '0.72rem' }}>
                            <div style={{ fontWeight: 700, color: '#059669', marginBottom: '0.25rem' }}>
                              ⚡ 0.5% Profit Incentive: <strong>₹{incentiveAmount.toFixed(2)}</strong> (Profit: ₹{itemProfit.toLocaleString()})
                            </div>

                            {/* Printer Assignment */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: 600, color: '#1e40af', width: '55px' }}>🖨️ Printer:</span>
                              <select
                                className="form-select form-select-sm"
                                style={{ fontSize: '0.68rem', padding: '0.1rem 0.3rem', flex: 1 }}
                                value={card.item.printerName || 'Vikas Patil'}
                                onChange={(e) => {
                                  const selWorker = allStaff.find(w => w.name === e.target.value);
                                  assignItemWorkers(card.orderId, card.item.id, { printerId: selWorker?.id || 'WRK-01', printerName: e.target.value });
                                }}
                              >
                                {allStaff.map(w => (
                                  <option key={w.id || w.name} value={w.name}>{w.name} ({w.role || w.department || 'Printer'})</option>
                                ))}
                              </select>
                            </div>

                            {/* Finisher Assignment */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ fontWeight: 600, color: '#7c3aed', width: '55px' }}>✂️ Finisher:</span>
                              <select
                                className="form-select form-select-sm"
                                style={{ fontSize: '0.68rem', padding: '0.1rem 0.3rem', flex: 1 }}
                                value={card.item.finisherName || 'Prakash Shinde'}
                                onChange={(e) => {
                                  const selWorker = allStaff.find(w => w.name === e.target.value);
                                  assignItemWorkers(card.orderId, card.item.id, { finisherId: selWorker?.id || 'WRK-03', finisherName: e.target.value });
                                }}
                              >
                                {allStaff.map(w => (
                                  <option key={w.id || w.name} value={w.name}>{w.name} ({w.role || w.department || 'Finisher'})</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Badges for Outsource & Designer */}
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        {card.item.outsource && (
                          <span className="badge badge-violet" style={{ fontSize: '0.65rem' }}>
                            Vendor: {card.item.vendorName || 'Outsourced'}
                          </span>
                        )}
                        {card.item.designerRequired === 'YES' && (
                          <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                            Des: {card.item.designerName || 'Assigned'} ({card.item.artworkStatus || 'Pending'})
                          </span>
                        )}
                      </div>

                      {/* Customer & Delivery Due */}
                      <div style={{ fontSize: '0.72rem', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '0.3rem', marginTop: '0.3rem' }}>
                        <div>Cust: <strong>{card.customerName}</strong></div>
                        <div style={{ color: '#d97706', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem' }}>
                          <Clock size={11} /> Item Promised Due: {card.deliveryDate}
                        </div>
                      </div>

                      {/* Active Work Box Stage Indicator */}
                      {card.productionStatus === 'Design' || card.item.designStatus === 'In Progress' ? (
                        <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#1e40af', margin: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          🎨 WORK IN DESIGN BOX ({card.item.designerName || 'Assigned Designer'})
                        </div>
                      ) : card.productionStatus === 'Printing' ? (
                        <div style={{ background: '#f5f3ff', border: '1px solid #c4b5fd', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#6d28d9', margin: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          🖨️ WORK IN PRINTING (Printer: {card.item.printerName || 'Vikas Patil'})
                        </div>
                      ) : card.productionStatus === 'Finishing' ? (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, color: '#b45309', margin: '0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          ✂️ WORK IN FINISHING (Finisher: {card.item.finisherName || 'Prakash Shinde'})
                        </div>
                      ) : null}

                      {/* Quick Work Stage Action Buttons */}
                      <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {(card.productionStatus === 'New' || card.productionStatus === 'Design') && (
                          <button
                            onClick={() => updateItemProductionStatus(card.orderId, card.item.id, 'Printing')}
                            className="btn btn-sm"
                            style={{ background: '#2563eb', color: '#ffffff', fontWeight: 800, fontSize: '0.72rem', width: '100%', border: 'none', padding: '0.25rem' }}
                          >
                            🖨️ Finish Design ➔ Send to Printing
                          </button>
                        )}

                        {card.productionStatus === 'Printing' && (
                          <button
                            onClick={() => updateItemProductionStatus(card.orderId, card.item.id, 'Finishing')}
                            className="btn btn-sm"
                            style={{ background: '#7c3aed', color: '#ffffff', fontWeight: 800, fontSize: '0.72rem', width: '100%', border: 'none', padding: '0.25rem' }}
                          >
                            ✂️ Printer Finish ➔ Send to Finishing
                          </button>
                        )}

                        {card.productionStatus === 'Finishing' && (
                          <button
                            onClick={() => updateItemProductionStatus(card.orderId, card.item.id, 'Ready for Delivery')}
                            className="btn btn-sm"
                            style={{ background: '#059669', color: '#ffffff', fontWeight: 800, fontSize: '0.72rem', width: '100%', border: 'none', padding: '0.25rem' }}
                          >
                            🚚 Finisher Finish ➔ Mark Ready for Delivery
                          </button>
                        )}
                      </div>

                      {/* Product Item Status Selector */}
                      <div style={{ marginTop: '0.4rem', paddingTop: '0.35rem', borderTop: '1px solid #cbd5e1' }}>
                        <select
                          className="form-select form-select-sm"
                          style={{ fontSize: '0.72rem', fontWeight: 800, background: '#eff6ff', color: '#1e40af' }}
                          value={card.productionStatus}
                          onChange={(e) => updateItemProductionStatus(card.orderId, card.item.id, e.target.value)}
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>Move to: {s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}

                  {cardsInStatus.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>
                      No items in {status}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PRODUCT-BASED TABLE LIST VIEW */}
      {viewType === 'table' && (
        <div className="card">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Job Card #</th>
                  <th>Order #</th>
                  <th>Product Title & Specifications</th>
                  <th>Size / Area</th>
                  <th>Qty</th>
                  <th>Material</th>
                  <th>Customer Name</th>
                  <th>Vendor / Designer</th>
                  <th>Promised Delivery</th>
                  <th>Item Production Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobCards.map((card) => (
                  <tr key={card.jobCardId}>
                    <td style={{ fontWeight: 800, color: '#7c3aed' }}>{card.jobCardId}</td>
                    <td style={{ fontWeight: 700, color: '#1e40af' }}>{card.orderId}</td>
                    <td>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{card.productName}</div>
                      {card.item.description && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{card.item.description}</div>
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {card.item.width && card.item.height ? `${card.item.width}×${card.item.height} ${card.item.unit}` : card.item.unit}
                      {card.item.totalSqFt > 0 && <div style={{ fontSize: '0.72rem', color: '#2563eb' }}>{card.item.totalSqFt} sqft</div>}
                    </td>
                    <td style={{ fontWeight: 800, textAlign: 'center' }}>{card.item.qty}</td>
                    <td style={{ fontSize: '0.78rem' }}>{card.item.material}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{card.customerName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Mob: {card.customerMobile}</div>
                    </td>
                    <td>
                      {card.item.outsource ? (
                        <span className="badge badge-violet">Vendor: {card.item.vendorName || 'Outsourced'}</span>
                      ) : card.item.designerRequired === 'YES' ? (
                        <span className="badge badge-blue">Des: {card.item.designerName || 'Assigned'}</span>
                      ) : (
                        <span className="badge badge-slate">In-House Print</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: '#d97706' }}>{card.deliveryDate}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        style={{ fontWeight: 800 }}
                        value={card.productionStatus}
                        onChange={(e) => updateItemProductionStatus(card.orderId, card.item.id, e.target.value)}
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setSelectedJobCardData(card)}
                        className="btn btn-sm btn-primary"
                        title="Print Product Job Card"
                      >
                        <Printer size={14} /> Printable JC
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Product Job Card Modal */}
      {selectedJobCardData && (
        <JobCardPrintModal
          order={salesOrders.find((o) => o.id === selectedJobCardData.orderId)}
          selectedItemCard={selectedJobCardData}
          isOpen={!!selectedJobCardData}
          onClose={() => setSelectedJobCardData(null)}
        />
      )}
    </div>
  );
};
