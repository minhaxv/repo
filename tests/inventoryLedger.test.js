import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { consumeInventoryForItem, recordInventoryTransaction, TRANSACTION_TYPES } from '../server/inventoryEngine.js';

console.log('--- Testing Material Movement Ledger & Stock Consumption ---');

// Setup isolated test in-memory SQLite database
const db = new Database(':memory:');
db.pragma('journal_mode = WAL');

// Initialize schema matching SQLite migrations
db.exec(`
  CREATE TABLE inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    current_stock REAL DEFAULT 0,
    unit TEXT,
    min_stock_level REAL DEFAULT 10,
    rate REAL DEFAULT 0,
    version INTEGER DEFAULT 1
  );

  CREATE TABLE inventory_transactions (
    id TEXT PRIMARY KEY,
    material_id TEXT NOT NULL,
    material_name TEXT,
    quantity REAL NOT NULL,
    unit TEXT,
    transaction_type TEXT NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    planned_consumption REAL,
    actual_consumption REAL,
    wastage_qty REAL,
    wastage_reason TEXT,
    material_batch TEXT,
    employee_id TEXT,
    employee_name TEXT,
    machine_id TEXT,
    machine_name TEXT,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE material_boms (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    inventory_material_id TEXT NOT NULL,
    consumption_ratio REAL DEFAULT 1.0,
    wastage_pct REAL DEFAULT 5.0,
    consumption_unit TEXT DEFAULT 'Sq.Ft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  INSERT INTO inventory (id, name, category, current_stock, unit, rate)
  VALUES ('INV-MAT-01', 'Star Flex 280 GSM Frontlit', 'Media Roll', 1000.0, 'Sq.Ft', 6.50);

  INSERT INTO material_boms (id, product_id, inventory_material_id, consumption_ratio, wastage_pct, consumption_unit)
  VALUES ('BOM-01', 'PROD-FLEX-01', 'INV-MAT-01', 1.0, 5.0, 'Sq.Ft');
`);

// Test 1: Deduct inventory for order item with BOM mapping
{
  const orderItem = {
    id: 'ITEM-TEST-01',
    product_id: 'PROD-FLEX-01',
    product_name_snapshot: 'Frontlit Flex Banner 10x5',
    width: 10,
    height: 5,
    qty: 2, // 2 * 10 * 5 = 100 Sq.Ft + 5% buffer = 105 Sq.Ft
    unit: 'Sq.Ft'
  };

  const res = consumeInventoryForItem(db, orderItem, 'Operator Rahul');
  assert.equal(res.success, true, 'Consumption must succeed');

  const invAfter = db.prepare('SELECT current_stock FROM inventory WHERE id = ?').get('INV-MAT-01');
  assert.equal(invAfter.current_stock, 1000 - 105, 'Stock must be deducted by 105 Sq.Ft');

  const tx = db.prepare('SELECT * FROM inventory_transactions WHERE reference_id = ?').get('ITEM-TEST-01');
  assert.ok(tx, 'Transaction record must exist in append-only ledger');
  assert.equal(tx.quantity, 105, 'Transaction quantity must be 105');
  assert.equal(tx.transaction_type, TRANSACTION_TYPES.PRODUCTION_CONSUMPTION, 'Transaction type must be PRODUCTION_CONSUMPTION');
  console.log('✓ Test 1 Passed: Material Issue via BOM with buffer deduction');
}

// Test 2: Double-Deduction Prevention on Retry / Repeated Transitions
{
  const orderItem = {
    id: 'ITEM-TEST-01',
    product_id: 'PROD-FLEX-01',
    product_name_snapshot: 'Frontlit Flex Banner 10x5',
    width: 10,
    height: 5,
    qty: 2,
    unit: 'Sq.Ft'
  };

  const res2 = consumeInventoryForItem(db, orderItem, 'Operator Rahul');
  assert.equal(res2.skipped, true, 'Second call must be skipped');
  assert.equal(res2.reason, 'Item already consumed', 'Reason must state already consumed');

  const invAfter2 = db.prepare('SELECT current_stock FROM inventory WHERE id = ?').get('INV-MAT-01');
  assert.equal(invAfter2.current_stock, 1000 - 105, 'Inventory must NOT be deducted a second time');
  console.log('✓ Test 2 Passed: Double-Deduction Prevention on status transition retries');
}

// Test 3: Record Traceable Wastage Entry
{
  const resWaste = recordInventoryTransaction(db, {
    materialId: 'INV-MAT-01',
    quantity: 15.0,
    unit: 'Sq.Ft',
    transactionType: TRANSACTION_TYPES.WASTAGE,
    referenceType: 'PRODUCTION_SCRAP',
    referenceId: 'ITEM-TEST-01',
    wastageQty: 15.0,
    wastageReason: 'Media Jam and Print Head Misalignment',
    employeeName: 'Operator Suresh',
    remarks: 'Printer jam on 3.2m Roland machine'
  });

  assert.equal(resWaste.success, true, 'Wastage transaction must succeed');

  const invAfterWaste = db.prepare('SELECT current_stock FROM inventory WHERE id = ?').get('INV-MAT-01');
  assert.equal(invAfterWaste.current_stock, 1000 - 105 - 15, 'Inventory must reflect wastage deduction');

  const wasteTx = db.prepare('SELECT * FROM inventory_transactions WHERE transaction_type = ?').get('WASTAGE');
  assert.ok(wasteTx, 'Wastage transaction must be recorded in ledger');
  assert.equal(wasteTx.wastage_reason, 'Media Jam and Print Head Misalignment');
  console.log('✓ Test 3 Passed: Scrap & Material Wastage Ledger Traceability');
}

// Test 4: Outsourced Job Work with Vendor Materials Does NOT Consume Company Stock
{
  const outsourceItem = {
    id: 'ITEM-OUTSOURCE-01',
    product_name_snapshot: 'Special Acrylic Laser Cutting',
    outsource: 1,
    company_material_issued: 0, // Vendor supplies own acrylic
    qty: 10,
    unit: 'Pcs'
  };

  const resOutsource = consumeInventoryForItem(db, outsourceItem, 'Manager');
  assert.equal(resOutsource.skipped, true, 'Outsourced job with vendor material must be skipped');
  assert.equal(resOutsource.reason, 'Outsourced item using vendor materials');
  console.log('✓ Test 4 Passed: Outsourced Job with Vendor Material Does Not Deplete Company Stock');
}

db.close();
console.log('ALL INVENTORY LEDGER TESTS PASSED SUCCESSFULLY!\n');
