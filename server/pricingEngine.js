/**
 * SCREENARTS / PRINTFLOW ERP - ADVANCED PRICING & AUTOMATIC JOB COSTING ENGINE
 * 
 * Implements 5 Reusable Pricing Methods:
 * 1. Fixed unit price
 * 2. Quantity slab pricing
 * 3. Custom quotation pricing (with authorized overrides)
 * 4. Material and dimension-based pricing
 * 5. Customer-specific negotiated pricing & price lists
 * 
 * Also handles:
 * - Production Yield Calculator (e.g. 30 business cards per sheet, CEILING formulas)
 * - Bill of Materials (BOM) multi-component costing (raw materials, machine, labour, electricity, packaging, outsource)
 * - Profitability and historical price/cost snapshots
 */

/**
 * 1. Business Card & Sheet Print Production Yield Calculator (Requirement 4)
 * CEILING(order quantity / cards per sheet)
 * actual production sheets = CEILING(required_sheets * (1 + wastage_pct/100))
 */
export function calculateProductionYield(arg1, arg2) {
  let yieldConfig = arg1;
  let orderQuantity = arg2;
  if (arg1 && typeof arg1 === 'object' && ('yieldConfig' in arg1 || 'orderQty' in arg1 || 'orderQuantity' in arg1)) {
    yieldConfig = arg1.yieldConfig || arg1;
    orderQuantity = arg1.orderQty ?? arg1.orderQuantity ?? arg2;
  }

  const qty = Math.max(1, Number(orderQuantity || 1));
  const cardsPerSheet = Math.max(1, Number(yieldConfig?.cards_per_sheet ?? yieldConfig?.cardsPerSheet ?? 30));
  const requiredSheets = Math.ceil(qty / cardsPerSheet);
  const wastagePct = Number(yieldConfig?.wastage_pct ?? yieldConfig?.wastagePct ?? 5.0);
  const actualProductionSheets = Math.ceil(requiredSheets * (1 + wastagePct / 100));

  const paperSheetCost = Number(yieldConfig?.paper_sheet_cost ?? yieldConfig?.paperSheetCost ?? 6.50);
  const printingCostPerSheet = Number(yieldConfig?.printing_cost_per_sheet ?? yieldConfig?.printingCostPerSheet ?? 8.00);
  const inkCostPerSheet = Number(yieldConfig?.ink_cost_per_sheet ?? yieldConfig?.inkCostPerSheet ?? 1.50);
  const laminationCostPerSheet = Number(yieldConfig?.lamination_cost_per_sheet ?? yieldConfig?.laminationCostPerSheet ?? 4.00);
  const cuttingCostPerSheet = Number(yieldConfig?.cutting_cost_per_sheet ?? yieldConfig?.cuttingCostPerSheet ?? 1.50);
  const overheadPerSheet = Number(yieldConfig?.overhead_per_sheet ?? yieldConfig?.overheadPerSheet ?? 0.50);

  const costPerSheet = Number((paperSheetCost + printingCostPerSheet + inkCostPerSheet + laminationCostPerSheet + cuttingCostPerSheet + overheadPerSheet).toFixed(2));
  const paperCost = Number((actualProductionSheets * paperSheetCost).toFixed(2));
  const printingCost = Number((actualProductionSheets * printingCostPerSheet).toFixed(2));
  const inkCost = Number((actualProductionSheets * inkCostPerSheet).toFixed(2));
  const laminationCost = Number((actualProductionSheets * laminationCostPerSheet).toFixed(2));
  const cuttingCost = Number((actualProductionSheets * cuttingCostPerSheet).toFixed(2));
  const overheadCost = Number((actualProductionSheets * overheadPerSheet).toFixed(2));

  const totalProductionCost = Number((paperCost + printingCost + inkCost + laminationCost + cuttingCost + overheadCost).toFixed(2));
  const unitProductionCost = Number((totalProductionCost / qty).toFixed(4));

  return {
    orderQuantity: qty,
    sheetDimensions: `${yieldConfig?.sheet_width_in || 12}x${yieldConfig?.sheet_height_in || 18} Inch`,
    paperGsm: Number(yieldConfig?.paper_gsm || yieldConfig?.paperGsm || 300),
    cardsPerSheet,
    requiredSheets,
    baseSheets: requiredSheets,
    wastagePct,
    actualProductionSheets,
    actualSheets: actualProductionSheets,
    costPerSheet,
    breakdown: {
      paperCost,
      printingCost,
      inkCost,
      laminationCost,
      cuttingCost,
      overheadCost
    },
    totalProductionCost,
    unitProductionCost,
    costPerCard: unitProductionCost
  };
}

