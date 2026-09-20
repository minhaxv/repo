import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../server/db.js';
import { generateToken } from '../server/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

console.log('===========================================================');
console.log('  TEST SUITE: Automatic Billing-Staff Attribution');
console.log('===========================================================');

let serverProcess = null;

async function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server/index.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PORT: String(TEST_PORT) },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    serverProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      if (stdoutData.includes(`Persistent SQLite ERP Server running on http://localhost:${TEST_PORT}`)) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server Stderr:', data.toString());
    });

    serverProcess.on('error', reject);

    // Timeout after 8 seconds
    setTimeout(() => {
      if (!stdoutData.includes('Persistent SQLite ERP Server')) {
        reject(new Error(`Server startup timed out. Output: ${stdoutData}`));
      }
    }, 8000);
  });
}

function stopServer() {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {}
  }
}

function cleanupTestData() {
  db.prepare("DELETE FROM sales_orders WHERE id LIKE 'SO-TEST-ATTR-%'").run();
  db.prepare("DELETE FROM sales_order_items WHERE sales_order_id LIKE 'SO-TEST-ATTR-%'").run();
  db.prepare("DELETE FROM payments WHERE order_id LIKE 'SO-TEST-ATTR-%' OR id LIKE 'PAY-SO-TEST-ATTR-%'").run();
  db.prepare("DELETE FROM job_work WHERE sales_order_id LIKE 'SO-TEST-ATTR-%'").run();
  db.prepare("DELETE FROM audit_logs WHERE record_id LIKE 'SO-TEST-ATTR-%'").run();
}

