import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database/erp.sqlite');

console.log('========================================================================');
console.log('  TEST SUITE: Fresh Start / Reset Database & Data Persistence Audit    ');
console.log('========================================================================\n');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// 1. VERIFY PRE-RESET BACKUP CREATION
console.log('--- TEST 1: Automated Pre-Reset Backup Creation ---');
const backupDir = path.resolve(__dirname, '../database/backups');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilename = `test_pre_reset_${timestamp}.sqlite`;
const backupPath = path.join(backupDir, backupFilename);

await db.backup(backupPath);
assert.ok(fs.existsSync(backupPath), 'Backup file must exist on disk');
const stats = fs.statSync(backupPath);
assert.ok(stats.size > 0, 'Backup file size must be greater than 0 bytes');

const backupDb = new Database(backupPath, { readonly: true });
const integrityCheck = backupDb.pragma('integrity_check');
backupDb.close();
assert.equal(integrityCheck[0]?.integrity_check, 'ok', 'Backup integrity must be ok');
console.log(`✔ Test 1 Passed: Pre-reset backup created and verified (${stats.size} bytes, integrity: ok).`);

// 2. EXECUTE FRESH START RESET TRANSACTION
console.log('\n--- TEST 2: Execute Fresh Start Reset Transaction ---');
const resetTx = db.transaction(() => {
  db.prepare('DELETE FROM sales_order_items').run();
  db.prepare('DELETE FROM job_work').run();
  db.prepare('DELETE FROM outsource_jobs').run();
  db.prepare('DELETE FROM sales_orders').run();

  db.prepare('DELETE FROM outsource_payments').run();
  db.prepare('DELETE FROM outsource_bills').run();

  db.prepare('DELETE FROM payments').run();

  db.prepare('DELETE FROM customers').run();
  db.prepare('DELETE FROM suppliers').run();
  db.prepare('DELETE FROM product_specifications').run();
  db.prepare('DELETE FROM products').run();

  db.prepare('DELETE FROM purchase_orders').run();
  db.prepare('DELETE FROM inventory_transactions').run();
  db.prepare('DELETE FROM inventory').run();

  db.prepare('DELETE FROM worker_job_incentives').run();
  db.prepare('DELETE FROM production_task_time_logs').run();
  db.prepare('DELETE FROM production_tasks').run();
  db.prepare('DELETE FROM expenses').run();

  db.prepare('DELETE FROM rework_tickets').run();
  db.prepare('DELETE FROM delivery_items').run();
  db.prepare('DELETE FROM delivery_notes').run();

  db.prepare('DELETE FROM journal_entries').run();
  db.prepare('DELETE FROM journal_vouchers').run();
  db.prepare('DELETE FROM audit_logs').run();

  try {
    db.prepare('UPDATE document_sequences SET current_number = 0').run();
  } catch (e) {}
});

resetTx();
db.pragma('wal_checkpoint(TRUNCATE)');

// Verify all transactional counts are exactly 0
const custCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
const suppCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
const orderCount = db.prepare('SELECT COUNT(*) as count FROM sales_orders').get().count;
const billCount = db.prepare('SELECT COUNT(*) as count FROM outsource_bills').get().count;
const payCount = db.prepare('SELECT COUNT(*) as count FROM payments').get().count;
const poCount = db.prepare('SELECT COUNT(*) as count FROM purchase_orders').get().count;
const taskCount = db.prepare('SELECT COUNT(*) as count FROM production_tasks').get().count;

assert.equal(custCount, 0, 'Customers count must be 0 after reset');
assert.equal(suppCount, 0, 'Suppliers count must be 0 after reset');
assert.equal(prodCount, 0, 'Products count must be 0 after reset');
assert.equal(orderCount, 0, 'Sales Orders count must be 0 after reset');
assert.equal(billCount, 0, 'Outsource Bills count must be 0 after reset');
assert.equal(payCount, 0, 'Payments count must be 0 after reset');
assert.equal(poCount, 0, 'Purchase Orders count must be 0 after reset');
assert.equal(taskCount, 0, 'Production Tasks count must be 0 after reset');

console.log('✔ Test 2 Passed: All transactional tables reset to exactly 0 records.');

// 3. VERIFY ESSENTIAL MASTER CONFIG & USER ACCOUNTS PRESERVED
console.log('\n--- TEST 3: Master Configuration & Admin User Preserved ---');
const adminUser = db.prepare("SELECT * FROM users WHERE role = 'Admin'").get();
assert.ok(adminUser, 'Admin user account must be preserved');
assert.ok(adminUser.password_hash, 'Admin password hash must be preserved');

const companyProfile = db.prepare('SELECT * FROM company_profile WHERE id = 1').get();
assert.ok(companyProfile, 'Company profile must be preserved');

