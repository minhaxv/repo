# 09. COMPLETE BACKEND REST API & PROTOCOL DOCUMENTATION

**Server**: Node.js v24 + Express 5.2.1  
**Port**: `3001` (Configurable via `PORT`)  
**Base URL**: `http://localhost:3001`  
**Total Endpoints**: 27 Active Endpoints  
**Security Status**: Local LAN open; Token verification recommended for public hosting  

---

## 1. System & Universal Synchronization Endpoints

### `GET /api/all`
- **Purpose**: High-speed initial hydration endpoint. Returns the entire relational dataset to the React frontend in a single round-trip.
- **Auth / Role**: None required (Internal network).
- **Request Parameters / Body**: None.
- **Response Format**:
  ```json
  {
    "companyProfile": { "name": "...", "gstin": "..." },
    "customers": [ ... ],
    "products": [ ... ],
    "productMaterialSpecs": [ ... ],
    "suppliers": [ ... ],
    "salesPersons": [ ... ],
    "careOfPersons": [ ... ],
    "employees": [ ... ],
    "biometricDevices": [ ... ],
    "biometricUserMappings": [ ... ],
    "orders": [ ... ],
    "payments": [ ... ],
    "productionTasks": [ ... ],
    "workerJobIncentives": [ ... ]
  }
  ```
- **Tables Queried**: `company_profile`, `customers`, `products`, `product_specifications`, `suppliers`, `sales_persons`, `care_of_persons`, `employees`, `biometric_devices`, `biometric_user_mappings`, `sales_orders`, `sales_order_items`, `payments`, `production_tasks`, `worker_job_incentives`.

---

## 2. Customer & Product Catalog Management

### `POST /api/customers`
- **Purpose**: Creates a new customer with multi-mobile deduplication support.
- **Auth / Role**: `Admin`, `Sales`, `Manager`.
- **Request Body**:
  ```json
  {
    "id": "CUST-120",
    "name": "Reliance Retail Signage",
    "customerCode": "RRS-120",
    "mobile": "9820011999",
    "additionalMobiles": ["9820011888", "022-28490000"],
    "email": "vendor@relianceretail.com",
    "address": "Ghansoli, Navi Mumbai",
    "gstNumber": "27AAACR1234K1Z1",
    "customerType": "Corporate",
    "creditLimit": 500000,
    "outstanding": 0,
    "notes": "Payment terms 45 days"
  }
  ```
- **Response**: `200 OK` with `{ "success": true, "customer": { ... } }`.
- **Tables Affected**: `customers` (INSERT).

### `PUT /api/customers/:id`
- **Purpose**: Updates existing customer profile, addresses, phone list, or credit parameters.
- **Tables Affected**: `customers` (UPDATE).

### `POST /api/products` & `PUT /api/products/:id` & `DELETE /api/products/:id`
- **Purpose**: CRUD endpoints for product master catalog, default dimensions, HSN codes, and base selling rates.
- **Tables Affected**: `products`, `product_specifications` (Cascade delete).

---

## 3. Sales Order, Billing & Attribution Endpoints

### `POST /api/sales-orders`
- **Purpose**: Creates or updates a comprehensive sales order, saves child line items with historical product snapshots, attributes billing staff, and records initial advance payments atomically inside an SQLite transaction.
- **Auth / Role**: `Admin`, `Sales`, `Manager`.
- **Request Body**:
  ```json
  {
    "id": "SO-1015",
    "orderNumber": "SO-1015",
    "customerId": "CUST-101",
    "customerName": "Apex Retail Solutions Pvt Ltd",
    "salesPersonId": "SP-01",
    "salesPersonName": "Ramesh Sharma",
    "careOfId": "CO-01",
    "careOfName": "Rajesh Kumar (Ad Agency)",
    "orderDate": "2026-08-14",
    "deliveryDate": "2026-08-18",
    "productionStatus": "New",
    "paymentStatus": "Partial",
    "subtotal": 52000,
    "discount": 2000,
    "taxTotal": 9000,
    "grandTotal": 59000,
    "advanceAmount": 30000,
    "balanceAmount": 29000,
    "billedByStaff": "Minhaj V (Admin)",
    "billedById": "EMP-ADM-01",
    "billedByRole": "Admin",
    "billedAt": "2026-08-14 11:30:00",
    "items": [
      {
        "id": "ITEM-1015-1",
        "productId": "PROD-01",
        "productName": "Star Flex Banner 340 GSM",
        "jobCardId": "JC-1015-1",
        "width": 10,
        "height": 4,
        "qty": 2,
        "unit": "Sq.Ft",
        "sellingRate": 25,
        "amount": 2000,
        "designerRequired": "NO",
        "outsource": false,
        "productionStatus": "New"
      }
    ]
  }
  ```
