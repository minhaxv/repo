# 04. COMPLETE ERP MODULE INVENTORY MATRIX

This audit matrix systematically evaluates every business module in the ScreenArts / Printflow Cloud ERP across five dimensions: Fully Implemented, Partially Implemented, Missing Components, and Specific Architectural / Operational Issues.

| Module | Implemented | Partially Implemented | Missing | Issues / Key Observations |
| :--- | :---: | :---: | :---: | :--- |
| **Dashboard** | ✅ | — | — | KPI metrics (Gross Revenue, Total Orders, In Production, Receivables, Monthly Target) are calculated live from `sales_orders` and `payments`. |
| **CRM & Customers** | ✅ | — | — | Full customer directory with multiple mobile numbers, duplicate phone checking modal, credit limits, outstanding balances, GSTIN validation. |
| **Referral Partners (Care Of)** | ✅ | — | — | `care_of_persons` table and dedicated `CareOfManagementView.jsx` tracking mediator commissions (default 2% - 5%) and referred sales. |
| **Products Catalog** | ✅ | — | — | `products` and `product_specifications` tables support dimensional pricing, HSN `9989`, tiered specifications, default media/vendors. |
| **Materials & Substrates** | — | ✅ | — | Materials exist as specifications within products (`product_specifications`) and mock inventory, but lack a standalone raw material SKU master table. |
| **Quotations / Estimates** | ✅ | — | — | Integrated into sales order pipeline with status `'Quotation'` or `QT-` numbering, tax estimation, and single-click conversion to live order. |
| **Sales Orders** | ✅ | — | — | Full dimensional calculator (Width x Height x Qty), automated rate calculation, dynamic GST breakdown, customer selection, and staff billing attribution. |
| **Staff Billing Attribution** | ✅ | — | — | Records `billed_by_staff`, `billed_by_id`, `billed_by_role`, and `billed_at` on every finalized order. |
| **Job Cards & Printing Tickets** | ✅ | — | — | Dedicated `JobOrdersView.jsx` and `JobCardPrintModal.jsx` generating printable barcode/QR job card tickets per order line item. |
| **Designing & Pre-Press** | ✅ | — | — | `DesignersView.jsx` provides queue of orders requiring artwork, designer assignment, artwork status (`Pending`, `Proof Sent`, `Approved`), proof download URLs. |
| **Printing Stage** | ✅ | — | — | Machine operator assignment (`printer_id`, `printer_name`), media selection, printer status tracking. |
| **Finishing Stage** | ✅ | — | — | Worker allocation (`finisher_id`, `finisher_name`), process routing for eyeletting, scoring, lamination, board mounting. |
| **Quality Check (QC)** | ✅ | — | — | QC status flags (`Pending`, `Passed`, `Failed`, `Rework Required`), rejected quantity, rework quantity, and inspector assignment. |
| **Delivery & Dispatch** | ✅ | — | — | `DeliveryView.jsx` handles customer pickup, delivery van dispatch, courier tracking, transport slips, and digital customer signature canvas. |
| **Invoices (GST Tax)** | ✅ | — | — | `GSTInvoicingView.jsx` and `TaxInvoicePrintModal.jsx` produce formal tax invoices adhering to Indian GST laws (B2B, B2C, HSN codes, CGST/SGST/IGST). |
| **Payments & Receipts** | ✅ | — | — | `PaymentsView.jsx` supports Cash, UPI, Card, Bank Transfer, and Credit with reference numbers; automatically updates order balance and customer outstanding. |
| **Double-Entry Accounting** | ✅ | — | — | `AccountsView.jsx` and `accountingEngine.js` generate automated Journal Vouchers, General Ledger, Profit & Loss statements, and Balance Sheet. |
| **Expenses Management** | — | ✅ | — | Expenses are recorded as Journal Vouchers in `accountingEngine.js`, but a dedicated standalone `expenses` SQLite table is pending migration. |
| **Purchases & Material Inward** | — | ✅ | — | `PurchaseView.jsx` and `purchase_orders` exist; outsource vendor bills are recorded, but standard Purchase Order -> GRN workflow is manual. |
| **Suppliers & Outsource Vendors**| ✅ | — | — | `suppliers` table, `OutsourceVendorsView.jsx`, `outsource_jobs` table tracking vendor costs, expected turnaround dates, and bill reconciliation. |
| **Inventory & Stock Management** | — | ✅ | — | `inventory` table tracks stock, reorder levels, and unit costs. **Critical Issue**: Production completion does NOT automatically deduct consumed substrate/ink. |
| **Employees Master Directory** | ✅ | — | — | `employees` table tracks departments, base salaries, designations, commission rates, and joining dates. |
| **Biometric Device Integration** | ✅ | — | — | Direct native integration with **ZKTeco K90** standalone device via ADMS HTTP push protocol (`/iclock/cdata`), device mapping, and punch logs. |
| **Attendance & Overtime** | ✅ | — | — | Daily attendance tracking with check-in, check-out, working hours, late status, and OT hour calculation. |
| **Payroll Management** | — | ✅ | — | Monthly payroll calculates base salary, present days, OT pay, incentives, advance deductions, and net pay in memory; auto-posting to SQLite is in progress. |
| **User Accounts & Roles** | ✅ | — | — | 7 distinct system roles (`Admin`, `Sales`, `Designer`, `Production`, `Accounts`, `Delivery`, `Manager`) defined in `types/index.js` and `sidebarConfig.js`. |
| **Permissions & Access Control** | — | ✅ | — | Navigation menu is filtered by role, and UI actions check role permissions; however, backend Express API does not enforce token-based RBAC on endpoints. |
| **Reporting & Business Analytics**| ✅ | — | — | `ReportsView.jsx` and `reportEngine.js` feature 14+ business reports, date range presets, CSV exports, and interactive summary charts. |
| **Company Settings** | ✅ | — | — | `SettingsView.jsx` and `company_profile` manage bank accounts, IFSC, branch, UPI QR IDs, GSTIN, and legal terms & conditions. |
| **Audit Logs** | ✅ | — | — | `SalesOrderAuditView.jsx` and `initialOrderAuditLogs` record order modifications, price overrides, status transitions, user actor, and change reasons. |
| **Employee Multi-Task Work Logs**| ✅ | — | — | `production_tasks` and `production_task_time_logs` record multiple daily sub-tasks per employee with start/stop/pause timers, quantities, and durations. |
