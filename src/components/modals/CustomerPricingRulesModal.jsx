import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserCheck, X, Plus, Trash2, Check, AlertCircle, ShieldCheck, Tag } from 'lucide-react';

export const CustomerPricingRulesModal = ({ isOpen, onClose, initialCustomerId = '', initialProductId = '' }) => {
  const { customerPricingRules, saveCustomerPricingRule, deleteCustomerPricingRule, customers, products } = useERP();

  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId || '');
  const [selectedProductId, setSelectedProductId] = useState(initialProductId || '');
  const [pricingType, setPricingType] = useState('CONTRACT_RATE');
  const [customRate, setCustomRate] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [minQty, setMinQty] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState(10);
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Filter rules by customer or product if selected
  const filteredRules = useMemo(() => {
    return (customerPricingRules || []).filter(r => {
      if (selectedCustomerId && r.customerId !== selectedCustomerId) return false;
      if (selectedProductId && r.productId !== selectedProductId) return false;
      return true;
    });
  }, [customerPricingRules, selectedCustomerId, selectedProductId]);

  if (!isOpen) return null;

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setStatusMsg({ type: 'error', text: 'Please select a customer.' });
      return;
    }
    if (pricingType === 'CONTRACT_RATE' && (!customRate || Number(customRate) <= 0)) {
      setStatusMsg({ type: 'error', text: 'Please provide a valid contract rate.' });
      return;
    }
    if (pricingType === 'PERCENT_DISCOUNT' && (!discountPct || Number(discountPct) <= 0)) {
      setStatusMsg({ type: 'error', text: 'Please provide a valid discount percentage.' });
      return;
    }

    const customerObj = (customers || []).find(c => c.id === selectedCustomerId);
    const productObj = (products || []).find(p => p.id === selectedProductId);

    setIsSaving(true);
    setStatusMsg({ type: '', text: '' });
    try {
      await saveCustomerPricingRule({
        id: `CPR-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customerId: selectedCustomerId,
        customerName: customerObj?.name || '',
        productId: selectedProductId || null,
        productCategory: productObj?.category || null,
        pricingType,
        customRate: pricingType === 'CONTRACT_RATE' ? Number(customRate) : null,
        discountPct: pricingType === 'PERCENT_DISCOUNT' ? Number(discountPct) : null,
        minQty: Number(minQty || 1),
        startDate: startDate || null,
        endDate: endDate || null,
        priority: Number(priority || 1),
        active: true,
        notes: notes.trim()
      });

      setStatusMsg({ type: 'success', text: 'Customer pricing rule created successfully!' });
      setCustomRate('');
      setDiscountPct('');
      setNotes('');
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save customer rule' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this customer pricing rule?')) return;
    try {
      await deleteCustomerPricingRule(ruleId);
    } catch (err) {
      alert('Failed to delete rule: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '94vw', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.15)' }}>
              <UserCheck size={22} color="#93c5fd" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Customer-Specific Pricing & Contracted Rates
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#bfdbfe' }}>
                Configure contracted rates, wholesale tiers, and negotiated discounts for select accounts.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* New Rule Creation Form */}
          <form onSubmit={handleCreateRule} className="card" style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={16} color="#2563eb" />
                Add New Customer Contract Rate / Discount Tier
              </h4>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Takes precedence over catalogue standard pricing
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              
              {/* Customer Selector */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="form-select form-select-sm"
                >
                  <option value="">-- Select Customer --</option>
                  {(customers || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type || 'Regular'})</option>
                  ))}
                </select>
              </div>

              {/* Product Selector */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Applicable Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="form-select form-select-sm"
                >
                  <option value="">All Products (Entire Catalogue)</option>
                  {(products || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit || 'Sq.Ft'})</option>
                  ))}
                </select>
              </div>

              {/* Pricing Type */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Pricing Rule Type *
                </label>
                <select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value)}
                  className="form-select form-select-sm"
                  style={{ fontWeight: 700, color: '#1d4ed8' }}
                >
                  <option value="CONTRACT_RATE">Fixed Contract Rate (₹/unit)</option>
                  <option value="PERCENT_DISCOUNT">Percentage Discount (%)</option>
                  <option value="COST_MARKUP">Cost Plus Markup (%)</option>
                </select>
              </div>

              {/* Value Input */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  {pricingType === 'CONTRACT_RATE' ? 'Contract Rate (₹) *' : 'Discount / Markup % *'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748b' }}>
                    {pricingType === 'CONTRACT_RATE' ? '₹' : '%'}
                  </span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={pricingType === 'CONTRACT_RATE' ? customRate : discountPct}
                    onChange={(e) => pricingType === 'CONTRACT_RATE' ? setCustomRate(e.target.value) : setDiscountPct(e.target.value)}
                    placeholder={pricingType === 'CONTRACT_RATE' ? 'e.g. 12.00' : 'e.g. 15'}
                    required
                    className="form-control form-control-sm"
                    style={{ fontWeight: 800, color: '#1d4ed8' }}
                  />
                </div>
              </div>

              {/* Min Qty */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Min Quantity Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={minQty}
                  onChange={(e) => setMinQty(parseInt(e.target.value) || 1)}
                  className="form-control form-control-sm"
                />
              </div>

              {/* Validity Dates */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-control form-control-sm"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-control form-control-sm"
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                >
                  <Plus size={14} />
                  {isSaving ? 'Saving...' : 'Add Pricing Rule'}
                </button>
              </div>

            </div>

            {/* Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contract or agreement reference (e.g. Annual advertising contract 2026)"
                className="form-control form-control-sm"
              />
            </div>

            {/* Status alerts */}
            {statusMsg.text && (
              <div style={{
                marginTop: '0.65rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: statusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: statusMsg.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${statusMsg.type === 'success' ? '#a7f3d0' : '#fca5a5'}`
              }}>
                {statusMsg.type === 'success' ? <Check size={14} color="#10b981" /> : <AlertCircle size={14} color="#ef4444" />}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </form>

          {/* Active Rules List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} color="#10b981" />
                Active Customer Pricing Rules ({filteredRules.length})
              </h4>
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId('')}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear Customer Filter
                </button>
              )}
            </div>

            <div className="table-responsive" style={{ border: '1px solid #cbd5e1', borderRadius: '8px' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Target Product</th>
                    <th>Rule Type</th>
                    <th style={{ textAlign: 'right' }}>Negotiated Rate / Discount</th>
                    <th style={{ textAlign: 'center' }}>Min Qty</th>
                    <th>Validity Period</th>
                    <th>Notes</th>
                    <th style={{ textAlign: 'center', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                        No customer pricing rules defined yet. Use the form above to configure negotiated rates.
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule) => {
                      const prod = (products || []).find(p => p.id === rule.productId);
                      return (
                        <tr key={rule.id}>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>
                            {rule.customerName || rule.customerId}
                          </td>
                          <td>
                            {prod ? (
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{prod.name}</span>
                            ) : (
                              <span style={{ color: '#64748b', fontStyle: 'italic' }}>All Catalogue Products</span>
                            )}
                          </td>
                          <td>
                            <span className="badge badge-blue">
                              {rule.pricingType === 'CONTRACT_RATE' ? 'Contract Rate' : rule.pricingType === 'PERCENT_DISCOUNT' ? 'Discount %' : 'Cost Markup'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                            {rule.pricingType === 'CONTRACT_RATE' && `₹${Number(rule.customRate || 0).toFixed(2)}`}
                            {rule.pricingType === 'PERCENT_DISCOUNT' && `${rule.discountPct}% OFF`}
                            {rule.pricingType === 'COST_MARKUP' && `+${rule.discountPct}% Markup`}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {rule.minQty || 1}+
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.75rem' }}>
                            {rule.startDate || rule.endDate ? `${rule.startDate || 'Any'} → ${rule.endDate || 'No expiry'}` : 'Ongoing'}
                          </td>
                          <td style={{ color: '#64748b', fontSize: '0.78rem', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rule.notes || '-'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                              title="Delete rule"
                            >
                              <Trash2 size={14} />
                            </button>
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

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Rules apply automatically on Sales Orders when the corresponding customer and product are selected.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
export default CustomerPricingRulesModal;
