import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Search, ShoppingCart, Users, Package, Building2, User, X, ArrowRight } from 'lucide-react';

export const GlobalSearchModal = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    salesOrders,
    customers,
    products,
    vendors,
    salesPersons
  } = useERP();

  const [query, setQuery] = useState('');

  // Key combination listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const q = (query || '').trim().toLowerCase();

  // Search matching
  const matchingOrders = q
    ? (salesOrders || []).filter(
        (o) =>
          (o.id || '').toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.customerMobile || '').includes(q) ||
          (o.referenceNo && o.referenceNo.toLowerCase().includes(q))
      )
    : (salesOrders || []).slice(0, 4);

  const matchingCustomers = q
    ? (customers || []).filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.mobile || '').includes(q) ||
          (c.code || '').toLowerCase().includes(q) ||
          (c.gstin && c.gstin.toLowerCase().includes(q))
      )
    : (customers || []).slice(0, 3);

  const matchingProducts = q
    ? (products || []).filter((p) => (p.name || '').toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q))
    : [];

  const matchingVendors = q
    ? vendors.filter((v) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q))
    : [];

  return (
    <div className="modal-overlay" onClick={() => setIsSearchOpen(false)}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '750px', top: '10%', position: 'absolute' }}
      >
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Search size={22} color="#3b82f6" />
          <input
            type="text"
            placeholder="Type Sales Order #, Mobile, Customer, Product, Vendor..."
            style={{
              flex: 1,
              border: 'none',
              fontSize: '1.05rem',
              outline: 'none',
              fontFamily: 'inherit',
              fontWeight: 600,
              color: '#0f172a'
            }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button onClick={() => setIsSearchOpen(false)} className="btn-secondary btn-icon" style={{ border: 'none' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1rem' }}>
          {/* Sales Orders Section */}
          {matchingOrders.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ShoppingCart size={14} color="#2563eb" /> Sales Orders ({matchingOrders.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {matchingOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => {
                      setIsSearchOpen(false);
                      // Select order tab
                      window.dispatchEvent(new CustomEvent('ERP_NAVIGATE_ORDER', { detail: o.id }));
                    }}
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e40af' }}>
                        {o.id} <span style={{ color: '#475569', fontWeight: 500 }}>— {o.customerName}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Mobile: {o.customerMobile || 'N/A'} | Delivery: {o.deliveryDate || 'N/A'} | Amount: ₹{Number(o.grandTotal ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <span className="badge badge-blue">{o.productionStatus}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers Section */}
          {matchingCustomers.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Users size={14} color="#059669" /> Customers ({matchingCustomers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {matchingCustomers.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                        {c.name} <span style={{ color: '#059669', fontSize: '0.75rem' }}>({c.type})</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Mobile: {c.mobile || 'N/A'} | Code: {c.code || 'N/A'} | Outstanding: ₹{Number(c.outstanding ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <span className="badge badge-slate">{c.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products & Vendors */}
          {matchingProducts.length > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Package size={14} color="#d97706" /> Master Products ({matchingProducts.length})
              </div>
              {matchingProducts.map((p) => (
                <div key={p.id} style={{ padding: '0.5rem 0.85rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '0.25rem', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{p.name}</span>
                  <strong>₹{p.defaultRate} / {p.unit}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
          <span>Press <strong>ESC</strong> to close</span>
          <span>Fast Global Navigation</span>
        </div>
      </div>
    </div>
  );
};
