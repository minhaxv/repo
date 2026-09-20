import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3001';

console.log('================================================================');
console.log('🔒 FINANCIAL PRIVACY & ACCESS CONTROL TEST SUITE');
console.log('================================================================\n');

async function login(username, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Login failed for ${username}: ${data.error || res.statusText}`);
  }
  return data.token;
}

async function runPrivacyTests() {
  // 1. Authenticate as Admin
  console.log('--- TEST 1: Admin Authorization (Full Financial Visibility) ---');
  const adminToken = await login('admin', 'Admin@123');
  assert.ok(adminToken, 'Admin token must exist');

  // Fetch /api/all as Admin
  const adminAllRes = await fetch(`${BASE_URL}/api/all`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.equal(adminAllRes.status, 200, 'Admin can fetch /api/all');
  const adminData = await adminAllRes.json();

  // Validate Admin sees profit and margin data
  assert.ok(adminData.salesOrders.length > 0, 'Must have sales orders');
  const sampleAdminOrder = adminData.salesOrders.find(o => o.grossProfit !== null && o.grossProfit !== undefined);
  assert.ok(sampleAdminOrder, 'Admin must see non-null grossProfit on orders');
  console.log(`✓ Admin verified: Order #${sampleAdminOrder.id} grossProfit = ₹${sampleAdminOrder.grossProfit}, margin = ${sampleAdminOrder.profitMarginPct}%`);

  // Validate Admin sees product estimated costs
  const sampleAdminProduct = adminData.products.find(p => p.estimatedCost !== null && p.estimatedCost !== undefined);
  assert.ok(sampleAdminProduct, 'Admin must see product estimatedCost');
  console.log(`✓ Admin verified: Product "${sampleAdminProduct.name}" estimatedCost = ₹${sampleAdminProduct.estimatedCost}`);

  // Validate Admin sees employee salary/commission/incentive rates
  const sampleAdminEmp = adminData.employees.find(e => e.baseSalary !== null || e.commissionRate !== null || e.incentiveRate !== null);
  assert.ok(sampleAdminEmp, 'Admin must see employee baseSalary or commissionRate or incentiveRate');
  console.log(`✓ Admin verified: Employee "${sampleAdminEmp.name}" salary = ₹${sampleAdminEmp.baseSalary}, comm = ${sampleAdminEmp.commissionRate}%, inc = ₹${sampleAdminEmp.incentiveRate}`);

  // Validate Admin sees salesPersons commission rates
  if (adminData.salesPersons.length > 0) {
    const spWithComm = adminData.salesPersons.find(s => s.commissionRate !== null && s.commissionRate !== undefined);
    assert.ok(spWithComm, 'Admin must see sales person commissionRate');
    console.log(`✓ Admin verified: Sales Person "${spWithComm.name}" commission = ${spWithComm.commissionRate}%`);
  }

  // Validate Admin sees careOfPersons referral commission rates
  if (adminData.careOfPersons.length > 0) {
    const coWithComm = adminData.careOfPersons.find(c => c.referralCommissionPct !== null && c.referralCommissionPct !== undefined);
    assert.ok(coWithComm, 'Admin must see care of referralCommissionPct');
    console.log(`✓ Admin verified: Care Of "${coWithComm.name}" referral commission = ${coWithComm.referralCommissionPct}%`);
  }

  // Validate Admin can fetch Profit & Loss report
  const adminPnlRes = await fetch(`${BASE_URL}/api/accounting/reports/profit-loss`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.equal(adminPnlRes.status, 200, 'Admin can fetch P&L report');
  const pnlData = await adminPnlRes.json();
  assert.ok(pnlData.success, 'P&L report success');
  assert.ok(pnlData.statement.netProfit !== undefined, 'P&L report contains netProfit');
  console.log(`✓ Admin verified: P&L Report accessible with Net Operating Profit = ₹${pnlData.statement.netProfit}`);

  // 2. Test Non-Admin Roles (Operator, Designer, Billing, Accounts)
  const testRoles = [
    { username: 'operator', pass: 'Print@123', label: 'Operator (Production)' },
    { username: 'designer', pass: 'Design@123', label: 'Designer' },
    { username: 'billing',  pass: 'Billing@123',  label: 'Billing (Sales)' },
    { username: 'accounts', pass: 'Accounts@123', label: 'Accounts Staff' }
  ];

  for (const roleInfo of testRoles) {
    console.log(`\n--- TEST: Role-Level Privacy for ${roleInfo.label} ---`);
    const token = await login(roleInfo.username, roleInfo.pass);
    assert.ok(token, `${roleInfo.label} login succeeded`);

    // Fetch /api/all
    const allRes = await fetch(`${BASE_URL}/api/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(allRes.status, 200, `${roleInfo.label} can fetch /api/all`);
    const data = await allRes.json();

    // 1. Check Sales Orders
    for (const order of data.salesOrders) {
      assert.equal(order.grossProfit, null, `Order ${order.id} grossProfit must be null for ${roleInfo.label}`);
      assert.equal(order.profitMarginPct, null, `Order ${order.id} profitMarginPct must be null for ${roleInfo.label}`);
      assert.equal(order.actualCost, null, `Order ${order.id} actualCost must be null for ${roleInfo.label}`);
      assert.equal(order.actualProfit, null, `Order ${order.id} actualProfit must be null for ${roleInfo.label}`);

      // Check Order items
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          assert.equal(item.estimatedCost, null, `Item in order ${order.id} estimatedCost must be null for ${roleInfo.label}`);
          assert.equal(item.actualCost, null, `Item in order ${order.id} actualCost must be null for ${roleInfo.label}`);
          assert.equal(item.estimatedVendorCost, null, `Item in order ${order.id} estimatedVendorCost must be null for ${roleInfo.label}`);
          assert.equal(item.actualVendorBill, null, `Item in order ${order.id} actualVendorBill must be null for ${roleInfo.label}`);
        }
      }
    }
    console.log(`✓ Sanitization verified: All ${data.salesOrders.length} sales orders have profit & cost fields stripped to null`);

    // 2. Check Products
    for (const prod of data.products) {
      assert.equal(prod.estimatedCost, null, `Product ${prod.name} estimatedCost must be null for ${roleInfo.label}`);
    }
    console.log(`✓ Sanitization verified: All ${data.products.length} products have estimatedCost stripped to null`);

    // 3. Check Material Specs
    for (const spec of (data.productMaterialSpecs || [])) {
      assert.equal(spec.costPrice, null, `Material spec ${spec.id} costPrice must be null for ${roleInfo.label}`);
    }
    console.log(`✓ Sanitization verified: All material specs have costPrice stripped to null`);

    // 4. Check Employees
    for (const emp of data.employees) {
      assert.equal(emp.baseSalary, null, `Employee ${emp.name} baseSalary must be null for ${roleInfo.label}`);
      assert.equal(emp.commissionRate, null, `Employee ${emp.name} commissionRate must be null for ${roleInfo.label}`);
      assert.equal(emp.incentiveRate, null, `Employee ${emp.name} incentiveRate must be null for ${roleInfo.label}`);
    }
    console.log(`✓ Sanitization verified: All ${data.employees.length} employees have salaries, commissions, and incentives stripped to null`);

    // 5. Check Sales Persons
    for (const sp of data.salesPersons) {
      assert.equal(sp.commissionRate, null, `Sales Person ${sp.name} commissionRate must be null for ${roleInfo.label}`);
    }
    console.log(`✓ Sanitization verified: All ${data.salesPersons.length} sales persons have commissionRate stripped to null`);

    // 6. Check Care Of Persons
    for (const co of data.careOfPersons) {
      assert.equal(co.referralCommissionPct, null, `Care Of ${co.name} referralCommissionPct must be null for ${roleInfo.label}`);
    }
    console.log(`✓ Sanitization verified: All ${data.careOfPersons.length} care of partners have referralCommissionPct stripped to null`);

    // 7. Check Worker Job Incentives
    assert.deepEqual(data.workerJobIncentives, [], `workerJobIncentives must be empty array for ${roleInfo.label}`);
    console.log(`✓ Sanitization verified: workerJobIncentives is sanitized to []`);

    // 8. Enforce 403 on Profit & Loss Endpoint
    const pnlRes = await fetch(`${BASE_URL}/api/accounting/reports/profit-loss`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    assert.equal(pnlRes.status, 403, `P&L endpoint must return 403 Forbidden for ${roleInfo.label}`);
    console.log(`✓ 403 Forbidden verified: ${roleInfo.label} is blocked from P&L report`);

    // 9. Enforce 403 on Worker Incentives Management Endpoint
    const postIncRes = await fetch(`${BASE_URL}/api/worker-incentives`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ workerId: 'EMP-106', orderId: 'ORD-101', amount: 50 })
    });
    assert.equal(postIncRes.status, 403, `POST /api/worker-incentives must return 403 Forbidden for ${roleInfo.label}`);
    console.log(`✓ 403 Forbidden verified: ${roleInfo.label} is blocked from POST /api/worker-incentives`);
  }

  // 3. Test Anonymous / Unauthenticated Access
  console.log('\n--- TEST: Anonymous / Unauthenticated Privacy ---');
  const anonAllRes = await fetch(`${BASE_URL}/api/all`);
  assert.equal(anonAllRes.status, 401, 'Anonymous request to /api/all must be rejected with 401 Unauthorized');

  const anonPnlRes = await fetch(`${BASE_URL}/api/accounting/reports/profit-loss`);
  assert.equal(anonPnlRes.status, 401, 'Anonymous request to P&L must be rejected with 401 Unauthorized');
  console.log('✓ 401 Unauthorized verified: Unauthenticated callers cannot access any ERP data or P&L report');

  console.log('\n================================================================');
  console.log('🎉 ALL FINANCIAL PRIVACY & ACCESS CONTROL TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runPrivacyTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
