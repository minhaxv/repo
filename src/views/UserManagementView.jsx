import React from 'react';
import { useERP } from '../context/ERPContext';
import { USER_ROLES } from '../types';
import { UserCheck, Shield, Lock, Key, Check } from 'lucide-react';

export const UserManagementView = () => {
  const { activeRole, switchRole } = useERP();

  const rolePermissions = [
    { role: USER_ROLES.ADMIN, createOrders: true, editCosting: true, approveArt: true, manageVendor: true, viewReports: true },
    { role: USER_ROLES.SALES, createOrders: true, editCosting: false, approveArt: false, manageVendor: false, viewReports: true },
    { role: USER_ROLES.DESIGNER, createOrders: false, editCosting: false, approveArt: true, manageVendor: false, viewReports: false },
    { role: USER_ROLES.PRODUCTION, createOrders: false, editCosting: false, approveArt: false, manageVendor: true, viewReports: false },
    { role: USER_ROLES.ACCOUNTS, createOrders: true, editCosting: true, approveArt: false, manageVendor: true, viewReports: true },
    { role: USER_ROLES.DELIVERY, createOrders: false, editCosting: false, approveArt: false, manageVendor: false, viewReports: false },
    { role: USER_ROLES.MANAGER, createOrders: true, editCosting: true, approveArt: true, manageVendor: true, viewReports: true }
  ];

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={24} color="#2563eb" /> Role-Based Access Control (RBAC) Matrix
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Granular permissions for Admin, Sales, Designer, Production, Accounts & Delivery staff
          </span>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="card">
        <div className="table-responsive">
          <table className="erp-table">
            <thead>
              <tr>
                <th>User Role</th>
                <th style={{ textAlign: 'center' }}>Create Sales Order</th>
                <th style={{ textAlign: 'center' }}>Edit Costing & Margins</th>
                <th style={{ textAlign: 'center' }}>Approve Artwork</th>
                <th style={{ textAlign: 'center' }}>Manage Vendor Bills</th>
                <th style={{ textAlign: 'center' }}>View Financial Reports</th>
                <th style={{ textAlign: 'center' }}>Quick Switch Role Context</th>
              </tr>
            </thead>
            <tbody>
              {rolePermissions.map((row) => {
                const isCurrent = activeRole === row.role;
                return (
                  <tr key={row.role} style={{ backgroundColor: isCurrent ? '#eff6ff' : 'transparent' }}>
                    <td style={{ fontWeight: 800, color: '#0f172a' }}>
                      {row.role} {isCurrent && <span className="badge badge-blue">Active Context</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>{row.createOrders ? <Check size={18} color="#059669" /> : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{row.editCosting ? <Check size={18} color="#059669" /> : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{row.approveArt ? <Check size={18} color="#059669" /> : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{row.manageVendor ? <Check size={18} color="#059669" /> : '—'}</td>
                    <td style={{ textAlign: 'center' }}>{row.viewReports ? <Check size={18} color="#059669" /> : '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => switchRole(row.role)}
                        className={`btn btn-sm ${isCurrent ? 'btn-success' : 'btn-secondary'}`}
                      >
                        Switch to {row.role}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
