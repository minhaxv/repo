import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Plus,
  Users,
  Grid,
  FileText,
  Palette,
  Printer,
  Sliders,
  Truck,
  CreditCard,
  Package,
  BarChart3,
  UserCheck,
  Settings,
  X,
  ExternalLink,
  ShieldAlert,
  Layers,
  Wrench
} from 'lucide-react';

export const MobileBottomNav = ({
  activeTab,
  onNavigate
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleNavClick = (tabId, params = {}) => {
    setIsDrawerOpen(false);
    onNavigate(tabId, params);
  };

  const moreMenuItems = [
    { id: 'quotations', label: 'Quotations', icon: FileText, color: '#f59e0b', params: { initialType: 'Quotation' } },
    { id: 'designers', label: 'Designing', icon: Palette, color: '#8b5cf6' },
    { id: 'production', label: 'Production', icon: Layers, color: '#3b82f6' },
    { id: 'production-print', label: 'Printing', icon: Printer, color: '#06b6d4', tabTarget: 'production' },
    { id: 'production-finish', label: 'Finishing', icon: Sliders, color: '#10b981', tabTarget: 'production' },
    { id: 'vendors', label: 'Outsourcing', icon: Wrench, color: '#d97706' },
    { id: 'delivery', label: 'Delivery', icon: Truck, color: '#10b981' },
    { id: 'payments', label: 'Payments', icon: CreditCard, color: '#059669' },
    { id: 'inventory', label: 'Inventory', icon: Package, color: '#6366f1' },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: '#3b82f6' },
    { id: 'employees', label: 'Employees', icon: Users, color: '#64748b' },
    { id: 'care-of-persons', label: 'Care Of Agents', icon: UserCheck, color: '#7c3aed' },
    { id: 'settings', label: 'Settings', icon: Settings, color: '#475569' }
  ];

  return (
    <>
      <nav className="mobile-bottom-nav">
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => handleNavClick('dashboard')}
          className={`mobile-bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          aria-label="Dashboard"
        >
          <div className="mobile-nav-icon-wrap">
            <LayoutDashboard size={20} />
          </div>
          <span className="mobile-nav-label">Dashboard</span>
        </button>

        {/* 2. Orders */}
        <button
          type="button"
          onClick={() => handleNavClick('sales-orders')}
          className={`mobile-bottom-nav-item ${activeTab === 'sales-orders' ? 'active' : ''}`}
          aria-label="Orders"
        >
          <div className="mobile-nav-icon-wrap">
            <ShoppingCart size={20} />
          </div>
          <span className="mobile-nav-label">Orders</span>
        </button>

        {/* 3. + NEW ORDER Prominent Center Action */}
        <button
          type="button"
          onClick={() => handleNavClick('sales-orders', { create: true })}
          className="mobile-bottom-nav-prominent-btn"
          aria-label="New Sales Order"
          title="Create New Order"
        >
          <div className="prominent-plus-circle">
            <Plus size={24} color="#ffffff" strokeWidth={2.8} />
          </div>
          <span className="prominent-label">New Order</span>
        </button>

        {/* 4. Customers */}
        <button
          type="button"
          onClick={() => handleNavClick('customers')}
          className={`mobile-bottom-nav-item ${activeTab === 'customers' ? 'active' : ''}`}
          aria-label="Customers"
        >
          <div className="mobile-nav-icon-wrap">
            <Users size={20} />
          </div>
          <span className="mobile-nav-label">Customers</span>
        </button>

        {/* 5. More */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className={`mobile-bottom-nav-item ${isDrawerOpen ? 'active' : ''}`}
          aria-label="More Navigation Modules"
        >
          <div className="mobile-nav-icon-wrap">
            <Grid size={20} />
          </div>
          <span className="mobile-nav-label">More</span>
        </button>
      </nav>

      {/* MOBILE MORE MENU DRAWER */}
      {isDrawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="mobile-drawer-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>ScreenArts Modules</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Quick access to printing & designing tools</div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="btn-icon"
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <div className="mobile-drawer-grid">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const target = item.tabTarget || item.id;
                const isActive = activeTab === target;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(target, item.params || {})}
                    className={`mobile-drawer-item ${isActive ? 'active' : ''}`}
                  >
                    <div className="mobile-drawer-icon" style={{ background: `${item.color}15`, color: item.color }}>
                      <Icon size={22} />
                    </div>
                    <span className="mobile-drawer-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
