import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { PRODUCTION_STAGES } from '../types';
import {
  Workflow,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Layers,
  ArrowRight,
  Save,
  X,
  Sliders,
  Palette,
  Printer,
  Scissors,
  CheckSquare,
  Truck,
  Building2,
  Cpu
} from 'lucide-react';

export const WorkflowsView = () => {
  const {
    workflows,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    productionProcesses,
    addProductionProcess,
    updateProductionProcess,
    deleteProductionProcess
  } = useERP();

  const [activeSection, setActiveSection] = useState('pipelines'); // 'pipelines' | 'processes'
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);

  // Process modal state
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [processForm, setProcessForm] = useState({
    name: '',
    department: 'Printing',
    defaultRate: 0,
    unit: 'Sq.Ft',
    description: '',
    isActive: true
  });

  const openAddProcessModal = () => {
    setEditingProcess(null);
    setProcessForm({
      name: '',
      department: 'Printing',
      defaultRate: 0,
      unit: 'Sq.Ft',
      description: '',
      isActive: true
    });
    setIsProcessModalOpen(true);
  };

  const openEditProcessModal = (proc) => {
    setEditingProcess(proc);
    setProcessForm({
      name: proc.name,
      department: proc.department || 'Printing',
      defaultRate: proc.defaultRate || 0,
      unit: proc.unit || 'Sq.Ft',
      description: proc.description || '',
      isActive: proc.isActive !== false
    });
    setIsProcessModalOpen(true);
  };

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (!processForm.name) return;
    try {
      if (editingProcess) {
        await updateProductionProcess(editingProcess.id, processForm);
      } else {
        await addProductionProcess(processForm);
      }
      setIsProcessModalOpen(false);
    } catch (err) {
      alert(`Error saving process: ${err.message}`);
    }
  };

  // Available stage templates
  const allAvailableStages = [
    'Designing',
    'Customer Proof Approval',
    'Pre-Press / RIP',
    'Printing',
    'Lamination',
    'Die-Cutting / Trimming',
    'Eyeletting & Hemming',
    'Folding & Binding',
    'Laser / CNC Fabrication',
    'LED & Electrical Assembly',
    'Outsource Job Work',
    'Quality Check (QC)',
    'Ready for Delivery',
    'Delivered'
  ];

  const [formData, setFormData] = useState({
    name: '',
    category: 'Commercial Print',
    description: '',
    stages: ['Designing', 'Printing', 'Finishing', 'Quality Check', 'Ready for Delivery', 'Delivered'],
    estimatedHours: 24,
    defaultMachineType: 'Large Format Flex & Banner'
  });

  const openAddModal = () => {
    setEditingWorkflow(null);
    setFormData({
      name: '',
      category: 'Commercial Print',
      description: '',
      stages: ['Designing', 'Printing', 'Finishing', 'Quality Check', 'Ready for Delivery', 'Delivered'],
      estimatedHours: 24,
      defaultMachineType: 'Large Format Flex & Banner'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (wf) => {
    setEditingWorkflow(wf);
    setFormData({
      name: wf.name || '',
      category: wf.category || 'Commercial Print',
      description: wf.description || '',
      stages: wf.stages || ['Designing', 'Printing', 'Finishing', 'Quality Check', 'Ready for Delivery'],
      estimatedHours: wf.estimatedHours || 24,
      defaultMachineType: wf.defaultMachineType || 'Large Format Flex & Banner'
    });
    setIsModalOpen(true);
  };

  const toggleStage = (st) => {
    const current = [...formData.stages];
    if (current.includes(st)) {
      setFormData({ ...formData, stages: current.filter((s) => s !== st) });
    } else {
      setFormData({ ...formData, stages: [...current, st] });
    }
  };

  const moveStage = (index, direction) => {
    const current = [...formData.stages];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIdx];
    current[targetIdx] = temp;
    setFormData({ ...formData, stages: current });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingWorkflow) {
      await updateWorkflow(editingWorkflow.id, formData);
    } else {
      await addWorkflow(formData);
    }
    setIsModalOpen(false);
  };

  // Filtered workflows
  const filteredWorkflows = (workflows || []).filter((w) => {
    const q = searchQuery.toLowerCase();
    return (
      (w.name || '').toLowerCase().includes(q) ||
      (w.category || '').toLowerCase().includes(q) ||
      (w.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Workflow size={24} color="#2563eb" /> Workflows & Production Processes Master
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Central master definition for shop-floor production routes, operations & processes (used across Production Board and Tasks).
          </span>
        </div>

        {activeSection === 'pipelines' ? (
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={16} /> + Create New Workflow
          </button>
        ) : (
          <button onClick={openAddProcessModal} className="btn btn-primary">
            <Plus size={16} /> + Add New Process
          </button>
        )}
      </div>

      {/* Sub-Tabs: Pipelines vs Processes */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setActiveSection('pipelines')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1.15rem',
            fontSize: '0.88rem',
            fontWeight: activeSection === 'pipelines' ? 800 : 600,
            color: activeSection === 'pipelines' ? '#2563eb' : '#64748b',
            background: 'none',
            border: 'none',
            borderBottom: activeSection === 'pipelines' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <Workflow size={16} /> Product Workflows & Pipelines ({workflows.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('processes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1.15rem',
            fontSize: '0.88rem',
            fontWeight: activeSection === 'processes' ? 800 : 600,
            color: activeSection === 'processes' ? '#2563eb' : '#64748b',
            background: 'none',
            border: 'none',
            borderBottom: activeSection === 'processes' ? '3px solid #2563eb' : '3px solid transparent',
            cursor: 'pointer'
          }}
        >
          <Layers size={16} /> Standard Processes Master ({(productionProcesses || []).length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
            {activeSection === 'pipelines' ? `${workflows.length} Active Production Workflows` : `${(productionProcesses || []).length} Configured Production Processes`}
          </div>

          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder={activeSection === 'pipelines' ? "Search Workflows, Categories..." : "Search Process name, Department..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: WORKFLOWS PIPELINES */}
      {activeSection === 'pipelines' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {filteredWorkflows.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', gridColumn: '1 / -1' }}>
            <Workflow size={44} color="#94a3b8" style={{ marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.5rem 0' }}>No Workflow Routes Found</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>Define custom multi-stage production routes for your products.</p>
            <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} /> Create Production Route
            </button>
          </div>
        )}
        {filteredWorkflows.map((wf) => (
          <div
            key={wf.id}
            className="card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderTop: '4px solid #7c3aed'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#7c3aed' }}>{wf.id}</span>
                  <h3 style={{ margin: '0.1rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {wf.name}
                  </h3>
                  <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                    {wf.category || 'General'}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                  ⏱️ ~{wf.estimatedHours || 24}h SLA
                </span>
              </div>

              {wf.description && (
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.5rem 0' }}>
                  {wf.description}
                </p>
              )}

              {/* Visual Stages Sequence */}
              <div style={{ marginTop: '0.85rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  PRODUCTION STAGE ROUTE ({wf.stages?.length || 0} STAGES)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
                  {(wf.stages || []).map((stage, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.78rem',
                        background: '#f8fafc',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.72rem', width: '18px' }}>
                        {idx + 1}.
                      </span>
                      <span style={{ fontWeight: 700, color: '#0f172a', flex: 1 }}>{stage}</span>
                      {idx < wf.stages.length - 1 && (
                        <ArrowRight size={12} color="#94a3b8" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '1rem' }}>
              <button onClick={() => openEditModal(wf)} className="btn btn-sm btn-secondary" style={{ fontSize: '0.75rem' }}>
                <Edit size={13} /> Edit Route
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete workflow "${wf.name}"?`)) {
                    deleteWorkflow(wf.id);
                  }
                }}
                className="btn btn-sm btn-danger"
                style={{ fontSize: '0.75rem' }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* SECTION 2: PRODUCTION PROCESSES MASTER */}
      {activeSection === 'processes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Process Name</th>
                    <th>Department</th>
                    <th>Description</th>
                    <th>Default Rate (₹)</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(productionProcesses || [])
                    .filter(p => {
                      const q = (searchQuery || '').toLowerCase();
                      return !q || (p.name || '').toLowerCase().includes(q) || (p.department || '').toLowerCase().includes(q);
                    })
                    .map((proc) => (
                      <tr key={proc.id}>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: proc.isActive !== false ? '#16a34a' : '#94a3b8'
                              }}
                            />
                            {proc.name}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-slate" style={{ fontSize: '0.72rem' }}>
                            {proc.department || 'Production'}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                          {proc.description || 'Standard print shop operation'}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          ₹{Number(proc.defaultRate || 0).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600 }}>{proc.unit || 'Sq.Ft'}</td>
                        <td>
                          <span className={`badge ${proc.isActive !== false ? 'badge-emerald' : 'badge-slate'}`}>
                            {proc.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                            <button
                              type="button"
                              onClick={() => openEditProcessModal(proc)}
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '0.2rem 0.5rem', color: '#2563eb' }}
                              title="Edit Process"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete process "${proc.name}"?`)) {
                                  deleteProductionProcess(proc.id);
                                }
                              }}
                              className="btn btn-sm btn-danger"
                              style={{ padding: '0.2rem 0.5rem' }}
                              title="Delete Process"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {(productionProcesses || []).length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No production processes configured yet. Click "+ Add New Process" to create standard operations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Process Modal */}
      {isProcessModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProcessModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontWeight: 800 }}>
                  {editingProcess ? 'Edit Production Process' : 'Add New Production Process'}
                </h3>
              </div>
              <button onClick={() => setIsProcessModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Process Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Digital Printing, Thermal Lamination, CNC Acrylic Cutting"
                  required
                  value={processForm.name}
                  onChange={(e) => setProcessForm({ ...processForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Department</label>
                  <select
                    className="form-select"
                    value={processForm.department}
                    onChange={(e) => setProcessForm({ ...processForm, department: e.target.value })}
                  >
                    <option value="Pre-Press">Pre-Press</option>
                    <option value="Printing">Printing</option>
                    <option value="Finishing">Finishing</option>
                    <option value="Fabrication">Fabrication</option>
                    <option value="Quality Check">Quality Check</option>
                    <option value="Dispatch">Dispatch</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Default Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={processForm.defaultRate}
                    onChange={(e) => setProcessForm({ ...processForm, defaultRate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Billing Unit</label>
                  <select
                    className="form-select"
                    value={processForm.unit}
                    onChange={(e) => setProcessForm({ ...processForm, unit: e.target.value })}
                  >
                    <option value="Sq.Ft">Sq.Ft</option>
                    <option value="Sq.Inch">Sq.Inch</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Nos">Nos</option>
                    <option value="R.Ft">R.Ft</option>
                    <option value="Hours">Hours</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Status</label>
                  <select
                    className="form-select"
                    value={processForm.isActive ? 'Active' : 'Inactive'}
                    onChange={(e) => setProcessForm({ ...processForm, isActive: e.target.value === 'Active' })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Description & Guidelines</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Standard operating procedure and equipment details..."
                  value={processForm.description}
                  onChange={(e) => setProcessForm({ ...processForm, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsProcessModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} /> Save Process
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Workflow Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Workflow size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontWeight: 800 }}>
                  {editingWorkflow ? 'Edit Production Workflow Route' : 'Create Custom Workflow Route'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Workflow Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 3D LED Acrylic Signboard Route"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Product Category</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Commercial Print">Commercial Print (Brochures/Flyers)</option>
                    <option value="Large Format Flex">Large Format Flex & Banners</option>
                    <option value="Signage & Acrylic">Signage & 3D Fabrication</option>
                    <option value="Laser & CNC">Laser Cutting & Engraving</option>
                    <option value="Digital Laser">Digital Quick Laser Print</option>
                    <option value="Outsource Job Work">Outsourced Specialty Services</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700 }}>Estimated Turnaround SLA (Hours)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="e.g. 24"
                    value={formData.estimatedHours}
                    onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700 }}>Workflow Description / Notes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="e.g. For all multi-page folded brochures requiring matte lamination..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Configurable Stages Builder */}
              <div>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.4rem' }}>
                  Configure Route Stages (Click to Include/Exclude):
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  {allAvailableStages.map((st) => {
                    const isSelected = formData.stages.includes(st);
                    return (
                      <button
                        type="button"
                        key={st}
                        onClick={() => toggleStage(st)}
                        className={`badge ${isSelected ? 'badge-blue' : 'badge-slate'}`}
                        style={{ cursor: 'pointer', padding: '0.35rem 0.6rem', fontSize: '0.78rem', border: isSelected ? '1.5px solid #2563eb' : '1px dashed #cbd5e1' }}
                      >
                        {isSelected ? '✓ ' : '+ '}{st}
                      </button>
                    );
                  })}
                </div>

                {/* Ordered Current Pipeline */}
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569' }}>ACTIVE STAGES SEQUENCE (Drag / Reorder):</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
                    {formData.stages.map((st, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#ffffff',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.82rem'
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{idx + 1}. {st}</span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveStage(idx, -1)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem' }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            disabled={idx === formData.stages.length - 1}
                            onClick={() => moveStage(idx, 1)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem' }}
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} /> Save Workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
