import React, { useState, useEffect } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { FollowUpsDrawer } from './components/modals/FollowUpsDrawer';
import { MobileBottomNav } from './components/layout/MobileBottomNav';

import { DashboardView } from './views/DashboardView';
import { SalesOrdersView } from './views/SalesOrdersView';
import { CustomersView } from './views/CustomersView';
import { EmployeesView } from './views/EmployeesView';
import { SalesPersonsView } from './views/SalesPersonsView';
import CareOfManagementView from './views/CareOfManagementView';
import { HRManagementView } from './views/HRManagementView';
import { ProductsView } from './views/ProductsView';
import { DesignersView } from './views/DesignersView';
import { ProductionView } from './views/ProductionView';
import { OutsourceVendorsView } from './views/OutsourceVendorsView';
import { PaymentsView } from './views/PaymentsView';
import { PurchaseView } from './views/PurchaseView';
import { InventoryView } from './views/InventoryView';
import { DeliveryView } from './views/DeliveryView';
import { GSTInvoicingView } from './views/GSTInvoicingView';
import { SalesOrderAuditView } from './views/SalesOrderAuditView';
import { ReportsView } from './views/ReportsView';
import { AccountsView } from './views/AccountsView';
import { UserManagementView } from './views/UserManagementView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { Loader } from 'lucide-react';

import ErrorBoundary from './components/common/ErrorBoundary';

const ACCOUNTS_SUB_ITEMS = [
  'accounts', 'accounts-dashboard', 'accounts-daily', 'cash-book', 'bank-book', 'day-book',
  'general-ledger', 'journal-entries', 'party-ledger', 'party-statement', 'party-pending',
  'outstanding-receivables', 'outstanding-payables', 'future-transactions', 'cheque-clearance',
  'bank-statement', 'bank-reconciliation', 'cash-flow', 'income-statement', 'trial-balance',
  'balance-sheet', 'gst-e-filing', 'tax-summary', 'payment-receipt', 'payment-entry',
  'expense-entry', 'income-entry', 'contra-entry', 'debit-note', 'credit-note'
];

