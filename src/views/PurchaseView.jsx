import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { ShoppingBag, Plus, Search, Truck, CheckCircle2 } from 'lucide-react';

export const PurchaseView = () => {
  const { purchaseOrders, setPurchaseOrders } = useERP();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newPo, setNewPo] = useState({
    vendorName: 'Polymer Vinyl Co',
    items: '10 Rolls Frontlit Flex 240gsm (10ft x 100m)',
    amount: 42000,
    status: 'Pending Dispatch'
  });

  const handleCreatePo = (e) => {
    e.preventDefault();
    const po = {
      id: `PO-2026-0${purchaseOrders.length + 1}`,
      orderDate: new Date().toISOString().split('T')[0],
      ...newPo,
      amount: parseFloat(newPo.amount) || 0
    };
    setPurchaseOrders([po, ...purchaseOrders]);
    setIsAddOpen(false);
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={24} color="#2563eb" /> Purchase Orders & Raw Materials
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Procurement for Flex Rolls, Vinyl Media, Acrylic Sheets, LED Modules and Inks
          </span>
        </div>

        <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
          <Plus size={16} /> + Raise Purchase Order
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Order Date</th>
                <th>Supplier Vendor</th>
                <th>Items Ordered</th>
                <th>PO Amount (₹)</th>
                <th>Delivery Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map((po) => (
                <tr key={po.id}>
                  <td style={{ fontWeight: 800, color: '#1e40af' }}>{po.id}</td>
                  <td>{po.orderDate}</td>
                  <td style={{ fontWeight: 700 }}>{po.vendorName}</td>
                  <td>{po.items}</td>
                  <td style={{ fontWeight: 800 }}>₹{po.amount.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${po.status === 'Received' ? 'badge-emerald' : 'badge-amber'}`}>
                      {po.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Raise Raw Material Purchase Order</h3>
            </div>
            <form onSubmit={handleCreatePo}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Supplier Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newPo.vendorName}
                    onChange={(e) => setNewPo({ ...newPo, vendorName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Items Description</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    value={newPo.items}
                    onChange={(e) => setNewPo({ ...newPo, items: e.target.value })}
                    required
                  ></textarea>
                </div>

                <div className="form-group">
                  <label className="form-label">Total Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newPo.amount}
                    onChange={(e) => setNewPo({ ...newPo, amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit PO</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
