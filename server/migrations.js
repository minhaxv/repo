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

    const initialMachinesList = [
      { id: 'MCH-01', code: 'ROLAND-640', name: 'Roland TrueVIS VG3-640', model: 'VG3-640 Dual Head 8-Color', process_category: 'Digital Printing', hourly_rate: 450, status: 'Active', runtime_hours: 1840, location: 'Digital Bay A', assigned_operator_id: 'EMP-106', assigned_operator_name: 'Vikas Patil' },
      { id: 'MCH-02', code: 'STARFLEX-3200', name: 'StarFlex Grand 3200', model: 'SF-3200 Konica 512i 4-Head', process_category: 'Flex Printing', hourly_rate: 650, status: 'Active', runtime_hours: 2950, location: 'Heavy Media Bay 1', assigned_operator_id: 'EMP-106', assigned_operator_name: 'Vikas Patil' },
      { id: 'MCH-03', code: 'HP-INDIGO-12K', name: 'HP Indigo 12000 Digital Press', model: 'Indigo 12000 7-Color Digital Offset', process_category: 'Digital Production', hourly_rate: 1200, status: 'Active', runtime_hours: 3420, location: 'Clean Press Room B', assigned_operator_id: 'EMP-107', assigned_operator_name: 'Rajesh Nair' },
      { id: 'MCH-04', code: 'MIMAKI-UV-2513', name: 'Mimaki JFX200-2513 UV Flatbed', model: 'JFX200-2513 EX LED-UV 8x4ft', process_category: 'UV Printing', hourly_rate: 850, status: 'Active', runtime_hours: 1210, location: 'UV Fabrication Floor', assigned_operator_id: 'EMP-110', assigned_operator_name: 'Sunil Vishwakarma' },
      { id: 'MCH-05', code: 'LASERCRAFT-1390', name: 'LaserCraft CO2 Laser Cutter', model: 'LC-1390 Reci 150W Glass Tube', process_category: 'Cutting', hourly_rate: 350, status: 'Active', runtime_hours: 890, location: 'CNC & Acrylic Room', assigned_operator_id: 'EMP-112', assigned_operator_name: 'Rakesh Yadav' },
      { id: 'MCH-06', code: 'POLAR-78', name: 'Polar 78 Guillotine High-Speed Cutter', model: 'Polar Mohr 78 EM High Precision', process_category: 'Finishing', hourly_rate: 300, status: 'Active', runtime_hours: 4120, location: 'Post-Press & Finishing Floor', assigned_operator_id: 'EMP-107', assigned_operator_name: 'Sunil Finishing' },
      { id: 'MCH-07', code: 'ROYAL-65', name: 'Royal 65" Automatic Heat Laminator', model: 'Royal Sovereign 1650 Cold/Warm', process_category: 'Lamination', hourly_rate: 250, status: 'Active', runtime_hours: 2150, location: 'Finishing Floor', assigned_operator_id: 'EMP-107', assigned_operator_name: 'Sunil Finishing' }
    ];

    const insertMch = database.prepare(`
      INSERT OR IGNORE INTO machines (id, code, name, model, process_category, hourly_rate, status, runtime_hours, location, assigned_operator_id, assigned_operator_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    initialMachinesList.forEach(m => {
      insertMch.run(m.id, m.code, m.name, m.model, m.process_category, m.hourly_rate, m.status, m.runtime_hours, m.location, m.assigned_operator_id, m.assigned_operator_name);
    });

    // 4. Extend Sales Orders with Quotation and Concurrency tracking
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN order_type TEXT DEFAULT 'Direct'").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN quotation_status TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN converted_from_quotation_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN converted_order_id TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN converted_at TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN converted_by TEXT").run(); } catch(e) {}
    try { database.prepare("ALTER TABLE sales_orders ADD COLUMN credit_limit_override INTEGER DEFAULT 0").run(); } catch(e) {}

    // 5. Extend Customers with Credit Limit
    try { database.prepare("ALTER TABLE customers ADD COLUMN credit_limit REAL DEFAULT 50000").run(); } catch(e) {}

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