const MainAppContent = () => {
  const { activeRole, session, loading } = useERP();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salesOrderParams, setSalesOrderParams] = useState({ create: false, selectId: null });
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('erp_sidebar_collapsed_desktop') === 'true';
  });

  const handleToggleCollapsed = (val) => {
    const nextVal = typeof val === 'boolean' ? val : !isCollapsed;
    setIsCollapsed(nextVal);
    localStorage.setItem('erp_sidebar_collapsed_desktop', String(nextVal));
  };

  // Handle cross-module navigation helper
  const handleNavigate = (tab, params = {}) => {
    if (tab === 'quotations') {
      setActiveTab('sales-orders');
      setSalesOrderParams({ create: false, selectId: null, initialType: 'Quotation', ...params });
    } else {
      setActiveTab(tab);
      if (tab === 'sales-orders') {
        setSalesOrderParams(params);
      }
    }
  };

  // Auto-switch primary tab based on Role Context
  useEffect(() => {
    if (activeRole === 'Designer') {
      setActiveTab('designers');
    } else if (activeRole === 'Production') {
      setActiveTab('production');
    } else if (activeRole === 'Delivery') {
      setActiveTab('delivery');
    } else if (activeRole === 'Accounts') {
      setActiveTab('payments');
    }
  }, [activeRole]);

  // Keyboard Alt+N listener for New Sales Order
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNavigate('sales-orders', { create: true });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Event listener for global search & customer action navigation
  useEffect(() => {
    const handleOrderNav = (e) => {
      handleNavigate('sales-orders', { selectId: e.detail });
    };
    const handleOrderCreateNav = (e) => {
      const { type, customer } = e.detail || {};
      handleNavigate('sales-orders', { create: true, initialType: type || 'Direct', initialCust: customer || null });
    };

    const handleAuditNav = () => {
      handleNavigate('sales-order-audit');
    };

    window.addEventListener('ERP_NAVIGATE_ORDER', handleOrderNav);
    window.addEventListener('ERP_NAVIGATE_ORDER_CREATE', handleOrderCreateNav);
    window.addEventListener('ERP_NAVIGATE_AUDIT', handleAuditNav);
    return () => {
      window.removeEventListener('ERP_NAVIGATE_ORDER', handleOrderNav);
      window.removeEventListener('ERP_NAVIGATE_ORDER_CREATE', handleOrderCreateNav);
      window.removeEventListener('ERP_NAVIGATE_AUDIT', handleAuditNav);
    };
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: '#0f172a',
        color: '#ffffff',
        gap: '1rem'
      }}>
        <Loader size={48} className="animate-spin" style={{ color: '#3b82f6' }} />
        <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '0.5px' }}>Loading ScreenArts ERP...</span>
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div className={`app-shell ${isCollapsed ? 'sidebar-is-collapsed' : ''}`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => handleNavigate(tab)}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={handleToggleCollapsed}
      />
      <div className="main-content">
        <Header
          onNewOrderClick={(type = 'Direct') => handleNavigate('sales-orders', { create: true, initialType: type })}
          onNewQuotationClick={() => handleNavigate('sales-orders', { create: true, initialType: 'Quotation' })}
          onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
        />
        <main style={{ flex: 1, paddingBottom: '3rem' }}>
          <ErrorBoundary key={activeTab}>
            {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
            {activeTab === 'sales-orders' && (
              <SalesOrdersView
                key={`${salesOrderParams.create}-${salesOrderParams.selectId}-${salesOrderParams.initialType}-${salesOrderParams.initialCust?.id}`}
                initialCreate={salesOrderParams.create}
                initialSelectId={salesOrderParams.selectId}
                initialType={salesOrderParams.initialType || 'Direct'}
                initialCust={salesOrderParams.initialCust || null}
                onNavigate={handleNavigate}
              />
            )}
            {activeTab === 'customers' && <CustomersView onNavigate={handleNavigate} />}
            {activeTab === 'employees' && <EmployeesView />}
            {activeTab === 'sales-persons' && <SalesPersonsView />}
            {activeTab === 'care-of-persons' && <CareOfManagementView />}
            {(activeTab === 'hr-payroll' || activeTab === 'attendance') && <HRManagementView />}
            {activeTab === 'products' && <ProductsView />}
            {activeTab === 'designers' && <DesignersView />}
            {activeTab === 'production' && <ProductionView />}
            {activeTab === 'vendors' && <OutsourceVendorsView />}
            {activeTab === 'payments' && <PaymentsView />}
            {activeTab === 'purchase' && <PurchaseView />}
            {activeTab === 'inventory' && <InventoryView />}
            {activeTab === 'delivery' && <DeliveryView />}
            {activeTab === 'gst-invoicing' && <GSTInvoicingView />}
            {(activeTab === 'sales-order-audit' || activeTab === 'report-order-audit') && (
              <SalesOrderAuditView onNavigate={handleNavigate} />
            )}
            {(activeTab === 'reports' || (activeTab.startsWith('report-') && activeTab !== 'report-order-audit')) && (
              <ReportsView key={activeTab} initialReportKey={activeTab} />
            )}
            {ACCOUNTS_SUB_ITEMS.includes(activeTab) && <AccountsView key={activeTab} initialTab={activeTab} />}
            {activeTab === 'user-management' && <UserManagementView />}
            {activeTab === 'settings' && <SettingsView />}
          </ErrorBoundary>
        </main>
      </div>

      <GlobalSearchModal />
      <FollowUpsDrawer />
      <MobileBottomNav
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenMenu={() => setIsMobileOpen(true)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary title="ScreenArts ERP System Recovered">
      <ERPProvider>
        <MainAppContent />
      </ERPProvider>
    </ErrorBoundary>
  );
}
