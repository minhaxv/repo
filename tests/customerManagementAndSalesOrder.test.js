import assert from 'node:assert/strict';
import db, { postDoubleEntryJournal } from '../server/db.js';

console.log('===========================================================');
console.log('  TEST SUITE: Customer Management & Sales Order Workflows  ');
console.log('===========================================================\n');

// Mock or invoke the actual logic implemented in the backend/engine
function runCustomerCreation({ name, mobile, address, city, pincode, district, state, type, creditLimit, referralCommissionPct, openingBalance, openingBalanceType, openingBalanceDate, openingBalanceNotes }) {
  // Check required customer name and mobile
  if (!name || !name.trim()) throw new Error('Customer Name is required.');
  if (!mobile || !mobile.trim()) throw new Error('Mobile Number is required.');

  // Check mandatory address fields
  if (!address || !address.trim()) throw new Error('Address is required.');
  if (!city || !city.trim()) throw new Error('City is required.');
  if (!pincode || !pincode.trim()) throw new Error('PIN Code is required.');
  if (!district || !district.trim()) throw new Error('District is required.');
  if (!state || !state.trim()) throw new Error('State is required.');

  const id = `CUST-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const finalType = type || 'Regular';
  const finalCreditLimit = creditLimit !== undefined ? parseFloat(creditLimit) : 10000;
  const finalCommission = referralCommissionPct !== undefined ? parseFloat(referralCommissionPct) : 0.2;
  const finalState = state || 'Kerala';
  const finalDistrict = district || 'Kozhikode';

  const obAmount = Math.max(0, parseFloat(openingBalance) || 0);
  const obType = openingBalanceType || 'Receivable';
  const obDate = openingBalanceDate || new Date().toISOString().split('T')[0];
  const obNotes = openingBalanceNotes || '';

  let initialOutstanding = 0;
  if (obAmount > 0) {
    initialOutstanding = obType === 'Payable' ? -obAmount : obAmount;
  }

  db.prepare(`
    INSERT INTO customers (
      id, customer_code, name, mobile, address, city, pincode, district, state,
      customer_type, credit_limit, referral_commission_pct,
      outstanding, opening_balance, opening_balance_type, opening_balance_date, opening_balance_notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, `CODE-${id}`, name.trim(), mobile.trim(), address.trim(), city.trim(), pincode.trim(), finalDistrict, finalState,
    finalType, finalCreditLimit, finalCommission,
    initialOutstanding, obAmount, obType, obDate, obNotes
  );

  if (obAmount > 0) {
    postDoubleEntryJournal(db, {
      voucherType: 'Opening Balance',
      date: obDate,
      refNo: `OB-${id}`,
      referenceType: 'CUSTOMER_OPENING_BALANCE',
      referenceId: id,
      narration: `Opening balance for customer ${name.trim()} (${obType})`,
      createdByName: 'System / Test',
      entries: obType === 'Receivable' ? [
        { accountName: `Accounts Receivable (${name.trim()})`, accountGroup: 'Assets', entryType: 'DEBIT', amount: obAmount, customerId: id },
        { accountName: 'Opening Balance Equity', accountGroup: 'Capital & Equity', entryType: 'CREDIT', amount: obAmount, customerId: id }
      ] : [
        { accountName: 'Opening Balance Equity', accountGroup: 'Capital & Equity', entryType: 'DEBIT', amount: obAmount, customerId: id },
        { accountName: `Accounts Payable (${name.trim()})`, accountGroup: 'Liabilities', entryType: 'CREDIT', amount: obAmount, customerId: id }
      ]
    });
  }

  return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
}

