# 01. FULL PROJECT STRUCTURE & ARCHITECTURE

## 1. Directory Tree Overview

```
stitch_printflow_cloud_erp/
├── .env                              # Environment secrets (Protected / Not exported)
├── .env.example                      # Template defining required environment variables
├── .gitignore                        # Git ignore specifications
├── index.html                        # Vite Single-Page Application entry HTML
├── package.json                      # NPM project definitions, dependencies, scripts
├── package-lock.json                 # Lockfile for dependency tree
├── vite.config.js                    # Vite bundler configuration (React plugin, dev port 5180)
├── supabase_schema.sql               # Full PostgreSQL / Supabase cloud DDL schema & RLS
├── supabase_update.sql               # Incremental non-destructive migration script
│
├── database/                         # Persistent Local Database Storage
│   └── erp.sqlite                    # SQLite 3 Database file (WAL mode, Foreign Keys ON)
│
├── server/                           # Backend Node.js / Express Server (Port 3001)
│   ├── db.js                         # better-sqlite3 database initialization & schema DDL
│   └── index.js                      # Express application, REST endpoints, ZKTeco ADMS receiver
│
├── src/                              # Frontend React 18 Application (Port 5180)
│   ├── App.jsx                       # Master Application shell, routing & persona switching
│   ├── index.css                     # Global design tokens, typography, CSS utilities
│   ├── main.jsx                      # React DOM root bootstrapping
│   │
│   ├── components/                   # Modular UI Component Library
│   │   ├── common/                   # Shared Reusable Widgets
│   │   │   ├── ErrorBoundary.jsx     # Crash safety fallback boundary
│   │   │   └── SearchableSelect.jsx  # High-performance search dropdown with keyboard nav
│   │   ├── layout/                   # Structural Layout Components
│   │   │   ├── Header.jsx            # Top bar, search, active user badge, persona switcher
│   │   │   ├── MobileBottomNav.jsx   # Mobile bottom drawer navigation
│   │   │   └── Sidebar.jsx           # Collapsible primary navigation sidebar
│   │   ├── modals/                   # Interactive Dialogue Modals & Drawers
│   │   │   ├── CreateCareOfModal.jsx # New care-of mediator creation
│   │   │   ├── CreateCustomerModal.jsx # Customer creation with duplicate phone detection
│   │   │   ├── CreateEmployeeModal.jsx # New employee onboarding
│   │   │   ├── CreateProductModal.jsx  # Product catalog item creation
│   │   │   ├── CreateSupplierModal.jsx # Outsource vendor & raw material supplier creation
│   │   │   ├── CreateVendorModal.jsx   # Third-party vendor modal
│   │   │   ├── EditCareOfModal.jsx   # Edit care-of mediator
│   │   │   ├── EditCustomerModal.jsx # Edit customer details & additional phones
│   │   │   ├── EditSalesPersonModal.jsx # Sales person commission setup
│   │   │   ├── EditVendorModal.jsx   # Vendor terms edit modal
│   │   │   ├── EmailScheduleModal.jsx # Email automated report scheduler
│   │   │   ├── FollowUpsDrawer.jsx   # Sales follow-up notes drawer
│   │   │   ├── GlobalSearchModal.jsx # Universal fuzzy search across orders/customers
│   │   │   ├── JobCardPrintModal.jsx # Printable production job ticket (A4/thermal layout)
│   │   │   ├── JobDetailModal.jsx    # Comprehensive multi-tab order details & history modal
│   │   │   ├── MaterialSpecModal.jsx # Product material variant specifications
│   │   │   ├── SignatureModal.jsx    # Digital customer delivery proof capture canvas
│   │   │   └── TaxInvoicePrintModal.jsx # Formal GST Tax Invoice layout (CGST/SGST/IGST)
│   │   └── reports/                  # Reporting UI Components
│   │       ├── PivotReportView.jsx   # Tabular pivot matrix for financial analysis
│   │       ├── ReportCharts.jsx      # Visual bar/donut charts for revenue & stages
│   │       └── ReportFilterBar.jsx   # Filter bar (Date presets, customer, sales person, status)
│   │
│   ├── context/                      # React Context State Management
│   │   └── ERPContext.jsx            # Universal state provider, localStorage sync, API bridge
│   │
│   ├── data/                         # Static Configurations & Initial Seed Data
│   │   ├── mockData.js               # Realistic printing shop seed data (100+ entities)
│   │   └── sidebarConfig.js          # Navigation groupings, icons, and role access rules
│   │
│   ├── types/                        # Domain Constants & Type Definitions
│   │   └── index.js                  # User roles, production stages, machine statuses, units
│   │
│   ├── utils/                        # Business Logic & Utility Engines
│   │   ├── accountingEngine.js       # Double-entry ledger, journal vouchers, P&L, Balance Sheet
│   │   ├── api.js                    # REST API client wrapper communicating with port 3001
│   │   ├── reportEngine.js           # Multi-dimensional report query & calculation engine
│   │   ├── supabase.js               # Supabase JS client initializer & connectivity detector
│   │   └── whatsapp.js               # WhatsApp Click-to-Chat notification link generator
│   │
│   └── views/                        # 28 Specialized Application Screens
│       ├── AccountsView.jsx          # General Ledger, Double-Entry JVs, Balance Sheet
│       ├── CareOfManagementView.jsx  # Referral agent commission tracking
│       ├── CustomersView.jsx         # Customer directory & outstanding ledger
│       ├── DashboardView.jsx         # Executive KPI summary & pipeline cards
│       ├── DeliveryView.jsx          # Dispatch queue, transport slips, pickup tracking
│       ├── DesignersView.jsx         # Pre-press artwork queue & customer proof approvals
│       ├── EmployeeWorkReportView.jsx # Multi-task duration analysis & productivity metrics
│       ├── EmployeesView.jsx         # Staff directory, salaries, departments
│       ├── GSTInvoicingView.jsx      # GST invoicing summary & monthly tax registers
│       ├── HRManagementView.jsx      # ZKTeco K90 biometrics, attendance, OT, payroll
│       ├── InventoryView.jsx         # Raw materials stock, reorder levels, valuations
│       ├── JobOrdersView.jsx         # Job cards production queue
│       ├── LoginView.jsx             # Role authentication & persona switcher
│       ├── MachinesView.jsx          # Machinery status (Flex, UV, Eco-Solvent, CNC)
│       ├── OutsourceVendorsView.jsx  # Third-party jobs (Acrylic, Metal, Offset)
│       ├── PaymentsView.jsx          # Customer payment receipts (Cash/UPI/Bank)
│       ├── ProductionTasksView.jsx   # Multi-task assignment, pause/resume timer
│       ├── ProductionView.jsx        # Production Kanban pipeline (Design->Print->Finish->QC)
│       ├── ProductsView.jsx          # Products & material specs catalog
│       ├── PurchaseView.jsx          # Vendor purchases & material inward
│       ├── ReportsView.jsx           # 14+ Analytical business reports & exports
│       ├── SalesOrderAuditView.jsx   # Immutable order audit trails & action logs
│       ├── SalesOrdersView.jsx       # Order entry, line items, staff billing attribution
│       ├── SalesPersonsView.jsx      # Sales staff targets & commission calculations
│       ├── SettingsView.jsx          # Company profile, GSTIN, bank accounts, UPI
│       ├── UserManagementView.jsx    # User roles & module access configuration
│       ├── WastageView.jsx           # Scrap & material wastage tracking
│       └── WorkflowsView.jsx         # Production routing stages definition
│
└── ERP_AI_AUDIT_EXPORT/              # Safe AI-Readable Audit Package (Generated)
```

