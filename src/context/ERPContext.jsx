import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import {
  initialCompanyProfile,
  initialCustomers,
  initialSalesPersons,
  initialCareOfPersons,
  initialWorkers,
  initialDesigners,
  initialVendors,
  initialProducts,
  initialSalesOrders,
  initialInventory,
  initialPurchaseOrders,
  initialPayments,
  initialFollowUps,
  initialCompanyBankAccounts,
  initialAttendance,
  initialPayroll,
  initialProductMaterialSpecs,
  initialEmployees,
  initialWorkerJobIncentives,
  initialOrderAuditLogs
} from '../data/mockData';
import { USER_ROLES, PRODUCTION_STATUS } from '../types';
import { api } from '../utils/api';

const ERPContext = createContext();

export const ERPProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // States mirroring database tables with localStorage persistence to prevent refresh data loss
  const [companyProfile, setCompanyProfile] = useState(initialCompanyProfile);
  const [companyBankAccounts, setCompanyBankAccounts] = useState([]);
  const [activeRole, setActiveRole] = useState(USER_ROLES.ADMIN);
  const [activeUser, setActiveUser] = useState({ name: 'Admin User', role: USER_ROLES.ADMIN });

  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_customers');
      return saved ? JSON.parse(saved) : initialCustomers;
    } catch (e) {
      return initialCustomers;
    }
  });

  const [salesOrders, setSalesOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_sales_orders');
      return saved ? JSON.parse(saved) : initialSalesOrders;
    } catch (e) {
      return initialSalesOrders;
    }
  });

  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_products');
      return saved ? JSON.parse(saved) : initialProducts;
    } catch (e) {
      return initialProducts;
    }
  });

  const [productMaterialSpecs, setProductMaterialSpecs] = useState([]);
  const [vendors, setVendors] = useState(initialVendors);

  const [employees, setEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_employees');
      return saved ? JSON.parse(saved) : initialEmployees;
    } catch (e) {
      return initialEmployees;
    }
  });

  const [designers, setDesigners] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_designers');
      return saved ? JSON.parse(saved) : initialDesigners;
    } catch (e) {
      return initialDesigners;
    }
  });

  const [salesPersons, setSalesPersons] = useState(initialSalesPersons);
  const [careOfPersons, setCareOfPersons] = useState(initialCareOfPersons);

  const [workers, setWorkers] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_workers');
      return saved ? JSON.parse(saved) : initialWorkers;
    } catch (e) {
      return initialWorkers;
    }
  });

  const [attendanceRecords, setAttendanceRecords] = useState(initialAttendance);
  const [payrollRecords, setPayrollRecords] = useState(initialPayroll);

  const [workerJobIncentives, setWorkerJobIncentives] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_worker_job_incentives');
      return saved ? JSON.parse(saved) : initialWorkerJobIncentives;
    } catch (e) {
      return initialWorkerJobIncentives;
    }
  });

  const [inventory, setInventory] = useState(initialInventory);
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);

  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_payments');
      return saved ? JSON.parse(saved) : initialPayments;
    } catch (e) {
      return initialPayments;
    }
  });

  const [orderAuditLogs, setOrderAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_order_audit_logs');
      return saved ? JSON.parse(saved) : initialOrderAuditLogs;
    } catch (e) {
      return initialOrderAuditLogs;
    }
  });

  const [followUps, setFollowUps] = useState([]);

  // Automatic LocalStorage Persistence Hooks so page refresh never loses sales orders or job data
  useEffect(() => {
    if (salesOrders && salesOrders.length > 0) {
      try { localStorage.setItem('stitch_erp_sales_orders', JSON.stringify(salesOrders)); } catch (e) {}
    }
  }, [salesOrders]);

  useEffect(() => {
    if (orderAuditLogs && orderAuditLogs.length > 0) {
      try { localStorage.setItem('stitch_erp_order_audit_logs', JSON.stringify(orderAuditLogs)); } catch (e) {}
    }
  }, [orderAuditLogs]);

  useEffect(() => {
    if (workerJobIncentives && workerJobIncentives.length > 0) {
      try { localStorage.setItem('stitch_erp_worker_job_incentives', JSON.stringify(workerJobIncentives)); } catch (e) {}
    }
  }, [workerJobIncentives]);

  useEffect(() => {
    if (customers && customers.length > 0) {
      try { localStorage.setItem('stitch_erp_customers', JSON.stringify(customers)); } catch (e) {}
    }
  }, [customers]);

  useEffect(() => {
    if (products && products.length > 0) {
      try { localStorage.setItem('stitch_erp_products', JSON.stringify(products)); } catch (e) {}
    }
  }, [products]);

  useEffect(() => {
    if (employees && employees.length > 0) {
      try { localStorage.setItem('stitch_erp_employees', JSON.stringify(employees)); } catch (e) {}
    }
  }, [employees]);

  useEffect(() => {
    if (workers && workers.length > 0) {
      try { localStorage.setItem('stitch_erp_workers', JSON.stringify(workers)); } catch (e) {}
    }
  }, [workers]);

  useEffect(() => {
    if (designers && designers.length > 0) {
      try { localStorage.setItem('stitch_erp_designers', JSON.stringify(designers)); } catch (e) {}
    }
  }, [designers]);

  useEffect(() => {
    if (payments && payments.length > 0) {
      try { localStorage.setItem('stitch_erp_payments', JSON.stringify(payments)); } catch (e) {}
    }
  }, [payments]);

  // UI state variables
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFollowUpsOpen, setIsFollowUpsOpen] = useState(false);

  // Load user profile details
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        setActiveRole(data.role || USER_ROLES.ADMIN);
        setActiveUser({ name: data.name || (data.email ? data.email.split('@')[0] : 'User'), role: data.role || USER_ROLES.ADMIN });
      } else {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user && authData.user.id === userId) {
          const emailStr = authData.user.email || '';
          const userName = authData.user.user_metadata?.name || (emailStr ? emailStr.split('@')[0] : 'Admin User');
          const newProfile = {
            id: userId,
            name: userName,
            email: emailStr,
            role: USER_ROLES.ADMIN
          };
          const { data: created } = await supabase.from('profiles').insert(newProfile).select('*').maybeSingle();
          const target = created || newProfile;
          setActiveRole(target.role || USER_ROLES.ADMIN);
          setActiveUser({ name: target.name || userName, role: target.role || USER_ROLES.ADMIN });
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  const [biometricDevices, setBiometricDevices] = useState([
    { id: 'DEV-K90-01', name: 'ZKTeco K90 (Front Office)', model: 'ZKTeco K90 Standalone', ipAddress: '192.168.1.201', port: 4370, location: 'Head Office Gate 1', status: 'Online', lastSyncTime: '2026-08-14 10:30 AM', totalUsers: 6 }
  ]);

  const [biometricUsers, setBiometricUsers] = useState([]);

  // Fetch all persistent ERP data from local SQLite database API server
  const fetchAllERPData = async () => {
    try {
      const data = await api.fetchAll();
      if (data && data.success) {
        if (data.companyProfile && data.companyProfile.name) setCompanyProfile(data.companyProfile);
        if (data.customers) setCustomers(data.customers);
        if (data.products) setProducts(data.products);
        if (data.productMaterialSpecs) setProductMaterialSpecs(data.productMaterialSpecs);
        if (data.vendors) setVendors(data.vendors);
        if (data.salesPersons) setSalesPersons(data.salesPersons);
        if (data.careOfPersons) setCareOfPersons(data.careOfPersons);
        if (data.employees) setEmployees(data.employees);
        if (data.biometricDevices) setBiometricDevices(data.biometricDevices);
        if (data.biometricUsers) setBiometricUsers(data.biometricUsers);
        if (data.salesOrders) setSalesOrders(data.salesOrders);
        if (data.workerJobIncentives) setWorkerJobIncentives(data.workerJobIncentives);
        if (data.payments) setPayments(data.payments);
      }
    } catch (err) {
      console.warn("API fetchAllERPData warning, using local state:", err);
    }
  };

  const loadMockFallbackData = () => {
    try {
      const savedOrders = localStorage.getItem('stitch_erp_sales_orders');
      const savedIncentives = localStorage.getItem('stitch_erp_worker_job_incentives');
      const savedCustomers = localStorage.getItem('stitch_erp_customers');
      const savedProducts = localStorage.getItem('stitch_erp_products');
      const savedWorkers = localStorage.getItem('stitch_erp_workers');
      const savedDesigners = localStorage.getItem('stitch_erp_designers');
      const savedEmployees = localStorage.getItem('stitch_erp_employees');
      const savedPayments = localStorage.getItem('stitch_erp_payments');

      setCompanyProfile(initialCompanyProfile);
      setCompanyBankAccounts(initialCompanyBankAccounts);
      setCustomers(savedCustomers ? JSON.parse(savedCustomers) : initialCustomers);
      setSalesPersons(initialSalesPersons);
      setCareOfPersons(initialCareOfPersons);
      setWorkers(savedWorkers ? JSON.parse(savedWorkers) : initialWorkers);
      setDesigners(savedDesigners ? JSON.parse(savedDesigners) : initialDesigners);
      setVendors(initialVendors);
      setProducts(savedProducts ? JSON.parse(savedProducts) : initialProducts);
      setProductMaterialSpecs(initialProductMaterialSpecs);
      setEmployees(savedEmployees ? JSON.parse(savedEmployees) : initialEmployees);
      setSalesOrders(savedOrders ? JSON.parse(savedOrders) : initialSalesOrders);
      setInventory(initialInventory);
      setPurchaseOrders(initialPurchaseOrders);
      setPayments(savedPayments ? JSON.parse(savedPayments) : initialPayments);
      setFollowUps(initialFollowUps);
      setAttendanceRecords(initialAttendance);
      setPayrollRecords(initialPayroll);
      setWorkerJobIncentives(savedIncentives ? JSON.parse(savedIncentives) : initialWorkerJobIncentives);
    } catch (e) {
      setSalesOrders(initialSalesOrders);
      setWorkerJobIncentives(initialWorkerJobIncentives);
    }
  };

  const loginAsDemoAdmin = () => {
    setSession({ user: { id: 'demo-admin-01', email: 'admin@screenarts.com' } });
    setActiveRole(USER_ROLES.ADMIN);
    setActiveUser({ name: 'Admin User', role: USER_ROLES.ADMIN });
    loadMockFallbackData();
    setLoading(false);
  };

  // Auth Session state listener
  useEffect(() => {
    if (!isSupabaseConfigured) {
      loginAsDemoAdmin();
      return;
    }

    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setSession(session);
          fetchUserProfile(session.user.id);
          fetchAllERPData();
        } else {
          loginAsDemoAdmin();
        }
        setLoading(false);
      }).catch((err) => {
        console.warn("Supabase getSession catch, initializing demo session:", err);
        loginAsDemoAdmin();
      });
    } catch (err) {
      console.warn("Supabase session init error, initializing demo session:", err);
      loginAsDemoAdmin();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchAllERPData();
      } else {
        loadMockFallbackData();
      }
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const switchRole = async (role) => {
    setActiveRole(role);
    setActiveUser({ name: `${role} Officer`, role });
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', session.user.id);
    }
  };

  // Add Customer with persistent SQLite integration
  const addCustomer = async (customerData) => {
    const newId = `CUST-${100 + customers.length + Math.floor(Math.random() * 100) + 1}`;
    const newCode = customerData.code || `${(customerData.name || 'CUST').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const uiCustomer = {
      id: newId,
      code: newCode,
      name: customerData.name,
      mobile: customerData.mobile,
      email: customerData.email || '',
      gstin: customerData.gstin || '',
      type: customerData.type || 'Walk-in',
      address: customerData.address || '',
      state: customerData.state || 'Maharashtra (27)',
      creditLimit: parseFloat(customerData.creditLimit) || 0,
      outstanding: 0,
      totalOrders: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };

    try {
      await api.createCustomer(uiCustomer);
      await fetchAllERPData();
    } catch (err) {
      console.warn("api.createCustomer exception, using local state:", err);
      setCustomers((prev) => [uiCustomer, ...prev.filter(c => c.id !== uiCustomer.id)]);
    }

    return uiCustomer;
  };

  // Care Of Person Management
  const addCareOfPerson = async (careOfData) => {
    const newId = `CO-${String(careOfPersons.length + 1).padStart(2, '0')}`;
    const newCareOf = {
      id: newId,
      name: careOfData.name,
      mobile: careOfData.mobile,
      email: careOfData.email || '',
      role: careOfData.role || 'Referred Agent / Consultant',
      referral_commission_pct: parseFloat(careOfData.referralCommissionPct) || 5.0,
      total_referred_sales: 0,
      active_orders: 0,
      notes: careOfData.notes || ''
    };

    const uiCareOf = {
      ...newCareOf,
      referralCommissionPct: newCareOf.referral_commission_pct,
      totalReferredSales: newCareOf.total_referred_sales,
      activeOrders: newCareOf.active_orders
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('care_of_persons').insert(newCareOf);
        if (error) console.warn("Supabase care_of_persons insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase care_of_persons insert exception:", err);
    }

    setCareOfPersons((prev) => [uiCareOf, ...prev.filter(c => c.id !== uiCareOf.id)]);
    return uiCareOf;
  };

  const updateCareOfPerson = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.referralCommissionPct !== undefined) {
      dbUpdate.referral_commission_pct = parseFloat(updatedData.referralCommissionPct) || 0;
      delete dbUpdate.referralCommissionPct;
    }
    if (updatedData.totalReferredSales !== undefined) {
      dbUpdate.total_referred_sales = parseFloat(updatedData.totalReferredSales) || 0;
      delete dbUpdate.totalReferredSales;
    }
    if (updatedData.activeOrders !== undefined) {
      dbUpdate.active_orders = parseInt(updatedData.activeOrders, 10) || 0;
      delete dbUpdate.activeOrders;
    }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('care_of_persons').update(dbUpdate).eq('id', id);
        if (error) console.warn("Supabase care_of_persons update error:", error);
      }
    } catch (err) {
      console.warn("Supabase care_of_persons update exception:", err);
    }

    setCareOfPersons((prev) =>
      prev.map((co) => (co.id === id ? { ...co, ...updatedData, referralCommissionPct: dbUpdate.referral_commission_pct ?? co.referralCommissionPct } : co))
    );
    return true;
  };

  const deleteCareOfPerson = async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('care_of_persons').delete().eq('id', id);
        if (error) console.warn("Supabase care_of_persons delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase care_of_persons delete exception:", err);
    }
    setCareOfPersons((prev) => prev.filter((co) => co.id !== id));
    return true;
  };

  const updateCustomer = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.creditLimit !== undefined) {
      dbUpdate.credit_limit = parseFloat(updatedData.creditLimit) || 0;
      delete dbUpdate.creditLimit;
    }
    if (updatedData.outstandingAmount !== undefined) {
      dbUpdate.outstanding = parseFloat(updatedData.outstandingAmount) || 0;
      delete dbUpdate.outstandingAmount;
    }
    if (updatedData.totalOrders !== undefined) {
      dbUpdate.total_orders = parseInt(updatedData.totalOrders, 10) || 0;
      delete dbUpdate.totalOrders;
    }
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('customers').update(dbUpdate).eq('id', id);
        if (error) console.warn("Supabase customer update error:", error);
      }
    } catch (err) {
      console.warn("Supabase customer update exception:", err);
    }
    setCustomers((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updatedData, credit_limit: dbUpdate.credit_limit ?? c.credit_limit, outstanding: dbUpdate.outstanding ?? c.outstanding } : c))
    );
    return true;
  };

  const deleteCustomer = async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) console.warn("Supabase customer delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase customer delete exception:", err);
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  const addProduct = async (productData, specsArr = []) => {
    const pid = productData.id || `PROD-${Date.now()}`;
    const newProduct = { ...productData, id: pid };
    try {
      await api.createProduct(newProduct, specsArr);
      await fetchAllERPData();
    } catch (err) {
      console.warn("api.createProduct exception, using local state fallback:", err);
      setProducts((prev) => [newProduct, ...prev.filter(p => p.id !== pid)]);
    }
    return newProduct;
  };

  const updateProduct = async (id, productData, specsArr = []) => {
    try {
      await api.updateProduct(id, productData, specsArr);
      await fetchAllERPData();
    } catch (err) {
      console.warn("api.updateProduct exception, using local state fallback:", err);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...productData } : p)));
    }
    return { ...productData, id };
  };

  const deleteProduct = async (id) => {
    try {
      await api.deleteProduct(id);
      await fetchAllERPData();
    } catch (err) {
      console.warn("api.deleteProduct exception, using local fallback:", err);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setProductMaterialSpecs((prev) => prev.filter((s) => s.productId !== id));
    }
    return true;
  };

  const addVendor = async (vendorData) => {
    const newId = `VEND-${String(vendors.length + Math.floor(Math.random() * 50) + 1).padStart(2, '0')}`;
    const newVendor = {
      id: newId,
      name: vendorData.name,
      category: vendorData.category || 'Outsource Printing',
      mobile: vendorData.mobile || '',
      gstin: vendorData.gstin || '',
      pending_payment: 0,
      avg_turnaround_days: parseInt(vendorData.avgTurnaroundDays, 10) || 2
    };

    const uiVendor = {
      ...newVendor,
      pendingPayment: newVendor.pending_payment,
      avgTurnaroundDays: newVendor.avg_turnaround_days
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('vendors').insert(newVendor);
        if (error) console.warn("Supabase vendors insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase vendor insert exception:", err);
    }

    setVendors((prev) => [uiVendor, ...prev.filter(v => v.id !== uiVendor.id)]);
    return uiVendor;
  };

  const addDesigner = async (designerData) => {
    const newId = `DSG-${String(designers.length + 1).padStart(2, '0')}`;
    const newDesigner = {
      id: newId,
      name: designerData.name,
      mobile: designerData.mobile || '',
      active_jobs: 0,
      pending_approvals: 0,
      completed_month: 0
    };

    const uiDesigner = {
      ...newDesigner,
      activeJobs: 0,
      pendingApprovals: 0,
      completedMonth: 0
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('designers').insert(newDesigner);
        if (error) console.warn("Supabase designers insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase designer insert exception:", err);
    }

    setDesigners((prev) => [uiDesigner, ...prev.filter(d => d.id !== uiDesigner.id)]);
    return uiDesigner;
  };

  // Worker Management
  const addWorker = async (workerData) => {
    const newId = `WRK-${String(workers.length + 1).padStart(2, '0')}`;
    const newWorker = {
      id: newId,
      name: workerData.name,
      role: workerData.role || 'Production Staff',
      mobile: workerData.mobile || '',
      incentive_per_sq_ft: parseFloat(workerData.incentivePerSqFt) || 0.5,
      incentive_per_job: parseFloat(workerData.incentivePerJob) || 50,
      jobs_completed_this_month: 0,
      sq_ft_handled_this_month: 0
    };

    const uiWorker = {
      ...newWorker,
      incentivePerSqFt: newWorker.incentive_per_sq_ft,
      incentivePerJob: newWorker.incentive_per_job,
      jobsCompletedThisMonth: newWorker.jobs_completed_this_month,
      sqFtHandledThisMonth: newWorker.sq_ft_handled_this_month
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('workers').insert(newWorker);
        if (error) console.warn("Supabase workers insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase worker insert exception:", err);
    }

    setWorkers((prev) => [uiWorker, ...prev.filter(w => w.id !== uiWorker.id)]);
    return uiWorker;
  };



  // Unified Employee Master CRUD
  const addEmployee = async (empData) => {
    const cleanName = (empData.name || '').trim();
    if (!cleanName) {
      throw new Error('Employee Full Name is required.');
    }

    const cleanMobile = (empData.mobile || '').trim();
    if (cleanMobile) {
      const dupMobile = (employees || []).find((e) => e.mobile === cleanMobile);
      if (dupMobile) {
        throw new Error(`Mobile number ${cleanMobile} is already registered to "${dupMobile.name}".`);
      }
    }

    const cleanEmail = (empData.email || '').trim().toLowerCase();
    if (cleanEmail) {
      const dupEmail = (employees || []).find((e) => (e.email || '').toLowerCase() === cleanEmail);
      if (dupEmail) {
        throw new Error(`Email ${cleanEmail} is already registered to "${dupEmail.name}".`);
      }
    }

    const newId = `EMP-${100 + (employees || []).length + Math.floor(Math.random() * 100) + 1}`;
    const newCode = (empData.code || `EMP-${newId}`).trim();

    const dbEmp = {
      id: newId,
      code: newCode,
      name: cleanName,
      photo: empData.photo || '',
      mobile: cleanMobile,
      email: cleanEmail,
      department: empData.department || 'Sales',
      designation: empData.designation || 'Sales Executive',
      role: empData.role || 'Sales',
      branch: empData.branch || 'Head Office',
      joining_date: empData.joiningDate || new Date().toISOString().split('T')[0],
      salary_type: empData.salaryType || 'Fixed Salary',
      basic_salary: parseFloat(empData.basicSalary) || 0,
      commission_rate: parseFloat(empData.commissionRate) || 0,
      incentive_rate: parseFloat(empData.incentiveRate) || 0,
      status: empData.status || 'Active',
      address: empData.address || '',
      emergency_contact: empData.emergencyContact || '',
      notes: empData.notes || '',
      created_at: new Date().toISOString()
    };

    const uiEmp = {
      id: dbEmp.id,
      code: dbEmp.code,
      name: dbEmp.name,
      photo: dbEmp.photo,
      mobile: dbEmp.mobile,
      email: dbEmp.email,
      department: dbEmp.department,
      designation: dbEmp.designation,
      role: dbEmp.role,
      branch: dbEmp.branch,
      joiningDate: dbEmp.joining_date,
      salaryType: dbEmp.salary_type,
      basicSalary: dbEmp.basic_salary,
      commissionRate: dbEmp.commission_rate,
      incentiveRate: dbEmp.incentive_rate,
      status: dbEmp.status,
      address: dbEmp.address,
      emergencyContact: dbEmp.emergency_contact,
      notes: dbEmp.notes
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('employees').insert(dbEmp);
        if (error) console.warn("Supabase employees insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase employees insert exception:", err);
    }

    setEmployees((prev) => [uiEmp, ...prev.filter(e => e.id !== uiEmp.id)]);
    return uiEmp;
  };

  const updateEmployee = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.joiningDate !== undefined) { dbUpdate.joining_date = updatedData.joiningDate; delete dbUpdate.joiningDate; }
    if (updatedData.salaryType !== undefined) { dbUpdate.salary_type = updatedData.salaryType; delete dbUpdate.salaryType; }
    if (updatedData.basicSalary !== undefined) { dbUpdate.basic_salary = parseFloat(updatedData.basicSalary) || 0; delete dbUpdate.basicSalary; }
    if (updatedData.commissionRate !== undefined) { dbUpdate.commission_rate = parseFloat(updatedData.commissionRate) || 0; delete dbUpdate.commissionRate; }
    if (updatedData.incentiveRate !== undefined) { dbUpdate.incentive_rate = parseFloat(updatedData.incentiveRate) || 0; delete dbUpdate.incentiveRate; }
    if (updatedData.emergencyContact !== undefined) { dbUpdate.emergency_contact = updatedData.emergencyContact; delete dbUpdate.emergencyContact; }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('employees').update(dbUpdate).eq('id', id);
        if (error) console.warn("Supabase employees update error:", error);
      }
    } catch (err) {
      console.warn("Supabase employees update exception:", err);
    }

    setEmployees((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updatedData } : e))
    );
    return true;
  };

  const deleteEmployee = async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) console.warn("Supabase employees delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase employees delete exception:", err);
    }
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    return true;
  };



  // Vendor / Supplier Updates & Deletion
  const updateVendor = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.pendingPayment !== undefined) { dbUpdate.pending_payment = updatedData.pendingPayment; delete dbUpdate.pendingPayment; }
    if (updatedData.avgTurnaroundDays !== undefined) { dbUpdate.avg_turnaround_days = updatedData.avgTurnaroundDays; delete dbUpdate.avgTurnaroundDays; }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('vendors').update(dbUpdate).eq('id', id);
        if (error) console.warn("Supabase vendor update error:", error);
      }
    } catch (err) {
      console.warn("Supabase vendor update exception:", err);
    }
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, ...updatedData } : v)));
    return true;
  };

  const deleteVendor = async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('vendors').delete().eq('id', id);
        if (error) console.warn("Supabase vendor delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase vendor delete exception:", err);
    }
    setVendors((prev) => prev.filter((v) => v.id !== id));
    return true;
  };

  // Worker Updates & Deletion
  const updateWorker = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.incentivePerSqFt !== undefined) { dbUpdate.incentive_per_sq_ft = updatedData.incentivePerSqFt; delete dbUpdate.incentivePerSqFt; }
    if (updatedData.incentivePerJob !== undefined) { dbUpdate.incentive_per_job = updatedData.incentivePerJob; delete dbUpdate.incentivePerJob; }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('workers').update(dbUpdate).eq('id', id);
        if (error) console.warn("Supabase worker update error:", error);
      }
    } catch (err) {
      console.warn("Supabase worker update exception:", err);
    }
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, ...updatedData } : w)));
    return true;
  };

  const deleteWorker = async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('workers').delete().eq('id', id);
        if (error) console.warn("Supabase worker delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase worker delete exception:", err);
    }
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    return true;
  };

  // Designer Updates & Deletion
  const updateDesigner = async (id, updatedData) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('designers').update(updatedData).eq('id', id);
        if (error) console.warn("Supabase designer update error:", error);
      }
    } catch (err) {
      console.warn("Supabase designer update exception:", err);
    }
    setDesigners((prev) => prev.map((d) => (d.id === id ? { ...d, ...updatedData } : d)));
    return true;
  };

  const deleteDesigner = async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('designers').delete().eq('id', id);
        if (error) console.warn("Supabase designer delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase designer delete exception:", err);
    }
    setDesigners((prev) => prev.filter((d) => d.id !== id));
    return true;
  };

  // Sales Person Updates & Deletion
  const updateSalesPerson = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.commissionRate !== undefined) { dbUpdate.commission_rate = updatedData.commissionRate; delete dbUpdate.commissionRate; }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('sales_persons').update(dbUpdate).eq('id', id);
        if (error) console.warn("Supabase sales_person update error:", error);
      }
    } catch (err) {
      console.warn("Supabase sales_person update exception:", err);
    }
    setSalesPersons((prev) => prev.map((s) => (s.id === id ? { ...s, ...updatedData } : s)));
    return true;
  };

  const deleteSalesPerson = async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('sales_persons').delete().eq('id', id);
        if (error) console.warn("Supabase sales_person delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase sales_person delete exception:", err);
    }
    setSalesPersons((prev) => prev.filter((s) => s.id !== id));
    return true;
  };

  const toggleEmployeeStatus = async (id) => {
    const target = (employees || []).find((e) => e.id === id);
    if (!target) return;
    const newStatus = target.status === 'Inactive' ? 'Active' : 'Inactive';
    await updateEmployee(id, { status: newStatus });
  };

  // Dynamic Product Material Specifications Management
  const addMaterialSpec = async (specData) => {
    const cleanSpecName = (specData.specName || '').trim();
    if (!cleanSpecName) {
      throw new Error('Specification Name is required.');
    }

    const existing = (productMaterialSpecs || []).find(
      (s) => s.productId === specData.productId && (s.specName || '').toLowerCase().trim() === cleanSpecName.toLowerCase()
    );
    if (existing) {
      throw new Error(`Specification "${cleanSpecName}" already exists for this product.`);
    }

    const newId = `SPEC-${100 + productMaterialSpecs.length + Math.floor(Math.random() * 100) + 1}`;
    const newSpec = {
      id: newId,
      product_id: specData.productId,
      spec_name: cleanSpecName,
      material_name: specData.materialName || cleanSpecName,
      description: specData.description || '',
      unit: specData.unit || 'Sq.Ft',
      gsm: parseFloat(specData.gsm) || 0,
      thickness: specData.thickness || '',
      color: specData.color || '',
      size: specData.size || '',
      cost_price: parseFloat(specData.costPrice) || 0,
      selling_price: parseFloat(specData.sellingPrice) || 0,
      gst_rate: parseFloat(specData.gstRate) || 18,
      hsn_code: specData.hsnCode || '9989',
      is_default: !!specData.isDefault,
      status: specData.status || 'Active',
      created_at: new Date().toISOString()
    };

    const uiSpec = {
      id: newSpec.id,
      productId: newSpec.product_id,
      specName: newSpec.spec_name,
      materialName: newSpec.material_name,
      description: newSpec.description,
      unit: newSpec.unit,
      gsm: newSpec.gsm,
      thickness: newSpec.thickness,
      color: newSpec.color,
      size: newSpec.size,
      costPrice: newSpec.cost_price,
      sellingPrice: newSpec.selling_price,
      gstRate: newSpec.gst_rate,
      hsnCode: newSpec.hsn_code,
      isDefault: newSpec.is_default,
      status: newSpec.status,
      createdAt: newSpec.created_at
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('product_material_specifications').insert(newSpec);
        if (error) console.warn("Supabase product_material_specifications insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase product_material_specifications insert exception:", err);
    }

    setProductMaterialSpecs((prev) => {
      const updated = prev.map((s) => (s.productId === specData.productId && specData.isDefault ? { ...s, isDefault: false } : s));
      return [uiSpec, ...updated.filter((s) => s.id !== uiSpec.id)];
    });
    return uiSpec;
  };

  const updateMaterialSpec = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.productId) { dbUpdate.product_id = updatedData.productId; delete dbUpdate.productId; }
    if (updatedData.specName) { dbUpdate.spec_name = updatedData.specName; delete dbUpdate.specName; }
    if (updatedData.materialName) { dbUpdate.material_name = updatedData.materialName; delete dbUpdate.materialName; }
    if (updatedData.costPrice !== undefined) { dbUpdate.cost_price = parseFloat(updatedData.costPrice) || 0; delete dbUpdate.costPrice; }
    if (updatedData.sellingPrice !== undefined) { dbUpdate.selling_price = parseFloat(updatedData.sellingPrice) || 0; delete dbUpdate.sellingPrice; }
    if (updatedData.gstRate !== undefined) { dbUpdate.gst_rate = parseFloat(updatedData.gstRate) || 18; delete dbUpdate.gstRate; }
    if (updatedData.hsnCode) { dbUpdate.hsn_code = updatedData.hsnCode; delete dbUpdate.hsnCode; }
    if (updatedData.isDefault !== undefined) { dbUpdate.is_default = !!updatedData.isDefault; delete dbUpdate.isDefault; }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('product_material_specifications').update(dbUpdate).eq('id', id);
        if (error) console.warn("Supabase product_material_specifications update error:", error);
      }
    } catch (err) {
      console.warn("Supabase product_material_specifications update exception:", err);
    }

    setProductMaterialSpecs((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return { ...s, ...updatedData };
        }
        if (updatedData.productId && updatedData.isDefault && s.productId === updatedData.productId) {
          return { ...s, isDefault: false };
        }
        return s;
      })
    );
    return true;
  };

  const deleteMaterialSpec = async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('product_material_specifications').delete().eq('id', id);
        if (error) console.warn("Supabase product_material_specifications delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase product_material_specifications delete exception:", err);
    }
    setProductMaterialSpecs((prev) => prev.filter((s) => s.id !== id));
    return true;
  };

  const toggleSpecStatus = async (id) => {
    const target = (productMaterialSpecs || []).find((s) => s.id === id);
    if (!target) return;
    const newStatus = target.status === 'Inactive' ? 'Active' : 'Inactive';
    await updateMaterialSpec(id, { status: newStatus });
  };



  // Add Sales Person
  const addSalesPerson = async (spData) => {
    const newSp = {
      id: `SP-${Math.floor(10 + Math.random() * 90)}`,
      name: spData.name,
      mobile: spData.mobile,
      target: parseFloat(spData.target) || 500000,
      achieved: 0,
      commission_rate: parseFloat(spData.commissionRate) || 3.5
    };

    try {
      const { error } = await supabase.from('sales_persons').insert(newSp);
      if (error) throw error;

      const uiSp = {
        ...newSp,
        commissionRate: newSp.commission_rate
      };
      setSalesPersons((prev) => [...prev, uiSp]);
      return uiSp;
    } catch (err) {
      console.error("Error adding sales person to database:", err);
    }
  };

  // Mark Staff Attendance
  const markAttendance = async (attData) => {
    const existingIdx = (attendanceRecords || []).findIndex((a) => a.date === attData.date && a.staffId === attData.staffId);
    const dbRecord = {
      date: attData.date,
      staff_id: attData.staffId,
      staff_name: attData.staffName,
      type: attData.type || 'Staff',
      status: attData.status || 'Present',
      ot_hours: parseFloat(attData.otHours) || 0,
      notes: attData.notes || '',
      check_in: attData.checkIn || null,
      check_out: attData.checkOut || null,
      working_hours: parseFloat(attData.workingHours) || 0,
      late_status: attData.lateStatus || 'On Time'
    };

    try {
      if (existingIdx >= 0) {
        const id = attendanceRecords[existingIdx].id;
        const { error } = await supabase.from('attendance').update(dbRecord).eq('id', id);
        if (error) {
          console.warn("Supabase attendance update fallback:", error.message);
        }

        setAttendanceRecords((prev) => {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...attData };
          return updated;
        });
      } else {
        const newId = `ATT-${attData.date}-${attData.staffId}`;
        const { error } = await supabase.from('attendance').insert({ id: newId, ...dbRecord });
        if (error) {
          console.warn("Supabase attendance insert fallback:", error.message);
        }

        setAttendanceRecords((prev) => [{ id: newId, ...attData }, ...prev.filter(a => a.id !== newId)]);
      }
    } catch (err) {
      console.error("Error logging attendance in database:", err);
      throw err;
    }
  };

  // Pay Salary Voucher
  const paySalaryVoucher = async (payrollId, paymentMode = 'Bank Transfer') => {
    const paidDate = new Date().toISOString().split('T')[0];
    try {
      const { error } = await supabase.from('payroll').update({
        status: 'Paid',
        paid_date: paidDate,
        payment_mode: paymentMode
      }).eq('id', payrollId);

      if (error) throw error;

      setPayrollRecords((prev) =>
        prev.map((pr) =>
          pr.id === payrollId
            ? {
                ...pr,
                status: 'Paid',
                paidDate,
                paymentMode
              }
            : pr
        )
      );
    } catch (err) {
      console.error("Error paying payroll record in database:", err);
    }
  };

  // Generate Next Order ID
  const getNextOrderId = () => {
    const year = new Date().getFullYear();
    const count = salesOrders.length + 894;
    return `SO-${year}-${String(count).padStart(4, '0')}`;
  };

  // Generate Next Quotation ID
  const getNextQuotationId = () => {
    const year = new Date().getFullYear();
    const quotes = (salesOrders || []).filter(o => o.orderType === 'Quotation' || o.id?.startsWith('QT-'));
    const count = quotes.length + 101;
    return `QT-${year}-${String(count).padStart(4, '0')}`;
  };

  // Order calculation engine
  const processOrderData = (orderPayload, existingOrderId = null) => {
    const orderTaxMode = orderPayload.taxMode || 'ETR (Exclusive Tax)';
    const defaultDeliveryDate = orderPayload.deliveryDate || new Date().toISOString().split('T')[0];

    let totalTaxable = 0;
    let totalGst = 0;
    let totalEstCost = 0;
    let totalActCost = 0;
    let totalInternalEstOutsourceCost = 0;

    const processedItems = orderPayload.items.map((item, idx) => {
      const sqft = item.unit && item.unit.startsWith('Sq') 
        ? (parseFloat(item.width) || 0) * (parseFloat(item.height) || 0) * (parseFloat(item.qty) || 1) 
        : 0;
      const rate = parseFloat(item.sellingRate) || 0;
      const disc = parseFloat(item.discount) || 0;
      const itemGstRate = parseFloat(item.gstRate) || 18;
      
      let grossTotal = 0;
      if (item.unit && item.unit.startsWith('Sq')) {
        grossTotal = Math.max(0, (sqft * rate) - disc);
      } else {
        grossTotal = Math.max(0, ((parseFloat(item.qty) || 1) * rate) - disc);
      }

      let taxableAmount = grossTotal;
      let lineGst = 0;

      if (orderTaxMode.includes('ITR')) {
        taxableAmount = grossTotal / (1 + (itemGstRate / 100));
        lineGst = grossTotal - taxableAmount;
      } else if (orderTaxMode.includes('NTR')) {
        taxableAmount = grossTotal;
        lineGst = 0;
      } else {
        taxableAmount = grossTotal;
        lineGst = grossTotal * (itemGstRate / 100);
      }

      const itemQty = item.unit && item.unit.startsWith('Sq') ? sqft : (parseFloat(item.qty) || 1);
      const lineEstCost = (parseFloat(item.estimatedCost) || 0) * itemQty;
      const lineActCost = (parseFloat(item.actualCost) || lineEstCost);
      const internalEstOutsourceCost = parseFloat(item.internalEstOutsourceCost) || 0;

      totalTaxable += taxableAmount;
      totalGst += lineGst;
      totalEstCost += lineEstCost;
      totalActCost += lineActCost;
      totalInternalEstOutsourceCost += internalEstOutsourceCost;

      const orderNum = existingOrderId ? existingOrderId.split('-').pop() : 'NEW';
      return {
        ...item,
        id: item.id || `ITEM-${idx + 1}`,
        jobCardId: item.jobCardId || `JC-${orderNum}-${idx + 1}`,
        productionStatus: item.productionStatus || PRODUCTION_STATUS.NEW,
        deliveryDate: item.deliveryDate || defaultDeliveryDate,
        taxType: orderTaxMode,
        internalEstOutsourceCost: internalEstOutsourceCost,
        totalSqFt: sqft,
        taxableAmount: parseFloat(taxableAmount.toFixed(2)),
        gstAmount: parseFloat(lineGst.toFixed(2)),
        amount: grossTotal,
        estimatedCost: lineEstCost,
        actualCost: lineActCost
      };
    });

    const subtotal = parseFloat(totalTaxable.toFixed(2));
    const isInterstate = orderPayload.customerState && !orderPayload.customerState.includes('Maharashtra');
    let cgst = 0, sgst = 0, igst = 0;

    if (isInterstate) {
      igst = parseFloat(totalGst.toFixed(2));
    } else {
      cgst = parseFloat((totalGst / 2).toFixed(2));
      sgst = parseFloat((totalGst / 2).toFixed(2));
    }

    const rawTotal = subtotal + cgst + sgst + igst;
    const grandTotal = Math.round(rawTotal);
    const roundOff = parseFloat((grandTotal - rawTotal).toFixed(2));

    const advance = parseFloat(orderPayload.advanceAmount) || 0;
    const balance = grandTotal - advance;

    let payStatus = 'Pending';
    if (advance >= grandTotal) payStatus = 'Paid';
    else if (advance > 0) payStatus = 'Partial';
    else if (orderPayload.paymentMethod === 'Credit Account') payStatus = 'Credit';

    const grossProfit = subtotal - totalActCost;
    const profitMarginPct = subtotal > 0 ? parseFloat(((grossProfit / subtotal) * 100).toFixed(1)) : 0;

    return {
      processedOrder: {
        ...orderPayload,
        items: processedItems,
        taxMode: orderTaxMode,
        subtotal,
        cgst,
        sgst,
        igst,
        roundOff,
        grandTotal,
        totalEstimatedCost: totalEstCost,
        totalActualCost: totalActCost,
        totalInternalEstOutsourceCost,
        grossProfit,
        profitMarginPct,
        advanceAmount: advance,
        balanceAmount: balance,
        paymentStatus: payStatus
      },
      balance,
      advance
    };
  };

  // Create Sales Order or Quotation with persistent SQLite integration
  const createSalesOrder = async (orderPayload) => {
    const isQuote = orderPayload.orderType === 'Quotation';
    const newOrderId = isQuote ? getNextQuotationId() : getNextOrderId();
    const { processedOrder, balance, advance } = processOrderData(orderPayload, newOrderId);

    let initialProdStatus = isQuote ? 'Quotation' : PRODUCTION_STATUS.NEW;
    if (!isQuote) {
      if ((processedOrder.items || []).some(i => i.outsource)) {
        initialProdStatus = PRODUCTION_STATUS.OUTSOURCE;
      } else if ((processedOrder.items || []).some(i => i.designerRequired === 'YES')) {
        initialProdStatus = PRODUCTION_STATUS.DESIGN;
      }
    }

    const finalOrder = {
      ...processedOrder,
      id: newOrderId,
      orderType: isQuote ? 'Quotation' : 'Direct',
      convertedFromQuotation: !!orderPayload.convertedFromQuotation,
      quotationId: isQuote ? newOrderId : (orderPayload.quotationId || null),
      quotationStatus: isQuote ? (orderPayload.quotationStatus || 'Draft') : null,
      productionStatus: initialProdStatus,
      createdAt: new Date().toISOString()
    };

    try {
      await api.createSalesOrder({
        orderHeader: {
          ...finalOrder,
          orderNumber: newOrderId,
          grandTotal: finalOrder.grandTotal,
          subtotal: finalOrder.subtotal,
          advanceAmount: advance,
          balanceAmount: balance
        },
        items: finalOrder.items,
        advanceAmount: advance,
        paymentMethod: processedOrder.paymentMethod
      });
      await fetchAllERPData();
    } catch (err) {
      console.warn("api.createSalesOrder exception, updating local state:", err);
      setSalesOrders((prev) => [finalOrder, ...prev.filter(o => o.id !== newOrderId)]);
    }

    // Log creation activity
    logOrderActivity({
      orderId: newOrderId,
      orderNumber: newOrderId,
      customerName: finalOrder.customerName,
      customerMobile: finalOrder.customerMobile,
      actionType: isQuote ? 'CREATED' : 'CREATED',
      actionTitle: `${isQuote ? 'Quotation' : 'Sales Order'} ${newOrderId} Created`,
      actor: activeUser?.name || 'Authorized Staff',
      role: activeRole || 'Sales',
      reason: isQuote ? 'New quotation prepared' : 'New sales order registered',
      newAmount: finalOrder.grandTotal,
      changesSummary: [
        `Created new ${isQuote ? 'Quotation' : 'Sales Order'} with ${finalOrder.items?.length || 0} line item(s)`,
        `Grand Total: ₹${Number(finalOrder.grandTotal || 0).toLocaleString()}`,
        `Advance received: ₹${Number(finalOrder.advanceAmount || 0).toLocaleString()} via ${finalOrder.paymentMethod || 'Cash/UPI'}`
      ],
      snapshot: finalOrder
    });

    return finalOrder;
  };

  // Update Quotation Status (e.g. Draft -> Sent to Customer -> Customer Approved -> Rejected)
  const updateQuotationStatus = async (quotationId, status) => {
    setSalesOrders(prev =>
      prev.map(o => (o.id === quotationId ? { ...o, quotationStatus: status } : o))
    );
    if (isSupabaseConfigured) {
      try {
        await supabase.from('sales_orders').update({ quotation_status: status }).eq('id', quotationId);
      } catch (err) {
        console.warn("Supabase quotation status update error:", err);
      }
    }
    return true;
  };

  // Central Order Audit Activity Logger
  const logOrderActivity = ({
    orderId,
    orderNumber,
    customerName,
    customerMobile,
    actionType, // 'CREATED' | 'EDITED' | 'CANCELLED' | 'DELETED' | 'CONVERTED' | 'STATUS_CHANGED'
    actionTitle,
    actor,
    role,
    reason,
    previousAmount,
    newAmount,
    diffAmount,
    refundOrReversal,
    changesSummary = [],
    previousSnapshot = null,
    newSnapshot = null,
    snapshot = null
  }) => {
    const entry = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderId: orderId || orderNumber || 'N/A',
      orderNumber: orderNumber || orderId || 'N/A',
      customerName: customerName || 'Customer',
      customerMobile: customerMobile || '',
      actionType: actionType || 'EDITED',
      actionTitle: actionTitle || `Order ${orderId} Activity`,
      actor: actor || activeUser?.name || 'Authorized Staff',
      role: role || activeRole || 'Admin',
      timestamp: new Date().toISOString(),
      formattedTime: new Date().toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      reason: reason || '',
      previousAmount: previousAmount !== undefined ? Number(previousAmount) : undefined,
      newAmount: newAmount !== undefined ? Number(newAmount) : undefined,
      diffAmount: diffAmount !== undefined ? Number(diffAmount) : undefined,
      refundOrReversal: refundOrReversal !== undefined ? Number(refundOrReversal) : undefined,
      changesSummary: Array.isArray(changesSummary) ? changesSummary : [String(changesSummary)],
      previousSnapshot: previousSnapshot || null,
      newSnapshot: newSnapshot || null,
      snapshot: snapshot || null
    };

    setOrderAuditLogs((prev) => [entry, ...(prev || [])]);
    return entry;
  };

  const clearAuditLogs = () => {
    setOrderAuditLogs([]);
    try {
      localStorage.removeItem('stitch_erp_order_audit_logs');
    } catch (e) {}
  };

  // Convert Quotation to Direct Sales Order with 1-Click
  const convertQuotationToSalesOrder = async (quotationId) => {
    const quote = (salesOrders || []).find(o => o.id === quotationId);
    if (!quote) throw new Error("Quotation not found.");

    const newOrderId = getNextOrderId();
    let initialProdStatus = PRODUCTION_STATUS.NEW;
    if ((quote.items || []).some(i => i.outsource)) {
      initialProdStatus = PRODUCTION_STATUS.OUTSOURCE;
    } else if ((quote.items || []).some(i => i.designerRequired === 'YES')) {
      initialProdStatus = PRODUCTION_STATUS.DESIGN;
    }

    const convertedOrder = {
      ...quote,
      id: newOrderId,
      orderType: 'Direct',
      convertedFromQuotation: true,
      quotationId: quote.id,
      quotationStatus: null,
      productionStatus: initialProdStatus,
      createdAt: new Date().toISOString()
    };

    // Update original quotation status in local state & database
    await updateQuotationStatus(quote.id, 'Converted');

    if (isSupabaseConfigured) {
      try {
        const dbOrder = {
          id: newOrderId,
          order_date: convertedOrder.orderDate || new Date().toISOString().split('T')[0],
          delivery_date: convertedOrder.deliveryDate,
          customer_id: convertedOrder.customerId,
          customer_name: convertedOrder.customerName,
          customer_mobile: convertedOrder.customerMobile,
          customer_state: convertedOrder.customerState,
          sales_person_id: convertedOrder.salesPersonId,
          sales_person_name: convertedOrder.salesPersonName,
          care_of_id: convertedOrder.careOfId,
          care_of_name: convertedOrder.careOfName,
          branch: convertedOrder.branch || 'Head Office',
          order_source: convertedOrder.orderSource || 'Quotation Conversion',
          reference_no: convertedOrder.referenceNo || quote.id,
          remarks: `Converted from Quotation ${quote.id}. ${convertedOrder.remarks || ''}`,
          subtotal: convertedOrder.subtotal,
          cgst: convertedOrder.cgst,
          sgst: convertedOrder.sgst,
          igst: convertedOrder.igst,
          round_off: convertedOrder.roundOff,
          grand_total: convertedOrder.grandTotal,
          total_estimated_cost: convertedOrder.totalEstimatedCost,
          total_actual_cost: convertedOrder.totalActualCost,
          total_internal_est_outsource_cost: convertedOrder.totalInternalEstOutsourceCost,
          gross_profit: convertedOrder.grossProfit,
          profit_margin_pct: convertedOrder.profitMarginPct,
          advance_amount: convertedOrder.advanceAmount,
          balance_amount: convertedOrder.balanceAmount,
          payment_method: convertedOrder.paymentMethod,
          payment_status: convertedOrder.paymentStatus,
          production_status: initialProdStatus,
          delivery_mode: convertedOrder.deliveryMode || 'Local Express Delivery',
          delivered_by: convertedOrder.deliveredBy || '',
          signature_url: convertedOrder.signatureUrl || '',
          order_type: 'Direct',
          converted_from_quotation: true,
          quotation_id: quote.id,
          created_at: convertedOrder.createdAt
        };

        await supabase.from('sales_orders').insert(dbOrder);

        const dbItems = (convertedOrder.items || []).map((i, idx) => ({
          id: `ITEM-${newOrderId.split('-').pop()}-${idx + 1}`,
          order_id: newOrderId,
          product_name: i.productName,
          category: i.category || 'Custom Print',
          description: i.description || '',
          width: i.width || 0,
          height: i.height || 0,
          unit: i.unit || 'Sq.Ft',
          qty: i.qty || 1,
          total_sq_ft: i.totalSqFt || 0,
          material: i.material || 'Standard Substrate',
          designer_required: i.designerRequired || 'NO',
          designer_id: i.designerId || null,
          designer_name: i.designerName || '',
          artwork_status: i.artworkStatus || 'Pending',
          artwork_url: i.artworkUrl || '',
          outsource: !!i.outsource,
          vendor_id: i.vendorId || null,
          vendor_name: i.vendorName || '',
          estimated_vendor_cost: i.estimatedVendorCost || 0,
          actual_vendor_bill: i.actualVendorBill || 0,
          vendor_bill_date: i.vendorBillDate || null,
          vendor_payment_status: i.vendorPaymentStatus || 'Pending',
          estimated_cost: i.estimatedCost || 0,
          actual_cost: i.actualCost || 0,
          selling_rate: i.sellingRate || 0,
          discount: i.discount || 0,
          tax_type: i.taxType || 'ETR',
          gst_rate: i.gstRate || 18,
          amount: i.amount || 0,
          production_status: initialProdStatus,
          job_card_id: `JC-${newOrderId.split('-').pop()}-${idx + 1}`,
          internal_est_outsource_cost: i.internalEstOutsourceCost || 0
        }));

        await supabase.from('sales_order_items').insert(dbItems);
      } catch (err) {
        console.warn("Supabase quotation conversion insert exception:", err);
      }
    }

    setSalesOrders((prev) => [convertedOrder, ...prev]);

    // Update Customer Outstanding & Total Orders History
    if (convertedOrder.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === convertedOrder.customerId) {
            const newTotalOrders = (Number(c.totalOrders ?? c.total_orders) || 0) + 1;
            const newOutstanding = (Number(c.outstanding ?? c.outstandingAmount) || 0) + (convertedOrder.balanceAmount || 0);
            return {
              ...c,
              totalOrders: newTotalOrders,
              total_orders: newTotalOrders,
              outstanding: newOutstanding,
              outstandingAmount: newOutstanding
            };
          }
          return c;
        })
      );
    }

    // Log Activity
    logOrderActivity({
      orderId: newOrderId,
      orderNumber: newOrderId,
      customerName: convertedOrder.customerName,
      customerMobile: convertedOrder.customerMobile,
      actionType: 'CONVERTED',
      actionTitle: `Quotation ${quote.id} Converted to Direct Sales Order ${newOrderId}`,
      actor: activeUser?.name || 'Authorized Staff',
      role: activeRole || 'Sales',
      reason: `Quotation converted by user`,
      newAmount: convertedOrder.grandTotal,
      changesSummary: [
        `Converted Quotation ${quote.id} to active Sales Order ${newOrderId}`,
        `Grand Total: ₹${Number(convertedOrder.grandTotal || 0).toLocaleString()}`,
        `Job Card generated in Production Queue`
      ],
      snapshot: convertedOrder
    });

    return convertedOrder;
  };

  // Edit / Revise Sales Order
  const updateSalesOrder = async (orderId, updatedOrderPayload, editReason = '') => {
    let oldBalance = 0;
    let customerId = updatedOrderPayload.customerId;
    const existing = salesOrders.find((o) => o.id === orderId);

    if (existing) {
      oldBalance = existing.balanceAmount || 0;
      customerId = existing.customerId || updatedOrderPayload.customerId;
    }

    const { processedOrder, balance } = processOrderData(updatedOrderPayload, orderId);

    const changeLogs = [];
    if (existing) {
      if (existing.customerName !== processedOrder.customerName) {
        changeLogs.push(`Customer updated: '${existing.customerName}' → '${processedOrder.customerName}'`);
      }
      if (existing.deliveryDate !== processedOrder.deliveryDate) {
        changeLogs.push(`Delivery date: ${existing.deliveryDate} → ${processedOrder.deliveryDate}`);
      }
      if (existing.salesPersonName !== processedOrder.salesPersonName) {
        changeLogs.push(`Sales person: ${existing.salesPersonName || 'None'} → ${processedOrder.salesPersonName || 'None'}`);
      }
      if (existing.subtotal !== processedOrder.subtotal) {
        changeLogs.push(`Subtotal: ₹${Number(existing.subtotal || 0).toLocaleString()} → ₹${Number(processedOrder.subtotal || 0).toLocaleString()}`);
      }
      if (existing.grandTotal !== processedOrder.grandTotal) {
        const diff = (processedOrder.grandTotal || 0) - (existing.grandTotal || 0);
        changeLogs.push(`Grand Total: ₹${Number(existing.grandTotal || 0).toLocaleString()} → ₹${Number(processedOrder.grandTotal || 0).toLocaleString()} (${diff >= 0 ? '+' : ''}₹${diff.toLocaleString()})`);
      }
      if (existing.advanceAmount !== processedOrder.advanceAmount) {
        changeLogs.push(`Advance: ₹${Number(existing.advanceAmount || 0).toLocaleString()} → ₹${Number(processedOrder.advanceAmount || 0).toLocaleString()}`);
      }
      if (existing.items?.length !== processedOrder.items?.length) {
        changeLogs.push(`Line items count: ${existing.items?.length || 0} → ${processedOrder.items?.length || 0}`);
      }
      if (editReason) {
        changeLogs.push(`Reason: ${editReason}`);
      }
      if (changeLogs.length === 0) {
        changeLogs.push(`Order line items and technical specifications revised`);
      }
    }

    const auditEntry = {
      id: `AUDIT-${Date.now()}`,
      editedBy: activeUser?.name || 'Authorized Staff',
      role: activeRole || 'Admin',
      editedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      summary: changeLogs.join(' | ')
    };

    const updatedHistory = [auditEntry, ...(existing?.editHistory || [])];
    const finalUpdatedOrder = {
      ...existing,
      ...processedOrder,
      id: orderId,
      editHistory: updatedHistory,
      lastEditedBy: activeUser?.name || 'Authorized Staff',
      lastEditedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    };

    if (isSupabaseConfigured) {
      try {
        const dbOrder = {
          order_date: processedOrder.orderDate,
          delivery_date: processedOrder.deliveryDate,
          customer_id: processedOrder.customerId,
          customer_name: processedOrder.customerName,
          customer_mobile: processedOrder.customerMobile,
          customer_state: processedOrder.customerState,
          sales_person_id: processedOrder.salesPersonId,
          sales_person_name: processedOrder.salesPersonName,
          care_of_id: processedOrder.careOfId,
          care_of_name: processedOrder.careOfName,
          subtotal: processedOrder.subtotal,
          cgst: processedOrder.cgst,
          sgst: processedOrder.sgst,
          igst: processedOrder.igst,
          grand_total: processedOrder.grandTotal,
          total_estimated_cost: processedOrder.totalEstimatedCost,
          total_actual_cost: processedOrder.totalActualCost,
          gross_profit: processedOrder.grossProfit,
          profit_margin_pct: processedOrder.profitMarginPct,
          advance_amount: processedOrder.advanceAmount,
          balance_amount: processedOrder.balanceAmount,
          payment_status: processedOrder.paymentStatus,
          edit_history: updatedHistory
        };

        await supabase.from('sales_orders').update(dbOrder).eq('id', orderId);
      } catch (err) {
        console.warn("Supabase order update exception:", err);
      }
    }

    setSalesOrders((prev) => prev.map((o) => (o.id === orderId ? finalUpdatedOrder : o)));

    const balanceDiff = balance - oldBalance;
    if (balanceDiff !== 0 && customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === customerId) {
            const newOutstanding = Math.max(0, (Number(c.outstanding ?? c.outstandingAmount) || 0) + balanceDiff);
            return { ...c, outstanding: newOutstanding, outstandingAmount: newOutstanding };
          }
          return c;
        })
      );
    }

    // Log to central audit trail
    logOrderActivity({
      orderId: orderId,
      orderNumber: orderId,
      customerName: finalUpdatedOrder.customerName,
      customerMobile: finalUpdatedOrder.customerMobile,
      actionType: 'EDITED',
      actionTitle: `Sales Order ${orderId} Modified`,
      actor: activeUser?.name || 'Authorized Staff',
      role: activeRole || 'Admin',
      reason: editReason || 'Order parameters modified',
      previousAmount: existing?.grandTotal,
      newAmount: finalUpdatedOrder.grandTotal,
      diffAmount: (finalUpdatedOrder.grandTotal || 0) - (existing?.grandTotal || 0),
      changesSummary: changeLogs,
      previousSnapshot: existing,
      newSnapshot: finalUpdatedOrder
    });

    return finalUpdatedOrder;
  };

  // Cancel Sales Order
  const cancelSalesOrder = async (orderId, cancelReason = 'Customer requested cancellation') => {
    const existing = salesOrders.find(o => o.id === orderId);
    if (!existing) throw new Error(`Order ${orderId} not found`);

    const customerId = existing.customerId;
    const unpaidBalance = Number(existing.balanceAmount) || 0;

    const auditEntry = {
      id: `AUDIT-${Date.now()}`,
      editedBy: activeUser?.name || 'Authorized Staff',
      role: activeRole || 'Admin',
      editedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      summary: `Order CANCELLED. Reason: ${cancelReason}`
    };

    const updatedHistory = [auditEntry, ...(existing?.editHistory || [])];

    const cancelledOrder = {
      ...existing,
      productionStatus: 'Cancelled',
      isCancelled: true,
      cancelledAt: new Date().toISOString(),
      cancelledBy: activeUser?.name || 'Authorized Staff',
      cancelReason: cancelReason,
      editHistory: updatedHistory
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('sales_orders')
          .update({
            production_status: 'Cancelled',
            edit_history: updatedHistory
          })
          .eq('id', orderId);
      } catch (err) {
        console.warn("Supabase cancel order warning:", err);
      }
    }

    setSalesOrders((prev) => prev.map(o => (o.id === orderId ? cancelledOrder : o)));

    // Reversal of customer outstanding balance for the cancelled order
    if (unpaidBalance > 0 && customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === customerId) {
            const currentOutstanding = Number(c.outstanding ?? c.outstandingAmount ?? 0);
            const newOutstanding = Math.max(0, currentOutstanding - unpaidBalance);
            return { ...c, outstanding: newOutstanding, outstandingAmount: newOutstanding };
          }
          return c;
        })
      );
    }

    // Log to central audit trail
    logOrderActivity({
      orderId: existing.id,
      orderNumber: existing.id,
      customerName: existing.customerName,
      customerMobile: existing.customerMobile,
      actionType: 'CANCELLED',
      actionTitle: `Sales Order ${existing.id} Cancelled`,
      actor: activeUser?.name || 'Authorized Staff',
      role: activeRole || 'Admin',
      reason: cancelReason,
      previousAmount: existing.grandTotal,
      refundOrReversal: unpaidBalance,
      changesSummary: [
        `Production status set to 'Cancelled'`,
        `Customer outstanding reduced by -₹${unpaidBalance.toLocaleString()}`,
        `Advance received: ₹${Number(existing.advanceAmount || 0).toLocaleString()} recorded in company accounts`,
        `Cancellation Reason: ${cancelReason}`
      ],
      snapshot: existing
    });

    return cancelledOrder;
  };

  // Delete Sales Order Permanently
  const deleteSalesOrder = async (orderId, deleteReason = 'Record purged by Administrator') => {
    const existing = salesOrders.find(o => o.id === orderId);
    if (!existing) throw new Error(`Order ${orderId} not found`);

    const customerId = existing.customerId;
    const unpaidBalance = Number(existing.balanceAmount) || 0;

    // Log full snapshot in central audit log before removal
    logOrderActivity({
      orderId: existing.id,
      orderNumber: existing.id,
      customerName: existing.customerName,
      customerMobile: existing.customerMobile,
      actionType: 'DELETED',
      actionTitle: `Sales Order ${existing.id} Deleted from ERP`,
      actor: activeUser?.name || 'Authorized Staff',
      role: activeRole || 'Admin',
      reason: deleteReason,
      previousAmount: existing.grandTotal,
      changesSummary: [
        `Permanently deleted order record (${existing.items?.length || 0} line items)`,
        `Order Grand Total was ₹${Number(existing.grandTotal || 0).toLocaleString()}`,
        `Customer ledger adjusted: -₹${unpaidBalance.toLocaleString()}`,
        `Reason: ${deleteReason}`
      ],
      snapshot: existing
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('sales_order_items').delete().eq('sales_order_id', orderId);
        await supabase.from('sales_orders').delete().eq('id', orderId);
      } catch (err) {
        console.warn("Supabase delete order warning:", err);
      }
    }

    setSalesOrders((prev) => prev.filter(o => o.id !== orderId));

    // Reversal of customer outstanding balance
    if (unpaidBalance > 0 && customerId && existing.productionStatus !== 'Cancelled') {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === customerId) {
            const currentOutstanding = Number(c.outstanding ?? c.outstandingAmount ?? 0);
            const newOutstanding = Math.max(0, currentOutstanding - unpaidBalance);
            return { ...c, outstanding: newOutstanding, outstandingAmount: newOutstanding };
          }
          return c;
        })
      );
    }

    return true;
  };

  // Update Outsource Vendor Bill
  const updateVendorBill = async (orderId, itemId, actualVendorBill, billDate, paymentStatus) => {
    const order = salesOrders.find(o => o.id === orderId);
    if (!order) return;

    let newTotalActCost = 0;
    let targetVendorId = null;

    const updatedItems = order.items.map((item) => {
      if (item.id === itemId || item.jobCardId === itemId) {
        const billAmt = parseFloat(actualVendorBill) || 0;
        newTotalActCost += billAmt;
        targetVendorId = item.vendorId;
        return {
          ...item,
          actualVendorBill: billAmt,
          actualCost: billAmt,
          vendorBillDate: billDate,
          vendorPaymentStatus: paymentStatus
        };
      }
      newTotalActCost += item.actualCost || item.estimatedCost || 0;
      return item;
    });

    const grossProfit = order.subtotal - newTotalActCost;
    const profitMarginPct = order.subtotal > 0 ? parseFloat(((grossProfit / order.subtotal) * 100).toFixed(1)) : 0;

    if (isSupabaseConfigured) {
      try {
        const billAmt = parseFloat(actualVendorBill) || 0;
        await supabase
          .from('sales_order_items')
          .update({
            actual_vendor_bill: billAmt,
            actual_cost: billAmt,
            vendor_bill_date: billDate,
            vendor_payment_status: paymentStatus
          })
          .eq('id', itemId);

        await supabase
          .from('sales_orders')
          .update({
            total_actual_cost: newTotalActCost,
            gross_profit: grossProfit,
            profit_margin_pct: profitMarginPct
          })
          .eq('id', orderId);
      } catch (err) {
        console.warn("Supabase updateVendorBill exception:", err);
      }
    }

    setSalesOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              items: updatedItems,
              totalActualCost: newTotalActCost,
              grossProfit,
              profitMarginPct
            }
          : o
      )
    );

    if (targetVendorId) {
      setVendors((prev) =>
        prev.map((v) =>
          v.id === targetVendorId
            ? { ...v, pendingPayment: (v.pendingPayment || 0) + (parseFloat(actualVendorBill) || 0) }
            : v
        )
      );
    }
  };

  // 0.5% Job Worker Profit Incentive Record function
  const recordWorkerIncentive = async ({
    orderId,
    itemId,
    jobCardId,
    productName = '',
    workerId,
    workerName,
    roleStage,
    jobAmount,
    jobProfit,
    incentivePct = 0.5
  }) => {
    if (!workerName || !roleStage) return null;

    const exists = (workerJobIncentives || []).some(
      (inc) => inc.orderId === orderId && inc.itemId === itemId && inc.roleStage === roleStage && inc.workerName === workerName
    );
    if (exists) return null;

    const calcProfit = jobProfit !== undefined ? jobProfit : Math.max(0, (jobAmount || 0) * 0.35);
    const incentiveAmt = Math.round((calcProfit * (incentivePct / 100)) * 100) / 100;

    const newRecord = {
      id: `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderId: orderId || '',
      itemId: itemId || '',
      jobCardId: jobCardId || '',
      productName: productName || '',
      workerId: workerId || '',
      workerName: workerName,
      roleStage: roleStage, // 'Design' | 'Printing' | 'Finishing' | 'Delivery'
      jobAmount: Number(jobAmount || 0),
      jobProfit: Number(calcProfit),
      incentivePct: Number(incentivePct),
      incentiveAmount: Number(incentiveAmt),
      completedAt: new Date().toISOString()
    };

    setWorkerJobIncentives((prev) => [newRecord, ...prev]);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('worker_job_incentives').insert({
          id: newRecord.id,
          order_id: newRecord.orderId,
          item_id: newRecord.itemId,
          job_card_id: newRecord.jobCardId,
          worker_id: newRecord.workerId,
          worker_name: newRecord.workerName,
          role_stage: newRecord.roleStage,
          job_amount: newRecord.jobAmount,
          job_profit: newRecord.jobProfit,
          incentive_pct: newRecord.incentivePct,
          incentive_amount: newRecord.incentiveAmount,
          completed_at: newRecord.completedAt
        });
      } catch (err) {
        console.warn("Supabase recordWorkerIncentive exception:", err);
      }
    }
    return newRecord;
  };

  // Assign Printer / Finisher workers to Line Item
  const assignItemWorkers = async (orderId, itemId, workerAssignments = {}) => {
    const { printerId, printerName, finisherId, finisherName } = workerAssignments;

    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updatedItems = (o.items || []).map((it) => {
          if (it.id === itemId || it.jobCardId === itemId) {
            return {
              ...it,
              printerId: printerId !== undefined ? printerId : it.printerId,
              printerName: printerName !== undefined ? printerName : it.printerName,
              finisherId: finisherId !== undefined ? finisherId : it.finisherId,
              finisherName: finisherName !== undefined ? finisherName : it.finisherName
            };
          }
          return it;
        });
        return { ...o, items: updatedItems };
      })
    );

    if (isSupabaseConfigured) {
      try {
        const updateObj = {};
        if (printerId !== undefined) updateObj.printer_id = printerId;
        if (printerName !== undefined) updateObj.printer_name = printerName;
        if (finisherId !== undefined) updateObj.finisher_id = finisherId;
        if (finisherName !== undefined) updateObj.finisher_name = finisherName;
        await supabase.from('sales_order_items').update(updateObj).eq('id', itemId);
      } catch (err) {
        console.warn("Supabase assignItemWorkers exception:", err);
      }
    }
  };

  // Save Delivery Signature & Award Delivery Worker 0.5% Incentive
  const saveDeliverySignature = async (orderId, signatureUrl, deliveredBy) => {
    const order = (salesOrders || []).find((o) => o.id === orderId);

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('sales_orders')
          .update({
            signature_url: signatureUrl,
            delivered_by: deliveredBy,
            production_status: PRODUCTION_STATUS.DELIVERED
          })
          .eq('id', orderId);
        await supabase
          .from('sales_order_items')
          .update({ production_status: PRODUCTION_STATUS.DELIVERED })
          .eq('order_id', orderId);
      } catch (err) {
        console.warn("Supabase saveDeliverySignature exception:", err);
      }
    }

    if (order && deliveredBy) {
      const orderProfit = Number(order.grossProfit || (order.grandTotal ? (order.grandTotal - (order.totalActualCost || order.totalEstimatedCost || 0)) : 0)) || Math.round(Number(order.subtotal || 0) * 0.35);
      const deliveryWorkerObj = (workers || []).find(w => w.name === deliveredBy) || (employees || []).find(e => e.name === deliveredBy);
      recordWorkerIncentive({
        orderId: order.id,
        itemId: '',
        jobCardId: `DEL-${order.id}`,
        productName: `Delivery of Order #${order.id}`,
        workerId: deliveryWorkerObj?.id || 'WRK-04',
        workerName: deliveredBy,
        roleStage: 'Delivery',
        jobAmount: Number(order.subtotal || order.grandTotal || 0),
        jobProfit: orderProfit,
        incentivePct: 0.5
      });
    }

    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updatedItems = (o.items || []).map((it) => ({ ...it, productionStatus: PRODUCTION_STATUS.DELIVERED }));
        return {
          ...o,
          signatureUrl: signatureUrl,
          deliveredBy: deliveredBy,
          productionStatus: PRODUCTION_STATUS.DELIVERED,
          items: updatedItems
        };
      })
    );
  };

  // Update Line Item Production Status & Award Printer / Finisher 0.5% Incentive
  const updateItemProductionStatus = async (orderId, itemId, newStatus) => {
    const order = salesOrders.find(o => o.id === orderId);
    if (!order) return;

    const targetItem = (order.items || []).find(it => it.id === itemId || it.jobCardId === itemId);

    const updatedItems = order.items.map((it) =>
      it.id === itemId || it.jobCardId === itemId ? { ...it, productionStatus: newStatus } : it
    );

    const statuses = updatedItems.map((i) => i.productionStatus || PRODUCTION_STATUS.NEW);
    let overallStatus = PRODUCTION_STATUS.NEW;
    if (statuses.every((s) => s === PRODUCTION_STATUS.DELIVERED)) {
      overallStatus = PRODUCTION_STATUS.DELIVERED;
    } else if (statuses.every((s) => s === PRODUCTION_STATUS.READY || s === PRODUCTION_STATUS.DELIVERED)) {
      overallStatus = PRODUCTION_STATUS.READY;
    } else if (statuses.some((s) => [PRODUCTION_STATUS.PRINTING, PRODUCTION_STATUS.OUTSOURCE, PRODUCTION_STATUS.FINISHING, PRODUCTION_STATUS.QUALITY_CHECK, PRODUCTION_STATUS.DESIGN].includes(s))) {
      overallStatus = PRODUCTION_STATUS.PRINTING;
    }

    // Auto-award 0.5% profit incentive on stage transition
    if (targetItem) {
      const { itemProfit } = calculateJobProfitAndIncentive(targetItem, order);

      // Printer 0.5% Incentive when finishing Printing stage
      if (['Finishing', 'Quality Check', 'Ready for Delivery', 'Ready', 'Delivered'].includes(newStatus)) {
        const printerName = targetItem.printerName || 'Vikas Patil';
        const printerObj = (workers || []).find(w => w.name === printerName) || (employees || []).find(e => e.name === printerName);
        recordWorkerIncentive({
          orderId,
          itemId: targetItem.id,
          jobCardId: targetItem.jobCardId || `JC-${orderId}-${itemId}`,
          productName: targetItem.productName,
          workerId: printerObj?.id || 'WRK-01',
          workerName: printerName,
          roleStage: 'Printing',
          jobAmount: targetItem.amount,
          jobProfit: itemProfit,
          incentivePct: 0.5
        });
      }

      // Finisher 0.5% Incentive when finishing Finishing stage
      if (['Quality Check', 'Ready for Delivery', 'Ready', 'Delivered'].includes(newStatus)) {
        const finisherName = targetItem.finisherName || 'Prakash Shinde';
        const finisherObj = (workers || []).find(w => w.name === finisherName) || (employees || []).find(e => e.name === finisherName);
        recordWorkerIncentive({
          orderId,
          itemId: targetItem.id,
          jobCardId: targetItem.jobCardId || `JC-${orderId}-${itemId}`,
          productName: targetItem.productName,
          workerId: finisherObj?.id || 'WRK-03',
          workerName: finisherName,
          roleStage: 'Finishing',
          jobAmount: targetItem.amount,
          jobProfit: itemProfit,
          incentivePct: 0.5
        });
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('sales_order_items').update({ production_status: newStatus }).eq('id', itemId);
        await supabase.from('sales_orders').update({ production_status: overallStatus }).eq('id', orderId);
      } catch (err) {
        console.warn("Supabase updateItemProductionStatus exception:", err);
      }
    }

    setSalesOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, items: updatedItems, productionStatus: overallStatus }
          : o
      )
    );
  };

  // Update Overall Order Production Status
  const updateProductionStatus = async (orderId, newStatus) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('sales_orders').update({ production_status: newStatus }).eq('id', orderId);
        await supabase.from('sales_order_items').update({ production_status: newStatus }).eq('order_id', orderId);
      } catch (err) {
        console.warn("Supabase updateProductionStatus exception:", err);
      }
    }

    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updatedItems = (o.items || []).map((it) => ({ ...it, productionStatus: newStatus }));
        return { ...o, productionStatus: newStatus, items: updatedItems };
      })
    );
  };

  // Update Artwork Proof Status
  const updateArtworkStatus = async (orderId, itemId, status, artworkUrl = '') => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('sales_order_items').update({ artwork_status: status, artwork_url: artworkUrl }).eq('id', itemId);
      } catch (err) {
        console.warn("Supabase updateArtworkStatus exception:", err);
      }
    }

    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updatedItems = (o.items || []).map((it) => {
          if (it.id === itemId || it.jobCardId === itemId) {
            return { ...it, artworkStatus: status, artworkUrl: artworkUrl || it.artworkUrl };
          }
          return it;
        });
        return { ...o, items: updatedItems };
      })
    );
  };

  // Self-Assign / Take Design Job
  const takeDesignJob = async (orderId, itemId, designerId, designerName) => {
    const assignTime = new Date().toISOString();
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updatedItems = (o.items || []).map((it) => {
          if (it.id === itemId || it.jobCardId === itemId) {
            return {
              ...it,
              designerId: designerId,
              designerName: designerName,
              designStatus: 'Assigned',
              assignmentTime: assignTime,
              artworkStatus: it.artworkStatus === 'Approved' ? 'Approved' : 'In Design'
            };
          }
          return it;
        });
        return { ...o, items: updatedItems };
      })
    );

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('sales_order_items')
          .update({
            designer_id: designerId,
            designer_name: designerName,
            design_status: 'Assigned',
            assignment_time: assignTime,
            artwork_status: 'In Design'
          })
          .eq('id', itemId);
      } catch (err) {
        console.warn("Supabase takeDesignJob exception:", err);
      }
    }
    return true;
  };

  // Update Design Job Lifecycle Actions
  const updateDesignJobStatus = async (orderId, itemId, actionType, payload = {}) => {
    const order = (salesOrders || []).find((o) => o.id === orderId);
    if (!order) return;

    let targetItem = (order.items || []).find((it) => it.id === itemId || it.jobCardId === itemId);
    if (!targetItem) return;

    const updates = {};
    const nowIso = new Date().toISOString();

    if (actionType === 'START') {
      updates.designStatus = 'In Progress';
      updates.startTime = targetItem.startTime || nowIso;
      updates.artworkStatus = 'In Design';
      updates.productionStatus = PRODUCTION_STATUS.DESIGN;
    } else if (actionType === 'PAUSE') {
      updates.designStatus = 'Pending';
      if (payload.note) {
        updates.internalNotes = (targetItem.internalNotes ? targetItem.internalNotes + '\n' : '') + `[PAUSED ${new Date().toLocaleTimeString()}]: ${payload.note}`;
      }
    } else if (actionType === 'UPLOAD') {
      if (payload.artworkUrl) updates.artworkUrl = payload.artworkUrl;
      updates.artworkStatus = 'In Design';
    } else if (actionType === 'REQUEST_APPROVAL') {
      updates.designStatus = 'Waiting for Customer';
      updates.artworkStatus = 'Waiting Customer Approval';
      if (payload.artworkUrl) updates.artworkUrl = payload.artworkUrl;
    } else if (actionType === 'COMPLETE' || actionType === 'APPROVE') {
      updates.designStatus = 'Completed';
      updates.artworkStatus = 'Approved';
      updates.completedTime = nowIso;
      if (payload.artworkUrl) updates.artworkUrl = payload.artworkUrl;

      // Auto-record Designer 0.5% Profit Incentive
      const designerName = targetItem.designerName || activeUser?.name || 'Rahul Studio (In-house)';
      const designerObj = (designers || []).find(d => d.name === designerName) || (employees || []).find(e => e.name === designerName);
      const { itemProfit } = calculateJobProfitAndIncentive(targetItem, order);
      recordWorkerIncentive({
        orderId,
        itemId: targetItem.id,
        jobCardId: targetItem.jobCardId || `JC-${orderId}-${targetItem.id}`,
        productName: targetItem.productName,
        workerId: designerObj?.id || 'DES-01',
        workerName: designerName,
        roleStage: 'Design',
        jobAmount: targetItem.amount,
        jobProfit: itemProfit,
        incentivePct: 0.5
      });
    } else if (actionType === 'REVISION') {
      updates.designStatus = 'Revision Required';
      if (payload.note) {
        updates.internalNotes = (targetItem.internalNotes ? targetItem.internalNotes + '\n' : '') + `[REVISION NEEDED ${new Date().toLocaleTimeString()}]: ${payload.note}`;
      }
    } else if (actionType === 'NOTE') {
      if (payload.note) {
        updates.internalNotes = (targetItem.internalNotes ? targetItem.internalNotes + '\n' : '') + `[NOTE ${new Date().toLocaleTimeString()}]: ${payload.note}`;
      }
    }

    const shouldAdvanceToProduction = (actionType === 'COMPLETE' || actionType === 'APPROVE');

    const updatedItems = (order.items || []).map((it) => {
      if (it.id === itemId || it.jobCardId === itemId) {
        const newItem = { ...it, ...updates };
        if (shouldAdvanceToProduction) {
          newItem.productionStatus = PRODUCTION_STATUS.PRINTING;
        } else if (actionType === 'START') {
          newItem.productionStatus = PRODUCTION_STATUS.DESIGN;
        }
        return newItem;
      }
      return it;
    });

    let overallProdStatus = order.productionStatus;
    if (shouldAdvanceToProduction) {
      overallProdStatus = PRODUCTION_STATUS.PRINTING;
    } else if (actionType === 'START') {
      overallProdStatus = PRODUCTION_STATUS.DESIGN;
    }

    setSalesOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, items: updatedItems, productionStatus: overallProdStatus } : o))
    );

    if (isSupabaseConfigured) {
      try {
        const dbItemUpdate = {};
        if (updates.designStatus) dbItemUpdate.design_status = updates.designStatus;
        if (updates.artworkStatus) dbItemUpdate.artwork_status = updates.artworkStatus;
        if (updates.artworkUrl) dbItemUpdate.artwork_url = updates.artworkUrl;
        if (updates.startTime) dbItemUpdate.start_time = updates.startTime;
        if (updates.completedTime) dbItemUpdate.completed_time = updates.completedTime;
        if (updates.internalNotes) dbItemUpdate.internal_notes = updates.internalNotes;
        if (shouldAdvanceToProduction) dbItemUpdate.production_status = PRODUCTION_STATUS.NEW;

        await supabase.from('sales_order_items').update(dbItemUpdate).eq('id', itemId);
        if (shouldAdvanceToProduction) {
          await supabase.from('sales_orders').update({ production_status: overallProdStatus }).eq('id', orderId);
        }
      } catch (err) {
        console.warn("Supabase updateDesignJobStatus exception:", err);
      }
    }

    return true;
  };

  // Record Customer Payment Received
  const recordPayment = async (orderId, amount, method, refNo, bankAccountId = '', bankAccountName = '') => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    const order = salesOrders.find(o => o.id === orderId);
    if (!order) return;

    const newAdvance = (order.advanceAmount || 0) + amt;
    const newBalance = Math.max(0, order.grandTotal - newAdvance);
    let newPayStatus = 'Pending';
    if (newBalance === 0) newPayStatus = 'Paid';
    else if (newAdvance > 0) newPayStatus = 'Partial';

    const payId = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
    const payVoucher = {
      id: payId,
      date: new Date().toISOString().split('T')[0],
      orderId: orderId,
      order_id: orderId,
      customerName: order.customerName || 'Customer',
      customer_name: order.customerName || 'Customer',
      amount: amt,
      method: method || 'UPI',
      refNo: refNo || `REC-${orderId}`,
      ref_no: refNo || `REC-${orderId}`,
      status: 'Verified',
      bankAccountId: bankAccountId || '',
      bankAccountName: bankAccountName || 'Main Cash Account',
      recordedBy: activeUser?.name || 'Authorized Staff'
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('sales_orders').update({
          advance_amount: newAdvance,
          balance_amount: newBalance,
          payment_status: newPayStatus
        }).eq('id', orderId);

        if (order.customerId) {
          const customer = customers.find(c => c.id === order.customerId);
          const newOutstanding = Math.max(0, (Number(customer?.outstanding ?? customer?.outstandingAmount) || 0) - amt);
          await supabase.from('customers').update({ outstanding: newOutstanding }).eq('id', order.customerId);
        }

        await supabase.from('payments').insert({
          id: payVoucher.id,
          date: payVoucher.date,
          order_id: payVoucher.order_id,
          customer_name: payVoucher.customer_name,
          amount: payVoucher.amount,
          method: payVoucher.method,
          ref_no: payVoucher.ref_no,
          status: payVoucher.status
        });
      } catch (err) {
        console.warn("Supabase recordPayment exception:", err);
      }
    }

    setSalesOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              advanceAmount: newAdvance,
              balanceAmount: newBalance,
              paymentStatus: newPayStatus
            }
          : o
      )
    );

    if (order.customerId) {
      setCustomers((prev) =>
        prev.map((c) => {
          if (c.id === order.customerId) {
            const newOutstanding = Math.max(0, (Number(c.outstanding ?? c.outstandingAmount) || 0) - amt);
            return { ...c, outstanding: newOutstanding, outstandingAmount: newOutstanding };
          }
          return c;
        })
      );
    }

    setPayments((prev) => [payVoucher, ...prev]);
    return payVoucher;
  };

  // Track WhatsApp Sent
  const trackWhatsAppSent = async (orderId) => {
    if (isSupabaseConfigured) {
      try {
        await supabase.from('sales_orders').update({ whatsapp_sent: true }).eq('id', orderId);
      } catch (err) {
        console.warn('trackWhatsAppSent error:', err);
      }
    }
    setSalesOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, whatsappSent: true } : o))
    );
  };


  // Reset demo data: clear all database tables and insert initial mock records
  const resetDemoData = async () => {
    try {
      setLoading(true);
      
      // Clear localStorage persistence cache
      localStorage.removeItem('stitch_erp_sales_orders');
      localStorage.removeItem('stitch_erp_worker_job_incentives');
      localStorage.removeItem('stitch_erp_customers');
      localStorage.removeItem('stitch_erp_products');
      localStorage.removeItem('stitch_erp_employees');
      localStorage.removeItem('stitch_erp_workers');
      localStorage.removeItem('stitch_erp_designers');
      localStorage.removeItem('stitch_erp_payments');

      // Delete all records in dependent tables first
      await supabase.from('payroll').delete().neq('id', 'dummy');
      await supabase.from('attendance').delete().neq('id', 'dummy');
      await supabase.from('follow_ups').delete().neq('id', 'dummy');
      await supabase.from('payments').delete().neq('id', 'dummy');
      await supabase.from('supplier_bills').delete().neq('id', 'dummy');
      await supabase.from('supplier_payments').delete().neq('id', 'dummy');
      await supabase.from('purchase_orders').delete().neq('id', 'dummy');
      await supabase.from('inventory').delete().neq('id', 'dummy');
      await supabase.from('sales_order_items').delete().neq('id', 'dummy');
      await supabase.from('sales_orders').delete().neq('id', 'dummy');
      await supabase.from('products').delete().neq('id', 'dummy');
      await supabase.from('vendors').delete().neq('id', 'dummy');
      await supabase.from('designers').delete().neq('id', 'dummy');
      await supabase.from('workers').delete().neq('id', 'dummy');
      await supabase.from('care_of_persons').delete().neq('id', 'dummy');
      await supabase.from('sales_persons').delete().neq('id', 'dummy');
      await supabase.from('customers').delete().neq('id', 'dummy');
      await supabase.from('bank_accounts').delete().neq('id', 'dummy');
      await supabase.from('company_profile').delete().neq('id', 0);

      // Re-populate with demo data
      // 1. Company Profile
      await supabase.from('company_profile').insert({
        id: 1,
        name: initialCompanyProfile.name,
        tagline: initialCompanyProfile.tagline,
        gstin: initialCompanyProfile.gstin,
        state: initialCompanyProfile.state,
        state_code: initialCompanyProfile.stateCode,
        phone: initialCompanyProfile.phone,
        email: initialCompanyProfile.email,
        website: initialCompanyProfile.website,
        address: initialCompanyProfile.address,
        bank_name: initialCompanyProfile.bankDetails.bankName,
        account_name: initialCompanyProfile.bankDetails.accountName,
        account_no: initialCompanyProfile.bankDetails.accountNo,
        ifsc: initialCompanyProfile.bankDetails.ifsc,
        branch: initialCompanyProfile.bankDetails.branch,
        upi_id: initialCompanyProfile.bankDetails.upiId,
        terms: initialCompanyProfile.terms
      });

      // 2. Bank Accounts
      await supabase.from('bank_accounts').insert(initialCompanyBankAccounts.map(b => ({
        id: b.id,
        bank_name: b.bankName,
        account_no: b.accountNo,
        ifsc: b.ifsc,
        branch: b.branch,
        upi_id: b.upiId
      })));

      // 3. Customers
      await supabase.from('customers').insert(initialCustomers.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        mobile: c.mobile,
        email: c.email,
        gstin: c.gstin,
        type: c.type,
        address: c.address,
        state: c.state,
        credit_limit: c.creditLimit,
        outstanding: c.outstanding,
        total_orders: c.totalOrders,
        created_at: c.createdAt
      })));

      // 4. Sales Persons
      await supabase.from('sales_persons').insert(initialSalesPersons.map(s => ({
        id: s.id,
        name: s.name,
        mobile: s.mobile,
        target: s.target,
        achieved: s.achieved,
        commission_rate: s.commissionRate
      })));

      // 5. Care Of Persons
      await supabase.from('care_of_persons').insert(initialCareOfPersons.map(c => ({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        email: c.email,
        role: c.role,
        referral_commission_pct: c.referralCommissionPct,
        total_referred_sales: c.totalReferredSales,
        active_orders: c.activeOrders,
        notes: c.notes
      })));

      // 6. Workers
      await supabase.from('workers').insert(initialWorkers.map(w => ({
        id: w.id,
        name: w.name,
        role: w.role,
        mobile: w.mobile,
        incentive_per_sq_ft: w.incentivePerSqFt,
        incentive_per_job: w.incentivePerJob,
        jobs_completed_this_month: w.jobsCompletedThisMonth,
        sq_ft_handled_this_month: w.sqFtHandledThisMonth
      })));

      // 7. Designers
      await supabase.from('designers').insert(initialDesigners.map(d => ({
        id: d.id,
        name: d.name,
        mobile: d.mobile,
        active_jobs: d.activeJobs,
        pending_approvals: d.pendingApprovals,
        completed_month: d.completedMonth
      })));

      // 8. Vendors
      await supabase.from('vendors').insert(initialVendors.map(v => ({
        id: v.id,
        name: v.name,
        category: v.category,
        mobile: v.mobile,
        gstin: v.gstin,
        pending_payment: v.pendingPayment,
        avg_turnaround_days: v.avgTurnaroundDays
      })));

      // 9. Products
      await supabase.from('products').insert(initialProducts.map(p => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        default_rate: p.defaultRate,
        estimated_cost: p.estimatedCost,
        gst_rate: p.gstRate,
        hsn_code: p.hsnCode,
        category: p.category,
        default_vendor: p.defaultVendor,
        default_material: p.defaultMaterial,
        is_custom: p.isCustom || false
      })));

      // 10. Orders and Items
      for (const o of initialSalesOrders) {
        await supabase.from('sales_orders').insert({
          id: o.id,
          order_date: o.orderDate,
          delivery_date: o.deliveryDate,
          customer_id: o.customerId,
          customer_name: o.customerName,
          customer_mobile: o.customerMobile,
          customer_state: o.customerState,
          sales_person_id: o.salesPersonId,
          sales_person_name: o.salesPersonName,
          care_of_id: o.careOfId,
          care_of_name: o.careOfName,
          branch: o.branch,
          order_source: o.orderSource,
          reference_no: o.referenceNo,
          remarks: o.remarks,
          subtotal: o.subtotal,
          cgst: o.cgst,
          sgst: o.sgst,
          igst: o.igst,
          round_off: o.roundOff,
          grand_total: o.grandTotal,
          total_estimated_cost: o.totalEstimatedCost,
          total_actual_cost: o.totalActualCost,
          gross_profit: o.grossProfit,
          profit_margin_pct: o.profitMarginPct,
          advance_amount: o.advanceAmount,
          balance_amount: o.balanceAmount,
          payment_method: o.paymentMethod,
          payment_status: o.paymentStatus,
          production_status: o.productionStatus,
          delivery_mode: o.deliveryMode,
          delivered_by: o.deliveredBy,
          signature_url: o.signatureUrl,
          created_at: o.createdAt
        });

        await supabase.from('sales_order_items').insert(o.items.map(i => ({
          id: i.id,
          order_id: o.id,
          product_name: i.productName,
          category: i.category,
          description: i.description,
          width: i.width,
          height: i.height,
          unit: i.unit,
          qty: i.qty,
          total_sq_ft: i.totalSqFt,
          material: i.material,
          designer_required: i.designerRequired,
          designer_id: i.designerId || null,
          designer_name: i.designerName,
          artwork_status: i.artworkStatus,
          artwork_url: i.artworkUrl,
          outsource: i.outsource,
          vendor_id: i.vendorId || null,
          vendor_name: i.vendorName,
          estimated_vendor_cost: i.estimatedVendorCost,
          actual_vendor_bill: i.actualVendorBill,
          vendor_bill_date: i.vendorBillDate,
          vendor_payment_status: i.vendorPaymentStatus,
          estimated_cost: i.estimatedCost,
          actual_cost: i.actualCost,
          selling_rate: i.sellingRate,
          discount: i.discount,
          tax_type: i.taxType,
          gst_rate: i.gstRate,
          amount: i.amount,
          production_status: i.productionStatus || o.productionStatus,
          job_card_id: i.jobCardId
        })));
      }

      // 11. Inventory
      await supabase.from('inventory').insert(initialInventory.map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        current_stock: i.currentStock,
        unit: i.unit,
        reorder_level: i.reorderLevel,
        unit_cost: i.unitCost
      })));

      // 12. Purchase Orders
      await supabase.from('purchase_orders').insert(initialPurchaseOrders.map(p => ({
        id: p.id,
        vendor_name: p.vendorName,
        order_date: p.orderDate,
        items: p.items,
        amount: p.amount,
        status: p.status
      })));

      // 13. Payments
      await supabase.from('payments').insert(initialPayments.map(p => ({
        id: p.id,
        date: p.date,
        order_id: p.orderId,
        customer_name: p.customerName,
        amount: p.amount,
        method: p.method,
        ref_no: p.refNo,
        status: p.status
      })));

      // 14. Follow ups
      await supabase.from('follow_ups').insert(initialFollowUps.map(f => ({
        id: f.id,
        type: f.type,
        order_id: f.orderId,
        customer_name: f.customerName,
        amount: f.amount,
        due_date: f.dueDate,
        care_of: f.careOf,
        status: f.status
      })));

      // 15. Attendance
      await supabase.from('attendance').insert(initialAttendance.map(a => ({
        id: a.id,
        date: a.date,
        staff_id: a.staffId,
        staff_name: a.staffName,
        type: a.type,
        status: a.status,
        ot_hours: a.otHours,
        notes: a.notes
      })));

      // 16. Payroll
      await supabase.from('payroll').insert(initialPayroll.map(p => ({
        id: p.id,
        month: p.month,
        staff_id: p.staffId,
        staff_name: p.staffName,
        role: p.role,
        base_salary: p.baseSalary,
        working_days: p.workingDays,
        days_present: p.daysPresent,
        earned_base_pay: p.earnedBasePay,
        ot_hours: p.otHours,
        ot_pay: p.otPay,
        incentive_earned: p.incentiveEarned,
        advance_deduction: p.advanceDeduction,
        late_deduction: p.lateDeduction,
        net_salary: p.netSalary,
        status: p.status,
        paid_date: p.paidDate,
        payment_mode: p.paymentMode
      })));

      // Reload dataset
      await fetchAllERPData();
    } catch (err) {
      console.error("Error resetting database demo data:", err);
    } finally {
      setLoading(false);
    }
  };



  // ZKTeco K90 Biometric Device Methods
  const importK90Users = async (deviceId = 'DEV-K90-01') => {
    try {
      const res = await api.importK90Users(deviceId);
      if (res && res.success) {
        await fetchAllERPData();
        return res;
      }
    } catch (err) {
      console.warn("api.importK90Users exception:", err);
      throw err;
    }
  };

  const mapBiometricUser = async (mappingId, employeeId) => {
    try {
      await api.mapBiometricUser(mappingId, employeeId);
      await fetchAllERPData();
    } catch (err) {
      console.warn("api.mapBiometricUser exception:", err);
      setBiometricUsers((prev) =>
        prev.map((u) => (u.id === mappingId ? { ...u, employeeId, mappingStatus: 'Matched', matchedBy: 'Manual HR Match' } : u))
      );
    }
  };

  const unlinkBiometricUser = async (mappingId) => {
    try {
      await api.unlinkBiometricUser(mappingId);
      await fetchAllERPData();
    } catch (err) {
      console.warn("api.unlinkBiometricUser exception:", err);
      setBiometricUsers((prev) =>
        prev.map((u) => (u.id === mappingId ? { ...u, employeeId: null, mappingStatus: 'Unmapped', matchedBy: null } : u))
      );
    }
  };

  const createAndMapEmployee = async (mappingId, employeeData) => {
    try {
      const res = await api.createAndMapEmployee(mappingId, employeeData);
      await fetchAllERPData();
      return res;
    } catch (err) {
      console.warn("api.createAndMapEmployee exception:", err);
      throw err;
    }
  };

  const assignBiometricId = async (employeeId, deviceId, biometricUserId, biometricName) => {
    try {
      const res = await api.assignBiometricId(employeeId, deviceId, biometricUserId, biometricName);
      await fetchAllERPData();
      return res;
    } catch (err) {
      console.warn("api.assignBiometricId exception:", err);
      throw err;
    }
  };

  return (
    <ERPContext.Provider
      value={{
        session,
        loading,
        companyProfile,
        setCompanyProfile,
        companyBankAccounts,
        setCompanyBankAccounts,
        activeRole,
        activeUser,
        switchRole,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        salesOrders,
        createSalesOrder,
        getNextOrderId,
        getNextQuotationId,
        updateQuotationStatus,
        convertQuotationToSalesOrder,
        updateSalesOrder,
        cancelSalesOrder,
        deleteSalesOrder,
        orderAuditLogs,
        logOrderActivity,
        clearAuditLogs,
        updateVendorBill,
        updateProductionStatus,
        updateItemProductionStatus,
        updateArtworkStatus,
        takeDesignJob,
        updateDesignJobStatus,
        recordPayment,
        trackWhatsAppSent,
        saveDeliverySignature,
        products,
        setProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        productMaterialSpecs,
        setProductMaterialSpecs,
        addMaterialSpec,
        updateMaterialSpec,
        deleteMaterialSpec,
        toggleSpecStatus,
        employees,
        setEmployees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        toggleEmployeeStatus,
        biometricDevices,
        setBiometricDevices,
        biometricUsers,
        setBiometricUsers,
        importK90Users,
        mapBiometricUser,
        unlinkBiometricUser,
        createAndMapEmployee,
        assignBiometricId,
        vendors,
        setVendors,
        addVendor,
        updateVendor,
        deleteVendor,
        designers,
        setDesigners,
        addDesigner,
        updateDesigner,
        deleteDesigner,
        salesPersons,
        addSalesPerson,
        updateSalesPerson,
        deleteSalesPerson,
        careOfPersons,
        addCareOfPerson,
        updateCareOfPerson,
        deleteCareOfPerson,
        workers,
        setWorkers,
        addWorker,
        updateWorker,
        deleteWorker,
        attendanceRecords,
        markAttendance,
        payrollRecords,
        setPayrollRecords,
        paySalaryVoucher,
        inventory,
        setInventory,
        purchaseOrders,
        setPurchaseOrders,
        payments,
        followUps,
        setFollowUps,
        workerJobIncentives,
        setWorkerJobIncentives,
        recordWorkerIncentive,
        assignItemWorkers,
        calculateJobProfitAndIncentive,
        globalSearchQuery,
        setGlobalSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        isFollowUpsOpen,
        setIsFollowUpsOpen,
        resetDemoData,
        loginAsDemoAdmin
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

// Helper: 0.5% Job Profit Incentive Calculation
export const calculateJobProfitAndIncentive = (item, order, incentivePct = 0.5) => {
  if (!item) return { itemProfit: 0, incentiveAmount: 0, incentivePct: 0.5 };

  let itemSellingAmount = Number(item.amount || (item.sellingRate * (item.qty || 1)) || 0);
  let itemCost = Number(item.actualCost || item.estimatedCost || item.actualVendorBill || item.estimatedVendorCost || 0);
  let itemProfit = itemSellingAmount - itemCost;

  if (itemProfit <= 0 && order) {
    const orderGrossProfit = Number(order.grossProfit || (order.grandTotal ? (order.grandTotal - (order.totalActualCost || order.totalEstimatedCost || 0)) : 0));
    const orderSubtotal = Number(order.subtotal || order.grandTotal || 1);
    if (orderGrossProfit > 0 && orderSubtotal > 0 && itemSellingAmount > 0) {
      itemProfit = Math.round((orderGrossProfit * itemSellingAmount) / orderSubtotal);
    }
  }

  if (itemProfit <= 0 && itemSellingAmount > 0) {
    itemProfit = Math.round(itemSellingAmount * 0.35); // standard 35% margin fallback estimate
  }

  const effectiveProfit = Math.max(0, itemProfit);
  const incentiveAmount = Math.round((effectiveProfit * (incentivePct / 100)) * 100) / 100;

  return {
    itemProfit: effectiveProfit,
    incentiveAmount: Math.max(0, incentiveAmount),
    incentivePct
  };
};


export const useERP = () => useContext(ERPContext);
