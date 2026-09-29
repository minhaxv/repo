import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database/erp.sqlite');

console.log('========================================================================');
console.log('  TEST: End-to-End Fresh Start Workflow & Data Persistence Verification ');
console.log('========================================================================\n');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// 1. VERIFY INITIAL DATABASE STATE IS FRESH (0 RECORDS)
console.log('--- STEP 1: Verify Initial Clean Slate (0 Records) ---');
const initialCustomerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
const initialSupplierCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get().count;
const initialProductCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
const initialOrderCount = db.prepare('SELECT COUNT(*) as count FROM sales_orders').get().count;
const initialBillCount = db.prepare('SELECT COUNT(*) as count FROM outsource_bills').get().count;
const initialPaymentCount = db.prepare('SELECT COUNT(*) as count FROM payments').get().count;

console.log(`Initial Counts: Customers=${initialCustomerCount}, Suppliers=${initialSupplierCount}, Products=${initialProductCount}, Orders=${initialOrderCount}, Bills=${initialBillCount}, Payments=${initialPaymentCount}`);
assert.equal(initialCustomerCount, 0, 'Customers must be 0');
assert.equal(initialSupplierCount, 0, 'Suppliers must be 0');
assert.equal(initialProductCount, 0, 'Products must be 0');
assert.equal(initialOrderCount, 0, 'Sales Orders must be 0');
assert.equal(initialBillCount, 0, 'Outsource Bills must be 0');
assert.equal(initialPaymentCount, 0, 'Payments must be 0');
console.log('✔ Step 1 Passed: Initial database is completely empty and clean.');

// 2. CREATE RECORDS SPECIFIED IN SECTION 11
console.log('\n--- STEP 2: Create Section 11 Business Records ---');

