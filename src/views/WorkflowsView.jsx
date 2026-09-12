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
  const { workflows, addWorkflow, updateWorkflow, deleteWorkflow, products } = useERP();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);

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
            <Workflow size={24} color="#2563eb" /> Configurable Product Workflows Master
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Define custom shop-floor production pipelines per product category (e.g. Brochure, Flex, Acrylic Sign, Outsource).
          </span>
        </div>

        <button onClick={openAddModal} className="btn btn-primary">
          <Plus size={16} /> + Create New Workflow
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
            {workflows.length} Active Production Workflows
          </div>

          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px' }}
              placeholder="Search Workflows, Categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Workflows Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
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
