# 02. COMPLETE DATABASE SCHEMA AUDIT

**Primary Database**: SQLite 3 (`database/erp.sqlite`)  
**Engine**: `better-sqlite3` (WAL Mode enabled, Foreign Keys enforced)  
**Cloud Database**: Supabase PostgreSQL 15 (Optional hybrid sync configured via `supabase_schema.sql`)  
**Total Tables in Active Schema**: 24 tables  
**Total Schema Columns**: 360+ structured fields  

---

## 1. Primary Operational Tables in SQLite

### 1. `company_profile`
*Stores legal business entity details, GSTIN registration, banking, and invoice terms.*
- `id` (INTEGER, PK): Always `1` (Singleton profile pattern).
- `name` (TEXT, NOT NULL): Company trade name.
- `tagline` (TEXT): Subtitle / slogan printed on letterheads.
- `gstin` (TEXT): 15-digit Indian GST registration number.
- `state` (TEXT): State name (e.g. `Maharashtra (27)`).
- `state_code` (TEXT): 2-digit GST state code (`27`).
- `phone` (TEXT): Official company telephone.
- `email` (TEXT): Official billing email.
- `website` (TEXT): Web address.
- `address` (TEXT): Physical factory/office address.
- `bank_name` (TEXT): Primary bank name.
- `account_no` (TEXT): Commercial bank account number.
- `ifsc` (TEXT): Bank IFSC code.
- `branch` (TEXT): Bank branch location.
- `upi_id` (TEXT): Merchant UPI ID for QR code generation.
- `terms_conditions` (TEXT): Standard legal terms printed on Tax Invoices.
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP): Last profile update.

### 2. `customers`
*Customer accounts, credit controls, and contact directories.*
- `id` (TEXT, PK): Unique customer identifier (e.g., `CUST-101`).
- `customer_code` (TEXT, UNIQUE): Human-readable code (e.g., `ARC-101`).
- `name` (TEXT, NOT NULL): Individual customer or business company name.
- `mobile` (TEXT): Primary contact telephone (Indexed).
- `additional_mobiles` (TEXT): JSON array string containing alternate phone numbers.
- `email` (TEXT): Customer email address.
- `address` (TEXT): Billing and delivery site address.
- `gst_number` (TEXT): Customer GSTIN for B2B tax credits.
- `customer_type` (TEXT, DEFAULT 'Retail'): `Retail`, `Dealer`, `Corporate`, `Government`, `Walk-in`.
- `notes` (TEXT): Credit notes or special remarks.
- `outstanding` (REAL, DEFAULT 0): Current unpaid balance amount in INR.
- `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
*Indexes*: `idx_customers_mobile` ON `customers(mobile)`.

### 3. `products`
*Product catalog for standard and custom signage/print jobs.*
- `id` (TEXT, PK): Unique product ID (e.g., `PROD-01`).
- `product_code` (TEXT, UNIQUE): SKU code.
- `name` (TEXT, NOT NULL): Product title (e.g., `Star Flex Banner 340 GSM`).
- `category` (TEXT): `Flex & Banner Media`, `Vinyl & Stickers`, `Signage & Acrylic`, `Offset Printing`.
- `description` (TEXT): Technical specs.
- `unit` (TEXT, DEFAULT 'Sq.Ft'): `Sq.Ft`, `Sq.Inch`, `Sq.Meter`, `Pcs`, `Sheets`, `Rolls`, `Rft`.
- `default_rate` (REAL, DEFAULT 0): Standard selling rate per unit.
- `estimated_cost` (REAL, DEFAULT 0): Estimated raw material + labor cost.
- `gst_rate` (REAL, DEFAULT 18): GST percentage (5%, 12%, 18%, 28%).
- `hsn_code` (TEXT, DEFAULT '9989'): GST Harmonized System of Nomenclature code.
- `default_vendor` (TEXT): Preferred supplier or outsource vendor.
- `default_material` (TEXT): Standard substrate or media.
- `is_custom` (INTEGER, DEFAULT 0): Boolean flag for custom fabrication.
- `active` (INTEGER, DEFAULT 1): Active/archived status.
- `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).

