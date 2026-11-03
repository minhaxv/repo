import crypto from 'crypto';

/**
 * Robust, Additive & Versioned Migration Engine for SQLite
 */

// Helper to hash password using Node's native scrypt
export function hashPassword(password, existingSalt = null) {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, hash, salt) {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(testHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) {
    return false;
  }
}

export function runMigrations(db) {
  console.log('🔄 Checking and applying database migrations...');

  // 1. Create migrations ledger table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const appliedList = db.prepare('SELECT migration_name FROM schema_migrations').all().map(r => r.migration_name);

  function applyMigration(name, migrationFn) {
    if (appliedList.includes(name)) {
      return;
    }
    console.log(`⏳ Applying migration: ${name}...`);
    const tx = db.transaction(() => {
      migrationFn(db);
      db.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run(name);
    });
    tx();
    console.log(`✅ Applied migration: ${name}`);
  }

  // ----------------------------------------------------
  // MIGRATION 001: Users and RBAC Authentication
  // ----------------------------------------------------
  applyMigration('001_users_and_auth', (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        employee_id TEXT UNIQUE,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Admin',
        department TEXT DEFAULT 'Management',
        permissions TEXT,
        status TEXT DEFAULT 'Active',
        last_login TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // Seed default admin user: username 'admin', password 'Admin@123'
    const adminCount = database.prepare("SELECT COUNT(*) as count FROM users WHERE username = 'admin'").get().count;
    if (adminCount === 0) {
      const { hash, salt } = hashPassword('Admin@123');
      const permissions = JSON.stringify([
        'VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'PRINT', 'ASSIGN',
        'START', 'PAUSE', 'COMPLETE', 'QC_APPROVE', 'DELIVER', 'RECEIVE_PAYMENT',
        'VIEW_ACCOUNTS', 'VIEW_REPORTS', 'EXPORT_REPORTS', 'MANAGE_USERS', 'MANAGE_SETTINGS'
      ]);

      database.prepare(`
        INSERT INTO users (id, employee_id, username, email, password_hash, salt, role, department, permissions, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'USR-ADMIN-01',
        null,
        'admin',
        'admin@screenarts.in',
        hash,
        salt,
        'Admin',
        'Management',
        permissions,
        'Active'
      );
      console.log('👤 Default Admin Account Created: username "admin", password "Admin@123"');
    }

    // Provision user accounts for existing employees if any
    const existingEmployees = database.prepare("SELECT * FROM employees").all();
    for (const emp of existingEmployees) {
      const userExists = database.prepare("SELECT id FROM users WHERE employee_id = ?").get(emp.id);
      if (!userExists) {
        const username = (emp.code || emp.name.toLowerCase().replace(/[^a-z0-9]/g, '') || emp.id).toLowerCase();
        const email = emp.email || `${username}@screenarts.in`;
        const { hash, salt } = hashPassword('Staff@123');
        const role = emp.role || (emp.department === 'Management' ? 'Admin' : emp.department === 'Sales' ? 'Sales' : emp.department === 'Design' ? 'Designer' : 'Production');
        
        try {
          database.prepare(`
            INSERT OR IGNORE INTO users (id, employee_id, username, email, password_hash, salt, role, department, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(`USR-${emp.id}`, emp.id, username, email, hash, salt, role, emp.department || 'Production', 'Active');
        } catch (e) {}
      }
    }
  });

  // ----------------------------------------------------
  // MIGRATION 002: Inventory Transactions Ledger
  // ----------------------------------------------------
  applyMigration('002_inventory_transactions_ledger', (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        material_id TEXT NOT NULL,
        material_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        reference_type TEXT,
        reference_id TEXT,
        planned_consumption REAL DEFAULT 0,
        actual_consumption REAL DEFAULT 0,
        wastage_qty REAL DEFAULT 0,
        wastage_reason TEXT,
        material_batch TEXT,
        employee_id TEXT,
        employee_name TEXT,
        machine_id TEXT,
        machine_name TEXT,
        remarks TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_inv_tx_mat ON inventory_transactions(material_id);
      CREATE INDEX IF NOT EXISTS idx_inv_tx_ref ON inventory_transactions(reference_id);
      CREATE INDEX IF NOT EXISTS idx_inv_tx_type ON inventory_transactions(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_inv_tx_date ON inventory_transactions(created_at DESC);
    `);

    // Ensure inventory table has required tracking columns
    try { database.prepare("ALTER TABLE inventory ADD COLUMN min_reorder_level REAL DEFAULT 10").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE inventory ADD COLUMN preferred_supplier TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE inventory ADD COLUMN last_purchase_rate REAL DEFAULT 0").run(); } catch(e) {}
  });

  // ----------------------------------------------------
  // MIGRATION 003: Persistent Expenses Subsystem
  // ----------------------------------------------------
  applyMigration('003_persistent_expenses', (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        amount REAL DEFAULT 0,
        vendor_name TEXT,
        vendor_id TEXT,
        payment_method TEXT DEFAULT 'Cash',
        expense_date TEXT NOT NULL,
        description TEXT,
        receipt_url TEXT,
        created_by TEXT,
        approved_by TEXT,
        status TEXT DEFAULT 'Approved',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date DESC);
      CREATE INDEX IF NOT EXISTS idx_expenses_cat ON expenses(category);
    `);

    // Seed initial operational expenses if table is empty
    const expenseCount = database.prepare("SELECT COUNT(*) as count FROM expenses").get().count;
    if (expenseCount === 0) {
      const initialExpenses = [
        { id: 'EXP-889', category: 'Raw Materials (Ink & Solvents)', amount: 17700, vendor_name: 'Sun Chemicals India', payment_method: 'Bank Transfer', expense_date: '2026-08-03', description: 'Solvent ink refill batch 4' },
        { id: 'EXP-890', category: 'Machine Maintenance', amount: 8500, vendor_name: 'Roland Tech Services', payment_method: 'UPI', expense_date: '2026-08-05', description: 'Eco-Solvent Print Head calibration and damper replacement' },
        { id: 'EXP-891', category: 'Electricity & Utilities', amount: 24500, vendor_name: 'Adani Electricity Mumbai', payment_method: 'Net Banking', expense_date: '2026-08-10', description: 'Factory & workshop power consumption July 2026' },
        { id: 'EXP-892', category: 'Delivery & Transport', amount: 3200, vendor_name: 'FastCargo Dispatch', payment_method: 'Cash', expense_date: '2026-08-12', description: 'Express delivery charges for MTDC exhibition backdrop' },
        { id: 'EXP-893', category: 'Packaging & Consumables', amount: 4800, vendor_name: 'Om Packaging House', payment_method: 'Cash', expense_date: '2026-08-13', description: 'Corrugated rolls, bubble wrap, edge protectors' }
      ];
      const insertExp = database.prepare(`
        INSERT INTO expenses (id, category, amount, vendor_name, payment_method, expense_date, description, created_by, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Admin', 'Approved')
      `);
      for (const exp of initialExpenses) {
        insertExp.run(exp.id, exp.category, exp.amount, exp.vendor_name, exp.payment_method, exp.expense_date, exp.description);
      }
      console.log('🧾 Initial persistent expenses seeded successfully.');
    }
  });

  // ----------------------------------------------------
  // MIGRATION 004: Audit Logs & Order Timeline
  // ----------------------------------------------------
  applyMigration('004_audit_logs_and_timeline', (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        employee_id TEXT,
        employee_name TEXT,
        role TEXT,
        action TEXT NOT NULL,
        module TEXT NOT NULL,
        record_id TEXT NOT NULL,
        record_number TEXT,
        details TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_logs(record_id);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
    `);
  });

  // ----------------------------------------------------
  // MIGRATION 005: Order Profitability & QC Rework Tickets
  // ----------------------------------------------------
  applyMigration('005_profitability_and_rework', (database) => {
    // Add profitability columns to sales_orders
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN actual_cost REAL DEFAULT 0").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN actual_profit REAL DEFAULT 0").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN profit_margin_pct REAL DEFAULT 0").run(); } catch(e) {}
    
    // Add created_by attribution columns to sales_orders
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN created_by_user_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN created_by_name TEXT").run(); } catch(e) {}

    // Create rework_tickets table
    database.exec(`
      CREATE TABLE IF NOT EXISTS rework_tickets (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        task_id TEXT,
        defect_category TEXT NOT NULL,
        defect_reason TEXT NOT NULL,
        evidence_url TEXT,
        rejected_qty REAL DEFAULT 0,
        rework_qty REAL DEFAULT 0,
        return_to_stage TEXT NOT NULL,
        assigned_to TEXT,
        qc_inspector_id TEXT,
        qc_inspector_name TEXT,
        status TEXT DEFAULT 'Open',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_rework_order ON rework_tickets(order_id);
    `);
  });

  // ----------------------------------------------------
  // MIGRATION 006: Seed Initial Printing Materials & Stock Ledger
  // ----------------------------------------------------
  applyMigration('006_seed_initial_inventory', (database) => {
    const invCount = database.prepare("SELECT COUNT(*) as count FROM inventory").get().count;
    if (invCount === 0) {
      const initialItems = [
        { id: "INV-01", name: "Star Flex Roll 10ft x 100m (240gsm)", category: "Media Roll", currentStock: 14, unit: "Rolls", reorderLevel: 5, unitCost: 4200 },
        { id: "INV-02", name: "Eco Glossy Vinyl Roll 4.5ft x 50m", category: "Media Roll", currentStock: 8, unit: "Rolls", reorderLevel: 3, unitCost: 3800 },
        { id: "INV-03", name: "Cast Acrylic Sheet White 8x4 ft (3mm)", category: "Sheet Media", currentStock: 25, unit: "Sheets", reorderLevel: 10, unitCost: 2800 },
        { id: "INV-04", name: "Samsung LED Module White 1.2W IP67", category: "Electronics", currentStock: 450, unit: "Pcs", reorderLevel: 100, unitCost: 24 },
        { id: "INV-05", name: "Solvent Cyan Ink Bottle 4 Litres", category: "Inks", currentStock: 3, unit: "Bottles", reorderLevel: 2, unitCost: 3200 },
        { id: "INV-06", name: "Standee Rollup Aluminum Base 2x5ft", category: "Display Hardware", currentStock: 42, unit: "Pcs", reorderLevel: 15, unitCost: 450 }
      ];

      const insertInv = database.prepare(`
        INSERT INTO inventory (id, name, category, current_stock, unit, reorder_level, unit_cost, min_reorder_level, preferred_supplier, last_purchase_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertTx = database.prepare(`
        INSERT INTO inventory_transactions (
          id, material_id, material_name, quantity, unit, transaction_type, reference_type, reference_id,
          planned_consumption, actual_consumption, wastage_qty, wastage_reason, material_batch, employee_id, employee_name, remarks
        ) VALUES (?, ?, ?, ?, ?, 'PURCHASE_IN', 'OPENING_STOCK', 'OPENING-2026', ?, ?, 0, '', 'BATCH-INIT-01', 'EMP-ADM-01', 'Minhaj V (Admin)', 'Initial factory floor opening inventory audit')
      `);

      initialItems.forEach(item => {
        insertInv.run(item.id, item.name, item.category, item.currentStock, item.unit, item.reorderLevel, item.unitCost, item.reorderLevel, 'National Media Co', item.unitCost);
        insertTx.run(`ITX-INIT-${item.id}`, item.id, item.name, item.currentStock, item.unit, item.currentStock, item.currentStock);
      });
      console.log(` -> Seeded ${initialItems.length} printing substrate materials with ledger records`);
    }
  });

  // ----------------------------------------------------
  // MIGRATION 007: User-Based Production Hub & Task Ownership Architecture
  // ----------------------------------------------------
  applyMigration('007_user_based_production_hub', (database) => {
    // 1. Extend production_tasks with strict IDs and audit columns
    const taskCols = [
      'assigned_user_id TEXT',
      'assigned_employee_id TEXT',
      'created_by_user_id TEXT',
      'created_by_employee_id TEXT',
      'started_by_user_id TEXT',
      'started_by_employee_id TEXT',
      'started_at TEXT',
      'paused_by_user_id TEXT',
      'paused_by_employee_id TEXT',
      'paused_at TEXT',
      'pause_reason TEXT',
      'resumed_by_user_id TEXT',
      'resumed_by_employee_id TEXT',
      'resumed_at TEXT',
      'completed_by_user_id TEXT',
      'completed_by_employee_id TEXT',
      'reassigned_by_user_id TEXT',
      'previous_employee_id TEXT',
      'reassignment_reason TEXT'
    ];

    taskCols.forEach(col => {
      try {
        database.prepare(`ALTER TABLE production_tasks ADD COLUMN ${col}`).run();
      } catch (e) {}
    });

    // Populate assigned_employee_id from employee_id for existing rows
    try {
      database.prepare("UPDATE production_tasks SET assigned_employee_id = employee_id WHERE assigned_employee_id IS NULL AND employee_id IS NOT NULL").run();
    } catch (e) {}

    // 2. Extend production_task_time_logs with user_id and employee_id
    try { database.prepare("ALTER TABLE production_task_time_logs ADD COLUMN user_id TEXT").run(); } catch (e) {}
    try { database.prepare("ALTER TABLE production_task_time_logs ADD COLUMN employee_id TEXT").run(); } catch (e) {}

    // 3. Extend employees with allowed_processes JSON
    try { database.prepare("ALTER TABLE employees ADD COLUMN allowed_processes TEXT").run(); } catch (e) {}

    // 4. Populate allowed_processes for default employees
    const processMappings = [
      { id: 'EMP-106', processes: ['Digital Printing', 'Large Format Printing', 'Offset Printing', 'Screen Printing', 'Sticker Cutting', 'Plotter Cutting'] },
      { id: 'EMP-104', processes: ['Designing', 'Proofing', 'Sticker Cutting'] },
      { id: 'EMP-105', processes: ['Designing', 'Proofing', 'Seal Making'] },
      { id: 'EMP-107', processes: ['Lamination', 'Scoring', 'Creasing', 'Binding', 'Cutting', 'Eyelet', 'Pasting', 'Mounting', 'Packing'] },
      { id: 'EMP-108', processes: ['Delivery', 'Packing', 'Installation'] },
      { id: 'EMP-110', processes: ['Screen Printing', 'Offset Printing', 'Digital Printing'] },
      { id: 'EMP-111', processes: ['Designing', 'Proofing'] },
      { id: 'EMP-112', processes: ['Sticker Cutting', 'Lamination', 'Cutting'] },
      { id: 'EMP-113', processes: ['Binding', 'Eyelet', 'Pasting', 'Packing'] }
    ];

    processMappings.forEach(pm => {
      database.prepare("UPDATE employees SET allowed_processes = ? WHERE id = ?").run(JSON.stringify(pm.processes), pm.id);
    });

    // 5. Seed / Update Workstation Accounts in users table
    const staffPermissions = JSON.stringify([
      'production.view_own', 'production.view_available', 'production.take_work',
      'production.start', 'production.pause', 'production.resume', 'production.complete',
      'VIEW', 'PRINT'
    ]);

    const adminPermissions = JSON.stringify([
      'production.view_all', 'production.assign', 'production.reassign',
      'production.view_employee_workload', 'production.manage_processes', 'production.view_audit',
      'production.view_own', 'production.view_available', 'production.take_work',
      'production.start', 'production.pause', 'production.resume', 'production.complete',
      'VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'PRINT', 'ASSIGN',
      'VIEW_ACCOUNTS', 'VIEW_REPORTS', 'EXPORT_REPORTS', 'MANAGE_USERS', 'MANAGE_SETTINGS'
    ]);

    const workstationUsers = [
      { id: 'USR-OPERATOR', username: 'operator', pass: 'Print@123', empId: 'EMP-106', role: 'Production', dept: 'Printing', permissions: staffPermissions },
      { id: 'USR-DESIGNER', username: 'designer', pass: 'Design@123', empId: 'EMP-104', role: 'Designer', dept: 'Design', permissions: staffPermissions },
      { id: 'USR-FINISHER', username: 'finisher', pass: 'Finish@123', empId: 'EMP-107', role: 'Production', dept: 'Finishing', permissions: staffPermissions },
      { id: 'USR-DELIVERY', username: 'delivery', pass: 'Delivery@123', empId: 'EMP-108', role: 'Delivery', dept: 'Delivery', permissions: staffPermissions },
      { id: 'USR-BILLING',  username: 'billing',  pass: 'Billing@123',  empId: 'EMP-101', role: 'Sales', dept: 'Sales', permissions: staffPermissions },
      { id: 'USR-QC',       username: 'qc',       pass: 'QC@123',       empId: null,      role: 'QC', dept: 'Quality', permissions: staffPermissions },
      { id: 'USR-ACCOUNTS', username: 'accounts', pass: 'Accounts@123', empId: 'EMP-109', role: 'Accounts', dept: 'Accounts', permissions: staffPermissions }
    ];

    workstationUsers.forEach(u => {
      const existing = database.prepare("SELECT id FROM users WHERE (employee_id IS NOT NULL AND employee_id = ?) OR username = ?").get(u.empId, u.username);
      const { hash, salt } = hashPassword(u.pass);
      if (!existing) {
        database.prepare(`
          INSERT INTO users (id, employee_id, username, email, password_hash, salt, role, department, permissions, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        `).run(u.id, u.empId, u.username, `${u.username}@screenarts.in`, hash, salt, u.role, u.dept, u.permissions);
      } else {
        database.prepare(`
          UPDATE users SET username = ?, password_hash = ?, salt = ?, role = ?, department = ?, permissions = ? WHERE id = ?
        `).run(u.username, hash, salt, u.role, u.dept, u.permissions, existing.id);
      }
    });

    // Update admin user with full permissions
    database.prepare("UPDATE users SET permissions = ? WHERE username = 'admin'").run(adminPermissions);

    console.log(' -> Migration 007 applied: Extended production_tasks schema, allowed processes, and workstation accounts.');
  });

  // ----------------------------------------------------
  // MIGRATION 008: Tax Breakdown, Concurrency, and Data Integrity Backfill
  // ----------------------------------------------------
  applyMigration('008_tax_breakdown_and_concurrency', (database) => {
    // 1. Add GST breakdown and concurrency versioning columns to sales_orders
    const orderCols = [
      'cgst REAL DEFAULT 0',
      'sgst REAL DEFAULT 0',
      'igst REAL DEFAULT 0',
      'round_off REAL DEFAULT 0',
      'tax_mode TEXT DEFAULT \'EXCLUSIVE\'',
      'version INTEGER DEFAULT 1'
    ];
    orderCols.forEach(col => {
      try { database.prepare(`ALTER TABLE sales_orders ADD COLUMN ${col}`).run(); } catch(e) {}
    });

    // 2. Add concurrency versioning to mutable entities
    try { database.prepare('ALTER TABLE customers ADD COLUMN version INTEGER DEFAULT 1').run(); } catch(e) {}
    try { database.prepare('ALTER TABLE production_tasks ADD COLUMN version INTEGER DEFAULT 1').run(); } catch(e) {}
    try { database.prepare('ALTER TABLE inventory ADD COLUMN version INTEGER DEFAULT 1').run(); } catch(e) {}

    // 3. Backfill accurate GST breakdown for existing orders & quotations
    const taxUpdates = [
      { id: 'SO-2026-0891', cgst: 3448.8, sgst: 3448.8, igst: 0, tax_total: 6897.6, round_off: 0.4, tax_mode: 'EXCLUSIVE' },
      { id: 'SO-2026-0892', cgst: 630.0, sgst: 630.0, igst: 0, tax_total: 1260.0, round_off: 0.0, tax_mode: 'EXCLUSIVE' },
      { id: 'SO-2026-0893', cgst: 0.0, sgst: 0.0, igst: 2340.0, tax_total: 2340.0, round_off: 0.0, tax_mode: 'EXCLUSIVE' },
      { id: 'SO-2026-0885', cgst: 5186.44, sgst: 5186.44, igst: 0, tax_total: 10372.88, round_off: 0.0, tax_mode: 'INCLUSIVE' },
      { id: 'SO-2026-0870', cgst: 3888.0, sgst: 3888.0, igst: 0, tax_total: 7776.0, round_off: 0.0, tax_mode: 'EXCLUSIVE' },
      { id: 'SO-2026-0850', cgst: 0.0, sgst: 0.0, igst: 0, tax_total: 0.0, round_off: 0.0, tax_mode: 'EXEMPT' },
      { id: 'SO-2026-0904', cgst: 90.0, sgst: 90.0, igst: 0, tax_total: 180.0, round_off: 0.0, tax_mode: 'EXCLUSIVE' },
      { id: 'QT-2026-0101', cgst: 3888.0, sgst: 3888.0, igst: 0, tax_total: 7776.0, round_off: 0.0, tax_mode: 'EXCLUSIVE' },
      { id: 'QT-2026-0102', cgst: 2835.0, sgst: 2835.0, igst: 0, tax_total: 5670.0, round_off: 0.0, tax_mode: 'EXCLUSIVE' },
      { id: 'SO-TEST-001', cgst: 0.0, sgst: 0.0, igst: 0, tax_total: 0.0, round_off: 0.0, tax_mode: 'EXEMPT' },
      { id: 'SO-1786597879733', cgst: 0.0, sgst: 0.0, igst: 0, tax_total: 0.0, round_off: 0.0, tax_mode: 'EXEMPT' }
    ];

    const updateTaxStmt = database.prepare(`
      UPDATE sales_orders
      SET cgst = ?, sgst = ?, igst = ?, tax_total = ?, round_off = ?, tax_mode = ?
      WHERE id = ? OR order_number = ?
    `);

    taxUpdates.forEach(u => {
      updateTaxStmt.run(u.cgst, u.sgst, u.igst, u.tax_total, u.round_off, u.tax_mode, u.id, u.id);
    });

    // 4. Backfill completed_at for historical completed tasks
    const taskCompletions = [
      { id: 'TSK-1001', completed_at: '2026-09-12T10:30:00.000Z' },
      { id: 'TSK-1002', completed_at: '2026-09-12T12:00:00.000Z' },
      { id: 'TSK-1003', completed_at: '2026-09-12T14:00:00.000Z' },
      { id: 'TSK-1004', completed_at: '2026-09-12T16:30:00.000Z' },
      { id: 'TSK-1005', completed_at: '2026-09-12T10:00:00.000Z' },
      { id: 'TSK-1006', completed_at: '2026-09-12T11:30:00.000Z' },
      { id: 'TSK-1007', completed_at: '2026-09-12T12:45:00.000Z' }
    ];
    const updateTaskStmt = database.prepare("UPDATE production_tasks SET completed_at = ? WHERE id = ? AND (completed_at IS NULL OR completed_at = '')");
    taskCompletions.forEach(tc => {
      updateTaskStmt.run(tc.completed_at, tc.id);
    });

    // 5. Auto-provision and link customer for Sunil Graphics test orders
    const sunilCust = database.prepare("SELECT id FROM customers WHERE name LIKE '%Sunil Graphics%'").get();
    let sunilCustId = sunilCust ? sunilCust.id : 'CUST-110';
    if (!sunilCust) {
      database.prepare(`
        INSERT INTO customers (id, customer_code, name, mobile, customer_type, notes, outstanding)
        VALUES ('CUST-110', 'CUST-110', 'Sunil Graphics', '9890011223', 'Retail', 'Commercial graphics studio walk-in client', 10000)
      `).run();
    }
    database.prepare("UPDATE sales_orders SET customer_id = ? WHERE (customer_id IS NULL OR customer_id = '' OR customer_id = 'null') AND customer_name LIKE '%Sunil Graphics%'").run(sunilCustId);

    // Ensure payment for SO-TEST-001 is recognized
    const existingPmt = database.prepare("SELECT id FROM payments WHERE order_id = 'SO-TEST-001'").get();
    if (!existingPmt) {
      database.prepare(`
        INSERT OR IGNORE INTO payments (id, order_id, customer_id, customer_name, amount, method, ref_no, status, paid_date, notes)
        VALUES ('PAY-SO-TEST-001-ADV', 'SO-TEST-001', 'CUST-110', 'Sunil Graphics', 2500, 'UPI', 'UPI/TEST-001-ADV', 'Completed', '2026-08-13 05:11:00', 'Advance payment for test order')
      `).run();
    }

    console.log(' -> Migration 008 applied: GST tax breakdown backfilled, task completion timestamps restored, and Sunil Graphics linked.');
  });

  // ----------------------------------------------------
  // MIGRATION 009: Artwork Versions, Partial Deliveries & Material BOMs
  // ----------------------------------------------------
  applyMigration('009_artwork_and_delivery_control', (database) => {
    // 1. Artwork Versions Ledger
    database.exec(`
      CREATE TABLE IF NOT EXISTS artwork_versions (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        version_number INTEGER NOT NULL DEFAULT 1,
        file_name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        thumbnail_url TEXT,
        dimensions TEXT,
        color_mode TEXT DEFAULT 'CMYK',
        dpi INTEGER DEFAULT 300,
        proof_status TEXT DEFAULT 'Pending',
        uploaded_by TEXT,
        uploaded_by_user_id TEXT,
        uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
        approved_by TEXT,
        approved_by_user_id TEXT,
        approved_at TEXT,
        approval_notes TEXT,
        rejection_reason TEXT,
        production_ready INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_art_order ON artwork_versions(order_id);
      CREATE INDEX IF NOT EXISTS idx_art_item ON artwork_versions(item_id);
    `);

    // 2. Delivery Notes and Delivery Items
    database.exec(`
      CREATE TABLE IF NOT EXISTS delivery_notes (
        id TEXT PRIMARY KEY,
        delivery_number TEXT UNIQUE NOT NULL,
        order_id TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT NOT NULL,
        delivery_date TEXT NOT NULL,
        delivery_type TEXT DEFAULT 'Partial',
        vehicle_no TEXT,
        delivery_staff TEXT,
        delivery_staff_id TEXT,
        recipient_name TEXT,
        recipient_phone TEXT,
        notes TEXT,
        status TEXT DEFAULT 'Delivered',
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dn_order ON delivery_notes(order_id);

      CREATE TABLE IF NOT EXISTS delivery_items (
        id TEXT PRIMARY KEY,
        delivery_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        ordered_qty REAL NOT NULL,
        dispatched_qty REAL NOT NULL,
        remaining_qty REAL NOT NULL,
        unit TEXT DEFAULT 'Nos',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (delivery_id) REFERENCES delivery_notes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_di_delivery ON delivery_items(delivery_id);
      CREATE INDEX IF NOT EXISTS idx_di_item ON delivery_items(item_id);
    `);

    // 3. Bill of Materials (BOM) Substrate Mappings
    database.exec(`
      CREATE TABLE IF NOT EXISTS material_boms (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        spec_id TEXT,
        inventory_material_id TEXT NOT NULL,
        consumption_ratio REAL DEFAULT 1.0,
        consumption_unit TEXT DEFAULT 'Sq.Ft',
        wastage_pct REAL DEFAULT 4.0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (inventory_material_id) REFERENCES inventory(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_bom_product ON material_boms(product_id);
    `);

    // Seed default BOM substrate relationships
    const bomMappings = [
      { id: 'BOM-01', prodId: 'PROD-01', invId: 'INV-01', unit: 'Rolls', ratio: 0.001, wastage: 4.0 }, // Star Flex Banner -> INV-01
      { id: 'BOM-02', prodId: 'PROD-02', invId: 'INV-02', unit: 'Rolls', ratio: 0.0015, wastage: 5.0 }, // Vinyl -> INV-02
      { id: 'BOM-03', prodId: 'PROD-03', invId: 'INV-03', unit: 'Sheets', ratio: 0.03125, wastage: 8.0 }, // Acrylic 3D -> INV-03 (32 sq.ft/sheet)
      { id: 'BOM-04', prodId: 'PROD-04', invId: 'INV-06', unit: 'Pcs', ratio: 1.0, wastage: 0.0 } // Rollup Standee -> INV-06
    ];

    const insertBom = database.prepare(`
      INSERT OR IGNORE INTO material_boms (id, product_id, inventory_material_id, consumption_ratio, consumption_unit, wastage_pct)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    bomMappings.forEach(b => {
      insertBom.run(b.id, b.prodId, b.invId, b.ratio, b.unit, b.wastage);
    });

    console.log(' -> Migration 009 applied: Artwork versions, delivery notes, and material BOMs created.');
  });

  // ----------------------------------------------------
  // MIGRATION 010: Master ERP Transformation (Sequences, Double-Entry Accounting, Machines Master)
  // ----------------------------------------------------
  applyMigration('010_master_erp_transformation', (database) => {
    // 1. Collision-Safe Document Sequences
    database.exec(`
      CREATE TABLE IF NOT EXISTS document_sequences (
        doc_type TEXT PRIMARY KEY,
        prefix TEXT NOT NULL,
        current_number INTEGER NOT NULL DEFAULT 0,
        padding INTEGER NOT NULL DEFAULT 4,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const defaultSequences = [
      { doc_type: 'SO',  prefix: 'SO-2026-',  current_number: 905, padding: 4 },
      { doc_type: 'INV', prefix: 'INV-2026-', current_number: 105, padding: 4 },
      { doc_type: 'QT',  prefix: 'QT-2026-',  current_number: 103, padding: 4 },
      { doc_type: 'PAY', prefix: 'PAY-2026-', current_number: 910, padding: 4 },
      { doc_type: 'JV',  prefix: 'JV-2026-',  current_number: 10,  padding: 4 },
      { doc_type: 'PO',  prefix: 'PO-2026-',  current_number: 15,  padding: 4 },
      { doc_type: 'DN',  prefix: 'DN-2026-',  current_number: 10,  padding: 4 }
    ];

    const insertSeq = database.prepare(`
      INSERT OR IGNORE INTO document_sequences (doc_type, prefix, current_number, padding)
      VALUES (?, ?, ?, ?)
    `);
    defaultSequences.forEach(s => insertSeq.run(s.doc_type, s.prefix, s.current_number, s.padding));

    // 2. Authoritative Double-Entry Accounting Tables
    database.exec(`
      CREATE TABLE IF NOT EXISTS journal_vouchers (
        id TEXT PRIMARY KEY,
        voucher_number TEXT UNIQUE NOT NULL,
        voucher_type TEXT NOT NULL,
        voucher_date TEXT NOT NULL,
        ref_no TEXT,
        reference_type TEXT,
        reference_id TEXT,
        narration TEXT,
        status TEXT DEFAULT 'Posted',
        created_by_user_id TEXT,
        created_by_name TEXT,
        posted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_jv_date ON journal_vouchers(voucher_date DESC);
      CREATE INDEX IF NOT EXISTS idx_jv_ref ON journal_vouchers(reference_id);
      CREATE INDEX IF NOT EXISTS idx_jv_num ON journal_vouchers(voucher_number);

      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        voucher_id TEXT NOT NULL,
        account_name TEXT NOT NULL,
        account_group TEXT NOT NULL,
        entry_type TEXT NOT NULL CHECK(entry_type IN ('DEBIT', 'CREDIT')),
        amount REAL NOT NULL,
        customer_id TEXT,
        supplier_id TEXT,
        order_id TEXT,
        notes TEXT,
        FOREIGN KEY (voucher_id) REFERENCES journal_vouchers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_je_voucher ON journal_entries(voucher_id);
      CREATE INDEX IF NOT EXISTS idx_je_account ON journal_entries(account_name);
    `);

    // 3. Database-Driven Machines Master
    database.exec(`
      CREATE TABLE IF NOT EXISTS machines (
        id TEXT PRIMARY KEY,
        code TEXT UNIQUE,
        name TEXT NOT NULL,
        model TEXT,
        process_category TEXT,
        hourly_rate REAL DEFAULT 0,
        status TEXT DEFAULT 'Active',
        runtime_hours REAL DEFAULT 0,
        last_maintenance_date TEXT,
        assigned_operator_id TEXT,
        assigned_operator_name TEXT,
        location TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_machines_code ON machines(code);
    `);

    // Machines master initialized empty for clean production start

    // 4. Extend Sales Orders with Quotation and Concurrency tracking
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN order_type TEXT DEFAULT 'Direct'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN quotation_status TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN converted_from_quotation_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN converted_order_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN converted_at TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN converted_by TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN credit_limit_override INTEGER DEFAULT 0").run(); } catch(e) {}

    // 5. Extend Customers with Credit Limit & Opening Balance
    try { database.prepare("ALTER TABLE customers ADD COLUMN credit_limit REAL DEFAULT 10000").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN referral_commission_pct REAL DEFAULT 0.2").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN city TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN pincode TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN district TEXT DEFAULT 'Kozhikode'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN state TEXT DEFAULT 'Kerala'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN opening_balance REAL DEFAULT 0").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN opening_balance_type TEXT DEFAULT 'Receivable'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN opening_balance_date TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN opening_balance_notes TEXT").run(); } catch(e) {}

    // Ensure UNASSIGNED pool employee exists for available tasks
    database.prepare(`
      INSERT OR IGNORE INTO employees (id, code, name, role, department, status)
      VALUES ('UNASSIGNED', 'EMP-POOL', 'Available Work Pool', 'Production', 'Production', 'Active')
    `).run();

    // 6. Update order_type on existing quotation rows
    database.prepare("UPDATE sales_orders SET order_type = 'Quotation', quotation_status = 'Draft' WHERE id LIKE 'QT-%' OR order_number LIKE 'QT-%'").run();
    database.prepare("UPDATE sales_orders SET order_type = 'Direct' WHERE order_type IS NULL OR order_type = ''").run();

    // 7. Seed Initial Double-Entry Journal Entries for Existing Orders
    const existingOrders = database.prepare("SELECT * FROM sales_orders WHERE order_type != 'Quotation'").all();
    const insertJv = database.prepare(`
      INSERT OR IGNORE INTO journal_vouchers (
        id, voucher_number, voucher_type, voucher_date, ref_no, reference_type, reference_id, narration, created_by_name
      ) VALUES (?, ?, 'Sales Invoice', ?, ?, 'SALES_ORDER', ?, ?, ?)
    `);
    const insertJe = database.prepare(`
      INSERT INTO journal_entries (id, voucher_id, account_name, account_group, entry_type, amount, customer_id, order_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const ord of existingOrders) {
      const jvId = `JV-SO-${ord.id}`;
      const jvNum = `JV-2026-${ord.id.replace(/[^0-9]/g, '').slice(-4) || '1001'}`;
      const customerName = ord.customer_name || 'Walk-in Customer';
      const grandTotal = Number(ord.grand_total || 0);
      const subtotal = Number(ord.subtotal || grandTotal);
      const taxTotal = Number(ord.tax_total || 0);
      const cgst = Number(ord.cgst || (taxTotal > 0 ? taxTotal / 2 : 0));
      const sgst = Number(ord.sgst || (taxTotal - cgst));
      const igst = Number(ord.igst || 0);
      const roundOff = Number(ord.round_off || 0);

      const res = insertJv.run(
        jvId, jvNum, ord.order_date || '2026-08-01', ord.order_number || ord.id, ord.id,
        `Tax invoice for sales order ${ord.order_number || ord.id} billed to ${customerName}`,
        ord.billed_by_staff || 'System'
      );

      if (res.changes > 0) {
        // Debit: Accounts Receivable (Customer)
        insertJe.run(`JE-${jvId}-1`, jvId, `Accounts Receivable (${customerName})`, 'Assets', 'DEBIT', grandTotal, ord.customer_id, ord.id);
        // Credit: Sales Revenue
        insertJe.run(`JE-${jvId}-2`, jvId, 'Sales Revenue Account', 'Revenue', 'CREDIT', subtotal, ord.customer_id, ord.id);
        // Credit: Tax Output
        if (igst > 0) {
          insertJe.run(`JE-${jvId}-3`, jvId, 'Output IGST (18%)', 'Liabilities', 'CREDIT', igst, ord.customer_id, ord.id);
        } else if (taxTotal > 0) {
          insertJe.run(`JE-${jvId}-3`, jvId, 'Output CGST (9%)', 'Liabilities', 'CREDIT', cgst, ord.customer_id, ord.id);
          insertJe.run(`JE-${jvId}-4`, jvId, 'Output SGST (9%)', 'Liabilities', 'CREDIT', sgst, ord.customer_id, ord.id);
        }
        if (roundOff !== 0) {
          insertJe.run(`JE-${jvId}-5`, jvId, 'Round-Off Account', 'Expenses', roundOff < 0 ? 'DEBIT' : 'CREDIT', Math.abs(roundOff), ord.customer_id, ord.id);
        }
      }
    }

    // 8. Seed Initial Journal Entries for Existing Payments
    const existingPayments = database.prepare("SELECT * FROM payments").all();
    const insertPayJv = database.prepare(`
      INSERT OR IGNORE INTO journal_vouchers (
        id, voucher_number, voucher_type, voucher_date, ref_no, reference_type, reference_id, narration, created_by_name
      ) VALUES (?, ?, 'Payment Receipt', ?, ?, 'PAYMENT', ?, ?, 'Accounts')
    `);

    for (const pmt of existingPayments) {
      const jvId = `JV-PAY-${pmt.id}`;
      const jvNum = `JV-PAY-${pmt.id.replace(/[^0-9]/g, '').slice(-4) || '2001'}`;
      const customerName = pmt.customer_name || 'Customer';
      const amount = Number(pmt.amount || 0);
      if (amount <= 0) continue;

      const pmtMethod = (pmt.method || 'Cash').toLowerCase();
      const debitAccount = pmtMethod.includes('bank') || pmtMethod.includes('upi') || pmtMethod.includes('cheque')
        ? 'HDFC Bank Account'
        : 'Cash Account';

      const res = insertPayJv.run(
        jvId, jvNum, pmt.paid_date ? pmt.paid_date.split('T')[0] : '2026-08-01',
        pmt.ref_no || pmt.id, pmt.id,
        `Payment receipt of Rs.${amount} received via ${pmt.method || 'Cash'} from ${customerName}`,
      );

      if (res.changes > 0) {
        // Debit: Cash/Bank
        insertJe.run(`JE-${jvId}-1`, jvId, debitAccount, 'Assets', 'DEBIT', amount, pmt.customer_id, pmt.order_id);
        // Credit: Accounts Receivable
        insertJe.run(`JE-${jvId}-2`, jvId, `Accounts Receivable (${customerName})`, 'Assets', 'CREDIT', amount, pmt.customer_id, pmt.order_id);
      }
    }

    console.log(' -> Migration 010 applied: Document sequences, double-entry accounting ledger, and machines master created.');
  });

  // ----------------------------------------------------
  // MIGRATION 011: Employee User Control & Permission Management
  // ----------------------------------------------------
  applyMigration('011_employee_user_control_and_permissions', (database) => {
    // 1. Extend users table
    const userColumns = [
      'login_count INTEGER DEFAULT 0',
      'last_active TEXT',
      'created_by_user_id TEXT',
      'created_by_name TEXT'
    ];
    userColumns.forEach(col => {
      try { database.prepare(`ALTER TABLE users ADD COLUMN ${col}`).run(); } catch(e) {}
    });

    // 2. Roles Table
    database.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        department TEXT NOT NULL,
        description TEXT,
        is_system INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        module TEXT NOT NULL,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_dangerous INTEGER DEFAULT 0,
        display_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS role_permissions (
        id TEXT PRIMARY KEY,
        role_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS employee_permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        permission_id TEXT NOT NULL,
        is_granted INTEGER NOT NULL DEFAULT 1,
        granted_by_user_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, permission_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS employee_process_permissions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        process_name TEXT NOT NULL,
        is_allowed INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, process_name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_role_perms_rid ON role_permissions(role_id);
      CREATE INDEX IF NOT EXISTS idx_emp_perms_uid ON employee_permissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_emp_process_uid ON employee_process_permissions(user_id);
    `);

    // 3. Seed Master Permissions
    const masterPermissions = [
      // MODULE ACCESS PERMISSIONS
      { id: 'module.dashboard', module: 'dashboard', category: 'MODULE', name: 'Dashboard Access', description: 'Access top-level KPI overview & metrics', is_dangerous: 0, display_order: 1 },
      { id: 'module.sales_orders', module: 'sales', category: 'MODULE', name: 'Sales Orders Module', description: 'Access sales orders listing and tracking', is_dangerous: 0, display_order: 2 },
      { id: 'module.quotations', module: 'sales', category: 'MODULE', name: 'Quotations Module', description: 'Access cost estimation & quotes', is_dangerous: 0, display_order: 3 },
      { id: 'module.customers', module: 'crm', category: 'MODULE', name: 'Customer Directory', description: 'Access customer records & accounts', is_dangerous: 0, display_order: 4 },
      { id: 'module.production', module: 'production', category: 'MODULE', name: 'Production Floor Module', description: 'Access production board & task dispatcher', is_dangerous: 0, display_order: 5 },
      { id: 'module.printing', module: 'production', category: 'MODULE', name: 'Printing Station', description: 'Access printing floor queue & jobs', is_dangerous: 0, display_order: 6 },
      { id: 'module.finishing', module: 'production', category: 'MODULE', name: 'Finishing & Assembly', description: 'Access fabrication & finishing queue', is_dangerous: 0, display_order: 7 },
      { id: 'module.inventory', module: 'inventory', category: 'MODULE', name: 'Inventory & Media', description: 'Access raw material stock & rolls register', is_dangerous: 0, display_order: 8 },
      { id: 'module.purchases', module: 'inventory', category: 'MODULE', name: 'Purchase Orders', description: 'Access purchase order register & receipt', is_dangerous: 0, display_order: 9 },
      { id: 'module.accounting', module: 'finance', category: 'MODULE', name: 'Accounting & Ledgers', description: 'Access double-entry journals & financial books', is_dangerous: 0, display_order: 10 },
      { id: 'module.payments', module: 'finance', category: 'MODULE', name: 'Payments & Receipts', description: 'Access cashier payment recording', is_dangerous: 0, display_order: 11 },
      { id: 'module.hr', module: 'hr', category: 'MODULE', name: 'HR & Biometrics', description: 'Access employee attendance & directory', is_dangerous: 0, display_order: 12 },
      { id: 'module.payroll', module: 'hr', category: 'MODULE', name: 'Payroll & Salaries', description: 'Access staff salary slips & disbursements', is_dangerous: 1, display_order: 13 },
      { id: 'module.reports', module: 'reports', category: 'MODULE', name: 'Executive Reports', description: 'Access operational reports & analytics', is_dangerous: 0, display_order: 14 },
      { id: 'module.admin', module: 'admin', category: 'MODULE', name: 'Admin Console', description: 'Access company profile, settings & controls', is_dangerous: 1, display_order: 15 },

      // PRODUCTION ACTION PERMISSIONS
      { id: 'production.view_own', module: 'production', category: 'ACTION', name: 'View My Assigned Work', description: 'View tasks assigned specifically to current worker', is_dangerous: 0, display_order: 20 },
      { id: 'production.view_available', module: 'production', category: 'ACTION', name: 'View Available Tasks', description: 'View unassigned work matching permitted processes', is_dangerous: 0, display_order: 21 },
      { id: 'production.take_work', module: 'production', category: 'ACTION', name: 'Take Work (Claim Task)', description: 'Claim unassigned task into My Assigned Work', is_dangerous: 0, display_order: 22 },
      { id: 'production.start', module: 'production', category: 'ACTION', name: 'Start Task', description: 'Record start timestamp on machine workstation', is_dangerous: 0, display_order: 23 },
      { id: 'production.pause', module: 'production', category: 'ACTION', name: 'Pause Task', description: 'Pause execution with pause reason', is_dangerous: 0, display_order: 24 },
      { id: 'production.resume', module: 'production', category: 'ACTION', name: 'Resume Task', description: 'Resume execution of paused job', is_dangerous: 0, display_order: 25 },
      { id: 'production.complete', module: 'production', category: 'ACTION', name: 'Complete Task', description: 'Mark stage complete & trigger material consumption', is_dangerous: 0, display_order: 26 },
      { id: 'production.submit_rework', module: 'production', category: 'ACTION', name: 'Submit Rework Ticket', description: 'Log rejection or rework issue with reason', is_dangerous: 0, display_order: 27 },

      // PRODUCTION MANAGEMENT PERMISSIONS
      { id: 'production.view_all', module: 'production', category: 'ACTION', name: 'View All Floor Tasks', description: 'See all jobs across all departments and staff', is_dangerous: 0, display_order: 30 },
      { id: 'production.view_employee_workload', module: 'production', category: 'ACTION', name: 'View Workload Roster', description: 'Inspect active tasks and output per operator', is_dangerous: 0, display_order: 31 },
      { id: 'production.assign', module: 'production', category: 'ACTION', name: 'Assign Tasks', description: 'Manually dispatch task to a specific worker or machine', is_dangerous: 0, display_order: 32 },
      { id: 'production.reassign', module: 'production', category: 'ACTION', name: 'Reassign Tasks', description: 'Change assigned worker or release claimed job', is_dangerous: 0, display_order: 33 },
      { id: 'production.change_status', module: 'production', category: 'ACTION', name: 'Override Stage Status', description: 'Directly alter job card lifecycle status', is_dangerous: 0, display_order: 34 },
      { id: 'production.override_workflow', module: 'production', category: 'ACTION', name: 'Override Routing Workflow', description: 'Bypass standard sequential stage routing', is_dangerous: 1, display_order: 35 },

      // SALES ACTION PERMISSIONS
      { id: 'sales.view_orders', module: 'sales', category: 'ACTION', name: 'View Sales Orders', description: 'View customer sales orders list', is_dangerous: 0, display_order: 40 },
      { id: 'sales.create_order', module: 'sales', category: 'ACTION', name: 'Create Sales Order', description: 'Book new print orders with customer specifications', is_dangerous: 0, display_order: 41 },
      { id: 'sales.edit_order', module: 'sales', category: 'ACTION', name: 'Edit Sales Order', description: 'Update pending order items or specifications', is_dangerous: 0, display_order: 42 },
      { id: 'sales.cancel_order', module: 'sales', category: 'ACTION', name: 'Cancel Sales Order', description: 'Cancel an order before production starts', is_dangerous: 1, display_order: 43 },
      { id: 'sales.view_customers', module: 'crm', category: 'ACTION', name: 'View Customers', description: 'Browse customer directory and history', is_dangerous: 0, display_order: 44 },
      { id: 'sales.create_customer', module: 'crm', category: 'ACTION', name: 'Create Customer', description: 'Register new client with mobile and GSTIN', is_dangerous: 0, display_order: 45 },
      { id: 'sales.edit_customer', module: 'crm', category: 'ACTION', name: 'Edit Customer', description: 'Update customer contact or address details', is_dangerous: 0, display_order: 46 },
      { id: 'sales.create_quotation', module: 'sales', category: 'ACTION', name: 'Create Quotation', description: 'Generate quotation estimate for prospective client', is_dangerous: 0, display_order: 47 },
      { id: 'sales.convert_quotation', module: 'sales', category: 'ACTION', name: 'Convert Quotation to Order', description: 'Convert quotation into firm confirmed sales order', is_dangerous: 0, display_order: 48 },
      { id: 'sales.view_invoices', module: 'sales', category: 'ACTION', name: 'View Tax Invoices', description: 'View and print official GST sales invoices', is_dangerous: 0, display_order: 49 },

      // BILLING & CASHIER PERMISSIONS
      { id: 'billing.create_invoice', module: 'billing', category: 'ACTION', name: 'Generate Tax Invoice', description: 'Issue finalized GST invoice with number sequence', is_dangerous: 0, display_order: 50 },
      { id: 'billing.collect_payment', module: 'billing', category: 'ACTION', name: 'Collect & Record Payment', description: 'Record advance, cash, UPI or cheque receipt', is_dangerous: 0, display_order: 51 },
      { id: 'billing.view_payments', module: 'billing', category: 'ACTION', name: 'View Payment Receipts', description: 'View transaction receipts and bank vouchers', is_dangerous: 0, display_order: 52 },
      { id: 'billing.reverse_payment', module: 'billing', category: 'ACTION', name: 'Reverse / Refund Payment', description: 'Void receipt or refund client money', is_dangerous: 1, display_order: 53 },

      // ACCOUNTING PERMISSIONS
      { id: 'accounting.view_ledger', module: 'accounting', category: 'ACTION', name: 'View General Ledger', description: 'Browse chart of accounts and debit/credit ledger', is_dangerous: 0, display_order: 60 },
      { id: 'accounting.view_customer_ledger', module: 'accounting', category: 'ACTION', name: 'View Customer Statements', description: 'Party ledger statement for customers', is_dangerous: 0, display_order: 61 },
      { id: 'accounting.view_supplier_ledger', module: 'accounting', category: 'ACTION', name: 'View Supplier Statements', description: 'Party ledger statement for vendors', is_dangerous: 0, display_order: 62 },
      { id: 'accounting.view_receivables', module: 'accounting', category: 'ACTION', name: 'View Receivables & Payables', description: 'Track outstanding balances and aging analysis', is_dangerous: 0, display_order: 63 },
      { id: 'accounting.view_payables', module: 'accounting', category: 'ACTION', name: 'View Outsource Payables', description: 'Track vendor job work bills pending payment', is_dangerous: 0, display_order: 64 },
      { id: 'accounting.create_journal', module: 'accounting', category: 'ACTION', name: 'Post Journal Voucher', description: 'Create balanced double-entry vouchers', is_dangerous: 0, display_order: 65 },
      { id: 'accounting.edit_journal', module: 'accounting', category: 'ACTION', name: 'Edit Journal Voucher', description: 'Modify draft or posted journal voucher', is_dangerous: 1, display_order: 66 },
      { id: 'accounting.approve_journal', module: 'accounting', category: 'ACTION', name: 'Approve Journal Voucher', description: 'Authorize formal voucher posting to books', is_dangerous: 1, display_order: 67 },
      { id: 'accounting.view_pnl', module: 'accounting', category: 'ACTION', name: 'View Profit & Loss Statement', description: 'View revenue, COGS and net operating income', is_dangerous: 1, display_order: 68 },
      { id: 'accounting.view_balance_sheet', module: 'accounting', category: 'ACTION', name: 'View Balance Sheet', description: 'View company assets, liabilities & capital', is_dangerous: 0, display_order: 69 },
      { id: 'accounting.view_cash_flow', module: 'accounting', category: 'ACTION', name: 'View Cash & Bank Book', description: 'Track liquidity, cash in hand and bank accounts', is_dangerous: 0, display_order: 70 },
      { id: 'accounting.view_gst', module: 'accounting', category: 'ACTION', name: 'View GST e-Filing Reports', description: 'View GSTR-1, GSTR-3B tax schedules and summaries', is_dangerous: 0, display_order: 71 },

      // HR & ATTENDANCE PERMISSIONS
      { id: 'hr.view_employees', module: 'hr', category: 'ACTION', name: 'View Employees Directory', description: 'Browse company staff roster and contact info', is_dangerous: 0, display_order: 80 },
      { id: 'hr.create_employee', module: 'hr', category: 'ACTION', name: 'Create Employee', description: 'Add new staff record into HR database', is_dangerous: 0, display_order: 81 },
      { id: 'hr.edit_employee', module: 'hr', category: 'ACTION', name: 'Edit Employee', description: 'Update employee designation or mobile', is_dangerous: 0, display_order: 82 },
      { id: 'hr.view_attendance', module: 'hr', category: 'ACTION', name: 'View Attendance & Punches', description: 'Inspect daily shift logs and biometric records', is_dangerous: 0, display_order: 83 },
      { id: 'hr.edit_attendance', module: 'hr', category: 'ACTION', name: 'Manual Attendance Correction', description: 'Correct clock-in or add missing punch manually', is_dangerous: 1, display_order: 84 },
      { id: 'hr.view_salary', module: 'hr', category: 'ACTION', name: 'View Staff Salary Info', description: 'Access base salary, commission & incentives data', is_dangerous: 1, display_order: 85 },
      { id: 'hr.create_payroll', module: 'hr', category: 'ACTION', name: 'Generate Monthly Payroll', description: 'Calculate monthly wages, OT, and deductions', is_dangerous: 1, display_order: 86 },
      { id: 'hr.approve_payroll', module: 'hr', category: 'ACTION', name: 'Authorize Salary Payout', description: 'Approve payslips for disbursement', is_dangerous: 1, display_order: 87 },

      // INVENTORY & MATERIAL PERMISSIONS
      { id: 'inventory.view_stock', module: 'inventory', category: 'ACTION', name: 'View Stock Register', description: 'Check physical rolls, vinyl, flex and substrate stock', is_dangerous: 0, display_order: 90 },
      { id: 'inventory.view_ledger', module: 'inventory', category: 'ACTION', name: 'View Inventory Movements', description: 'Audit inbound, consumption, and scrap ledger', is_dangerous: 0, display_order: 91 },
      { id: 'inventory.stock_adjustment', module: 'inventory', category: 'ACTION', name: 'Physical Stock Adjustment', description: 'Manual physical count adjustment override', is_dangerous: 1, display_order: 92 },
      { id: 'inventory.material_issue', module: 'inventory', category: 'ACTION', name: 'Issue Material to Floor', description: 'Issue substrate or inks to printing machines', is_dangerous: 0, display_order: 93 },
      { id: 'inventory.material_return', module: 'inventory', category: 'ACTION', name: 'Return Material to Stock', description: 'Return unused partial roll or substrate to stock', is_dangerous: 0, display_order: 94 },
      { id: 'inventory.view_purchases', module: 'inventory', category: 'ACTION', name: 'View Purchase Orders', description: 'Track raw material supplier orders', is_dangerous: 0, display_order: 95 },
      { id: 'inventory.create_purchase', module: 'inventory', category: 'ACTION', name: 'Create Purchase Order', description: 'Order raw media rolls from suppliers', is_dangerous: 0, display_order: 96 },
      { id: 'inventory.approve_purchase', module: 'inventory', category: 'ACTION', name: 'Approve Purchase Order', description: 'Authorize supplier procurement spend', is_dangerous: 1, display_order: 97 },
      { id: 'inventory.stock_valuation', module: 'inventory', category: 'ACTION', name: 'View Stock Valuation', description: 'View total inventory asset value at cost price', is_dangerous: 1, display_order: 98 },

      // SENSITIVE ADMIN PERMISSIONS
      { id: 'sensitive.invoice_cancel', module: 'admin', category: 'SENSITIVE', name: 'Invoice Cancellation', description: 'Void or cancel an issued GST tax invoice', is_dangerous: 1, display_order: 110 },
      { id: 'sensitive.payment_reversal', module: 'admin', category: 'SENSITIVE', name: 'Payment Reversal', description: 'Reverse cash/bank payment voucher', is_dangerous: 1, display_order: 111 },
      { id: 'sensitive.stock_adjustment', module: 'admin', category: 'SENSITIVE', name: 'Inventory Force Adjustment', description: 'Override physical stock without PO', is_dangerous: 1, display_order: 112 },
      { id: 'sensitive.journal_edit', module: 'admin', category: 'SENSITIVE', name: 'Journal Audit Override', description: 'Alter posted double-entry journal records', is_dangerous: 1, display_order: 113 },
      { id: 'sensitive.payroll_approve', module: 'admin', category: 'SENSITIVE', name: 'Payroll Final Approval', description: 'Authorize company salary disbursements', is_dangerous: 1, display_order: 114 },
      { id: 'sensitive.user_management', module: 'admin', category: 'SENSITIVE', name: 'Employee User Control', description: 'Create user logins and edit permissions', is_dangerous: 1, display_order: 115 },
      { id: 'sensitive.role_management', module: 'admin', category: 'SENSITIVE', name: 'Role Template Management', description: 'Define and edit system role permission matrices', is_dangerous: 1, display_order: 116 },
      { id: 'sensitive.gst_settings', module: 'admin', category: 'SENSITIVE', name: 'GST & Legal Settings', description: 'Configure company legal name, GSTIN & state', is_dangerous: 1, display_order: 117 },
      { id: 'sensitive.bank_settings', module: 'admin', category: 'SENSITIVE', name: 'Bank Accounts & UPI Settings', description: 'Add or modify company bank accounts & QR UPI', is_dangerous: 1, display_order: 118 }
    ];

    const insertPerm = database.prepare(`
      INSERT OR REPLACE INTO permissions (id, module, category, name, description, is_dangerous, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    masterPermissions.forEach(p => insertPerm.run(p.id, p.module, p.category, p.name, p.description, p.is_dangerous, p.display_order));

    // 4. Seed Standard Role Templates
    const roleTemplates = [
      { id: 'ROLE-ADMIN', name: 'Admin', department: 'Management', description: 'Full administrative control over all ERP modules, data and security', is_system: 1 },
      { id: 'ROLE-MGT', name: 'Management', department: 'Management', description: 'Executive oversight, job approvals, workload roster and P&L analysis', is_system: 1 },
      { id: 'ROLE-SALES', name: 'Sales Executive', department: 'Sales', description: 'Customer quotes, order booking, order status and client directory', is_system: 1 },
      { id: 'ROLE-BILLING', name: 'Billing Staff', department: 'Sales', description: 'Sales invoicing, payment receipts collection and tax invoice management', is_system: 1 },
      { id: 'ROLE-DESIGNER', name: 'Designer', department: 'Design', description: 'Design workstation queue, customer proofing and artwork approvals', is_system: 1 },
      { id: 'ROLE-OPERATOR', name: 'Printing Operator', department: 'Printing', description: 'Large format digital, offset, flex and screen printing floor tasks', is_system: 1 },
      { id: 'ROLE-FINISHER', name: 'Finishing Staff', department: 'Finishing', description: 'Post-print binding, lamination, scoring, fabrication and mounting', is_system: 1 },
      { id: 'ROLE-QC', name: 'QC Staff', department: 'Quality', description: 'Quality inspection, dispatch sign-off and rework ticket logging', is_system: 1 },
      { id: 'ROLE-ACCOUNTANT', name: 'Accountant', department: 'Accounts', description: 'Double-entry day book, cash register, GST filing and reconciliation', is_system: 1 },
      { id: 'ROLE-HR', name: 'HR Staff', department: 'HR', description: 'Staff directory, daily attendance, biometric logs and leave approvals', is_system: 1 },
      { id: 'ROLE-DELIVERY', name: 'Delivery Staff', department: 'Delivery', description: 'Order dispatch, delivery challans, customer signature and COD receipt', is_system: 1 }
    ];

    const insertRole = database.prepare(`
      INSERT OR REPLACE INTO roles (id, name, department, description, is_system)
      VALUES (?, ?, ?, ?, ?)
    `);
    roleTemplates.forEach(r => insertRole.run(r.id, r.name, r.department, r.description, r.is_system));

    // 5. Seed Role Permissions Mapping
    const rolePermissionMappings = {
      'ROLE-ADMIN': masterPermissions.map(p => p.id), // All permissions
      'ROLE-MGT': [
        'module.dashboard', 'module.sales_orders', 'module.quotations', 'module.customers',
        'module.production', 'module.printing', 'module.finishing', 'module.inventory',
        'module.purchases', 'module.accounting', 'module.payments', 'module.hr', 'module.reports',
        'production.view_all', 'production.view_employee_workload', 'production.assign', 'production.reassign', 'production.change_status', 'production.override_workflow',
        'sales.view_orders', 'sales.create_order', 'sales.edit_order', 'sales.view_customers', 'sales.create_quotation', 'sales.convert_quotation', 'sales.view_invoices',
        'accounting.view_ledger', 'accounting.view_customer_ledger', 'accounting.view_supplier_ledger', 'accounting.view_receivables', 'accounting.view_payables', 'accounting.view_pnl', 'accounting.view_balance_sheet', 'accounting.view_cash_flow', 'accounting.view_gst',
        'hr.view_employees', 'hr.view_attendance',
        'inventory.view_stock', 'inventory.view_ledger', 'inventory.view_purchases',
        'billing.view_payments'
      ],
      'ROLE-SALES': [
        'module.dashboard', 'module.sales_orders', 'module.quotations', 'module.customers', 'module.payments',
        'sales.view_orders', 'sales.create_order', 'sales.edit_order', 'sales.view_customers', 'sales.create_customer', 'sales.edit_customer', 'sales.create_quotation', 'sales.convert_quotation', 'sales.view_invoices',
        'billing.collect_payment', 'billing.view_payments'
      ],
      'ROLE-BILLING': [
        'module.dashboard', 'module.sales_orders', 'module.customers', 'module.payments',
        'sales.view_orders', 'sales.view_customers', 'sales.view_invoices',
        'billing.create_invoice', 'billing.collect_payment', 'billing.view_payments'
      ],
      'ROLE-DESIGNER': [
        'module.dashboard', 'module.production',
        'production.view_own', 'production.view_available', 'production.take_work', 'production.start', 'production.pause', 'production.resume', 'production.complete', 'production.submit_rework'
      ],
      'ROLE-OPERATOR': [
        'module.dashboard', 'module.production', 'module.printing',
        'production.view_own', 'production.view_available', 'production.take_work', 'production.start', 'production.pause', 'production.resume', 'production.complete', 'production.submit_rework',
        'inventory.material_issue'
      ],
      'ROLE-FINISHER': [
        'module.dashboard', 'module.production', 'module.finishing',
        'production.view_own', 'production.view_available', 'production.take_work', 'production.start', 'production.pause', 'production.resume', 'production.complete', 'production.submit_rework'
      ],
      'ROLE-QC': [
        'module.dashboard', 'module.production',
        'production.view_all', 'production.complete', 'production.submit_rework'
      ],
      'ROLE-ACCOUNTANT': [
        'module.dashboard', 'module.sales_orders', 'module.customers', 'module.accounting', 'module.payments',
        'sales.view_orders', 'sales.view_customers', 'sales.view_invoices',
        'billing.create_invoice', 'billing.collect_payment', 'billing.view_payments',
        'accounting.view_ledger', 'accounting.view_customer_ledger', 'accounting.view_supplier_ledger', 'accounting.view_receivables', 'accounting.view_payables', 'accounting.create_journal', 'accounting.view_balance_sheet', 'accounting.view_cash_flow', 'accounting.view_gst'
      ],
      'ROLE-HR': [
        'module.dashboard', 'module.hr',
        'hr.view_employees', 'hr.create_employee', 'hr.edit_employee', 'hr.view_attendance', 'hr.edit_attendance'
      ],
      'ROLE-DELIVERY': [
        'module.dashboard', 'module.sales_orders',
        'sales.view_orders'
      ]
    };

    const insertRolePerm = database.prepare(`
      INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
      VALUES (?, ?, ?)
    `);

    Object.entries(rolePermissionMappings).forEach(([roleId, perms]) => {
      perms.forEach(permId => {
        insertRolePerm.run(`RP-${roleId}-${permId}`, roleId, permId);
      });
    });

    // 6. Migrate existing employees allowed_processes into employee_process_permissions
    const existingEmployees = database.prepare("SELECT id, allowed_processes FROM employees").all();
    const insertProcessPerm = database.prepare(`
      INSERT OR IGNORE INTO employee_process_permissions (id, user_id, employee_id, process_name, is_allowed)
      VALUES (?, ?, ?, ?, 1)
    `);

    existingEmployees.forEach(emp => {
      const user = database.prepare("SELECT id FROM users WHERE employee_id = ?").get(emp.id);
      const userId = user ? user.id : `USR-${emp.id}`;
      if (emp.allowed_processes) {
        try {
          const procs = JSON.parse(emp.allowed_processes);
          if (Array.isArray(procs)) {
            procs.forEach((pName, idx) => {
              insertProcessPerm.run(`EPP-${userId}-${idx}`, userId, emp.id, pName);
            });
          }
        } catch (e) {}
      }
    });

    console.log(' -> Migration 011 applied: Relational roles, permissions master, employee overrides, and process access created.');
  });

  // ----------------------------------------------------
  // MIGRATION 012: High-Performance Search & Financial Indexes
  // ----------------------------------------------------
  applyMigration('012_search_and_financial_indexes', (database) => {
    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(name, mobile, customer_code);
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
      CREATE INDEX IF NOT EXISTS idx_customers_gst ON customers(gst_number);
      CREATE INDEX IF NOT EXISTS idx_products_search ON products(name, product_code, category);
      CREATE INDEX IF NOT EXISTS idx_je_group_type ON journal_entries(account_group, entry_type);
      CREATE INDEX IF NOT EXISTS idx_je_acc_name ON journal_entries(account_name);
      CREATE INDEX IF NOT EXISTS idx_expenses_date_cat ON expenses(expense_date DESC, category);
      CREATE INDEX IF NOT EXISTS idx_orders_type_date ON sales_orders(order_type, order_date DESC);
    `);
    console.log(' -> Migration 012 applied: Composite search and double-entry financial indexes created.');
  });

  // ----------------------------------------------------
  // MIGRATION 013: Company Profile Bank Details & Default Terms
  // ----------------------------------------------------
  applyMigration('013_company_profile_defaults', (database) => {
    database.prepare(`
      UPDATE company_profile
      SET bank_name = COALESCE(bank_name, 'HDFC Bank Ltd'),
          account_no = COALESCE(account_no, '50200048192837'),
          ifsc = COALESCE(ifsc, 'HDFC0000123'),
          branch = COALESCE(branch, 'Goregaon East, Mumbai'),
          upi_id = COALESCE(upi_id, 'screenarts@hdfcbank'),
          terms_conditions = COALESCE(terms_conditions, '1. 50% advance along with confirmed PO.\n2. Balance on delivery/installation.\n3. GST applicable extra as per HSN.\n4. Artwork approval required before printing.')
      WHERE id = 1
    `).run();
    console.log(' -> Migration 013 applied: Company profile default bank details & terms ensured.');
  });

  // ----------------------------------------------------
  // MIGRATION 014: Customer Address and Financial Defaults
  // ----------------------------------------------------
  applyMigration('014_customer_address_and_financial_defaults', (database) => {
    try { database.prepare("ALTER TABLE customers ADD COLUMN credit_limit REAL DEFAULT 10000").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN referral_commission_pct REAL DEFAULT 0.2").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN city TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN pincode TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN district TEXT DEFAULT 'Kozhikode'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN state TEXT DEFAULT 'Kerala'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE customers ADD COLUMN customer_type TEXT DEFAULT 'Regular'").run(); } catch(e) {}

    try {
      database.prepare("UPDATE customers SET credit_limit = 10000 WHERE credit_limit IS NULL").run();
      database.prepare("UPDATE customers SET referral_commission_pct = 0.2 WHERE referral_commission_pct IS NULL").run();
      database.prepare("UPDATE customers SET customer_type = 'Regular' WHERE customer_type IS NULL OR customer_type = ''").run();
      database.prepare("UPDATE customers SET state = 'Kerala' WHERE state IS NULL OR state = ''").run();
      database.prepare("UPDATE customers SET district = 'Kozhikode' WHERE district IS NULL OR district = ''").run();
    } catch(e) {}
    console.log(' -> Migration 014 applied: Customer address and financial defaults ensured.');
  });

  // ----------------------------------------------------
  // MIGRATION 015: Outsource Bills and Bill-Based Payments
  // ----------------------------------------------------
  applyMigration('015_outsource_bills_and_payments', (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS outsource_bills (
        id TEXT PRIMARY KEY,
        bill_number TEXT NOT NULL,
        vendor_id TEXT NOT NULL,
        vendor_name TEXT NOT NULL,
        bill_date TEXT NOT NULL,
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        outstanding_amount REAL DEFAULT 0,
        status TEXT DEFAULT 'Unpaid',
        work_orders_json TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_outsource_bills_vendor ON outsource_bills(vendor_id);
      CREATE INDEX IF NOT EXISTS idx_outsource_bills_no ON outsource_bills(bill_number);

      CREATE TABLE IF NOT EXISTS outsource_payments (
        id TEXT PRIMARY KEY,
        bill_id TEXT NOT NULL,
        bill_number TEXT NOT NULL,
        vendor_id TEXT NOT NULL,
        vendor_name TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        ref_no TEXT,
        payment_date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bill_id) REFERENCES outsource_bills(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_outsource_payments_bill ON outsource_payments(bill_id);
      CREATE INDEX IF NOT EXISTS idx_outsource_payments_vendor ON outsource_payments(vendor_id);
    `);

    console.log(' -> Migration 015 applied: Outsource bills and bill-based single payment tracking schema ready.');

    console.log(' -> Migration 015 applied: Outsource bills, bill-based single payment tracking, and demo BILL-125 ready.');
  });

  // ----------------------------------------------------
  // MIGRATION 016: Work-Order Based Outsource Billing & B2B/B2C Auto-Classification
  // ----------------------------------------------------
  applyMigration('016_outsource_work_order_billing_and_b2b_invoicing', (database) => {
    // 1. Add bill tracking columns to outsource_jobs
    try { database.prepare("ALTER TABLE outsource_jobs ADD COLUMN bill_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE outsource_jobs ADD COLUMN bill_number TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE outsource_jobs ADD COLUMN billing_status TEXT DEFAULT 'Unbilled'").run(); } catch(e) {}

    // 2. Add invoice_type to sales_orders
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN invoice_type TEXT DEFAULT 'B2C'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN customer_gstin TEXT").run(); } catch(e) {}

    // 3. Ensure document_sequences has BILL sequence
    try {
      database.prepare(`
        INSERT OR IGNORE INTO document_sequences (id, doc_type, prefix, current_number, padding)
        VALUES ('SEQ-BILL', 'BILL', 'BILL-', 125, 5)
      `).run();
    } catch(e) {}

    // 4. Update sales_orders with customer GSTIN and auto-classification
    const orders = database.prepare("SELECT id, customer_id FROM sales_orders").all();
    for (const ord of orders) {
      if (ord.customer_id) {
        const cust = database.prepare("SELECT gst_number FROM customers WHERE id = ?").get(ord.customer_id);
        const gstin = (cust?.gst_number || '').trim();
        const isB2B = gstin.length >= 10 && !['URP', 'N/A', 'NONE', 'UNREGISTERED'].includes(gstin.toUpperCase());
        database.prepare("UPDATE sales_orders SET customer_gstin = ?, invoice_type = ? WHERE id = ?")
          .run(gstin || null, isB2B ? 'B2B' : 'B2C', ord.id);
      }
    }

    console.log(' -> Migration 016 applied: Work order billing status, bill sequences, and B2B/B2C auto-classification schema ready.');

    console.log(' -> Migration 016 applied: Work order billing status, bill sequences, and B2B/B2C auto-classification initialized.');
  });

  // ----------------------------------------------------
  // MIGRATION 017: Product Quantity-Based Rate Slabs (Tiered Rates)
  // ----------------------------------------------------
  applyMigration('017_product_pricing_slabs', (database) => {
    database.exec(`
      CREATE TABLE IF NOT EXISTS product_pricing_slabs (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        spec_id TEXT,
        min_qty REAL NOT NULL,
        max_qty REAL,
        rate REAL NOT NULL,
        cost_rate REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_product_slabs_pid ON product_pricing_slabs(product_id);
    `);
    try { database.prepare("ALTER TABLE product_pricing_slabs ADD COLUMN spec_id TEXT").run(); } catch(e) {}
    console.log(' -> Migration 017 applied: product_pricing_slabs table created.');
  });

  // ----------------------------------------------------
  // MIGRATION 018: Sales Order Revision & Audit Logs Demo Data + Product Outsource Vendor Assignment
  // ----------------------------------------------------
  applyMigration('018_order_audit_logs_and_outsource_vendor', (database) => {
    // 1. Extend products table with default_vendor_id and is_outsource
    try { database.prepare("ALTER TABLE products ADD COLUMN default_vendor_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE products ADD COLUMN is_outsource INTEGER DEFAULT 0").run(); } catch(e) {}

    // 2. Create order_audit_logs table
    database.exec(`
      CREATE TABLE IF NOT EXISTS order_audit_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        order_number TEXT NOT NULL,
        customer_name TEXT,
        customer_mobile TEXT,
        action_type TEXT NOT NULL,
        action_title TEXT NOT NULL,
        actor TEXT NOT NULL,
        role TEXT,
        timestamp TEXT NOT NULL,
        formatted_time TEXT,
        reason TEXT,
        previous_amount REAL,
        new_amount REAL,
        diff_amount REAL,
        refund_or_reversal REAL DEFAULT 0,
        changes_summary TEXT,
        previous_snapshot TEXT,
        new_snapshot TEXT,
        snapshot TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_order_audit_oid ON order_audit_logs(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_audit_type ON order_audit_logs(action_type);
      CREATE INDEX IF NOT EXISTS idx_order_audit_time ON order_audit_logs(timestamp DESC);
    `);

    // 3. Seed demo audit logs if empty
    const auditCount = database.prepare("SELECT COUNT(*) as count FROM order_audit_logs").get();
    if (!auditCount || auditCount.count === 0) {
      const insertAuditLog = database.prepare(`
        INSERT INTO order_audit_logs (
          id, order_id, order_number, customer_name, customer_mobile, action_type, action_title,
          actor, role, timestamp, formatted_time, reason, previous_amount, new_amount,
          diff_amount, refund_or_reversal, changes_summary, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const demoLogs = [
        {
          id: 'AUD-REV-001',
          orderId: 'SO-2026-0891',
          orderNumber: 'SO-2026-0891',
          customerName: 'Apex Retail Solutions Pvt Ltd',
          customerMobile: '9820011223',
          actionType: 'EDITED',
          actionTitle: 'Order Revised - Material Spec Upgraded & Quantity Increased',
          actor: 'Minhaj V (Admin)',
          role: 'Admin',
          timestamp: '2026-10-18T14:30:00.000Z',
          formattedTime: '18 Oct 2026, 02:30 PM',
          reason: 'Customer requested 340gsm Blackout Flex upgrade for highway hoarding and added 2 extra entrance banners',
          previousAmount: 40600,
          newAmount: 47908,
          diffAmount: 7308,
          refundOrReversal: 0,
          changesSummary: JSON.stringify([
            'Item #1: Quantity updated from 2 to 4 Nos',
            'Material changed: Star Flex 240gsm → 340gsm Blackout Flex',
            'Line item total revised: ₹1,200 → ₹2,400',
            'Order Grand Total increased from ₹40,600 to ₹47,908 (+₹7,308 with 18% GST)'
          ])
        },
        {
          id: 'AUD-REV-002',
          orderId: 'SO-2026-0888',
          orderNumber: 'SO-2026-0888',
          customerName: 'Kerala State Handloom Weavers Society',
          customerMobile: '9447012399',
          actionType: 'CANCELLED',
          actionTitle: 'Order Cancelled - Client Postponed Annual Expo',
          actor: 'Priya Patel',
          role: 'Sales',
          timestamp: '2026-10-17T16:15:00.000Z',
          formattedTime: '17 Oct 2026, 04:15 PM',
          reason: 'Annual state handloom exhibition postponed by authorities. Customer requested order cancellation and advance reversal.',
          previousAmount: 28450,
          newAmount: 0,
          diffAmount: -28450,
          refundOrReversal: 14000,
          changesSummary: JSON.stringify([
            'Order Status changed: Confirmed → Cancelled',
            'Production job cards (JC-888-1, JC-888-2, JC-888-3) recalled from shop floor',
            'Advance payment ₹14,000 tagged for credit refund to customer account ledger'
          ])
        },
        {
          id: 'AUD-REV-003',
          orderId: 'SO-2026-0885',
          orderNumber: 'SO-2026-0885',
          customerName: 'Maharashtra Tourism Dev Corp (MTDC)',
          customerMobile: '9422077112',
          actionType: 'EDITED',
          actionTitle: 'Order Revised - Dimension Modification by Installation Team',
          actor: 'Ramesh Sharma',
          role: 'Sales',
          timestamp: '2026-10-15T11:20:00.000Z',
          formattedTime: '15 Oct 2026, 11:20 AM',
          reason: 'Site measurements updated by field civil engineer. Hoarding width reduced from 20ft to 16ft across 4 structures.',
          previousAmount: 98500,
          newAmount: 88500,
          diffAmount: -10000,
          refundOrReversal: 0,
          changesSummary: JSON.stringify([
            'Item #1 Hoarding Print Size revised: 20ft x 10ft → 16ft x 10ft',
            'Total square footage reduced: 800 Sq.Ft → 640 Sq.Ft',
            'Contract subtotal revised from ₹98,500 to ₹88,500 (-₹10,000)'
          ])
        },
        {
          id: 'AUD-REV-004',
          orderId: 'SO-2026-0879-DRAFT',
          orderNumber: 'SO-2026-0879-DRAFT',
          customerName: 'Walk-in Counter Customer',
          customerMobile: '9895000000',
          actionType: 'DELETED',
          actionTitle: 'Draft Order Purged - Accidental Duplicate Entry',
          actor: 'Minhaj V (Admin)',
          role: 'Admin',
          timestamp: '2026-10-13T18:45:00.000Z',
          formattedTime: '13 Oct 2026, 06:45 PM',
          reason: 'Counter cashier accidentally created a duplicate test order while verifying digital brochure color swatch.',
          previousAmount: 3200,
          newAmount: 0,
          diffAmount: -3200,
          refundOrReversal: 0,
          changesSummary: JSON.stringify([
            'Duplicate draft order SO-2026-0879-DRAFT permanently removed from registry',
            'Unprinted digital job sheet discarded prior to RIP processing'
          ])
        },
        {
          id: 'AUD-REV-005',
          orderId: 'SO-2026-0894',
          orderNumber: 'SO-2026-0894',
          customerName: 'Zeta Fashion Pvt Ltd',
          customerMobile: '9811099887',
          actionType: 'CONVERTED',
          actionTitle: 'Quotation Converted to Confirmed Sales Order',
          actor: 'Priya Patel',
          role: 'Sales',
          timestamp: '2026-10-12T10:00:00.000Z',
          formattedTime: '12 Oct 2026, 10:00 AM',
          reason: 'Quotation QT-2026-014 approved by brand manager via WhatsApp. 50% booking advance received via NEFT.',
          previousAmount: 0,
          newAmount: 50976,
          diffAmount: 50976,
          refundOrReversal: 0,
          changesSummary: JSON.stringify([
            'Quotation QT-2026-014 converted to active Sales Order SO-2026-0894',
            'Received advance: ₹25,000 tagged to Order #SO-2026-0894',
            'Job cards automatically routed to Pre-Press & Large Format Printing queues'
          ])
        },
        {
          id: 'AUD-REV-006',
          orderId: 'SO-2026-0870',
          orderNumber: 'SO-2026-0870',
          customerName: 'Dr. Alok Mehta (Mehta Eye Clinic)',
          customerMobile: '9867088990',
          actionType: 'EDITED',
          actionTitle: 'Order Revised - Additional Trodat Self-Inking Stamp Added',
          actor: 'Minhaj V (Admin)',
          role: 'Admin',
          timestamp: '2026-10-10T15:10:00.000Z',
          formattedTime: '10 Oct 2026, 03:10 PM',
          reason: 'Doctor called to add an urgent Trodat Printy date & time stamp to prescription pad printing job.',
          previousAmount: 4500,
          newAmount: 5850,
          diffAmount: 1350,
          refundOrReversal: 0,
          changesSummary: JSON.stringify([
            'Item #2 added: Trodat 4810 Self-Inking Dater Stamp (1 Nos @ ₹1,350)',
            'Order total revised from ₹4,500 to ₹5,850 (+₹1,350)'
          ])
        }
      ];

      for (const log of demoLogs) {
        insertAuditLog.run(
          log.id, log.orderId, log.orderNumber, log.customerName, log.customerMobile,
          log.actionType, log.actionTitle, log.actor, log.role, log.timestamp,
          log.formattedTime, log.reason, log.previousAmount, log.newAmount, log.diffAmount,
          log.refundOrReversal, log.changesSummary, log.timestamp
        );
      }
      console.log(' -> Seeded 6 realistic demo order audit logs.');
    }

    // 4. Set demo outsource vendor on balloon / outsource products
    try {
      const vendor = database.prepare("SELECT id, name FROM suppliers LIMIT 1").get();
      if (vendor) {
        database.prepare(`
          UPDATE products
          SET default_vendor = ?, default_vendor_id = ?, is_outsource = 1
          WHERE id IN ('PROD-BAL-01', 'PROD-03') OR name LIKE '%Balloon%' OR name LIKE '%Embroidery%'
        `).run(vendor.name, vendor.id);
      }
    } catch(e) {}

    console.log(' -> Migration 018 applied: Order revision & cancellation logs demo data and product outsource vendor linking ready.');
  });

  // ----------------------------------------------------
  // MIGRATION 019: Specification Outsource Vendor Linking & Quantity Slabs
  // ----------------------------------------------------
  applyMigration('019_specification_outsource_and_slabs', (database) => {
    // 1. Extend product_specifications table with outsource columns
    try { database.prepare("ALTER TABLE product_specifications ADD COLUMN is_outsource INTEGER DEFAULT 0").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE product_specifications ADD COLUMN default_vendor_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE product_specifications ADD COLUMN default_vendor TEXT").run(); } catch(e) {}

    // 2. Link Outsource Vendors to specific specialized specifications
    try {
      const vendors = database.prepare("SELECT id, name FROM suppliers").all();
      const signageVendor = vendors.find(v => (v.name || '').toLowerCase().includes('screen') || (v.name || '').toLowerCase().includes('modern')) || vendors[0];
      const stampVendor = vendors.find(v => (v.name || '').toLowerCase().includes('stamp') || (v.name || '').toLowerCase().includes('laser')) || vendors[1] || vendors[0];

      if (signageVendor) {
        // Stainless steel 3D letters and acrylic letters outsource
        database.prepare(`
          UPDATE product_specifications
          SET is_outsource = 1, default_vendor_id = ?, default_vendor = ?
          WHERE id IN ('SPEC-105', 'SPEC-106') OR spec_name LIKE '%Stainless Steel%' OR spec_name LIKE '%Acrylic Face Lit%'
        `).run(signageVendor.id, signageVendor.name);
      }

      if (stampVendor) {
        // Rubber stamps / trodat dater outsource
        database.prepare(`
          UPDATE product_specifications
          SET is_outsource = 1, default_vendor_id = ?, default_vendor = ?
          WHERE id IN ('SPEC-109') OR spec_name LIKE '%Trodat%'
        `).run(stampVendor.id, stampVendor.name);
      }
      console.log(' -> Linked demo specifications with outsource fulfillment partners.');
    } catch (e) {
      console.warn('Migration 019 vendor link notice:', e.message);
    }

    // 3. Seed demo Quantity Slabs for Specifications
    try {
      const insertSlab = database.prepare(`
        INSERT OR REPLACE INTO product_pricing_slabs (id, product_id, spec_id, min_qty, max_qty, rate, cost_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Slabs for SPEC-101 (240gsm Star Frontlit Flex on PROD-01)
      insertSlab.run('SLAB-SPEC-101-1', 'PROD-01', 'SPEC-101', 1, 500, 15, 8);
      insertSlab.run('SLAB-SPEC-101-2', 'PROD-01', 'SPEC-101', 501, 2000, 12, 7);
      insertSlab.run('SLAB-SPEC-101-3', 'PROD-01', 'SPEC-101', 2001, null, 9.5, 6);

      // Slabs for SPEC-108 (350gsm Velvet Lamination + Raised Spot UV on PROD-05)
      insertSlab.run('SLAB-SPEC-108-1', 'PROD-05', 'SPEC-108', 1, 500, 850, 450);
      insertSlab.run('SLAB-SPEC-108-2', 'PROD-05', 'SPEC-108', 501, 1000, 720, 390);
      insertSlab.run('SLAB-SPEC-108-3', 'PROD-05', 'SPEC-108', 1001, null, 580, 320);

      // Slabs for SPEC-110 (5mm High Density Sunboard on PROD-08)
      insertSlab.run('SLAB-SPEC-110-1', 'PROD-08', 'SPEC-110', 1, 50, 75, 42);
      insertSlab.run('SLAB-SPEC-110-2', 'PROD-08', 'SPEC-110', 51, 200, 68, 38);
      insertSlab.run('SLAB-SPEC-110-3', 'PROD-08', 'SPEC-110', 201, null, 60, 34);

      console.log(' -> Seeded demo quantity rate slabs for product material specifications.');
    } catch (e) {
      console.warn('Migration 019 slabs seed notice:', e.message);
    }

    console.log(' -> Migration 019 applied: Specification outsource vendor & quantity slabs ready.');
  });

  // ----------------------------------------------------
  // MIGRATION 020: Advanced Printing Catalogue, 5 Pricing Engines, BOM & Automatic Job Costing
  // ----------------------------------------------------
  applyMigration('020_advanced_pricing_catalog_and_job_costing', (database) => {
    console.log('🚀 Applying Migration 020: Advanced Product Master, Dynamic Pricing & Automatic Job Costing...');

    // 1. Extend products table with SKU, Barcode, Image, MOQ, Pricing Method, Variants, Production Settings
    const prodCols = [
      'sku TEXT',
      'barcode TEXT',
      'image_url TEXT',
      'min_order_qty REAL DEFAULT 1',
      'pricing_method TEXT DEFAULT "FIXED"', // 'FIXED', 'SLAB', 'DIMENSION', 'YIELD_CALCULATOR', 'CUSTOM_QUOTE'
      'variants_json TEXT',
      'production_settings_json TEXT',
      'tax_inclusive INTEGER DEFAULT 0'
    ];
    prodCols.forEach(col => {
      try { database.prepare(`ALTER TABLE products ADD COLUMN ${col}`).run(); } catch (e) {}
    });

    // 2. Extend product_pricing_slabs with effective dates, customer specificity & priority
    const slabCols = [
      'customer_id TEXT',
      'customer_type TEXT',
      'start_date TEXT',
      'end_date TEXT',
      'priority INTEGER DEFAULT 0',
      'pricing_rule_name TEXT'
    ];
    slabCols.forEach(col => {
      try { database.prepare(`ALTER TABLE product_pricing_slabs ADD COLUMN ${col}`).run(); } catch (e) {}
    });

    // 3. Create customer_pricing_rules table (Method 5: Customer-specific negotiated pricing & contracts)
    database.exec(`
      CREATE TABLE IF NOT EXISTS customer_pricing_rules (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        customer_name TEXT,
        product_id TEXT,
        product_category TEXT,
        spec_id TEXT,
        pricing_type TEXT NOT NULL, -- 'FIXED_RATE', 'PERCENT_DISCOUNT', 'MARKUP_OVER_COST'
        custom_rate REAL,
        discount_pct REAL,
        min_qty REAL DEFAULT 1,
        start_date TEXT,
        end_date TEXT,
        priority INTEGER DEFAULT 1,
        active INTEGER DEFAULT 1,
        notes TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_cpr_cust ON customer_pricing_rules(customer_id);
      CREATE INDEX IF NOT EXISTS idx_cpr_prod ON customer_pricing_rules(product_id);
      CREATE INDEX IF NOT EXISTS idx_cpr_active ON customer_pricing_rules(active);
    `);

    // 4. Create product_bom table (Bill of Materials - Recipe, Materials, Machine, Labour, Electricity, Packaging, Outsource)
    database.exec(`
      CREATE TABLE IF NOT EXISTS product_bom (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        spec_id TEXT,
        bom_name TEXT NOT NULL,
        output_qty REAL DEFAULT 1,
        output_unit TEXT DEFAULT 'Pcs',
        is_default INTEGER DEFAULT 1,
        raw_materials_json TEXT, -- [{inventory_id, material_name, unit, qty_per_unit, unit_cost, wastage_pct, total_cost}]
        machine_cost REAL DEFAULT 0,
        machine_id TEXT,
        machine_name TEXT,
        labour_cost REAL DEFAULT 0,
        electricity_cost REAL DEFAULT 0,
        finishing_cost REAL DEFAULT 0,
        packaging_cost REAL DEFAULT 0,
        outsourced_cost REAL DEFAULT 0,
        outsourced_vendor_id TEXT,
        outsourced_process TEXT,
        total_estimated_unit_cost REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_bom_prod ON product_bom(product_id);
    `);

    // 5. Create product_yield_configs table (Yield Calculator Master e.g. Business Card 30/sheet yield)
    database.exec(`
      CREATE TABLE IF NOT EXISTS product_yield_configs (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL UNIQUE,
        sheet_name TEXT DEFAULT '12x18 Inch',
        sheet_width_in REAL DEFAULT 12,
        sheet_height_in REAL DEFAULT 18,
        cards_per_sheet INTEGER DEFAULT 30,
        paper_material_id TEXT,
        paper_gsm INTEGER DEFAULT 300,
        paper_sheet_cost REAL DEFAULT 6.50,
        printing_side TEXT DEFAULT 'DOUBLE', -- 'SINGLE' or 'DOUBLE'
        printing_cost_per_sheet REAL DEFAULT 8.00,
        ink_cost_per_sheet REAL DEFAULT 1.50,
        lamination_type TEXT DEFAULT 'Thermal Matte',
        lamination_cost_per_sheet REAL DEFAULT 4.00,
        cutting_cost_per_sheet REAL DEFAULT 1.50,
        wastage_pct REAL DEFAULT 5.0,
        overhead_per_sheet REAL DEFAULT 0.50,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_yield_prod ON product_yield_configs(product_id);
    `);

    // 6. Extend sales_order_items with historical costing & pricing rule snapshots
    const itemCols = [
      'original_selling_price REAL DEFAULT 0',
      'applied_pricing_rule TEXT DEFAULT "FIXED"', // 'FIXED_UNIT', 'QUANTITY_SLAB', 'CUSTOMER_NEGOTIATED', 'MATERIAL_DIMENSION', 'YIELD_CALCULATOR', 'MANUAL_OVERRIDE'
      'pricing_rule_details TEXT',
      'estimated_material_cost REAL DEFAULT 0',
      'estimated_labour_cost REAL DEFAULT 0',
      'estimated_machine_cost REAL DEFAULT 0',
      'estimated_overhead_cost REAL DEFAULT 0',
      'is_rate_overridden INTEGER DEFAULT 0',
      'override_reason TEXT',
      'overridden_by_user_id TEXT',
      'overridden_by_name TEXT',
      'gross_profit REAL DEFAULT 0',
      'gross_profit_margin REAL DEFAULT 0'
    ];
    itemCols.forEach(col => {
      try { database.prepare(`ALTER TABLE sales_order_items ADD COLUMN ${col}`).run(); } catch (e) {}
    });

    // 7. Create pricing_overrides_log table (Authorized Manual Price Overrides & Audit Logs)
    database.exec(`
      CREATE TABLE IF NOT EXISTS pricing_overrides_log (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        order_number TEXT,
        item_id TEXT NOT NULL,
        product_id TEXT,
        product_name TEXT,
        customer_id TEXT,
        customer_name TEXT,
        system_calculated_price REAL NOT NULL,
        overridden_price REAL NOT NULL,
        price_difference REAL NOT NULL,
        original_rate REAL,
        overridden_rate REAL,
        discount_pct REAL DEFAULT 0,
        estimated_cost REAL DEFAULT 0,
        expected_profit REAL DEFAULT 0,
        expected_margin_pct REAL DEFAULT 0,
        reason TEXT NOT NULL,
        authorized_by_user_id TEXT NOT NULL,
        authorized_by_name TEXT NOT NULL,
        user_id TEXT,
        user_name TEXT,
        authorized_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_po_log_order ON pricing_overrides_log(order_id);
      CREATE INDEX IF NOT EXISTS idx_po_log_prod ON pricing_overrides_log(product_id);
      CREATE INDEX IF NOT EXISTS idx_po_log_date ON pricing_overrides_log(authorized_at DESC);
    `);

    // 8. Seed Standard Printing Catalogue Items & Pricing Rules
    try {
      const insertProd = database.prepare(`
        INSERT OR REPLACE INTO products (
          id, product_code, name, sku, barcode, category, description, unit,
          default_rate, estimated_cost, gst_rate, hsn_code, min_order_qty,
          pricing_method, variants_json, production_settings_json, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `);

      const insertSlab = database.prepare(`
        INSERT OR REPLACE INTO product_pricing_slabs (
          id, product_id, spec_id, min_qty, max_qty, rate, cost_rate, pricing_rule_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Item 1: Custom Ceramic Mug Printing (Quantity Slab Example from Requirement 3)
      const mugVariants = JSON.stringify([
        { type: 'Color', options: ['White Gloss', 'Magic Black (Color Changing)', 'Inner Color Red', 'Dual Tone Blue'] },
        { type: 'Finishing', options: ['Glossy Sublimation', 'Matte Coating', 'Metallic Gold Rim'] }
      ]);
      const mugProdSettings = JSON.stringify({
        machineType: 'Sublimation Heat Press',
        pressTimeSeconds: 180,
        pressTempCelsius: 200,
        cardsPerSheet: 1,
        wasteAllowancePct: 3.0
      });
      insertProd.run(
        'PROD-MUG-01', 'PRD-MUG', 'Custom Ceramic Mug Sublimation Printing', 'MUG-WHT-11OZ', '8901234500012',
        'Promotional Items', 'High-quality 11oz grade-A ceramic mug with permanent full-color sublimation print.',
        'Pcs', 500, 65, 18, '4911', 1, 'SLAB', mugVariants, mugProdSettings
      );

      // Slabs for Mug Printing:
      // 1 = ₹500
      // 2–9 = ₹400 each
      // 10–99 = ₹380 each
      // 100–999 = ₹300 each
      // 1000+ = ₹100 each
      insertSlab.run('SLAB-MUG-1', 'PROD-MUG-01', null, 1, 1, 500, 65, 'Single Piece Retail');
      insertSlab.run('SLAB-MUG-2', 'PROD-MUG-01', null, 2, 9, 400, 65, 'Low Volume Tier');
      insertSlab.run('SLAB-MUG-3', 'PROD-MUG-01', null, 10, 99, 380, 60, 'Corporate Small Batch');
      insertSlab.run('SLAB-MUG-4', 'PROD-MUG-01', null, 100, 999, 300, 55, 'Bulk Order Tier');
      insertSlab.run('SLAB-MUG-5', 'PROD-MUG-01', null, 1000, null, 100, 45, 'Wholesale Factory Volume');

      // Item 2: Balloon Printing (Quantity Slab Example from Requirement 3)
      const balloonVariants = JSON.stringify([
        { type: 'Color', options: ['Assorted Standard', 'Metallic Silver', 'Pastel Pink', 'Royal Blue'] },
        { type: 'Size', options: ['9 Inch', '12 Inch'] }
      ]);
      insertProd.run(
        'PROD-BLN-01', 'PRD-BLN', 'Custom Screen Printed Latex Balloons', 'BLN-LTX-9IN', '8901234500029',
        'Promotional Items', 'Natural 100% biodegradable latex balloons with single or multi-colour screen print.',
        'Pcs', 10, 2.5, 18, '9505', 100, 'SLAB', balloonVariants, '{}'
      );

      // Slabs for Balloon Printing:
      // 100 = ₹10 each
      // 200 = ₹8 each
      // 500+ = ₹6 each
      insertSlab.run('SLAB-BLN-1', 'PROD-BLN-01', null, 1, 199, 10, 3.2, 'Small Batch 100-Pack');
      insertSlab.run('SLAB-BLN-2', 'PROD-BLN-01', null, 200, 499, 8, 2.5, 'Medium Batch 200-Pack');
      insertSlab.run('SLAB-BLN-3', 'PROD-BLN-01', null, 500, null, 6, 2.0, 'Wholesale 500+ Volume');

      // Item 3: Business Cards with Yield Calculator (Requirement 4)
      const bcVariants = JSON.stringify([
        { type: 'GSM', options: ['300 GSM Art Card', '350 GSM Art Card', '400 GSM Velvet Board'] },
        { type: 'Finishing', options: ['Matte Lamination', 'Gloss Lamination', 'Raised Spot UV + Velvet', 'Gold Foil Stamping'] },
        { type: 'Corners', options: ['Square Cut', 'Round Corners (6mm radius)'] }
      ]);
      insertProd.run(
        'PROD-BC-01', 'PRD-BC', 'Premium Business Cards / Visiting Cards', 'BC-MATTE-300', '8901234500036',
        'Stationery', 'Standard 3.5 x 2 inch executive visiting cards printed on 300 GSM art card with matte thermal lamination.',
        'Pcs', 3.50, 1.25, 18, '4911', 100, 'YIELD_CALCULATOR', bcVariants, '{}'
      );

      // Yield configuration: 30 cards per 12x18 sheet (CEILING formula)
      database.prepare(`
        INSERT OR REPLACE INTO product_yield_configs (
          id, product_id, sheet_name, sheet_width_in, sheet_height_in, cards_per_sheet,
          paper_gsm, paper_sheet_cost, printing_side, printing_cost_per_sheet, ink_cost_per_sheet,
          lamination_type, lamination_cost_per_sheet, cutting_cost_per_sheet, wastage_pct, overhead_per_sheet, notes
        ) VALUES (
          'YIELD-PROD-BC-01', 'PROD-BC-01', '12x18 Inch Art Card', 12, 18, 30,
          300, 6.50, 'DOUBLE', 8.00, 1.50,
          'Thermal Matte', 4.00, 1.50, 5.0, 0.50, '30 business cards per sheet standard gang run yield'
        )
      `).run();

      // Slabs for Business Cards
      insertSlab.run('SLAB-BC-1', 'PROD-BC-01', null, 100, 499, 3.50, 1.30, 'Short Run 100-500');
      insertSlab.run('SLAB-BC-2', 'PROD-BC-01', null, 500, 999, 2.20, 0.95, 'Standard Run 500-1000');
      insertSlab.run('SLAB-BC-3', 'PROD-BC-01', null, 1000, null, 1.60, 0.75, 'Bulk Gang Run 1000+');

      // 9. Seed Bill of Materials (BOM) Recipes (Requirement 5)
      // BOM for Business Cards (Output 1000 Pcs)
      const bcMaterials = JSON.stringify([
        { inventory_id: 'INV-03', material_name: '300 GSM Art Card Sheet 12x18', unit: 'Sheets', qty_per_unit: 0.035, unit_cost: 6.50, wastage_pct: 5.0, total_cost: 0.239 },
        { inventory_id: 'INV-06', material_name: 'Matte Thermal Lamination Film', unit: 'Sq.Ft', qty_per_unit: 0.052, unit_cost: 2.20, wastage_pct: 3.0, total_cost: 0.118 },
        { inventory_id: 'INV-05', material_name: 'Digital Press CMYK Toner / Ink', unit: 'Clicks', qty_per_unit: 0.070, unit_cost: 3.50, wastage_pct: 2.0, total_cost: 0.250 }
      ]);

      database.prepare(`
        INSERT OR REPLACE INTO product_bom (
          id, product_id, spec_id, bom_name, output_qty, output_unit, is_default,
          raw_materials_json, machine_cost, machine_id, machine_name,
          labour_cost, electricity_cost, finishing_cost, packaging_cost, outsourced_cost,
          total_estimated_unit_cost, notes
        ) VALUES (
          'BOM-BC-01', 'PROD-BC-01', null, 'Standard 300GSM Matte Business Card Recipe', 1, 'Pcs', 1,
          ?, 0.18, 'MAC-04', 'Konica Minolta AccurioPress C4070',
          0.12, 0.05, 0.08, 0.04, 0.00,
          0.90, 'Complete production recipe: raw card sheet, thermal lamination, Konica digital press, die cutting, packaging box'
        )
      `).run(bcMaterials);

      // BOM for Ceramic Mug Printing
      const mugMaterials = JSON.stringify([
        { inventory_id: 'INV-08', material_name: 'Blank Ceramic Mug 11oz', unit: 'Pcs', qty_per_unit: 1.0, unit_cost: 38.00, wastage_pct: 2.0, total_cost: 38.76 },
        { inventory_id: 'INV-05', material_name: 'Sublimation Paper & Inks', unit: 'Sheets', qty_per_unit: 1.0, unit_cost: 8.50, wastage_pct: 3.0, total_cost: 8.76 }
      ]);
      database.prepare(`
        INSERT OR REPLACE INTO product_bom (
          id, product_id, spec_id, bom_name, output_qty, output_unit, is_default,
          raw_materials_json, machine_cost, machine_id, machine_name,
          labour_cost, electricity_cost, finishing_cost, packaging_cost, outsourced_cost,
          total_estimated_unit_cost, notes
        ) VALUES (
          'BOM-MUG-01', 'PROD-MUG-01', null, 'Sublimation Ceramic Mug Recipe', 1, 'Pcs', 1,
          ?, 4.50, 'MAC-06', 'Dual Station Mug Heat Press',
          8.00, 2.50, 0.00, 6.00, 0.00,
          68.52, 'Mug blank, transfer release paper, sublimation dyes, heat press, individual gift box'
        )
      `).run(mugMaterials);

      // 10. Seed Customer-Specific Pricing Rules (Requirement 6)
      const insertCustRule = database.prepare(`
        INSERT OR REPLACE INTO customer_pricing_rules (
          id, customer_id, customer_name, product_id, product_category, spec_id,
          pricing_type, custom_rate, discount_pct, min_qty, start_date, end_date, active, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'Admin')
      `);

      // Customer CUST-101 (Apex Advertising / Regular): Contracted ₹12/sq.ft for Star Flex (Catalogue rate ₹15)
      insertCustRule.run(
        'CPR-APEX-01', 'CUST-101', 'Apex Advertising Co', 'PROD-01', null, null,
        'FIXED_RATE', 12.00, 0, 10, '2026-01-01', '2026-12-31', 'Contracted B2B agency rate for Star Flex banner'
      );

      // Customer CUST-102 (Metropolis Signages / Wholesale): 15% discount across all Flex & Banner
      insertCustRule.run(
        'CPR-METRO-01', 'CUST-102', 'Metropolis Signages', null, 'Flex & Banner', null,
        'PERCENT_DISCOUNT', null, 15.00, 1, '2026-01-01', '2026-12-31', 'Wholesale agency partner 15% trade discount'
      );

      console.log(' -> Seeded promotional items, business card yield calculator, BOM recipes & customer pricing rules.');
    } catch (seedErr) {
      console.warn('Migration 020 seeding warning:', seedErr.message);
    }

    console.log('✅ Migration 020 applied successfully: Advanced Printing Shop Catalogue, Dynamic Pricing & Costing Engine Active!');
  });

  // Also ensure spec_id column exists for already applied migration 017
  try { db.prepare("ALTER TABLE product_pricing_slabs ADD COLUMN spec_id TEXT").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE products ADD COLUMN default_vendor_id TEXT").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE products ADD COLUMN is_outsource INTEGER DEFAULT 0").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE product_specifications ADD COLUMN is_outsource INTEGER DEFAULT 0").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE product_specifications ADD COLUMN default_vendor_id TEXT").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE product_specifications ADD COLUMN default_vendor TEXT").run(); } catch(e) {}

  // -----------------------------------------------------------------------
  // MIGRATION 021: Full Printing Shop Product Catalogue Refresh
  // -----------------------------------------------------------------------
  applyMigration = applyMigration || function(){};

  // Inline the migration since applyMigration is a closure — we call the pattern directly
  const mig021Name = '021_full_printing_shop_catalogue';
  if (!db.prepare('SELECT migration_name FROM schema_migrations WHERE migration_name = ?').get(mig021Name)) {
    const tx021 = db.transaction((database) => {
      // 1. Remove duplicate canvas test products created during automated tests
      database.prepare(`DELETE FROM products WHERE category = 'Canvas' OR id LIKE 'PRD-CANV-%'`).run();
      database.prepare(`DELETE FROM product_specifications WHERE product_id LIKE 'PRD-CANV-%'`).run();

      // 2. Helper: upsert product + specs + slabs
      const upsertProd = database.prepare(`
        INSERT INTO products (
          id, product_code, name, sku, barcode, category, description, unit,
          default_rate, estimated_cost, gst_rate, hsn_code, min_order_qty,
          pricing_method, variants_json, production_settings_json, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON CONFLICT(id) DO UPDATE SET
          product_code = excluded.product_code,
          name = excluded.name,
          sku = excluded.sku,
          category = excluded.category,
          description = excluded.description,
          unit = excluded.unit,
          default_rate = excluded.default_rate,
          estimated_cost = excluded.estimated_cost,
          gst_rate = excluded.gst_rate,
          hsn_code = excluded.hsn_code,
          min_order_qty = excluded.min_order_qty,
          pricing_method = excluded.pricing_method,
          variants_json = excluded.variants_json,
          production_settings_json = excluded.production_settings_json
      `);

      const upsertSpec = database.prepare(`
        INSERT INTO product_specifications (
          id, product_id, spec_name, material_name, description, unit,
          cost_price, selling_price, gst_rate, hsn_code, is_default, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
        ON CONFLICT(id) DO UPDATE SET
          spec_name = excluded.spec_name,
          material_name = excluded.material_name,
          description = excluded.description,
          unit = excluded.unit,
          cost_price = excluded.cost_price,
          selling_price = excluded.selling_price,
          gst_rate = excluded.gst_rate,
          hsn_code = excluded.hsn_code,
          is_default = excluded.is_default
      `);

      const upsertSlab = database.prepare(`
        INSERT OR REPLACE INTO product_pricing_slabs (id, product_id, spec_id, min_qty, max_qty, rate, cost_rate, pricing_rule_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // =====================================================================
      // CATEGORY 1: FLEX & BANNERS (Large Format)
      // =====================================================================
      upsertProd.run(
        'PROD-01', 'PRD-FLX-01', 'Star Flex Banner Printing (240gsm Frontlit)', 'FLX-STR-240', null,
        'Flex & Banner',
        'Premium outdoor frontlit flex banner printing on 240gsm Star Frontlit media. UV-resistant eco-solvent inks for vibrant, weatherproof output. Ideal for hoardings, shop displays and outdoor advertising.',
        'Sq.Ft', 15, 7.5, 18, '9989', 10, 'SLAB', 
        JSON.stringify([{ type: 'Size', options: ['Any Custom Size'] }, { type: 'Finishing', options: ['Eyelet', 'Hemming + Eyelet', 'Pole Pocket', 'No Finishing'] }]),
        JSON.stringify({ machineType: 'Roland TrueVIS VG3 64"', inkType: 'Eco-Solvent CMYK', resolution: '720dpi' })
      );
      upsertSpec.run('SPEC-101', 'PROD-01', '240gsm Star Frontlit Flex', 'Star Frontlit Flex 240gsm (10ft Roll)', 'Standard outdoor frontlit flex banner, UV stable eco-solvent print', 'Sq.Ft', 7.5, 15, 18, '9989', 1);
      upsertSpec.run('SPEC-102', 'PROD-01', '340gsm Heavy Duty Blackout Flex', 'Blackout Flex 340gsm (10ft Roll)', 'Heavy weight flex with light-blocking black back barrier, double-sided display ready', 'Sq.Ft', 12, 22, 18, '9989', 0);

      upsertProd.run(
        'PROD-FLX-02', 'PRD-FLX-02', 'Backlit Flex Banner Printing (250gsm Super Glow)', 'FLX-BLT-250', null,
        'Flex & Banner',
        'High luminance backlit flex media for illuminated display boards, light boxes, and exhibition panels. Super glow PVC for vivid colours when lit from behind.',
        'Sq.Ft', 25, 12, 18, '9989', 5, 'SLAB',
        JSON.stringify([{ type: 'Finishing', options: ['Eyelet', 'Hemming + Eyelet', 'No Finishing'] }]),
        JSON.stringify({ machineType: 'Roland TrueVIS VG3 64"', inkType: 'Eco-Solvent CMYK', mediaGsm: 250 })
      );
      upsertSpec.run('SPEC-FLX-021', 'PROD-FLX-02', '250gsm Super Glow Backlit Flex', 'Super Glow Backlit Flex 250gsm', 'Translucent PVC backlit media for light boxes and illuminated sign boards', 'Sq.Ft', 12, 25, 18, '9989', 1);
      upsertSpec.run('SPEC-FLX-022', 'PROD-FLX-02', '380gsm Blockout Backlit Flex', 'Blockout Backlit Flex 380gsm', 'High opacity blockout backlit media, no show-through, superior light diffusion', 'Sq.Ft', 18, 35, 18, '9989', 0);

      upsertProd.run(
        'PROD-FLX-03', 'PRD-FLX-03', 'One-Way Vision Perforated Window Vinyl', 'VNY-OWV-30', null,
        'Flex & Banner',
        'Micro-perforated self-adhesive vinyl for glass and shop windows. See-through from inside, full-colour display from outside. 30% perforation ratio.',
        'Sq.Ft', 55, 28, 18, '9989', 5, 'FIXED',
        JSON.stringify([{ type: 'Perforation', options: ['30% OWV', '50% OWV'] }, { type: 'Lamination', options: ['Gloss Overlaminate', 'No Laminate'] }]),
        '{}');
      upsertSpec.run('SPEC-FLX-031', 'PROD-FLX-03', '30% OWV Perforated Vinyl (Standard)', 'OWV Perforated Vinyl 30%', 'Standard window perf vinyl for shop fronts and glass partitions', 'Sq.Ft', 28, 55, 18, '9989', 1);

      upsertProd.run(
        'PROD-FLX-04', 'PRD-FLX-04', 'Mesh Fence / Wind-Resistant Banner', 'FLX-MSH-440', null,
        'Flex & Banner',
        'Breathable PVC mesh banner for outdoor fence advertising, construction sites and sports events. Wind-load resistant with 50% air flow-through.',
        'Sq.Ft', 28, 14, 18, '9989', 20, 'FIXED',
        JSON.stringify([{ type: 'Finishing', options: ['Eyelet Every 2ft', 'Hemming + Eyelet'] }]),
        '{}');
      upsertSpec.run('SPEC-FLX-041', 'PROD-FLX-04', '440gsm PVC Mesh Fence Banner', 'PVC Mesh 440gsm', 'Wind-resistant mesh for hoardings, events and construction site banners', 'Sq.Ft', 14, 28, 18, '9989', 1);

      // =====================================================================
      // CATEGORY 2: VINYL & STICKERS
      // =====================================================================
      upsertProd.run(
        'PROD-02', 'PRD-VNY-01', 'Self-Adhesive Vinyl Sticker Printing (Gloss)', 'VNY-SAV-GLS', null,
        'Vinyl & Stickers',
        'High-quality self-adhesive vinyl sticker printing on premium Avery Dennison gloss white vinyl. UV-resistant, waterproof, suitable for vehicles, shop windows and indoor display.',
        'Sq.Ft', 35, 16, 18, '4911', 1, 'FIXED',
        JSON.stringify([{ type: 'Lamination', options: ['Gloss Overlaminate', 'Matte Overlaminate', 'No Laminate'] }, { type: 'Cut', options: ['Rectangular Cut', 'Shape Cut (Die Cut)'] }]),
        JSON.stringify({ machineType: 'Roland VersaUV', inkType: 'ECO-SOL MAX4' })
      );
      upsertSpec.run('SPEC-103', 'PROD-02', 'Avery Dennison Gloss White Vinyl', 'Avery Gloss White Self-Adhesive Vinyl', 'Premium permanent adhesive gloss vinyl sticker', 'Sq.Ft', 16, 35, 18, '4911', 1);
      upsertSpec.run('SPEC-104', 'PROD-02', 'Matte Laminated Waterproof Vinyl', 'Matte Vinyl + Thermal Lamination Film', 'Durable indoor/outdoor sticker with matte thermal lamination', 'Sq.Ft', 22, 45, 18, '4911', 0);
      upsertSpec.run('SPEC-VNY-023', 'PROD-02', 'Textured / Brushed Effect Vinyl', 'Brushed Silver or Gold Textured Vinyl', 'Decorative brushed texture vinyl for premium labelling and branding', 'Sq.Ft', 28, 60, 18, '4911', 0);

      upsertProd.run(
        'PROD-VNY-02', 'PRD-VNY-02', 'Chrome & Metallic Vinyl Stickers', 'VNY-CHR-MET', null,
        'Vinyl & Stickers',
        'Ultra-premium chrome, gold and silver metallic vinyl sticker printing. Mirror-finish reflective surfaces for branding, number plates and luxury product labels.',
        'Sq.Ft', 75, 35, 18, '4911', 1, 'FIXED',
        JSON.stringify([{ type: 'Finish', options: ['Chrome Mirror', 'Gold Metallic', 'Silver Metallic', 'Rose Gold'] }]),
        '{}');
      upsertSpec.run('SPEC-VNY-021', 'PROD-VNY-02', 'Chrome Mirror Vinyl (Holographic)', 'Chrome Mirror Self-Adhesive Vinyl', 'Mirror-like chrome finish sticker for premium branding', 'Sq.Ft', 35, 75, 18, '4911', 1);
      upsertSpec.run('SPEC-VNY-022', 'PROD-VNY-02', 'Brushed Gold/Silver Metallic Vinyl', 'Brushed Metallic Self-Adhesive Vinyl', 'Premium brushed metallic finish vinyl for signage and vehicle graphics', 'Sq.Ft', 30, 65, 18, '4911', 0);

      upsertProd.run(
        'PROD-VNY-03', 'PRD-VNY-03', 'Floor Sticker (Anti-Slip Laminated Vinyl)', 'VNY-FLR-ALS', null,
        'Vinyl & Stickers',
        'Heavy-duty anti-slip laminated floor sticker for retail stores, malls, events and wayfinding. Certified slip-resistant overlaminate with high-tack floor adhesive.',
        'Sq.Ft', 95, 45, 18, '4911', 4, 'FIXED',
        JSON.stringify([{ type: 'Shape', options: ['Square/Rectangle', 'Round', 'Custom Shape'] }]),
        '{}');
      upsertSpec.run('SPEC-VNY-031', 'PROD-VNY-03', 'Anti-Slip Floor Vinyl (Standard)', 'Anti-Slip PVC Floor Sticker Media', 'High-tack anti-slip textured PVC floor sticker with safety laminate', 'Sq.Ft', 45, 95, 18, '4911', 1);

      upsertProd.run(
        'PROD-VNY-04', 'PRD-VNY-04', 'Vehicle Wrap & Car Graphics', 'VNY-VHC-WRP', null,
        'Vinyl & Stickers',
        'Full body or partial vehicle wrap using premium cast vinyl. Includes design, print and installation. Suitable for cars, vans, bikes and fleet branding.',
        'Sq.Ft', 120, 55, 18, '9989', 5, 'FIXED',
        JSON.stringify([{ type: 'Vinyl Grade', options: ['Calendered', 'Cast (3M / Avery)'] }, { type: 'Service', options: ['Supply Only', 'Supply + Installation'] }]),
        '{}');
      upsertSpec.run('SPEC-VNY-041', 'PROD-VNY-04', 'Calendered Vehicle Vinyl (Standard)', 'Calendered Self-Adhesive Vehicle Vinyl', 'Standard vehicle graphics vinyl for flat surfaces', 'Sq.Ft', 55, 120, 18, '9989', 1);
      upsertSpec.run('SPEC-VNY-042', 'PROD-VNY-04', 'Cast Vinyl Wrap (3M / Avery Premium)', '3M 1080 / Avery Cast Vehicle Wrap Vinyl', 'Premium cast vinyl for complex curves and full vehicle wraps', 'Sq.Ft', 85, 180, 18, '9989', 0);

      // =====================================================================
      // CATEGORY 3: COMMERCIAL PRINT (Offset & Digital)
      // =====================================================================
      upsertProd.run(
        'PROD-05', 'PRD-CRD-01', 'Business Cards / Visiting Cards', 'BC-300-MATTE', null,
        'Commercial Print',
        'Premium executive business visiting cards on 300 to 400 GSM art card. Available in matte, gloss, velvet lamination with optional Spot UV, foil stamping and round corners.',
        'Box', 850, 380, 18, '4911', 1, 'FIXED',
        JSON.stringify([{ type: 'GSM', options: ['300 GSM Art Card', '350 GSM Art Card', '400 GSM Premium Board'] }, { type: 'Finishing', options: ['Matte Lamination', 'Gloss Lamination', 'Velvet Lamination + Spot UV', 'Gold Foil Stamp'] }, { type: 'Corners', options: ['Square Corners', 'Round Corners (6mm)'] }]),
        JSON.stringify({ boxQty: 1000, sheetsPerBox: 34, yield: 30 })
      );
      upsertSpec.run('SPEC-108', 'PROD-05', '300gsm Matte Laminated Business Card (Box/1000)', '300gsm Art Card + Thermal Matte Film', 'Standard matte executive visiting card, 1000 pcs per box', 'Box', 280, 550, 18, '4911', 1);
      upsertSpec.run('SPEC-BC-02', 'PROD-05', '350gsm Velvet Lamination + Raised Spot UV (Box/1000)', '350gsm Art Card + Velvet Lam + Spot UV', 'Luxury tactile visiting card with velvet coating and raised UV effect', 'Box', 380, 850, 18, '4911', 0);
      upsertSpec.run('SPEC-BC-03', 'PROD-05', 'UV-Coated Glossy (2 Side, Box/1000)', '300gsm Art Card + UV Gloss Coat', 'Vibrant full-gloss UV coated business cards, crisp and professional', 'Box', 300, 600, 18, '4911', 0);

      upsertProd.run(
        'PROD-CMR-01', 'PRD-LTR-01', 'Company Letterhead (A4 Offset Printing)', 'LTR-A4-70GSM', null,
        'Commercial Print',
        'Official company letterhead on 70gsm or 90gsm premium bond paper. Single or double colour design with full-bleed options. Supplied in reams or pads.',
        'Pcs', 2.5, 0.95, 18, '4911', 100, 'SLAB',
        JSON.stringify([{ type: 'Paper GSM', options: ['70 GSM Bond', '90 GSM Executive Bond', '120 GSM Ivory'] }, { type: 'Printing', options: ['1 Colour', '2 Colour', 'Full Colour CMYK'] }]),
        '{}');
      upsertSpec.run('SPEC-CMR-011', 'PROD-CMR-01', 'A4 Letterhead 70gsm Full Colour (100 pcs)', '70gsm Bond Paper', 'Standard A4 letterhead, full colour CMYK, 100 sheet pad', 'Pcs', 0.95, 2.5, 18, '4911', 1);
      upsertSpec.run('SPEC-CMR-012', 'PROD-CMR-01', 'A4 Letterhead 90gsm Premium (100 pcs)', '90gsm Premium Bond', 'Executive quality letterhead on thick bond paper', 'Pcs', 1.4, 3.5, 18, '4911', 0);
      upsertSlab.run('SLAB-LTR-1', 'PROD-CMR-01', null, 100, 499, 2.5, 0.95, '100-500 Pcs');
      upsertSlab.run('SLAB-LTR-2', 'PROD-CMR-01', null, 500, 999, 1.8, 0.75, '500-1000 Pcs');
      upsertSlab.run('SLAB-LTR-3', 'PROD-CMR-01', null, 1000, null, 1.2, 0.60, '1000+ Pcs Offset');

      upsertProd.run(
        'PROD-CMR-02', 'PRD-FLY-01', 'Flyers & Pamphlets (A4 / A5 / A6)', 'FLY-A4-130', null,
        'Commercial Print',
        'High-impact promotional flyers and leaflets for marketing campaigns, events and product launches. Printed on 130gsm coated art paper, full CMYK both sides.',
        'Pcs', 2.0, 0.75, 18, '4911', 100, 'SLAB',
        JSON.stringify([{ type: 'Size', options: ['A4 (21x29.7cm)', 'A5 (14.8x21cm)', 'A6 DL Size (10x21cm)'] }, { type: 'GSM', options: ['130 GSM Gloss Art', '150 GSM Matt Art', '170 GSM Silk Coated'] }, { type: 'Sides', options: ['Single Side Print', 'Double Side Print'] }]),
        '{}');
      upsertSpec.run('SPEC-CMR-021', 'PROD-CMR-02', 'A4 Flyer 130gsm Gloss (Double Sided)', '130gsm Gloss Art Paper', 'Full-colour double-sided A4 flyer on 130gsm gloss art paper', 'Pcs', 0.75, 2.0, 18, '4911', 1);
      upsertSpec.run('SPEC-CMR-022', 'PROD-CMR-02', 'A5 Flyer 150gsm Matt (Double Sided)', '150gsm Matte Art Paper', 'Premium A5 matt finish double-sided flyer', 'Pcs', 0.55, 1.5, 18, '4911', 0);
      upsertSlab.run('SLAB-FLY-1', 'PROD-CMR-02', null, 100, 499, 2.0, 0.75, '100-499 Short Run');
      upsertSlab.run('SLAB-FLY-2', 'PROD-CMR-02', null, 500, 999, 1.4, 0.55, '500-999 Mid Run');
      upsertSlab.run('SLAB-FLY-3', 'PROD-CMR-02', null, 1000, 4999, 0.95, 0.40, '1000-5000 Bulk');
      upsertSlab.run('SLAB-FLY-4', 'PROD-CMR-02', null, 5000, null, 0.65, 0.30, '5000+ Offset');

      upsertProd.run(
        'PROD-CMR-03', 'PRD-BRO-01', 'Brochures & Catalogues (Folded)', 'BRO-A4-170', null,
        'Commercial Print',
        'Professionally designed and printed company brochures, product catalogues and info-leaflets. Available in bi-fold, tri-fold, Z-fold and 8-page A5 booklet formats.',
        'Pcs', 12, 4.5, 18, '4911', 50, 'SLAB',
        JSON.stringify([{ type: 'Format', options: ['A4 Bi-Fold (4 pages)', 'A4 Tri-Fold (6 pages)', 'A4 Z-Fold (6 pages)', 'A5 8-Page Booklet (Stapled)'] }, { type: 'Paper', options: ['130 GSM Gloss Art', '170 GSM Matt Art', '250 GSM Cover + 130gsm Inner'] }]),
        '{}');
      upsertSpec.run('SPEC-CMR-031', 'PROD-CMR-03', 'A4 Tri-Fold 130gsm Gloss', '130gsm Gloss Art Paper Trifold', 'A4 tri-fold brochure, full CMYK both sides, gloss finish', 'Pcs', 4.5, 12, 18, '4911', 1);
      upsertSpec.run('SPEC-CMR-032', 'PROD-CMR-03', 'A5 Booklet 8-Page Saddle Stitch', '130gsm Gloss Inner + 250gsm Cover', 'A5 saddle-stitched booklet, 8 pages full colour', 'Pcs', 9, 22, 18, '4911', 0);
      upsertSlab.run('SLAB-BRO-1', 'PROD-CMR-03', null, 50, 249, 12, 4.5, '50-250 Short Run');
      upsertSlab.run('SLAB-BRO-2', 'PROD-CMR-03', null, 250, 999, 8, 3.2, '250-1000');
      upsertSlab.run('SLAB-BRO-3', 'PROD-CMR-03', null, 1000, null, 5.5, 2.2, '1000+ Offset Run');

      upsertProd.run(
        'PROD-CMR-04', 'PRD-BBK-01', 'Bill Books / Invoice Pads (NCR)', 'BBK-NCR-A5', null,
        'Commercial Print',
        'Custom carbon copy invoice books, bill pads and order forms on NCR (No Carbon Required) paper. 2-part or 3-part sets, spiral or glue-bound.',
        'Pad', 450, 180, 18, '4911', 5, 'FIXED',
        JSON.stringify([{ type: 'Copies', options: ['2-Part NCR (Duplicate)', '3-Part NCR (Triplicate)'] }, { type: 'Size', options: ['A5 (100 Sets)', 'A4 (50 Sets)', 'Custom Size'] }, { type: 'Binding', options: ['Glue-Bound Top', 'Spiral Bound', 'Pads (50 Sheets)'] }]),
        '{}');
      upsertSpec.run('SPEC-CMR-041', 'PROD-CMR-04', 'A5 Duplicate NCR Bill Book (100 Sets)', 'NCR A5 Duplicate Paper', '2-part NCR A5 bill book, 100 sets, company header printed', 'Pad', 180, 450, 18, '4911', 1);
      upsertSpec.run('SPEC-CMR-042', 'PROD-CMR-04', 'A4 Triplicate NCR Invoice Book (50 Sets)', 'NCR A4 Triplicate Paper', '3-part NCR A4 invoice book, 50 sets, serial numbered', 'Pad', 280, 650, 18, '4911', 0);

      upsertProd.run(
        'PROD-CMR-05', 'PRD-ENV-01', 'Envelope Printing (DL / A5 / Courier)', 'ENV-DL-80G', null,
        'Commercial Print',
        'Custom branded envelope printing for company correspondence, invitations and courier dispatch. Available in DL, C5, C4 and custom sizes with glue or self-seal flap.',
        'Pcs', 4.5, 1.8, 18, '4911', 100, 'SLAB',
        JSON.stringify([{ type: 'Size', options: ['DL (110x220mm)', 'C5 (162x229mm)', 'C4 A4 Size (229x324mm)'] }, { type: 'Print', options: ['1 Colour Letterpress', 'Full CMYK Digital'] }]),
        '{}');
      upsertSpec.run('SPEC-CMR-051', 'PROD-CMR-05', 'DL Envelope Full Colour Print (100 pcs)', '80gsm White Wove Envelope', 'DL windowed or plain envelope, CMYK branded print', 'Pcs', 1.8, 4.5, 18, '4911', 1);
      upsertSlab.run('SLAB-ENV-1', 'PROD-CMR-05', null, 100, 499, 4.5, 1.8, '100-500 Pcs');
      upsertSlab.run('SLAB-ENV-2', 'PROD-CMR-05', null, 500, null, 2.8, 1.2, '500+ Pcs');

      // =====================================================================
      // CATEGORY 4: PROMOTIONAL ITEMS (Sublimation & Screen Print)
      // =====================================================================
      // Mug already exists - just update
      upsertProd.run(
        'PROD-MUG-01', 'PRD-MUG-01', 'Custom Sublimation Ceramic Mug Printing', 'MUG-WHT-11OZ', '8901234500012',
        'Promotional Items',
        'High-quality 11oz AAA-grade ceramic mugs with permanent, scratch-resistant full-colour sublimation print. Dishwasher safe. Perfect for corporate gifting, events and retail.',
        'Pcs', 500, 65, 18, '4911', 1, 'SLAB',
        JSON.stringify([{ type: 'Mug Type', options: ['White 11oz Standard', 'Magic Color-Changing 11oz', 'Inner Color Mug', 'Latte 12oz Tall', 'Conical Metallic'] }, { type: 'Wrap', options: ['Full Wrap 360°', 'One Side Print'] }]),
        JSON.stringify({ machineType: 'Sublimation Mug Heat Press', pressTime: 180, tempCelsius: 200, wasteAllowance: 3.0 })
      );

      upsertProd.run(
        'PROD-PRO-02', 'PRD-TSH-01', 'Custom T-Shirt Printing (Sublimation / DTF)', 'TSH-WHT-SUB', null,
        'Promotional Items',
        'Full-colour custom T-shirt printing using sublimation (polyester) or DTF (Direct-to-Film) for cotton and blended fabrics. Available in all sizes and colours.',
        'Pcs', 350, 120, 12, '6109', 10, 'SLAB',
        JSON.stringify([{ type: 'Fabric', options: ['100% Polyester (Sublimation)', 'Cotton (DTF)', 'CVC 60/40 Blend (DTF)'] }, { type: 'Print Area', options: ['Full Front A3', 'Full Front + Back', 'Left Chest Logo'] }, { type: 'Size', options: ['S', 'M', 'L', 'XL', 'XXL', '3XL'] }]),
        JSON.stringify({ machineType: 'Flat Bed Heat Press / DTF Printer', temp: 165, pressTime: 15 })
      );
      upsertSpec.run('SPEC-PRO-021', 'PROD-PRO-02', 'Polyester T-Shirt Sublimation (All-Over Print)', 'Plain White Polyester T-Shirt + Sublimation Paper', 'Full colour all-over sublimation on polyester tee', 'Pcs', 120, 350, 12, '6109', 1);
      upsertSpec.run('SPEC-PRO-022', 'PROD-PRO-02', 'Cotton T-Shirt DTF Print (Front Only)', 'Plain White Cotton T-Shirt + DTF Transfer', 'DTF heat transfer print on cotton fabric, front only', 'Pcs', 140, 380, 12, '6109', 0);
      upsertSpec.run('SPEC-PRO-023', 'PROD-PRO-02', 'Polo Shirt Corporate DTF Branding', 'Plain Polo Shirt + DTF Left Chest Logo', 'Corporate polo with left chest logo DTF print', 'Pcs', 200, 550, 12, '6109', 0);
      upsertSlab.run('SLAB-TSH-1', 'PROD-PRO-02', null, 10, 49, 350, 120, '10-50 Pcs');
      upsertSlab.run('SLAB-TSH-2', 'PROD-PRO-02', null, 50, 199, 280, 100, '50-200 Corporate');
      upsertSlab.run('SLAB-TSH-3', 'PROD-PRO-02', null, 200, null, 220, 85, '200+ Bulk');

      upsertProd.run(
        'PROD-PRO-03', 'PRD-CAP-01', 'Cap / Hat Printing (Sublimation & Embroidery)', 'CAP-SUB-EMB', null,
        'Promotional Items',
        'Custom printed and embroidered caps and hats for corporate events, sports teams and promotions. Sublimation for full-colour, embroidery for logo/text.',
        'Pcs', 350, 130, 12, '6505', 10, 'SLAB',
        JSON.stringify([{ type: 'Method', options: ['Sublimation All-Over', 'Embroidery (Front + Side)', 'DTF Heat Transfer'] }, { type: 'Cap Style', options: ['Foam Trucker Cap', 'Flex-Fit Sports Cap', 'Snapback Cap'] }]),
        '{}');
      upsertSpec.run('SPEC-PRO-031', 'PROD-PRO-03', 'Sublimation All-Over Printed Cap', 'Plain Polyester Sublimation Cap + Sublimation Print', 'Full-colour all-over sublimation print on foam cap', 'Pcs', 130, 350, 12, '6505', 1);
      upsertSpec.run('SPEC-PRO-032', 'PROD-PRO-03', 'Embroidered Logo Cap (Corporate)', 'Plain Cap + Embroidery Thread + Digitizing', 'Premium embroidered logo on front panel, up to 10,000 stitches', 'Pcs', 180, 480, 12, '6505', 0);

      upsertProd.run(
        'PROD-PRO-04', 'PRD-PEN-01', 'Branded Pen / Stationery Printing', 'PEN-BRND-MET', null,
        'Promotional Items',
        'Corporate branded pens, markers and stationery with company logo via screen printing, laser engraving or pad printing. Minimum 50 pcs.',
        'Pcs', 55, 22, 18, '9608', 50, 'SLAB',
        JSON.stringify([{ type: 'Pen Type', options: ['Metal Ball Pen', 'Plastic Ball Pen', 'Metal Roller Pen', 'Stylus Touch Pen'] }, { type: 'Branding', options: ['Screen Print (1 Colour)', 'Laser Engraving', 'Pad Print (Full Colour)'] }]),
        '{}');
      upsertSpec.run('SPEC-PRO-041', 'PROD-PRO-04', 'Metal Ball Pen Screen Print (1 Colour)', 'Metal Ball Pen + Screen Print Branding', 'Classic metal pen with 1-colour screen print logo', 'Pcs', 22, 55, 18, '9608', 1);
      upsertSpec.run('SPEC-PRO-042', 'PROD-PRO-04', 'Metal Roller Pen Laser Engraving', 'Metal Roller Pen + Laser Engraving', 'Premium roller pen with laser-engraved logo, luxury look', 'Pcs', 45, 120, 18, '9608', 0);
      upsertSlab.run('SLAB-PEN-1', 'PROD-PRO-04', null, 50, 199, 55, 22, '50-200 Pcs');
      upsertSlab.run('SLAB-PEN-2', 'PROD-PRO-04', null, 200, null, 42, 18, '200+ Bulk');

      upsertProd.run(
        'PROD-PRO-05', 'PRD-PHF-01', 'Photo Frame / Photo Print (Sublimation)', 'PHF-MDF-5X7', null,
        'Promotional Items',
        'Personalised sublimation photo frames, MDF gifts and keepsakes. Custom photo printed on MDF board or ceramic tile with UV-stable sublimation inks.',
        'Pcs', 180, 65, 18, '4911', 1, 'FIXED',
        JSON.stringify([{ type: 'Product', options: ['5x7" MDF Photo Frame', '4x6" Ceramic Tile', '8x10" MDF Canvas Board', 'A4 MDF Wall Art'] }]),
        '{}');
      upsertSpec.run('SPEC-PRO-051', 'PROD-PRO-05', '5x7 MDF Sublimation Photo Frame', 'Blank 5x7 MDF Photo Frame + Sublimation Print', 'Custom photo printed on 5x7 inch MDF frame', 'Pcs', 65, 180, 18, '4911', 1);
      upsertSpec.run('SPEC-PRO-052', 'PROD-PRO-05', 'A4 MDF Wall Art Board (Sublimation)', 'Blank A4 MDF White Coated Board + Sublimation', 'A4 full-colour MDF wall art, high resolution print', 'Pcs', 90, 250, 18, '4911', 0);

      // =====================================================================
      // CATEGORY 5: ARCHITECTURAL SIGNAGE
      // =====================================================================
      upsertProd.run(
        'PROD-03', 'PRD-ACR-01', 'Acrylic 3D LED Illuminated Letters & Logos', 'ACR-3D-LED', null,
        'Architectural Signage',
        'Precision-cut 3mm / 5mm acrylic face-lit 3D channel letters with Samsung LED modules. Custom corporate logos, shop name boards and hospital/hotel signage. IP67 rated waterproof LEDs.',
        'Sq.Ft', 1200, 650, 18, '9405', 1, 'FIXED',
        JSON.stringify([{ type: 'Acrylic Color', options: ['White Acrylic (LED Face)', 'Coloured Acrylic', 'Black Acrylic (Halo Lit)'] }, { type: 'Thickness', options: ['3mm Acrylic', '5mm Acrylic'] }, { type: 'LED', options: ['Samsung Cool White', 'Samsung Warm White', 'RGB Colour Changing'] }]),
        JSON.stringify({ machineType: 'CNC Router + Laser Cutter', materialCNC: 'Cast Acrylic Sheet 3mm', ledBrand: 'Samsung IP67' })
      );
      upsertSpec.run('SPEC-105', 'PROD-03', 'Acrylic Face-Lit 3D Letters (Samsung LED)', '3mm Cast Acrylic + Samsung IP67 LED Strip', 'Premium front-lit acrylic channel letters with IP67 waterproof LED modules', 'Sq.Ft', 650, 1200, 18, '9405', 1);
      upsertSpec.run('SPEC-106', 'PROD-03', 'Titanium Gold SS 304 3D Letters (Halo Lit)', 'SS 304 Titanium Gold Sheet + LED Halo', 'Luxury stainless steel gold halo-backlit channel letters for premium brands', 'Sq.Ft', 950, 1800, 18, '9405', 0);
      upsertSpec.run('SPEC-ACR-033', 'PROD-03', 'Aluminium Dibond Tray + Acrylic Face 3D Letters', 'Aluminium Tray + 3mm Acrylic + LED', 'Aluminium tray letter with acrylic front and LED illumination', 'Sq.Ft', 800, 1500, 18, '9405', 0);

      upsertProd.run(
        'PROD-SGN-02', 'PRD-LED-01', 'Glow Sign Board (Non-Lit ACP + LED Border)', 'GSB-ACP-LED', null,
        'Architectural Signage',
        'Aluminium Composite Panel (ACP) with vinyl print and optional LED border or light box. Durable, lightweight and weatherproof for shop fronts and commercial signage.',
        'Sq.Ft', 280, 140, 18, '9405', 4, 'FIXED',
        JSON.stringify([{ type: 'Finish', options: ['ACP + Vinyl Print Only', 'ACP + LED Border Frame', 'ACP Light Box (Backlit)'] }, { type: 'ACP Brand', options: ['Alucobond Premium', 'Standard ACP'] }]),
        '{}');
      upsertSpec.run('SPEC-SGN-021', 'PROD-SGN-02', 'ACP Board + Vinyl Print (Standard)', 'ACP Sheet + Vinyl Print + Aluminium Frame', 'Aluminium composite panel with printed vinyl face and frame', 'Sq.Ft', 140, 280, 18, '9405', 1);
      upsertSpec.run('SPEC-SGN-022', 'PROD-SGN-02', 'ACP Light Box (Backlit Signage)', 'ACP Box + Backlit Vinyl + LED Inside', 'Backlit ACP light box sign with LED illumination and flex vinyl face', 'Sq.Ft', 220, 450, 18, '9405', 0);

      upsertProd.run(
        'PROD-SGN-03', 'PRD-NLT-01', 'Neon Flex LED Sign Board', 'NGN-FLEX-RGB', null,
        'Architectural Signage',
        'Custom RGB neon flex LED signs for restaurants, shops and events. Flexible silicone neon tube with acrylic or clear backing, vivid glow effect.',
        'Nos', 3500, 1400, 18, '9405', 1, 'FIXED',
        JSON.stringify([{ type: 'Color', options: ['Single Color', 'Dual Color', 'RGB (Multi-Color)'] }, { type: 'Backing', options: ['Clear Acrylic Board', 'MDF Painted Board', 'Free-Standing Frame'] }]),
        '{}');
      upsertSpec.run('SPEC-SGN-031', 'PROD-SGN-03', 'Neon Flex LED (Up to 1 sq.ft)', 'RGB Neon Flex Strip + Acrylic Backing', 'Custom neon flex LED sign up to 1 sq.ft, vivid and energy-efficient', 'Nos', 1400, 3500, 18, '9405', 1);

      // =====================================================================
      // CATEGORY 6: DISPLAY & EXHIBITION
      // =====================================================================
      upsertProd.run(
        'PROD-04', 'PRD-STD-01', 'Rollup / Pull-Up Banner Standee', 'STD-RUP-3X6', null,
        'Display & Exhibition',
        'Portable retractable rollup standee banner with aluminium spring cassette. Easy to set up in seconds. Available in 2x5 ft to 3x7 ft. Ideal for exhibitions, events and retail.',
        'Nos', 1650, 850, 18, '9989', 1, 'FIXED',
        JSON.stringify([{ type: 'Size', options: ['2x5 ft (60x150cm)', '3x6 ft (90x180cm)', '3x7 ft (90x210cm)'] }, { type: 'Base', options: ['Standard Aluminium Base', 'Wide Base Deluxe', 'Premium Cassette with Carry Bag'] }]),
        '{}');
      upsertSpec.run('SPEC-107', 'PROD-04', '3x6 ft Wide Base Rollup Standee (Economy)', 'Aluminium Wide Base Cassette + Star Flex Print', 'Standard portable pull-up standee 3x6 ft, economy model', 'Nos', 850, 1650, 18, '9989', 1);
      upsertSpec.run('SPEC-DSP-042', 'PROD-04', '3x6 ft Premium Deluxe Rollup (with Carry Bag)', 'Deluxe Cassette + Premium Flex Print + Carry Bag', 'Premium rollup standee with deluxe cassette and padded carry bag', 'Nos', 1200, 2400, 18, '9989', 0);

      upsertProd.run(
        'PROD-DSP-02', 'PRD-XBN-01', 'X-Banner Stand (Flexible Banner)', 'DSP-XBN-80', null,
        'Display & Exhibition',
        'Lightweight X-frame banner stand, easy assembly. Suitable for product launches, trade shows, events and in-store promotion. Snap-in banner changing system.',
        'Nos', 850, 350, 18, '9989', 1, 'FIXED',
        JSON.stringify([{ type: 'Size', options: ['80x180cm', '60x160cm'] }, { type: 'Material', options: ['Star Flex Print', 'PP Synthetic Paper'] }]),
        '{}');
      upsertSpec.run('SPEC-DSP-021', 'PROD-DSP-02', 'X-Banner 80x180cm (Standard)', 'X-Frame Stand + Star Flex Print 80x180cm', 'Standard X-banner with flex print panel and carry bag', 'Nos', 350, 850, 18, '9989', 1);

      upsertProd.run(
        'PROD-DSP-03', 'PRD-TTD-01', 'Table Top Display / L-Stand (A4)', 'DSP-TTL-A4', null,
        'Display & Exhibition',
        'Compact desktop display stand and countertop L-stands for retail, restaurants and reception areas. Snap-frame, acrylic and L-stand styles available.',
        'Nos', 280, 110, 18, '9989', 1, 'FIXED',
        JSON.stringify([{ type: 'Type', options: ['A4 L-Stand with Print', 'A4 Acrylic Snap Frame', 'A4 Clip Frame Desktop'] }]),
        '{}');
      upsertSpec.run('SPEC-DSP-031', 'PROD-DSP-03', 'A4 L-Stand Table Display (with Print)', 'Aluminium L-Stand + A4 Print (Silk)', 'Desktop A4 L-stand with full-colour gloss print', 'Nos', 110, 280, 18, '9989', 1);

      // =====================================================================
      // CATEGORY 7: RIGID SIGNAGE
      // =====================================================================
      upsertProd.run(
        'PROD-08', 'PRD-SNB-01', 'Sunboard Mounting with Laminated Vinyl Print', 'SNB-5MM-VNY', null,
        'Rigid Signage',
        'Lightweight 5mm high-density PVC sunboard with UV-printed or laminated vinyl face. Ideal for indoor shop displays, office name boards, property signage and notice boards.',
        'Sq.Ft', 75, 36, 18, '3920', 2, 'FIXED',
        JSON.stringify([{ type: 'Thickness', options: ['3mm Sunboard', '5mm Sunboard', '10mm Sunboard'] }, { type: 'Surface', options: ['Gloss Vinyl', 'Matte Vinyl', 'Direct UV Print'] }]),
        '{}');
      upsertSpec.run('SPEC-110', 'PROD-08', '5mm Sunboard + Gloss Vinyl (Standard)', '5mm White Sunboard + Self-Adhesive Vinyl', 'Standard rigid display board with gloss vinyl print', 'Sq.Ft', 36, 75, 18, '3920', 1);
      upsertSpec.run('SPEC-RGD-082', 'PROD-08', '10mm Sunboard + Direct UV Flatbed Print', '10mm White Sunboard + UV Flatbed Ink', 'Thick sunboard with direct UV flatbed printing, premium quality', 'Sq.Ft', 55, 115, 18, '3920', 0);

      upsertProd.run(
        'PROD-RGD-02', 'PRD-FMB-01', 'Foam Board / Foam Core Display (A4–A0)', 'FMB-5MM-A3', null,
        'Rigid Signage',
        'Lightweight foam core / foam board display prints for exhibitions, retail POP and interior design. Ultra-light, easy to mount and eco-friendly.',
        'Sq.Ft', 90, 40, 18, '3920', 2, 'FIXED',
        JSON.stringify([{ type: 'Size', options: ['A4', 'A3', 'A2', 'A1', 'A0', 'Custom'] }, { type: 'Thickness', options: ['3mm Foam Board', '5mm Foam Board'] }]),
        '{}');
      upsertSpec.run('SPEC-RGD-021', 'PROD-RGD-02', '5mm Foam Board A1 (59x84cm) Print Mounted', '5mm White Foam Core + Inkjet Print', 'A1 foam core board with high-resolution inkjet print face', 'Sq.Ft', 40, 90, 18, '3920', 1);

      // =====================================================================
      // CATEGORY 8: STAMP & SEAL
      // =====================================================================
      upsertProd.run(
        'PROD-07', 'PRD-SLM-01', 'Self-Inking Rubber Stamp (Trodat / Colop)', 'SLM-TRO-4912', null,
        'Stamp & Seal',
        'Custom self-inking rubber stamps in popular Trodat and Colop brands. Pre-inked laser-engraved photopolymer stamp dies. Available in all impression sizes.',
        'Nos', 450, 160, 18, '9611', 1, 'FIXED',
        JSON.stringify([{ type: 'Brand', options: ['Trodat 4912 (50x20mm)', 'Trodat 4913 (58x22mm)', 'Trodat 4926 (75x38mm)', 'Colop Printer 30'] }, { type: 'Ink Color', options: ['Blue', 'Red', 'Black', 'Green', 'Violet'] }]),
        JSON.stringify({ machineType: 'FlashStamp Pro III UV Exposure', plateType: 'Flash Photopolymer', dieSize: '50x20mm default' })
      );
      upsertSpec.run('SPEC-109', 'PROD-07', 'Trodat 4912 Self-Inking Address Stamp (50x20mm)', 'Trodat 4912 Casing + Flash Polymer Die', '50x20mm self-inking stamp, 3-4 lines of text, refillable pad', 'Nos', 160, 450, 18, '9611', 1);
      upsertSpec.run('SPEC-SLM-072', 'PROD-07', 'Trodat 4926 Large Rectangular Stamp (75x38mm)', 'Trodat 4926 Casing + Flash Polymer Die', 'Large 75x38mm stamp, logo + text, 6-8 lines', 'Nos', 240, 650, 18, '9611', 0);
      upsertSpec.run('SPEC-SLM-073', 'PROD-07', 'Round Seal Stamp 40mm (Company / Notary)', 'Trodat Round Casing + Round Die', '40mm round company seal stamp, logo and name around border', 'Nos', 180, 500, 18, '9611', 0);

      upsertProd.run(
        'PROD-SLM-02', 'PRD-SLW-01', 'Wax / Embossed Notary Seal', 'SLM-WAX-38MM', null,
        'Stamp & Seal',
        'Traditional notary embosser and wax seal stamps for legal documents. Embossed seal leaves a raised impression. Available in desktop and handheld models.',
        'Nos', 1200, 500, 18, '9611', 1, 'FIXED',
        JSON.stringify([{ type: 'Type', options: ['Desktop Embosser (38mm)', 'Handheld Embosser (38mm)', 'Wax Seal Stamp (Custom)'] }]),
        '{}');
      upsertSpec.run('SPEC-SLM-021', 'PROD-SLM-02', 'Desktop Notary Embosser Seal (38mm Die)', 'Desktop Embosser + Custom Engraved Die', '38mm desktop embosser with engraved seal die, raised impression', 'Nos', 500, 1200, 18, '9611', 1);

      // =====================================================================
      // CATEGORY 9: CALENDARS & STATIONERY
      // =====================================================================
      upsertProd.run(
        'PROD-BC-01', 'PRD-BC-01', 'Premium Visiting Cards (Yield-Based Pricing)', 'BC-MATTE-300', '8901234500036',
        'Commercial Print',
        'Standard 3.5 x 2 inch executive visiting cards printed on 300 GSM art card with matte thermal lamination. Priced per card based on print yield calculator.',
        'Pcs', 3.50, 1.25, 18, '4911', 100, 'YIELD_CALCULATOR',
        JSON.stringify([{ type: 'GSM', options: ['300 GSM Art Card', '350 GSM Art Card', '400 GSM Velvet Board'] }, { type: 'Finishing', options: ['Matte Lamination', 'Gloss Lamination', 'Raised Spot UV + Velvet', 'Gold Foil Stamping'] }, { type: 'Corners', options: ['Square Cut', 'Round Corners (6mm radius)'] }]),
        '{}'
      );

      upsertProd.run(
        'PROD-CAL-01', 'PRD-TCL-01', 'Table Calendar (13 Sheets + Cover)', 'CAL-TBL-13SH', null,
        'Calendars & Stationery',
        'Full-colour 12+1 sheet customised table calendars on 250gsm art card. Wire-O spiral bound with kickstand. Ideal for corporate gifting and brand promotion.',
        'Pcs', 95, 38, 18, '4911', 10, 'SLAB',
        JSON.stringify([{ type: 'Size', options: ['A5 (14.8x21cm)', 'A4 (21x29.7cm)', '5x7 inch'] }, { type: 'Binding', options: ['Wire-O Spiral', 'Staple Bound', 'Open (Loose Sheets)'] }]),
        JSON.stringify({ sheets: 13, kickstand: true })
      );
      upsertSpec.run('SPEC-CAL-011', 'PROD-CAL-01', 'A4 Table Calendar (13 Sheets + Cover, Wire-O)', '250gsm Art Card + Wire-O Binding', 'Full-colour A4 table calendar, 13 pages, wire-o spiral bound', 'Pcs', 38, 95, 18, '4911', 1);
      upsertSpec.run('SPEC-CAL-012', 'PROD-CAL-01', 'A5 Pocket Table Calendar (13 Sheets, Wire-O)', '250gsm Art Card + Wire-O Binding A5', 'Compact A5 wire-o table calendar, ideal for desk use', 'Pcs', 28, 65, 18, '4911', 0);
      upsertSlab.run('SLAB-CAL-1', 'PROD-CAL-01', null, 10, 49, 95, 38, '10-50 Pcs');
      upsertSlab.run('SLAB-CAL-2', 'PROD-CAL-01', null, 50, 199, 75, 30, '50-200 Pcs');
      upsertSlab.run('SLAB-CAL-3', 'PROD-CAL-01', null, 200, null, 55, 22, '200+ Corporate');

      upsertProd.run(
        'PROD-CAL-02', 'PRD-WCL-01', 'Wall Calendar (12 Months Single Sheet)', 'CAL-WLL-12SH', null,
        'Calendars & Stationery',
        'Single-sheet or booklet style 12-month wall calendar. Customised with client branding. Printed on 150-200gsm art paper with wire-o or string hanger.',
        'Pcs', 45, 18, 18, '4911', 25, 'SLAB',
        JSON.stringify([{ type: 'Format', options: ['12-Sheet Booklet (A3)', 'Single Sheet (12-Month)', 'Poster Calendar (A2)'] }]),
        '{}');
      upsertSpec.run('SPEC-CAL-021', 'PROD-CAL-02', 'A3 12-Sheet Wall Calendar (Wire-O)', '150gsm Art Paper + Wire-O + A3 Size', 'Full-colour 12-page A3 wall calendar, wire-o bound', 'Pcs', 18, 45, 18, '4911', 1);
      upsertSlab.run('SLAB-WCL-1', 'PROD-CAL-02', null, 25, 99, 45, 18, '25-100 Pcs');
      upsertSlab.run('SLAB-WCL-2', 'PROD-CAL-02', null, 100, null, 32, 13, '100+ Corporate Run');

      // =====================================================================
      // CATEGORY 10: DIGITAL PHOTO PRINT
      // =====================================================================
      upsertProd.run(
        'PROD-PHT-01', 'PRD-PHT-01', 'Photograph / Digital Photo Print (Gloss)', 'PHT-GLS-4X6', null,
        'Digital Photo Print',
        'High-fidelity digital photo printing on premium Fuji / Kodak photo paper. Available from 4x6 wallet size to 20x30 inch large format. Matte, gloss and lustre finishes.',
        'Pcs', 5, 1.8, 18, '4911', 1, 'FIXED',
        JSON.stringify([{ type: 'Size', options: ['4x6" (10x15cm)', '5x7" (13x18cm)', '8x10" (20x25cm)', '10x15" (25x38cm)', '12x18" (30x45cm)', '20x30" (50x75cm)'] }, { type: 'Finish', options: ['Gloss', 'Matte', 'Lustre (Silk)'] }]),
        JSON.stringify({ printer: 'Fujifilm Frontier / Epson SureLab', inkType: 'Silver Halide / Pigment' })
      );
      upsertSpec.run('SPEC-PHT-011', 'PROD-PHT-01', '4x6" Gloss Photo Print (10x15cm)', 'Fuji Pro Crystal Archive Gloss Paper', 'Standard 4x6 glossy photo print on professional photo paper', 'Pcs', 1.8, 5, 18, '4911', 1);
      upsertSpec.run('SPEC-PHT-012', 'PROD-PHT-01', '8x10" Lustre/Silk Photo Print (20x25cm)', 'Fuji Professional Lustre Paper 8x10"', 'Professional 8x10 lustre finish portrait photo print', 'Pcs', 6, 18, 18, '4911', 0);

      // =====================================================================
      // Update Balloons product
      // =====================================================================
      upsertProd.run(
        'PROD-BLN-01', 'PRD-BLN-01', 'Custom Screen Printed Latex Balloons', 'BLN-LTX-9IN', '8901234500029',
        'Promotional Items',
        '100% biodegradable natural latex balloons with 1 to 4 colour screen printing. Available in 9" and 12" round. For brand events, exhibitions, retail launches and parties.',
        'Pcs', 10, 2.5, 18, '9505', 100, 'SLAB',
        JSON.stringify([{ type: 'Color', options: ['Assorted Standard', 'Metallic Silver', 'Metallic Gold', 'Pastel Pink', 'Royal Blue', 'Neon'] }, { type: 'Size', options: ['9 Inch Standard', '12 Inch Large'] }, { type: 'Print', options: ['1 Colour Logo', '2 Colour', '4 Colour CMYK'] }]),
        '{}'
      );

      database.prepare('INSERT INTO schema_migrations (migration_name) VALUES (?)').run(mig021Name);
    });
    try {
      tx021(db);
      console.log('✅ Applied migration: 021_full_printing_shop_catalogue');
    } catch(e) {
      console.error('❌ Migration 021 failed:', e.message);
    }
  }

  // -------------------------------------------------------------------------
  // MIGRATION 022: Designer Desk, Mixed Item Pricing Responsibility & Sales Queue
  // -------------------------------------------------------------------------
  applyMigration('022_designer_desk_and_pricing_queue', (database) => {
    // 1. Designer Customer Sessions Table
    database.exec(`
      CREATE TABLE IF NOT EXISTS designer_sessions (
        id TEXT PRIMARY KEY,
        session_number TEXT UNIQUE NOT NULL,
        session_status TEXT DEFAULT 'Active',
        customer_id TEXT,
        customer_name TEXT,
        customer_mobile TEXT,
        customer_email TEXT,
        designer_id TEXT,
        designer_name TEXT NOT NULL,
        sales_order_id TEXT,
        order_number TEXT,
        design_requirements TEXT,
        session_notes TEXT,
        draft_items_json TEXT,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ended_at TEXT,
        last_active_at TEXT DEFAULT CURRENT_TIMESTAMP,
        version INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (designer_id) REFERENCES employees(id) ON DELETE SET NULL,
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_designer_sessions_cust ON designer_sessions(customer_id);
      CREATE INDEX IF NOT EXISTS idx_designer_sessions_des ON designer_sessions(designer_id);
      CREATE INDEX IF NOT EXISTS idx_designer_sessions_order ON designer_sessions(sales_order_id);
      CREATE INDEX IF NOT EXISTS idx_designer_sessions_status ON designer_sessions(session_status);
    `);

    // 2. Document Sequence for Sessions
    try {
      database.prepare(`
        INSERT OR IGNORE INTO document_sequences (doc_type, prefix, current_number, padding)
        VALUES ('SES', 'SES-', 100, 4)
      `).run();
    } catch (e) {}

    // 3. Alter sales_order_items for flexible mixed pricing responsibility
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN pricing_responsibility TEXT DEFAULT 'SALES'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN pricing_status TEXT DEFAULT 'COMPLETE'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN item_added_by_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN item_added_by_name TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN item_added_by_role TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN price_added_by_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN price_added_by_name TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN price_added_by_role TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN manager_approval_status TEXT DEFAULT 'NOT_REQUIRED'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN manager_approved_by_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN manager_approved_by_name TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN is_amendment INTEGER DEFAULT 0").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN parent_item_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN design_notes TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_order_items ADD COLUMN artwork_notes TEXT").run(); } catch(e) {}

    // 4. Alter sales_orders for pending pricing & session tracking
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN designer_session_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN pricing_status TEXT DEFAULT 'COMPLETE'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN has_pending_pricing INTEGER DEFAULT 0").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN is_amendment INTEGER DEFAULT 0").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN parent_order_id TEXT").run(); } catch(e) {}

    // 5. Alter products for designer pricing permissions
    try { database.prepare("ALTER TABLE products ADD COLUMN allow_designer_pricing INTEGER DEFAULT 0").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE products ADD COLUMN default_pricing_responsibility TEXT DEFAULT 'SALES'").run(); } catch(e) {}

    // Grant designer pricing permission on standard fast-moving retail products
    try {
      database.prepare(`
        UPDATE products 
        SET allow_designer_pricing = 1, default_pricing_responsibility = 'DESIGNER'
        WHERE category IN ('Visiting Cards', 'Promotional Items', 'Mugs', 'Stationery', 'Stamps', 'Digital Prints')
           OR id IN ('PROD-VC-01', 'PROD-MUG-01', 'PROD-CMR-01', 'PROD-SLM-01')
           OR name LIKE '%Visiting Card%' OR name LIKE '%Mug%' OR name LIKE '%Stamp%'
      `).run();
    } catch (e) {}

    // 6. Alter artwork_versions for session linking & revision reasons
    try { database.prepare("ALTER TABLE artwork_versions ADD COLUMN session_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE artwork_versions ADD COLUMN revision_reason TEXT").run(); } catch(e) {}

    // 7. Seed Designer Desk & Pricing Permissions
    const deskPermissions = [
      { id: 'module.designer_desk', module: 'designer_desk', category: 'MODULE', name: 'Designer Desk Module', description: 'Access Designer Desk counter workspace & customer sessions', is_dangerous: 0, display_order: 16 },
      { id: 'designer.create_session', module: 'designer_desk', category: 'ACTION', name: 'Create Design Session', description: 'Start walk-in or phone customer design sessions', is_dangerous: 0, display_order: 36 },
      { id: 'designer.add_products', module: 'designer_desk', category: 'ACTION', name: 'Add Products to Order', description: 'Select products & configure specifications in session', is_dangerous: 0, display_order: 37 },
      { id: 'designer.enter_pricing', module: 'designer_desk', category: 'ACTION', name: 'Enter Permitted Pricing', description: 'Enter selling price for permitted retail products', is_dangerous: 0, display_order: 38 },
      { id: 'sales.pricing_queue', module: 'sales', category: 'ACTION', name: 'Sales Pricing Queue', description: 'Review design session items pending commercial pricing', is_dangerous: 0, display_order: 54 },
      { id: 'sales.enter_pricing', module: 'sales', category: 'ACTION', name: 'Set Selling Prices', description: 'Enter rates and apply discounts on pending order items', is_dangerous: 0, display_order: 55 },
      { id: 'manager.approve_pricing', module: 'sales', category: 'ACTION', name: 'Approve Special Pricing', description: 'Authorize manager pricing overrides or discounts', is_dangerous: 1, display_order: 56 },
      { id: 'manager.approve_amendment', module: 'sales', category: 'ACTION', name: 'Approve Order Amendments', description: 'Authorize additional work on confirmed orders', is_dangerous: 1, display_order: 57 }
    ];

    const insertPerm = database.prepare(`
      INSERT OR REPLACE INTO permissions (id, module, category, name, description, is_dangerous, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    deskPermissions.forEach(p => insertPerm.run(p.id, p.module, p.category, p.name, p.description, p.is_dangerous, p.display_order));

    // Assign to roles
    const insertRolePerm = database.prepare(`
      INSERT OR IGNORE INTO role_permissions (id, role_id, permission_id)
      VALUES (?, ?, ?)
    `);

    const rolePermAssignments = [
      { roleId: 'ROLE-ADMIN', perms: deskPermissions.map(p => p.id) },
      { roleId: 'ROLE-MGT', perms: ['module.designer_desk', 'sales.pricing_queue', 'sales.enter_pricing', 'manager.approve_pricing', 'manager.approve_amendment'] },
      { roleId: 'ROLE-SALES', perms: ['module.designer_desk', 'sales.pricing_queue', 'sales.enter_pricing'] },
      { roleId: 'ROLE-DESIGNER', perms: ['module.designer_desk', 'designer.create_session', 'designer.add_products', 'designer.enter_pricing'] }
    ];

    rolePermAssignments.forEach(({ roleId, perms }) => {
      perms.forEach(permId => {
        insertRolePerm.run(`RP-${roleId}-${permId}`, roleId, permId);
      });
    });
  });

  console.log('✅ All migrations processed successfully!');
}

/**
 * Atomic sequence generator: returns next formatted sequence code
 */
export function generateNextSequence(database, docType) {
  const row = database.prepare(`
    UPDATE document_sequences
    SET current_number = current_number + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE doc_type = ?
    RETURNING prefix, current_number, padding
  `).get(docType);

  if (!row) {
    const fallbackNumber = Math.floor(1000 + Math.random() * 9000);
    return `${docType}-${fallbackNumber}`;
  }

  const padded = String(row.current_number).padStart(row.padding, '0');
  return `${row.prefix}${padded}`;
}

/**
 * Post a validated double-entry journal voucher to the authoritative database
 */
export function postDoubleEntryJournal(database, {
  voucherNumber,
  voucherType = 'Journal Entry',
  date = new Date().toISOString().split('T')[0],
  refNo = '',
  referenceType = 'MANUAL',
  referenceId = null,
  narration = '',
  createdByUserId = null,
  createdByName = 'System',
  entries = []
}) {
  if (!entries || entries.length < 2) {
    throw new Error('A journal voucher must contain at least 2 entries (one debit and one credit)');
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const e of entries) {
    const amt = Number(e.amount || 0);
    if (isNaN(amt) || amt <= 0) {
      throw new Error(`Invalid entry amount for account ${e.accountName}: ${e.amount}`);
    }
    if (e.entryType === 'DEBIT') totalDebit += amt;
    else if (e.entryType === 'CREDIT') totalCredit += amt;
    else throw new Error(`Invalid entry type ${e.entryType}. Must be DEBIT or CREDIT.`);
  }

  totalDebit = Number(totalDebit.toFixed(2));
  totalCredit = Number(totalCredit.toFixed(2));

  // Validate double-entry equality with 5-cent rounding tolerance for complex tax splits
  if (Math.abs(totalDebit - totalCredit) > 0.05) {
    throw new Error(`Double-entry unbalanced: Total Debit (₹${totalDebit}) != Total Credit (₹${totalCredit})`);
  }

  const voucherId = `JV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const vNum = voucherNumber || generateNextSequence(database, 'JV');

  const tx = database.transaction(() => {
    database.prepare(`
      INSERT INTO journal_vouchers (
        id, voucher_number, voucher_type, voucher_date, ref_no, reference_type, reference_id, narration, created_by_user_id, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(voucherId, vNum, voucherType, date, refNo, referenceType, referenceId, narration, createdByUserId, createdByName);

    const insertEntry = database.prepare(`
      INSERT INTO journal_entries (id, voucher_id, account_name, account_group, entry_type, amount, customer_id, supplier_id, order_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      insertEntry.run(
        `JE-${voucherId}-${i + 1}`,
        voucherId,
        e.accountName,
        e.accountGroup || 'Assets',
        e.entryType,
        Number(e.amount),
        e.customerId || null,
        e.supplierId || null,
        e.orderId || null,
        e.notes || ''
      );
    }
  });

  tx();
  return { success: true, voucherId, voucherNumber: vNum, totalDebit, totalCredit };
}


