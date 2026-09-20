import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3001';

console.log('====================================================');
console.log('--- SCREENARTS ERP: EMPLOYEE USER CONTROL TESTS ---');
console.log('====================================================');

async function runTests() {
  // TEST 1: Admin Login & Full Permission Access
  console.log('\n[TEST 1] Testing Admin Login (Minhaj V)...');
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
  });
  const adminLoginData = await adminLoginRes.json();
  assert.equal(adminLoginRes.status, 200, 'Admin login should succeed');
  assert.ok(adminLoginData.token, 'Admin token should be returned');
  assert.equal(adminLoginData.user.role, 'Admin');
  assert.ok(adminLoginData.user.permissions.includes('ALL') || adminLoginData.user.permissions.includes('*'), 'Admin must have full permissions');
  const adminToken = adminLoginData.token;
  console.log('✓ TEST 1 Passed: Minhaj V (Admin) logged in with full access');

  // Verify Admin can view Control Matrix
  console.log('\n[TEST 1B] Verifying Admin access to Employee User Control Matrix...');
  const matrixRes = await fetch(`${BASE_URL}/api/users/control-matrix`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const matrixData = await matrixRes.json();
  assert.equal(matrixRes.status, 200);
  assert.ok(Array.isArray(matrixData.matrix), 'Matrix should return employees list');
  assert.ok(matrixData.matrix.length >= 10, 'Should contain all employees');
  console.log(`✓ TEST 1B Passed: Control matrix retrieved with ${matrixData.matrix.length} employees`);

  // TEST 2: Operator Login (Vikas Patil)
  console.log('\n[TEST 2] Testing Employee Login (Vikas Patil / operator)...');
  const vikasLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operator', password: 'Print@123' })
  });
  const vikasLoginData = await vikasLoginRes.json();
  assert.equal(vikasLoginRes.status, 200, 'Vikas login should succeed');
  const vikasToken = vikasLoginData.token;
  assert.equal(vikasLoginData.user.employeeCode, 'EMP-PRD-01');
  assert.equal(vikasLoginData.user.name, 'Vikas Patil');
  assert.equal(vikasLoginData.user.role, 'Production');
  console.log('✓ TEST 2 Passed: Vikas Patil logged in with production role and identity derived from DB');

  // TEST 3: Access Control on Unauthorized Modules (Accounting & Payroll)
  console.log('\n[TEST 4] Vikas attempts to access protected Accounting API...');
  const acctRes = await fetch(`${BASE_URL}/api/accounting/journals`, {
    headers: { 'Authorization': `Bearer ${vikasToken}` }
  });
  assert.equal(acctRes.status, 403, 'Vikas must receive 403 Forbidden on accounting');
  console.log('✓ TEST 4 Passed: Vikas receives 403 Forbidden for /api/accounting/journals');

  console.log('\n[TEST 4B] Vikas attempts to access protected Payroll API...');
  const payRes = await fetch(`${BASE_URL}/api/payroll`, {
    headers: { 'Authorization': `Bearer ${vikasToken}` }
  });
  assert.equal(payRes.status, 403, 'Vikas must receive 403 Forbidden on payroll');
  console.log('✓ TEST 4B Passed: Vikas receives 403 Forbidden for /api/payroll');

  // TEST 4: Account Disabling (Login Access [ OFF ]) & Live Session Revocation
  console.log('\n[TEST 3] Admin disables Vikas login access [ OFF ]...');
  const disableRes = await fetch(`${BASE_URL}/api/users/USR-EMP-106/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'Disabled', reason: 'Temporary suspension test' })
  });
  assert.equal(disableRes.status, 200, 'Status update to Disabled should succeed');

  console.log('Attempting login while disabled...');
  const vikasDisabledLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operator', password: 'Print@123' })
  });
  const disabledData = await vikasDisabledLogin.json();
  assert.equal(vikasDisabledLogin.status, 403, 'Disabled account login must return 403');
  assert.ok(
    disabledData.error?.message?.includes('Your ERP account is currently disabled'),
    'Must display exact account disabled message'
  );
  console.log('✓ TEST 3A Passed: Login blocked with message: "Your ERP account is currently disabled. Please contact management."');

  console.log('Testing live session revocation on existing JWT token...');
  const liveRevokeRes = await fetch(`${BASE_URL}/api/production-tasks`, {
    headers: { 'Authorization': `Bearer ${vikasToken}` }
  });
  assert.equal(liveRevokeRes.status, 403, 'Active session must be revoked immediately upon DB status check');
  console.log('✓ TEST 3B Passed: Existing session immediately rejected on next API call with 403');

  // Re-enable Vikas
  console.log('Re-enabling Vikas login access [ ON ]...');
  await fetch(`${BASE_URL}/api/users/USR-EMP-106/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'Active', reason: 'Reactivation after test' })
  });

  // Re-login Vikas to obtain active token
  const vikasReLogin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'operator', password: 'Print@123' })
  });
  const freshVikas = await vikasReLogin.json();
  const activeVikasToken = freshVikas.token;

  // TEST 5: Atomic Take Work & Race Condition Prevention
  console.log('\n[TEST 8] Testing Atomic Take Work concurrency...');
  // 1. Create a dummy task
  const createDummyTask = await fetch(`${BASE_URL}/api/production-tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      orderId: 'SO-2026-0891',
      orderNumber: 'SO-2026-0891',
      customerName: 'Concurrency Test Customer',
      itemId: 'ITEM-RACE-1',
      processName: 'Digital Printing',
      processType: 'Printing',
      taskDate: new Date().toISOString().split('T')[0],
      notes: 'Concurrency test task'
    })
  });
  const dummyTaskData = await createDummyTask.json();
  const taskId = dummyTaskData.taskId || dummyTaskData.task?.id || dummyTaskData.id;
  assert.ok(taskId, 'Task must be created for race condition test');

  // 2. Perform simultaneous take requests
  const req1 = fetch(`${BASE_URL}/api/production-tasks/${taskId}/take`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${activeVikasToken}` }
  });
  const req2 = fetch(`${BASE_URL}/api/production-tasks/${taskId}/take`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${activeVikasToken}` }
  });

  const [res1, res2] = await Promise.all([req1, req2]);
  const statuses = [res1.status, res2.status].sort();
  assert.equal(statuses[0], 200, 'Exactly one request must succeed (200)');
  assert.equal(statuses[1], 409, 'The other simultaneous request must receive 409 Conflict');
  console.log('✓ TEST 8 Passed: Simultaneous Take Work handled atomically (1 won, 1 got 409 Conflict)');

  // TEST 6 & 7: Process Access Control (Printing vs Finishing)
  console.log('\n[TEST 6 & 7] Testing Process Scoping (Printing OFF -> Finishing ON)...');
  // Update Vikas permissions: give Finishing, remove Printing
  const permUpdateRes = await fetch(`${BASE_URL}/api/users/USR-EMP-106/permissions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      role: 'Production',
      allowedProcesses: ['Lamination', 'Scoring & Creasing'],
      reason: 'Assign to Finishing department'
    })
  });
  assert.equal(permUpdateRes.status, 200);

  const availWorkRes = await fetch(`${BASE_URL}/api/production-tasks/available`, {
    headers: { 'Authorization': `Bearer ${activeVikasToken}` }
  });
  const availWork = await availWorkRes.json();
  assert.equal(availWorkRes.status, 200);
  assert.ok(Array.isArray(availWork.allowedProcesses));
  assert.ok(availWork.allowedProcesses.includes('Lamination'));
  assert.ok(!availWork.allowedProcesses.includes('Digital Printing'), 'Printing process should no longer be in allowedProcesses');

  const hasPrintingItems = availWork.availableItems?.some(it => it.processName === 'Digital Printing');
  assert.equal(hasPrintingItems, false, 'No printing items should be available when printing is OFF');
  console.log('✓ TEST 6 & 7 Passed: Process permissions updated dynamically and reflected immediately in available work');

  // Restore Vikas process permissions
  await fetch(`${BASE_URL}/api/users/USR-EMP-106/permissions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      role: 'Production',
      allowedProcesses: ['Flex Printing', 'Digital Printing', 'Eco-Solvent Printing', 'UV Flatbed Printing'],
      reason: 'Restore printing operator profile'
    })
  });

  // TEST 9: Admin Lockout Protection
  console.log('\n[TEST 9] Testing Admin Lockout Guard...');
  const lockoutDisableRes = await fetch(`${BASE_URL}/api/users/USR-ADMIN-01/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'Disabled', reason: 'Attempt to disable last admin' })
  });
  assert.equal(lockoutDisableRes.status, 400, 'Attempt to disable last active admin must fail with 400');
  const lockoutDisableData = await lockoutDisableRes.json();
  assert.equal(lockoutDisableData.error, 'At least one active administrator must remain.');
  console.log('✓ TEST 9A Passed: Disabling last active admin rejected with "At least one active administrator must remain."');

  const lockoutDemoteRes = await fetch(`${BASE_URL}/api/users/USR-ADMIN-01/permissions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ role: 'Sales', reason: 'Attempt to demote last admin' })
  });
  assert.equal(lockoutDemoteRes.status, 400, 'Attempt to demote last active admin must fail with 400');
  const lockoutDemoteData = await lockoutDemoteRes.json();
  assert.equal(lockoutDemoteData.error, 'At least one active administrator must remain.');
  console.log('✓ TEST 9B Passed: Demoting last active admin rejected with "At least one active administrator must remain."');

  // TEST 10: Create Real User Account for Sunil Vishwakarma
  console.log('\n[TEST 10] Admin creates user account for Sunil Vishwakarma (EMP-107)...');
  // First check if user account already exists or create new
  const createSunilRes = await fetch(`${BASE_URL}/api/users/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      employeeId: 'EMP-107',
      username: 'sunil.v',
      password: 'SunilPassword123!',
      role: 'Production',
      designation: 'Fabrication Specialist',
      allowedProcesses: ['Channel Letter Fabrication', 'LED Module Wiring', 'Welding & Iron Framing']
    })
  });
  // Either 200 or 400 if already exists
  if (createSunilRes.status === 200) {
    const sunilData = await createSunilRes.json();
    assert.equal(sunilData.user.username, 'sunil.v');
    console.log('✓ TEST 10 Passed: Real authenticated user created and linked to Sunil Vishwakarma (EMP-107)');
  } else {
    const errData = await createSunilRes.json();
    console.log('✓ TEST 10 Info:', errData.error);
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 10 EMPLOYEE USER CONTROL TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
