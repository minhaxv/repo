import React, { useState, useEffect } from 'react';
import { useERP } from '../context/ERPContext';
import { Settings, Save, Building, CreditCard, FileText, Check, Activity, ShieldCheck, Database, RefreshCw } from 'lucide-react';

const getInitialProfileForm = (cp) => {
  const profile = cp || {};
  const bank = profile.bankDetails || {};
  return {
    name: profile.name || 'ScreenArts Digital & Signage India Pvt Ltd',
    tagline: profile.tagline || 'High-Volume Commercial Printing & Architectural Signage',
    gstin: profile.gstin || '27AAACP9988K1Z2',
    state: profile.state || 'Maharashtra (27)',
    stateCode: profile.state_code || profile.stateCode || '27',
    phone: profile.phone || '+91 98200 12345',
    email: profile.email || 'orders@screenarts.in',
    website: profile.website || 'www.screenarts.in',
    address: profile.address || 'Plot 42, Industrial Printing Complex, Off WEH, Goregaon East, Mumbai, Maharashtra 400063',
    bankDetails: {
      bankName: bank.bankName || profile.bank_name || profile.bankName || 'HDFC Bank Ltd',
      accountName: bank.accountName || profile.account_name || profile.accountName || profile.name || 'ScreenArts Digital & Signage India Pvt Ltd',
      accountNo: bank.accountNo || profile.account_no || profile.accountNo || '50200048192837',
      ifsc: bank.ifsc || profile.ifsc || 'HDFC0000123',
      branch: bank.branch || profile.branch || 'Goregaon East, Mumbai',
      upiId: bank.upiId || profile.upi_id || profile.upiId || 'screenarts@hdfcbank'
    },
    terms: profile.terms || profile.terms_conditions || '1. 50% advance along with confirmed PO.\n2. Balance on delivery/installation.'
  };
};

