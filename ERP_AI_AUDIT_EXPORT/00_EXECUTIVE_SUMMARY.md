# 00. EXECUTIVE SUMMARY — PRINTING SHOP ERP SYSTEM AUDIT

**System Name**: ScreenArts / Printflow Cloud ERP  
**Audit Type**: Full System Architecture, Data Schema, Security & Business Workflow Audit  
**Date of Audit**: September 18, 2026  
**Auditor Mode**: Read-Only Autonomous Inspection  

---

## 1. Executive System Overview

The **ScreenArts / Printflow Cloud ERP** is a specialized, end-to-end Enterprise Resource Planning system specifically engineered for commercial printing, flex/vinyl signage fabrication, digital UV flatbed production, offset printing, and advertising fabrication businesses in India.

The system manages the end-to-end operational lifecycle:
1. **Customer Onboarding & CRM**: Multi-phone support, GSTIN verification, credit limit enforcement, outstanding tracking.
2. **Sales Quotations & Order Management**: Custom dimensional calculator (Sq.Ft, Sq.Inch, Rft, Pcs), line items with historical product snapshots, tax calculations (CGST/SGST/IGST), and staff billing attribution.
3. **Pre-Press & Design**: Designer assignment, artwork approval cycles, customer proofing.
4. **Production Scheduling & Multi-Task Tracking**: Process routing (Flex Printing, Eco-Solvent Vinyl, Lamination, Eyeletting, Acrylic CNC, QC), machine allocation, employee time logging with pause/resume timers.
5. **Hardware Biometric Integration**: Direct native TCP/HTTP push integration with **ZKTeco K90** biometric attendance devices via ADMS protocol (`/iclock/cdata`).
6. **Outsourcing & Vendor Management**: Third-party vendor job cards, turnaround tracking, and vendor bill reconciliation.
7. **Delivery & Logistics**: Pickup, dispatch van, courier, and partial delivery slips.
8. **Double-Entry Financial Accounting**: Automated journal vouchers, General Ledger, Profit & Loss statements, Balance Sheet, and Customer Outstanding statements.

---

## 2. Technology Stack

| Layer | Technologies Used | Description & Implementation Details |
| :--- | :--- | :--- |
| **Frontend UI** | **React 18.2.0** + **Vite 5.1.6** | Single Page Application (SPA) with fast HMR, component-driven architecture. |
| **Styling & Icons** | **Vanilla CSS** + **Lucide React** (0.344.0) | High-contrast industrial ERP theme with responsive layouts, modal overlays, and status color badges. |
| **Backend API** | **Express.js 5.2.1** (Node.js v24) | RESTful API server running on port `3001` handling business logic, data persistence, and hardware push requests. |
| **Primary Database** | **SQLite 3** via **better-sqlite3 13.0.3** | High-performance local database stored at `database/erp.sqlite` running in WAL (Write-Ahead Logging) mode with foreign keys enabled. |
| **Cloud Database** | **Supabase (PostgreSQL 15)** (Optional Hybrid) | Configured via `@supabase/supabase-js` and `@supabase/server` for remote cloud synchronization and cloud Auth. |
| **State & Cache** | **React Context API** (`ERPContext.jsx`) + **LocalStorage** | Dual-layer persistence: UI changes are held in reactive state, mirrored to browser `localStorage` to survive page reloads, and committed to SQLite via REST API. |
| **Device Integration**| **ZKTeco ADMS Protocol** | Native Express routes (`/iclock/cdata`, `/iclock/getrequest`) capturing real-time biometric terminal punches and user IDs. |

---

## 3. Implemented vs Partial vs Missing Modules Summary

### Fully Implemented Modules
- **Customers & CRM**: Multi-contact storage, duplicate mobile detection modal, credit limit tracking, ledger.
- **Sales Orders & Quotations**: Comprehensive dimensional line-item order entry, custom items, tax calculations, staff billing attribution (`billed_by_staff`, `billed_by_id`, `billed_by_role`, `billed_at`).
- **Product Catalog & Specifications**: Standard products, custom pricing tiers, HSN code `9989`, material definitions.
- **Production Stage Tracking**: Kanban pipeline (Designing -> Printing -> Outsource -> Finishing -> QC -> Ready -> Delivered).
- **Multi-Task Employee Logging**: `production_tasks` with start/end time, pause/resume time logs, quantity tracking (completed, rejected, rework), and QC approval.
- **Biometric Device Interface**: ZKTeco K90 device sync, employee-biometric mapping, automated punch capture.
- **Outsource Job Management**: Vendor allocation, expected turnaround, purchase cost vs actual bill reconciliation.
- **Double-Entry General Ledger**: Automated Journal Voucher posting from sales and payments, trial balance, and profit computation.
- **Reporting Engine**: 14 analytical reports with date presets, CSV export, and print modals (Tax Invoices, Job Cards).

