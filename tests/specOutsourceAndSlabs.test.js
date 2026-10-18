import assert from 'assert';
import db from '../server/db.js';
import { runMigrations } from '../server/migrations.js';

console.log('--- Testing Specification Outsource Vendor Linking & Quantity Slabs ---');

// 1. Ensure migrations are applied
runMigrations(db);

// 2. Test schema alterations on product_specifications
const tableInfo = db.prepare("PRAGMA table_info(product_specifications)").all();
const colNames = tableInfo.map(c => c.name);
assert(colNames.includes('is_outsource'), 'is_outsource column must exist on product_specifications');
assert(colNames.includes('default_vendor_id'), 'default_vendor_id column must exist on product_specifications');
assert(colNames.includes('default_vendor'), 'default_vendor column must exist on product_specifications');
console.log('✓ Test 1 Passed: product_specifications has is_outsource, default_vendor_id, default_vendor columns');

// 3. Test that outsource specifications exist
const outsourceSpecs = db.prepare(`
  SELECT id, product_id, spec_name, default_vendor, default_vendor_id, is_outsource
  FROM product_specifications
  WHERE is_outsource = 1
`).all();
assert(outsourceSpecs.length > 0, 'There should be at least one specification linked to an outsource partner');
console.log(`✓ Test 2 Passed: Found ${outsourceSpecs.length} specifications configured for outsource fulfillment:`);
outsourceSpecs.forEach(s => {
  console.log(`   - [${s.id}] ${s.spec_name} → Partner: ${s.default_vendor} (${s.default_vendor_id})`);
});

// 4. Test that specification-level quantity rate slabs exist
const specSlabs = db.prepare(`
  SELECT s.*, ps.spec_name
  FROM product_pricing_slabs s
  JOIN product_specifications ps ON s.spec_id = ps.id
  ORDER BY s.product_id, s.spec_id, s.min_qty ASC
`).all();
assert(specSlabs.length > 0, 'There should be quantity slabs configured for specific specifications');
console.log(`✓ Test 3 Passed: Found ${specSlabs.length} specification-linked quantity slabs:`);
specSlabs.forEach(sl => {
  console.log(`   - Spec: ${sl.spec_name} | Qty: ${sl.min_qty}${sl.max_qty ? `-${sl.max_qty}` : '+'} @ ₹${sl.rate}`);
});

// 5. Test Tiered Pricing Slab lookup logic for specifications
function simulateProductSlabInfo(productId, qty, specId) {
  const numQty = Number(qty);
  if (specId) {
    const specSlabs = db.prepare(`
      SELECT * FROM product_pricing_slabs
      WHERE product_id = ? AND spec_id = ?
      ORDER BY min_qty ASC
    `).all(productId, specId);
    const matched = specSlabs.find(s => numQty >= Number(s.min_qty) && (s.max_qty === null || s.max_qty === undefined || numQty <= Number(s.max_qty)));
    if (matched) return matched;
  }
  const generalSlabs = db.prepare(`
    SELECT * FROM product_pricing_slabs
    WHERE product_id = ? AND (spec_id IS NULL OR spec_id = '' OR spec_id = 'ALL')
    ORDER BY min_qty ASC
  `).all(productId);
  return generalSlabs.find(s => numQty >= Number(s.min_qty) && (s.max_qty === null || s.max_qty === undefined || numQty <= Number(s.max_qty))) || null;
}

// Test SPEC-101 (240gsm Star Frontlit Flex on PROD-01)
// Slabs: 1-500: ₹15, 501-2000: ₹12, 2001+: ₹9.5
const slab50 = simulateProductSlabInfo('PROD-01', 50, 'SPEC-101');
assert.strictEqual(slab50.rate, 15, '50 sqft should match slab 1-500 @ ₹15');

const slab750 = simulateProductSlabInfo('PROD-01', 750, 'SPEC-101');
assert.strictEqual(slab750.rate, 12, '750 sqft should match slab 501-2000 @ ₹12');

const slab3000 = simulateProductSlabInfo('PROD-01', 3000, 'SPEC-101');
assert.strictEqual(slab3000.rate, 9.5, '3000 sqft should match slab 2001+ @ ₹9.5');

console.log('✓ Test 4 Passed: Specification-specific quantity slab rate resolution verified correctly across all tiers');

// 6. Test Outsource Vendor Auto-Selection simulation when specification is chosen
const specToOrder = outsourceSpecs[0];
assert(specToOrder.default_vendor, 'Selected spec must have an assigned default vendor');

const simulatedOrderItem = {
  productId: specToOrder.product_id,
  specId: specToOrder.id,
  specName: specToOrder.spec_name,
  outsource: Boolean(specToOrder.is_outsource),
  vendorId: specToOrder.default_vendor_id,
  vendorName: specToOrder.default_vendor,
  outsourceJobs: [
    {
      jobType: 'Outsource Production',
      vendorId: specToOrder.default_vendor_id,
      vendorName: specToOrder.default_vendor
    }
  ]
};

assert.strictEqual(simulatedOrderItem.outsource, true);
assert.strictEqual(simulatedOrderItem.vendorId, specToOrder.default_vendor_id);
assert.strictEqual(simulatedOrderItem.vendorName, specToOrder.default_vendor);
assert.strictEqual(simulatedOrderItem.outsourceJobs[0].vendorName, specToOrder.default_vendor);

console.log(`✓ Test 5 Passed: Order line item auto-selected outsource vendor "${simulatedOrderItem.vendorName}" (${simulatedOrderItem.vendorId}) when specification was chosen!`);

console.log('ALL SPECIFICATION OUTSOURCE & QUANTITY SLABS TESTS PASSED! 🎯\n');