### 4. `product_specifications`
*Granular material specifications and tiered rate cards per product.*
- `id` (TEXT, PK): Specification ID (e.g., `SPEC-101`).
- `product_id` (TEXT, NOT NULL): FK -> `products(id)` ON DELETE CASCADE.
- `spec_name` (TEXT, NOT NULL): Variant name (e.g., `Normal Frontlit Flex (10oz)`).
- `material_name` (TEXT): Specific raw material name.
- `selling_price` (REAL, DEFAULT 0): Selling rate per unit for this spec.
- `cost_price` (REAL, DEFAULT 0): Raw material cost per unit.
- `unit` (TEXT, DEFAULT 'Sq.Ft'): Billing unit.
- `description` (TEXT): GSM, thickness, finish details.
- `is_default` (INTEGER, DEFAULT 0): 1 if standard default variant.
- `gst_rate` (REAL, DEFAULT 18): Tax rate.
- `hsn_code` (TEXT, DEFAULT '9989').
- `status` (TEXT, DEFAULT 'Active').
- `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
*Indexes*: `idx_product_specs_pid` ON `product_specifications(product_id)`.

### 5. `suppliers`
*Outsource printing vendors, fabricators, and raw material distributors.*
- `id` (TEXT, PK): Supplier ID (e.g., `SUPP-01`).
- `supplier_code` (TEXT, UNIQUE).
- `name` (TEXT, NOT NULL): Supplier trade name.
- `category` (TEXT): `Outsource Vendor`, `Raw Material Supplier`, `Machine Service`.
- `mobile` (TEXT): Contact number.
- `email` (TEXT): Vendor email.
- `address` (TEXT): Vendor workshop address.
- `gstin` (TEXT): Vendor GSTIN for input tax credit claims.
- `pending_payment` (REAL, DEFAULT 0): Total payable outstanding.
- `avg_turnaround_days` (INTEGER, DEFAULT 2): Production SLA in days.
- `notes` (TEXT).
- `active` (INTEGER, DEFAULT 1).
- `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).

### 6. `employees`
*Company personnel, machine operators, designers, and sales representatives.*
- `id` (TEXT, PK): Employee ID (e.g., `EMP-101`).
- `code` (TEXT, UNIQUE): Staff code.
- `name` (TEXT, NOT NULL): Full staff name.
- `role` (TEXT): `Admin`, `Sales`, `Designer`, `Production`, `Accounts`, `Delivery`, `Manager`.
- `department` (TEXT): `Management`, `Sales`, `Design`, `Printing`, `Finishing`, `Accounts`.
- `mobile` (TEXT): Contact phone.
- `email` (TEXT): Work email.
- `base_salary` (REAL, DEFAULT 0): Monthly base wage.
- `incentive_rate` (REAL, DEFAULT 0): Profit/job incentive percentage.
- `commission_rate` (REAL, DEFAULT 0): Sales commission percentage.
- `joined_date` (TEXT): Date of joining (YYYY-MM-DD).
- `designation` (TEXT): Official job title.
- `status` (TEXT, DEFAULT 'Active'): `Active`, `On Leave`, `Terminated`.
- `active` (INTEGER, DEFAULT 1).

### 7. `sales_persons` & `care_of_persons`
*Commission agents and external referral mediators.*
- `sales_persons`: `id` (TEXT, PK), `name` (TEXT, NOT NULL), `mobile` (TEXT), `email` (TEXT), `commission_rate` (REAL, DEFAULT 3.5), `active` (INTEGER, DEFAULT 1).
- `care_of_persons`: `id` (TEXT, PK), `name` (TEXT, NOT NULL), `mobile` (TEXT), `email` (TEXT), `commission_rate` (REAL, DEFAULT 2.0), `active` (INTEGER, DEFAULT 1).