async function runTests() {
  try {
    console.log(`Starting test server on port ${TEST_PORT}...`);
    await startServer();
    console.log(`✓ Test server running on ${BASE_URL}`);

    // Clean up any existing test records from previous runs
    cleanupTestData();

    // ------------------------------------------------------------------------
    // TEST 1: Staff A creates an order -> saved billing identity is Staff A
    // ------------------------------------------------------------------------
    console.log('\n--- Test 1: Staff A creates an order ---');
    const loginA = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'billing', password: 'Billing@123' })
    });
    const authDataA = await loginA.json();
    assert.equal(authDataA.success, true, 'Staff A login must succeed');
    const tokenA = authDataA.token;
    assert.ok(tokenA, 'Token for Staff A must exist');
    assert.equal(authDataA.user.name, 'Ramesh Sharma', 'Staff A name must be Ramesh Sharma');
    assert.equal(authDataA.user.employeeId, 'EMP-101', 'Staff A employeeId must be EMP-101');

    const orderPayloadA = {
      orderHeader: {
        id: 'SO-TEST-ATTR-001',
        orderNumber: 'SO-TEST-ATTR-001',
        customerName: 'Acro Displays Corp',
        orderDate: '2026-09-18',
        deliveryDate: '2026-09-20',
        orderType: 'Direct'
      },
      items: [
        {
          id: 'ITEM-TEST-001',
          productTitle: 'Vinyl Banner Printing',
          description: 'Frontlit Flex 10x4',
          qty: 1,
          sellingRate: 500,
          rate: 500,
          unit: 'Sq.Ft',
          amount: 500,
          taxType: 'EXCLUSIVE',
          gstRate: 18
        }
      ],
      advanceAmount: 100,
      paymentMethod: 'UPI'
    };

    const resA = await fetch(`${BASE_URL}/api/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify(orderPayloadA)
    });
    const dataA = await resA.json();
    assert.equal(resA.status, 200, `Order creation must return 200: ${JSON.stringify(dataA)}`);
    assert.equal(dataA.success, true);

    // Verify in SQLite database directly
    const savedOrderA = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get('SO-TEST-ATTR-001');
    assert.ok(savedOrderA, 'Order A must exist in SQLite database');
    assert.equal(savedOrderA.billed_by_id, 'EMP-101', 'billed_by_id must be EMP-101');
    assert.equal(savedOrderA.billed_by_staff, 'Ramesh Sharma', 'billed_by_staff must be Ramesh Sharma');
    assert.equal(savedOrderA.billed_by_role, 'Sales', 'billed_by_role must be Sales');
    assert.ok(savedOrderA.billed_at, 'billed_at timestamp must be recorded');
    assert.equal(savedOrderA.created_by_user_id, 'USR-EMP-101', 'created_by_user_id must be USR-EMP-101');
    assert.equal(savedOrderA.created_by_name, 'Ramesh Sharma', 'created_by_name must be Ramesh Sharma');
    console.log('✓ Test 1 Passed: Order attributed authoritatively to Staff A (Ramesh Sharma / EMP-101)');

    // ------------------------------------------------------------------------
    // TEST 2: Staff B creates an order -> saved billing identity is Staff B
    // ------------------------------------------------------------------------
    console.log('\n--- Test 2: Staff B creates an order ---');
    const loginB = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'emp-sls-02', password: 'Staff@123' })
    });
    const authDataB = await loginB.json();
    assert.equal(authDataB.success, true, 'Staff B login must succeed');
    const tokenB = authDataB.token;
    assert.equal(authDataB.user.name, 'Priya Patel', 'Staff B name must be Priya Patel');
    assert.equal(authDataB.user.employeeId, 'EMP-102', 'Staff B employeeId must be EMP-102');

    const orderPayloadB = {
      orderHeader: {
        id: 'SO-TEST-ATTR-002',
        orderNumber: 'SO-TEST-ATTR-002',
        customerName: 'Beta Signboards',
        orderDate: '2026-09-18',
        deliveryDate: '2026-09-21',
        orderType: 'Direct'
      },
      items: [
        {
          id: 'ITEM-TEST-002',
          productTitle: 'Acrylic Letter Signage',
          description: '3D Gold Acrylic',
          qty: 2,
          sellingRate: 1200,
          rate: 1200,
          unit: 'Pcs',
          amount: 2400,
          taxType: 'EXCLUSIVE',
          gstRate: 18
        }
      ],
      advanceAmount: 500,
      paymentMethod: 'Cash'
    };

    const resB = await fetch(`${BASE_URL}/api/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify(orderPayloadB)
    });
    const dataB = await resB.json();
    assert.equal(resB.status, 200, `Order creation must return 200: ${JSON.stringify(dataB)}`);
    assert.equal(dataB.success, true);

    const savedOrderB = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get('SO-TEST-ATTR-002');
    assert.ok(savedOrderB, 'Order B must exist in SQLite database');
    assert.equal(savedOrderB.billed_by_id, 'EMP-102', 'billed_by_id must be EMP-102');
    assert.equal(savedOrderB.billed_by_staff, 'Priya Patel', 'billed_by_staff must be Priya Patel');
    assert.equal(savedOrderB.billed_by_role, 'Sales', 'billed_by_role must be Sales');
    assert.ok(savedOrderB.billed_at, 'billed_at timestamp must be recorded');
    assert.equal(savedOrderB.created_by_user_id, 'USR-EMP-102', 'created_by_user_id must be USR-EMP-102');
    assert.equal(savedOrderB.created_by_name, 'Priya Patel', 'created_by_name must be Priya Patel');
    console.log('✓ Test 2 Passed: Order attributed authoritatively to Staff B (Priya Patel / EMP-102)');

    // ------------------------------------------------------------------------
    // TEST 3: Forged billed_by fields in request body CANNOT override identity
    // ------------------------------------------------------------------------
    console.log('\n--- Test 3: Forged request body impersonation attempt ---');
    // Staff B sends request claiming to be Staff A and claiming to be Admin
    const forgedPayload = {
      orderHeader: {
        id: 'SO-TEST-ATTR-003',
        orderNumber: 'SO-TEST-ATTR-003',
        customerName: 'Gamma Media',
        orderDate: '2026-09-18',
        deliveryDate: '2026-09-22',
        orderType: 'Direct',
        // ATTEMPTED IMPERSONATION IN CLIENT PAYLOAD:
        billedByStaff: 'Ramesh Sharma',
        billedByStaffId: 'EMP-101',
        billedByRole: 'Admin',
        billedAt: '1999-01-01 00:00:00',
        created_by_user_id: 'USR-ADMIN-01',
        created_by_name: 'Minhaj V (Admin)'
      },
      items: [
        {
          id: 'ITEM-TEST-003',
          productTitle: 'Standee 6x3',
          qty: 1,
          sellingRate: 800,
          rate: 800,
          unit: 'Pcs',
          amount: 800,
          taxType: 'EXCLUSIVE',
          gstRate: 18
        }
      ]
    };

    const resForged = await fetch(`${BASE_URL}/api/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}` // Real token is Staff B (Priya Patel)
      },
      body: JSON.stringify(forgedPayload)
    });
    const dataForged = await resForged.json();
    assert.equal(resForged.status, 200);

    const savedOrderForged = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get('SO-TEST-ATTR-003');
    assert.equal(savedOrderForged.billed_by_id, 'EMP-102', 'Forged billed_by_id MUST be ignored and remain EMP-102');
    assert.equal(savedOrderForged.billed_by_staff, 'Priya Patel', 'Forged billed_by_staff MUST be ignored and remain Priya Patel');
    assert.equal(savedOrderForged.billed_by_role, 'Sales', 'Forged billedByRole Admin MUST be ignored and remain Sales');
    assert.notEqual(savedOrderForged.billed_at, '1999-01-01 00:00:00', 'Forged timestamp MUST be ignored');
    assert.equal(savedOrderForged.created_by_user_id, 'USR-EMP-102', 'Forged user ID MUST be ignored');
    console.log('✓ Test 3 Passed: Forged request body fields completely ignored; session identity enforced');

    // ------------------------------------------------------------------------
    // TEST 4: Missing or expired session CANNOT create an order
    // ------------------------------------------------------------------------
    console.log('\n--- Test 4: Missing or expired session rejection ---');
    // Case 4A: Missing token
    const resNoToken = await fetch(`${BASE_URL}/api/sales-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayloadA)
    });
    assert.equal(resNoToken.status, 401, 'Request without token must return 401 Unauthorized');
    const errNoToken = await resNoToken.json();
    assert.equal(errNoToken.success, false);
    console.log('✓ Test 4A Passed: Missing token rejected with 401 Unauthorized');

    // Case 4B: Expired token
    const expiredToken = generateToken({
      userId: 'USR-EMP-101',
      id: 'USR-EMP-101',
      employeeId: 'EMP-101',
      name: 'Ramesh Sharma',
      role: 'Sales'
    }, -5); // Expired 5 hours ago

    const resExpired = await fetch(`${BASE_URL}/api/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expiredToken}`
      },
      body: JSON.stringify(orderPayloadA)
    });
    assert.equal(resExpired.status, 401, 'Request with expired token must return 401');
    const errExpired = await resExpired.json();
    assert.equal(errExpired.error?.code, 'INVALID_TOKEN', 'Error code must indicate INVALID_TOKEN');
    console.log('✓ Test 4B Passed: Expired token rejected with 401 and INVALID_TOKEN code');

    // ------------------------------------------------------------------------
    // TEST 5: Staff B edits Staff A's order -> original billing identity preserved, edit attributed to Staff B in audit
    // ------------------------------------------------------------------------
    console.log("\n--- Test 5: Staff B edits Staff A's order ---");
    const editPayload = {
      orderHeader: {
        id: 'SO-TEST-ATTR-001',
        notes: 'Customer requested express delivery via courier'
      },
      items: []
    };

    const resEdit = await fetch(`${BASE_URL}/api/sales-orders/SO-TEST-ATTR-001`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}` // Staff B is editing
      },
      body: JSON.stringify(editPayload)
    });
    assert.equal(resEdit.status, 200, 'Order edit must succeed');

    const orderAfterEdit = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get('SO-TEST-ATTR-001');
    assert.equal(orderAfterEdit.billed_by_id, 'EMP-101', 'Original billed_by_id must remain EMP-101 (Staff A)');
    assert.equal(orderAfterEdit.billed_by_staff, 'Ramesh Sharma', 'Original billed_by_staff must remain Ramesh Sharma (Staff A)');
    assert.equal(orderAfterEdit.notes, 'Customer requested express delivery via courier', 'Notes must be updated');

    // Verify audit log records Staff B as editor
    const auditLog = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE record_id = 'SO-TEST-ATTR-001' AND action = 'ORDER_UPDATED'
      ORDER BY created_at DESC LIMIT 1
    `).get();
    assert.ok(auditLog, 'Audit log entry for ORDER_UPDATED must exist');
    assert.equal(auditLog.employee_id, 'EMP-102', 'Audit log must record Staff B employeeId EMP-102');
    assert.equal(auditLog.employee_name, 'Priya Patel', 'Audit log must record Staff B name Priya Patel');
    console.log('✓ Test 5 Passed: Original Billed By preserved; edit attributed to Staff B in audit history');

    // ------------------------------------------------------------------------
    // TEST 6: Sales Person & Care Of remain independent from Billed By
    // ------------------------------------------------------------------------
    console.log('\n--- Test 6: Sales Person & Care Of separate from Billed By ---');
    const orderPayloadSep = {
      orderHeader: {
        id: 'SO-TEST-ATTR-004',
        orderNumber: 'SO-TEST-ATTR-004',
        customerName: 'Delta Retailers',
        orderDate: '2026-09-18',
        deliveryDate: '2026-09-25',
        salesPersonId: 'SP-103',
        salesPersonName: 'Rohit Gupta',
        careOfId: 'CO-101',
        careOfName: 'Production Coordinator'
      },
      items: [
        {
          id: 'ITEM-TEST-004',
          productTitle: 'Glow Sign Board',
          qty: 1,
          sellingRate: 4000,
          rate: 4000,
          unit: 'Pcs',
          amount: 4000,
          taxType: 'EXCLUSIVE',
          gstRate: 18
        }
      ]
    };

    const resSep = await fetch(`${BASE_URL}/api/sales-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}` // Billed by Staff A (Ramesh Sharma)
      },
      body: JSON.stringify(orderPayloadSep)
    });
    assert.equal(resSep.status, 200);

    const savedOrderSep = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get('SO-TEST-ATTR-004');
    assert.equal(savedOrderSep.billed_by_staff, 'Ramesh Sharma', 'Billed By must be Ramesh Sharma');
    assert.equal(savedOrderSep.sales_person_name, 'Rohit Gupta', 'Sales Person must be Rohit Gupta');
    assert.equal(savedOrderSep.careOfName || savedOrderSep.care_of_name, 'Production Coordinator', 'Care Of must be Production Coordinator');
    assert.notEqual(savedOrderSep.billed_by_staff, savedOrderSep.sales_person_name, 'Billed By and Sales Person must remain distinct');
    console.log('✓ Test 6 Passed: Sales Person (Rohit Gupta) and Care Of remain completely distinct from Billed By');

    // ------------------------------------------------------------------------
    // TEST 7: Historical orders without attribution remain unchanged
    // ------------------------------------------------------------------------
    console.log('\n--- Test 7: Historical orders with null attribution untouched ---');
    const historicalOrder = db.prepare("SELECT * FROM sales_orders WHERE id = 'SO-2026-0891'").get();
    assert.ok(historicalOrder, 'Historical order SO-2026-0891 must exist');
    assert.equal(historicalOrder.billed_by_staff, null, 'Historical order billed_by_staff must remain null');
    assert.equal(historicalOrder.billed_by_id, null, 'Historical order billed_by_id must remain null');
    console.log('✓ Test 7 Passed: Historical orders preserved with null attribution (no guessing)');

    // ------------------------------------------------------------------------
    // TEST 8: Verify SalesOrdersView.jsx contains no billing-staff selector
    // ------------------------------------------------------------------------
    console.log('\n--- Test 8: SalesOrdersView.jsx form inspection ---');
    const salesOrdersViewCode = fs.readFileSync(path.resolve(__dirname, '../src/views/SalesOrdersView.jsx'), 'utf8');
    const hasBilledBySelector = salesOrdersViewCode.includes('Billed By (Billing Staff)');
    assert.equal(hasBilledBySelector, false, 'SalesOrdersView.jsx must not contain Billed By (Billing Staff) selector');
    console.log('✓ Test 8 Passed: Form contains NO manual billing-staff selector');

    // ------------------------------------------------------------------------
    // TEST 9: POST /api/auth/switch-user endpoint issuance
    // ------------------------------------------------------------------------
    console.log('\n--- Test 9: POST /api/auth/switch-user session verification ---');
    const switchRes = await fetch(`${BASE_URL}/api/auth/switch-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: 'EMP-102' })
    });
    const switchData = await switchRes.json();
    assert.equal(switchRes.status, 200);
    assert.equal(switchData.success, true);
    assert.equal(switchData.user.name, 'Priya Patel');
    assert.ok(switchData.token, 'Switch user must issue signed JWT token');
    console.log('✓ Test 9 Passed: switch-user successfully mints verified session token for target staff');

    console.log('\n===========================================================');
    console.log('  ALL 9 TESTS PASSED SUCCESSFULLY!                          ');
    console.log('===========================================================\n');

  } finally {
    // Clean up test records
    cleanupTestData();
    stopServer();
  }
}

runTests().catch((err) => {
  console.error('❌ Test Suite Failed:', err);
  stopServer();
  process.exit(1);
});
