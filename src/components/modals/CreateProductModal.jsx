import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { DEFAULT_UNITS, TAX_TYPES } from '../../types';
import { PackagePlus, Edit3, X, Check, DollarSign, Tag, Percent, Truck, Building2 } from 'lucide-react';
import { useERPModalSafeClose } from '../../hooks/useERPModalSafeClose';
import { UnsavedChangesPrompt } from '../common/UnsavedChangesPrompt';

export const CreateProductModal = ({ isOpen, onClose, onProductCreated, productToEdit = null }) => {
  const { addProduct, updateProduct, products, vendors, productPricingSlabs } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [enableSlabs, setEnableSlabs] = useState(false);
  const [slabs, setSlabs] = useState([]);
  
  const isEditMode = Boolean(productToEdit && productToEdit.id);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    imageUrl: '',
    description: '',
    unit: 'Sq.Ft',
    pricingMethod: 'FIXED',
    minOrderQty: 1,
    taxInclusive: false,
    defaultRate: 25,
    estimatedCost: 12,
    gstRate: 18,
    hsnCode: '9989',
    category: 'Digital Printing',
    defaultMaterial: 'Standard Substrate',
    defaultVendor: '',
    defaultVendorId: '',
    isOutsource: false,
    variants: []
  });

  const isDirty = Boolean(
    isEditMode
      ? (formData.name !== (productToEdit.name || '') ||
         Number(formData.defaultRate) !== Number(productToEdit.defaultRate || productToEdit.default_rate || 0) ||
         Number(formData.estimatedCost) !== Number(productToEdit.estimatedCost || productToEdit.estimated_cost || 0) ||
         enableSlabs)
      : (formData.name.trim() || formData.hsnCode !== '9989' || enableSlabs)
  );

  const {
    showUnsavedPrompt,
    requestClose,
    handleKeepEditing,
    handleDiscard
  } = useERPModalSafeClose({
    isOpen,
    isDirty,
    onClose,
    isSubmitting
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsSubmitting(false);
      if (productToEdit) {
        let parsedVariants = [];
        try {
          if (typeof productToEdit.variantsJson === 'string') {
            parsedVariants = JSON.parse(productToEdit.variantsJson || '[]');
          } else if (Array.isArray(productToEdit.variants)) {
            parsedVariants = productToEdit.variants;
          }
        } catch(e) {}

        setFormData({
          name: productToEdit.name || '',
          sku: productToEdit.sku || '',
          barcode: productToEdit.barcode || '',
          imageUrl: productToEdit.imageUrl || productToEdit.image_url || '',
          description: productToEdit.description || '',
          unit: productToEdit.unit || 'Sq.Ft',
          pricingMethod: productToEdit.pricingMethod || productToEdit.pricing_method || 'FIXED',
          minOrderQty: Number(productToEdit.minOrderQty ?? productToEdit.min_order_qty ?? 1),
          taxInclusive: Boolean(productToEdit.taxInclusive ?? productToEdit.tax_inclusive),
          defaultRate: Number(productToEdit.defaultRate ?? productToEdit.default_rate ?? 0),
          estimatedCost: Number(productToEdit.estimatedCost ?? productToEdit.estimated_cost ?? 0),
          gstRate: Number(productToEdit.gstRate ?? productToEdit.gst_rate ?? 18),
          hsnCode: productToEdit.hsnCode || productToEdit.hsn_code || '9989',
          category: productToEdit.category || 'Digital Printing',
          defaultMaterial: productToEdit.defaultMaterial || productToEdit.default_material || 'Standard Substrate',
          defaultVendor: productToEdit.defaultVendor || productToEdit.default_vendor || '',
          defaultVendorId: productToEdit.defaultVendorId || productToEdit.default_vendor_id || '',
          isOutsource: Boolean(productToEdit.isOutsource || productToEdit.is_outsource || productToEdit.defaultVendor || productToEdit.default_vendor),
          variants: parsedVariants
        });
        const existingSlabs = (productPricingSlabs || []).filter(s => s.productId === productToEdit.id);
        if (existingSlabs.length > 0 || (productToEdit.pricingMethod === 'SLAB' || productToEdit.pricing_method === 'SLAB')) {
          setSlabs(existingSlabs.map(s => ({ ...s })));
          setEnableSlabs(true);
        } else {
          setSlabs([]);
          setEnableSlabs(false);
        }
      } else {
        setFormData({
          name: '',
          sku: '',
          barcode: '',
          imageUrl: '',
          description: '',
          unit: 'Pcs',
          pricingMethod: 'FIXED',
          minOrderQty: 1,
          taxInclusive: false,
          defaultRate: 25,
          estimatedCost: 12,
          gstRate: 18,
          hsnCode: '9989',
          category: 'Digital Printing',
          defaultMaterial: 'Standard Substrate',
          defaultVendor: '',
          defaultVendorId: '',
          isOutsource: false,
          variants: []
        });
        setSlabs([]);
        setEnableSlabs(false);
      }
    }
  }, [isOpen, productToEdit, productPricingSlabs]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    const cleanName = (formData.name || '').trim();
    if (!cleanName) {
      setErrorMsg('Please enter a product name.');
      return;
    }

    if (!isEditMode) {
      // Check duplicate product name on create
      const existing = (products || []).find((p) => p.name && p.name.trim().toLowerCase() === cleanName.toLowerCase());
      if (existing) {
        if (!window.confirm(`Product "${existing.name}" already exists. Do you want to select the existing product?`)) {
          setErrorMsg(`Product "${cleanName}" already exists.`);
          return;
        } else {
          if (onProductCreated) {
            onProductCreated(existing);
          }
          onClose();
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);
      let result = null;
      const validSlabs = enableSlabs ? slabs.filter(s => Number(s.minQty) > 0 && Number(s.rate) > 0) : [];

      if (isEditMode) {
        result = await updateProduct(productToEdit.id, {
          ...formData,
          name: cleanName
        }, [], enableSlabs ? validSlabs : null);
      } else {
        result = await addProduct({
          ...formData,
          name: cleanName
        }, [], validSlabs);
      }

      if (result) {
        if (onProductCreated) {
          onProductCreated(result);
        }
        onClose();
      } else {
        setErrorMsg('Failed to save product.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error saving product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isEditMode ? (
              <Edit3 size={20} color="#2563eb" />
            ) : (
              <PackagePlus size={20} color="#2563eb" />
            )}
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              {isEditMode ? `Edit Master Product: ${productToEdit?.name}` : 'Add New Master Product'}
            </h3>
          </div>
          <button onClick={requestClose} className="btn-secondary btn-icon" style={{ border: 'none' }} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {errorMsg && (
              <div style={{ gridColumn: 'span 2', background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                <Tag size={14} /> Product Name *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 3mm ACP Board UV Direct Printing"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">SKU Code</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. PRD-BC-300"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Barcode / EAN</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 8901234567890"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit</label>
              <select
                className="form-select"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                disabled={isSubmitting}
              >
                {DEFAULT_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Pricing Method</label>
              <select
                className="form-select"
                style={{ fontWeight: 700, color: '#2563eb' }}
                value={formData.pricingMethod}
                onChange={(e) => {
                  const m = e.target.value;
                  setFormData({ ...formData, pricingMethod: m });
                  if (m === 'SLAB') setEnableSlabs(true);
                }}
                disabled={isSubmitting}
              >
                <option value="FIXED">1. Fixed Unit Price</option>
                <option value="SLAB">2. Quantity Slab Pricing</option>
                <option value="CUSTOM_QUOTE">3. Custom Quotation Pricing</option>
                <option value="DIMENSION">4. Material & Dimension-Based (Sq.Ft/Sq.M)</option>
                <option value="CUSTOMER_NEGOTIATED">5. Customer-Specific Negotiated</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Signage / Flex / Offset / Service"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Order Qty (MOQ)</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={formData.minOrderQty}
                onChange={(e) => setFormData({ ...formData, minOrderQty: Math.max(1, parseInt(e.target.value) || 1) })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Product Image URL</label>
              <input
                type="text"
                className="form-control"
                placeholder="https://... image URL for product catalogue"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <DollarSign size={14} /> Default Selling Rate (₹)
              </label>
              <input
                type="number"
                className="form-control"
                style={{ fontWeight: 700, color: '#1e40af' }}
                value={formData.defaultRate}
                onChange={(e) => setFormData({ ...formData, defaultRate: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Cost Price (₹)</label>
              <input
                type="number"
                className="form-control"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Substrate / Spec</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 240gsm Star Frontlit Flex or PVC Glossy"
                value={formData.defaultMaterial}
                onChange={(e) => setFormData({ ...formData, defaultMaterial: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2', background: '#faf5ff', border: '1px solid #e9d5ff', padding: '0.85rem 1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 800, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}>
                  <Building2 size={16} color="#7c3aed" /> Outsource Vendor / Partner Fulfillment
                </label>
                <span style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 700, background: '#f3e8ff', padding: '2px 8px', borderRadius: '12px' }}>
                  ⚡ Auto-selects Outsource & Vendor in Sales Orders
                </span>
              </div>
              <select
                className="form-select form-select-sm"
                style={{ fontWeight: 600, borderColor: '#c084fc', background: '#fff', fontSize: '0.85rem' }}
                value={formData.defaultVendorId || formData.defaultVendor || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const v = (vendors || []).find((ven) => ven.id === val || ven.name === val);
                  setFormData({
                    ...formData,
                    defaultVendor: v ? v.name : '',
                    defaultVendorId: v ? v.id : '',
                    isOutsource: Boolean(v)
                  });
                }}
                disabled={isSubmitting}
              >
                <option value="">🏭 100% In-House Production (No Outsource Vendor)</option>
                {(vendors || []).map((v) => (
                  <option key={v.id} value={v.id}>
                    🏬 Outsource: {v.name} ({v.category || 'Printing / Fabrication'})
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: '0.4rem' }}>
                {formData.defaultVendor ? (
                  <span style={{ color: '#059669', fontWeight: 700 }}>
                    ✓ When this product is selected in Sales Orders, it will automatically enable Outsource and select <strong>{formData.defaultVendor}</strong>.
                  </span>
                ) : (
                  <span>Select an outsource vendor if this job is sent to an external printing or fabrication partner.</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">GST Rate %</label>
              <select
                className="form-select"
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                disabled={isSubmitting}
              >
                <option value={18}>18% GST (Standard Printing)</option>
                <option value={12}>12% GST</option>
                <option value={5}>5% GST</option>
                <option value={0}>0% (No GST / Exempt)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">HSN / SAC Code</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 9989"
                value={formData.hsnCode}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            {/* Quantity-Based Rate Slabs / Tiered Pricing */}
            <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={enableSlabs}
                    onChange={(e) => {
                      setEnableSlabs(e.target.checked);
                      if (e.target.checked && slabs.length === 0) {
                        const r = Number(formData.defaultRate || 10);
                        setSlabs([
                          { minQty: 1, maxQty: 100, rate: r, costRate: Number(formData.estimatedCost || 0) },
                          { minQty: 101, maxQty: 200, rate: Math.max(1, Math.round(r * 0.9 * 10) / 10), costRate: Number(formData.estimatedCost || 0) }
                        ]);
                      }
                    }}
                  />
                  <span>Enable Quantity Rate Slabs (e.g., 1–100 @ ₹10, 101–200 @ ₹9)</span>
                </label>

                {enableSlabs && (
                  <button
                    type="button"
                    onClick={() => {
                      const last = slabs[slabs.length - 1];
                      const nextMin = last ? (last.maxQty ? Number(last.maxQty) + 1 : Number(last.minQty) + 100) : 1;
                      const nextRate = last ? Math.max(1, Math.round(Number(last.rate) * 0.9 * 10) / 10) : Number(formData.defaultRate || 10);
                      setSlabs([...slabs, { minQty: nextMin, maxQty: nextMin + 99, rate: nextRate, costRate: 0 }]);
                    }}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  >
                    + Add Slab Range
                  </button>
                )}
              </div>

              {enableSlabs && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 40px', gap: '0.5rem', marginBottom: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>
                    <div>Min Qty ({formData.unit || 'Pcs'})</div>
                    <div>Max Qty ({formData.unit || 'Pcs'})</div>
                    <div>Slab Rate (₹)</div>
                    <div></div>
                  </div>
                  {slabs.map((s, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 40px', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        placeholder="Min Qty"
                        value={s.minQty ?? ''}
                        onChange={(e) => {
                          const updated = [...slabs];
                          updated[idx] = { ...updated[idx], minQty: e.target.value };
                          setSlabs(updated);
                        }}
                      />
                      <input
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        placeholder="Max (or blank for +)"
                        value={s.maxQty ?? ''}
                        onChange={(e) => {
                          const updated = [...slabs];
                          updated[idx] = { ...updated[idx], maxQty: e.target.value };
                          setSlabs(updated);
                        }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="form-control form-control-sm"
                        placeholder="Rate ₹"
                        value={s.rate ?? ''}
                        onChange={(e) => {
                          const updated = [...slabs];
                          updated[idx] = { ...updated[idx], rate: e.target.value };
                          setSlabs(updated);
                        }}
                        style={{ fontWeight: 700, color: '#1e40af' }}
                      />
                      <button
                        type="button"
                        onClick={() => setSlabs(slabs.filter((_, i) => i !== idx))}
                        className="btn btn-sm btn-danger"
                        style={{ padding: '0.2rem', height: '30px' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={requestClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>⏳ Saving...</>
              ) : isEditMode ? (
                <><Check size={16} /> Save Product Changes</>
              ) : (
                <><Check size={16} /> Save & Add Product</>
              )}
            </button>
          </div>
        </form>
      </div>

      <UnsavedChangesPrompt
        isOpen={showUnsavedPrompt}
        onKeepEditing={handleKeepEditing}
        onDiscard={handleDiscard}
      />
    </div>
  );
};
