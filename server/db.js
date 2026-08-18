import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure persistent database directory exists
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'erp.sqlite');
console.log(`📁 Persistent Local SQLite Database Path: ${dbPath}`);

const db = new Database(dbPath);

// Enable WAL mode & Foreign Key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema tables
export function initDatabase() {
  db.exec(`
    -- 1. Company Profile
    CREATE TABLE IF NOT EXISTS company_profile (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT,
      gstin TEXT,
      state TEXT,
      state_code TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      address TEXT,
      bank_name TEXT,
      account_no TEXT,
      ifsc TEXT,
      branch TEXT,
      upi_id TEXT,
      terms_conditions TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Customers
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_code TEXT UNIQUE,
      name TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      address TEXT,
      gst_number TEXT,
      customer_type TEXT DEFAULT 'Retail',
      notes TEXT,
      outstanding REAL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);

    -- 3. Products
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      product_code TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      unit TEXT DEFAULT 'Sq.Ft',
      default_rate REAL DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      gst_rate REAL DEFAULT 18,
      hsn_code TEXT DEFAULT '9989',
      default_vendor TEXT,
      default_material TEXT,
      is_custom INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Product Material Specifications
    CREATE TABLE IF NOT EXISTS product_specifications (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      spec_name TEXT NOT NULL,
      material_name TEXT,
      selling_price REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      unit TEXT DEFAULT 'Sq.Ft',
      description TEXT,
      is_default INTEGER DEFAULT 0,
      gst_rate REAL DEFAULT 18,
      hsn_code TEXT DEFAULT '9989',
      status TEXT DEFAULT 'Active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_product_specs_pid ON product_specifications(product_id);

    -- 5. Suppliers / Outsource Vendors
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      supplier_code TEXT UNIQUE,
      name TEXT NOT NULL,
      category TEXT,
      mobile TEXT,
      email TEXT,
      address TEXT,
      gstin TEXT,
      pending_payment REAL DEFAULT 0,
      avg_turnaround_days INTEGER DEFAULT 2,
      notes TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. Sales Persons & Care Of
    CREATE TABLE IF NOT EXISTS sales_persons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      commission_rate REAL DEFAULT 3.5,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS care_of_persons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      commission_rate REAL DEFAULT 2.0,
      active INTEGER DEFAULT 1
    );

    -- 7. Employees / Workers / Designers
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT NOT NULL,
      role TEXT,
      department TEXT,
      mobile TEXT,
      email TEXT,
      base_salary REAL DEFAULT 0,
      incentive_rate REAL DEFAULT 0,
      commission_rate REAL DEFAULT 0,
      joined_date TEXT,
      active INTEGER DEFAULT 1
    );

    -- 8. Sales Orders
    CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE,
      customer_id TEXT,
      customer_name TEXT NOT NULL,
      sales_person_id TEXT,
      sales_person_name TEXT,
      care_of_id TEXT,
      care_of_name TEXT,
      reference_no TEXT,
      order_date TEXT NOT NULL,
      due_date TEXT,
      production_status TEXT DEFAULT 'New',
      payment_status TEXT DEFAULT 'Pending',
      subtotal REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_total REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      advance_amount REAL DEFAULT 0,
      balance_amount REAL DEFAULT 0,
      delivered_by TEXT,
      signature_url TEXT,
      whatsapp_sent INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_cust ON sales_orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_date ON sales_orders(order_date DESC);

    -- 9. Sales Order Line Items (With Historical Product Snapshots)
    CREATE TABLE IF NOT EXISTS sales_order_items (
      id TEXT PRIMARY KEY,
      sales_order_id TEXT NOT NULL,
      product_id TEXT,
      product_name_snapshot TEXT NOT NULL,
      job_card_id TEXT,
      custom_title TEXT,
      spec_id TEXT,
      spec_name TEXT,
      material TEXT,
      description TEXT,
      width REAL DEFAULT 0,
      height REAL DEFAULT 0,
      qty REAL DEFAULT 1,
      unit TEXT DEFAULT 'Sq.Ft',
      selling_rate REAL DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      tax_type TEXT DEFAULT 'GST_18',
      gst_rate REAL DEFAULT 18,
      hsn_code TEXT DEFAULT '9989',
      amount REAL DEFAULT 0,
      designer_required TEXT DEFAULT 'NO',
      designer_id TEXT,
      designer_name TEXT,
      design_status TEXT DEFAULT 'Pending',
      artwork_status TEXT DEFAULT 'Pending',
      artwork_url TEXT,
      outsource INTEGER DEFAULT 0,
      vendor_id TEXT,
      vendor_name TEXT,
      estimated_vendor_cost REAL DEFAULT 0,
      actual_vendor_bill REAL DEFAULT 0,
      vendor_bill_date TEXT,
      vendor_payment_status TEXT DEFAULT 'Pending',
      printer_id TEXT,
      printer_name TEXT,
      finisher_id TEXT,
      finisher_name TEXT,
      delivery_worker_id TEXT,
      production_status TEXT DEFAULT 'New',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON sales_order_items(sales_order_id);

    -- 10. Job Work Records
    CREATE TABLE IF NOT EXISTS job_work (
      id TEXT PRIMARY KEY,
      job_number TEXT UNIQUE,
      sales_order_id TEXT NOT NULL,
      sales_order_item_id TEXT NOT NULL,
      job_type TEXT,
      description TEXT,
      quantity REAL DEFAULT 1,
      status TEXT DEFAULT 'New',
      assigned_to TEXT,
      start_date TEXT,
      expected_date TEXT,
      completed_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (sales_order_item_id) REFERENCES sales_order_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_job_work_order ON job_work(sales_order_id);

    -- 11. Outsource Jobs (Supports Multiple Outsource Jobs per Sales Order!)
    CREATE TABLE IF NOT EXISTS outsource_jobs (
      id TEXT PRIMARY KEY,
      outsource_number TEXT UNIQUE,
      sales_order_id TEXT NOT NULL,
      sales_order_item_id TEXT,
      supplier_id TEXT,
      supplier_name TEXT NOT NULL,
      work_description TEXT,
      quantity REAL DEFAULT 1,
      outsource_cost REAL DEFAULT 0,
      expected_date TEXT,
      sent_date TEXT,
      received_date TEXT,
      status TEXT DEFAULT 'SENT',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outsource_order ON outsource_jobs(sales_order_id);

    -- 12. Worker Job Incentives Ledger (0.5% Profit Incentive)
    CREATE TABLE IF NOT EXISTS worker_job_incentives (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      item_id TEXT,
      job_card_id TEXT,
      product_name TEXT,
      worker_id TEXT,
      worker_name TEXT NOT NULL,
      role_stage TEXT NOT NULL,
      job_amount REAL DEFAULT 0,
      job_profit REAL DEFAULT 0,
      incentive_pct REAL DEFAULT 0.5,
      incentive_amount REAL DEFAULT 0,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_worker_inc_order ON worker_job_incentives(order_id);

    -- 13. Payments & Receipts
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      customer_id TEXT,
      customer_name TEXT,
      amount REAL DEFAULT 0,
      method TEXT,
      ref_no TEXT,
      status TEXT DEFAULT 'Completed',
      paid_date TEXT DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

    -- 14. Attendance
    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      type TEXT,
      status TEXT,
      ot_hours REAL DEFAULT 0,
      check_in TEXT,
      check_out TEXT,
      working_hours REAL DEFAULT 0,
      late_status TEXT DEFAULT 'On Time',
      notes TEXT
    );

    -- 15. Payroll
    CREATE TABLE IF NOT EXISTS payroll (
      id TEXT PRIMARY KEY,
      month TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      role TEXT,
      base_salary REAL DEFAULT 0,
      working_days INTEGER DEFAULT 30,
      days_present INTEGER DEFAULT 0,
      earned_base_pay REAL DEFAULT 0,
      ot_hours REAL DEFAULT 0,
      ot_pay REAL DEFAULT 0,
      incentive_earned REAL DEFAULT 0,
      advance_deduction REAL DEFAULT 0,
      late_deduction REAL DEFAULT 0,
      net_salary REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
      paid_date TEXT,
      payment_mode TEXT
    );

    -- 16. Inventory Stock
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      current_stock REAL DEFAULT 0,
      unit TEXT DEFAULT 'Pcs',
      reorder_level REAL DEFAULT 10,
      unit_cost REAL DEFAULT 0
    );

    -- 17. Purchase Orders
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      vendor_name TEXT NOT NULL,
      order_date TEXT,
      status TEXT DEFAULT 'Issued',
      total_amount REAL DEFAULT 0,
      items TEXT
    );

    -- 18. Biometric Devices (ZKTeco K90)
    CREATE TABLE IF NOT EXISTS biometric_devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT DEFAULT 'ZKTeco K90',
      ip_address TEXT,
      port INTEGER DEFAULT 4370,
      location TEXT,
      status TEXT DEFAULT 'Online',
      last_sync_time TEXT,
      total_users INTEGER DEFAULT 0
    );

    -- 19. Biometric Device User Mappings (K90 Users <-> ERP Employees)
    CREATE TABLE IF NOT EXISTS biometric_user_mappings (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      biometric_user_id TEXT NOT NULL,
      biometric_name TEXT,
      card_no TEXT,
      verification_type TEXT DEFAULT 'Fingerprint / Password',
      privilege TEXT DEFAULT 'User',
      device_status TEXT DEFAULT 'Active',
      employee_id TEXT,
      mapping_status TEXT DEFAULT 'Unmapped',
      matched_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      FOREIGN KEY (device_id) REFERENCES biometric_devices(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_biometric_device_user ON biometric_user_mappings(device_id, biometric_user_id);

    -- 20. Unmapped Biometric Attendance Punches
    CREATE TABLE IF NOT EXISTS unmapped_biometric_punches (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      biometric_user_id TEXT NOT NULL,
      biometric_name TEXT,
      punch_time TEXT NOT NULL,
      status TEXT DEFAULT 'Pending HR Action',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Call schema initialization
initDatabase();

export default db;
