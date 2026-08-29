import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { CreateSupplierModal } from '../components/modals/CreateSupplierModal';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { ShoppingBag, Plus, Search, Truck, CheckCircle2 } from 'lucide-react';

export const PurchaseView = () => {
const { purchaseOrders, setPurchaseOrders, vendors, products, productMaterialSpecs } = useERP();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState('');

  const availableSpecs = selectedProductId
    ? (productMaterialSpecs || []).filter((s) => s.productId === selectedProductId && s.status !== 'Inactive')
    : [];

  const [newPo, setNewPo] = useState({
    vendorName: vendors[0]?.name || 'Polymer Vinyl Co',
    items: '10 Rolls Frontlit Flex 240gsm (10ft x 100m)',
    amount: 42000,
    status: 'Pending Dispatch'
  });

  const handleCreatePo = (e) => {
    e.preventDefault();
    if (!newPo.vendorName) {
      alert('Please select or create a Supplier.');
      return;
    }
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

      {/* Create Purchase Order Modal */}
      {isAddOpen && (
        <div className="modal-overlay" onClick={() => setIsAddOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Raise Raw Material Purchase Order</h3>
            </div>
            <form onSubmit={handleCreatePo}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>Supplier Name *</label>
                    <button
                      type="button"
                      onClick={() => setIsCreateSupplierOpen(true)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + New Supplier
                    </button>
                  </div>
                  <SearchableSelect
                    type="vendor"
                    options={vendors || []}
                    value={newPo.vendorName}
                    onChange={(v) => setNewPo({ ...newPo, vendorName: v?.name || '' })}
                    getOptionValue={(v) => v?.name || ''}
                    getOptionLabel={(v) => v?.name || ''}
                    placeholder="Search & select Supplier..."
                    searchPlaceholder="Search supplier by name, category, city..."
                    onAddNew={() => setIsCreateSupplierOpen(true)}
                    addNewLabel="+ Create New Supplier"
                  />
                </div>

                {/* Product & Material Spec Quick Select */}
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.4rem' }}>
                    Product & Dynamic Material Specification Auto-Fill
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Select Product</label>
                      <SearchableSelect
                        type="product"
                        size="sm"
                        options={products || []}
                        value={selectedProductId}
                        onChange={(prod) => {
                          const prodId = prod?.id || '';
                          setSelectedProductId(prodId);
                          setSelectedSpecId('');
                          const pSpecs = (productMaterialSpecs || []).filter((s) => s.productId === prodId && s.status !== 'Inactive');
                          const defSpec = pSpecs.find((s) => s.isDefault) || pSpecs[0];
                          if (defSpec) {
                            setSelectedSpecId(defSpec.id);
                            setNewPo((prev) => ({
                              ...prev,
                              items: `${prod?.name || ''} — ${defSpec.specName} (${defSpec.materialName || ''})`,
                              amount: (defSpec.costPrice || 10) * 10
                            }));
                          } else if (prod) {
                            setNewPo((prev) => ({
                              ...prev,
                              items: `${prod.name} — ${prod.defaultMaterial || 'Standard'}`,
                              amount: (prod.estimatedCost || 10) * 10
                            }));
                          }
                        }}
                        placeholder="Search product..."
                        searchPlaceholder="Search product by name, code, SKU..."
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Material Spec</label>
                      <select
                        className="form-select form-select-sm"
                        value={selectedSpecId}
                        onChange={(e) => {
                          const specId = e.target.value;
                          setSelectedSpecId(specId);
                          const spec = availableSpecs.find((s) => s.id === specId);
                          const prod = products.find((p) => p.id === selectedProductId);
                          if (spec) {
                            setNewPo((prev) => ({
                              ...prev,
                              items: `${prod?.name || ''} — ${spec.specName} (${spec.materialName || ''})`,
                              amount: (spec.costPrice || 10) * 10
                            }));
                          }
                        }}
                        disabled={!selectedProductId || availableSpecs.length === 0}
                      >
                        <option value="">-- Choose Spec --</option>
                        {availableSpecs.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.specName} (Cost: ₹{s.costPrice}){s.isDefault ? ' ★ Default' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
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
                  <label className="form-label">Total Estimated Amount (₹)</label>
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

      {/* Quick Supplier Creation Modal */}
      <CreateSupplierModal
        isOpen={isCreateSupplierOpen}
        onClose={() => setIsCreateSupplierOpen(false)}
        onSupplierCreated={(supplier) => {
          setNewPo((prev) => ({
            ...prev,
            vendorName: supplier.name
          }));
          setIsCreateSupplierOpen(false);
        }}
      />
    </div>
  );
};
