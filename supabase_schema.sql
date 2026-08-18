-- SUPABASE SCHEMA & MIGRATION FOR SCREENARTS ERP
-- Run this in your Supabase SQL Editor.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (linked to Auth Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow profile insertion on signup" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. COMPANY PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.company_profile (
    id INT PRIMARY KEY DEFAULT 1,
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
    account_name TEXT,
    account_no TEXT,
    ifsc TEXT,
    branch TEXT,
    upi_id TEXT,
    terms TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_row CHECK (id = 1)
);

ALTER TABLE public.company_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to company_profile" ON public.company_profile FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to company_profile" ON public.company_profile FOR ALL TO authenticated USING (true);

-- 3. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_no TEXT NOT NULL,
    ifsc TEXT,
    branch TEXT,
    upi_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to bank_accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to bank_accounts" ON public.bank_accounts FOR ALL TO authenticated USING (true);

-- 4. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    mobile TEXT,
    email TEXT,
    gstin TEXT,
    type TEXT DEFAULT 'Walk-in',
    address TEXT,
    state TEXT DEFAULT 'Maharashtra (27)',
    credit_limit NUMERIC DEFAULT 0,
    outstanding NUMERIC DEFAULT 0,
    total_orders INT DEFAULT 0,
    created_at DATE DEFAULT CURRENT_DATE
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to customers" ON public.customers FOR ALL TO authenticated USING (true);

-- 5. SALES PERSONS
CREATE TABLE IF NOT EXISTS public.sales_persons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT,
    target NUMERIC DEFAULT 0,
    achieved NUMERIC DEFAULT 0,
    commission_rate NUMERIC DEFAULT 0
);

ALTER TABLE public.sales_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to sales_persons" ON public.sales_persons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to sales_persons" ON public.sales_persons FOR ALL TO authenticated USING (true);

-- 6. CARE OF PERSONS
CREATE TABLE IF NOT EXISTS public.care_of_persons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT,
    email TEXT,
    role TEXT,
    referral_commission_pct NUMERIC DEFAULT 0,
    total_referred_sales NUMERIC DEFAULT 0,
    active_orders INT DEFAULT 0,
    notes TEXT
);

ALTER TABLE public.care_of_persons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to care_of_persons" ON public.care_of_persons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to care_of_persons" ON public.care_of_persons FOR ALL TO authenticated USING (true);

-- 7. WORKERS
CREATE TABLE IF NOT EXISTS public.workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    mobile TEXT,
    incentive_per_sq_ft NUMERIC DEFAULT 0,
    incentive_per_job NUMERIC DEFAULT 0,
    jobs_completed_this_month INT DEFAULT 0,
    sq_ft_handled_this_month NUMERIC DEFAULT 0
);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to workers" ON public.workers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to workers" ON public.workers FOR ALL TO authenticated USING (true);

-- 8. DESIGNERS
CREATE TABLE IF NOT EXISTS public.designers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT,
    active_jobs INT DEFAULT 0,
    pending_approvals INT DEFAULT 0,
    completed_month INT DEFAULT 0
);

ALTER TABLE public.designers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to designers" ON public.designers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to designers" ON public.designers FOR ALL TO authenticated USING (true);

-- 9. VENDORS (SUPPLIERS)
CREATE TABLE IF NOT EXISTS public.vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    mobile TEXT,
    gstin TEXT,
    pending_payment NUMERIC DEFAULT 0,
    avg_turnaround_days INT DEFAULT 0
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to vendors" ON public.vendors FOR ALL TO authenticated USING (true);

-- 10. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT,
    default_rate NUMERIC DEFAULT 0,
    estimated_cost NUMERIC DEFAULT 0,
    gst_rate NUMERIC DEFAULT 0,
    hsn_code TEXT,
    category TEXT,
    default_vendor TEXT,
    default_material TEXT,
    is_custom BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to products" ON public.products FOR ALL TO authenticated USING (true);

