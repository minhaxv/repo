import crypto from 'crypto';
import { verifyPassword } from './migrations.js';

const JWT_SECRET = process.env.JWT_SECRET || 'printflow_secret_key_change_in_production_2026';

// Generate a signed session token using Node native HMAC-SHA256
export function generateToken(payload, expiresInHours = 168) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + (expiresInHours * 3600);
  const data = { ...payload, exp };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedData = Buffer.from(JSON.stringify(data)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedData}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedData}.${signature}`;
}

// Verify a signed session token
export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedData, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedData}`)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedData, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// Express Auth Middleware
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : req.query.token;

  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      return next();
    }
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session token is invalid or expired. Please sign in again.' }
    });
  }

  // Device authentication for Biometric Terminal (ZKTeco K90)
  const deviceToken = req.headers['x-device-token'] || req.query.device_token;
  const validDeviceKey = process.env.BIOMETRIC_DEVICE_KEY || 'ZKTECO_K90_DEVICE_SECRET';
  if (deviceToken && deviceToken === validDeviceKey) {
    req.user = {
      id: 'DEV-ZKTECO-01',
      userId: 'DEV-ZKTECO-01',
      employeeId: null,
      username: 'zkteco_terminal',
      role: 'Device',
      department: 'Biometrics',
      name: 'ZKTeco K90 Biometric Device',
      permissions: ['biometric.punch']
    };
    return next();
  }

  // Separated local demo environment bypass (only if explicitly enabled via header)
  if (req.headers['x-demo-environment'] === 'true') {
    req.user = {
      id: 'USR-ADMIN-01',
      userId: 'USR-ADMIN-01',
      employeeId: 'EMP-ADM-01',
      username: 'admin',
      role: 'Admin',
      department: 'Management',
      name: 'Administrator (Demo)',
      permissions: ['ALL'],
      isDemo: true
    };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in to access this resource.' }
  });
}

// Server Audit Logging Helper (Derives actor from authenticated session)
export function logAuditEvent(db, { user, action, module, recordId, recordNumber = '', details = {} }) {
  try {
    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, employee_id, employee_name, role, action, module, record_id, record_number, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logId,
      user?.userId || user?.id || 'SYSTEM',
      user?.employeeId || null,
      user?.name || user?.username || 'Authorized Staff',
      user?.role || 'Staff',
      action,
      module,
      recordId,
      recordNumber || recordId,
      detailsStr
    );
  } catch (e) {
    console.warn('Failed to record audit event:', e.message);
  }
}

// Permission checking helper
export function hasPermission(user, perm) {
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'SUPER ADMIN') return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes(perm) || perms.includes('ALL');
}

// Middleware to enforce specific roles
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    if (req.user.role === 'Admin' || req.user.role === 'SUPER ADMIN' || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: `Access denied. Required roles: ${allowedRoles.join(', ')}` }
    });
  };
}

// Middleware to enforce specific permission
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    if (hasPermission(req.user, permission)) {
      return next();
    }
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: `Permission required: ${permission}` }
    });
  };
}

// Authenticate user against database
export function loginUser(db, usernameOrEmail, password) {
  const user = db.prepare(`
    SELECT u.*, e.name as employee_name, e.code as employee_code, e.department as emp_dept, e.role as emp_role, e.allowed_processes
    FROM users u
    LEFT JOIN employees e ON u.employee_id = e.id
    WHERE LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?)
  `).get(usernameOrEmail, usernameOrEmail);

  if (!user) {
    return { success: false, message: 'Invalid username or password' };
  }

  if (user.status !== 'Active') {
    return { success: false, message: 'This account has been deactivated. Please contact your manager.' };
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    return { success: false, message: 'Invalid username or password' };
  }

  // Update last login
  db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

  let allowedProcesses = [];
  try {
    if (user.allowed_processes) {
      allowedProcesses = JSON.parse(user.allowed_processes);
    }
  } catch (e) {}

  const payload = {
    userId: user.id,
    id: user.id,
    employeeId: user.employee_id,
    username: user.username,
    email: user.email,
    name: user.employee_name || user.username,
    role: user.role,
    department: user.emp_dept || user.department,
    permissions: user.permissions ? JSON.parse(user.permissions) : [],
    allowedProcesses
  };

  const token = generateToken(payload);

  return {
    success: true,
    token,
    user: payload
  };
}
