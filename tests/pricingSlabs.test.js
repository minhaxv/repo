import assert from 'assert';
import db from '../server/db.js';
import { runMigrations } from '../server/migrations.js';
import { calculateLineItem } from '../server/billingEngine.js';

console.log('--- Testing Product Rate Slabs & Tiered Volume Pricing ---');

// 1. Run migrations
runMigrations(db);

// 2. Verify product_pricing_slabs table exists
const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='product_pricing_slabs'").get();
assert.ok(tableCheck, 'product_pricing_slabs table must exist in SQLite database');
console.log('✓ Test 1 Passed: product_pricing_slabs table schema verified');

// 3. Create a test product: Printed Balloons
const testProdId = `TEST-PRD-BAL-${Date.now()}`;
db.prepare(`
  INSERT INTO products (id, product_code, name, category, unit, default_rate, estimated_cost, gst_rate, hsn_code, is_custom)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
`).run(testProdId, testProdId, 'Latex Promotional Balloons', 'Merchandise', 'Pcs', 10, 4, 18, '9989');

// 4. Insert quantity slabs for the test product:
// 1-100: ₹10
// 101-200: ₹9
// 201-500: ₹7.50
// 501-1000: ₹6
// 1001+: ₹5
const insertSlab = db.prepare(`
  INSERT INTO product_pricing_slabs (id, product_id, min_qty, max_qty, rate, cost_rate)
  VALUES (?, ?, ?, ?, ?, ?)
`);
insertSlab.run(`SLAB-1-${Date.now()}`, testProdId, 1, 100, 10.00, 4.00);
insertSlab.run(`SLAB-2-${Date.now()}`, testProdId, 101, 200, 9.00, 3.80);
insertSlab.run(`SLAB-3-${Date.now()}`, testProdId, 201, 500, 7.50, 3.50);
insertSlab.run(`SLAB-4-${Date.now()}`, testProdId, 501, 1000, 6.00, 3.20);
insertSlab.run(`SLAB-5-${Date.now()}`, testProdId, 1001, null, 5.00, 2.80);

const slabs = db.prepare('SELECT * FROM product_pricing_slabs WHERE product_id = ? ORDER BY min_qty ASC').all(testProdId);
assert.strictEqual(slabs.length, 5, 'Must have 5 slabs saved');
console.log('✓ Test 2 Passed: 5 rate slabs inserted and retrieved correctly');

// 5. Test Rate Resolution Logic
function resolveSlabRate(slabsList, qty, defaultRate = 10) {
  const num = Number(qty);
  const matched = slabsList.find(s => num >= s.min_qty && (s.max_qty === null || s.max_qty === undefined || num <= s.max_qty));
  return matched ? matched.rate : defaultRate;
}

// 50 balloons -> ₹10
assert.strictEqual(resolveSlabRate(slabs, 50), 10.00, '50 balloons must be ₹10/pc');
// 100 balloons -> ₹10
assert.strictEqual(resolveSlabRate(slabs, 100), 10.00, '100 balloons must be ₹10/pc');
// 150 balloons -> ₹9
assert.strictEqual(resolveSlabRate(slabs, 150), 9.00, '150 balloons must be ₹9/pc (user requested)');
// 200 balloons -> ₹9
assert.strictEqual(resolveSlabRate(slabs, 200), 9.00, '200 balloons must be ₹9/pc (user requested)');
// 350 balloons -> ₹7.50
assert.strictEqual(resolveSlabRate(slabs, 350), 7.50, '350 balloons must be ₹7.50/pc');
// 750 balloons -> ₹6
assert.strictEqual(resolveSlabRate(slabs, 750), 6.00, '750 balloons must be ₹6.00/pc');
// 2000 balloons -> ₹5
assert.strictEqual(resolveSlabRate(slabs, 2000), 5.00, '2000 balloons must be ₹5.00/pc');
console.log('✓ Test 3 Passed: User test case rate resolution (1-100 @ ₹10, 101-200 @ ₹9, etc.) validated');

// 6. Test Line Item Billing Calculation with Slab Rate
const line50 = calculateLineItem({
  unit: 'Pcs',
  qty: 50,
  sellingRate: resolveSlabRate(slabs, 50),
  gstRate: 18,
  taxType: 'ETR'
});
assert.strictEqual(line50.baseGross, 500.00, '50 pcs @ ₹10 = ₹500 base gross');
assert.strictEqual(line50.taxAmount, 90.00, '18% GST on ₹500 = ₹90');
assert.strictEqual(line50.lineTotal, 590.00, 'Line total = ₹590');

const line150 = calculateLineItem({
  unit: 'Pcs',
  qty: 150,
  sellingRate: resolveSlabRate(slabs, 150),
  gstRate: 18,
  taxType: 'ETR'
});
assert.strictEqual(line150.baseGross, 1350.00, '150 pcs @ ₹9 = ₹1350 base gross');
assert.strictEqual(line150.taxAmount, 243.00, '18% GST on ₹1350 = ₹243');
assert.strictEqual(line150.lineTotal, 1593.00, 'Line total = ₹1593');

