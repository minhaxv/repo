import React, { useState, useRef, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { USER_ROLES } from '../../types';
import { Search, Bell, Plus, UserCheck, Users, Shield, ChevronDown, Printer, LogOut, Menu, Check } from 'lucide-react';
import { supabase } from '../../utils/supabase';

export const Header = ({ onNewOrderClick, onNewQuotationClick, onToggleMobileSidebar }) => {
  const {
    companyProfile,
    activeRole,
    activeUser,
    switchUser,
    switchRole,
    employees,
    setIsSearchOpen,
    followUps,
    setIsFollowUpsOpen,
    realtimeConnected,
    logoutUser
  } = useERP();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingFollowupsCount = followUps.filter((f) => f.status === 'Pending').length;

  // Compile all staff user accounts
  const allStaffUsers = React.useMemo(() => {
    const list = [...(employees || [])];
    if (!list.some(e => e.role === 'Admin' || (e.name || '').includes('Admin'))) {
      list.unshift({
        id: 'EMP-ADM-01',
        name: 'Minhaj V (Admin)',
        department: 'Management',
        designation: 'General Manager & Admin',
        role: 'Admin',
        mobile: '9820012345',
        email: 'admin@screenarts.in'
      });
    }
    return list;
  }, [employees]);

  // Group staff by operational functions
  const staffCategories = React.useMemo(() => [
    {
      label: '💼 Billing & Counter Sales Staff',
      color: '#1d4ed8',
      members: allStaffUsers.filter(e => e.department === 'Sales' || e.role === 'Sales' || e.department === 'Management' || e.role === 'Admin')
    },
    {
      label: '🖨️ Printing & Machine Operators',
      color: '#0284c7',
      members: allStaffUsers.filter(e => e.department === 'Printing' || (e.designation || '').toLowerCase().includes('flex') || (e.designation || '').toLowerCase().includes('print') || (e.notes || '').toLowerCase().includes('print'))
    },
    {
      label: '✂️ Finishing & Fabrication Staff',
      color: '#d97706',
      members: allStaffUsers.filter(e => (e.department === 'Production' && !(e.designation || '').toLowerCase().includes('print')) || (e.designation || '').toLowerCase().includes('fabricat') || (e.designation || '').toLowerCase().includes('laminat') || (e.designation || '').toLowerCase().includes('pack'))
    },
    {
      label: '🎨 Graphic Design & Pre-Press',
      color: '#7c3aed',
      members: allStaffUsers.filter(e => e.department === 'Design' || e.role === 'Designer')
    },
    {
      label: '🚚 Delivery & Logistics',
      color: '#059669',
      members: allStaffUsers.filter(e => e.department === 'Delivery' || e.role === 'Delivery')
    },
    {
      label: '💰 Accounts & Finance',
      color: '#0d9488',
      members: allStaffUsers.filter(e => e.department === 'Accounts' || e.role === 'Accounts')
    }
  ], [allStaffUsers]);

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
      {/* Left: Mobile Menu Trigger & Global Search Launcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '500px' }}>
        <button
          onClick={onToggleMobileSidebar}
          className="btn-secondary mobile-menu-trigger"
          style={{
            padding: '0.45rem',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#f8fafc',
            borderColor: '#cbd5e1',
            color: '#334155'
          }}
          title="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

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
            <span>Search SO#, QT#, Mobile, Customer, Invoice, Product...</span>
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

      {/* Right Actions: Quick Order, Follow-ups, Staff User Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Real-time SSE Live Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: realtimeConnected ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${realtimeConnected ? '#10b981' : '#f87171'}`,
          fontSize: '0.75rem',
          fontWeight: 700,
          color: realtimeConnected ? '#065f46' : '#991b1b'
        }} title={realtimeConnected ? 'Real-Time Sync Active (Instant Multi-User Factory Updates via SSE)' : 'Connecting to Factory Event Stream...'}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: realtimeConnected ? '#10b981' : '#ef4444',
            boxShadow: realtimeConnected ? '0 0 8px #10b981' : 'none',
            display: 'inline-block'
          }} />
          <span>{realtimeConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
        </div>

        {/* Quick New Order Button */}
        <button
          onClick={() => onNewOrderClick && onNewOrderClick('Direct')}
          className="btn btn-primary btn-sm"
          style={{ height: '36px', px: '0.85rem' }}
          title="Direct Sales Order (Workflow 1)"
        >
          <Plus size={15} />
          <span>New Sales Order</span>
        </button>

        {/* Quick New Quotation Button */}
        <button
          onClick={() => onNewQuotationClick ? onNewQuotationClick() : onNewOrderClick && onNewOrderClick('Quotation')}
          className="btn btn-sm"
          style={{ height: '36px', px: '0.85rem', background: '#f59e0b', color: '#ffffff', fontWeight: 700, border: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          title="Create Optional Quotation (Workflow 2)"
        >
          <Plus size={15} />
          <span>New Quotation</span>
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

        {/* Staff User Account Switcher Dropdown */}
        <div ref={userMenuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.55rem',
              background: '#f8fafc',
              border: isUserMenuOpen ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.25rem 0.65rem 0.25rem 0.35rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              boxShadow: isUserMenuOpen ? '0 0 0 3px rgba(37, 99, 235, 0.15)' : 'none'
            }}
            title="Click to Switch Staff Account (Billing, Printing, Finishing, Design, Accounts)"
          >
            {/* Avatar */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: activeUser?.role === 'Admin' ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' :
                          activeUser?.department === 'Printing' ? 'linear-gradient(135deg, #0284c7, #06b6d4)' :
                          activeUser?.department === 'Design' ? 'linear-gradient(135deg, #ec4899, #f43f5e)' :
                          activeUser?.department === 'Accounts' ? 'linear-gradient(135deg, #059669, #10b981)' :
                          'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.78rem',
              overflow: 'hidden',
              border: '1.5px solid #ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {activeUser?.photo ? (
                <img src={activeUser.photo} alt={activeUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (activeUser?.name || 'A').charAt(0).toUpperCase()
              )}
            </div>

            {/* Text details */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeUser?.name || 'Authorized Staff'}
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  background: '#dbeafe',
                  color: '#1e40af',
                  padding: '0.05rem 0.35rem',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap'
                }}>
                  {activeUser?.department || activeUser?.role || 'Staff'}
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, lineHeight: 1 }}>
                {activeUser?.designation || `${activeRole} Context`}
              </span>
            </div>

            <ChevronDown size={14} color="#64748b" style={{ transform: isUserMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
          </button>

          {/* Dropdown Menu Modal */}
          {isUserMenuOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              width: '330px',
              maxHeight: '480px',
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              zIndex: 100,
              padding: '0.5rem'
            }}>
              {/* Dropdown Header */}
              <div style={{ padding: '0.4rem 0.6rem 0.6rem 0.6rem', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={14} color="#2563eb" /> Switch Staff User Account
                  </div>
                  <span style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#64748b', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                    {allStaffUsers.length} Staff
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                  Orders created will record this staff member as <strong>Billed Staff</strong>.
                </div>
              </div>

              {/* Grouped Staff Accounts */}
              <div style={{ padding: '0.3rem 0' }}>
                {staffCategories.map(cat => {
                  if (!cat.members || cat.members.length === 0) return null;
                  return (
                    <div key={cat.label} style={{ marginBottom: '0.5rem' }}>
                      <div style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: cat.color,
                        padding: '0.3rem 0.6rem 0.15rem 0.6rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {cat.label}
                      </div>

                      {cat.members.map(member => {
                        const isActive = (activeUser?.id && activeUser.id === member.id) || (activeUser?.name === member.name);
                        return (
                          <div
                            key={member.id || member.name}
                            onClick={() => {
                              switchUser(member);
                              setIsUserMenuOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.45rem 0.6rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              background: isActive ? '#eff6ff' : 'transparent',
                              border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                              margin: '2px 0',
                              transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc';
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: member.role === 'Admin' ? '#4f46e5' : cat.color,
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.72rem',
                                overflow: 'hidden'
                              }}>
                                {member.photo ? (
                                  <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  (member.name || 'S').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: isActive ? 800 : 600, color: '#0f172a' }}>
                                  {member.name}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                  {member.designation || member.department || member.role}
                                </div>
                              </div>
                            </div>

                            {isActive && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                                background: '#2563eb',
                                color: '#ffffff',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                padding: '0.15rem 0.4rem',
                                borderRadius: '4px'
                              }}>
                                <Check size={11} strokeWidth={3} /> Active
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Quick Role Context Override Footer */}
              <div style={{
                marginTop: '0.4rem',
                padding: '0.5rem 0.6rem',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Shield size={14} color="#1d4ed8" />
                  <span style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>Role Context:</span>
                </div>
                <select
                  value={activeRole}
                  onChange={(e) => {
                    switchRole(e.target.value);
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    padding: '0.15rem 0.35rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {Object.values(USER_ROLES).map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={async () => {
            if (window.confirm('Are you sure you want to sign out?')) {
              if (logoutUser) logoutUser();
              try { await supabase.auth.signOut(); } catch(e){}
            }
          }}
          className="btn btn-secondary btn-icon"
          style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          title="Sign Out / Switch Station"
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
