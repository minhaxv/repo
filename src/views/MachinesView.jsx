import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { MACHINE_TYPES, MACHINE_STATUS } from '../types';
import { formatINR } from '../utils/reportEngine';
import {
  Cpu,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Factory,
  Wrench,
  Layers,
  Save,
  X
} from 'lucide-react';

export const MachinesView = () => {
  const { machines, addMachine, updateMachine, deleteMachine, employees, salesOrders } = useERP();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    type: 'Large Format Flex & Banner',
    status: 'Running',
    location: 'Digital Printing Bay A',
    hourlyCost: 450,
    assignedOperatorId: '',
    assignedOperatorName: '',
    maintenanceInfo: ''
  });

  const openAddModal = () => {
    setEditingMachine(null);
    setFormData({
      name: '',
      model: '',
      type: 'Large Format Flex & Banner',
      status: 'Running',
      location: 'Digital Printing Bay A',
      hourlyCost: 450,
      assignedOperatorId: '',
      assignedOperatorName: '',
      maintenanceInfo: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (mch) => {
    setEditingMachine(mch);
    setFormData({
      name: mch.name || '',
      model: mch.model || '',
      type: mch.type || 'Large Format Flex & Banner',
      status: mch.status || 'Running',
      location: mch.location || '',
      hourlyCost: mch.hourlyCost || 0,
      assignedOperatorId: mch.assignedOperatorId || '',
      assignedOperatorName: mch.assignedOperatorName || '',
      maintenanceInfo: mch.maintenanceInfo || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    const op = (employees || []).find((em) => em.id === formData.assignedOperatorId);

    const payload = {
      ...formData,
      assignedOperatorName: op?.name || formData.assignedOperatorName || ''
    };

    if (editingMachine) {
      await updateMachine(editingMachine.id, payload);
    } else {
      await addMachine(payload);
    }
    setIsModalOpen(false);
  };

  // Calculate live machine workload from active sales order line items
  const getMachineWorkload = (machineName) => {
    let count = 0;
    (salesOrders || []).forEach((o) => {
      if (o.productionStatus !== 'Delivered' && o.productionStatus !== 'Cancelled') {
        (o.items || []).forEach((i) => {
          if (i.assignedMachineName === machineName || (i.assignedMachineId && i.assignedMachineId === machineName)) {
            count++;
          }
        });
      }
    });
    return count;
  };

  // Filtered Machines
  const filteredMachines = (machines || []).filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (m.name || '').toLowerCase().includes(q) ||
      (m.model || '').toLowerCase().includes(q) ||
      (m.type || '').toLowerCase().includes(q) ||
      (m.location || '').toLowerCase().includes(q) ||
      (m.assignedOperatorName && m.assignedOperatorName.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;

    return true;
  });

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={24} color="#2563eb" /> Printing Press & Machinery Management
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Manage production presses, large-format printers, cutters, hourly costs, maintenance logs & live floor workload.
          </span>
        </div>

        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={16} /> + Add Machine
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>TOTAL REGISTERED MACHINES</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {machines.length} Units
          </div>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
            {machines.filter((m) => m.status === 'Running').length} Currently Running
          </span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>ACTIVE SHOP-FLOOR WORKLOAD</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', margin: '0.2rem 0' }}>
            {machines.reduce((sum, m) => sum + (m.activeJobCount || getMachineWorkload(m.name)), 0)} Jobs in Queue
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Distributed Across Workstations</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>STANDBY / IDLE MACHINES</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>
            {machines.filter((m) => m.status === 'Idle').length} Idle
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Ready for Instant Job Allocation</span>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>MAINTENANCE & SERVICING</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', margin: '0.2rem 0' }}>
            {machines.filter((m) => m.status === 'Maintenance' || m.status === 'Breakdown').length} Units
          </div>
          <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>Under Scheduled Service</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', fontSize: '0.75rem' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Running">Running (Active)</option>
              <option value="Idle">Idle (Available)</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Breakdown">Breakdown</option>
            </select>

            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', fontSize: '0.75rem' }}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Machine Types</option>
              {Object.values(MACHINE_TYPES).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Machine, Model, Operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Machines Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {filteredMachines.map((mch) => {
          const workload = mch.activeJobCount || getMachineWorkload(mch.name);
          const isRunning = mch.status === 'Running';
          const isIdle = mch.status === 'Idle';
          const isMaint = mch.status === 'Maintenance' || mch.status === 'Breakdown';

          return (
            <div
              key={mch.id}
              className="card"
              style={{
                borderTop: isRunning ? '4px solid #16a34a' : isIdle ? '4px solid #f59e0b' : '4px solid #dc2626',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.25rem'
              }}
            >
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>{mch.id}</span>
                    <h3 style={{ margin: '0.1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {mch.name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{mch.model}</span>
                  </div>

                  <span
                    className={`badge ${isRunning ? 'badge-emerald' : isIdle ? 'badge-amber' : 'badge-rose'}`}
                    style={{ fontSize: '0.72rem', fontWeight: 800 }}
                  >
                    {mch.status}
                  </span>
                </div>

                {/* Specs & Rates */}
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong style={{ color: '#475569' }}>Type:</strong> <span className="badge badge-blue">{mch.type}</span></div>
                  <div><strong style={{ color: '#475569' }}>Location:</strong> 📍 {mch.location || 'Floor A'}</div>
                  <div><strong style={{ color: '#475569' }}>Hourly Cost Rate:</strong> <strong style={{ color: '#0f172a' }}>₹{mch.hourlyCost || 0}/hr</strong></div>
                  <div><strong style={{ color: '#475569' }}>Assigned Operator:</strong> 👤 {mch.assignedOperatorName || 'Unassigned'}</div>
                </div>

                {/* Workload Meter */}
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '3px' }}>
                    <span style={{ color: '#64748b' }}>Current Floor Workload:</span>
                    <span style={{ color: workload > 0 ? '#2563eb' : '#64748b' }}>{workload} Active Job{workload === 1 ? '' : 's'}</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, workload * 20)}%`, height: '100%', backgroundColor: workload > 4 ? '#ef4444' : workload > 0 ? '#2563eb' : '#cbd5e1' }} />
                  </div>
                </div>

                {/* Maintenance Notes */}
                {mch.maintenanceInfo && (
                  <div style={{ fontSize: '0.74rem', color: '#64748b', background: '#fffbeb', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #fef3c7', marginBottom: '0.75rem' }}>
                    <strong>🛠️ Maintenance:</strong> {mch.maintenanceInfo}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                <button
                  onClick={() => openEditModal(mch)}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: '0.75rem' }}
                >
                  <Edit size={13} /> Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete machine "${mch.name}"?`)) {
                      deleteMachine(mch.id);
                    }
                  }}
                  className="btn btn-sm btn-danger"
                  style={{ fontSize: '0.75rem' }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Machine Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontWeight: 800 }}>
                  {editingMachine ? 'Edit Machine Details' : 'Add New Production Machine'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Machine Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Roland TrueVIS VG3-640"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Model / Serial</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. VG3-640 Dual Head"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Machine Type</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    {Object.values(MACHINE_TYPES).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Operating Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Running">Running (Active)</option>
                    <option value="Idle">Idle (Available)</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Breakdown">Breakdown</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Hourly Cost Rate (₹/hr)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 450"
                    value={formData.hourlyCost}
                    onChange={(e) => setFormData({ ...formData, hourlyCost: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Location / Bay</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Digital Printing Bay A"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Assigned Primary Operator</label>
                  <select
                    className="form-select"
                    value={formData.assignedOperatorId}
                    onChange={(e) => setFormData({ ...formData, assignedOperatorId: e.target.value })}
                  >
                    <option value="">-- Unassigned --</option>
                    {(employees || []).map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role || emp.department})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Maintenance & Servicing Schedule</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. Daily head cleaning, weekly wiper maintenance, scheduled service on 15th..."
                  value={formData.maintenanceInfo}
                  onChange={(e) => setFormData({ ...formData, maintenanceInfo: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} /> Save Machine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
