import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { DEFAULT_UNITS, TAX_TYPES } from '../../types';
import { PackagePlus, X, Check, DollarSign, Tag, Percent } from 'lucide-react';

export const CreateProductModal = ({ isOpen, onClose, onProductCreated }) => {
  const { addProduct, products } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Sq.Ft',
    defaultRate: 25,
    estimatedCost: 12,
    gstRate: 18,
    hsnCode: '9989',
    category: 'Digital Printing',
    defaultMaterial: 'Standard Substrate'
  });

  React.useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

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

    // Check duplicate product name
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

    try {
      setIsSubmitting(true);
      const created = await addProduct({
        ...formData,
        name: cleanName
      });

      if (created) {
        if (onProductCreated) {
          onProductCreated(created);
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
            <PackagePlus size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Add New Master Product</h3>
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
              <label className="form-label">Estimated SqFt/Unit Cost (₹)</label>
              <input
                type="number"
                className="form-control"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Material Spec</label>
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
                <>⏳ Saving Product...</>
              ) : (
                <><Check size={16} /> Save & Select Product</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
