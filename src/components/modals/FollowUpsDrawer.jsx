import React from 'react';
import { useERP } from '../../context/ERPContext';
import { Bell, CheckCircle2, Clock, X, AlertTriangle } from 'lucide-react';

export const FollowUpsDrawer = () => {
  const { isFollowUpsOpen, setIsFollowUpsOpen, followUps, setFollowUps } = useERP();

  if (!isFollowUpsOpen) return null;

  const toggleFollowupStatus = (id) => {
    setFollowUps((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: f.status === 'Pending' ? 'Completed' : 'Pending' } : f))
    );
  };

  return (
    <div className="modal-overlay" onClick={() => setIsFollowUpsOpen(false)}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '420px',
          maxHeight: '100vh',
          borderRadius: 0,
          boxShadow: '-4px 0 20px rgba(0,0,0,0.15)'
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={20} color="#f43f5e" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Action Reminders & Follow-ups</h3>
          </div>
          <button onClick={() => setIsFollowUpsOpen(false)} className="btn-secondary btn-icon" style={{ border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {followUps.map((item) => {
              const isPending = item.status === 'Pending';
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isPending ? '#fcd34d' : '#cbd5e1'}`,
                    backgroundColor: isPending ? '#fffbeb' : '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${isPending ? 'badge-amber' : 'badge-emerald'}`}>
                      {item.type}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Clock size={12} /> {item.dueDate}
                    </span>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                    {item.orderId} — {item.customerName}
                  </div>

                  {item.amount > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 600 }}>
                      Pending Amount: ₹{item.amount.toLocaleString()}
                    </div>
                  )}

                  <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                    <span>Care Of: <strong>{item.careOf}</strong></span>
                    <button
                      onClick={() => toggleFollowupStatus(item.id)}
                      className={`btn btn-sm ${isPending ? 'btn-success' : 'btn-secondary'}`}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    >
                      <CheckCircle2 size={12} />
                      {isPending ? 'Mark Done' : 'Reopen'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Care Of Person follow-up list updated daily
          </span>
        </div>
      </div>
    </div>
  );
};
