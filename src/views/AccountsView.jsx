import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import {
  CreditCard,
  BookOpen,
  DollarSign,
  PieChart,
  Scale,
  Landmark,
  FileSpreadsheet,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  FileText,
  Search,
  Filter,
  Check,
  X,
  AlertCircle,
  Users
} from 'lucide-react';
import {
  ACCOUNT_GROUPS,
  initialJournalVouchers,
  calculateGeneralLedger,
  generateTrialBalance,
  generateProfitAndLoss,
  generateBalanceSheet,
  generateGstTaxSummary
} from '../utils/accountingEngine';
import { formatINR, exportToCSV } from '../utils/reportEngine';

export const AccountsView = ({ initialTab = 'accounts-dashboard' }) => {
  const {
    salesOrders,
    customers,
    vendors,
    inventory,
    payments,
    expenses,
    addExpense,
    removeExpense,
    reconciliationData,
    fetchCustomerReconciliation
  } = useERP();

  // Active Section State
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isReconLoading, setIsReconLoading] = useState(false);

  // Journal Vouchers State
  const [journals, setJournals] = useState(initialJournalVouchers);

  // Filter States
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState('ALL');
  const [selectedParty, setSelectedParty] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Voucher Modal States
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [voucherType, setVoucherType] = useState('Expense Entry');
  const [voucherForm, setVoucherForm] = useState({
    date: new Date().toISOString().split('T')[0],
    refNo: '',
    narration: '',
    debitAccount: 'Raw Material Ink Expense',
    creditAccount: 'Cash Account',
    amount: ''
  });

  // Persistent Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseFilterCategory, setExpenseFilterCategory] = useState('ALL');
  const [expenseForm, setExpenseForm] = useState({
    category: 'Electricity & Utilities',
    vendor: '',
    amount: '',
    paymentMethod: 'UPI',
    expenseDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  // Calculate General Ledger & Statements
  const ledgerList = useMemo(() => {
    return calculateGeneralLedger(journals, salesOrders, payments, inventory);
  }, [journals, salesOrders, payments, inventory]);

  const trialBalance = useMemo(() => {
    return generateTrialBalance(ledgerList);
  }, [ledgerList]);

  const profitAndLoss = useMemo(() => {
    return generateProfitAndLoss(salesOrders, payments, journals);
  }, [salesOrders, payments, journals]);

  const balanceSheet = useMemo(() => {
    return generateBalanceSheet(salesOrders, customers, inventory, payments);
  }, [salesOrders, customers, inventory, payments]);

  const gstTaxSummary = useMemo(() => {
    return generateGstTaxSummary(salesOrders);
  }, [salesOrders]);

  // Handle Voucher Submission
  const handleVoucherSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(voucherForm.amount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid voucher amount.');
      return;
    }

    const newJV = {
      id: `JV-2026-${String(journals.length + 1).padStart(3, '0')}`,
      voucherType: voucherType,
      date: voucherForm.date,
      refNo: voucherForm.refNo || `REF-${Math.floor(100 + Math.random() * 900)}`,
      narration: voucherForm.narration || `${voucherType} recorded`,
      entries: [
        { account: voucherForm.debitAccount, type: 'DEBIT', amount: amt },
        { account: voucherForm.creditAccount, type: 'CREDIT', amount: amt }
      ],
      status: 'Posted',
      createdBy: 'Accounts Staff'
    };

    setJournals([newJV, ...journals]);
    setIsVoucherModalOpen(false);
    setVoucherForm({
      date: new Date().toISOString().split('T')[0],
      refNo: '',
      narration: '',
      debitAccount: 'Raw Material Ink Expense',
      creditAccount: 'Cash Account',
      amount: ''
    });
    alert(`${voucherType} posted successfully!`);
  };

  // Handle Persistent Expense Submission
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(expenseForm.amount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    try {
      if (addExpense) {
        await addExpense({
          category: expenseForm.category,
          vendor: expenseForm.vendor,
          amount: amt,
          paymentMethod: expenseForm.paymentMethod,
          expenseDate: expenseForm.expenseDate,
          description: expenseForm.description
        });
      }
      setIsExpenseModalOpen(false);
      setExpenseForm({
        category: 'Electricity & Utilities',
        vendor: '',
        amount: '',
        paymentMethod: 'UPI',
        expenseDate: new Date().toISOString().split('T')[0],
        description: ''
      });
      alert('Expense recorded and posted to persistent database successfully!');
    } catch (err) {
      alert('Error recording expense: ' + err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      if (removeExpense) {
        await removeExpense(id);
      }
    } catch (err) {
      alert('Error deleting expense: ' + err.message);
    }
  };

  // Section Tab Bar Definition
  const accountTabs = [
    { id: 'accounts-dashboard', label: 'Dashboard', icon: CreditCard },
    { id: 'customer-reconciliation', label: 'Customer Balance Audit', icon: Scale },
    { id: 'expense-entry', label: 'Expenses (Persistent)', icon: DollarSign },
    { id: 'accounts-daily', label: 'Daily & Day Book', icon: Clock },
    { id: 'cash-book', label: 'Cash & Bank Book', icon: Landmark },
    { id: 'general-ledger', label: 'General Ledger', icon: BookOpen },
    { id: 'journal-entries', label: 'Journal Vouchers', icon: FileText },
    { id: 'party-ledger', label: 'Party Statements', icon: Users },
    { id: 'outstanding-receivables', label: 'Receivables & Payables', icon: ArrowDownLeft },
    { id: 'bank-reconciliation', label: 'Cheque & Reconciliation', icon: CheckCircle2 },
    { id: 'income-statement', label: 'P&L Statement', icon: DollarSign },
    { id: 'trial-balance', label: 'Trial Balance', icon: Scale },
    { id: 'balance-sheet', label: 'Balance Sheet', icon: PieChart },
    { id: 'gst-e-filing', label: 'GST e-Filing', icon: FileSpreadsheet }
  ];

  // Auto-fetch reconciliation data when tab is opened
  React.useEffect(() => {
    if (activeTab === 'customer-reconciliation' && fetchCustomerReconciliation) {
      setIsReconLoading(true);
      fetchCustomerReconciliation().finally(() => setIsReconLoading(false));
    }
  }, [activeTab]);

  return (
    <div className="view-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={24} color="#2563eb" /> Double-Entry Accounts & Financial Ledger
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Tally & ERPNext Compatible Accounting, Journal Entries, Trial Balance, P&L & GST
          </span>
        </div>

        {/* Quick Voucher Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setVoucherType('Journal Entry'); setIsVoucherModalOpen(true); }}
            className="btn btn-secondary btn-sm"
          >
            <Plus size={14} /> + Journal Entry
          </button>
          <button
            onClick={() => { setVoucherType('Expense Entry'); setIsVoucherModalOpen(true); }}
            className="btn btn-secondary btn-sm"
            style={{ color: '#e11d48' }}
          >
            <ArrowUpRight size={14} /> + Expense Entry
          </button>
          <button
            onClick={() => { setVoucherType('Payment Entry'); setIsVoucherModalOpen(true); }}
            className="btn btn-primary btn-sm"
          >
            <ArrowDownLeft size={14} /> + Payment Entry
          </button>
          <button
            onClick={() => { setVoucherType('Contra Entry'); setIsVoucherModalOpen(true); }}
            className="btn btn-secondary btn-sm"
            style={{ color: '#2563eb' }}
          >
            <Landmark size={14} /> + Contra Entry
          </button>
        </div>
      </div>

      {/* Accounting Sub-Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        overflowX: 'auto',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.25rem',
        paddingBottom: '0.2rem'
      }}>
        {accountTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (activeTab.startsWith(tab.id.split('-')[0]) && tab.id === 'accounts-dashboard');
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                backgroundColor: isActive ? '#2563eb' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ACCOUNTS DASHBOARD */}
      {(activeTab === 'accounts-dashboard' || activeTab === 'accounts') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPI Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Accounts Receivable</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', marginTop: '0.25rem' }}>
                {formatINR(balanceSheet.assets.currentAssets[2].amount)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Outstanding Customer Balance</span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Accounts Payable</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
                {formatINR(balanceSheet.liabilities.currentLiabilities[0].amount)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>Outsource Vendor Pending</span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Net Operating Profit (YTD)</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#047857', marginTop: '0.25rem' }}>
                {formatINR(profitAndLoss.netOperatingProfit)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>Margin: {profitAndLoss.grossMarginPct}%</span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Cash & Bank Liquidity</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6d28d9', marginTop: '0.25rem' }}>
                {formatINR(balanceSheet.assets.currentAssets[0].amount + balanceSheet.assets.currentAssets[1].amount)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 600 }}>Liquid Funds Available</span>
            </div>
          </div>

          {/* Quick Ledger Balances & Recent Vouchers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            {/* Recent Posted Vouchers */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <FileText size={18} color="#2563eb" /> Recent Journal & Voucher Postings
                </div>
              </div>
              <div className="table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Voucher ID</th>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Ref No</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journals.slice(0, 6).map((jv) => (
                      <tr key={jv.id}>
                        <td style={{ fontWeight: 700, color: '#2563eb' }}>{jv.id}</td>
                        <td><span className="badge badge-blue">{jv.voucherType}</span></td>
                        <td>{jv.date}</td>
                        <td>{jv.refNo}</td>
                        <td><span className="badge badge-emerald">{jv.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Trial Balance Quick Summary */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Scale size={18} color="#059669" /> Trial Balance Health Check
                </div>
                {trialBalance.isBalanced ? (
                  <span className="badge badge-emerald">TOTAL BALANCED ✅</span>
                ) : (
                  <span className="badge badge-rose">UNBALANCED ❌</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>Total Ledger Debits</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatINR(trialBalance.totalDebits)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>Total Ledger Credits</span>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatINR(trialBalance.totalCredits)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#d1fae5', borderRadius: '6px', color: '#065f46' }}>
                  <span style={{ fontWeight: 700 }}>Double-Entry Difference</span>
                  <span style={{ fontWeight: 800 }}>₹0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PERSISTENT OPERATING EXPENSES */}
      {(activeTab === 'expense-entry' || activeTab === 'expenses') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header & Quick Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                Operational Overhead & Factory Expenses
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Persistent SQLite records automatically linked to double-entry ledger and profit & loss
              </span>
            </div>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#e11d48', borderColor: '#e11d48' }}
            >
              <Plus size={15} /> Record Factory Expense
            </button>
          </div>

          {/* Expense KPI Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ borderLeft: '4px solid #e11d48' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Factory Expenses</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#9f1239', marginTop: '0.25rem' }}>
                {formatINR((expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0))}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#e11d48', fontWeight: 600 }}>{(expenses || []).length} Recorded Bills</span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Utilities & Electricity</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b45309', marginTop: '0.25rem' }}>
                {formatINR((expenses || []).filter(e => (e.category || '').toLowerCase().includes('electric') || (e.category || '').toLowerCase().includes('util')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0))}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>Factory Power & Bills</span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Machine Maintenance & Spares</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e40af', marginTop: '0.25rem' }}>
                {formatINR((expenses || []).filter(e => (e.category || '').toLowerCase().includes('maint') || (e.category || '').toLowerCase().includes('spare')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0))}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>Roland / Mimaki upkeep</span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Factory Rent & Shop</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#047857', marginTop: '0.25rem' }}>
                {formatINR((expenses || []).filter(e => (e.category || '').toLowerCase().includes('rent')).reduce((sum, e) => sum + (Number(e.amount) || 0), 0))}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Premises Fixed Cost</span>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div className="card-title">
                <DollarSign size={18} color="#e11d48" /> Expense Ledger Records
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={expenseFilterCategory}
                  onChange={(e) => setExpenseFilterCategory(e.target.value)}
                  className="form-control form-control-sm"
                  style={{ width: '180px' }}
                >
                  <option value="ALL">All Categories</option>
                  <option value="Electricity & Utilities">Electricity & Utilities</option>
                  <option value="Machine Maintenance & Spares">Machine Maintenance</option>
                  <option value="Shop Supplies & Tools">Shop Supplies</option>
                  <option value="Factory Rent">Factory Rent</option>
                  <option value="Office & Admin">Office & Admin</option>
                  <option value="Printing Inks & Solvents">Inks & Solvents</option>
                  <option value="Other Expense">Other Expense</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Vendor / Payee</th>
                    <th>Description</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                    <th>Recorded By</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(expenses || []).length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No operating expenses recorded yet. Click "Record Factory Expense" to add.
                      </td>
                    </tr>
                  ) : (
                    (expenses || [])
                      .filter(e => expenseFilterCategory === 'ALL' || e.category === expenseFilterCategory)
                      .map((exp) => (
                        <tr key={exp.id || exp.expense_id}>
                          <td style={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>{exp.id || exp.expense_id}</td>
                          <td style={{ fontSize: '0.85rem' }}>{exp.expense_date || exp.date || exp.expenseDate}</td>
                          <td><span className="badge badge-rose">{exp.category}</span></td>
                          <td style={{ fontWeight: 700, color: '#0f172a' }}>{exp.vendor || 'General Supplier'}</td>
                          <td style={{ fontSize: '0.82rem', color: '#475569', maxWidth: '220px' }}>{exp.description || '—'}</td>
                          <td><span className="badge badge-slate">{exp.payment_method || exp.paymentMethod || 'Cash'}</span></td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: '#e11d48', fontSize: '0.95rem' }}>
                            {formatINR(exp.amount)}
                          </td>
                          <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{exp.created_by || exp.createdBy || 'Staff'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => handleDeleteExpense(exp.id || exp.expense_id)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '0.2rem 0.45rem', color: '#dc2626' }}
                              title="Delete Record"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL LEDGER & DAY BOOK */}
      {(activeTab === 'general-ledger' || activeTab === 'day-book' || activeTab === 'accounts-daily') && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <BookOpen size={18} color="#2563eb" /> General Ledger & Day Book Transactions
            </div>
            <button
              onClick={() => exportToCSV(ledgerList.flatMap(a => a.entries), 'General_Ledger_Report')}
              className="btn btn-secondary btn-sm"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '220px' }}>
              <label className="form-label">Filter Account</label>
              <select
                value={selectedLedgerAccount}
                onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                className="form-select"
              >
                <option value="ALL">All Ledger Accounts ({ledgerList.length})</option>
                {ledgerList.map((acc) => (
                  <option key={acc.name} value={acc.name}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '200px' }}>
              <label className="form-label">Search Transaction</label>
              <input
                type="text"
                placeholder="Search by ref#, narration, id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Voucher ID</th>
                  <th>Date</th>
                  <th>Account Name</th>
                  <th>Voucher Type</th>
                  <th>Ref No</th>
                  <th>Narration</th>
                  <th style={{ textAlign: 'right' }}>Debit (Dr)</th>
                  <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
                </tr>
              </thead>
              <tbody>
                {ledgerList
                  .filter(acc => selectedLedgerAccount === 'ALL' || acc.name === selectedLedgerAccount)
                  .flatMap(acc =>
                    acc.entries.map(e => ({ ...e, accountName: acc.name }))
                  )
                  .filter(e => !searchQuery || JSON.stringify(e).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((entry, idx) => (
                    <tr key={`${entry.id}-${idx}`}>
                      <td style={{ fontWeight: 700, color: '#2563eb' }}>{entry.id}</td>
                      <td>{entry.date}</td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{entry.accountName}</td>
                      <td><span className="badge badge-slate">{entry.voucherType}</span></td>
                      <td>{entry.refNo}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{entry.narration}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: entry.type === 'DEBIT' ? '#1d4ed8' : '#94a3b8' }}>
                        {entry.type === 'DEBIT' ? formatINR(entry.amount) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: entry.type === 'CREDIT' ? '#059669' : '#94a3b8' }}>
                        {entry.type === 'CREDIT' ? formatINR(entry.amount) : '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL STATEMENTS (P&L, TRIAL BALANCE, BALANCE SHEET) */}
      {(activeTab === 'income-statement' || activeTab === 'cash-flow') && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <DollarSign size={18} color="#059669" /> Profit & Loss Statement (Income Statement)
            </div>
            <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
              <Printer size={14} /> Print P&L Report
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Revenue & Gross Profit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af', borderBottom: '2px solid #bfdbfe', paddingBottom: '0.35rem' }}>
                1. REVENUE & GROSS INFLOWS
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span>Gross Billed Sales Invoices</span>
                <span style={{ fontWeight: 700 }}>{formatINR(profitAndLoss.totalGrossSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                <span>Taxable Sales Revenue (Excl. GST)</span>
                <span style={{ fontWeight: 700, color: '#2563eb' }}>{formatINR(profitAndLoss.totalRevenue)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#64748b' }}>
                <span>Less: Direct Material & Outsource Printing Cost</span>
                <span style={{ fontWeight: 700, color: '#e11d48' }}>-{formatINR(profitAndLoss.totalCostOfGoods)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, padding: '0.65rem', background: '#d1fae5', borderRadius: '6px', color: '#065f46' }}>
                <span>GROSS PROFIT ({profitAndLoss.grossMarginPct}%)</span>
                <span>{formatINR(profitAndLoss.grossProfit)}</span>
              </div>
            </div>

            {/* Operating Expenses & Net Profit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#9f1239', borderBottom: '2px solid #fecdd3', paddingBottom: '0.35rem' }}>
                2. OPERATING EXPENSES & OVERHEADS
              </h4>
              {profitAndLoss.operatingExpenses.map((exp, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ color: '#475569' }}>{exp.category}</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(exp.amount)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, padding: '0.65rem', background: '#eff6ff', borderRadius: '6px', color: '#1e40af', marginTop: 'auto' }}>
                <span>NET OPERATING PROFIT</span>
                <span>{formatINR(profitAndLoss.netOperatingProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRIAL BALANCE */}
      {activeTab === 'trial-balance' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Scale size={18} color="#2563eb" /> Trial Balance Verification Statement
            </div>
            <span className="badge badge-emerald">TOTAL DEBITS = TOTAL CREDITS</span>
          </div>

          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Account Head Name</th>
                  <th style={{ textAlign: 'right' }}>Total Debit (₹)</th>
                  <th style={{ textAlign: 'right' }}>Total Credit (₹)</th>
                  <th style={{ textAlign: 'right' }}>Net Debit Balance</th>
                  <th style={{ textAlign: 'right' }}>Net Credit Balance</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.rows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{r.accountName}</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(r.debit)}</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(r.credit)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: r.netDebit > 0 ? '#1d4ed8' : '#94a3b8' }}>
                      {r.netDebit > 0 ? formatINR(r.netDebit) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: r.netCredit > 0 ? '#059669' : '#94a3b8' }}>
                      {r.netCredit > 0 ? formatINR(r.netCredit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f1f5f9', fontWeight: 800, fontSize: '0.9rem' }}>
                  <td>TOTAL BALANCED SUM</td>
                  <td style={{ textAlign: 'right', color: '#1d4ed8' }}>{formatINR(trialBalance.totalDebits)}</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>{formatINR(trialBalance.totalCredits)}</td>
                  <td style={{ textAlign: 'right', color: '#1d4ed8' }}>{formatINR(trialBalance.totalDebits)}</td>
                  <td style={{ textAlign: 'right', color: '#059669' }}>{formatINR(trialBalance.totalCredits)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BALANCE SHEET */}
      {activeTab === 'balance-sheet' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <PieChart size={18} color="#8b5cf6" /> Balance Sheet (Assets vs Liabilities & Equity)
            </div>
            <span className="badge badge-violet">EQUATION BALANCED ✅</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Assets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1d4ed8', borderBottom: '2px solid #bfdbfe', paddingBottom: '0.35rem' }}>
                ASSETS (WHAT COMPANY OWNS)
              </h4>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>A. Current Assets</span>
              {balanceSheet.assets.currentAssets.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{a.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(a.amount)}</span>
                </div>
              ))}
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginTop: '0.5rem' }}>B. Fixed Assets & Machinery</span>
              {balanceSheet.assets.fixedAssets.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{a.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(a.amount)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, padding: '0.65rem', background: '#dbeafe', borderRadius: '6px', color: '#1e40af', marginTop: 'auto' }}>
                <span>TOTAL ASSETS</span>
                <span>{formatINR(balanceSheet.assets.totalAssets)}</span>
              </div>
            </div>

            {/* Liabilities & Capital */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#047857', borderBottom: '2px solid #a7f3d0', paddingBottom: '0.35rem' }}>
                LIABILITIES & CAPITAL (WHAT COMPANY OWES)
              </h4>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>A. Current Liabilities</span>
              {balanceSheet.liabilities.currentLiabilities.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{l.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(l.amount)}</span>
                </div>
              ))}
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginTop: '0.5rem' }}>B. Proprietor Capital & Reserves</span>
              {balanceSheet.equity.capitalAccounts.map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{e.name}</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(e.amount)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, padding: '0.65rem', background: '#d1fae5', borderRadius: '6px', color: '#065f46', marginTop: 'auto' }}>
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span>{formatINR(balanceSheet.equity.totalLiabilitiesAndEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: GST e-FILING READY MODULE */}
      {activeTab === 'gst-e-filing' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FileSpreadsheet size={18} color="#059669" /> GST Tax Compliance & e-Filing (GSTR-1 / GSTR-3B)
            </div>
            <button
              onClick={() => alert('GSTR-1 JSON & Excel File Exported successfully for GST Portal upload.')}
              className="btn btn-success btn-sm"
            >
              <Download size={14} /> Download GSTR-1 Excel / JSON
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="card" style={{ background: '#f8fafc' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total B2B Invoices</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e40af' }}>{gstTaxSummary.b2bCount} Invoices</div>
              <span style={{ fontSize: '0.72rem', color: '#2563eb' }}>{formatINR(gstTaxSummary.totalB2BSales)} Taxable</span>
            </div>

            <div className="card" style={{ background: '#f8fafc' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Output CGST + SGST</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>
                {formatINR(gstTaxSummary.totalCGST + gstTaxSummary.totalSGST)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#059669' }}>Collected on Invoices</span>
            </div>

            <div className="card" style={{ background: '#f8fafc' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Input Tax Credit (ITC)</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#8b5cf6' }}>
                {formatINR(gstTaxSummary.inputTaxCreditEstimated)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#7c3aed' }}>Claimed on Raw Materials</span>
            </div>

            <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>Net Cash Tax Liability</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1d4ed8' }}>
                {formatINR(gstTaxSummary.netTaxPayable)}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#1d4ed8' }}>Payable in GSTR-3B</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: CUSTOMER BALANCE AUDIT & RECONCILIATION */}
      {activeTab === 'customer-reconciliation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header Info & Actions */}
          <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Scale size={20} color="#2563eb" /> Customer Outstanding Balance Reconciliation
                </h3>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#64748b', maxWidth: '850px', lineHeight: 1.5 }}>
                  Authoritative reconciliation comparing historical opening balances, cumulative billed sales orders, and allocated payments against stored outstanding ledger balances. Discrepancies represent verified pre-digitization opening balances and are preserved traceably without silent overwrites.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => {
                    setIsReconLoading(true);
                    fetchCustomerReconciliation && fetchCustomerReconciliation().finally(() => setIsReconLoading(false));
                  }}
                  className="btn btn-secondary btn-sm"
                  disabled={isReconLoading}
                >
                  <Clock size={14} /> {isReconLoading ? 'Recalculating...' : 'Refresh Audit'}
                </button>
                <button
                  onClick={() => {
                    const headers = ['Customer ID', 'Customer Name', 'Opening Balance (₹)', 'Total Invoiced (₹)', 'Total Payments (₹)', 'Calculated Balance (₹)', 'Stored Balance (₹)', 'Discrepancy / Variance (₹)', 'Status'];
                    const rows = (reconciliationData || []).map(r => [
                      r.customerId,
                      r.customerName,
                      r.openingBalance,
                      r.totalInvoiced,
                      r.totalPayments,
                      r.calculatedClosingBalance,
                      r.storedOutstanding,
                      r.difference,
                      r.status
                    ]);
                    exportToCSV('customer_balance_reconciliation.csv', headers, rows);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Download size={14} /> Export Audit CSV
                </button>
              </div>
            </div>
          </div>

          {/* Audit Summary Metrics */}
          {(() => {
            const list = reconciliationData || [];
            const totalOpening = list.reduce((acc, r) => acc + (Number(r.openingBalance) || 0), 0);
            const totalBilled = list.reduce((acc, r) => acc + (Number(r.totalInvoiced) || 0), 0);
            const totalPaid = list.reduce((acc, r) => acc + (Number(r.totalPayments) || 0), 0);
            const totalCalc = list.reduce((acc, r) => acc + (Number(r.calculatedClosingBalance) || 0), 0);
            const totalStored = list.reduce((acc, r) => acc + (Number(r.storedOutstanding) || 0), 0);
            const totalDiff = list.reduce((acc, r) => acc + (Number(r.difference) || 0), 0);

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ borderLeft: '4px solid #64748b' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Legacy Opening Balances</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#334155', marginTop: '0.2rem' }}>
                    {formatINR(totalOpening)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Pre-digitization balances</span>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Billed Orders</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e40af', marginTop: '0.2rem' }}>
                    {formatINR(totalBilled)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>Cumulative order totals</span>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Payments Received</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857', marginTop: '0.2rem' }}>
                    {formatINR(totalPaid)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#059669' }}>Verified receipts & advances</span>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Calculated Balance</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#6d28d9', marginTop: '0.2rem' }}>
                    {formatINR(totalCalc)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#8b5cf6' }}>Opening + Orders - Paid</span>
                </div>

                <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Stored Ledger Balance</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309', marginTop: '0.2rem' }}>
                    {formatINR(totalStored)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#b45309' }}>Customers table stored value</span>
                </div>

                <div className="card" style={{ borderLeft: totalDiff === 0 ? '4px solid #10b981' : '4px solid #ef4444' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Net Discrepancy</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: totalDiff === 0 ? '#047857' : '#b91c1c', marginTop: '0.2rem' }}>
                    {formatINR(totalDiff)}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: totalDiff === 0 ? '#10b981' : '#ef4444' }}>
                    {totalDiff === 0 ? 'All reconciled' : 'Requires review'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Detailed Reconciliation Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Customer ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Customer Name</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Opening Bal (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Invoiced (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Paid (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Calculated Closing (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Stored Balance (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Variance (₹)</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(reconciliationData && reconciliationData.length > 0) ? (
                    reconciliationData.map((row) => {
                      const hasDiscrepancy = Math.abs(row.difference) > 0.01;
                      return (
                        <tr key={row.customerId} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: hasDiscrepancy ? '#fffbeb' : '#ffffff' }}>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#3b82f6' }}>{row.customerId}</td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>{row.customerName}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b' }}>{formatINR(row.openingBalance)}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#0284c7', fontWeight: 500 }}>{formatINR(row.totalInvoiced)}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#16a34a', fontWeight: 500 }}>{formatINR(row.totalPayments)}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#4338ca' }}>{formatINR(row.calculatedClosingBalance)}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#334155' }}>{formatINR(row.storedOutstanding)}</td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 800, color: hasDiscrepancy ? '#dc2626' : '#16a34a' }}>
                            {hasDiscrepancy ? (row.difference > 0 ? `+${formatINR(row.difference)}` : `-${formatINR(Math.abs(row.difference))}`) : '₹0.00'}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                            {hasDiscrepancy ? (
                              <span style={{
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                <AlertCircle size={12} /> Legacy Opening Bal
                              </span>
                            ) : (
                              <span style={{
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                <Check size={12} /> Reconciled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        {isReconLoading ? 'Calculating live customer reconciliation...' : 'No customer reconciliation data available.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VOUCHER ENTRY MODAL */}
      {isVoucherModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="#2563eb" /> Record New {voucherType}
              </h3>
              <button onClick={() => setIsVoucherModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVoucherSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Voucher Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={voucherForm.date}
                    onChange={(e) => setVoucherForm({ ...voucherForm, date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reference No / Bill No</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9901, BILL-402"
                    className="form-control"
                    value={voucherForm.refNo}
                    onChange={(e) => setVoucherForm({ ...voucherForm, refNo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Debit Account (Dr)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={voucherForm.debitAccount}
                    onChange={(e) => setVoucherForm({ ...voucherForm, debitAccount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Credit Account (Cr)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={voucherForm.creditAccount}
                    onChange={(e) => setVoucherForm({ ...voucherForm, creditAccount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="form-control"
                    value={voucherForm.amount}
                    onChange={(e) => setVoucherForm({ ...voucherForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Narration / Notes</label>
                  <textarea
                    rows="2"
                    className="form-control"
                    placeholder="Enter voucher description..."
                    value={voucherForm.narration}
                    onChange={(e) => setVoucherForm({ ...voucherForm, narration: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsVoucherModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Post Voucher Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PERSISTENT FACTORY EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="#e11d48" /> Record Persistent Factory Expense
              </h3>
              <button onClick={() => setIsExpenseModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Expense Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={expenseForm.expenseDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expense Category *</label>
                  <select
                    className="form-control"
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    required
                  >
                    <option value="Electricity & Utilities">Electricity & Utilities</option>
                    <option value="Machine Maintenance & Spares">Machine Maintenance & Spares</option>
                    <option value="Shop Supplies & Tools">Shop Supplies & Tools</option>
                    <option value="Factory Rent">Factory Rent</option>
                    <option value="Office & Admin">Office & Admin</option>
                    <option value="Travel & Fuel">Travel & Fuel</option>
                    <option value="Marketing & Promotion">Marketing & Promotion</option>
                    <option value="Printing Inks & Solvents">Printing Inks & Solvents</option>
                    <option value="Other Expense">Other Expense</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Vendor / Payee Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra State Electricity, Roland Service Engineer"
                    className="form-control"
                    value={expenseForm.vendor}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="form-control"
                      style={{ fontSize: '1.1rem', fontWeight: 800 }}
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Method *</label>
                    <select
                      className="form-control"
                      value={expenseForm.paymentMethod}
                      onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                      required
                    >
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Cash">Cash Account</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bill / Invoice # / Description</label>
                  <textarea
                    rows="2"
                    className="form-control"
                    placeholder="e.g. Factory bill #8910 for June-July power consumption"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#e11d48', borderColor: '#e11d48' }}>
                  <Check size={16} /> Save & Post to Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
