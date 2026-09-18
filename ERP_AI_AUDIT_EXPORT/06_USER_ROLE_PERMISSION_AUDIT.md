# 06. USER ROLES, PERMISSIONS & WORKFLOW ATTRIBUTION AUDIT

## 1. User Roles & Access Control Architecture

The ERP defines **7 core role personas** in `src/types/index.js` (`USER_ROLES`) and maps granular operational duties to staff members via `employees.role` and `employees.department`.

### System Defined Personas

| Role Persona | Target Job Profiles | Primary Workspace Views |
| :--- | :--- | :--- |
| **`Admin`** | Business Owners, General Managers, System Superusers | Full system access to all 28 views, settings, schema updates, and audit logs. |
| **`Manager`** | Operations Heads, Plant Managers | Production, HR, Attendance, Reports, Machine health, and Outsource approval. |
| **`Sales`** | Sales Executives, Billing Clerks, Counter Operators | Sales Orders, Quotations, Customers, Payments, Delivery, Tax Invoices. |
| **`Designer`** | Pre-press Graphic Artists, 3D Signage Visualizers | Designers View, Artwork uploads, Client revision tracking. |
| **`Production`** | Machine Operators, Printing Staff, Finishing Fabricators | Production Kanban, Production Tasks (timer & quantities), Machines, Wastage. |
| **`Accounts`** | Accountants, Financial Controllers, Cashiers | Accounts (Ledger, Balance Sheet, P&L), GST Registers, Invoicing, Payments. |
| **`Delivery`** | Dispatch Staff, Delivery Drivers, Logistics Helpers | Delivery Queue, Dispatch Slips, Customer Signature Capture. |

---

## 2. Granular Permissions Matrix by Module

| Functional Module | Admin | Manager | Sales | Designer | Production | Accounts | Delivery |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard KPIs** | Full | Full | Read | — | — | Full | — |
| **Customer Creation & Edit** | Full | Full | Full | Read | Read | Full | Read |
| **Sales Order Creation (Billing)**| Full | Full | Full | — | — | Read | — |
| **Order Price / Discount Override**| Full | Full | Conditional| — | — | Read | — |
| **Order Cancellation / Deletion** | Full | Approval| — | — | — | — | — |
| **Artwork Upload & Proofing** | Full | Full | Read | Full | Read | — | — |
| **Production Stage Progression** | Full | Full | Read | — | Full | — | Read |
| **Multi-Task Time Logging** | Full | Full | — | — | Full | — | — |
| **QC Sign-Off & Rework Trigger** | Full | Full | — | — | Approval| — | — |
| **Outsource Vendor Job Creation** | Full | Full | Read | — | Full | Read | — |
| **Payment Collection & Receipt** | Full | Full | Full | — | — | Full | Read |
| **GST Tax Invoice Finalization** | Full | Full | Full | — | — | Full | — |
| **Journal Voucher & General Ledger**| Full | Read | — | — | — | Full | — |
| **Dispatch & Signature Capture** | Full | Full | Full | — | Read | — | Full |
| **Employee Salary & Payroll** | Full | Full | — | — | — | Full | — |
| **Biometric Device Config (K90)**| Full | Full | — | — | — | — | — |
| **Company Profile & Bank Setup** | Full | — | — | — | — | — | — |

*Legend: Full = Create, Read, Update, Delete; Read = View-only; Approval = Can recommend or approve; Conditional = Within configured discount thresholds.*

---

## 3. Workflow Attribution Audit: "Who Did What?"

The ERP has been explicitly designed to answer **who did what** across the order lifecycle. Here is the exact architectural proof of what is recorded:

| Lifecycle Action | Is Actor Recorded? | Database Table & Field | Implementation Status & UI Display |
| :--- | :---: | :--- | :--- |
| **Who created the order** | **YES** | `sales_orders.created_at`, `sales_orders.billed_by_staff`, `billed_by_id` | Stored upon order creation. Displayed in order details and invoice header. |
| **Who billed the order** | **YES** | `sales_orders.billed_by_staff`, `sales_orders.billed_by_id`, `sales_orders.billed_by_role`, `sales_orders.billed_at` | Fully implemented. Dedicated billing attribution badge displayed in Sales Order Details. |
| **Who designed the order** | **YES** | `sales_order_items.designer_id`, `sales_order_items.designer_name` | Recorded when designer is assigned. Visible on Job Cards and Designers View. |
| **Who printed the order** | **YES** | `sales_order_items.printer_id`, `sales_order_items.printer_name` | Captured when machine operator claims printing task. Displayed in Job Card and production report. |
| **Who completed finishing** | **YES** | `sales_order_items.finisher_id`, `sales_order_items.finisher_name` | Recorded in item line and `production_tasks.employee_name` for finishing processes. |
| **Who performed QC** | **YES** | `production_tasks.supervisor`, `production_tasks.qc_status`, `production_tasks.completed_by` | Captured during QC pass/fail inspection. |
| **Who delivered the order**| **YES** | `sales_orders.delivered_by`, `sales_order_items.delivery_worker_id`, `sales_orders.signature_url` | Captured upon dispatch along with customer signature. |
| **Who received payment** | **YES** | `payments.notes`, `payments.ref_no`, `journal_vouchers.createdBy` | Cashier/staff identity recorded in payment receipt notes and journal narration. |
| **Who edited the order** | **YES** | `order_audit_logs.actor`, `order_audit_logs.role`, `order_audit_logs.reason`, `order_audit_logs.changes_summary` | Immutable audit log generated in `SalesOrderAuditView.jsx` on every price or line-item edit. |

---

## 4. Architectural Weakness in Authentication & Authorization

> [!WARNING]
> **Client-Side Role Enforcement**:
> In the current version, role switching is supported seamlessly through the UI persona selector (`Header.jsx` -> `stitch_erp_active_user`). 
> While this provides exceptional flexibility for demonstration and multi-workstation factory environments, **the Express API endpoints on port 3001 do not yet enforce JSON Web Tokens (JWT) or session cookies**. Any client on the local network can send an HTTP `PUT` request to `/api/sales-orders/:id` without presenting cryptographic credentials.
> **Recommendation**: Implement JWT token generation upon login, and add an Express auth middleware verifying `req.headers.authorization` on all mutating routes.
