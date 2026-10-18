import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Layers, X, Plus, Trash2, Check, AlertCircle, Calculator, Zap, Sparkles } from 'lucide-react';
import { useERPModalSafeClose } from '../../hooks/useERPModalSafeClose';
import { UnsavedChangesPrompt } from '../common/UnsavedChangesPrompt';

export const ProductSlabsModal = ({ isOpen, onClose, product, initialSpecId = '' }) => {
  const { productPricingSlabs, productMaterialSpecs, saveProductSlabs } = useERP();
  const [selectedSpecId, setSelectedSpecId] = useState(initialSpecId || '');
  const [slabs, setSlabs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [testQty, setTestQty] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedSpecId(initialSpecId || '');
    }
  }, [isOpen, initialSpecId]);

  const productSpecs = useMemo(() => {
    if (!product) return [];
    return (productMaterialSpecs || []).filter(
      (s) => s.productId === product.id && s.status !== 'Inactive'
    );
  }, [product, productMaterialSpecs]);

  const activeSpec = useMemo(() => {
    if (!selectedSpecId || productSpecs.length === 0) return null;
    return productSpecs.find((s) => s.id === selectedSpecId) || null;
  }, [selectedSpecId, productSpecs]);

  const baseRate = Number(product?.defaultRate ?? product?.default_rate ?? 0);
  const activeRate = activeSpec ? Number(activeSpec.sellingPrice || 0) : baseRate;
  const activeCost = activeSpec
    ? Number(activeSpec.costPrice || 0)
    : Number(product?.estimatedCost ?? product?.estimated_cost ?? 0);
  const unit = activeSpec?.unit || product?.unit || 'Pcs';

  // Initial load or scope switch
  useEffect(() => {
    if (isOpen && product) {
      setErrorMsg('');
      setSuccessMsg('');
      const existing = (productPricingSlabs || [])
        .filter((s) => {
          if (s.productId !== product.id) return false;
          if (selectedSpecId) {
            return s.specId === selectedSpecId;
          }
          return !s.specId || s.specId === '' || s.specId === 'ALL';
        })
        .sort((a, b) => Number(a.minQty) - Number(b.minQty));

      if (existing.length > 0) {
        setSlabs(existing.map((s) => ({ ...s })));
      } else {
        // Default initial 2 slabs with active rate
        const r = activeRate > 0 ? activeRate : 10;
        setSlabs([
          { id: `NEW-1`, specId: selectedSpecId || null, minQty: 1, maxQty: 100, rate: r, costRate: activeCost },
          { id: `NEW-2`, specId: selectedSpecId || null, minQty: 101, maxQty: 200, rate: Math.max(1, Math.round(r * 0.9 * 100) / 100), costRate: activeCost }
        ]);
      }
      setTestQty('150');
    }
  }, [isOpen, product, selectedSpecId, productPricingSlabs]);

  const isDirty = useMemo(() => {
    return slabs.length > 0;
  }, [slabs]);

  // Test Quantity Calculator
  const matchedTestSlab = useMemo(() => {
    const q = Number(testQty);
    if (isNaN(q) || q <= 0 || slabs.length === 0) return null;
    return slabs.find((s) => {
      const min = Number(s.minQty);
      const max = s.maxQty ? Number(s.maxQty) : Infinity;
      return q >= min && q <= max;
    });
  }, [testQty, slabs]);

  const { showUnsavedPrompt, requestClose, handleKeepEditing, handleDiscard } = useERPModalSafeClose({
    isOpen: Boolean(isOpen && product),
    isDirty: false, // Allow smooth close
    onClose
  });

  if (!isOpen || !product) return null;

  // Add new row
  const handleAddRow = () => {
    const last = slabs[slabs.length - 1];
    let nextMin = 1;
    if (last) {
      nextMin = last.maxQty ? Number(last.maxQty) + 1 : Number(last.minQty) + 100;
    }
    const nextRate = last ? Math.max(1, Math.round(Number(last.rate) * 0.9 * 100) / 100) : activeRate;
    setSlabs([
      ...slabs,
      {
        id: `NEW-${Date.now()}`,
        specId: selectedSpecId || null,
        minQty: nextMin,
        maxQty: nextMin + 99,
        rate: nextRate,
        costRate: last ? last.costRate : activeCost
      }
    ]);
  };

  const handleUpdateRow = (idx, field, value) => {
    const updated = [...slabs];
    updated[idx] = { ...updated[idx], [field]: value };
    setSlabs(updated);
  };

  const handleDeleteRow = (idx) => {
    setSlabs(slabs.filter((_, i) => i !== idx));
  };

  // Quick Preset Loader
  const handleApplyPreset = (type) => {
    const r = activeRate || 10;
    if (type === 'retail_bulk') {
      // 1-100, 101-200, 201-500, 501-1000, 1001+
      setSlabs([
        { id: `NEW-1`, specId: selectedSpecId || null, minQty: 1, maxQty: 100, rate: r, costRate: activeCost },
        { id: `NEW-2`, specId: selectedSpecId || null, minQty: 101, maxQty: 200, rate: Math.round(r * 0.9 * 10) / 10, costRate: activeCost },
        { id: `NEW-3`, specId: selectedSpecId || null, minQty: 201, maxQty: 500, rate: Math.round(r * 0.78 * 10) / 10, costRate: activeCost },
        { id: `NEW-4`, specId: selectedSpecId || null, minQty: 501, maxQty: 1000, rate: Math.round(r * 0.65 * 10) / 10, costRate: activeCost },
        { id: `NEW-5`, specId: selectedSpecId || null, minQty: 1001, maxQty: '', rate: Math.round(r * 0.55 * 10) / 10, costRate: activeCost }
      ]);
    } else if (type === 'commercial_print') {
      // 1-499, 500-999, 1000-2499, 2500+
      setSlabs([
        { id: `NEW-1`, specId: selectedSpecId || null, minQty: 1, maxQty: 499, rate: r, costRate: activeCost },
        { id: `NEW-2`, specId: selectedSpecId || null, minQty: 500, maxQty: 999, rate: Math.round(r * 0.65 * 100) / 100, costRate: activeCost },
        { id: `NEW-3`, specId: selectedSpecId || null, minQty: 1000, maxQty: 2499, rate: Math.round(r * 0.45 * 100) / 100, costRate: activeCost },
        { id: `NEW-4`, specId: selectedSpecId || null, minQty: 2500, maxQty: '', rate: Math.round(r * 0.35 * 100) / 100, costRate: activeCost }
      ]);
    }
  };

  // Save Slabs
  const handleSave = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    // Validation
    for (let i = 0; i < slabs.length; i++) {
      const s = slabs[i];
      const min = Number(s.minQty);
      const rate = Number(s.rate);

      if (isNaN(min) || min <= 0) {
        setErrorMsg(`Row ${i + 1}: Minimum quantity must be at least 1.`);
        return;
      }
      if (s.maxQty !== '' && s.maxQty !== null && s.maxQty !== undefined) {
        const max = Number(s.maxQty);
        if (isNaN(max) || max < min) {
          setErrorMsg(`Row ${i + 1}: Maximum quantity (${s.maxQty}) must be greater than or equal to Minimum quantity (${min}).`);
          return;
        }
      }
      if (isNaN(rate) || rate <= 0) {
        setErrorMsg(`Row ${i + 1}: Rate must be greater than ₹0.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const sorted = [...slabs].sort((a, b) => Number(a.minQty) - Number(b.minQty));
      await saveProductSlabs(product.id, sorted, selectedSpecId || '');
      setSuccessMsg('✅ Quantity rate slabs saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save rate slabs');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '850px', width: '95%' }}>
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', padding: '1rem 1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} color="#2563eb" />
              Quantity-Based Rate Slabs / Tiered Pricing
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Product: <strong style={{ color: '#0f172a' }}>{product.name}</strong> • Scope: <strong style={{ color: '#2563eb' }}>{activeSpec ? `Spec: ${activeSpec.specName}` : 'Standard Base Product'}</strong> • Base Rate: <strong>₹{activeRate} / {unit}</strong>
            </span>
          </div>
          <button type="button" onClick={requestClose} className="modal-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.25rem' }}>
          {/* Optional Specification Selector (Shown only when product has material specifications) */}
          {productSpecs.length > 0 && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Sparkles size={16} color="#0284c7" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0369a1' }}>Pricing Option / Specification:</span>
              </div>
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto', minWidth: '260px', fontWeight: 700, borderColor: '#0284c7', background: '#fff', color: '#0369a1' }}
                value={selectedSpecId}
                onChange={(e) => setSelectedSpecId(e.target.value)}
              >
                <option value="">⚙️ Normal / Standard Product Rate (₹{baseRate}/{product.unit || 'Pcs'})</option>
                {productSpecs.map((s) => (
                  <option key={s.id} value={s.id}>
                    ⭐ Spec: {s.specName} (₹{s.sellingPrice}/{s.unit}){s.isDefault ? ' ★ Default' : ''}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '0.74rem', color: '#0369a1', fontWeight: 600 }}>
                {selectedSpecId
                  ? 'Configuring tiered slabs for this specific material specification.'
                  : 'Configuring tiered slabs for the normal standard product (also used when no specification is selected).'}
              </span>
            </div>
          )}
          {errorMsg && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.65rem 1rem', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.65rem 1rem', borderRadius: '6px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700 }}>
              <Check size={16} /> {successMsg}
            </div>
          )}

          {/* Preset Buttons Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Sparkles size={14} color="#f59e0b" /> Quick Presets:
              </span>
              <button
                type="button"
                onClick={() => handleApplyPreset('retail_bulk')}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                title="Balloons, Merchandise, Promotional items (1-100, 101-200, 201-500, 501-1000, 1000+)"
              >
                🎈 Balloons / Merchandise Slabs
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('commercial_print')}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                title="Commercial notices, pamphlets, flyers (1-499, 500-999, 1000-2499, 2500+)"
              >
                📄 Notices / Pamphlet Slabs
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="btn btn-sm btn-primary"
              style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Plus size={14} /> + Add Slab Range
            </button>
          </div>

          {/* Slabs Table */}
          <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table className="erp-table" style={{ margin: 0 }}>
              <thead style={{ background: '#f1f5f9' }}>
                <tr>
                  <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '150px' }}>Min Qty ({unit})</th>
                  <th style={{ width: '150px' }}>Max Qty ({unit})</th>
                  <th style={{ width: '160px' }}>Slab Rate (₹ / {unit})</th>
                  <th style={{ width: '130px' }}>Est. Cost (₹)</th>
                  <th>Slab Coverage Note</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {slabs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      No quantity rate slabs defined. Click <strong>"+ Add Slab Range"</strong> or choose a preset above.
                    </td>
                  </tr>
                ) : (
                  slabs.map((row, idx) => {
                    const min = row.minQty;
                    const max = row.maxQty;
                    const isAbove = !max;
                    return (
                      <tr key={row.id || idx}>
                        <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>{idx + 1}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="form-control form-control-sm"
                            placeholder="e.g. 1"
                            value={row.minQty ?? ''}
                            onChange={(e) => handleUpdateRow(idx, 'minQty', e.target.value)}
                            style={{ fontWeight: 700 }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            className="form-control form-control-sm"
                            placeholder="Blank for Above"
                            value={row.maxQty ?? ''}
                            onChange={(e) => handleUpdateRow(idx, 'maxQty', e.target.value)}
                            style={{ fontWeight: 700 }}
                          />
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '8px', top: '5px', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              className="form-control form-control-sm"
                              placeholder="Rate"
                              value={row.rate ?? ''}
                              onChange={(e) => handleUpdateRow(idx, 'rate', e.target.value)}
                              style={{ paddingLeft: '22px', fontWeight: 800, color: '#1e40af' }}
                            />
                          </div>
                        </td>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '8px', top: '5px', fontSize: '0.8rem', color: '#64748b' }}>₹</span>
                            <input
                              type="number"
                              step="0.01"
                              className="form-control form-control-sm"
                              placeholder="Cost"
                              value={row.costRate ?? ''}
                              onChange={(e) => handleUpdateRow(idx, 'costRate', e.target.value)}
                              style={{ paddingLeft: '22px' }}
                            />
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#475569' }}>
                          {isAbove ? (
                            <span className="badge badge-blue">
                              {min}+ {unit} @ ₹{row.rate}/{unit}
                            </span>
                          ) : (
                            <span className="badge badge-slate">
                              {min} to {max} {unit} @ ₹{row.rate}/{unit}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="btn btn-sm btn-danger"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                            title="Delete this slab"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Interactive Live Simulator / Test Box */}
          <div style={{ marginTop: '1.25rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.85rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calculator size={18} color="#2563eb" />
                <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e3a8a' }}>Test Order Quantity Calculator:</span>
                <input
                  type="number"
                  min="1"
                  className="form-control form-control-sm"
                  style={{ width: '110px', fontWeight: 800, borderColor: '#3b82f6' }}
                  placeholder="e.g. 150"
                  value={testQty}
                  onChange={(e) => setTestQty(e.target.value)}
                />
                <span style={{ fontSize: '0.82rem', color: '#475569' }}>{unit}</span>
              </div>

              <div>
                {matchedTestSlab ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: 600 }}>
                      Matched Slab: <strong>{matchedTestSlab.minQty}{matchedTestSlab.maxQty ? ` – ${matchedTestSlab.maxQty}` : '+'} {unit}</strong>
                    </span>
                    <span style={{ background: '#059669', color: '#fff', padding: '0.25rem 0.6rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.85rem' }}>
                      Rate: ₹{matchedTestSlab.rate} / {unit}
                    </span>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                      = ₹{(Number(testQty || 0) * Number(matchedTestSlab.rate)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>
                    ⚠️ No slab matches {testQty} {unit}. Default rate (₹{baseRate}) will be applied.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
          <button type="button" onClick={requestClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ fontWeight: 800, minWidth: '120px' }}
          >
            {isSubmitting ? 'Saving...' : 'Save Rate Slabs'}
          </button>
        </div>
      </div>
    </div>
  );
};
