# MASTER AUDIT INDEX & AI INGESTION GUIDE

**Project**: ScreenArts / Printflow Cloud ERP  
**Package Folder**: `ERP_AI_AUDIT_EXPORT/`  
**Compressed Archive**: `ERP_AI_AUDIT_EXPORT.zip`  
**Purpose**: Comprehensive, read-only AI-ready knowledge package providing full system understanding for automated AI agents, auditors, and senior software architects.

---

## 1. Quantitative Audit Metrics

| Metric Description | Audit Count | Details / Verification |
| :--- | :---: | :--- |
| **Total Project Files Scanned** | **74 Files** | Comprehensive scan of `src/`, `server/`, `database/`, configs, and DDLs. |
| **Total Modules Identified** | **31 Modules** | Across CRM, Sales, Production, Biometrics, HR, Accounting, and Logistics. |
| **Total Database Tables** | **24 Tables** | In `database/erp.sqlite` (plus Supabase cloud PostgreSQL counterpart). |
| **Total Database Columns** | **360+ Columns** | Fully mapped with data types, nullability, defaults, PKs, and FKs. |
| **Total Backend API Endpoints** | **27 Endpoints** | Express 5 REST routes including ZKTeco ADMS biometrics protocol. |
| **Total User Roles & Personas** | **7 Roles** | `Admin`, `Sales`, `Designer`, `Production`, `Accounts`, `Delivery`, `Manager`. |
| **Total Dedicated View Components**| **28 Views** | In `src/views/` covering all ERP business operations. |
| **Total Interactive Modals** | **18 Modals** | In `src/components/modals/` for dialogs, drawer sheets, and prints. |
| **Total Business Reports** | **22 Reports** | Categorized into 9 analytical domains in `ReportsView.jsx`. |
| **Total Code Defects / Bugs Identified**| **5 Issues** | Documented with evidence, cause, and solution in `11_BUG_AUDIT.md`. |
| **Total Data Quality Anomalies** | **1 Finding** | 1 duplicate customer phone test entry documented in `12_DATA_QUALITY_AUDIT.md`. |
| **Total Security Vulnerabilities** | **4 Findings** | Graded from High to Medium in `13_SECURITY_AUDIT.md`. |
| **Total Safe CSV Data Exports** | **16 CSVs** | Anonymized PII, zero credentials exported. |

---

## 2. Directory Manifest & Document Guide

Any AI assistant analyzing this ERP should ingest the files in the following logical sequence:

### Phase 1: High-Level Understanding & Architecture
1. **[`00_EXECUTIVE_SUMMARY.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/00_EXECUTIVE_SUMMARY.md)**: Executive briefing, tech stack, implemented/missing modules, and prioritized P0-P3 roadmap.
2. **[`01_PROJECT_STRUCTURE.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/01_PROJECT_STRUCTURE.md)**: Full directory tree, frontend/backend architecture, and environment variable names.
3. **[`04_ERP_MODULE_INVENTORY.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/04_ERP_MODULE_INVENTORY.md)**: Comprehensive matrix of all 31 modules with implementation statuses.

### Phase 2: Relational Data Schema & Lifecycles
4. **[`02_DATABASE_SCHEMA.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/02_DATABASE_SCHEMA.md)**: Full database dictionary with columns, data types, constraints, and indexes.
5. **[`03_DATABASE_RELATIONSHIPS.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/03_DATABASE_RELATIONSHIPS.md)**: Visual Mermaid ER diagram and cascade action rules.
6. **[`10_ERP_DATA_FLOW.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/10_ERP_DATA_FLOW.md)**: Sequence diagrams for commercial sales, production routing, and stock movements.