/**
 * 2. BOM – Bill of Materials Cost Rollup (Requirement 5)
 * Calculates material consumption, machine, labor, electricity, finishing, packaging, outsourced operations
 */
export function calculateBOMCost(bomOrConfig, quantity = 1) {
  let bom = bomOrConfig;
  let qty = Math.max(1, Number(quantity || 1));
  if (bomOrConfig && typeof bomOrConfig === 'object' && ('bom' in bomOrConfig)) {
    bom = bomOrConfig.bom;
    qty = Math.max(1, Number(bomOrConfig.orderQty || bomOrConfig.quantity || quantity || 1));
  }

  if (!bom) {
    return {
      quantity: qty,
      materials: [],
      totalMaterialCost: 0,
      materialsCost: 0,
      machineCost: 0,
      labourCost: 0,
      electricityCost: 0,
      finishingCost: 0,
      packagingCost: 0,
      outsourcedCost: 0,
      totalOverheadCost: 0,
      totalCost: 0,
      totalBatchCost: 0,
      unitCost: 0,
      totalEstimatedUnitCost: 0
    };
  }

  let materials = [];
  try {
    materials = typeof bom.raw_materials_json === 'string'
      ? JSON.parse(bom.raw_materials_json || '[]')
      : (bom.raw_materials_json || bom.rawMaterials || []);
  } catch (e) {
    materials = [];
  }
  if (!Array.isArray(materials)) materials = [];

  const bomOutputQty = Math.max(1, Number(bom.output_qty ?? bom.outputQty ?? 1));

  let totalMaterialCost = 0;
  const materialAllocations = materials.map(mat => {
    const rawQty = Number(mat.quantity ?? mat.qty ?? mat.qty_per_unit ?? mat.qtyPerUnit ?? 1);
    // If qty_per_unit / qtyPerUnit is explicitly given, use it. Otherwise, divide batch quantity by bomOutputQty
    const qtyPerUnit = (mat.qty_per_unit != null || mat.qtyPerUnit != null)
      ? Number(mat.qty_per_unit ?? mat.qtyPerUnit)
      : (rawQty / bomOutputQty);
    const unitCost = Number(mat.unit_cost ?? mat.unitCost ?? mat.cost_price ?? mat.purchase_rate ?? 0);
    const wastagePct = Number(mat.wastage_pct ?? mat.wastagePct ?? 0);
    const grossQtyPerUnit = qtyPerUnit * (1 + wastagePct / 100);
    const totalRequiredQty = Number((grossQtyPerUnit * qty).toFixed(4));
    const lineCost = Number((totalRequiredQty * unitCost).toFixed(2));
    totalMaterialCost += lineCost;

    return {
      inventoryId: mat.inventory_id || mat.inventoryId || '',
      materialName: mat.material_name || mat.materialName || mat.item_name || mat.itemName || '',
      unit: mat.unit || 'Pcs',
      quantity: rawQty,
      qtyPerUnit,
      grossQtyPerUnit: Number(grossQtyPerUnit.toFixed(4)),
      totalRequiredQty,
      unitCost,
      wastagePct,
      lineCost,
      totalCost: lineCost
    };
  });

  const machineRatePerUnit = Number(bom.machine_cost ?? bom.machineCost ?? 0) / bomOutputQty;
  const labourRatePerUnit = Number(bom.labour_cost ?? bom.labourCost ?? 0) / bomOutputQty;
  const electricityRatePerUnit = Number(bom.electricity_cost ?? bom.electricityCost ?? 0) / bomOutputQty;
  const finishingRatePerUnit = Number(bom.finishing_cost ?? bom.finishingCost ?? 0) / bomOutputQty;
  const packagingRatePerUnit = Number(bom.packaging_cost ?? bom.packagingCost ?? 0) / bomOutputQty;
  const outsourcedRatePerUnit = Number(bom.outsourced_cost ?? bom.outsourcedCost ?? 0) / bomOutputQty;

  const machineCost = Number((machineRatePerUnit * qty).toFixed(2));
  const labourCost = Number((labourRatePerUnit * qty).toFixed(2));
  const electricityCost = Number((electricityRatePerUnit * qty).toFixed(2));
  const finishingCost = Number((finishingRatePerUnit * qty).toFixed(2));
  const packagingCost = Number((packagingRatePerUnit * qty).toFixed(2));
  const outsourcedCost = Number((outsourcedRatePerUnit * qty).toFixed(2));

  const totalOverheadCost = Number((machineCost + labourCost + electricityCost + finishingCost + packagingCost + outsourcedCost).toFixed(2));
  const totalCost = Number((totalMaterialCost + totalOverheadCost).toFixed(2));
  const unitCost = Number((totalCost / qty).toFixed(4));

  return {
    quantity: qty,
    materials: materialAllocations,
    totalMaterialCost: Number(totalMaterialCost.toFixed(2)),
    materialsCost: Number(totalMaterialCost.toFixed(2)),
    machineCost,
    labourCost,
    electricityCost,
    finishingCost,
    packagingCost,
    outsourcedCost,
    totalOverheadCost,
    totalCost,
    totalBatchCost: totalCost,
    unitCost,
    totalEstimatedUnitCost: unitCost
  };
}

