import React, { useState } from 'react';
import { X, UserCheck, Phone, Mail, Award, Percent, FileText, Check } from 'lucide-react';
import { useERP } from '../../context/ERPContext';

export default function CreateCareOfModal({ isOpen, onClose, onCreated }) {
  const { addCareOfPerson, careOfPersons } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    role: 'Referred Agent / Consultant',
    referralCommissionPct: 5.0,
    notes: ''
  });
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    const cleanName = formData.name.trim();
    const cleanMobile = formData.mobile.trim();

    if (!cleanName) {
      setError('Care Of Person Name is required.');
      return;
    }
    if (!cleanMobile) {
      setError('Mobile Number is required.');
      return;
    }

    const existing = (careOfPersons || []).find((c) => c.name && c.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      if (!window.confirm(`Care Of Agent "${existing.name}" already exists. Select existing agent?`)) {
        setError(`Care Of Agent "${cleanName}" already exists.`);
        return;
      } else {
        if (onCreated) {
          onCreated(existing);
        }
        onClose();
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const newCareOf = await addCareOfPerson({
        ...formData,
        name: cleanName,
        mobile: cleanMobile
      });

      if (newCareOf) {
        if (onCreated) {
          onCreated(newCareOf);
        }
        onClose();
      } else {
        setError('Failed to save Care Of Person.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={20} color="#bfdbfe" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Create Care Of Person (Referred Agent)
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#bfdbfe' }}>
                Add client liaison or referral partner to track sales commissions
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }} disabled={isSubmitting}>✕</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.25rem' }}>
            {error && (
              <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Full Name / Agency Name <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Rajesh Verma (Ad Agent)"
                className="form-control"
                disabled={isSubmitting}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Mobile Number <span style={{ color: '#e11d48' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="98200XXXXX"
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
                  placeholder="agent@domain.com"
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
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Referral Commission (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="50"
                  value={formData.referralCommissionPct}
                  onChange={(e) => setFormData({ ...formData, referralCommissionPct: parseFloat(e.target.value) || 0 })}
                  className="form-control"
                  style={{ fontWeight: 800, color: '#7c3aed' }}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>
                Remarks / Notes
              </label>
              <textarea
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Special referral partner for architectural signage"
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
              {isSubmitting ? (
                <>⏳ Saving...</>
              ) : (
                <><Check size={16} /> Save Care Of Person</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
