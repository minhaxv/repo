import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserPlus, X, Check, Shield, Briefcase, Phone, Mail, DollarSign, MapPin } from 'lucide-react';

export const DEPARTMENTS = [
  'Sales',
  'Design',
  'Printing',
  'Production',
  'Finishing',
  'Lamination',
  'Packing',
  'Delivery',
  'Accounts',
  'Purchase',
  'Administration'
];

export const DESIGNATIONS = [
  'Sales Executive',
  'Senior Sales Executive',
  'Key Account Manager',
  'Graphic Designer',
  'Senior Designer',
  '3D Signage Specialist',
  'Machine Operator',
  'Flex & Vinyl Specialist',
  'Production Supervisor',
  'Delivery Executive',
  'Installation Driver',
  'Accountant',
  'Purchase Executive',
  'Manager',
  'Admin'
];

export const SALARY_TYPES = [
  'Fixed Salary',
  'Commission %',
  'Commission + Base',
  'Per Job Incentive',
  'Monthly Incentive'
];

export const CreateEmployeeModal = ({ isOpen, onClose, onEmployeeCreated, editingEmployee = null, onEmployeeUpdated, defaultDepartment = 'Sales' }) => {
  const { employees, addEmployee, updateEmployee } = useERP();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    photo: '',
    mobile: '',
    email: '',
    department: defaultDepartment,
    designation: 'Sales Executive',
    role: 'Sales',
    branch: 'Head Office',
    joiningDate: new Date().toISOString().split('T')[0],
    salaryType: 'Fixed Salary',
    basicSalary: 25000,
    commissionRate: 3.5,
    incentiveRate: 50,
    status: 'Active',
    address: '',
    emergencyContact: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsSubmitting(false);
      if (editingEmployee) {
        // Edit mode: populate form with existing employee data
        setFormData({
          code: editingEmployee.code || '',
          name: editingEmployee.name || '',
          photo: editingEmployee.photo || '',
          mobile: editingEmployee.mobile || '',
          email: editingEmployee.email || '',
          department: editingEmployee.department || defaultDepartment,
          designation: editingEmployee.designation || 'Sales Executive',
          role: editingEmployee.role || 'Sales',
          branch: editingEmployee.branch || 'Head Office',
          joiningDate: editingEmployee.joiningDate ? editingEmployee.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0],
          salaryType: editingEmployee.salaryType || 'Fixed Salary',
          basicSalary: editingEmployee.basicSalary || 25000,
          commissionRate: editingEmployee.commissionRate || 3.5,
          incentiveRate: editingEmployee.incentiveRate || 50,
          status: editingEmployee.status || 'Active',
          address: editingEmployee.address || '',
          emergencyContact: editingEmployee.emergencyContact || '',
          notes: editingEmployee.notes || ''
        });
      } else {
        const randomNum = Math.floor(100 + Math.random() * 900);
        const prefix = defaultDepartment.substring(0, 3).toUpperCase();
        setFormData((prev) => ({
          ...prev,
          code: `EMP-${prefix}-${randomNum}`,
          department: defaultDepartment,
          designation: defaultDepartment === 'Design' ? 'Graphic Designer' :
                       defaultDepartment === 'Production' || defaultDepartment === 'Printing' ? 'Machine Operator' :
                       defaultDepartment === 'Delivery' ? 'Delivery Executive' :
                       defaultDepartment === 'Accounts' ? 'Accountant' : 'Sales Executive',
          role: defaultDepartment === 'Design' ? 'Designer' :
                 defaultDepartment === 'Production' || defaultDepartment === 'Printing' ? 'Production' :
                 defaultDepartment === 'Delivery' ? 'Delivery' :
                 defaultDepartment === 'Accounts' ? 'Accounts' : 'Sales'
        }));
      }
    }
  }, [isOpen, defaultDepartment, editingEmployee]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanName = (formData.name || '').trim();
    if (!cleanName) {
      setErrorMsg('Full Name is required.');
      return;
    }

    const cleanMobile = (formData.mobile || '').trim();
    if (cleanMobile) {
      const dupMobile = (employees || []).find((emp) => emp.mobile === cleanMobile && (!editingEmployee || emp.id !== editingEmployee.id));
      if (dupMobile) {
        setErrorMsg(`Mobile number ${cleanMobile} is already assigned to employee "${dupMobile.name}".`);
        return;
      }
    }

    const cleanEmail = (formData.email || '').trim().toLowerCase();
    if (cleanEmail) {
      const dupEmail = (employees || []).find((emp) => (emp.email || '').toLowerCase() === cleanEmail && (!editingEmployee || emp.id !== editingEmployee.id));
      if (dupEmail) {
        setErrorMsg(`Email ${cleanEmail} is already assigned to employee "${dupEmail.name}".`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, {
          ...formData,
          name: cleanName,
          mobile: cleanMobile,
          email: cleanEmail
        });
        if (onEmployeeUpdated) {
          onEmployeeUpdated();
        }
        onClose();
      } else {
        const createdEmployee = await addEmployee({
          ...formData,
          name: cleanName,
          mobile: cleanMobile,
          email: cleanEmail
        });
        if (onEmployeeCreated) {
          onEmployeeCreated(createdEmployee);
        }
        onClose();
      }
    } catch (err) {
      setErrorMsg(err.message || (editingEmployee ? 'Failed to update employee record.' : 'Failed to create employee record.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', width: '92vw' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={22} color="#93c5fd" />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>+ Quick Create New Employee Master</h3>
              <span style={{ fontSize: '0.75rem', color: '#bfdbfe' }}>Add staff for Sales, Design, Printing, Delivery, Accounts & Administration</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {errorMsg && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <div className="form-group">
                <label className="form-label">Employee Code *</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Anand Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Number *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 9820011223"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="e.g. anand@printflow.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Department *</label>
                <select
                  className="form-select"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Designation</label>
                <select
                  className="form-select"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                >
                  {DESIGNATIONS.map((des) => (
                    <option key={des} value={des}>{des}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Salary Structure</label>
                <select
                  className="form-select"
                  value={formData.salaryType}
                  onChange={(e) => setFormData({ ...formData, salaryType: e.target.value })}
                >
                  {SALARY_TYPES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Basic Salary (₹/month)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.basicSalary}
                  onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Commission %</label>
                <input
                  type="number"
                  step="0.1"
                  className="form-control"
                  placeholder="e.g. 3.5"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Incentive (₹/job or sqft)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 50"
                  value={formData.incentiveRate}
                  onChange={(e) => setFormData({ ...formData, incentiveRate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Joining Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Branch</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address & Notes</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Residential address, emergency contact number, qualifications..."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Check size={16} /> {isSubmitting ? 'Saving Employee...' : 'Save & Select Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
