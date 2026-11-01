import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Calculator, X, Save, Sparkles, Check, AlertCircle, FileText, Layers, Scissors, Printer } from 'lucide-react';
import { calculateProductionYield } from '../../utils/pricingEngine';

export const YieldCalculatorModal = ({ isOpen, onClose, product }) => {
  const { productYieldConfigs, saveProductYieldConfig, inventory } = useERP();

  // Find existing config or initialize defaults
  const existingConfig = useMemo(() => {
    if (!product) return null;
    return (productYieldConfigs || []).find(y => y.productId === product.id) || null;
  }, [product, productYieldConfigs]);

  const [sheetName, setSheetName] = useState('12x18 Digital Sheet');
  const [sheetWidthIn, setSheetWidthIn] = useState(12);
  const [sheetHeightIn, setSheetHeightIn] = useState(18);
  const [cardsPerSheet, setCardsPerSheet] = useState(30);
  const [paperMaterialId, setPaperMaterialId] = useState('');
  const [paperGsm, setPaperGsm] = useState(300);
  const [paperSheetCost, setPaperSheetCost] = useState(6.50);
  const [printingSide, setPrintingSide] = useState('DOUBLE');
  const [printingCostPerSheet, setPrintingCostPerSheet] = useState(8.00);
  const [inkCostPerSheet, setInkCostPerSheet] = useState(1.50);
  const [laminationType, setLaminationType] = useState('Thermal Matte');
  const [laminationCostPerSheet, setLaminationCostPerSheet] = useState(4.00);
  const [cuttingCostPerSheet, setCuttingCostPerSheet] = useState(1.50);
  const [wastagePct, setWastagePct] = useState(5.0);
  const [overheadPerSheet, setOverheadPerSheet] = useState(0.50);
  const [notes, setNotes] = useState('');

  // Simulation test quantity
  const [simQty, setSimQty] = useState(500);

  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen && product) {
      if (existingConfig) {
        setSheetName(existingConfig.sheetName || '12x18 Digital Sheet');
        setSheetWidthIn(existingConfig.sheetWidthIn || 12);
        setSheetHeightIn(existingConfig.sheetHeightIn || 18);
        setCardsPerSheet(existingConfig.cardsPerSheet || 30);
        setPaperMaterialId(existingConfig.paperMaterialId || '');
        setPaperGsm(existingConfig.paperGsm || 300);
        setPaperSheetCost(existingConfig.paperSheetCost || 6.50);
        setPrintingSide(existingConfig.printingSide || 'DOUBLE');
        setPrintingCostPerSheet(existingConfig.printingCostPerSheet || 8.00);
        setInkCostPerSheet(existingConfig.inkCostPerSheet || 1.50);
        setLaminationType(existingConfig.laminationType || 'Thermal Matte');
        setLaminationCostPerSheet(existingConfig.laminationCostPerSheet || 4.00);
        setCuttingCostPerSheet(existingConfig.cuttingCostPerSheet || 1.50);
        setWastagePct(existingConfig.wastagePct ?? 5.0);
        setOverheadPerSheet(existingConfig.overheadPerSheet ?? 0.50);
        setNotes(existingConfig.notes || '');
      } else {
        setSheetName('12x18 Digital Sheet');
        setSheetWidthIn(12);
        setSheetHeightIn(18);
        setCardsPerSheet(30);
        setPaperGsm(300);
        setPaperSheetCost(6.50);
        setPrintingSide('DOUBLE');
        setPrintingCostPerSheet(8.00);
        setInkCostPerSheet(1.50);
        setLaminationType('Thermal Matte');
        setLaminationCostPerSheet(4.00);
        setCuttingCostPerSheet(1.50);
        setWastagePct(5.0);
        setOverheadPerSheet(0.50);
        setNotes('');
      }
      setStatusMsg({ type: '', text: '' });
    }
  }, [isOpen, product, existingConfig]);

  // Current config object for real-time simulation
  const currentConfig = useMemo(() => ({
    sheet_name: sheetName,
    sheet_width_in: sheetWidthIn,
    sheet_height_in: sheetHeightIn,
    cards_per_sheet: cardsPerSheet,
    paper_material_id: paperMaterialId,
    paper_gsm: paperGsm,
    paper_sheet_cost: paperSheetCost,
    printing_side: printingSide,
    printing_cost_per_sheet: printingCostPerSheet,
    ink_cost_per_sheet: inkCostPerSheet,
    lamination_type: laminationType,
    lamination_cost_per_sheet: laminationCostPerSheet,
    cutting_cost_per_sheet: cuttingCostPerSheet,
    wastage_pct: wastagePct,
    overhead_per_sheet: overheadPerSheet
  }), [
    sheetName, sheetWidthIn, sheetHeightIn, cardsPerSheet, paperMaterialId,
    paperGsm, paperSheetCost, printingSide, printingCostPerSheet, inkCostPerSheet,
    laminationType, laminationCostPerSheet, cuttingCostPerSheet, wastagePct, overheadPerSheet
  ]);

  // Run yield calculation
  const yieldResult = useMemo(() => {
    return calculateProductionYield({
      orderQty: Math.max(1, Number(simQty) || 1),
      yieldConfig: currentConfig
    });
  }, [simQty, currentConfig]);

  if (!isOpen || !product) return null;

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMsg({ type: '', text: '' });
    try {
      await saveProductYieldConfig(product.id, {
        id: existingConfig?.id || `YLD-${product.id}`,
        productId: product.id,
        sheetName,
        sheetWidthIn: Number(sheetWidthIn),
        sheetHeightIn: Number(sheetHeightIn),
        cardsPerSheet: Number(cardsPerSheet),
        paperMaterialId,
        paperGsm: Number(paperGsm),
        paperSheetCost: Number(paperSheetCost),
        printingSide,
        printingCostPerSheet: Number(printingCostPerSheet),
        inkCostPerSheet: Number(inkCostPerSheet),
        laminationType,
        laminationCostPerSheet: Number(laminationCostPerSheet),
        cuttingCostPerSheet: Number(cuttingCostPerSheet),
        wastagePct: Number(wastagePct),
        overheadPerSheet: Number(overheadPerSheet),
        notes
      });
      setStatusMsg({ type: 'success', text: 'Yield configuration saved successfully!' });
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '980px', width: '95vw', maxHeight: '92vh' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #3730a3, #4f46e5)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '0.45rem', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.15)' }}>
              <Calculator size={22} color="#c7d2fe" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  Production Yield & Imposition Calculator
                </h3>
                <span style={{ fontSize: '0.72rem', background: '#312e81', color: '#e0e7ff', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                  {product.name}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#c7d2fe' }}>
                Formula: CEILING(Order Qty / Cards Per Sheet) + Scrap Allowance Buffer.
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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            
            {/* Left Column: Sheet & Imposition Parameters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="card" style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #cbd5e1' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={16} color="#4f46e5" /> Sheet & Imposition Setup
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Sheet Descriptor</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="e.g. 12x18 Digital Sheet"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca' }}>
                      Cards per Sheet (Yield) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="form-control form-control-sm"
                      style={{ fontWeight: 800, color: '#4338ca', background: '#eef2ff' }}
                      value={cardsPerSheet}
                      onChange={(e) => setCardsPerSheet(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Width × Height (Inches)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="number"
                        step="0.5"
                        className="form-control form-control-sm"
                        value={sheetWidthIn}
                        onChange={(e) => setSheetWidthIn(parseFloat(e.target.value) || 0)}
                        placeholder="W"
                      />
                      <span>×</span>
                      <input
                        type="number"
                        step="0.5"
                        className="form-control form-control-sm"
                        value={sheetHeightIn}
                        onChange={(e) => setSheetHeightIn(parseFloat(e.target.value) || 0)}
                        placeholder="H"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Paper GSM</label>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={paperGsm}
                      onChange={(e) => setPaperGsm(parseInt(e.target.value) || 0)}
                      placeholder="300 GSM"
                    />
                  </div>
                </div>
              </div>

              {/* Sheet Costing Parameters */}
              <div className="card" style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #cbd5e1' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={16} color="#059669" /> Sheet Processing & Overhead Rates
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Paper Cost/Sheet</label>
                    <input
                      type="number"
                      step="0.10"
                      className="form-control form-control-sm"
                      value={paperSheetCost}
                      onChange={(e) => setPaperSheetCost(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Print Cost/Sheet</label>
                    <input
                      type="number"
                      step="0.10"
                      className="form-control form-control-sm"
                      value={printingCostPerSheet}
                      onChange={(e) => setPrintingCostPerSheet(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Ink Cost/Sheet</label>
                    <input
                      type="number"
                      step="0.10"
                      className="form-control form-control-sm"
                      value={inkCostPerSheet}
                      onChange={(e) => setInkCostPerSheet(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Lamination Rate</label>
                    <input
                      type="number"
                      step="0.10"
                      className="form-control form-control-sm"
                      value={laminationCostPerSheet}
                      onChange={(e) => setLaminationCostPerSheet(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700 }}>Cutting Rate</label>
                    <input
                      type="number"
                      step="0.10"
                      className="form-control form-control-sm"
                      value={cuttingCostPerSheet}
                      onChange={(e) => setCuttingCostPerSheet(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e11d48' }}>Wastage Buffer %</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-control form-control-sm"
                      style={{ fontWeight: 800, color: '#e11d48' }}
                      value={wastagePct}
                      onChange={(e) => setWastagePct(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Live Yield Simulation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="card" style={{ background: '#f8fafc', padding: '1.25rem', border: '1px solid #c7d2fe' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="#4f46e5" /> Live Production Simulation
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Order Qty:</span>
                    <input
                      type="number"
                      min="1"
                      className="form-control form-control-sm"
                      style={{ width: '90px', fontWeight: 800, textAlign: 'center' }}
                      value={simQty}
                      onChange={(e) => setSimQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>BASE SHEETS REQUIRED</span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                      {yieldResult.baseSheets} <small style={{ fontSize: '0.75rem', color: '#64748b' }}>sheets</small>
                    </h3>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>CEILING({simQty} / {cardsPerSheet})</span>
                  </div>

                  <div style={{ background: '#eef2ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                    <span style={{ fontSize: '0.72rem', color: '#4338ca', fontWeight: 700 }}>TOTAL PRODUCTION SHEETS</span>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#3730a3', margin: '0.2rem 0' }}>
                      {yieldResult.totalSheets} <small style={{ fontSize: '0.75rem', color: '#4338ca' }}>sheets</small>
                    </h3>
                    <span style={{ fontSize: '0.68rem', color: '#6366f1' }}>Includes +{yieldResult.wastageSheets} scrap buffer</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Paper Substrate:</span>
                    <strong>₹{yieldResult.breakdown?.paperCost?.toFixed(2) || '0.00'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Printing & Ink:</span>
                    <strong>₹{((yieldResult.breakdown?.printCost || 0) + (yieldResult.breakdown?.inkCost || 0)).toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Lamination ({laminationType}):</span>
                    <strong>₹{yieldResult.breakdown?.laminationCost?.toFixed(2) || '0.00'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', fontSize: '0.78rem' }}>
                    <span style={{ color: '#64748b' }}>Precision Die Cutting:</span>
                    <strong>₹{yieldResult.breakdown?.cuttingCost?.toFixed(2) || '0.00'}</strong>
                  </div>
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '0.4rem', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800 }}>
                    <span>Total Batch Cost:</span>
                    <span style={{ color: '#1e40af' }}>₹{yieldResult.totalProductionCost?.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, marginTop: '0.2rem', color: '#059669' }}>
                    <span>Estimated Cost per Card:</span>
                    <span>₹{yieldResult.unitCostPerCard?.toFixed(3)}</span>
                  </div>
                </div>

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

            </div>

          </div>

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
            {isSaving ? 'Saving...' : 'Save Yield Configuration'}
          </button>
        </div>

      </div>
    </div>
  );
};
export default YieldCalculatorModal;
