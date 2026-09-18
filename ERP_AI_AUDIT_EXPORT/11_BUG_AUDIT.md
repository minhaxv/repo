# 11. SOFTWARE BUG, DEFECT & RISK AUDIT CATALOG

This document registers all functional, architectural, database, and UI defects identified during the read-only inspection of the ScreenArts / Printflow Cloud ERP codebase.

---

### BUG-01
- **Severity**: High (P1)
- **Module**: Inventory & Stock Valuation
- **Problem**: Production execution does not automatically decrement raw material inventory.
- **Evidence**: In `server/index.js`, the endpoint `PUT /api/sales-orders/:orderId/items/:itemId/production-status` updates item status to `'Delivered'` or `'Completed'` but contains zero SQL queries referencing the `inventory` table.
- **Possible Cause**: Inventory subsystem was developed as an independent module without a database trigger linking line item square footage to substrate stock levels.
- **Affected Workflow**: Raw Material Stock Management & Automatic Reorder Alerts.
- **Recommended Solution**:
  ```javascript
  if (newStatus === 'Delivered') {
    db.prepare(`
      UPDATE inventory 
      SET current_stock = current_stock - ? 
      WHERE name = ? OR id = ?
    `).run(item.width * item.height * item.qty, item.material, item.material_id);
  }
  ```

---

### BUG-02
- **Severity**: High (P1)
- **Module**: Multi-Client Synchronization & Real-time State
- **Problem**: Missing WebSocket or SSE (Server-Sent Events) creates stale UI state on multi-user factory workstations.
- **Evidence**: `ERPContext.jsx` queries `/api/all` only on initial page mount (`useEffect(..., [])`). If Billing Staff creates an order on PC 1, the Production Kanban screen on PC 2 in the printing hall does not receive the new order until the operator manually presses F5.
- **Possible Cause**: Client-side single-page application relies on local React state and periodic manual actions rather than a reactive push subscription.
- **Affected Workflow**: Job Dispatch from Billing to Production Floor.
- **Recommended Solution**: Implement a lightweight WebSocket (`ws`) or Server-Sent Events (SSE) channel in `server/index.js` broadcasting `ORDER_CREATED`, `STATUS_CHANGED`, and `TASK_UPDATED` events to all connected clients.

---

### BUG-03
- **Severity**: Medium (P2)
- **Module**: Security & REST API Endpoints
- **Problem**: Unauthenticated REST endpoints on internal network.
- **Evidence**: `server/index.js` uses `cors()` and JSON parsers, but lacks an authentication middleware function (e.g. `verifyToken(req, res, next)`). Any device on the factory WiFi or LAN can send HTTP POST/PUT/DELETE requests directly to SQLite.
- **Possible Cause**: Early development focused on rapid prototyping without enforcing token-based API security.
- **Affected Workflow**: All backend data persistence.
- **Recommended Solution**: Attach a standard Bearer token or HMAC signature middleware across all `/api/*` endpoints except public ZKTeco push endpoints.

---

### BUG-04
- **Severity**: Medium (P2)
- **Module**: Database Schema & Migration Inconsistencies
- **Problem**: SQLite schema table `expenses` was omitted from initial DDL in `server/db.js` although referenced in accounting logic.
- **Evidence**: In `server/db.js`, `initDatabase()` initializes 23 tables (`company_profile`, `customers`, `products`, `sales_orders`, etc.), but does not execute `CREATE TABLE IF NOT EXISTS expenses`. Expenses currently reside in memory inside `accountingEngine.js`.
- **Possible Cause**: Standalone expenses were drafted in `accountingEngine.js` as Journal Vouchers rather than an independent relational table.
- **Affected Workflow**: Expense tracking and vendor operational outflows.
- **Recommended Solution**: Execute a non-destructive schema migration:
  ```sql
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL DEFAULT 0,
    vendor_name TEXT,
    payment_method TEXT DEFAULT 'Cash',
    expense_date TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  ```

---

### BUG-05
- **Severity**: Low (P3)
- **Module**: Payroll Automation
- **Problem**: Biometric attendance records require manual trigger to generate monthly salary vouchers.
- **Evidence**: In `HRManagementView.jsx`, payroll calculation iterates over present days and overtime hours, but the "Post to Payroll Ledger" action stores data in React state and `localStorage` without a persistent SQLite `POST /api/payroll` endpoint.
- **Possible Cause**: Payroll review is treated as an HR drafting exercise before final salary checks are written.
- **Affected Workflow**: Monthly HR salary disbursement and bank transfer generation.
- **Recommended Solution**: Add an explicit Express endpoint `POST /api/payroll/commit` to persist finalized monthly salary sheets to the SQLite `payroll` table.
