import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { formatINR } from '../utils/reportEngine';
import {
  Trash2,
  Plus,
  Search,
  Filter,
  TrendingDown,
  Layers,
  Factory,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Calendar,
  Save,
  X,
  PieChart
} from 'lucide-react';

export const WastageView = () => {
  const { wastageRecords, salesOrders, inventory, updateJobWastage, activeUser } = useERP();

  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for direct wastage logging
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [producedQty, setProducedQty] = useState('');
  const [materialUsed, setMaterialUsed] = useState('');
  const [unit, setUnit] = useState('Sq.Ft');
  const [reason, setReason] = useState('Setup Scrap / Color Calibration');

  // Flatten active sales orders into selectable items
  const selectableItems = useMemo(() => {
    const list = [];
    (salesOrders || []).forEach((o) => {
      (o.items || []).forEach((i) => {
        list.push({
          orderId: o.id,
          itemId: i.id || i.jobCardId,
          jobCardId: i.jobCardId || `JC-${o.id}`,
          customerName: o.customerName,
          productName: i.productName,
          material: i.material,
          qty: i.qty || 1,
          unit: i.unit || 'Sq.Ft'
        });
      });
    });
    return list;
  }, [salesOrders]);

  const activeSelectedLine = selectableItems.find(
    (i) => i.orderId === selectedOrderId && (i.itemId === selectedItemId || i.jobCardId === selectedItemId)
  );

  // Auto-calculated wastage in form
  const calcWasteQty = Math.max(0, (Number(materialUsed) || 0) - (Number(producedQty) || 0));
  const calcWastePct = Number(materialUsed) > 0 ? parseFloat(((calcWasteQty / Number(materialUsed)) * 100).toFixed(1)) : 0;

  const handleLogWastage = async (e) => {
    e.preventDefault();
    if (!selectedOrderId || !selectedItemId) return;

    await updateJobWastage(selectedOrderId, selectedItemId, {
      producedQty: Number(producedQty) || activeSelectedLine?.qty || 1,
      materialUsed: Number(materialUsed) || (Number(producedQty) + calcWasteQty),
      wastageQty: calcWasteQty,
      wastagePct: calcWastePct,
      unit: unit || activeSelectedLine?.unit || 'Sq.Ft',
      reason,
      recordedBy: activeUser?.name || 'Shop Floor Supervisor'
    });

    setIsModalOpen(false);
    setProducedQty('');
    setMaterialUsed('');
  };

  // Compile all wastage logs: both from wastageRecords and embedded in sales orders
  const allLogs = useMemo(() => {
    const logs = [...(wastageRecords || [])];
    (salesOrders || []).forEach((o) => {
      (o.items || []).forEach((it) => {
        if (it.wastageHistory && it.wastageHistory.length > 0) {
          it.wastageHistory.forEach((h) => {
            if (!logs.some((l) => l.id === h.id)) {
              logs.push(h);
            }
          });
        } else if (it.wastageQty && it.wastageQty > 0) {
          if (!logs.some((l) => l.orderId === o.id && (l.itemId === it.id || l.itemId === it.jobCardId))) {
            logs.push({
              id: `WST-${o.id}-${it.jobCardId || it.id}`,
              orderId: o.id,
              itemId: it.id || it.jobCardId,
              customerName: o.customerName,
              productName: it.productName,
              material: it.material,
              producedQty: it.producedQty || it.qty,
              materialUsed: it.materialUsed || it.qty + it.wastageQty,
              wastageQty: it.wastageQty,
              wastagePct: it.wastagePct || 0,
              unit: it.unit || 'Sq.Ft',
              reason: it.wastageReason || 'Trim & Calibration Scrap',
              recordedBy: 'Production Operator',
              recordedAt: o.orderDate || new Date().toISOString()
            });
          }
        }
      });
    });
    return logs;
  }, [wastageRecords, salesOrders]);

  // Filtered Logs
  const filteredLogs = allLogs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (log.orderId || '').toLowerCase().includes(q) ||
      (log.productName || '').toLowerCase().includes(q) ||
      (log.material || '').toLowerCase().includes(q) ||
      (log.reason || '').toLowerCase().includes(q) ||
      (log.recordedBy || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (reasonFilter !== 'ALL' && log.reason !== reasonFilter) return false;
    return true;
  });

  // Metrics
  const totalWastageScrap = allLogs.reduce((sum, l) => sum + (Number(l.wastageQty) || 0), 0);
  const avgWastagePct = allLogs.length > 0 ? (allLogs.reduce((sum, l) => sum + (Number(l.wastagePct) || 0), 0) / allLogs.length).toFixed(1) : '0.0';

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trash2 size={24} color="#dc2626" /> Printing Material Wastage & Scrap Register
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Track media consumption, trim bleeds, calibration setups, and automatic percentage loss per Job Order.
          </span>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> + Log Wastage Entry
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
          <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 800 }}>TOTAL SCRAP RECORDED</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {totalWastageScrap.toLocaleString()} Units
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Across all print runs</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 800 }}>AVERAGE WASTAGE %</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>
            {avgWastagePct}%
          </div>
          <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>Industry Benchmark: ~6-8%</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
          <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 800 }}>LOGGED ENTRIES</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {allLogs.length} Records
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Linked to Job Cards</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', fontSize: '0.75rem' }}
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
            >
              <option value="ALL">All Scrap Reasons</option>
              <option value="Setup Scrap / Color Calibration">Setup Scrap / Color Calibration</option>
              <option value="Head Banding / Ink Smudge">Head Banding / Ink Smudge</option>
              <option value="Trimming & Edge Bleed Waste">Trimming & Edge Bleed Waste</option>
              <option value="Media Jam / Wrinkle">Media Jam / Wrinkle</option>
              <option value="Lamination Bubble Defect">Lamination Bubble Defect</option>
            </select>
          </div>

          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search by Job, Product, Reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Wastage Records Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Job # / Order</th>
                <th>Product & Substrate</th>
                <th>Good Output Qty</th>
                <th>Total Feed Consumed</th>
                <th>Wastage Scrap</th>
                <th>Wastage %</th>
                <th>Scrap Reason</th>
                <th>Recorded By / Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No wastage entries found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td>
                      <strong style={{ color: '#7c3aed' }}>{log.orderId}</strong>
                      {log.itemId && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Item: {log.itemId}</div>}
                    </td>
                    <td>
                      <strong>{log.productName || 'Print Product'}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{log.material || 'Raw Substrate'}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        {log.producedQty} {log.unit}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>
                        {log.materialUsed} {log.unit}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 800, color: '#dc2626' }}>
                        {log.wastageQty} {log.unit}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${Number(log.wastagePct) > 10 ? 'badge-rose' : Number(log.wastagePct) > 5 ? 'badge-amber' : 'badge-emerald'}`}
                        style={{ fontSize: '0.72rem', fontWeight: 800 }}
                      >
                        {log.wastagePct}%
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.78rem', color: '#475569' }}>{log.reason}</span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      <div>👤 {log.recordedBy || 'Operator'}</div>
                      <div>🕒 {log.recordedAt ? new Date(log.recordedAt).toLocaleDateString() : 'Today'}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Wastage Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={20} color="#dc2626" />
                <h3 style={{ margin: 0, fontWeight: 800 }}>Log Job Order Wastage & Scrap</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogWastage} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Select Active Job Card / Order Line *</label>
                <select
                  className="form-select"
                  required
                  value={selectedItemId}
                  onChange={(e) => {
                    const sel = selectableItems.find((i) => i.itemId === e.target.value || i.jobCardId === e.target.value);
                    if (sel) {
                      setSelectedOrderId(sel.orderId);
                      setSelectedItemId(sel.itemId);
                      setUnit(sel.unit);
                      setProducedQty(sel.qty);
                      setMaterialUsed(Math.round(sel.qty * 1.08));
                    }
                  }}
                >
                  <option value="">-- Choose Job Order Item --</option>
                  {selectableItems.map((it) => (
                    <option key={`${it.orderId}-${it.itemId}`} value={it.itemId}>
                      {it.jobCardId} • {it.productName} ({it.customerName} - {it.qty} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              {activeSelectedLine && (
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                  <div><strong style={{ color: '#475569' }}>Order:</strong> {activeSelectedLine.orderId} • 👤 {activeSelectedLine.customerName}</div>
                  <div><strong style={{ color: '#475569' }}>Substrate:</strong> {activeSelectedLine.material}</div>
                  <div><strong style={{ color: '#475569' }}>Target Order Qty:</strong> {activeSelectedLine.qty} {activeSelectedLine.unit}</div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Good Produced Qty *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 500"
                    required
                    value={producedQty}
                    onChange={(e) => setProducedQty(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Total Feed Consumed *</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 540"
                    required
                    value={materialUsed}
                    onChange={(e) => setMaterialUsed(e.target.value)}
                  />
                </div>
              </div>

              {/* Live Calculated Scrap Gauge */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 800, textTransform: 'uppercase' }}>CALCULATED SCRAP LOSS</span>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#dc2626' }}>
                    {calcWasteQty} {unit}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: '#991b1b', fontWeight: 800, textTransform: 'uppercase' }}>WASTAGE %</span>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#dc2626' }}>
                    {calcWastePct}%
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Scrap Reason *</label>
                <select
                  className="form-select"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  <option value="Setup Scrap / Color Calibration">Setup Scrap / Color Calibration</option>
                  <option value="Head Banding / Ink Smudge">Head Banding / Ink Smudge</option>
                  <option value="Trimming & Edge Bleed Waste">Trimming & Edge Bleed Waste</option>
                  <option value="Media Jam / Wrinkle">Media Jam / Wrinkle</option>
                  <option value="Lamination Bubble Defect">Lamination Bubble Defect</option>
                  <option value="Substrate Material Defect">Substrate Material Defect</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  <Save size={15} /> Save Wastage Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