- **Response**: `200 OK` with `{ "success": true, "order": { ... } }`.
- **Tables Affected**: `sales_orders` (INSERT OR REPLACE), `sales_order_items` (DELETE + BATCH INSERT), `customers` (UPDATE `outstanding`).
- **Error Handling**: Wrapped in `db.transaction()`; rolls back automatically on error.

### `PUT /api/sales-orders/:orderId/items/:itemId/production-status`
- **Purpose**: Moves an individual line item through the production stages (Designing -> Printing -> Finishing -> QC -> Ready -> Delivered).
- **Request Body**: `{ "productionStatus": "Printing", "printerName": "Afsal (Printer)" }`.
- **Tables Affected**: `sales_order_items`, `sales_orders` (re-evaluates parent order aggregate status).

### `POST /api/worker-incentives`
- **Purpose**: Posts a 0.5% profit incentive reward to an employee's ledger upon job stage completion.
- **Tables Affected**: `worker_job_incentives` (INSERT).

---

## 4. Production Tasks & Multi-Task Time Logging

### `GET /api/production-tasks`
- **Purpose**: Retrieves all worker task cards with date, status, and department filtering.
- **Tables Queried**: `production_tasks`.

### `POST /api/production-tasks`
- **Purpose**: Allocates a new production task (e.g. Sticker Cutting, Flex Eyeletting) to an employee.
- **Tables Affected**: `production_tasks` (INSERT).

### `POST /api/production-tasks/:id/action`
- **Purpose**: High-frequency stopwatch endpoint executing `START`, `PAUSE`, `RESUME`, or `COMPLETE` actions.
- **Request Body**:
  ```json
  {
    "action": "PAUSE",
    "loggedBy": "Sameer Shaikh",
    "notes": "Lunch Break",
    "elapsedSeconds": 2400
  }
  ```
- **Tables Affected**: `production_tasks` (updates status and accumulated duration), `production_task_time_logs` (appends immutable timestamp event).

---

## 5. ZKTeco K90 Hardware Biometric ADMS Protocol

These native endpoints communicate directly with physical **ZKTeco K90** standalone biometric attendance terminals over HTTP:

### `GET /iclock/cdata`
- **Purpose**: Hardware terminal handshake and parameter negotiation.
- **Query Params Sent by Device**: `SN=C4X71900123&options=all&pushver=2.4.0`.
- **Response**: Plaintext `GET OPTION FROM: C4X71900123\nStamp=9999\nOpStamp=9999\nErrorDelay=60\nDelay=30\nResStamp=0\nTransTimes=00:00;14:00\nTransInterval=1\nTransFlag=1111111111\nTimeZone=5.5\nRealtime=1\nEncrypt=0`.

### `POST /iclock/cdata`
- **Purpose**: Receives real-time attendance punch logs streamed by the ZKTeco hardware whenever an employee places their finger or RFID card on the scanner.
- **Device Body Format**: Tab-delimited text stream:
  ```
  25	2026-08-14 08:58:12	1	1	0	0	0
  27	2026-08-14 09:02:44	1	1	0	0	0
  ```
- **Processing Logic**:
  1. Parses biometric user ID (`25`) and punch timestamp.
  2. Queries `biometric_user_mappings` to match against `employees.id`.
  3. If matched, updates or inserts into `attendance` table (`check_in`, `check_out`, `working_hours`).
  4. If unmatched, logs into `unmapped_biometric_punches` for HR manual mapping.
- **Response**: `OK` (Required by ZKTeco firmware to acknowledge punch storage).

### `GET /iclock/getrequest`
- **Purpose**: Device polling loop. Hardware checks if the ERP has pending remote commands (e.g. reboot, clear admin privilege, enroll new user).
- **Response**: `OK` or formatted command string.

---

## 6. Biometric Management Endpoints

- `GET /api/biometric/device-users`: Fetches list of all hardware users mapped to ERP employees.
- `POST /api/biometric/map-user`: Manually binds a device User ID to an employee.
- `POST /api/biometric/unlink-user`: Breaks existing hardware-to-employee mapping.
- `POST /api/biometric/create-and-map-employee`: Automatically scaffolds a new employee record and maps them to a discovered biometric user in one click.
