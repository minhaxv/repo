import React, { useState } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Download,
  Printer,
  Mail,
  Clock,
  Bookmark,
  ChevronDown,
  X,
  Layers,
  RotateCcw
} from 'lucide-react';

export const ReportFilterBar = ({
  filters,
  onFilterChange,
  onResetFilters,
  customers = [],
  salesPersons = [],
  careOfPersons = [],
  vendors = [],
  products = [],
  onExportCSV,
  onExportPDF,
  onOpenEmailModal
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedFiltersList, setSavedFiltersList] = useState(() => {
    const saved = localStorage.getItem('printflow_saved_filters');
    return saved ? JSON.parse(saved) : [
      { name: 'This Month Corporate Orders', filters: { datePreset: 'THIS_MONTH', customerId: 'CUST-101' } },
      { name: 'High Margin Signage Jobs', filters: { datePreset: 'ALL', productionStatus: 'Printing' } }
    ];
  });

  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveFilter = () => {
    if (!saveName.trim()) return;
    const updated = [...savedFiltersList, { name: saveName.trim(), filters: { ...filters } }];
    setSavedFiltersList(updated);
    localStorage.setItem('printflow_saved_filters', JSON.stringify(updated));
    setSaveName('');
    setIsSaving(false);
  };

  return (
    <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', background: '#ffffff', borderRadius: '12px' }}>
      {/* Top Controls Row */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Search & Date Presets */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          {/* Live Search */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 220px' }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Order #, Customer, Sales Person..."
              value={filters.searchQuery || ''}
              onChange={(e) => onFilterChange('searchQuery', e.target.value)}
              className="form-control"
              style={{ paddingLeft: '2.1rem', fontSize: '0.82rem', height: '36px' }}
            />
            {filters.searchQuery && (
              <X
                size={14}
                color="#64748b"
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                onClick={() => onFilterChange('searchQuery', '')}
              />
            )}
          </div>

          {/* Date Range Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <Calendar size={15} color="#2563eb" />
            <select
              value={filters.datePreset || 'ALL'}
              onChange={(e) => onFilterChange('datePreset', e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="THIS_YEAR">This Year</option>
              <option value="CUSTOM">Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Inputs if selected */}
          {filters.datePreset === 'CUSTOM' && (
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onFilterChange('startDate', e.target.value)}
                className="form-control"
                style={{ width: '130px', height: '36px', fontSize: '0.78rem' }}
              />
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>to</span>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onFilterChange('endDate', e.target.value)}
                className="form-control"
                style={{ width: '130px', height: '36px', fontSize: '0.78rem' }}
              />
            </div>
          )}

          {/* Toggle Advanced Filters */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`btn btn-sm ${showAdvanced ? 'btn-primary' : 'btn-secondary'}`}
            style={{ height: '36px', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            <Filter size={14} /> Advanced Filters <ChevronDown size={14} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {/* Reset Filters */}
          <button
            onClick={onResetFilters}
            className="btn btn-sm btn-secondary"
            title="Reset Filters"
            style={{ height: '36px', color: '#e11d48' }}
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        {/* Action Buttons: Export & Schedule */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {/* Saved Filters Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              onChange={(e) => {
                const idx = e.target.value;
                if (idx !== '') {
                  const sf = savedFiltersList[idx];
                  if (sf) {
                    Object.entries(sf.filters).forEach(([k, v]) => onFilterChange(k, v));
                  }
                }
              }}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '36px', fontWeight: 600, background: '#f1f5f9' }}
            >
              <option value="">Saved Filter Preset...</option>
              {savedFiltersList.map((sf, idx) => (
                <option key={idx} value={idx}>{sf.name}</option>
              ))}
            </select>
          </div>

          <button onClick={onExportCSV} className="btn btn-sm btn-secondary" style={{ height: '36px' }} title="Export dataset to Excel / CSV">
            <Download size={14} color="#059669" /> Excel / CSV
          </button>

          <button onClick={onExportPDF} className="btn btn-sm btn-secondary" style={{ height: '36px' }} title="Print / Download PDF report document">
            <Printer size={14} color="#2563eb" /> PDF / Print
          </button>

          <button onClick={() => onOpenEmailModal('email')} className="btn btn-sm btn-secondary" style={{ height: '36px' }} title="Send report via Email">
            <Mail size={14} color="#7c3aed" /> Email
          </button>

          <button onClick={() => onOpenEmailModal('schedule')} className="btn btn-sm btn-secondary" style={{ height: '36px' }} title="Schedule automated recurring report">
            <Clock size={14} color="#d97706" /> Schedule
          </button>
        </div>
      </div>

      {/* Advanced Filters Expandable Grid */}
      {showAdvanced && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {/* Customer Filter */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Customer</label>
            <select
              value={filters.customerId || ''}
              onChange={(e) => onFilterChange('customerId', e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '34px' }}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Sales Person Filter */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Sales Person</label>
            <select
              value={filters.salesPersonId || ''}
              onChange={(e) => onFilterChange('salesPersonId', e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '34px' }}
            >
              <option value="">All Sales Persons</option>
              {salesPersons.map((sp) => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>

          {/* Care Of Filter */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Care Of Coordinator</label>
            <select
              value={filters.careOfId || ''}
              onChange={(e) => onFilterChange('careOfId', e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '34px' }}
            >
              <option value="">All Coordinators</option>
              {careOfPersons.map((co) => (
                <option key={co.id} value={co.id}>{co.name}</option>
              ))}
            </select>
          </div>

          {/* Vendor Filter */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Outsource Vendor</label>
            <select
              value={filters.vendorId || ''}
              onChange={(e) => onFilterChange('vendorId', e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '34px' }}
            >
              <option value="">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Product Filter */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Product</label>
            <select
              value={filters.productId || ''}
              onChange={(e) => onFilterChange('productId', e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '34px' }}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Production Status */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Production Status</label>
            <select
              value={filters.productionStatus || ''}
              onChange={(e) => onFilterChange('productionStatus', e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '34px' }}
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Design">Design</option>
              <option value="Printing">Printing</option>
              <option value="Outsource">Outsource</option>
              <option value="Finishing">Finishing</option>
              <option value="Ready for Delivery">Ready for Delivery</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>Payment Status</label>
            <select
              value={filters.paymentStatus || ''}
              onChange={(e) => onFilterChange('paymentStatus', e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '34px' }}
            >
              <option value="">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
              <option value="Credit">Credit</option>
            </select>
          </div>

          {/* GST Type */}
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>GST Tax Type</label>
            <select
              value={filters.gstType || ''}
              onChange={(e) => onFilterChange('gstType', e.target.value)}
              className="form-control"
              style={{ fontSize: '0.78rem', height: '34px' }}
            >
              <option value="">All GST Types</option>
              <option value="ETR">ETR (Exclusive Tax)</option>
              <option value="ITR">ITR (Inclusive Tax)</option>
              <option value="NTR">NTR (No Tax)</option>
            </select>
          </div>

          {/* Save Filter Section */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
            <Bookmark size={16} color="#2563eb" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Save Current Filter View:</span>
            <input
              type="text"
              placeholder="Preset Name (e.g. VIP Corporate Accounts)..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="form-control"
              style={{ width: '260px', height: '32px', fontSize: '0.78rem' }}
            />
            <button onClick={handleSaveFilter} className="btn btn-sm btn-primary" style={{ height: '32px', fontSize: '0.75rem' }}>
              Save Preset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