---

## 2. Frontend Architecture & Routing

### Routing Mechanism
The ERP implements a **declarative tab-based state router** inside [App.jsx](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/src/App.jsx) keyed by `currentTab`:
- No external `react-router-dom` dependency is required, ensuring zero hydration mismatches and rapid view switching.
- The active view is driven by the primary sidebar ([Sidebar.jsx](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/src/components/layout/Sidebar.jsx)) and the mobile navigation drawer ([MobileBottomNav.jsx](file:///e:/ERP%20STITCH/stitch_printflow_cloud_erp/src/components/layout/MobileBottomNav.jsx)).
- Deep-linking and modal inspection are triggered via context events (e.g. opening order details via `JobDetailModal.jsx`).

### Component Hierarchy
```
App.jsx (Root)
└── ERPProvider (ERPContext.jsx)
    └── ErrorBoundary
        ├── Header (Active user persona, global search, notifications)
        ├── Sidebar (Role-filtered navigation menu)
        ├── Main Content Area (Conditional render of 28 Views)
        ├── Global Modals (TaxInvoicePrintModal, JobCardPrintModal, JobDetailModal, etc.)
        └── MobileBottomNav (Mobile viewport bottom bar)
```

---

## 3. Backend Architecture & Express Endpoints

The backend is built with **Express 5.2.1** running as an ES module (`"type": "module"`).
- **Entry point**: `server/index.js`
- **Database driver**: `better-sqlite3` (synchronous, compiled C++ SQLite bindings)
- **Middleware stack**:
  - `cors()`: Cross-Origin Resource Sharing enabled for Vite dev server (`http://localhost:5180`).
  - `express.json({ limit: '50mb' })`: Handles large base64 digital signatures and image payloads.
  - `express.urlencoded({ extended: true, limit: '50mb' })`.
  - `express.text({ type: ['text/*', 'application/octet-stream'] })`: Required for raw text stream capture from ZKTeco biometric device pushes.
  - Automatic JSON parse fallback middleware for text payloads.

---

## 4. Environment Variables Specification

The system uses the following environment variables (Keys only; no secrets or tokens):

| Variable Name | Context / Purpose | Location Configured |
| :--- | :--- | :--- |
| `PORT` | HTTP port on which the Express API server listens (Defaults to `3001`). | Node environment / `.env` |
| `VITE_SUPABASE_URL` | Cloud Supabase project HTTPS endpoint for cloud database and authentication. | Client Vite build (`.env`) |
| `VITE_SUPABASE_ANON_KEY` | Public client-side anonymous publishable key for Supabase API requests. | Client Vite build (`.env`) |

*Security Confirmation: Zero passwords, JWT signing secrets, API private keys, or credentials are hardcoded or stored in source repositories.*

---

## 5. Storage, Reports & Integrations

- **Local Storage**: `database/erp.sqlite` persists all structured operational data.
- **Client Cache**: Browser `localStorage` holds session snapshots (`stitch_erp_active_user`, `stitch_erp_sales_orders`, etc.) ensuring that page refreshes never drop unsaved changes.
- **Reporting & PDF Generation**:
  - Tax Invoices and Job Cards render dedicated printable HTML/CSS layouts that trigger native browser printing / PDF generation (`window.print()`) with print-optimized CSS media queries (`@media print`).
- **External Communications**:
  - Direct WhatsApp Web/App integration via `src/utils/whatsapp.js` generating URI-encoded messages with customer order status, balance dues, and payment links.
- **Hardware Integration**:
  - Native TCP/HTTP listener implementing the ZKTeco ADMS push communication protocol for automated punch-in collection from standalone hardware terminals.