// Customer: ABC Traders
const customerId = 'CUST-ABC-001';
db.prepare(`
  INSERT INTO customers (id, customer_code, name, mobile, gst_number, customer_type, credit_limit, outstanding)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(customerId, 'ABC-001', 'ABC Traders', '9876543210', '32AABCU9603R1ZM', 'B2B', 50000, 5000);

// Supplier / Vendor: ABC Embroidery
const supplierId = 'SUP-ABC-001';
db.prepare(`
  INSERT INTO suppliers (id, supplier_code, name, category, mobile, pending_payment)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(supplierId, 'SUP-001', 'ABC Embroidery', 'Embroidery & Stitching', '9811223344', 5000);

// Product: Product A
const productId = 'PROD-A-001';
db.prepare(`
  INSERT INTO products (id, product_code, name, category, default_rate, gst_rate)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(productId, 'PRD-A', 'Product A', 'Custom Printing', 500, 18);

// Sales Order: ₹10,000 + ₹1,800 tax = ₹11,800, Advance ₹5,000, Balance ₹6,800
const orderId = 'SO-0001';
db.prepare(`
  INSERT INTO sales_orders (
    id, order_number, order_date, customer_id, customer_name,
    subtotal, tax_total, grand_total, advance_amount, balance_amount, production_status, payment_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(orderId, 'SO-0001', '2026-09-29', customerId, 'ABC Traders', 10000, 1800, 11800, 5000, 6800, 'In Production', 'Partially Paid');

// Customer Receipt: ₹5,000
const receiptId = 'PAY-0001';
db.prepare(`
  INSERT INTO payments (id, order_id, customer_id, customer_name, amount, method, ref_no, paid_date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(receiptId, orderId, customerId, 'ABC Traders', 5000, 'Bank Transfer', 'HDFC-TXN-9021', '2026-09-29');

// Purchase Invoice / Order: ₹8,000
const purchaseOrderId = 'PO-0001';
db.prepare(`
  INSERT INTO purchase_orders (id, vendor_name, order_date, status, total_amount, items)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(purchaseOrderId, 'ABC Embroidery', '2026-09-29', 'Issued', 8000, JSON.stringify([{ item: 'Raw Thread Spools', qty: 20, rate: 400, total: 8000 }]));

// Outsource Work Order: WO-001
const workOrderId = 'WO-001';
db.prepare(`
  INSERT INTO outsource_jobs (
    id, outsource_number, sales_order_id, supplier_id, supplier_name,
    work_description, quantity, outsource_cost, status, billing_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(workOrderId, 'WO-001', orderId, supplierId, 'ABC Embroidery', 'Logo Embroidery for Product A', 10, 5000, 'COMPLETED', 'Billed');

// Outsource Bill: ₹5,000
const billId = 'BILL-0001';
db.prepare(`
  INSERT INTO outsource_bills (
    id, bill_number, vendor_id, vendor_name, bill_date,
    total_amount, paid_amount, outstanding_amount, status, work_orders_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(billId, 'BILL-0001', supplierId, 'ABC Embroidery', '2026-09-29', 5000, 0, 5000, 'Unpaid', JSON.stringify([{ workOrder: 'WO-001', amount: 5000 }]));

console.log('✔ Step 2 Passed: Created Customer (ABC Traders), Product (Product A), Sales Order (₹10,000), Receipt (₹5,000), Purchase Invoice (₹8,000), Work Order (WO-001), Outsource Bill (₹5,000).');

// 3. SIMULATE SYSTEM REBOOT & APPLICATION RESTART
console.log('\n--- STEP 3: Simulate Server Reboot & Fresh SQLite Reconnection ---');
db.close();

// Reconnect to SQLite database from scratch
const freshDb = new Database(dbPath);
freshDb.pragma('journal_mode = WAL');

// Verify all records survived and exist in the authoritative database
const fetchedCustomer = freshDb.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
assert.ok(fetchedCustomer, 'Customer ABC Traders must survive restart');
assert.equal(fetchedCustomer.name, 'ABC Traders');
assert.equal(fetchedCustomer.gst_number, '32AABCU9603R1ZM');
assert.equal(fetchedCustomer.outstanding, 5000);

const fetchedProduct = freshDb.prepare('SELECT * FROM products WHERE id = ?').get(productId);
assert.ok(fetchedProduct, 'Product A must survive restart');
assert.equal(fetchedProduct.name, 'Product A');
assert.equal(fetchedProduct.default_rate, 500);

const fetchedOrder = freshDb.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId);
assert.ok(fetchedOrder, 'Sales Order SO-0001 must survive restart');
assert.equal(fetchedOrder.grand_total, 11800);
assert.equal(fetchedOrder.advance_amount, 5000);
assert.equal(fetchedOrder.balance_amount, 6800);

const fetchedPayment = freshDb.prepare('SELECT * FROM payments WHERE id = ?').get(receiptId);
assert.ok(fetchedPayment, 'Receipt PAY-0001 must survive restart');
assert.equal(fetchedPayment.amount, 5000);

const fetchedPO = freshDb.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(purchaseOrderId);
assert.ok(fetchedPO, 'Purchase Order PO-0001 must survive restart');
assert.equal(fetchedPO.total_amount, 8000);

const fetchedWO = freshDb.prepare('SELECT * FROM outsource_jobs WHERE id = ?').get(workOrderId);
assert.ok(fetchedWO, 'Work Order WO-001 must survive restart');
assert.equal(fetchedWO.outsource_cost, 5000);

const fetchedBill = freshDb.prepare('SELECT * FROM outsource_bills WHERE id = ?').get(billId);
assert.ok(fetchedBill, 'Outsource Bill BILL-0001 must survive restart');
assert.equal(fetchedBill.total_amount, 5000);
assert.equal(fetchedBill.outstanding_amount, 5000);

// Verify NO mock records were resurrected
const totalCustomers = freshDb.prepare('SELECT COUNT(*) as count FROM customers').get().count;
const totalOrders = freshDb.prepare('SELECT COUNT(*) as count FROM sales_orders').get().count;
assert.equal(totalCustomers, 1, 'Only 1 customer should exist, no demo customers re-seeded');
assert.equal(totalOrders, 1, 'Only 1 order should exist, no demo orders re-seeded');

console.log('✔ Step 3 Passed: All newly saved business records survived database reconnection with 100% integrity.');

// 4. RESET TO CLEAN SLATE FOR ERP FRESH START
console.log('\n--- STEP 4: Reset Database Back to 0 Records for Fresh Start ---');
freshDb.transaction(() => {
  freshDb.prepare('DELETE FROM sales_order_items').run();
  freshDb.prepare('DELETE FROM job_work').run();
  freshDb.prepare('DELETE FROM outsource_jobs').run();
  freshDb.prepare('DELETE FROM sales_orders').run();
  freshDb.prepare('DELETE FROM outsource_payments').run();
  freshDb.prepare('DELETE FROM outsource_bills').run();
  freshDb.prepare('DELETE FROM payments').run();
  freshDb.prepare('DELETE FROM customers').run();
  freshDb.prepare('DELETE FROM suppliers').run();
  freshDb.prepare('DELETE FROM product_specifications').run();
  freshDb.prepare('DELETE FROM products').run();
  freshDb.prepare('DELETE FROM purchase_orders').run();
  freshDb.prepare('DELETE FROM inventory_transactions').run();
  freshDb.prepare('DELETE FROM inventory').run();
  freshDb.prepare('DELETE FROM worker_job_incentives').run();
  freshDb.prepare('DELETE FROM production_task_time_logs').run();
  freshDb.prepare('DELETE FROM production_tasks').run();
  freshDb.prepare('DELETE FROM expenses').run();
  freshDb.prepare('DELETE FROM rework_tickets').run();
  freshDb.prepare('DELETE FROM delivery_items').run();
  freshDb.prepare('DELETE FROM delivery_notes').run();
  freshDb.prepare('DELETE FROM artwork_versions').run();
  freshDb.prepare('DELETE FROM journal_entries').run();
  freshDb.prepare('DELETE FROM journal_vouchers').run();
  freshDb.prepare('DELETE FROM audit_logs').run();
  freshDb.prepare('UPDATE document_sequences SET current_number = 0').run();
})();

freshDb.pragma('wal_checkpoint(TRUNCATE)');

const finalCustCount = freshDb.prepare('SELECT COUNT(*) as c FROM customers').get().c;
const finalSuppCount = freshDb.prepare('SELECT COUNT(*) as c FROM suppliers').get().c;
const finalProdCount = freshDb.prepare('SELECT COUNT(*) as c FROM products').get().c;
const finalOrderCount = freshDb.prepare('SELECT COUNT(*) as c FROM sales_orders').get().c;
const finalBillCount = freshDb.prepare('SELECT COUNT(*) as c FROM outsource_bills').get().c;
const finalPayCount = freshDb.prepare('SELECT COUNT(*) as c FROM payments').get().c;

assert.equal(finalCustCount, 0);
assert.equal(finalSuppCount, 0);
assert.equal(finalProdCount, 0);
assert.equal(finalOrderCount, 0);
assert.equal(finalBillCount, 0);
assert.equal(finalPayCount, 0);

console.log(`✔ Step 4 Passed: Final verified state: Customers=${finalCustCount}, Suppliers=${finalSuppCount}, Products=${finalProdCount}, Orders=${finalOrderCount}, Bills=${finalBillCount}, Payments=${finalPayCount}`);

console.log('\n========================================================================');
console.log('  ALL CHECKS PASSED! ERP IS READY WITH 100% PERSISTENT CLEAN SLATE!    ');
console.log('========================================================================\n');

freshDb.close();
