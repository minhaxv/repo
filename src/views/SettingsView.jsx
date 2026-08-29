import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { Settings, Save, Building, CreditCard, FileText, RotateCcw, Check } from 'lucide-react';

export const SettingsView = () => {
  const { companyProfile, setCompanyProfile, resetDemoData } = useERP();
  const [profileForm, setProfileForm] = useState(companyProfile);

  const handleSave = (e) => {
    e.preventDefault();
    setCompanyProfile(profileForm);
    alert('Company Profile & GST Invoice Settings saved successfully!');
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all data back to the default Indian print shop sample state?')) {
      resetDemoData();
      alert('Data reset to fresh sample state.');
    }
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={24} color="#2563eb" /> Company Profile & Master Settings
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Configure Tax Invoice header, GSTIN, Bank details and print terms
          </span>
        </div>

        <button onClick={handleReset} className="btn btn-secondary" style={{ color: '#e11d48' }}>
          <RotateCcw size={16} /> Reset Demo Data
        </button>
      </div>

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
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">GSTIN Number</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.gstin}
                onChange={(e) => setProfileForm({ ...profileForm, gstin: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">State Code</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.state}
                onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone / Mobile</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Website</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.website}
                onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Factory / Shop Address</label>
              <textarea
                className="form-control"
                rows="2"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
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
                value={profileForm.bankDetails.bankName}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    bankDetails: { ...profileForm.bankDetails, bankName: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Name</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.bankDetails.accountName}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    bankDetails: { ...profileForm.bankDetails, accountName: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.bankDetails.accountNo}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    bankDetails: { ...profileForm.bankDetails, accountNo: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.bankDetails.ifsc}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    bankDetails: { ...profileForm.bankDetails, ifsc: e.target.value.toUpperCase() }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">Branch</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.bankDetails.branch}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    bankDetails: { ...profileForm.bankDetails, branch: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">UPI ID</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.bankDetails.upiId}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    bankDetails: { ...profileForm.bankDetails, upiId: e.target.value }
                  })
                }
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 3' }}>
              <label className="form-label">Invoice Print Terms & Conditions</label>
              <textarea
                className="form-control"
                rows="3"
                value={profileForm.terms}
                onChange={(e) => setProfileForm({ ...profileForm, terms: e.target.value })}
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

        {/* Global Commission & Incentive Rules Card */}
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

        <div>
          <button type="submit" className="btn btn-primary btn-lg">
            <Check size={18} /> Save Settings & Update Profile
          </button>
        </div>
      </form>
    </div>
  );
};
