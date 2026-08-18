import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { CUSTOMER_TYPES } from '../types';
import { CreateCustomerModal } from '../components/modals/CreateCustomerModal';
import { Users, UserPlus, Search, Phone, Mail, Building, AlertTriangle, ShieldCheck, FileText, ShoppingCart, CreditCard, Clock, CheckCircle2, X } from 'lucide-react';

export const CustomersView = ({ onNavigate }) => {
  const { customers, deleteCustomer, salesOrders, payments } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyCust, setHistoryCust] = useState(null);

  const handleCreateForCust = (cust, type = 'Direct') => {
    if (onNavigate) {
      onNavigate('sales-orders', { create: true, initialType: type, initialCust: cust });
    } else {
      const event = new CustomEvent('ERP_NAVIGATE_ORDER_CREATE', { detail: { type, customer: cust } });
      window.dispatchEvent(event);
    }
  };

  const filteredCustomers = (customers || []).filter((c) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch =
      (c.name || '').toLowerCase().includes(q) ||
      (c.mobile || '').includes(q) ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.gstin || '').toLowerCase().includes(q);

    if (selectedType === 'ALL') return matchesSearch;
    return matchesSearch && c.type === selectedType;
  });

  const totalOutstanding = (customers || []).reduce((acc, c) => acc + (Number(c.outstanding ?? c.outstandingAmount) || 0), 0);

  // Customer History Calculations
  const customerOrders = historyCust
    ? (salesOrders || []).filter((o) => o.customerId === historyCust.id || o.customerName === historyCust.name)
    : [];

  const customerPayments = historyCust
    ? (payments || []).filter((p) => p.customerName === historyCust.name || (p.orderId && customerOrders.some((o) => o.id === p.orderId)))
    : [];

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} color="#2563eb" /> Customer Master Directory
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Manage Walk-in, Regular, Dealer, Corporate & Government credit accounts with full ledger history
          </span>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <UserPlus size={16} /> + Add Customer
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL CUSTOMERS</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {customers.length} Accounts
          </h3>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL OUTSTANDING LEDGER</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e11d48', margin: '0.2rem 0' }}>
            ₹{Number(totalOutstanding ?? 0).toLocaleString()}
          </h3>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>DEALER & CORPORATE CLIENTS</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', margin: '0.2rem 0' }}>
            {customers.filter((c) => ['Dealer', 'Corporate', 'Government'].includes(c.type)).length} Accounts
          </h3>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedType('ALL')}
              className={`btn btn-sm ${selectedType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            >
              ALL ({customers.length})
            </button>
            {Object.values(CUSTOMER_TYPES).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`btn btn-sm ${selectedType === t ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ width: '300px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Name, Mobile, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Customer Type</th>
                <th>GSTIN</th>
                <th>State</th>
                <th>Outstanding Balance</th>
                <th>Credit Limit</th>
                <th>Total Orders</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>{c.code || 'N/A'}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setHistoryCust(c)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      title="View Customer Profile & History"
                    >
                      {c.name}
                    </button>
                  </td>
                  <td style={{ fontWeight: 600 }}>{c.mobile || 'N/A'}</td>
                  <td>
                    <span className="badge badge-blue">{c.type || 'Customer'}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{c.gstin || 'Unregistered'}</td>
                  <td>{c.state || 'Maharashtra (27)'}</td>
                  <td style={{ fontWeight: 800, color: (c.outstanding ?? c.outstandingAmount ?? 0) > 0 ? '#e11d48' : '#059669' }}>
                    ₹{Number(c.outstanding ?? c.outstandingAmount ?? 0).toLocaleString()}
                  </td>
                  <td>₹{Number(c.creditLimit ?? c.credit_limit ?? 0).toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>{Number(c.totalOrders ?? c.total_orders ?? 0)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleCreateForCust(c, 'Direct')}
                        className="btn btn-sm btn-primary"
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem', fontWeight: 700 }}
                        title="Create Direct Sales Order"
                      >
                        + Order
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateForCust(c, 'Quotation')}
                        className="btn btn-sm"
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem', background: '#f59e0b', color: '#fff', fontWeight: 700, border: 'none' }}
                        title="Create Optional Quotation"
                      >
                        + Quote
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryCust(c)}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem' }}
                        title="View Full Ledger History"
                      >
                        History
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete Customer "${c.name}"?`)) {
                            deleteCustomer(c.id);
                          }
                        }}
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '0.15rem 0.35rem', border: 'none', color: '#f43f5e' }}
                        title="Delete Customer"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER HISTORY & LEDGER MODAL */}
      {historyCust && (
        <div className="modal-overlay" onClick={() => setHistoryCust(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px', width: '92vw' }}>
            <div className="modal-header" style={{ background: '#0f172a', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="#60a5fa" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  Customer Profile & Ledger History — {historyCust.name}
                </h3>
              </div>
              <button onClick={() => setHistoryCust(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Account Summary Header Card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ACCOUNT CODE</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{historyCust.code || historyCust.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>MOBILE & EMAIL</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{historyCust.mobile}</div>
                  {historyCust.email && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{historyCust.email}</div>}
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>GSTIN & STATE</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af' }}>{historyCust.gstin || 'Unregistered'}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{historyCust.state}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>OUTSTANDING BALANCE</div>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', color: (historyCust.outstanding ?? historyCust.outstandingAmount ?? 0) > 0 ? '#e11d48' : '#059669' }}>
                    ₹{Number(historyCust.outstanding ?? historyCust.outstandingAmount ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Linked Sales Orders & Invoices */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShoppingCart size={16} color="#2563eb" /> Linked Sales Orders & Invoices ({customerOrders.length})
                </h4>
                <div className="table-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Order Date</th>
                        <th>Grand Total</th>
                        <th>Advance</th>
                        <th>Balance</th>
                        <th>Payment Status</th>
                        <th>Production Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerOrders.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '1.25rem', color: '#94a3b8' }}>
                            No sales orders recorded for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        customerOrders.map((o) => (
                          <tr key={o.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#2563eb' }}>{o.id}</td>
                            <td>{o.orderDate}</td>
                            <td style={{ fontWeight: 800 }}>₹{Number(o.grandTotal || 0).toLocaleString()}</td>
                            <td style={{ color: '#059669', fontWeight: 700 }}>₹{Number(o.advanceAmount || 0).toLocaleString()}</td>
                            <td style={{ color: Number(o.balanceAmount || 0) > 0 ? '#e11d48' : '#059669', fontWeight: 800 }}>
                              ₹{Number(o.balanceAmount || 0).toLocaleString()}
                            </td>
                            <td>
                              <span className={`badge ${o.paymentStatus === 'Paid' ? 'badge-emerald' : 'badge-amber'}`}>
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-sky">{o.productionStatus || 'New'}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Linked Payments Received */}
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CreditCard size={16} color="#059669" /> Payments Received History ({customerPayments.length})
                </h4>
                <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Payment Ref</th>
                        <th>Date</th>
                        <th>Order Ref</th>
                        <th>Amount Paid</th>
                        <th>Payment Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerPayments.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '1.25rem', color: '#94a3b8' }}>
                            No payment vouchers recorded for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        customerPayments.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#64748b' }}>{p.id}</td>
                            <td>{p.date}</td>
                            <td style={{ fontWeight: 700, color: '#2563eb' }}>{p.orderId || p.order_id || 'Direct'}</td>
                            <td style={{ fontWeight: 900, color: '#059669' }}>₹{Number(p.amount || 0).toLocaleString()}</td>
                            <td><span className="badge badge-purple">{p.method}</span></td>
                            <td><span className="badge badge-emerald">Verified</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setHistoryCust(null)} className="btn btn-secondary">Close History</button>
            </div>
          </div>
        </div>
      )}

      <CreateCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
