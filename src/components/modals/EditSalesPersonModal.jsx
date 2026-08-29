import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { TrendingUp, Check } from 'lucide-react';

export const EditSalesPersonModal = ({ isOpen, onClose, salesPerson }) => {
  const { updateSalesPerson } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    target: 500000,
    commissionRate: 3.5
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && salesPerson) {
      setFormData({
        name: salesPerson.name || '',
        mobile: salesPerson.mobile || '',
        target: salesPerson.target || 500000,
        commissionRate: salesPerson.commissionRate ?? salesPerson.commission_rate ?? 3.5
      });
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, salesPerson]);

  if (!isOpen || !salesPerson) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    const cleanName = formData.name.trim();

    if (!cleanName) {
      setError('Sales Executive Name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await updateSalesPerson(salesPerson.id, {
        ...formData,
        name: cleanName,
        target: parseFloat(formData.target) || 0,
        commissionRate: parseFloat(formData.commissionRate) || 0
      });
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while updating sales executive.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <div className="modal-header" style={{ background: '#2563eb', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="#bfdbfe" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
              Edit Sales Executive — {salesPerson.name}
            </h3>
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
              <label className="form-label" style={{ fontWeight: 700 }}>Sales Executive Name *</label>
              <input
                type="text"
                required
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Mobile Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Monthly Target (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700, color: '#2563eb' }}>Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  style={{ fontWeight: 800, color: '#2563eb' }}
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : <><Check size={16} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSalesPersonModal;
