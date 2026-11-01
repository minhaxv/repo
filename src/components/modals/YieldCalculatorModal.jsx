import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Calculator, X, Save, Sparkles, AlertCircle, Check, Layers, Cpu, Scissors, Printer, FileText } from 'lucide-react';
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
        // Defaults for business card
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Production Yield & Sheet Calculator
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                  {product.name}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure printing sheet dimensions, cards-per-sheet yield, ink, lamination & scrap buffers.
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
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form: Parameters */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Sheet & Yield Specs */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Sheet & Imposition Layout
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Sheet Descriptor
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="e.g. 12x18 Digital Sheet"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                    Cards per Sheet (Yield) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={cardsPerSheet}
                      onChange={(e) => setCardsPerSheet(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">cards/sheet</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Sheet Dimensions (Inches)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={sheetWidthIn}
                      onChange={(e) => setSheetWidthIn(parseFloat(e.target.value) || 0)}
                      placeholder="W"
                      className="w-1/2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <span className="text-xs text-slate-400">×</span>
                    <input
                      type="number"
                      step="0.5"
                      value={sheetHeightIn}
                      onChange={(e) => setSheetHeightIn(parseFloat(e.target.value) || 0)}
                      placeholder="H"
                      className="w-1/2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Paper GSM
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={paperGsm}
                      onChange={(e) => setPaperGsm(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <span className="text-xs text-slate-500">GSM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Production Costs per Sheet */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-500" />
                Raw Paper & Printing Rates (Per Sheet)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Raw Paper Cost / Sheet (₹)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={paperSheetCost}
                    onChange={(e) => setPaperSheetCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Print Impression / Sheet (₹)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={printingSide}
                      onChange={(e) => setPrintingSide(e.target.value)}
                      className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="SINGLE">Single Side</option>
                      <option value="DOUBLE">Double Side</option>
                    </select>
                    <input
                      type="number"
                      step="0.50"
                      value={printingCostPerSheet}
                      onChange={(e) => setPrintingCostPerSheet(parseFloat(e.target.value) || 0)}
                      className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Ink / Toner Consumption / Sheet (₹)
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={inkCostPerSheet}
                    onChange={(e) => setInkCostPerSheet(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Wastage & Scrap Allowance (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={wastagePct}
                      onChange={(e) => setWastagePct(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 font-semibold"
                    />
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Finishing & Post-Press */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-violet-500" />
                Post-Press, Lamination & Cutting
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Lamination Type & Rate / Sheet (₹)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={laminationType}
                      onChange={(e) => setLaminationType(e.target.value)}
                      placeholder="e.g. Thermal Matte"
                      className="w-1/2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={laminationCostPerSheet}
                      onChange={(e) => setLaminationCostPerSheet(parseFloat(e.target.value) || 0)}
                      placeholder="₹"
                      className="w-1/2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Cutting & Slitting / Sheet (₹)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={cuttingCostPerSheet}
                    onChange={(e) => setCuttingCostPerSheet(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Overhead & Packing / Sheet (₹)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={overheadPerSheet}
                    onChange={(e) => setOverheadPerSheet(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Internal Notes
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Standard 30-up on Konica C6085"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Yield Simulator & Breakdown */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            
            {/* Simulation Header */}
            <div className="p-4 rounded-xl border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/20 dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Yield & Cost Simulation
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                  {cardsPerSheet} Cards / Sheet
                </span>
              </div>

              {/* Order Quantity Input */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Test Order Quantity (Cards)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="50"
                    value={simQty}
                    onChange={(e) => setSimQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-base font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <div className="flex gap-1">
                    {[300, 500, 1000].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSimQty(q)}
                        className={`px-2 py-1.5 text-xs font-medium rounded border ${simQty === q ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'}`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sheet Math Display */}
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Theoretical Net Sheets:</span>
                  <span className="font-mono font-bold">
                    CEILING({simQty} / {cardsPerSheet}) = <span className="text-indigo-600 dark:text-indigo-400">{yieldResult.requiredSheets}</span> sheets
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                  <span>Wastage Allowance ({wastagePct}%):</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400">
                    +{yieldResult.wasteSheets} sheets
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center font-bold text-slate-900 dark:text-white">
                  <span>Actual Production Sheets:</span>
                  <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                    {yieldResult.actualSheets} sheets
                  </span>
                </div>
              </div>

              {/* Cost Breakdown Table */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Paper Cost ({yieldResult.actualSheets} sh × ₹{paperSheetCost})</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{yieldResult.paperCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Print Impression Cost ({yieldResult.actualSheets} sh × ₹{printingCostPerSheet})</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{yieldResult.printCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Ink / Toner Cost ({yieldResult.actualSheets} sh × ₹{inkCostPerSheet})</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{yieldResult.inkCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Lamination ({laminationType})</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{yieldResult.laminationCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Cutting & Trimming</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{yieldResult.cuttingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span>Overhead & Packaging</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">₹{yieldResult.overheadCost.toFixed(2)}</span>
                </div>
              </div>

              {/* Summary Rollup Card */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white dark:bg-black/50 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Total Production Job Cost:</span>
                  <span className="text-base font-bold text-white font-mono">
                    ₹{yieldResult.totalJobCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400 pt-1.5 border-t border-slate-800">
                  <span className="font-semibold text-emerald-400">Calculated Cost Per Card:</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    ₹{yieldResult.unitCostPerCard.toFixed(2)} / card
                  </span>
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

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Yield configs automatically calculate required sheets & baseline job costing on Sales Orders.
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
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Yield Configuration'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default YieldCalculatorModal;
