import React from 'react';
import { useERP } from '../context/ERPContext';
import { Palette, Upload, CheckCircle2, Clock, Image, ExternalLink } from 'lucide-react';

export const DesignersView = () => {
  const { salesOrders, updateArtworkStatus, designers } = useERP();

  // Extract jobs requiring design
  const designJobs = [];
  salesOrders.forEach((o) => {
    o.items.forEach((it) => {
      if (it.designerRequired === 'YES' || it.designerId || it.artworkStatus) {
        designJobs.push({
          orderId: o.id,
          customerName: o.customerName,
          deliveryDate: o.deliveryDate,
          item: it
        });
      }
    });
  });

  const handleSimulateUpload = (orderId, itemId) => {
    const mockUrl = "https://images.unsplash.com/photo-1542744095-291d1f67b221?auto=format&fit=crop&w=600&q=80";
    updateArtworkStatus(orderId, itemId, 'Approved', mockUrl);
    alert('Artwork uploaded & marked Approved by Customer signoff!');
  };

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Palette size={24} color="#8b5cf6" /> Designer & Artwork Queue
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Assign artwork tasks, track client design approvals and manage print RIP files
          </span>
        </div>
      </div>

      {/* Designers Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {designers.map((d) => (
          <div key={d.id} className="card" style={{ borderTop: '4px solid #8b5cf6' }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{d.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0' }}>Mob: {d.mobile}</div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <span className="badge badge-violet">{d.activeJobs} Active Tasks</span>
              <span className="badge badge-amber">{d.pendingApprovals} Pending Approval</span>
            </div>
          </div>
        ))}
      </div>

      {/* Queue Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Live Artwork Approval Queue</div>
        </div>

        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Product & Spec</th>
                <th>Assigned Designer</th>
                <th>Promised Delivery</th>
                <th>Artwork Status</th>
                <th>Preview</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {designJobs.map((job, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 800, color: '#1e40af' }}>{job.orderId}</td>
                  <td style={{ fontWeight: 700 }}>{job.customerName}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{job.item.productName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{job.item.description || 'Custom Specs'}</div>
                  </td>
                  <td><strong>{job.item.designerName || 'In-House Studio'}</strong></td>
                  <td style={{ fontWeight: 600, color: '#d97706' }}>{job.deliveryDate}</td>
                  <td>
                    <span className={`badge ${
                      job.item.artworkStatus === 'Approved' ? 'badge-emerald' :
                      job.item.artworkStatus === 'In Design' ? 'badge-blue' : 'badge-amber'
                    }`}>
                      {job.item.artworkStatus || 'Pending'}
                    </span>
                  </td>
                  <td>
                    {job.item.artworkUrl ? (
                      <a href={job.item.artworkUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Image size={14} /> Preview RIP <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No artwork yet</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleSimulateUpload(job.orderId, job.item.id)}
                      className="btn btn-sm btn-primary"
                    >
                      <Upload size={14} /> Upload & Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
