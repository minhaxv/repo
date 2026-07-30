import React, { useState } from 'react';
import { X, Mail, Clock, Send, CheckCircle2, Paperclip } from 'lucide-react';

export const EmailScheduleModal = ({ isOpen, onClose, mode = 'email', reportName = 'Sales & Profitability Report' }) => {
  const [recipient, setRecipient] = useState('management@screenarts.in');
  const [subject, setSubject] = useState(`${reportName} - ScreenArts ERP Analytics`);
  const [message, setMessage] = useState(`Attached is the latest ${reportName} generated from ScreenArts Printflow Cloud ERP.`);
  const [frequency, setFrequency] = useState('WEEKLY');
  const [format, setFormat] = useState('PDF');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '520px', padding: '1.5rem', borderRadius: '12px' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {mode === 'email' ? <Mail size={22} color="#7c3aed" /> : <Clock size={22} color="#d97706" />}
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              {mode === 'email' ? 'Email Executive Report' : 'Schedule Recurring Report'}
            </h3>
          </div>
          <button onClick={onClose} className="btn btn-sm btn-secondary" style={{ padding: '0.2rem 0.5rem' }}>
            <X size={18} />
          </button>
        </div>

        {isSuccess ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              {mode === 'email' ? 'Report Emailed Successfully!' : 'Automated Schedule Created!'}
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {mode === 'email'
                ? `Report has been queued and sent to ${recipient}.`
                : `Recurring ${frequency.toLowerCase()} ${format} report scheduled for ${recipient}.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                Report Name
              </label>
              <input type="text" value={reportName} disabled className="form-control" style={{ background: '#f1f5f9', fontWeight: 700 }} />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                Recipient Email(s)
              </label>
              <input
                type="email"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="email@company.com, director@company.com"
                className="form-control"
              />
            </div>

            {mode === 'schedule' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                    Frequency
                  </label>
                  <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="form-control" style={{ fontWeight: 700 }}>
                    <option value="DAILY">Daily (Every 8:00 AM)</option>
                    <option value="WEEKLY">Weekly (Monday 9:00 AM)</option>
                    <option value="MONTHLY">Monthly (1st of Month)</option>
                    <option value="QUARTERLY">Quarterly</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                    Attachment Format
                  </label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="form-control" style={{ fontWeight: 700 }}>
                    <option value="PDF">PDF Report Document</option>
                    <option value="EXCEL">Excel CSV Dataset</option>
                    <option value="BOTH">Both PDF & Excel</option>
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                    Subject Line
                  </label>
                  <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="form-control" />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                    Message Body
                  </label>
                  <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="form-control" />
                </div>

                <div style={{ background: '#f8fafc', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: '#475569' }}>
                  <Paperclip size={16} color="#2563eb" />
                  <span>Attachment: <strong>{reportName}.pdf</strong> (Auto-generated with current filters)</span>
                </div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ gap: '0.4rem' }}>
                {mode === 'email' ? <Send size={16} /> : <Clock size={16} />}
                {mode === 'email' ? 'Send Email Now' : 'Save Recurring Schedule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