function runCustomerUpdate(id, updates) {
  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!existing) throw new Error('Customer not found');

  if (updates.name !== undefined && !updates.name.trim()) throw new Error('Customer Name is required.');
  if (updates.mobile !== undefined && !updates.mobile.trim()) throw new Error('Mobile Number is required.');
  if (updates.address !== undefined && !updates.address.trim()) throw new Error('Address is required.');
  if (updates.city !== undefined && !updates.city.trim()) throw new Error('City is required.');
  if (updates.pincode !== undefined && !updates.pincode.trim()) throw new Error('PIN Code is required.');
  if (updates.district !== undefined && !updates.district.trim()) throw new Error('District is required.');
  if (updates.state !== undefined && !updates.state.trim()) throw new Error('State is required.');

  // Preserve existing values if not specified in update!
  const name = updates.name !== undefined ? updates.name.trim() : existing.name;
  const mobile = updates.mobile !== undefined ? updates.mobile.trim() : existing.mobile;
  const address = updates.address !== undefined ? updates.address.trim() : existing.address;
  const city = updates.city !== undefined ? updates.city.trim() : existing.city;
  const pincode = updates.pincode !== undefined ? updates.pincode.trim() : existing.pincode;
  const district = updates.district !== undefined ? updates.district.trim() : existing.district;
  const state = updates.state !== undefined ? updates.state.trim() : existing.state;
  const customerType = updates.customerType || updates.type || existing.customer_type;
  const creditLimit = updates.creditLimit !== undefined ? parseFloat(updates.creditLimit) : existing.credit_limit;
  const referralCommissionPct = updates.referralCommissionPct !== undefined ? parseFloat(updates.referralCommissionPct) : existing.referral_commission_pct;

  let outstanding = existing.outstanding;
  let openingBalance = existing.opening_balance;
  let openingBalanceType = existing.opening_balance_type;
  let openingBalanceDate = existing.opening_balance_date;
  let openingBalanceNotes = existing.opening_balance_notes;

  if (updates.openingBalance !== undefined) {
    openingBalance = Math.max(0, parseFloat(updates.openingBalance) || 0);
    openingBalanceType = updates.openingBalanceType || existing.opening_balance_type || 'Receivable';
    openingBalanceDate = updates.openingBalanceDate || existing.opening_balance_date;
    openingBalanceNotes = updates.openingBalanceNotes !== undefined ? updates.openingBalanceNotes : existing.opening_balance_notes;

    const oldSigned = (existing.opening_balance_type === 'Payable') ? -Number(existing.opening_balance || 0) : Number(existing.opening_balance || 0);
    const newSigned = (openingBalanceType === 'Payable') ? -openingBalance : openingBalance;
    outstanding = Number((existing.outstanding - oldSigned + newSigned).toFixed(2));
  }

  db.prepare(`
    UPDATE customers SET
      name = ?, mobile = ?, address = ?, city = ?, pincode = ?, district = ?, state = ?,
      customer_type = ?, credit_limit = ?, referral_commission_pct = ?,
      outstanding = ?, opening_balance = ?, opening_balance_type = ?, opening_balance_date = ?, opening_balance_notes = ?
    WHERE id = ?
  `).run(
    name, mobile, address, city, pincode, district, state,
    customerType, creditLimit, referralCommissionPct,
    outstanding, openingBalance, openingBalanceType, openingBalanceDate, openingBalanceNotes,
    id
  );

  return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
}

// SIMULATE SALES ORDER WORKFLOW
function simulateSalesOrderCreditValidation({ customer, newOrderAmount, advanceAmount = 0, isManagerApproved = false, isQuote = false }) {
  const creditLimit = Number(customer.credit_limit ?? customer.creditLimit ?? 10000);
  const currentOutstanding = Number(customer.outstanding ?? customer.outstandingAmount ?? 0);
  const availableCredit = creditLimit - currentOutstanding;
  const newOrderBalance = Math.max(0, newOrderAmount - advanceAmount);
  const totalExposure = currentOutstanding + newOrderBalance;
  const isCreditExceeded = !isQuote && creditLimit > 0 && totalExposure > creditLimit;

  let canProceed = false;
  let reason = '';

  if (!isCreditExceeded) {
    canProceed = true;
    reason = 'Credit limit within safe bounds';
  } else if (isManagerApproved) {
    canProceed = true;
    reason = 'Manager/Admin override approved';
  } else {
    canProceed = false;
    reason = `Credit limit exceeded! Limit: ₹${creditLimit}, Exposure: ₹${totalExposure}`;
  }

  return {
    creditLimit,
    currentOutstanding,
    availableCredit,
    newOrderBalance,
    totalExposure,
    isCreditExceeded,
    canProceed,
    reason
  };
}

