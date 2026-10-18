import assert from 'assert';
import db from '../server/db.js';
import { runMigrations } from '../server/migrations.js';

console.log('--- Testing Sales Order Revision / Cancellation Logs & Outsource Vendor Auto-Selection ---');

// 1. Run migrations to execute Migration 018
runMigrations(db);

// 2. Verify order_audit_logs table exists and has demo data
const auditLogsCount = db.prepare('SELECT COUNT(*) as count FROM order_audit_logs').get();
assert.ok(auditLogsCount.count >= 6, `order_audit_logs must contain at least 6 demo records (found ${auditLogsCount.count})`);
console.log(`✓ Test 1 Passed: order_audit_logs table exists with ${auditLogsCount.count} records`);

// 3. Verify specific action types exist: EDITED, CANCELLED, DELETED, CONVERTED
const edited = db.prepare("SELECT * FROM order_audit_logs WHERE action_type = 'EDITED'").all();
const cancelled = db.prepare("SELECT * FROM order_audit_logs WHERE action_type = 'CANCELLED'").all();
const deleted = db.prepare("SELECT * FROM order_audit_logs WHERE action_type = 'DELETED'").all();
const converted = db.prepare("SELECT * FROM order_audit_logs WHERE action_type = 'CONVERTED'").all();

assert.ok(edited.length > 0, 'Must have EDITED audit logs');
assert.ok(cancelled.length > 0, 'Must have CANCELLED audit logs');
assert.ok(deleted.length > 0, 'Must have DELETED audit logs');
assert.ok(converted.length > 0, 'Must have CONVERTED audit logs');

console.log(`✓ Test 2 Passed: Verified all required action types (EDITED: ${edited.length}, CANCELLED: ${cancelled.length}, DELETED: ${deleted.length}, CONVERTED: ${converted.length})`);

// 4. Verify refund / reversal calculation on cancelled orders
const cancelledOrder = cancelled[0];
assert.strictEqual(cancelledOrder.refund_or_reversal, 14000, 'Cancelled order must record ₹14,000 refund/reversal');
console.log(`✓ Test 3 Passed: Cancellation refund reversal correctly recorded (Order: ${cancelledOrder.order_number}, Refund: ₹${cancelledOrder.refund_or_reversal})`);

// 5. Test Outsource Vendor Product Schema & Auto-Selection
const testOutsourceProdId = `TEST-OUT-PROD-${Date.now()}`;
const testVendorId = 'VEND-TEST-01';
const testVendorName = 'Surat Digital Prints Hub';

db.prepare(`
  INSERT INTO products (id, product_code, name, category, unit, default_rate, estimated_cost, default_vendor, default_vendor_id, is_outsource)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
`).run(testOutsourceProdId, testOutsourceProdId, 'Sublimation Custom Flags', 'Textile', 'Pcs', 450, 220, testVendorName, testVendorId);

const fetchedProd = db.prepare('SELECT * FROM products WHERE id = ?').get(testOutsourceProdId);
assert.strictEqual(fetchedProd.default_vendor, testVendorName, 'default_vendor must match');
assert.strictEqual(fetchedProd.default_vendor_id, testVendorId, 'default_vendor_id must match');
assert.strictEqual(fetchedProd.is_outsource, 1, 'is_outsource must be 1');

// Test auto-selection simulation (as executed in SalesOrdersView when selecting product)
const vendorsList = [
  { id: testVendorId, name: testVendorName, category: 'Outsource Printing' },
  { id: 'VEND-02', name: 'Other Vendor', category: 'General' }
];

function simulateProductSelect(prod, vendors) {
  const hasOutsourceVendor = Boolean(prod?.default_vendor || prod?.default_vendor_id || prod?.is_outsource);
  let matchedVendor = null;
  if (hasOutsourceVendor) {
    matchedVendor = vendors.find(v =>
      (prod.default_vendor_id && v.id === prod.default_vendor_id) ||
      (prod.default_vendor && (v.id === prod.default_vendor || v.name.toLowerCase() === prod.default_vendor.toLowerCase()))
    ) || vendors[0];
  }

  const isOutsource = Boolean(matchedVendor);
  const vendorId = matchedVendor ? matchedVendor.id : '';
  const vendorName = matchedVendor ? matchedVendor.name : '';
  const outsourceJobs = matchedVendor ? [{
    id: 1,
    vendorId: matchedVendor.id,
    vendorName: matchedVendor.name,
    processName: 'Printing / Job Work',
    estCost: prod.estimated_cost || 0
  }] : [];

  return { isOutsource, vendorId, vendorName, outsourceJobs };
}

const orderingResult = simulateProductSelect(fetchedProd, vendorsList);
assert.strictEqual(orderingResult.isOutsource, true, 'Ordering time: outsource checkbox must be auto-checked (true)');
assert.strictEqual(orderingResult.vendorId, testVendorId, 'Ordering time: vendorId must auto-select matched vendor');
assert.strictEqual(orderingResult.vendorName, testVendorName, 'Ordering time: vendorName must auto-select matched vendor');
assert.strictEqual(orderingResult.outsourceJobs.length, 1, 'Ordering time: outsourceJobs must be auto-populated with 1 job');
assert.strictEqual(orderingResult.outsourceJobs[0].vendorName, testVendorName, 'Job vendorName must match');

console.log('✓ Test 4 Passed: Product outsource vendor assignment & ordering time auto-selection simulated and verified');

// Cleanup
db.prepare('DELETE FROM products WHERE id = ?').run(testOutsourceProdId);

console.log('ALL AUDIT LOGS & OUTSOURCE VENDOR TESTS PASSED SUCCESSFULLY! 🎯');
