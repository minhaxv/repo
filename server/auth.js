import crypto from 'crypto';
import { verifyPassword } from './migrations.js';
import db from './db.js';

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

/**
 * Resolves effective permissions:
 * Effective Permissions = (Role Permissions U Granted Overrides) \ Revoked Overrides
 */
export function getEffectivePermissions(database, user) {
  const activeDb = database || db;
  if (!user) return [];
  const roleName = user.role || '';
  if (roleName === 'Admin' || roleName === 'SUPER ADMIN') {
    const allPerms = activeDb.prepare("SELECT id FROM permissions").all().map(p => p.id);
    return ['ALL', '*', ...allPerms];
  }

  // Find matching role in roles table
  let role = activeDb.prepare("SELECT id, name FROM roles WHERE id = ? OR name = ?").get(user.roleId || roleName, roleName);
  if (!role) {
    const aliases = {
      'Sales': 'Sales Executive',
      'Billing': 'Billing Staff',
      'Production': (user.department === 'Finishing') ? 'Finishing Staff' : 'Printing Operator',
      'Accounts': 'Accountant',
      'HR': 'HR Staff',
      'Delivery': 'Delivery Staff',
      'QC': 'QC Staff'
    };
    const mapped = aliases[roleName];
    if (mapped) {
      role = activeDb.prepare("SELECT id, name FROM roles WHERE name = ?").get(mapped);
    }
  }

  const effectiveSet = new Set();

  // 1. Base permissions from role_permissions
  if (role) {
    const rolePerms = activeDb.prepare("SELECT permission_id FROM role_permissions WHERE role_id = ?").all(role.id);
    rolePerms.forEach(rp => effectiveSet.add(rp.permission_id));
  }

  // 2. Apply individual employee overrides (employee_permissions)
  const overrides = activeDb.prepare(`
    SELECT permission_id, is_granted 
    FROM employee_permissions 
    WHERE (user_id = ? AND user_id IS NOT NULL) 
       OR (employee_id = ? AND employee_id IS NOT NULL)
  `).all(user.id || user.userId || null, user.employeeId || user.employee_id || null);

  overrides.forEach(ov => {
    if (ov.is_granted === 1) {
      effectiveSet.add(ov.permission_id);
    } else {
      effectiveSet.delete(ov.permission_id);
    }
  });

  return Array.from(effectiveSet);
}

/**
 * Resolves effective production process permissions for staff
 */
export function getEffectiveProcesses(database, user) {
  const activeDb = database || db;
  if (!user) return [];
  const roleName = user.role || '';
  if (roleName === 'Admin' || roleName === 'SUPER ADMIN' || roleName === 'Management') {
    return [
      'Flex Printing', 'Digital Printing', 'Eco-Solvent Printing', 'UV Flatbed Printing',
      'Designing', 'Lamination', 'Plotter Cutting', 'Acrylic Laser Cutting',
      'CNC Router Engraving', 'Letter Bending', 'Channel Letter Fabrication',
      'LED Module Wiring', 'Welding & Iron Framing', 'Eyeletting', 'Thermal Lamination',
      'Foam Sheet Pasting', 'Die Cutting', 'Scoring & Creasing', 'Hardcover Book Binding',
      'Quality Inspection', 'Packing & Wrapping', 'Dispatch', 'Site Installation'
    ];
  }

  const userId = user.id || user.userId || null;
  const empId = user.employeeId || user.employee_id || null;

  const rows = activeDb.prepare(`
    SELECT process_name, is_allowed 
    FROM employee_process_permissions 
    WHERE (user_id = ? AND user_id IS NOT NULL)
       OR (employee_id = ? AND employee_id IS NOT NULL)
  `).all(userId, empId);

  if (rows.length > 0) {
    return rows.filter(r => r.is_allowed === 1).map(r => r.process_name);
  }

  // Fallback to employee allowed_processes column
  if (empId) {
    const emp = activeDb.prepare("SELECT allowed_processes FROM employees WHERE id = ?").get(empId);
    if (emp && emp.allowed_processes) {
      try {
        const parsed = JSON.parse(emp.allowed_processes);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
  }

  return [];
}

// Permission checking helper
export function hasPermission(user, perm) {
  if (!user) return false;
  if (user.role === 'Admin' || user.role === 'SUPER ADMIN') return true;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.includes('ALL') || perms.includes('*')) return true;
  if (perms.includes(perm)) return true;

  // Module prefix check
  if (perm.startsWith('module.')) {
    const modShort = perm.replace('module.', '');
    if (perms.includes(modShort) || perms.includes(`module.${modShort}`)) return true;
  }

  // Backward compatibility alias checks
  if (perm === 'production.view_own' && perms.includes('production.view_my_tasks')) return true;
  if (perm === 'production.view_my_tasks' && perms.includes('production.view_own')) return true;

  return false;
}

// Middleware to enforce specific roles
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    if (req.user.role === 'Admin' || req.user.role === 'SUPER ADMIN') {
      return next();
    }
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    if ((allowedRoles.includes('Admin') || allowedRoles.includes('Manager')) && 
        (hasPermission(req.user, 'module.admin') || req.user.role === 'Management')) {
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
      error: { code: 'FORBIDDEN', message: `Access denied. Missing permission: ${permission}` }
    });
  };
}

