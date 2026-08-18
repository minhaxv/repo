import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { CUSTOMER_TYPES } from '../../types';
import { X, UserPlus, Building, Phone, Mail, MapPin, Hash, Check } from 'lucide-react';

export const CreateCustomerModal = ({ isOpen, onClose, onCustomerCreated, initialMobile = '' }) => {
  const { addCustomer, customers } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    mobile: initialMobile,
    email: '',
    gstin: '',
    type: CUSTOMER_TYPES.WALKIN,
    address: '',
    state: 'Maharashtra (27)',
    creditLimit: 50000
  });

  // Sync initialMobile when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        mobile: initialMobile || prev.mobile
      }));
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, initialMobile]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    const cleanName = (formData.name || '').trim();
    const cleanMobile = (formData.mobile || '').trim();

    if (!cleanName || !cleanMobile) {
      setErrorMsg('Please fill in Customer Name and Mobile Number.');
      return;
    }

    // Check for duplicate customer mobile number
    const existing = (customers || []).find((c) => c.mobile && c.mobile.trim() === cleanMobile);
    if (existing) {
      if (!window.confirm(`A customer named "${existing.name}" already exists with mobile ${cleanMobile}. Do you want to select the existing customer?`)) {
        setErrorMsg(`Customer with mobile ${cleanMobile} already exists.`);
        return;
      } else {
        if (onCustomerCreated) {
          onCustomerCreated(existing);
        }
        onClose();
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const created = await addCustomer({
        ...formData,
        name: cleanName,
        mobile: cleanMobile
      });

      if (created) {
        if (onCustomerCreated) {
          onCustomerCreated(created);
        }
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Create New Customer</h3>
          </div>
          <button onClick={onClose} className="btn-secondary btn-icon" style={{ border: 'none' }} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

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

            <div className="form-group">
              <label className="form-label">
                <Phone size={14} /> Mobile Number *
              </label>
              <input
                type="tel"
                className="form-control"
                placeholder="10-digit Mobile"
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
      </div>
    </div>
  );
};
