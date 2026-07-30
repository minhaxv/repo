import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { DEFAULT_UNITS, MATERIAL_PRESETS } from '../types';
import { Package, Plus, Search, Tag, DollarSign, Percent } from 'lucide-react';

export const ProductsView = () => {
  const { products, setProducts } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newProd, setNewProd] = useState({
    name: '',
    unit: 'Sq.Ft',
    defaultRate: 20,
    estimatedCost: 10,
    gstRate: 18,
    hsnCode: '9989',
    category: 'Digital Print',
    defaultMaterial: MATERIAL_PRESETS[0]
  });

  const handleAddProduct = (e) => {
    e.preventDefault();
    const created = {
      ...newProd,
      id: `PROD-0${products.length + 1}`,
      defaultRate: parseFloat(newProd.defaultRate) || 0,
      estimatedCost: parseFloat(newProd.estimatedCost) || 0,
      gstRate: parseFloat(newProd.gstRate) || 18
    };
    setProducts([created, ...products]);
    setIsAddOpen(false);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={24} color="#2563eb" /> Product Master Catalog
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Configure default rates, estimated sqft costs, HSN/SAC codes and GST rates
          </span>
        </div>

        <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
          <Plus size={16} /> + Add Master Product
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Default Selling Rate</th>
                <th>Estimated Cost</th>
                <th>Gross Margin</th>
                <th>HSN Code</th>
                <th>GST Rate</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const margin = p.defaultRate - p.estimatedCost;
                const marginPct = p.defaultRate > 0 ? ((margin / p.defaultRate) * 100).toFixed(1) : 0;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: '#64748b' }}>{p.id}</td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>{p.name}</td>
                    <td><span className="badge badge-blue">{p.category}</span></td>
                    <td>{p.unit}</td>
                    <td style={{ fontWeight: 800, color: '#1e40af' }}>₹{p.defaultRate} / {p.unit}</td>
                    <td style={{ color: '#64748b' }}>₹{p.estimatedCost}</td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>₹{margin} ({marginPct}%)</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{p.hsnCode}</td>
                    <td><span className="badge badge-slate">{p.gstRate}% GST</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Add New Product Master</h3>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 5mm Sunboard Direct UV Print"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Signage"
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Measurement Unit</label>
                  <select
                    className="form-select"
                    value={newProd.unit}
                    onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })}
                  >
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Default Selling Rate (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newProd.defaultRate}
                    onChange={(e) => setNewProd({ ...newProd, defaultRate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Cost Rate (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newProd.estimatedCost}
                    onChange={(e) => setNewProd({ ...newProd, estimatedCost: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">HSN / SAC Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newProd.hsnCode}
                    onChange={(e) => setNewProd({ ...newProd, hsnCode: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GST Rate %</label>
                  <select
                    className="form-select"
                    value={newProd.gstRate}
                    onChange={(e) => setNewProd({ ...newProd, gstRate: e.target.value })}
                  >
                    <option value={18}>18% GST (Printing Standard)</option>
                    <option value={12}>12% GST</option>
                    <option value={5}>5% GST</option>
                    <option value={0}>0% (Exempt)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
