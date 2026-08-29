import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { SignatureModal } from '../components/modals/SignatureModal';
import { Truck, CheckCircle2, PenTool, Clock, ShieldAlert, Package, Phone, Search, Lock, Unlock, DollarSign } from 'lucide-react';

export const DeliveryView = () => {
  const { salesOrders, recordPayment, companyBankAccounts } = useERP();
  const [activeTab, setActiveTab] = useState('READY'); // 'READY', 'DELIVERED', 'ALL'
  const [sigOrder, setSigOrder] = useState(null);
  const [collectPaymentOrder, setCollectPaymentOrder] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [bankAccountId, setBankAccountId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter orders based on production status & tabs
  const filteredOrders = (salesOrders || []).filter((o) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (o.id || '').toLowerCase().includes(q) ||
      (o.customerName || '').toLowerCase().includes(q) ||
      (o.customerMobile && o.customerMobile.includes(q)) ||
      (o.items && o.items.some((i) => (i.productName || '').toLowerCase().includes(q)));

    if (!matchesSearch) return false;

    const isOrderReady = o.productionStatus === 'Ready for Delivery' || o.productionStatus === 'Ready';
    const isOrderDelivered = o.productionStatus === 'Delivered';
    const hasReadyItems = o.items && o.items.some((i) => i.productionStatus === 'Ready for Delivery' || i.productionStatus === 'Ready');

    if (activeTab === 'READY') {
      return (isOrderReady || hasReadyItems) && !isOrderDelivered;
    }
    if (activeTab === 'DELIVERED') {
      return isOrderDelivered;
    }
    return true;
  });

  const handleCollectPaymentSubmit = (e) => {
    e.preventDefault();
    if (!collectPaymentOrder) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;

    const selectedBank = (companyBankAccounts || []).find((b) => b.id === bankAccountId);
    recordPayment(
      collectPaymentOrder.id,
      amt,
      payMethod,
      `DISPATCH-${Date.now().toString().slice(-4)}`,
      selectedBank?.id || '',
      selectedBank?.bankName || ''
    );

    alert(`Payment of ₹${amt.toLocaleString()} collected successfully via ${payMethod}!\nAccount: ${selectedBank?.bankName || 'Cash Counter'}\nOrder balance cleared and delivery unlocked.`);
    setCollectPaymentOrder(null);
    setPayAmount('');
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Truck size={24} color="#2563eb" /> Delivery & Dispatch Operations
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Enforce 100% Payment Clearance before dispatch & capture digital customer signatures upon handover.
          </span>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#e2e8f0', padding: '0.2rem', borderRadius: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('READY')}
            className={`btn btn-sm ${activeTab === 'READY' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <Package size={14} /> Ready ({ (salesOrders || []).filter((o) => o.productionStatus === 'Ready for Delivery' || o.productionStatus === 'Ready').length })
          </button>
          <button
            onClick={() => setActiveTab('DELIVERED')}
            className={`btn btn-sm ${activeTab === 'DELIVERED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            <CheckCircle2 size={14} /> Delivered ({ (salesOrders || []).filter((o) => o.productionStatus === 'Delivered').length })
          </button>
          <button
            onClick={() => setActiveTab('ALL')}
            className={`btn btn-sm ${activeTab === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
          >
            All ({ (salesOrders || []).length })
          </button>
        </div>
      </div>

      {/* Enforcement Warning Banner */}
      <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <ShieldAlert size={22} color="#e11d48" />
        <div>
          <strong style={{ color: '#9f1239', fontSize: '0.9rem' }}>Strict 100% Payment Clearance Policy Active</strong>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#be123c' }}>
            Goods dispatch and digital signature capture are <strong>LOCKED</strong> for orders with an outstanding balance. Clear 100% balance payment to unlock customer delivery.
          </p>
        </div>
      </div>

      {/* Search & Filter Card */}
      <div className="card" style={{ padding: '0.75rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Package size={16} color="#2563eb" /> Active Dispatch Queue
          </div>
          <div style={{ width: '100%', maxWidth: '300px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Order #, Customer, Mobile, Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Dispatch Container */}
      <div className="card" style={{ padding: 0 }}>
        {/* MOBILE CARDS VIEW */}
        <div className="mobile-only" style={{ padding: '0.75rem' }}>
          {filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              No delivery orders found for this filter tab.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isCleared = (order.balanceAmount || 0) <= 0;
              const isDelivered = order.productionStatus === 'Delivered';

              return (
                <div key={order.id} className="mobile-order-card" style={{ borderLeft: `4px solid ${isDelivered ? '#059669' : isCleared ? '#2563eb' : '#e11d48'}` }}>
                  <div className="mobile-order-card-header">
                    <div>
                      <span className="mobile-order-card-id">{order.id}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.4rem' }}>({order.deliveryDate})</span>
                    </div>
                    <span className={`badge ${isDelivered ? 'badge-emerald' : 'badge-amber'}`}>
                      {order.productionStatus}
                    </span>
                  </div>

                  <div className="mobile-order-card-body">
                    <div className="mobile-order-customer">{order.customerName}</div>
                    {order.customerMobile && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mob: {order.customerMobile}</div>
                    )}

                    <div style={{ marginTop: '0.4rem' }}>
                      {(order.items || []).map((it, idx) => (
                        <div key={idx} style={{ fontSize: '0.78rem', color: '#0f172a' }}>
                          • <strong>{it.productName}</strong> ({it.width && it.height ? `${it.width}×${it.height} ${it.unit}` : it.unit}, Qty: {it.qty})
                        </div>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.35rem', borderTop: '1px dashed #e2e8f0' }}>
                      <div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Balance Due: </span>
                        {isCleared ? (
                          <strong style={{ color: '#059669' }}>₹0 (100% Cleared)</strong>
                        ) : (
                          <strong style={{ color: '#e11d48' }}>₹{Number(order.balanceAmount || 0).toLocaleString()}</strong>
                        )}
                      </div>
                      {order.signatureUrl && (
                        <span className="badge badge-emerald">Signed</span>
                      )}
                    </div>
                  </div>

                  <div className="mobile-order-actions">
                    {isDelivered ? (
                      <span className="badge badge-emerald" style={{ padding: '0.35rem 0.65rem', width: '100%', textAlign: 'center' }}>
                        <CheckCircle2 size={13} /> Dispatched & Signed
                      </span>
                    ) : isCleared ? (
                      <button
                        onClick={() => setSigOrder(order)}
                        className="btn btn-sm btn-primary"
                        style={{ flex: 1, fontWeight: 700 }}
                      >
                        <PenTool size={14} /> Dispatch & Sign
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setCollectPaymentOrder(order);
                          setPayAmount(order.balanceAmount);
                        }}
                        className="btn btn-sm"
                        style={{ flex: 1, background: '#e11d48', borderColor: '#be123c', color: '#ffffff', fontWeight: 800 }}
                      >
                        <DollarSign size={14} /> Collect ₹{Number(order.balanceAmount || 0).toLocaleString()}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="desktop-only">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer Name & Contact</th>
                  <th>Product Packages & Specs</th>
                  <th>Dispatch Mode</th>
                  <th>Delivery Due Date</th>
                  <th>Balance Due</th>
                  <th>Order Stage</th>
                  <th>Customer Signature</th>
                  <th style={{ textAlign: 'center' }}>Dispatch Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No delivery orders found for this filter tab.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isCleared = (order.balanceAmount || 0) <= 0;
                    const isDelivered = order.productionStatus === 'Delivered';

                    return (
                      <tr key={order.id} style={{ background: !isCleared && !isDelivered ? '#fff1f2' : 'inherit' }}>
                        <td style={{ fontWeight: 800, color: '#1e40af' }}>{order.id}</td>

                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{order.customerName}</div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Phone size={11} /> {order.customerMobile}
                          </div>
                          {order.careOfName && (
                            <div style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: 600 }}>Care Of: {order.careOfName}</div>
                          )}
                        </td>

                        <td>
                          {(order.items || []).map((it, idx) => (
                            <div key={idx} style={{ fontSize: '0.78rem', marginBottom: '2px' }}>
                              • <strong style={{ color: '#0f172a' }}>{it.productName}</strong>
                              <span style={{ color: '#475569' }}> ({it.width && it.height ? `${it.width}×${it.height} ${it.unit}` : it.unit}, Qty: {it.qty})</span>
                              <span style={{ fontSize: '0.68rem', color: '#7c3aed', marginLeft: '4px', fontWeight: 700 }}>[{it.jobCardId || `JC-${order.id.split('-').pop()}-${idx+1}`}]</span>
                            </div>
                          ))}
                        </td>

                        <td>
                          <span className="badge badge-blue">{order.deliveryMode || 'Local Express'}</span>
                          {order.deliveredBy && (
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>By: <strong>{order.deliveredBy}</strong></div>
                          )}
                          {(() => {
                            const orderProfit = Number(order.grossProfit || (order.grandTotal ? (order.grandTotal - (order.totalActualCost || order.totalEstimatedCost || 0)) : 0)) || Math.round(Number(order.subtotal || 0) * 0.35);
                            const deliveryIncentive = Math.round(orderProfit * 0.005 * 100) / 100;
                            return (
                              <div style={{ fontSize: '0.68rem', color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.15rem 0.3rem', borderRadius: '4px', marginTop: '3px', fontWeight: 700 }}>
                                🚚 Delivery 0.5% Incentive: ₹{deliveryIncentive.toFixed(2)}
                              </div>
                            );
                          })()}
                        </td>

                        <td style={{ fontWeight: 700, color: '#d97706' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Clock size={12} /> {order.deliveryDate}
                          </div>
                        </td>

                        <td>
                          {isCleared ? (
                            <span className="badge badge-emerald" style={{ fontWeight: 800 }}>₹0 (100% Cleared)</span>
                          ) : (
                            <span className="badge badge-rose" style={{ fontWeight: 800, fontSize: '0.78rem' }}>
                              ₹{Number(order.balanceAmount || 0).toLocaleString()} Pending
                            </span>
                          )}
                        </td>

                        <td>
                          <span className={`badge ${isDelivered ? 'badge-emerald' : 'badge-amber'}`}>
                            {order.productionStatus}
                          </span>
                        </td>

                        <td>
                          {order.signatureUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <img src={order.signatureUrl} alt="Signature" style={{ height: '26px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff' }} />
                              <span className="badge badge-emerald">Signed</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pending Signature</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {isDelivered ? (
                            <span className="badge badge-emerald" style={{ padding: '0.35rem 0.65rem' }}>
                              <CheckCircle2 size={13} /> Dispatched & Signed
                            </span>
                          ) : isCleared ? (
                            <button
                              onClick={() => setSigOrder(order)}
                              className="btn btn-sm btn-primary"
                            >
                              <PenTool size={14} /> Dispatch & Sign
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setCollectPaymentOrder(order);
                                setPayAmount(order.balanceAmount);
                              }}
                              className="btn btn-sm"
                              style={{ background: '#e11d48', borderColor: '#be123c', color: '#ffffff', fontWeight: 800, boxShadow: '0 2px 4px rgba(225,29,72,0.2)' }}
                            >
                              <DollarSign size={14} /> Collect ₹{Number(order.balanceAmount || 0).toLocaleString()}
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
      </div>

      {/* Collect Balance Payment Modal */}
      {collectPaymentOrder && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '440px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ padding: '1rem 1.25rem', background: 'linear-gradient(135deg, #e11d48, #be123c)', color: '#ffffff', fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={18} /> Clear Outstanding Balance to Unlock Delivery
              </div>
              <button onClick={() => setCollectPaymentOrder(null)} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleCollectPaymentSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: '#fff1f2', padding: '0.85rem', borderRadius: '8px', border: '1px solid #fecdd3', fontSize: '0.84rem' }}>
                <div>Order #: <strong>{collectPaymentOrder.id}</strong></div>
                <div>Customer: <strong>{collectPaymentOrder.customerName}</strong> (Mob: {collectPaymentOrder.customerMobile})</div>
                <div style={{ color: '#e11d48', fontWeight: 900, fontSize: '1rem', marginTop: '0.3rem' }}>
                  Outstanding Balance Due: ₹{Number(collectPaymentOrder.balanceAmount || 0).toLocaleString()}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Payment Amount Collected (₹)</label>
                <input
                  type="number"
                  required
                  className="form-control"
                  style={{ fontWeight: 800, fontSize: '1.15rem', color: '#059669', borderColor: '#a7f3d0' }}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Payment Mode</label>
                <select
                  className="form-select"
                  value={payMethod}
                  onChange={(e) => {
                    setPayMethod(e.target.value);
                    if (e.target.value === 'Cash Counter' || e.target.value === 'Cash') {
                      setBankAccountId('');
                    }
                  }}
                >
                  <option value="Cash Counter">Cash Counter (Cash)</option>
                  <option value="UPI">UPI / QR Code Scan</option>
                  <option value="Card">Credit/Debit Card Terminal</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                </select>
              </div>

              {payMethod !== 'Cash Counter' && payMethod !== 'Cash' && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700, color: '#1e40af' }}>
                    Deposit Company Bank Account
                  </label>
                  <select
                    className="form-select"
                    style={{ fontWeight: 700, background: '#eff6ff', color: '#1e40af' }}
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                  >
                    <option value="">Select Deposit Bank Account</option>
                    {(companyBankAccounts || []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} ({(b.accountNo || '').slice(-4)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setCollectPaymentOrder(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669', fontWeight: 800 }}>
                  <Unlock size={14} /> Clear Balance & Unlock Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      <SignatureModal
        order={sigOrder}
        isOpen={!!sigOrder}
        onClose={() => setSigOrder(null)}
      />
    </div>
  );
};
