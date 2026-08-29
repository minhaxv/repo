import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { PRODUCTION_STATUS } from '../types';
import { CreateVendorModal } from '../components/modals/CreateVendorModal';
import EditVendorModal from '../components/modals/EditVendorModal';
import { Building2, Plus, Calculator, Check, Calendar, Scissors, Edit, Phone } from 'lucide-react';

export const OutsourceVendorsView = () => {
  const { vendors, salesOrders, updateVendorBill, updateItemProductionStatus } = useERP();
  const [selectedItemForBill, setSelectedItemForBill] = useState(null);
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [billForm, setBillForm] = useState({
    actualBillAmount: 0,
    billDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Paid'
  });

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

  // Extract all outsourced product line items (Product-Based Job Work - Handles 1 or More Vendors Per Item)
  const outsourcedProductJobs = [];
  (salesOrders || []).forEach((o) => {
    (o.items || []).forEach((it, idx) => {
      if (Array.isArray(it.outsourceJobs) && it.outsourceJobs.length > 0) {
        it.outsourceJobs.forEach((job, jIdx) => {
          if (job.vendorId) {
            const jcId = `${it.jobCardId || `JC-${o.id.split('-').pop()}-${idx + 1}`}-${jIdx + 1}`;
            outsourcedProductJobs.push({
              jobCardId: jcId,
              orderId: o.id,
              customerName: o.customerName,
              orderDate: o.orderDate,
              deliveryDate: it.deliveryDate || o.deliveryDate,
              item: {
                ...it,
                vendorId: job.vendorId,
                vendorName: job.vendorName,
                processName: job.processName || 'Outsource Work',
                estimatedVendorCost: parseFloat(job.estCost) || 0,
                actualVendorBill: parseFloat(job.actualVendorBill) || 0
              }
            });
          }
        });
      } else if (it.outsource || it.vendorId) {
        const jcId = it.jobCardId || `JC-${o.id.split('-').pop()}-${idx + 1}`;
        outsourcedProductJobs.push({
          jobCardId: jcId,
          orderId: o.id,
          customerName: o.customerName,
          orderDate: o.orderDate,
          deliveryDate: it.deliveryDate || o.deliveryDate,
          item: it
        });
      }
    });
  });

  const filteredJobs = vendorFilter === 'ALL'
    ? outsourcedProductJobs
    : outsourcedProductJobs.filter((j) => j.item.vendorId === vendorFilter);

  const handleOpenBillModal = (job) => {
    setSelectedItemForBill(job);
    setBillForm({
      actualBillAmount: job.item.actualVendorBill || job.item.estimatedVendorCost || 0,
      billDate: job.item.vendorBillDate || new Date().toISOString().split('T')[0],
      paymentStatus: job.item.vendorPaymentStatus || 'Paid'
    });
  };

  const handleSaveVendorBill = (e) => {
    e.preventDefault();
    if (!selectedItemForBill) return;

    updateVendorBill(
      selectedItemForBill.orderId,
      selectedItemForBill.item.id,
      billForm.actualBillAmount,
      billForm.billDate,
      billForm.paymentStatus
    );

    alert(`Vendor Bill of ₹${billForm.actualBillAmount} updated for Job Card ${selectedItemForBill.jobCardId} (${selectedItemForBill.orderId})!\nSales Order Gross Profit & Margin % automatically recalculated.`);
    setSelectedItemForBill(null);
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={24} color="#7c3aed" /> Outsource Vendors & Job Work
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Manage vendors, track job cards per product, edit supplier profiles, and reconcile bills
          </span>
        </div>

        <button onClick={() => setIsCreateVendorOpen(true)} className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
          <Plus size={16} /> + Create Outsource Vendor
        </button>
      </div>

      {/* Vendor Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div
          onClick={() => setVendorFilter('ALL')}
          className="card"
          style={{
            borderTop: '4px solid #2563eb',
            cursor: 'pointer',
            background: vendorFilter === 'ALL' ? '#eff6ff' : '#ffffff'
          }}
        >
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e40af' }}>All Vendors</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Outsourced Jobs: {outsourcedProductJobs.length}</div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: '#2563eb' }}>
            Click to view all outsource items
          </div>
        </div>

        {(vendors || []).map((v) => {
          const vJobs = outsourcedProductJobs.filter((j) => j.item.vendorId === v.id);
          const totalBill = vJobs.reduce((sum, j) => sum + (j.item.actualVendorBill || 0), 0);
          return (
            <div
              key={v.id}
              className="card"
              style={{
                borderTop: '4px solid #7c3aed',
                cursor: 'pointer',
                background: vendorFilter === v.id ? '#f5f3ff' : '#ffffff',
                position: 'relative'
              }}
              onClick={() => setVendorFilter(v.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{v.name}</div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingVendor(v);
                  }}
                  className="btn btn-sm btn-secondary"
                  style={{ border: 'none', color: '#7c3aed', padding: '0.2rem 0.4rem' }}
                  title="Edit Supplier / Vendor"
                >
                  <Edit size={14} />
                </button>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{v.category} | Active Jobs: {vJobs.length}</div>
              {v.mobile && (
                <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.2rem' }}>
                  <Phone size={12} color="#2563eb" /> {v.mobile}
                </div>
              )}
              <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: (v.pendingPayment || 0) > 0 ? '#e11d48' : '#059669' }}>
                Total Bill: ₹{totalBill.toLocaleString()} | Unpaid: ₹{Number(v.pendingPayment || 0).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Outsourced Job Cards Container */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem' }}>
          <div className="card-title">
            <Scissors size={18} color="#7c3aed" /> Outsourced Product Line Items & Vendor Cost Reconciliation
          </div>
          <span className="badge badge-violet">{filteredJobs.length} Outsourced Products</span>
        </div>

        {/* MOBILE CARDS VIEW */}
        <div className="mobile-only" style={{ padding: '0.75rem' }}>
          {filteredJobs.length === 0 ? (
            <div style={{ textCenter: 'center', padding: '2rem', color: '#94a3b8' }}>
              No outsourced product jobs found for this selection.
            </div>
          ) : (
            filteredJobs.map((job, idx) => (
              <div key={idx} className="mobile-order-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                <div className="mobile-order-card-header">
                  <div>
                    <span className="mobile-order-card-id" style={{ color: '#7c3aed' }}>{job.jobCardId}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.4rem' }}>({job.orderId})</span>
                  </div>
                  <span className={`badge ${job.item.vendorPaymentStatus === 'Paid' ? 'badge-emerald' : 'badge-amber'}`}>
                    {job.item.vendorPaymentStatus || 'Unpaid'}
                  </span>
                </div>

                <div className="mobile-order-card-body">
                  <div className="mobile-order-customer">{job.customerName}</div>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{job.item.productName}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    Size: {job.item.width && job.item.height ? `${job.item.width}×${job.item.height} ${job.item.unit}` : job.item.unit} | Qty: {job.item.qty}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Vendor: </span>
                      <strong style={{ color: '#7c3aed' }}>{job.item.vendorName || 'Outsource Vendor'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Actual Bill: </span>
                      <strong style={{ color: '#0f172a' }}>₹{job.item.actualVendorBill || 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="mobile-order-actions">
                  <button
                    type="button"
                    onClick={() => handleOpenBillModal(job)}
                    className="btn btn-sm btn-primary"
                    style={{ flex: 1, background: '#7c3aed', borderColor: '#7c3aed', fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    Log Vendor Bill
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="desktop-only">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Job Card #</th>
                  <th>SO #</th>
                  <th>Customer</th>
                  <th>Outsourced Product & Specifications</th>
                  <th>Assigned Vendor</th>
                  <th>Promised Delivery</th>
                  <th>Est. Vendor Cost</th>
                  <th>Actual Vendor Bill</th>
                  <th>Bill Status</th>
                  <th>Item Stage Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No outsourced product jobs found for this selection.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 800, color: '#7c3aed' }}>{job.jobCardId}</td>
                      <td style={{ fontWeight: 700, color: '#1e40af' }}>{job.orderId}</td>
                      <td style={{ fontWeight: 700 }}>{job.customerName}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{job.item.productName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                          Size: {job.item.width && job.item.height ? `${job.item.width}×${job.item.height} ${job.item.unit}` : job.item.unit} | Qty: {job.item.qty}
                        </div>
                        {job.item.description && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>Spec: {job.item.description}</div>
                        )}
                      </td>
                      <td><span className="badge badge-violet">{job.item.vendorName || 'Outsource Vendor'}</span></td>
                      <td style={{ fontWeight: 700, color: '#d97706' }}>{job.deliveryDate}</td>
                      <td>₹{job.item.estimatedVendorCost || 0}</td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>₹{job.item.actualVendorBill || 0}</td>
                      <td>
                        <span className={`badge ${job.item.vendorPaymentStatus === 'Paid' ? 'badge-emerald' : 'badge-amber'}`}>
                          {job.item.vendorPaymentStatus || 'Unpaid'}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          style={{ fontSize: '0.74rem', fontWeight: 800 }}
                          value={job.item.productionStatus || PRODUCTION_STATUS.OUTSOURCE}
                          onChange={(e) => updateItemProductionStatus(job.orderId, job.item.id, e.target.value)}
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenBillModal(job)}
                          className="btn btn-sm btn-primary"
                          style={{ background: '#7c3aed', borderColor: '#7c3aed' }}
                        >
                          <Calculator size={14} /> Log Bill
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Vendor Bill Modal */}
      {selectedItemForBill && (
        <div className="modal-overlay" onClick={() => setSelectedItemForBill(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Log Vendor Bill — {selectedItemForBill.jobCardId}</h3>
              <button onClick={() => setSelectedItemForBill(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleSaveVendorBill}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
                <div style={{ background: '#f5f3ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd6fe', fontSize: '0.85rem' }}>
                  <div>Job Card #: <strong>{selectedItemForBill.jobCardId}</strong> (SO: {selectedItemForBill.orderId})</div>
                  <div>Vendor: <strong>{selectedItemForBill.item.vendorName}</strong></div>
                  <div>Product: <strong>{selectedItemForBill.item.productName}</strong></div>
                  <div>Initial Est Cost: <strong>₹{selectedItemForBill.item.estimatedVendorCost}</strong></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Actual Vendor Invoice Bill Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '1.1rem', fontWeight: 800, color: '#7c3aed' }}
                    value={billForm.actualBillAmount}
                    onChange={(e) => setBillForm({ ...billForm, actualBillAmount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label"><Calendar size={14} /> Vendor Invoice Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={billForm.billDate}
                    onChange={(e) => setBillForm({ ...billForm, billDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vendor Payment Status</label>
                  <select
                    className="form-select"
                    value={billForm.paymentStatus}
                    onChange={(e) => setBillForm({ ...billForm, paymentStatus: e.target.value })}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Unpaid">Unpaid / Pending</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedItemForBill(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
                  <Check size={16} /> Save & Recalculate Profit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateVendorModal
        isOpen={isCreateVendorOpen}
        onClose={() => setIsCreateVendorOpen(false)}
        onVendorCreated={(v) => {
          setVendorFilter(v.id);
          setIsCreateVendorOpen(false);
        }}
      />

      {/* Edit Modal */}
      <EditVendorModal
        isOpen={!!editingVendor}
        vendor={editingVendor}
        onClose={() => setEditingVendor(null)}
      />
    </div>
  );
};
