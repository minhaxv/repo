import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { CUSTOMER_TYPES } from '../../types';
import { X, UserCheck, Phone, PhoneCall, Plus, Trash2, Mail, MapPin, Hash, Check, Building, Wallet, Percent, DollarSign } from 'lucide-react';
import CreateCareOfModal from './CreateCareOfModal';
import { SearchableSelect } from '../common/SearchableSelect';
import { KERALA_DISTRICTS, INDIAN_STATES } from './CreateCustomerModal';
import { useERPModalSafeClose } from '../../hooks/useERPModalSafeClose';
import { UnsavedChangesPrompt } from '../common/UnsavedChangesPrompt';

export const EditCustomerModal = ({ isOpen, onClose, customer, onCustomerUpdated }) => {
  const { updateCustomer, careOfPersons } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateCareOfOpen, setIsCreateCareOfOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    gstin: '',
    type: 'Regular',
    creditLimit: 10000,
    referralCommissionPct: 0.2,
    address: '',
    city: '',
    pincode: '',
    district: 'Kozhikode',
    state: 'Kerala',
    careOfId: ''
  });
  const [additionalMobiles, setAdditionalMobiles] = useState([]);

  // Opening Balance State
  const [enableOpeningBalance, setEnableOpeningBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceType, setOpeningBalanceType] = useState('Receivable');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingBalanceNotes, setOpeningBalanceNotes] = useState('');

  const isDirty = Boolean(
    customer &&
    (formData.name !== (customer.name || '') ||
     formData.mobile !== (customer.mobile || '') ||
     formData.email !== (customer.email || '') ||
     formData.address !== (customer.address || '') ||
     formData.gstin !== (customer.gstin || ''))
  );

  const {
    showUnsavedPrompt,
    requestClose,
    handleKeepEditing,
    handleDiscard
  } = useERPModalSafeClose({
    isOpen,
    isDirty,
    onClose,
    isSubmitting
  });

  useEffect(() => {
    if (isOpen && customer) {
      let addMobiles = [];
      if (customer.additionalMobiles) {
        addMobiles = Array.isArray(customer.additionalMobiles) ? customer.additionalMobiles : [customer.additionalMobiles];
      } else if (customer.additional_mobiles) {
        try {
          addMobiles = typeof customer.additional_mobiles === 'string' ? JSON.parse(customer.additional_mobiles) : customer.additional_mobiles;
        } catch (e) {
          addMobiles = [customer.additional_mobiles];
        }
      }

      // Preserve existing customer values strictly. Only fallback if field is undefined/null.
      setFormData({
        name: customer.name || '',
        mobile: customer.mobile || '',
        email: customer.email || '',
        gstin: customer.gstin || customer.gst_number || '',
        type: customer.type || customer.customer_type || 'Regular',
        creditLimit: customer.creditLimit !== undefined && customer.creditLimit !== null
          ? customer.creditLimit
          : (customer.credit_limit !== undefined && customer.credit_limit !== null ? customer.credit_limit : 10000),
        referralCommissionPct: customer.referralCommissionPct !== undefined && customer.referralCommissionPct !== null
          ? customer.referralCommissionPct
          : (customer.referral_commission_pct !== undefined && customer.referral_commission_pct !== null ? customer.referral_commission_pct : 0.2),
        address: customer.address || '',
        city: customer.city || '',
        pincode: customer.pincode || customer.pinCode || customer.pin_code || '',
        district: customer.district || 'Kozhikode',
        state: customer.state || 'Kerala',
        careOfId: customer.careOfId ?? customer.care_of_id ?? ''
      });
      setAdditionalMobiles(Array.isArray(addMobiles) ? addMobiles : []);

      const custOpening = Number(customer.openingBalance ?? customer.opening_balance ?? 0);
      setEnableOpeningBalance(custOpening > 0);
      setOpeningBalance(custOpening > 0 ? String(custOpening) : '');
      setOpeningBalanceType(customer.openingBalanceType || customer.opening_balance_type || 'Receivable');
      setOpeningBalanceDate(customer.openingBalanceDate || customer.opening_balance_date || customer.createdAt || new Date().toISOString().split('T')[0]);
      setOpeningBalanceNotes(customer.openingBalanceNotes || customer.opening_balance_notes || '');

      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const handleAddAlternateMobile = () => {
    setAdditionalMobiles((prev) => [...prev, '']);
  };

  const handleUpdateAlternateMobile = (index, value) => {
    setAdditionalMobiles((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleRemoveAlternateMobile = (index) => {
    setAdditionalMobiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    const cleanName = (formData.name || '').trim();
    const cleanMobile = (formData.mobile || '').trim();
    const cleanExtra = (additionalMobiles || [])
      .map((m) => String(m).trim())
      .filter((m) => m && m !== cleanMobile);

    if (!cleanName) {
      setErrorMsg('Customer Name is required.');
      return;
    }

    if (!cleanMobile) {
      setErrorMsg('Mobile Number is required.');
      return;
    }

    // Mandatory Address Fields Validation
    const cleanAddress = (formData.address || '').trim();
    if (!cleanAddress) {
      setErrorMsg('Address is required.');
      return;
    }

    const cleanCity = (formData.city || '').trim();
    if (!cleanCity) {
      setErrorMsg('City is required.');
      return;
    }

    const cleanPincode = (formData.pincode || '').trim();

    const cleanDistrict = (formData.district || '').trim();
    if (!cleanDistrict) {
      setErrorMsg('District is required.');
      return;
    }

    const cleanState = (formData.state || '').trim();
    if (!cleanState) {
      setErrorMsg('State is required.');
      return;
    }

    if (enableOpeningBalance) {
      const numAmount = parseFloat(openingBalance);
      if (isNaN(numAmount) || numAmount <= 0) {
        setErrorMsg('Opening Balance Amount is required and must be greater than ₹0.');
        return;
      }
      if (!openingBalanceType) {
        setErrorMsg('Balance Type is required.');
        return;
      }
      if (!openingBalanceDate) {
        setErrorMsg('Opening Balance Date is required.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const selectedCareOf = (careOfPersons || []).find((co) => co.id === formData.careOfId);
      
      const payload = {
        ...formData,
        name: cleanName,
        mobile: cleanMobile,
        additionalMobiles: cleanExtra,
        address: cleanAddress,
        city: cleanCity,
        pincode: cleanPincode,
        district: cleanDistrict,
        state: cleanState,
        type: formData.type || 'Regular',
        creditLimit: parseFloat(formData.creditLimit) >= 0 ? parseFloat(formData.creditLimit) : 0,
        referralCommissionPct: parseFloat(formData.referralCommissionPct) >= 0 ? parseFloat(formData.referralCommissionPct) : 0,
        careOfId: formData.careOfId,
        careOfName: selectedCareOf?.name || '',
        openingBalance: enableOpeningBalance ? Math.max(0, parseFloat(openingBalance) || 0) : 0,
        openingBalanceType: enableOpeningBalance ? openingBalanceType : 'Receivable',
        openingBalanceDate: enableOpeningBalance ? openingBalanceDate : null,
        openingBalanceNotes: enableOpeningBalance ? openingBalanceNotes.trim() : ''
      };

      const result = await updateCustomer(customer.id, payload);
      
      if (onCustomerUpdated) {
        onCustomerUpdated(result && typeof result === 'object' ? result : { ...customer, ...payload });
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while updating customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '92vw' }}>
        <div className="modal-header" style={{ background: '#0f172a', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={20} color="#60a5fa" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              Edit Customer Account — {customer.name} {customer.code ? `(${customer.code})` : ''}
            </h3>
          </div>
          <button onClick={requestClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }} disabled={isSubmitting}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.25rem', maxHeight: '80vh', overflowY: 'auto' }}>
            {errorMsg && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            {/* SECTION 1: CUSTOMER INFORMATION */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span>
                1. Customer Information
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Customer Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter full customer / business name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone size={14} color="#2563eb" /> Primary Mobile Number *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddAlternateMobile}
                      disabled={isSubmitting}
                      className="btn btn-sm btn-secondary"
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: '#2563eb',
                        borderColor: '#bfdbfe',
                        background: '#eff6ff',
                        fontWeight: 700
                      }}
                      title="Add secondary/alternate phone number"
                    >
                      <Plus size={12} /> Add Alternate Number
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="10-digit mobile number"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                    <span className="badge badge-blue" style={{ fontSize: '0.7rem', padding: '0.35rem 0.6rem', whiteSpace: 'nowrap' }}>
                      Primary
                    </span>
                  </div>

                  {additionalMobiles.length > 0 && (
                    <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.65rem', background: '#f1f5f9', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <PhoneCall size={12} color="#64748b" /> Additional Contact Numbers ({additionalMobiles.length})
                      </div>
                      {additionalMobiles.map((mob, index) => (
                        <div key={index} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <input
                            type="tel"
                            className="form-control form-control-sm"
                            placeholder={`Alternate Number #${index + 1}`}
                            value={mob}
                            onChange={(e) => handleUpdateAlternateMobile(index, e.target.value)}
                            disabled={isSubmitting}
                            style={{ fontSize: '0.82rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAlternateMobile(index)}
                            className="btn btn-sm btn-secondary"
                            style={{ color: '#ef4444', borderColor: '#fca5a5', padding: '0.25rem 0.45rem' }}
                            title="Remove this alternate number"
                            disabled={isSubmitting}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>Customer Type *</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    disabled={isSubmitting}
                    style={{ fontWeight: 600 }}
                  >
                    <option value="Regular">Regular</option>
                    <option value="Agent">Agent</option>
                    <option value="Government">Government</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Walk In">Walk In</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Email Address (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. accounts@client.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                  <label className="form-label">GSTIN (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="15-digit GSTIN (e.g. 32AAAAA0000A1Z5)"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    disabled={isSubmitting}
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: FINANCIAL INFORMATION */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
                2. Financial Information
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                {/* Credit Limit */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <DollarSign size={14} color="#059669" /> Credit Limit (₹) *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '10px', fontWeight: 800, color: '#64748b', fontSize: '0.95rem' }}>₹</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="form-control"
                      style={{ paddingLeft: '26px', fontWeight: 700 }}
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Maximum allowed outstanding balance for orders.
                  </span>
                </div>

                {/* Referral Commission (%) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Percent size={14} color="#2563eb" /> Referral Commission (%) *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="form-control"
                      style={{ paddingRight: '32px', fontWeight: 700 }}
                      value={formData.referralCommissionPct}
                      onChange={(e) => setFormData({ ...formData, referralCommissionPct: e.target.value })}
                      disabled={isSubmitting}
                    />
                    <span style={{ position: 'absolute', right: '10px', fontWeight: 800, color: '#64748b', fontSize: '0.95rem' }}>%</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                    Current rate: {formData.referralCommissionPct}%
                  </span>
                </div>

                {/* Care Of Agent */}
                <div className="form-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0, fontWeight: 700, color: '#1e40af' }}>
                      Assigned Care Of / Referred Agent
                    </label>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => setIsCreateCareOfOpen(true)}
                      disabled={isSubmitting}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.55rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: '#2563eb',
                        borderColor: '#bfdbfe',
                        background: '#eff6ff',
                        fontWeight: 700
                      }}
                    >
                      + Add New Agent
                    </button>
                  </div>
                  <SearchableSelect
                    type="careOf"
                    options={careOfPersons || []}
                    value={formData.careOfId}
                    onChange={(co) => setFormData({ ...formData, careOfId: co?.id || '' })}
                    placeholder="-- No Care Of Agent Assigned --"
                    searchPlaceholder="Search referral agent by name, mobile, role..."
                    onAddNew={() => setIsCreateCareOfOpen(true)}
                    addNewLabel="+ Create New Agent"
                    disabled={isSubmitting}
                    allowClear={true}
                  />
                </div>

                {/* OPENING BALANCE EDITING SECTION */}
                <div
                  style={{
                    gridColumn: '1 / -1',
                    background: enableOpeningBalance ? '#f0f7ff' : '#ffffff',
                    border: enableOpeningBalance ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    transition: 'all 0.2s ease',
                    marginTop: '0.25rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={enableOpeningBalance}
                        onChange={(e) => setEnableOpeningBalance(e.target.checked)}
                        disabled={isSubmitting}
                        style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <Wallet size={18} color={enableOpeningBalance ? '#2563eb' : '#64748b'} />
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: enableOpeningBalance ? '#1e40af' : '#1e293b' }}>
                          Opening Balance
                        </span>
                      </div>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: enableOpeningBalance ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                      {enableOpeningBalance ? 'Updates customer ledger entry & outstanding balance' : 'Enable to record initial balance'}
                    </span>
                  </div>

                  {enableOpeningBalance && (
                    <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                            Opening Balance Amount *
                          </label>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span style={{ position: 'absolute', left: '10px', fontWeight: 800, color: '#64748b', fontSize: '0.95rem' }}>₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              className="form-control"
                              style={{ paddingLeft: '26px', fontWeight: 700, fontSize: '0.9rem' }}
                              placeholder="e.g. 25000"
                              value={openingBalance}
                              onChange={(e) => setOpeningBalance(e.target.value)}
                              required={enableOpeningBalance}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                            Balance Type *
                          </label>
                          <select
                            className="form-select"
                            value={openingBalanceType}
                            onChange={(e) => setOpeningBalanceType(e.target.value)}
                            disabled={isSubmitting}
                            style={{ fontWeight: 600 }}
                          >
                            <option value="Receivable">Receivable (Customer owes money)</option>
                            <option value="Payable">Payable (Advance credit / You owe customer)</option>
                          </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                            Opening Balance Date *
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            value={openingBalanceDate}
                            onChange={(e) => setOpeningBalanceDate(e.target.value)}
                            required={enableOpeningBalance}
                            disabled={isSubmitting}
                          />
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontWeight: 700, fontSize: '0.78rem' }}>
                            Reference / Note (Optional)
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Old balance, migration bill"
                            value={openingBalanceNotes}
                            onChange={(e) => setOpeningBalanceNotes(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      {/* Dynamic Recalculated Outstanding Preview */}
                      {(() => {
                        const parsedAmount = Math.max(0, parseFloat(openingBalance) || 0);
                        const isPayable = openingBalanceType === 'Payable';
                        const signedOpening = isPayable ? -parsedAmount : parsedAmount;
                        const oldOpening = Number(customer.openingBalance ?? customer.opening_balance ?? 0);
                        const oldSigned = (customer.openingBalanceType || customer.opening_balance_type) === 'Payable' ? -oldOpening : oldOpening;
                        const currentOutstanding = Number(customer.outstanding ?? customer.outstandingAmount ?? 0);
                        const estimatedNewOutstanding = Number((currentOutstanding - oldSigned + signedOpening).toFixed(2));

                        return (
                          <div
                            style={{
                              background: '#ffffff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '6px',
                              padding: '0.65rem 0.85rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '0.5rem'
                            }}
                          >
                            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                                  Opening Balance
                                </div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                                  ₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isPayable ? '#d97706' : '#2563eb', marginLeft: '0.35rem' }}>
                                    ({openingBalanceType})
                                  </span>
                                </div>
                              </div>

                              <div style={{ borderLeft: '1px solid #e2e8f0', height: '28px' }}></div>

                              <div>
                                <div style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 800, textTransform: 'uppercase' }}>
                                  Updated Outstanding
                                </div>
                                <div
                                  style={{
                                    fontSize: '1.05rem',
                                    fontWeight: 900,
                                    color: estimatedNewOutstanding > 0 ? '#e11d48' : (estimatedNewOutstanding < 0 ? '#059669' : '#0f172a')
                                  }}
                                >
                                  {estimatedNewOutstanding < 0 ? '- ' : ''}₹{Math.abs(estimatedNewOutstanding).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: MANDATORY ADDRESS SECTION */}
            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d97706', display: 'inline-block' }}></span>
                3. Address (Mandatory)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1', margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    <MapPin size={14} color="#d97706" /> Street Address / Premise *
                  </label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Enter building, street, door no., landmark..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    disabled={isSubmitting}
                  ></textarea>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>City *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Kozhikode"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>PIN Code (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="6-digit PIN Code"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>State *</label>
                  <select
                    className="form-select"
                    value={formData.state}
                    onChange={(e) => {
                      const newState = e.target.value;
                      setFormData({
                        ...formData,
                        state: newState,
                        district: newState === 'Kerala' ? (formData.district || 'Kozhikode') : formData.district
                      });
                    }}
                    required
                    disabled={isSubmitting}
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700 }}>District *</label>
                  {formData.state === 'Kerala' ? (
                    <select
                      className="form-select"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      required
                      disabled={isSubmitting}
                    >
                      {KERALA_DISTRICTS.map((dist) => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter district name"
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '0.85rem 1.25rem' }}>
            <button type="button" onClick={requestClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving Changes...' : <><Check size={16} /> Save Changes</>}
            </button>
          </div>
        </form>

        <CreateCareOfModal
          isOpen={isCreateCareOfOpen}
          onClose={() => setIsCreateCareOfOpen(false)}
          onCreated={(newCareOf) => {
            if (newCareOf?.id) {
              setFormData((prev) => ({ ...prev, careOfId: newCareOf.id }));
            }
          }}
        />
      </div>

      <UnsavedChangesPrompt
        isOpen={showUnsavedPrompt}
        onKeepEditing={handleKeepEditing}
        onDiscard={handleDiscard}
      />
    </div>
  );
};

export default EditCustomerModal;
