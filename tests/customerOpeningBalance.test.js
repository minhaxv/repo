import assert from 'node:assert/strict';
import express from 'express';
import cors from 'cors';
import db, { generateNextSequence, postDoubleEntryJournal } from '../server/db.js';

console.log('===========================================================');
console.log('  TEST SUITE: Customer Opening Balance & Accounting Ledger');
console.log('===========================================================\n');

// Helper for HTTP endpoints
const app = express();
app.use(cors());
app.use(express.json());

// Register Customer endpoints
app.post('/api/customers', (req, res) => {
  try {
    const c = req.body;
    const id = c.id || `CUST-${Date.now()}`;
    const addMobiles = Array.isArray(c.additionalMobiles) ? JSON.stringify(c.additionalMobiles) : '[]';
    
    const openingBalance = Math.max(0, Number(c.openingBalance || c.opening_balance || 0));
    const openingBalanceType = c.openingBalanceType || c.opening_balance_type || 'Receivable';
    const openingBalanceDate = c.openingBalanceDate || c.opening_balance_date || new Date().toISOString().split('T')[0];
    const openingBalanceNotes = c.openingBalanceNotes || c.opening_balance_notes || c.openingBalanceRef || '';

    let initialOutstanding = Number(c.outstandingAmount !== undefined ? c.outstandingAmount : (c.outstanding !== undefined ? c.outstanding : 0));
    if (openingBalance > 0 && initialOutstanding === 0) {
      initialOutstanding = openingBalanceType === 'Receivable' ? openingBalance : -openingBalance;
    }

    db.prepare(`
      INSERT INTO customers (
        id, customer_code, name, mobile, additional_mobiles, email, address, gst_number, customer_type, notes,
        outstanding, opening_balance, opening_balance_type, opening_balance_date, opening_balance_notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, c.code || id, c.name, c.mobile || '', addMobiles, c.email || '', c.address || '',
      c.gstin || c.gstNumber || '', c.customerType || c.type || 'Retail', c.notes || '',
      initialOutstanding, openingBalance, openingBalanceType, openingBalanceDate, openingBalanceNotes
    );

    if (openingBalance > 0) {
      const existingJv = db.prepare("SELECT id FROM journal_vouchers WHERE reference_type = 'CUSTOMER_OPENING_BALANCE' AND reference_id = ?").get(id);
      if (!existingJv) {
        const custDisplayName = c.name || 'Customer';
        const isReceivable = openingBalanceType === 'Receivable';
        const entries = isReceivable
          ? [
              { accountName: `Accounts Receivable (${custDisplayName})`, accountGroup: 'Assets', entryType: 'DEBIT', amount: openingBalance, customerId: id, notes: openingBalanceNotes || 'Customer Opening Balance' },
              { accountName: 'Opening Balance Equity', accountGroup: 'Capital & Equity', entryType: 'CREDIT', amount: openingBalance, customerId: id, notes: 'Opening Balance Offset Equity' }
            ]
          : [
              { accountName: 'Opening Balance Equity', accountGroup: 'Capital & Equity', entryType: 'DEBIT', amount: openingBalance, customerId: id, notes: 'Opening Balance Offset Equity' },
              { accountName: `Accounts Payable (${custDisplayName})`, accountGroup: 'Liabilities', entryType: 'CREDIT', amount: openingBalance, customerId: id, notes: openingBalanceNotes || 'Customer Opening Credit' }
            ];

        postDoubleEntryJournal(db, {
          voucherType: 'Opening Balance',
          date: openingBalanceDate,
          refNo: openingBalanceNotes || `OB-${c.code || id}`,
          referenceType: 'CUSTOMER_OPENING_BALANCE',
          referenceId: id,
          narration: openingBalanceNotes || `Opening balance for customer ${custDisplayName} (${openingBalanceType})`,
          createdByName: 'System / User',
          entries
        });
      }
    }

    res.json({ success: true, customerId: id, outstanding: initialOutstanding });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { id } = req.params;
    const c = req.body;
    const addMobiles = Array.isArray(c.additionalMobiles) ? JSON.stringify(c.additionalMobiles) : undefined;

    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }

    const hasNewOpeningBalance = c.openingBalance !== undefined || c.opening_balance !== undefined;
    const openingBalance = hasNewOpeningBalance ? Math.max(0, Number(c.openingBalance !== undefined ? c.openingBalance : c.opening_balance)) : Number(existing.opening_balance || 0);
    const openingBalanceType = (c.openingBalanceType || c.opening_balance_type || existing.opening_balance_type || 'Receivable');
    const openingBalanceDate = (c.openingBalanceDate || c.opening_balance_date || existing.opening_balance_date || new Date().toISOString().split('T')[0]);
    const openingBalanceNotes = (c.openingBalanceNotes !== undefined ? c.openingBalanceNotes : (c.opening_balance_notes !== undefined ? c.opening_balance_notes : (existing.opening_balance_notes || '')));

    if (hasNewOpeningBalance) {
      const existingJvs = db.prepare("SELECT id FROM journal_vouchers WHERE reference_type = 'CUSTOMER_OPENING_BALANCE' AND reference_id = ?").all(id);
      for (const jv of existingJvs) {
        db.prepare("DELETE FROM journal_entries WHERE voucher_id = ?").run(jv.id);
        db.prepare("DELETE FROM journal_vouchers WHERE id = ?").run(jv.id);
      }

      if (openingBalance > 0) {
        const custDisplayName = c.name || existing.name || 'Customer';
        const isReceivable = openingBalanceType === 'Receivable';
        const entries = isReceivable
          ? [
              { accountName: `Accounts Receivable (${custDisplayName})`, accountGroup: 'Assets', entryType: 'DEBIT', amount: openingBalance, customerId: id, notes: openingBalanceNotes || 'Customer Opening Balance' },
              { accountName: 'Opening Balance Equity', accountGroup: 'Capital & Equity', entryType: 'CREDIT', amount: openingBalance, customerId: id, notes: 'Opening Balance Offset Equity' }
            ]
          : [
              { accountName: 'Opening Balance Equity', accountGroup: 'Capital & Equity', entryType: 'DEBIT', amount: openingBalance, customerId: id, notes: 'Opening Balance Offset Equity' },
              { accountName: `Accounts Payable (${custDisplayName})`, accountGroup: 'Liabilities', entryType: 'CREDIT', amount: openingBalance, customerId: id, notes: openingBalanceNotes || 'Customer Opening Credit' }
            ];

        postDoubleEntryJournal(db, {
          voucherType: 'Opening Balance',
          date: openingBalanceDate,
          refNo: openingBalanceNotes || `OB-${existing.customer_code || id}`,
          referenceType: 'CUSTOMER_OPENING_BALANCE',
          referenceId: id,
          narration: openingBalanceNotes || `Opening balance for customer ${custDisplayName} (${openingBalanceType})`,
          createdByName: 'System / User',
          entries
        });
      }

      const orders = db.prepare("SELECT grand_total, balance_amount FROM sales_orders WHERE customer_id = ? AND production_status != 'Quotation'").all(id);
      const totalInvoiced = orders.reduce((sum, o) => sum + Number(o.grand_total || 0), 0);
      const payments = db.prepare("SELECT amount FROM payments WHERE customer_id = ?").all(id);
      const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const signedOpening = openingBalanceType === 'Payable' ? -openingBalance : openingBalance;
      const recalculatedOutstanding = Number((signedOpening + totalInvoiced - totalPayments).toFixed(2));

      db.prepare(`
        UPDATE customers SET
          name = COALESCE(?, name),
          mobile = COALESCE(?, mobile),
          additional_mobiles = COALESCE(?, additional_mobiles),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          gst_number = COALESCE(?, gst_number),
          customer_type = COALESCE(?, customer_type),
          notes = COALESCE(?, notes),
          opening_balance = ?,
          opening_balance_type = ?,
          opening_balance_date = ?,
          opening_balance_notes = ?,
          outstanding = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        c.name, c.mobile, addMobiles, c.email, c.address, c.gstin || c.gstNumber, c.type || c.customerType, c.notes,
        openingBalance, openingBalanceType, openingBalanceDate, openingBalanceNotes, recalculatedOutstanding, id
      );

      return res.json({ success: true, outstanding: recalculatedOutstanding, openingBalance });
    }

    db.prepare(`
      UPDATE customers SET
        name = COALESCE(?, name),
        mobile = COALESCE(?, mobile),
        additional_mobiles = COALESCE(?, additional_mobiles),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        gst_number = COALESCE(?, gst_number),
        customer_type = COALESCE(?, customer_type),
        notes = COALESCE(?, notes),
        outstanding = COALESCE(?, outstanding),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      c.name, c.mobile, addMobiles, c.email, c.address, c.gstin || c.gstNumber, c.type || c.customerType, c.notes,
      c.outstandingAmount !== undefined ? Number(c.outstandingAmount) : (c.outstanding !== undefined ? Number(c.outstanding) : null), id
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const server = app.listen(3098);

async function runTests() {
  try {
    const BASE = 'http://localhost:3098';

    // Cleanup previous test runs
    db.prepare("DELETE FROM customers WHERE id LIKE 'CUST-TEST-%' OR id = 'CUST-ABC-TRADERS' OR id = 'CUST-CREDIT-ADV'").run();
    db.prepare("DELETE FROM sales_orders WHERE id = 'SO-101'").run();
    db.prepare("DELETE FROM payments WHERE id = 'PAY-201'").run();
    db.prepare("DELETE FROM journal_entries WHERE customer_id IN ('CUST-TEST-1', 'CUST-ABC-TRADERS', 'CUST-CREDIT-ADV')").run();
    db.prepare("DELETE FROM journal_vouchers WHERE reference_id IN ('CUST-TEST-1', 'CUST-ABC-TRADERS', 'CUST-CREDIT-ADV')").run();

    // TEST 1: Create customer without opening balance
    console.log('--- Test 1: Create customer without opening balance ---');
    const res1 = await fetch(`${BASE}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'CUST-TEST-1',
        name: 'Standard Client',
        mobile: '9876543210'
      })
    });
    const data1 = await res1.json();
    assert.equal(data1.success, true);
    assert.equal(data1.outstanding, 0);

    const cust1 = db.prepare('SELECT * FROM customers WHERE id = ?').get('CUST-TEST-1');
    assert.equal(cust1.opening_balance, 0);
    assert.equal(cust1.outstanding, 0);
    const jvs1 = db.prepare("SELECT * FROM journal_vouchers WHERE reference_type = 'CUSTOMER_OPENING_BALANCE' AND reference_id = ?").all('CUST-TEST-1');
    assert.equal(jvs1.length, 0);
    console.log('✓ Test 1 Passed: Customer created with 0 opening balance and no journal voucher');

    // TEST 2: Create customer with Opening Balance (ABC Traders Example from prompt)
    console.log('\n--- Test 2: Create customer with Opening Balance (ABC Traders - ₹25,000 Receivable) ---');
    const res2 = await fetch(`${BASE}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'CUST-ABC-TRADERS',
        name: 'ABC Traders',
        mobile: '9123456780',
        openingBalance: 25000,
        openingBalanceType: 'Receivable',
        openingBalanceDate: '2026-04-01',
        openingBalanceNotes: 'Old balance migration'
      })
    });
    const data2 = await res2.json();
    assert.equal(data2.success, true);
    assert.equal(data2.outstanding, 25000, 'Initial outstanding must automatically equal ₹25,000');

    const cust2 = db.prepare('SELECT * FROM customers WHERE id = ?').get('CUST-ABC-TRADERS');
    assert.equal(cust2.opening_balance, 25000);
    assert.equal(cust2.opening_balance_type, 'Receivable');
    assert.equal(cust2.outstanding, 25000);

    // Verify double-entry ledger entry
    const jv2 = db.prepare("SELECT * FROM journal_vouchers WHERE reference_type = 'CUSTOMER_OPENING_BALANCE' AND reference_id = ?").get('CUST-ABC-TRADERS');
    assert.ok(jv2, 'Opening Balance Journal Voucher must exist');
    assert.equal(jv2.voucher_type, 'Opening Balance');
    assert.equal(jv2.voucher_date, '2026-04-01');

    const entries2 = db.prepare('SELECT * FROM journal_entries WHERE voucher_id = ?').all(jv2.id);
    assert.equal(entries2.length, 2, 'Must have 2 balanced double-entry rows');

    const debitEntry = entries2.find(e => e.entry_type === 'DEBIT');
    const creditEntry = entries2.find(e => e.entry_type === 'CREDIT');
    assert.equal(debitEntry.account_name, 'Accounts Receivable (ABC Traders)');
    assert.equal(debitEntry.amount, 25000);
    assert.equal(creditEntry.account_name, 'Opening Balance Equity');
    assert.equal(creditEntry.amount, 25000);
    console.log('✓ Test 2 Passed: ABC Traders created with ₹25,000 outstanding and balanced double-entry journal');

    // TEST 3: Subsequent Transactions (Invoice ₹10,000, Payment ₹5,000)
    console.log('\n--- Test 3: Subsequent Transactions (Invoice of ₹10,000, Payment of ₹5,000) ---');
    // Simulate Sales Order / Invoice creation
    db.prepare(`
      INSERT INTO sales_orders (id, order_number, customer_id, customer_name, order_date, grand_total, balance_amount, order_type, production_status)
      VALUES (?, ?, ?, ?, '2026-04-02', ?, ?, 'Direct', 'In Production')
    `).run('SO-101', 'SO-101', 'CUST-ABC-TRADERS', 'ABC Traders', 10000, 10000);
    db.prepare('UPDATE customers SET outstanding = outstanding + 10000 WHERE id = ?').run('CUST-ABC-TRADERS');

    let afterInvoiceCust = db.prepare('SELECT outstanding FROM customers WHERE id = ?').get('CUST-ABC-TRADERS');
    assert.equal(afterInvoiceCust.outstanding, 35000, 'Outstanding must be ₹35,000 after ₹10,000 invoice');
    console.log(`✓ After ₹10,000 invoice: Outstanding = ₹${afterInvoiceCust.outstanding} (Expected: ₹35,000)`);

    // Simulate Payment Received
    db.prepare(`
      INSERT INTO payments (id, customer_id, customer_name, order_id, amount, paid_date, method)
      VALUES (?, ?, ?, ?, ?, '2026-04-05', 'UPI')
    `).run('PAY-201', 'CUST-ABC-TRADERS', 'ABC Traders', 'SO-101', 5000);
    db.prepare('UPDATE customers SET outstanding = outstanding - 5000 WHERE id = ?').run('CUST-ABC-TRADERS');

    let afterPaymentCust = db.prepare('SELECT outstanding FROM customers WHERE id = ?').get('CUST-ABC-TRADERS');
    assert.equal(afterPaymentCust.outstanding, 30000, 'Outstanding must be ₹30,000 after ₹5,000 payment');
    console.log(`✓ After ₹5,000 payment: Outstanding = ₹${afterPaymentCust.outstanding} (Expected: ₹30,000)`);

    // TEST 4: Editing Opening Balance & Preventing Duplicates
    console.log('\n--- Test 4: Editing Opening Balance (Adjust from ₹25,000 to ₹20,000) ---');
    const resEdit = await fetch(`${BASE}/api/customers/CUST-ABC-TRADERS`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openingBalance: 20000,
        openingBalanceType: 'Receivable',
        openingBalanceDate: '2026-04-01',
        openingBalanceNotes: 'Corrected opening balance'
      })
    });
    const editData = await resEdit.json();
    assert.equal(editData.success, true);
    assert.equal(editData.outstanding, 25000, 'Recalculated outstanding must be: 20,000 (new OB) + 10,000 (invoice) - 5,000 (payment) = ₹25,000');

    // Verify duplicate prevention: exactly 1 Opening Balance JV must exist
    const jvsAfterEdit = db.prepare("SELECT * FROM journal_vouchers WHERE reference_type = 'CUSTOMER_OPENING_BALANCE' AND reference_id = ?").all('CUST-ABC-TRADERS');
    assert.equal(jvsAfterEdit.length, 1, 'Duplicate opening balance journal vouchers strictly prevented');

    const updatedEntries = db.prepare('SELECT * FROM journal_entries WHERE voucher_id = ?').all(jvsAfterEdit[0].id);
    const updatedDebit = updatedEntries.find(e => e.entry_type === 'DEBIT');
    assert.equal(updatedDebit.amount, 20000, 'Updated ledger debit must reflect ₹20,000');
    console.log('✓ Test 4 Passed: Opening balance edited to ₹20,000, outstanding recalculated to ₹25,000, duplicates prevented');

    // TEST 5: Payable Opening Balance (Advance credit)
    console.log('\n--- Test 5: Customer with Payable Opening Balance (Credit ₹5,000) ---');
    const resPayable = await fetch(`${BASE}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'CUST-CREDIT-ADV',
        name: 'Advance Credit Corp',
        mobile: '9777888999',
        openingBalance: 5000,
        openingBalanceType: 'Payable',
        openingBalanceDate: '2026-04-01',
        openingBalanceNotes: 'Credit balance from pre-payment'
      })
    });
    const payableData = await resPayable.json();
    assert.equal(payableData.success, true);
    assert.equal(payableData.outstanding, -5000, 'Payable opening balance results in negative/credit outstanding of -₹5,000');

    const payableJv = db.prepare("SELECT * FROM journal_vouchers WHERE reference_type = 'CUSTOMER_OPENING_BALANCE' AND reference_id = ?").get('CUST-CREDIT-ADV');
    assert.ok(payableJv);
    const payableEntries = db.prepare('SELECT * FROM journal_entries WHERE voucher_id = ?').all(payableJv.id);
    const payDebit = payableEntries.find(e => e.entry_type === 'DEBIT');
    const payCredit = payableEntries.find(e => e.entry_type === 'CREDIT');
    assert.equal(payDebit.account_name, 'Opening Balance Equity');
    assert.equal(payCredit.account_name, 'Accounts Payable (Advance Credit Corp)');
    console.log('✓ Test 5 Passed: Payable opening balance recorded with proper equity/liability double-entry');

    console.log('\n===========================================================');
    console.log('  ALL CUSTOMER OPENING BALANCE TESTS PASSED SUCCESSFULLY!  ');
    console.log('===========================================================');
  } finally {
    // Cleanup test records from persistent db
    try {
      const testCustIds = ['CUST-TEST-ZERO', 'CUST-ABC-TRADERS', 'CUST-CREDIT-ADV'];
      for (const id of testCustIds) {
        const jvs = db.prepare("SELECT id FROM journal_vouchers WHERE reference_id = ? OR reference_type = 'CUSTOMER_OPENING_BALANCE' AND reference_id = ?").all(id, id);
        for (const jv of jvs) {
          db.prepare('DELETE FROM journal_entries WHERE voucher_id = ?').run(jv.id);
          db.prepare('DELETE FROM journal_vouchers WHERE id = ?').run(jv.id);
        }
        db.prepare('DELETE FROM payments WHERE customer_id = ?').run(id);
        db.prepare('DELETE FROM sales_orders WHERE customer_id = ?').run(id);
        db.prepare('DELETE FROM customers WHERE id = ?').run(id);
      }
    } catch (cleanErr) {
      console.warn('Test cleanup warning:', cleanErr);
    }
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