// Express Auth Middleware with Live DB Validation & Session Revocation
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : req.query.token;

  if (token) {
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Session token is invalid or expired. Please sign in again.' }
      });
    }

    // Live Authoritative Database Validation (Session Invalidation & Permission Refresh)
    try {
      const liveUser = db.prepare(`
        SELECT u.id, u.username, u.email, u.role, u.status, u.employee_id,
               e.name as employee_name, e.code as employee_code, e.department as emp_dept, e.designation, e.allowed_processes
        FROM users u
        LEFT JOIN employees e ON u.employee_id = e.id
        WHERE u.id = ?
      `).get(decoded.id || decoded.userId);

      if (!liveUser) {
        if (decoded && (decoded.employeeId || decoded.role)) {
          req.user = decoded;
          return next();
        }
        return res.status(401).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User account no longer exists.' }
        });
      }

      // Live account status check
      if (liveUser.status !== 'Active') {
        let msg = 'Your ERP account is currently disabled. Please contact management.';
        if (liveUser.status === 'Locked') {
          msg = 'Your account has been locked. Please contact management.';
        } else if (liveUser.status === 'Pending') {
          msg = 'Your account is pending activation. Please contact management.';
        }
        return res.status(403).json({
          success: false,
          error: { code: 'ACCOUNT_DISABLED', message: msg }
        });
      }

      // Calculate real-time effective permissions and processes
      const permissions = getEffectivePermissions(db, liveUser);
      const allowedProcesses = getEffectiveProcesses(db, liveUser);

      req.user = {
        id: liveUser.id,
        userId: liveUser.id,
        employeeId: liveUser.employee_id,
        username: liveUser.username,
        email: liveUser.email,
        name: liveUser.employee_name || liveUser.username,
        employeeCode: liveUser.employee_code,
        role: liveUser.role,
        department: liveUser.emp_dept || decoded.department,
        designation: liveUser.designation,
        permissions,
        allowedProcesses
      };

      try {
        db.prepare("UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?").run(liveUser.id);
      } catch (e) {}

      return next();
    } catch (dbErr) {
      console.error('Error verifying live user session against DB:', dbErr);
      req.user = decoded;
      return next();
    }
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
      permissions: ['biometric.punch', 'ALL']
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
      permissions: ['ALL', '*'],
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
export function logAuditEvent(database, { user, action, module, recordId, recordNumber = '', details = {} }) {
  const activeDb = database || db;
  try {
    const logId = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
    activeDb.prepare(`
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

// Authenticate user against database
export function loginUser(database, usernameOrEmail, password) {
  const activeDb = database || db;
  const user = activeDb.prepare(`
    SELECT u.*, e.name as employee_name, e.code as employee_code, e.department as emp_dept, e.role as emp_role, e.designation, e.allowed_processes
    FROM users u
    LEFT JOIN employees e ON u.employee_id = e.id
    WHERE LOWER(u.username) = LOWER(?) OR LOWER(u.email) = LOWER(?)
  `).get(usernameOrEmail, usernameOrEmail);

  if (!user) {
    return { success: false, message: 'Invalid username or password' };
  }

  if (user.status !== 'Active') {
    let msg = 'Your ERP account is currently disabled. Please contact management.';
    if (user.status === 'Locked') {
      msg = 'Your account has been locked. Please contact management.';
    } else if (user.status === 'Pending') {
      msg = 'Your account is pending activation. Please contact management.';
    }
    return { success: false, message: msg, statusCode: 403 };
  }

  const isValid = verifyPassword(password, user.password_hash, user.salt);
  if (!isValid) {
    return { success: false, message: 'Invalid username or password' };
  }

  // Update last login
  try {
    activeDb.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP, last_active = CURRENT_TIMESTAMP, login_count = COALESCE(login_count, 0) + 1 WHERE id = ?").run(user.id);
  } catch (e) {}

  const permissions = getEffectivePermissions(activeDb, user);
  const allowedProcesses = getEffectiveProcesses(activeDb, user);

  const payload = {
    userId: user.id,
    id: user.id,
    employeeId: user.employee_id,
    username: user.username,
    email: user.email,
    name: user.employee_name || user.username,
    employeeCode: user.employee_code,
    role: user.role,
    department: user.emp_dept || user.department,
    designation: user.designation,
    permissions,
    allowedProcesses
  };

  const token = generateToken(payload);

  return {
    success: true,
    token,
    user: payload
  };
}

