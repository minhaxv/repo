import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { DEFAULT_UNITS, TAX_TYPES } from '../../types';
import { PackagePlus, Edit3, X, Check, DollarSign, Tag, Percent, Truck } from 'lucide-react';

export const CreateProductModal = ({ isOpen, onClose, onProductCreated, productToEdit = null }) => {
  const { addProduct, updateProduct, products, vendors } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const isEditMode = Boolean(productToEdit && productToEdit.id);

  const [formData, setFormData] = useState({
    name: '',
    unit: 'Sq.Ft',
    defaultRate: 25,
    estimatedCost: 12,
    gstRate: 18,
    hsnCode: '9989',
    category: 'Digital Printing',
    defaultMaterial: 'Standard Substrate',
    defaultVendor: ''
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsSubmitting(false);
      if (productToEdit) {
        setFormData({
          name: productToEdit.name || '',
          unit: productToEdit.unit || 'Sq.Ft',
          defaultRate: Number(productToEdit.defaultRate ?? productToEdit.default_rate ?? 0),
          estimatedCost: Number(productToEdit.estimatedCost ?? productToEdit.estimated_cost ?? 0),
          gstRate: Number(productToEdit.gstRate ?? productToEdit.gst_rate ?? 18),
          hsnCode: productToEdit.hsnCode || productToEdit.hsn_code || '9989',
          category: productToEdit.category || 'Digital Printing',
          defaultMaterial: productToEdit.defaultMaterial || productToEdit.default_material || 'Standard Substrate',
          defaultVendor: productToEdit.defaultVendor || productToEdit.default_vendor || ''
        });
      } else {
        setFormData({
          name: '',
          unit: 'Sq.Ft',
          defaultRate: 25,
          estimatedCost: 12,
          gstRate: 18,
          hsnCode: '9989',
          category: 'Digital Printing',
          defaultMaterial: 'Standard Substrate',
          defaultVendor: ''
        });
      }
    }
  }, [isOpen, productToEdit]);

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

      if (isEditMode) {
        result = await updateProduct(productToEdit.id, {
          ...formData,
          name: cleanName
        });
      } else {
        result = await addProduct({
          ...formData,
          name: cleanName
        });
      }

      if (result) {
        if (onProductCreated) {
          onProductCreated(result);
        }
        onClose();
      } else {
        setErrorMsg('Failed to save product. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while saving product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
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
          <button onClick={onClose} className="btn-secondary btn-icon" style={{ border: 'none' }} disabled={isSubmitting}>
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

            <div className="form-group">
              <label className="form-label">Default Vendor (Optional)</label>
              <select
                className="form-select"
                value={formData.defaultVendor}
                onChange={(e) => setFormData({ ...formData, defaultVendor: e.target.value })}
                disabled={isSubmitting}
              >
                <option value="">-- In-House / None --</option>
                {(vendors || []).map((v) => (
                  <option key={v.id} value={v.name}>{v.name} ({v.category})</option>
                ))}
              </select>
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
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
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
    </div>
  );
};
