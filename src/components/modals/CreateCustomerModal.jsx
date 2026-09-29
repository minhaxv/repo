import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { CUSTOMER_TYPES } from '../../types';
import { X, UserPlus, Building, Phone, PhoneCall, Plus, Trash2, Mail, MapPin, Hash, Check, AlertTriangle, ShieldAlert, ArrowRight, UserCheck, Wallet } from 'lucide-react';

import CreateCareOfModal from './CreateCareOfModal';
import { SearchableSelect } from '../common/SearchableSelect';

export const CreateCustomerModal = ({ isOpen, onClose, onCustomerCreated, initialMobile = '' }) => {
  const { addCustomer, customers, careOfPersons } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateCareOfOpen, setIsCreateCareOfOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    mobile: initialMobile,
    email: '',
    gstin: '',
    type: CUSTOMER_TYPES.WALKIN,
    address: '',
    state: 'Maharashtra (27)',
    creditLimit: 50000,
    careOfId: ''
  });

  // Additional phone numbers array
  const [additionalMobiles, setAdditionalMobiles] = useState([]);

  // Opening Balance State
  const [enableOpeningBalance, setEnableOpeningBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingBalanceType, setOpeningBalanceType] = useState('Receivable');
  const [openingBalanceDate, setOpeningBalanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [openingBalanceNotes, setOpeningBalanceNotes] = useState('');

  // Duplicate Conflict Modal State
  const [duplicateConflict, setDuplicateConflict] = useState(null); 
  // duplicateConflict structure: { type: 'EXACT_DUPLICATE' | 'SHARED_MOBILE' | 'SAME_NAME', existing: customerObj, pendingData: customerData }

  // Sync initialMobile and reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        mobile: initialMobile || prev.mobile
      }));
      setAdditionalMobiles([]);
      setEnableOpeningBalance(false);
      setOpeningBalance('');
      setOpeningBalanceType('Receivable');
      setOpeningBalanceDate(new Date().toISOString().split('T')[0]);
      setOpeningBalanceNotes('');
      setErrorMsg('');
      setDuplicateConflict(null);
      setIsSubmitting(false);
    }
  }, [isOpen, initialMobile]);

  if (!isOpen) return null;

  // Helper to extract all contact numbers for a customer
  const getCustomerNumbers = (c) => {
    if (!c) return [];
    let addMobiles = [];
    if (c.additionalMobiles) {
      addMobiles = Array.isArray(c.additionalMobiles) ? c.additionalMobiles : [c.additionalMobiles];
    } else if (c.additional_mobiles) {
      try {
        addMobiles = typeof c.additional_mobiles === 'string' ? JSON.parse(c.additional_mobiles) : c.additional_mobiles;
      } catch (e) {
        addMobiles = [c.additional_mobiles];
      }
    }
    return [c.mobile, ...(Array.isArray(addMobiles) ? addMobiles : [])]
      .filter(Boolean)
      .map((n) => String(n).trim().toLowerCase());
  };

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

  // Perform the actual customer creation in ERPContext & DB
  const executeSaveCustomer = async (dataToSave, extraMobiles = []) => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const cleanExtra = (extraMobiles || [])
        .map((m) => String(m).trim())
        .filter((m) => m && m !== dataToSave.mobile.trim());

      const selectedCareOf = (careOfPersons || []).find((co) => co.id === dataToSave.careOfId);
      const created = await addCustomer({
        ...dataToSave,
        additionalMobiles: cleanExtra,
        careOfName: selectedCareOf?.name || ''
      });

      if (created) {
        if (onCustomerCreated) {
          onCustomerCreated(created);
        }
        setDuplicateConflict(null);
        onClose();
      } else {
        setErrorMsg('Failed to save customer. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while saving customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    const cleanName = (formData.name || '').trim();
    const cleanMobile = (formData.mobile || '').trim();
    const cleanExtra = additionalMobiles.map((m) => m.trim()).filter(Boolean);

    if (!cleanName || !cleanMobile) {
      setErrorMsg('Please fill in Customer Name and Primary Mobile Number.');
      return;
    }

    // Opening Balance Validations
    if (enableOpeningBalance) {
      const numAmount = parseFloat(openingBalance);
      if (isNaN(numAmount) || numAmount <= 0) {
        setErrorMsg('Opening Balance Amount is required and must be greater than ₹0.');
        return;
      }
      if (!openingBalanceType) {
        setErrorMsg('Balance Type (Receivable/Payable) is required.');
        return;
      }
      if (!openingBalanceDate) {
        setErrorMsg('Opening Balance Date is required.');
        return;
      }
    }

    const allEnteredNumbers = [cleanMobile.toLowerCase(), ...cleanExtra.map((m) => m.toLowerCase())];

    const customerPayload = {
      ...formData,
      name: cleanName,
      mobile: cleanMobile,
      additionalMobiles: cleanExtra,
      enableOpeningBalance,
      openingBalance: enableOpeningBalance ? Math.max(0, parseFloat(openingBalance) || 0) : 0,
      openingBalanceType: enableOpeningBalance ? openingBalanceType : 'Receivable',
      openingBalanceDate: enableOpeningBalance ? openingBalanceDate : null,
      openingBalanceNotes: enableOpeningBalance ? openingBalanceNotes.trim() : ''
    };

    // 1. Check for EXACT duplicate (Same Name AND Matching Phone Number)
    const exactMatch = (customers || []).find((c) => {
      const cNameMatch = (c.name || '').trim().toLowerCase() === cleanName.toLowerCase();
      const cNumbers = getCustomerNumbers(c);
      const phoneMatch = cNumbers.some((num) => allEnteredNumbers.includes(num));
      return cNameMatch && phoneMatch;
    });

    if (exactMatch) {
      setDuplicateConflict({
        type: 'EXACT_DUPLICATE',
        existing: exactMatch,
        pendingData: customerPayload
      });
      return;
    }

    // 2. Check for SHARED MOBILE (Same Mobile Number, Different Name)
    const sharedMobileMatch = (customers || []).find((c) => {
      const cNumbers = getCustomerNumbers(c);
      const phoneMatch = cNumbers.some((num) => allEnteredNumbers.includes(num));
      const nameDiff = (c.name || '').trim().toLowerCase() !== cleanName.toLowerCase();
      return phoneMatch && nameDiff;
    });

    if (sharedMobileMatch) {
      setDuplicateConflict({
        type: 'SHARED_MOBILE',
        existing: sharedMobileMatch,
        pendingData: customerPayload
      });
      return;
    }

    // 3. Check for SAME NAME (Different Mobile)
    const sameNameMatch = (customers || []).find((c) => {
      const cNameMatch = (c.name || '').trim().toLowerCase() === cleanName.toLowerCase();
      const cNumbers = getCustomerNumbers(c);
      const phoneMatch = cNumbers.some((num) => allEnteredNumbers.includes(num));
      return cNameMatch && !phoneMatch;
    });

    if (sameNameMatch) {
      setDuplicateConflict({
        type: 'SAME_NAME',
        existing: sameNameMatch,
        pendingData: customerPayload
      });
      return;
    }

    // No conflict -> Proceed directly with creation
    await executeSaveCustomer(customerPayload, cleanExtra);
  };

  // Conflict Action: Select the existing customer and proceed
  const handleSelectExisting = (existingCustomer) => {
    if (onCustomerCreated) {
      onCustomerCreated(existingCustomer);
    }
    setDuplicateConflict(null);
    onClose();
  };

  // Conflict Action: Override warning and force create new customer
  const handleForceCreateNew = async () => {
    if (!duplicateConflict?.pendingData) return;
    await executeSaveCustomer(duplicateConflict.pendingData, duplicateConflict.pendingData.additionalMobiles);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Create New Customer</h3>
          </div>
          <button onClick={onClose} className="btn-secondary btn-icon" style={{ border: 'none' }} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        {/* DUPLICATE CONFLICT RESOLUTION MODAL OVERLAY */}
        {duplicateConflict && (
          <div
            style={{
              padding: '1.25rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            {duplicateConflict.type === 'EXACT_DUPLICATE' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', marginBottom: '0.5rem' }}>
                  <ShieldAlert size={22} color="#dc2626" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                    Duplicate Customer Account Detected
                  </h4>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 0.75rem 0' }}>
                  A customer account with the same name (<strong>{duplicateConflict.existing.name}</strong>) and mobile number (<strong>{duplicateConflict.existing.mobile}</strong>) is already registered in the system. Duplicate creation is blocked to maintain ledger accuracy.
                </p>

                {/* Existing Customer Summary Card */}
                <div style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                      {duplicateConflict.existing.name}
                    </span>
                    <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>
                      {duplicateConflict.existing.code || duplicateConflict.existing.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0.85rem' }}>
                    <span>📱 <strong>{duplicateConflict.existing.mobile}</strong></span>
                    <span>🏢 Type: <strong>{duplicateConflict.existing.type || 'Customer'}</strong></span>
                    <span>💰 Outstanding: <strong style={{ color: Number(duplicateConflict.existing.outstanding || 0) > 0 ? '#e11d48' : '#059669' }}>₹{Number(duplicateConflict.existing.outstanding || 0).toLocaleString()}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setDuplicateConflict(null)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontWeight: 600 }}
                  >
                    Go Back & Edit Form
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectExisting(duplicateConflict.existing)}
                    className="btn btn-primary btn-sm"
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Check size={14} /> Select & Use Existing Customer
                  </button>
                </div>
              </div>
            )}

            {duplicateConflict.type === 'SHARED_MOBILE' && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#92400e', marginBottom: '0.5rem' }}>
                  <AlertTriangle size={22} color="#d97706" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                    Mobile Number Already in Use
                  </h4>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 0.85rem 0' }}>
                  The mobile number <strong>{duplicateConflict.pendingData.mobile}</strong> is already registered under customer <strong>"{duplicateConflict.existing.name}"</strong> ({duplicateConflict.existing.code || duplicateConflict.existing.id}).
                  <br />
                  Would you like to select the existing customer, or continue adding <strong>"{duplicateConflict.pendingData.name}"</strong> as a new account?
                </p>

                {/* Comparison Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                  <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Existing Customer</div>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>{duplicateConflict.existing.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📱 {duplicateConflict.existing.mobile}</div>
                    <div style={{ fontSize: '0.72rem', color: '#1e40af' }}>Code: {duplicateConflict.existing.code || duplicateConflict.existing.id}</div>
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '6px', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>New Customer Entry</div>
                    <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '0.88rem' }}>{duplicateConflict.pendingData.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>📱 {duplicateConflict.pendingData.mobile}</div>
                    <div style={{ fontSize: '0.72rem', color: '#059669' }}>Type: {duplicateConflict.pendingData.type}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setDuplicateConflict(null)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel / Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleForceCreateNew}
                    className="btn btn-sm"
                    style={{ background: '#d97706', color: '#fff', fontWeight: 700, border: 'none' }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : `Continue & Create "${duplicateConflict.pendingData.name}"`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectExisting(duplicateConflict.existing)}
                    className="btn btn-primary btn-sm"
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Check size={14} /> Select Existing ({duplicateConflict.existing.name})
                  </button>
                </div>
              </div>
            )}

            {duplicateConflict.type === 'SAME_NAME' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', marginBottom: '0.5rem' }}>
                  <UserPlus size={22} color="#16a34a" />
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
                    Existing Customer with Same Name Found
                  </h4>
                </div>
                <p style={{ fontSize: '0.85rem', color: '#14532d', margin: '0 0 0.85rem 0' }}>
                  A customer account named <strong>"{duplicateConflict.existing.name}"</strong> already exists with mobile number <strong>{duplicateConflict.existing.mobile}</strong>.
                  <br />
                  Do you want to select the existing customer or create a separate account for this new number (<strong>{duplicateConflict.pendingData.mobile}</strong>)?
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setDuplicateConflict(null)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel / Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleForceCreateNew}
                    className="btn btn-sm btn-secondary"
                    style={{ color: '#16a34a', borderColor: '#86efac', fontWeight: 700 }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Create Separate New Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectExisting(duplicateConflict.existing)}
                    className="btn btn-primary btn-sm"
                    style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Check size={14} /> Select Existing ({duplicateConflict.existing.name})
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {errorMsg && (
              <div style={{ gridColumn: 'span 2', background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                <UserPlus size={14} /> Customer Name *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Acme Advertising Pvt Ltd or Rajesh Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            {/* MULTI-PHONE NUMBER MANAGEMENT SECTION */}
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
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
                  placeholder="Primary 10-digit Mobile Number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
                <span className="badge badge-blue" style={{ fontSize: '0.7rem', padding: '0.35rem 0.6rem', whiteSpace: 'nowrap' }}>
                  Primary
                </span>
              </div>

              {/* DYNAMIC ADDITIONAL PHONE NUMBERS */}
              {additionalMobiles.length > 0 && (
                <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.65rem', background: '#f8fafc', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <PhoneCall size={12} color="#64748b" /> Additional Contact Numbers ({additionalMobiles.length})
                  </div>
                  {additionalMobiles.map((mob, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="tel"
                        className="form-control form-control-sm"
                        placeholder={`Alternate Number #${index + 1} (e.g. WhatsApp / Office / Accounts)`}
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

            <div className="form-group">
              <label className="form-label">Customer Type</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                disabled={isSubmitting}
              >
                {Object.values(CUSTOMER_TYPES).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Hash size={14} /> GSTIN (Optional)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 27AAACP9988K1Z2"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Credit Limit (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="e.g. 50000"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="billing@customer.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                  Care Of / Referred Agent (Optional)
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
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                Select an existing referral agent or click <strong>+ Add New Agent</strong> to create one on the fly.
              </span>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">
                <MapPin size={14} /> Address
              </label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Complete street address, city, pin code..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={isSubmitting}
              ></textarea>
            </div>

            {/* OPENING BALANCE SECTION */}
            <div
              style={{
                gridColumn: 'span 2',
                background: enableOpeningBalance ? '#f0f7ff' : '#f8fafc',
                border: enableOpeningBalance ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                transition: 'all 0.2s ease',
                marginTop: '0.25rem'
              }}
            >
              {/* Header Checkbox Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                  <input
                    type="checkbox"
                    id="enable-opening-balance"
                    checked={enableOpeningBalance}
                    onChange={(e) => setEnableOpeningBalance(e.target.checked)}
                    disabled={isSubmitting}
                    style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Wallet size={18} color={enableOpeningBalance ? '#2563eb' : '#64748b'} />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: enableOpeningBalance ? '#1e40af' : '#1e293b' }}>
                      Opening Balance
                    </span>
                  </div>
                </label>
                <span style={{ fontSize: '0.74rem', color: enableOpeningBalance ? '#2563eb' : '#64748b', fontWeight: 600 }}>
                  {enableOpeningBalance ? '✓ Opening balance fields enabled' : 'Enable if customer has prior unbilled balance or advance credit'}
                </span>
              </div>

              {/* Collapsible Opening Balance Form Fields */}
              {enableOpeningBalance && (
                <div style={{ marginTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                    {/* Amount */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>
                        Opening Balance Amount *
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <span style={{ position: 'absolute', left: '10px', fontWeight: 800, color: '#64748b', fontSize: '0.95rem' }}>₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="form-control"
                          style={{ paddingLeft: '26px', fontWeight: 700, fontSize: '0.95rem' }}
                          placeholder="e.g. 25000"
                          value={openingBalance}
                          onChange={(e) => setOpeningBalance(e.target.value)}
                          required={enableOpeningBalance}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    {/* Balance Type */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>
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

                    {/* Opening Balance Date */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>
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

                    {/* Reference / Note */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>
                        Reference / Note (Optional)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Old balance, migration bill #102"
                        value={openingBalanceNotes}
                        onChange={(e) => setOpeningBalanceNotes(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* UI Preview Card */}
                  {(() => {
                    const parsedAmount = Math.max(0, parseFloat(openingBalance) || 0);
                    const isPayable = openingBalanceType === 'Payable';
                    const initialOutstanding = isPayable ? -parsedAmount : parsedAmount;

                    return (
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                              Opening Balance
                            </div>
                            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                              ₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isPayable ? '#d97706' : '#2563eb', marginLeft: '0.35rem' }}>
                                ({openingBalanceType})
                              </span>
                            </div>
                          </div>

                          <div style={{ borderLeft: '1px solid #e2e8f0', height: '32px' }}></div>

                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 800, textTransform: 'uppercase' }}>
                              Initial Outstanding
                            </div>
                            <div
                              style={{
                                fontSize: '1.15rem',
                                fontWeight: 900,
                                color: initialOutstanding > 0 ? '#e11d48' : (initialOutstanding < 0 ? '#059669' : '#0f172a')
                              }}
                            >
                              {initialOutstanding < 0 ? '- ' : ''}₹{Math.abs(initialOutstanding).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>Auto-generates double-entry ledger entry</div>
                          <div style={{ color: '#2563eb' }}>Opening Balance + Sales − Payments = Outstanding</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>⏳ Saving Customer...</>
              ) : (
                <><Check size={16} /> Save & Select Customer</>
              )}
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
    </div>
  );
};

