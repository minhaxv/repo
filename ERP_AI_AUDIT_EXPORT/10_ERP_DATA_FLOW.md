# 10. ERP SYSTEM DATA FLOW & TRANSACTION LIFECYCLES

## 1. Commercial Sales & Financial Pipeline Flow

```mermaid
sequenceDiagram
    autonumber
    actor C as Customer
    actor S as Billing Staff (Sales)
    participant UI as React ERP (SalesOrdersView)
    participant Ctx as ERPContext (React State & LocalStorage)
    participant Svr as Express Server (server/index.js)
    participant DB as SQLite DB (erp.sqlite)
    participant ACC as Accounting Engine

    C->>S: Inquires for 2x Star Flex Banners & 1000 Business Cards
    S->>UI: Selects Customer "Apex Retailers" & enters dimensions (10x4 ft)
    UI->>UI: Dynamic calculation: Area (40 Sq.Ft) * ₹25 = ₹1,000 + 18% GST = ₹1,180
    S->>UI: Enters ₹500 Advance received via UPI
    S->>UI: Clicks "Finalize Sales Order"
    UI->>Ctx: Injects active user as `billed_by_staff`, `billed_by_id`, `billed_at`
    Ctx->>Svr: POST /api/sales-orders (Atomic Transaction)
    Svr->>DB: INSERT INTO sales_orders & sales_order_items
    Svr->>DB: INSERT INTO payments (Advance ₹500)
    Svr->>DB: UPDATE customers SET outstanding = outstanding + ₹680
    DB-->>Svr: Transaction Committed
    Svr-->>Ctx: 200 OK (Returns saved order)
    Ctx->>ACC: Auto-post Journal Voucher (Debit AR ₹1180, Credit Sales ₹1000, Credit GST ₹180)
    Ctx->>ACC: Auto-post Payment Voucher (Debit Bank ₹500, Credit AR ₹500)
    UI-->>S: Renders Tax Invoice (INV-SO-1015) & Job Cards (JC-1015-1)
```

---

## 2. Production Execution & Stage Routing Flow

```mermaid
sequenceDiagram
    autonumber
    actor D as Graphic Designer
    actor P as Printer Operator
    actor F as Finishing Fabricator
    actor QC as QC Supervisor
    actor DL as Delivery Executive
    participant ERP as ERP System

    ERP->>D: Item queued with `designer_required = YES`
    D->>ERP: Uploads artwork proof & marks `design_status = Approved`
    ERP->>P: Moves item to `Printing Queue` on Handtop UV Flatbed
    P->>ERP: Clicks "Start Print Task" (Records machine, media batch & start_time)
    P->>ERP: Clicks "Complete Print" (Logs 45 minutes duration)
    ERP->>F: Moves item to `Finishing Station`
    F->>ERP: Claims "Banner Hemming & Eyeletting" task
    F->>ERP: Logs 40 metal eyelets punched & marks complete
    ERP->>QC: Notifies "Job Card Ready for Inspection"
    QC->>ERP: Inspects print alignment, color proof & eyelet tension
    QC->>ERP: Marks `qc_status = Passed` & attaches inspection photo
    ERP->>DL: Queues in `Delivery Dispatch Queue`
    DL->>ERP: Captures customer delivery signature on canvas & marks `Delivered`
```

---

## 3. Inventory & Procurement Flow: Theory vs Actual Reality

### Ideal Standard ERP Flow
$$\text{Purchase Order} \longrightarrow \text{Goods Receipt Note (GRN)} \longrightarrow \text{Stock Inward} \longrightarrow \text{Job Consumption} \longrightarrow \text{Stock Outward} \longrightarrow \text{Remaining Balance}$$

### Actual Current Implementation in Printflow ERP
1. **Raw Material Inward**:
   - Stock entries are created in `inventory` table with `current_stock` and `reorder_level`.
   - Purchase Orders can be drafted in `PurchaseView.jsx` and saved in `purchase_orders.items`.
2. **Production Stage Execution**:
   - Machine operators and finishing staff log tasks in `production_tasks`.
   - The square footage printed (`width * height * qty`) is captured in `sales_order_items`.
3. **The Current Architectural Gap**:
   > [!IMPORTANT]
   > **Stock Consumption is NOT currently auto-deducted in SQLite upon order completion.**
   > In the current version, when 500 Sq.Ft of Star Flex is printed and delivered, the `inventory.current_stock` for Star Flex remains unchanged unless the storekeeper manually navigates to `InventoryView.jsx` and clicks "Adjust Stock".
   > **Recommended Trigger**: Add an SQLite post-update trigger or Express handler on `/api/sales-orders/:orderId/items/:itemId/production-status` that executes:
   > ```sql
   > UPDATE inventory 
   > SET current_stock = current_stock - (item.width * item.height * item.qty) 
   > WHERE name = item.material;
   > ```
