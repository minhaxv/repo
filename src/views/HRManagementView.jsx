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
  Award,
  Briefcase,
  ShieldCheck,
  Phone,
  Mail,
  XCircle,
  Percent,
  Layers,
  ChevronRight,
  Filter,
  Grid,
  Save,
  Download,
  AlertCircle,
  Cpu,
  RefreshCw,
  Link,
  Unlink,
  UserPlus,
  Eye,
  Zap,
  CheckCircle,
  Server
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { CreateEmployeeModal, DEPARTMENTS } from '../components/modals/CreateEmployeeModal';

export const HRManagementView = () => {
  const {
    employees,
    attendanceRecords,
    markAttendance,
    payrollRecords,
    paySalaryVoucher,
    salesOrders,
    companyProfile,
    updateEmployee,
    workerJobIncentives,
    biometricDevices,
    biometricUsers,
    importK90Users,
    mapBiometricUser,
    unlinkBiometricUser,
    createAndMapEmployee,
    assignBiometricId
  } = useERP();

  const [activeSubTab, setActiveSubTab] = useState('attendance'); // 'attendance', 'payroll', 'leaves', 'commissions', 'directory', 'biometric-device'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState('2026-07');
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [selectedPaySlip, setSelectedPaySlip] = useState(null);
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState(null);

  // Biometric ZKTeco K90 State
  const [bioSearchQuery, setBioSearchQuery] = useState('');
  const [bioStatusFilter, setBioStatusFilter] = useState('ALL'); // 'ALL' | 'Mapped' | 'Unmapped' | 'Disabled'
  const [bioSelectedDevice, setBioSelectedDevice] = useState('DEV-K90-01');
  const [isImportingBio, setIsImportingBio] = useState(false);
  const [bioNotice, setBioNotice] = useState('');

  // Biometric Modals
  const [mappingUserToMatch, setMappingUserToMatch] = useState(null);
  const [selectedMatchEmpId, setSelectedMatchEmpId] = useState('');

  const [createEmpFromBioUser, setCreateEmpFromBioUser] = useState(null);
  const [bioNewEmpForm, setBioNewEmpForm] = useState({
    name: '',
    code: '',
    department: 'Production',
    designation: 'Machine Operator',
    basicSalary: 25000,
    mobile: '',
    email: ''
  });

  const [assignBioModalEmp, setAssignBioModalEmp] = useState(null);
  const [assignBioForm, setAssignBioForm] = useState({ deviceId: 'DEV-K90-01', biometricUserId: '', biometricName: '' });

  // Handle Import & Scan Users from K90
  const handleImportK90 = async () => {
    setIsImportingBio(true);
    setBioNotice('Connecting to ZKTeco K90 (192.168.1.201)... Reading Users & Executing Priority Matching...');
    try {
      const res = await importK90Users(bioSelectedDevice);
      setBioNotice(`✅ Synced with ZKTeco K90! Found ${res?.totalUsers || 6} users (${res?.matchedCount || 4} Matched, ${res?.unmappedCount || 2} Unmapped).`);
      setTimeout(() => setBioNotice(''), 4000);
    } catch (err) {
      alert(`K90 Device Sync Notice: ${err.message || err}. Retaining cached device mappings.`);
      setBioNotice('');
    } finally {
      setIsImportingBio(false);
    }
  };

  const handleConfirmMatchUser = async (e) => {
    e.preventDefault();
    if (!mappingUserToMatch || !selectedMatchEmpId) return;
    try {
      await mapBiometricUser(mappingUserToMatch.id, selectedMatchEmpId);
      const matchedEmp = employees.find(e => e.id === selectedMatchEmpId);
      setBioNotice(`✅ Mapped K90 User #${mappingUserToMatch.biometricUserId} (${mappingUserToMatch.biometricName}) to ERP Employee "${matchedEmp?.name || selectedMatchEmpId}"!`);
      setTimeout(() => setBioNotice(''), 3500);
      setMappingUserToMatch(null);
      setSelectedMatchEmpId('');
    } catch (err) {
      alert(`Mapping Failed: ${err.message || err}`);
    }
  };

  const handleCreateAndMapEmp = async (e) => {
    e.preventDefault();
    if (!createEmpFromBioUser || !bioNewEmpForm.name) return;
    try {
      const res = await createAndMapEmployee(createEmpFromBioUser.id, bioNewEmpForm);
      setBioNotice(`✅ Created new employee "${bioNewEmpForm.name}" & linked K90 User #${createEmpFromBioUser.biometricUserId}!`);
      setTimeout(() => setBioNotice(''), 3500);
      setCreateEmpFromBioUser(null);
    } catch (err) {
      alert(`Failed to create employee: ${err.message || err}`);
    }
  };

  const handleAssignBioId = async (e) => {
    e.preventDefault();
    if (!assignBioModalEmp || !assignBioForm.biometricUserId) return;
    try {
      await assignBiometricId(assignBioModalEmp.id, assignBioForm.deviceId, assignBioForm.biometricUserId, assignBioForm.biometricName || assignBioModalEmp.name);
      setBioNotice(`✅ Assigned Biometric ID #${assignBioForm.biometricUserId} to ${assignBioModalEmp.name}!`);
      setTimeout(() => setBioNotice(''), 3500);
      setAssignBioModalEmp(null);
    } catch (err) {
      alert(`Failed to assign Biometric ID: ${err.message || err}`);
    }
  };

  // 5-Priority Matching Engine Helper
  const getSuggestedEmployeeMatch = (bioUser) => {
    if (!bioUser) return null;
    const bioId = String(bioUser.biometricUserId).trim();
    const bioNameClean = (bioUser.biometricName || '').trim().toLowerCase();

    // Priority 1: Match by Employee ID or Code
    const matchById = (employees || []).find(e =>
      e.id === bioId ||
      e.id.replace(/\D/g, '') === bioId ||
      e.code === bioId ||
      (e.code && e.code.replace(/\D/g, '') === bioId)
    );
    if (matchById) {
      return { employee: matchById, matchType: 'Employee ID / Code Match (Priority 2)', confidence: 'High' };
    }

    // Priority 2: Match by Exact Name
    if (bioNameClean) {
      const matchByName = (employees || []).find(e => (e.name || '').trim().toLowerCase() === bioNameClean);
      if (matchByName) {
        return { employee: matchByName, matchType: 'Exact Name Match (Priority 3)', confidence: 'High' };
      }

      // Priority 3: Partial / Strong Name Match
      const matchByPartial = (employees || []).find(e => {
        const empNameClean = (e.name || '').trim().toLowerCase();
        return empNameClean.includes(bioNameClean) || bioNameClean.includes(empNameClean);
      });
      if (matchByPartial) {
        return { employee: matchByPartial, matchType: 'Strong Name Match (Priority 4)', confidence: 'Medium (Requires HR Review)' };
      }
    }

    return null;
  };

  const allBioUsers = biometricUsers || [];
  const unmappedBioCount = allBioUsers.filter(u => u.mappingStatus === 'Unmapped' && u.deviceStatus !== 'Disabled').length;
  const mappedBioCount = allBioUsers.filter(u => u.mappingStatus === 'Matched').length;
  const disabledBioCount = allBioUsers.filter(u => u.deviceStatus === 'Disabled').length;

  const filteredBioUsers = allBioUsers.filter(u => {
    const q = bioSearchQuery.toLowerCase();
    const matchQuery =
      (u.biometricUserId || '').toLowerCase().includes(q) ||
      (u.biometricName || '').toLowerCase().includes(q) ||
      (u.cardNo || '').toLowerCase().includes(q) ||
      (u.employeeName || '').toLowerCase().includes(q) ||
      (u.employeeCode || '').toLowerCase().includes(q);

    const matchStatus =
      bioStatusFilter === 'ALL' ||
      (bioStatusFilter === 'Mapped' && u.mappingStatus === 'Matched') ||
      (bioStatusFilter === 'Unmapped' && u.mappingStatus === 'Unmapped') ||
      (bioStatusFilter === 'Disabled' && u.deviceStatus === 'Disabled');

    return matchQuery && matchStatus;
  });

  // Initial Mock Leave Requests if state is transient
  const [leaveRequests, setLeaveRequests] = useState([
    {
      id: 'LV-101',
      employeeId: 'EMP-102',
      employeeName: 'Priya Patel',
      department: 'Sales',
      leaveType: 'Casual Leave',
      fromDate: '2026-07-20',
      toDate: '2026-07-21',
      days: 2,
      reason: 'Personal family occasion',
      status: 'Approved'
    },
    {
      id: 'LV-102',
      employeeId: 'EMP-106',
      employeeName: 'Vikas Patil',
      department: 'Printing',
      leaveType: 'Sick Leave',
      fromDate: '2026-07-25',
      toDate: '2026-07-25',
      days: 1,
      reason: 'Fever and medical checkup',
      status: 'Approved'
    },
    {
      id: 'LV-103',
      employeeId: 'EMP-104',
      employeeName: 'Rahul Studio (In-house)',
      department: 'Design',
      leaveType: 'Paid Leave',
      fromDate: '2026-08-05',
      toDate: '2026-08-07',
      days: 3,
      reason: 'Outstation vacation',
      status: 'Pending'
    }
  ]);

  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [newLeaveForm, setNewLeaveForm] = useState({
    employeeId: '',
    leaveType: 'Casual Leave',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  // Attendance Sub-Tab View Mode ('today' | 'monthly' | 'history')
  const [attViewMode, setAttViewMode] = useState('today');
  const [historyEmpId, setHistoryEmpId] = useState('');
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attNotice, setAttNotice] = useState('');

  const activeEmployees = (employees || []).filter((e) => e.status !== 'Inactive');

  // Automatic Working Hours & OT calculation
  const calcWorkingHours = (checkInStr, checkOutStr, statusVal) => {
    if (['Absent', 'Leave', 'Weekly Off', 'Holiday'].includes(statusVal)) {
      return { workingHours: 0, otHours: 0, lateStatus: 'N/A' };
    }
    const parseTimeToNum = (tStr) => {
      if (!tStr) return 9.5;
      const clean = tStr.trim().toUpperCase();
      let isPM = clean.includes('PM');
      let isAM = clean.includes('AM');
      let timePart = clean.replace('AM', '').replace('PM', '').trim();
      let [h, m] = timePart.split(':').map(Number);
      if (isNaN(h)) return 9.5;
      if (isNaN(m)) m = 0;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;
      return h + (m / 60);
    };

    const inHrs = parseTimeToNum(checkInStr || '09:30 AM');
    const outHrs = parseTimeToNum(checkOutStr || '07:00 PM');
    let totalSpan = outHrs > inHrs ? outHrs - inHrs : 0;
    let breakHrs = totalSpan >= 5 ? 1.0 : 0;
    let netHrs = Math.max(0, totalSpan - breakHrs);
    if (statusVal === 'Half Day') netHrs = Math.min(4.0, netHrs);

    let ot = netHrs > 8.0 ? parseFloat((netHrs - 8.0).toFixed(1)) : 0;
    let lateMins = Math.max(0, Math.round((inHrs - 9.5) * 60));
    let lateSt = lateMins > 15 ? `Late (${lateMins}m)` : 'On Time';

    return {
      workingHours: parseFloat(netHrs.toFixed(1)),
      otHours: ot,
      lateStatus: lateSt
    };
  };

  // Daily attendance for selected date helper
  const getAttendanceForStaff = (staffId, targetDate = selectedDate) => {
    const rec = (attendanceRecords || []).find((a) => a.date === targetDate && a.staffId === staffId);
    if (rec) return rec;

    // Check if employee has an approved leave request for this date
    const approvedLeave = (leaveRequests || []).find(
      (l) => l.employeeId === staffId && l.status === 'Approved' && l.fromDate <= targetDate && l.toDate >= targetDate
    );
    if (approvedLeave) {
      return { status: 'Leave', otHours: 0, notes: `Approved Leave (${approvedLeave.leaveType})`, checkIn: '', checkOut: '', workingHours: 0, lateStatus: 'N/A' };
    }

    // Check if Sunday -> Weekly Off
    const dateObj = new Date(targetDate);
    if (dateObj.getDay() === 0) {
      return { status: 'Weekly Off', otHours: 0, notes: 'Weekly Off (Sunday)', checkIn: '', checkOut: '', workingHours: 0, lateStatus: 'N/A' };
    }

    return { status: 'Present', otHours: 0, notes: '', checkIn: '09:30 AM', checkOut: '07:00 PM', workingHours: 8.5, lateStatus: 'On Time' };
  };

  const handleStatusChange = async (emp, newStatus) => {
    const existing = getAttendanceForStaff(emp.id);
    const calc = calcWorkingHours(existing.checkIn, existing.checkOut, newStatus);
    await markAttendance({
      date: selectedDate,
      staffId: emp.id,
      staffName: emp.name,
      type: emp.department || 'Staff',
      status: newStatus,
      checkIn: existing.checkIn || '09:30 AM',
      checkOut: existing.checkOut || '07:00 PM',
      workingHours: calc.workingHours,
      otHours: calc.otHours,
      lateStatus: calc.lateStatus,
      notes: existing.notes || ''
    });
  };

  const handleTimeOrNotesChange = async (emp, field, value) => {
    const existing = getAttendanceForStaff(emp.id);
    const updated = { ...existing, [field]: value };
    const calc = calcWorkingHours(
      field === 'checkIn' ? value : updated.checkIn,
      field === 'checkOut' ? value : updated.checkOut,
      updated.status
    );

    await markAttendance({
      date: selectedDate,
      staffId: emp.id,
      staffName: emp.name,
      type: emp.department || 'Staff',
      status: updated.status || 'Present',
      checkIn: updated.checkIn || '09:30 AM',
      checkOut: updated.checkOut || '07:00 PM',
      workingHours: calc.workingHours,
      otHours: field === 'otHours' ? (parseFloat(value) || 0) : calc.otHours,
      lateStatus: calc.lateStatus,
      notes: field === 'notes' ? value : (updated.notes || '')
    });
  };

  const handleMarkAllPresent = async () => {
    setIsSavingAttendance(true);
    try {
      for (const emp of activeEmployees) {
        await markAttendance({
          date: selectedDate,
          staffId: emp.id,
          staffName: emp.name,
          type: emp.department || 'Staff',
          status: 'Present',
          checkIn: '09:30 AM',
          checkOut: '07:00 PM',
          workingHours: 8.5,
          otHours: 0.5,
          lateStatus: 'On Time',
          notes: 'Marked Present'
        });
      }
      setAttNotice(`Marked all ${activeEmployees.length} employees Present for ${selectedDate}`);
      setTimeout(() => setAttNotice(''), 3000);
    } catch (err) {
      alert(`Bulk Mark Failed: ${err.message || err}`);
    } finally {
      setIsSavingAttendance(false);
    }
  };

  // Leave Approval Handler
  const handleLeaveStatus = (leaveId, newStatus) => {
    setLeaveRequests((prev) =>
      prev.map((l) => (l.id === leaveId ? { ...l, status: newStatus } : l))
    );
  };

  const handleApplyLeave = (e) => {
    e.preventDefault();
    const emp = activeEmployees.find((e) => e.id === newLeaveForm.employeeId);
    if (!emp) return;

    const from = new Date(newLeaveForm.fromDate);
    const to = new Date(newLeaveForm.toDate);
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newReq = {
      id: `LV-${Math.floor(100 + Math.random() * 900)}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      leaveType: newLeaveForm.leaveType,
      fromDate: newLeaveForm.fromDate,
      toDate: newLeaveForm.toDate,
      days: diffDays,
      reason: newLeaveForm.reason,
      status: 'Pending'
    };

    setLeaveRequests([newReq, ...leaveRequests]);
    setIsApplyLeaveOpen(false);
    setNewLeaveForm({
      employeeId: '',
      leaveType: 'Casual Leave',
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      reason: ''
    });
  };

  // Calculate Metrics for selected date attendance
  const todayAtt = activeEmployees.map((emp) => getAttendanceForStaff(emp.id, selectedDate));
  const presentCount = todayAtt.filter((a) => a.status === 'Present' || a.status === 'Overtime').length;
  const halfDayCount = todayAtt.filter((a) => a.status === 'Half Day').length;
  const absentCount = todayAtt.filter((a) => a.status === 'Absent').length;
  const leaveCount = todayAtt.filter((a) => a.status === 'Leave').length;
  const lateCountToday = todayAtt.filter((a) => a.lateStatus && a.lateStatus.includes('Late')).length;
  const totalOtHoursToday = todayAtt.reduce((sum, a) => sum + (parseFloat(a.otHours) || 0), 0);

  // Compute Live Payroll for month
  const computedPayroll = activeEmployees.map((emp) => {
    const baseSalary = Number(emp.basicSalary) || 25000;
    const hra = Math.round(baseSalary * 0.4); // 40% HRA
    const da = Math.round(baseSalary * 0.1);  // 10% DA
    const allowances = 3000;

    // OT Hours calculation for selected month
    const empAtt = (attendanceRecords || []).filter((a) => a.staffId === emp.id && a.date?.startsWith(selectedMonth));
    const daysPresent = empAtt.length > 0 ? empAtt.filter((a) => a.status === 'Present' || a.status === 'Overtime').length : 24;
    const totalOt = empAtt.reduce((sum, a) => sum + (parseFloat(a.otHours) || 0), 0);
    const otPay = totalOt * 150; // ₹150 / hr

    // Commissions & 0.5% Job Profit Incentives
    const workerIncentiveSum = (workerJobIncentives || [])
      .filter((inc) => inc.workerId === emp.id || inc.workerName === emp.name)
      .reduce((sum, inc) => sum + (Number(inc.incentiveAmount) || 0), 0);

    let incentiveEarned = Math.round(workerIncentiveSum);

    if (emp.department === 'Sales') {
      const sales = (salesOrders || [])
        .filter((o) => o.salesPersonId === emp.id || o.salesPersonName === emp.name)
        .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
      const salesComm = Math.round((sales * (emp.commissionRate || 3.5)) / 100);
      incentiveEarned += salesComm;
    } else if (incentiveEarned <= 0) {
      if (emp.department === 'Design') incentiveEarned = 1500;
      else if (emp.department === 'Printing' || emp.department === 'Production') incentiveEarned = 1750;
      else if (emp.department === 'Logistics & Delivery') incentiveEarned = 1200;
    }

    const grossSalary = baseSalary + hra + da + allowances + otPay + incentiveEarned;

    // Statutory Deductions
    const pfDeduction = Math.round(baseSalary * 0.12); // 12% PF
    const esiDeduction = Math.round(grossSalary * 0.0075); // 0.75% ESI
    const ptDeduction = 200; // Professional Tax
    const advanceDeduction = 0;
    const unpaidDaysDeduction = Math.round((26 - daysPresent) * (baseSalary / 26));

    const totalDeductions = pfDeduction + esiDeduction + ptDeduction + advanceDeduction + Math.max(0, unpaidDaysDeduction);
    const netSalary = grossSalary - totalDeductions;

    // Check existing voucher payment record
    const payVoucher = (payrollRecords || []).find((p) => p.staffId === emp.id && p.month === selectedMonth);

    return {
      staffId: emp.id,
      staffName: emp.name,
      code: emp.code,
      department: emp.department,
      designation: emp.designation,
      baseSalary,
      hra,
      da,
      allowances,
      workingDays: 26,
      daysPresent,
      otHours: totalOt,
      otPay,
      incentiveEarned,
      grossSalary,
      pfDeduction,
      esiDeduction,
      ptDeduction,
      advanceDeduction,
      totalDeductions,
      netSalary,
      status: payVoucher ? payVoucher.status : 'Pending',
      paidDate: payVoucher?.paidDate || '',
      paymentMode: payVoucher?.paymentMode || 'Bank Transfer',
      bankName: emp.bankName || 'HDFC Bank',
      accountNo: emp.accountNo || '5010023456789',
      ifscCode: emp.ifscCode || 'HDFC0000123',
      pfNo: emp.pfNo || 'MH/BOM/0012345/000/000109',
      esiNo: emp.esiNo || '31000123450000109',
      panNo: emp.panNo || 'ABCDE1234F'
    };
  });

  const totalPayrollCost = computedPayroll.reduce((sum, p) => sum + p.netSalary, 0);
  const totalPaidCount = computedPayroll.filter((p) => p.status === 'Paid').length;
  const pendingPayrollCost = computedPayroll.filter((p) => p.status !== 'Paid').reduce((sum, p) => sum + p.netSalary, 0);

  return (
    <div className="view-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={24} color="#2563eb" /> HR, Attendance & Payroll System
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Unified workforce engine connected to Sales, Design, Printing, Delivery & Accounts
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem' }}>
          <button onClick={() => setIsAddEmployeeModalOpen(true)} className="btn btn-primary">
            <Plus size={16} /> + Add Employee Master
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveSubTab('attendance')}
          className={`btn ${activeSubTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
        >
          <Calendar size={16} /> Daily Attendance Register
        </button>
        <button
          onClick={() => setActiveSubTab('payroll')}
          className={`btn ${activeSubTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
        >
          <DollarSign size={16} /> Monthly Payroll & Salary Slips
        </button>
        <button
          onClick={() => setActiveSubTab('leaves')}
          className={`btn ${activeSubTab === 'leaves' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
        >
          <Clock size={16} /> Leave Management ({leaveRequests.filter(l => l.status === 'Pending').length} Pending)
        </button>
        <button
          onClick={() => setActiveSubTab('commissions')}
          className={`btn ${activeSubTab === 'commissions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
        >
          <Award size={16} /> Commissions & Incentives
        </button>
        <button
          onClick={() => setActiveSubTab('directory')}
          className={`btn ${activeSubTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
        >
          <Users size={16} /> Employee Directory ({activeEmployees.length})
        </button>
        <button
          onClick={() => setActiveSubTab('biometric-device')}
          className={`btn ${activeSubTab === 'biometric-device' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
        >
          <Cpu size={16} color={unmappedBioCount > 0 ? '#f59e0b' : '#059669'} />
          Device Employees (K90)
          {unmappedBioCount > 0 && (
            <span className="badge badge-amber" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', marginLeft: '0.25rem', fontWeight: 800 }}>
              {unmappedBioCount} Unmapped
            </span>
          )}
        </button>
      </div>

      {/* 1. ATTENDANCE SUB-TAB WORKSPACE */}
      {activeSubTab === 'attendance' && (
        <div>
          {/* Top Secondary View Selector inside Attendance */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setAttViewMode('today')}
                className={`btn btn-sm ${attViewMode === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 700 }}
              >
                <Calendar size={15} /> Today's Attendance Register
              </button>
              <button
                type="button"
                onClick={() => setAttViewMode('monthly')}
                className={`btn btn-sm ${attViewMode === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 700 }}
              >
                <Grid size={15} /> Monthly Attendance Matrix (1-31 Days)
              </button>
              <button
                type="button"
                onClick={() => setAttViewMode('history')}
                className={`btn btn-sm ${attViewMode === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontWeight: 700 }}
              >
                <UserCheck size={15} /> Employee Attendance History
              </button>
            </div>

            {attNotice && (
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                ✓ {attNotice}
              </div>
            )}
          </div>

          {/* VIEW MODE 1: TODAY'S REGISTER */}
          {attViewMode === 'today' && (
            <div>
              {/* Dashboard KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="card" style={{ padding: '0.75rem', background: '#eff6ff', borderColor: '#bfdbfe' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e40af' }}>Total Active Staff</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e3a8a', marginTop: '2px' }}>{activeEmployees.length} Employees</div>
                </div>

                <div className="card" style={{ padding: '0.75rem', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065f46' }}>Present</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#064e3b', marginTop: '2px' }}>{presentCount} Staff</div>
                </div>

                <div className="card" style={{ padding: '0.75rem', background: '#fef3c7', borderColor: '#fde68a' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e' }}>Half Day</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#78350f', marginTop: '2px' }}>{halfDayCount} Staff</div>
                </div>

                <div className="card" style={{ padding: '0.75rem', background: '#fef2f2', borderColor: '#fca5a5' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b' }}>Absent</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#7f1d1d', marginTop: '2px' }}>{absentCount} Staff</div>
                </div>

                <div className="card" style={{ padding: '0.75rem', background: '#f3e8ff', borderColor: '#d8b4fe' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b21a8' }}>Leave / Off</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#581c87', marginTop: '2px' }}>{leaveCount} Staff</div>
                </div>

                <div className="card" style={{ padding: '0.75rem', background: '#fff7ed', borderColor: '#ffedd5' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9a3412' }}>Late Count</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#7c2d12', marginTop: '2px' }}>{lateCountToday} Staff</div>
                </div>

                <div className="card" style={{ padding: '0.75rem', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534' }}>Total OT Hours</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#14532d', marginTop: '2px' }}>{totalOtHoursToday} hrs</div>
                </div>
              </div>

              {/* Main Attendance Marking Register Table */}
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>Attendance Date:</span>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      style={{ width: '160px', fontWeight: 800, color: '#1e40af' }}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      disabled={isSavingAttendance}
                      onClick={handleMarkAllPresent}
                      className="btn btn-secondary btn-sm"
                      style={{ fontWeight: 700, color: '#059669', borderColor: '#6ee7b7' }}
                    >
                      <CheckCircle2 size={14} /> Mark All Present
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th style={{ width: '80px' }}>Emp Code</th>
                        <th>Employee Name & Contact</th>
                        <th>Department</th>
                        <th style={{ width: '100px' }}>Check In</th>
                        <th style={{ width: '100px' }}>Check Out</th>
                        <th style={{ width: '90px' }}>Working Hrs</th>
                        <th style={{ width: '220px' }}>Attendance Status</th>
                        <th style={{ width: '75px' }}>OT (Hrs)</th>
                        <th>Notes / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmployees.map((emp) => {
                        const att = getAttendanceForStaff(emp.id, selectedDate);
                        const calc = calcWorkingHours(att.checkIn, att.checkOut, att.status);

                        return (
                          <tr key={emp.id}>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#64748b' }}>{emp.code || emp.id}</td>
                            <td>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{emp.name}</div>
                              <div style={{ fontSize: '0.73rem', color: '#64748b' }}>📞 {emp.mobile || 'N/A'}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#1e40af' }}>{emp.department || 'General'}</div>
                              <div style={{ fontSize: '0.73rem', color: '#475569' }}>{emp.designation || 'Staff'}</div>
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, width: '90px' }}
                                value={att.checkIn || '09:30 AM'}
                                onChange={(e) => handleTimeOrNotesChange(emp, 'checkIn', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, width: '90px' }}
                                value={att.checkOut || '07:00 PM'}
                                onChange={(e) => handleTimeOrNotesChange(emp, 'checkOut', e.target.value)}
                              />
                            </td>
                            <td>
                              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.85rem' }}>
                                {att.workingHours !== undefined ? att.workingHours : calc.workingHours} hrs
                              </div>
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: calc.lateStatus.includes('Late') ? '#dc2626' : '#059669' }}>
                                {att.lateStatus || calc.lateStatus}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                                {[
                                  { label: 'Present', val: 'Present', bg: '#10b981' },
                                  { label: 'Half Day', val: 'Half Day', bg: '#f59e0b' },
                                  { label: 'Absent', val: 'Absent', bg: '#ef4444' },
                                  { label: 'Leave', val: 'Leave', bg: '#8b5cf6' },
                                  { label: 'Off', val: 'Weekly Off', bg: '#64748b' }
                                ].map((st) => (
                                  <button
                                    key={st.val}
                                    type="button"
                                    onClick={() => handleStatusChange(emp, st.val)}
                                    className="btn btn-xs"
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '0.15rem 0.35rem',
                                      fontWeight: att.status === st.val ? 800 : 500,
                                      background: att.status === st.val ? st.bg : '#f1f5f9',
                                      color: att.status === st.val ? '#ffffff' : '#475569',
                                      border: 'none',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                className="form-control form-control-sm"
                                style={{ width: '65px', textAlign: 'center', fontWeight: 800, color: '#1e3a8a' }}
                                value={att.otHours || 0}
                                onChange={(e) => handleTimeOrNotesChange(emp, 'otHours', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Optional remarks..."
                                value={att.notes || ''}
                                onChange={(e) => handleTimeOrNotesChange(emp, 'notes', e.target.value)}
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

          {/* VIEW MODE 2: MONTHLY ATTENDANCE MATRIX (GRID 1-31 DAYS) */}
          {attViewMode === 'monthly' && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#334155' }}>Select Month:</span>
                  <input
                    type="month"
                    className="form-control form-control-sm"
                    style={{ width: '160px', fontWeight: 800, color: '#1e40af' }}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  Legend: <span style={{ color: '#10b981', fontWeight: 800 }}>P</span>=Present | <span style={{ color: '#ef4444', fontWeight: 800 }}>A</span>=Absent | <span style={{ color: '#f59e0b', fontWeight: 800 }}>H</span>=Half Day | <span style={{ color: '#8b5cf6', fontWeight: 800 }}>L</span>=Leave | <span style={{ color: '#64748b', fontWeight: 800 }}>WO</span>=Off
                </div>
              </div>

              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                {(() => {
                  const [yr, mo] = selectedMonth.split('-').map(Number);
                  const daysInMonth = new Date(yr, mo, 0).getDate();
                  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                  return (
                    <table className="erp-table" style={{ fontSize: '0.75rem' }}>
                      <thead>
                        <tr>
                          <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2, minWidth: '160px' }}>Employee</th>
                          {dayNumbers.map((d) => (
                            <th key={d} style={{ width: '28px', textAlign: 'center', padding: '4px 2px' }}>{d}</th>
                          ))}
                          <th style={{ textAlign: 'center', background: '#ecfdf5', color: '#065f46' }}>P</th>
                          <th style={{ textAlign: 'center', background: '#fef2f2', color: '#991b1b' }}>A</th>
                          <th style={{ textAlign: 'center', background: '#fef3c7', color: '#92400e' }}>H</th>
                          <th style={{ textAlign: 'center', background: '#f3e8ff', color: '#6b21a8' }}>L</th>
                          <th style={{ textAlign: 'center', background: '#eff6ff', color: '#1e40af' }}>Working Days</th>
                          <th style={{ textAlign: 'center', background: '#f0fdf4', color: '#166534' }}>OT Hrs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeEmployees.map((emp) => {
                          let pCount = 0, aCount = 0, hCount = 0, lCount = 0, woCount = 0, totalOt = 0;

                          return (
                            <tr key={emp.id}>
                              <td style={{ position: 'sticky', left: 0, background: '#ffffff', zIndex: 1, fontWeight: 700 }}>
                                <div style={{ color: '#0f172a' }}>{emp.name}</div>
                                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{emp.code || emp.id} ({emp.department})</div>
                              </td>

                              {dayNumbers.map((d) => {
                                const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                                const att = getAttendanceForStaff(emp.id, dateStr);

                                let code = 'P';
                                let bg = '#d1fae5';
                                let text = '#065f46';

                                if (att.status === 'Absent') { code = 'A'; bg = '#fee2e2'; text = '#991b1b'; aCount++; }
                                else if (att.status === 'Half Day') { code = 'H'; bg = '#fef3c7'; text = '#92400e'; hCount++; }
                                else if (att.status === 'Leave') { code = 'L'; bg = '#f3e8ff'; text = '#6b21a8'; lCount++; }
                                else if (att.status === 'Weekly Off') { code = 'WO'; bg = '#f1f5f9'; text = '#64748b'; woCount++; }
                                else { pCount++; }

                                totalOt += (parseFloat(att.otHours) || 0);

                                return (
                                  <td key={d} style={{ textAlign: 'center', padding: '3px 1px' }}>
                                    <span style={{ display: 'inline-block', width: '22px', padding: '1px 0', borderRadius: '3px', background: bg, color: text, fontWeight: 800, fontSize: '0.68rem' }}>
                                      {code}
                                    </span>
                                  </td>
                                );
                              })}

                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#059669', background: '#ecfdf5' }}>{pCount}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#dc2626', background: '#fef2f2' }}>{aCount}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#d97706', background: '#fef3c7' }}>{hCount}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#7c3aed', background: '#f3e8ff' }}>{lCount}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#1e40af', background: '#eff6ff' }}>{pCount + (hCount * 0.5) + lCount}</td>
                              <td style={{ textAlign: 'center', fontWeight: 800, color: '#166534', background: '#f0fdf4' }}>{totalOt}h</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>
          )}

          {/* VIEW MODE 3: EMPLOYEE ATTENDANCE HISTORY */}
          {attViewMode === 'history' && (
            <div>
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Select Employee from Master:
                    </label>
                    <select
                      className="form-select form-select-sm"
                      style={{ fontWeight: 700, color: '#1e40af' }}
                      value={historyEmpId || activeEmployees[0]?.id || ''}
                      onChange={(e) => setHistoryEmpId(e.target.value)}
                    >
                      {activeEmployees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.code || e.id}) — {e.department} ({e.designation})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Select History Month:
                    </label>
                    <input
                      type="month"
                      className="form-control form-control-sm"
                      style={{ fontWeight: 700 }}
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Selected Employee Profile Summary & Log */}
              {(() => {
                const targetEmp = activeEmployees.find((e) => e.id === (historyEmpId || activeEmployees[0]?.id));
                if (!targetEmp) return <div>Please select an employee.</div>;

                const empRecords = (attendanceRecords || []).filter(
                  (a) => a.staffId === targetEmp.id && a.date && a.date.startsWith(selectedMonth)
                );

                const pDays = empRecords.filter((a) => a.status === 'Present' || a.status === 'Overtime').length;
                const aDays = empRecords.filter((a) => a.status === 'Absent').length;
                const hDays = empRecords.filter((a) => a.status === 'Half Day').length;
                const lDays = empRecords.filter((a) => a.status === 'Leave').length;
                const otHrsSum = empRecords.reduce((sum, a) => sum + (parseFloat(a.otHours) || 0), 0);
                const totalWorkHrs = empRecords.reduce((sum, a) => sum + (parseFloat(a.workingHours) || 0), 0);

                return (
                  <div>
                    {/* Employee Profile Header */}
                    <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid #2563eb', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>{targetEmp.name}</h3>
                          <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                            Code: <strong>{targetEmp.code || targetEmp.id}</strong> | Dept: <strong>{targetEmp.department}</strong> | Role: <strong>{targetEmp.designation}</strong>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'right' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Basic Salary</span>
                            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>₹{Number(targetEmp.basicSalary || 25000).toLocaleString('en-IN')}</div>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Joining Date</span>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>{targetEmp.joiningDate || '01-Jan-2025'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employee Attendance Metrics for Month */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <div className="card" style={{ padding: '0.75rem', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065f46' }}>Present Days</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#064e3b' }}>{pDays} Days</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', background: '#fef2f2', borderColor: '#fca5a5' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991b1b' }}>Absent Days</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#7f1d1d' }}>{aDays} Days</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', background: '#fef3c7', borderColor: '#fde68a' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e' }}>Half Days</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#78350f' }}>{hDays} Days</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', background: '#f3e8ff', borderColor: '#d8b4fe' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6b21a8' }}>Leave Days</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#581c87' }}>{lDays} Days</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', background: '#eff6ff', borderColor: '#bfdbfe' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e40af' }}>Total Work Hours</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#1e3a8a' }}>{totalWorkHrs} hrs</div>
                      </div>
                      <div className="card" style={{ padding: '0.75rem', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534' }}>OT Hours</span>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#14532d' }}>{otHrsSum} hrs</div>
                      </div>
                    </div>

                    {/* Detailed Attendance Records Table */}
                    <div className="card">
                      <div className="card-header">
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>
                          Detailed Attendance Log for {selectedMonth}
                        </h4>
                      </div>
                      <div className="table-responsive">
                        <table className="erp-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Check In</th>
                              <th>Check Out</th>
                              <th>Working Hours</th>
                              <th>OT Hours</th>
                              <th>Late Status</th>
                              <th>Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {empRecords.length === 0 ? (
                              <tr>
                                <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>
                                  No attendance logs recorded for {targetEmp.name} in {selectedMonth}.
                                </td>
                              </tr>
                            ) : (
                              empRecords.map((r) => (
                                <tr key={r.id}>
                                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{r.date}</td>
                                  <td>
                                    <span
                                      style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        background: r.status === 'Present' ? '#d1fae5' : r.status === 'Absent' ? '#fee2e2' : '#fef3c7',
                                        color: r.status === 'Present' ? '#065f46' : r.status === 'Absent' ? '#991b1b' : '#92400e'
                                      }}
                                    >
                                      {r.status}
                                    </span>
                                  </td>
                                  <td>{r.checkIn || '09:30 AM'}</td>
                                  <td>{r.checkOut || '07:00 PM'}</td>
                                  <td style={{ fontWeight: 700 }}>{r.workingHours || 8.5} hrs</td>
                                  <td style={{ fontWeight: 800, color: '#166534' }}>{r.otHours || 0} hrs</td>
                                  <td>{r.lateStatus || 'On Time'}</td>
                                  <td>{r.notes || '-'}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* 2. PAYROLL SUB-TAB */}
      {activeSubTab === 'payroll' && (
        <div>
          {/* Payroll KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div className="card" style={{ padding: '0.85rem 1rem', background: '#eff6ff', borderColor: '#bfdbfe' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e40af' }}>Total Monthly Payroll</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1e3a8a', marginTop: '2px' }}>
                ₹{totalPayrollCost.toLocaleString()}
              </div>
            </div>

            <div className="card" style={{ padding: '0.85rem 1rem', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065f46' }}>Salaries Paid</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#064e3b', marginTop: '2px' }}>
                {totalPaidCount} / {activeEmployees.length} Disbursed
              </div>
            </div>

            <div className="card" style={{ padding: '0.85rem 1rem', background: '#fff7ed', borderColor: '#ffedd5' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412' }}>Pending Payroll Outflow</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#7c2d12', marginTop: '2px' }}>
                ₹{pendingPayrollCost.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>Select Payroll Month:</span>
                <input
                  type="month"
                  className="form-control form-control-sm"
                  style={{ width: '160px', fontWeight: 700 }}
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>

              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                Includes Basic + HRA + Allowances + OT Pay + Commissions - PF/ESI/PT Deductions
              </div>
            </div>

            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Emp Code</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Basic Pay</th>
                    <th>HRA & Allow.</th>
                    <th>Incentive / Comm</th>
                    <th>OT Pay</th>
                    <th>Gross Salary</th>
                    <th>Statutory Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {computedPayroll.map((p) => (
                    <tr key={p.staffId}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#64748b' }}>{p.code}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.staffName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.designation}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#1e40af' }}>{p.department}</td>
                      <td>₹{p.baseSalary.toLocaleString()}</td>
                      <td>₹{(p.hra + p.allowances).toLocaleString()}</td>
                      <td style={{ color: '#d97706', fontWeight: 700 }}>
                        {p.incentiveEarned > 0 ? `+₹${p.incentiveEarned.toLocaleString()}` : '₹0'}
                      </td>
                      <td style={{ color: '#2563eb', fontWeight: 600 }}>
                        {p.otPay > 0 ? `+₹${p.otPay.toLocaleString()} (${p.otHours}h)` : '₹0'}
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>₹{p.grossSalary.toLocaleString()}</td>
                      <td style={{ color: '#dc2626', fontSize: '0.78rem' }}>
                        -₹{p.totalDeductions.toLocaleString()}
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>PF:₹{p.pfDeduction} | PT:₹{p.ptDeduction}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#059669' }}>
                          ₹{p.netSalary.toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'Paid' ? 'badge-emerald' : 'badge-amber'}`}>
                          {p.status === 'Paid' ? '✓ Salary Paid' : 'Pending Outflow'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          {p.status !== 'Paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                paySalaryVoucher({
                                  month: selectedMonth,
                                  staffId: p.staffId,
                                  staffName: p.staffName,
                                  role: p.department,
                                  baseSalary: p.baseSalary,
                                  workingDays: 26,
                                  daysPresent: p.daysPresent,
                                  earnedBasePay: p.baseSalary,
                                  otHours: p.otHours,
                                  otPay: p.otPay,
                                  incentiveEarned: p.incentiveEarned,
                                  netSalary: p.netSalary,
                                  status: 'Paid',
                                  paidDate: new Date().toISOString().split('T')[0],
                                  paymentMode: 'Bank Transfer'
                                });
                              }}
                              className="btn btn-sm btn-primary"
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                            >
                              Pay Voucher
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedPaySlip(p)}
                            className="btn btn-sm btn-secondary"
                            style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                            title="Print Salary Slip"
                          >
                            <Printer size={12} /> Slip
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

      {/* 3. LEAVE MANAGEMENT SUB-TAB */}
      {activeSubTab === 'leaves' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Leave Applications & Approval Workflow
            </h3>
            <button onClick={() => setIsApplyLeaveOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={14} /> + Apply Leave Request
            </button>
          </div>

          <div className="card">
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Leave Type</th>
                    <th>Period (From — To)</th>
                    <th>Total Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Approval Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map((l) => (
                    <tr key={l.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#64748b' }}>{l.id}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{l.employeeName}</div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#1e40af' }}>{l.department}</td>
                      <td>
                        <span className="badge badge-purple">{l.leaveType}</span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                        {l.fromDate} → {l.toDate}
                      </td>
                      <td style={{ fontWeight: 800, textAlign: 'center' }}>{l.days} Day(s)</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{l.reason}</td>
                      <td>
                        <span className={`badge ${l.status === 'Approved' ? 'badge-emerald' : l.status === 'Rejected' ? 'badge-rose' : 'badge-amber'}`}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {l.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleLeaveStatus(l.id, 'Approved')}
                              className="btn btn-xs btn-primary"
                              style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', background: '#059669', borderColor: '#059669' }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveStatus(l.id, 'Rejected')}
                              className="btn btn-xs btn-secondary"
                              style={{ padding: '0.2rem 0.55rem', fontSize: '0.72rem', color: '#e11d48' }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. COMMISSIONS & INCENTIVES SUB-TAB */}
      {activeSubTab === 'commissions' && (
        <div>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <div className="card-title">
                <Award size={18} color="#2563eb" /> Commission & Incentive Rules Matrix
              </div>
            </div>
            <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#eff6ff', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontWeight: 800, color: '#1e40af' }}>Sales Executives</div>
                <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '4px' }}>
                  Commission % on Order Invoiced Grand Total (3.0% — 5.0%)
                </div>
              </div>
              <div style={{ background: '#f3e8ff', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #7c3aed' }}>
                <div style={{ fontWeight: 800, color: '#6b21a8' }}>🎨 Designers</div>
                <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '4px' }}>
                  ⚡ <strong>0.5% Profit Incentive</strong> per finished artwork job work
                </div>
              </div>
              <div style={{ background: '#ecfdf5', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #059669' }}>
                <div style={{ fontWeight: 800, color: '#065f46' }}>🖨️ Printers & ✂️ Finishers</div>
                <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '4px' }}>
                  ⚡ <strong>0.5% Profit Incentive</strong> per finished print / finishing job work
                </div>
              </div>
              <div style={{ background: '#fff7ed', padding: '0.85rem', borderRadius: '8px', borderLeft: '4px solid #ea580c' }}>
                <div style={{ fontWeight: 800, color: '#9a3412' }}>🚚 Delivery Executives</div>
                <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '4px' }}>
                  ⚡ <strong>0.5% Profit Incentive</strong> per finished order delivery & sign-off
                </div>
              </div>
            </div>
          </div>

          {/* Staff Monthly Incentives Summary Table */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <div className="card-title">Staff Incentive & Commission Summary</div>
            </div>
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Emp Code</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Incentive Model</th>
                    <th>Completed Job Incentives Count</th>
                    <th>Total 0.5% Incentive Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {activeEmployees.map((emp) => {
                    const pay = computedPayroll.find((p) => p.staffId === emp.id);
                    const empIncCount = (workerJobIncentives || []).filter(inc => inc.workerId === emp.id || inc.workerName === emp.name).length;
                    return (
                      <tr key={emp.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#64748b' }}>{emp.code || emp.id}</td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{emp.name}</td>
                        <td style={{ fontWeight: 700, color: '#1e40af' }}>{emp.department}</td>
                        <td style={{ fontWeight: 700 }}>
                          {emp.department === 'Sales' ? `${emp.commissionRate || 3.5}% Sales Comm + 0.5% Job Profit` :
                           '⚡ 0.5% Profit Incentive per finished job work'}
                        </td>
                        <td style={{ fontWeight: 800, color: '#7c3aed' }}>
                          {empIncCount} Completed Work Stage(s)
                        </td>
                        <td>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#059669' }}>
                            ₹{(pay?.incentiveEarned || 0).toLocaleString()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed 0.5% Worker Job Incentives Audit Ledger */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} color="#059669" />
                ⚡ 0.5% Worker Job Profit Incentives Real-Time Ledger
              </div>
              <span className="badge badge-emerald" style={{ fontWeight: 800 }}>
                {workerJobIncentives.length} Transaction Logs
              </span>
            </div>
            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Date & Time</th>
                    <th>Worker Name</th>
                    <th>Role / Stage</th>
                    <th>Order & Job Card #</th>
                    <th>Product Title</th>
                    <th>Job Profit (₹)</th>
                    <th>Incentive %</th>
                    <th>Earned Incentive (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(workerJobIncentives || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No worker job profit incentive records logged yet.
                      </td>
                    </tr>
                  ) : (
                    (workerJobIncentives || []).map((inc) => (
                      <tr key={inc.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#7c3aed', fontSize: '0.78rem' }}>{inc.id}</td>
                        <td style={{ fontSize: '0.78rem', color: '#64748b' }}>{inc.completedAt ? new Date(inc.completedAt).toLocaleString() : 'N/A'}</td>
                        <td style={{ fontWeight: 800, color: '#0f172a' }}>{inc.workerName}</td>
                        <td>
                          <span className={`badge ${
                            inc.roleStage === 'Design' ? 'badge-blue' :
                            inc.roleStage === 'Printing' ? 'badge-purple' :
                            inc.roleStage === 'Finishing' ? 'badge-amber' : 'badge-emerald'
                          }`} style={{ fontWeight: 800 }}>
                            {inc.roleStage === 'Design' ? '🎨 Designer' :
                             inc.roleStage === 'Printing' ? '🖨️ Printer' :
                             inc.roleStage === 'Finishing' ? '✂️ Finisher' : '🚚 Delivery'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          <div>Order: <strong style={{ color: '#1e40af' }}>{inc.orderId}</strong></div>
                          {inc.jobCardId && <div style={{ fontSize: '0.72rem', color: '#7c3aed' }}>{inc.jobCardId}</div>}
                        </td>
                        <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{inc.productName || 'Printing & Signage Item'}</td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>₹{(inc.jobProfit || 0).toLocaleString()}</td>
                        <td style={{ fontWeight: 800, color: '#2563eb' }}>{inc.incentivePct || 0.5}%</td>
                        <td style={{ fontWeight: 900, color: '#059669', fontSize: '0.95rem' }}>
                          +₹{Number(inc.incentiveAmount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. EMPLOYEE DIRECTORY SUB-TAB */}
      {activeSubTab === 'directory' && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
              <button
                onClick={() => setDeptFilter('ALL')}
                className={`btn btn-sm ${deptFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              >
                All Departments
              </button>
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDeptFilter(d)}
                  className={`btn btn-sm ${deptFilter === d ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div style={{ width: '240px', position: 'relative' }}>
              <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
              <input
                type="text"
                className="form-control form-control-sm"
                style={{ paddingLeft: '30px' }}
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Full Name</th>
                  <th>Biometric ID (K90)</th>
                  <th>Department & Designation</th>
                  <th>Contact info</th>
                  <th>Employment Type</th>
                  <th>Basic Salary</th>
                  <th>Bank Details</th>
                  <th>Statutory Numbers</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {activeEmployees
                  .filter((emp) => {
                    const q = searchQuery.toLowerCase();
                    const matchDept = deptFilter === 'ALL' || emp.department === deptFilter;
                    const matchQuery = (emp.name || '').toLowerCase().includes(q) || (emp.code || '').toLowerCase().includes(q);
                    return matchDept && matchQuery;
                  })
                  .map((emp) => (
                    <tr key={emp.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#64748b' }}>{emp.code || emp.id}</td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>📍 {emp.branch || 'Head Office'}</div>
                      </td>
                      <td>
                        {(() => {
                          const userMap = (biometricUsers || []).find(u => u.employeeId === emp.id);
                          if (userMap) {
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <span className="badge badge-emerald" style={{ fontWeight: 800, fontSize: '0.75rem' }}>
                                  ✓ K90 #{userMap.biometricUserId}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{userMap.biometricName}</span>
                              </div>
                            );
                          }
                          return (
                            <button
                              onClick={() => {
                                setAssignBioModalEmp(emp);
                                setAssignBioForm({ deviceId: 'DEV-K90-01', biometricUserId: '', biometricName: emp.name });
                              }}
                              className="btn btn-sm btn-secondary"
                              style={{ fontSize: '0.72rem', padding: '0.2rem 0.45rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Cpu size={12} color="#2563eb" /> + Assign K90 ID
                            </button>
                          );
                        })()}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#1e40af' }}>{emp.department}</div>
                        <div style={{ fontSize: '0.75rem', color: '#475569' }}>{emp.designation}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>📞 {emp.mobile}</div>
                        {emp.email && <div style={{ fontSize: '0.72rem', color: '#64748b' }}>✉ {emp.email}</div>}
                      </td>
                      <td>
                        <span className="badge badge-sky">{emp.employmentType || 'Permanent'}</span>
                      </td>
                      <td style={{ fontWeight: 800, color: '#0f172a' }}>₹{Number(emp.basicSalary || 25000).toLocaleString()}/mo</td>
                      <td style={{ fontSize: '0.75rem', color: '#475569' }}>
                        <div><strong>Bank:</strong> {emp.bankName || 'HDFC Bank'}</div>
                        <div><strong>A/C:</strong> {emp.accountNo || '5010023456789'}</div>
                      </td>
                      <td style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        <div>PAN: {emp.panNo || 'ABCDE1234F'}</div>
                        <div>PF: {emp.pfNo || 'MH/BOM/00123'}</div>
                      </td>
                      <td>
                        <span className="badge badge-emerald">{emp.status || 'Active'}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. BIOMETRIC DEVICE EMPLOYEES WORKSPACE (ZKTeco K90) */}
      {activeSubTab === 'biometric-device' && (
        <div>
          {/* Notification Banner */}
          {bioNotice && (
            <div style={{ backgroundColor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem' }}>
              <Zap size={18} color="#2563eb" /> {bioNotice}
            </div>
          )}

          {/* Metric Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>BIOMETRIC DEVICE</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', margin: '0.2rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Server size={18} color="#2563eb" /> ZKTeco K90
              </div>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>● Online (192.168.1.201:4370)</span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL DEVICE USERS</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e40af', margin: '0.2rem 0' }}>
                {allBioUsers.length} Users
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Registered on K90 Standalone</span>
            </div>

            <div className="card" style={{ borderLeft: '4px solid #059669' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>MAPPED ERP EMPLOYEES</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#059669', margin: '0.2rem 0' }}>
                {mappedBioCount} Mapped
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>✓ Linked to Employee Master</span>
            </div>

            <div className="card" style={{ borderLeft: unmappedBioCount > 0 ? '4px solid #f59e0b' : '4px solid #64748b' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>UNMAPPED BIOMETRIC USERS</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: unmappedBioCount > 0 ? '#d97706' : '#64748b', margin: '0.2rem 0' }}>
                {unmappedBioCount} Unmapped
              </h3>
              <span style={{ fontSize: '0.75rem', color: unmappedBioCount > 0 ? '#d97706' : '#64748b', fontWeight: 700 }}>
                {unmappedBioCount > 0 ? '⚠️ HR Action Required to Link' : 'All device users mapped'}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  onClick={handleImportK90}
                  disabled={isImportingBio}
                  className="btn btn-primary"
                  style={{ background: '#059669', borderColor: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={16} className={isImportingBio ? 'spin' : ''} />
                  {isImportingBio ? 'Connecting to K90...' : 'Import Users from K90'}
                </button>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {['ALL', 'Mapped', 'Unmapped', 'Disabled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setBioStatusFilter(st)}
                      className={`btn btn-sm ${bioStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontWeight: 700 }}
                    >
                      {st === 'ALL' ? `All Users (${allBioUsers.length})` :
                       st === 'Mapped' ? `Mapped (${mappedBioCount})` :
                       st === 'Unmapped' ? `Unmapped (${unmappedBioCount})` : `Disabled (${disabledBioCount})`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '220px', position: 'relative' }}>
                  <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    style={{ paddingLeft: '30px' }}
                    placeholder="Search User ID or Name..."
                    value={bioSearchQuery}
                    onChange={(e) => setBioSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Device Employees Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={18} color="#2563eb" />
                ZKTeco K90 Registered Device Users
              </div>
              <span className="badge badge-sky" style={{ fontWeight: 800 }}>
                Device IP: 192.168.1.201 (Port 4370)
              </span>
            </div>

            <div className="table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>K90 User ID</th>
                    <th>Biometric Name</th>
                    <th>Card Number / Type</th>
                    <th>Mapped ERP Employee</th>
                    <th>Department</th>
                    <th>Device Status</th>
                    <th>Mapping Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBioUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                        No biometric device users found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBioUsers.map((u) => {
                      const isMapped = u.mappingStatus === 'Matched' && u.employeeId;
                      const suggested = !isMapped ? getSuggestedEmployeeMatch(u) : null;
                      return (
                        <tr key={u.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, color: '#1e40af', fontSize: '0.95rem' }}>
                            #{u.biometricUserId}
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{u.biometricName || 'N/A'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Privilege: {u.privilege || 'User'}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{u.cardNo || '— No Card —'}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{u.verificationType || 'Fingerprint'}</div>
                          </td>
                          <td>
                            {isMapped ? (
                              <div>
                                <div style={{ fontWeight: 800, color: '#059669' }}>{u.employeeName}</div>
                                <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{u.employeeCode || u.employeeId}</div>
                              </div>
                            ) : (
                              <div>
                                <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 600 }}>— Unmapped —</span>
                                {suggested && (
                                  <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 700, marginTop: '0.2rem' }}>
                                    💡 Candidate: {suggested.employee.name}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ fontWeight: 700, color: '#1e40af' }}>
                            {u.department || '—'}
                          </td>
                          <td>
                            <span className={`badge ${u.deviceStatus === 'Disabled' ? 'badge-slate' : 'badge-emerald'}`}>
                              {u.deviceStatus || 'Active'}
                            </span>
                          </td>
                          <td>
                            {isMapped ? (
                              <span className="badge badge-emerald" style={{ fontWeight: 800 }}>
                                ✓ {u.matchedBy || 'Matched'}
                              </span>
                            ) : (
                              <span className="badge badge-amber" style={{ fontWeight: 800 }}>
                                ⚠️ Unmapped
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {!isMapped ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setMappingUserToMatch(u);
                                      if (suggested) setSelectedMatchEmpId(suggested.employee.id);
                                    }}
                                    className="btn btn-sm btn-primary"
                                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    title="Link this K90 User ID to an existing ERP Employee"
                                  >
                                    <Link size={13} /> Match Employee
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCreateEmpFromBioUser(u);
                                      setBioNewEmpForm({
                                        name: u.biometricName || '',
                                        code: `EMP-${u.biometricUserId}`,
                                        department: 'Production',
                                        designation: 'Machine Operator',
                                        basicSalary: 25000,
                                        mobile: '',
                                        email: ''
                                      });
                                    }}
                                    className="btn btn-sm btn-secondary"
                                    style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    title="Create a new Employee Master record and link this K90 ID"
                                  >
                                    <UserPlus size={13} /> Create Employee
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => unlinkBiometricUser(u.id)}
                                    className="btn btn-sm btn-secondary"
                                    style={{ color: '#e11d48', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    title="Unlink this K90 User ID"
                                  >
                                    <Unlink size={13} /> Unlink
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveSubTab('directory');
                                      setSearchQuery(u.employeeName || '');
                                    }}
                                    className="btn btn-sm btn-secondary"
                                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                    title="View Employee Profile"
                                  >
                                    <Eye size={13} /> View
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PRINT SALARY SLIP MODAL */}
      {selectedPaySlip && (
        <div className="modal-overlay" onClick={() => setSelectedPaySlip(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '92vw' }}>
            <div className="modal-header" style={{ background: '#0f172a', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={20} color="#60a5fa" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  Salary Slip — {selectedPaySlip.staffName} ({selectedMonth})
                </h3>
              </div>
              <button onClick={() => setSelectedPaySlip(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', background: '#ffffff' }}>
              <div id="salary-slip-print" style={{ border: '2px solid #0f172a', padding: '1.25rem', borderRadius: '8px' }}>
                {/* Company Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, color: '#0f172a' }}>{companyProfile.name}</h2>
                    <div style={{ fontSize: '0.78rem', color: '#475569' }}>{companyProfile.address}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>GSTIN: {companyProfile.gstin} | Phone: {companyProfile.phone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#1e40af' }}>PAYSLIP</h4>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Month: {selectedMonth}</div>
                  </div>
                </div>

                {/* Employee Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div><strong>Employee Code:</strong> {selectedPaySlip.code}</div>
                  <div><strong>Employee Name:</strong> {selectedPaySlip.staffName}</div>
                  <div><strong>Department:</strong> {selectedPaySlip.department}</div>
                  <div><strong>Designation:</strong> {selectedPaySlip.designation}</div>
                  <div><strong>Bank A/C:</strong> {selectedPaySlip.accountNo}</div>
                  <div><strong>IFSC Code:</strong> {selectedPaySlip.ifscCode}</div>
                  <div><strong>PAN:</strong> {selectedPaySlip.panNo}</div>
                  <div><strong>PF No:</strong> {selectedPaySlip.pfNo}</div>
                </div>

                {/* Earnings & Deductions Table */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Earnings */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ background: '#eff6ff', padding: '0.4rem 0.6rem', fontWeight: 800, fontSize: '0.82rem', color: '#1e40af', borderBottom: '1px solid #cbd5e1' }}>
                      EARNINGS
                    </div>
                    <div style={{ padding: '0.6rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Basic Pay:</span> <strong>₹{selectedPaySlip.baseSalary.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>HRA (40%):</span> <strong>₹{selectedPaySlip.hra.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>DA & Allowances:</span> <strong>₹{(selectedPaySlip.da + selectedPaySlip.allowances).toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Overtime Pay:</span> <strong>₹{selectedPaySlip.otPay.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706' }}>
                        <span>Incentives & Commission:</span> <strong>₹{selectedPaySlip.incentiveEarned.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem', fontWeight: 800, fontSize: '0.85rem' }}>
                        <span>Gross Earnings:</span> <span>₹{selectedPaySlip.grossSalary.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{ background: '#fef2f2', padding: '0.4rem 0.6rem', fontWeight: 800, fontSize: '0.82rem', color: '#991b1b', borderBottom: '1px solid #cbd5e1' }}>
                      DEDUCTIONS
                    </div>
                    <div style={{ padding: '0.6rem', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Provident Fund (PF):</span> <strong>₹{selectedPaySlip.pfDeduction.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>ESI Contribution:</span> <strong>₹{selectedPaySlip.esiDeduction.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Professional Tax (PT):</span> <strong>₹{selectedPaySlip.ptDeduction.toLocaleString()}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem', fontWeight: 800, fontSize: '0.85rem' }}>
                        <span>Total Deductions:</span> <span>₹{selectedPaySlip.totalDeductions.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Payable Banner */}
                <div style={{ background: '#059669', color: '#ffffff', padding: '0.75rem 1rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>NET SALARY PAYABLE:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>₹{selectedPaySlip.netSalary.toLocaleString()}</span>
                </div>

                {/* Signatures */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1', fontSize: '0.75rem', color: '#64748b' }}>
                  <div>Employer Signature</div>
                  <div>Employee Signature</div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', padding: '0.85rem 1.25rem' }}>
              <button onClick={() => window.print()} className="btn btn-primary">
                <Printer size={16} /> Print Payslip
              </button>
              <button onClick={() => setSelectedPaySlip(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPLY LEAVE MODAL */}
      {isApplyLeaveOpen && (
        <div className="modal-overlay" onClick={() => setIsApplyLeaveOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90vw' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>+ Apply Leave Request</h3>
              <button onClick={() => setIsApplyLeaveOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleApplyLeave}>
              <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Employee *</label>
                  <select
                    className="form-select"
                    value={newLeaveForm.employeeId}
                    onChange={(e) => setNewLeaveForm({ ...newLeaveForm, employeeId: e.target.value })}
                    required
                  >
                    <option value="">Select Employee...</option>
                    {activeEmployees.map((e) => (
                      <option key={e.id} value={e.id}>{e.name} ({e.department})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Leave Type *</label>
                  <select
                    className="form-select"
                    value={newLeaveForm.leaveType}
                    onChange={(e) => setNewLeaveForm({ ...newLeaveForm, leaveType: e.target.value })}
                  >
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Paid Leave">Paid Leave</option>
                    <option value="Loss of Pay">Loss of Pay</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">From Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newLeaveForm.fromDate}
                      onChange={(e) => setNewLeaveForm({ ...newLeaveForm, fromDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">To Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newLeaveForm.toDate}
                      onChange={(e) => setNewLeaveForm({ ...newLeaveForm, toDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Provide reason for leave..."
                    value={newLeaveForm.reason}
                    onChange={(e) => setNewLeaveForm({ ...newLeaveForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setIsApplyLeaveOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Leave Application</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MATCH BIOMETRIC USER TO EXISTING ERP EMPLOYEE MODAL */}
      {mappingUserToMatch && (
        <div className="modal-overlay" onClick={() => setMappingUserToMatch(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', width: '92vw' }}>
            <div className="modal-header" style={{ background: '#0f172a', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link size={20} color="#60a5fa" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  Link K90 User #{mappingUserToMatch.biometricUserId} ({mappingUserToMatch.biometricName})
                </h3>
              </div>
              <button onClick={() => setMappingUserToMatch(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleConfirmMatchUser}>
              <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
                  <div><strong>K90 User ID / PIN:</strong> #{mappingUserToMatch.biometricUserId}</div>
                  <div><strong>Device User Name:</strong> {mappingUserToMatch.biometricName || 'N/A'}</div>
                  <div><strong>Card Number:</strong> {mappingUserToMatch.cardNo || 'N/A'}</div>
                </div>

                {(() => {
                  const sug = getSuggestedEmployeeMatch(mappingUserToMatch);
                  if (sug) {
                    return (
                      <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.85rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 800, color: '#166534', marginBottom: '0.2rem' }}>
                          🎯 Auto-Suggested Match: {sug.employee.name} ({sug.employee.code || sug.employee.id})
                        </div>
                        <div style={{ color: '#15803d', fontSize: '0.78rem' }}>
                          Rule: {sug.matchType} — Confidence: <strong>{sug.confidence}</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 800 }}>Select ERP Employee to Link *</label>
                  <select
                    className="form-select"
                    value={selectedMatchEmpId}
                    onChange={(e) => setSelectedMatchEmpId(e.target.value)}
                    required
                  >
                    <option value="">Select Employee...</option>
                    {(employees || []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.code || e.id} — {e.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setMappingUserToMatch(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  <CheckCircle size={16} /> Confirm & Link Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW EMPLOYEE FROM BIOMETRIC USER MODAL */}
      {createEmpFromBioUser && (
        <div className="modal-overlay" onClick={() => setCreateEmpFromBioUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', width: '92vw' }}>
            <div className="modal-header" style={{ background: '#059669', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} color="#fff" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  Create ERP Employee for K90 User #{createEmpFromBioUser.biometricUserId}
                </h3>
              </div>
              <button onClick={() => setCreateEmpFromBioUser(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateAndMapEmp}>
              <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Full Employee Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={bioNewEmpForm.name}
                    onChange={(e) => setBioNewEmpForm({ ...bioNewEmpForm, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Employee Code / ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={bioNewEmpForm.code}
                      onChange={(e) => setBioNewEmpForm({ ...bioNewEmpForm, code: e.target.value })}
                      placeholder={`EMP-${createEmpFromBioUser.biometricUserId}`}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select
                      className="form-select"
                      value={bioNewEmpForm.department}
                      onChange={(e) => setBioNewEmpForm({ ...bioNewEmpForm, department: e.target.value })}
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Designation</label>
                    <input
                      type="text"
                      className="form-control"
                      value={bioNewEmpForm.designation}
                      onChange={(e) => setBioNewEmpForm({ ...bioNewEmpForm, designation: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Basic Salary (₹) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={bioNewEmpForm.basicSalary}
                      onChange={(e) => setBioNewEmpForm({ ...bioNewEmpForm, basicSalary: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={bioNewEmpForm.mobile}
                      onChange={(e) => setBioNewEmpForm({ ...bioNewEmpForm, mobile: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={bioNewEmpForm.email}
                      onChange={(e) => setBioNewEmpForm({ ...bioNewEmpForm, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setCreateEmpFromBioUser(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669', fontWeight: 800 }}>
                  <UserPlus size={16} /> Create Employee & Link K90 ID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN BIOMETRIC ID TO EMPLOYEE MODAL */}
      {assignBioModalEmp && (
        <div className="modal-overlay" onClick={() => setAssignBioModalEmp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '92vw' }}>
            <div className="modal-header" style={{ background: '#1e40af', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={20} color="#fff" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                  Assign K90 Biometric ID to {assignBioModalEmp.name}
                </h3>
              </div>
              <button onClick={() => setAssignBioModalEmp(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <form onSubmit={handleAssignBioId}>
              <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Biometric Device *</label>
                  <select
                    className="form-select"
                    value={assignBioForm.deviceId}
                    onChange={(e) => setAssignBioForm({ ...assignBioForm, deviceId: e.target.value })}
                  >
                    <option value="DEV-K90-01">ZKTeco K90 (Front Office) — 192.168.1.201</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Biometric User ID / PIN on Device *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 25, 26, 101"
                    value={assignBioForm.biometricUserId}
                    onChange={(e) => setAssignBioForm({ ...assignBioForm, biometricUserId: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Name Registered on Device (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={assignBioModalEmp.name}
                    value={assignBioForm.biometricName}
                    onChange={(e) => setAssignBioForm({ ...assignBioForm, biometricName: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setAssignBioModalEmp(null)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ fontWeight: 800 }}>
                  <Save size={16} /> Save Biometric Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREATE EMPLOYEE MODAL */}
      <CreateEmployeeModal
        isOpen={isAddEmployeeModalOpen}
        onClose={() => setIsAddEmployeeModalOpen(false)}
      />
    </div>
  );
};