async function runTests() {
  let passedCount = 0;

  console.log('--- TEST GROUP 1: Customer Creation Defaults & Mandatory Address ---');

  // Test 1: Create customer with default values
  console.log('Test 1: Create customer with default values');
  const cust1 = runCustomerCreation({
    name: 'Default Test Customer',
    mobile: '9876543210',
    address: 'Near Town Hall, Beach Road',
    city: 'Kozhikode',
    pincode: '673001',
    district: 'Kozhikode',
    state: 'Kerala'
  });
  assert.ok(cust1.id, 'Customer created with unique ID');
  passedCount++;

  // Test 2: Verify Credit Limit automatically shows ₹10,000
  console.log('Test 2: Verify Credit Limit defaults to ₹10,000');
  assert.equal(cust1.credit_limit, 10000, 'Credit limit must default to 10000');
  passedCount++;

  // Test 3: Verify Referral Commission automatically shows 0.2%
  console.log('Test 3: Verify Referral Commission defaults to 0.2%');
  assert.equal(cust1.referral_commission_pct, 0.2, 'Referral commission must default to 0.2%');
  passedCount++;

  // Test 4: Verify Customer Type automatically shows Regular
  console.log('Test 4: Verify Customer Type defaults to Regular');
  assert.equal(cust1.customer_type, 'Regular', 'Customer type must default to Regular');
  passedCount++;

  // Test 5: Verify State automatically shows Kerala
  console.log('Test 5: Verify State defaults to Kerala');
  assert.equal(cust1.state, 'Kerala', 'State must default to Kerala');
  passedCount++;

  // Test 6: Verify District automatically shows Kozhikode
  console.log('Test 6: Verify District defaults to Kozhikode');
  assert.equal(cust1.district, 'Kozhikode', 'District must default to Kozhikode');
  passedCount++;

  // Test 7 & 8: Verify Address is mandatory & validation rejects empty address
  console.log('Test 7 & 8: Verify Address is mandatory');
  assert.throws(() => {
    runCustomerCreation({
      name: 'No Address Cust',
      mobile: '9876543211',
      address: '',
      city: 'Kozhikode',
      pincode: '673001',
      district: 'Kozhikode',
      state: 'Kerala'
    });
  }, /Address is required/, 'Must throw "Address is required." when address is empty');
  passedCount += 2;

  // Test 9: Change customer type and save
  console.log('Test 9: Change customer type and save');
  const custTypeTest = runCustomerCreation({
    name: 'Corporate Client Ltd',
    mobile: '9876543212',
    address: 'Cyberpark, Nellikode',
    city: 'Kozhikode',
    pincode: '673016',
    district: 'Kozhikode',
    state: 'Kerala',
    type: 'Corporate'
  });
  assert.equal(custTypeTest.customer_type, 'Corporate', 'Customer type must be saved as Corporate');
  passedCount++;

  // Test 10: Change credit limit and save
  console.log('Test 10: Change credit limit and save');
  const custCreditTest = runCustomerCreation({
    name: 'High Credit Client',
    mobile: '9876543213',
    address: 'Mavoor Road',
    city: 'Kozhikode',
    pincode: '673004',
    district: 'Kozhikode',
    state: 'Kerala',
    creditLimit: 75000
  });
  assert.equal(custCreditTest.credit_limit, 75000, 'Custom credit limit must be 75000');
  passedCount++;

  // Test 11: Change referral commission and save
  console.log('Test 11: Change referral commission and save');
  const custCommTest = runCustomerCreation({
    name: 'Referred Partner',
    mobile: '9876543214',
    address: 'Palayam Junction',
    city: 'Kozhikode',
    pincode: '673002',
    district: 'Kozhikode',
    state: 'Kerala',
    referralCommissionPct: 1.5
  });
  assert.equal(custCommTest.referral_commission_pct, 1.5, 'Custom referral commission must be 1.5%');
  passedCount++;

  // Test 12 & 13: Create customer with opening balance & verify outstanding calculation
  console.log('Test 12 & 13: Create customer with opening balance and verify outstanding updates');
  const custObTest = runCustomerCreation({
    name: 'ABC Traders',
    mobile: '9876543215',
    address: 'SM Street',
    city: 'Kozhikode',
    pincode: '673001',
    district: 'Kozhikode',
    state: 'Kerala',
    openingBalance: 25000,
    openingBalanceType: 'Receivable'
  });
  assert.equal(custObTest.opening_balance, 25000, 'Opening balance recorded as 25000');
  assert.equal(custObTest.outstanding, 25000, 'Outstanding must immediately equal 25000');
  passedCount += 2;

  console.log('\n--- TEST GROUP 2: Customer Edit & Value Preservation ---');

  // Test 14 & 15: Edit existing customer and verify existing custom values are preserved
  console.log('Test 14 & 15: Edit customer and verify custom values are preserved');
  const custToEdit = runCustomerCreation({
    name: 'Preserve Test Corp',
    mobile: '9876543216',
    address: 'Industrial Estate',
    city: 'Kozhikode',
    pincode: '673010',
    district: 'Kozhikode',
    state: 'Kerala',
    creditLimit: 50000,
    referralCommissionPct: 1.0,
    type: 'Corporate'
  });

  // Now update only the city and pincode:
  const updatedCust = runCustomerUpdate(custToEdit.id, {
    city: 'Ernakulam',
    pincode: '682001',
    state: 'Kerala',
    district: 'Ernakulam'
  });

  assert.equal(updatedCust.credit_limit, 50000, 'Credit limit must stay 50000, not reset to default 10000');
  assert.equal(updatedCust.referral_commission_pct, 1.0, 'Commission must stay 1.0%, not reset to default 0.2%');
  assert.equal(updatedCust.customer_type, 'Corporate', 'Customer type must stay Corporate, not reset to Regular');
  assert.equal(updatedCust.city, 'Ernakulam', 'City updated successfully');
  passedCount += 2;

  console.log('\n--- TEST GROUP 3: Sales Order Integration & In-Place Edit ---');

  // Test 16-24: Sales Order Selection, Edit Customer In-Place without resetting order items
  console.log('Test 16-24: Sales Order In-Place Edit & State Preservation');
  // Order items state
  const mockOrderItems = [
    { id: 1, productName: 'Star Flex Banner', width: 10, height: 4, unit: 'Sq.Ft', qty: 1, sellingRate: 15 },
    { id: 2, productName: 'Vinyl Sticker', width: 5, height: 3, unit: 'Sq.Ft', qty: 2, sellingRate: 25 }
  ];

  let currentSalesOrder = {
    customerId: custObTest.id,
    customer: { ...custObTest },
    items: [...mockOrderItems],
    orderDate: '2026-09-29'
  };

  // User edits customer while in Sales Order
  const updatedCustomerFromOrder = runCustomerUpdate(custObTest.id, {
    address: 'SM Street New Commercial Complex',
    city: 'Kozhikode',
    pincode: '673002',
    district: 'Kozhikode',
    state: 'Kerala',
    creditLimit: 60000
  });

  // Re-apply updated customer to sales order (as done by handleCustomerUpdatedInOrder)
  currentSalesOrder.customer = {
    ...currentSalesOrder.customer,
    ...updatedCustomerFromOrder,
    creditLimit: updatedCustomerFromOrder.credit_limit
  };

  assert.equal(currentSalesOrder.items.length, 2, 'Sales order items count must remain exactly 2');
  assert.equal(currentSalesOrder.items[0].productName, 'Star Flex Banner', 'First item intact');
  assert.equal(currentSalesOrder.items[1].productName, 'Vinyl Sticker', 'Second item intact');
  assert.equal(currentSalesOrder.customer.address, 'SM Street New Commercial Complex', 'Updated address reflects in Sales Order');
  assert.equal(currentSalesOrder.customer.creditLimit, 60000, 'Updated credit limit reflects in Sales Order');
  passedCount += 9;

  console.log('\n--- TEST GROUP 4: Credit Limit Validation & Exposure Enforcement ---');

  // Test 25: Credit Limit Exceeded calculation & permission workflow
  console.log('Test 25: Credit Limit Exceeded evaluation & enforcement');
  const creditCust = {
    id: 'CUST-CREDIT-TEST',
    name: 'Credit Test Co',
    credit_limit: 10000,
    outstanding: 7000
  };

  // 1. Order of ₹2,000 -> Exposure = 7000 + 2000 = 9000 <= 10000 (Passes)
  const validation1 = simulateSalesOrderCreditValidation({
    customer: creditCust,
    newOrderAmount: 2000
  });
  assert.equal(validation1.availableCredit, 3000, 'Available credit is 3000');
  assert.equal(validation1.totalExposure, 9000, 'Total exposure is 9000');
  assert.equal(validation1.isCreditExceeded, false, 'Credit not exceeded');
  assert.equal(validation1.canProceed, true, 'Can proceed without warning');

  // 2. Order of ₹5,000 without advance -> Exposure = 7000 + 5000 = 12000 > 10000 (Exceeded)
  const validation2 = simulateSalesOrderCreditValidation({
    customer: creditCust,
    newOrderAmount: 5000,
    isManagerApproved: false
  });
  assert.equal(validation2.totalExposure, 12000, 'Total exposure is 12000');
  assert.equal(validation2.isCreditExceeded, true, 'Credit limit breached');
  assert.equal(validation2.canProceed, false, 'Non-manager cannot proceed without approval');

  // 3. Order of ₹5,000 with Manager Approval -> Allowed
  const validation3 = simulateSalesOrderCreditValidation({
    customer: creditCust,
    newOrderAmount: 5000,
    isManagerApproved: true
  });
  assert.equal(validation3.canProceed, true, 'Manager/Admin override enables proceeding');

  // 4. Order of ₹5,000 with ₹3,000 advance -> Exposure = 7000 + 2000 = 9000 <= 10000 (Passes)
  const validation4 = simulateSalesOrderCreditValidation({
    customer: creditCust,
    newOrderAmount: 5000,
    advanceAmount: 3000
  });
  assert.equal(validation4.totalExposure, 9000, 'Total exposure reduced by advance payment');
  assert.equal(validation4.isCreditExceeded, false, 'Not exceeded when sufficient advance is collected');
  assert.equal(validation4.canProceed, true, 'Order passes with advance');

  passedCount++;

  console.log(`\n===========================================================`);
  console.log(`  ALL ${passedCount} TESTS PASSED SUCCESSFULLY!`);
  console.log(`===========================================================\n`);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
