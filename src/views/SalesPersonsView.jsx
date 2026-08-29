import React, { useState } from 'react';
import { UserCheck, Plus, Search, Phone, TrendingUp, Award, DollarSign, Target, Check, Calendar, Edit } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import EditSalesPersonModal from '../components/modals/EditSalesPersonModal';

export const SalesPersonsView = () => {
  const { salesPersons, addSalesPerson, salesOrders } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSP, setEditingSP] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    target: 500000,
    commissionRate: 3.5
  });

  // Calculate live sales statistics per Sales Person from actual Sales Orders
  const getStats = (spId, spName, defaultRate = 3.5) => {
    const spOrders = (salesOrders || []).filter((o) => o.salesPersonId === spId || o.salesPersonName === spName);
    const totalVolume = spOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const totalProfit = spOrders.reduce((sum, o) => sum + (o.grossProfit !== undefined ? o.grossProfit : Math.round(o.subtotal * 0.45)), 0);
    const earnedCommission = (totalProfit * defaultRate) / 100;
    const activeCount = spOrders.filter((o) => o.productionStatus !== 'Delivered').length;

    return {
      orderCount: spOrders.length,
      totalVolume,
      totalProfit,
      earnedCommission,
      activeCount
    };
  };

  const filtered = (salesPersons || []).filter((sp) => {
    const q = searchTerm.toLowerCase();
    return sp.name.toLowerCase().includes(q) || (sp.mobile && sp.mobile.includes(q));
  });

  const totalSalesAll = (salesOrders || []).reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalProfitAll = (salesOrders || []).reduce((sum, o) => sum + (o.grossProfit !== undefined ? o.grossProfit : Math.round(o.subtotal * 0.45)), 0);
  const totalCommissionAll = (salesPersons || []).reduce((sum, sp) => {
    const rate = Number(sp.commissionRate ?? sp.commission_rate ?? 3.5);
    const stats = getStats(sp.id, sp.name, rate);
    return sum + stats.earnedCommission;
  }, 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    addSalesPerson(formData);
    setFormData({ name: '', mobile: '', target: 500000, commissionRate: 3.5 });
    setIsModalOpen(false);
  };

  return (
    <div className="view-container">
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={24} color="#2563eb" /> Sales Persons Directory & Profit Commission Ledger
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Track sales team targets and calculated incentives (% based on Gross Profit generated)
          </span>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} /> + Add New Sales Executive
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderTop: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Sales Team</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{salesPersons.length} Executives</div>
        </div>

        <div className="card" style={{ borderTop: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Achieved Sales / Profit</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
            ₹{totalSalesAll.toLocaleString('en-IN')}
            <span style={{ fontSize: '0.78rem', color: '#047857', display: 'block', fontWeight: 600 }}>Profit: ₹{totalProfitAll.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="card" style={{ borderTop: '4px solid #7c3aed' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Earned Commission (% of Profit)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.2rem' }}>₹{Math.round(totalCommissionAll).toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Directory Table Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Target size={18} color="#2563eb" /> Executive Target & Profit Incentive Roster
          </div>
          <div style={{ width: '300px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Sales Person..."
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Sales Executive</th>
                <th style={{ textAlign: 'center' }}>Rate (% of Profit)</th>
                <th style={{ textAlign: 'right' }}>Monthly Target</th>
                <th style={{ textAlign: 'right' }}>Achieved Sales</th>
                <th style={{ textAlign: 'right' }}>Gross Profit Generated</th>
                <th style={{ textAlign: 'center' }}>Target %</th>
                <th style={{ textAlign: 'right' }}>Earned Commission</th>
                <th style={{ textAlign: 'center' }}>Contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((sp) => {
                const stats = getStats(sp.id, sp.name, sp.commissionRate);
                const targetVal = sp.target || 500000;
                const achievedVal = stats.totalVolume || sp.achieved || 0;
                const pct = Math.min(100, Math.round((achievedVal / targetVal) * 100));

                return (
                  <tr key={sp.id}>
                    <td style={{ fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', color: '#1e40af', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                          {sp.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ color: '#0f172a', fontWeight: 800 }}>{sp.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>ID: {sp.id}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#7c3aed' }}>
                      {sp.commissionRate}%
                      <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>of Profit</span>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ₹{targetVal.toLocaleString('en-IN')}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      ₹{achievedVal.toLocaleString('en-IN')}
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                      ₹{Math.round(stats.totalProfit).toLocaleString('en-IN')}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${pct >= 100 ? 'badge-emerald' : pct >= 75 ? 'badge-blue' : 'badge-amber'}`}>
                        {pct}%
                      </span>
                    </td>

                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#7c3aed' }}>
                      ₹{Math.round(stats.earnedCommission).toLocaleString('en-IN')}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem' }}>
                        <button
                          type="button"
                          onClick={() => setEditingSP(sp)}
                          className="btn btn-sm btn-secondary"
                          style={{ padding: '0.2rem 0.4rem', border: 'none', color: '#2563eb' }}
                          title="Edit Target & Commission Rate"
                        >
                          <Edit size={14} />
                        </button>
                        {sp.mobile && (
                          <a href={`tel:${sp.mobile}`} className="btn btn-sm btn-secondary" style={{ padding: '0.2rem 0.4rem', border: 'none' }} title={sp.mobile}>
                            <Phone size={14} color="#2563eb" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header" style={{ background: '#1e40af', color: '#fff' }}>
              <div style={{ fontWeight: 800 }}>Add New Sales Executive</div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="98200XXXXX"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Monthly Target (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary"><Check size={16} /> Save Executive</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditSalesPersonModal
        isOpen={!!editingSP}
        salesPerson={editingSP}
        onClose={() => setEditingSP(null)}
      />
    </div>
  );
};

export default SalesPersonsView;
