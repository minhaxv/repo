import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Boxes, Plus, AlertTriangle, CheckCircle2, Sliders } from 'lucide-react';

export const InventoryView = () => {
  const { inventory, setInventory } = useERP();
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState(1);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Boxes size={24} color="#06b6d4" /> Raw Material Stock & Inventory
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Track rolls, acrylic sheets, LED modules & ink bottles with low-stock warnings
          </span>
        </div>
      </div>

      {/* Table */}
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
              {inventory.map((item) => {
                const isLow = item.currentStock <= item.reorderLevel;
                const totalVal = item.currentStock * item.unitCost;
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700, color: '#64748b' }}>{item.id}</td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>{item.name}</td>
                    <td><span className="badge badge-slate">{item.category}</span></td>
                    <td style={{ fontWeight: 800, fontSize: '1.05rem', color: isLow ? '#e11d48' : '#059669' }}>
                      {item.currentStock} {item.unit}
                    </td>
                    <td>{item.reorderLevel} {item.unit}</td>
                    <td>₹{item.unitCost}</td>
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
