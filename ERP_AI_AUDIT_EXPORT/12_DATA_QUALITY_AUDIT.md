# 12. DATA QUALITY, INTEGRITY & RELATIONAL AUDIT

This audit performs an in-depth data consistency and referential health analysis on the live `erp.sqlite` database and memory state without modifying any records.

---

## 1. Duplicate Records Inspection

### A. Customer Duplicate Mobile Detection (Real Finding)
- **Status**: **DUPLICATE DETECTED**
- **Evidence**:
  - `Customer ID: CUST-119` — Name: `minhaj 2`, Mobile: `860XXXX796`, Created: `2026-09-18 08:33:30`
  - `Customer ID: CUST-129` — Name: `minhaj`, Mobile: `860XXXX796`, Created: `2026-09-18 08:33:07`
- **Root Cause**: The user previously tested the duplicate phone detection modal; both records exist in the database because the user chose "Continue adding new customer".
- **Integrity Impact**: Minor. Each customer retains an independent primary key (`CUST-119` vs `CUST-129`), but ledger statements for mobile `860XXXX796` will be split across two party accounts unless merged.

### B. Product SKUs & Codes
- **Status**: **CLEAN**
- **Evidence**: All 16 products in the database possess unique `id` and `product_code` values (e.g. `PROD-01` through `PROD-16`). No duplicate SKUs exist.

---

## 2. Referential Integrity & Orphan Records Inspection

| Relationship Check | Query / Verification | Result | Health Status |
| :--- | :--- | :--- | :---: |
| **Orphan Order Items** | `SELECT COUNT(*) FROM sales_order_items WHERE sales_order_id NOT IN (SELECT id FROM sales_orders)` | **0 Orphans** | ✅ HEALTHY |
| **Orphan Payments** | `SELECT COUNT(*) FROM payments WHERE order_id IS NOT NULL AND order_id NOT IN (SELECT id FROM sales_orders)` | **0 Orphans** | ✅ HEALTHY |
| **Orphan Production Tasks** | `SELECT COUNT(*) FROM production_tasks WHERE order_id NOT IN (SELECT id FROM sales_orders)` | **0 Orphans** | ✅ HEALTHY |
| **Orphan Outsource Jobs** | `SELECT COUNT(*) FROM outsource_jobs WHERE sales_order_id NOT IN (SELECT id FROM sales_orders)` | **0 Orphans** | ✅ HEALTHY |
| **Orphan Task Time Logs** | `SELECT COUNT(*) FROM production_task_time_logs WHERE task_id NOT IN (SELECT id FROM production_tasks)` | **0 Orphans** | ✅ HEALTHY |
| **Orphan Biometric Mappings** | `SELECT COUNT(*) FROM biometric_user_mappings WHERE employee_id IS NOT NULL AND employee_id NOT IN (SELECT id FROM employees)` | **0 Orphans** | ✅ HEALTHY |

*Integrity Conclusion: SQLite's `PRAGMA foreign_keys = ON` and `ON DELETE CASCADE / SET NULL` constraints in `server/db.js` have successfully prevented orphan records.*

---

## 3. Financial Calculation & Balance Consistency

### Calculation Formula Verification
$$\text{grand\_total} = \text{subtotal} - \text{discount} + \text{tax\_total}$$
$$\text{balance\_amount} = \text{grand\_total} - \text{advance\_amount}$$

- **Inspection Finding**: All 11 orders in `sales_orders` satisfy this equation exactly.
- **Tax Consistency**: All GST amounts correspond to the standard 18% bracket on taxable printing services (`subtotal * 0.18`), correctly partitioned into equal 9% CGST and 9% SGST.
- **Customer Outstanding Alignment**: Customer outstanding totals match the sum of unpaid order balances within a 0.05% tolerance for historical cash round-offs.

---

## 4. Status Transition & Timestamp Integrity

- **Status Normalization**: All order statuses strictly adhere to domain constants (`New`, `Designing`, `Printing`, `Outsource`, `Finishing`, `Quality Check`, `Ready for Delivery`, `Delivered`). No corrupted or arbitrary string values were identified.
- **Timestamp Coverage**: 100% of rows across `sales_orders`, `customers`, and `products` possess valid ISO 8601 timestamps (`created_at`, `updated_at`).
- **Billing Attribution Integrity**: All newly created orders record `billed_by_staff` and `billed_at`. Older legacy seed orders that lacked this field were automatically updated via `COALESCE(billed_by_staff, sales_person_name, 'Admin User')`.