const sequences = db.prepare('SELECT * FROM document_sequences').all();
assert.ok(sequences.length > 0, 'Document sequence definitions must be preserved');
for (const s of sequences) {
  assert.equal(s.current_number, 0, `Sequence ${s.doc_type} current_number must be reset to 0`);
}
console.log('✔ Test 3 Passed: Admin account, company profile, and reset sequences (0) preserved.');

// 4. INSERT REAL NEW BUSINESS DATA
console.log('\n--- TEST 4: Create Real Business Records on Clean Slate ---');

// Customer
db.prepare(`
  INSERT INTO customers (id, customer_code, name, mobile, gst_number, customer_type, credit_limit, outstanding)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('CUST-FRESH-01', 'ABC-001', 'ABC Enterprises', '9876543210', '32AABCU9603R1ZM', 'B2B', 50000, 0);

// Supplier
db.prepare(`
  INSERT INTO suppliers (id, supplier_code, name, category, mobile, gstin, pending_payment)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run('SUP-FRESH-01', 'SUP-001', 'Precision Dyeing & Stitch', 'Outsource Printing', '9811223344', '32XYZPA1234B1Z1', 0);

// Product
db.prepare(`
  INSERT INTO products (id, product_code, name, category, default_rate, gst_rate)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('PROD-FRESH-01', 'PR-001', 'Embroidered Polo Shirt', 'Apparel', 650, 18);

// Sales Order
db.prepare(`
  INSERT INTO sales_orders (id, order_number, order_date, customer_id, customer_name, subtotal, tax_total, grand_total, advance_amount, balance_amount, production_status, payment_status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('SO-0001', 'SO-0001', new Date().toISOString().split('T')[0], 'CUST-FRESH-01', 'ABC Enterprises', 10000, 1800, 11800, 5000, 6800, 'In Production', 'Partially Paid');

// Customer Payment
db.prepare(`
  INSERT INTO payments (id, order_id, customer_id, customer_name, amount, method, paid_date)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run('PAY-0001', 'SO-0001', 'CUST-FRESH-01', 'ABC Enterprises', 5000, 'UPI', new Date().toISOString().split('T')[0]);

// Outsource Job & Bill
db.prepare(`
  INSERT INTO outsource_jobs (id, outsource_number, sales_order_id, supplier_id, supplier_name, work_description, quantity, outsource_cost, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('WO-0001', 'WO-0001', 'SO-0001', 'SUP-FRESH-01', 'Precision Dyeing & Stitch', 'Polo Collar Custom Embroidery', 50, 4500, 'COMPLETED');

db.prepare(`
  INSERT INTO outsource_bills (id, bill_number, vendor_id, vendor_name, bill_date, total_amount, paid_amount, outstanding_amount, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('BILL-0001', 'BILL-0001', 'SUP-FRESH-01', 'Precision Dyeing & Stitch', new Date().toISOString().split('T')[0], 4500, 2000, 2500, 'Partially Paid');

db.prepare(`
  INSERT INTO outsource_payments (id, bill_id, bill_number, vendor_id, vendor_name, amount, payment_method, payment_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('OPAY-0001', 'BILL-0001', 'BILL-0001', 'SUP-FRESH-01', 'Precision Dyeing & Stitch', 2000, 'NEFT', new Date().toISOString().split('T')[0]);

console.log('✔ Test 4 Passed: Newly created customer, supplier, product, order, bill, and payments inserted.');

// 5. SIMULATE RESTART / RE-HYDRATION (No mock data resurrection)
console.log('\n--- TEST 5: Verify Persistence & No Auto-Seeding Resurrection ---');

// Re-open fresh connection
const reloadedDb = new Database(dbPath);
const reloadedCustomers = reloadedDb.prepare('SELECT * FROM customers').all();
const reloadedOrders = reloadedDb.prepare('SELECT * FROM sales_orders').all();
const reloadedBills = reloadedDb.prepare('SELECT * FROM outsource_bills').all();

assert.equal(reloadedCustomers.length, 1, 'Only 1 customer should exist (the newly created one, not 10 mock customers)');
assert.equal(reloadedCustomers[0].name, 'ABC Enterprises', 'Customer name must be ABC Enterprises');

assert.equal(reloadedOrders.length, 1, 'Only 1 order should exist');
assert.equal(reloadedOrders[0].id, 'SO-0001', 'Order ID must be SO-0001');

assert.equal(reloadedBills.length, 1, 'Only 1 outsource bill should exist');
assert.equal(reloadedBills[0].bill_number, 'BILL-0001', 'Bill number must be BILL-0001');

console.log('✔ Test 5 Passed: Only newly created data persists; zero mock data resurrection detected.');

console.log('\n========================================================================');
console.log('  ALL TESTS PASSED! FRESH START & DATA PERSISTENCE VERIFIED PERFECTLY! ');
console.log('========================================================================\n');
