import assert from 'node:assert/strict';
import { calculateOrderTotals, calculateLineItem, calculateChargeableQuantity } from '../server/billingEngine.js';

console.log('--- Testing Central Billing Engine ---');

// Test 1: Exclusive Tax Mode (ETR) Intra-State (CGST + SGST)
{
  const lineItem = {
    productName: 'Frontlit Star Flex Banner',
    qty: 2,
    width: 10,
    height: 5,
    unit: 'Sq.Ft',
    rate: 15,
    gstRate: 18,
    discount: 0,
    taxType: 'ETR'
  };

  const calc = calculateLineItem(lineItem);
  assert.equal(calc.chargeableQty, 100, 'Chargeable quantity should be 2 * 10 * 5 = 100 Sq.Ft');
  assert.equal(calc.taxableAmount, 1500, 'Taxable amount should be 100 * 15 = 1500');
  assert.equal(calc.taxAmount, 270, 'GST 18% on 1500 should be 270');
  assert.equal(calc.lineTotal, 1770, 'Line total should be 1500 + 270 = 1770');
  console.log('✓ Test 1 Passed: Exclusive Tax Mode Intra-State calculation');
}

// Test 2: Inclusive Tax Mode (ITR) Back-Calculation
{
  const lineItem = {
    productName: 'Visiting Cards Deluxe',
    qty: 1000,
    width: 0,
    height: 0,
    unit: 'Cards',
    rate: 1.18, // Total inclusive price ₹1,180
    gstRate: 18,
    discount: 0,
    taxType: 'ITR'
  };

  const calc = calculateLineItem(lineItem);
  assert.equal(calc.chargeableQty, 1000, 'Chargeable quantity should be 1000 Cards');
  assert.equal(calc.taxableAmount, 1000, 'Taxable amount should be back-calculated to 1000');
  assert.equal(calc.taxAmount, 180, 'GST should be 180');
  assert.equal(calc.lineTotal, 1180, 'Gross total should be 1180');
  console.log('✓ Test 2 Passed: Inclusive Tax Mode (ITR) Back-Calculation');
}

// Test 3: Zero GST Rate Legitimate Preservation (Exempt / 0% GST)
{
  const lineItem = {
    productName: 'Labour / Unbranded Printing Booklets',
    qty: 5,
    width: 0,
    height: 0,
    unit: 'Pcs',
    rate: 200,
    gstRate: 0, // Legitimate 0% GST
    discount: 50,
    taxType: 'ETR'
  };

  const calc = calculateLineItem(lineItem);
  assert.equal(calc.taxableAmount, 950, 'Taxable amount should be 5 * 200 - 50 = 950');
  assert.equal(calc.taxAmount, 0, 'Zero GST rate must result in taxAmount = 0');
  assert.equal(calc.lineTotal, 950, 'Line total should remain 950');
  console.log('✓ Test 3 Passed: Legitimate 0% GST Rate Preserved without defaulting to 18%');
}

// Test 4: Inter-State IGST Split
{
  const customer = { state: 'Karnataka', gstin: '29AAAAA0000A1Z5' }; // Different from Maharashtra (27)
  const items = [
    {
      productName: 'Acrylic 3D LED Signboard',
      qty: 1,
      width: 12,
      height: 3,
      unit: 'Sq.Ft',
      rate: 350,
      gstRate: 18,
      discount: 0,
      taxType: 'ETR'
    }
  ];

  const orderTotals = calculateOrderTotals({ customerState: customer.state, customer_state: customer.state }, items);
  assert.equal(orderTotals.subtotal, 12600, 'Subtotal should be 36 * 350 = 12600');
  assert.equal(orderTotals.taxTotal, 2268, 'Tax total 18% on 12600 should be 2268');
  assert.equal(orderTotals.igst, 2268, 'Inter-state order must allocate 100% of tax to IGST');
  assert.equal(orderTotals.cgst, 0, 'CGST must be 0 for inter-state order');
  assert.equal(orderTotals.sgst, 0, 'SGST must be 0 for inter-state order');
  assert.equal(
    Number((orderTotals.subtotal - orderTotals.discount + orderTotals.taxTotal + orderTotals.roundOff).toFixed(2)),
    orderTotals.grandTotal,
    'Equation must balance: subtotal - discount + tax + round_off = grand_total'
  );
  console.log('✓ Test 4 Passed: Inter-State IGST Split and Equation Balance');
}

// Test 5: Intra-State Split (50% CGST + 50% SGST) and Round-Off
{
  const customer = { state: 'Maharashtra', gstin: '27AAAAA0000A1Z5' };
  const items = [
    {
      productName: 'Vinyl Print + Lamination',
      qty: 1,
      width: 4.5,
      height: 2.75,
      unit: 'Sq.Ft',
      rate: 42,
      gstRate: 18,
      discount: 0,
      taxType: 'ETR'
    }
  ];

  const orderTotals = calculateOrderTotals({ customerState: customer.state, customer_state: customer.state }, items);
  const expectedSubtotal = Number((4.5 * 2.75 * 42).toFixed(2)); // 12.375 * 42 = 519.75
  assert.equal(orderTotals.subtotal, expectedSubtotal, `Subtotal should be ${expectedSubtotal}`);
  const expectedTax = orderTotals.taxTotal;
  assert.equal(orderTotals.taxTotal, expectedTax, `Tax should be ${expectedTax}`);
  assert.equal(
    Number((orderTotals.cgst + orderTotals.sgst).toFixed(2)),
    orderTotals.taxTotal,
    'CGST + SGST must equal taxTotal exactly'
  );
  assert.equal(
    Number((orderTotals.subtotal - orderTotals.discount + orderTotals.taxTotal + orderTotals.roundOff).toFixed(2)),
    orderTotals.grandTotal,
    'Intra-state total must balance with round-off'
  );
  console.log('✓ Test 5 Passed: Intra-State CGST/SGST 50/50 Split and Banker Round-Off');
}

console.log('ALL BILLING ENGINE TESTS PASSED SUCCESSFULLY!\n');
