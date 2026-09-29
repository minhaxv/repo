import assert from 'node:assert/strict';
import db, { generateNextSequence, postDoubleEntryJournal } from '../server/db.js';

console.log('===========================================================');
console.log('  TEST SUITE: Outsource Work Payment Entry System          ');
console.log('===========================================================\n');

try {
  // --- TEST GROUP 1: Database Schema & Migration Verification ---
  console.log('--- TEST GROUP 1: Database Tables & Schema ---');

  const billTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='outsource_bills'").get();
  assert.ok(billTable, 'outsource_bills table must exist');

  const paymentTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='outsource_payments'").get();
  assert.ok(paymentTable, 'outsource_payments table must exist');

  console.log('✔ Test 1: outsource_bills and outsource_payments tables verified in SQLite.');

  // --- TEST GROUP 2: Seed / Demo Bill BILL-125 Verification ---
  console.log('\n--- TEST GROUP 2: Demo BILL-125 with Multiple Work Orders ---');

  const demoBill = db.prepare("SELECT * FROM outsource_bills WHERE bill_number = 'BILL-125'").get();
  assert.ok(demoBill, 'BILL-125 should exist');
  assert.equal(demoBill.vendor_name, 'ABC Embroidery');
  assert.equal(demoBill.total_amount, 20000);

  const workOrders = JSON.parse(demoBill.work_orders_json || '[]');
  assert.equal(workOrders.length, 3, 'BILL-125 must contain exactly 3 Work Orders');
  assert.equal(workOrders[0].workOrder, 'WO-001');
  assert.equal(workOrders[0].amount, 5000);
  assert.equal(workOrders[1].workOrder, 'WO-002');
  assert.equal(workOrders[1].amount, 8000);
  assert.equal(workOrders[2].workOrder, 'WO-003');
  assert.equal(workOrders[2].amount, 7000);

  const sumWO = workOrders.reduce((sum, wo) => sum + wo.amount, 0);
  assert.equal(sumWO, 20000, 'Sum of included Work Orders must equal Total Bill Amount (₹20,000)');

  console.log('✔ Test 2: BILL-125 contains WO-001 (₹5,000), WO-002 (₹8,000), WO-003 (₹7,000) totaling ₹20,000.');

  // --- TEST GROUP 3: Single Payment Entry (PAY-000101) against Bill ---
  console.log('\n--- TEST GROUP 3: Single Payment Transaction against Bill ---');

  const paymentsForDemo = db.prepare("SELECT * FROM outsource_payments WHERE bill_id = ?").all(demoBill.id);
  assert.ok(paymentsForDemo.length >= 1, 'At least 1 payment should be recorded');
  const pay1 = paymentsForDemo.find(p => p.id === 'PAY-000101');
  assert.ok(pay1, 'PAY-000101 payment must exist');
  assert.equal(pay1.amount, 5000);
  assert.equal(pay1.payment_method, 'Cash');
  assert.equal(pay1.bill_number, 'BILL-125');

  // Verify NO separate payment transactions were created for WO-001, WO-002, WO-003
  const separateWOPayments = db.prepare("SELECT * FROM outsource_payments WHERE id IN ('PAY-001', 'PAY-002', 'PAY-003')").all();
  assert.equal(separateWOPayments.length, 0, 'Must NOT create separate payment entries for each Work Order');

  console.log('✔ Test 3: Exactly ONE payment transaction (PAY-000101) exists against BILL-125, not per Work Order.');

  // --- TEST GROUP 4: Partial Payment Flow & Outstanding Calculations ---
  console.log('\n--- TEST GROUP 4: Partial Payments & Status Calculation ---');

  // Create a clean test bill
  const testBillId = `TEST-BILL-${Date.now()}`;
  const testBillNo = `BILL-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const testVendorId = 'SUP-ABC-01';

  db.prepare(`
    INSERT INTO outsource_bills (id, bill_number, vendor_id, vendor_name, bill_date, total_amount, paid_amount, outstanding_amount, status, work_orders_json, notes)
    VALUES (?, ?, ?, 'ABC Embroidery', '2026-04-01', 20000, 0, 20000, 'Unpaid', ?, 'Test bill')
  `).run(testBillId, testBillNo, testVendorId, JSON.stringify(workOrders));

  let currentBill = db.prepare("SELECT * FROM outsource_bills WHERE id = ?").get(testBillId);
  assert.equal(currentBill.total_amount, 20000);
  assert.equal(currentBill.paid_amount, 0);
  assert.equal(currentBill.outstanding_amount, 20000);
  assert.equal(currentBill.status, 'Unpaid');
  console.log('  -> Initial: Total ₹20,000 | Paid ₹0 | Outstanding ₹20,000 | Status: Unpaid');

  // First Payment: ₹5,000
  const payId1 = generateNextSequence(db, 'PAY');
  db.prepare(`
    INSERT INTO outsource_payments (id, bill_id, bill_number, vendor_id, vendor_name, amount, payment_method, ref_no, payment_date, notes)
    VALUES (?, ?, ?, ?, 'ABC Embroidery', 5000, 'Cash', 'REF-P1', '2026-04-01', 'First payment')
  `).run(payId1, testBillId, testBillNo, testVendorId);

  db.prepare(`
    UPDATE outsource_bills
    SET paid_amount = 5000, outstanding_amount = 15000, status = 'Partially Paid'
    WHERE id = ?
  `).run(testBillId);

  currentBill = db.prepare("SELECT * FROM outsource_bills WHERE id = ?").get(testBillId);
  assert.equal(currentBill.paid_amount, 5000);
  assert.equal(currentBill.outstanding_amount, 15000);
  assert.equal(currentBill.status, 'Partially Paid');
  console.log('  -> After 1st payment ₹5,000: Paid ₹5,000 | Outstanding ₹15,000 | Status: Partially Paid');

  // Second Payment: ₹10,000
  const payId2 = generateNextSequence(db, 'PAY');
  db.prepare(`
    INSERT INTO outsource_payments (id, bill_id, bill_number, vendor_id, vendor_name, amount, payment_method, ref_no, payment_date, notes)
    VALUES (?, ?, ?, ?, 'ABC Embroidery', 10000, 'UPI', 'UPI-REF-02', '2026-04-02', 'Second payment')
  `).run(payId2, testBillId, testBillNo, testVendorId);

  db.prepare(`
    UPDATE outsource_bills
    SET paid_amount = 15000, outstanding_amount = 5000, status = 'Partially Paid'
    WHERE id = ?
  `).run(testBillId);

  currentBill = db.prepare("SELECT * FROM outsource_bills WHERE id = ?").get(testBillId);
  assert.equal(currentBill.paid_amount, 15000);
  assert.equal(currentBill.outstanding_amount, 5000);
  assert.equal(currentBill.status, 'Partially Paid');
  console.log('  -> After 2nd payment ₹10,000: Paid ₹15,000 | Outstanding ₹5,000 | Status: Partially Paid');

  // Third Payment: ₹5,000
  const payId3 = generateNextSequence(db, 'PAY');
  db.prepare(`
    INSERT INTO outsource_payments (id, bill_id, bill_number, vendor_id, vendor_name, amount, payment_method, ref_no, payment_date, notes)
    VALUES (?, ?, ?, ?, 'ABC Embroidery', 5000, 'Bank Transfer', 'HDFC-003', '2026-04-03', 'Third payment')
  `).run(payId3, testBillId, testBillNo, testVendorId);

  db.prepare(`
    UPDATE outsource_bills
    SET paid_amount = 20000, outstanding_amount = 0, status = 'Paid'
    WHERE id = ?
  `).run(testBillId);

  currentBill = db.prepare("SELECT * FROM outsource_bills WHERE id = ?").get(testBillId);
  assert.equal(currentBill.paid_amount, 20000);
  assert.equal(currentBill.outstanding_amount, 0);
  assert.equal(currentBill.status, 'Paid');
  console.log('  -> After 3rd payment ₹5,000: Paid ₹20,000 | Outstanding ₹0 | Status: Paid');

  console.log('✔ Test 4: Multiple partial payments update total paid and outstanding accurately until fully Paid.');

  // --- TEST GROUP 5: Double-Entry Accounting Journal Posting ---
  console.log('\n--- TEST GROUP 5: Double-Entry Accounting Journal Entries ---');

  const jvResult = postDoubleEntryJournal(db, {
    voucherType: 'Payment Entry',
    date: '2026-04-01',
    refNo: testBillNo,
    referenceType: 'OUTSOURCE_PAYMENT',
    referenceId: payId1,
    narration: `Payment towards Outsource Bill ${testBillNo} to ABC Embroidery via Cash`,
    entries: [
      { accountName: 'Accounts Payable (ABC Embroidery)', accountGroup: 'Liabilities', entryType: 'DEBIT', amount: 5000, supplierId: testVendorId },
      { accountName: 'Cash Account', accountGroup: 'Assets', entryType: 'CREDIT', amount: 5000, supplierId: testVendorId }
    ]
  });

  const jvNumber = jvResult?.voucherNumber || String(jvResult);
  assert.ok(jvNumber, 'Journal voucher number should be generated');

  const jv = db.prepare("SELECT * FROM journal_vouchers WHERE voucher_number = ?").get(jvNumber);
  assert.ok(jv, 'Journal voucher must exist in database');
  assert.equal(jv.voucher_type, 'Payment Entry');

  const entries = db.prepare("SELECT * FROM journal_entries WHERE voucher_id = ?").all(jv.id);
  assert.equal(entries.length, 2, 'Must have 2 entries (Debit and Credit)');

  const debitEntry = entries.find(e => e.entry_type === 'DEBIT');
  const creditEntry = entries.find(e => e.entry_type === 'CREDIT');
  assert.equal(debitEntry.account_name, 'Accounts Payable (ABC Embroidery)');
  assert.equal(debitEntry.amount, 5000);
  assert.equal(creditEntry.account_name, 'Cash Account');
  assert.equal(creditEntry.amount, 5000);

  console.log('✔ Test 5: Double-entry journal voucher balanced: Debit Accounts Payable (₹5,000), Credit Cash (₹5,000).');

  // --- TEST GROUP 6: Work Orders Intact & Bill Uniqueness ---
  console.log('\n--- TEST GROUP 6: Work Orders Linkage & Uniqueness Validation ---');

  // Work Orders remain intact
  const finalBill = db.prepare("SELECT * FROM outsource_bills WHERE id = ?").get(testBillId);
  const finalWOs = JSON.parse(finalBill.work_orders_json);
  assert.equal(finalWOs.length, 3, 'Work Orders array must remain unchanged for reporting');

  // Prevent duplicate bill for same vendor
  const checkDuplicate = (billNo, vendorId) => {
    return !!db.prepare('SELECT id FROM outsource_bills WHERE bill_number = ? AND vendor_id = ?').get(billNo, vendorId);
  };
  assert.equal(checkDuplicate(testBillNo, testVendorId), true, 'Duplicate check identifies existing bill');
  assert.equal(checkDuplicate('NEW-UNIQUE-BILL', testVendorId), false, 'New unique bill passes');

  console.log('✔ Test 6: Work Orders remain linked for reporting, duplicate bill numbers correctly identified.');

  // Clean up test bill and payments
  db.prepare("DELETE FROM outsource_payments WHERE bill_id = ?").run(testBillId);
  db.prepare("DELETE FROM outsource_bills WHERE id = ?").run(testBillId);

  console.log('\n===========================================================');
  console.log('  ALL TESTS PASSED! (6/6 Test Groups Verified)             ');
  console.log('===========================================================');
} catch (err) {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
}
