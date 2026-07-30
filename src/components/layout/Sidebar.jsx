import React from 'react';
import { useERP } from '../../context/ERPContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Palette,
  Factory,
  Building2,
  CreditCard,
  ShoppingBag,
  Boxes,
  Truck,
  FileText,
  BarChart3,
  UserCheck,
  TrendingUp,
  Calendar,
  Settings,
  Printer
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { activeRole } = useERP();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Sales', 'Designer', 'Production', 'Accounts', 'Delivery'] },
    { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart, highlight: true, roles: ['Admin', 'Manager', 'Sales', 'Designer', 'Accounts'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
    { id: 'sales-persons', label: 'Sales Persons', icon: TrendingUp, roles: ['Admin', 'Manager', 'Sales'] },
    { id: 'care-of-persons', label: 'Care Of Persons', icon: UserCheck, roles: ['Admin', 'Manager', 'Sales'] },
    { id: 'hr-payroll', label: 'HR & Payroll', icon: Calendar, roles: ['Admin', 'Manager'] },
    { id: 'products', label: 'Products Master', icon: Package, roles: ['Admin', 'Manager', 'Sales', 'Production', 'Designer'] },
    { id: 'designers', label: 'Designer & Proofing Queue', icon: Palette, roles: ['Admin', 'Manager', 'Designer'] },
    { id: 'production', label: 'Shop Floor & Printing Queue', icon: Factory, roles: ['Admin', 'Manager', 'Production'] },
    { id: 'vendors', label: 'Outsource Vendors', icon: Building2, roles: ['Admin', 'Manager', 'Production'] },
    { id: 'payments', label: 'Payments & Ledger', icon: CreditCard, roles: ['Admin', 'Manager', 'Accounts'] },
    { id: 'purchase', label: 'Purchase Orders', icon: ShoppingBag, roles: ['Admin', 'Manager', 'Production'] },
    { id: 'inventory', label: 'Inventory Stock', icon: Boxes, roles: ['Admin', 'Manager', 'Production'] },
    { id: 'delivery', label: 'Delivery & Dispatch', icon: Truck, roles: ['Admin', 'Manager', 'Delivery', 'Production'] },
    { id: 'gst-invoicing', label: 'GST Invoicing', icon: FileText, roles: ['Admin', 'Manager', 'Accounts'] },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['Admin', 'Manager'] },
    { id: 'user-management', label: 'User Management', icon: UserCheck, roles: ['Admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin'] }
  ];

  const visibleMenuItems = menuItems.filter((item) => !item.roles || item.roles.includes(activeRole));

  return (
    <aside style={{
      width: '240px',
      height: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #1e293b',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '1.25rem 1.25rem 1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff'
        }}>
          <Printer size={20} />
        </div>
        <div>
          <h1 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            ScreenArts<span style={{ color: '#60a5fa' }}>ERP</span>
          </h1>
          <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>
            Signage & Print Edition
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '0.75rem 0.6rem', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', padding: '0.5rem 0.6rem 0.25rem 0.6rem' }}>
          Main Modules
        </div>
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.55rem 0.75rem',
                marginBottom: '0.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#1e40af' : 'transparent',
                color: isActive ? '#ffffff' : '#94a3b8',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#1e293b';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon size={18} color={isActive ? '#60a5fa' : '#64748b'} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.highlight && !isActive && (
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: '0.85rem 1rem',
        borderTop: '1px solid #1e293b',
        backgroundColor: '#090d16',
        fontSize: '0.72rem',
        color: '#64748b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>v2.4 Production Cloud</span>
        <span style={{ background: '#1e293b', padding: '0.15rem 0.4rem', borderRadius: '4px', color: '#94a3b8' }}>INR ₹</span>
      </div>
    </aside>
  );
};
