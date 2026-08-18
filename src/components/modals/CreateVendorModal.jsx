import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Building2, X, Check, Phone, Hash, Tag } from 'lucide-react';

export const CreateVendorModal = ({ isOpen, onClose, onVendorCreated }) => {
  const { addVendor, vendors } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: 'Outsource Printing',
    mobile: '',
    gstin: '',
    avgTurnaroundDays: 2
  });

  React.useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg('');
    const cleanName = (formData.name || '').trim();
    if (!cleanName) {
      setErrorMsg('Please enter Vendor Name.');
      return;
    }

    // Check duplicate vendor
    const existing = (vendors || []).find((v) => v.name && v.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      if (!window.confirm(`Vendor "${existing.name}" already exists. Select existing vendor?`)) {
        setErrorMsg(`Vendor "${cleanName}" already exists.`);
        return;
      } else {
        if (onVendorCreated) {
          onVendorCreated(existing);
        }
        onClose();
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const created = await addVendor({
        ...formData,
        name: cleanName
      });

      if (created) {
        if (onVendorCreated) {
          onVendorCreated(created);
        }
        onClose();
      } else {
        setErrorMsg('Failed to create vendor. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while creating vendor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="#7c3aed" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Create Outsource Vendor / Partner</h3>
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
                <Building2 size={14} /> Vendor Firm / Contact Name *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Sharp Laser Cutters or Royal Screen Printers"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Tag size={14} /> Work Category
              </label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={isSubmitting}
              >
                <option value="Outsource Printing">Outsource Printing</option>
                <option value="CNC & Laser Cutting">CNC & Laser Cutting</option>
                <option value="UV & Flatbed Printing">UV & Flatbed Printing</option>
                <option value="Fabrication & Framing">Fabrication & Framing</option>
                <option value="Offset & Bulk Printing">Offset & Bulk Printing</option>
                <option value="Stitching & Eyelets">Stitching & Eyelets</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Phone size={14} /> Mobile Number
              </label>
              <input
                type="tel"
                className="form-control"
                placeholder="98200XXXXX"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Hash size={14} /> Vendor GSTIN (Optional)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="27AAACP9988K1Z2"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Turnaround Time (Days)</label>
              <input
                type="number"
                className="form-control"
                value={formData.avgTurnaroundDays}
                onChange={(e) => setFormData({ ...formData, avgTurnaroundDays: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: '#7c3aed', borderColor: '#7c3aed' }} disabled={isSubmitting}>
              {isSubmitting ? (
                <>⏳ Saving Vendor...</>
              ) : (
                <><Check size={16} /> Save & Select Vendor</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
