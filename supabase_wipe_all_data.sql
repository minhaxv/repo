-- ============================================================================
-- SCREENARTS ERP - SUPABASE COMPLETE DATA WIPE SCRIPT (CLEAN SLATE)
-- File: supabase_wipe_all_data.sql
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/pvoajfdoxukhcscadtxo
-- 2. Click on the "SQL Editor" tab on the left navigation bar.
-- 3. Paste this script and click the green "Run" button.
--
-- WHAT THIS DOES:
-- - Safely removes ALL business and transactional records (orders, items,
--   customers, products, vendors, payments, expenses, attendance, tasks).
-- - Preserves table schemas, columns, constraints, foreign keys, and indexes.
-- - Preserves Row Level Security (RLS) policies.
-- - Preserves the admin user in `profiles` so you can continue logging in.
-- ============================================================================

-- Step 1: Wipe all transactional & business data safely with CASCADE
TRUNCATE TABLE
    public.production_task_time_logs,
    public.production_tasks,
    public.production_processes,
    public.worker_job_incentives,
    public.supplier_payments,
    public.supplier_bills,
    public.payments,
    public.sales_order_items,
    public.sales_orders,
    public.product_material_specifications,
    public.products,
    public.customers,
    public.vendors,
    public.purchase_orders,
    public.expenses,
    public.follow_ups,
    public.attendance,
    public.payroll,
    public.workers,
    public.designers,
    public.sales_persons,
    public.care_of_persons,
    public.inventory,
    public.bank_accounts
RESTART IDENTITY CASCADE;

-- Step 2: Verification Query (Confirming all tables are at 0 rows)
SELECT 'customers' AS table_name, COUNT(*) AS row_count FROM public.customers
UNION ALL
SELECT 'sales_orders', COUNT(*) FROM public.sales_orders
UNION ALL
SELECT 'sales_order_items', COUNT(*) FROM public.sales_order_items
UNION ALL
SELECT 'products', COUNT(*) FROM public.products
UNION ALL
SELECT 'vendors', COUNT(*) FROM public.vendors
UNION ALL
SELECT 'payments', COUNT(*) FROM public.payments
UNION ALL
SELECT 'expenses', COUNT(*) FROM public.expenses
UNION ALL
SELECT 'inventory', COUNT(*) FROM public.inventory;