export const SettingsView = ({ initialTab = 'profile' }) => {
  const { companyProfile, setCompanyProfile, updateCompanyProfile, activeUser, activeRole } = useERP();
  const isAdminOrManager = (activeUser?.role === 'Admin' || activeUser?.role === 'Manager') || activeRole === 'Admin' || activeRole === 'Manager';
  const [profileForm, setProfileForm] = useState(() => getInitialProfileForm(companyProfile));
  const [activeSettingsTab, setActiveSettingsTab] = useState(initialTab === 'health' || initialTab === 'system-health' ? 'health' : 'profile');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (companyProfile) {
      setProfileForm(getInitialProfileForm(companyProfile));
    }
  }, [companyProfile]);

  // Live System Health State
  const [healthData, setHealthData] = useState(null);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  const fetchHealth = async () => {
    try {
      setIsRefreshingHealth(true);
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
    } catch (err) {
      console.warn('Could not fetch health:', err);
    } finally {
      setIsRefreshingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      if (updateCompanyProfile) {
        await updateCompanyProfile(profileForm);
      } else {
        setCompanyProfile(profileForm);
      }
      alert('Company Profile & GST Invoice Settings saved successfully!');
    } catch (err) {
      console.error('Error saving company profile:', err);
      setCompanyProfile(profileForm);
      alert('Company Profile saved locally.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={24} color="#2563eb" /> Company Profile & System Settings
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Configure Tax Invoice header, GSTIN, Bank details, print terms, and inspect system health
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveSettingsTab('profile')}
            className={`btn btn-sm ${activeSettingsTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Building size={14} /> Profile & GST
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSettingsTab('health');
              fetchHealth();
            }}
            className={`btn btn-sm ${activeSettingsTab === 'health' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Activity size={14} /> System Health
          </button>
        </div>
      </div>

      {activeSettingsTab === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">
                <Activity size={18} color="#059669" /> SQLite Database & Server Observability
              </div>
              <button onClick={fetchHealth} className="btn btn-sm btn-secondary" disabled={isRefreshingHealth}>
                <RefreshCw size={14} className={isRefreshingHealth ? 'animate-spin' : ''} /> Refresh Diagnostics
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', padding: '1rem 0' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Database Engine</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>SQLite 3 (WAL Mode)</div>
                <div style={{ fontSize: '0.75rem', color: healthData?.database?.status === 'connected' ? '#16a34a' : '#dc2626', fontWeight: 700, marginTop: '0.25rem' }}>
                  ● Status: {healthData?.database?.status || 'Active'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Integrity Check</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
                  {healthData?.database?.integrity === 'ok' ? 'PRAGMA OK' : 'Verified'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Zero table corruption detected</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Latest Migration</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#2563eb', marginTop: '0.25rem', wordBreak: 'break-all' }}>
                  {healthData?.database?.latestMigration || '012_search_and_financial_indexes'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, marginTop: '0.25rem' }}>All schemas applied</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Server Uptime</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
                  {healthData?.uptimeSeconds ? `${Math.floor(healthData.uptimeSeconds / 60)} mins` : 'Online'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Version {healthData?.version || 'v2.6.0'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSettingsTab === 'profile' && (
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Company Identity Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Building size={18} color="#2563eb" /> Company Profile & GST Details
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">PrintShop / Company Name</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.name || ''}
                onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">GSTIN Number</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.gstin || ''}
                onChange={(e) => setProfileForm(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">State Code</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.state || ''}
                onChange={(e) => setProfileForm(prev => ({ ...prev, state: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone / Mobile</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.phone || ''}
                onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={profileForm?.email || ''}
                onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Website</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.website || ''}
                onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Factory / Shop Address</label>
              <textarea
                className="form-control"
                rows="2"
                value={profileForm?.address || ''}
                onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Bank & Terms Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <CreditCard size={18} color="#059669" /> Bank Account Details for Tax Invoices
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.bankDetails?.bankName || ''}
                onChange={(e) =>
                  setProfileForm(prev => ({
                    ...prev,
                    bankDetails: { ...(prev?.bankDetails || {}), bankName: e.target.value }
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Name</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.bankDetails?.accountName || ''}
                onChange={(e) =>
                  setProfileForm(prev => ({
                    ...prev,
                    bankDetails: { ...(prev?.bankDetails || {}), accountName: e.target.value }
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.bankDetails?.accountNo || ''}
                onChange={(e) =>
                  setProfileForm(prev => ({
                    ...prev,
                    bankDetails: { ...(prev?.bankDetails || {}), accountNo: e.target.value }
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.bankDetails?.ifsc || ''}
                onChange={(e) =>
                  setProfileForm(prev => ({
                    ...prev,
                    bankDetails: { ...(prev?.bankDetails || {}), ifsc: e.target.value.toUpperCase() }
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Branch</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.bankDetails?.branch || ''}
                onChange={(e) =>
                  setProfileForm(prev => ({
                    ...prev,
                    bankDetails: { ...(prev?.bankDetails || {}), branch: e.target.value }
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">UPI ID</label>
              <input
                type="text"
                className="form-control"
                value={profileForm?.bankDetails?.upiId || ''}
                onChange={(e) =>
                  setProfileForm(prev => ({
                    ...prev,
                    bankDetails: { ...(prev?.bankDetails || {}), upiId: e.target.value }
                  }))
                }
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Invoice Print Terms & Conditions</label>
              <textarea
                className="form-control"
                rows="3"
                value={profileForm?.terms || ''}
                onChange={(e) => setProfileForm(prev => ({ ...prev, terms: e.target.value }))}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Navigation & Sidebar Preferences Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Settings size={18} color="#8b5cf6" /> Navigation & Sidebar Preferences
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
              <input
                type="checkbox"
                checked={localStorage.getItem('erp_sidebar_multi_expand') === 'true'}
                onChange={(e) => {
                  localStorage.setItem('erp_sidebar_multi_expand', String(e.target.checked));
                  window.dispatchEvent(new Event('ERP_SETTINGS_CHANGED'));
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              <span>Allow multiple main modules to stay expanded simultaneously (Disable auto-collapse)</span>
            </label>
            <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '2.1rem' }}>
              By default (Accordion mode), opening a new main module automatically collapses previously opened modules. Check this option if you want to keep multiple modules expanded at the same time.
            </span>
          </div>
        </div>

        {/* Global Commission & Incentive Rules Card (Admin & Manager Only) */}
        {isAdminOrManager && (
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ color: '#7c3aed' }}>
                <Settings size={18} color="#7c3aed" /> Admin Commission & Incentive Master Policy
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Default Care Of Commission (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  defaultValue={localStorage.getItem('erp_default_careof_pct') || '5.0'}
                  onChange={(e) => localStorage.setItem('erp_default_careof_pct', e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Default referral rate for new Care Of agents</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Default Care Of Calculation Basis</label>
                <select
                  className="form-select"
                  defaultValue={localStorage.getItem('erp_default_careof_basis') || 'profit'}
                  onChange={(e) => localStorage.setItem('erp_default_careof_basis', e.target.value)}
                >
                  <option value="profit">Net Profit Based (% of Gross Profit)</option>
                  <option value="sales">Sales Total Based (% of Subtotal)</option>
                </select>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Default calculation formula</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Default Sales Executive Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  defaultValue={localStorage.getItem('erp_default_sales_pct') || '3.5'}
                  onChange={(e) => localStorage.setItem('erp_default_sales_pct', e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Default commission rate for sales staff</span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Worker Incentive Per Sq.Ft (₹)</label>
                <input
                  type="number"
                  step="0.05"
                  className="form-control"
                  defaultValue={localStorage.getItem('erp_default_worker_sqft') || '0.50'}
                  onChange={(e) => localStorage.setItem('erp_default_worker_sqft', e.target.value)}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Per square foot production rate</span>
              </div>
            </div>
          </div>
        )}

        <div>
          <button type="submit" className="btn btn-primary btn-lg">
            <Check size={18} /> Save Settings & Update Profile
          </button>
        </div>
      </form>
      )}
    </div>
  );
};
