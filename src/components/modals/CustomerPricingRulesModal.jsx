import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserCheck, X, Plus, Trash2, Save, Calendar, Check, AlertCircle, Percent, ShieldCheck, Tag } from 'lucide-react';

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
      // Reset form fields
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Customer-Specific Pricing & Negotiated Rates
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure contracted price lists, wholesale customer tiers, and time-bound discounts.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* New Rule Creation Form */}
          <form onSubmit={handleCreateRule} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-500" />
                Add New Customer Rate / Discount
              </h3>
              <span className="text-xs text-slate-400">Takes priority over standard catalogue prices</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                >
                  <option value="">-- Select Customer --</option>
                  {(customers || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type || 'Regular'})</option>
                  ))}
                </select>
              </div>

              {/* Product Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Applicable Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                >
                  <option value="">All Products (Entire Catalogue)</option>
                  {(products || []).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit || 'Sq.Ft'})</option>
                  ))}
                </select>
              </div>

              {/* Pricing Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Pricing Rule Type *
                </label>
                <select
                  value={pricingType}
                  onChange={(e) => setPricingType(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-blue-600 dark:text-blue-400"
                >
                  <option value="CONTRACT_RATE">Fixed Contract Rate (₹/unit)</option>
                  <option value="PERCENT_DISCOUNT">Percentage Discount (%)</option>
                  <option value="COST_MARKUP">Cost Plus Markup (%)</option>
                </select>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {pricingType === 'CONTRACT_RATE' ? 'Contract Rate (₹) *' : 'Discount / Markup % *'}
                </label>
                <div className="flex items-center gap-1.5">
                  {pricingType === 'CONTRACT_RATE' ? (
                    <span className="text-xs font-bold text-slate-500">₹</span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">%</span>
                  )}
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={pricingType === 'CONTRACT_RATE' ? customRate : discountPct}
                    onChange={(e) => pricingType === 'CONTRACT_RATE' ? setCustomRate(e.target.value) : setDiscountPct(e.target.value)}
                    placeholder={pricingType === 'CONTRACT_RATE' ? 'e.g. 12.00' : 'e.g. 15'}
                    required
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400"
                  />
                </div>
              </div>

              {/* Min Qty */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Min Quantity Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={minQty}
                  onChange={(e) => setMinQty(parseInt(e.target.value) || 1)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Validity Dates */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Add Pricing Rule'}
                </button>
              </div>

            </div>

            {/* Notes */}
            <div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contract or agreement reference (e.g. Annual advertising contract 2026)"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            {/* Status alerts */}
            {statusMsg.text && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300'}`}>
                {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </form>

          {/* Active Rules List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Active Customer Pricing Rules ({filteredRules.length})
              </h3>
              <div className="flex gap-2">
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId('')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Clear Customer Filter
                  </button>
                )}
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Customer</th>
                    <th className="px-3 py-2.5">Target Product</th>
                    <th className="px-3 py-2.5">Rule Type</th>
                    <th className="px-3 py-2.5 text-right">Negotiated Rate / Discount</th>
                    <th className="px-3 py-2.5 text-center">Min Qty</th>
                    <th className="px-3 py-2.5">Validity Period</th>
                    <th className="px-3 py-2.5">Notes</th>
                    <th className="px-2 py-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-slate-400">
                        No customer pricing rules defined yet. Use the form above to configure negotiated rates.
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule) => {
                      const prod = (products || []).find(p => p.id === rule.productId);
                      return (
                        <tr key={rule.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">
                            {rule.customerName || rule.customerId}
                          </td>
                          <td className="px-3 py-2">
                            {prod ? (
                              <span className="font-medium text-slate-800 dark:text-slate-200">{prod.name}</span>
                            ) : (
                              <span className="text-slate-400 italic">All Catalogue Products</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                              {rule.pricingType === 'CONTRACT_RATE' ? 'Contract Rate' : rule.pricingType === 'PERCENT_DISCOUNT' ? 'Discount %' : 'Cost Markup'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {rule.pricingType === 'CONTRACT_RATE' && `₹${Number(rule.customRate || 0).toFixed(2)}`}
                            {rule.pricingType === 'PERCENT_DISCOUNT' && `${rule.discountPct}% OFF`}
                            {rule.pricingType === 'COST_MARKUP' && `+${rule.discountPct}% Markup`}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            {rule.minQty || 1}+
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-mono text-xs">
                            {rule.startDate || rule.endDate ? `${rule.startDate || 'Any'} → ${rule.endDate || 'No expiry'}` : 'Ongoing'}
                          </td>
                          <td className="px-3 py-2 text-slate-500 max-w-xs truncate">
                            {rule.notes || '-'}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete rule"
                            >
                              <Trash2 className="w-4 h-4" />
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Rules apply automatically on Sales Orders when the corresponding customer and product are selected.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
export default CustomerPricingRulesModal;
