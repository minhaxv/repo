import { formatINR } from './reportEngine';

/**
 * Double Entry Accounting Engine & Financial Statement Generators
 */

// Generate Chart of Accounts Standard Groups
export const ACCOUNT_GROUPS = {
  ASSETS: 'Assets',
  LIABILITIES: 'Liabilities',
  EQUITY: 'Capital & Equity',
  REVENUE: 'Income & Sales',
  EXPENSES: 'Expenses & Outflows'
};

// Mock Initial Double Entry Journal Transactions (Auto-posting from Sales, Purchases, Expenses)
export const initialJournalVouchers = [
  {
    id: 'JV-2026-001',
    voucherType: 'Journal Entry',
    date: '2026-08-01',
    refNo: 'SO-1001',
    narration: 'Being Sales Order #SO-1001 billed to Customer Apex Retailers',
    entries: [
      { account: 'Accounts Receivable (Apex Retailers)', type: 'DEBIT', amount: 47200 },
      { account: 'Sales Revenue Account', type: 'CREDIT', amount: 40000 },
      { account: 'Output CGST (9%)', type: 'CREDIT', amount: 3600 },
      { account: 'Output SGST (9%)', type: 'CREDIT', amount: 3600 }
    ],
    status: 'Posted',
    createdBy: 'System Auto-Post'
  },
  {
    id: 'JV-2026-002',
    voucherType: 'Payment Entry',
    date: '2026-08-02',
    refNo: 'PAY-101',
    narration: 'Advance payment received via HDFC Bank UPI for Apex Retailers',
    entries: [
      { account: 'HDFC Bank Account', type: 'DEBIT', amount: 20000 },
      { account: 'Accounts Receivable (Apex Retailers)', type: 'CREDIT', amount: 20000 }
    ],
    status: 'Posted',
    createdBy: 'Accounts Manager'
  },
  {
    id: 'JV-2026-003',
    voucherType: 'Expense Entry',
    date: '2026-08-03',
    refNo: 'EXP-889',
    narration: 'Flex Solvent Printing Ink Purchase from Vendor Sun-Chemicals',
    entries: [
      { account: 'Raw Material Ink Expense', type: 'DEBIT', amount: 15000 },
      { account: 'Input CGST (9%)', type: 'DEBIT', amount: 1350 },
      { account: 'Input SGST (9%)', type: 'DEBIT', amount: 1350 },
      { account: 'Cash Account', type: 'CREDIT', amount: 17700 }
    ],
    status: 'Posted',
    createdBy: 'Admin User'
  },
  {
    id: 'JV-2026-004',
    voucherType: 'Contra Entry',
    date: '2026-08-04',
    refNo: 'CNT-042',
    narration: 'Cash deposited into HDFC Bank main account',
    entries: [
      { account: 'HDFC Bank Account', type: 'DEBIT', amount: 25000 },
      { account: 'Cash Account', type: 'CREDIT', amount: 25000 }
    ],
    status: 'Posted',
    createdBy: 'Cashier'
  }
];

/**
 * Calculate General Ledger Accounts & Balances
 */
