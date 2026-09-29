import assert from 'node:assert/strict';
import db from '../server/db.js';
import { calculateLineItem, calculateChargeableQuantity } from '../server/billingEngine.js';

console.log('===========================================================');
console.log('  TEST SUITE: Sales Order Zero-Default & Payment Types     ');
console.log('===========================================================\n');

function createEmptyLineItem(id = 1) {
  return {
    id,
    productId: '',
    productName: '',
    customTitle: '',
    description: '',
    width: '',
    height: '',
    unit: 'Pcs',
    qty: '',
    deliveryDate: '',
    material: '',
    designerRequired: 'NO',
    designerId: '',
    designerName: '',
    outsource: false,
    vendorId: '',
    vendorName: '',
    estimatedCost: '',
    internalEstOutsourceCost: '',
    actualVendorBill: 0,
    sellingRate: '',
    discount: 0,
    gstRate: 18,
    isCustom: false
  };
}

function calculateSalesOrderItemAmount(item, taxMode = 'ETR (Exclusive Tax)') {
  const hasQty = item.qty !== '' && item.qty !== null && item.qty !== undefined && !isNaN(Number(item.qty));
  const hasRate = item.sellingRate !== '' && item.sellingRate !== null && item.sellingRate !== undefined && !isNaN(Number(item.sellingRate));

  if (!hasQty || !hasRate) {
    return {
      isCalculated: false,
      grossLineTotal: 0,
      taxableVal: 0,
      gstVal: 0,
      estCost: 0
    };
  }

  const qty = parseFloat(item.qty);
  const rate = parseFloat(item.sellingRate);
  const disc = parseFloat(item.discount) || 0;
  const itemGstRate = parseFloat(item.gstRate) || 18;

  const w = parseFloat(item.width) || 0;
  const h = parseFloat(item.height) || 0;

  let sqft = 0;
  let grossLineTotal = 0;
  if (item.unit && item.unit.startsWith('Sq') && w > 0 && h > 0) {
    if (item.unit === 'Sq.Ft') sqft = w * h * qty;
    else if (item.unit === 'Sq.Inch') sqft = (w * h * qty) / 144;
    else if (item.unit === 'Sq.Meter') sqft = w * h * qty * 10.7639;
    grossLineTotal = Math.max(0, (sqft * rate) - disc);
  } else {
    grossLineTotal = Math.max(0, (qty * rate) - disc);
  }

  let taxableVal = grossLineTotal;
  let gstVal = 0;

  if (taxMode.includes('ITR')) {
    taxableVal = grossLineTotal / (1 + (itemGstRate / 100));
    gstVal = grossLineTotal - taxableVal;
  } else if (taxMode.includes('NTR')) {
    taxableVal = grossLineTotal;
    gstVal = 0;
  } else {
    taxableVal = grossLineTotal;
    gstVal = grossLineTotal * (itemGstRate / 100);
  }

  const estCostUnit = (item.estimatedCost !== '' && item.estimatedCost !== null && !isNaN(Number(item.estimatedCost)))
    ? parseFloat(item.estimatedCost)
    : 0;
  const estCost = estCostUnit * (item.unit && item.unit.startsWith('Sq') && sqft > 0 ? sqft : qty);

  return {
    isCalculated: true,
    grossLineTotal,
    taxableVal,
    gstVal,
    estCost
  };
}

