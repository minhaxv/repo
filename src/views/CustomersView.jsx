import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { CUSTOMER_TYPES } from '../types';
import { CreateCustomerModal } from '../components/modals/CreateCustomerModal';
import EditCustomerModal from '../components/modals/EditCustomerModal';
import { Users, UserPlus, Search, Phone, Mail, Building, AlertTriangle, ShieldCheck, FileText, ShoppingCart, CreditCard, Clock, CheckCircle2, X, Edit, UserCheck, Wallet, BookOpen, Download, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatINR } from '../utils/reportEngine';

export const CustomersView = ({ onNavigate }) => {
  const { customers, deleteCustomer, salesOrders, payments, careOfPersons } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState(null);
  const [historyCust, setHistoryCust] = useState(null);
  const [historyTab, setHistoryTab] = useState('statement');

  const handleCreateForCust = (cust, type = 'Direct') => {
    if (onNavigate) {
      onNavigate('sales-orders', { create: true, initialType: type, initialCust: cust });
    } else {
      const event = new CustomEvent('ERP_NAVIGATE_ORDER_CREATE', { detail: { type, customer: cust } });
      window.dispatchEvent(event);
    }
  };

  // Helper to extract all contact numbers for a customer
  const getCustomerNumbers = (c) => {
    if (!c) return [];
    let addMobiles = [];
    if (c.additionalMobiles) {
      addMobiles = Array.isArray(c.additionalMobiles) ? c.additionalMobiles : [c.additionalMobiles];
    } else if (c.additional_mobiles) {
      try {
        addMobiles = typeof c.additional_mobiles === 'string' ? JSON.parse(c.additional_mobiles) : c.additional_mobiles;
      } catch (e) {
        addMobiles = [c.additional_mobiles];
      }
    }
    return [c.mobile, ...(Array.isArray(addMobiles) ? addMobiles : [])]
      .filter(Boolean)
      .map((n) => String(n).toLowerCase());
  };

  const filteredCustomers = (customers || []).filter((c) => {
    const q = (searchQuery || '').toLowerCase();
    const numbers = getCustomerNumbers(c);
    const matchesNumbers = numbers.some(n => n.includes(q));

    const matchesSearch =
      (c.name || '').toLowerCase().includes(q) ||
      matchesNumbers ||
      (c.code || '').toLowerCase().includes(q) ||
      (c.gstin || '').toLowerCase().includes(q);

    if (selectedType === 'ALL') return matchesSearch;
    return matchesSearch && c.type === selectedType;
  });

  const totalOutstanding = (customers || []).reduce((acc, c) => acc + (Number(c.outstanding ?? c.outstandingAmount) || 0), 0);

  const activeHistoryCustomer = historyCust ? (customers || []).find((c) => c.id === historyCust.id) || historyCust : null;

  // Customer History Calculations
  const customerOrders = activeHistoryCustomer
    ? (salesOrders || []).filter((o) => o.customerId === activeHistoryCustomer.id || o.customerName === activeHistoryCustomer.name)
    : [];

  const customerPayments = activeHistoryCustomer
    ? (payments || []).filter((p) => p.customerName === activeHistoryCustomer.name || (p.orderId && customerOrders.some((o) => o.id === p.orderId)))
    : [];

  // Chronological Customer Account Ledger Statement
  const customerLedgerStatement = useMemo(() => {
    if (!activeHistoryCustomer) return [];
    const entries = [];

    // 1. Opening Balance Entry
    const opAmount = Number(activeHistoryCustomer.openingBalance ?? activeHistoryCustomer.opening_balance ?? 0);
    const opType = activeHistoryCustomer.openingBalanceType || activeHistoryCustomer.opening_balance_type || 'Receivable';
    const isPayable = opType === 'Payable';

    if (opAmount > 0) {
      entries.push({
        id: `OB-${activeHistoryCustomer.id}`,
        date: activeHistoryCustomer.openingBalanceDate || activeHistoryCustomer.opening_balance_date || activeHistoryCustomer.createdAt || '2026-04-01',
        voucherType: 'Opening Balance',
        badgeClass: 'badge-purple',
        refNo: activeHistoryCustomer.openingBalanceNotes || activeHistoryCustomer.opening_balance_notes || `OB-${activeHistoryCustomer.code || activeHistoryCustomer.id}`,
        narration: `Initial Opening Balance (${opType})${activeHistoryCustomer.openingBalanceNotes ? ' — ' + activeHistoryCustomer.openingBalanceNotes : ''}`,
        debit: !isPayable ? opAmount : 0,
        credit: isPayable ? opAmount : 0
      });
    }

    // 2. Sales Orders & Invoices
    (customerOrders || []).forEach((o) => {
      entries.push({
        id: o.id,
        date: o.orderDate || '2026-04-01',
        voucherType: 'Sales Invoice',
        badgeClass: 'badge-blue',
        refNo: o.id,
        narration: `Tax Invoice for Order ${o.id} (${(o.items || []).length || 1} items)`,
        debit: Number(o.grandTotal || 0),
        credit: 0
      });
    });

    // 3. Payment Receipts
    (customerPayments || []).forEach((p) => {
      entries.push({
        id: p.id,
        date: p.date || p.paid_date || '2026-04-01',
        voucherType: 'Payment Receipt',
        badgeClass: 'badge-emerald',
        refNo: p.id,
        narration: `Payment received via ${p.method || 'Cash'}${p.orderId ? ' for ' + p.orderId : ''}`,
        debit: 0,
        credit: Number(p.amount || 0)
      });
    });

    // Sort chronologically ascending
    entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    // Compute Running Outstanding Balance
    let running = 0;
    return entries.map((item) => {
      running = Number((running + item.debit - item.credit).toFixed(2));
      return {
        ...item,
        runningBalance: running
      };
    });
  }, [activeHistoryCustomer, customerOrders, customerPayments]);

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
                <th>Care Of Agent</th>
                <th>GSTIN</th>
                <th>State</th>
                <th>Outstanding Balance</th>
                <th>Credit Limit</th>
                <th>Total Orders</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => {
                const linkedCareOf = (careOfPersons || []).find((co) => co.id === (c.careOfId || c.care_of_id));
                const careOfDisplayName = c.careOfName || c.care_of_name || linkedCareOf?.name || '';
                return (
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
                    <td style={{ fontWeight: 600 }}>
                      {(() => {
                        let extraMobiles = [];
                        if (c.additionalMobiles) {
                          extraMobiles = Array.isArray(c.additionalMobiles) ? c.additionalMobiles : [c.additionalMobiles];
                        } else if (c.additional_mobiles) {
                          try {
                            extraMobiles = typeof c.additional_mobiles === 'string' ? JSON.parse(c.additional_mobiles) : c.additional_mobiles;
                          } catch (e) {
                            extraMobiles = [c.additional_mobiles];
                          }
                        }
                        const cleanExtra = (extraMobiles || []).filter(Boolean);

                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <a href={c.mobile ? `tel:${c.mobile}` : undefined} style={{ color: '#0f172a', textDecoration: 'none' }} title="Primary Mobile">
                                {c.mobile || 'N/A'}
                              </a>
                            </div>
                            {cleanExtra.length > 0 && (
                              <div style={{ marginTop: '0.2rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                {cleanExtra.map((em, idx) => (
                                  <span
                                    key={idx}
                                    className="badge badge-slate"
                                    style={{ fontSize: '0.67rem', padding: '0.05rem 0.35rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                    title={`Alternate Phone #${idx + 1}`}
                                  >
                                    📞 {em}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td>
                      <span className="badge badge-blue">{c.type || 'Customer'}</span>
                    </td>
                    <td>
                      {careOfDisplayName ? (
                        <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <UserCheck size={11} /> {careOfDisplayName}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>— Direct</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{c.gstin || 'Unregistered'}</td>
                    <td>{c.state || 'Maharashtra (27)'}</td>
                    <td style={{ fontWeight: 800, color: (c.outstanding ?? c.outstandingAmount ?? 0) > 0 ? '#e11d48' : '#059669' }}>
                      <div>₹{Number(c.outstanding ?? c.outstandingAmount ?? 0).toLocaleString()}</div>
                      {Number(c.openingBalance ?? c.opening_balance ?? 0) > 0 && (
                        <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                          OB: ₹{Number(c.openingBalance ?? c.opening_balance ?? 0).toLocaleString()} ({c.openingBalanceType || c.opening_balance_type || 'Dr'})
                        </div>
                      )}
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
                          onClick={() => setEditingCust(c)}
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.72rem', color: '#2563eb' }}
                          title="Edit Customer Profile & Care Of Agent"
                        >
                          <Edit size={12} /> Edit
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER HISTORY & LEDGER MODAL */}
      {historyCust && (
        <div className="modal-overlay">
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ACCOUNT CODE</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{activeHistoryCustomer.code || activeHistoryCustomer.id}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>CONTACT NUMBERS & EMAIL</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>📱 {activeHistoryCustomer.mobile}</span>
                    <span className="badge badge-blue" style={{ fontSize: '0.62rem', padding: '0.05rem 0.3rem' }}>Primary</span>
                  </div>
                  {activeHistoryCustomer.email && <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>✉️ {activeHistoryCustomer.email}</div>}
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>GSTIN & TYPE</div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1e40af' }}>{activeHistoryCustomer.gstin || 'Unregistered'}</div>
                  <div style={{ marginTop: '0.2rem' }}>
                    <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{activeHistoryCustomer.type || 'Regular'}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>CREDIT & COMMISSION</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                    Limit: ₹{Number(activeHistoryCustomer.creditLimit ?? activeHistoryCustomer.credit_limit ?? 10000).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700, marginTop: '0.15rem' }}>
                    Commission: {Number(activeHistoryCustomer.referralCommissionPct ?? activeHistoryCustomer.referral_commission_pct ?? 0.2)}%
                  </div>
                </div>

                {/* Opening Balance Card with Edit Action */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Wallet size={12} color="#2563eb" /> OPENING BALANCE
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingCust(activeHistoryCustomer)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '0.1rem 0.35rem', fontSize: '0.68rem', height: 'auto', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                      title="Edit Customer"
                    >
                      <Edit size={10} /> Edit
                    </button>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e40af', marginTop: '0.15rem' }}>
                    ₹{Number(activeHistoryCustomer.openingBalance ?? activeHistoryCustomer.opening_balance ?? 0).toLocaleString()}
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginLeft: '0.3rem' }}>
                      ({activeHistoryCustomer.openingBalanceType || activeHistoryCustomer.opening_balance_type || 'Receivable'})
                    </span>
                  </div>
                  {activeHistoryCustomer.openingBalanceDate && (
                    <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
                      Date: {activeHistoryCustomer.openingBalanceDate}
                    </div>
                  )}
                </div>

                {/* Outstanding Balance */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CURRENT OUTSTANDING</div>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem', color: (activeHistoryCustomer.outstanding ?? activeHistoryCustomer.outstandingAmount ?? 0) > 0 ? '#e11d48' : '#059669', marginTop: '0.15rem' }}>
                    ₹{Number(activeHistoryCustomer.outstanding ?? activeHistoryCustomer.outstandingAmount ?? 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
                    Live Ledger Balance
                  </div>
                </div>

                {/* Full Address Row */}
                <div style={{ gridColumn: '1 / -1', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#334155' }}>
                  <strong>Address: </strong>
                  {activeHistoryCustomer.address || 'N/A'}
                  {activeHistoryCustomer.city ? `, ${activeHistoryCustomer.city}` : ''}
                  {activeHistoryCustomer.district ? `, ${activeHistoryCustomer.district}` : ''}
                  {activeHistoryCustomer.state ? `, ${activeHistoryCustomer.state}` : ''}
                  {activeHistoryCustomer.pincode ? ` - ${activeHistoryCustomer.pincode}` : ''}
                </div>
              </div>

              {/* History Sub-Navigation Tabs */}
              <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setHistoryTab('statement')}
                  className={`btn btn-sm ${historyTab === 'statement' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
                >
                  <BookOpen size={14} /> Full Account Statement ({customerLedgerStatement.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('orders')}
                  className={`btn btn-sm ${historyTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <ShoppingCart size={14} /> Sales Orders & Invoices ({customerOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('payments')}
                  className={`btn btn-sm ${historyTab === 'payments' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <CreditCard size={14} /> Payments Received ({customerPayments.length})
                </button>
              </div>

              {/* TAB 1: FULL ACCOUNT STATEMENT / CHRONOLOGICAL LEDGER */}
              {historyTab === 'statement' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Formula: <strong>Opening Balance + Sales/Invoiced Amount − Payments = Outstanding</strong>
                    </div>
                  </div>

                  <div className="table-responsive" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Transaction / Type</th>
                          <th>Ref #</th>
                          <th>Particulars / Narration</th>
                          <th style={{ textAlign: 'right' }}>Debit (Dr)</th>
                          <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
                          <th style={{ textAlign: 'right' }}>Running Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerLedgerStatement.length === 0 ? (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                              No account transactions recorded for this customer yet.
                            </td>
                          </tr>
                        ) : (
                          customerLedgerStatement.map((entry, idx) => (
                            <tr key={`${entry.id}-${idx}`} style={{ backgroundColor: entry.voucherType === 'Opening Balance' ? '#f0fdf4' : undefined }}>
                              <td style={{ fontWeight: 600 }}>{entry.date}</td>
                              <td>
                                <span className={`badge ${entry.badgeClass}`}>
                                  {entry.voucherType}
                                </span>
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#2563eb' }}>{entry.refNo}</td>
                              <td style={{ fontSize: '0.82rem', color: '#334155' }}>{entry.narration}</td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: entry.debit > 0 ? '#1e40af' : '#94a3b8' }}>
                                {entry.debit > 0 ? formatINR(entry.debit) : '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700, color: entry.credit > 0 ? '#059669' : '#94a3b8' }}>
                                {entry.credit > 0 ? formatINR(entry.credit) : '—'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 900, color: entry.runningBalance > 0 ? '#e11d48' : '#059669' }}>
                                {formatINR(entry.runningBalance)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {customerLedgerStatement.length > 0 && (
                        <tfoot>
                          <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #cbd5e1' }}>
                            <td colSpan="4">TOTAL CUMULATIVE SUMMARY</td>
                            <td style={{ textAlign: 'right', color: '#1e40af' }}>
                              {formatINR(customerLedgerStatement.reduce((sum, e) => sum + e.debit, 0))}
                            </td>
                            <td style={{ textAlign: 'right', color: '#059669' }}>
                              {formatINR(customerLedgerStatement.reduce((sum, e) => sum + e.credit, 0))}
                            </td>
                            <td style={{ textAlign: 'right', color: '#e11d48', fontSize: '1rem', fontWeight: 900 }}>
                              {formatINR(activeHistoryCustomer.outstanding ?? activeHistoryCustomer.outstandingAmount ?? 0)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: LINKED SALES ORDERS & INVOICES */}
              {historyTab === 'orders' && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShoppingCart size={16} color="#2563eb" /> Linked Sales Orders & Invoices ({customerOrders.length})
                  </h4>
                  <div className="table-responsive" style={{ maxHeight: '240px', overflowY: 'auto' }}>
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
              )}

              {/* TAB 3: LINKED PAYMENTS RECEIVED */}
              {historyTab === 'payments' && (
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CreditCard size={16} color="#059669" /> Payments Received History ({customerPayments.length})
                  </h4>
                  <div className="table-responsive" style={{ maxHeight: '240px', overflowY: 'auto' }}>
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
              )}
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

      <EditCustomerModal
        isOpen={!!editingCust}
        customer={editingCust}
        onClose={() => setEditingCust(null)}
        onCustomerUpdated={(updated) => {
          if (historyCust && updated?.id === historyCust.id) {
            setHistoryCust((prev) => ({ ...prev, ...updated }));
          }
        }}
      />
    </div>
  );
};