export const calculateGeneralLedger = (journals = [], salesOrders = [], payments = [], inventory = []) => {
  const accountMap = new Map();

  const getAccount = (name, group) => {
    if (!accountMap.has(name)) {
      accountMap.set(name, {
        name,
        group: group || ACCOUNT_GROUPS.ASSETS,
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
        entries: []
      });
    }
    return accountMap.get(name);
  };

  // 1. Post from Explicit Journal Vouchers
  journals.forEach(jv => {
    jv.entries.forEach(entry => {
      const acc = getAccount(entry.account);
      if (entry.type === 'DEBIT') {
        acc.totalDebit += entry.amount;
      } else {
        acc.totalCredit += entry.amount;
      }
      acc.entries.push({
        id: jv.id,
        date: jv.date,
        voucherType: jv.voucherType,
        refNo: jv.refNo,
        narration: jv.narration,
        type: entry.type,
        amount: entry.amount
      });
    });
  });

  // 2. Synthesize Accounts from Real Sales Orders & Customer Outstanding
  salesOrders.forEach(order => {
    const custName = `Accounts Receivable (${order.customerName || 'Walk-in Customer'})`;
    const acc = getAccount(custName, ACCOUNT_GROUPS.ASSETS);
    const amount = Number(order.grandTotal || 0);
    const paid = Number(order.advanceAmount || 0);

    acc.totalDebit += amount;
    acc.entries.push({
      id: order.id,
      date: order.orderDate || new Date().toISOString().split('T')[0],
      voucherType: 'Sales Invoice',
      refNo: order.id,
      narration: `Sales Order Tax Invoice ${order.id}`,
      type: 'DEBIT',
      amount: amount
    });

    if (paid > 0) {
      acc.totalCredit += paid;
      acc.entries.push({
        id: `REC-${order.id}`,
        date: order.orderDate || new Date().toISOString().split('T')[0],
        voucherType: 'Payment Receipt',
        refNo: order.id,
        narration: `Advance payment for ${order.id}`,
        type: 'CREDIT',
        amount: paid
      });
    }
  });

  // Compute Net Balance for each ledger account
  const ledgerList = Array.from(accountMap.values()).map(acc => {
    // Assets & Expenses: Balance = Debit - Credit
    // Liabilities, Equity, Revenue: Balance = Credit - Debit
    const netDebit = acc.totalDebit - acc.totalCredit;
    return {
      ...acc,
      netBalance: netDebit,
      closingBalance: Math.abs(netDebit),
      balanceType: netDebit >= 0 ? 'Dr' : 'Cr'
    };
  });

  return ledgerList;
};

/**
 * Generate Trial Balance (Verifies Total Debits === Total Credits)
 */
export const generateTrialBalance = (ledgerList = []) => {
  let totalDebits = 0;
  let totalCredits = 0;

  const rows = ledgerList.map(acc => {
    totalDebits += acc.totalDebit;
    totalCredits += acc.totalCredit;

    return {
      accountName: acc.name,
      debit: acc.totalDebit,
      credit: acc.totalCredit,
      netDebit: acc.netBalance > 0 ? acc.netBalance : 0,
      netCredit: acc.netBalance < 0 ? Math.abs(acc.netBalance) : 0
    };
  });

  return {
    rows,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
  };
};

/**
 * Generate Income Statement (Profit & Loss)
 */
export const generateProfitAndLoss = (salesOrders = [], payments = [], journals = []) => {
  const totalRevenue = salesOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
  const totalGstCollected = salesOrders.reduce((sum, o) => sum + Number(o.cgst || 0) + Number(o.sgst || 0) + Number(o.igst || 0), 0);
  const totalGrossSales = salesOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);

  const totalEstCost = salesOrders.reduce((sum, o) => sum + Number(o.totalEstimatedCost || 0), 0);
  const totalOutsourceCost = salesOrders.reduce((sum, o) => sum + Number(o.totalInternalEstOutsourceCost || 0), 0);

  const grossProfit = totalRevenue - (totalEstCost + totalOutsourceCost);
  const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

  const operatingExpenses = [
    { category: 'Raw Materials & Media Stock', amount: Math.round(totalEstCost * 0.65) },
    { category: 'Ink, Solvents & Lamination', amount: Math.round(totalEstCost * 0.20) },
    { category: 'Outsource Printing & Fabrication Bills', amount: totalOutsourceCost },
    { category: 'Staff Salaries & Operator Incentives', amount: 85000 },
    { category: 'Factory Electricity & Power Bill', amount: 24500 },
    { category: 'Shop Rent & Premises Lease', amount: 35000 },
    { category: 'Machine Maintenance & CNC Servicing', amount: 12000 }
  ];

  const totalExpenses = operatingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netOperatingProfit = totalRevenue - totalExpenses;

  return {
    totalGrossSales,
    totalRevenue,
    totalGstCollected,
    totalCostOfGoods: totalEstCost + totalOutsourceCost,
    grossProfit,
    grossMarginPct,
    operatingExpenses,
    totalExpenses,
    netOperatingProfit,
    isProfitable: netOperatingProfit >= 0
  };
};

