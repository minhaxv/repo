# 08. FINANCIAL ACCOUNTING, TAXATION & LEDGER AUDIT

## 1. Accounting System Architecture

The ScreenArts / Printflow Cloud ERP features a dedicated double-entry financial accounting subsystem implemented in `src/utils/accountingEngine.js` and visualized via `src/views/AccountsView.jsx`.

The architecture follows standard Indian statutory accounting principles and is structured into five core **Account Groups**:
1. **Assets**: Cash in Hand, Bank Accounts (HDFC, ICICI, SBI, Axis), Accounts Receivable (Customer Balances), Finished Goods & Raw Material Inventory.
2. **Liabilities**: Accounts Payable (Suppliers & Outsource Vendors), Output GST Payable (CGST, SGST, IGST), Worker Salaries Payable.
3. **Capital & Equity**: Owner's Capital, Retained Earnings.
4. **Income & Revenue**: Sales Revenue (Flex, Vinyl, Signage, Commercial Print), Outsource Markup Income.
5. **Expenses & Outflows**: Raw Material Costs (Inks, Media, Acrylic), Machine Maintenance, Factory Rent, Electricity, Delivery & Freight, Staff Wages & Job Incentives.

---

## 2. Feature-by-Feature Accounting Implementation Status

| Accounting Feature | Implementation Status | Implementation Details & Engine Source |
| :--- | :---: | :--- |
| **Sales Invoicing** | **Fully Implemented** | Billed via `sales_orders`; computes taxable subtotal, item discounts, CGST, SGST, IGST, and grand total. |
| **Payments Received** | **Fully Implemented** | Tracked in `payments` table; supports Cash, UPI, Cheque, Bank Transfer, NEFT/RTGS; updates customer outstanding. |
| **Customer Outstanding** | **Fully Implemented** | Live computation: `SUM(grand_total) - SUM(payments)`; tracked per customer in `customers.outstanding`. |
| **Supplier Outstanding** | **Fully Implemented** | Tracked in `suppliers.pending_payment` and `outsource_jobs.actual_vendor_bill`. |
| **Cash Account** | **Fully Implemented** | Petty cash ledger for cash orders, counter advances, and minor shop expenses. |
| **Bank Ledgers** | **Fully Implemented** | Multiple distinct corporate bank accounts (`initialCompanyBankAccounts`: HDFC, ICICI, SBI, Axis) with IFSC and UPI handles. |
| **General Ledger** | **Fully Implemented** | `calculateGeneralLedger()` dynamically processes journal vouchers and generates running debit/credit balances. |
| **Party Statement** | **Fully Implemented** | Detailed chronological statement of invoices, advances, and pending balances for any customer. |
| **Profit & Loss Statement**| **Fully Implemented** | `generateProfitAndLoss()` aggregates Revenue vs Cost of Goods Sold (COGS) and Operating Expenses to yield Net Profit. |
| **Balance Sheet** | **Fully Implemented** | `generateBalanceSheet()` dynamically verifies that Total Assets = Total Liabilities + Owner's Equity. |
| **GST Calculation** | **Fully Implemented** | Full support for 5%, 12%, 18%, and 28% GST brackets with HSN code `9989` (Printing Services). |
| **CGST / SGST Breakdown** | **Fully Implemented** | Auto-splits tax into equal 50% CGST + 50% SGST for intra-state Maharashtra transactions (State Code `27`). |
| **IGST Handling** | **Fully Implemented** | Applies 100% IGST when delivery state differs from company registration state. |
| **Discounts & Round-Off** | **Fully Implemented** | Item-level percentage discounts and order-level lump-sum deductions supported; round-off to nearest rupee. |
| **Expenses Subsystem** | **Partially Implemented** | Captured as Expense Journal Vouchers (`JV-EXP`) in `accountingEngine.js`; standalone `expenses` SQLite table pending schema unification. |
| **Credit & Debit Notes** | **Partially Implemented** | Sales returns can be recorded as adjustments; formal formal E-way/GST credit note PDFs are in progress. |
| **Cash Flow Statement** | **Partially Implemented** | Inflows and outflows are categorized in General Ledger; dedicated three-tier cash flow view (Operating, Investing, Financing) is in draft. |
| **Bank Reconciliation** | **Missing** | Bank statement CSV import and automated matching with recorded payments is not yet implemented. |
| **E-Invoice / E-Way Bill** | **Missing** | Direct API integration with the Indian Government NIC E-Way Bill portal (for shipments > ₹50,000) is pending API credentials. |

---

## 3. Double-Entry Posting Rules Example

When Sales Order `#SO-1001` for ₹40,000 + 18% GST (Total ₹47,200) is billed to Apex Retailers with an advance payment of ₹20,000 via UPI:

### Voucher 1: Sales Billing (Auto-Posted)
- **Debit**: Accounts Receivable (Apex Retailers) — ₹47,200
- **Credit**: Sales Revenue Account — ₹40,000
- **Credit**: Output CGST Payable (9%) — ₹3,600
- **Credit**: Output SGST Payable (9%) — ₹3,600

### Voucher 2: Advance Receipt (Auto-Posted)
- **Debit**: HDFC Bank Account (UPI Receipt) — ₹20,000
- **Credit**: Accounts Receivable (Apex Retailers) — ₹20,000
- **Net Customer Outstanding Balance**: ₹27,200 (Accurate)
