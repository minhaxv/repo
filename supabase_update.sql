-- ============================================================================
-- SCREENARTS ERP - INCREMENTAL DATABASE UPDATE SCRIPT (NON-DESTRUCTIVE)
-- File: supabase_update.sql
-- ============================================================================
-- Instructions:
-- Run this script in your Supabase SQL Editor.
-- This script contains only non-destructive schema enhancements (ADD COLUMN IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS, CREATE TABLE IF NOT EXISTS).
-- It will NOT delete or truncate any existing data.
-- ============================================================================

-- 1. Ensure all columns exist on customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS additional_mobiles TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Walk-in';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS district TEXT DEFAULT 'Kozhikode';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Kerala';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 10000;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS referral_commission_pct NUMERIC DEFAULT 0.2;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS outstanding NUMERIC DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS opening_balance_type TEXT DEFAULT 'Receivable';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS opening_balance_date TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS opening_balance_notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS care_of_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS care_of_name TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_at DATE DEFAULT CURRENT_DATE;

-- 2. Ensure all columns exist on care_of_persons table
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Referred Agent / Consultant';
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS referral_commission_pct NUMERIC DEFAULT 5.0;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'profit';
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS total_referred_sales NUMERIC DEFAULT 0;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS active_orders INTEGER DEFAULT 0;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2b. Ensure all columns exist on sales_persons table
ALTER TABLE public.sales_persons ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.sales_persons ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.sales_persons ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.sales_persons ADD COLUMN IF NOT EXISTS target_amount NUMERIC DEFAULT 100000;
ALTER TABLE public.sales_persons ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 3.5;

-- 3. Ensure all columns exist on sales_orders table
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS order_date DATE;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_mobile TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS customer_state TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS sales_person_id TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS sales_person_name TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS care_of_id TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS care_of_name TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT 'Main Branch';
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'Direct Walk-in';
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS reference_no TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS cgst NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS sgst NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS igst NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS round_off NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS grand_total NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS total_estimated_cost NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS total_actual_cost NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS gross_profit NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS profit_margin_pct NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS advance_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS balance_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'UPI';
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'Unpaid';
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'New';
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'Counter Pickup';
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS delivered_by TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS billed_by_staff TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS billed_by_id TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS billed_by_role TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS billed_at TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Create performance indexes for common ERP lookups
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers(mobile);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_care_of_id ON public.sales_orders(care_of_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_created_at ON public.sales_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id ON public.sales_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- 5. Enable RLS on profiles if not enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Ensure all attendance columns exist
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS check_in TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS check_out TEXT;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS working_hours NUMERIC DEFAULT 0;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS late_status TEXT DEFAULT 'On Time';
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON public.attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date DESC);

-- 7. Ensure worker assignment & incentive columns exist on sales_order_items
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS printer_id TEXT;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS printer_name TEXT;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS finisher_id TEXT;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS finisher_name TEXT;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS delivery_worker_id TEXT;