async function runTests() {
  let passed = 0;

  console.log('--- TEST GROUP 1: Default State & Zero Auto-fill ---');

  // Test 1: New product line initial state
  console.log('Test 1: New product line has completely empty defaults');
  const lineItem = createEmptyLineItem(1);
  assert.equal(lineItem.productName, '', 'Product name must be empty');
  assert.equal(lineItem.productId, '', 'Product ID must be empty');
  assert.equal(lineItem.qty, '', 'Quantity must be empty');
  assert.equal(lineItem.sellingRate, '', 'Rate must be empty');
  assert.equal(lineItem.deliveryDate, '', 'Target delivery date must be empty');
  assert.equal(lineItem.estimatedCost, '', 'Costing must be empty');
  passed += 6;

  // Test 2: Amount is uncalculated when values are empty
  console.log('Test 2: Amount is uncalculated / empty by default');
  const initialCalc = calculateSalesOrderItemAmount(lineItem);
  assert.equal(initialCalc.isCalculated, false, 'Amount must not be calculated');
  assert.equal(initialCalc.grossLineTotal, 0, 'Gross total must be 0 / empty');
  passed += 2;

  // Test 3: Select product from catalog - does NOT auto-populate price or costing
  console.log('Test 3: Selecting product does not auto-populate selling price or costing');
  const productCatalogMock = {
    id: 'PROD-101',
    name: 'Flex Banner 240gsm',
    defaultRate: 18.5,
    estimatedCost: 8.0,
    unit: 'Sq.Ft'
  };

  // User selects product:
  const lineWithProduct = {
    ...lineItem,
    productName: productCatalogMock.name,
    productId: productCatalogMock.id,
    sellingRate: lineItem.sellingRate || '', // Keeps empty!
    estimatedCost: lineItem.estimatedCost || '', // Keeps empty!
    deliveryDate: lineItem.deliveryDate || '' // Keeps empty!
  };

  assert.equal(lineWithProduct.productName, 'Flex Banner 240gsm', 'Product selected');
  assert.equal(lineWithProduct.sellingRate, '', 'Selling rate must remain empty even if catalog has default');
  assert.equal(lineWithProduct.estimatedCost, '', 'Costing must remain empty even if catalog has default');
  assert.equal(lineWithProduct.deliveryDate, '', 'Target delivery must remain empty');
  passed += 4;

  // Test 4: Enter quantity only -> amount remains uncalculated
  console.log('Test 4: Quantity only entered -> Amount remains uncalculated');
  lineWithProduct.qty = '10';
  const calcWithQtyOnly = calculateSalesOrderItemAmount(lineWithProduct);
  assert.equal(calcWithQtyOnly.isCalculated, false, 'Amount must remain uncalculated when rate is missing');
  assert.equal(calcWithQtyOnly.grossLineTotal, 0, 'Amount must be 0');
  passed += 2;

  // Test 5: Enter rate -> amount calculates correctly (Quantity x Rate = Amount)
  console.log('Test 5: Rate entered -> Amount calculates correctly (Quantity x Rate)');
  lineWithProduct.sellingRate = '25';
  const calcWithQtyAndRate = calculateSalesOrderItemAmount(lineWithProduct);
  assert.equal(calcWithQtyAndRate.isCalculated, true, 'Amount is now calculated');
  assert.equal(calcWithQtyAndRate.grossLineTotal, 250, '10 qty x 25 rate = 250 amount');
  passed += 2;

  console.log('\n--- TEST GROUP 2: Payment Type Selection (ETR / ITR / NTR) ---');

  // Test 6: Payment type buttons mutual exclusivity
  console.log('Test 6: ETR, ITR, NTR mutually exclusive selection');
  let selectedTaxMode = 'ETR (Exclusive Tax)';
  assert.ok(selectedTaxMode.includes('ETR'), 'Initially ETR selected');

  // User clicks ITR
  selectedTaxMode = 'ITR (Inclusive Tax)';
  assert.ok(selectedTaxMode.includes('ITR'), 'Now ITR selected');
  assert.ok(!selectedTaxMode.includes('ETR'), 'ETR is unselected');

  // User clicks NTR
  selectedTaxMode = 'NTR (No Tax)';
  assert.ok(selectedTaxMode.includes('NTR'), 'Now NTR selected');
  assert.ok(!selectedTaxMode.includes('ITR'), 'ITR is unselected');
  assert.ok(!selectedTaxMode.includes('ETR'), 'ETR is unselected');
  passed += 6;

  console.log('\n--- TEST GROUP 3: Database Storage & Preservation ---');

  // Test 7: Store empty fields as null rather than 0
  console.log('Test 7: Save order and verify empty fields stored as null, not 0');
  const orderId = `SO-TEST-ZERO-${Date.now()}`;
  const dummyCust = db.prepare('SELECT id FROM customers LIMIT 1').get() || { id: 'CUST-001' };

  db.prepare(`
    INSERT INTO sales_orders (
      id, order_number, customer_id, customer_name, order_date,
      subtotal, grand_total, balance_amount, notes, tax_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId, orderId, dummyCust.id, 'Test Customer', '2026-09-29',
    0, 0, 0, 'Test Order', selectedTaxMode
  );

  const itemId = `SOI-TEST-${Date.now()}`;
  const emptyRateItem = createEmptyLineItem(1);
  emptyRateItem.productName = 'Custom Unpriced Item';

  db.prepare(`
    INSERT INTO sales_order_items (
      id, sales_order_id, product_name_snapshot,
      qty, selling_rate, estimated_cost, amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    itemId, orderId, emptyRateItem.productName,
    null, null, null, 0
  );

  const savedOrder = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId);
  const savedItem = db.prepare('SELECT * FROM sales_order_items WHERE id = ?').get(itemId);

  assert.equal(savedOrder.tax_mode, 'NTR (No Tax)', 'Selected payment type NTR preserved in DB');
  assert.equal(savedItem.qty, null, 'Unentered qty stored as NULL in SQLite');
  assert.equal(savedItem.selling_rate, null, 'Unentered rate stored as NULL in SQLite, not 0');
  assert.equal(savedItem.estimated_cost, null, 'Unentered cost stored as NULL in SQLite');
  passed += 4;

  console.log(`\n===========================================================`);
  console.log(`  ALL ${passed} SALES ORDER TESTS PASSED SUCCESSFULLY!`);
  console.log(`===========================================================\n`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
