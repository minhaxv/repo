import assert from 'node:assert/strict';
import { generateToken, verifyToken, authenticateToken, requireRole } from '../server/auth.js';

console.log('--- Testing Authentication & RBAC Hardening ---');

// Test 1: JWT Generation & Verification
{
  const testUser = {
    id: 'EMP-ADM-01',
    username: 'admin',
    name: 'Minhaj V',
    role: 'Admin',
    department: 'Management'
  };

  const token = generateToken(testUser);
  assert.ok(token, 'JWT token must be generated');

  const decoded = verifyToken(token);
  assert.equal(decoded.id, testUser.id, 'Decoded ID must match user ID');
  assert.equal(decoded.role, 'Admin', 'Decoded role must match');
  console.log('✓ Test 1 Passed: JWT Token Generation & Verification');
}

// Test 2: Unauthenticated Request Interception
{
  let statusCode = null;
  let responseBody = null;
  let nextCalled = false;

  const mockReq = {
    headers: {},
    query: {}
  };
  const mockRes = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    }
  };
  const mockNext = () => { nextCalled = true; };

  authenticateToken(mockReq, mockRes, mockNext);

  assert.equal(statusCode, 401, 'Unauthenticated request must return 401');
  assert.equal(nextCalled, false, 'Next must not be called when unauthenticated');
  assert.equal(responseBody?.error?.code, 'UNAUTHORIZED', 'Error code must indicate UNAUTHORIZED');
  console.log('✓ Test 2 Passed: Unauthenticated Request Interception (401 Unauthorized)');
}

// Test 3: ZKTeco K90 Biometric Ingestion Bypass with Device Token
{
  let nextCalled = false;
  const mockReq = {
    headers: {
      'x-device-token': 'ZKTECO_K90_DEVICE_SECRET'
    },
    query: {}
  };
  const mockRes = {};
  const mockNext = () => { nextCalled = true; };

  authenticateToken(mockReq, mockRes, mockNext);

  assert.equal(nextCalled, true, 'Next must be called when valid device token is provided');
  assert.equal(mockReq.user.role, 'Device', 'Role must be tagged as Device');
  console.log('✓ Test 3 Passed: ZKTeco K90 Biometric Device Ingestion Ingestion Access Preserved');
}

// Test 4: Role-Based Access Control (RBAC) Enforcement
{
  const accountsMiddleware = requireRole(['Admin', 'Accounts']);

  // Case A: User with Designer role trying to access Accounts
  let forbiddenStatus = null;
  const mockReqDesigner = {
    user: { id: 'EMP-DES-01', name: 'Designer One', role: 'Designer' }
  };
  const mockResDesigner = {
    status(code) { forbiddenStatus = code; return this; },
    json() { return this; }
  };
  let nextDesigner = false;
  accountsMiddleware(mockReqDesigner, mockResDesigner, () => { nextDesigner = true; });

  assert.equal(forbiddenStatus, 403, 'Designer role accessing accounts must return 403 Forbidden');
  assert.equal(nextDesigner, false, 'Next must not be called for unauthorized role');

  // Case B: User with Accounts role accessing Accounts
  let nextAccounts = false;
  const mockReqAccounts = {
    user: { id: 'EMP-ACC-01', name: 'Accountant One', role: 'Accounts' }
  };
  accountsMiddleware(mockReqAccounts, {}, () => { nextAccounts = true; });
  assert.equal(nextAccounts, true, 'Accounts role must be granted access');

  console.log('✓ Test 4 Passed: RBAC Role Restrictions Enforced (403 Forbidden on Unauthorized Roles)');
}

console.log('ALL AUTH & RBAC TESTS PASSED SUCCESSFULLY!\n');