/**
 * 3. Master Item Pricing & Costing Engine
 * Evaluates the 5 Pricing Methods and returns authoritative pricing, applied rule & costing snapshot
 */
export function resolveItemPricingAndCost(params = {}) {
  const item = params.item || {};
  const product = params.product || {};
  const spec = params.spec || null;
  const quantity = params.quantity ?? item.qty ?? item.quantity ?? 1;
  const width = params.width ?? item.width ?? 0;
  const height = params.height ?? item.height ?? 0;
  const unit = params.unit ?? item.unit ?? null;
  const customer = params.customer || null;
  const customerPricingRules = params.customerPricingRules || params.customerRules || [];
  const pricingSlabs = params.pricingSlabs || params.allSlabs || [];
  const yieldConfig = params.yieldConfig || null;
  const bom = params.bom || null;
  const manualRate = params.manualRate ?? item.customPrice ?? item.rate ?? null;
  const overrideReason = params.overrideReason ?? item.overrideReason ?? '';
  const authorizedUser = params.authorizedUser || null;
  const qty = Math.max(1, Number(quantity || 1));
  const numWidth = Number(width || 0);
  const numHeight = Number(height || 0);
  const effectiveUnit = (unit || spec?.unit || product?.unit || 'Pcs').trim();
  const effectiveCategory = product?.category || '';

  // Base catalogue rates
  const catalogueBaseRate = Number(spec?.sellingPrice ?? spec?.selling_price ?? product?.defaultRate ?? product?.default_rate ?? 0);
  const baseCost = Number(spec?.costPrice ?? spec?.cost_price ?? product?.estimatedCost ?? product?.estimated_cost ?? 0);

  // Chargeable area / dimension quantity multiplier
  let dimensionMultiplier = 1;
  const isDimensionUnit = ['sq.ft', 'sqft', 'sq.m', 'sqm', 'rft', 'running ft'].includes(effectiveUnit.toLowerCase());
  if (effectiveUnit.toLowerCase().includes('sq')) {
    if (numWidth > 0 && numHeight > 0) {
      dimensionMultiplier = numWidth * numHeight;
    }
  } else if (effectiveUnit.toLowerCase().includes('rft') || effectiveUnit.toLowerCase().includes('running')) {
    dimensionMultiplier = numWidth > 0 ? numWidth : (numHeight > 0 ? numHeight : 1);
  }

  const chargeableUnits = Number((qty * dimensionMultiplier).toFixed(2));

  // Determine production cost from BOM, Yield Config, or Base Cost
  let estimatedMaterialCost = 0;
  let estimatedLabourCost = 0;
  let estimatedMachineCost = 0;
  let estimatedOverheadCost = 0;
  let totalEstimatedUnitCost = baseCost;

  if (yieldConfig) {
    const yieldRes = calculateProductionYield(yieldConfig, qty);
    totalEstimatedUnitCost = yieldRes.unitProductionCost;
    estimatedMaterialCost = yieldRes.breakdown.paperCost + yieldRes.breakdown.inkCost + yieldRes.breakdown.laminationCost;
    estimatedLabourCost = yieldRes.breakdown.cuttingCost;
    estimatedMachineCost = yieldRes.breakdown.printingCost;
    estimatedOverheadCost = yieldRes.breakdown.overheadCost;
  } else if (bom) {
    const bomRes = calculateBOMCost(bom, qty);
    totalEstimatedUnitCost = bomRes.unitCost;
    estimatedMaterialCost = bomRes.totalMaterialCost;
    estimatedLabourCost = bomRes.labourCost;
    estimatedMachineCost = bomRes.machineCost;
    estimatedOverheadCost = bomRes.electricityCost + bomRes.finishingCost + bomRes.packagingCost + bomRes.outsourcedCost;
  } else {
    totalEstimatedUnitCost = baseCost;
    estimatedMaterialCost = Number((baseCost * 0.65).toFixed(2));
    estimatedLabourCost = Number((baseCost * 0.15).toFixed(2));
    estimatedMachineCost = Number((baseCost * 0.15).toFixed(2));
    estimatedOverheadCost = Number((baseCost * 0.05).toFixed(2));
  }

  // --- PRICING RESOLUTION ACROSS THE 5 METHODS ---
  let appliedPricingRule = 'FIXED_UNIT';
  let appliedRate = catalogueBaseRate;
  let ruleDetails = 'Standard catalogue unit price';
  let matchedRuleId = null;

  const todayStr = new Date().toISOString().split('T')[0];

  // METHOD 5: Customer-Specific Negotiated Pricing & Contracts (Highest Priority)
  let matchedCustomerRule = null;
  if (customer && customer.id && Array.isArray(customerPricingRules)) {
    // Priority:
    // 1. Exact match on Customer + Product + Spec
    // 2. Match on Customer + Product
    // 3. Match on Customer + Category
    // 4. Match on Customer Type / Tier (e.g. 'Wholesale', 'Corporate')
    const activeRules = customerPricingRules.filter(r => {
      if (!r.active && r.active !== 1 && r.active !== undefined) return false;
      if (r.start_date && r.start_date > todayStr) return false;
      if (r.end_date && r.end_date < todayStr) return false;
      if (r.min_qty && qty < Number(r.min_qty)) return false;

      const matchesCustomer = r.customer_id === customer.id ||
                              r.customerId === customer.id ||
                              (r.customer_type && (customer.customer_type === r.customer_type || customer.customerType === r.customer_type));
      if (!matchesCustomer) return false;

      if (r.spec_id && spec && r.spec_id === spec.id) return true;
      if (r.product_id && product && r.product_id === product.id) return true;
      if (r.product_category && effectiveCategory && r.product_category.toLowerCase() === effectiveCategory.toLowerCase()) return true;
      return false;
    });

    // Sort by specificity: product+spec first, product second, category third
    activeRules.sort((a, b) => {
      const scoreA = (a.spec_id ? 4 : 0) + (a.product_id ? 2 : 0) + (a.priority || 0);
      const scoreB = (b.spec_id ? 4 : 0) + (b.product_id ? 2 : 0) + (b.priority || 0);
      return scoreB - scoreA;
    });

    if (activeRules.length > 0) {
      matchedCustomerRule = activeRules[0];
    }
  }

  // Apply Customer Rule if found
  if (matchedCustomerRule) {
    appliedPricingRule = 'CUSTOMER_NEGOTIATED';
    matchedRuleId = matchedCustomerRule.id;

    if (matchedCustomerRule.pricing_type === 'FIXED_RATE' || matchedCustomerRule.pricingType === 'FIXED_RATE') {
      appliedRate = Number(matchedCustomerRule.custom_rate ?? matchedCustomerRule.customRate ?? catalogueBaseRate);
      ruleDetails = `Contracted Negotiated Rate (₹${appliedRate}/${effectiveUnit}) for ${customer?.name || 'Customer'}`;
    } else if (matchedCustomerRule.pricing_type === 'PERCENT_DISCOUNT' || matchedCustomerRule.pricingType === 'PERCENT_DISCOUNT') {
      const discPct = Number(matchedCustomerRule.discount_pct ?? matchedCustomerRule.discountPct ?? 0);
      appliedRate = Number((catalogueBaseRate * (1 - discPct / 100)).toFixed(2));
      ruleDetails = `Customer Agreement Discount: ${discPct}% off standard rate (₹${catalogueBaseRate} -> ₹${appliedRate})`;
    } else if (matchedCustomerRule.pricing_type === 'MARKUP_OVER_COST' || matchedCustomerRule.pricingType === 'MARKUP_OVER_COST') {
      const markupPct = Number(matchedCustomerRule.discount_pct ?? matchedCustomerRule.discountPct ?? 25);
      appliedRate = Number((totalEstimatedUnitCost * (1 + markupPct / 100)).toFixed(2));
      ruleDetails = `Cost-Plus Agreement: Cost ₹${totalEstimatedUnitCost} + ${markupPct}% markup`;
    }
  } else {
    // METHOD 2: Quantity Slab Pricing (Check if Product or Spec has slabs)
    const availableSlabs = (pricingSlabs || []).filter(s => {
      if (s.productId !== product?.id && s.product_id !== product?.id) return false;
      if (s.start_date && s.start_date > todayStr) return false;
      if (s.end_date && s.end_date < todayStr) return false;
      if (s.customer_id && customer && s.customer_id !== customer.id) return false;
      if (s.customer_type && customer && s.customer_type !== customer.customer_type && s.customer_type !== customer.customerType) return false;
      return true;
    });

    // Match on spec slab first, then general slab
    let matchedSlab = null;
    if (spec && spec.id) {
      const specSlabs = availableSlabs
        .filter(s => s.spec_id === spec.id || s.specId === spec.id)
        .sort((a, b) => Number(a.min_qty || a.minQty) - Number(b.min_qty || b.minQty));
      matchedSlab = specSlabs.find(s => {
        const min = Number(s.min_qty ?? s.minQty ?? 0);
        const max = s.max_qty !== null && s.max_qty !== undefined && s.max_qty !== '' ? Number(s.max_qty) : (s.maxQty ? Number(s.maxQty) : Infinity);
        return qty >= min && qty <= max;
      });
    }

    if (!matchedSlab) {
      const generalSlabs = availableSlabs
        .filter(s => !s.spec_id && !s.specId)
        .sort((a, b) => Number(a.min_qty || a.minQty) - Number(b.min_qty || b.minQty));
      matchedSlab = generalSlabs.find(s => {
        const min = Number(s.min_qty ?? s.minQty ?? 0);
        const max = s.max_qty !== null && s.max_qty !== undefined && s.max_qty !== '' ? Number(s.max_qty) : (s.maxQty ? Number(s.maxQty) : Infinity);
        return qty >= min && qty <= max;
      });
    }

    if (matchedSlab) {
      appliedPricingRule = 'QUANTITY_SLAB';
      appliedRate = Number(matchedSlab.rate);
      matchedRuleId = matchedSlab.id;
      const minTxt = matchedSlab.min_qty ?? matchedSlab.minQty ?? 1;
      const maxTxt = matchedSlab.max_qty ?? matchedSlab.maxQty ?? '+';
      ruleDetails = `Quantity Slab Tier [${minTxt}-${maxTxt}]: ₹${appliedRate}/${effectiveUnit}`;
    } else if (isDimensionUnit) {
      // METHOD 4: Material & Dimension-Based Pricing
      appliedPricingRule = 'MATERIAL_DIMENSION';
      appliedRate = catalogueBaseRate;
      ruleDetails = `Dimension Pricing: ₹${catalogueBaseRate}/${effectiveUnit} × ${dimensionMultiplier.toFixed(2)} ${effectiveUnit}/pc`;
    } else if (product?.pricing_method === 'YIELD_CALCULATOR' || product?.pricingMethod === 'YIELD_CALCULATOR') {
      // Yield-based calculator rate
      appliedPricingRule = 'YIELD_CALCULATOR';
      appliedRate = catalogueBaseRate;
      ruleDetails = `Yield Formula Pricing: ₹${catalogueBaseRate}/${effectiveUnit}`;
    } else {
      // METHOD 1: Fixed Unit Price
      appliedPricingRule = 'FIXED_UNIT';
      appliedRate = catalogueBaseRate;
      ruleDetails = `Fixed Standard Rate: ₹${catalogueBaseRate}/${effectiveUnit}`;
    }
  }

  // METHOD 3 & OVERRIDE: Check for Authorized Price Overrides or Custom Quotations
  let isRateOverridden = 0;
  let systemCalculatedPrice = appliedRate;
  let priceDifference = 0;

  if (manualRate !== null && manualRate !== undefined && manualRate !== '' && !isNaN(Number(manualRate))) {
    const overrideVal = Number(manualRate);
    if (Math.abs(overrideVal - appliedRate) > 0.001) {
      isRateOverridden = 1;
      priceDifference = Number((overrideVal - appliedRate).toFixed(2));
      appliedRate = overrideVal;
      appliedPricingRule = 'MANUAL_OVERRIDE';
      ruleDetails = `Authorized Override: ${overrideReason || 'Manual Rate Adjustment'} (System: ₹${systemCalculatedPrice} -> ₹${appliedRate})`;
    }
  }

  // Financial calculations
  const totalSellingAmount = Number((chargeableUnits * appliedRate).toFixed(2));
  const totalProductionCost = Number((chargeableUnits * totalEstimatedUnitCost).toFixed(2));
  const grossProfit = Number((totalSellingAmount - totalProductionCost).toFixed(2));
  const grossProfitMargin = totalSellingAmount > 0
    ? Number(((grossProfit / totalSellingAmount) * 100).toFixed(2))
    : 0;

  return {
    productId: product?.id || '',
    productName: product?.name || '',
    specId: spec?.id || null,
    specName: spec?.specName || spec?.spec_name || null,
    quantity: qty,
    width: numWidth,
    height: numHeight,
    dimensionMultiplier,
    chargeableUnits,
    unit: effectiveUnit,
    originalSellingPrice: catalogueBaseRate,
    systemCalculatedPrice,
    unitRate: appliedRate,
    sellingRate: appliedRate,
    amount: totalSellingAmount,
    totalSellingAmount,
    pricingMethod: product?.pricing_method || product?.pricingMethod || appliedPricingRule,
    appliedPricingRule,
    matchedRuleId,
    pricingRuleDetails: ruleDetails,
    estimatedCost: totalEstimatedUnitCost,
    estimatedMaterialCost,
    estimatedLabourCost,
    estimatedMachineCost,
    estimatedOverheadCost,
    totalProductionCost,
    grossProfit,
    grossProfitMargin,
    isRateOverridden,
    isOverridden: Boolean(isRateOverridden),
    overrideReason,
    totalSqFt: chargeableUnits,
    discountPct: matchedCustomerRule ? Number(matchedCustomerRule.discount_pct ?? matchedCustomerRule.discountPct ?? 0) : 0,
    overriddenByUserId: authorizedUser?.id || authorizedUser?.userId || null,
    overriddenByName: authorizedUser?.name || null
  };
}