### Phase 3: Operations, Workflow & Attribution
7. **[`05_PRODUCTION_WORKFLOW.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/05_PRODUCTION_WORKFLOW.md)**: The exact 8-stage printing production pipeline and data recorded per stage.
8. **[`06_USER_ROLE_PERMISSION_AUDIT.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/06_USER_ROLE_PERMISSION_AUDIT.md)**: Permissions matrix and "who did what" attribution audit (billed by, printed by, etc.).
9. **[`07_EMPLOYEE_PRODUCTIVITY_AUDIT.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/07_EMPLOYEE_PRODUCTIVITY_AUDIT.md)**: Analysis of multi-task employee work logging with start/stop stopwatch timers.

### Phase 4: Financials, APIs & Reports
10. **[`08_ACCOUNTING_AUDIT.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/08_ACCOUNTING_AUDIT.md)**: Double-entry ledger, automated journal vouchers, GST breakdown, and Balance Sheet.
11. **[`09_API_DOCUMENTATION.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/09_API_DOCUMENTATION.md)**: Exhaustive documentation of all 27 REST endpoints and ZKTeco ADMS biometrics protocol.
12. **[`14_REPORTS_AUDIT.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/14_REPORTS_AUDIT.md)**: Catalog of 22 analytical reports, data sources, filters, and export formats.

### Phase 5: Diagnostics, Integrity & Security
13. **[`11_BUG_AUDIT.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/11_BUG_AUDIT.md)**: Catalog of identified bugs and recommended technical fixes.
14. **[`12_DATA_QUALITY_AUDIT.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/12_DATA_QUALITY_AUDIT.md)**: Referential integrity checks, orphan detection, and data consistency verification.
15. **[`13_SECURITY_AUDIT.md`](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/ERP_AI_AUDIT_EXPORT/13_SECURITY_AUDIT.md)**: OWASP security assessment, SQLi safety verification, and privacy compliance.

---

## 3. Safe Anonymized CSV Exports Manifest

The following 16 safe CSV datasets are exported in this package:

| Filename | Record Count | Masking & Privacy Rules Applied |
| :--- | :---: | :--- |
| **`customers.csv`** | 10 Rows | Phone numbers masked (`982XXXX223`), emails masked (`pr***t@apexretail.com`), IDs & balances preserved. |
| **`products.csv`** | 16 Rows | Product catalog, pricing rates, HSN codes, dimensions, units. |
| **`materials.csv`** | 6 Rows | Substrate media, current stock quantity, unit cost, reorder levels. |
| **`stock.csv`** | 6 Rows | Inventory valuation and stock balances. |
| **`quotations.csv`** | 2 Rows | Pre-sales estimates and quotation pipeline. |
| **`orders.csv`** | 9 Rows | Sales orders with delivery dates, tax totals, advances, and staff billing attribution. |
| **`order_items.csv`** | 16 Rows | Line items with historical dimensions, rates, and assigned staff. |
| **`invoices.csv`** | 9 Rows | Formal GST tax invoices with CGST/SGST/IGST breakdown. |
| **`payments.csv`** | 7 Rows | Payment receipts, payment methods (Cash, UPI, Bank), reference numbers. |
| **`employees.csv`** | 14 Rows | Staff master list, roles, departments, salaries. Phone & email masked. Zero passwords. |
| **`users_safe.csv`** | 14 Rows | System user personas with access permission flags. Zero credentials or tokens. |
| **`suppliers.csv`** | 4 Rows | Outsource vendors and suppliers. Contact details masked. |
| **`purchases.csv`** | 12 Rows | Subcontracted outsource job orders and vendor bills. |
| **`expenses.csv`** | 5 Rows | Categorized operational expense vouchers. |
| **`production_tasks.csv`** | 11 Rows | Multi-task worker logs with start/end timestamps and completed quantities. |
| **`audit_logs.csv`** | 5 Rows | Immutable sales order edit and status transition logs. |

---

## 4. Inspection Limitations & Uninspected Files

- **Physical Biometric Hardware**: The physical ZKTeco K90 hardware terminal was inspected via its network emulation endpoints and database records; live TCP network packets could not be monitored directly as the device was not actively connected during the offline audit window.
- **Production Secrets**: Root `.env` containing sensitive private keys was deliberately excluded from inspection and export in accordance with strict data privacy constraints.
