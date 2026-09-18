# 14. BUSINESS INTELLIGENCE & REPORTING AUDIT

**Reporting Subsystem**: `src/views/ReportsView.jsx` & `src/utils/reportEngine.js`  
**Total Reports Identified**: 22 Structured Reports across 9 Functional Domains  
**Export Capabilities**: Standard CSV Export (`exportToCSV`), Native Browser Print/PDF Layouts (`printReportPDF`), Interactive Pivot Matrices (`PivotReportView`), and Visual Trend Charts (`ReportCharts`).

---

## 1. Comprehensive Report Catalog

### 1. Daily & Monthly Sales Summary
- **Purpose**: Tracks gross billed sales, discounts, collected advances, and net receivables.
- **Filters**: Date Presets (`TODAY`, `THIS_WEEK`, `THIS_MONTH`, `THIS_QUARTER`, `THIS_YEAR`, `CUSTOM`), Customer, Sales Person, Care-Of, GST Type.
- **Data Source**: `sales_orders`, `sales_order_items`.
- **Calculations**: $\text{Total Billed} = \sum \text{grand\_total}$, $\text{Taxable} = \sum \text{subtotal}$, $\text{Tax} = \sum \text{tax\_total}$.
- **Export Options**: CSV, Printable PDF, Interactive Bar Chart.
- **User Access**: `Admin`, `Manager`, `Sales`, `Accounts`.
- **Accuracy Concerns**: Highly accurate. Directly reflects committed SQLite order records.

### 2. Quotations & Pending Estimates Report
- **Purpose**: Monitors open quotes and pipeline conversion rates.
- **Filters**: Customer, Date range, Minimum value.
- **Data Source**: `sales_orders` with status `'Quotation'` or `QT-` identifier.
- **Calculations**: Count of pending quotes, total estimated pipeline value.
- **Export Options**: CSV, PDF.
- **User Access**: `Admin`, `Sales`.

### 3. Customer Outstanding & Receivables Report
- **Purpose**: Credit control audit listing all debtors with overdue balances.
- **Filters**: Customer Type (`Corporate`, `Dealer`, `Retail`), Minimum Outstanding Amount, Search query.
- **Data Source**: `customers.outstanding`, `sales_orders.balance_amount`.
- **Calculations**: Running sum of unpaid balances grouped by customer.
- **Export Options**: CSV, Party Statement PDF.
- **User Access**: `Admin`, `Accounts`, `Sales`.
- **Accuracy Concerns**: Minor risk if offline manual cash payments are delayed in data entry.

### 4. Customer Detailed Ledger Statement
- **Purpose**: Statutory chronological ledger of debits (invoices) and credits (payments) for any individual party.
- **Filters**: Customer Selector, Date Range.
- **Data Source**: `sales_orders` + `payments` + `journal_vouchers`.
- **Calculations**: Running account balance calculation (`Previous Balance + Debit - Credit`).
- **Export Options**: CSV, Formal Letterhead PDF.
- **User Access**: `Admin`, `Accounts`.

### 5. Production Job Card Stage Report
- **Purpose**: Shop-floor visibility into job locations across the 8 production stages.
- **Filters**: Stage (`Designing`, `Printing`, `Finishing`, `QC`, `Ready`), Priority (`Urgent`, `Normal`).
- **Data Source**: `sales_order_items`, `production_tasks`.
- **Calculations**: Count of active jobs per station; total pending square footage.
- **Export Options**: CSV, Kanban Printout.
- **User Access**: `Admin`, `Production`, `Manager`.

### 6. Machine Utilization & Load Report
- **Purpose**: Evaluates uptime and load across physical printing assets (Flex, Eco-Solvent, UV, CNC).
- **Filters**: Machine Selector, Date Range.
- **Data Source**: `production_tasks.machine_id`, `machines`.
- **Calculations**: Total operational hours, total square feet processed per machine.
- **Export Options**: CSV, Bar Chart.
- **User Access**: `Admin`, `Manager`, `Production`.

