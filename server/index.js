import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { sseHandler, publishEvent } from './events.js';
import { loginUser, authenticateToken, requireRole, requirePermission, hasPermission, logAuditEvent } from './auth.js';
import { calculateOrderTotals, calculateLineItem } from './billingEngine.js';
import { consumeInventoryForItem, recordInventoryTransaction, TRANSACTION_TYPES } from './inventoryEngine.js';
import {
  initialCompanyProfile,
  initialCustomers,
  initialSalesPersons,
  initialCareOfPersons,
  initialWorkers,
  initialDesigners,
  initialVendors,
  initialProducts,
  initialSalesOrders,
  initialInventory,
  initialPurchaseOrders,
  initialPayments,
  initialAttendance,
  initialPayroll,
  initialProductMaterialSpecs,
  initialEmployees,
  initialWorkerJobIncentives,
  initialProductionProcesses,
  initialProductionTasks
} from '../src/data/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ type: ['text/*', 'application/octet-stream'] }));
app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {}
  }
  next();
});

// Seed initial mock data if database is empty on first run
function seedInitialDataIfEmpty() {
  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (customerCount > 0) {
    console.log('✅ Local SQLite database already populated. Preserving existing records.');
    return;
  }

  console.log('🌱 Database is empty. Performing one-time initial seed from mock dataset...');

  const seedTx = db.transaction(() => {
    // 1. Company Profile
    db.prepare(`
      INSERT OR REPLACE INTO company_profile (id, name, tagline, gstin, state, state_code, phone, email, website, address, bank_name, account_no, ifsc, branch, upi_id, terms_conditions)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      initialCompanyProfile.name,
      initialCompanyProfile.tagline,
      initialCompanyProfile.gstin,
      initialCompanyProfile.state,
      initialCompanyProfile.stateCode,
      initialCompanyProfile.phone,
      initialCompanyProfile.email,
      initialCompanyProfile.website,
      initialCompanyProfile.address,
      initialCompanyProfile.bankName,
      initialCompanyProfile.accountNo,
      initialCompanyProfile.ifsc,
      initialCompanyProfile.branch,
      initialCompanyProfile.upiId,
      initialCompanyProfile.termsConditions
    );

    // 2. Customers
    const insertCustomer = db.prepare(`
      INSERT INTO customers (id, customer_code, name, mobile, additional_mobiles, email, address, gst_number, customer_type, notes, outstanding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of initialCustomers) {
      const addMobiles = Array.isArray(c.additionalMobiles) ? JSON.stringify(c.additionalMobiles) : (c.additionalMobiles ? JSON.stringify([c.additionalMobiles]) : '[]');
      insertCustomer.run(c.id, c.code || c.id, c.name, c.mobile, addMobiles, c.email || '', c.address || '', c.gstin || c.gstNumber || '', c.customerType || 'Retail', c.notes || '', c.outstandingAmount || c.outstanding || 0);
    }

    // 3. Suppliers / Vendors
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (id, supplier_code, name, category, mobile, email, address, gstin, pending_payment, avg_turnaround_days, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const v of initialVendors) {
      insertSupplier.run(v.id, v.code || v.id, v.name, v.category || 'Vendor', v.mobile || '', v.email || '', v.address || '', v.gstin || '', v.pendingPayment || 0, v.avgTurnaroundDays || 2, v.notes || '');
    }

    // 4. Sales Persons & Care Of
    const insertSP = db.prepare(`INSERT INTO sales_persons (id, name, mobile, email, commission_rate) VALUES (?, ?, ?, ?, ?)`);
    for (const sp of initialSalesPersons) {
      insertSP.run(sp.id, sp.name, sp.mobile || '', sp.email || '', sp.commissionRate || 3.5);
    }

    const insertCO = db.prepare(`INSERT INTO care_of_persons (id, name, mobile, email, commission_rate) VALUES (?, ?, ?, ?, ?)`);
    for (const co of initialCareOfPersons) {
      insertCO.run(co.id, co.name, co.mobile || '', co.email || '', co.commissionRate || 2.0);
    }

    // 5. Employees
    const insertEmp = db.prepare(`
      INSERT INTO employees (id, code, name, role, department, mobile, email, base_salary, incentive_rate, commission_rate, joined_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const emp of initialEmployees) {
      insertEmp.run(emp.id, emp.code || emp.id, emp.name, emp.role || '', emp.department || '', emp.mobile || '', emp.email || '', emp.baseSalary || 0, emp.incentiveRate || 0, emp.commissionRate || 0, emp.joinedDate || '');
    }

    // 6. Products
    const insertProduct = db.prepare(`
      INSERT INTO products (id, product_code, name, category, description, unit, default_rate, estimated_cost, gst_rate, hsn_code, default_vendor, default_material, is_custom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of initialProducts) {
      insertProduct.run(p.id, p.code || p.id, p.name, p.category || 'Printing', p.description || '', p.unit || 'Sq.Ft', p.defaultRate || 0, p.estimatedCost || 0, p.gstRate || 18, p.hsnCode || '9989', p.defaultVendor || '', p.defaultMaterial || '', p.isCustom ? 1 : 0);
    }

    // 7. Product Material Specs
    const insertSpec = db.prepare(`
      INSERT INTO product_specifications (id, product_id, spec_name, material_name, selling_price, cost_price, unit, description, is_default, gst_rate, hsn_code, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const s of initialProductMaterialSpecs) {
      insertSpec.run(s.id, s.productId, s.specName, s.materialName || s.specName, s.sellingPrice || 0, s.costPrice || 0, s.unit || 'Sq.Ft', s.description || '', s.isDefault ? 1 : 0, s.gstRate || 18, s.hsnCode || '9989', s.status || 'Active');
    }

    // 8. Sales Orders, Items, Job Work, Outsource Jobs
    const insertOrder = db.prepare(`
      INSERT INTO sales_orders (id, order_number, customer_id, customer_name, sales_person_id, sales_person_name, care_of_id, care_of_name, reference_no, order_date, due_date, production_status, payment_status, subtotal, discount, tax_total, grand_total, advance_amount, balance_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertOrderItem = db.prepare(`
      INSERT INTO sales_order_items (id, sales_order_id, product_id, product_name_snapshot, job_card_id, custom_title, spec_id, spec_name, material, description, width, height, qty, unit, selling_rate, estimated_cost, actual_cost, discount, tax_type, gst_rate, hsn_code, amount, designer_required, designer_id, designer_name, design_status, artwork_status, artwork_url, outsource, vendor_id, vendor_name, estimated_vendor_cost, actual_vendor_bill, printer_id, printer_name, finisher_id, finisher_name, delivery_worker_id, production_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertJobWork = db.prepare(`
      INSERT INTO job_work (id, job_number, sales_order_id, sales_order_item_id, job_type, description, quantity, status, assigned_to, start_date, expected_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertOutsourceJob = db.prepare(`
      INSERT INTO outsource_jobs (id, outsource_number, sales_order_id, sales_order_item_id, supplier_id, supplier_name, work_description, quantity, outsource_cost, expected_date, sent_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const o of initialSalesOrders) {
      insertOrder.run(
        o.id, o.id, o.customerId || '', o.customerName, o.salesPersonId || '', o.salesPersonName || '', o.careOfId || '', o.careOfName || '', o.referenceNo || '', o.orderDate, o.deliveryDate || '', o.productionStatus || 'New', o.paymentStatus || 'Pending', o.subtotal || 0, o.discount || 0, o.taxTotal || 0, o.grandTotal || 0, o.advanceAmount || 0, o.balanceAmount || 0, o.notes || ''
      );

      if (o.items && o.items.length > 0) {
        for (const item of o.items) {
          const itemId = item.id || `ITEM-${o.id}-${Math.random().toString(36).substr(2, 5)}`;
          const jobCardId = item.jobCardId || `JC-${o.id}-${itemId}`;

          insertOrderItem.run(
            itemId, o.id, item.productId || '', item.productName || 'Printing Item', jobCardId, item.customTitle || '', item.specId || '', item.specName || '', item.material || '', item.description || '', item.width || 0, item.height || 0, item.qty || 1, item.unit || 'Sq.Ft', item.sellingRate || 0, item.estimatedCost || 0, item.actualCost || 0, item.discount || 0, item.taxType || 'GST_18', item.gstRate || 18, item.hsnCode || '9989', item.amount || 0, item.designerRequired || 'NO', item.designerId || '', item.designerName || '', item.designStatus || 'Pending', item.artworkStatus || 'Pending', item.artworkUrl || '', item.outsource ? 1 : 0, item.vendorId || '', item.vendorName || '', item.estimatedVendorCost || 0, item.actualVendorBill || 0, item.printerId || '', item.printerName || '', item.finisherId || '', item.finisherName || '', item.deliveryWorkerId || '', item.productionStatus || o.productionStatus || 'New'
          );

          // Job work entry
          insertJobWork.run(
            `JW-${jobCardId}`, `JW-${jobCardId}`, o.id, itemId, item.productName, item.description || item.material || 'Printing job', item.qty || 1, item.productionStatus || 'New', item.printerName || item.designerName || 'Unassigned', o.orderDate, o.deliveryDate || ''
          );

          // Outsource job entry if outsourced
          if (item.outsource) {
            insertOutsourceJob.run(
              `OUT-${jobCardId}`, `OUT-${jobCardId}`, o.id, itemId, item.vendorId || '', item.vendorName || 'Outsource Vendor', item.productName, item.qty || 1, item.estimatedVendorCost || 0, o.deliveryDate || '', o.orderDate, 'SENT'
            );
          }
        }
      }
    }

    // 9. Worker Job Incentives Ledger
    const insertIncentive = db.prepare(`
      INSERT INTO worker_job_incentives (id, order_id, item_id, job_card_id, product_name, worker_id, worker_name, role_stage, job_amount, job_profit, incentive_pct, incentive_amount, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const inc of initialWorkerJobIncentives) {
      insertIncentive.run(inc.id, inc.orderId, inc.itemId || '', inc.jobCardId || '', inc.productName || '', inc.workerId || '', inc.workerName, inc.roleStage, inc.jobAmount || 0, inc.jobProfit || 0, inc.incentivePct || 0.5, inc.incentiveAmount || 0, inc.completedAt || new Date().toISOString());
    }

    // 10. Payments
    const insertPayment = db.prepare(`
      INSERT INTO payments (id, order_id, customer_id, customer_name, amount, method, ref_no, status, paid_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of initialPayments) {
      insertPayment.run(p.id, p.orderId || '', p.customerId || '', p.customerName || '', p.amount || 0, p.method || 'Cash', p.refNo || '', p.status || 'Completed', p.paidDate || new Date().toISOString());
    }
  });

  seedTx();
  console.log('✅ Initial database seed completed successfully!');
}

// Seed biometric devices & user mappings if empty
function seedBiometricDataIfEmpty() {
  const deviceCount = db.prepare('SELECT COUNT(*) as count FROM biometric_devices').get().count;
  if (deviceCount > 0) return;

  console.log('🤖 Seeding initial ZKTeco K90 Biometric Device and User Mappings...');

  const bioTx = db.transaction(() => {
    db.prepare(`
      INSERT INTO biometric_devices (id, name, model, ip_address, port, location, status, last_sync_time, total_users)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('DEV-K90-01', 'ZKTeco K90 (Front Office)', 'ZKTeco K90 Standalone', '192.168.1.201', 4370, 'Head Office Gate 1', 'Online', '2026-08-14 10:30 AM', 6);

    const insertUser = db.prepare(`
      INSERT INTO biometric_user_mappings (id, device_id, biometric_user_id, biometric_name, card_no, verification_type, privilege, device_status, employee_id, mapping_status, matched_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Fetch existing employees to match correctly
    const emp101 = db.prepare("SELECT id FROM employees WHERE name LIKE '%Muhammad%' OR id = 'EMP-101'").get()?.id || 'EMP-101';
    const emp102 = db.prepare("SELECT id FROM employees WHERE name LIKE '%Priya%' OR id = 'EMP-102'").get()?.id || 'EMP-102';
    const emp103 = db.prepare("SELECT id FROM employees WHERE name LIKE '%Anas%' OR id = 'EMP-103'").get()?.id || 'EMP-103';

    insertUser.run('BIO-MAP-01', 'DEV-K90-01', '25', 'Muhammad', '10045231', 'Fingerprint / Password', 'User', 'Active', emp101, 'Matched', 'Existing Mapping');
    insertUser.run('BIO-MAP-02', 'DEV-K90-01', '26', 'Shihab', '10045232', 'Fingerprint / Card', 'User', 'Active', null, 'Unmapped', 'Unmapped');
    insertUser.run('BIO-MAP-03', 'DEV-K90-01', '27', 'Anas', '10045233', 'Fingerprint', 'User', 'Active', emp103, 'Matched', 'Existing Mapping');
    insertUser.run('BIO-MAP-04', 'DEV-K90-01', '28', 'Priya Patel', '10045234', 'Fingerprint / Card', 'User', 'Active', emp102, 'Matched', 'Exact Name Match');
    insertUser.run('BIO-MAP-05', 'DEV-K90-01', '29', 'Vikas Patil', '10045235', 'Fingerprint', 'User', 'Active', null, 'Unmapped', 'Unmapped');
    insertUser.run('BIO-MAP-06', 'DEV-K90-01', '30', 'Biometric User 30', '10045236', 'Card Only', 'User', 'Disabled', null, 'Unmapped', 'Unmapped');
  });

  bioTx();
  console.log('✅ ZKTeco K90 Biometric Device Users seeded successfully!');
}

// Seed production processes and multi-task logs if empty
function seedProductionDataIfEmpty() {
  try {
    // 1. Ensure all initial employees (including Afsal, Niyas, Rahman, Sameer) exist in employees table
    const insertEmp = db.prepare(`
      INSERT OR IGNORE INTO employees (id, code, name, role, department, mobile, email, base_salary, incentive_rate, commission_rate, joined_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const emp of initialEmployees) {
      insertEmp.run(
        emp.id,
        emp.code || emp.id,
        emp.name,
        emp.role || '',
        emp.department || '',
        emp.mobile || '',
        emp.email || '',
        Number(emp.basicSalary || emp.baseSalary || 0),
        Number(emp.incentiveRate || 0),
        Number(emp.commissionRate || 0),
        emp.joiningDate || emp.joinedDate || ''
      );
    }

    // 2. Check production processes
    const processCount = db.prepare('SELECT COUNT(*) as count FROM production_processes').get().count;
    if (processCount === 0) {
      console.log('🏭 Seeding Production Processes Master...');
      const insertProc = db.prepare(`
        INSERT INTO production_processes (id, code, name, category, description, default_unit, is_active, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const procTx = db.transaction(() => {
        for (const p of initialProductionProcesses) {
          insertProc.run(p.id, p.code, p.name, p.category || 'Production', p.description || '', p.defaultUnit || 'Nos', p.isActive ? 1 : 0, p.sortOrder || 0);
        }
      });
      procTx();
      console.log('✅ Production Processes Master seeded successfully!');
    }

    // 3. Check production tasks
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM production_tasks').get().count;
    if (taskCount === 0) {
      console.log('📋 Seeding Multi-Task Production Work Logs...');
      const insertTask = db.prepare(`
        INSERT INTO production_tasks (
          id, task_date, employee_id, employee_name, order_id, order_number, customer_name,
          item_id, item_title, process_id, process_name, quantity, unit, start_time, end_time,
          total_duration_minutes, status, priority, remarks, machine_id, machine_name, department,
          production_location, original_qty, completed_qty, rejected_qty, rework_qty, final_qty,
          qc_status, created_by, completed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertTimeLog = db.prepare(`
        INSERT INTO production_task_time_logs (id, task_id, action, timestamp, logged_by, notes, elapsed_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const taskTx = db.transaction(() => {
        for (const t of initialProductionTasks) {
          insertTask.run(
            t.id, t.taskDate || new Date().toISOString().split('T')[0], t.employeeId, t.employeeName,
            t.orderId, t.orderNumber, t.customerName || '', t.itemId || '', t.itemTitle || '',
            t.processId || '', t.processName, Number(t.quantity || 1), t.unit || 'Nos',
            t.startTime || '', t.endTime || '', Number(t.totalDurationMinutes || 0),
            t.status || 'Pending', t.priority || 'Normal', t.remarks || '',
            t.machineId || '', t.machineName || '', t.department || 'Production',
            t.productionLocation || '', Number(t.originalQty || t.quantity || 1),
            Number(t.completedQty || 0), Number(t.rejectedQty || 0), Number(t.reworkQty || 0),
            Number(t.finalQty || t.quantity || 1), t.qcStatus || 'Pending',
            t.createdBy || 'Admin User', t.completedBy || ''
          );

          if (t.timeLogs && Array.isArray(t.timeLogs)) {
            for (let idx = 0; idx < t.timeLogs.length; idx++) {
              const tl = t.timeLogs[idx];
              insertTimeLog.run(
                tl.id || `TL-${t.id}-${idx + 1}`, t.id, tl.action, tl.timestamp || new Date().toISOString(),
                tl.loggedBy || t.employeeName, tl.notes || '', Number(tl.elapsedSeconds || 0)
              );
            }
          }
        }
      });
      taskTx();
      console.log('✅ Multi-Task Production Work Logs seeded successfully!');
    }
  } catch (err) {
    console.error('⚠️ Production seed warning:', err.message);
  }
}

// Perform seed checks on startup
seedInitialDataIfEmpty();
seedBiometricDataIfEmpty();
seedProductionDataIfEmpty();

/* ==========================================================================
   REST API ENDPOINTS — PERSISTENT SQLITE OPERATIONAL LAYER
   ========================================================================== */