### 8. `sales_orders`
*Primary sales order and billing ledger.*
- `id` (TEXT, PK): Sales order unique ID (e.g., `SO-1001` or `QT-201`).
- `order_number` (TEXT, UNIQUE): Human-readable invoice/order sequence number.
- `customer_id` (TEXT): FK -> `customers(id)` ON DELETE SET NULL.
- `customer_name` (TEXT, NOT NULL): Denormalized customer name.
- `sales_person_id` (TEXT): FK -> `sales_persons(id)`.
- `sales_person_name` (TEXT).
- `care_of_id` (TEXT): FK -> `care_of_persons(id)`.
- `care_of_name` (TEXT).
- `reference_no` (TEXT): Customer purchase order / reference number.
- `order_date` (TEXT, NOT NULL): Order date (YYYY-MM-DD).
- `due_date` (TEXT): Promised dispatch / completion date.
- `production_status` (TEXT, DEFAULT 'New'): `New`, `Designing`, `Printing`, `Outsource`, `Finishing`, `Quality Check`, `Ready for Delivery`, `Delivered`, `Cancelled`.
- `payment_status` (TEXT, DEFAULT 'Pending'): `Pending`, `Partial`, `Paid`, `Credit`.
- `subtotal` (REAL, DEFAULT 0): Taxable gross amount before tax and discounts.
- `discount` (REAL, DEFAULT 0): Lump-sum discount in INR.
- `tax_total` (REAL, DEFAULT 0): Total GST amount (CGST + SGST + IGST).
- `grand_total` (REAL, DEFAULT 0): Final payable invoice total.
- `advance_amount` (REAL, DEFAULT 0): Upfront advance payment collected.
- `balance_amount` (REAL, DEFAULT 0): Outstanding receivable balance (`grand_total - advance_amount`).
- `delivered_by` (TEXT): Delivery staff or dispatch courier name.
- `billed_by_staff` (TEXT): **Staff user who generated the bill** (e.g. `Minhaj V (Admin)`).
- `billed_by_id` (TEXT): Employee ID of billing operator.
- `billed_by_role` (TEXT): Role of billing operator.
- `billed_at` (TEXT): Timestamp when bill was finalized.
- `signature_url` (TEXT): Base64 signature image captured upon delivery.
- `whatsapp_sent` (INTEGER, DEFAULT 0): 1 if invoice was sent via WhatsApp.
- `notes` (TEXT): Production instructions or remarks.
- `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
*Indexes*: `idx_orders_cust` ON `sales_orders(customer_id)`, `idx_orders_date` ON `sales_orders(order_date DESC)`.

### 9. `sales_order_items`
*Granular item lines with dimensional calculations and staff assignment.*
- `id` (TEXT, PK): Unique item ID.
- `sales_order_id` (TEXT, NOT NULL): FK -> `sales_orders(id)` ON DELETE CASCADE.
- `product_id` (TEXT): FK -> `products(id)`.
- `product_name_snapshot` (TEXT, NOT NULL): Preserves exact product name at time of order.
- `job_card_id` (TEXT): Unique job card reference (e.g. `JC-1001-1`).
- `custom_title` (TEXT): Custom work title entered by billing staff.
- `spec_id` (TEXT): FK -> `product_specifications(id)`.
- `spec_name` (TEXT): Specification name snapshot.
- `material` (TEXT): Substrate/material snapshot.
- `description` (TEXT): Work notes.
- `width` (REAL, DEFAULT 0): Width in inches or feet.
- `height` (REAL, DEFAULT 0): Height in inches or feet.
- `qty` (REAL, DEFAULT 1): Quantity of units.
- `unit` (TEXT, DEFAULT 'Sq.Ft'): Calculation unit.
- `selling_rate` (REAL, DEFAULT 0): Rate charged to client.
- `estimated_cost` (REAL, DEFAULT 0): Budgeted material + labor cost.
- `actual_cost` (REAL, DEFAULT 0): Recorded production cost.
- `discount` (REAL, DEFAULT 0): Item-level discount.
- `tax_type` (TEXT, DEFAULT 'GST_18'): Tax classification.
- `gst_rate` (REAL, DEFAULT 18): GST percentage.
- `hsn_code` (TEXT, DEFAULT '9989').
- `amount` (REAL, DEFAULT 0): Line item net total.
- `designer_required` (TEXT, DEFAULT 'NO'): `YES` or `NO`.
- `designer_id` (TEXT): Assigned designer staff ID.
- `designer_name` (TEXT): Assigned designer name.
- `design_status` (TEXT, DEFAULT 'Pending'): `Pending`, `In Progress`, `Proof Sent`, `Approved`.
- `artwork_status` (TEXT, DEFAULT 'Pending'): `Pending`, `Received`, `Approved`, `Rejected`.
- `artwork_url` (TEXT): URL or path to high-res printing artwork.
- `outsource` (INTEGER, DEFAULT 0): 1 if outsourced to external vendor.
- `vendor_id` (TEXT): Outsource vendor ID.
- `vendor_name` (TEXT): Outsource vendor name.
- `estimated_vendor_cost` (REAL, DEFAULT 0): Estimated vendor quote.
- `actual_vendor_bill` (REAL, DEFAULT 0): Final vendor billed amount.
- `vendor_bill_date` (TEXT): Date vendor bill was received.
- `vendor_payment_status` (TEXT, DEFAULT 'Pending'): `Pending`, `Paid`.
- `printer_id` (TEXT): Assigned printer machine operator ID.
- `printer_name` (TEXT): Machine operator name.
- `finisher_id` (TEXT): Assigned finishing worker ID.
- `finisher_name` (TEXT): Finishing worker name.
- `delivery_worker_id` (TEXT): Assigned delivery dispatch staff.
- `production_status` (TEXT, DEFAULT 'New'): Current status of this item.
- `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
*Indexes*: `idx_order_items_order_id` ON `sales_order_items(sales_order_id)`.