### 7. Employee Multi-Task Productivity Report
- **Purpose**: Analyzes worker output, active task hours, paused idle intervals, and stage efficiency.
- **Filters**: Employee Selector, Department, Date.
- **Data Source**: `production_tasks`, `production_task_time_logs`.
- **Calculations**: Total duration in minutes, total pieces/square feet finished, hourly rate output.
- **Export Options**: CSV, Detailed Timecard PDF.
- **User Access**: `Admin`, `Manager`, `HR`.

### 8. Biometric Attendance & OT Register
- **Purpose**: Compares hardware punch records against scheduled shift hours.
- **Filters**: Month, Employee, Late status.
- **Data Source**: `attendance`, `biometric_user_mappings`.
- **Calculations**: Days present, late arrival count, total overtime hours.
- **Export Options**: CSV, Monthly Muster Roll PDF.
- **User Access**: `Admin`, `HR`, `Accounts`.

### 9. Monthly Payroll Disbursement Report
- **Purpose**: Generates salary disbursement sheets with incentives and deductions.
- **Filters**: Month, Year.
- **Data Source**: `payroll`, `attendance`, `worker_job_incentives`.
- **Calculations**: $\text{Net} = \text{Base} + \text{OT Pay} + \text{Job Incentives} - \text{Advance} - \text{Late Deductions}$.
- **Export Options**: CSV, Bank Salary Payment Advice text file.
- **User Access**: `Admin`, `Accounts`.

### 10. Outsource Vendor & Subcontractor Payables Report
- **Purpose**: Audits external fabrication costs and vendor pending payments.
- **Filters**: Vendor Selector, Status (`SENT`, `RECEIVED`, `PAID`).
- **Data Source**: `outsource_jobs`, `suppliers`.
- **Calculations**: Total jobs dispatched, total estimated vs actual bill variance, net payable.
- **Export Options**: CSV, PDF.
- **User Access**: `Admin`, `Accounts`, `Production`.

### 11. Raw Material Stock & Inventory Valuation Report
- **Purpose**: Real-time stock quantities, reorder status, and FIFO stock valuation.
- **Filters**: Category (`Flex`, `Vinyl`, `Ink`, `Boards`), Reorder Alert flag.
- **Data Source**: `inventory`.
- **Calculations**: $\text{Total Asset Value} = \sum (\text{current\_stock} \times \text{unit\_cost})$.
- **Export Options**: CSV, Inventory Audit Sheet.
- **User Access**: `Admin`, `Store`, `Accounts`.
- **Accuracy Concerns**: **High**. Because production does not automatically deduct substrate footage upon print completion, stock quantities must be periodically aligned via physical audit counts.

### 12. GST Tax Register (GSTR-1 B2B / B2C Summary)
- **Purpose**: Statutory sales tax filing report adhering to Indian GST rules.
- **Filters**: Tax Period (Month/Quarter), State Code, Tax Bracket (5%, 12%, 18%, 28%).
- **Data Source**: `sales_orders`, `company_profile`.
- **Calculations**: Taxable value, CGST (9%), SGST (9%), IGST (18%), Total Tax.
- **Export Options**: CSV formatted for GST Offline Tool upload, PDF Tax Register.
- **User Access**: `Admin`, `Accounts`.

### 13. Double-Entry Profit & Loss (P&L) Statement
- **Purpose**: Executive monthly/annual profitability report.
- **Filters**: Fiscal Year, Month.
- **Data Source**: `accountingEngine.js`, `journal_vouchers`, `sales_orders`.
- **Calculations**: Gross Sales - Raw Material COGS = Gross Margin - Operating Expenses = Net Profit.
- **Export Options**: Formal P&L Statement PDF, CSV.
- **User Access**: `Admin`, `Accounts`.

### 14. Balance Sheet
- **Purpose**: Snapshot of corporate financial solvency (Assets = Liabilities + Equity).
- **Filters**: As of Date.
- **Data Source**: `accountingEngine.js` General Ledger accounts.
- **Calculations**: Verifies mathematical balance of Assets and Liabilities.
- **Export Options**: Formal Balance Sheet PDF.
- **User Access**: `Admin`, `Accounts`.
