import React, { useState } from 'react';
import { useERP } from '../context/ERPContext';
import { CreateEmployeeModal, DEPARTMENTS } from '../components/modals/CreateEmployeeModal';
import { Users, UserPlus, Search, Edit2, Trash2, Power, Briefcase, Phone, Mail, Award, CheckCircle, ShieldCheck } from 'lucide-react';

export const EmployeesView = () => {
  const { employees, updateEmployee, deleteEmployee, toggleEmployeeStatus } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const filteredEmployees = (employees || []).filter((emp) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
    const matchesSearch =
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.code || '').toLowerCase().includes(q) ||
      (emp.mobile || '').includes(q) ||
      (emp.department || '').toLowerCase().includes(q) ||
      (emp.designation || '').toLowerCase().includes(q);

    return matchesDept && matchesSearch;
  });

  // Calculate Metrics
  const totalEmps = (employees || []).length;
  const activeEmps = (employees || []).filter((e) => e.status !== 'Inactive').length;
  const salesCount = (employees || []).filter((e) => e.department === 'Sales').length;
  const designCount = (employees || []).filter((e) => e.department === 'Design').length;
  const prodCount = (employees || []).filter((e) => e.department === 'Printing' || e.department === 'Production').length;

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} color="#2563eb" /> Centralized Employee Master
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Single unified directory for Sales Executives, Designers, Machine Operators, Delivery Executives & Accounts Staff
          </span>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
          <UserPlus size={16} /> + Add New Employee
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '0.85rem 1rem', background: '#eff6ff', borderColor: '#bfdbfe' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>Total Workforce</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e3a8a', marginTop: '2px' }}>{totalEmps} Staff</div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46' }}>Active Employees</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#064e3b', marginTop: '2px' }}>{activeEmps} Active</div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', background: '#fef3c7', borderColor: '#fde68a' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#92400e' }}>Sales Force</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#78350f', marginTop: '2px' }}>{salesCount} Sales Execs</div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', background: '#f3e8ff', borderColor: '#e9d5ff' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b21a8' }}>Creative Design Team</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#581c87', marginTop: '2px' }}>{designCount} Designers</div>
        </div>

        <div className="card" style={{ padding: '0.85rem 1rem', background: '#e0f2fe', borderColor: '#bae6fd' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#075985' }}>Production & Operators</span>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0c4a6e', marginTop: '2px' }}>{prodCount} Operators</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Filter & Search Bar */}
        <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {/* Department Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '2px' }}>
            <button
              onClick={() => setSelectedDept('ALL')}
              className={`btn btn-sm ${selectedDept === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', fontWeight: 700 }}
            >
              All Departments
            </button>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`btn btn-sm ${selectedDept === dept ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', fontWeight: 700 }}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ width: '280px', position: 'relative' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ paddingLeft: '30px' }}
              placeholder="Search code, name, mobile, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Employee Name</th>
                <th>Department & Designation</th>
                <th>Role</th>
                <th>Contact Details</th>
                <th>Salary Structure</th>
                <th>Joining Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    No employees found matching filter criteria. Click "+ Add New Employee" to register staff.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} style={{ opacity: emp.status === 'Inactive' ? 0.6 : 1 }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#64748b' }}>{emp.code || emp.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {emp.photo ? (
                          <img src={emp.photo} alt={emp.name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#e2e8f0', color: '#1e40af', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                            {emp.name ? emp.name.charAt(0) : 'E'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, color: '#0f172a' }}>{emp.name}</div>
                          {emp.branch && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>📍 {emp.branch}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1e40af' }}>{emp.department}</div>
                      <div style={{ fontSize: '0.75rem', color: '#475569' }}>{emp.designation}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        emp.department === 'Sales' ? 'badge-amber' :
                        emp.department === 'Design' ? 'badge-purple' :
                        emp.department === 'Delivery' ? 'badge-sky' :
                        emp.department === 'Accounts' ? 'badge-emerald' : 'badge-blue'
                      }`}>
                        {emp.role || emp.department}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <Phone size={12} color="#2563eb" /> {emp.mobile || 'N/A'}
                      </div>
                      {emp.email && (
                        <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Mail size={10} color="#64748b" /> {emp.email}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                        ₹{Number(emp.basicSalary || 0).toLocaleString()}/mo
                      </div>
                      {emp.commissionRate > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700 }}>
                          ★ {emp.commissionRate}% Commission
                        </div>
                      )}
                      {emp.incentiveRate > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                          ⚡ ₹{emp.incentiveRate} Incentive
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{emp.joiningDate || 'N/A'}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => toggleEmployeeStatus(emp.id)}
                        className={`badge ${emp.status === 'Inactive' ? 'badge-rose' : 'badge-emerald'}`}
                        style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                      >
                        <Power size={10} /> {emp.status || 'Active'}
                      </button>
                    </td>
                     <td style={{ textAlign: 'center' }}>
                       <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                         <button
                           type="button"
                           onClick={() => {
                             setEditingEmployee(emp);
                             setIsAddModalOpen(true);
                           }}
                           className="btn btn-sm btn-primary"
                           style={{ padding: '0.2rem 0.45rem', color: '#2563eb' }}
                           title="Edit Employee"
                         >
                           <Edit2 size={12} />
                         </button>
                         <button
                           type="button"
                           onClick={() => {
                             if (window.confirm(`Delete employee record "${emp.name}"?`)) {
                               deleteEmployee(emp.id);
                             }
                           }}
                           className="btn btn-sm btn-secondary"
                           style={{ padding: '0.2rem 0.45rem', color: '#f43f5e' }}
                           title="Delete Employee"
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

       <CreateEmployeeModal
         isOpen={isAddModalOpen}
         onClose={() => { setIsAddModalOpen(false); setEditingEmployee(null); }}
         defaultDepartment={selectedDept === 'ALL' ? 'Sales' : selectedDept}
         editingEmployee={editingEmployee}
         onEmployeeUpdated={() => setEditingEmployee(null)}
       />
    </div>
  );
};
