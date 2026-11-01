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
  Cpu, UserCheck, Download, Upload, Filter, Sparkles, Check, DollarSign,
  TrendingUp, AlertTriangle, ArrowUpDown
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

  // Pricing method helper
  const renderPricingBadge = (method) => {
    switch (method) {
      case 'SLAB':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 w-max">
            <TrendingUp size={11} /> Quantity Slab
          </span>
        );
      case 'CUSTOM_QUOTE':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 w-max">
            <Calculator size={11} /> Custom Quote
          </span>
        );
      case 'DIMENSION':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1 w-max">
            <Layers size={11} /> Sq.Ft / Dimension
          </span>
        );
      case 'CUSTOMER_NEGOTIATED':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1 w-max">
            <UserCheck size={11} /> Contract / Negotiated
          </span>
        );
      case 'FIXED':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1 w-max">
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
    <div className="view-container space-y-5">
      
      {/* Header & Global Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
              <Package size={22} />
            </div>
            ScreenArts Product Catalogue & Pricing Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Dynamic 5-tier pricing methods, production yield imposition, bill of materials recipes & customer contracted rates.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCustomerPricingOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <UserCheck size={14} />
            Customer Price Lists ({customerPricingRules?.length || 0})
          </button>

          <label className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm">
            <Upload size={14} />
            Import JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Download size={14} />
            Export
          </button>

          <button
            onClick={() => { setEditingProduct(null); setIsAddOpen(true); }}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus size={15} /> + Add Product
          </button>
        </div>
      </div>

      {/* Filter Toolbar & Pills */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        
        {/* Top search & quick counts */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="Search products by SKU, name, barcode, substrate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Showing <strong className="text-slate-900 dark:text-white">{filteredProducts.length}</strong> of {products?.length || 0} Products</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mr-1">Category:</span>
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${selectedCategory === 'ALL' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}
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
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'}`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Pricing Method Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider mr-1">Pricing:</span>
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
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${selectedMethod === m.id ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {m.label}
            </button>
          ))}
        </div>

      </div>

      {/* Main Catalogue Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="erp-table w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Pricing Method</th>
                <th className="py-3 px-3 text-right">Selling Rate</th>
                <th className="py-3 px-3 text-right">Est. Unit Cost</th>
                <th className="py-3 px-3 text-center">Gross Margin</th>
                <th className="py-3 px-3 text-center">BOM / Yield</th>
                <th className="py-3 px-3 text-center">Quantity Slabs</th>
                <th className="py-3 px-3">Specs</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
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
                  const bom = (productBoms || []).find((b) => b.productId === p.id);
                  const yieldConfig = (productYieldConfigs || []).find((y) => y.productId === p.id);

                  // Margin calculation
                  const grossProfit = defaultRate - estimatedCost;
                  const marginPct = defaultRate > 0 ? (grossProfit / defaultRate) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {p.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                          {p.sku && <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-semibold text-slate-600 dark:text-slate-300">SKU: {p.sku}</span>}
                          {p.barcode && <span>EAN: {p.barcode}</span>}
                          <span>ID: {p.id}</span>
                        </div>
                        {p.minOrderQty && p.minOrderQty > 1 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                            MOQ: {p.minOrderQty} {p.unit || 'Pcs'}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.category || 'Standard'}
                        </span>
                        {p.defaultVendor && (
                          <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 mt-1">
                            🏬 {p.defaultVendor}
                          </div>
                        )}
                      </td>

                      {/* Pricing Method Badge */}
                      <td className="py-3 px-3">
                        {renderPricingBadge(pMethod)}
                      </td>

                      {/* Default Selling Rate */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs">
                          ₹{defaultRate.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400">/{p.unit || 'Pcs'}</span>
                      </td>

                      {/* Estimated Cost */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          ₹{estimatedCost.toFixed(2)}
                        </div>
                        {bom && (
                          <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-1 rounded">
                            BOM Recipe
                          </span>
                        )}
                      </td>

                      {/* Gross Margin % */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${marginPct >= 30 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : marginPct >= 15 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                          {marginPct.toFixed(1)}%
                        </span>
                      </td>

                      {/* BOM & Yield Configuration Trigger Buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* BOM Recipe Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedProductForBOM(p)}
                            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-semibold transition-all ${bom ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'}`}
                            title="Configure Bill of Materials (BOM) Production Recipe"
                          >
                            <Cpu size={13} />
                            {bom ? 'Recipe' : '+ BOM'}
                          </button>

                          {/* Yield Imposition Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedProductForYield(p)}
                            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 font-semibold transition-all ${yieldConfig ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'}`}
                            title="Configure Sheet Imposition & Production Yield (Cards/Sheet)"
                          >
                            <Calculator size={13} />
                            {yieldConfig ? `${yieldConfig.cardsPerSheet}/sh` : '+ Yield'}
                          </button>
                        </div>
                      </td>

                      {/* Quantity Slabs Trigger */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForSlabs(p)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg border flex items-center justify-center gap-1 mx-auto transition-all ${slabs.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'}`}
                        >
                          <Tag size={12} />
                          {slabs.length > 0 ? `${slabs.length} Slab${slabs.length > 1 ? 's' : ''}` : '+ Slabs'}
                        </button>
                      </td>

                      {/* Linked Specs Trigger */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setSelectedProductForSpecs(p)}
                          className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
                        >
                          <Layers size={12} />
                          {specs.length} Spec{specs.length === 1 ? '' : 's'}
                        </button>
                      </td>

                      {/* Action Menu */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                            title="Edit Master Product"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete product "${p.name}"? This action cannot be undone.`)) {
                                deleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 size={14} />
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

      {/* Modals */}
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

      <ProductSlabsModal
        isOpen={!!selectedProductForSlabs}
        onClose={() => setSelectedProductForSlabs(null)}
        product={selectedProductForSlabs}
      />

      <YieldCalculatorModal
        isOpen={!!selectedProductForYield}
        onClose={() => setSelectedProductForYield(null)}
        product={selectedProductForYield}
      />

      <ProductBOMModal
        isOpen={!!selectedProductForBOM}
        onClose={() => setSelectedProductForBOM(null)}
        product={selectedProductForBOM}
      />

      <CustomerPricingRulesModal
        isOpen={isCustomerPricingOpen}
        onClose={() => setIsCustomerPricingOpen(false)}
      />

    </div>
  );
};
export default ProductsView;
