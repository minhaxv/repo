import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Layers, X, Plus, Trash2, Save, Cpu, Zap, Scissors, Package, AlertCircle, Check, DollarSign, Sparkles } from 'lucide-react';
import { calculateBOMCost } from '../../utils/pricingEngine';

export const ProductBOMModal = ({ isOpen, onClose, product, initialSpecId = null }) => {
  const { productBoms, saveProductBOM, deleteProductBOM, inventory, machines, suppliers } = useERP();

  const [selectedSpecId, setSelectedSpecId] = useState(initialSpecId || '');
  const [bomName, setBomName] = useState('');
  const [outputQty, setOutputQty] = useState(1);
  const [outputUnit, setOutputUnit] = useState('Pcs');
  const [isDefault, setIsDefault] = useState(true);

  // Raw materials rows
  const [rawMaterials, setRawMaterials] = useState([
    {
      id: `RM-${Date.now()}-1`,
      inventory_id: '',
      item_name: '',
      quantity: 1,
      unit: 'Pcs',
      unit_cost: 0,
      wastage_pct: 0,
      auto_deduct_stock: true
    }
  ]);

  // Overhead & Operation costs per batch
  const [machineCost, setMachineCost] = useState(0);
  const [machineId, setMachineId] = useState('');
  const [labourCost, setLabourCost] = useState(0);
  const [electricityCost, setElectricityCost] = useState(0);
  const [finishingCost, setFinishingCost] = useState(0);
  const [packagingCost, setPackagingCost] = useState(0);
  const [outsourcedCost, setOutsourcedCost] = useState(0);
  const [outsourcedVendorId, setOutsourcedVendorId] = useState('');
  const [outsourcedProcess, setOutsourcedProcess] = useState('');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Find existing BOM for this product / spec
  const existingBOM = useMemo(() => {
    if (!product) return null;
    const boms = (productBoms || []).filter(b => b.productId === product.id);
    if (selectedSpecId) {
      const match = boms.find(b => b.specId === selectedSpecId);
      if (match) return match;
    }
    return boms.find(b => b.isDefault) || boms[0] || null;
  }, [product, productBoms, selectedSpecId]);

  useEffect(() => {
    if (isOpen && product) {
      if (existingBOM) {
        setBomName(existingBOM.bomName || `${product.name} Production Recipe`);
        setOutputQty(Number(existingBOM.outputQty || 1));
        setOutputUnit(existingBOM.outputUnit || product.unit || 'Pcs');
        setIsDefault(Boolean(existingBOM.isDefault));
        setRawMaterials(Array.isArray(existingBOM.rawMaterials) && existingBOM.rawMaterials.length > 0
          ? existingBOM.rawMaterials
          : [{ id: `RM-${Date.now()}-1`, inventory_id: '', item_name: '', quantity: 1, unit: 'Pcs', unit_cost: 0, wastage_pct: 0, auto_deduct_stock: true }]
        );
        setMachineCost(Number(existingBOM.machineCost || 0));
        setMachineId(existingBOM.machineId || '');
        setLabourCost(Number(existingBOM.labourCost || 0));
        setElectricityCost(Number(existingBOM.electricityCost || 0));
        setFinishingCost(Number(existingBOM.finishingCost || 0));
        setPackagingCost(Number(existingBOM.packagingCost || 0));
        setOutsourcedCost(Number(existingBOM.outsourcedCost || 0));
        setOutsourcedVendorId(existingBOM.outsourcedVendorId || '');
        setOutsourcedProcess(existingBOM.outsourcedProcess || '');
        setNotes(existingBOM.notes || '');
      } else {
        setBomName(`${product.name} Production Recipe`);
        setOutputQty(1);
        setOutputUnit(product.unit || 'Pcs');
        setIsDefault(true);
        setRawMaterials([{ id: `RM-${Date.now()}-1`, inventory_id: '', item_name: '', quantity: 1, unit: 'Pcs', unit_cost: 0, wastage_pct: 0, auto_deduct_stock: true }]);
        setMachineCost(0);
        setMachineId('');
        setLabourCost(0);
        setElectricityCost(0);
        setFinishingCost(0);
        setPackagingCost(0);
        setOutsourcedCost(0);
        setOutsourcedVendorId('');
        setOutsourcedProcess('');
        setNotes('');
      }
      setStatusMsg({ type: '', text: '' });
    }
  }, [isOpen, product, existingBOM]);

  // Inventory items for selection
  const rawInventory = useMemo(() => {
    return inventory || [];
  }, [inventory]);

  // Machine lookup
  const selectedMachine = useMemo(() => {
    if (!machineId) return null;
    return (machines || []).find(m => m.id === machineId) || null;
  }, [machineId, machines]);

  // Handle Inventory Selection for a raw material row
  const handleSelectInventory = (idx, invId) => {
    const inv = rawInventory.find(i => i.id === invId);
    setRawMaterials(prev => {
      const next = [...prev];
      if (inv) {
        next[idx] = {
          ...next[idx],
          inventory_id: inv.id,
          item_name: inv.name,
          unit: inv.unit || 'Pcs',
          unit_cost: Number(inv.cost_price || inv.purchase_rate || 0)
        };
      } else {
        next[idx] = {
          ...next[idx],
          inventory_id: '',
          item_name: '',
          unit_cost: 0
        };
      }
      return next;
    });
  };

  const handleUpdateMaterialRow = (idx, field, value) => {
    setRawMaterials(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleAddMaterialRow = () => {
    setRawMaterials(prev => [
      ...prev,
      {
        id: `RM-${Date.now()}-${prev.length + 1}`,
        inventory_id: '',
        item_name: '',
        quantity: 1,
        unit: 'Pcs',
        unit_cost: 0,
        wastage_pct: 0,
        auto_deduct_stock: true
      }
    ]);
  };

  const handleRemoveMaterialRow = (idx) => {
    if (rawMaterials.length <= 1) return;
    setRawMaterials(prev => prev.filter((_, i) => i !== idx));
  };

  // Real-time calculation of BOM rollup cost
  const bomCalc = useMemo(() => {
    return calculateBOMCost({
      bom: {
        output_qty: Math.max(1, Number(outputQty) || 1),
        raw_materials_json: JSON.stringify(rawMaterials),
        machine_cost: Number(machineCost || 0),
        labour_cost: Number(labourCost || 0),
        electricity_cost: Number(electricityCost || 0),
        finishing_cost: Number(finishingCost || 0),
        packaging_cost: Number(packagingCost || 0),
        outsourced_cost: Number(outsourcedCost || 0)
      },
      orderQty: Math.max(1, Number(outputQty) || 1)
    });
  }, [outputQty, rawMaterials, machineCost, labourCost, electricityCost, finishingCost, packagingCost, outsourcedCost]);

  if (!isOpen || !product) return null;

  const defaultSellingRate = Number(product.defaultRate || product.default_rate || 0);
  const grossProfitPerUnit = defaultSellingRate > 0 ? defaultSellingRate - bomCalc.unitCost : 0;
  const marginPct = defaultSellingRate > 0 ? (grossProfitPerUnit / defaultSellingRate) * 100 : 0;

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg({ type: '', text: '' });
    try {
      await saveProductBOM(product.id, {
        id: existingBOM?.id || `BOM-${product.id}`,
        productId: product.id,
        specId: selectedSpecId || null,
        bomName: bomName.trim() || `${product.name} Production Recipe`,
        outputQty: Number(outputQty) || 1,
        outputUnit: outputUnit || product.unit || 'Pcs',
        isDefault,
        rawMaterials,
        machineCost: Number(machineCost || 0),
        machineId: machineId || null,
        machineName: selectedMachine?.name || null,
        labourCost: Number(labourCost || 0),
        electricityCost: Number(electricityCost || 0),
        finishingCost: Number(finishingCost || 0),
        packagingCost: Number(packagingCost || 0),
        outsourcedCost: Number(outsourcedCost || 0),
        outsourcedVendorId: outsourcedVendorId || null,
        outsourcedProcess: outsourcedProcess || null,
        totalEstimatedUnitCost: bomCalc.unitCost,
        notes
      });
      setStatusMsg({ type: 'success', text: `BOM recipe saved! Rollup unit cost: ₹${bomCalc.unitCost.toFixed(2)}/${outputUnit}` });
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save BOM' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Bill of Materials (BOM) & Production Recipe
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium">
                  {product.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define raw material inputs, stock deductions, machinery, power, labour & outsourced processing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Header Row: Recipe Name & Output Yield */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="md:col-span-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Recipe / BOM Name *
              </label>
              <input
                type="text"
                value={bomName}
                onChange={(e) => setBomName(e.target.value)}
                placeholder="e.g. Mug Sublimation Standard Recipe"
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Batch Output Yield *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={outputQty}
                  onChange={(e) => setOutputQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={outputUnit}
                  onChange={(e) => setOutputUnit(e.target.value)}
                  placeholder="Unit"
                  className="w-20 px-2 py-2 text-xs text-center font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="md:col-span-3 flex items-center justify-end pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Default Recipe (Sets Product Cost)
                </span>
              </label>
            </div>
          </div>

          {/* Section 1: Raw Materials Ingredients Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-500" />
                Raw Materials & Substrates
              </h3>
              <button
                type="button"
                onClick={handleAddMaterialRow}
                className="px-3 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 rounded-lg flex items-center gap-1.5 border border-purple-200 dark:border-purple-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Material
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Raw Material / Stock Item</th>
                    <th className="px-3 py-2.5 w-24">Qty Per Batch</th>
                    <th className="px-3 py-2.5 w-20">Unit</th>
                    <th className="px-3 py-2.5 w-28">Purchase Rate (₹)</th>
                    <th className="px-3 py-2.5 w-20">Wastage %</th>
                    <th className="px-3 py-2.5 w-28 text-right">Row Cost (₹)</th>
                    <th className="px-3 py-2.5 w-24 text-center">Deduct Stock</th>
                    <th className="px-2 py-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {rawMaterials.map((rm, idx) => {
                    const rowQty = Number(rm.quantity || 0);
                    const rowCost = Number(rm.unit_cost || 0);
                    const rowWaste = Number(rm.wastage_pct || 0);
                    const rowTotal = rowQty * rowCost * (1 + rowWaste / 100);

                    return (
                      <tr key={rm.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2">
                          <select
                            value={rm.inventory_id || ''}
                            onChange={(e) => handleSelectInventory(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                          >
                            <option value="">-- Select Material / Substrate --</option>
                            {rawInventory.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} ({inv.unit || 'Units'}) - Cost: ₹{inv.cost_price || inv.purchase_rate || 0}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0.001"
                            value={rm.quantity}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={rm.unit || 'Pcs'}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.10"
                            value={rm.unit_cost}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </td>

                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.5"
                            value={rm.wastage_pct || 0}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'wastage_pct', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 text-xs text-center rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 font-semibold"
                          />
                        </td>

                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          ₹{rowTotal.toFixed(2)}
                        </td>

                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={rm.auto_deduct_stock !== false}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'auto_deduct_stock', e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                            title="Automatically issue & deduct from stock on production job release"
                          />
                        </td>

                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterialRow(idx)}
                            disabled={rawMaterials.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:opacity-20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                  <tr>
                    <td colSpan="5" className="px-3 py-2 text-right">
                      Total Raw Material Cost (Batch):
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-purple-600 dark:text-purple-400 text-sm">
                      ₹{bomCalc.materialsCost.toFixed(2)}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 2: Machine, Labour, Electricity & Operations Overheads */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-500" />
              Machine, Labour & Operation Overheads (Per Batch)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              
              {/* Machine Selection & Cost */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Machine Used
                </label>
                <select
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 mb-1.5"
                >
                  <option value="">-- None / Manual --</option>
                  {(machines || []).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} (₹{m.hourlyRate || m.hourlyCost || 0}/hr)
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Machine Cost: ₹</span>
                  <input
                    type="number"
                    step="0.5"
                    value={machineCost}
                    onChange={(e) => setMachineCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Labour Cost */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Labour / Operator (₹)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={labourCost}
                  onChange={(e) => setLabourCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Electricity & Energy */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Electricity & Utilities (₹)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={electricityCost}
                  onChange={(e) => setElectricityCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Finishing & Post-Press */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Finishing & Trimming (₹)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={finishingCost}
                  onChange={(e) => setFinishingCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Packaging */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Packaging & Boxes (₹)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Outsourced Process & Vendor */}
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Outsourced Process & External Vendor
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={outsourcedProcess}
                    onChange={(e) => setOutsourcedProcess(e.target.value)}
                    placeholder="e.g. UV Varnish / Die-Cutting"
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <select
                    value={outsourcedVendorId}
                    onChange={(e) => setOutsourcedVendorId(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="">-- Outsourced Vendor --</option>
                    {(suppliers || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Rate: ₹</span>
                    <input
                      type="number"
                      step="0.5"
                      value={outsourcedCost}
                      onChange={(e) => setOutsourcedCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Summary Rollup Card */}
          <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/60 via-white to-purple-50/30 dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
              
              <div className="text-center px-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Batch Cost</span>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                  ₹{bomCalc.totalBatchCost.toFixed(2)}
                </div>
                <span className="text-xs text-slate-400">For {outputQty} {outputUnit}</span>
              </div>

              <div className="text-center px-3">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">Rollup Unit Cost</span>
                <div className="text-xl font-black font-mono text-purple-700 dark:text-purple-300 mt-1">
                  ₹{bomCalc.unitCost.toFixed(2)}
                </div>
                <span className="text-xs text-slate-400">Per {outputUnit}</span>
              </div>

              <div className="text-center px-3 pt-2 md:pt-0">
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Catalogue Selling Rate</span>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                  ₹{defaultSellingRate.toFixed(2)}
                </div>
                <span className="text-xs text-slate-400">Per {outputUnit}</span>
              </div>

              <div className="text-center px-3 pt-2 md:pt-0">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Expected Gross Margin</span>
                <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                  {marginPct.toFixed(1)}%
                </div>
                <span className="text-xs text-slate-400 font-mono">Profit: ₹{grossProfitPerUnit.toFixed(2)}</span>
              </div>

            </div>
          </div>

          {/* Status alerts */}
          {statusMsg.text && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300'}`}>
              {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Saving default BOM automatically updates the product estimated base cost.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving BOM...' : 'Save Production Recipe'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default ProductBOMModal;
