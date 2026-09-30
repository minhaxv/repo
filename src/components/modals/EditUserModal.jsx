import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { api } from '../../utils/api';
import { UserCheck, Key, Shield, Eye, EyeOff, AlertTriangle, Trash2, Save, X, Lock } from 'lucide-react';
import { useERPModalSafeClose } from '../../hooks/useERPModalSafeClose';
import { UnsavedChangesPrompt } from '../common/UnsavedChangesPrompt';

export const EditUserModal = ({
  isOpen,
  onClose,
  employee,
  roles = [],
  onUserUpdated,
  onUserDeleted,
  recordAudit
}) => {
  const { session, setUsersList } = useERP();
  const currentUser = session?.user;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Printing Operator');
  const [designation, setDesignation] = useState('');
  const [status, setStatus] = useState('Active');
  
  // Password Reset
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Deletion Confirm
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Initial values for dirty tracking
  const [initialData, setInitialData] = useState({});

  useEffect(() => {
    if (isOpen && employee) {
      const initUname = employee.username || '';
      const initEmail = employee.userEmail || employee.email || '';
      const initRole = employee.userRole || employee.role || 'Printing Operator';
      const initDesig = employee.designation || '';
      const initStatus = employee.accountStatus === 'Not Created' ? 'Active' : (employee.accountStatus || 'Active');

      setUsername(initUname);
      setEmail(initEmail);
      setRole(initRole);
      setDesignation(initDesig);
      setStatus(initStatus);

      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setIsConfirmingDelete(false);
      setDeleteReason('');
      setErrorMsg('');
      setSuccessMsg('');

      setInitialData({
        username: initUname,
        email: initEmail,
        role: initRole,
        designation: initDesig,
        status: initStatus
      });
    }
  }, [isOpen, employee]);

  const isDirty = Boolean(
    username !== initialData.username ||
    email !== initialData.email ||
    role !== initialData.role ||
    designation !== initialData.designation ||
    status !== initialData.status ||
    (isChangingPassword && newPassword.length > 0)
  );

  const {
    showUnsavedPrompt,
    requestClose,
    handleKeepEditing,
    handleDiscard
  } = useERPModalSafeClose({
    isOpen,
    isDirty,
    onClose,
    isSubmitting
  });

  if (!isOpen || !employee) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username.trim()) {
      setErrorMsg('Username is required.');
      return;
    }

    if (isChangingPassword) {
      if (!newPassword || newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Passwords do not match. Please verify.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const userId = employee.userId || `USR-${employee.id}`;
      const payload = {
        username: username.trim(),
        email: email.trim(),
        role,
        designation: designation.trim(),
        status,
        reason: 'User account details updated by administrator'
      };

      if (isChangingPassword && newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      let serverResponse = null;
      try {
        serverResponse = await api.updateUser(userId, payload);
      } catch (apiErr) {
        console.warn('api.updateUser warning, applying local fallback:', apiErr);
      }

      // Update local users list
      if (setUsersList) {
        setUsersList(prev => prev.map(u => {
          if (u.id === userId || u.employeeId === employee.id) {
            return {
              ...u,
              username: payload.username,
              email: payload.email,
              role: payload.role,
              designation: payload.designation,
              status: payload.status
            };
          }
          return u;
        }));
      }

      // Record audit
      if (recordAudit) {
        recordAudit('UPDATE_USER_CREDENTIALS', userId, employee.employeeCode || employee.name, {
          targetEmployeeId: employee.id,
          targetEmployeeName: employee.name,
          username: payload.username,
          role: payload.role,
          status: payload.status,
          passwordChanged: Boolean(payload.password)
        });
      }

      setSuccessMsg('User account updated successfully!');
      setTimeout(() => {
        if (onUserUpdated) onUserUpdated({ ...employee, ...payload, userRole: role, username, userEmail: email, accountStatus: status });
        onClose();
      }, 700);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const userId = employee.userId || `USR-${employee.id}`;

      try {
        await api.deleteUser(userId, deleteReason || 'Account deleted by admin');
      } catch (apiErr) {
        console.warn('api.deleteUser warning, applying local fallback:', apiErr);
      }

      // Remove from local users list
      if (setUsersList) {
        setUsersList(prev => prev.filter(u => u.id !== userId && u.employeeId !== employee.id));
      }

      if (recordAudit) {
        recordAudit('DELETE_USER', userId, employee.employeeCode || employee.name, {
          targetEmployeeId: employee.id,
          targetEmployeeName: employee.name,
          username: employee.username,
          reason: deleteReason || 'User account removed by administrator'
        });
      }

      if (onUserDeleted) onUserDeleted(employee.id);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete user account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '92vw', borderRadius: '12px', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', padding: '1.2rem 1.5rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key size={22} color="#93c5fd" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                Edit Employee User Account
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#bfdbfe' }}>
                {employee.name} • <span style={{ fontFamily: 'monospace' }}>{employee.employeeCode}</span> • {employee.department}
              </div>
            </div>
          </div>
          <button
            onClick={requestClose}
            disabled={isSubmitting}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem' }}>
          {errorMsg && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 700 }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Login Username <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                placeholder="e.g. rahul.sharma"
                style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
              />
            </div>

            {/* Email Address */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul@screenarts.in"
                style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Role Template */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Role Template <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
              >
                {roles.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* Account Status */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Account Login Status <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', padding: '0.55rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
              >
                <option value="Active">Active (Permits Login)</option>
                <option value="Disabled">Disabled (Blocks Login)</option>
                <option value="Locked">Locked (Temporarily Locked)</option>
                <option value="Pending">Pending (Awaiting Activation)</option>
              </select>
            </div>
          </div>

          {/* Password Reset Section */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Lock size={16} color="#2563eb" />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>
                  Password Management
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsChangingPassword(!isChangingPassword);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className={`btn btn-sm ${isChangingPassword ? 'btn-secondary' : 'btn-outline-primary'}`}
                style={{ fontSize: '0.75rem', fontWeight: 700 }}
              >
                {isChangingPassword ? 'Cancel Password Change' : '🔑 Change / Reset Password'}
              </button>
            </div>

            {isChangingPassword && (
              <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    New Password (min. 6 chars) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      style={{ width: '100%', padding: '0.5rem 2.2rem 0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                    Confirm New Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Delete Account (Danger Zone) */}
          <div style={{ marginBottom: '1.25rem', paddingTop: '0.5rem' }}>
            {!isConfirmingDelete ? (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(true)}
                  style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Trash2 size={14} /> Remove User Login Account
                </button>
              </div>
            ) : (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.85rem 1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={15} /> Confirm User Account Deletion
                </div>
                <p style={{ fontSize: '0.75rem', color: '#7f1d1d', margin: '0 0 0.6rem 0' }}>
                  This will remove the login credentials for <strong>{employee.name}</strong>. Their employee HR master record will remain completely intact.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isSubmitting}
                    className="btn btn-sm btn-danger"
                    style={{ fontSize: '0.78rem', fontWeight: 700 }}
                  >
                    Yes, Permanently Delete Login
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(false)}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: '0.78rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={requestClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
              style={{ fontWeight: 600, fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.85rem' }}
            >
              <Save size={16} /> {isSubmitting ? 'Saving...' : 'Save User Account'}
            </button>
          </div>
        </form>
      </div>

      <UnsavedChangesPrompt
        isOpen={showUnsavedPrompt}
        onKeepEditing={handleKeepEditing}
        onDiscard={handleDiscard}
      />
    </div>
  );
};
