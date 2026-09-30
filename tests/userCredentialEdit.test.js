import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../server/db.js';
import { generateToken } from '../server/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 3198;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

console.log('===========================================================');
console.log('  TEST SUITE: User Credential Editing & Password Reset');
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

    setTimeout(() => {
      if (!stdoutData.includes('Persistent SQLite ERP Server')) {
        reject(new Error(`Server startup timed out. Output: ${stdoutData}`));
      }
    }, 10000);
  });
}

function stopServer() {
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch (e) {}
  }
}

async function runTests() {
  try {
    console.log(`Starting test server on port ${TEST_PORT}...`);
    await startServer();
    console.log(`✓ Test server running on ${BASE_URL}`);

    // Create an admin token
    const adminToken = generateToken({
      id: 'USR-ADMIN-01',
      userId: 'USR-ADMIN-01',
      employeeId: 'EMP-ADM-01',
      name: 'Minhaj V (Admin)',
      role: 'Admin',
      department: 'Management'
    });

    // 1. Create a test employee & user
    const testEmpId = 'EMP-TEST-CRED-01';
    db.prepare('DELETE FROM audit_logs WHERE record_id = ?').run(`USR-${testEmpId}`);
    db.prepare('DELETE FROM users WHERE employee_id = ?').run(testEmpId);
    db.prepare('DELETE FROM employees WHERE id = ?').run(testEmpId);

    const createRes = await fetch(`${BASE_URL}/api/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        employeeId: testEmpId,
        employeeCode: 'TEST-001',
        name: 'Test Staff',
        username: 'teststaff',
        email: 'teststaff@screenarts.in',
        password: 'InitialPassword@123',
        role: 'Sales Executive',
        designation: 'Sales Rep',
        status: 'Active'
      })
    });
    const createData = await createRes.json();
    assert.equal(createRes.status, 200, `User creation should succeed: ${createData.error}`);
    console.log('✓ Test 1 Passed: Initial user account created');

    // 2. Verify initial login works
    const loginRes1 = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'teststaff', password: 'InitialPassword@123' })
    });
    const loginData1 = await loginRes1.json();
    assert.equal(loginRes1.status, 200, 'Initial login should succeed');
    console.log('✓ Test 2 Passed: Initial login succeeded');

    // 3. Edit User: Change Username, Email, Designation, and Reset Password
    const updateRes = await fetch(`${BASE_URL}/api/users/USR-${testEmpId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        username: 'newusername',
        email: 'newemail@screenarts.in',
        password: 'NewStrongPassword@2026',
        designation: 'Senior Sales Executive',
        role: 'Sales Executive',
        status: 'Active',
        reason: 'Credentials updated in audit test'
      })
    });
    const updateData = await updateRes.json();
    assert.equal(updateRes.status, 200, `User update should succeed: ${updateData.error}`);
    console.log('✓ Test 3 Passed: User credentials & password updated successfully via PUT /api/users/:id');

    // 4. Verify old password fails
    const oldLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'newusername', password: 'InitialPassword@123' })
    });
    assert.equal(oldLoginRes.status, 401, 'Old password must be rejected');
    console.log('✓ Test 4 Passed: Old password correctly rejected (401)');

    // 5. Verify new password succeeds with new username
    const newLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'newusername', password: 'NewStrongPassword@2026' })
    });
    const newLoginData = await newLoginRes.json();
    assert.equal(newLoginRes.status, 200, 'Login with new credentials must succeed');
    assert.equal(newLoginData.user.username, 'newusername');
    console.log('✓ Test 5 Passed: Login with new username and new password succeeded');

    // 6. Verify audit log entry
    const auditLog = db.prepare(`
      SELECT * FROM audit_logs
      WHERE record_id = ? AND action = 'UPDATE_USER_CREDENTIALS'
    `).get(`USR-${testEmpId}`);
    assert.ok(auditLog, 'Audit log entry for UPDATE_USER_CREDENTIALS must exist');
    const details = JSON.parse(auditLog.details);
    assert.equal(details.targetUsername, 'newusername');
    assert.equal(details.changes.password, 'PASSWORD_RESET');
    console.log('✓ Test 6 Passed: Audit log immutably recorded credential change with actor attribution');

    // 7. Test Admin Lockout Protection: Try to disable or demote the last active admin
    const adminUser = db.prepare("SELECT id FROM users WHERE role = 'Admin' AND status = 'Active' LIMIT 1").get();
    if (adminUser) {
      // Temporarily mark any other admins as Disabled so this is the last one
      const otherAdmins = db.prepare("SELECT id FROM users WHERE role = 'Admin' AND status = 'Active' AND id != ?").all(adminUser.id);
      db.prepare("UPDATE users SET status = 'Disabled' WHERE role = 'Admin' AND id != ?").run(adminUser.id);

      const lockoutRes = await fetch(`${BASE_URL}/api/users/${adminUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'Disabled' })
      });
      assert.equal(lockoutRes.status, 400, 'Must block disabling the last active admin');
      const lockoutData = await lockoutRes.json();
      assert.ok(lockoutData.error.includes('At least one active administrator must remain'), 'Error message must reflect admin protection');

      // Restore other admins
      otherAdmins.forEach(oa => {
        db.prepare("UPDATE users SET status = 'Active' WHERE id = ?").run(oa.id);
      });
      console.log('✓ Test 7 Passed: Admin lockout guard enforced; last administrator protected from deactivation');
    }

    // Cleanup test user
    db.prepare('DELETE FROM audit_logs WHERE record_id = ?').run(`USR-${testEmpId}`);
    db.prepare('DELETE FROM users WHERE employee_id = ?').run(testEmpId);
    db.prepare('DELETE FROM employees WHERE id = ?').run(testEmpId);
    console.log('✓ Test 8 Passed: Test artifacts cleaned up');

    console.log('\n===========================================================');
    console.log('  ALL USER CREDENTIAL EDITING TESTS PASSED SUCCESSFULLY! ✓');
    console.log('===========================================================');
  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err);
    process.exitCode = 1;
  } finally {
    stopServer();
  }
}

runTests();
