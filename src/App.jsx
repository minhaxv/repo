import React, { useState, useEffect } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';
import { FollowUpsDrawer } from './components/modals/FollowUpsDrawer';

import { DashboardView } from './views/DashboardView';
import { SalesOrdersView } from './views/SalesOrdersView';
import { CustomersView } from './views/CustomersView';
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
import { ReportsView } from './views/ReportsView';
import { UserManagementView } from './views/UserManagementView';
import { SettingsView } from './views/SettingsView';
import { LoginView } from './views/LoginView';
import { Loader } from 'lucide-react';

const MainAppContent = () => {
  const { activeRole, session, loading } = useERP();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salesOrderParams, setSalesOrderParams] = useState({ create: false, selectId: null });

  // Handle cross-module navigation helper
  const handleNavigate = (tab, params = {}) => {
    setActiveTab(tab);
    if (tab === 'sales-orders') {
      setSalesOrderParams(params);
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

  // Event listener for global search navigation
  useEffect(() => {
    const handleOrderNav = (e) => {
      handleNavigate('sales-orders', { selectId: e.detail });
    };
    window.addEventListener('ERP_NAVIGATE_ORDER', handleOrderNav);
    return () => window.removeEventListener('ERP_NAVIGATE_ORDER', handleOrderNav);
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
    <div className="app-shell">
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => handleNavigate(tab)} />
      <div className="main-content">
        <Header onNewOrderClick={() => handleNavigate('sales-orders', { create: true })} />
        <main style={{ flex: 1, paddingBottom: '3rem' }}>
          {activeTab === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
          {activeTab === 'sales-orders' && (
            <SalesOrdersView
              key={`${salesOrderParams.create}-${salesOrderParams.selectId}-${Date.now()}`}
              initialCreate={salesOrderParams.create}
              initialSelectId={salesOrderParams.selectId}
            />
          )}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'sales-persons' && <SalesPersonsView />}
          {activeTab === 'care-of-persons' && <CareOfManagementView />}
          {activeTab === 'hr-payroll' && <HRManagementView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'designers' && <DesignersView />}
          {activeTab === 'production' && <ProductionView />}
          {activeTab === 'vendors' && <OutsourceVendorsView />}
          {activeTab === 'payments' && <PaymentsView />}
          {activeTab === 'purchase' && <PurchaseView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'delivery' && <DeliveryView />}
          {activeTab === 'gst-invoicing' && <GSTInvoicingView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'user-management' && <UserManagementView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      <GlobalSearchModal />
      <FollowUpsDrawer />
    </div>
  );
};

export default function App() {
  return (
    <ERPProvider>
      <MainAppContent />
    </ERPProvider>
  );
}
