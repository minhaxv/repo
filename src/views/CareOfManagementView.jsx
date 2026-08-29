import React, { useState } from 'react';
import { UserCheck, Plus, Search, Phone, Mail, Award, Percent, DollarSign, TrendingUp, FileText, CheckCircle, Edit } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import CreateCareOfModal from '../components/modals/CreateCareOfModal';
import EditCareOfModal from '../components/modals/EditCareOfModal';

export const CareOfManagementView = () => {
  const { careOfPersons, salesOrders, deleteCareOfPerson, customers } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCareOf, setEditingCareOf] = useState(null);

  // Filter Care Of Persons
  const filtered = (careOfPersons || []).filter((co) => {
    const q = (searchTerm || '').toLowerCase();
    return (
      (co.name || '').toLowerCase().includes(q) ||
      (co.mobile && co.mobile.includes(q)) ||
      (co.role && co.role.toLowerCase().includes(q))
    );
  });

  // Calculate statistics per Care Of Person from actual Sales Orders
  const getStats = (careOfId, defaultCommissionPct, commissionType = 'profit') => {
    const referredOrders = (salesOrders || []).filter((o) => o.careOfId === careOfId);
    const totalVolume = referredOrders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
    const totalProfit = referredOrders.reduce((sum, o) => sum + (o.grossProfit !== undefined ? Number(o.grossProfit) || 0 : Math.round((Number(o.subtotal) || 0) * 0.45)), 0);
    const commPct = Number(defaultCommissionPct ?? 5);
    const baseVal = commissionType === 'sales' ? totalVolume : totalProfit;
    const earnedIncentive = (baseVal * commPct) / 100;
    const activeCount = referredOrders.filter((o) => o.productionStatus !== 'Delivered').length;

    return {
      orderCount: referredOrders.length,
      totalVolume,
      totalProfit,
      earnedIncentive,
      activeCount
    };
  };

  const totalVolumeAll = (salesOrders || []).reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0);
  const totalProfitAll = (salesOrders || []).reduce((sum, o) => sum + (o.grossProfit !== undefined ? Number(o.grossProfit) || 0 : Math.round((Number(o.subtotal) || 0) * 0.45)), 0);
  const totalIncentiveAll = (careOfPersons || []).reduce((sum, co) => {
    const commPct = Number(co.referralCommissionPct ?? co.referral_commission_pct ?? 5);
    const commType = co.commissionType ?? co.commission_type ?? 'profit';
    const stats = getStats(co.id, commPct, commType);
    return sum + stats.earnedIncentive;
  }, 0);

  return (
    <div className="view-container">
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={24} color="#2563eb" /> Care Of Persons (Referred Agents Directory)
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Manage client liaisons, architects, print brokers & referred partners (% Commission based on Order Profit or Sales)
          </span>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
        >
          <Plus size={16} /> Add New Care Of Person
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ borderTop: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Care Of Partners</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{careOfPersons.length} Partners</div>
        </div>

        <div className="card" style={{ borderTop: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Referred Sales / Profit</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
            ₹{totalVolumeAll.toLocaleString('en-IN')}
            <span style={{ fontSize: '0.78rem', color: '#047857', display: 'block', fontWeight: 600 }}>Profit: ₹{totalProfitAll.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="card" style={{ borderTop: '4px solid #7c3aed' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Earned Commission (Profit & Sales)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.2rem' }}>₹{Math.round(totalIncentiveAll).toLocaleString('en-IN')}</div>
        </div>

        <div className="card" style={{ borderTop: '4px solid #d97706' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Referred Orders</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
            {salesOrders.filter((o) => o.careOfId && o.productionStatus !== 'Delivered').length} Orders
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="card">
        {/* Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserCheck size={18} color="#2563eb" /> Care Of Partner Directory & Commission Ledger
          </div>
          <div style={{ width: '320px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Care Of Person by Name, Mobile, Role..."
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Care Of Partner</th>
                <th>Role / Relationship</th>
                <th style={{ textAlign: 'center' }}>Commission Rate & Basis</th>
                <th style={{ textAlign: 'center' }}>Linked Customers</th>
                <th style={{ textAlign: 'center' }}>Referred Orders</th>
                <th style={{ textAlign: 'right' }}>Total Referred Sales</th>
                <th style={{ textAlign: 'right' }}>Gross Profit Generated</th>
                <th style={{ textAlign: 'right' }}>Earned Commission</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    No Care Of Persons found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((co) => {
                  const commPct = Number(co.referralCommissionPct ?? co.referral_commission_pct ?? 5);
                  const commType = co.commissionType ?? co.commission_type ?? 'profit';
                  const stats = getStats(co.id, commPct, commType);
                  const linkedCusts = (customers || []).filter(c => (c.careOfId || c.care_of_id) === co.id);

                  return (
                    <tr key={co.id}>
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', color: '#1e40af', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', border: '1px solid #bfdbfe' }}>
                            {(co.name || 'CO').substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: '#0f172a', fontWeight: 800 }}>{co.name}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>ID: {co.id}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-blue">
                          {co.role || 'Referred Agent'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#7c3aed' }}>
                        {commPct}%
                        <span className={`badge ${commType === 'sales' ? 'badge-amber' : 'badge-purple'}`} style={{ display: 'block', fontSize: '0.65rem', marginTop: '2px' }}>
                          {commType === 'sales' ? '% of Sales Total' : '% of Net Profit'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        <span className="badge badge-sky" title={linkedCusts.map(c => c.name).join(', ')}>
                          {linkedCusts.length} Accounts
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {stats.orderCount} orders
                        {stats.activeCount > 0 && (
                          <div style={{ fontSize: '0.68rem', color: '#d97706', fontWeight: 600 }}>
                            ({stats.activeCount} in progress)
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        ₹{Number(stats.totalVolume ?? 0).toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        ₹{Math.round(Number(stats.totalProfit ?? 0)).toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#7c3aed' }}>
                        ₹{Math.round(Number(stats.earnedIncentive ?? 0)).toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem' }}>
                          <button
                            type="button"
                            onClick={() => setEditingCareOf(co)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.4rem', border: 'none', color: '#2563eb' }}
                            title="Edit Commission & Rates"
                          >
                            <Edit size={14} />
                          </button>
                          {co.mobile && (
                            <a
                              href={`tel:${co.mobile}`}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                              title={co.mobile}
                            >
                              <Phone size={14} color="#2563eb" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete Care Of Person "${co.name}"?`)) {
                                deleteCareOfPerson(co.id);
                              }
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.4rem', border: 'none', color: '#f43f5e' }}
                            title="Delete Care Of Person"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateCareOfModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <EditCareOfModal
        isOpen={!!editingCareOf}
        careOfPerson={editingCareOf}
        onClose={() => setEditingCareOf(null)}
      />
    </div>
  );
};

export default CareOfManagementView;
