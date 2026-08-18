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
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Walk-in';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maharashtra (27)';
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 50000;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS outstanding NUMERIC DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_at DATE DEFAULT CURRENT_DATE;

-- 2. Ensure all columns exist on care_of_persons table
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Referred Agent / Consultant';
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS referral_commission_pct NUMERIC DEFAULT 5.0;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS total_referred_sales NUMERIC DEFAULT 0;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS active_orders INTEGER DEFAULT 0;
ALTER TABLE public.care_of_persons ADD COLUMN IF NOT EXISTS notes TEXT;

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