### Partially Implemented Modules
- **Inventory & Stock Management**: The UI allows tracking stock items and reorder alerts; however, **production consumption does NOT automatically decrement raw material inventory quantities** upon job completion.
- **Payroll & Attendance**: Biometric punches and daily attendance work, but automated monthly salary generation from attendance data is calculated in memory and not yet committed automatically to SQLite.
- **Cloud Replication**: Supabase schema is fully defined in `supabase_schema.sql` and `supabase_update.sql`, but bidirectional auto-sync between SQLite and Supabase relies on client-side triggers.

### Missing Modules
- **Automated Purchase Orders from Reorder Levels**: Low stock warnings exist, but automatic generation of POs to suppliers is not wired.
- **Customer Self-Service Portal**: No external portal for customers to track order status or approve artwork online.
- **Production Machine IoT Telemetry**: Machine status is manually toggled (Running/Idle/Maintenance) rather than automatically monitored via PLC/IoT sensors.

---

## 4. Critical Architectural & Business Issues

1. **State Divergence Risk (Hybrid Storage Model)**:
   The ERP uses a tripartite data architecture: SQLite (backend), `ERPContext` (React memory), and `localStorage` (browser cache). If a user modifies records on one workstation, other workstations will not see updates until a refresh occurs because WebSocket/Server-Sent Events (SSE) are not yet enabled for live multi-terminal updates.
2. **Missing Production Stock Consumption**:
   When an order for 500 Sq.Ft of Flex printing is completed, the system records the labor and job status, but does not deduct 500 Sq.Ft from the `inventory` table. Inventory deductions must currently be recorded manually.
3. **Client-Side Authentication / Persona Switcher**:
   Currently, user authentication is managed via a persona switcher dropdown in the header and localStorage (`stitch_erp_active_user`). Express API endpoints do not enforce JWT verification or Bearer token headers on REST requests, making the API vulnerable on open local networks.

---

## 5. Prioritized Roadmap & Recommendations

### P0 — Critical (Immediate Security & Data Integrity)
- **Implement Centralized API Token Authentication**: Add JWT/session validation on all `/api/*` endpoints so requests without valid authorization headers are rejected.
- **Automate Stock Deduction on Job Completion**: Bind `production_tasks` completion to an inventory trigger that deducts `width * height * qty` of material from `inventory`.
- **WebSocket / Server-Sent Events (SSE)**: Implement real-time broadcasting so that when Billing Staff enters an order, the Production Floor screen updates instantaneously without manual page reload.

### P1 — High (Operational Efficiency)
- **Automated Biometric Payroll Generation**: Connect mapped K90 biometric punch records directly into the monthly payroll ledger to auto-calculate overtime, late mark deductions, and net salary.
- **WhatsApp Cloud API Integration**: Replace current `window.open('https://wa.me/...')` client redirects with backend WhatsApp Business Cloud API webhooks for automated order status, artwork proofs, and payment receipt dispatches.

### P2 — Medium (Business Expansion)
- **Customer Online Proofing Portal**: Allow customers to review artwork proofs and click "Approve" or "Request Revisions" directly from an SMS/WhatsApp link.
- **Comprehensive Vendor Purchase Bill Workflow**: Three-way matching of Purchase Order -> Inward Goods Receipt Note (GRN) -> Vendor Tax Invoice.

### P3 — Enhancement (Long-term Optimization)
- **Machine Maintenance & OEE (Overall Equipment Effectiveness)**: Track uptime, downtime, and maintenance cycles for Roland, HP Latex, and CNC machines.
- **AI-Powered Nesting & Sheet Optimization**: Automatically calculate the most cost-effective arrangement of sticker prints or acrylic cuts on a sheet to minimize trim wastage.
