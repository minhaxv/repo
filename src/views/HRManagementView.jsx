import React, { useState } from 'react';
import {
  Users,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Check,
  Plus,
  Search,
  UserCheck,
  Building2,
  TrendingUp,
  Award
} from 'lucide-react';
import { useERP } from '../context/ERPContext';

export const HRManagementView = () => {
  const {
    salesPersons,
    workers,
    designers,
    careOfPersons,
    attendanceRecords,
    markAttendance,
    payrollRecords,
    paySalaryVoucher,
    salesOrders,
    companyProfile
  } = useERP();

  const [activeSubTab, setActiveSubTab] = useState('attendance'); // 'attendance', 'payroll', 'staff'
  const [selectedDate, setSelectedDate] = useState('2026-07-30');
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [selectedPaySlip, setSelectedPaySlip] = useState(null);

  // Unified Employees list (Sales Persons, Workers, Designers)
  const allStaff = [
    ...salesPersons.map((s) => ({ id: s.id, name: s.name, mobile: s.mobile, role: 'Sales Executive', type: 'Sales Person', baseSalary: 28000, rate: s.commissionRate })),
    ...workers.map((w) => ({ id: w.id, name: w.name, mobile: w.mobile, role: w.role, type: 'Production Worker', baseSalary: 22000, rate: w.incentivePerSqFt })),
    ...designers.map((d) => ({ id: d.id, name: d.name, mobile: d.mobile, role: 'Signage Designer', type: 'Designer', baseSalary: 25000, rate: 0 }))
  ];

  // Daily attendance for selected date
  const getAttendanceForStaff = (staffId) => {
    const rec = attendanceRecords.find((a) => a.date === selectedDate && a.staffId === staffId);
    return rec || { status: 'Present', otHours: 0, notes: '' };
  };

  // Helper to handle marking attendance
  const handleStatusChange = (staff, newStatus) => {
    const existing = getAttendanceForStaff(staff.id);
    markAttendance({
      date: selectedDate,
      staffId: staff.id,
      staffName: staff.name,
      type: staff.type,
      status: newStatus,
      otHours: existing.otHours || 0,
      notes: existing.notes || ''
    });
  };

  const handleOtChange = (staff, hours) => {
    const existing = getAttendanceForStaff(staff.id);
    markAttendance({
      date: selectedDate,
      staffId: staff.id,
      staffName: staff.name,
      type: staff.type,
      status: existing.status || 'Present',
      otHours: parseFloat(hours) || 0,
      notes: existing.notes || ''
    });
  };

  const handleMarkAllPresent = () => {
    allStaff.forEach((s) => {
      markAttendance({
        date: selectedDate,
        staffId: s.id,
        staffName: s.name,
        type: s.type,
        status: 'Present',
        otHours: 0,
        notes: 'Bulk Marked Present'
      });
    });
  };

  // Daily summary metrics
  const todayAtt = allStaff.map((s) => getAttendanceForStaff(s.id));
  const presentCount = todayAtt.filter((a) => a.status === 'Present' || a.status === 'Overtime').length;
  const halfDayCount = todayAtt.filter((a) => a.status === 'Half Day').length;
  const absentCount = todayAtt.filter((a) => a.status === 'Absent').length;
  const totalOtHoursToday = todayAtt.reduce((sum, a) => sum + (parseFloat(a.otHours) || 0), 0);

  // Live Payroll Generator logic linked with Attendance & Sales Commissions
  const calculatePayrollRow = (staff) => {
    // Check if payroll already processed for this month
    const existing = payrollRecords.find((p) => p.staffId === staff.id && p.month === selectedMonth);
    if (existing) return existing;

    // Calculate days present in selected month from attendanceRecords
    const monthAtt = attendanceRecords.filter((a) => a.staffId === staff.id && a.date.startsWith(selectedMonth));
    const daysPresent = monthAtt.length > 0
      ? monthAtt.reduce((sum, a) => sum + (a.status === 'Present' || a.status === 'Overtime' ? 1 : a.status === 'Half Day' ? 0.5 : 0), 0)
      : 24; // Default 24 days present demo

    const otHoursTotal = monthAtt.reduce((sum, a) => sum + (parseFloat(a.otHours) || 0), 0) || (staff.type === 'Worker' ? 12 : 6);
    const baseSal = staff.baseSalary || 24000;
    const workingDays = 26;
    const earnedBasePay = Math.round((baseSal / workingDays) * daysPresent);
    const otPay = Math.round(otHoursTotal * 150); // ₹150/hr OT rate

    // Calculate linked commission for Sales Persons (% of Gross Profit) or production incentive for workers
    let incentiveEarned = 0;
    if (staff.type === 'Sales Person') {
      const salesOrdersForSp = salesOrders.filter((o) => o.salesPersonId === staff.id || o.salesPersonName === staff.name);
      const salesProfit = salesOrdersForSp.reduce((sum, o) => sum + (o.grossProfit !== undefined ? o.grossProfit : Math.round(o.subtotal * 0.45)), 0);
      incentiveEarned = Math.round((salesProfit * (staff.rate || 3.5)) / 100);
    } else if (staff.type === 'Production Worker') {
      incentiveEarned = 2500; // Average monthly production bonus
    }

    const advanceDeduction = 0;
    const lateDeduction = 0;
    const netSalary = earnedBasePay + otPay + incentiveEarned - advanceDeduction - lateDeduction;

    return {
      id: `PAYROLL-${selectedMonth}-${staff.id}`,
      month: selectedMonth,
      staffId: staff.id,
      staffName: staff.name,
      role: staff.role,
      baseSalary: baseSal,
      workingDays,
      daysPresent,
      earnedBasePay,
      otHours: otHoursTotal,
      otPay,
      incentiveEarned,
      advanceDeduction,
      lateDeduction,
      netSalary,
      status: 'Pending',
      paidDate: '',
      paymentMode: ''
    };
  };

  const currentPayrollRows = allStaff.map((s) => calculatePayrollRow(s));
  const totalPayrollAmount = currentPayrollRows.reduce((sum, r) => sum + r.netSalary, 0);
  const paidPayrollAmount = currentPayrollRows.filter((r) => r.status === 'Paid').reduce((sum, r) => sum + r.netSalary, 0);

  return (
    <div className="view-container">
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} color="#2563eb" /> HR, Attendance Register & Linked Payroll
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Manage staff daily attendance, track OT hours, and process monthly salary linked with sales & production incentives
          </span>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#e2e8f0', padding: '0.25rem', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`btn btn-sm ${activeSubTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            <Calendar size={14} /> Daily Attendance Register
          </button>
          <button
            onClick={() => setActiveSubTab('payroll')}
            className={`btn btn-sm ${activeSubTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontWeight: 700 }}
          >
            <DollarSign size={14} /> Monthly Payroll & Salary Slips
          </button>
        </div>
      </div>

      {/* TAB 1: DAILY ATTENDANCE REGISTER */}
      {activeSubTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPI Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ borderTop: '4px solid #2563eb' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Staff On Roll</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>{allStaff.length} Employees</div>
            </div>

            <div className="card" style={{ borderTop: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Present Today</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>{presentCount} Staff</div>
            </div>

            <div className="card" style={{ borderTop: '4px solid #d97706' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Half Day / On Leave</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '0.2rem' }}>{halfDayCount} Staff</div>
            </div>

            <div className="card" style={{ borderTop: '4px solid #7c3aed' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Overtime (OT)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.2rem' }}>{totalOtHoursToday} Hours</div>
            </div>
          </div>

          {/* Attendance Table Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Calendar size={18} color="#2563eb" />
                <label style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Attendance Date:</label>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  style={{ fontWeight: 800, color: '#1e40af', width: '160px' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <button onClick={handleMarkAllPresent} className="btn btn-secondary btn-sm" style={{ color: '#059669', fontWeight: 700 }}>
                <CheckCircle2 size={14} /> Bulk Mark All Present
              </button>
            </div>

            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Designation & Type</th>
                    <th style={{ textAlign: 'center' }}>Attendance Status</th>
                    <th style={{ textAlign: 'center' }}>OT Hours</th>
                    <th>Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {allStaff.map((staff) => {
                    const att = getAttendanceForStaff(staff.id);
                    return (
                      <tr key={staff.id}>
                        <td style={{ fontWeight: 700 }}>
                          <div style={{ color: '#0f172a' }}>{staff.name}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>ID: {staff.id} | Mob: {staff.mobile}</div>
                        </td>

                        <td>
                          <span className="badge badge-blue">{staff.role}</span>
                          <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginTop: '2px' }}>{staff.type}</span>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            {['Present', 'Half Day', 'Absent', 'Paid Leave'].map((st) => {
                              const isActive = att.status === st;
                              let activeBg = '#2563eb';
                              if (st === 'Present') activeBg = '#059669';
                              if (st === 'Half Day') activeBg = '#d97706';
                              if (st === 'Absent') activeBg = '#e11d48';
                              if (st === 'Paid Leave') activeBg = '#7c3aed';

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(staff, st)}
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.74rem',
                                    fontWeight: 700,
                                    borderRadius: '6px',
                                    border: isActive ? `1px solid ${activeBg}` : '1px solid #cbd5e1',
                                    background: isActive ? activeBg : '#ffffff',
                                    color: isActive ? '#ffffff' : '#475569',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {st}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="form-control form-control-sm"
                            style={{ width: '70px', margin: '0 auto', textAlign: 'center', fontWeight: 800, color: '#7c3aed' }}
                            value={att.otHours || 0}
                            onChange={(e) => handleOtChange(staff, e.target.value)}
                          />
                        </td>

                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Shift notes / OT reason..."
                            value={att.notes || ''}
                            onChange={(e) => {
                              markAttendance({
                                date: selectedDate,
                                staffId: staff.id,
                                staffName: staff.name,
                                type: staff.type,
                                status: att.status || 'Present',
                                otHours: att.otHours || 0,
                                notes: e.target.value
                              });
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY PAYROLL & SALARY SLIPS */}
      {activeSubTab === 'payroll' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPI Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ borderTop: '4px solid #2563eb' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Gross Payroll Budget</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>₹{totalPayrollAmount.toLocaleString('en-IN')}</div>
            </div>

            <div className="card" style={{ borderTop: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Salaries Paid</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>₹{paidPayrollAmount.toLocaleString('en-IN')}</div>
            </div>

            <div className="card" style={{ borderTop: '4px solid #e11d48' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Pending Salary Payouts</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#e11d48', marginTop: '0.2rem' }}>₹{(totalPayrollAmount - paidPayrollAmount).toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Payroll Grid */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <DollarSign size={18} color="#059669" />
                <label style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>Payroll Month:</label>
                <input
                  type="month"
                  className="form-control form-control-sm"
                  style={{ fontWeight: 800, color: '#059669', width: '160px' }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th style={{ textAlign: 'right' }}>Base Monthly Salary</th>
                    <th style={{ textAlign: 'center' }}>Days Present</th>
                    <th style={{ textAlign: 'right' }}>Earned Base Pay</th>
                    <th style={{ textAlign: 'right' }}>OT Pay</th>
                    <th style={{ textAlign: 'right' }}>Linked Incentive</th>
                    <th style={{ textAlign: 'right' }}>Net Salary Payable</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPayrollRows.map((row) => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: 700 }}>
                        <div style={{ color: '#0f172a' }}>{row.staffName}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{row.role}</div>
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        ₹{row.baseSalary.toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {row.daysPresent} / {row.workingDays} days
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        ₹{row.earnedBasePay.toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'right', color: '#7c3aed', fontWeight: 700 }}>
                        +₹{row.otPay.toLocaleString('en-IN')} <span style={{ fontSize: '0.68rem', color: '#64748b' }}>({row.otHours} hrs)</span>
                      </td>

                      <td style={{ textAlign: 'right', color: '#059669', fontWeight: 800 }}>
                        +₹{row.incentiveEarned.toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '0.95rem', color: '#1e40af' }}>
                        ₹{row.netSalary.toLocaleString('en-IN')}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${row.status === 'Paid' ? 'badge-emerald' : 'badge-amber'}`}>
                          {row.status === 'Paid' ? `Paid (${row.paymentMode || 'Bank'})` : 'Pending'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          {row.status !== 'Paid' && (
                            <button
                              onClick={() => {
                                paySalaryVoucher(row.id, 'Bank Transfer');
                                alert(`Salary Payment Voucher processed for ${row.staffName} (₹${row.netSalary.toLocaleString()})!`);
                              }}
                              className="btn btn-sm btn-primary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', background: '#059669', borderColor: '#059669' }}
                            >
                              Pay Salary
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPaySlip(row)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                          >
                            <Printer size={12} color="#2563eb" /> Pay Slip
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PAY SLIP MODAL */}
      {selectedPaySlip && (
        <div className="modal-overlay" onClick={() => setSelectedPaySlip(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', padding: 0 }}>
            {/* Header */}
            <div className="modal-header" style={{ background: '#0f172a', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={18} color="#60a5fa" />
                <div style={{ fontWeight: 800 }}>Employee Salary Pay Slip — {selectedPaySlip.month}</div>
              </div>
              <button onClick={() => setSelectedPaySlip(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Pay Slip Printable Body */}
            <div style={{ padding: '1.5rem', background: '#ffffff', color: '#0f172a', fontSize: '0.85rem' }}>
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#1e40af' }}>{companyProfile.name}</h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{companyProfile.address}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>GSTIN: {companyProfile.gstin}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#059669' }}>SALARY PAY SLIP</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Month: {selectedPaySlip.month}</div>
                </div>
              </div>

              {/* Employee Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div>Employee Name: <strong>{selectedPaySlip.staffName}</strong></div>
                <div>Employee ID: <strong>{selectedPaySlip.staffId}</strong></div>
                <div>Designation: <strong>{selectedPaySlip.role}</strong></div>
                <div>Days Present: <strong>{selectedPaySlip.daysPresent} / {selectedPaySlip.workingDays} Days</strong></div>
              </div>

              {/* Earnings & Deductions Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>EARNINGS</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>AMOUNT (₹)</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>DEDUCTIONS</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>AMOUNT (₹)</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.8rem' }}>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px' }}>Earned Basic Salary</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>₹{selectedPaySlip.earnedBasePay.toLocaleString()}</td>
                    <td style={{ padding: '6px' }}>Advance Salary Loan</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>₹{selectedPaySlip.advanceDeduction.toLocaleString()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px' }}>Overtime (OT) Pay ({selectedPaySlip.otHours} hrs)</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>₹{selectedPaySlip.otPay.toLocaleString()}</td>
                    <td style={{ padding: '6px' }}>Late / Penalty Deduction</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>₹{selectedPaySlip.lateDeduction.toLocaleString()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px' }}>Sales / Production Incentive</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>₹{selectedPaySlip.incentiveEarned.toLocaleString()}</td>
                    <td style={{ padding: '6px' }}>—</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>—</td>
                  </tr>
                </tbody>
              </table>

              {/* Net Payable Banner */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.85rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.95rem' }}>NET SALARY PAYABLE:</span>
                <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.25rem' }}>₹{selectedPaySlip.netSalary.toLocaleString('en-IN')}</span>
              </div>

              {/* Signatures */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ textAlign: 'center', width: '160px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Employee Signature</div>
                </div>
                <div style={{ textAlign: 'center', width: '160px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Authorized Signatory</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setSelectedPaySlip(null)} className="btn btn-secondary">Close</button>
              <button type="button" onClick={() => window.print()} className="btn btn-primary"><Printer size={16} /> Print Pay Slip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRManagementView;
