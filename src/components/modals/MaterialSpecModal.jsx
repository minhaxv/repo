import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Layers, X, Plus, Edit2, Trash2, Copy, Star, Download, Upload, Check, Search, ArrowUpDown, Power } from 'lucide-react';
import { DEFAULT_UNITS } from '../../types';

export const MaterialSpecModal = ({ isOpen, onClose, product }) => {
  const { productMaterialSpecs, addMaterialSpec, updateMaterialSpec, deleteMaterialSpec, toggleSpecStatus } = useERP();
  const [editingSpec, setEditingSpec] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'gsm', 'status'

  const [formData, setFormData] = useState({
    specName: '',
    materialName: '',
    description: '',
    unit: 'Sq.Ft',
    gsm: 120,
    thickness: '',
    color: '',
    size: '',
    costPrice: 10,
    sellingPrice: 25,
    gstRate: 18,
    hsnCode: '9989',
    status: 'Active',
    isDefault: false
  });

  if (!isOpen || !product) return null;

  // Filter specs for this product
  let productSpecs = (productMaterialSpecs || []).filter((s) => s.productId === product.id);

  // Apply Search
  if (searchTerm) {
    const q = searchTerm.toLowerCase();
    productSpecs = productSpecs.filter(
      (s) =>
        (s.specName || '').toLowerCase().includes(q) ||
        (s.materialName || '').toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.thickness || '').toLowerCase().includes(q)
    );
  }

  // Apply Sorting
  productSpecs.sort((a, b) => {
    if (sortBy === 'name') return (a.specName || '').localeCompare(b.specName || '');
    if (sortBy === 'price') return (b.sellingPrice || 0) - (a.sellingPrice || 0);
    if (sortBy === 'gsm') return (b.gsm || 0) - (a.gsm || 0);
    if (sortBy === 'status') return (a.status || 'Active').localeCompare(b.status || 'Active');
    return 0;
  });

  const resetForm = () => {
    setFormData({
      specName: '',
      materialName: '',
      description: '',
      unit: product.unit || 'Sq.Ft',
      gsm: 120,
      thickness: '',
      color: '',
      size: '',
      costPrice: product.estimatedCost || 10,
      sellingPrice: product.defaultRate || 25,
      gstRate: product.gstRate || 18,
      hsnCode: product.hsnCode || '9989',
      status: 'Active',
      isDefault: productSpecs.length === 0
    });
    setEditingSpec(null);
    setIsAddingNew(false);
    setErrorMsg('');
  };

  const handleStartEdit = (spec) => {
    setEditingSpec(spec);
    setFormData({
      specName: spec.specName || '',
      materialName: spec.materialName || '',
      description: spec.description || '',
      unit: spec.unit || 'Sq.Ft',
      gsm: spec.gsm || 0,
      thickness: spec.thickness || '',
      color: spec.color || '',
      size: spec.size || '',
      costPrice: spec.costPrice || 0,
      sellingPrice: spec.sellingPrice || 0,
      gstRate: spec.gstRate || 18,
      hsnCode: spec.hsnCode || '9989',
      status: spec.status || 'Active',
      isDefault: !!spec.isDefault
    });
    setIsAddingNew(true);
    setErrorMsg('');
  };

  const handleDuplicate = async (spec) => {
    try {
      setErrorMsg('');
      const dupData = {
        ...spec,
        productId: product.id,
        specName: `${spec.specName} (Copy)`,
        isDefault: false
      };
      await addMaterialSpec(dupData);
      setSuccessMsg(`Specification "${spec.specName}" duplicated successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Error duplicating specification.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editingSpec) {
        await updateMaterialSpec(editingSpec.id, {
          ...formData,
          productId: product.id
        });
        setSuccessMsg(`Specification "${formData.specName}" updated!`);
      } else {
        await addMaterialSpec({
          ...formData,
          productId: product.id
        });
        setSuccessMsg(`New Specification "${formData.specName}" created!`);
      }
      resetForm();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save specification.');
    }
  };

  const handleSetDefault = async (specId) => {
    try {
      await updateMaterialSpec(specId, { productId: product.id, isDefault: true });
      setSuccessMsg('Default material specification updated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Failed to update default spec.');
    }
  };

  // CSV Export & Import for Specifications
  const handleExportCSV = () => {
    if (productSpecs.length === 0) {
      alert('No specifications to export.');
      return;
    }
    const headers = ["Spec Name", "Material Name", "Unit", "GSM", "Thickness", "Color", "Cost Price", "Selling Price", "GST Rate", "HSN Code", "Is Default", "Status", "Description"];
    const rows = productSpecs.map(s => [
      `"${s.specName}"`,
      `"${s.materialName || ''}"`,
      `"${s.unit || 'Sq.Ft'}"`,
      s.gsm || 0,
      `"${s.thickness || ''}"`,
      `"${s.color || ''}"`,
      s.costPrice || 0,
      s.sellingPrice || 0,
      s.gstRate || 18,
      `"${s.hsnCode || '9989'}"`,
      s.isDefault ? "YES" : "NO",
      `"${s.status || 'Active'}"`,
      `"${s.description || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${product.name.replace(/\s+/g, '_')}_Material_Specs.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length <= 1) return;

        let addedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 2 && cols[0]) {
            try {
              await addMaterialSpec({
                productId: product.id,
                specName: cols[0],
                materialName: cols[1] || cols[0],
                unit: cols[2] || product.unit || 'Sq.Ft',
                gsm: parseFloat(cols[3]) || 0,
                thickness: cols[4] || '',
                color: cols[5] || '',
                costPrice: parseFloat(cols[6]) || 0,
                sellingPrice: parseFloat(cols[7]) || 0,
                gstRate: parseFloat(cols[8]) || 18,
                hsnCode: cols[9] || '9989',
                isDefault: cols[10] === 'YES',
                status: cols[11] || 'Active',
                description: cols[12] || ''
              });
              addedCount++;
            } catch (err) {
              console.warn("Skip duplicate imported spec:", cols[0]);
            }
          }
        }
        alert(`Successfully imported ${addedCount} material specifications for ${product.name}!`);
      } catch (err) {
        alert('Error parsing CSV file. Please ensure correct CSV format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '940px', width: '92vw' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={22} color="#93c5fd" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Dynamic Material Specifications Master — {product.name}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#bfdbfe' }}>
                Create, Edit, Delete, Search, Sort & Set Defaults for linked substrate grades
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {errorMsg && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
              {successMsg}
            </div>
          )}

          {/* Action & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1, minWidth: '240px' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ paddingLeft: '30px' }}
                  placeholder="Search specs (e.g. PVC, Vinyl, 3mm)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ArrowUpDown size={14} color="#64748b" />
                <select
                  className="form-select form-select-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{ width: '130px' }}
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="gsm">Sort by GSM</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleExportCSV}
                className="btn btn-secondary btn-sm"
                title="Export Specifications to CSV"
              >
                <Download size={14} /> Export CSV
              </button>

              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }} title="Import Specifications from CSV">
                <Upload size={14} /> Import CSV
                <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
              </label>

              {!isAddingNew && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsAddingNew(true);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={14} /> + Add Specification
                </button>
              )}
            </div>
          </div>

          {/* Specification Create/Edit Form */}
          {isAddingNew && (
            <form onSubmit={handleSubmit} style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '8px', border: '1.5px solid #2563eb' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e40af', marginBottom: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{editingSpec ? `Edit Specification: ${editingSpec.specName}` : 'Add New Material Specification'}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Linked Product: {product.name}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Specification Name *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. PVC Glossy Sticker or 5mm Sunboard"
                    value={formData.specName}
                    onChange={(e) => setFormData({ ...formData, specName: e.target.value })}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Raw Material Name</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. PVC Self-Adhesive Film"
                    value={formData.materialName}
                    onChange={(e) => setFormData({ ...formData, materialName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Measurement Unit</label>
                  <select
                    className="form-select form-select-sm"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Selling Rate (₹) *</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ fontWeight: 700, color: '#1e40af' }}
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estimated Cost Price (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GSM / Density</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="e.g. 240 or 350"
                    value={formData.gsm}
                    onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Thickness / Gauge</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. 3mm or 100 micron"
                    value={formData.thickness}
                    onChange={(e) => setFormData({ ...formData, thickness: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Color / Finish</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. White Gloss or Rainbow Laser"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">HSN / SAC Code</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="9989"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GST Rate %</label>
                  <select
                    className="form-select form-select-sm"
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                  >
                    <option value={18}>18% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={5}>5% GST</option>
                    <option value={0}>0% (Exempt)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select form-select-sm"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.85rem' }}>
                <label className="form-label">Description / Specifications Note</label>
                <textarea
                  className="form-control form-control-sm"
                  rows="2"
                  placeholder="Technical specs, substrate details, application instructions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  />
                  <strong style={{ color: '#d97706' }}>Set as Default Specification for {product.name}</strong>
                </label>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => setIsAddingNew(false)} className="btn btn-secondary btn-sm">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    <Check size={14} /> {editingSpec ? 'Update Specification' : 'Save Specification'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Specifications Dynamic Table */}
          <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Spec Name</th>
                  <th>Raw Substrate</th>
                  <th>Unit</th>
                  <th>Specs (GSM/Thick)</th>
                  <th>Selling Price (₹)</th>
                  <th>Cost Price (₹)</th>
                  <th>GST %</th>
                  <th>Status</th>
                  <th>Default?</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {productSpecs.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No material specifications found. Click "+ Add Specification" to create linked substrate grades.
                    </td>
                  </tr>
                ) : (
                  productSpecs.map((s) => (
                    <tr key={s.id} style={{ background: s.isDefault ? '#fefce8' : 'inherit', opacity: s.status === 'Inactive' ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>
                        {s.specName}
                        {s.description && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', fontWeight: 400 }}>{s.description}</div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: '#475569' }}>{s.materialName || s.specName}</td>
                      <td>{s.unit}</td>
                      <td style={{ fontSize: '0.78rem' }}>
                        {s.gsm ? `${s.gsm}gsm ` : ''}{s.thickness ? `| ${s.thickness} ` : ''}{s.color ? `| ${s.color}` : ''}
                      </td>
                      <td style={{ fontWeight: 800, color: '#1e40af' }}>₹{s.sellingPrice}</td>
                      <td style={{ color: '#64748b' }}>₹{s.costPrice}</td>
                      <td>{s.gstRate}%</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleSpecStatus(s.id)}
                          className={`badge ${s.status === 'Inactive' ? 'badge-rose' : 'badge-emerald'}`}
                          style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <Power size={10} /> {s.status || 'Active'}
                        </button>
                      </td>
                      <td>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name={`default_spec_${product.id}`}
                            checked={!!s.isDefault}
                            onChange={() => handleSetDefault(s.id)}
                          />
                          {s.isDefault ? (
                            <span className="badge badge-amber" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Star size={10} fill="#d97706" /> Default
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Set Default</span>
                          )}
                        </label>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(s)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.4rem' }}
                            title="Edit Specification"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicate(s)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.4rem', color: '#2563eb' }}
                            title="Duplicate Specification"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete specification "${s.specName}"?`)) {
                                deleteMaterialSpec(s.id);
                              }
                            }}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.4rem', color: '#f43f5e' }}
                            title="Delete Specification"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
};