-- 8. Create worker_job_incentives table for 0.5% profit incentive per job work
CREATE TABLE IF NOT EXISTS public.worker_job_incentives (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    item_id TEXT,
    job_card_id TEXT,
    worker_id TEXT,
    worker_name TEXT NOT NULL,
    role_stage TEXT NOT NULL,
    job_amount NUMERIC DEFAULT 0,
    job_profit NUMERIC DEFAULT 0,
    incentive_pct NUMERIC DEFAULT 0.5,
    incentive_amount NUMERIC DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.worker_job_incentives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to worker_job_incentives" ON public.worker_job_incentives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to worker_job_incentives" ON public.worker_job_incentives FOR ALL TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_worker_incentives_worker ON public.worker_job_incentives(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_incentives_order ON public.worker_job_incentives(order_id);

-- 9. Production Processes (Process Master)
CREATE TABLE IF NOT EXISTS public.production_processes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Production',
    description TEXT,
    default_unit TEXT DEFAULT 'Nos',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.production_processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to production_processes" ON public.production_processes FOR SELECT USING (true);
CREATE POLICY "Allow public write to production_processes" ON public.production_processes FOR ALL USING (true);

-- 10. Production Tasks / Employee Work Logs
CREATE TABLE IF NOT EXISTS public.production_tasks (
    id TEXT PRIMARY KEY,
    task_date DATE NOT NULL DEFAULT CURRENT_DATE,
    employee_id TEXT NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    order_id TEXT NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    customer_name TEXT,
    item_id TEXT,
    item_title TEXT,
    process_id TEXT,
    process_name TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit TEXT DEFAULT 'Nos',
    start_time TEXT,
    end_time TEXT,
    total_duration_minutes INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    priority TEXT DEFAULT 'Normal',
    remarks TEXT,
    machine_id TEXT,
    machine_name TEXT,
    department TEXT DEFAULT 'Production',
    production_location TEXT,
    original_qty NUMERIC DEFAULT 1,
    completed_qty NUMERIC DEFAULT 0,
    rejected_qty NUMERIC DEFAULT 0,
    rework_qty NUMERIC DEFAULT 0,
    final_qty NUMERIC DEFAULT 0,
    attachment_url TEXT,
    supervisor TEXT,
    qc_status TEXT DEFAULT 'Pending',
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_by TEXT,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_emp ON public.production_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_order ON public.production_tasks(order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON public.production_tasks(task_date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.production_tasks(status);
ALTER TABLE public.production_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to production_tasks" ON public.production_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public write to production_tasks" ON public.production_tasks FOR ALL USING (true);

-- 11. Production Task Time Logs (State transitions, pause/resume intervals)
CREATE TABLE IF NOT EXISTS public.production_task_time_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES public.production_tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    logged_by TEXT,
    notes TEXT,
    elapsed_seconds INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_task_time_logs ON public.production_task_time_logs(task_id);
ALTER TABLE public.production_task_time_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read to production_task_time_logs" ON public.production_task_time_logs FOR SELECT USING (true);
CREATE POLICY "Allow public write to production_task_time_logs" ON public.production_task_time_logs FOR ALL USING (true);
-- 12. Product Material Specifications Table
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
CREATE INDEX IF NOT EXISTS idx_spec_product_id ON public.product_material_specifications(product_id);
ALTER TABLE public.product_material_specifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to product_material_specifications" ON public.product_material_specifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to product_material_specifications" ON public.product_material_specifications FOR ALL TO authenticated USING (true);

-- 13. Worker Job Incentives Ledger (0.5% Profit Incentive)
CREATE TABLE IF NOT EXISTS public.worker_job_incentives (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    item_id TEXT,
    job_card_id TEXT,
    worker_id TEXT,
    worker_name TEXT NOT NULL,
    role_stage TEXT NOT NULL,
    job_amount NUMERIC DEFAULT 0,
    job_profit NUMERIC DEFAULT 0,
    incentive_pct NUMERIC DEFAULT 0.5,
    incentive_amount NUMERIC DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_worker_incentives_worker ON public.worker_job_incentives(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_incentives_order ON public.worker_job_incentives(order_id);
ALTER TABLE public.worker_job_incentives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to worker_job_incentives" ON public.worker_job_incentives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to worker_job_incentives" ON public.worker_job_incentives FOR ALL TO authenticated USING (true);

-- =====================================================================================
-- 14. MIGRATION 020: ADVANCED PRINTING PRODUCT CATALOGUE, DYNAMIC PRICING & BOM COSTING
-- =====================================================================================

-- Product Master Extensions
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_order_qty NUMERIC DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pricing_method TEXT DEFAULT 'FIXED';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS production_settings_json JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- Slabs Extensions
ALTER TABLE public.product_pricing_slabs ADD COLUMN IF NOT EXISTS customer_id TEXT;
ALTER TABLE public.product_pricing_slabs ADD COLUMN IF NOT EXISTS customer_type TEXT;
ALTER TABLE public.product_pricing_slabs ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE public.product_pricing_slabs ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE public.product_pricing_slabs ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
ALTER TABLE public.product_pricing_slabs ADD COLUMN IF NOT EXISTS pricing_rule_name TEXT;

-- Customer-Specific Pricing Rules (Method 5: Negotiated Contracts & Tier Discounts)
CREATE TABLE IF NOT EXISTS public.customer_pricing_rules (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    customer_name TEXT,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    product_category TEXT,
    spec_id TEXT,
    pricing_type TEXT DEFAULT 'CONTRACT_RATE',
    custom_rate NUMERIC,
    discount_pct NUMERIC,
    min_qty NUMERIC DEFAULT 1,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    priority INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpr_cust ON public.customer_pricing_rules(customer_id);
CREATE INDEX IF NOT EXISTS idx_cpr_prod ON public.customer_pricing_rules(product_id);
CREATE INDEX IF NOT EXISTS idx_cpr_active ON public.customer_pricing_rules(active);
ALTER TABLE public.customer_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to customer_pricing_rules" ON public.customer_pricing_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to customer_pricing_rules" ON public.customer_pricing_rules FOR ALL TO authenticated USING (true);

-- Product Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS public.product_bom (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    spec_id TEXT,
    bom_name TEXT NOT NULL DEFAULT 'Standard BOM',
    output_qty NUMERIC NOT NULL DEFAULT 1,
    output_unit TEXT DEFAULT 'Pcs',
    is_default BOOLEAN DEFAULT true,
    raw_materials_json JSONB DEFAULT '[]'::jsonb,
    machine_cost NUMERIC DEFAULT 0,
    machine_id TEXT,
    machine_name TEXT,
    labour_cost NUMERIC DEFAULT 0,
    electricity_cost NUMERIC DEFAULT 0,
    finishing_cost NUMERIC DEFAULT 0,
    packaging_cost NUMERIC DEFAULT 0,
    outsourced_cost NUMERIC DEFAULT 0,
    outsourced_vendor_id TEXT,
    outsourced_process TEXT,
    total_estimated_unit_cost NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pbom_prod ON public.product_bom(product_id);
ALTER TABLE public.product_bom ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to product_bom" ON public.product_bom FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to product_bom" ON public.product_bom FOR ALL TO authenticated USING (true);

-- Production Imposition & Yield Configurations (Business Cards, Label Sheets)
CREATE TABLE IF NOT EXISTS public.product_yield_configs (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
    sheet_name TEXT DEFAULT 'Standard Sheet',
    sheet_width_in NUMERIC DEFAULT 12,
    sheet_height_in NUMERIC DEFAULT 18,
    cards_per_sheet INTEGER NOT NULL DEFAULT 30,
    paper_material_id TEXT,
    paper_gsm NUMERIC DEFAULT 300,
    paper_sheet_cost NUMERIC DEFAULT 6.50,
    printing_side TEXT DEFAULT 'DOUBLE',
    printing_cost_per_sheet NUMERIC DEFAULT 8.00,
    ink_cost_per_sheet NUMERIC DEFAULT 1.50,
    lamination_type TEXT DEFAULT 'Thermal Matte',
    lamination_cost_per_sheet NUMERIC DEFAULT 4.00,
    cutting_cost_per_sheet NUMERIC DEFAULT 1.50,
    wastage_pct NUMERIC DEFAULT 5.0,
    overhead_per_sheet NUMERIC DEFAULT 0.50,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_yield_prod ON public.product_yield_configs(product_id);
ALTER TABLE public.product_yield_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to product_yield_configs" ON public.product_yield_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to product_yield_configs" ON public.product_yield_configs FOR ALL TO authenticated USING (true);

-- Sales Order Line Costing & Margin Audit Snapshots
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS original_selling_price NUMERIC;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS applied_pricing_rule TEXT;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS pricing_rule_details JSONB;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS estimated_material_cost NUMERIC DEFAULT 0;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS estimated_labour_cost NUMERIC DEFAULT 0;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS estimated_machine_cost NUMERIC DEFAULT 0;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS estimated_overhead_cost NUMERIC DEFAULT 0;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS is_rate_overridden BOOLEAN DEFAULT false;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS override_reason TEXT;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS overridden_by_user_id TEXT;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS overridden_by_name TEXT;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS gross_profit NUMERIC DEFAULT 0;
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS gross_profit_margin NUMERIC DEFAULT 0;

-- Pricing Overrides Audit Log
CREATE TABLE IF NOT EXISTS public.pricing_overrides_log (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    order_number TEXT,
    item_id TEXT,
    product_id TEXT,
    product_name TEXT,
    customer_id TEXT,
    customer_name TEXT,
    original_rate NUMERIC,
    overridden_rate NUMERIC,
    reason TEXT,
    user_id TEXT,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pol_order ON public.pricing_overrides_log(order_id);
CREATE INDEX IF NOT EXISTS idx_pol_product ON public.pricing_overrides_log(product_id);
CREATE INDEX IF NOT EXISTS idx_pol_cust ON public.pricing_overrides_log(customer_id);
ALTER TABLE public.pricing_overrides_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read to pricing_overrides_log" ON public.pricing_overrides_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write to pricing_overrides_log" ON public.pricing_overrides_log FOR ALL TO authenticated USING (true);