### 10. `production_tasks`
*Granular multi-task allocation and time logging per employee.*
- `id` (TEXT, PK): Task ID (e.g. `TASK-001`).
- `task_date` (TEXT, NOT NULL): Work date.
- `employee_id` (TEXT, NOT NULL): FK -> `employees(id)` ON DELETE CASCADE.
- `employee_name` (TEXT, NOT NULL): Assigned worker.
- `order_id` (TEXT, NOT NULL): FK -> `sales_orders(id)`.
- `order_number` (TEXT, NOT NULL).
- `customer_name` (TEXT).
- `item_id` (TEXT): FK -> `sales_order_items(id)`.
- `item_title` (TEXT).
- `process_id` (TEXT): FK -> `production_processes(id)`.
- `process_name` (TEXT, NOT NULL): e.g. `Sticker Cutting`, `Flex Eyeletting`, `Lamination`.
- `quantity` (REAL, DEFAULT 1): Target quantity.
- `unit` (TEXT, DEFAULT 'Nos').
- `start_time` (TEXT): Actual start timestamp.
- `end_time` (TEXT): Actual completion timestamp.
- `total_duration_minutes` (INTEGER, DEFAULT 0): Total elapsed working minutes.
- `status` (TEXT, DEFAULT 'Pending'): `Pending`, `In Progress`, `Paused`, `Completed`, `Cancelled`.
- `priority` (TEXT, DEFAULT 'Normal'): `Urgent`, `High`, `Normal`, `Low`.
- `remarks` (TEXT): Operator notes.
- `machine_id` (TEXT): Machine allocated.
- `machine_name` (TEXT): Machine model name.
- `department` (TEXT, DEFAULT 'Production').
- `production_location` (TEXT): Workshop floor / Bay.
- `original_qty` (REAL, DEFAULT 1).
- `completed_qty` (REAL, DEFAULT 0).
- `rejected_qty` (REAL, DEFAULT 0).
- `rework_qty` (REAL, DEFAULT 0).
- `final_qty` (REAL, DEFAULT 0).
- `attachment_url` (TEXT): Photograph of completed work or inspection proof.
- `supervisor` (TEXT): Shift supervisor name.
- `qc_status` (TEXT, DEFAULT 'Pending'): `Pending`, `Passed`, `Failed`, `Rework Required`.
- `created_by` (TEXT): User who dispatched the task.
- `created_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
- `completed_by` (TEXT): Staff who marked work complete.
- `completed_at` (TEXT).
- `updated_at` (TEXT, DEFAULT CURRENT_TIMESTAMP).
*Indexes*: `idx_tasks_emp` ON `production_tasks(employee_id)`, `idx_tasks_order` ON `production_tasks(order_id)`, `idx_tasks_date` ON `production_tasks(task_date DESC)`, `idx_tasks_status` ON `production_tasks(status)`.

### 11. `production_task_time_logs`
*Sub-task audit trail capturing every pause, resume, and completion interval.*
- `id` (TEXT, PK): Log ID.
- `task_id` (TEXT, NOT NULL): FK -> `production_tasks(id)` ON DELETE CASCADE.
- `action` (TEXT, NOT NULL): `START`, `PAUSE`, `RESUME`, `COMPLETE`.
- `timestamp` (TEXT, NOT NULL): ISO datetime.
- `logged_by` (TEXT): User executing action.
- `notes` (TEXT): Reason for pause (e.g. `Lunch Break`, `Material Depleted`, `Machine Jam`).
- `elapsed_seconds` (INTEGER, DEFAULT 0): Duration of previous segment.
*Indexes*: `idx_task_time_logs` ON `production_task_time_logs(task_id)`.

### 12. `biometric_devices` & `biometric_user_mappings`
*Native integration with physical ZKTeco K90 hardware terminals.*
- `biometric_devices`: `id` (TEXT, PK), `name` (TEXT, NOT NULL), `model` (TEXT, DEFAULT 'ZKTeco K90'), `ip_address` (TEXT), `port` (INTEGER, DEFAULT 4370), `location` (TEXT), `status` (TEXT, DEFAULT 'Online'), `last_sync_time` (TEXT), `total_users` (INTEGER, DEFAULT 0).
- `biometric_user_mappings`: `id` (TEXT, PK), `device_id` (TEXT, NOT NULL), `biometric_user_id` (TEXT, NOT NULL), `biometric_name` (TEXT), `card_no` (TEXT), `verification_type` (TEXT), `privilege` (TEXT), `device_status` (TEXT), `employee_id` (TEXT, FK -> `employees(id)`), `mapping_status` (TEXT, `Matched` / `Unmapped`), `matched_by` (TEXT), `created_at`, `updated_at`.
*Indexes*: UNIQUE `idx_biometric_device_user` ON `biometric_user_mappings(device_id, biometric_user_id)`.

### 13. Additional Auxiliary Tables
- `payments`: `id` (PK), `order_id`, `customer_id`, `customer_name`, `amount`, `method`, `ref_no`, `status`, `paid_date`, `notes`.
- `job_work`: `id` (PK), `job_number` (UNIQUE), `sales_order_id`, `sales_order_item_id`, `job_type`, `description`, `quantity`, `status`, `assigned_to`, `start_date`, `expected_date`, `completed_date`, `notes`.
- `outsource_jobs`: `id` (PK), `outsource_number` (UNIQUE), `sales_order_id`, `sales_order_item_id`, `supplier_id`, `supplier_name`, `work_description`, `quantity`, `outsource_cost`, `expected_date`, `sent_date`, `received_date`, `status`, `notes`.
- `worker_job_incentives`: `id` (PK), `order_id`, `item_id`, `job_card_id`, `product_name`, `worker_id`, `worker_name`, `role_stage`, `job_amount`, `job_profit`, `incentive_pct` (0.5%), `incentive_amount`, `completed_at`.
- `inventory`: `id` (PK), `name`, `category`, `current_stock`, `unit`, `reorder_level`, `unit_cost`.
- `purchase_orders`: `id` (PK), `vendor_name`, `order_date`, `status`, `total_amount`, `items` (JSON).
- `production_processes`: `id` (PK), `code` (UNIQUE), `name`, `category`, `description`, `default_unit`, `is_active`, `sort_order`.
- `attendance`: `id` (PK), `date`, `staff_id`, `staff_name`, `type`, `status`, `ot_hours`, `check_in`, `check_out`, `working_hours`, `late_status`, `notes`.
- `payroll`: `id` (PK), `month`, `staff_id`, `staff_name`, `role`, `base_salary`, `working_days`, `days_present`, `earned_base_pay`, `ot_hours`, `ot_pay`, `incentive_earned`, `advance_deduction`, `late_deduction`, `net_salary`, `status`, `paid_date`, `payment_mode`.
