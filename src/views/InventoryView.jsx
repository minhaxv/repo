import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Boxes, Plus, AlertTriangle, CheckCircle2, Sliders } from 'lucide-react';

export const InventoryView = () => {
const { inventory, setInventory, products, productMaterialSpecs } = useERP();
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs' or 'raw'

  const handleAdjust = (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    setInventory((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? { ...item, currentStock: item.currentStock + parseInt(adjustQty || 0) }
          : item
      )
    );

    setSelectedItem(null);
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Boxes size={24} color="#06b6d4" /> Product & Material Specification Inventory
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Track roll stocks, sheet inventory & finished media breakdown by Product + Specification Grade
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('specs')}
            className={`btn btn-sm ${activeTab === 'specs' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Material Spec Stock
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`btn btn-sm ${activeTab === 'raw' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Raw Material Rolls & Ink
          </button>
        </div>
      </div>

      {/* Material Specification Stock Breakdown */}
      {activeTab === 'specs' && (
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid #e2e8f0' }}>
            <div className="card-title">Stock Valuation by Product & Material Specification Grade</div>
          </div>
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Material Specification Grade</th>
                  <th>Substrate / Specs</th>
                  <th>Unit</th>
                  <th>Estimated Stock</th>
                  <th>Cost Rate (₹)</th>
                  <th>Selling Price (₹)</th>
                  <th>Total Valuation (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(productMaterialSpecs || []).map((spec) => {
                  const parentProd = (products || []).find((p) => p.id === spec.productId);
                  const mockStock = (spec.gsm ? Math.round(spec.gsm * 1.5) : (spec.costPrice > 100 ? 45 : 120));
                  const valuation = mockStock * spec.costPrice;

                  return (
                    <tr key={spec.id}>
                      <td style={{ fontWeight: 800, color: '#1e40af' }}>{parentProd?.name || 'Master Product'}</td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        {spec.specName} {spec.isDefault && <span className="badge badge-amber" style={{ marginLeft: '4px' }}>Default</span>}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {spec.materialName} {spec.gsm ? `(${spec.gsm}gsm)` : ''} {spec.thickness ? `[${spec.thickness}]` : ''}
                      </td>
                      <td>{spec.unit}</td>
                      <td style={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                        {mockStock} {spec.unit}
                      </td>
                      <td style={{ color: '#64748b' }}>₹{spec.costPrice}</td>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>₹{spec.sellingPrice}</td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>₹{valuation.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raw Material Inventory Table */}
      {activeTab === 'raw' && (
        <div className="card">
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Material Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Reorder Alert Level</th>
                  <th>Unit Cost Rate</th>
                  <th>Stock Valuation</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(inventory || []).map((item) => {
                  const currentStock = Number(item.currentStock ?? item.current_stock ?? 0);
                  const reorderLevel = Number(item.reorderLevel ?? item.reorder_level ?? 0);
                  const unitCost = Number(item.unitCost ?? item.unit_cost ?? 0);
                  const isLow = currentStock <= reorderLevel;
                  const totalVal = currentStock * unitCost;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, color: '#64748b' }}>{item.id}</td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</td>
                      <td><span className="badge badge-slate">{item.category || 'Raw Material'}</span></td>
                      <td style={{ fontWeight: 800, fontSize: '1.05rem', color: isLow ? '#e11d48' : '#059669' }}>
                        {currentStock} {item.unit || 'Units'}
                      </td>
                      <td>{reorderLevel} {item.unit || 'Units'}</td>
                      <td>₹{unitCost}</td>
                      <td style={{ fontWeight: 700 }}>₹{totalVal.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${isLow ? 'badge-rose' : 'badge-emerald'}`}>
                          {isLow ? 'Low Stock Warning' : 'Healthy Stock'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setAdjustQty(5);
                          }}
                          className="btn btn-sm btn-secondary"
                        >
                          <Sliders size={14} /> Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Adjust Stock — {selectedItem.name}</h3>
            </div>
            <form onSubmit={handleAdjust}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Add / Subtract Quantity ({selectedItem.unit})</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontSize: '1.1rem', fontWeight: 800 }}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Use positive numbers to add inward stock, negative to subtract.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedItem(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
