import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

console.log('--- Testing Concurrency Control & SQLite Online Backup Restoration ---');

// 1. Setup isolated master database
const masterDb = new Database(':memory:');
masterDb.pragma('journal_mode = WAL');

masterDb.exec(`
  CREATE TABLE sales_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE,
    customer_name TEXT,
    grand_total REAL,
    version INTEGER DEFAULT 1
  );

  INSERT INTO sales_orders (id, order_number, customer_name, grand_total, version)
  VALUES ('SO-CONC-01', 'SO-2026-CONC-01', 'Sunil Signboards', 5000, 1);
`);

// Test 1: Optimistic Concurrency Control (Version Match Update)
{
  const clientAOrder = masterDb.prepare('SELECT * FROM sales_orders WHERE id = ?').get('SO-CONC-01');
  assert.equal(clientAOrder.version, 1, 'Initial version must be 1');

  // Workstation A successfully updates order
  const updateResult = masterDb.prepare(`
    UPDATE sales_orders
    SET grand_total = ?, version = version + 1
    WHERE id = ? AND version = ?
  `).run(5500, 'SO-CONC-01', clientAOrder.version);

  assert.equal(updateResult.changes, 1, 'Update with matching version must affect 1 row');

  const updatedOrder = masterDb.prepare('SELECT * FROM sales_orders WHERE id = ?').get('SO-CONC-01');
  assert.equal(updatedOrder.version, 2, 'Version must increment to 2');
  assert.equal(updatedOrder.grand_total, 5500, 'Grand total must update to 5500');
  console.log('✓ Test 1 Passed: Matching version update succeeds with version increment');
}

// Test 2: Conflict Detection on Stale Concurrent Update (Optimistic Locking)
{
  // Stale Workstation B attempts to update with old version 1 (which was already overwritten by Workstation A)
  const staleVersion = 1;
  const staleResult = masterDb.prepare(`
    UPDATE sales_orders
    SET grand_total = ?, version = version + 1
    WHERE id = ? AND version = ?
  `).run(6000, 'SO-CONC-01', staleVersion);

  assert.equal(staleResult.changes, 0, 'Stale update must affect 0 rows (Conflict)');
  
  // Verify data was NOT overwritten
  const currentOrder = masterDb.prepare('SELECT * FROM sales_orders WHERE id = ?').get('SO-CONC-01');
  assert.equal(currentOrder.version, 2, 'Version must remain 2');
  assert.equal(currentOrder.grand_total, 5500, 'Grand total must NOT be overwritten by stale client');
  console.log('✓ Test 2 Passed: Stale workstation update prevented via Optimistic Locking (409 Conflict)');
}

// Test 3: SQLite Online Backup API & Integrity Check
{
  const backupPath = path.resolve('database', 'backups', `test_backup_${Date.now()}.sqlite`);
  
  // Ensure directory exists
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });

  // Execute online backup
  masterDb.backup(backupPath)
    .then(() => {
      assert.ok(fs.existsSync(backupPath), 'Backup file must exist on disk');

      // Open backup database independently
      const backupDb = new Database(backupPath, { readonly: true });
      
      // Perform physical PRAGMA integrity_check
      const integrity = backupDb.pragma('integrity_check');
      assert.equal(integrity[0].integrity_check, 'ok', 'Backup PRAGMA integrity_check must return ok');

      // Verify records in restored copy
      const restoredOrder = backupDb.prepare('SELECT * FROM sales_orders WHERE id = ?').get('SO-CONC-01');
      assert.ok(restoredOrder, 'Restored order must exist');
      assert.equal(restoredOrder.grand_total, 5500, 'Restored grand total must match master');
      assert.equal(restoredOrder.version, 2, 'Restored version must match master');

      backupDb.close();
      // Clean up test file
      fs.unlinkSync(backupPath);
      masterDb.close();

      console.log('✓ Test 3 Passed: Online Backup API with PRAGMA integrity_check verification');
      console.log('ALL CONCURRENCY & BACKUP TESTS PASSED SUCCESSFULLY!\n');
    })
    .catch(err => {
      console.error('Backup test failed:', err);
      process.exit(1);
    });
}
