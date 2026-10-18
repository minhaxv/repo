import { fileURLToPath } from 'url';
import { hashPassword } from './migrations.js';


export function seedDemoData(db) {
  const runInTransaction = db.transaction(() => {
    // 1. Company Profile
    db.prepare(`
      INSERT OR REPLACE INTO company_profile (
        id, name, tagline, gstin, state, state_code, phone, email, website, address,
        bank_name, account_no, ifsc, branch, upi_id, terms_conditions
      ) VALUES (
        1,
        'ScreenArts Digital & Signage India Pvt Ltd',
        'Total Digital, Offset, Flex & Signage Solutions',
        '32AAAAA0000A1Z5',
        'Kerala',
        '32',
        '+91 98470 12345',
        'orders@screenarts.in',
        'www.screenarts.online',
        'Building 4, Print & Signage Industrial Estate, Kozhikode, Kerala 673001',
        'HDFC Bank Ltd',
        '50200048192837',
        'HDFC0000123',
        'Calicut Main Branch, Kerala',
        'screenarts@hdfcbank',
        '1. 50% Advance mandatory on work confirmation.\n2. GST 18% extra as applicable on all orders.\n3. Goods once dispatched/collected cannot be returned.\n4. Design proofs must be approved in writing before production.'
      )
    `).run();

    // Clear transactional tables to prevent duplicate key conflicts
    db.prepare('DELETE FROM sales_order_items').run();
    db.prepare('DELETE FROM job_work').run();
    db.prepare('DELETE FROM outsource_jobs').run();
    db.prepare('DELETE FROM sales_orders').run();
    db.prepare('DELETE FROM outsource_payments').run();
    db.prepare('DELETE FROM outsource_bills').run();
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM production_task_time_logs').run();
    db.prepare('DELETE FROM production_tasks').run();
    db.prepare('DELETE FROM worker_job_incentives').run();
    db.prepare('DELETE FROM product_specifications').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM inventory_transactions').run();
    db.prepare('DELETE FROM inventory').run();
    db.prepare('DELETE FROM purchase_orders').run();
    db.prepare('DELETE FROM expenses').run();
    db.prepare('DELETE FROM attendance').run();
    db.prepare('DELETE FROM payroll').run();
    db.prepare('DELETE FROM machines').run();
    db.prepare('DELETE FROM suppliers').run();
    db.prepare('DELETE FROM customers').run();
    db.prepare('DELETE FROM sales_persons').run();
    db.prepare('DELETE FROM care_of_persons').run();
    // Clear remaining demo tables
    try { db.prepare('DELETE FROM production_processes').run(); } catch(e) {}
    try { db.prepare('DELETE FROM audit_logs').run(); } catch(e) {}
    try { db.prepare('DELETE FROM rework_tickets').run(); } catch(e) {}
    try { db.prepare('DELETE FROM artwork_versions').run(); } catch(e) {}
    try { db.prepare('DELETE FROM delivery_items').run(); } catch(e) {}
    try { db.prepare('DELETE FROM delivery_notes').run(); } catch(e) {}
    try { db.prepare('DELETE FROM material_boms').run(); } catch(e) {}
    try { db.prepare('DELETE FROM journal_entries').run(); } catch(e) {}
    try { db.prepare('DELETE FROM journal_vouchers').run(); } catch(e) {}
    try { db.prepare('DELETE FROM unmapped_biometric_punches').run(); } catch(e) {}

    // 2. Customers
    const insertCustomer = db.prepare(`
      INSERT INTO customers (
        id, customer_code, name, mobile, additional_mobiles, email, address, city, pincode, district, state,
        gst_number, customer_type, credit_limit, referral_commission_pct, notes, outstanding,
        opening_balance, opening_balance_type, opening_balance_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const customersData = [
      {
        id: 'CUST-101',
        code: 'ARC-101',
        name: 'Apex Retail Solutions Pvt Ltd',
        mobile: '9821011223',
        addMobiles: JSON.stringify(['9821011224']),
        email: 'procurement@apexretail.com',
        address: 'Suite 402, Trade Tower, BKC',
        city: 'Mumbai',
        pincode: '400051',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        gst: '27AAACA1234F1Z5',
        type: 'Corporate',
        creditLimit: 250000,
        comm: 0.2,
        notes: 'Premium key account for retail chain branding & rollup standees.',
        outstanding: 27908,
        opBal: 0,
        opType: 'Receivable',
        opDate: '2026-04-01'
      },
      {
        id: 'CUST-102',
        code: 'ARC-102',
        name: 'Shree Ganesh Advertising (Dealer)',
        mobile: '9892044556',
        addMobiles: '[]',
        email: 'ganesh.ads@gmail.com',
        address: '12 Shivaji Commercial Complex, Deccan',
        city: 'Pune',
        pincode: '411004',
        district: 'Pune',
        state: 'Maharashtra',
        gst: '27BCDPS9911B1Z3',
        type: 'Dealer',
        creditLimit: 150000,
        comm: 0.25,
        notes: 'Signage dealer network partner. Eligible for trade discount rates.',
        outstanding: 3788,
        opBal: 0,
        opType: 'Receivable',
        opDate: '2026-04-01'
      },
      {
        id: 'CUST-103',
        code: 'ARC-103',
        name: 'Dr. Alok Mehta (Mehta Eye Clinic)',
        mobile: '9867088990',
        addMobiles: '[]',
        email: 'drmehta.clinic@gmail.com',
        address: 'Mavoor Road Medical Square',
        city: 'Kozhikode',
        pincode: '673004',
        district: 'Kozhikode',
        state: 'Kerala',
        gst: '',
        type: 'Regular',
        creditLimit: 25000,
        comm: 0.2,
        notes: 'Walk-in healthcare clinic customer. Self-inking stamps & prescription pads.',
        outstanding: 0,
        opBal: 0,
        opType: 'Receivable',
        opDate: '2026-04-01'
      },
      {
        id: 'CUST-104',
        code: 'ARC-104',
        name: 'Maharashtra Tourism Dev Corp (MTDC)',
        mobile: '9422077112',
        addMobiles: '[]',
        email: 'tenders@maharashtratourism.gov.in',
        address: 'CDO Hutments, Opp Mantralaya, Nariman Point',
        city: 'Mumbai',
        pincode: '400021',
        district: 'Mumbai City',
        state: 'Maharashtra',
        gst: '27MUMT00192A1Z9',
        type: 'Government',
        creditLimit: 500000,
        comm: 0.15,
        notes: 'State tourism high-volume outdoor flex campaign hoarding contracts.',
        outstanding: 48500,
        opBal: 0,
        opType: 'Receivable',
        opDate: '2026-04-01'
      },
      {
        id: 'CUST-105',
        code: 'ARC-105',
        name: 'Rahul Verma (Walk-in)',
        mobile: '9819933445',
        addMobiles: '[]',
        email: 'rahul.verma@outlook.com',
        address: 'Near Beach Road',
        city: 'Kozhikode',
        pincode: '673032',
        district: 'Kozhikode',
        state: 'Kerala',
        gst: '',
        type: 'Walk-in',
        creditLimit: 10000,
        comm: 0.2,
        notes: 'Counter walk-in client. Cash / UPI immediate settlement.',
        outstanding: 0,
        opBal: 0,
        opType: 'Receivable',
        opDate: '2026-04-01'
      },
      {
        id: 'CUST-106',
        code: 'ARC-106',
        name: 'Gujarat Commercial Corp (Interstate)',
        mobile: '9879055443',
        addMobiles: '[]',
        email: 'orders@gujaratcommercial.co.in',
        address: 'Plot 48, GIDC Industrial Estate, Makarpura',
        city: 'Vadodara',
        pincode: '390010',
        district: 'Vadodara',
        state: 'Gujarat',
        gst: '24AAACG8877K1ZB',
        type: 'Corporate',
        creditLimit: 200000,
        comm: 0.2,
        notes: 'Interstate customer testing IGST calculation.',
        outstanding: 0,
        opBal: 0,
        opType: 'Receivable',
        opDate: '2026-04-01'
      },
      {
        id: 'CUST-107',
        code: 'ARC-107',
        name: 'Zeta Fashion Pvt Ltd',
        mobile: '9820011998',
        addMobiles: '[]',
        email: 'storebranding@zetafashion.com',
        address: 'Fashion Hub, Senapati Bapat Marg, Lower Parel',
        city: 'Mumbai',
        pincode: '400013',
        district: 'Mumbai City',
        state: 'Maharashtra',
        gst: '27ZETAF8811P1Z9',
        type: 'Corporate',
        creditLimit: 300000,
        comm: 0.2,
        notes: 'Apparel chain store acrylic 3D branding, window vinyls & menu boards.',
        outstanding: 0,
        opBal: 0,
        opType: 'Receivable',
        opDate: '2026-04-01'
      },
      {
        id: 'CUST-108',
        code: 'ARC-108',
        name: 'Karnataka Outdoor Media Agency',
        mobile: '9845012345',
        addMobiles: '[]',
        email: 'production@karnatakaoutdoor.com',
        address: '88 MG Road, Near Trinity Circle',
        city: 'Bengaluru',
        pincode: '560001',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        gst: '29AAACK9911D1Z4',
        type: 'Agency',
        creditLimit: 400000,
        comm: 0.25,
        notes: 'Outdoor advertising agency. Bulk flex printing and banner rolls.',
        outstanding: 0,
        opBal: 0,
        opType: 'Receivable',
        opDate: '2026-04-01'
      }
    ];

    for (const c of customersData) {
      insertCustomer.run(
        c.id, c.code, c.name, c.mobile, c.addMobiles, c.email, c.address, c.city, c.pincode, c.district, c.state,
        c.gst, c.type, c.creditLimit, c.comm, c.notes, c.outstanding, c.opBal, c.opType, c.opDate
      );
    }

    // 3. Sales Persons & Care Of
    const insertSalesPerson = db.prepare(`
      INSERT INTO sales_persons (id, name, mobile, email, commission_rate, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    const salesPersonsData = [
      { id: 'SP-01', name: 'Ramesh Sharma', mobile: '9820199881', email: 'ramesh.sharma@printflow.in', comm: 3.5 },
      { id: 'SP-02', name: 'Priya Patel', mobile: '9820288772', email: 'priya.patel@printflow.in', comm: 4.0 },
      { id: 'SP-03', name: 'Rohit Gupta', mobile: '9820377663', email: 'rohit.gupta@printflow.in', comm: 3.0 },
      { id: 'SP-04', name: 'Neha Joshi', mobile: '9820466554', email: 'neha.joshi@printflow.in', comm: 3.0 }
    ];
    for (const sp of salesPersonsData) insertSalesPerson.run(sp.id, sp.name, sp.mobile, sp.email, sp.comm);

    const insertCareOf = db.prepare(`
      INSERT INTO care_of_persons (id, name, mobile, email, commission_rate, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    const careOfData = [
      { id: 'CO-01', name: 'Sneha Rao', mobile: '9819122334', email: 'sneha.rao@associates.in', comm: 2.5 },
      { id: 'CO-02', name: 'Vikram Desai', mobile: '9819233445', email: 'vikram.desai@associates.in', comm: 2.0 },
      { id: 'CO-03', name: 'Anil Kulkarni', mobile: '9819344556', email: 'anil.k@associates.in', comm: 2.0 },
      { id: 'CO-04', name: 'Deepa Menon', mobile: '9819455667', email: 'deepa.m@associates.in', comm: 2.5 }
    ];
    for (const co of careOfData) insertCareOf.run(co.id, co.name, co.mobile, co.email, co.comm);

    // 4. Employees Master
    const insertEmployee = db.prepare(`
      INSERT OR REPLACE INTO employees (
        id, code, name, role, department, mobile, email, base_salary, incentive_rate, commission_rate,
        joined_date, active, designation, status, allowed_processes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'Active', ?)
    `);

    const employeesData = [
      { id: 'EMP-ADM-01', code: 'EMP-MGT-01', name: 'Minhaj V (Admin)', role: 'Admin', dept: 'Management', mob: '9847012345', email: 'admin@screenarts.in', sal: 65000, inc: 0, comm: 0, desig: 'General Manager & Admin', procs: '[]' },
      { id: 'EMP-101', code: 'EMP-SLS-01', name: 'Ramesh Sharma', role: 'Sales', dept: 'Sales', mob: '9820199881', email: 'ramesh.sharma@printflow.in', sal: 25000, inc: 0, comm: 3.5, desig: 'Senior Sales Executive', procs: '[]' },
      { id: 'EMP-102', code: 'EMP-SLS-02', name: 'Priya Patel', role: 'Sales', dept: 'Sales', mob: '9820288772', email: 'priya.patel@printflow.in', sal: 32000, inc: 0, comm: 4.0, desig: 'Corporate Sales Manager', procs: '[]' },
      { id: 'EMP-103', code: 'EMP-DES-01', name: 'Ananya Roy', role: 'Designer', dept: 'Design', mob: '9820311223', email: 'ananya.roy@printflow.in', sal: 35000, inc: 15, comm: 0, desig: 'Creative Art Director', procs: JSON.stringify(['Designing', 'Proofing']) },
      { id: 'EMP-104', code: 'EMP-DES-02', name: 'Karthik Nair', role: 'Designer', dept: 'Design', mob: '9820422334', email: 'karthik.nair@printflow.in', sal: 28000, inc: 12, comm: 0, desig: 'Senior Graphic Designer', procs: JSON.stringify(['Designing', 'Proofing']) },
      { id: 'EMP-106', code: 'EMP-PRT-01', name: 'Vikas Patil', role: 'Operator', dept: 'Printing', mob: '9820644556', email: 'vikas.patil@printflow.in', sal: 22000, inc: 8, comm: 0, desig: 'Large Format Flex Operator', procs: JSON.stringify(['Large Format Printing', 'Digital Printing']) },
      { id: 'EMP-110', code: 'EMP-PRD-01', name: 'Afsal', role: 'Worker', dept: 'Production', mob: '9820755667', email: 'afsal.p@printflow.in', sal: 21000, inc: 10, comm: 0, desig: 'Master Seal Maker & CNC Specialist', procs: JSON.stringify(['Seal Making', 'Sticker Cutting', 'Plotter Cutting']) },
      { id: 'EMP-112', code: 'EMP-FIN-01', name: 'Rahman', role: 'Worker', dept: 'Production', mob: '9820866778', email: 'rahman.k@printflow.in', sal: 19500, inc: 8, comm: 0, desig: 'Lamination & Post-Press Specialist', procs: JSON.stringify(['Lamination', 'Mounting', 'Folding']) },
      { id: 'EMP-113', code: 'EMP-FIN-02', name: 'Sameer', role: 'Worker', dept: 'Production', mob: '9820977889', email: 'sameer.m@printflow.in', sal: 18000, inc: 8, comm: 0, desig: 'Finishing & Packaging Coordinator', procs: JSON.stringify(['Cutting', 'Binding', 'Packing', 'Eyelet']) }
    ];

    for (const e of employeesData) {
      insertEmployee.run(e.id, e.code, e.name, e.role, e.dept, e.mob, e.email, e.sal, e.inc, e.comm, '2024-01-15', e.desig, e.procs);
    }

    // 5. Suppliers / Vendors
    const insertSupplier = db.prepare(`
      INSERT INTO suppliers (
        id, supplier_code, name, category, mobile, email, address, gstin, pending_payment, avg_turnaround_days, notes, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const suppliersData = [
      { id: 'VEN-01', code: 'VEN-01', name: 'Apex Acrylic Cutters & Engravers', cat: 'Laser & CNC Cutting', mob: '9840199888', email: 'sales@apexacrylic.com', addr: 'Industrial Estate, Andheri East, Mumbai', gst: '27AAFAA9988C1Z1', pending: 14500, days: 2, notes: 'Laser cutting & acrylic fabrication specialist' },
      { id: 'VEN-02', code: 'VEN-02', name: 'SignTech Media & Vinyl Suppliers', cat: 'Rolls & Media Supplies', mob: '9892011223', email: 'orders@signtechmedia.in', addr: 'Bhiwandi Warehousing Zone, Thane', gst: '27BBBCS4455D1Z2', pending: 32000, days: 1, notes: 'Star flex rolls, Avery vinyl, banner media' },
      { id: 'VEN-03', code: 'VEN-03', name: 'LaserCraft India (Metal Letters)', cat: '3D Metal Letters', mob: '9820033441', email: 'contact@lasercraft.co.in', addr: 'Goregaon West, Mumbai', gst: '27CCCLL7788M1Z8', pending: 0, days: 3, notes: 'Titanium gold & stainless steel channel letters' },
      { id: 'VEN-04', code: 'VEN-04', name: 'ABC Embroidery', cat: 'Screen & Textile Processing', mob: '9819077665', email: 'abc.embroidery@gmail.com', addr: 'Surat Textile Market / Mumbai Depot', gst: '27DDEEF6677N1Z9', pending: 15000, days: 3, notes: 'Apparel branding, cap embroidery, flags' }
    ];

    for (const v of suppliersData) {
      insertSupplier.run(v.id, v.code, v.name, v.cat, v.mob, v.email, v.addr, v.gst, v.pending, v.days, v.notes);
    }

    // 6. Products Master & Specifications
    const insertProduct = db.prepare(`
      INSERT INTO products (
        id, product_code, name, category, unit, default_rate, estimated_cost, gst_rate, hsn_code, is_custom, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `);

    const insertSpec = db.prepare(`
      INSERT INTO product_specifications (
        id, product_id, spec_name, material_name, description, unit, cost_price, selling_price, gst_rate, hsn_code, is_default, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `);

    const productsData = [
      {
        id: 'PROD-01', code: 'PRD-FLX-01', name: 'Star Flex Banner Printing (240gsm Frontlit)', cat: 'Flex & Banner', unit: 'Sq.Ft', rate: 15, cost: 7.5, gst: 18, hsn: '9989',
        specs: [
          { id: 'SPEC-101', name: '240gsm Star Frontlit Flex', mat: 'Star Flex Media', desc: 'Standard outdoor frontlit flex banner', unit: 'Sq.Ft', cost: 7.5, sell: 15, isDef: 1 },
          { id: 'SPEC-102', name: '340gsm Heavy Duty Blackout Flex', mat: 'Blackout Flex', desc: 'Heavy weight flex with black back barrier', unit: 'Sq.Ft', cost: 12, sell: 22, isDef: 0 }
        ]
      },
      {
        id: 'PROD-02', code: 'PRD-VNY-01', name: 'Self-Adhesive Vinyl Gloss Sticker Printing', cat: 'Vinyl & Stickers', unit: 'Sq.Ft', rate: 35, cost: 16, gst: 18, hsn: '9989',
        specs: [
          { id: 'SPEC-103', name: 'Avery Dennison Gloss White Vinyl', mat: 'Avery Gloss Vinyl', desc: 'High gloss digital self-adhesive vinyl for signage', unit: 'Sq.Ft', cost: 16, sell: 35, isDef: 1 },
          { id: 'SPEC-104', name: 'Matte Laminated Waterproof Vinyl', mat: 'Vinyl + Matte Film', desc: 'Durable sticker with thermal matte lamination', unit: 'Sq.Ft', cost: 22, sell: 45, isDef: 0 }
        ]
      },
      {
        id: 'PROD-03', code: 'PRD-ACR-01', name: 'Cast Acrylic 3D LED Signboard Letters', cat: 'Architectural Signage', unit: 'Sq.Ft', rate: 1200, cost: 650, gst: 18, hsn: '9405',
        specs: [
          { id: 'SPEC-105', name: 'Acrylic Face Lit 3D Letters (Samsung LED)', mat: '3mm Cast Acrylic + LED', desc: 'Frontlit acrylic channel letters with IP67 LED modules', unit: 'Sq.Ft', cost: 650, sell: 1200, isDef: 1 },
          { id: 'SPEC-106', name: 'Titanium Gold Stainless Steel 3D Letters', mat: 'SS 304 Titanium Gold Sheet', desc: 'Premium luxury gold backlit halo letters', unit: 'Sq.Ft', cost: 950, sell: 1800, isDef: 0 }
        ]
      },
      {
        id: 'PROD-04', code: 'PRD-STD-01', name: 'Rollup Standee Deluxe (3x6 ft)', cat: 'Display & Exhibition', unit: 'Nos', rate: 1650, cost: 850, gst: 18, hsn: '9989',
        specs: [
          { id: 'SPEC-107', name: 'Aluminium Wide Base Rollup Standee 3x6 ft', mat: 'Aluminium Base + Star Flex', desc: 'Portable pull-up banner with aluminium cassette', unit: 'Nos', cost: 850, sell: 1650, isDef: 1 }
        ]
      },
      {
        id: 'PROD-05', code: 'PRD-CRD-01', name: 'Executive Business Visiting Cards (Velvet Spot UV)', cat: 'Commercial Print', unit: 'Box', rate: 850, cost: 380, gst: 18, hsn: '4911',
        specs: [
          { id: 'SPEC-108', name: '350gsm Velvet Lamination + Raised Spot UV', mat: '350gsm Premium Art Card', desc: 'Luxury tactile business cards, box of 1000 pcs', unit: 'Box', cost: 380, sell: 850, isDef: 1 }
        ]
      },
      {
        id: 'PROD-07', code: 'PRD-SLM-01', name: 'Flash Self-Inking Rubber Stamp (Trodat)', cat: 'Stamp & Seal', unit: 'Nos', rate: 450, cost: 160, gst: 18, hsn: '9611',
        specs: [
          { id: 'SPEC-109', name: 'Trodat 4912 Self-Inking Address Stamp', mat: 'Trodat Casing + Flash Foam', desc: 'Pre-inked automatic stamp, 50x20mm impression', unit: 'Nos', cost: 160, sell: 450, isDef: 1 }
        ]
      },
      {
        id: 'PROD-08', code: 'PRD-SNB-01', name: 'Sunboard 5mm Mounting with Laminated Vinyl', cat: 'Rigid Signage', unit: 'Sq.Ft', rate: 75, cost: 36, gst: 18, hsn: '3920',
        specs: [
          { id: 'SPEC-110', name: '5mm High Density Sunboard + Gloss Vinyl', mat: '5mm Sunboard + Vinyl Film', desc: 'Rigid wall display board with protective lamination', unit: 'Sq.Ft', cost: 36, sell: 75, isDef: 1 }
        ]
      }
    ];

    for (const p of productsData) {
      insertProduct.run(p.id, p.code, p.name, p.cat, p.unit, p.rate, p.cost, p.gst, p.hsn);
      for (const s of p.specs) {
        insertSpec.run(s.id, p.id, s.name, s.mat, s.desc, s.unit, s.cost, s.sell, p.gst, p.hsn, s.isDef);
      }
    }

    // 7. Machines Master
    const insertMachine = db.prepare(`
      INSERT INTO machines (
        id, code, name, model, process_category, hourly_rate, status, runtime_hours, last_maintenance_date,
        assigned_operator_id, assigned_operator_name, location, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    `);

    const machinesData = [
      { id: 'MCH-01', code: 'PRN-ROL-01', name: 'Roland TrueVIS VG3-640 (64" Eco-Solvent)', model: 'VG3-640 Dual Head 8-Color', cat: 'Large Format Printing', rate: 450, status: 'Running', hours: 1840, maint: '2026-09-15', opId: 'EMP-106', opName: 'Vikas Patil', loc: 'Large Format Hall Bay 1' },
      { id: 'MCH-02', code: 'PRN-KON-01', name: 'Konica Minolta AccurioPress C4070 (Digital Color)', model: 'AccurioPress C4070 High Speed', cat: 'Digital Printing', rate: 650, status: 'Idle', hours: 920, maint: '2026-09-20', opId: 'EMP-103', opName: 'Ananya Roy', loc: 'Pre-Press Digital Press Room' },
      { id: 'MCH-03', code: 'CNC-MUL-01', name: 'Multicam 3000 CNC Heavy Duty Router (8x4 ft)', model: 'Multicam 3000 Series 3kW Spindle', cat: 'Finishing', rate: 550, status: 'Running', hours: 2410, maint: '2026-09-10', opId: 'EMP-110', opName: 'Afsal', loc: 'Fabrication & CNC Workshop' },
      { id: 'MCH-04', code: 'LSR-PRO-01', name: 'LaserPro Spirit GLS 100W Hybrid Laser Cutter', model: 'Spirit GLS 100W CO2 Laser', cat: 'Finishing', rate: 400, status: 'Running', hours: 1450, maint: '2026-09-25', opId: 'EMP-110', opName: 'Afsal', loc: 'Laser Cutting Bay' },
      { id: 'MCH-05', code: 'CUT-POL-01', name: 'Polar 115 High-Speed Hydraulic Guillotine Cutter', model: 'Polar Mohr 115cm Hydraulic Programmable', cat: 'Finishing', rate: 300, status: 'Running', hours: 3120, maint: '2026-09-05', opId: 'EMP-113', opName: 'Sameer', loc: 'Paper Finishing & Trimming Area' },
      { id: 'MCH-06', code: 'LAM-EXC-01', name: 'Excelam Plus 650 Cold & Thermal Roll Laminator', model: 'Excelam 650 Heavy Duty Hot/Cold', cat: 'Finishing', rate: 250, status: 'Running', hours: 1670, maint: '2026-09-18', opId: 'EMP-112', opName: 'Rahman', loc: 'Finishing Floor' },
      { id: 'MCH-07', code: 'SLM-FLS-01', name: 'FlashStamp Pro III Digital Photopolymer Seal Machine', model: 'FlashStamp Pro Tri-Lamp Exposure', cat: 'Fabrication', rate: 200, status: 'Idle', hours: 540, maint: '2026-09-22', opId: 'EMP-110', opName: 'Afsal', loc: 'Seal Engraving Desk' }
    ];

    for (const m of machinesData) {
      insertMachine.run(m.id, m.code, m.name, m.model, m.cat, m.rate, m.status, m.hours, m.maint, m.opId, m.opName, m.loc);
    }

    // 8. Inventory Master
    const insertInventory = db.prepare(`
      INSERT INTO inventory (
        id, name, category, current_stock, unit, reorder_level, unit_cost, min_reorder_level, preferred_supplier, last_purchase_rate, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const inventoryData = [
      { id: 'INV-01', name: 'Star Frontlit Flex 240gsm (10ft x 50m Roll)', cat: 'Flex Media', stock: 18, unit: 'Roll', reorder: 5, cost: 3200, minReorder: 2, supp: 'SignTech Media & Vinyl Suppliers', lastRate: 3150 },
      { id: 'INV-02', name: 'Avery Dennison Glossy White Self-Adhesive Vinyl (4ft x 50m)', cat: 'Vinyl Media', stock: 12, unit: 'Roll', reorder: 4, cost: 4500, minReorder: 2, supp: 'SignTech Media & Vinyl Suppliers', lastRate: 4400 },
      { id: 'INV-03', name: 'Cast Acrylic Clear Sheet 3mm (8ft x 4ft)', cat: 'Acrylic & Rigid', stock: 45, unit: 'Sheet', reorder: 15, cost: 1850, minReorder: 10, supp: 'Apex Acrylic Cutters & Engravers', lastRate: 1800 },
      { id: 'INV-04', name: 'White Sunboard 5mm Sheet (8ft x 4ft)', cat: 'Sunboard Media', stock: 60, unit: 'Sheet', reorder: 20, cost: 680, minReorder: 15, supp: 'SignTech Media & Vinyl Suppliers', lastRate: 670 },
      { id: 'INV-05', name: 'Roland Eco-Solvent CMYK Ink Set (500ml)', cat: 'Inks & Chemicals', stock: 8, unit: 'Set', reorder: 3, cost: 7200, minReorder: 2, supp: 'SignTech Media & Vinyl Suppliers', lastRate: 7100 },
      { id: 'INV-06', name: 'Matte Thermal Lamination Film 25 Micron (24" x 1000m)', cat: 'Lamination Film', stock: 6, unit: 'Roll', reorder: 2, cost: 1450, minReorder: 1, supp: 'SignTech Media & Vinyl Suppliers', lastRate: 1400 },
      { id: 'INV-07', name: 'Trodat 4912 Self-Inking Stamp Handle & Pad', cat: 'Stamp Parts', stock: 50, unit: 'Nos', reorder: 15, cost: 120, minReorder: 10, supp: 'Apex Acrylic Cutters & Engravers', lastRate: 115 },
      { id: 'INV-08', name: 'Rollup Standee Aluminium Base 3x6 ft', cat: 'Display Hardware', stock: 25, unit: 'Nos', reorder: 10, cost: 420, minReorder: 5, supp: 'SignTech Media & Vinyl Suppliers', lastRate: 410 }
    ];

    const insertInvTx = db.prepare(`
      INSERT INTO inventory_transactions (
        id, material_id, material_name, quantity, unit, transaction_type, reference_type, reference_id,
        planned_consumption, actual_consumption, wastage_qty, wastage_reason, material_batch, employee_id, employee_name, remarks
      ) VALUES (?, ?, ?, ?, ?, 'PURCHASE_IN', 'OPENING_STOCK', 'OPENING-2026', ?, ?, 0, '', 'BATCH-INIT-01', 'EMP-ADM-01', 'Minhaj V (Admin)', 'Initial factory floor opening inventory audit')
    `);

    for (const inv of inventoryData) {
      insertInventory.run(inv.id, inv.name, inv.cat, inv.stock, inv.unit, inv.reorder, inv.cost, inv.minReorder, inv.supp, inv.lastRate);
      insertInvTx.run(`ITX-INIT-${inv.id}`, inv.id, inv.name, inv.stock, inv.unit, inv.stock, inv.stock);
    }

    // 9. Sales Orders & Line Items
    const insertOrder = db.prepare(`
      INSERT INTO sales_orders (
        id, order_number, customer_id, customer_name, sales_person_id, sales_person_name, care_of_id, care_of_name,
        reference_no, order_date, due_date, production_status, payment_status, subtotal, discount, tax_total,
        grand_total, advance_amount, balance_amount, delivered_by, notes, created_at, billed_by_staff, billed_by_id,
        billed_by_role, billed_at, cgst, sgst, igst, round_off, tax_mode, version, order_type, quotation_status,
        customer_gstin, invoice_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `);

    const insertOrderItem = db.prepare(`
      INSERT INTO sales_order_items (
        id, sales_order_id, product_id, product_name_snapshot, job_card_id, custom_title, spec_id, spec_name,
        material, description, width, height, qty, unit, selling_rate, estimated_cost, actual_cost, discount,
        tax_type, gst_rate, hsn_code, amount, designer_required, designer_id, designer_name, design_status,
        artwork_status, artwork_url, outsource, vendor_id, vendor_name, estimated_vendor_cost, actual_vendor_bill,
        printer_id, printer_name, finisher_id, finisher_name, production_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const ordersData = [
      {
        id: 'SO-2026-0891',
        num: 'SO-2026-0891',
        custId: 'CUST-101',
        custName: 'Apex Retail Solutions Pvt Ltd',
        spId: 'SP-01',
        spName: 'Ramesh Sharma',
        coId: 'CO-01',
        coName: 'Sneha Rao',
        ref: 'PO-APEX-8841',
        date: '2026-09-28',
        due: '2026-10-04',
        prodStatus: 'Printing',
        payStatus: 'Partially Paid',
        subtotal: 40600,
        disc: 0,
        tax: 7308,
        grand: 47908,
        adv: 20000,
        bal: 27908,
        delBy: '',
        notes: 'Priority festive store rollout branding. Deliver directly to BKC showroom.',
        billedBy: 'Minhaj V (Admin)',
        billedId: 'EMP-ADM-01',
        billedRole: 'Admin',
        cgst: 3654,
        sgst: 3654,
        igst: 0,
        round: 0,
        taxMode: 'EXCLUSIVE',
        orderType: 'Direct',
        quoteStatus: null,
        gstin: '27AAACA1234F1Z5',
        invType: 'B2B',
        items: [
          {
            id: 'ITEM-891-1',
            prodId: 'PROD-01',
            prodName: 'Star Flex Banner Printing (240gsm Frontlit)',
            jcId: 'JC-891-1',
            title: 'Storefront Entrance Banner',
            specId: 'SPEC-101',
            specName: '240gsm Star Frontlit Flex',
            mat: 'Star Flex 240gsm',
            desc: 'High gloss outdoor entrance flex banner with brass eyelets',
            w: 10, h: 4, qty: 1, unit: 'Sq.Ft', rate: 15, estCost: 300, actCost: 300, disc: 0, taxType: 'ETR', gst: 18, hsn: '9989', amt: 600,
            desReq: 'YES', desId: 'EMP-104', desName: 'Karthik Nair', desStatus: 'Approved', artStatus: 'Approved',
            outsource: 0, vId: null, vName: null, vEst: 0, vBill: 0,
            prtId: 'EMP-106', prtName: 'Vikas Patil', finId: 'EMP-113', finName: 'Sameer', pStatus: 'Printing'
          },
          {
            id: 'ITEM-891-2',
            prodId: 'PROD-02',
            prodName: 'Self-Adhesive Vinyl Gloss Sticker Printing',
            jcId: 'JC-891-2',
            title: 'Promotional Product Decal Stickers',
            specId: 'SPEC-103',
            specName: 'Avery Dennison Gloss White Vinyl',
            mat: 'Avery Gloss Vinyl',
            desc: 'Kiss-cut circular branding stickers 2x2 ft sheets',
            w: 2, h: 2, qty: 250, unit: 'Sq.Ft', rate: 35, estCost: 8000, actCost: 8000, disc: 0, taxType: 'ETR', gst: 18, hsn: '9989', amt: 17500,
            desReq: 'NO', desId: '', desName: '', desStatus: 'Approved', artStatus: 'Approved',
            outsource: 0, vId: null, vName: null, vEst: 0, vBill: 0,
            prtId: 'EMP-106', prtName: 'Vikas Patil', finId: 'EMP-110', finName: 'Afsal', pStatus: 'Printing'
          },
          {
            id: 'ITEM-891-3',
            prodId: 'PROD-07',
            prodName: 'Flash Self-Inking Rubber Stamp (Trodat)',
            jcId: 'JC-891-3',
            title: 'Trodat Store Stamp',
            specId: 'SPEC-109',
            specName: 'Trodat 4912 Self-Inking Address Stamp',
            mat: 'Trodat Casing + Flash Foam',
            desc: 'Custom address & GST stamp for store counter',
            w: 0, h: 0, qty: 50, unit: 'Nos', rate: 450, estCost: 8000, actCost: 8000, disc: 0, taxType: 'ETR', gst: 18, hsn: '9611', amt: 22500,
            desReq: 'YES', desId: 'EMP-104', desName: 'Karthik Nair', desStatus: 'Approved', artStatus: 'Approved',
            outsource: 0, vId: null, vName: null, vEst: 0, vBill: 0,
            prtId: '', prtName: '', finId: 'EMP-110', finName: 'Afsal', pStatus: 'Completed'
          }
        ]
      },
      {
        id: 'SO-2026-0892',
        num: 'SO-2026-0892',
        custId: 'CUST-102',
        custName: 'Shree Ganesh Advertising (Dealer)',
        spId: 'SP-01',
        spName: 'Ramesh Sharma',
        coId: 'CO-02',
        coName: 'Vikram Desai',
        ref: 'SGA-ORD-44',
        date: '2026-09-29',
        due: '2026-10-02',
        prodStatus: 'Ready for Delivery',
        payStatus: 'Partially Paid',
        subtotal: 6600,
        disc: 0,
        tax: 1188,
        grand: 7788,
        adv: 4000,
        bal: 3788,
        delBy: '',
        notes: 'Dealer pickup from factory counter.',
        billedBy: 'Ramesh Sharma',
        billedId: 'EMP-101',
        billedRole: 'Sales',
        cgst: 594,
        sgst: 594,
        igst: 0,
        round: 0,
        taxMode: 'EXCLUSIVE',
        orderType: 'Direct',
        quoteStatus: null,
        gstin: '27BCDPS9911B1Z3',
        invType: 'B2B',
        items: [
          {
            id: 'ITEM-892-1',
            prodId: 'PROD-04',
            prodName: 'Rollup Standee Deluxe (3x6 ft)',
            jcId: 'JC-892-1',
            title: 'Exhibition Rollup Standees',
            specId: 'SPEC-107',
            specName: 'Aluminium Wide Base Rollup Standee 3x6 ft',
            mat: 'Aluminium Stand + Flex',
            desc: 'Deluxe aluminium rollup standees with transport bag',
            w: 3, h: 6, qty: 4, unit: 'Nos', rate: 1650, estCost: 3400, actCost: 3400, disc: 0, taxType: 'ETR', gst: 18, hsn: '9989', amt: 6600,
            desReq: 'NO', desId: '', desName: '', desStatus: 'Approved', artStatus: 'Approved',
            outsource: 0, vId: null, vName: null, vEst: 0, vBill: 0,
            prtId: 'EMP-106', prtName: 'Vikas Patil', finId: 'EMP-113', finName: 'Sameer', pStatus: 'Completed'
          }
        ]
      },
      {
        id: 'SO-2026-0893',
        num: 'SO-2026-0893',
        custId: 'CUST-106',
        custName: 'Gujarat Commercial Corp (Interstate)',
        spId: 'SP-02',
        spName: 'Priya Patel',
        coId: 'CO-03',
        coName: 'Anil Kulkarni',
        ref: 'GCC-EXP-12',
        date: '2026-09-30',
        due: '2026-10-06',
        prodStatus: 'Design',
        payStatus: 'Paid',
        subtotal: 13050,
        disc: 0,
        tax: 2349,
        grand: 15399,
        adv: 15399,
        bal: 0,
        delBy: '',
        notes: 'Interstate shipment. Transport via VRL Logistics.',
        billedBy: 'Priya Patel',
        billedId: 'EMP-102',
        billedRole: 'Sales',
        cgst: 0,
        sgst: 0,
        igst: 2349,
        round: 0,
        taxMode: 'EXCLUSIVE',
        orderType: 'Direct',
        quoteStatus: null,
        gstin: '24AAACG8877K1ZB',
        invType: 'B2B',
        items: [
          {
            id: 'ITEM-893-1',
            prodId: 'PROD-04',
            prodName: 'Rollup Standee Deluxe (3x6 ft)',
            jcId: 'JC-893-1',
            title: 'Exhibition Rollup Standees',
            specId: 'SPEC-107',
            specName: 'Aluminium Wide Base Rollup Standee 3x6 ft',
            mat: 'Aluminium Stand + Flex',
            desc: 'Deluxe aluminium rollup standees',
            w: 3, h: 6, qty: 5, unit: 'Nos', rate: 1650, estCost: 4250, actCost: 4250, disc: 0, taxType: 'ETR', gst: 18, hsn: '9989', amt: 8250,
            desReq: 'YES', desId: 'EMP-103', desName: 'Ananya Roy', desStatus: 'In Progress', artStatus: 'Pending',
            outsource: 0, vId: null, vName: null, vEst: 0, vBill: 0,
            prtId: '', prtName: '', finId: '', finName: '', pStatus: 'Design'
          },
          {
            id: 'ITEM-893-2',
            prodId: 'PROD-08',
            prodName: 'Sunboard 5mm Mounting with Laminated Vinyl',
            jcId: 'JC-893-2',
            title: 'Factory Safety Signage Boards',
            specId: 'SPEC-110',
            specName: '5mm High Density Sunboard + Gloss Vinyl',
            mat: '5mm Sunboard + Vinyl',
            desc: 'Industrial warning signs with matte lamination',
            w: 8, h: 4, qty: 2, unit: 'Sq.Ft', rate: 75, estCost: 2304, actCost: 2304, disc: 0, taxType: 'ETR', gst: 18, hsn: '3920', amt: 4800,
            desReq: 'YES', desId: 'EMP-103', desName: 'Ananya Roy', desStatus: 'In Progress', artStatus: 'Pending',
            outsource: 0, vId: null, vName: null, vEst: 0, vBill: 0,
            prtId: '', prtName: '', finId: '', finName: '', pStatus: 'Design'
          }
        ]
      },
      {
        id: 'SO-2026-0885',
        num: 'SO-2026-0885',
        custId: 'CUST-104',
        custName: 'Maharashtra Tourism Dev Corp (MTDC)',
        spId: 'SP-01',
        spName: 'Ramesh Sharma',
        coId: 'CO-01',
        coName: 'Sneha Rao',
        ref: 'TND-MTDC-2026-09',
        date: '2026-09-22',
        due: '2026-10-05',
        prodStatus: 'Printing',
        payStatus: 'Partially Paid',
        subtotal: 75000,
        disc: 0,
        tax: 13500,
        grand: 88500,
        adv: 40000,
        bal: 48500,
        delBy: '',
        notes: 'Tourism festival campaign flex hoardings across district spots.',
        billedBy: 'Minhaj V (Admin)',
        billedId: 'EMP-ADM-01',
        billedRole: 'Admin',
        cgst: 6750,
        sgst: 6750,
        igst: 0,
        round: 0,
        taxMode: 'EXCLUSIVE',
        orderType: 'Direct',
        quoteStatus: null,
        gstin: '27MUMT00192A1Z9',
        invType: 'B2B',
        items: [
          {
            id: 'ITEM-885-1',
            prodId: 'PROD-01',
            prodName: 'Star Flex Banner Printing (240gsm Frontlit)',
            jcId: 'JC-885-1',
            title: 'Tourism Festival Roadside Hoardings',
            specId: 'SPEC-101',
            specName: '240gsm Star Frontlit Flex',
            mat: 'Star Flex 240gsm',
            desc: 'Bulk outdoor frontlit banners 5000 sqft',
            w: 20, h: 10, qty: 25, unit: 'Sq.Ft', rate: 15, estCost: 37500, actCost: 37500, disc: 0, taxType: 'ETR', gst: 18, hsn: '9989', amt: 75000,
            desReq: 'NO', desId: '', desName: '', desStatus: 'Approved', artStatus: 'Approved',
            outsource: 0, vId: null, vName: null, vEst: 0, vBill: 0,
            prtId: 'EMP-106', prtName: 'Vikas Patil', finId: 'EMP-113', finName: 'Sameer', pStatus: 'Printing'
          }
        ]
      },
      {
        id: 'SO-2026-0870',
        num: 'SO-2026-0870',
        custId: 'CUST-107',
        custName: 'Zeta Fashion Pvt Ltd',
        spId: 'SP-02',
        spName: 'Priya Patel',
        coId: 'CO-02',
        coName: 'Vikram Desai',
        ref: 'ZETA-MUM-99',
        date: '2026-09-10',
        due: '2026-09-18',
        prodStatus: 'Delivered',
        payStatus: 'Paid',
        subtotal: 43200,
        disc: 0,
        tax: 7776,
        grand: 50976,
        adv: 50976,
        bal: 0,
        delBy: 'Suresh Babu',
        notes: 'Handed over and verified with customer acknowledgement.',
        billedBy: 'Priya Patel',
        billedId: 'EMP-102',
        billedRole: 'Sales',
        cgst: 3888,
        sgst: 3888,
        igst: 0,
        round: 0,
        taxMode: 'EXCLUSIVE',
        orderType: 'Direct',
        quoteStatus: null,
        gstin: '27ZETAF8811P1Z9',
        invType: 'B2B',
        items: [
          {
            id: 'ITEM-870-1',
            prodId: 'PROD-02',
            prodName: 'Self-Adhesive Vinyl Gloss Sticker Printing',
            jcId: 'JC-870-1',
            title: 'Storefront Glass Vinyl Graphics',
            specId: 'SPEC-104',
            specName: 'Matte Laminated Waterproof Vinyl',
            mat: 'Avery Vinyl + Matte Film',
            desc: 'Window branding and glass partition vinyl',
            w: 12, h: 8, qty: 10, unit: 'Sq.Ft', rate: 45, estCost: 21120, actCost: 21120, disc: 0, taxType: 'ETR', gst: 18, hsn: '9989', amt: 43200,
            desReq: 'YES', desId: 'EMP-103', desName: 'Ananya Roy', desStatus: 'Approved', artStatus: 'Approved',
            outsource: 0, vId: null, vName: null, vEst: 0, vBill: 0,
            prtId: 'EMP-106', prtName: 'Vikas Patil', finId: 'EMP-112', finName: 'Rahman', pStatus: 'Delivered'
          }
        ]
      },
      {
        id: 'QT-2026-0101',
        num: 'QT-2026-0101',
        custId: 'CUST-107',
        custName: 'Zeta Fashion Pvt Ltd',
        spId: 'SP-02',
        spName: 'Priya Patel',
        coId: 'CO-02',
        coName: 'Vikram Desai',
        ref: 'QT-REQ-ZETA-09',
        date: '2026-08-01',
        due: '2026-08-07',
        prodStatus: 'Quotation',
        payStatus: 'Pending',
        subtotal: 43200,
        disc: 0,
        tax: 7776,
        grand: 50976,
        adv: 0,
        bal: 50976,
        delBy: '',
        notes: 'Quotation for 3D Titanium Gold Metal Signage for Phoenix Mall outlet.',
        billedBy: 'Priya Patel',
        billedId: 'EMP-102',
        billedRole: 'Sales',
        cgst: 3888,
        sgst: 3888,
        igst: 0,
        round: 0,
        taxMode: 'EXCLUSIVE',
        orderType: 'Quotation',
        quoteStatus: 'Customer Approved',
        gstin: '27ZETAF8811P1Z9',
        invType: 'B2B',
        items: [
          {
            id: 'QT-ITEM-1',
            prodId: 'PROD-03',
            prodName: 'Cast Acrylic 3D LED Signboard Letters',
            jcId: 'QT-JC-1',
            title: 'Stainless Steel Titanium Gold 3D Metal Letters',
            specId: 'SPEC-106',
            specName: 'Titanium Gold Stainless Steel 3D Letters',
            mat: 'SS 304 Titanium Gold 1.2mm',
            desc: 'Backlit Titanium Gold 3D Metal Letters with Warm White LED',
            w: 12, h: 3, qty: 1, unit: 'Sq.Ft', rate: 1200, estCost: 23400, actCost: 23400, disc: 0, taxType: 'ETR', gst: 18, hsn: '9405', amt: 43200,
            desReq: 'YES', desId: 'EMP-103', desName: 'Ananya Roy', desStatus: 'Pending', artStatus: 'Pending',
            outsource: 1, vId: 'VEN-03', vName: 'LaserCraft India (Metal Letters)', vEst: 23400, vBill: 0,
            prtId: '', prtName: '', finId: '', finName: '', pStatus: 'Quotation'
          }
        ]
      }
    ];

    for (const o of ordersData) {
      insertOrder.run(
        o.id, o.num, o.custId, o.custName, o.spId, o.spName, o.coId, o.coName, o.ref, o.date, o.due,
        o.prodStatus, o.payStatus, o.subtotal, o.disc, o.tax, o.grand, o.adv, o.bal, o.delBy, o.notes,
        `${o.date} 10:00:00`, o.billedBy, o.billedId, o.billedRole, `${o.date} 10:00:00`,
        o.cgst, o.sgst, o.igst, o.round, o.taxMode, o.orderType, o.quoteStatus, o.gstin, o.invType
      );

      for (const it of o.items) {
        insertOrderItem.run(
          it.id, o.id, it.prodId, it.prodName, it.jcId, it.title, it.specId, it.specName, it.mat, it.desc,
          it.w, it.h, it.qty, it.unit, it.rate, it.estCost, it.actCost, it.disc, it.taxType, it.gst, it.hsn, it.amt,
          it.desReq, it.desId, it.desName, it.desStatus, it.artStatus, '', it.outsource, it.vId, it.vName,
          it.vEst, it.vBill, it.prtId, it.prtName, it.finId, it.finName, it.pStatus
        );

        // Also create job_work record for shop floor tracking
        db.prepare(`
          INSERT INTO job_work (
            id, job_number, sales_order_id, sales_order_item_id, job_type, description, quantity, status,
            assigned_to, start_date, expected_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          `JW-${it.jcId}`, it.jcId, o.id, it.id, it.prodName, it.desc, it.qty,
          it.pStatus === 'Delivered' ? 'COMPLETED' : (it.pStatus === 'Printing' ? 'IN_PROGRESS' : 'PENDING'),
          it.prtName || it.finName || 'Production Pool', o.date, o.due
        );
      }
    }

    // 10. Outsource Work Orders, Bills & Payments (including BILL-125 for test suite)
    db.prepare(`
      INSERT INTO outsource_jobs (
        id, outsource_number, sales_order_id, sales_order_item_id, supplier_id, supplier_name,
        work_description, quantity, outsource_cost, expected_date, sent_date, status, bill_id, bill_number, billing_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      'WO-001', 'WO-001', 'SO-2026-0891', 'ITEM-891-1', 'VEN-04', 'ABC Embroidery',
      'Apparel Silk Screen Printing & Embroidery Batch 1', 100, 5000, '2026-10-01', '2026-09-28', 'COMPLETED', 'BILL-125-ID', 'BILL-125', 'Billed'
    );
    db.prepare(`
      INSERT INTO outsource_jobs (
        id, outsource_number, sales_order_id, sales_order_item_id, supplier_id, supplier_name,
        work_description, quantity, outsource_cost, expected_date, sent_date, status, bill_id, bill_number, billing_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      'WO-002', 'WO-002', 'SO-2026-0891', 'ITEM-891-2', 'VEN-04', 'ABC Embroidery',
      'Apparel Silk Screen Printing & Embroidery Batch 2', 150, 8000, '2026-10-02', '2026-09-29', 'COMPLETED', 'BILL-125-ID', 'BILL-125', 'Billed'
    );
    db.prepare(`
      INSERT INTO outsource_jobs (
        id, outsource_number, sales_order_id, sales_order_item_id, supplier_id, supplier_name,
        work_description, quantity, outsource_cost, expected_date, sent_date, status, bill_id, bill_number, billing_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      'WO-003', 'WO-003', 'SO-2026-0891', 'ITEM-891-3', 'VEN-04', 'ABC Embroidery',
      'Cap Embroidery & Badge Stitching Batch 3', 100, 7000, '2026-10-03', '2026-09-30', 'COMPLETED', 'BILL-125-ID', 'BILL-125', 'Billed'
    );

    db.prepare(`
      INSERT INTO outsource_bills (
        id, bill_number, vendor_id, vendor_name, bill_date, total_amount, paid_amount, outstanding_amount,
        status, work_orders_json, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      'BILL-125-ID',
      'BILL-125',
      'VEN-04',
      'ABC Embroidery',
      '2026-09-30',
      20000,
      5000,
      15000,
      'Partially Paid',
      JSON.stringify([
        { workOrder: 'WO-001', amount: 5000 },
        { workOrder: 'WO-002', amount: 8000 },
        { workOrder: 'WO-003', amount: 7000 }
      ]),
      'Consolidated monthly work orders bill for embroidery runs.'
    );

    db.prepare(`
      INSERT INTO outsource_payments (
        id, bill_id, bill_number, vendor_id, vendor_name, amount, payment_method, ref_no, payment_date, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      'PAY-000101', 'BILL-125-ID', 'BILL-125', 'VEN-04', 'ABC Embroidery', 5000, 'Cash', 'CASH-REC-991', '2026-10-01', 'Advance token cash settlement.'
    );

    // 11. Customer Payments
    const insertPayment = db.prepare(`
      INSERT INTO payments (id, order_id, customer_id, customer_name, amount, method, ref_no, status, paid_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Success', ?, ?)
    `);

    insertPayment.run('PAY-REC-01', 'SO-2026-0891', 'CUST-101', 'Apex Retail Solutions Pvt Ltd', 20000, 'UPI', 'UPI-9821882199', '2026-09-28', 'Advance received via UPI.');
    insertPayment.run('PAY-REC-02', 'SO-2026-0892', 'CUST-102', 'Shree Ganesh Advertising (Dealer)', 4000, 'Bank Transfer', 'NEFT-8839210', '2026-09-29', 'Advance NEFT transfer.');
    insertPayment.run('PAY-REC-03', 'SO-2026-0893', 'CUST-106', 'Gujarat Commercial Corp (Interstate)', 15399, 'Bank Transfer', 'RTGS-HDFC-991', '2026-09-30', 'Full payment in advance.');
    insertPayment.run('PAY-REC-04', 'SO-2026-0885', 'CUST-104', 'Maharashtra Tourism Dev Corp (MTDC)', 40000, 'Cheque', 'CHQ-882910', '2026-09-22', 'Government treasury cheque.');
    insertPayment.run('PAY-REC-05', 'SO-2026-0870', 'CUST-107', 'Zeta Fashion Pvt Ltd', 50976, 'UPI', 'UPI-ZETA-0091', '2026-09-10', 'Full counter settlement on delivery.');

    // 12. Purchase Orders
    const insertPO = db.prepare(`
      INSERT INTO purchase_orders (id, vendor_name, order_date, status, total_amount, items)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPO.run('PO-2026-0041', 'SignTech Media & Vinyl Suppliers', '2026-09-20', 'Received', 64000, JSON.stringify([
      { itemName: 'Star Frontlit Flex 240gsm (10ft x 50m Roll)', qty: 20, unitPrice: 3200, total: 64000 }
    ]));
    insertPO.run('PO-2026-0042', 'SignTech Media & Vinyl Suppliers', '2026-09-22', 'Received', 45000, JSON.stringify([
      { itemName: 'Avery Dennison Glossy White Self-Adhesive Vinyl (4ft x 50m)', qty: 10, unitPrice: 4500, total: 45000 }
    ]));
    insertPO.run('PO-2026-0043', 'Apex Acrylic Cutters & Engravers', '2026-09-25', 'Pending', 37000, JSON.stringify([
      { itemName: 'Cast Acrylic Clear Sheet 3mm (8ft x 4ft)', qty: 20, unitPrice: 1850, total: 37000 }
    ]));

    // 13. Production Tasks & Time Logs
    const insertTask = db.prepare(`
      INSERT INTO production_tasks (
        id, task_date, employee_id, employee_name, order_id, order_number, customer_name, item_id, item_title,
        process_id, process_name, quantity, unit, start_time, end_time, total_duration_minutes, status, priority,
        remarks, machine_id, machine_name, department, production_location, original_qty, completed_qty,
        rejected_qty, rework_qty, final_qty, qc_status, created_by, created_at, completed_by, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `);

    const insertTimeLog = db.prepare(`
      INSERT INTO production_task_time_logs (
        id, task_id, action, timestamp, logged_by, notes, elapsed_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const tasksData = [
      {
        id: 'TSK-1001', date: '2026-09-28', empId: 'EMP-110', empName: 'Afsal', ordId: 'SO-2026-0891', ordNum: 'SO-2026-0891',
        cust: 'Apex Retail Solutions Pvt Ltd', itemId: 'ITEM-891-3', title: 'Trodat Store Stamp', procId: 'PROC-07', procName: 'Seal Making',
        qty: 50, unit: 'Nos', start: '09:00 AM', end: '10:30 AM', mins: 90, status: 'Completed', prio: 'Normal',
        rem: 'All 50 rubber seals engraved, molded and tested with ink pad.', mchId: 'MCH-07', mchName: 'FlashStamp Pro III',
        dept: 'Production', loc: 'Seal Engraving Desk', compBy: 'Afsal', compAt: '2026-09-28 10:30:00'
      },
      {
        id: 'TSK-1002', date: '2026-09-28', empId: 'EMP-106', empName: 'Vikas Patil', ordId: 'SO-2026-0891', ordNum: 'SO-2026-0891',
        cust: 'Apex Retail Solutions Pvt Ltd', itemId: 'ITEM-891-1', title: 'Storefront Entrance Banner', procId: 'PROC-05', procName: 'Large Format Printing',
        qty: 40, unit: 'Sq.Ft', start: '10:45 AM', end: '11:15 AM', mins: 30, status: 'Completed', prio: 'Normal',
        rem: 'Frontlit flex printed on Roland VG3. Colors verified.', mchId: 'MCH-01', mchName: 'Roland TrueVIS VG3-640',
        dept: 'Printing', loc: 'Large Format Hall', compBy: 'Vikas Patil', compAt: '2026-09-28 11:15:00'
      },
      {
        id: 'TSK-1003', date: '2026-09-29', empId: 'EMP-106', empName: 'Vikas Patil', ordId: 'SO-2026-0891', ordNum: 'SO-2026-0891',
        cust: 'Apex Retail Solutions Pvt Ltd', itemId: 'ITEM-891-2', title: 'Promotional Product Decal Stickers', procId: 'PROC-05', procName: 'Large Format Printing',
        qty: 250, unit: 'Sq.Ft', start: '09:30 AM', end: '', mins: 60, status: 'In Progress', prio: 'High',
        rem: 'Printing roll 2 of gloss adhesive vinyl.', mchId: 'MCH-01', mchName: 'Roland TrueVIS VG3-640',
        dept: 'Printing', loc: 'Large Format Hall', compBy: '', compAt: ''
      },
      {
        id: 'TSK-1004', date: '2026-09-29', empId: 'EMP-110', empName: 'Afsal', ordId: 'SO-2026-0891', ordNum: 'SO-2026-0891',
        cust: 'Apex Retail Solutions Pvt Ltd', itemId: 'ITEM-891-2', title: 'Promotional Product Decal Stickers', procId: 'PROC-09', procName: 'Plotter Cutting',
        qty: 250, unit: 'Sq.Ft', start: '', end: '', mins: 0, status: 'Pending', prio: 'Normal',
        rem: 'Queued for contour kiss-cut after ink drying.', mchId: 'MCH-04', mchName: 'LaserPro Spirit GLS 100W',
        dept: 'Finishing', loc: 'Laser Cutting Bay', compBy: '', compAt: ''
      },
      {
        id: 'TSK-1005', date: '2026-09-29', empId: 'EMP-112', empName: 'Rahman', ordId: 'SO-2026-0892', ordNum: 'SO-2026-0892',
        cust: 'Shree Ganesh Advertising (Dealer)', itemId: 'ITEM-892-1', title: 'Exhibition Rollup Standees', procId: 'PROC-12', procName: 'Lamination',
        qty: 72, unit: 'Sq.Ft', start: '02:00 PM', end: '02:45 PM', mins: 45, status: 'Completed', prio: 'Normal',
        rem: 'Thermal matte lamination applied on all 4 banner graphics.', mchId: 'MCH-06', mchName: 'Excelam Plus 650',
        dept: 'Production', loc: 'Finishing Floor', compBy: 'Rahman', compAt: '2026-09-29 14:45:00'
      }
    ];

    for (const t of tasksData) {
      insertTask.run(
        t.id, t.date, t.empId, t.empName, t.ordId, t.ordNum, t.cust, t.itemId, t.title, t.procId, t.procName,
        t.qty, t.unit, t.start, t.end, t.mins, t.status, t.prio, t.rem, t.mchId, t.mchName, t.dept, t.loc,
        t.qty, t.status === 'Completed' ? t.qty : 0, 0, 0, t.qty, t.status === 'Completed' ? 'Approved' : 'Pending',
        'Minhaj V (Admin)', t.compBy, t.compAt
      );

      if (t.start) {
        insertTimeLog.run(
          `TL-${t.id}-1`, t.id, 'START', `${t.date} ${t.start}`, t.empName, 'Job commenced on assigned machine.', 0
        );
      }
      if (t.end) {
        insertTimeLog.run(
          `TL-${t.id}-2`, t.id, 'COMPLETE', `${t.date} ${t.end}`, t.empName, 'Job completed and verified.', t.mins * 60
        );
      }
    }

    // 14. Expenses
    const insertExpense = db.prepare(`
      INSERT INTO expenses (id, category, amount, vendor_name, payment_method, expense_date, description, status, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', 'Minhaj V (Admin)', CURRENT_TIMESTAMP)
    `);

    insertExpense.run('EXP-2026-01', 'Electricity & Power', 18450, 'Kerala State Electricity Board (KSEB)', 'Bank Transfer', '2026-09-15', 'Monthly industrial HT power tariff for press machines.');
    insertExpense.run('EXP-2026-02', 'Factory Rent', 45000, 'Industrial Estate Authority', 'Bank Transfer', '2026-09-01', 'Monthly factory shed 4 lease.');
    insertExpense.run('EXP-2026-03', 'Fuel & Logistics', 4200, 'Indian Oil Petrol Pump', 'UPI', '2026-09-25', 'Diesel for delivery van.');
    insertExpense.run('EXP-2026-04', 'Machine Maintenance & Cleaning', 3500, 'Roland Authorized Care', 'Cash', '2026-09-18', 'Printer wiper blades, damper set and solvent swabs.');

    // 15. Attendance & Payroll Records
    const insertAttendance = db.prepare(`
      INSERT INTO attendance (id, date, staff_id, staff_name, type, status, ot_hours, check_in, check_out, working_hours, late_status, notes)
      VALUES (?, ?, ?, ?, 'Full Day', 'Present', ?, ?, ?, ?, 'On Time', 'Normal working shift')
    `);

    const staffAttendance = [
      { id: 'EMP-ADM-01', name: 'Minhaj V (Admin)' },
      { id: 'EMP-101', name: 'Ramesh Sharma' },
      { id: 'EMP-102', name: 'Priya Patel' },
      { id: 'EMP-103', name: 'Ananya Roy' },
      { id: 'EMP-104', name: 'Karthik Nair' },
      { id: 'EMP-106', name: 'Vikas Patil' },
      { id: 'EMP-110', name: 'Afsal' },
      { id: 'EMP-112', name: 'Rahman' },
      { id: 'EMP-113', name: 'Sameer' }
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    for (const s of staffAttendance) {
      insertAttendance.run(`ATT-${todayStr}-${s.id}`, todayStr, s.id, s.name, 1.5, '09:00 AM', '06:30 PM', 8.5);
    }

    const insertPayroll = db.prepare(`
      INSERT INTO payroll (
        id, month, staff_id, staff_name, role, base_salary, working_days, days_present, earned_base_pay,
        ot_hours, ot_pay, incentive_earned, advance_deduction, late_deduction, net_salary, status, paid_date, payment_mode
      ) VALUES (?, ?, ?, ?, ?, ?, 26, 26, ?, ?, ?, ?, 0, 0, ?, 'Paid', '2026-09-05', 'Bank Transfer')
    `);

    insertPayroll.run('PAYROLL-2026-08-101', '2026-08', 'EMP-101', 'Ramesh Sharma', 'Sales', 25000, 25000, 10, 1500, 3500, 30000);
    insertPayroll.run('PAYROLL-2026-08-103', '2026-08', 'EMP-103', 'Ananya Roy', 'Designer', 35000, 35000, 8, 1200, 2400, 38600);
    insertPayroll.run('PAYROLL-2026-08-106', '2026-08', 'EMP-106', 'Vikas Patil', 'Operator', 22000, 22000, 16, 2400, 1800, 26200);

    // 16. Update document sequences to continue smoothly
    const updateSequence = db.prepare(`
      INSERT OR REPLACE INTO document_sequences (doc_type, prefix, current_number, padding, updated_at)
      VALUES (?, ?, ?, 4, CURRENT_TIMESTAMP)
    `);
    updateSequence.run('SO', 'SO-', 895);
    updateSequence.run('QT', 'QT-', 105);
    updateSequence.run('INV', 'INV-', 895);
    updateSequence.run('BILL', 'BILL-', 126);
    updateSequence.run('PAY', 'PAY-', 110);
    updateSequence.run('PO', 'PO-', 45);
    updateSequence.run('TSK', 'TSK-', 1015);
    // 17. Seed Workstation Users
    const staffPermissions = JSON.stringify([
      'production.view_own', 'production.view_available', 'production.take_work',
      'production.start', 'production.pause', 'production.resume', 'production.complete',
      'VIEW', 'PRINT'
    ]);

    const workstationUsers = [
      { id: 'USR-OPERATOR', username: 'operator', pass: 'Print@123', empId: 'EMP-106', role: 'Production', dept: 'Printing', permissions: staffPermissions },
      { id: 'USR-DESIGNER', username: 'designer', pass: 'Design@123', empId: 'EMP-104', role: 'Designer', dept: 'Design', permissions: staffPermissions },
      { id: 'USR-FINISHER', username: 'finisher', pass: 'Finish@123', empId: 'EMP-112', role: 'Production', dept: 'Finishing', permissions: staffPermissions },
      { id: 'USR-DELIVERY', username: 'delivery', pass: 'Delivery@123', empId: 'EMP-113', role: 'Delivery', dept: 'Delivery', permissions: staffPermissions },
      { id: 'USR-BILLING',  username: 'billing',  pass: 'Billing@123',  empId: 'EMP-101', role: 'Sales', dept: 'Sales', permissions: staffPermissions },
      { id: 'USR-QC',       username: 'qc',       pass: 'QC@123',       empId: null,      role: 'QC', dept: 'Quality', permissions: staffPermissions },
      { id: 'USR-ACCOUNTS', username: 'accounts', pass: 'Accounts@123', empId: 'EMP-102', role: 'Accounts', dept: 'Accounts', permissions: staffPermissions }
    ];

    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO users (id, employee_id, username, email, password_hash, salt, role, department, permissions, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `);

    for (const u of workstationUsers) {
      const { hash, salt } = hashPassword(u.pass);
      insertUser.run(u.id, u.empId, u.username, `${u.username}@screenarts.in`, hash, salt, u.role, u.dept, u.permissions);
    }

    // 18. Biometric Devices & Mappings
    try {
      db.prepare('DELETE FROM biometric_user_mappings').run();
      db.prepare('DELETE FROM biometric_devices').run();

      db.prepare(`
        INSERT INTO biometric_devices (id, name, model, ip_address, port, location, status, last_sync_time, total_users)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('DEV-K90-01', 'ZKTeco K90 (Front Office)', 'ZKTeco K90 Standalone', '192.168.1.201', 4370, 'Head Office Gate 1', 'Online', '2026-08-14 10:30 AM', 6);

      const insertBio = db.prepare(`
        INSERT INTO biometric_user_mappings (id, device_id, biometric_user_id, biometric_name, card_no, verification_type, privilege, device_status, employee_id, mapping_status, matched_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertBio.run('BIO-MAP-01', 'DEV-K90-01', '25', 'Muhammad', '10045231', 'Fingerprint / Password', 'User', 'Active', 'EMP-101', 'Matched', 'Existing Mapping');
      insertBio.run('BIO-MAP-02', 'DEV-K90-01', '26', 'Shihab', '10045232', 'Fingerprint / Card', 'User', 'Active', null, 'Unmapped', 'Unmapped');
      insertBio.run('BIO-MAP-03', 'DEV-K90-01', '27', 'Anas', '10045233', 'Fingerprint', 'User', 'Active', 'EMP-103', 'Matched', 'Existing Mapping');
      insertBio.run('BIO-MAP-04', 'DEV-K90-01', '28', 'Priya Patel', '10045234', 'Fingerprint / Card', 'User', 'Active', 'EMP-102', 'Matched', 'Exact Name Match');
      insertBio.run('BIO-MAP-05', 'DEV-K90-01', '29', 'Vikas Patil', '10045235', 'Fingerprint', 'User', 'Active', 'EMP-106', 'Matched', 'Exact Name Match');
      insertBio.run('BIO-MAP-06', 'DEV-K90-01', '30', 'Biometric User 30', '10045236', 'Card Only', 'User', 'Disabled', null, 'Unmapped', 'Unmapped');
    } catch (e) {
      // Biometrics table may not exist in all environments
    }

    // 19. Production Processes Master
    try {
      const insertProcess = db.prepare(`
        INSERT INTO production_processes (id, code, name, category, description, default_unit, is_active, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `);
      const processes = [
        { id: 'PROC-01', code: 'DES', name: 'Designing',              cat: 'Pre-Press',  desc: 'Artwork creation, layout and typesetting',        unit: 'Nos',    order: 1 },
        { id: 'PROC-02', code: 'PRF', name: 'Proofing',               cat: 'Pre-Press',  desc: 'Customer artwork proof review and approval',      unit: 'Nos',    order: 2 },
        { id: 'PROC-03', code: 'PLT', name: 'Plate Making',           cat: 'Pre-Press',  desc: 'Offset printing plate exposure and processing',   unit: 'Plates', order: 3 },
        { id: 'PROC-04', code: 'OFS', name: 'Offset Printing',        cat: 'Printing',   desc: 'Sheet-fed multi-colour offset press printing',    unit: 'Sheets', order: 4 },
        { id: 'PROC-05', code: 'LFP', name: 'Large Format Printing',  cat: 'Printing',   desc: 'Wide-format eco-solvent / UV roll-to-roll print',  unit: 'Sq.Ft',  order: 5 },
        { id: 'PROC-06', code: 'DGP', name: 'Digital Printing',       cat: 'Printing',   desc: 'Digital colour laser / inkjet short-run print',   unit: 'Sheets', order: 6 },
        { id: 'PROC-07', code: 'SLM', name: 'Seal Making',            cat: 'Fabrication',desc: 'Flash / polymer seal and rubber stamp creation',   unit: 'Nos',    order: 7 },
        { id: 'PROC-08', code: 'SCR', name: 'Screen Printing',        cat: 'Printing',   desc: 'Manual or automatic textile screen printing',     unit: 'Pcs',    order: 8 },
        { id: 'PROC-09', code: 'PLO', name: 'Plotter Cutting',        cat: 'Finishing',  desc: 'Vinyl / film contour kiss-cut on plotter',        unit: 'Sq.Ft',  order: 9 },
        { id: 'PROC-10', code: 'STK', name: 'Sticker Cutting',        cat: 'Finishing',  desc: 'Die cutting or guillotine trimming of stickers',  unit: 'Nos',    order: 10 },
        { id: 'PROC-11', code: 'CNC', name: 'CNC Routing',            cat: 'Fabrication',desc: 'Computer-controlled acrylic / wood / foam routing', unit: 'Sq.Ft', order: 11 },
        { id: 'PROC-12', code: 'LAM', name: 'Lamination',             cat: 'Finishing',  desc: 'Thermal or cold roll lamination of print media',  unit: 'Sq.Ft',  order: 12 },
        { id: 'PROC-13', code: 'MNT', name: 'Mounting',               cat: 'Finishing',  desc: 'Adhesive mounting on substrate boards',           unit: 'Sq.Ft',  order: 13 },
        { id: 'PROC-14', code: 'CUT', name: 'Cutting',                cat: 'Finishing',  desc: 'Guillotine or hand trimming to final size',       unit: 'Sheets', order: 14 },
        { id: 'PROC-15', code: 'BND', name: 'Binding',                cat: 'Finishing',  desc: 'Perfect, saddle-stitch or spiral binding',        unit: 'Books',  order: 15 },
        { id: 'PROC-16', code: 'EYL', name: 'Eyelet',                 cat: 'Finishing',  desc: 'Metal eyelet punch installation on banners',      unit: 'Nos',    order: 16 },
        { id: 'PROC-17', code: 'FLD', name: 'Folding',                cat: 'Finishing',  desc: 'Multi-fold finishing for brochures and leaflets',  unit: 'Sheets', order: 17 },
        { id: 'PROC-18', code: 'PKG', name: 'Packing',                cat: 'Finishing',  desc: 'Shrink wrap, bubble wrap and dispatch packing',   unit: 'Pkts',   order: 18 },
        { id: 'PROC-19', code: 'INS', name: 'Installation',           cat: 'Delivery',   desc: 'On-site signage installation and fixing',         unit: 'Nos',    order: 19 },
        { id: 'PROC-20', code: 'DEL', name: 'Delivery',               cat: 'Delivery',   desc: 'Dispatch, handover and courier to customer',      unit: 'Pkts',   order: 20 }
      ];
      for (const p of processes) {
        insertProcess.run(p.id, p.code, p.name, p.cat, p.desc, p.unit, p.order);
      }
    } catch (e) { console.error('production_processes seed error:', e.message); }

    // 20. Worker Job Incentives (for completed orders)
    try {
      const insertIncentive = db.prepare(`
        INSERT INTO worker_job_incentives (
          id, order_id, item_id, job_card_id, product_name, worker_id, worker_name,
          role_stage, job_amount, job_profit, incentive_pct, incentive_amount, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertIncentive.run('WJI-001', 'SO-2026-0870', 'ITEM-870-1', 'JC-870-1', 'Self-Adhesive Vinyl Gloss Sticker Printing',
        'EMP-106', 'Vikas Patil', 'Printing', 43200, 22080, 0.5, 110.4, '2026-09-18 16:00:00');
      insertIncentive.run('WJI-002', 'SO-2026-0870', 'ITEM-870-1', 'JC-870-1', 'Self-Adhesive Vinyl Gloss Sticker Printing',
        'EMP-112', 'Rahman', 'Finishing', 43200, 22080, 0.5, 110.4, '2026-09-18 17:30:00');
      insertIncentive.run('WJI-003', 'SO-2026-0892', 'ITEM-892-1', 'JC-892-1', 'Rollup Standee Deluxe (3x6 ft)',
        'EMP-106', 'Vikas Patil', 'Printing', 6600, 3200, 0.5, 16.0, '2026-09-30 14:00:00');
      insertIncentive.run('WJI-004', 'SO-2026-0892', 'ITEM-892-1', 'JC-892-1', 'Rollup Standee Deluxe (3x6 ft)',
        'EMP-113', 'Sameer', 'Finishing', 6600, 3200, 0.5, 16.0, '2026-09-30 15:30:00');
      insertIncentive.run('WJI-005', 'SO-2026-0891', 'ITEM-891-3', 'JC-891-3', 'Flash Self-Inking Rubber Stamp (Trodat)',
        'EMP-110', 'Afsal', 'Fabrication', 22500, 6500, 0.5, 32.5, '2026-09-28 10:30:00');
    } catch (e) { console.error('worker_job_incentives seed error:', e.message); }

    // 21. Audit Logs
    try {
      const insertAudit = db.prepare(`
        INSERT INTO audit_logs (id, user_id, employee_id, employee_name, role, action, module, record_id, record_number, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertAudit.run('AUD-001', 'USR-ADMIN-01', 'EMP-ADM-01', 'Minhaj V (Admin)', 'Admin',
        'CREATE', 'Sales Orders', 'SO-2026-0891', 'SO-2026-0891',
        JSON.stringify({ action: 'New order created for Apex Retail Solutions', amount: 47908 }), '2026-09-28 09:00:00');
      insertAudit.run('AUD-002', 'USR-ADMIN-01', 'EMP-ADM-01', 'Minhaj V (Admin)', 'Admin',
        'CREATE', 'Sales Orders', 'SO-2026-0885', 'SO-2026-0885',
        JSON.stringify({ action: 'Government tender order created for MTDC', amount: 88500 }), '2026-09-22 10:15:00');
      insertAudit.run('AUD-003', 'USR-BILLING', 'EMP-101', 'Ramesh Sharma', 'Sales',
        'CREATE', 'Payments', 'PAY-REC-01', 'PAY-REC-01',
        JSON.stringify({ action: 'Advance payment received', amount: 20000, method: 'UPI' }), '2026-09-28 11:30:00');
      insertAudit.run('AUD-004', 'USR-OPERATOR', 'EMP-106', 'Vikas Patil', 'Production',
        'UPDATE', 'Production Tasks', 'TSK-1002', 'TSK-1002',
        JSON.stringify({ action: 'Task status changed to Completed', process: 'Large Format Printing' }), '2026-09-28 11:15:00');
      insertAudit.run('AUD-005', 'USR-ADMIN-01', 'EMP-ADM-01', 'Minhaj V (Admin)', 'Admin',
        'SEED', 'System', 'SEED-001', 'SEED-001',
        JSON.stringify({ action: 'Demo data seeded into database' }), '2026-09-28 08:00:00');
      insertAudit.run('AUD-006', 'USR-BILLING', 'EMP-102', 'Priya Patel', 'Sales',
        'CREATE', 'Sales Orders', 'SO-2026-0870', 'SO-2026-0870',
        JSON.stringify({ action: 'Order created for Zeta Fashion Pvt Ltd', amount: 50976 }), '2026-09-10 09:00:00');
      insertAudit.run('AUD-007', 'USR-BILLING', 'EMP-102', 'Priya Patel', 'Sales',
        'UPDATE', 'Sales Orders', 'SO-2026-0870', 'SO-2026-0870',
        JSON.stringify({ action: 'Order marked as Delivered', prev_status: 'Ready for Delivery' }), '2026-09-18 18:00:00');
      insertAudit.run('AUD-008', 'USR-ADMIN-01', 'EMP-ADM-01', 'Minhaj V (Admin)', 'Admin',
        'CREATE', 'Outsource Bills', 'BILL-125-ID', 'BILL-125',
        JSON.stringify({ action: 'Consolidated outsource bill created for ABC Embroidery', amount: 20000 }), '2026-09-30 17:00:00');
    } catch (e) { console.error('audit_logs seed error:', e.message); }

    // 22. Rework Tickets
    try {
      db.prepare(`
        INSERT INTO rework_tickets (
          id, order_id, item_id, task_id, defect_category, defect_reason, rejected_qty,
          rework_qty, return_to_stage, assigned_to, qc_inspector_id, qc_inspector_name, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'RWT-001', 'SO-2026-0891', 'ITEM-891-1', 'TSK-1002',
        'Color Mismatch', 'Pantone blue shade printed as cyan — monitor profile not calibrated',
        5, 5, 'Large Format Printing',
        'EMP-106', 'USR-QC', 'QC Staff', 'Resolved', '2026-09-28 12:00:00'
      );
      db.prepare(`
        INSERT INTO rework_tickets (
          id, order_id, item_id, task_id, defect_category, defect_reason, rejected_qty,
          rework_qty, return_to_stage, assigned_to, qc_inspector_id, qc_inspector_name, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'RWT-002', 'SO-2026-0885', 'ITEM-885-1', 'TSK-1003',
        'Print Banding', 'Horizontal banding lines on 3 hoarding prints due to clogged printhead',
        3, 3, 'Large Format Printing',
        'EMP-106', 'USR-QC', 'QC Staff', 'Open', '2026-09-29 14:00:00'
      );
    } catch (e) { console.error('rework_tickets seed error:', e.message); }

    // 23. Artwork Versions
    try {
      const insertArtwork = db.prepare(`
        INSERT INTO artwork_versions (
          id, order_id, item_id, version_number, file_name, file_url, dimensions,
          color_mode, dpi, proof_status, uploaded_by, uploaded_at, approved_by, approved_at,
          production_ready
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertArtwork.run(
        'ART-001', 'SO-2026-0891', 'ITEM-891-1', 1,
        'storefront_banner_v1.pdf', '/uploads/artwork/storefront_banner_v1.pdf',
        '10x4 ft @ 150dpi', 'CMYK', 150, 'Approved',
        'Karthik Nair', '2026-09-28 08:30:00', 'Minhaj V (Admin)', '2026-09-28 09:00:00', 1
      );
      insertArtwork.run(
        'ART-002', 'SO-2026-0891', 'ITEM-891-3', 1,
        'trodat_stamp_artwork_v1.pdf', '/uploads/artwork/trodat_stamp_artwork_v1.pdf',
        '50x20mm', 'Greyscale', 600, 'Approved',
        'Karthik Nair', '2026-09-28 08:45:00', 'Minhaj V (Admin)', '2026-09-28 09:00:00', 1
      );
      insertArtwork.run(
        'ART-003', 'SO-2026-0870', 'ITEM-870-1', 1,
        'zeta_window_vinyl_v1.ai', '/uploads/artwork/zeta_window_vinyl_v1.ai',
        '12x8 ft @ 200dpi', 'CMYK', 200, 'Approved',
        'Ananya Roy', '2026-09-10 08:00:00', 'Minhaj V (Admin)', '2026-09-10 09:00:00', 1
      );
      insertArtwork.run(
        'ART-004', 'SO-2026-0870', 'ITEM-870-1', 2,
        'zeta_window_vinyl_v2_revised.ai', '/uploads/artwork/zeta_window_vinyl_v2_revised.ai',
        '12x8 ft @ 200dpi', 'CMYK', 200, 'Approved',
        'Ananya Roy', '2026-09-10 11:00:00', 'Minhaj V (Admin)', '2026-09-10 12:00:00', 1
      );
      insertArtwork.run(
        'ART-005', 'SO-2026-0893', 'ITEM-893-1', 1,
        'gujarat_standee_v1.pdf', '/uploads/artwork/gujarat_standee_v1.pdf',
        '3x6 ft @ 150dpi', 'CMYK', 150, 'Pending',
        'Ananya Roy', '2026-10-01 09:00:00', null, null, 0
      );
    } catch (e) { console.error('artwork_versions seed error:', e.message); }

    // 24. Delivery Notes & Items (for delivered/completed orders)
    try {
      db.prepare(`
        INSERT INTO delivery_notes (
          id, delivery_number, order_id, customer_id, customer_name, delivery_date,
          delivery_type, vehicle_no, delivery_staff, delivery_staff_id,
          recipient_name, recipient_phone, notes, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        'DN-2026-0001', 'DN-2026-0001', 'SO-2026-0870', 'CUST-107',
        'Zeta Fashion Pvt Ltd', '2026-09-18',
        'Full', 'MH-01-AK-9911', 'Suresh Babu', 'EMP-113',
        'Mr. Rohan (Store Manager)', '9820099001',
        'All 10 vinyl panels delivered and verified at Fashion Hub showroom.',
        'Delivered', 'Minhaj V (Admin)'
      );
      db.prepare(`
        INSERT INTO delivery_items (
          id, delivery_id, order_id, item_id, product_name, ordered_qty, dispatched_qty, remaining_qty, unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'DI-2026-0001-1', 'DN-2026-0001', 'SO-2026-0870', 'ITEM-870-1',
        'Self-Adhesive Vinyl Gloss Sticker Printing', 10, 10, 0, 'Nos'
      );

      db.prepare(`
        INSERT INTO delivery_notes (
          id, delivery_number, order_id, customer_id, customer_name, delivery_date,
          delivery_type, vehicle_no, delivery_staff, delivery_staff_id,
          recipient_name, recipient_phone, notes, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        'DN-2026-0002', 'DN-2026-0002', 'SO-2026-0892', 'CUST-102',
        'Shree Ganesh Advertising (Dealer)', '2026-10-01',
        'Full', null, 'Sameer', 'EMP-113',
        'Ganesh (Owner)', '9892044556',
        'Dealer counter pickup — all 4 rollup standees handed over.',
        'Delivered', 'Ramesh Sharma'
      );
      db.prepare(`
        INSERT INTO delivery_items (
          id, delivery_id, order_id, item_id, product_name, ordered_qty, dispatched_qty, remaining_qty, unit
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'DI-2026-0002-1', 'DN-2026-0002', 'SO-2026-0892', 'ITEM-892-1',
        'Rollup Standee Deluxe (3x6 ft)', 4, 4, 0, 'Nos'
      );
    } catch (e) { console.error('delivery_notes seed error:', e.message); }

    // 25. Material BOMs (Substrate Mappings)
    try {
      const insertBom = db.prepare(`
        INSERT INTO material_boms (id, product_id, spec_id, inventory_material_id, consumption_ratio, consumption_unit, wastage_pct)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      insertBom.run('BOM-01', 'PROD-01', 'SPEC-101', 'INV-01', 0.001,   'Roll',  4.0); // Star Flex Banner -> INV-01
      insertBom.run('BOM-02', 'PROD-01', 'SPEC-102', 'INV-01', 0.0012,  'Roll',  5.0); // Heavy Blackout Flex -> INV-01
      insertBom.run('BOM-03', 'PROD-02', 'SPEC-103', 'INV-02', 0.0015,  'Roll',  5.0); // Avery Gloss Vinyl -> INV-02
      insertBom.run('BOM-04', 'PROD-02', 'SPEC-104', 'INV-02', 0.0016,  'Roll',  6.0); // Matte Vinyl -> INV-02
      insertBom.run('BOM-05', 'PROD-03', 'SPEC-105', 'INV-03', 0.03125, 'Sheet', 8.0); // Acrylic 3D -> INV-03 (32 sqft/sheet)
      insertBom.run('BOM-06', 'PROD-04', 'SPEC-107', 'INV-08', 1.0,     'Nos',   0.0); // Rollup Standee -> INV-08
      insertBom.run('BOM-07', 'PROD-08', 'SPEC-110', 'INV-04', 0.03125, 'Sheet', 4.0); // Sunboard -> INV-04
    } catch (e) { console.error('material_boms seed error:', e.message); }

    // 26. Journal Vouchers & Double-Entry Journal Entries
    try {
      const insertJV = db.prepare(`
        INSERT INTO journal_vouchers (
          id, voucher_number, voucher_type, voucher_date, ref_no, reference_type, reference_id,
          narration, created_by_name, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Posted', CURRENT_TIMESTAMP)
      `);
      const insertJE = db.prepare(`
        INSERT INTO journal_entries (
          id, voucher_id, account_name, account_group, entry_type, amount, customer_id, order_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // JV-01: Zeta Fashion Sales Invoice (SO-2026-0870 — Delivered, Paid)
      insertJV.run('JV-SO-0870', 'JV-2026-0870', 'Sales Invoice', '2026-09-10',
        'SO-2026-0870', 'SALES_ORDER', 'SO-2026-0870',
        'Tax invoice for SO-2026-0870 — Zeta Fashion Pvt Ltd vinyl graphics', 'Priya Patel');
      insertJE.run('JE-0870-1', 'JV-SO-0870', 'Accounts Receivable (Zeta Fashion Pvt Ltd)', 'Assets', 'DEBIT',  50976, 'CUST-107', 'SO-2026-0870', '');
      insertJE.run('JE-0870-2', 'JV-SO-0870', 'Sales Revenue Account',                       'Revenue','CREDIT', 43200, 'CUST-107', 'SO-2026-0870', 'Net Sales');
      insertJE.run('JE-0870-3', 'JV-SO-0870', 'Output CGST (9%)',                             'Liabilities','CREDIT', 3888, 'CUST-107', 'SO-2026-0870', '');
      insertJE.run('JE-0870-4', 'JV-SO-0870', 'Output SGST (9%)',                             'Liabilities','CREDIT', 3888, 'CUST-107', 'SO-2026-0870', '');

      // JV-02: Payment receipt for Zeta Fashion (PAY-REC-05)
      insertJV.run('JV-PAY-0870', 'JV-PAY-2026-0870', 'Payment Receipt', '2026-09-10',
        'UPI-ZETA-0091', 'PAYMENT', 'PAY-REC-05',
        'UPI payment Rs.50,976 received from Zeta Fashion on delivery', 'Accounts');
      insertJE.run('JE-PAY-0870-1', 'JV-PAY-0870', 'HDFC Bank Account',                             'Assets','DEBIT',  50976, 'CUST-107', 'SO-2026-0870', '');
      insertJE.run('JE-PAY-0870-2', 'JV-PAY-0870', 'Accounts Receivable (Zeta Fashion Pvt Ltd)', 'Assets','CREDIT', 50976, 'CUST-107', 'SO-2026-0870', '');

      // JV-03: MTDC Sales Invoice (SO-2026-0885)
      insertJV.run('JV-SO-0885', 'JV-2026-0885', 'Sales Invoice', '2026-09-22',
        'SO-2026-0885', 'SALES_ORDER', 'SO-2026-0885',
        'Tax invoice for SO-2026-0885 — Maharashtra Tourism flex hoardings', 'Minhaj V (Admin)');
      insertJE.run('JE-0885-1', 'JV-SO-0885', 'Accounts Receivable (Maharashtra Tourism Dev Corp)', 'Assets',      'DEBIT',  88500, 'CUST-104', 'SO-2026-0885', '');
      insertJE.run('JE-0885-2', 'JV-SO-0885', 'Sales Revenue Account',                              'Revenue',    'CREDIT', 75000, 'CUST-104', 'SO-2026-0885', '');
      insertJE.run('JE-0885-3', 'JV-SO-0885', 'Output CGST (9%)',                                   'Liabilities','CREDIT',  6750, 'CUST-104', 'SO-2026-0885', '');
      insertJE.run('JE-0885-4', 'JV-SO-0885', 'Output SGST (9%)',                                   'Liabilities','CREDIT',  6750, 'CUST-104', 'SO-2026-0885', '');

      // JV-04: MTDC Advance Payment (PAY-REC-04)
      insertJV.run('JV-PAY-0885', 'JV-PAY-2026-0885', 'Payment Receipt', '2026-09-22',
        'CHQ-882910', 'PAYMENT', 'PAY-REC-04',
        'Govt cheque Rs.40,000 advance from MTDC — CHQ-882910', 'Accounts');
      insertJE.run('JE-PAY-0885-1', 'JV-PAY-0885', 'HDFC Bank Account',                                    'Assets','DEBIT',  40000, 'CUST-104', 'SO-2026-0885', '');
      insertJE.run('JE-PAY-0885-2', 'JV-PAY-0885', 'Accounts Receivable (Maharashtra Tourism Dev Corp)', 'Assets','CREDIT', 40000, 'CUST-104', 'SO-2026-0885', '');

      // JV-05: Apex Retail Sales Invoice (SO-2026-0891)
      insertJV.run('JV-SO-0891', 'JV-2026-0891', 'Sales Invoice', '2026-09-28',
        'SO-2026-0891', 'SALES_ORDER', 'SO-2026-0891',
        'Tax invoice for SO-2026-0891 — Apex Retail branding pack', 'Minhaj V (Admin)');
      insertJE.run('JE-0891-1', 'JV-SO-0891', 'Accounts Receivable (Apex Retail Solutions Pvt Ltd)', 'Assets',      'DEBIT',  47908, 'CUST-101', 'SO-2026-0891', '');
      insertJE.run('JE-0891-2', 'JV-SO-0891', 'Sales Revenue Account',                               'Revenue',    'CREDIT', 40600, 'CUST-101', 'SO-2026-0891', '');
      insertJE.run('JE-0891-3', 'JV-SO-0891', 'Output CGST (9%)',                                    'Liabilities','CREDIT',  3654, 'CUST-101', 'SO-2026-0891', '');
      insertJE.run('JE-0891-4', 'JV-SO-0891', 'Output SGST (9%)',                                    'Liabilities','CREDIT',  3654, 'CUST-101', 'SO-2026-0891', '');

      // JV-06: Apex Retail Advance Payment (PAY-REC-01)
      insertJV.run('JV-PAY-0891', 'JV-PAY-2026-0891', 'Payment Receipt', '2026-09-28',
        'UPI-9821882199', 'PAYMENT', 'PAY-REC-01',
        'UPI advance Rs.20,000 from Apex Retail', 'Accounts');
      insertJE.run('JE-PAY-0891-1', 'JV-PAY-0891', 'HDFC Bank Account',                                   'Assets','DEBIT',  20000, 'CUST-101', 'SO-2026-0891', '');
      insertJE.run('JE-PAY-0891-2', 'JV-PAY-0891', 'Accounts Receivable (Apex Retail Solutions Pvt Ltd)', 'Assets','CREDIT', 20000, 'CUST-101', 'SO-2026-0891', '');

      // JV-07: Gujarat Interstate Sales Invoice (SO-2026-0893 — IGST)
      insertJV.run('JV-SO-0893', 'JV-2026-0893', 'Sales Invoice', '2026-09-30',
        'SO-2026-0893', 'SALES_ORDER', 'SO-2026-0893',
        'IGST tax invoice for SO-2026-0893 — Gujarat Commercial (interstate)', 'Priya Patel');
      insertJE.run('JE-0893-1', 'JV-SO-0893', 'Accounts Receivable (Gujarat Commercial Corp)', 'Assets',      'DEBIT',  15399, 'CUST-106', 'SO-2026-0893', '');
      insertJE.run('JE-0893-2', 'JV-SO-0893', 'Sales Revenue Account',                         'Revenue',    'CREDIT', 13050, 'CUST-106', 'SO-2026-0893', '');
      insertJE.run('JE-0893-3', 'JV-SO-0893', 'Output IGST (18%)',                              'Liabilities','CREDIT',  2349, 'CUST-106', 'SO-2026-0893', '');

      // JV-08: Gujarat Full Advance Payment (PAY-REC-03)
      insertJV.run('JV-PAY-0893', 'JV-PAY-2026-0893', 'Payment Receipt', '2026-09-30',
        'RTGS-HDFC-991', 'PAYMENT', 'PAY-REC-03',
        'RTGS full payment Rs.15,399 from Gujarat Commercial', 'Accounts');
      insertJE.run('JE-PAY-0893-1', 'JV-PAY-0893', 'HDFC Bank Account',                              'Assets','DEBIT',  15399, 'CUST-106', 'SO-2026-0893', '');
      insertJE.run('JE-PAY-0893-2', 'JV-PAY-0893', 'Accounts Receivable (Gujarat Commercial Corp)', 'Assets','CREDIT', 15399, 'CUST-106', 'SO-2026-0893', '');

      // JV-09: Dealer Advance Payment (PAY-REC-02)
      insertJV.run('JV-PAY-0892', 'JV-PAY-2026-0892', 'Payment Receipt', '2026-09-29',
        'NEFT-8839210', 'PAYMENT', 'PAY-REC-02',
        'NEFT advance Rs.4,000 from Shree Ganesh Advertising', 'Accounts');
      insertJE.run('JE-PAY-0892-1', 'JV-PAY-0892', 'HDFC Bank Account',                                   'Assets','DEBIT',  4000, 'CUST-102', 'SO-2026-0892', '');
      insertJE.run('JE-PAY-0892-2', 'JV-PAY-0892', 'Accounts Receivable (Shree Ganesh Advertising)', 'Assets','CREDIT', 4000, 'CUST-102', 'SO-2026-0892', '');

      // JV-10: Outsource Bill Payment (PAY-000101)
      insertJV.run('JV-VEND-0001', 'JV-VEND-2026-0001', 'Vendor Payment', '2026-10-01',
        'CASH-REC-991', 'OUTSOURCE_PAYMENT', 'PAY-000101',
        'Cash payment Rs.5,000 to ABC Embroidery against BILL-125', 'Accounts');
      insertJE.run('JE-VEND-001-1', 'JV-VEND-0001', 'ABC Embroidery Payable',   'Liabilities','DEBIT',  5000, null, null, '');
      insertJE.run('JE-VEND-001-2', 'JV-VEND-0001', 'Cash Account',             'Assets',     'CREDIT', 5000, null, null, '');

      // JV-11: Electricity Expense (EXP-2026-01)
      insertJV.run('JV-EXP-001', 'JV-EXP-2026-001', 'Expense Voucher', '2026-09-15',
        'EXP-2026-01', 'EXPENSE', 'EXP-2026-01',
        'KSEB monthly industrial electricity bill — September 2026', 'Accounts');
      insertJE.run('JE-EXP-001-1', 'JV-EXP-001', 'Electricity & Power Expenses', 'Expenses','DEBIT',  18450, null, null, '');
      insertJE.run('JE-EXP-001-2', 'JV-EXP-001', 'HDFC Bank Account',            'Assets',  'CREDIT', 18450, null, null, '');

      // JV-12: Factory Rent Expense (EXP-2026-02)
      insertJV.run('JV-EXP-002', 'JV-EXP-2026-002', 'Expense Voucher', '2026-09-01',
        'EXP-2026-02', 'EXPENSE', 'EXP-2026-02',
        'Factory shed lease rent — September 2026', 'Accounts');
      insertJE.run('JE-EXP-002-1', 'JV-EXP-002', 'Factory Rent Expenses', 'Expenses','DEBIT',  45000, null, null, '');
      insertJE.run('JE-EXP-002-2', 'JV-EXP-002', 'HDFC Bank Account',     'Assets',  'CREDIT', 45000, null, null, '');

    } catch (e) { console.error('journal vouchers seed error:', e.message); }

    // 27. Unmapped Biometric Punches
    try {
      const insertPunch = db.prepare(`
        INSERT INTO unmapped_biometric_punches (id, device_id, biometric_user_id, biometric_name, punch_time, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertPunch.run('PUNCH-001', 'DEV-K90-01', '26', 'Shihab', '2026-09-28 09:01:00', 'Pending HR Action');
      insertPunch.run('PUNCH-002', 'DEV-K90-01', '26', 'Shihab', '2026-09-28 18:04:00', 'Pending HR Action');
      insertPunch.run('PUNCH-003', 'DEV-K90-01', '30', 'Biometric User 30', '2026-09-29 09:15:00', 'Pending HR Action');
      insertPunch.run('PUNCH-004', 'DEV-K90-01', '30', 'Biometric User 30', '2026-09-29 17:58:00', 'Pending HR Action');
      insertPunch.run('PUNCH-005', 'DEV-K90-01', '26', 'Shihab', '2026-09-30 08:55:00', 'Pending HR Action');
    } catch (e) { console.error('unmapped_biometric_punches seed error:', e.message); }

  });

  runInTransaction();
  console.log('✅ Demo data successfully seeded into SQLite database!');
}

const isMain = process.argv[1] && (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('seedDemoData.js'));
if (isMain) {
  import('./db.js').then(({ default: db }) => {
    seedDemoData(db);
  });
}
