import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  History,
  Menu,
  FileSpreadsheet
} from 'lucide-react';

export const MobileBottomNav = ({
  activeTab,
  onNavigate,
  onOpenMenu
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales-orders', label: 'Orders', icon: ShoppingCart },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'sales-order-audit', label: 'Audit Log', icon: History }
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id || (item.id === 'sales-orders' && activeTab === 'quotations');
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-label={item.label}
          >
            <div className="mobile-nav-icon-wrap">
              <Icon size={20} />
            </div>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenMenu}
        className="mobile-bottom-nav-item menu-trigger"
        aria-label="Open Full Navigation Menu"
      >
        <div className="mobile-nav-icon-wrap">
          <Menu size={20} />
        </div>
        <span className="mobile-nav-label">Menu</span>
      </button>
    </nav>
  );
};