-- 11. SALES ORDERS
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id TEXT PRIMARY KEY,
    order_date DATE DEFAULT CURRENT_DATE,
    delivery_date DATE,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_mobile TEXT,
    customer_state TEXT,
    sales_person_id TEXT REFERENCES public.sales_persons(id) ON DELETE SET NULL,
    sales_person_name TEXT,
    care_of_id TEXT REFERENCES public.care_of_persons(id) ON DELETE SET NULL,
    care_of_name TEXT,
    branch TEXT,
    order_source TEXT,
    reference_no TEXT,
    remarks TEXT,
    subtotal NUMERIC DEFAULT 0,
    cgst NUMERIC DEFAULT 0,
    sgst NUMERIC DEFAULT 0,
    igst NUMERIC DEFAULT 0,
    round_off NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    total_estimated_cost NUMERIC DEFAULT 0,
    total_actual_cost NUMERIC DEFAULT 0,
    total_internal_est_outsource_cost NUMERIC DEFAULT 0,
    gross_profit NUMERIC DEFAULT 0,
    profit_margin_pct NUMERIC DEFAULT 0,
    advance_amount NUMERIC DEFAULT 0,
    balance_amount NUMERIC DEFAULT 0,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'Pending',
    production_status TEXT DEFAULT 'New',
    delivery_mode TEXT,
    delivered_by TEXT,
    signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edit_history JSONB DEFAULT '[]'::jsonb,
    whats_app_opened TEXT DEFAULT 'No',
    last_whats_app_date TEXT,
    last_whats_app_time TEXT,
    whats_app_sent_by TEXT,
    order_type TEXT DEFAULT 'Direct',
    converted_from_quotation BOOLEAN DEFAULT FALSE,
    quotation_id TEXT,
    quotation_status TEXT DEFAULT 'Draft'
);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to sales_orders" ON public.sales_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to sales_orders" ON public.sales_orders FOR ALL TO authenticated USING (true);

-- 12. SALES ORDER ITEMS (JOBS / PRODUCTS ON ORDER)
CREATE TABLE IF NOT EXISTS public.sales_order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    width NUMERIC DEFAULT 0,
    height NUMERIC DEFAULT 0,
    unit TEXT,
    qty NUMERIC DEFAULT 1,
    total_sq_ft NUMERIC DEFAULT 0,
    material TEXT,
    designer_required TEXT DEFAULT 'NO',
    designer_id TEXT REFERENCES public.designers(id) ON DELETE SET NULL,
    designer_name TEXT,
    artwork_status TEXT DEFAULT 'Approved',
    artwork_url TEXT,
    outsource BOOLEAN DEFAULT FALSE,
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name TEXT,
    estimated_vendor_cost NUMERIC DEFAULT 0,
    actual_vendor_bill NUMERIC DEFAULT 0,
    vendor_bill_date TEXT,
    vendor_payment_status TEXT DEFAULT 'N/A',
    estimated_cost NUMERIC DEFAULT 0,
    actual_cost NUMERIC DEFAULT 0,
    selling_rate NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax_type TEXT,
    gst_rate NUMERIC DEFAULT 18,
    amount NUMERIC DEFAULT 0,
    production_status TEXT DEFAULT 'New',
    job_card_id TEXT,
    internal_est_outsource_cost NUMERIC DEFAULT 0,
    design_status TEXT DEFAULT 'Pending',
    job_priority TEXT DEFAULT 'Normal',
    estimated_design_time NUMERIC DEFAULT 1.0,
    assignment_time TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    completed_time TIMESTAMPTZ,
    internal_notes TEXT
);

ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to sales_order_items" ON public.sales_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to sales_order_items" ON public.sales_order_items FOR ALL TO authenticated USING (true);

-- 13. INVENTORY STOCK
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    current_stock NUMERIC DEFAULT 0,
    unit TEXT,
    reorder_level NUMERIC DEFAULT 0,
    unit_cost NUMERIC DEFAULT 0
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to inventory" ON public.inventory FOR ALL TO authenticated USING (true);

-- 14. PURCHASE ORDERS
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    vendor_name TEXT NOT NULL,
    order_date DATE DEFAULT CURRENT_DATE,
    items TEXT,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending'
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to purchase_orders" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (true);

-- 15. CUSTOMER PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    order_id TEXT REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    customer_name TEXT,
    amount NUMERIC DEFAULT 0,
    method TEXT,
    ref_no TEXT,
    status TEXT DEFAULT 'Verified',
    bank_account_id TEXT REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
    bank_account_name TEXT,
    recorded_by TEXT
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to payments" ON public.payments FOR ALL TO authenticated USING (true);

-- 16. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY DEFAULT 'EXP-' || md5(random()::text),
    date DATE DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC DEFAULT 0,
    payment_method TEXT,
    paid_to TEXT,
    ref_no TEXT
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to expenses" ON public.expenses FOR ALL TO authenticated USING (true);

-- 17. SUPPLIER BILLS
CREATE TABLE IF NOT EXISTS public.supplier_bills (
    id TEXT PRIMARY KEY,
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name TEXT,
    bill_no TEXT,
    bill_date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    grand_total NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'Unpaid',
    order_id TEXT REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    item_id TEXT REFERENCES public.sales_order_items(id) ON DELETE SET NULL
);

ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to supplier_bills" ON public.supplier_bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to supplier_bills" ON public.supplier_bills FOR ALL TO authenticated USING (true);

