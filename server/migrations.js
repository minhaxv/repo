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

  console.log('✅ All migrations processed successfully!');
}

