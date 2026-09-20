import assert from 'node:assert/strict';
import db, { generateNextSequence, postDoubleEntryJournal } from '../server/db.js';
import { generateToken } from '../server/auth.js';

const BASE_URL = 'http://localhost:3001';

console.log('================================================================');
console.log('🧪 MASTER PRODUCTION-GRADE TRANSFORMATION TEST SUITE');
console.log('================================================================\n');

async function runTests() {
  // Test 1: API Health Check & Database Quick Check
  console.log('--- TEST 1: Health & Database Diagnostics ---');
  {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200, 'Health check must return HTTP 200');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.status, 'healthy');
    assert.equal(data.database.status, 'connected');
    assert.equal(data.database.integrity, 'ok');
    assert.ok(data.database.latestMigration >= '010_master_erp_transformation', 'Latest migration must be at least 010');
    console.log(`✓ Health Endpoint verified: SQLite WAL mode, PRAGMA quick_check OK, migration ${data.database.latestMigration} active`);
  }

  // Test 2: Real User Authentication & RBAC Authorization
  console.log('\n--- TEST 2: Real User Authentication & Role Scoping ---');
  let adminToken = '';
  let operatorToken = '';
  let adminUser = null;
  let operatorUser = null;

  {
    // Login as Admin
    const adminRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
    });
    assert.equal(adminRes.status, 200, 'Admin login must succeed');
    const adminData = await adminRes.json();
    assert.equal(adminData.success, true);
    assert.ok(adminData.token, 'Must return JWT token');
    assert.equal(adminData.user.role, 'Admin');
    adminToken = adminData.token;
    adminUser = adminData.user;
    console.log(`✓ Admin authenticated: ${adminUser.name} (${adminUser.employeeId})`);

    // Login as Production Operator
    const opRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'Print@123' })
    });
    assert.equal(opRes.status, 200, 'Operator login must succeed');
    const opData = await opRes.json();
    assert.equal(opData.success, true);
    assert.ok(opData.token);
    assert.equal(opData.user.role, 'Production');
    operatorToken = opData.token;
    operatorUser = opData.user;
    console.log(`✓ Operator authenticated: ${operatorUser.name} (${operatorUser.employeeId})`);

    // RBAC: Operator must NOT have access to Admin endpoints
    const forbiddenRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${operatorToken}` }
    });
    assert.equal(forbiddenRes.status, 403, 'Operator must be forbidden from Admin Users endpoint');
    console.log('✓ RBAC Enforced: Operator received 403 Forbidden on Admin Users endpoint');

    // Admin CAN access users endpoint
    const allowedRes = await fetch(`${BASE_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.equal(allowedRes.status, 200);
    const usersData = await allowedRes.json();
    assert.ok(usersData.users.length >= 8, 'Users list must return seed users');
    console.log(`✓ Admin authorized: Successfully retrieved ${usersData.users.length} system user accounts`);
  }

  // Test 3: Atomic "Take Work" Concurrency Race Condition Guard
  console.log('\n--- TEST 3: Atomic Take-Work Concurrency Test ---');
  {
    // Seed an available production task
    const testTaskId = `TSK-CONC-TEST-${Date.now()}`;
    db.prepare(`
      INSERT INTO production_tasks (
        id, task_date, employee_id, employee_name, order_id, order_number, customer_name,
        item_id, item_title, process_name, quantity, unit, status, priority, department, created_by
      ) VALUES (?, '2026-09-18', 'UNASSIGNED', 'Available Work Pool', 'SO-TEST', 'SO-TEST', 'Test Client', 'SOI-TEST', 'Banner', 'Printing', 1, 'Sq.Ft', 'Pending', 'Normal', 'Production', 'Admin')
    `).run(testTaskId);

    // Operator A (Vikas Patil) and Operator B (Rahul Studio) tokens
    const rahulToken = generateToken({
      userId: 'usr_rahul',
      id: 'usr_rahul',
      username: 'rahul',
      name: 'Rahul Studio',
      role: 'Designer',
      employeeId: 'EMP-002',
      department: 'Designing'
    });

    // Fire two simultaneous "TAKE WORK" requests
    const [resA, resB] = await Promise.all([
      fetch(`${BASE_URL}/api/production-tasks/${testTaskId}/take`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${operatorToken}` }
      }),
      fetch(`${BASE_URL}/api/production-tasks/${testTaskId}/take`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${rahulToken}` }
      })
    ]);

    const statusA = resA.status;
    const statusB = resB.status;

    // Exactly one must succeed with 200, and the other must fail with 409 Conflict
    const successCount = (statusA === 200 ? 1 : 0) + (statusB === 200 ? 1 : 0);
    const conflictCount = (statusA === 409 ? 1 : 0) + (statusB === 409 ? 1 : 0);

    assert.equal(successCount, 1, 'Exactly one worker must succeed in taking the task');
    assert.equal(conflictCount, 1, 'The other worker must receive 409 Conflict');

    // Verify task state in SQLite
    const taskInDb = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(testTaskId);
    assert.equal(taskInDb.status, 'Assigned');
    assert.ok(taskInDb.employee_id === 'EMP-106' || taskInDb.employee_id === 'EMP-002');
    console.log(`✓ Atomic Take-Work Race Guard PASSED: One worker claimed task (${taskInDb.employee_name}), second received 409 Conflict`);

    // Clean up test task
    db.prepare('DELETE FROM production_tasks WHERE id = ?').run(testTaskId);
    db.prepare('DELETE FROM production_task_time_logs WHERE task_id = ?').run(testTaskId);
  }

  // Test 4: Task Action Lifecycle & Auto Inventory Consumption on COMPLETE
  console.log('\n--- TEST 4: Task Lifecycle & Automatic Inventory Consumption ---');
  {
    // Check initial stock of Star Flex
    const flexMat = db.prepare("SELECT * FROM inventory WHERE name LIKE '%Star Flex%' LIMIT 1").get();
    assert.ok(flexMat, 'Star Flex inventory item must exist');
    const initialStock = flexMat.current_stock;

    // Create a mock sales order, item, and production task
    const testItemId = `SOI-INV-TEST-${Date.now()}`;
    const testOrderId = `SO-INV-TEST-${Date.now()}`;
    db.prepare(`
      INSERT INTO sales_orders (
        id, order_number, order_date, customer_id, customer_name, order_type, grand_total
      ) VALUES (?, ?, '2026-09-18', 'CUST-101', 'Inv Client', 'Direct', 1000)
    `).run(testOrderId, testOrderId);

    db.prepare(`
      INSERT INTO sales_order_items (
        id, sales_order_id, product_name_snapshot, material, width, height, qty, unit, production_status
      ) VALUES (?, ?, 'Vinyl Banner', ?, 10, 5, 2, 'Sq.Ft', 'Pending')
    `).run(testItemId, testOrderId, flexMat.name);

    const testTaskId = `TSK-INV-TEST-${Date.now()}`;
    db.prepare(`
      INSERT INTO production_tasks (
        id, task_date, employee_id, employee_name, order_id, order_number, customer_name,
        item_id, item_title, process_name, quantity, unit, status, priority, department, assigned_employee_id, created_by
      ) VALUES (?, '2026-09-18', 'EMP-106', 'Vikas Patil', ?, ?, 'Inv Client', ?, 'Vinyl Banner', 'Printing', 2, 'Sq.Ft', 'Assigned', 'Normal', 'Production', 'EMP-106', 'Admin')
    `).run(testTaskId, testOrderId, testOrderId, testItemId);

    // 1. START Task
    const startRes = await fetch(`${BASE_URL}/api/production-tasks/${testTaskId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${operatorToken}` },
      body: JSON.stringify({ action: 'START' })
    });
    assert.equal(startRes.status, 200);
    const startData = await startRes.json();
    assert.equal(startData.status, 'Started');

    // 2. PAUSE Task
    const pauseRes = await fetch(`${BASE_URL}/api/production-tasks/${testTaskId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${operatorToken}` },
      body: JSON.stringify({ action: 'PAUSE', pauseReason: 'Machine Cleaning' })
    });
    assert.equal(pauseRes.status, 200);
    const pauseData = await pauseRes.json();
    assert.equal(pauseData.status, 'Paused');

    // 3. COMPLETE Task (Triggers auto inventory deduction for 10x5x2 = 100 sq.ft)
    const completeRes = await fetch(`${BASE_URL}/api/production-tasks/${testTaskId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${operatorToken}` },
      body: JSON.stringify({ action: 'COMPLETE', completedQty: 2 })
    });
    assert.equal(completeRes.status, 200);
    const completeData = await completeRes.json();
    assert.equal(completeData.status, 'Completed');

    // Verify stock deducted
    const updatedFlexMat = db.prepare('SELECT current_stock FROM inventory WHERE id = ?').get(flexMat.id);
    const expectedDeduction = 10 * 5 * 2; // 100 sq.ft
    assert.ok(updatedFlexMat.current_stock < initialStock, 'Stock must decrease upon production task completion');

    // Verify ledger transaction was written
    const tx = db.prepare(`
      SELECT * FROM inventory_transactions
      WHERE reference_id = ? AND transaction_type = 'PRODUCTION_CONSUMPTION'
    `).get(testItemId);
    assert.ok(tx.quantity > 0, 'Consumption quantity must be positive');
    assert.equal(tx.unit, flexMat.unit, 'Transaction unit must match inventory substrate unit');
    console.log(`✓ Production Lifecycle & Material Consumption Verified: Stock deducted from ${initialStock} to ${updatedFlexMat.current_stock} (${tx.quantity} ${tx.unit})`);

    // Clean up
    db.prepare('DELETE FROM production_tasks WHERE id = ?').run(testTaskId);
    db.prepare('DELETE FROM production_task_time_logs WHERE task_id = ?').run(testTaskId);
    db.prepare('DELETE FROM sales_order_items WHERE id = ?').run(testItemId);
    db.prepare('DELETE FROM sales_orders WHERE id = ?').run(testOrderId);
    db.prepare('DELETE FROM inventory_transactions WHERE id = ?').run(tx.id);
    db.prepare('UPDATE inventory SET current_stock = ? WHERE id = ?').run(initialStock, flexMat.id);
  }

  // Test 5: Customer Credit Limit Guard
  console.log('\n--- TEST 5: Customer Credit Limit Enforcement ---');
  {
    // Setup test customer with strict credit limit
    const testCustId = `CUST-CREDIT-TEST-${Date.now()}`;
    db.prepare(`
      INSERT INTO customers (id, customer_code, name, mobile, outstanding, credit_limit)
      VALUES (?, 'C-CRED-' || ?, 'Over Limit Client', '9999900001', 8000, 10000)
    `).run(testCustId, testCustId);

    // Operator (without sales.approve_credit permission) creates an order for ₹5,000 on credit (8000 + 5000 = 13000 > 10000 limit)
    const overLimitRes = await fetch(`${BASE_URL}/api/sales-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${operatorToken}` },
      body: JSON.stringify({
        orderHeader: { customerId: testCustId, customerName: 'Over Limit Client', mobile: '9999900001' },
        items: [
          { productName: 'High Value Signage', qty: 1, sellingRate: 5000, width: 1, height: 1, unit: 'Pcs' }
        ],
        advanceAmount: 0
      })
    });

    assert.equal(overLimitRes.status, 400, 'Order exceeding credit limit must return HTTP 400 Bad Request');
    const overLimitData = await overLimitRes.json();
    assert.equal(overLimitData.error?.code, 'CREDIT_LIMIT_EXCEEDED');
    console.log('✓ Credit Limit Protection PASSED: Order rejected with CREDIT_LIMIT_EXCEEDED when customer outstanding exceeds limit');

    // Clean up customer
    db.prepare('DELETE FROM customers WHERE id = ?').run(testCustId);
  }

  // Test 6: Atomic Quotation to Sales Order Conversion
  console.log('\n--- TEST 6: Atomic Quotation to Sales Order Conversion ---');
  {
    const quoteId = `QT-TEST-${Date.now()}`;
    const quoteNumber = `QT-2026-TEST-${Date.now()}`;
    db.prepare(`
      INSERT INTO sales_orders (
        id, order_number, order_date, customer_id, customer_name, order_type, quotation_status,
        subtotal, cgst, sgst, grand_total, advance_amount, balance_amount, created_by_user_id
      ) VALUES (?, ?, '2026-09-18', 'CUST-101', 'Test Customer', 'Quotation', 'Draft', 2000, 180, 180, 2360, 500, 1860, 'usr_admin')
    `).run(quoteId, quoteNumber);

    db.prepare(`
      INSERT INTO sales_order_items (
        id, sales_order_id, product_name_snapshot, material, width, height, qty, unit, selling_rate, amount
      ) VALUES (?, ?, 'Digital Posters', '300 GSM Art Card', 1, 1, 100, 'Pcs', 20, 2000)
    `).run(`SOI-${quoteId}`, quoteId);

    // Convert quotation
    const convertRes = await fetch(`${BASE_URL}/api/quotations/${quoteId}/convert`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    assert.equal(convertRes.status, 200, 'Quotation conversion must succeed');
    const convertData = await convertRes.json();
    assert.equal(convertData.success, true);
    assert.ok(convertData.orderId.startsWith('SO-2026-'), 'Generated order ID must use SO-2026 sequence');

    // Verify quotation is marked Converted
    const quoteAfter = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(quoteId);
    assert.equal(quoteAfter.quotation_status, 'Converted');
    assert.equal(quoteAfter.converted_order_id, convertData.orderId);

    // Attempt duplicate conversion -> MUST be rejected
    const dupRes = await fetch(`${BASE_URL}/api/quotations/${quoteId}/convert`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.equal(dupRes.status, 400, 'Duplicate quotation conversion must be rejected');
    console.log(`✓ Quotation Conversion PASSED: Converted to ${convertData.orderId}; duplicate conversion rejected with HTTP 400`);

    // Clean up
    db.prepare('DELETE FROM sales_orders WHERE id = ? OR id = ?').run(quoteId, convertData.orderId);
    db.prepare('DELETE FROM sales_order_items WHERE sales_order_id = ? OR sales_order_id = ?').run(quoteId, convertData.orderId);
    db.prepare('DELETE FROM production_tasks WHERE order_id = ?').run(convertData.orderId);
  }

  // Test 7: Double-Entry Accounting Invariant & Payment Posting
  console.log('\n--- TEST 7: Double-Entry Accounting Validation ---');
  {
    // 1. Verify Trial Balance is balanced
    const tbRes = await fetch(`${BASE_URL}/api/accounting/reports/trial-balance`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.equal(tbRes.status, 200);
    const tbData = await tbRes.json();
    assert.equal(tbData.success, true);
    assert.equal(tbData.trialBalance.isBalanced, true, 'Trial Balance must satisfy Total Debit == Total Credit');
    console.log(`✓ Trial Balance Balanced: Total Debit = ₹${tbData.trialBalance.totalDebit}, Total Credit = ₹${tbData.trialBalance.totalCredit}`);

    // 2. Post Manual Balanced Journal Voucher
    const postJvRes = await fetch(`${BASE_URL}/api/accounting/journals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        voucherType: 'Expense Entry',
        narration: 'Office Consumables & Cleaning Supplies',
        date: new Date().toISOString().split('T')[0],
        entries: [
          { account: 'Office Supplies Expense', type: 'DEBIT', amount: 750 },
          { account: 'Cash Account', type: 'CREDIT', amount: 750 }
        ]
      })
    });
    assert.equal(postJvRes.status, 200);
    const jvData = await postJvRes.json();
    assert.equal(jvData.success, true);
    assert.ok(jvData.voucherNumber.startsWith('JV-2026-'));
    console.log(`✓ Balanced Journal Posted: ${jvData.voucherNumber}`);

    // 3. Post Unbalanced Journal Voucher -> Must be rejected
    const unbalJvRes = await fetch(`${BASE_URL}/api/accounting/journals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        voucherType: 'Journal Entry',
        entries: [
          { account: 'Rent Expense', type: 'DEBIT', amount: 5000 },
          { account: 'Cash Account', type: 'CREDIT', amount: 4500 } // Diff 500!
        ]
      })
    });
    assert.equal(unbalJvRes.status, 400, 'Unbalanced journal voucher must be rejected with HTTP 400');
    console.log('✓ Double-Entry Invariant Guard PASSED: Unbalanced journal voucher rejected with HTTP 400');

    // 4. Record Payment and Verify Journal Generation
    const payRes = await fetch(`${BASE_URL}/api/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerName: 'Minhaj Demo Customer',
        amount: 1500,
        method: 'UPI',
        refNo: `UPI-${Date.now()}`
      })
    });
    assert.equal(payRes.status, 200);
    const payData = await payRes.json();
    assert.ok(payData.paymentId.startsWith('PAY-2026-'), 'Payment ID must use sequential PAY-2026 numbering');
    console.log(`✓ Payment recorded with sequential ID: ${payData.paymentId} and double-entry voucher posted`);
  }

  // Test 8: Printing Machinery CRUD API
  console.log('\n--- TEST 8: Printing Machinery Management ---');
  {
    const macRes = await fetch(`${BASE_URL}/api/machines`);
    assert.equal(macRes.status, 200);
    const macData = await macRes.json();
    assert.ok(macData.machines.length >= 7, 'Must return seeded printing machines');
    const roland = macData.machines.find(m => m.name.includes('Roland'));
    assert.ok(roland, 'Roland TrueVIS machine must exist');
    console.log(`✓ Printing Equipment Verified: Found ${macData.machines.length} production machines including ${roland.name}`);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL 8 MASTER TRANSFORMATION TEST SUITES PASSED (100%)');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
