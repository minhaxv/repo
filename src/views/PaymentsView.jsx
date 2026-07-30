import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { PAYMENT_METHODS } from '../types';
import { CreditCard, Plus, Search, DollarSign, CheckCircle2, ArrowDownLeft } from 'lucide-react';

export const PaymentsView = () => {
  const { payments, recordPayment, salesOrders } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLogPayOpen, setIsLogPayOpen] = useState(false);

  const [payForm, setPayForm] = useState({
    orderId: salesOrders[0]?.id || '',
    amount: 5000,
    method: PAYMENT_METHODS.UPI,
    refNo: 'UPI/REF-9921'
  });

  const handleRecordPayment = (e) => {
    e.preventDefault();
    if (!payForm.orderId || !payForm.amount) return;

    recordPayment(payForm.orderId, payForm.amount, payForm.method, payForm.refNo);
    alert(`Payment of ₹${payForm.amount} recorded for Order ${payForm.orderId}!`);
    setIsLogPayOpen(false);
  };

  const filteredPayments = payments.filter((p) =>
    p.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={24} color="#059669" /> Payments & Collection Ledger
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Track Cash, UPI, Card & Bank Receipts with verified voucher references
          </span>
        </div>

        <button onClick={() => setIsLogPayOpen(true)} className="btn btn-primary">
          <Plus size={16} /> + Record Payment Voucher
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL COLLECTIONS RECORDED</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', margin: '0.2rem 0' }}>
            ₹{totalCollected.toLocaleString()}
          </h3>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search voucher, order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Voucher ID</th>
                <th>Receipt Date</th>
                <th>Order #</th>
                <th>Customer Name</th>
                <th>Payment Mode</th>
                <th>Ref / UTR Number</th>
                <th>Amount (₹)</th>
                <th>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>{p.id}</td>
                  <td>{p.date}</td>
                  <td style={{ fontWeight: 800, color: '#1e40af' }}>{p.orderId}</td>
                  <td style={{ fontWeight: 700 }}>{p.customerName}</td>
                  <td><span className="badge badge-blue">{p.method}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{p.refNo}</td>
                  <td style={{ fontWeight: 800, color: '#059669' }}>₹{p.amount.toLocaleString()}</td>
                  <td><span className="badge badge-emerald">Verified</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isLogPayOpen && (
        <div className="modal-overlay" onClick={() => setIsLogPayOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Record Payment Receipt Voucher</h3>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Select Sales Order</label>
                  <select
                    className="form-select"
                    value={payForm.orderId}
                    onChange={(e) => setPayForm({ ...payForm, orderId: e.target.value })}
                  >
                    {salesOrders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} — {o.customerName} (Bal: ₹{o.balanceAmount})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Amount Collected (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '1.1rem', fontWeight: 800, color: '#059669' }}
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select
                    className="form-select"
                    value={payForm.method}
                    onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                  >
                    {Object.values(PAYMENT_METHODS).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">UTR / Check / Reference No</label>
                  <input
                    type="text"
                    className="form-control"
                    value={payForm.refNo}
                    onChange={(e) => setPayForm({ ...payForm, refNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsLogPayOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-success">Save Payment Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
