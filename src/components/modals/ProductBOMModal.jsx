import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Layers, X, Plus, Trash2, Save, Cpu, Zap, Package, AlertCircle, Check, DollarSign, Sparkles } from 'lucide-react';
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

  const rawInventory = useMemo(() => {
    return inventory || [];
  }, [inventory]);

  const selectedMachine = useMemo(() => {
    if (!machineId) return null;
    return (machines || []).find(m => m.id === machineId) || null;
  }, [machineId, machines]);

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
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1020px', width: '96vw', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #6b21a8, #9333ea)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.15)' }}>
              <Layers size={22} color="#f3e8ff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  Bill of Materials (BOM) & Production Recipe
                </h3>
                <span style={{ fontSize: '0.72rem', background: '#581c87', color: '#f3e8ff', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                  {product.name}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#f3e8ff' }}>
                Multi-component recipe: raw inventory inputs, machine rates, direct labour & finishing operations.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '1.25rem' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Header Row: Recipe Name & Output Yield */}
          <div className="card" style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Recipe / BOM Name *
                </label>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={bomName}
                  onChange={(e) => setBomName(e.target.value)}
                  placeholder="e.g. Mug Sublimation Standard Recipe"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                  Batch Output Yield *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    style={{ fontWeight: 800, textAlign: 'center' }}
                    value={outputQty}
                    onChange={(e) => setOutputQty(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ width: '80px', textAlign: 'center' }}
                    value={outputUnit}
                    onChange={(e) => setOutputUnit(e.target.value)}
                    placeholder="Unit"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.2rem' }}>
                <input
                  type="checkbox"
                  id="bomIsDefaultCheck"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#9333ea', cursor: 'pointer' }}
                />
                <label htmlFor="bomIsDefaultCheck" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                  Default Recipe (Sets Product Cost)
                </label>
              </div>
            </div>
          </div>

          {/* Section 1: Raw Materials Ingredients Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Package size={16} color="#9333ea" /> Raw Materials & Inventory Substrates
              </h4>
              <button
                type="button"
                onClick={handleAddMaterialRow}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={14} /> Add Raw Material
              </button>
            </div>

            <div className="table-responsive" style={{ border: '1px solid #cbd5e1', borderRadius: '8px' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Raw Material / Stock Item</th>
                    <th style={{ width: '110px' }}>Qty / Batch</th>
                    <th style={{ width: '80px' }}>Unit</th>
                    <th style={{ width: '130px' }}>Purchase Rate (₹)</th>
                    <th style={{ width: '100px' }}>Wastage %</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Row Cost (₹)</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Deduct Stock</th>
                    <th style={{ width: '40px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rawMaterials.map((rm, idx) => {
                    const rowQty = Number(rm.quantity || 0);
                    const rowCost = Number(rm.unit_cost || 0);
                    const rowWaste = Number(rm.wastage_pct || 0);
                    const rowTotal = rowQty * rowCost * (1 + rowWaste / 100);

                    return (
                      <tr key={rm.id || idx}>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={rm.inventory_id || ''}
                            onChange={(e) => handleSelectInventory(idx, e.target.value)}
                          >
                            <option value="">-- Select Material / Substrate --</option>
                            {rawInventory.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} ({inv.unit || 'Units'}) - Cost: ₹{inv.cost_price || inv.purchase_rate || 0}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0.001"
                            className="form-control form-control-sm"
                            style={{ fontWeight: 700 }}
                            value={rm.quantity}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{ textAlign: 'center' }}
                            value={rm.unit || 'Pcs'}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'unit', e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            step="0.10"
                            className="form-control form-control-sm"
                            style={{ fontWeight: 700 }}
                            value={rm.unit_cost}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            step="0.5"
                            className="form-control form-control-sm"
                            style={{ textAlign: 'center', color: '#d97706', fontWeight: 700 }}
                            value={rm.wastage_pct || 0}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'wastage_pct', parseFloat(e.target.value) || 0)}
                          />
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          ₹{rowTotal.toFixed(2)}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={rm.auto_deduct_stock !== false}
                            onChange={(e) => handleUpdateMaterialRow(idx, 'auto_deduct_stock', e.target.checked)}
                            title="Auto-deduct from stock upon job release"
                          />
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterialRow(idx)}
                            disabled={rawMaterials.length <= 1}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                    <td colSpan="5" style={{ textAlign: 'right' }}>
                      Total Raw Material Batch Cost:
                    </td>
                    <td style={{ textAlign: 'right', color: '#7e22ce', fontSize: '0.9rem' }}>
                      ₹{bomCalc.materialsCost.toFixed(2)}
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 2: Machine, Labour & Operations Overheads */}
          <div className="card" style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #cbd5e1' }}>
            <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Cpu size={16} color="#4338ca" /> Machine, Labour & Overhead Rates (Per Batch)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Machine Used</label>
                <select
                  className="form-select form-select-sm"
                  value={machineId}
                  onChange={(e) => setMachineId(e.target.value)}
                  style={{ marginBottom: '0.35rem' }}
                >
                  <option value="">-- None / Manual --</option>
                  {(machines || []).map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} (₹{m.hourlyRate || m.hourlyCost || 0}/hr)
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cost: ₹</span>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control form-control-sm"
                    value={machineCost}
                    onChange={(e) => setMachineCost(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Labour / Operator (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control form-control-sm"
                  value={labourCost}
                  onChange={(e) => setLabourCost(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Electricity & Energy (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control form-control-sm"
                  value={electricityCost}
                  onChange={(e) => setElectricityCost(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Finishing & Trimming (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control form-control-sm"
                  value={finishingCost}
                  onChange={(e) => setFinishingCost(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Packaging & Boxes (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  className="form-control form-control-sm"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Outsourced Vendor / Process</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={outsourcedProcess}
                    onChange={(e) => setOutsourcedProcess(e.target.value)}
                    placeholder="Process (e.g. UV Coating)"
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Cost: ₹</span>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control form-control-sm"
                      value={outsourcedCost}
                      onChange={(e) => setOutsourcedCost(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Summary Rollup Card */}
          <div className="card" style={{ background: '#faf5ff', border: '1px solid #d8b4fe', padding: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Batch Cost</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                  ₹{bomCalc.totalBatchCost.toFixed(2)}
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>For {outputQty} {outputUnit}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase' }}>Rollup Unit Cost</span>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#6b21a8', margin: '0.2rem 0' }}>
                  ₹{bomCalc.unitCost.toFixed(2)}
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Per {outputUnit}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Catalogue Selling Rate</span>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                  ₹{defaultSellingRate.toFixed(2)}
                </h3>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Per {outputUnit}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>Expected Gross Margin</span>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#047857', margin: '0.2rem 0' }}>
                  {marginPct.toFixed(1)}%
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>Profit: ₹{grossProfitPerUnit.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status alerts */}
          {statusMsg.text && (
            <div style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: statusMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: statusMsg.type === 'success' ? '#065f46' : '#991b1b',
              border: `1px solid ${statusMsg.type === 'success' ? '#a7f3d0' : '#fca5a5'}`
            }}>
              {statusMsg.type === 'success' ? <Check size={14} color="#10b981" /> : <AlertCircle size={14} color="#ef4444" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Save size={14} />
            {isSaving ? 'Saving BOM...' : 'Save Production Recipe'}
          </button>
        </div>

      </div>
    </div>
  );
};
export default ProductBOMModal;
