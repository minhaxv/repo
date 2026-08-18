import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
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
  initialWorkerJobIncentives
} from '../src/data/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
      INSERT INTO customers (id, customer_code, name, mobile, email, address, gst_number, customer_type, notes, outstanding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of initialCustomers) {
      insertCustomer.run(c.id, c.code || c.id, c.name, c.mobile, c.email || '', c.address || '', c.gstin || c.gstNumber || '', c.customerType || 'Retail', c.notes || '', c.outstandingAmount || c.outstanding || 0);
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

// Perform seed checks on startup
seedInitialDataIfEmpty();
seedBiometricDataIfEmpty();

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

// 1. GET ALL ERP DATA AT ONCE
app.get('/api/all', (req, res) => {
  try {
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
      SELECT m.*, e.name as employee_name, e.code as employee_code, e.department, e.designation, e.status as employee_status
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
        grandTotal: Number(o.grand_total),
        advanceAmount: Number(o.advance_amount),
        balanceAmount: Number(o.balance_amount),
        deliveredBy: o.delivered_by,
        signatureUrl: o.signature_url,
        whatsappSent: Boolean(o.whatsapp_sent),
        notes: o.notes,
        items: orderItems
      };
    });

    const jobWork = db.prepare('SELECT * FROM job_work ORDER BY created_at DESC').all();
    const outsourceJobs = db.prepare('SELECT * FROM outsource_jobs ORDER BY created_at DESC').all();
    const workerJobIncentives = db.prepare('SELECT * FROM worker_job_incentives ORDER BY completed_at DESC').all();
    const payments = db.prepare('SELECT * FROM payments ORDER BY paid_date DESC').all();

    res.json({
      success: true,
      companyProfile,
      customers: customers.map(c => ({ ...c, code: c.customer_code, gstin: c.gst_number, outstandingAmount: Number(c.outstanding) })),
      products: products.map(p => ({ ...p, code: p.product_code, defaultRate: Number(p.default_rate), estimatedCost: Number(p.estimated_cost), gstRate: Number(p.gst_rate), isCustom: Boolean(p.is_custom) })),
      productMaterialSpecs: productMaterialSpecs.map(s => ({ ...s, productId: s.product_id, specName: s.spec_name, materialName: s.material_name, sellingPrice: Number(s.selling_price), costPrice: Number(s.cost_price), isDefault: Boolean(s.is_default) })),
      vendors: suppliers.map(s => ({ ...s, code: s.supplier_code, pendingPayment: Number(s.pending_payment), avgTurnaroundDays: Number(s.avg_turnaround_days) })),
      salesPersons: salesPersons.map(sp => ({ ...sp, commissionRate: Number(sp.commission_rate) })),
      careOfPersons: careOfPersons.map(co => ({ ...co, commissionRate: Number(co.commission_rate) })),
      employees: employees.map(e => ({ ...e, baseSalary: Number(e.base_salary), incentiveRate: Number(e.incentive_rate), commissionRate: Number(e.commission_rate) })),
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
      payments: payments.map(p => ({ ...p, orderId: p.order_id, customerId: p.customer_id, customerName: p.customer_name, paidDate: p.paid_date, refNo: p.ref_no }))
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

// DELETE PRODUCT
app.delete('/api/products/:id', (req, res) => {
  try {
    const { id } = req.params;
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
    db.prepare(`
      INSERT INTO customers (id, customer_code, name, mobile, email, address, gst_number, customer_type, notes, outstanding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, c.code || id, c.name, c.mobile || '', c.email || '', c.address || '', c.gstin || c.gstNumber || '', c.customerType || 'Retail', c.notes || '', Number(c.outstandingAmount || 0)
    );
    res.json({ success: true, customerId: id });
  } catch (err) {
    console.error("POST /api/customers Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. ATOMIC SALES ORDER CREATION (Order + Items + JobWork + Multiple Outsource Jobs + Advance Payment)
app.post('/api/sales-orders', (req, res) => {
  try {
    const orderData = req.body;
    const { orderHeader, items, advanceAmount, paymentMethod } = orderData;

    if (!orderHeader || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: "Order details and at least 1 line item are required" });
    }

    const orderId = orderHeader.id || `SO-${Date.now()}`;
    const orderNumber = orderHeader.orderNumber || orderId;

    const createOrderTx = db.transaction(() => {
      // Validate Customer FK existence
      let validCustomerId = null;
      if (orderHeader.customerId) {
        const custExists = db.prepare('SELECT id FROM customers WHERE id = ?').get(orderHeader.customerId);
        if (custExists) validCustomerId = orderHeader.customerId;
      }

      // 1. Insert Sales Order
      try {
        db.prepare(`
          INSERT INTO sales_orders (id, order_number, customer_id, customer_name, sales_person_id, sales_person_name, care_of_id, care_of_name, reference_no, order_date, due_date, production_status, payment_status, subtotal, discount, tax_total, grand_total, advance_amount, balance_amount, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          orderHeader.paymentStatus || (Number(advanceAmount || 0) >= Number(orderHeader.grandTotal || 0) ? 'Paid' : Number(advanceAmount || 0) > 0 ? 'Partial' : 'Pending'),
          Number(orderHeader.subtotal || 0),
          Number(orderHeader.discount || 0),
          Number(orderHeader.taxTotal || 0),
          Number(orderHeader.grandTotal || 0),
          Number(advanceAmount || 0),
          Number(orderHeader.grandTotal || 0) - Number(advanceAmount || 0),
          orderHeader.notes || ''
        );
      } catch (e1) {
        console.error("❌ Failed step 1 (sales_orders):", e1.message);
        throw e1;
      }

      // 2. Insert Items, Job Work, and Outsource Jobs
      const insertItem = db.prepare(`
        INSERT INTO sales_order_items (id, sales_order_id, product_id, product_name_snapshot, job_card_id, custom_title, spec_id, spec_name, material, description, width, height, qty, unit, selling_rate, estimated_cost, actual_cost, discount, tax_type, gst_rate, hsn_code, amount, designer_required, designer_id, designer_name, design_status, artwork_status, artwork_url, outsource, vendor_id, vendor_name, estimated_vendor_cost, printer_id, printer_name, finisher_id, finisher_name, production_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertJob = db.prepare(`
        INSERT INTO job_work (id, job_number, sales_order_id, sales_order_item_id, job_type, description, quantity, status, assigned_to, start_date, expected_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertOutsource = db.prepare(`
        INSERT INTO outsource_jobs (id, outsource_number, sales_order_id, sales_order_item_id, supplier_id, supplier_name, work_description, quantity, outsource_cost, expected_date, sent_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let idx = 0; idx < items.length; idx++) {
        const it = items[idx];
        const itemId = it.id || `ITEM-${orderId}-${idx + 1}`;
        const jobCardId = it.jobCardId || `JC-${orderId}-${idx + 1}`;

        try {
          insertItem.run(
            itemId, orderId, it.productId || '', it.productName || 'Printing Item', jobCardId, it.customTitle || '', it.specId || '', it.specName || '', it.material || '', it.description || '', Number(it.width || 0), Number(it.height || 0), Number(it.qty || 1), it.unit || 'Sq.Ft', Number(it.sellingRate || 0), Number(it.estimatedCost || 0), Number(it.actualCost || 0), Number(it.discount || 0), it.taxType || 'GST_18', Number(it.gstRate || 18), it.hsnCode || '9989', Number(it.amount || 0), it.designerRequired || 'NO', it.designerId || '', it.designerName || '', it.designStatus || 'Pending', it.artworkStatus || 'Pending', it.artworkUrl || '', it.outsource ? 1 : 0, it.vendorId || '', it.vendorName || '', Number(it.estimatedVendorCost || 0), it.printerId || '', it.printerName || '', it.finisherId || '', it.finisherName || '', it.productionStatus || 'New'
          );
        } catch (e2) {
          console.error(`❌ Failed step 2 (sales_order_items item ${idx}):`, e2.message);
          throw e2;
        }

        // Persistent Job Work Record
        try {
          insertJob.run(
            `JW-${jobCardId}`, `JW-${jobCardId}`, orderId, itemId, it.productName, it.description || it.material || 'Printing job work', Number(it.qty || 1), 'New', it.printerName || it.designerName || 'Unassigned', orderHeader.orderDate, orderHeader.deliveryDate || ''
          );
        } catch (e3) {
          console.error(`❌ Failed step 3 (job_work item ${idx}):`, e3.message);
          throw e3;
        }

        // Multiple Outsource Jobs per Order (if line item is outsourced)
        if (it.outsource) {
          const outsourceJobId = `OUT-${jobCardId}`;
          let validSupplierId = null;
          if (it.vendorId) {
            const suppExists = db.prepare('SELECT id FROM suppliers WHERE id = ?').get(it.vendorId);
            if (suppExists) validSupplierId = it.vendorId;
          }
          try {
            insertOutsource.run(
              outsourceJobId, outsourceJobId, orderId, itemId, validSupplierId, it.vendorName || 'Outsource Vendor', `${it.productName} (${it.material || 'Custom Outsource'})`, Number(it.qty || 1), Number(it.estimatedVendorCost || 0), orderHeader.deliveryDate || '', orderHeader.orderDate, 'SENT'
            );
          } catch (e4) {
            console.error(`❌ Failed step 4 (outsource_jobs item ${idx}):`, e4.message);
            throw e4;
          }
        }
      }

      // 3. Advance Payment Receipt
      if (Number(advanceAmount || 0) > 0) {
        try {
          db.prepare(`
            INSERT INTO payments (id, order_id, customer_id, customer_name, amount, method, ref_no, status, paid_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `PAY-${orderId}-ADV`, orderId, validCustomerId, orderHeader.customerName || '', Number(advanceAmount), paymentMethod || 'Cash', 'Advance Deposit', 'Completed', new Date().toISOString()
          );
        } catch (e5) {
          console.error("❌ Failed step 5 (payments):", e5.message);
          throw e5;
        }
      }
    });

    createOrderTx();
    res.json({ success: true, orderId, orderNumber });
  } catch (err) {
    console.error("POST /api/sales-orders Error:", err.stack || err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. UPDATE PRODUCTION STATUS
app.put('/api/sales-orders/:orderId/items/:itemId/production-status', (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    db.prepare('UPDATE sales_order_items SET production_status = ? WHERE id = ? OR job_card_id = ?').run(status, itemId, itemId);
    db.prepare('UPDATE sales_orders SET production_status = ? WHERE id = ?').run(status, orderId);

    res.json({ success: true });
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
      SELECT m.*, e.name as employee_name, e.code as employee_code, e.department, e.designation, e.status as employee_status
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

// Start listening
const server = app.listen(PORT, () => {
  console.log(`🚀 Persistent SQLite ERP Server running on http://localhost:${PORT}`);
});

// Keep process event loop active permanently
setInterval(() => {}, 1000 * 60 * 60);
