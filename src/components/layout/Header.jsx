import React from 'react';
import { useERP } from '../../context/ERPContext';
import { USER_ROLES } from '../../types';
import { Search, Bell, Plus, UserCheck, Shield, ChevronDown, Printer, RotateCcw, LogOut } from 'lucide-react';
import { supabase } from '../../utils/supabase';

export const Header = ({ onNewOrderClick }) => {
  const {
    companyProfile,
    activeRole,
    activeUser,
    switchRole,
    setIsSearchOpen,
    followUps,
    setIsFollowUpsOpen,
    resetDemoData
  } = useERP();

  const pendingFollowupsCount = followUps.filter((f) => f.status === 'Pending').length;

  return (
    <header className="header-bar" style={{
      height: '60px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Left: Global Search Launcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '500px' }}>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="btn-secondary"
          style={{
            width: '100%',
            justifyContent: 'space-between',
            padding: '0.45rem 0.85rem',
            backgroundColor: '#f8fafc',
            borderColor: '#cbd5e1',
            color: '#64748b',
            fontSize: '0.85rem',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Search size={16} color="#3b82f6" />
            <span>Search SO#, Mobile, Customer, Invoice, Product...</span>
          </div>
          <kbd style={{
            background: '#e2e8f0',
            color: '#334155',
            padding: '0.15rem 0.4rem',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontWeight: 700
          }}>Ctrl + K</kbd>
        </button>
      </div>

      {/* Right Actions: Quick Order, Follow-ups, User Role Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Quick New Order Button */}
        <button
          onClick={onNewOrderClick}
          className="btn btn-primary btn-sm"
          style={{ height: '36px', px: '1rem' }}
        >
          <Plus size={16} />
          <span>New Sales Order</span>
          <span style={{ opacity: 0.7, fontSize: '0.7rem', marginLeft: '0.2rem' }}>(Alt+N)</span>
        </button>

        {/* Follow-ups Trigger */}
        <button
          onClick={() => setIsFollowUpsOpen(true)}
          className="btn btn-secondary btn-icon"
          style={{ position: 'relative', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Action Follow-ups"
        >
          <Bell size={18} color="#475569" />
          {pendingFollowupsCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#f43f5e',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 800,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff'
            }}>
              {pendingFollowupsCount}
            </span>
          )}
        </button>

        {/* User Role Switcher Dropdown */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid #cbd5e1' }}>
          <Shield size={16} color="#1d4ed8" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600, lineHeight: 1 }}>Role Context</span>
            <select
              value={activeRole}
              onChange={(e) => switchRole(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer',
                outline: 'none',
                paddingRight: '0.5rem'
              }}
            >
              {Object.values(USER_ROLES).map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Reset Demo Data */}
        <button
          onClick={async () => {
            if (window.confirm('Reset all Supabase database records back to fresh sample state?')) {
              await resetDemoData();
              alert('Database resetted successfully.');
            }
          }}
          className="btn btn-secondary btn-icon"
          style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}
          title="Reset Database Demo Data"
        >
          <RotateCcw size={16} />
        </button>

        {/* Logout Button */}
        <button
          onClick={async () => {
            if (window.confirm('Are you sure you want to sign out?')) {
              await supabase.auth.signOut();
            }
          }}
          className="btn btn-secondary btn-icon"
          style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          title="Sign Out"
        >
          <LogOut size={16} />
        </button>

        {/* Company Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          paddingLeft: '0.5rem',
          borderLeft: '1px solid var(--border-light)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.85rem'
          }}>
            SA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.1 }}>
              {companyProfile.name.split(' ')[0]} ERP
            </span>
            <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 600 }}>● Online Cloud</span>
          </div>
        </div>
      </div>
    </header>
  );
};
