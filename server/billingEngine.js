/**
 * SCREENARTS / PRINTFLOW ERP - CENTRAL BILLING ENGINE
 * 
 * Provides unified, authoritative financial calculations for:
 * - Chargeable quantity across all printing industry units (Sq.Ft, Running Feet, Sheets, Pcs, Nos, Sets)
 * - Unit price, line discounts, order-level discounts
 * - Tax modes: ETR (Exclusive Tax), ITR (Inclusive Tax), NTR (No Tax / Exempt)
 * - GST components: CGST + SGST (Intra-state Maharashtra 27) vs IGST (Inter-state)
 * - Precision rounding & round-off calculation
 * - Payment allocations & outstanding balances
 */

export const COMPANY_STATE_CODE = '27';
export const COMPANY_STATE_NAME = 'Maharashtra';

/**
 * Calculate chargeable unit quantity based on dimensions and unit type
 */
export function calculateChargeableQuantity(item) {
  const unit = (item.unit || 'Sq.Ft').trim();
  const width = Number(item.width || 0);
  const height = Number(item.height || 0);
  const qty = Number(item.qty ?? 1);

  if (unit.toLowerCase() === 'sq.ft' || unit.toLowerCase() === 'sqft') {
    if (width > 0 && height > 0) {
      const areaPerPiece = width * height;
      return areaPerPiece * qty;
    }
    return qty;
  }

  if (unit.toLowerCase() === 'rft' || unit.toLowerCase() === 'running ft') {
    return (width > 0 ? width : height > 0 ? height : 1) * qty;
  }

  // Discrete units: Pcs, Nos, Sheets, Rolls, Sets, Boxes, Packs
  return qty;
}

/**
 * Calculate line item financial breakdown
 */
export function calculateLineItem(item, options = {}) {
  const chargeableQty = calculateChargeableQuantity(item);
  const rate = Number(item.sellingRate || item.selling_rate || item.rate || 0);
  const baseGross = Number((chargeableQty * rate).toFixed(2));
  
  // Discount
  const discountVal = Number(item.discount || 0);
  const discountType = item.discountType || 'FIXED'; // 'PERCENT' or 'FIXED'
  let lineDiscount = 0;
  if (discountType === 'PERCENT') {
    lineDiscount = Number(((baseGross * discountVal) / 100).toFixed(2));
  } else {
    lineDiscount = Math.min(baseGross, discountVal);
  }

  const discountedGross = Math.max(0, baseGross - lineDiscount);
  const gstRate = Number(item.gstRate ?? item.gst_rate ?? 18);
  const taxType = (item.taxType || item.tax_type || 'ETR').toUpperCase();

  let taxableAmount = 0;
  let taxAmount = 0;
  let lineTotal = 0;

  if (taxType.includes('ITR') || taxType.includes('INCLUSIVE')) {
    // Inclusive tax: rate includes GST
    lineTotal = discountedGross;
    taxableAmount = Number((lineTotal / (1 + gstRate / 100)).toFixed(2));
    taxAmount = Number((lineTotal - taxableAmount).toFixed(2));
  } else if (taxType.includes('NTR') || taxType.includes('EXEMPT') || taxType.includes('NO TAX') || gstRate === 0) {
    // Exempt / No tax
    taxableAmount = discountedGross;
    taxAmount = 0;
    lineTotal = discountedGross;
  } else {
    // Default: ETR (Exclusive tax)
    taxableAmount = discountedGross;
    taxAmount = Number(((taxableAmount * gstRate) / 100).toFixed(2));
    lineTotal = Number((taxableAmount + taxAmount).toFixed(2));
  }

  const estimatedCost = Number(item.estimatedCost || item.estimated_cost || 0);
  const actualCost = Number(item.actualCost || item.actual_cost || 0);
  const grossProfit = Number((taxableAmount - actualCost).toFixed(2));

  return {
    ...item,
    chargeableQty,
    baseGross,
    lineDiscount,
    taxableAmount,
    taxAmount,
    gstRate,
    taxType,
    lineTotal,
    estimatedCost,
    actualCost,
    grossProfit
  };
}

/**
 * Determine if transaction is inter-state based on customer state/GSTIN
 */
export function isInterstateCustomer(customer) {
  if (!customer) return false;
  const stateStr = String(customer.state || customer.customerState || '').toLowerCase();
  const gstin = String(customer.gstin || customer.gst_number || '').trim();

  // If GSTIN available, state code is first 2 digits
  if (gstin.length >= 2) {
    const stateCode = gstin.substring(0, 2);
    if (stateCode !== COMPANY_STATE_CODE) return true;
  }

  // If state name available
  if (stateStr && !stateStr.includes('maharashtra') && !stateStr.includes('27')) {
    return true;
  }

  return false;
}

/**
 * Calculate complete order financial totals and tax allocation
 */
export function calculateOrderTotals(orderHeader, items = [], customer = null) {
  const processedItems = items.map(it => calculateLineItem(it));

  const totalTaxable = Number(processedItems.reduce((sum, it) => sum + it.taxableAmount, 0).toFixed(2));
  const totalItemDiscount = Number(processedItems.reduce((sum, it) => sum + it.lineDiscount, 0).toFixed(2));
  const orderDiscount = Number(orderHeader.discount || 0);
  const netDiscount = Number((totalItemDiscount + orderDiscount).toFixed(2));

  const totalTax = Number(processedItems.reduce((sum, it) => sum + it.taxAmount, 0).toFixed(2));
  const isInterstate = isInterstateCustomer(customer || orderHeader);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterstate) {
    igst = totalTax;
    cgst = 0;
    sgst = 0;
  } else {
    // 50/50 split for intra-state GST
    cgst = Number((totalTax / 2).toFixed(2));
    sgst = Number((totalTax - cgst).toFixed(2)); // Guard against 1-cent split rounding
    igst = 0;
  }

  const rawGrandTotal = totalTaxable + totalTax;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((grandTotal - rawGrandTotal).toFixed(2));

  const advanceAmount = Number(orderHeader.advanceAmount || orderHeader.advance_amount || 0);
  const balanceAmount = Number((grandTotal - advanceAmount).toFixed(2));

  let paymentStatus = 'Pending';
  if (advanceAmount >= grandTotal && grandTotal > 0) {
    paymentStatus = 'Paid';
  } else if (advanceAmount > 0) {
    paymentStatus = 'Partial';
  } else if (orderHeader.paymentMethod === 'Credit Account' || orderHeader.payment_method === 'Credit Account') {
    paymentStatus = 'Credit';
  }

  const totalEstimatedCost = Number(processedItems.reduce((sum, it) => sum + it.estimatedCost, 0).toFixed(2));
  const totalActualCost = Number(processedItems.reduce((sum, it) => sum + it.actualCost, 0).toFixed(2));
  const actualProfit = Number((totalTaxable - totalActualCost).toFixed(2));
  const profitMarginPct = totalTaxable > 0 ? Number(((actualProfit / totalTaxable) * 100).toFixed(1)) : 0;

  return {
    items: processedItems,
    subtotal: totalTaxable,
    discount: netDiscount,
    taxTotal: totalTax,
    cgst,
    sgst,
    igst,
    roundOff,
    grandTotal,
    advanceAmount,
    balanceAmount,
    paymentStatus,
    totalEstimatedCost,
    totalActualCost,
    actualProfit,
    profitMarginPct,
    isInterstate
  };
}
