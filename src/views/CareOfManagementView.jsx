import React, { useState } from 'react';
import { UserCheck, Plus, Search, Phone, Mail, Award, Percent, DollarSign, TrendingUp, FileText, CheckCircle } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import CreateCareOfModal from '../components/modals/CreateCareOfModal';

export const CareOfManagementView = () => {
  const { careOfPersons, salesOrders } = useERP();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter Care Of Persons
  const filtered = careOfPersons.filter((co) => {
    const q = searchTerm.toLowerCase();
    return (
      co.name.toLowerCase().includes(q) ||
      (co.mobile && co.mobile.includes(q)) ||
      (co.role && co.role.toLowerCase().includes(q))
    );
  });

  // Calculate statistics per Care Of Person from actual Sales Orders (Commission = % of Gross Profit)
  const getStats = (careOfId, defaultCommissionPct = 5) => {
    const referredOrders = salesOrders.filter((o) => o.careOfId === careOfId);
    const totalVolume = referredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const totalProfit = referredOrders.reduce((sum, o) => sum + (o.grossProfit !== undefined ? o.grossProfit : Math.round(o.subtotal * 0.45)), 0);
    const commPct = defaultCommissionPct;
    const earnedIncentive = (totalProfit * commPct) / 100;
    const activeCount = referredOrders.filter((o) => o.productionStatus !== 'Delivered').length;

    return {
      orderCount: referredOrders.length,
      totalVolume,
      totalProfit,
      earnedIncentive,
      activeCount
    };
  };

  const totalVolumeAll = salesOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalProfitAll = salesOrders.reduce((sum, o) => sum + (o.grossProfit !== undefined ? o.grossProfit : Math.round(o.subtotal * 0.45)), 0);
  const totalIncentiveAll = careOfPersons.reduce((sum, co) => {
    const stats = getStats(co.id, co.referralCommissionPct);
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
            Manage client liaisons, architects, print brokers & referred partners (% Commission based on Order Profit)
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
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{careOfPersons.length}</div>
        </div>

        <div className="card" style={{ borderTop: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Referred Sales / Profit</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
            ₹{totalVolumeAll.toLocaleString('en-IN')}
            <span style={{ fontSize: '0.78rem', color: '#047857', display: 'block', fontWeight: 600 }}>Profit: ₹{totalProfitAll.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="card" style={{ borderTop: '4px solid #7c3aed' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Earned Commission (% of Profit)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.2rem' }}>₹{Math.round(totalIncentiveAll).toLocaleString('en-IN')}</div>
        </div>

        <div className="card" style={{ borderTop: '4px solid #d97706' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Referred Orders</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>
            {salesOrders.filter((o) => o.careOfId && o.productionStatus !== 'Delivered').length}
          </div>
        </div>
      </div>

      {/* Directory Section */}
      <div className="card">
        {/* Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserCheck size={18} color="#2563eb" /> Care Of Partner Directory & Profit Commission Ledger
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
                <th style={{ textAlign: 'center' }}>Rate (% of Profit)</th>
                <th style={{ textAlign: 'center' }}>Referred Orders</th>
                <th style={{ textAlign: 'right' }}>Total Referred Sales</th>
                <th style={{ textAlign: 'right' }}>Gross Profit Generated</th>
                <th style={{ textAlign: 'right' }}>Earned Commission</th>
                <th style={{ textAlign: 'center' }}>Contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    No Care Of Persons found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((co) => {
                  const stats = getStats(co.id, co.referralCommissionPct || 5);
                  return (
                    <tr key={co.id}>
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', color: '#1e40af', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', border: '1px solid #bfdbfe' }}>
                            {co.name.substring(0, 2).toUpperCase()}
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
                        {co.referralCommissionPct || 5.0}%
                        <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>of Profit</span>
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
                        ₹{stats.totalVolume.toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#059669' }}>
                        ₹{Math.round(stats.totalProfit).toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 800, color: '#7c3aed' }}>
                        ₹{Math.round(stats.earnedIncentive).toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
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
                          {co.email && (
                            <a
                              href={`mailto:${co.email}`}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '0.2rem 0.4rem', border: 'none' }}
                              title={co.email}
                            >
                              <Mail size={14} color="#7c3aed" />
                            </a>
                          )}
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

      {/* Modal */}
      <CreateCareOfModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default CareOfManagementView;