console.log('✓ Test 4 Passed: Central Billing Engine integration with slab pricing validated');

// 7. Test Specification-Based Products + Normal Product Option
const specProdId = `TEST-PRD-FLEX-${Date.now()}`;
db.prepare(`
  INSERT INTO products (id, product_code, name, category, unit, default_rate, estimated_cost, gst_rate, hsn_code, is_custom)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
`).run(specProdId, specProdId, 'Digital Flex Banner', 'Large Format', 'Sq.Ft', 15.00, 7.00, 18, '9989');

const specStar = `SPEC-STAR-${Date.now()}`;
const specBlackout = `SPEC-BLACKOUT-${Date.now()}`;
db.prepare(`
  INSERT INTO product_specifications (id, product_id, spec_name, material_name, selling_price, cost_price, unit, is_default)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(specStar, specProdId, 'Star Flex 240gsm', 'Star Flex', 18.00, 9.00, 'Sq.Ft', 1);

db.prepare(`
  INSERT INTO product_specifications (id, product_id, spec_name, material_name, selling_price, cost_price, unit, is_default)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(specBlackout, specProdId, 'Blackout Flex 340gsm', 'Blackout Flex', 24.00, 12.00, 'Sq.Ft', 0);

// Insert normal general slab for product (100+ Sq.Ft -> ₹12)
db.prepare(`
  INSERT INTO product_pricing_slabs (id, product_id, spec_id, min_qty, max_qty, rate, cost_rate)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(`SLAB-GEN-${Date.now()}`, specProdId, null, 100, null, 12.00, 6.00);

// Insert specific slab for Blackout Flex (100+ Sq.Ft -> ₹20)
db.prepare(`
  INSERT INTO product_pricing_slabs (id, product_id, spec_id, min_qty, max_qty, rate, cost_rate)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(`SLAB-BLK-${Date.now()}`, specProdId, specBlackout, 100, null, 20.00, 10.00);

const flexSlabs = db.prepare('SELECT * FROM product_pricing_slabs WHERE product_id = ?').all(specProdId);

function resolveSpecSlabRate(slabsList, qty, defaultRate, specId = null) {
  const num = Number(qty);
  if (specId) {
    const specMatch = slabsList.find(s => s.spec_id === specId && num >= s.min_qty && (s.max_qty === null || s.max_qty === undefined || num <= s.max_qty));
    if (specMatch) return specMatch.rate;
  }
  const generalMatch = slabsList.find(s => (!s.spec_id || s.spec_id === 'ALL') && num >= s.min_qty && (s.max_qty === null || s.max_qty === undefined || num <= s.max_qty));
  return generalMatch ? generalMatch.rate : defaultRate;
}

// Case A: Normal / Standard Product Option (no spec chosen)
assert.strictEqual(resolveSpecSlabRate(flexSlabs, 50, 15.00, null), 15.00, 'Normal product 50 Sq.Ft -> Normal Base ₹15');
assert.strictEqual(resolveSpecSlabRate(flexSlabs, 150, 15.00, null), 12.00, 'Normal product 150 Sq.Ft -> Normal General Slab ₹12');

// Case B: Star Flex (has no spec-specific slab, falls back to general slab for bulk)
assert.strictEqual(resolveSpecSlabRate(flexSlabs, 50, 18.00, specStar), 18.00, 'Star Flex 50 Sq.Ft -> Spec base ₹18');
assert.strictEqual(resolveSpecSlabRate(flexSlabs, 150, 18.00, specStar), 12.00, 'Star Flex 150 Sq.Ft -> Falls back to general slab ₹12');

// Case C: Blackout Flex (has custom spec slab of ₹20)
assert.strictEqual(resolveSpecSlabRate(flexSlabs, 50, 24.00, specBlackout), 24.00, 'Blackout Flex 50 Sq.Ft -> Spec base ₹24');
assert.strictEqual(resolveSpecSlabRate(flexSlabs, 150, 24.00, specBlackout), 20.00, 'Blackout Flex 150 Sq.Ft -> Custom spec slab ₹20');

console.log('✓ Test 5 Passed: Normal product option + specification options + spec-specific rate slabs verified');

// Cleanup
db.prepare('DELETE FROM product_pricing_slabs WHERE product_id = ?').run(testProdId);
db.prepare('DELETE FROM products WHERE id = ?').run(testProdId);
db.prepare('DELETE FROM product_pricing_slabs WHERE product_id = ?').run(specProdId);
db.prepare('DELETE FROM product_specifications WHERE product_id = ?').run(specProdId);
db.prepare('DELETE FROM products WHERE id = ?').run(specProdId);

console.log('ALL PRODUCT RATE SLAB & SPECIFICATION TESTS PASSED SUCCESSFULLY! 🎯');
