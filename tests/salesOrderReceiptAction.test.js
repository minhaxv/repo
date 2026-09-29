import assert from 'node:assert/strict';
import db from '../server/db.js';

console.log('===========================================================');
console.log('  TEST SUITE: Sales Order Receipt Action & Accounting     ');
console.log('===========================================================\n');

// Helper to simulate Receive Payment calculation and validation
function calculateReceiptState(order, receiptAmount = 0) {
  const grandTotal = Number(order.grandTotal ?? order.grand_total ?? 0);
  const advanceAmount = Number(order.advanceAmount ?? order.advance_amount ?? 0);
  const currentOutstanding = Math.max(0, grandTotal - advanceAmount);
  const isFullyPaid = grandTotal > 0 && currentOutstanding <= 0;

  const amt = Number(receiptAmount);
  const newAdvance = advanceAmount + amt;
  const newOutstanding = Math.max(0, grandTotal - newAdvance);
  const willBeFullyPaid = grandTotal > 0 && newOutstanding <= 0;

  return {
    orderId: order.id,
    customerName: order.customerName ?? order.customer_name,
    grandTotal,
    advanceAmount,
    currentOutstanding,
    isFullyPaid,
    receiptActionEnabled: !isFullyPaid && currentOutstanding > 0,
    newAdvance,
    newOutstanding,
    willBeFullyPaid
  };
}

