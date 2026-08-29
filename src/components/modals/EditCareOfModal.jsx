import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserCheck, Check } from 'lucide-react';

export const EditCareOfModal = ({ isOpen, onClose, careOfPerson }) => {
  const { updateCareOfPerson } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    role: 'Referred Agent / Consultant',
    referralCommissionPct: 5.0,
    commissionType: 'profit',
    notes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && careOfPerson) {
      setFormData({
        name: careOfPerson.name || '',
        mobile: careOfPerson.mobile || '',
        email: careOfPerson.email || '',
        role: careOfPerson.role || 'Referred Agent / Consultant',
        referralCommissionPct: careOfPerson.referralCommissionPct ?? careOfPerson.referral_commission_pct ?? 5.0,
        commissionType: careOfPerson.commissionType ?? careOfPerson.commission_type ?? 'profit',
        notes: careOfPerson.notes || ''
      });
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, careOfPerson]);

  if (!isOpen || !careOfPerson) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    const cleanName = formData.name.trim();
    const cleanMobile = formData.mobile.trim();

    if (!cleanName || !cleanMobile) {
      setError('Name and Mobile Number are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateCareOfPerson(careOfPerson.id, {
        ...formData,
        name: cleanName,
        mobile: cleanMobile,
        referralCommissionPct: parseFloat(formData.referralCommissionPct) || 0,
        commissionType: formData.commissionType
      });
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while updating.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header" style={{ background: '#1d4ed8', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={20} color="#bfdbfe" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Edit Care Of Partner — {careOfPerson.name}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#bfdbfe' }}>
                Update agent profile & commission calculation rates
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }} disabled={isSubmitting}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
            {error && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Full Name / Agency Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-control"
                disabled={isSubmitting}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="form-control"
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-control"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Role / Relationship
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="form-select"
                  disabled={isSubmitting}
                >
                  <option value="Referred Agent / Consultant">Referred Agent / Consultant</option>
                  <option value="Architect / Interior Partner">Architect / Interior Partner</option>
                  <option value="Event Liaison">Event Liaison</option>
                  <option value="Local Print Broker">Local Print Broker</option>
                  <option value="In-house Client Manager">In-house Client Manager</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, color: '#7c3aed' }}>
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.referralCommissionPct}
                  onChange={(e) => setFormData({ ...formData, referralCommissionPct: e.target.value })}
                  className="form-control"
                  style={{ fontWeight: 800, color: '#7c3aed' }}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700, color: '#7c3aed' }}>
                Commission Calculation Basis
              </label>
              <select
                value={formData.commissionType}
                onChange={(e) => setFormData({ ...formData, commissionType: e.target.value })}
                className="form-select"
                style={{ fontWeight: 700 }}
                disabled={isSubmitting}
              >
                <option value="profit">Net Profit Based (% of Order Gross Profit)</option>
                <option value="sales">Sales Total Based (% of Order Subtotal)</option>
              </select>
              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                {formData.commissionType === 'profit'
                  ? 'Calculated on net profit after raw material and outsource costs.'
                  : 'Calculated directly on total sales bill amount.'}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Remarks / Notes
              </label>
              <textarea
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-control"
                disabled={isSubmitting}
              />
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
      </div>
    </div>
  );
};

export default EditCareOfModal;
