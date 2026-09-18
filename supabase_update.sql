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
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maharashtra (27)';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 50000;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS outstanding NUMERIC DEFAULT 0;
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



