import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import { CreateProductModal } from '../components/modals/CreateProductModal';
import { MaterialSpecModal } from '../components/modals/MaterialSpecModal';
import { ProductSlabsModal } from '../components/modals/ProductSlabsModal';
import { YieldCalculatorModal } from '../components/modals/YieldCalculatorModal';
import { ProductBOMModal } from '../components/modals/ProductBOMModal';
import { CustomerPricingRulesModal } from '../components/modals/CustomerPricingRulesModal';
import {
  Package, Plus, Search, Layers, Trash2, Edit, Tag, Calculator,
  Cpu, UserCheck, Download, Upload, TrendingUp, DollarSign
} from 'lucide-react';

export const ProductsView = () => {
  const { products, productMaterialSpecs, productPricingSlabs, productBoms, productYieldConfigs, customerPricingRules, deleteProduct, addProduct } = useERP();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  
  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProductForSpecs, setSelectedProductForSpecs] = useState(null);
  const [selectedProductForSlabs, setSelectedProductForSlabs] = useState(null);
  const [selectedProductForYield, setSelectedProductForYield] = useState(null);
  const [selectedProductForBOM, setSelectedProductForBOM] = useState(null);
  const [isCustomerPricingOpen, setIsCustomerPricingOpen] = useState(false);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set();
    (products || []).forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const q = (searchQuery || '').toLowerCase();
      
      // Category filter
      if (selectedCategory !== 'ALL' && (p.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }

      // Method filter
      const pMethod = p.pricingMethod || p.pricing_method || 'FIXED';
      if (selectedMethod !== 'ALL' && pMethod !== selectedMethod) {
        return false;
      }

      // Search query
      const specs = (productMaterialSpecs || []).filter((s) => s.productId === p.id);
      const matchesSpec = specs.some((s) =>
        (s.specName || '').toLowerCase().includes(q) ||
        (s.materialName || '').toLowerCase().includes(q)
      );

      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.defaultMaterial || '').toLowerCase().includes(q) ||
        matchesSpec
      );
    });
  }, [products, productMaterialSpecs, searchQuery, selectedCategory, selectedMethod]);

  // Pricing method badge helper using native CSS classes
  const renderPricingBadge = (method) => {
    switch (method) {
      case 'SLAB':
        return (
          <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={11} /> Quantity Slab
          </span>
        );
      case 'CUSTOM_QUOTE':
        return (
          <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calculator size={11} /> Custom Quote
          </span>
        );
      case 'DIMENSION':
        return (
          <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Layers size={11} /> Dimension (Sq.Ft)
          </span>
        );
      case 'CUSTOMER_NEGOTIATED':
        return (
          <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <UserCheck size={11} /> Negotiated
          </span>
        );
      case 'FIXED':
      default:
        return (
          <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <DollarSign size={11} /> Fixed Unit Price
          </span>
        );
    }
  };

  // Export to JSON
  const handleExportJSON = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      products,
      productMaterialSpecs,
      productPricingSlabs,
      productBoms,
      productYieldConfigs,
      customerPricingRules
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScreenArts_Catalogue_Pricing_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk import JSON
  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.products && Array.isArray(parsed.products)) {
          let count = 0;
          for (const p of parsed.products) {
            await addProduct(p);
            count++;
          }
          alert(`Successfully imported ${count} products into ERP catalogue!`);
        } else {
          alert('Invalid file format. Expected JSON containing a products array.');
        }
      } catch (err) {
        alert('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Header Card */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Package size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              Product Catalogue & Dynamic Pricing Engine
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              5-Tier pricing methods, yield imposition calculator, bill of materials recipes & contracted rates.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsCustomerPricingOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
          >
            <UserCheck size={14} />
            Customer Rates ({customerPricingRules?.length || 0})
          </button>

          <label className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', margin: 0 }}>
            <Upload size={14} />
            Import JSON
            <input type="file" accept=".json" onChange={handleImportJSON} style={{ display: 'none' }} />
          </label>

          <button
            type="button"
            onClick={handleExportJSON}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Download size={14} />
            Export JSON
          </button>

          <button
            type="button"
            onClick={() => { setEditingProduct(null); setIsAddOpen(true); }}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
          >
            <Plus size={15} /> + Add Product
          </button>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        
        {/* Search Input & Quick Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ position: 'relative', width: '340px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search by name, SKU, barcode, substrate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            Showing <strong style={{ color: '#0f172a' }}>{filteredProducts.length}</strong> of {products?.length || 0} Products
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Category:</span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`btn btn-sm ${selectedCategory === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
          >
            All Categories ({products?.length || 0})
          </button>
          {categories.map(cat => {
            const count = (products || []).filter(p => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Pricing Method Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pricing:</span>
          {[
            { id: 'ALL', label: 'All Methods' },
            { id: 'FIXED', label: 'Fixed Price' },
            { id: 'SLAB', label: 'Quantity Slabs' },
            { id: 'CUSTOM_QUOTE', label: 'Custom Quote' },
            { id: 'DIMENSION', label: 'Dimension Based' },
            { id: 'CUSTOMER_NEGOTIATED', label: 'Negotiated' }
          ].map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMethod(m.id)}
              className={`btn btn-sm ${selectedMethod === m.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem' }}
            >
              {m.label}
            </button>
          ))}
        </div>

      </div>

      {/* Main Product Catalogue Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Category</th>
                <th>Pricing Method</th>
                <th style={{ textAlign: 'right' }}>Selling Rate</th>
                <th style={{ textAlign: 'right' }}>Est. Cost</th>
                <th style={{ textAlign: 'center' }}>Gross Margin</th>
                <th style={{ textAlign: 'center' }}>BOM & Yield</th>
                <th style={{ textAlign: 'center' }}>Quantity Slabs</th>
                <th>Specs</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No products found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const defaultRate = Number(p.defaultRate ?? p.default_rate ?? 0);
                  const estimatedCost = Number(p.estimatedCost ?? p.estimated_cost ?? 0);
                  const pMethod = p.pricingMethod || p.pricing_method || 'FIXED';
                  const specs = (productMaterialSpecs || []).filter((s) => s.productId === p.id);
                  const slabs = (productPricingSlabs || []).filter((s) => s.productId === p.id).sort((a, b) => Number(a.minQty) - Number(b.minQty));
                  const bom = (productBoms || []).find((b) => (b.productId || b.product_id) === p.id);
                  const yieldConfig = (productYieldConfigs || []).find((y) => (y.productId || y.product_id) === p.id);

                  // Margin calculation
                  const grossProfit = defaultRate - estimatedCost;
                  const marginPct = defaultRate > 0 ? (grossProfit / defaultRate) * 100 : 0;

                  return (
                    <tr key={p.id}>
                      
                      {/* Product Name & SKU */}
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                          {p.sku && <span className="badge badge-blue">SKU: {p.sku}</span>}
                          {p.barcode && <span>EAN: {p.barcode}</span>}
                          <span>ID: {p.id}</span>
                        </div>
                        {p.minOrderQty && p.minOrderQty > 1 && (
                          <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 700, marginTop: '0.15rem' }}>
                            MOQ: {p.minOrderQty} {p.unit || 'Pcs'}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td>
                        <span className="badge badge-purple">
                          {p.category || 'Standard'}
                        </span>
                        {p.defaultVendor && (
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', marginTop: '0.2rem' }}>
                            🏬 {p.defaultVendor}
                          </div>
                        )}
                      </td>

                      {/* Pricing Method Badge */}
                      <td>
                        {renderPricingBadge(pMethod)}
                      </td>

                      {/* Selling Rate */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.85rem' }}>
                          ₹{defaultRate.toFixed(2)}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>/{p.unit || 'Pcs'}</span>
                      </td>

                      {/* Estimated Cost */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem' }}>
                          ₹{estimatedCost.toFixed(2)}
                        </div>
                        {bom && (
                          <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                            BOM Recipe
                          </span>
                        )}
                      </td>

                      {/* Gross Margin % */}
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${marginPct >= 30 ? 'badge-green' : marginPct >= 15 ? 'badge-amber' : 'badge-red'}`} style={{ fontWeight: 800 }}>
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>

                      {/* BOM & Yield Buttons */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedProductForBOM(p)}
                            className={`btn btn-sm ${bom ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            title="Configure Bill of Materials (BOM) Production Recipe"
                          >
                            <Cpu size={12} />
                            {bom ? 'BOM' : '+ BOM'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedProductForYield(p)}
                            className={`btn btn-sm ${yieldConfig ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            title="Configure Sheet Imposition & Production Yield"
                          >
                            <Calculator size={12} />
                            {yieldConfig ? `${yieldConfig.cardsPerSheet}/sh` : '+ Yield'}
                          </button>
                        </div>
                      </td>

                      {/* Quantity Slabs */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedProductForSlabs(p)}
                          className={`btn btn-sm ${slabs.length > 0 ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Tag size={12} />
                          {slabs.length > 0 ? `${slabs.length} Slab${slabs.length > 1 ? 's' : ''}` : '+ Slabs'}
                        </button>
                      </td>

                      {/* Linked Specs */}
                      <td>
                        <button
                          type="button"
                          onClick={() => setSelectedProductForSpecs(p)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <Layers size={12} />
                          {specs.length} Spec{specs.length === 1 ? '' : 's'}
                        </button>
                      </td>

                      {/* Action Menu */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '0.2rem' }}
                            title="Edit Master Product"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete product "${p.name}"? This action cannot be undone.`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                            title="Delete Product"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals with proper conditional mounting */}
      {Boolean(isAddOpen || editingProduct) && (
        <CreateProductModal
          isOpen={true}
          onClose={() => {
            setIsAddOpen(false);
            setEditingProduct(null);
          }}
          productToEdit={editingProduct}
        />
      )}

      {Boolean(selectedProductForSpecs) && (
        <MaterialSpecModal
          isOpen={true}
          onClose={() => setSelectedProductForSpecs(null)}
          product={selectedProductForSpecs}
        />
      )}

      {Boolean(selectedProductForSlabs) && (
        <ProductSlabsModal
          isOpen={true}
          onClose={() => setSelectedProductForSlabs(null)}
          product={selectedProductForSlabs}
        />
      )}

      {Boolean(selectedProductForYield) && (
        <YieldCalculatorModal
          isOpen={true}
          onClose={() => setSelectedProductForYield(null)}
          product={selectedProductForYield}
        />
      )}

      {Boolean(selectedProductForBOM) && (
        <ProductBOMModal
          isOpen={true}
          onClose={() => setSelectedProductForBOM(null)}
          product={selectedProductForBOM}
        />
      )}

      {Boolean(isCustomerPricingOpen) && (
        <CustomerPricingRulesModal
          isOpen={true}
          onClose={() => setIsCustomerPricingOpen(false)}
        />
      )}

    </div>
  );
};
export default ProductsView;
