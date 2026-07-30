import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { CUSTOMER_TYPES } from '../types';
import { CreateCustomerModal } from '../components/modals/CreateCustomerModal';
import { Users, UserPlus, Search, Phone, Mail, Building, AlertTriangle, ShieldCheck } from 'lucide-react';

export const CustomersView = () => {
  const { customers } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.mobile.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedType === 'ALL') return matchesSearch;
    return matchesSearch && c.type === selectedType;
  });

  const totalOutstanding = customers.reduce((acc, c) => acc + c.outstanding, 0);

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} color="#2563eb" /> Customer Master Directory
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Manage Walk-in, Regular, Dealer, Corporate & Government credit accounts
          </span>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <UserPlus size={16} /> + Add Customer
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL CUSTOMERS</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {customers.length} Accounts
          </h3>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL OUTSTANDING LEDGER</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#e11d48', margin: '0.2rem 0' }}>
            ₹{totalOutstanding.toLocaleString()}
          </h3>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>DEALER & CORPORATE CLIENTS</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', margin: '0.2rem 0' }}>
            {customers.filter((c) => ['Dealer', 'Corporate', 'Government'].includes(c.type)).length} Accounts
          </h3>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedType('ALL')}
              className={`btn btn-sm ${selectedType === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            >
              ALL ({customers.length})
            </button>
            {Object.values(CUSTOMER_TYPES).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`btn btn-sm ${selectedType === t ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ width: '300px', position: 'relative' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Name, Mobile, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th>Customer Type</th>
                <th>GSTIN</th>
                <th>State</th>
                <th>Outstanding Balance</th>
                <th>Credit Limit</th>
                <th>Total Orders</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>{c.code}</td>
                  <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.name}</td>
                  <td style={{ fontWeight: 600 }}>{c.mobile}</td>
                  <td>
                    <span className="badge badge-blue">{c.type}</span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{c.gstin || 'Unregistered'}</td>
                  <td>{c.state}</td>
                  <td style={{ fontWeight: 800, color: c.outstanding > 0 ? '#e11d48' : '#059669' }}>
                    ₹{c.outstanding.toLocaleString()}
                  </td>
                  <td>₹{c.creditLimit.toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>{c.totalOrders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