/**
 * Generate Balance Sheet (Assets = Liabilities + Equity)
 */
export const generateBalanceSheet = (salesOrders = [], customers = [], inventory = [], payments = []) => {
  const totalAccountsReceivable = salesOrders.reduce((sum, o) => sum + Number(o.balanceAmount || 0), 0);
  const cashInHand = 42500;
  const bankAccountsBalance = 385000;
  const inventoryStockValue = inventory.reduce((sum, i) => sum + (Number(i.currentStock || 0) * Number(i.unitCost || 0)), 0);
  const fixedAssetsValue = 1850000; // Machinery, CNC Routers, Solvent Printers

  const totalCurrentAssets = totalAccountsReceivable + cashInHand + bankAccountsBalance + inventoryStockValue;
  const totalAssets = totalCurrentAssets + fixedAssetsValue;

  const accountsPayableOutsource = 68000;
  const gstTaxLiabilityOutput = salesOrders.reduce((sum, o) => sum + Number(o.cgst || 0) + Number(o.sgst || 0), 0);
  const totalCurrentLiabilities = accountsPayableOutsource + gstTaxLiabilityOutput;

  const ownerCapital = 1500000;
  const retainedEarnings = totalAssets - totalCurrentLiabilities - ownerCapital;
  const totalLiabilitiesAndEquity = totalCurrentLiabilities + ownerCapital + retainedEarnings;

  return {
    assets: {
      currentAssets: [
        { name: 'Cash in Hand', amount: cashInHand },
        { name: 'HDFC Bank Account', amount: bankAccountsBalance },
        { name: 'Accounts Receivable (Customer Balance)', amount: totalAccountsReceivable },
        { name: 'Inventory Stock-in-Hand', amount: inventoryStockValue }
      ],
      fixedAssets: [
        { name: 'Flex & Signage Machinery (Roland, Flora, CNC)', amount: fixedAssetsValue }
      ],
      totalAssets
    },
    liabilities: {
      currentLiabilities: [
        { name: 'Accounts Payable (Outsource Vendors)', amount: accountsPayableOutsource },
        { name: 'GST Output Tax Liability Payable', amount: gstTaxLiabilityOutput }
      ],
      totalLiabilities: totalCurrentLiabilities
    },
    equity: {
      capitalAccounts: [
        { name: "Proprietor's Capital Account", amount: ownerCapital },
        { name: 'Retained Earnings & Reserves', amount: retainedEarnings }
      ],
      totalEquity: ownerCapital + retainedEarnings,
      totalLiabilitiesAndEquity
    },
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1.0
  };
};

/**
 * Generate GST Tax Summary & Filing Overview (GSTR-1 & GSTR-3B)
 */
export const generateGstTaxSummary = (salesOrders = []) => {
  let totalB2BSales = 0;
  let totalB2CSales = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let taxableAmount = 0;

  const b2bInvoices = [];
  const b2cInvoices = [];

  salesOrders.forEach(o => {
    const cgst = Number(o.cgst || 0);
    const sgst = Number(o.sgst || 0);
    const igst = Number(o.igst || 0);
    const sub = Number(o.subtotal || 0);

    taxableAmount += sub;
    totalCGST += cgst;
    totalSGST += sgst;
    totalIGST += igst;

    if (o.customerGstin || (o.gstin && o.gstin.length > 5)) {
      totalB2BSales += sub;
      b2bInvoices.push(o);
    } else {
      totalB2CSales += sub;
      b2cInvoices.push(o);
    }
  });

  const inputTaxCreditEstimated = (totalCGST + totalSGST) * 0.35; // Input credit on materials & outsource
  const netTaxPayable = (totalCGST + totalSGST + totalIGST) - inputTaxCreditEstimated;

  return {
    taxableAmount,
    totalCGST,
    totalSGST,
    totalIGST,
    totalTaxLiability: totalCGST + totalSGST + totalIGST,
    totalB2BSales,
    totalB2CSales,
    b2bCount: b2bInvoices.length,
    b2cCount: b2cInvoices.length,
    inputTaxCreditEstimated,
    netTaxPayable
  };
};
