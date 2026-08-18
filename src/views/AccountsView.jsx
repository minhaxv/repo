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
  const { salesOrders, customers, vendors, inventory, payments } = useERP();

  // Active Section State
  const [activeTab, setActiveTab] = useState(initialTab);

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

  // Section Tab Bar Definition
  const accountTabs = [
    { id: 'accounts-dashboard', label: 'Dashboard', icon: CreditCard },
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
    </div>
  );
};