-- 18. SUPPLIER PAYMENTS
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id TEXT PRIMARY KEY DEFAULT 'SPAY-' || md5(random()::text),
    payment_date DATE DEFAULT CURRENT_DATE,
    vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name TEXT,
    amount NUMERIC DEFAULT 0,
    payment_method TEXT,
    ref_no TEXT,
    bank_account_name TEXT
);

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to supplier_payments" ON public.supplier_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to supplier_payments" ON public.supplier_payments FOR ALL TO authenticated USING (true);

-- 19. FOLLOW UPS
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id TEXT PRIMARY KEY,
    type TEXT,
    order_id TEXT REFERENCES public.sales_orders(id) ON DELETE SET NULL,
    customer_name TEXT,
    amount NUMERIC DEFAULT 0,
    due_date DATE,
    care_of TEXT,
    status TEXT DEFAULT 'Pending'
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to follow_ups" ON public.follow_ups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to follow_ups" ON public.follow_ups FOR ALL TO authenticated USING (true);

-- 20. STAFF ATTENDANCE
CREATE TABLE IF NOT EXISTS public.attendance (
    id TEXT PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE,
    staff_id TEXT,
    staff_name TEXT NOT NULL,
    type TEXT,
    status TEXT,
    ot_hours NUMERIC DEFAULT 0,
    notes TEXT
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to attendance" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to attendance" ON public.attendance FOR ALL TO authenticated USING (true);

-- 21. PAYROLL RECORDS
CREATE TABLE IF NOT EXISTS public.payroll (
    id TEXT PRIMARY KEY,
    month TEXT NOT NULL,
    staff_id TEXT,
    staff_name TEXT NOT NULL,
    role TEXT,
    base_salary NUMERIC DEFAULT 0,
    working_days NUMERIC DEFAULT 0,
    days_present NUMERIC DEFAULT 0,
    earned_base_pay NUMERIC DEFAULT 0,
    ot_hours NUMERIC DEFAULT 0,
    ot_pay NUMERIC DEFAULT 0,
    incentive_earned NUMERIC DEFAULT 0,
    advance_deduction NUMERIC DEFAULT 0,
    late_deduction NUMERIC DEFAULT 0,
    net_salary NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    paid_date TEXT,
    payment_mode TEXT
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to payroll" ON public.payroll FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to payroll" ON public.payroll FOR ALL TO authenticated USING (true);

-- 22. PRODUCT MATERIAL SPECIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.product_material_specifications (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    spec_name TEXT NOT NULL,
    material_name TEXT,
    description TEXT,
    unit TEXT DEFAULT 'Sq.Ft',
    gsm NUMERIC DEFAULT 0,
    thickness TEXT,
    color TEXT,
    size TEXT,
    cost_price NUMERIC DEFAULT 0,
    selling_price NUMERIC DEFAULT 0,
    gst_rate NUMERIC DEFAULT 18,
    hsn_code TEXT DEFAULT '9989',
    is_default BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_product_spec_name UNIQUE (product_id, spec_name)
);

ALTER TABLE public.product_material_specifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to product_material_specifications" ON public.product_material_specifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to product_material_specifications" ON public.product_material_specifications FOR ALL TO authenticated USING (true);

-- 23. WORKER JOB INCENTIVES LEDGER (0.5% Profit Incentive per finished work stage)
CREATE TABLE IF NOT EXISTS public.worker_job_incentives (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    item_id TEXT,
    job_card_id TEXT,
    worker_id TEXT,
    worker_name TEXT NOT NULL,
    role_stage TEXT NOT NULL, -- 'Design', 'Printing', 'Finishing', 'Delivery'
    job_amount NUMERIC DEFAULT 0,
    job_profit NUMERIC DEFAULT 0,
    incentive_pct NUMERIC DEFAULT 0.5,
    incentive_amount NUMERIC DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.worker_job_incentives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to worker_job_incentives" ON public.worker_job_incentives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to worker_job_incentives" ON public.worker_job_incentives FOR ALL TO authenticated USING (true);

-- Database indexes for optimized lookup & JOIN performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_vendor ON public.supplier_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_order ON public.supplier_bills(order_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_payroll_month ON public.payroll(month);
CREATE INDEX IF NOT EXISTS idx_spec_product_id ON public.product_material_specifications(product_id);
CREATE INDEX IF NOT EXISTS idx_worker_incentives_worker ON public.worker_job_incentives(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_incentives_order ON public.worker_job_incentives(order_id);

