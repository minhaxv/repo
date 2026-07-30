import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { DEFAULT_UNITS, MATERIAL_PRESETS, TAX_TYPES } from '../../types';
import { PackagePlus, X, Check, DollarSign, Tag, Percent } from 'lucide-react';

export const CreateProductModal = ({ isOpen, onClose, onProductCreated }) => {
  const { products, setProducts } = useERP();
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Sq.Ft',
    defaultRate: 25,
    estimatedCost: 12,
    gstRate: 18,
    hsnCode: '9989',
    category: 'Digital Printing',
    defaultMaterial: MATERIAL_PRESETS[0]
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      alert('Please enter a product name.');
      return;
    }

    const newProduct = {
      id: `PROD-${String(products.length + 1).padStart(2, '0')}`,
      name: formData.name,
      unit: formData.unit,
      defaultRate: parseFloat(formData.defaultRate) || 0,
      estimatedCost: parseFloat(formData.estimatedCost) || 0,
      gstRate: parseFloat(formData.gstRate) || 18,
      hsnCode: formData.hsnCode || '9989',
      category: formData.category || 'Custom Print',
      defaultVendor: '',
      defaultMaterial: formData.defaultMaterial
    };

    setProducts([newProduct, ...products]);

    if (onProductCreated) {
      onProductCreated(newProduct);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PackagePlus size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Add New Master Product</h3>
          </div>
          <button onClick={onClose} className="btn-secondary btn-icon" style={{ border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
              />
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit</label>
              <select
                className="form-select"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                placeholder="e.g. Signage / Flex / Offset"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estimated SqFt/Unit Cost (₹)</label>
              <input
                type="number"
                className="form-control"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Material Spec</label>
              <select
                className="form-select"
                value={formData.defaultMaterial}
                onChange={(e) => setFormData({ ...formData, defaultMaterial: e.target.value })}
              >
                {MATERIAL_PRESETS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">GST Rate %</label>
              <select
                className="form-select"
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
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
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} /> Save & Select Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
