import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Boxes, Plus, AlertTriangle, CheckCircle2, Sliders, History, ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';

export const InventoryView = () => {
  const { inventory, setInventory, products, productMaterialSpecs, inventoryTransactions, addInventoryTransaction } = useERP();
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState(1);
  const [activeTab, setActiveTab] = useState('specs'); // 'specs', 'raw', 'movements'
  const [txForm, setTxForm] = useState({
    materialId: '',
    quantity: '',
    transactionType: 'PURCHASE_IN',
    remarks: ''
  });
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    const qty = parseFloat(adjustQty || 0);
    try {
      if (addInventoryTransaction) {
        await addInventoryTransaction({
          materialId: selectedItem.id,
          quantity: qty,
          unit: selectedItem.unit || 'Units',
          transactionType: qty >= 0 ? 'ADJUSTMENT' : 'WASTAGE',
          referenceType: 'MANUAL_ADJUSTMENT',
          referenceId: `ADJ-${Date.now()}`,
          remarks: `Manual stock adjustment of ${qty} ${selectedItem.unit}`
        });
      } else {
        setInventory((prev) =>
          prev.map((item) =>
            item.id === selectedItem.id
              ? { ...item, currentStock: (Number(item.currentStock) || 0) + qty }
              : item
          )
        );
      }
      setSelectedItem(null);
    } catch (err) {
      console.error("Error adjusting stock:", err);
    }
  };

  const handleCreateTx = async (e) => {
    e.preventDefault();
    const item = (inventory || []).find(i => i.id === txForm.materialId);
    if (!item) return;

    try {
      await addInventoryTransaction({
        materialId: item.id,
        quantity: parseFloat(txForm.quantity),
        unit: item.unit || 'Units',
        transactionType: txForm.transactionType,
        referenceType: txForm.transactionType === 'PURCHASE_IN' ? 'PURCHASE_ORDER' : 'MANUAL_LOG',
        referenceId: `TX-${Date.now()}`,
        remarks: txForm.remarks || `${txForm.transactionType} logged manually`
      });
      setIsNewTxModalOpen(false);
      setTxForm({ materialId: '', quantity: '', transactionType: 'PURCHASE_IN', remarks: '' });
    } catch (err) {
      console.error("Error creating transaction:", err);
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Boxes size={24} color="#06b6d4" /> Printing Material Inventory & Stock Ledger
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Authoritative material consumption, rolls, sheets, square feet tracking & real-time stock ledger
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
            Raw Materials & Inks
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`btn btn-sm ${activeTab === 'movements' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <History size={14} /> Stock Movements Ledger
          </button>
          <button
            onClick={() => setIsNewTxModalOpen(true)}
            className="btn btn-sm btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#059669', borderColor: '#059669' }}
          >
            <Plus size={14} /> Inward Stock / Purchase In
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

      {/* Stock Movements & Transactions Ledger Tab */}
      {activeTab === 'movements' && (
        <div className="card">
          <div className="card-header" style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">Authoritative Stock Transaction Ledger</div>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Every material consumption, inward receipt, and production deduction is permanently tracked</span>
            </div>
            <span className="badge badge-blue">{(inventoryTransactions || []).length} Recorded Movements</span>
          </div>
          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Tx ID</th>
                  <th>Date & Time</th>
                  <th>Material</th>
                  <th>Type</th>
                  <th>Quantity Movement</th>
                  <th>Reference</th>
                  <th>Logged By</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {(inventoryTransactions || []).length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No stock transactions recorded yet. They will appear here when orders are completed or stock is adjusted.
                    </td>
                  </tr>
                ) : (
                  (inventoryTransactions || []).map((tx) => {
                    const isPositive = Number(tx.quantity) > 0;
                    const typeColor = tx.transaction_type === 'PURCHASE_IN' ? 'badge-emerald' :
                                     tx.transaction_type === 'PRODUCTION_CONSUMPTION' ? 'badge-blue' :
                                     tx.transaction_type === 'WASTAGE' ? 'badge-rose' : 'badge-slate';

                    return (
                      <tr key={tx.id || tx.transaction_id}>
                        <td style={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>{tx.id || tx.transaction_id}</td>
                        <td style={{ fontSize: '0.82rem', color: '#334155' }}>
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{tx.material_name || tx.material_id}</td>
                        <td>
                          <span className={`badge ${typeColor}`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td style={{
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          color: isPositive ? '#059669' : '#dc2626'
                        }}>
                          {isPositive ? `+${tx.quantity}` : tx.quantity} {tx.unit || 'Units'}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#2563eb' }}>
                            {tx.reference_id || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                          {tx.employee_name || tx.employee_id || 'System'}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '240px' }}>
                          {tx.remarks || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
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
                    step="any"
                    className="form-control"
                    style={{ fontSize: '1.1rem', fontWeight: 800 }}
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Use positive numbers to add inward stock, negative to record consumption/wastage.</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSelectedItem(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Update Stock & Record in Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inward Stock / New Transaction Modal */}
      {isNewTxModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewTxModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Record Inward Stock / Stock Movement</h3>
            </div>
            <form onSubmit={handleCreateTx}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Select Material *</label>
                  <select
                    className="form-control"
                    value={txForm.materialId}
                    onChange={(e) => setTxForm({ ...txForm, materialId: e.target.value })}
                    required
                  >
                    <option value="">-- Choose Material / Roll / Ink --</option>
                    {(inventory || []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Current: {m.currentStock || m.current_stock || 0} {m.unit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Movement Type *</label>
                  <select
                    className="form-control"
                    value={txForm.transactionType}
                    onChange={(e) => setTxForm({ ...txForm, transactionType: e.target.value })}
                    required
                  >
                    <option value="PURCHASE_IN">PURCHASE_IN (Inward Delivery from Supplier)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Audit Correction / Physical Count)</option>
                    <option value="WASTAGE">WASTAGE (Damaged / Expired / Scrapped)</option>
                    <option value="RETURN">RETURN (Return to Supplier)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    style={{ fontSize: '1.1rem', fontWeight: 800 }}
                    value={txForm.quantity}
                    onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })}
                    placeholder="e.g. 500"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Remarks / Invoice # / Batch Note</label>
                  <input
                    type="text"
                    className="form-control"
                    value={txForm.remarks}
                    onChange={(e) => setTxForm({ ...txForm, remarks: e.target.value })}
                    placeholder="e.g. Received from Avery Dennison, Batch #4092"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsNewTxModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
                  Post to Stock Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
