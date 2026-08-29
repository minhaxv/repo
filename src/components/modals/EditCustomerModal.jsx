import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { CUSTOMER_TYPES } from '../../types';
import { X, UserCheck, Phone, Mail, MapPin, Hash, Check, Building } from 'lucide-react';
import CreateCareOfModal from './CreateCareOfModal';
import { SearchableSelect } from '../common/SearchableSelect';

export const EditCustomerModal = ({ isOpen, onClose, customer }) => {
  const { updateCustomer, careOfPersons } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateCareOfOpen, setIsCreateCareOfOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    gstin: '',
    type: CUSTOMER_TYPES.WALKIN,
    address: '',
    state: 'Maharashtra (27)',
    creditLimit: 50000,
    careOfId: ''
  });

  useEffect(() => {
    if (isOpen && customer) {
      setFormData({
        name: customer.name || '',
        mobile: customer.mobile || '',
        email: customer.email || '',
        gstin: customer.gstin || '',
        type: customer.type || CUSTOMER_TYPES.WALKIN,
        address: customer.address || '',
        state: customer.state || 'Maharashtra (27)',
        creditLimit: customer.creditLimit ?? customer.credit_limit ?? 50000,
        careOfId: customer.careOfId ?? customer.care_of_id ?? ''
      });
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    const cleanName = (formData.name || '').trim();
    const cleanMobile = (formData.mobile || '').trim();

    if (!cleanName || !cleanMobile) {
      setErrorMsg('Customer Name and Mobile Number are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedCareOf = (careOfPersons || []).find(co => co.id === formData.careOfId);
      await updateCustomer(customer.id, {
        ...formData,
        name: cleanName,
        mobile: cleanMobile,
        careOfId: formData.careOfId,
        careOfName: selectedCareOf?.name || ''
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while updating customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header" style={{ background: '#0f172a', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={20} color="#60a5fa" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              Edit Customer Account — {customer.code || customer.id}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }} disabled={isSubmitting}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.25rem' }}>
            {errorMsg && (
              <div style={{ gridColumn: 'span 2', background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number *</label>
              <input
                type="tel"
                className="form-control"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                required
                disabled={isSubmitting}
              />
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
              <label className="form-label">GSTIN (Optional)</label>
              <input
                type="text"
                className="form-control"
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">State Code</label>
              <select
                className="form-select"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={isSubmitting}
              >
                <option value="Maharashtra (27)">Maharashtra (27) - Intra-state</option>
                <option value="Gujarat (24)">Gujarat (24) - Interstate</option>
                <option value="Delhi (07)">Delhi (07) - Interstate</option>
                <option value="Karnataka (29)">Karnataka (29) - Interstate</option>
                <option value="Tamil Nadu (33)">Tamil Nadu (33) - Interstate</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
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
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
                When creating sales orders for this customer, this Care Of agent will automatically default on the order.
              </span>
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Address</label>
              <textarea
                className="form-control"
                rows="2"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={isSubmitting}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
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
    </div>
  );
};

export default EditCustomerModal;