// Helper to format biometric user mapping
function formatBiometricUser(u) {
  return {
    id: u.id,
    deviceId: u.device_id,
    biometricUserId: u.biometric_user_id,
    biometricName: u.biometric_name,
    cardNo: u.card_no,
    verificationType: u.verification_type,
    privilege: u.privilege,
    deviceStatus: u.device_status,
    employeeId: u.employee_id,
    employeeName: u.employee_name,
    employeeCode: u.employee_code,
    department: u.department,
    designation: u.designation,
    employeeStatus: u.employee_status,
    mappingStatus: u.mapping_status,
    matchedBy: u.matched_by,
    createdAt: u.created_at,
    updatedAt: u.updated_at
  };
}

// ============================================================================
// 0. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
// ============================================================================
app.get('/api/events', sseHandler);

// ============================================================================
// 0B. AUTHENTICATION ENDPOINTS (JWT / HMAC Token Verification)
// ============================================================================
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Username and password are required' } });
    }
    const result = loginUser(db, username, password);
    if (!result.success) {
      return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: result.message } });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// 1. GET ALL ERP DATA AT ONCE
app.get('/api/all', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    const hasSalaryAccess = user && (user.role === 'Admin' || user.role === 'Manager' || user.role === 'Accounts' || hasPermission(user, 'VIEW_ACCOUNTS'));

    const companyProfile = db.prepare('SELECT * FROM company_profile WHERE id = 1').get() || {};
    const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
    const products = db.prepare('SELECT * FROM products ORDER BY name ASC').all();
    const productMaterialSpecs = db.prepare('SELECT * FROM product_specifications').all();
    const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all();
    const salesPersons = db.prepare('SELECT * FROM sales_persons').all();
    const careOfPersons = db.prepare('SELECT * FROM care_of_persons').all();
    const employees = db.prepare('SELECT * FROM employees').all();

    const biometricDevices = db.prepare('SELECT * FROM biometric_devices').all();
    const rawBioUsers = db.prepare(`
      SELECT m.*, e.name as employee_name, e.code as employee_code, e.department, 
             COALESCE(e.designation, e.role, '') as designation, 
             COALESCE(e.status, CASE WHEN e.active = 1 THEN 'Active' ELSE 'Inactive' END) as employee_status
      FROM biometric_user_mappings m
      LEFT JOIN employees e ON m.employee_id = e.id
      ORDER BY CAST(m.biometric_user_id AS INTEGER) ASC
    `).all();
    
    // Format orders with items
    const orders = db.prepare('SELECT * FROM sales_orders ORDER BY created_at DESC').all();
    const items = db.prepare('SELECT * FROM sales_order_items').all();
    
    const formattedOrders = orders.map(o => {
      const orderItems = items.filter(i => i.sales_order_id === o.id).map(i => ({
        id: i.id,
        productId: i.product_id,
        productName: i.product_name_snapshot,
        jobCardId: i.job_card_id,
        customTitle: i.custom_title,
        specId: i.spec_id,
        specName: i.spec_name,
        material: i.material,
        description: i.description,
        width: Number(i.width),
        height: Number(i.height),
        qty: Number(i.qty),
        unit: i.unit,
        sellingRate: Number(i.selling_rate),
        estimatedCost: Number(i.estimated_cost),
        actualCost: Number(i.actual_cost),
        discount: Number(i.discount),
        taxType: i.tax_type,
        gstRate: Number(i.gst_rate),
        hsnCode: i.hsn_code,
        amount: Number(i.amount),
        designerRequired: i.designer_required,
        designerId: i.designer_id,
        designerName: i.designer_name,
        designStatus: i.design_status,
        artworkStatus: i.artwork_status,
        artworkUrl: i.artwork_url,
        outsource: Boolean(i.outsource),
        vendorId: i.vendor_id,
        vendorName: i.vendor_name,
        estimatedVendorCost: Number(i.estimated_vendor_cost),
        actualVendorBill: Number(i.actual_vendor_bill),
        printerId: i.printer_id,
        printerName: i.printer_name,
        finisherId: i.finisher_id,
        finisherName: i.finisher_name,
        deliveryWorkerId: i.delivery_worker_id,
        productionStatus: i.production_status
      }));

      return {
        id: o.id,
        orderDate: o.order_date,
        deliveryDate: o.due_date,
        customerId: o.customer_id,
        customerName: o.customer_name,
        salesPersonId: o.sales_person_id,
        salesPersonName: o.sales_person_name,
        careOfId: o.care_of_id,
        careOfName: o.care_of_name,
        referenceNo: o.reference_no,
        productionStatus: o.production_status,
        paymentStatus: o.payment_status,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        taxTotal: Number(o.tax_total),
        cgst: Number(o.cgst || 0),
        sgst: Number(o.sgst || 0),
        igst: Number(o.igst || 0),
        roundOff: Number(o.round_off || 0),
        taxMode: o.tax_mode || 'EXCLUSIVE',
        grandTotal: Number(o.grand_total),
        advanceAmount: Number(o.advance_amount),
        balanceAmount: Number(o.balance_amount),
        deliveredBy: o.delivered_by,
        billedByStaff: o.billed_by_staff || o.sales_person_name || 'Admin User',
        billedByStaffId: o.billed_by_id || o.sales_person_id || '',
        billedByRole: o.billed_by_role || 'Sales / Billing Staff',
        billedAt: o.billed_at || o.order_date || '',
        signatureUrl: o.signature_url,
        whatsappSent: Boolean(o.whatsapp_sent),
        notes: o.notes,
        version: o.version || 1,
        items: orderItems
      };
    });

    const jobWork = db.prepare('SELECT * FROM job_work ORDER BY created_at DESC').all();
    const outsourceJobs = db.prepare('SELECT * FROM outsource_jobs ORDER BY created_at DESC').all();
    const workerJobIncentives = db.prepare('SELECT * FROM worker_job_incentives ORDER BY completed_at DESC').all();
    const payments = db.prepare('SELECT * FROM payments ORDER BY paid_date DESC').all();

    // Multi-Task Employee Production & Work Logs
    const rawProcesses = db.prepare('SELECT * FROM production_processes ORDER BY sort_order ASC, name ASC').all();
    const rawTasks = db.prepare('SELECT * FROM production_tasks ORDER BY task_date DESC, created_at DESC').all();
    const rawTimeLogs = db.prepare('SELECT * FROM production_task_time_logs ORDER BY timestamp ASC').all();

    const formattedTasks = rawTasks.map(t => ({
      id: t.id,
      taskDate: t.task_date,
      employeeId: t.employee_id,
      employeeName: t.employee_name,
      orderId: t.order_id,
      orderNumber: t.order_number,
      customerName: t.customer_name,
      itemId: t.item_id,
      itemTitle: t.item_title,
      processId: t.process_id,
      processName: t.process_name,
      quantity: Number(t.quantity || 1),
      unit: t.unit || 'Nos',
      startTime: t.start_time || '',
      endTime: t.end_time || '',
      totalDurationMinutes: Number(t.total_duration_minutes || 0),
      status: t.status || 'Pending',
      priority: t.priority || 'Normal',
      remarks: t.remarks || '',
      machineId: t.machine_id || '',
      machineName: t.machine_name || '',
      department: t.department || 'Production',
      productionLocation: t.production_location || '',
      originalQty: Number(t.original_qty || t.quantity || 1),
      completedQty: Number(t.completed_qty || 0),
      rejectedQty: Number(t.rejected_qty || 0),
      reworkQty: Number(t.rework_qty || 0),
      finalQty: Number(t.final_qty || t.quantity || 1),
      attachmentUrl: t.attachment_url || '',
      supervisor: t.supervisor || '',
      qcStatus: t.qc_status || 'Pending',
      createdBy: t.created_by || '',
      createdAt: t.created_at,
      completedBy: t.completed_by || '',
      completedAt: t.completed_at || '',
      timeLogs: rawTimeLogs.filter(tl => tl.task_id === t.id).map(tl => ({
        id: tl.id,
        action: tl.action,
        timestamp: tl.timestamp,
        loggedBy: tl.logged_by,
        notes: tl.notes,
        elapsedSeconds: Number(tl.elapsed_seconds || 0)
      }))
    }));

    res.json({
      success: true,
      companyProfile,
      customers: customers.map(c => {
        let addMobiles = [];
        try {
          if (c.additional_mobiles) {
            addMobiles = typeof c.additional_mobiles === 'string' ? JSON.parse(c.additional_mobiles) : c.additional_mobiles;
          }
        } catch (e) {
          addMobiles = c.additional_mobiles ? [c.additional_mobiles] : [];
        }
        return {
          ...c,
          code: c.customer_code,
          gstin: c.gst_number,
          additionalMobiles: Array.isArray(addMobiles) ? addMobiles : [],
          outstandingAmount: Number(c.outstanding),
          version: c.version || 1
        };
      }),
      products: products.map(p => ({ ...p, code: p.product_code, defaultRate: Number(p.default_rate), estimatedCost: Number(p.estimated_cost), gstRate: Number(p.gst_rate), isCustom: Boolean(p.is_custom) })),
      productMaterialSpecs: productMaterialSpecs.map(s => ({ ...s, productId: s.product_id, specName: s.spec_name, materialName: s.material_name, sellingPrice: Number(s.selling_price), costPrice: Number(s.cost_price), isDefault: Boolean(s.is_default) })),
      vendors: suppliers.map(s => ({ ...s, code: s.supplier_code, pendingPayment: Number(s.pending_payment), avgTurnaroundDays: Number(s.avg_turnaround_days) })),
      salesPersons: salesPersons.map(sp => ({ ...sp, commissionRate: Number(sp.commission_rate) })),
      careOfPersons: careOfPersons.map(co => ({ ...co, commissionRate: Number(co.commission_rate) })),
      employees: employees.map(e => ({
        ...e,
        baseSalary: hasSalaryAccess ? Number(e.base_salary) : null,
        incentiveRate: hasSalaryAccess ? Number(e.incentive_rate) : null,
        commissionRate: hasSalaryAccess ? Number(e.commission_rate) : null
      })),
      biometricDevices: biometricDevices.map(d => ({ id: d.id, name: d.name, model: d.model, ipAddress: d.ip_address, port: d.port, location: d.location, status: d.status, lastSyncTime: d.last_sync_time, totalUsers: d.total_users })),
      biometricUsers: rawBioUsers.map(formatBiometricUser),
      salesOrders: formattedOrders,
      jobWork,
      outsourceJobs,
      workerJobIncentives: workerJobIncentives.map(inc => ({
        id: inc.id,
        orderId: inc.order_id,
        itemId: inc.item_id,
        jobCardId: inc.job_card_id,
        productName: inc.product_name,
        workerId: inc.worker_id,
        workerName: inc.worker_name,
        roleStage: inc.role_stage,
        jobAmount: Number(inc.job_amount),
        jobProfit: Number(inc.job_profit),
        incentivePct: Number(inc.incentive_pct),
        incentiveAmount: Number(inc.incentive_amount),
        completedAt: inc.completed_at
      })),
      payments: payments.map(p => ({ ...p, orderId: p.order_id, customerId: p.customer_id, customerName: p.customer_name, paidDate: p.paid_date, refNo: p.ref_no })),
      productionProcesses: rawProcesses.map(p => ({ ...p, isActive: Boolean(p.is_active), sortOrder: Number(p.sort_order || 0) })),
      productionTasks: formattedTasks,
      expenses: db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC').all(),
      inventory: db.prepare('SELECT * FROM inventory ORDER BY name ASC').all(),
      inventoryTransactions: db.prepare('SELECT * FROM inventory_transactions ORDER BY created_at DESC LIMIT 100').all(),
      reworkTickets: db.prepare('SELECT * FROM rework_tickets ORDER BY created_at DESC').all(),
      auditLogs: db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all(),
      deliveryNotes: db.prepare('SELECT * FROM delivery_notes ORDER BY created_at DESC').all(),
      deliveryItems: db.prepare('SELECT * FROM delivery_items ORDER BY created_at DESC').all(),
      artworkVersions: db.prepare('SELECT * FROM artwork_versions ORDER BY version_number DESC').all(),
      users: db.prepare('SELECT id, employee_id, username, email, role, department, status, last_login FROM users').all()
    });
  } catch (err) {
    console.error("GET /api/all Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CREATE PRODUCT + SPECS
app.post('/api/products', (req, res) => {
  try {
    const { product, specs } = req.body;
    if (!product || !product.name) {
      return res.status(400).json({ success: false, error: "Product name is required" });
    }

    const productId = product.id || `PRD-${Date.now()}`;
    const productCode = product.code || productId;

    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO products (id, product_code, name, category, description, unit, default_rate, estimated_cost, gst_rate, hsn_code, default_vendor, default_material, is_custom)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        productId, productCode, product.name, product.category || 'Printing', product.description || '', product.unit || 'Sq.Ft', Number(product.defaultRate || 0), Number(product.estimatedCost || 0), Number(product.gstRate || 18), product.hsnCode || '9989', product.defaultVendor || '', product.defaultMaterial || '', product.isCustom ? 1 : 0
      );

      if (specs && Array.isArray(specs)) {
        const insertSpec = db.prepare(`
          INSERT INTO product_specifications (id, product_id, spec_name, material_name, selling_price, cost_price, unit, description, is_default, gst_rate, hsn_code, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of specs) {
          const specId = s.id || `SPEC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          insertSpec.run(specId, productId, s.specName, s.materialName || s.specName, Number(s.sellingPrice || 0), Number(s.costPrice || 0), s.unit || product.unit || 'Sq.Ft', s.description || '', s.isDefault ? 1 : 0, Number(s.gstRate || 18), s.hsnCode || '9989', s.status || 'Active');
        }
      }
    });

    createTx();
    res.json({ success: true, productId });
  } catch (err) {
    console.error("POST /api/products Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE PRODUCT
app.put('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { product, specs } = req.body;
    if (!product || !product.name) {
      return res.status(400).json({ success: false, error: "Product name is required" });
    }

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE products SET
          name = ?,
          category = ?,
          description = ?,
          unit = ?,
          default_rate = ?,
          estimated_cost = ?,
          gst_rate = ?,
          hsn_code = ?,
          default_vendor = ?,
          default_material = ?
        WHERE id = ?
      `).run(
        product.name,
        product.category || 'Printing',
        product.description || '',
        product.unit || 'Sq.Ft',
        Number(product.defaultRate || product.default_rate || 0),
        Number(product.estimatedCost || product.estimated_cost || 0),
        Number(product.gstRate || product.gst_rate || 18),
        product.hsnCode || product.hsn_code || '9989',
        product.defaultVendor || product.default_vendor || '',
        product.defaultMaterial || product.default_material || '',
        id
      );

      if (specs && Array.isArray(specs)) {
        db.prepare('DELETE FROM product_specifications WHERE product_id = ?').run(id);
        const insertSpec = db.prepare(`
          INSERT INTO product_specifications (id, product_id, spec_name, material_name, selling_price, cost_price, unit, description, is_default, gst_rate, hsn_code, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const s of specs) {
          const specId = s.id || `SPEC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
          insertSpec.run(specId, id, s.specName, s.materialName || s.specName, Number(s.sellingPrice || 0), Number(s.costPrice || 0), s.unit || product.unit || 'Sq.Ft', s.description || '', s.isDefault ? 1 : 0, Number(s.gstRate || 18), s.hsnCode || '9989', s.status || 'Active');
        }
      }
    });

    updateTx();
    res.json({ success: true, message: `Product ${id} updated` });
  } catch (err) {
    console.error("PUT /api/products/:id Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE PRODUCT
app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM product_specifications WHERE product_id = ?').run(id);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true, message: `Product ${id} deleted` });
  } catch (err) {
    console.error("DELETE /api/products Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. CREATE CUSTOMER
app.post('/api/customers', (req, res) => {
  try {
    const c = req.body;
    const id = c.id || `CUST-${Date.now()}`;
    const addMobiles = Array.isArray(c.additionalMobiles) ? JSON.stringify(c.additionalMobiles) : (c.additionalMobiles ? JSON.stringify([c.additionalMobiles]) : '[]');
    db.prepare(`
      INSERT INTO customers (id, customer_code, name, mobile, additional_mobiles, email, address, gst_number, customer_type, notes, outstanding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, c.code || id, c.name, c.mobile || '', addMobiles, c.email || '', c.address || '', c.gstin || c.gstNumber || '', c.customerType || 'Retail', c.notes || '', Number(c.outstandingAmount || c.outstanding || 0)
    );
    res.json({ success: true, customerId: id });
  } catch (err) {
    console.error("POST /api/customers Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.1 UPDATE CUSTOMER
app.put('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const c = req.body;
    const addMobiles = Array.isArray(c.additionalMobiles) ? JSON.stringify(c.additionalMobiles) : (c.additionalMobiles ? JSON.stringify([c.additionalMobiles]) : '[]');
    db.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name),
        mobile = COALESCE(?, mobile),
        additional_mobiles = COALESCE(?, additional_mobiles),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        gst_number = COALESCE(?, gst_number),
        customer_type = COALESCE(?, customer_type),
        notes = COALESCE(?, notes),
        outstanding = COALESCE(?, outstanding),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      c.name, c.mobile, addMobiles, c.email, c.address, c.gstin || c.gstNumber, c.type || c.customerType, c.notes, c.outstandingAmount !== undefined ? Number(c.outstandingAmount) : (c.outstanding !== undefined ? Number(c.outstanding) : null), id
    );
    res.json({ success: true });
  } catch (err) {
    console.error("PUT /api/customers/:id Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. ATOMIC SALES ORDER CREATION (Order + Items + JobWork + Multiple Outsource Jobs + Advance Payment)
app.post('/api/sales-orders', authenticateToken, (req, res) => {
  try {
    const orderData = req.body;
    const { orderHeader, items, advanceAmount, paymentMethod } = orderData;
    const user = req.user;

    if (!orderHeader || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: "Order details and at least 1 line item are required" });
    }

    const orderId = orderHeader.id || `SO-${Date.now()}`;
    const orderNumber = orderHeader.orderNumber || orderId;

    // Validate Customer FK existence
    let validCustomerId = null;
    let customerRecord = null;
    if (orderHeader.customerId) {
      customerRecord = db.prepare('SELECT * FROM customers WHERE id = ?').get(orderHeader.customerId);
      if (customerRecord) validCustomerId = orderHeader.customerId;
    }

    // Authoritative calculation via central billing engine
    const totals = calculateOrderTotals({
      ...orderHeader,
      advanceAmount: Number(advanceAmount || orderHeader.advanceAmount || 0),
      paymentMethod: paymentMethod || orderHeader.paymentMethod
    }, items, customerRecord);

    const createOrderTx = db.transaction(() => {
      // 1. Insert Sales Order
      db.prepare(`
        INSERT INTO sales_orders (
          id, order_number, customer_id, customer_name, sales_person_id, sales_person_name,
          care_of_id, care_of_name, reference_no, order_date, due_date, production_status,
          payment_status, subtotal, discount, tax_total, cgst, sgst, igst, round_off,
          tax_mode, grand_total, advance_amount, balance_amount, notes, billed_by_staff,
          billed_by_id, billed_by_role, billed_at, created_by_user_id, created_by_name, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        orderId,
        orderNumber,
        validCustomerId,
        orderHeader.customerName || 'Walk-in Customer',
        orderHeader.salesPersonId || '',
        orderHeader.salesPersonName || '',
        orderHeader.careOfId || '',
        orderHeader.careOfName || '',
        orderHeader.referenceNo || '',
        orderHeader.orderDate || new Date().toISOString().split('T')[0],
        orderHeader.deliveryDate || '',
        orderHeader.productionStatus || 'New',
        totals.paymentStatus,
        totals.subtotal,
        totals.discount,
        totals.taxTotal,
        totals.cgst,
        totals.sgst,
        totals.igst,
        totals.roundOff,
        orderHeader.taxMode || (totals.isInterstate ? 'INTERSTATE' : 'EXCLUSIVE'),
        totals.grandTotal,
        totals.advanceAmount,
        totals.balanceAmount,
        orderHeader.notes || '',
        user.name || orderHeader.billedByStaff || 'Staff',
        user.userId || user.id || '',
        user.role || 'Sales',
        orderHeader.billedAt || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        user.userId || user.id || null,
        user.name || null
      );

      // 2. Insert Items, Job Work, and Outsource Jobs
      const insertItem = db.prepare(`
        INSERT INTO sales_order_items (
          id, sales_order_id, product_id, product_name_snapshot, job_card_id, custom_title,
          spec_id, spec_name, material, description, width, height, qty, unit, selling_rate,
          estimated_cost, actual_cost, discount, tax_type, gst_rate, hsn_code, amount,
          designer_required, designer_id, designer_name, design_status, artwork_status,
          artwork_url, outsource, vendor_id, vendor_name, estimated_vendor_cost, printer_id,
          printer_name, finisher_id, finisher_name, production_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertJob = db.prepare(`
        INSERT INTO job_work (id, job_number, sales_order_id, sales_order_item_id, job_type, description, quantity, status, assigned_to, start_date, expected_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertOutsource = db.prepare(`
        INSERT INTO outsource_jobs (id, outsource_number, sales_order_id, sales_order_item_id, supplier_id, supplier_name, work_description, quantity, outsource_cost, expected_date, sent_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let idx = 0; idx < totals.items.length; idx++) {
        const it = totals.items[idx];
        const itemId = it.id || `ITEM-${orderId}-${idx + 1}`;
        const jobCardId = it.jobCardId || `JC-${orderId}-${idx + 1}`;

        insertItem.run(
          itemId, orderId, it.productId || '', it.productName || 'Printing Item', jobCardId,
          it.customTitle || '', it.specId || '', it.specName || '', it.material || '',
          it.description || '', Number(it.width || 0), Number(it.height || 0), Number(it.qty || 1),
          it.unit || 'Sq.Ft', Number(it.sellingRate || 0), Number(it.estimatedCost || 0),
          Number(it.actualCost || 0), Number(it.discount || 0), it.taxType || 'ETR',
          Number(it.gstRate || 18), it.hsnCode || '9989', Number(it.lineTotal || it.amount || 0),
          it.designerRequired || 'NO', it.designerId || '', it.designerName || '',
          it.designStatus || 'Pending', it.artworkStatus || 'Pending', it.artworkUrl || '',
          it.outsource ? 1 : 0, it.vendorId || '', it.vendorName || '',
          Number(it.estimatedVendorCost || 0), it.printerId || '', it.printerName || '',
          it.finisherId || '', it.finisherName || '', it.productionStatus || 'New'
        );

        insertJob.run(
          `JW-${jobCardId}`, `JW-${jobCardId}`, orderId, itemId, it.productName,
          it.description || it.material || 'Printing job work', Number(it.qty || 1), 'New',
          it.printerName || it.designerName || 'Unassigned', orderHeader.orderDate, orderHeader.deliveryDate || ''
        );

        if (it.outsource) {
          const outsourceJobId = `OUT-${jobCardId}`;
          let validSupplierId = null;
          if (it.vendorId) {
            const suppExists = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(it.vendorId);
            if (suppExists) validSupplierId = it.vendorId;
          }
          insertOutsource.run(
            outsourceJobId, outsourceJobId, orderId, itemId, validSupplierId,
            it.vendorName || 'Outsource Vendor', `${it.productName} (${it.material || 'Custom Outsource'})`,
            Number(it.qty || 1), Number(it.estimatedVendorCost || 0), orderHeader.deliveryDate || '', orderHeader.orderDate, 'SENT'
          );
        }
      }

      // 3. Advance Payment Receipt
      if (totals.advanceAmount > 0) {
        db.prepare(`
          INSERT INTO payments (id, order_id, customer_id, customer_name, amount, method, ref_no, status, paid_date, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', CURRENT_TIMESTAMP, ?)
        `).run(
          `PAY-${orderId}-ADV`, orderId, validCustomerId, orderHeader.customerName || '',
          totals.advanceAmount, paymentMethod || 'Cash', 'Advance Deposit',
          `Advance received for Order #${orderNumber}`
        );
      }

      // 4. Update Customer balance in master
      if (validCustomerId) {
        db.prepare(`
          UPDATE customers
          SET outstanding = outstanding + ?,
              version = COALESCE(version, 1) + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(totals.balanceAmount, validCustomerId);
      }
    });

    createOrderTx();

    // Log audit event
    logAuditEvent(db, {
      user,
      action: 'ORDER_CREATED',
      module: 'SALES',
      recordId: orderId,
      recordNumber: orderNumber,
      details: {
        customer: orderHeader.customerName,
        grandTotal: totals.grandTotal,
        itemCount: items.length,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst
      }
    });

    publishEvent('ORDER_CREATED', {
      orderId,
      orderNumber,
      customerName: orderHeader.customerName,
      grandTotal: totals.grandTotal,
      billedByStaff: user.name || 'Staff'
    });

    res.json({ success: true, orderId, orderNumber, totals });
  } catch (err) {
    console.error("POST /api/sales-orders Error:", err.stack || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4B. NON-DESTRUCTIVE SALES ORDER UPDATE (With Concurrency Control)
app.put('/api/sales-orders/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const orderData = req.body;
    const { orderHeader, items } = orderData;

    const existing = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Sales order not found' });
    }

    // Optimistic locking concurrency check
    if (orderHeader?.version !== undefined && existing.version !== undefined && orderHeader.version !== existing.version) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONCURRENCY_CONFLICT',
          message: 'This sales order was updated by another workstation. Please refresh before saving.'
        }
      });
    }

    let customerRecord = null;
    if (orderHeader?.customerId || existing.customer_id) {
      customerRecord = db.prepare('SELECT * FROM customers WHERE id = ?').get(orderHeader?.customerId || existing.customer_id);
    }

    const itemsToCalculate = items && items.length > 0 ? items : db.prepare('SELECT * FROM sales_order_items WHERE sales_order_id = ?').all(id);
    const totals = calculateOrderTotals(orderHeader || existing, itemsToCalculate, customerRecord);

    const updateTx = db.transaction(() => {
      // 1. Update Order Header
      db.prepare(`
        UPDATE sales_orders SET
          customer_name = COALESCE(?, customer_name),
          due_date = COALESCE(?, due_date),
          production_status = COALESCE(?, production_status),
          notes = COALESCE(?, notes),
          subtotal = ?,
          discount = ?,
          tax_total = ?,
          cgst = ?,
          sgst = ?,
          igst = ?,
          round_off = ?,
          grand_total = ?,
          advance_amount = ?,
          balance_amount = ?,
          payment_status = ?,
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        orderHeader?.customerName || existing.customer_name,
        orderHeader?.deliveryDate || existing.due_date,
        orderHeader?.productionStatus || existing.production_status,
        orderHeader?.notes !== undefined ? orderHeader.notes : existing.notes,
        totals.subtotal,
        totals.discount,
        totals.taxTotal,
        totals.cgst,
        totals.sgst,
        totals.igst,
        totals.roundOff,
        totals.grandTotal,
        totals.advanceAmount,
        totals.balanceAmount,
        totals.paymentStatus,
        id
      );

      // 2. Adjust Customer outstanding if balance changed
      const oldBalance = Number(existing.balance_amount || 0);
      const balanceDelta = totals.balanceAmount - oldBalance;
      if (existing.customer_id && balanceDelta !== 0) {
        db.prepare(`
          UPDATE customers
          SET outstanding = outstanding + ?,
              version = COALESCE(version, 1) + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(balanceDelta, existing.customer_id);
      }
    });

    updateTx();

    logAuditEvent(db, {
      user,
      action: 'ORDER_UPDATED',
      module: 'SALES',
      recordId: id,
      recordNumber: existing.order_number || id,
      details: {
        previousGrandTotal: existing.grand_total,
        newGrandTotal: totals.grandTotal,
        version: existing.version + 1
      }
    });

    publishEvent('ORDER_UPDATED', { orderId: id, grandTotal: totals.grandTotal });
    res.json({ success: true, orderId: id, version: existing.version + 1, totals });
  } catch (err) {
    console.error("PUT /api/sales-orders/:id Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4C. ORDER CANCELLATION (With mandatory reason and role verification)
app.post('/api/sales-orders/:id/cancel', authenticateToken, requireRole(['Admin', 'Manager', 'Sales']), (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, error: 'A valid cancellation reason is required.' });
    }

    const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ success: false, error: 'Sales order not found' });

    const cancelTx = db.transaction(() => {
      db.prepare("UPDATE sales_orders SET production_status = 'Cancelled', version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      db.prepare("UPDATE sales_order_items SET production_status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE sales_order_id = ?").run(id);

      // Revert customer balance if balance was pending
      if (order.customer_id && Number(order.balance_amount || 0) > 0) {
        db.prepare(`
          UPDATE customers
          SET outstanding = MAX(0, outstanding - ?),
              version = COALESCE(version, 1) + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(Number(order.balance_amount), order.customer_id);
      }
    });

    cancelTx();

    logAuditEvent(db, {
      user,
      action: 'ORDER_CANCELLED',
      module: 'SALES',
      recordId: id,
      recordNumber: order.order_number || id,
      details: { reason, previousStatus: order.production_status }
    });

    publishEvent('ORDER_STATUS_CHANGED', { orderId: id, status: 'Cancelled' });
    res.json({ success: true, message: 'Order cancelled successfully' });
  } catch (err) {
    console.error("POST /api/sales-orders/:id/cancel Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. UPDATE PRODUCTION STATUS & AUTOMATED UNIT-AWARE MATERIAL CONSUMPTION
app.put('/api/sales-orders/:orderId/items/:itemId/production-status', authenticateToken, (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status, remarks = '' } = req.body;
    const user = req.user;

    const item = db.prepare('SELECT * FROM sales_order_items WHERE id = ? OR job_card_id = ?').get(itemId, itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Order item not found' });

    const updateTx = db.transaction(() => {
      db.prepare('UPDATE sales_order_items SET production_status = ? WHERE id = ?').run(status, item.id);
      db.prepare('UPDATE sales_orders SET production_status = ?, version = version + 1 WHERE id = ?').run(status, orderId);

      logAuditEvent(db, {
        user,
        action: 'ORDER_STATUS_CHANGED',
        module: 'PRODUCTION',
        recordId: orderId,
        recordNumber: orderId,
        details: { itemId: item.id, previousStatus: item.production_status, newStatus: status, remarks }
      });

      // Unit-Aware Inventory Consumption via central inventory engine
      if (status === 'Completed' || status === 'Ready for Delivery' || status === 'Delivered') {
        consumeInventoryForItem(db, item, user.name || 'Staff');
      }
    });

    updateTx();

    publishEvent('ORDER_STATUS_CHANGED', { orderId, itemId: item.id, status, actor: user.name });
    res.json({ success: true, status });
  } catch (err) {
    console.error("PUT production-status Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5B. ARTWORK VERSIONING & APPROVAL CONTROL
app.get('/api/sales-orders/:orderId/artwork', authenticateToken, (req, res) => {
  try {
    const { orderId } = req.params;
    const versions = db.prepare('SELECT * FROM artwork_versions WHERE order_id = ? ORDER BY version_number DESC').all(orderId);
    res.json({ success: true, versions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sales-orders/:orderId/items/:itemId/artwork', authenticateToken, (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const user = req.user;
    const { fileName, fileUrl, dimensions = '', colorMode = 'CMYK', dpi = 300, notes = '' } = req.body;

    if (!fileUrl) return res.status(400).json({ success: false, error: 'Artwork file URL is required' });

    const currentMax = db.prepare('SELECT MAX(version_number) as maxVer FROM artwork_versions WHERE item_id = ?').get(itemId);
    const nextVer = (currentMax?.maxVer || 0) + 1;
    const versionId = `ART-${itemId}-V${nextVer}`;

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO artwork_versions (
          id, order_id, item_id, version_number, file_name, file_url, dimensions,
          color_mode, dpi, proof_status, uploaded_by, uploaded_by_user_id, approval_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Proofing', ?, ?, ?)
      `).run(
        versionId, orderId, itemId, nextVer, fileName || `Artwork_v${nextVer}.pdf`, fileUrl,
        dimensions, colorMode, Number(dpi || 300), user.name || 'Staff', user.userId || user.id, notes
      );

      db.prepare(`
        UPDATE sales_order_items
        SET artwork_url = ?, artwork_status = 'Pending Proofing', design_status = 'Proof Sent'
        WHERE id = ?
      `).run(fileUrl, itemId);
    });

    tx();

    logAuditEvent(db, {
      user,
      action: 'ARTWORK_UPLOADED',
      module: 'DESIGN',
      recordId: versionId,
      recordNumber: `v${nextVer}`,
      details: { orderId, itemId, fileName }
    });

    publishEvent('ARTWORK_UPDATED', { orderId, itemId, versionId, versionNumber: nextVer });
    res.json({ success: true, versionId, versionNumber: nextVer });
  } catch (err) {
    console.error("POST artwork Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/artwork/:versionId/approve', authenticateToken, requireRole(['Admin', 'Manager', 'Designer', 'Sales']), (req, res) => {
  try {
    const { versionId } = req.params;
    const user = req.user;
    const { approvalNotes = '', approved = true } = req.body;

    const version = db.prepare('SELECT * FROM artwork_versions WHERE id = ?').get(versionId);
    if (!version) return res.status(404).json({ success: false, error: 'Artwork version not found' });

    const newProofStatus = approved ? 'Approved' : 'Rejected';

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE artwork_versions
        SET proof_status = ?,
            approved_by = ?,
            approved_by_user_id = ?,
            approved_at = CURRENT_TIMESTAMP,
            approval_notes = ?,
            production_ready = ?
        WHERE id = ?
      `).run(
        newProofStatus, user.name, user.userId || user.id, approvalNotes, approved ? 1 : 0, versionId
      );

      if (approved) {
        db.prepare(`
          UPDATE sales_order_items
          SET artwork_status = 'Approved', design_status = 'Completed', production_status = 'Ready for Printing'
          WHERE id = ?
        `).run(version.item_id);
      } else {
        db.prepare(`
          UPDATE sales_order_items
          SET artwork_status = 'Revision Requested', design_status = 'Revision'
          WHERE id = ?
        `).run(version.item_id);
      }
    });

    tx();

    logAuditEvent(db, {
      user,
      action: approved ? 'ARTWORK_APPROVED' : 'ARTWORK_REJECTED',
      module: 'DESIGN',
      recordId: versionId,
      details: { approved, notes: approvalNotes }
    });

    publishEvent('ARTWORK_STATUS_CHANGED', { versionId, proofStatus: newProofStatus });
    res.json({ success: true, proofStatus: newProofStatus });
  } catch (err) {
    console.error("POST approve artwork Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5C. PARTIAL DELIVERY MANAGEMENT
app.get('/api/deliveries', authenticateToken, (req, res) => {
  try {
    const notes = db.prepare('SELECT * FROM delivery_notes ORDER BY created_at DESC').all();
    const items = db.prepare('SELECT * FROM delivery_items ORDER BY created_at DESC').all();
    res.json({ success: true, deliveryNotes: notes, deliveryItems: items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/deliveries', authenticateToken, requireRole(['Admin', 'Manager', 'Delivery', 'Accounts']), (req, res) => {
  try {
    const user = req.user;
    const { orderId, deliveryType = 'Partial', vehicleNo = '', deliveryStaff = '', recipientName = '', recipientPhone = '', notes = '', items = [] } = req.body;

    const order = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Sales order not found' });

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one delivery line item is required' });
    }

    const deliveryId = `DN-${Date.now()}`;
    const deliveryNumber = `DN-${order.order_number || orderId}-${Date.now().toString().slice(-4)}`;

    const tx = db.transaction(() => {
      // 1. Insert Delivery Note
      db.prepare(`
        INSERT INTO delivery_notes (
          id, delivery_number, order_id, customer_id, customer_name, delivery_date,
          delivery_type, vehicle_no, delivery_staff, delivery_staff_id, recipient_name,
          recipient_phone, notes, status, created_by
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, 'Dispatched', ?)
      `).run(
        deliveryId, deliveryNumber, orderId, order.customer_id, order.customer_name,
        deliveryType, vehicleNo, deliveryStaff || user.name, user.userId || user.id,
        recipientName, recipientPhone, notes, user.name
      );

      // 2. Validate and Insert Delivery Items
      const insertDI = db.prepare(`
        INSERT INTO delivery_items (id, delivery_id, order_id, item_id, product_name, ordered_qty, dispatched_qty, remaining_qty, unit)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let allFullyDelivered = true;

      for (const it of items) {
        const lineItem = db.prepare('SELECT * FROM sales_order_items WHERE id = ?').get(it.itemId);
        if (!lineItem) continue;

        const orderedQty = Number(lineItem.qty || 1);
        // Calculate previously delivered qty
        const prevDeliveredRow = db.prepare('SELECT COALESCE(SUM(dispatched_qty), 0) as prevQty FROM delivery_items WHERE item_id = ?').get(it.itemId);
        const previouslyDispatched = Number(prevDeliveredRow?.prevQty || 0);
        const newDispatched = Number(it.dispatchedQty || 0);

        if (previouslyDispatched + newDispatched > orderedQty) {
          throw new Error(`Over-delivery error for ${lineItem.product_name_snapshot}: Ordered ${orderedQty}, previously dispatched ${previouslyDispatched}, attempted ${newDispatched}.`);
        }

        const remaining = Math.max(0, orderedQty - (previouslyDispatched + newDispatched));
        if (remaining > 0) allFullyDelivered = false;

        insertDI.run(
          `DI-${deliveryId}-${it.itemId}`, deliveryId, orderId, it.itemId,
          lineItem.product_name_snapshot, orderedQty, newDispatched, remaining, lineItem.unit || 'Nos'
        );
      }

      // Update Order Status if all items delivered
      if (allFullyDelivered) {
        db.prepare("UPDATE sales_orders SET production_status = 'Delivered', version = version + 1 WHERE id = ?").run(orderId);
      }
    });

    tx();

    logAuditEvent(db, {
      user,
      action: 'DELIVERY_DISPATCHED',
      module: 'DELIVERY',
      recordId: deliveryId,
      recordNumber: deliveryNumber,
      details: { orderId, recipientName, itemCount: items.length }
    });

    publishEvent('DELIVERY_DISPATCHED', { deliveryNumber, orderId });
    res.json({ success: true, deliveryId, deliveryNumber });
  } catch (err) {
    console.error("POST /api/deliveries Error:", err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5D. CUSTOMER BALANCE RECONCILIATION API
app.get('/api/customers/reconciliation', authenticateToken, (req, res) => {
  try {
    const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
    const reconciliation = customers.map(c => {
      const orders = db.prepare("SELECT * FROM sales_orders WHERE customer_id = ? AND production_status != 'Quotation'").all(c.id);
      const payments = db.prepare("SELECT * FROM payments WHERE customer_id = ?").all(c.id);

      const totalInvoiced = Number(orders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0).toFixed(2));
      const totalOrderBalance = Number(orders.reduce((sum, o) => sum + Number(o.balance_amount || 0), 0).toFixed(2));
      const totalPayments = Number(payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2));
      const storedBalance = Number(c.outstanding || 0);

      // Historical opening balance prior to current system orders
      const openingBalance = Number((storedBalance - totalOrderBalance).toFixed(2));
      const calculatedClosing = Number((openingBalance + totalOrderBalance).toFixed(2));
      const variance = Number((storedBalance - calculatedClosing).toFixed(2));

      return {
        customerId: c.id,
        customerCode: c.customer_code,
        customerName: c.name,
        openingBalance,
        totalInvoiced,
        totalPayments,
        totalOrderBalance,
        calculatedClosing,
        storedBalance,
        variance,
        orderCount: orders.length,
        paymentCount: payments.length,
        status: Math.abs(variance) < 0.01 ? 'RECONCILED' : 'DISCREPANCY_FLAGGED'
      };
    });

    res.json({ success: true, reconciliation });
  } catch (err) {
    console.error("GET /api/customers/reconciliation Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5E. DATABASE BACKUP AND RESTORE API (Admin Only)
app.post('/api/backup/create', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const user = req.user;
    const backupDir = path.join(__dirname, '..', 'database', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `erp_backup_${timestamp}.sqlite`;
    const backupPath = path.join(backupDir, backupFilename);

    await db.backup(backupPath);

    // Verify backup integrity
    const backupDb = new (db.constructor)(backupPath, { readonly: true });
    const check = backupDb.pragma('integrity_check');
    backupDb.close();

    const stats = fs.statSync(backupPath);

    logAuditEvent(db, {
      user,
      action: 'BACKUP_CREATED',
      module: 'SYSTEM',
      recordId: backupFilename,
      details: { sizeBytes: stats.size, integrity: check[0]?.integrity_check }
    });

    res.json({
      success: true,
      backup: {
        filename: backupFilename,
        sizeBytes: stats.size,
        createdAt: new Date().toISOString(),
        integrity: check[0]?.integrity_check || 'ok'
      }
    });
  } catch (err) {
    console.error("POST /api/backup/create Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/backup/list', authenticateToken, requireRole(['Admin']), (req, res) => {
  try {
    const backupDir = path.join(__dirname, '..', 'database', 'backups');
    if (!fs.existsSync(backupDir)) return res.json({ success: true, backups: [] });

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.sqlite'));
    const backups = files.map(f => {
      const p = path.join(backupDir, f);
      const stat = fs.statSync(p);
      return {
        filename: f,
        sizeBytes: stat.size,
        createdAt: stat.mtime.toISOString()
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


    // Broadcast Real-Time Production Status Change
    publishEvent('ORDER_STATUS_CHANGED', {
      orderId,
      itemId,
      status,
      actor
    });

    res.json({ success: true, status });
  } catch (err) {
    console.error("PUT production-status Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. RECORD WORKER INCENTIVE (0.5% Profit Incentive)
app.post('/api/worker-incentives', (req, res) => {
  try {
    const inc = req.body;
    const incId = inc.id || `INC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    db.prepare(`
      INSERT INTO worker_job_incentives (id, order_id, item_id, job_card_id, product_name, worker_id, worker_name, role_stage, job_amount, job_profit, incentive_pct, incentive_amount, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      incId, inc.orderId, inc.itemId || '', inc.jobCardId || '', inc.productName || '', inc.workerId || '', inc.workerName, inc.roleStage, Number(inc.jobAmount || 0), Number(inc.jobProfit || 0), Number(inc.incentivePct || 0.5), Number(inc.incentiveAmount || 0), inc.completedAt || new Date().toISOString()
    );

    res.json({ success: true, incentiveId: incId });
  } catch (err) {
    console.error("POST /api/worker-incentives Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 6B. MULTI-TASK EMPLOYEE PRODUCTION & WORK LOGS API ENDPOINTS
// ============================================================================

// 1. GET ALL PROCESSES
app.get('/api/processes', (req, res) => {
  try {
    const processes = db.prepare('SELECT * FROM production_processes ORDER BY sort_order ASC, name ASC').all();
    res.json({
      success: true,
      processes: processes.map(p => ({
        ...p,
        isActive: Boolean(p.is_active),
        sortOrder: Number(p.sort_order || 0)
      }))
    });
  } catch (err) {
    console.error("GET /api/processes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CREATE PROCESS
app.post('/api/processes', (req, res) => {
  try {
    const { name, code, category, description, defaultUnit, isActive, sortOrder } = req.body;
    if (!name) return res.status(400).json({ success: false, error: "Process name is required" });

    const procId = req.body.id || `PROC-${Date.now()}`;
    const procCode = code || `PROC-${name.slice(0, 3).toUpperCase()}`;

    db.prepare(`
      INSERT INTO production_processes (id, code, name, category, description, default_unit, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      procId, procCode, name, category || 'Production', description || '', defaultUnit || 'Nos',
      isActive !== undefined ? (isActive ? 1 : 0) : 1, Number(sortOrder || 0)
    );

    res.json({ success: true, processId: procId });
  } catch (err) {
    console.error("POST /api/processes Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. UPDATE PROCESS
app.put('/api/processes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, category, description, defaultUnit, isActive, sortOrder } = req.body;

    db.prepare(`
      UPDATE production_processes SET
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        default_unit = COALESCE(?, default_unit),
        is_active = COALESCE(?, is_active),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?
    `).run(
      name, code, category, description, defaultUnit,
      isActive !== undefined ? (isActive ? 1 : 0) : null,
      sortOrder !== undefined ? Number(sortOrder) : null,
      id
    );

    res.json({ success: true, message: `Process ${id} updated` });
  } catch (err) {
    console.error("PUT /api/processes/:id Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. DELETE PROCESS (Soft delete: toggle inactive)
app.delete('/api/processes/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('UPDATE production_processes SET is_active = 0 WHERE id = ?').run(id);
    res.json({ success: true, message: `Process ${id} deactivated` });
  } catch (err) {
    console.error("DELETE /api/processes/:id Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to format production task
function formatTask(t, timeLogs = []) {
  return {
    id: t.id,
    taskDate: t.task_date,
    employeeId: t.employee_id,
    employeeName: t.employee_name,
    assignedUserId: t.assigned_user_id || '',
    assignedEmployeeId: t.assigned_employee_id || t.employee_id || '',
    orderId: t.order_id,
    orderNumber: t.order_number,
    customerName: t.customer_name,
    itemId: t.item_id,
    itemTitle: t.item_title,
    processId: t.process_id,
    processName: t.process_name,
    quantity: Number(t.quantity || 1),
    unit: t.unit || 'Nos',
    startTime: t.start_time || '',
    endTime: t.end_time || '',
    totalDurationMinutes: Number(t.total_duration_minutes || 0),
    status: t.status || 'Pending',
    priority: t.priority || 'Normal',
    remarks: t.remarks || '',
    machineId: t.machine_id || '',
    machineName: t.machine_name || '',
    department: t.department || 'Production',
    productionLocation: t.production_location || '',
    originalQty: Number(t.original_qty || t.quantity || 1),
    completedQty: Number(t.completed_qty || 0),
    rejectedQty: Number(t.rejected_qty || 0),
    reworkQty: Number(t.rework_qty || 0),
    finalQty: Number(t.final_qty || t.quantity || 1),
    attachmentUrl: t.attachment_url || '',
    supervisor: t.supervisor || '',
    qcStatus: t.qc_status || 'Pending',
    createdBy: t.created_by || '',
    createdByUserId: t.created_by_user_id || '',
    createdByEmployeeId: t.created_by_employee_id || '',
    startedByUserId: t.started_by_user_id || '',
    startedByEmployeeId: t.started_by_employee_id || '',
    startedAt: t.started_at || '',
    pausedByUserId: t.paused_by_user_id || '',
    pausedByEmployeeId: t.paused_by_employee_id || '',
    pausedAt: t.paused_at || '',
    pauseReason: t.pause_reason || '',
    resumedByUserId: t.resumed_by_user_id || '',
    resumedByEmployeeId: t.resumed_by_employee_id || '',
    resumedAt: t.resumed_at || '',
    completedBy: t.completed_by || '',
    completedAt: t.completed_at || '',
    completedByUserId: t.completed_by_user_id || '',
    completedByEmployeeId: t.completed_by_employee_id || '',
    reassignedByUserId: t.reassigned_by_user_id || '',
    previousEmployeeId: t.previous_employee_id || '',
    reassignmentReason: t.reassignment_reason || '',
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    timeLogs: timeLogs.filter(tl => tl.task_id === t.id).map(tl => ({
      id: tl.id,
      action: tl.action,
      timestamp: tl.timestamp,
      userId: tl.user_id || '',
      employeeId: tl.employee_id || '',
      loggedBy: tl.logged_by,
      notes: tl.notes || '',
      elapsedSeconds: Number(tl.elapsed_seconds || 0)
    }))
  };
}

// 5. GET PRODUCTION TASKS (Supports User/Permission Scoping & Filters)
app.get('/api/production-tasks', authenticateToken, (req, res) => {
  try {
    const { dateFrom, dateTo, employeeId, orderId, status, processId } = req.query;
    const user = req.user;
    const isManagerOrAdmin = hasPermission(user, 'production.view_all') || user.role === 'Admin' || user.role === 'Manager';

    let query = 'SELECT * FROM production_tasks WHERE 1=1';
    const params = [];

    // Security Scoping: Normal staff can ONLY see their own assigned tasks
    if (!isManagerOrAdmin) {
      if (user.employeeId) {
        query += ' AND (employee_id = ? OR assigned_employee_id = ? OR assigned_user_id = ?)';
        params.push(user.employeeId, user.employeeId, user.userId || user.id);
      } else {
        query += ' AND (assigned_user_id = ?)';
        params.push(user.userId || user.id);
      }
    } else if (employeeId && employeeId !== 'ALL') {
      query += ' AND (employee_id = ? OR assigned_employee_id = ?)';
      params.push(employeeId, employeeId);
    }

    if (dateFrom) {
      query += ' AND task_date >= ?';
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ' AND task_date <= ?';
      params.push(dateTo);
    }
    if (orderId) {
      query += ' AND (order_id = ? OR order_number = ?)';
      params.push(orderId, orderId);
    }
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }
    if (processId && processId !== 'ALL') {
      query += ' AND (process_id = ? OR process_name = ?)';
      params.push(processId, processId);
    }

    query += ' ORDER BY task_date DESC, created_at DESC';

    const tasks = db.prepare(query).all(...params);
    const timeLogs = db.prepare('SELECT * FROM production_task_time_logs ORDER BY timestamp ASC').all();

    res.json({ success: true, tasks: tasks.map(t => formatTask(t, timeLogs)) });
  } catch (err) {
    console.error("GET /api/production-tasks Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5B. GET AVAILABLE WORK (Unassigned Tasks & Ready-to-Claim Items Filtered by Permitted Processes)
app.get('/api/production-tasks/available', authenticateToken, (req, res) => {
  try {
    const user = req.user;
    const isManagerOrAdmin = hasPermission(user, 'production.view_all') || user.role === 'Admin' || user.role === 'Manager';

    // Determine permitted processes for the logged in staff
    let allowedList = [];
    if (!isManagerOrAdmin) {
      if (user.allowedProcesses && Array.isArray(user.allowedProcesses) && user.allowedProcesses.length > 0) {
        allowedList = user.allowedProcesses;
      } else if (user.department) {
        const dept = user.department.toLowerCase();
        if (dept.includes('print')) {
          allowedList = ['Digital Printing', 'Offset Printing', 'Large Format Printing', 'Screen Printing', 'Sticker Cutting', 'Plotter Cutting'];
        } else if (dept.includes('design')) {
          allowedList = ['Designing', 'Proofing', 'Sticker Cutting'];
        } else if (dept.includes('finish')) {
          allowedList = ['Lamination', 'Scoring', 'Creasing', 'Binding', 'Cutting', 'Eyelet', 'Pasting', 'Mounting', 'Packing'];
        } else if (dept.includes('deliv')) {
          allowedList = ['Delivery', 'Packing', 'Installation'];
        } else if (dept.includes('qual')) {
          allowedList = ['Quality Check'];
        }
      }
    }

    // 1. Fetch unassigned tasks from production_tasks table
    let taskQuery = `
      SELECT * FROM production_tasks 
      WHERE (employee_id IS NULL OR employee_id = '' OR status = 'Available' OR (status = 'Pending' AND (employee_id IS NULL OR employee_id = '')))
    `;
    const taskParams = [];

    if (!isManagerOrAdmin && allowedList.length > 0) {
      const placeholders = allowedList.map(() => '?').join(',');
      taskQuery += ` AND process_name IN (${placeholders})`;
      taskParams.push(...allowedList);
    }

    taskQuery += ' ORDER BY created_at DESC';
    const unassignedTasks = db.prepare(taskQuery).all(...taskParams);
    const timeLogs = db.prepare('SELECT * FROM production_task_time_logs ORDER BY timestamp ASC').all();

    // 2. Fetch active order items that do not yet have an assigned production task
    const activeOrderItems = db.prepare(`
      SELECT o.id as order_id, o.order_number, o.customer_name, o.due_date as delivery_date, o.order_date,
             i.id as item_id, i.product_name_snapshot as product_name, i.custom_title, i.width, i.height, i.qty, i.unit,
             i.material, i.production_status, i.designer_required
      FROM sales_orders o
      JOIN sales_order_items i ON o.id = i.sales_order_id
      WHERE o.production_status NOT IN ('Delivered', 'Cancelled')
      ORDER BY o.order_date DESC
    `).all();

    const existingTaskKeys = new Set(
      db.prepare('SELECT order_id, item_id, process_name, employee_id FROM production_tasks').all()
        .map(t => `${t.order_id}:::${t.item_id}:::${t.process_name}`)
    );

    const availableItems = [];
    for (const it of activeOrderItems) {
      // Determine what processes this item needs
      const potentialProcesses = [];
      if (it.designer_required === 'YES') {
        potentialProcesses.push('Designing');
      }
      potentialProcesses.push('Digital Printing');
      if (it.material && it.material.toLowerCase().includes('lam')) {
        potentialProcesses.push('Lamination');
      }

      for (const proc of potentialProcesses) {
        const key = `${it.order_id}:::${it.item_id}:::${proc}`;
        if (!existingTaskKeys.has(key)) {
          // If staff is restricted, check if proc is in their allowedList
          if (isManagerOrAdmin || allowedList.length === 0 || allowedList.includes(proc)) {
            const dims = (it.width && it.height) ? `${it.width}x${it.height} ${it.unit || 'in'}` : '';
            availableItems.push({
              id: `AVAIL-${it.order_id}-${it.item_id}-${proc.replace(/\s+/g, '')}`,
              isVirtual: true,
              orderId: it.order_id,
              orderNumber: it.order_number || it.order_id,
              customerName: it.customer_name || 'Walk-in Customer',
              itemId: it.item_id,
              itemTitle: it.custom_title || it.product_name || 'Printing Item',
              dimensions: dims,
              material: it.material || '',
              quantity: Number(it.qty || 1),
              unit: it.unit || 'Nos',
              processName: proc,
              priority: it.job_priority || it.order_priority || 'Normal',
              orderDate: it.order_date,
              deliveryDate: it.delivery_date || '',
              status: 'Available'
            });
          }
        }
      }
    }

    res.json({
      success: true,
      allowedProcesses: allowedList,
      tasks: unassignedTasks.map(t => formatTask(t, timeLogs)),
      availableItems
    });
  } catch (err) {
    console.error("GET /api/production-tasks/available Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5C. ATOMIC "TAKE WORK" ENDPOINT (Prevents race conditions when 2 employees click TAKE WORK)
app.post('/api/production-tasks/:id/take', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const employeeId = user.employeeId;
    const employeeName = user.name || user.username || 'Staff';
    const userId = user.userId || user.id;

    if (!employeeId && user.role !== 'Admin') {
      return res.status(400).json({ success: false, error: "No employee profile linked to this user account." });
    }

    const nowIso = new Date().toISOString();

    const takeTx = db.transaction(() => {
      const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
      if (!task) {
        throw new Error('TASK_NOT_FOUND');
      }

      // Strict race condition check: if already taken by someone else!
      if (task.employee_id && task.employee_id !== employeeId) {
        throw new Error('TASK_ALREADY_TAKEN');
      }

      db.prepare(`
        UPDATE production_tasks SET
          employee_id = ?,
          employee_name = ?,
          assigned_employee_id = ?,
          assigned_user_id = ?,
          status = 'Assigned',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(employeeId, employeeName, employeeId, userId, id);

      const logId = `TL-${id}-${Date.now()}`;
      db.prepare(`
        INSERT INTO production_task_time_logs (id, task_id, action, timestamp, user_id, employee_id, logged_by, notes, elapsed_seconds)
        VALUES (?, ?, 'TAKE', ?, ?, ?, ?, 'Task claimed by employee', 0)
      `).run(logId, id, nowIso, userId, employeeId, employeeName);

      const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, employee_id, employee_name, role, action, module, record_id, details)
        VALUES (?, ?, ?, ?, ?, 'TAKE_WORK', 'Production', ?, ?)
      `).run(auditId, userId, employeeId, employeeName, req.user?.role || 'Staff', id, `Task ${id} claimed by ${employeeName} (${employeeId})`);
    });

    try {
      takeTx();
    } catch (txErr) {
      if (txErr.message === 'TASK_NOT_FOUND') {
        return res.status(404).json({ success: false, error: 'Task not found.' });
      }
      if (txErr.message === 'TASK_ALREADY_TAKEN') {
        return res.status(409).json({ success: false, error: 'This task has already been taken by another employee.' });
      }
      throw txErr;
    }

    const updatedTask = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
    const logs = db.prepare('SELECT * FROM production_task_time_logs WHERE task_id = ? ORDER BY timestamp ASC').all(id);

    publishEvent('TASK_TAKEN', {
      taskId: id,
      employeeId,
      employeeName,
      status: 'Assigned'
    });

    res.json({ success: true, message: 'Work claimed successfully', task: formatTask(updatedTask, logs) });
  } catch (err) {
    console.error("POST /api/production-tasks/:id/take Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5D. ATOMIC TAKE JOB ORDER ITEM (Create/Claim Task for Order Line Item with Zero Employee Dropdown)
app.post('/api/production-tasks/take-item', authenticateToken, (req, res) => {
  try {
    const { orderId, itemId, processName, priority = 'Normal', remarks = '', startImmediately = false } = req.body;
    const user = req.user;
    const employeeId = user.employeeId;
    const employeeName = user.name || user.username || 'Staff';
    const userId = user.userId || user.id;

    if (!orderId || !itemId || !processName) {
      return res.status(400).json({ success: false, error: 'orderId, itemId, and processName are required' });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let finalTaskId = null;

    const takeItemTx = db.transaction(() => {
      // Check if an existing task matches this order_id, item_id, process_name
      const existing = db.prepare(`
        SELECT * FROM production_tasks WHERE order_id = ? AND item_id = ? AND process_name = ?
      `).get(orderId, itemId, processName);

      if (existing) {
        if (existing.employee_id && existing.employee_id !== employeeId) {
          throw new Error('TASK_ALREADY_TAKEN');
        }
        finalTaskId = existing.id;
        const newStatus = startImmediately ? 'Started' : 'Assigned';
        db.prepare(`
          UPDATE production_tasks SET
            employee_id = ?,
            employee_name = ?,
            assigned_employee_id = ?,
            assigned_user_id = ?,
            status = ?,
            start_time = CASE WHEN ? = 'Started' THEN ? ELSE start_time END,
            started_by_user_id = CASE WHEN ? = 'Started' THEN ? ELSE started_by_user_id END,
            started_by_employee_id = CASE WHEN ? = 'Started' THEN ? ELSE started_by_employee_id END,
            started_at = CASE WHEN ? = 'Started' THEN ? ELSE started_at END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(employeeId, employeeName, employeeId, userId, newStatus, newStatus, timeFormatted, newStatus, userId, newStatus, employeeId, newStatus, nowIso, finalTaskId);
      } else {
        const ord = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(orderId) || {};
        const it = db.prepare('SELECT * FROM sales_order_items WHERE id = ?').get(itemId) || {};

        finalTaskId = `TSK-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const taskDate = now.toISOString().split('T')[0];
        const newStatus = startImmediately ? 'Started' : 'Assigned';

        db.prepare(`
          INSERT INTO production_tasks (
            id, task_date, employee_id, employee_name, assigned_employee_id, assigned_user_id,
            order_id, order_number, customer_name, item_id, item_title, process_id, process_name,
            quantity, unit, start_time, total_duration_minutes, status, priority, remarks,
            machine_id, machine_name, department, original_qty, completed_qty, rejected_qty, rework_qty, final_qty,
            created_by, created_by_user_id, created_by_employee_id,
            started_by_user_id, started_by_employee_id, started_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          finalTaskId, taskDate, employeeId, employeeName, employeeId, userId,
          orderId, ord.order_number || ord.id || orderId, ord.customer_name || 'Walk-in Customer',
          itemId, it.custom_title || it.product_name || 'Printing Item', '', processName,
          Number(it.qty || 1), it.unit || 'Nos', startImmediately ? timeFormatted : '', 0,
          newStatus, priority || it.job_priority || 'Normal', remarks,
          '', '', it.department || 'Production', Number(it.qty || 1), 0, 0, 0, Number(it.qty || 1),
          employeeName, userId, employeeId,
          startImmediately ? userId : null, startImmediately ? employeeId : null, startImmediately ? nowIso : null
        );
      }

      // Time log entry
      const logId = `TL-${finalTaskId}-${Date.now()}`;
      db.prepare(`
        INSERT INTO production_task_time_logs (id, task_id, action, timestamp, user_id, employee_id, logged_by, notes, elapsed_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `).run(logId, finalTaskId, startImmediately ? 'START' : 'TAKE', nowIso, userId, employeeId, employeeName, startImmediately ? 'Work claimed and started' : 'Work claimed by staff');

      // Audit log entry
      const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, employee_id, employee_name, role, action, module, record_id, details)
        VALUES (?, ?, ?, ?, ?, 'TAKE_WORK_ITEM', 'Production', ?, ?)
      `).run(auditId, userId, employeeId, employeeName, req.user?.role || 'Staff', finalTaskId, `Claimed ${processName} on Order ${orderId} Item ${itemId}`);
    });

    try {
      takeItemTx();
    } catch (txErr) {
      if (txErr.message === 'TASK_ALREADY_TAKEN') {
        return res.status(409).json({ success: false, error: 'This task has already been taken by another employee.' });
      }
      throw txErr;
    }

    const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(finalTaskId);
    const logs = db.prepare('SELECT * FROM production_task_time_logs WHERE task_id = ? ORDER BY timestamp ASC').all(finalTaskId);

    publishEvent('TASK_TAKEN', {
      taskId: finalTaskId,
      employeeId,
      employeeName,
      processName,
      status: task.status
    });

    res.json({ success: true, taskId: finalTaskId, task: formatTask(task, logs) });
  } catch (err) {
    console.error("POST /api/production-tasks/take-item Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5E. ADMIN / MANAGER REASSIGNMENT ENDPOINT
app.post('/api/production-tasks/:id/reassign', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  try {
    const { id } = req.params;
    const { newEmployeeId, newEmployeeName, reason = '' } = req.body;
    const user = req.user;

    if (!newEmployeeId) {
      return res.status(400).json({ success: false, error: 'newEmployeeId is required' });
    }

    const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    const prevEmp = task.employee_name || task.employee_id || 'Unassigned';
    const nowIso = new Date().toISOString();

    const reassignTx = db.transaction(() => {
      db.prepare(`
        UPDATE production_tasks SET
          employee_id = ?,
          employee_name = ?,
          assigned_employee_id = ?,
          previous_employee_id = ?,
          reassigned_by_user_id = ?,
          reassignment_reason = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newEmployeeId, newEmployeeName || newEmployeeId, newEmployeeId, task.employee_id, user.userId || user.id, reason, id);

      const logId = `TL-${id}-${Date.now()}`;
      db.prepare(`
        INSERT INTO production_task_time_logs (id, task_id, action, timestamp, user_id, employee_id, logged_by, notes, elapsed_seconds)
        VALUES (?, ?, 'REASSIGN', ?, ?, ?, ?, ?, 0)
      `).run(logId, id, nowIso, user.userId || user.id, user.employeeId, user.name || 'Admin', `Reassigned from ${prevEmp} to ${newEmployeeName}. Reason: ${reason}`);

      const auditId = `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, employee_id, employee_name, role, action, module, record_id, details)
        VALUES (?, ?, ?, ?, ?, 'REASSIGN_TASK', 'Production', ?, ?)
      `).run(auditId, user.userId || user.id, user.employeeId, user.name || 'Admin', user.role || 'Admin', id, `Task ${id} reassigned from ${prevEmp} to ${newEmployeeName}. Reason: ${reason}`);
    });

    reassignTx();

    const updated = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
    const logs = db.prepare('SELECT * FROM production_task_time_logs WHERE task_id = ? ORDER BY timestamp ASC').all(id);

    publishEvent('TASK_REASSIGNED', {
      taskId: id,
      previousEmployee: prevEmp,
      newEmployeeId,
      newEmployeeName,
      reassignedBy: user.name
    });

    res.json({ success: true, message: 'Task reassigned successfully', task: formatTask(updated, logs) });
  } catch (err) {
    console.error("POST /api/production-tasks/:id/reassign Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5F. EMPLOYEE WORKLOAD & CAPACITY (Admin / Manager Only)
app.get('/api/production-tasks/workload', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  try {
    const employees = db.prepare("SELECT * FROM employees WHERE status = 'Active' OR active = 1").all();
    const tasks = db.prepare("SELECT * FROM production_tasks").all();
    const today = new Date().toISOString().split('T')[0];

    const workload = employees.map(emp => {
      const empTasks = tasks.filter(t => t.employee_id === emp.id || t.assigned_employee_id === emp.id);
      const activeTasks = empTasks.filter(t => t.status === 'Started').length;
      const pendingTasks = empTasks.filter(t => t.status === 'Pending' || t.status === 'Assigned' || t.status === 'Paused').length;
      const completedToday = empTasks.filter(t => t.status === 'Completed' && ((t.completed_at && t.completed_at.startsWith(today)) || t.task_date === today)).length;
      const totalMinutes = empTasks.reduce((sum, t) => sum + Number(t.total_duration_minutes || 0), 0);
      const activeHours = (totalMinutes / 60).toFixed(1);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        designation: emp.designation || emp.role,
        activeTasks,
        pendingTasks,
        completedToday,
        activeHoursToday: Number(activeHours),
        totalTasks: empTasks.length
      };
    });

    res.json({ success: true, workload });
  } catch (err) {
    console.error("GET /api/production-tasks/workload Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5G. TASK ACTIVITY TIMELINE
app.get('/api/production-tasks/:id/timeline', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const logs = db.prepare('SELECT * FROM production_task_time_logs WHERE task_id = ? ORDER BY timestamp ASC').all(id);
    res.json({ success: true, timeline: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. CREATE PRODUCTION TASK (Admin / Supervisor)
app.post('/api/production-tasks', authenticateToken, (req, res) => {
  try {
    const t = req.body;
    const user = req.user;
    if (!t.processName) {
      return res.status(400).json({ success: false, error: "Process Name is required" });
    }

    const assignedEmpId = t.employeeId || (user.role !== 'Admin' ? user.employeeId : '');
    const assignedEmpName = t.employeeName || (user.role !== 'Admin' ? user.name : '');

    const taskId = t.id || `TSK-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const taskDate = t.taskDate || new Date().toISOString().split('T')[0];
    const initialStatus = t.status || (assignedEmpId ? 'Assigned' : 'Available');
    const now = new Date();
    const nowIso = now.toISOString();
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO production_tasks (
          id, task_date, employee_id, employee_name, assigned_employee_id, assigned_user_id,
          order_id, order_number, customer_name,
          item_id, item_title, process_id, process_name, quantity, unit, start_time, end_time,
          total_duration_minutes, status, priority, remarks, machine_id, machine_name, department,
          production_location, original_qty, completed_qty, rejected_qty, rework_qty, final_qty,
          attachment_url, supervisor, qc_status, created_by, created_by_user_id, created_by_employee_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        taskId, taskDate, assignedEmpId || '', assignedEmpName || '', assignedEmpId || '', user.userId || user.id,
        t.orderId || '', t.orderNumber || t.orderId || 'Direct Job',
        t.customerName || '', t.itemId || '', t.itemTitle || t.productName || 'Printing Item',
        t.processId || '', t.processName, Number(t.quantity || 1), t.unit || 'Nos',
        initialStatus === 'Started' ? (t.startTime || timeFormatted) : (t.startTime || ''),
        t.endTime || '', Number(t.totalDurationMinutes || 0),
        initialStatus, t.priority || 'Normal', t.remarks || '',
        t.machineId || '', t.machineName || '', t.department || 'Production',
        t.productionLocation || '', Number(t.originalQty || t.quantity || 1),
        Number(t.completedQty || 0), Number(t.rejectedQty || 0), Number(t.reworkQty || 0),
        Number(t.finalQty || t.quantity || 1), t.attachmentUrl || '', t.supervisor || '',
        t.qcStatus || 'Pending', user.name || 'Staff', user.userId || user.id, user.employeeId
      );

      // If created in Started status, log initial START event
      if (initialStatus === 'Started') {
        db.prepare(`
          INSERT INTO production_task_time_logs (id, task_id, action, timestamp, user_id, employee_id, logged_by, notes, elapsed_seconds)
          VALUES (?, ?, 'START', ?, ?, ?, ?, 'Task initiated on creation', 0)
        `).run(`TL-${taskId}-1`, taskId, nowIso, user.userId || user.id, assignedEmpId, assignedEmpName || user.name);
      }
    });

    createTx();
    publishEvent('TASK_CREATED', { taskId, processName: t.processName, status: initialStatus });
    res.json({ success: true, taskId });
  } catch (err) {
    console.error("POST /api/production-tasks Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. UPDATE PRODUCTION TASK
app.put('/api/production-tasks/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const t = req.body;

    db.prepare(`
      UPDATE production_tasks SET
        employee_id = COALESCE(?, employee_id),
        employee_name = COALESCE(?, employee_name),
        assigned_employee_id = COALESCE(?, assigned_employee_id),
        process_name = COALESCE(?, process_name),
        process_id = COALESCE(?, process_id),
        quantity = COALESCE(?, quantity),
        unit = COALESCE(?, unit),
        priority = COALESCE(?, priority),
        remarks = COALESCE(?, remarks),
        machine_id = COALESCE(?, machine_id),
        machine_name = COALESCE(?, machine_name),
        department = COALESCE(?, department),
        production_location = COALESCE(?, production_location),
        completed_qty = COALESCE(?, completed_qty),
        rejected_qty = COALESCE(?, rejected_qty),
        rework_qty = COALESCE(?, rework_qty),
        final_qty = COALESCE(?, final_qty),
        supervisor = COALESCE(?, supervisor),
        qc_status = COALESCE(?, qc_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      t.employeeId, t.employeeName, t.employeeId, t.processName, t.processId,
      t.quantity !== undefined ? Number(t.quantity) : null,
      t.unit, t.priority, t.remarks, t.machineId, t.machineName,
      t.department, t.productionLocation,
      t.completedQty !== undefined ? Number(t.completedQty) : null,
      t.rejectedQty !== undefined ? Number(t.rejectedQty) : null,
      t.reworkQty !== undefined ? Number(t.reworkQty) : null,
      t.finalQty !== undefined ? Number(t.finalQty) : null,
      t.supervisor, t.qcStatus, id
    );

    res.json({ success: true, message: `Task ${id} updated` });
  } catch (err) {
    console.error("PUT /api/production-tasks/:id Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. EXECUTE TASK ACTION (START, PAUSE, RESUME, COMPLETE, REWORK) WITH PURE WORKING DURATION
app.post('/api/production-tasks/:id/action', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { action, notes = '', pauseReason = '', reworkQty = 0, rejectedQty = 0, completedQty = 0 } = req.body;

    const task = db.prepare('SELECT * FROM production_tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });

    // Ownership verification: Staff can only perform actions on tasks assigned to them
    const isManagerOrAdmin = hasPermission(user, 'production.view_all') || user.role === 'Admin' || user.role === 'Manager';
    if (!isManagerOrAdmin && task.employee_id && task.employee_id !== user.employeeId) {
      return res.status(403).json({ success: false, error: 'You can only update tasks assigned to you.' });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    let newStatus = task.status;
    let newDuration = Number(task.total_duration_minutes || 0);
    let newStartTime = task.start_time || '';
    let newEndTime = task.end_time || '';
    let newCompletedAt = task.completed_at;
    let newCompletedBy = task.completed_by;
    let newCompletedByUserId = task.completed_by_user_id;
    let newCompletedByEmployeeId = task.completed_by_employee_id;
    let newStartedByUserId = task.started_by_user_id;
    let newStartedByEmployeeId = task.started_by_employee_id;
    let newStartedAt = task.started_at;
    let newPausedByUserId = task.paused_by_user_id;
    let newPausedByEmployeeId = task.paused_by_employee_id;
    let newPausedAt = task.paused_at;
    let newPauseReason = task.pause_reason;
    let newResumedByUserId = task.resumed_by_user_id;
    let newResumedByEmployeeId = task.resumed_by_employee_id;
    let newResumedAt = task.resumed_at;

    let newReworkQty = Number(task.rework_qty || 0);
    let newRejectedQty = Number(task.rejected_qty || 0);
    let newCompletedNum = Number(task.completed_qty || 0);
    let elapsedSecondsSegment = 0;

    // Retrieve previous logs for active time segment calculation
    const logs = db.prepare('SELECT * FROM production_task_time_logs WHERE task_id = ? ORDER BY timestamp ASC').all(id);
    const activeStartLog = [...logs].reverse().find(l => l.action === 'START' || l.action === 'RESUME');

    if (action === 'START') {
      newStatus = 'Started';
      if (!newStartTime) newStartTime = timeFormatted;
      newStartedByUserId = user.userId || user.id;
      newStartedByEmployeeId = user.employeeId;
      newStartedAt = nowIso;
    } else if (action === 'PAUSE') {
      newStatus = 'Paused';
      newPausedByUserId = user.userId || user.id;
      newPausedByEmployeeId = user.employeeId;
      newPausedAt = nowIso;
      newPauseReason = pauseReason || notes || 'Paused by staff';
      if (activeStartLog && task.status !== 'Paused') {
        const startMillis = new Date(activeStartLog.timestamp).getTime();
        elapsedSecondsSegment = Math.max(0, Math.floor((now.getTime() - startMillis) / 1000));
        newDuration += Math.round(elapsedSecondsSegment / 60);
      }
    } else if (action === 'RESUME') {
      newStatus = 'Started';
      newResumedByUserId = user.userId || user.id;
      newResumedByEmployeeId = user.employeeId;
      newResumedAt = nowIso;
    } else if (action === 'COMPLETE') {
      newStatus = 'Completed';
      newEndTime = timeFormatted;
      newCompletedAt = nowIso;
      newCompletedBy = user.name || user.username || 'Staff';
      newCompletedByUserId = user.userId || user.id;
      newCompletedByEmployeeId = user.employeeId;
      if (activeStartLog && task.status !== 'Paused') {
        const startMillis = new Date(activeStartLog.timestamp).getTime();
        elapsedSecondsSegment = Math.max(0, Math.floor((now.getTime() - startMillis) / 1000));
        newDuration += Math.round(elapsedSecondsSegment / 60);
      }
      if (completedQty) newCompletedNum = Number(completedQty);
      else if (newCompletedNum === 0) newCompletedNum = Number(task.quantity || 1);
    } else if (action === 'REWORK') {
      newStatus = 'Rework';
      if (reworkQty) newReworkQty += Number(reworkQty);
      if (rejectedQty) newRejectedQty += Number(rejectedQty);
    }

    const actionTx = db.transaction(() => {
      db.prepare(`
        UPDATE production_tasks SET
          status = ?,
          start_time = ?,
          end_time = ?,
          total_duration_minutes = ?,
          started_by_user_id = ?,
          started_by_employee_id = ?,
          started_at = ?,
          paused_by_user_id = ?,
          paused_by_employee_id = ?,
          paused_at = ?,
          pause_reason = ?,
          resumed_by_user_id = ?,
          resumed_by_employee_id = ?,
          resumed_at = ?,
          completed_at = ?,
          completed_by = ?,
          completed_by_user_id = ?,
          completed_by_employee_id = ?,
          completed_qty = ?,
          rejected_qty = ?,
          rework_qty = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        newStatus, newStartTime, newEndTime, newDuration,
        newStartedByUserId, newStartedByEmployeeId, newStartedAt,
        newPausedByUserId, newPausedByEmployeeId, newPausedAt, newPauseReason,
        newResumedByUserId, newResumedByEmployeeId, newResumedAt,
        newCompletedAt, newCompletedBy, newCompletedByUserId, newCompletedByEmployeeId,
        newCompletedNum, newRejectedQty, newReworkQty, id
      );

      const logId = `TL-${id}-${Date.now()}`;
      db.prepare(`
        INSERT INTO production_task_time_logs (id, task_id, action, timestamp, user_id, employee_id, logged_by, notes, elapsed_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(logId, id, action, nowIso, user.userId || user.id, user.employeeId, user.name || 'Staff', notes || newPauseReason, elapsedSecondsSegment);
    });

    actionTx();

    publishEvent('TASK_ACTION', {
      taskId: id,
      action,
      status: newStatus,
      employeeName: user.name,
      totalDurationMinutes: newDuration
    });

    res.json({ success: true, status: newStatus, totalDurationMinutes: newDuration });
  } catch (err) {
    console.error("POST /api/production-tasks/:id/action Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. DELETE PRODUCTION TASK
app.delete('/api/production-tasks/:id', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM production_tasks WHERE id = ?').run(id);
    publishEvent('TASK_DELETED', { taskId: id });
    res.json({ success: true, message: `Task ${id} deleted` });
  } catch (err) {
    console.error("DELETE /api/production-tasks/:id Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. BIOMETRIC DEVICE EMPLOYEES & K90 INTEGRATION API ENDPOINTS

// GET all biometric device users
app.get('/api/biometric/device-users', (req, res) => {
  try {
    const rawUsers = db.prepare(`
      SELECT m.*, e.name as employee_name, e.code as employee_code, e.department, e.designation, e.status as employee_status
      FROM biometric_user_mappings m
      LEFT JOIN employees e ON m.employee_id = e.id
      ORDER BY CAST(m.biometric_user_id AS INTEGER) ASC
    `).all();

    res.json({
      success: true,
      users: rawUsers.map(formatBiometricUser)
    });
  } catch (err) {
    console.error("GET /api/biometric/device-users Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// IMPORT & SCAN USERS FROM K90 DEVICE (With 5-Step Priority Matching)
app.post('/api/biometric/import-users', (req, res) => {
  try {
    const { deviceId = 'DEV-K90-01' } = req.body;

    const syncTime = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    db.prepare('UPDATE biometric_devices SET last_sync_time = ?, status = ? WHERE id = ?').run(syncTime, 'Online', deviceId);

    const allEmployees = db.prepare('SELECT * FROM employees').all();
    const currentMappings = db.prepare('SELECT * FROM biometric_user_mappings WHERE device_id = ?').all();

    let matchedCount = 0;
    let unmappedCount = 0;
    let newlyDetectedCount = 0;

    for (const map of currentMappings) {
      if (map.employee_id && map.mapping_status === 'Matched') {
        matchedCount++;
        continue;
      }

      // Priority 2: Match by Employee ID / Code
      const empById = allEmployees.find(e =>
        e.id === map.biometric_user_id ||
        e.id.replace(/\D/g, '') === map.biometric_user_id ||
        e.code === map.biometric_user_id ||
        e.code.replace(/\D/g, '') === map.biometric_user_id
      );

      if (empById) {
        db.prepare(`
          UPDATE biometric_user_mappings
          SET employee_id = ?, mapping_status = 'Matched', matched_by = 'Employee ID / Code Match', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(empById.id, map.id);
        matchedCount++;
        continue;
      }

      // Priority 3: Exact Name Match
      const cleanBioName = (map.biometric_name || '').trim().toLowerCase();
      if (cleanBioName) {
        const empByName = allEmployees.find(e => (e.name || '').trim().toLowerCase() === cleanBioName);
        if (empByName) {
          db.prepare(`
            UPDATE biometric_user_mappings
            SET employee_id = ?, mapping_status = 'Matched', matched_by = 'Exact Name Match', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(empByName.id, map.id);
          matchedCount++;
          continue;
        }
      }

      unmappedCount++;
    }

    const updatedRaw = db.prepare(`
      SELECT m.*, e.name as employee_name, e.code as employee_code, e.department, 
             COALESCE(e.designation, e.role, '') as designation, 
             COALESCE(e.status, CASE WHEN e.active = 1 THEN 'Active' ELSE 'Inactive' END) as employee_status
      FROM biometric_user_mappings m
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE m.device_id = ?
      ORDER BY CAST(m.biometric_user_id AS INTEGER) ASC
    `).all(deviceId);

    db.prepare('UPDATE biometric_devices SET total_users = ? WHERE id = ?').run(updatedRaw.length, deviceId);

    res.json({
      success: true,
      syncTime,
      totalUsers: updatedRaw.length,
      matchedCount,
      unmappedCount,
      newlyDetectedCount,
      users: updatedRaw.map(formatBiometricUser)
    });
  } catch (err) {
    console.error("POST /api/biometric/import-users Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// MAP K90 USER TO ERP EMPLOYEE
app.post('/api/biometric/map-user', (req, res) => {
  try {
    const { mappingId, employeeId } = req.body;
    if (!mappingId || !employeeId) {
      return res.status(400).json({ success: false, error: "Mapping ID and Employee ID are required" });
    }

    db.prepare(`
      UPDATE biometric_user_mappings
      SET employee_id = ?, mapping_status = 'Matched', matched_by = 'Manual HR Match', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(employeeId, mappingId);

    res.json({ success: true, message: "Biometric User mapped successfully" });
  } catch (err) {
    console.error("POST /api/biometric/map-user Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UNLINK K90 USER
app.post('/api/biometric/unlink-user', (req, res) => {
  try {
    const { mappingId } = req.body;
    if (!mappingId) {
      return res.status(400).json({ success: false, error: "Mapping ID is required" });
    }

    db.prepare(`
      UPDATE biometric_user_mappings
      SET employee_id = NULL, mapping_status = 'Unmapped', matched_by = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(mappingId);

    res.json({ success: true, message: "Biometric User unlinked successfully" });
  } catch (err) {
    console.error("POST /api/biometric/unlink-user Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE NEW ERP EMPLOYEE FROM UNMAPPED K90 USER
app.post('/api/biometric/create-and-map-employee', (req, res) => {
  try {
    const { mappingId, employeeData } = req.body;
    if (!mappingId || !employeeData || !employeeData.name) {
      return res.status(400).json({ success: false, error: "Mapping ID and Employee Name are required" });
    }

    const empCount = db.prepare('SELECT COUNT(*) as count FROM employees').get().count;
    const newEmpId = `EMP-${101 + empCount}`;
    const newEmpCode = employeeData.code || newEmpId;

    const createTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO employees (id, code, name, mobile, email, department, designation, role, branch, joining_date, salary_type, basic_salary, commission_rate, incentive_rate, status, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newEmpId,
        newEmpCode,
        employeeData.name,
        employeeData.mobile || '',
        employeeData.email || '',
        employeeData.department || 'Production',
        employeeData.designation || 'Staff',
        employeeData.role || 'Staff',
        'Head Office',
        new Date().toISOString().split('T')[0],
        'Fixed Salary',
        Number(employeeData.basicSalary || 25000),
        Number(employeeData.commissionRate || 0),
        Number(employeeData.incentiveRate || 0.5),
        'Active',
        ''
      );

      db.prepare(`
        UPDATE biometric_user_mappings
        SET employee_id = ?, mapping_status = 'Matched', matched_by = 'Created New Employee', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newEmpId, mappingId);
    });

    createTx();
    res.json({ success: true, employeeId: newEmpId, message: `Created new employee ${employeeData.name} and mapped to biometric user` });
  } catch (err) {
    console.error("POST /api/biometric/create-and-map-employee Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ASSIGN BIOMETRIC ID TO ERP EMPLOYEE
app.post('/api/biometric/assign-id', (req, res) => {
  try {
    const { employeeId, deviceId = 'DEV-K90-01', biometricUserId, biometricName } = req.body;
    if (!employeeId || !biometricUserId) {
      return res.status(400).json({ success: false, error: "Employee ID and Biometric User ID are required" });
    }

    const existingMapping = db.prepare('SELECT * FROM biometric_user_mappings WHERE device_id = ? AND biometric_user_id = ?').get(deviceId, biometricUserId);

    if (existingMapping) {
      db.prepare(`
        UPDATE biometric_user_mappings
        SET employee_id = ?, mapping_status = 'Matched', matched_by = 'Assigned from ERP', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(employeeId, existingMapping.id);
    } else {
      const newMapId = `BIO-MAP-${Date.now()}`;
      db.prepare(`
        INSERT INTO biometric_user_mappings (id, device_id, biometric_user_id, biometric_name, card_no, verification_type, privilege, device_status, employee_id, mapping_status, matched_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newMapId, deviceId, biometricUserId, biometricName || '', '', 'Fingerprint / Password', 'User', 'Active', employeeId, 'Matched', 'Assigned from ERP');
    }

    res.json({ success: true, message: `Assigned Biometric ID ${biometricUserId} to employee ${employeeId}` });
  } catch (err) {
    console.error("POST /api/biometric/assign-id Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ZKTECO / eSSL CLOUD SERVER (ADMS) LISTENER
// ==========================================

// 1. Device Handshake & Heartbeat Ping
app.get('/iclock/cdata', (req, res) => {
  const sn = req.query.SN || req.query.sn || 'ZK-DEV';
  console.log(`📡 Biometric Device Cloud Handshake / Heartbeat from SN: [${sn}]`);
  
  res.set('Content-Type', 'text/plain');
  res.send(`GET OPTION FROM: ${sn}\nStamp=9999\nOpStamp=0\nErrorDelay=30\nDelay=10\nTransTimes=00:00;14:00\nTransInterval=1\nTransFlag=1111000000\nTimeZone=5.5\nRealtime=1\nEncrypt=0`);
});

// 2. Real-Time Punch Receive (POST from device)
app.post('/iclock/cdata', (req, res) => {
  try {
    const sn = req.query.SN || req.query.sn || 'ZK-DEV';
    const table = req.query.table || '';
    const rawData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    console.log(`📥 Biometric Real-time Push from [${sn}] (table: ${table}):\n${rawData}`);

    if (rawData) {
      const lines = rawData.trim().split(/\r?\n/);
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const bioUserId = parts[0].trim();
          const punchTime = parts[1].trim(); // Format: YYYY-MM-DD HH:MM:SS
          
          const mapping = db.prepare('SELECT * FROM biometric_user_mappings WHERE biometric_user_id = ?').get(bioUserId);
          
          if (mapping && mapping.employee_id) {
            console.log(`✅ Biometric Match: User #${bioUserId} -> Employee ${mapping.employee_id} at ${punchTime}`);
          } else {
            const punchId = `PUNCH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            db.prepare(`
              INSERT INTO unmapped_biometric_punches (id, device_id, biometric_user_id, biometric_name, punch_time, status)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(punchId, sn, bioUserId, `Biometric User #${bioUserId}`, punchTime, 'Pending HR Action');
          }
        }
      }
    }

    res.set('Content-Type', 'text/plain');
    res.send('OK');
  } catch (err) {
    console.error('❌ Cloud Push Processing Error:', err);
    res.set('Content-Type', 'text/plain');
    res.status(500).send('ERROR');
  }
});

// 3. Command Request Polling
app.get('/iclock/getrequest', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('OK');
});

// ============================================================================
// 10. PERSISTENT EXPENSES API
// ============================================================================
app.get('/api/expenses', (req, res) => {
  try {
    const expenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC, created_at DESC').all();
    res.json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/expenses', authenticateToken, (req, res) => {
  try {
    const category = req.body.category;
    const amount = Number(req.body.amount);
    const expense_date = req.body.expense_date || req.body.expenseDate || new Date().toISOString().split('T')[0];
    const vendor_name = req.body.vendor_name || req.body.vendor || '';
    const vendor_id = req.body.vendor_id || req.body.vendorId || '';
    const payment_method = req.body.payment_method || req.body.paymentMethod || 'Cash';
    const description = req.body.description || '';
    const receipt_url = req.body.receipt_url || req.body.receiptUrl || '';

    if (!category || isNaN(amount) || !expense_date) {
      return res.status(400).json({ success: false, error: 'Category, amount, and expense date are required' });
    }
    const id = req.body.id || `EXP-${Date.now()}`;
    db.prepare(`
      INSERT INTO expenses (id, category, amount, vendor_name, vendor_id, payment_method, expense_date, description, receipt_url, created_by, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved')
    `).run(id, category, amount, vendor_name, vendor_id, payment_method, expense_date, description, receipt_url, req.user?.name || req.body.createdBy || 'Staff');

    const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    publishEvent('EXPENSE_CREATED', created);
    res.json({ success: true, expense: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/expenses/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    publishEvent('EXPENSE_DELETED', { id });
    res.json({ success: true, message: `Expense ${id} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 11. INVENTORY TRANSACTIONS LEDGER & STOCK MOVEMENT API
// ============================================================================
app.get('/api/inventory/transactions', (req, res) => {
  try {
    const { materialId, limit = 100 } = req.query;
    let query = 'SELECT * FROM inventory_transactions';
    const params = [];
    if (materialId) {
      query += ' WHERE material_id = ?';
      params.push(materialId);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(Number(limit));
    const txs = db.prepare(query).all(...params);
    res.json({ success: true, transactions: txs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/inventory/transactions', authenticateToken, (req, res) => {
  try {
    const material_id = req.body.material_id || req.body.materialId;
    const material_name = req.body.material_name || req.body.materialName || material_id;
    const quantity = Number(req.body.quantity);
    const unit = req.body.unit || 'Sq.Ft';
    const transaction_type = req.body.transaction_type || req.body.transactionType;
    const reference_type = req.body.reference_type || req.body.referenceType || 'MANUAL';
    const reference_id = req.body.reference_id || req.body.referenceId || '';
    const planned_consumption = Number(req.body.planned_consumption || req.body.plannedConsumption || quantity);
    const actual_consumption = Number(req.body.actual_consumption || req.body.actualConsumption || quantity);
    const wastage_qty = Number(req.body.wastage_qty || req.body.wastageQty || 0);
    const wastage_reason = req.body.wastage_reason || req.body.wastageReason || '';
    const material_batch = req.body.material_batch || req.body.materialBatch || '';
    const remarks = req.body.remarks || '';

    if (!material_id || isNaN(quantity) || !transaction_type) {
      return res.status(400).json({ success: false, error: 'material_id, quantity, and transaction_type required' });
    }
    const id = req.body.id || `ITX-${Date.now()}`;
    const txRunner = db.transaction(() => {
      db.prepare(`
        INSERT INTO inventory_transactions (
          id, material_id, material_name, quantity, unit, transaction_type, reference_type, reference_id,
          planned_consumption, actual_consumption, wastage_qty, wastage_reason, material_batch,
          employee_id, employee_name, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, material_id, material_name, quantity, unit, transaction_type,
        reference_type, reference_id, planned_consumption,
        actual_consumption, wastage_qty, wastage_reason, material_batch,
        req.user?.employeeId || req.body.employeeId || '', req.user?.name || req.body.employeeName || 'Staff', remarks
      );

      const multiplier = (transaction_type === 'PURCHASE_IN' || transaction_type === 'RETURN' || transaction_type === 'TRANSFER_IN') ? 1 : -1;
      db.prepare(`
        UPDATE inventory 
        SET current_stock = current_stock + ? 
        WHERE id = ? OR name = ?
      `).run(Number(quantity) * multiplier, material_id, material_name || material_id);
    });
    txRunner();
    const updatedStock = db.prepare('SELECT * FROM inventory WHERE id = ? OR name = ?').get(material_id, material_name || material_id);
    publishEvent('STOCK_UPDATED', { materialId: material_id, updatedStock });
    res.json({ success: true, transactionId: id, updatedStock });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 12. PERSISTENT PAYROLL COMMIT API
// ============================================================================
app.get('/api/payroll', (req, res) => {
  try {
    const payroll = db.prepare('SELECT * FROM payroll ORDER BY month DESC, staff_name ASC').all();
    res.json({ success: true, payroll });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/payroll/commit', authenticateToken, (req, res) => {
  try {
    const { month, records } = req.body;
    if (!month || !records || !Array.isArray(records)) {
      return res.status(400).json({ success: false, error: 'Month and records array required' });
    }
    const commitTx = db.transaction(() => {
      const insertPay = db.prepare(`
        INSERT OR REPLACE INTO payroll (
          id, month, staff_id, staff_name, role, base_salary, working_days, days_present, earned_base_pay,
          ot_hours, ot_pay, incentive_earned, advance_deduction, late_deduction, net_salary, status, paid_date, payment_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of records) {
        const id = r.id || `PAY-${month}-${r.staffId || r.staff_id}`;
        insertPay.run(
          id, month, r.staffId || r.staff_id, r.staffName || r.staff_name, r.role || 'Staff',
          Number(r.baseSalary || r.base_salary || 0), Number(r.workingDays || r.working_days || 30),
          Number(r.daysPresent || r.days_present || 0), Number(r.earnedBasePay || r.earned_base_pay || 0),
          Number(r.otHours || r.ot_hours || 0), Number(r.otPay || r.ot_pay || 0),
          Number(r.incentiveEarned || r.incentive_earned || 0), Number(r.advanceDeduction || r.advance_deduction || 0),
          Number(r.lateDeduction || r.late_deduction || 0), Number(r.netSalary || r.net_salary || 0),
          r.status || 'Committed', r.paidDate || r.paid_date || new Date().toISOString().split('T')[0], r.paymentMode || r.payment_mode || 'Bank Transfer'
        );
      }
    });
    commitTx();
    publishEvent('PAYROLL_COMMITTED', { month, count: records.length });
    res.json({ success: true, message: `Payroll for ${month} committed successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 13. DEDICATED PAYMENTS API
// ============================================================================
app.post('/api/payments', authenticateToken, (req, res) => {
  try {
    const { orderId, customerId, customerName, amount, method, refNo, notes } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid payment amount is required' });
    }
    const payId = req.body.id || `PAY-${Date.now()}`;
    const payTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO payments (id, order_id, customer_id, customer_name, amount, method, ref_no, status, paid_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Completed', CURRENT_TIMESTAMP, ?)
      `).run(payId, orderId || null, customerId || null, customerName || '', Number(amount), method || 'Cash', refNo || '', notes || '');

      if (orderId) {
        const ord = db.prepare('SELECT grand_total, advance_amount FROM sales_orders WHERE id = ?').get(orderId);
        if (ord) {
          const newAdvance = Number(ord.advance_amount || 0) + Number(amount);
          const newBalance = Math.max(0, Number(ord.grand_total || 0) - newAdvance);
          const newPayStatus = newBalance <= 0 ? 'Paid' : 'Partial';
          db.prepare('UPDATE sales_orders SET advance_amount = ?, balance_amount = ?, payment_status = ? WHERE id = ?')
            .run(newAdvance, newBalance, newPayStatus, orderId);
        }
      }

      if (customerId) {
        db.prepare('UPDATE customers SET outstanding = MAX(0, outstanding - ?) WHERE id = ?')
          .run(Number(amount), customerId);
      }
    });
    payTx();
    publishEvent('PAYMENT_RECEIVED', { paymentId: payId, orderId, customerId, customerName, amount, method });
    res.json({ success: true, paymentId: payId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 14. IMMUTABLE AUDIT LOGS & ORDER TIMELINE API
// ============================================================================
app.get('/api/audit-logs', (req, res) => {
  try {
    const { recordId, module: mod } = req.query;
    let query = 'SELECT * FROM audit_logs';
    const params = [];
    if (recordId) {
      query += ' WHERE record_id = ?';
      params.push(recordId);
    } else if (mod) {
      query += ' WHERE module = ?';
      params.push(mod);
    }
    query += ' ORDER BY created_at DESC LIMIT 200';
    const logs = db.prepare(query).all(...params);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 15. QC REWORK TICKETS API
// ============================================================================
app.get('/api/rework-tickets', (req, res) => {
  try {
    const tickets = db.prepare('SELECT * FROM rework_tickets ORDER BY created_at DESC').all();
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/rework-tickets', authenticateToken, (req, res) => {
  try {
    const { orderId, itemId, taskId, defectCategory, defectReason, evidenceUrl, rejectedQty, reworkQty, returnToStage, assignedTo, qcInspectorName } = req.body;
    if (!orderId || !itemId || !defectCategory) {
      return res.status(400).json({ success: false, error: 'orderId, itemId, and defectCategory required' });
    }
    const ticketId = `RWK-${Date.now()}`;
    db.prepare(`
      INSERT INTO rework_tickets (
        id, order_id, item_id, task_id, defect_category, defect_reason, evidence_url,
        rejected_qty, rework_qty, return_to_stage, assigned_to, qc_inspector_name, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Open')
    `).run(
      ticketId, orderId, itemId, taskId || null, defectCategory, defectReason || '', evidenceUrl || '',
      Number(rejectedQty || 0), Number(reworkQty || 0), returnToStage || 'Printing', assignedTo || '', qcInspectorName || req.user?.name || 'QC Inspector'
    );

    // Update item and order status back to return stage (e.g. Printing or Finishing)
    db.prepare('UPDATE sales_order_items SET production_status = ? WHERE id = ?').run(returnToStage || 'Printing', itemId);
    db.prepare('UPDATE sales_orders SET production_status = ? WHERE id = ?').run(returnToStage || 'Printing', orderId);

    publishEvent('REWORK_CREATED', { ticketId, orderId, returnToStage });
    res.json({ success: true, ticketId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// SERVE FRONTEND (STATIC ASSETS & SPA FALLBACK)
// ============================================================================
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/iclock')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log(`🌐 Serving production frontend static build from ${distPath}`);
}

// Start listening
const server = app.listen(PORT, () => {
  console.log(`🚀 Persistent SQLite ERP Server running on http://localhost:${PORT}`);
  console.log(`💻 ERP Web Application available at: http://localhost:${PORT}`);
});

// Keep process event loop active permanently
setInterval(() => {}, 1000 * 60 * 60);