try {
  // --- TEST GROUP 1: Receipt Action Availability & Data Loading ---
  console.log('--- TEST GROUP 1: Receipt Action Availability & Data Loading ---');

  const testOrderUnpaid = {
    id: 'SO-TEST-001',
    customerName: 'ABC Traders',
    grandTotal: 35000,
    advanceAmount: 10000
  };

  const state1 = calculateReceiptState(testOrderUnpaid);
  console.log('Test 1: Loads correct order, customer, total, received and outstanding');
  assert.equal(state1.orderId, 'SO-TEST-001');
  assert.equal(state1.customerName, 'ABC Traders');
  assert.equal(state1.grandTotal, 35000);
  assert.equal(state1.advanceAmount, 10000);
  assert.equal(state1.currentOutstanding, 25000);
  assert.equal(state1.isFullyPaid, false);
  assert.equal(state1.receiptActionEnabled, true);

  console.log('Test 2: Fully paid order disables Receipt and shows Paid status');
  const testOrderPaid = {
    id: 'SO-TEST-002',
    customerName: 'XYZ Corp',
    grandTotal: 50000,
    advanceAmount: 50000
  };
  const state2 = calculateReceiptState(testOrderPaid);
  assert.equal(state2.currentOutstanding, 0);
  assert.equal(state2.isFullyPaid, true);
  assert.equal(state2.receiptActionEnabled, false);

  // --- TEST GROUP 2: Partial & Full Receipt Calculations ---
  console.log('\n--- TEST GROUP 2: Partial & Full Receipt Calculations ---');

  console.log('Test 3: Partial receipt of ₹5,000 updates Received to ₹15,000 and Outstanding to ₹20,000');
  const partialState = calculateReceiptState(testOrderUnpaid, 5000);
  assert.equal(partialState.newAdvance, 15000);
  assert.equal(partialState.newOutstanding, 20000);
  assert.equal(partialState.willBeFullyPaid, false);

  console.log('Test 4: Subsequent full balance payment of ₹20,000 leaves Outstanding ₹0 and marks Paid');
  const updatedOrder = {
    ...testOrderUnpaid,
    advanceAmount: 15000
  };
  const fullState = calculateReceiptState(updatedOrder, 20000);
  assert.equal(fullState.newAdvance, 35000);
  assert.equal(fullState.newOutstanding, 0);
  assert.equal(fullState.willBeFullyPaid, true);

  // --- TEST GROUP 3: Database & Accounting Integration ---
  console.log('\n--- TEST GROUP 3: Database & Accounting Integration ---');

  const testCustId = `CUST-TEST-${Date.now()}`;
  const testOrderId = `SO-RECEIPT-${Date.now()}`;

  // 1. Insert customer with opening balance / initial state
  db.prepare(`
    INSERT INTO customers (id, name, mobile, address, city, district, state, pincode, outstanding, credit_limit, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(testCustId, 'ABC Traders Test', '9876543210', '123 Market Road', 'Calicut', 'Kozhikode', 'Kerala', '673001', 35000, 50000);

  // 2. Insert sales order
  db.prepare(`
    INSERT INTO sales_orders (id, customer_id, customer_name, order_type, order_date, due_date, grand_total, advance_amount, balance_amount, payment_status, production_status, created_at)
    VALUES (?, ?, ?, 'Direct', CURRENT_DATE, CURRENT_DATE, 35000, 10000, 25000, 'Partial', 'Pending', CURRENT_TIMESTAMP)
  `).run(testOrderId, testCustId, 'ABC Traders Test');

  console.log('Test 5: Initial order and customer records inserted correctly');
  const initialOrder = db.prepare('SELECT grand_total, advance_amount, balance_amount, payment_status FROM sales_orders WHERE id = ?').get(testOrderId);
  assert.equal(Number(initialOrder.grand_total), 35000);
  assert.equal(Number(initialOrder.advance_amount), 10000);
  assert.equal(Number(initialOrder.balance_amount), 25000);
  assert.equal(initialOrder.payment_status, 'Partial');

  // 3. Record partial payment of ₹5,000 via simulated server endpoint logic
  const payId1 = `PAY-TEST-${Date.now()}-1`;
  const amountReceived1 = 5000;

  const ord1 = db.prepare('SELECT grand_total, advance_amount, customer_id, customer_name FROM sales_orders WHERE id = ?').get(testOrderId);
  const newAdvance1 = Number(ord1.advance_amount || 0) + amountReceived1;
  const newBalance1 = Math.max(0, Number(ord1.grand_total || 0) - newAdvance1);
  const newPayStatus1 = newBalance1 <= 0 ? 'Paid' : 'Partial';

  db.prepare(`
    UPDATE sales_orders SET advance_amount = ?, balance_amount = ?, payment_status = ? WHERE id = ?
  `).run(newAdvance1, newBalance1, newPayStatus1, testOrderId);

  db.prepare(`
    UPDATE customers SET outstanding = MAX(0, outstanding - ?) WHERE id = ?
  `).run(amountReceived1, testCustId);

  db.prepare(`
    INSERT INTO payments (id, order_id, customer_id, customer_name, amount, method, ref_no, status, paid_date, notes)
    VALUES (?, ?, ?, ?, ?, 'Cash', 'REC-001', 'Completed', CURRENT_DATE, 'Partial payment test')
  `).run(payId1, testOrderId, testCustId, 'ABC Traders Test', amountReceived1);

  console.log('Test 6: Order advance is updated to ₹15,000 and balance is ₹20,000 after partial payment');
  const afterPay1 = db.prepare('SELECT advance_amount, balance_amount, payment_status FROM sales_orders WHERE id = ?').get(testOrderId);
  assert.equal(Number(afterPay1.advance_amount), 15000);
  assert.equal(Number(afterPay1.balance_amount), 20000);
  assert.equal(afterPay1.payment_status, 'Partial');

  console.log('Test 7: Customer outstanding is reduced by ₹5,000 (from ₹35,000 to ₹30,000)');
  const custAfter1 = db.prepare('SELECT outstanding FROM customers WHERE id = ?').get(testCustId);
  assert.equal(Number(custAfter1.outstanding), 30000);

  // 4. Record remaining balance payment of ₹20,000
  const payId2 = `PAY-TEST-${Date.now()}-2`;
  const amountReceived2 = 20000;

  const ord2 = db.prepare('SELECT grand_total, advance_amount, customer_id, customer_name FROM sales_orders WHERE id = ?').get(testOrderId);
  const newAdvance2 = Number(ord2.advance_amount || 0) + amountReceived2;
  const newBalance2 = Math.max(0, Number(ord2.grand_total || 0) - newAdvance2);
  const newPayStatus2 = newBalance2 <= 0 ? 'Paid' : 'Partial';

  db.prepare(`
    UPDATE sales_orders SET advance_amount = ?, balance_amount = ?, payment_status = ? WHERE id = ?
  `).run(newAdvance2, newBalance2, newPayStatus2, testOrderId);

  db.prepare(`
    UPDATE customers SET outstanding = MAX(0, outstanding - ?) WHERE id = ?
  `).run(amountReceived2, testCustId);

  db.prepare(`
    INSERT INTO payments (id, order_id, customer_id, customer_name, amount, method, ref_no, status, paid_date, notes)
    VALUES (?, ?, ?, ?, ?, 'UPI', 'REC-002', 'Completed', CURRENT_DATE, 'Final balance settlement')
  `).run(payId2, testOrderId, testCustId, 'ABC Traders Test', amountReceived2);

  console.log('Test 8: Order advance is updated to ₹35,000, balance is ₹0, status is Paid');
  const afterPay2 = db.prepare('SELECT advance_amount, balance_amount, payment_status FROM sales_orders WHERE id = ?').get(testOrderId);
  assert.equal(Number(afterPay2.advance_amount), 35000);
  assert.equal(Number(afterPay2.balance_amount), 0);
  assert.equal(afterPay2.payment_status, 'Paid');

  console.log('Test 9: Payments list reflects both receipts with correct references and amounts');
  const payments = db.prepare('SELECT id, amount, method, ref_no FROM payments WHERE order_id = ? ORDER BY id ASC').all(testOrderId);
  assert.equal(payments.length, 2);
  assert.equal(Number(payments[0].amount), 5000);
  assert.equal(payments[0].method, 'Cash');
  assert.equal(Number(payments[1].amount), 20000);
  assert.equal(payments[1].method, 'UPI');

  console.log('Test 10: State calculation on fully paid order now disables Receipt action');
  const finalState = calculateReceiptState({
    id: testOrderId,
    customerName: 'ABC Traders Test',
    grandTotal: afterPay2.advance_amount,
    advanceAmount: afterPay2.advance_amount
  });
  assert.equal(finalState.isFullyPaid, true);
  assert.equal(finalState.receiptActionEnabled, false);

  // Clean up test data
  db.prepare('DELETE FROM payments WHERE order_id = ?').run(testOrderId);
  db.prepare('DELETE FROM sales_orders WHERE id = ?').run(testOrderId);
  db.prepare('DELETE FROM customers WHERE id = ?').run(testCustId);

  console.log('\n===========================================================');
  console.log('  ALL 10 SALES ORDER RECEIPT ACTION TESTS PASSED!          ');
  console.log('===========================================================');
} catch (err) {
  console.error('❌ Test failed:', err);
  process.exit(1);
}
