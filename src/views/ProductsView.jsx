import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { CreateProductModal } from '../components/modals/CreateProductModal';
import { MaterialSpecModal } from '../components/modals/MaterialSpecModal';
import { Package, Plus, Search, Layers, Trash2, Edit } from 'lucide-react';

export const ProductsView = () => {
  const { products, productMaterialSpecs, deleteProduct } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductForSpecs, setSelectedProductForSpecs] = useState(null);

  const filteredProducts = (products || []).filter((p) => {
    const q = (searchQuery || '').toLowerCase();
    const specs = (productMaterialSpecs || []).filter((s) => s.productId === p.id);
    const matchesSpec = specs.some((s) =>
      (s.specName || '').toLowerCase().includes(q) ||
      (s.materialName || '').toLowerCase().includes(q)
    );
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.defaultMaterial || '').toLowerCase().includes(q) ||
      matchesSpec
    );
  });

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Package size={24} color="#2563eb" /> Product & Dynamic Material Specification Master
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Manage Products, linked dynamic Material Specifications (PVC, Vinyl, Transparent, Stamps), GST & Pricing
          </span>
        </div>

        <button onClick={() => { setEditingProduct(null); setIsAddOpen(true); }} className="btn btn-primary">
          <Plus size={16} /> + Add Master Product
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '320px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search product or material spec..."
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
                <th>Default Rate</th>
                <th>Estimated Cost</th>
                <th>Linked Dynamic Specs</th>
                <th>HSN / GST</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const defaultRate = Number(p.defaultRate ?? p.default_rate ?? 0);
                const estimatedCost = Number(p.estimatedCost ?? p.estimated_cost ?? 0);
                const specs = (productMaterialSpecs || []).filter((s) => s.productId === p.id);
                const defaultSpec = specs.find((s) => s.isDefault);

                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 700, color: '#64748b' }}>{p.id}</td>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>
                      {p.name}
                      {defaultSpec && (
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                          Default: {defaultSpec.specName} (₹{defaultSpec.sellingPrice}/{defaultSpec.unit})
                        </div>
                      )}
                    </td>
                    <td><span className="badge badge-blue">{p.category || 'Standard'}</span></td>
                    <td>{p.unit || 'Sq.Ft'}</td>
                    <td style={{ fontWeight: 800, color: '#1e40af' }}>
                      ₹{defaultSpec ? defaultSpec.sellingPrice : defaultRate} / {defaultSpec ? defaultSpec.unit : (p.unit || 'Sq.Ft')}
                    </td>
                    <td style={{ color: '#64748b' }}>₹{defaultSpec ? defaultSpec.costPrice : estimatedCost}</td>
                    <td>
                      {/* SINGLE UNIFIED DYNAMIC SPEC BUTTON */}
                      <button
                        type="button"
                        onClick={() => setSelectedProductForSpecs(p)}
                        className="btn btn-sm btn-secondary"
                        style={{ background: '#f5f3ff', color: '#6d28d9', fontWeight: 700, borderColor: '#ddd6fe' }}
                        title="Click to view and configure dynamic material specifications"
                      >
                        <Layers size={14} color="#7c3aed" /> {specs.length} Dynamic Spec{specs.length === 1 ? '' : 's'}
                      </button>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {p.hsnCode || '9989'} <span className="badge badge-slate" style={{ marginLeft: '4px' }}>{p.gstRate ?? p.gst_rate ?? 18}% GST</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        {/* EDIT PRODUCT BUTTON */}
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', color: '#1e40af', fontWeight: 700, borderColor: '#bfdbfe' }}
                          title="Edit Product Master details (rates, category, GST, unit)"
                        >
                          <Edit size={13} /> Edit
                        </button>
                        {/* DELETE PRODUCT BUTTON */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete product "${p.name}"? This action cannot be undone.`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="btn btn-sm btn-danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                          title="Delete Product Master"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CreateProductModal
        isOpen={isAddOpen || !!editingProduct}
        onClose={() => {
          setIsAddOpen(false);
          setEditingProduct(null);
        }}
        productToEdit={editingProduct}
      />

      <MaterialSpecModal
        isOpen={!!selectedProductForSpecs}
        onClose={() => setSelectedProductForSpecs(null)}
        product={selectedProductForSpecs}
      />
    </div>
  );
};
