import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { initialCompanyProfile } from '../data/mockData';
import { USER_ROLES, PRODUCTION_STATUS, PRODUCTION_STAGES, STAGE_STATUS, MACHINE_STATUS } from '../types';
import { api } from '../utils/api';

const ERPContext = createContext();

export const ERPProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authoritative ERP Data States (Single Source of Truth: SQLite WAL database synchronized on mount & mutations)
  const [companyProfile, setCompanyProfile] = useState(initialCompanyProfile);
  const [companyBankAccounts, setCompanyBankAccounts] = useState([]);
  const [activeUser, setActiveUser] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_active_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      id: 'EMP-ADM-01',
      name: 'Minhaj V (Admin)',
      email: 'admin@screenarts.in',
      role: USER_ROLES.ADMIN,
      department: 'Management',
      designation: 'General Manager & Admin'
    };
  });
  const [activeRole, setActiveRole] = useState(() => {
    try {
      const saved = localStorage.getItem('stitch_erp_active_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) return parsed.role;
      }
    } catch (e) {}
    return USER_ROLES.ADMIN;
  });

  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [productMaterialSpecs, setProductMaterialSpecs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [careOfPersons, setCareOfPersons] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [workerJobIncentives, setWorkerJobIncentives] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [orderAuditLogs, setOrderAuditLogs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [wastageRecords, setWastageRecords] = useState([]);
  const [productionProcesses, setProductionProcesses] = useState([]);
  const [productionTasks, setProductionTasks] = useState([]);
  const [followUps, setFollowUps] = useState([]);

  // Phase 1-5 Production Hardening States (SQLite Authoritative & Live Sync)
  const [expenses, setExpenses] = useState([]);
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [reworkTickets, setReworkTickets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [reconciliationData, setReconciliationData] = useState([]);
  const [backups, setBackups] = useState([]);

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

  // Fetch all persistent ERP data from local SQLite database API server (Authoritative Source of Truth)
  const fetchAllERPData = async () => {
    try {
      const data = await api.fetchAll();
      if (data && data.success) {
        if (data.companyProfile && data.companyProfile.name) {
          const rawCP = data.companyProfile;
          const bank = rawCP.bankDetails || {};
          setCompanyProfile({
            ...rawCP,
            bankDetails: {
              bankName: bank.bankName || rawCP.bank_name || rawCP.bankName || 'HDFC Bank Ltd',
              accountName: bank.accountName || rawCP.account_name || rawCP.accountName || rawCP.name || 'ScreenArts Digital & Signage India Pvt Ltd',
              accountNo: bank.accountNo || rawCP.account_no || rawCP.accountNo || '50200048192837',
              ifsc: bank.ifsc || rawCP.ifsc || 'HDFC0000123',
              branch: bank.branch || rawCP.branch || 'Goregaon East, Mumbai',
              upiId: bank.upiId || rawCP.upi_id || rawCP.upiId || 'screenarts@hdfcbank'
            }
          });
        }
        if (data.customers) setCustomers(data.customers);
        if (data.products) setProducts(data.products);
        if (data.productMaterialSpecs) setProductMaterialSpecs(data.productMaterialSpecs);
        if (data.vendors) setVendors(data.vendors);
        if (data.suppliers && (!data.vendors || data.vendors.length === 0)) setVendors(data.suppliers);
        if (data.salesPersons) setSalesPersons(data.salesPersons);
        if (data.careOfPersons) setCareOfPersons(data.careOfPersons);
        if (data.employees) {
          setEmployees(data.employees);
          const designStaff = data.employees.filter(e => 
            (e.department && e.department.toLowerCase().includes('design')) || 
            (e.role && e.role.toLowerCase().includes('design'))
          );
          setDesigners(designStaff.length > 0 ? designStaff : data.employees);
          const workerStaff = data.employees.filter(e => 
            (e.department && (e.department.toLowerCase().includes('prod') || e.department.toLowerCase().includes('print') || e.department.toLowerCase().includes('finish'))) || 
            (e.role && (e.role.toLowerCase().includes('operat') || e.role.toLowerCase().includes('print') || e.role.toLowerCase().includes('worker')))
          );
          setWorkers(workerStaff.length > 0 ? workerStaff : data.employees);
        }
        if (data.biometricDevices) setBiometricDevices(data.biometricDevices);
        if (data.biometricUsers) setBiometricUsers(data.biometricUsers);
        if (data.salesOrders) setSalesOrders(data.salesOrders);
        if (data.workerJobIncentives) setWorkerJobIncentives(data.workerJobIncentives);
        if (data.payments) setPayments(data.payments);
        if (data.productionProcesses && data.productionProcesses.length > 0) setProductionProcesses(data.productionProcesses);
        if (data.productionTasks && data.productionTasks.length > 0) setProductionTasks(data.productionTasks);
        if (data.machines) setMachines(data.machines);
        if (data.expenses) setExpenses(data.expenses);
        if (data.inventory) setInventory(data.inventory);
        if (data.inventoryTransactions) setInventoryTransactions(data.inventoryTransactions);
        if (data.reworkTickets) setReworkTickets(data.reworkTickets);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        if (data.deliveryNotes) setDeliveries(data.deliveryNotes);
        if (data.users) setUsersList(data.users);
      }
    } catch (err) {
      console.warn("API fetchAllERPData warning, using local state:", err);
    }
  };

  const loginAsDemoAdmin = () => {
    const adminUser = {
      id: 'EMP-ADM-01',
      username: 'admin',
      name: 'Minhaj V (Admin)',
      email: 'admin@screenarts.in',
      role: USER_ROLES.ADMIN,
      department: 'Management',
      designation: 'General Manager & Admin'
    };
    setSession({ user: adminUser });
    setActiveRole(USER_ROLES.ADMIN);
    setActiveUser(adminUser);
    fetchAllERPData();
    setLoading(false);
  };

  // Auth Initialization (Multi-User Local DB + Supabase Support)
  useEffect(() => {
    const initAuthAndData = async () => {
      // 1. Check local DB auth token
      const token = localStorage.getItem('stitch_auth_token');
      if (token) {
        try {
          const me = await api.fetchMe();
          if (me && me.success && me.user) {
            setSession({ user: me.user, token });
            setActiveUser(me.user);
            setActiveRole(me.user.role || USER_ROLES.ADMIN);
            await fetchAllERPData();
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn("Local token check error:", err);
        }
      }

      // 2. Check Supabase if configured
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setSession(session);
            await fetchUserProfile(session.user.id);
            await fetchAllERPData();
            setLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Supabase auth error:", e);
        }
      }

      // 3. Fallback: Authenticate default workstation to establish signed backend token
      try {
        const loginRes = await api.login('admin', 'Admin@123');
        if (loginRes && loginRes.success && loginRes.user) {
          setSession({ user: loginRes.user, token: loginRes.token });
          setActiveUser(loginRes.user);
          setActiveRole(loginRes.user.role || USER_ROLES.ADMIN);
          await fetchAllERPData();
          setLoading(false);
          return;
        }
      } catch (loginErr) {
        console.warn("Default workstation auto-login error:", loginErr);
      }

      // Default active user fallback
      const savedUser = localStorage.getItem('stitch_erp_active_user');
      let userObj = {
        id: 'EMP-ADM-01',
        username: 'admin',
        name: 'Minhaj V (Admin)',
        email: 'admin@screenarts.in',
        role: USER_ROLES.ADMIN,
        department: 'Management',
        designation: 'General Manager & Admin'
      };
      if (savedUser) {
        try { userObj = JSON.parse(savedUser); } catch(e){}
      }
      setActiveUser(userObj);
      setActiveRole(userObj.role || USER_ROLES.ADMIN);
      setSession({ user: userObj });
      setLoading(false);
    };

    initAuthAndData();
  }, []);

  // Server-Sent Events (SSE) Real-Time Factory Broadcast Listener
  useEffect(() => {
    let es;
    try {
      es = new EventSource('/api/events');
      es.onopen = () => {
        setRealtimeConnected(true);
        console.log('[SSE Hub] Connected to live factory event broadcaster');
      };
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'CONNECTED') {
            setRealtimeConnected(true);
            return;
          }
          console.log('[SSE Hub] Broadcast event received:', payload.type, payload.data);
          // Auto-sync authoritative state across all factory workstations without refresh
          fetchAllERPData();
        } catch (err) {
          console.error('[SSE Hub] Parse error:', err);
        }
      };
      es.onerror = () => {
        setRealtimeConnected(false);
      };
    } catch (err) {
      console.warn('[SSE Hub] EventSource init error:', err);
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  const switchUser = async (userObj) => {
    if (!userObj) return;
    try {
      const res = await api.switchUser(userObj);
      if (res && res.success && res.user) {
        setActiveUser(res.user);
        if (res.user.role) {
          setActiveRole(res.user.role);
        }
        setSession({ user: res.user, token: res.token });
        return res.user;
      }
    } catch (err) {
      console.warn("api.switchUser error, applying client fallback:", err);
      setActiveUser(userObj);
      if (userObj.role) {
        setActiveRole(userObj.role);
      }
      try {
        localStorage.setItem('stitch_erp_active_user', JSON.stringify(userObj));
      } catch (e) {}
    }
  };

  const switchRole = async (role) => {
    setActiveRole(role);
    const updated = { ...(activeUser || {}), role, name: activeUser?.name || `${role} Officer` };
    setActiveUser(updated);
    try {
      localStorage.setItem('stitch_erp_active_user', JSON.stringify(updated));
    } catch (e) {}
    if (session?.user) {
      await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', session.user.id);
    }
  };

  // Update Company Profile & GST Settings
  const updateCompanyProfile = async (profileData) => {
    try {
      const res = await api.updateCompanyProfile(profileData);
      if (res && res.success) {
        setCompanyProfile(profileData);
        return res;
      }
    } catch (err) {
      console.warn("updateCompanyProfile API warning, updating local state:", err);
      setCompanyProfile(profileData);
    }
  };

  // Add Customer with persistent SQLite & Supabase integration
  const addCustomer = async (customerData) => {
    const newId = customerData.id || `CUST-${100 + customers.length + Math.floor(Math.random() * 100) + 1}`;
    const newCode = customerData.code || `${(customerData.name || 'CUST').substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    
    // Normalize additionalMobiles
    const rawAddMobiles = customerData.additionalMobiles || customerData.additional_mobiles || [];
    const additionalMobiles = Array.isArray(rawAddMobiles) 
      ? rawAddMobiles.map(m => String(m).trim()).filter(Boolean)
      : (typeof rawAddMobiles === 'string' ? rawAddMobiles.split(',').map(m => m.trim()).filter(Boolean) : []);

    const uiCustomer = {
      id: newId,
      code: newCode,
      name: (customerData.name || '').trim(),
      mobile: (customerData.mobile || '').trim(),
      additionalMobiles: additionalMobiles,
      email: (customerData.email || '').trim(),
      gstin: (customerData.gstin || '').trim().toUpperCase(),
      type: customerData.type || 'Walk-in',
      address: customerData.address || '',
      state: customerData.state || 'Maharashtra (27)',
      creditLimit: parseFloat(customerData.creditLimit) || 0,
      outstanding: parseFloat(customerData.outstanding) || 0,
      totalOrders: parseInt(customerData.totalOrders, 10) || 0,
      careOfId: customerData.careOfId || '',
      careOfName: customerData.careOfName || '',
      createdAt: customerData.createdAt || new Date().toISOString().split('T')[0]
    };

    // Update state immediately & store in localStorage so UI is instant and never loses state
    setCustomers((prev) => {
      const updated = [uiCustomer, ...prev.filter(c => c.id !== uiCustomer.id)];
      try { localStorage.setItem('stitch_erp_customers', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    try {
      if (isSupabaseConfigured) {
        const dbCustomer = {
          id: uiCustomer.id,
          code: uiCustomer.code,
          name: uiCustomer.name,
          mobile: uiCustomer.mobile,
          additional_mobiles: JSON.stringify(uiCustomer.additionalMobiles),
          email: uiCustomer.email,
          gstin: uiCustomer.gstin,
          type: uiCustomer.type,
          address: uiCustomer.address,
          state: uiCustomer.state,
          credit_limit: uiCustomer.creditLimit,
          outstanding: uiCustomer.outstanding,
          total_orders: uiCustomer.totalOrders,
          care_of_id: uiCustomer.careOfId,
          care_of_name: uiCustomer.careOfName,
          created_at: uiCustomer.createdAt
        };
        const { error } = await supabase.from('customers').upsert(dbCustomer);
        if (error) console.warn("Supabase customers upsert error:", error);
      }
    } catch (err) {
      console.warn("Supabase customer insert exception:", err);
    }

    try {
      await api.createCustomer(uiCustomer);
    } catch (err) {
      console.warn("api.createCustomer exception, using persistent local state:", err);
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
      commission_type: careOfData.commissionType || 'profit',
      total_referred_sales: 0,
      active_orders: 0,
      notes: careOfData.notes || ''
    };

    const uiCareOf = {
      ...newCareOf,
      referralCommissionPct: newCareOf.referral_commission_pct,
      commissionType: newCareOf.commission_type,
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

    setCareOfPersons((prev) => {
      const updated = [uiCareOf, ...prev.filter(c => c.id !== uiCareOf.id)];
      try { localStorage.setItem('stitch_erp_care_of_persons', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    return uiCareOf;
  };

  const updateCareOfPerson = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.referralCommissionPct !== undefined) {
      dbUpdate.referral_commission_pct = parseFloat(updatedData.referralCommissionPct) || 0;
      delete dbUpdate.referralCommissionPct;
    }
    if (updatedData.commissionType !== undefined) {
      dbUpdate.commission_type = updatedData.commissionType;
      delete dbUpdate.commissionType;
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

    setCareOfPersons((prev) => {
      const updated = prev.map((co) =>
        co.id === id ? {
          ...co,
          ...updatedData,
          referralCommissionPct: dbUpdate.referral_commission_pct ?? co.referralCommissionPct,
          commissionType: dbUpdate.commission_type ?? co.commissionType ?? 'profit'
        } : co
      );
      try { localStorage.setItem('stitch_erp_care_of_persons', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
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
    setCareOfPersons((prev) => {
      const updated = prev.filter((co) => co.id !== id);
      try { localStorage.setItem('stitch_erp_care_of_persons', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    return true;
  };

  // Sales Person Management
  const addSalesPerson = async (spData) => {
    const newId = `SP-${String(salesPersons.length + 1).padStart(2, '0')}`;
    const newSP = {
      id: newId,
      name: spData.name,
      mobile: spData.mobile || '',
      target: parseFloat(spData.target) || 500000,
      achieved: 0,
      commissionRate: parseFloat(spData.commissionRate) || 3.5
    };

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('sales_persons').insert(newSP);
        if (error) console.warn("Supabase sales_persons insert error:", error);
      }
    } catch (err) {
      console.warn("Supabase sales_persons insert exception:", err);
    }

    setSalesPersons((prev) => {
      const updated = [newSP, ...prev.filter(s => s.id !== newSP.id)];
      try { localStorage.setItem('stitch_erp_sales_persons', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    return newSP;
  };

  const updateSalesPerson = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.commissionRate !== undefined) {
      dbUpdate.commission_rate = parseFloat(updatedData.commissionRate) || 0;
    }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('sales_persons').update(dbUpdate).eq('id', id);
        if (error) console.warn("Supabase sales_persons update error:", error);
      }
    } catch (err) {
      console.warn("Supabase sales_persons update exception:", err);
    }

    setSalesPersons((prev) => {
      const updated = prev.map((sp) => (sp.id === id ? { ...sp, ...updatedData } : sp));
      try { localStorage.setItem('stitch_erp_sales_persons', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    return true;
  };

  const deleteSalesPerson = async (id) => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('sales_persons').delete().eq('id', id);
        if (error) console.warn("Supabase sales_persons delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase sales_persons delete exception:", err);
    }
    setSalesPersons((prev) => {
      const updated = prev.filter((sp) => sp.id !== id);
      try { localStorage.setItem('stitch_erp_sales_persons', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    return true;
  };

  const updateCustomer = async (id, updatedData) => {
    const rawAddMobiles = updatedData.additionalMobiles !== undefined ? updatedData.additionalMobiles : updatedData.additional_mobiles;
    let additionalMobiles = undefined;
    if (rawAddMobiles !== undefined) {
      additionalMobiles = Array.isArray(rawAddMobiles) 
        ? rawAddMobiles.map(m => String(m).trim()).filter(Boolean)
        : (typeof rawAddMobiles === 'string' ? rawAddMobiles.split(',').map(m => m.trim()).filter(Boolean) : []);
    }

    const dbUpdate = { ...updatedData };
    if (additionalMobiles !== undefined) {
      dbUpdate.additional_mobiles = JSON.stringify(additionalMobiles);
      delete dbUpdate.additionalMobiles;
    }
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
    if (updatedData.careOfId !== undefined) {
      dbUpdate.care_of_id = updatedData.careOfId;
      delete dbUpdate.careOfId;
    }
    if (updatedData.careOfName !== undefined) {
      dbUpdate.care_of_name = updatedData.careOfName;
      delete dbUpdate.careOfName;
    }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('customers').update(dbUpdate).eq('id', id);
        if (error) console.warn("Supabase customer update error:", error);
      }
    } catch (err) {
      console.warn("Supabase customer update exception:", err);
    }

    try {
      await api.updateCustomer(id, {
        ...updatedData,
        additionalMobiles: additionalMobiles
      });
    } catch (err) {
      console.warn("api.updateCustomer exception, using local state:", err);
    }

    setCustomers((prev) => {
      const updated = prev.map((c) =>
        c.id === id
          ? {
              ...c,
              ...updatedData,
              additionalMobiles: additionalMobiles !== undefined ? additionalMobiles : (c.additionalMobiles || []),
              creditLimit: dbUpdate.credit_limit ?? c.creditLimit ?? c.credit_limit,
              outstanding: dbUpdate.outstanding ?? c.outstanding,
              careOfId: dbUpdate.care_of_id ?? c.careOfId,
              careOfName: dbUpdate.care_of_name ?? c.careOfName
            }
          : c
      );
      try { localStorage.setItem('stitch_erp_customers', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
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
    setCustomers((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      try { localStorage.setItem('stitch_erp_customers', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    return true;
  };

  const addProduct = async (productData, specsArr = []) => {
    const pid = productData.id || `PROD-${Date.now()}`;
    const newProduct = { ...productData, id: pid };

    // Update state immediately & store in localStorage so UI is instant and never loses state
    setProducts((prev) => {
      const updated = [newProduct, ...prev.filter(p => p.id !== pid)];
      try { localStorage.setItem('stitch_erp_products', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    try {
      if (isSupabaseConfigured) {
        const dbProd = {
          id: newProduct.id,
          code: newProduct.code || newProduct.id,
          name: newProduct.name,
          category: newProduct.category || 'General',
          unit: newProduct.unit || 'Sq.Ft',
          default_rate: newProduct.defaultRate || newProduct.sellingRate || 0,
          estimated_cost: newProduct.estimatedCost || 0,
          description: newProduct.description || ''
        };
        const { error } = await supabase.from('products').upsert(dbProd);
        if (error) console.warn("Supabase products upsert error:", error);
      }
    } catch (err) {
      console.warn("Supabase product insert exception:", err);
    }

    try {
      await api.createProduct(newProduct, specsArr);
    } catch (err) {
      console.warn("api.createProduct exception, using persistent local state:", err);
    }
    return newProduct;
  };

  const updateProduct = async (id, productData, specsArr = []) => {
    setProducts((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, ...productData } : p));
      try { localStorage.setItem('stitch_erp_products', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    try {
      if (isSupabaseConfigured) {
        const dbProd = {
          id,
          name: productData.name,
          category: productData.category,
          unit: productData.unit,
          default_rate: productData.defaultRate || productData.sellingRate || 0,
          estimated_cost: productData.estimatedCost || 0,
          description: productData.description || ''
        };
        const { error } = await supabase.from('products').update(dbProd).eq('id', id);
        if (error) console.warn("Supabase products update error:", error);
      }
    } catch (err) {
      console.warn("Supabase product update exception:", err);
    }

    try {
      await api.updateProduct(id, productData, specsArr);
    } catch (err) {
      console.warn("api.updateProduct exception:", err);
    }
    return { ...productData, id };
  };

  const deleteProduct = async (id) => {
    setProducts((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try { localStorage.setItem('stitch_erp_products', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    setProductMaterialSpecs((prev) => prev.filter((s) => s.productId !== id));

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) console.warn("Supabase product delete error:", error);
      }
    } catch (err) {
      console.warn("Supabase product delete exception:", err);
    }

    try {
      await api.deleteProduct(id);
    } catch (err) {
      console.warn("api.deleteProduct exception:", err);
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
      billedByStaff: orderPayload.billedByStaff || activeUser?.name || 'Admin User',
      billedByStaffId: orderPayload.billedByStaffId || activeUser?.id || '',
      billedByRole: orderPayload.billedByRole || activeUser?.role || activeRole || 'Billing Staff',
      billedByDept: orderPayload.billedByDept || activeUser?.department || 'Sales',
      billedAt: orderPayload.billedAt || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      createdAt: new Date().toISOString()
    };

    try {
      const apiRes = await api.createSalesOrder({
        orderHeader: {
          ...finalOrder,
          orderNumber: newOrderId,
          grandTotal: finalOrder.grandTotal,
          subtotal: finalOrder.subtotal,
          taxTotal: (finalOrder.cgst || 0) + (finalOrder.sgst || 0) + (finalOrder.igst || 0),
          cgst: finalOrder.cgst || 0,
          sgst: finalOrder.sgst || 0,
          igst: finalOrder.igst || 0,
          roundOff: finalOrder.roundOff || 0,
          taxMode: finalOrder.taxMode || 'Exclusive',
          advanceAmount: advance,
          balanceAmount: balance
        },
        items: finalOrder.items,
        advanceAmount: advance,
        paymentMethod: processedOrder.paymentMethod
      });
      if (apiRes && apiRes.billedByStaff) {
        finalOrder.billedByStaff = apiRes.billedByStaff;
        finalOrder.billedByStaffId = apiRes.billedById;
        finalOrder.billedByRole = apiRes.billedByRole;
        finalOrder.billedAt = apiRes.billedAt;
      }
      await fetchAllERPData();
    } catch (err) {
      console.error("api.createSalesOrder failed:", err);
      throw err;
    }

    // Log creation activity
    logOrderActivity({
      orderId: newOrderId,
      orderNumber: newOrderId,
      customerName: finalOrder.customerName,
      customerMobile: finalOrder.customerMobile,
      actionType: isQuote ? 'CREATED' : 'CREATED',
      actionTitle: `${isQuote ? 'Quotation' : 'Sales Order'} ${newOrderId} Created`,
      actor: finalOrder.billedByStaff || activeUser?.name || 'Authorized Staff',
      role: finalOrder.billedByRole || activeRole || 'Sales',
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

    if (isSupabaseConfigured) {
      try {
        supabase.from('order_audit_logs').insert({
          id: entry.id,
          order_id: entry.orderId,
          order_number: entry.orderNumber,
          customer_name: entry.customerName,
          customer_mobile: entry.customerMobile,
          action_type: entry.actionType,
          action_title: entry.actionTitle,
          actor: entry.actor,
          role: entry.role,
          timestamp: entry.timestamp,
          formatted_time: entry.formattedTime,
          reason: entry.reason,
          previous_amount: entry.previousAmount,
          new_amount: entry.newAmount,
          diff_amount: entry.diffAmount,
          refund_or_reversal: entry.refundOrReversal,
          changes_summary: JSON.stringify(entry.changesSummary),
          snapshot: entry.snapshot ? JSON.stringify(entry.snapshot) : null
        }).then(({ error }) => {
          if (error && !error.message?.includes('does not exist')) {
            console.warn("Supabase order_audit_logs sync info:", error.message);
          }
        }).catch(() => {});
      } catch (err) {
        // Silently preserve local log
      }
    }

    setOrderAuditLogs((prev) => [entry, ...(prev || [])]);
    return entry;
  };

  const clearAuditLogs = () => {
    setOrderAuditLogs([]);
    try {
      localStorage.removeItem('stitch_erp_order_audit_logs');
    } catch (e) {}
  };

  // Convert Quotation to Direct Sales Order with 1-Click (Authoritative Backend Transaction)
  const convertQuotationToSalesOrder = async (quotationId) => {
    try {
      const resp = await api.convertQuotation(quotationId);
      if (resp && resp.order) {
        setSalesOrders((prev) => {
          const updated = prev.map((o) => (o.id === quotationId ? { ...o, quotationStatus: 'Converted', convertedOrderId: resp.orderId } : o));
          return [resp.order, ...updated.filter((o) => o.id !== resp.order.id)];
        });
        api.fetchAll().then((fresh) => {
          if (fresh.salesOrders) setSalesOrders(fresh.salesOrders);
          if (fresh.customers) setCustomers(fresh.customers);
          if (fresh.productionTasks) setProductionTasks(fresh.productionTasks);
        }).catch(() => {});
        return resp.order;
      }
      throw new Error(resp?.error || 'Failed to convert quotation');
    } catch (apiErr) {
      console.error("convertQuotationToSalesOrder error:", apiErr);
      throw apiErr;
    }
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

    try {
      await api.updateSalesOrder(orderId, {
        orderHeader: {
          ...finalUpdatedOrder,
          orderNumber: orderId,
          grandTotal: finalUpdatedOrder.grandTotal,
          subtotal: finalUpdatedOrder.subtotal,
          taxTotal: (finalUpdatedOrder.cgst || 0) + (finalUpdatedOrder.sgst || 0) + (finalUpdatedOrder.igst || 0),
          cgst: finalUpdatedOrder.cgst || 0,
          sgst: finalUpdatedOrder.sgst || 0,
          igst: finalUpdatedOrder.igst || 0,
          roundOff: finalUpdatedOrder.roundOff || 0,
          taxMode: finalUpdatedOrder.taxMode || 'Exclusive',
          advanceAmount: finalUpdatedOrder.advanceAmount,
          balanceAmount: finalUpdatedOrder.balanceAmount
        },
        items: finalUpdatedOrder.items,
        editReason,
        version: existing?.version
      });
      await fetchAllERPData();
    } catch (err) {
      console.warn("api.updateSalesOrder exception, falling back to client update:", err);
    }

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

    try {
      await api.cancelSalesOrder(orderId, cancelReason);
      await fetchAllERPData();
    } catch (err) {
      console.warn("api.cancelSalesOrder exception, falling back to client update:", err);
    }

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

    try {
      await api.updateProductionStatus(orderId, itemId, newStatus);
    } catch (err) {
      console.warn("api.updateProductionStatus warning:", err);
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

    try {
      await api.updateProductionStatus(orderId, 'all', newStatus);
    } catch (err) {
      console.warn("api.updateProductionStatus warning:", err);
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

    try {
      await api.recordPayment({
        id: payVoucher.id,
        orderId: orderId,
        customerName: order.customerName || 'Customer',
        amount: amt,
        method: method || 'UPI',
        refNo: refNo || `REC-${orderId}`,
        bankAccountId: bankAccountId || '',
        bankAccountName: bankAccountName || 'Main Cash Account',
        recordedBy: activeUser?.name || 'Authorized Staff'
      });
    } catch (err) {
      console.warn("api.recordPayment exception:", err);
    }

    setPayments((prev) => [payVoucher, ...prev]);
    return payVoucher;
  };

  // Persistent Expenses Helpers
  const addExpense = async (expenseData) => {
    try {
      const res = await api.createExpense({
        ...expenseData,
        createdBy: activeUser?.name || 'Authorized Staff'
      });
      if (res && res.expense) {
        setExpenses(prev => [res.expense, ...prev]);
        return res.expense;
      }
    } catch (err) {
      console.error("addExpense error:", err);
      throw err;
    }
  };

  const removeExpense = async (id) => {
    try {
      await api.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error("removeExpense error:", err);
      throw err;
    }
  };

  // Inventory Transactions Ledger Helper
  const addInventoryTransaction = async (txData) => {
    try {
      const res = await api.createInventoryTransaction({
        ...txData,
        employeeId: activeUser?.id || 'EMP-ADM-01'
      });
      if (res && res.success) {
        await fetchAllERPData();
      }
      return res;
    } catch (err) {
      console.error("addInventoryTransaction error:", err);
      throw err;
    }
  };

  // Persistent Payroll Commit Helper
  const commitPayroll = async (payrollData) => {
    try {
      const res = await api.commitPayroll({
        ...payrollData,
        committedBy: activeUser?.name || 'Admin User'
      });
      if (res && res.success) {
        await fetchAllERPData();
      }
      return res;
    } catch (err) {
      console.error("commitPayroll error:", err);
      throw err;
    }
  };

  // QC & Rework Ticket Helper
  const addReworkTicket = async (ticketData) => {
    try {
      const res = await api.createReworkTicket({
        ...ticketData,
        qcInspector: activeUser?.name || 'QC Staff'
      });
      if (res && res.ticket) {
        setReworkTickets(prev => [res.ticket, ...prev]);
      }
      return res;
    } catch (err) {
      console.error("addReworkTicket error:", err);
      throw err;
    }
  };

  // Local DB User Authentication
  const loginWithCredentials = async (username, password) => {
    try {
      const data = await api.login(username, password);
      if (data && data.success && data.user) {
        setSession({ user: data.user, token: data.token });
        setActiveUser(data.user);
        setActiveRole(data.user.role || USER_ROLES.ADMIN);
        await fetchAllERPData();
        return { success: true, user: data.user };
      }
      return { success: false, error: 'Login failed' };
    } catch (err) {
      return { success: false, error: err.message || 'Invalid credentials' };
    }
  };

  const logoutUser = () => {
    api.logout();
    setSession(null);
    setActiveUser(null);
    localStorage.removeItem('stitch_auth_token');
    localStorage.removeItem('stitch_erp_active_user');
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


  // Reset demo data: Disabled in production to safeguard authoritative business records
  const resetDemoData = async () => {
    console.warn("[PRODUCTION GUARD] Database reset is disabled to safeguard authoritative business data.");
    return { success: false, message: "Demo data reset disabled in production mode." };
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

  // Machine Management Handlers
  const addMachine = async (machineData) => {
    const newId = machineData.id || `MCH-${String(machines.length + 1).padStart(2, '0')}`;
    const newMch = {
      ...machineData,
      id: newId,
      status: machineData.status || 'Running',
      activeJobCount: machineData.activeJobCount || 0,
      totalHoursRun: machineData.totalHoursRun || 0,
      createdAt: new Date().toISOString()
    };
    setMachines((prev) => [newMch, ...prev.filter(m => m.id !== newId)]);
    return newMch;
  };

  const updateMachine = async (id, updatedData) => {
    setMachines((prev) => prev.map((m) => (m.id === id ? { ...m, ...updatedData } : m)));
    return true;
  };

  const deleteMachine = async (id) => {
    setMachines((prev) => prev.filter((m) => m.id !== id));
    return true;
  };

  // Workflow Management Handlers
  const addWorkflow = async (workflowData) => {
    const newId = workflowData.id || `WF-${String(workflows.length + 1).padStart(2, '0')}`;
    const newWf = {
      ...workflowData,
      id: newId,
      stages: workflowData.stages || ['Designing', 'Printing', 'Finishing', 'Quality Check', 'Ready for Delivery', 'Delivered'],
      createdAt: new Date().toISOString()
    };
    setWorkflows((prev) => [newWf, ...prev.filter(w => w.id !== newId)]);
    return newWf;
  };

  const updateWorkflow = async (id, updatedData) => {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, ...updatedData } : w)));
    return true;
  };

  const deleteWorkflow = async (id) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    return true;
  };

  // Production Stage & Job Order Management Handlers
  const updateJobOrderStage = async (orderId, itemId, stageName, stageStatus, operatorId = '', operatorName = '', machineId = '', machineName = '', notes = '') => {
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updatedItems = (o.items || []).map((it) => {
          if (it.id === itemId || it.jobCardId === itemId) {
            const currentStages = it.stageTimeline || [
              { stage: 'Designing', status: 'Completed', timestamp: o.orderDate },
              { stage: 'Printing', status: 'In Progress', timestamp: new Date().toISOString() },
              { stage: 'Finishing', status: 'Pending' },
              { stage: 'Quality Check', status: 'Pending' },
              { stage: 'Ready for Delivery', status: 'Pending' },
              { stage: 'Delivered', status: 'Pending' }
            ];

            const updatedStages = currentStages.map((s) => {
              if (s.stage === stageName || s.name === stageName) {
                return {
                  ...s,
                  status: stageStatus,
                  operatorId: operatorId || s.operatorId,
                  operatorName: operatorName || s.operatorName,
                  machineId: machineId || s.machineId,
                  machineName: machineName || s.machineName,
                  notes: notes || s.notes,
                  updatedAt: new Date().toISOString()
                };
              }
              return s;
            });

            // If this stage is marked In Progress or Completed, map to productionStatus
            let nextProdStatus = it.productionStatus;
            if (stageName === 'Designing') nextProdStatus = stageStatus === 'Completed' ? 'Printing' : 'Designing';
            else if (stageName === 'Printing') nextProdStatus = stageStatus === 'Completed' ? 'Finishing' : 'Printing';
            else if (stageName === 'Finishing') nextProdStatus = stageStatus === 'Completed' ? 'Quality Check' : 'Finishing';
            else if (stageName === 'Quality Check') nextProdStatus = stageStatus === 'Completed' ? 'Ready for Delivery' : 'Quality Check';
            else if (stageName === 'Ready for Delivery' || stageName === 'Ready') nextProdStatus = 'Ready for Delivery';
            else if (stageName === 'Delivered') nextProdStatus = 'Delivered';

            return {
              ...it,
              productionStatus: nextProdStatus,
              stageTimeline: updatedStages,
              assignedOperatorId: operatorId || it.assignedOperatorId,
              assignedOperatorName: operatorName || it.assignedOperatorName,
              assignedMachineId: machineId || it.assignedMachineId,
              assignedMachineName: machineName || it.assignedMachineName,
              lastStageUpdated: stageName,
              lastStageStatus: stageStatus,
              lastStageNotes: notes || it.lastStageNotes
            };
          }
          return it;
        });

        // Determine order level overall status
        const allStatuses = updatedItems.map((i) => i.productionStatus);
        let overallStatus = o.productionStatus;
        if (allStatuses.every((s) => s === 'Delivered')) overallStatus = 'Delivered';
        else if (allStatuses.every((s) => s === 'Ready for Delivery' || s === 'Delivered')) overallStatus = 'Ready for Delivery';
        else if (allStatuses.some((s) => s === 'Quality Check')) overallStatus = 'Quality Check';
        else if (allStatuses.some((s) => s === 'Finishing')) overallStatus = 'Finishing';
        else if (allStatuses.some((s) => s === 'Printing')) overallStatus = 'Printing';
        else if (allStatuses.some((s) => s === 'Designing')) overallStatus = 'Designing';

        return { ...o, items: updatedItems, productionStatus: overallStatus };
      })
    );

    // If a machine is assigned, update its workload count
    if (machineId) {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.id === machineId) {
            return { ...m, activeJobCount: (m.activeJobCount || 0) + (stageStatus === 'Completed' ? -1 : 1) };
          }
          return m;
        })
      );
    }

    return true;
  };

  // Record Wastage on Line Item / Job Card
  const updateJobWastage = async (orderId, itemId, wastageData) => {
    const { producedQty, materialUsed, wastageQty, wastagePct, unit = 'Units', reason = '', recordedBy = '' } = wastageData;
    const calcWastageQty = Number(wastageQty) || Math.max(0, (Number(materialUsed) || 0) - (Number(producedQty) || 0));
    const calcWastagePct = Number(wastagePct) || (Number(materialUsed) > 0 ? parseFloat(((calcWastageQty / Number(materialUsed)) * 100).toFixed(1)) : 0);

    const wasteLogEntry = {
      id: `WST-${Date.now()}`,
      orderId,
      itemId,
      producedQty: Number(producedQty) || 0,
      materialUsed: Number(materialUsed) || 0,
      wastageQty: calcWastageQty,
      wastagePct: calcWastagePct,
      unit,
      reason: reason || 'Production Setup / Trim Scrap',
      recordedBy: recordedBy || activeUser?.name || 'Machine Operator',
      recordedAt: new Date().toISOString()
    };

    setWastageRecords((prev) => [wasteLogEntry, ...prev]);

    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updatedItems = (o.items || []).map((it) => {
          if (it.id === itemId || it.jobCardId === itemId) {
            return {
              ...it,
              producedQty: Number(producedQty) || it.qty,
              materialUsed: Number(materialUsed) || (Number(producedQty) + calcWastageQty),
              wastageQty: calcWastageQty,
              wastagePct: calcWastagePct,
              wastageReason: reason,
              wastageHistory: [wasteLogEntry, ...(it.wastageHistory || [])]
            };
          }
          return it;
        });
        return { ...o, items: updatedItems };
      })
    );

    return wasteLogEntry;
  };

  // Update Estimated vs Actual Costing Breakdown on Line Item
  const updateJobCosting = async (orderId, itemId, costingData) => {
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        let orderActCost = 0;
        let orderEstCost = 0;

        const updatedItems = (o.items || []).map((it) => {
          if (it.id === itemId || it.jobCardId === itemId) {
            const estBreakdown = costingData.estimatedBreakdown || it.estimatedCostBreakdown || {
              material: Number(costingData.estMaterial ?? it.estimatedCost ?? 0),
              printing: Number(costingData.estPrinting ?? 0),
              finishing: Number(costingData.estFinishing ?? 0),
              labour: Number(costingData.estLabour ?? 0),
              machine: Number(costingData.estMachine ?? 0),
              outsourcing: Number(costingData.estOutsourcing ?? it.internalEstOutsourceCost ?? 0),
              other: Number(costingData.estOther ?? 0)
            };

            const actBreakdown = costingData.actualBreakdown || it.actualCostBreakdown || {
              material: Number(costingData.actMaterial ?? estBreakdown.material),
              printing: Number(costingData.actPrinting ?? estBreakdown.printing),
              finishing: Number(costingData.actFinishing ?? estBreakdown.finishing),
              labour: Number(costingData.actLabour ?? estBreakdown.labour),
              machine: Number(costingData.actMachine ?? estBreakdown.machine),
              outsourcing: Number(costingData.actOutsourcing ?? it.actualVendorBill ?? estBreakdown.outsourcing),
              other: Number(costingData.actOther ?? estBreakdown.other)
            };

            const totalEst = Object.values(estBreakdown).reduce((sum, v) => sum + (Number(v) || 0), 0);
            const totalAct = Object.values(actBreakdown).reduce((sum, v) => sum + (Number(v) || 0), 0);
            const variance = totalAct - totalEst;
            const variancePct = totalEst > 0 ? parseFloat(((variance / totalEst) * 100).toFixed(1)) : 0;
            const itemSelling = Number(it.amount || (it.sellingRate * (it.qty || 1)) || 0);
            const itemProfit = itemSelling - totalAct;
            const itemMarginPct = itemSelling > 0 ? parseFloat(((itemProfit / itemSelling) * 100).toFixed(1)) : 0;

            orderEstCost += totalEst;
            orderActCost += totalAct;

            return {
              ...it,
              estimatedCost: totalEst,
              actualCost: totalAct,
              estimatedCostBreakdown: estBreakdown,
              actualCostBreakdown: actBreakdown,
              costVariance: variance,
              costVariancePct: variancePct,
              grossProfit: itemProfit,
              grossMarginPct: itemMarginPct
            };
          }

          orderEstCost += Number(it.estimatedCost || 0);
          orderActCost += Number(it.actualCost || it.estimatedCost || 0);
          return it;
        });

        const grossProfit = o.subtotal - orderActCost;
        const profitMarginPct = o.subtotal > 0 ? parseFloat(((grossProfit / o.subtotal) * 100).toFixed(1)) : 0;

        return {
          ...o,
          items: updatedItems,
          totalEstimatedCost: orderEstCost,
          totalActualCost: orderActCost,
          grossProfit,
          profitMarginPct
        };
      })
    );

    return true;
  };

  // Assign Machine and Operators to Job Item
  const assignJobMachineAndOperator = async (orderId, itemId, { machineId = '', machineName = '', operatorId = '', operatorName = '', designerId = '', designerName = '' }) => {
    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updatedItems = (o.items || []).map((it) => {
          if (it.id === itemId || it.jobCardId === itemId) {
            return {
              ...it,
              assignedMachineId: machineId || it.assignedMachineId,
              assignedMachineName: machineName || it.assignedMachineName,
              assignedOperatorId: operatorId || it.assignedOperatorId,
              assignedOperatorName: operatorName || it.assignedOperatorName,
              designerId: designerId || it.designerId,
              designerName: designerName || it.designerName
            };
          }
          return it;
        });
        return { ...o, items: updatedItems };
      })
    );
    return true;
  };

  // ============================================================================
  // MULTI-TASK EMPLOYEE PRODUCTION & WORK LOG HELPER METHODS
  // ============================================================================

  // 1. Process Master Helpers
  const addProductionProcess = async (procData) => {
    const newProc = {
      id: procData.id || `PROC-${Date.now()}`,
      code: procData.code || `PROC-${(procData.name || '').slice(0, 3).toUpperCase()}`,
      name: procData.name,
      category: procData.category || 'Production',
      description: procData.description || '',
      defaultUnit: procData.defaultUnit || 'Nos',
      isActive: procData.isActive !== undefined ? procData.isActive : true,
      sortOrder: Number(procData.sortOrder || (productionProcesses || []).length + 1)
    };

    try {
      await api.createProcess(newProc);
    } catch (e) {
      console.warn("API createProcess fallback to local state:", e);
    }

    setProductionProcesses(prev => [...prev, newProc]);
    return newProc;
  };

  const updateProductionProcess = async (id, procData) => {
    try {
      await api.updateProcess(id, procData);
    } catch (e) {
      console.warn("API updateProcess fallback to local state:", e);
    }

    setProductionProcesses(prev => prev.map(p => p.id === id ? { ...p, ...procData } : p));
  };

  const deleteProductionProcess = async (id) => {
    try {
      await api.deleteProcess(id);
    } catch (e) {
      console.warn("API deleteProcess fallback to local state:", e);
    }

    setProductionProcesses(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
  };

  // 2. Production Task / Employee Work Log Helpers
  const createProductionTask = async (taskData) => {
    const taskId = taskData.id || `TSK-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const taskDate = taskData.taskDate || new Date().toISOString().split('T')[0];
    const initialStatus = taskData.status || 'Pending';
    const isStarting = initialStatus === 'Started' || initialStatus === 'In Progress';
    const effectiveStatus = isStarting ? 'In Progress' : initialStatus;
    const timeFormatted = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newTask = {
      id: taskId,
      taskDate,
      employeeId: taskData.employeeId,
      employeeName: taskData.employeeName,
      orderId: taskData.orderId || '',
      orderNumber: taskData.orderNumber || taskData.orderId || 'Direct Job',
      customerName: taskData.customerName || '',
      itemId: taskData.itemId || '',
      itemIndex: taskData.itemIndex || 1,
      itemTitle: taskData.itemTitle || taskData.productName || 'Printing Item',
      itemDimensions: taskData.itemDimensions || '',
      itemMaterial: taskData.itemMaterial || '',
      processId: taskData.processId || '',
      processName: taskData.processName,
      quantity: Number(taskData.quantity || 1),
      unit: taskData.unit || 'Nos',
      startTime: isStarting ? (taskData.startTime || timeFormatted) : (taskData.startTime || ''),
      endTime: taskData.endTime || '',
      totalDurationMinutes: Number(taskData.totalDurationMinutes || 0),
      status: effectiveStatus,
      priority: taskData.priority || 'Normal',
      remarks: taskData.remarks || '',
      machineId: taskData.machineId || '',
      machineName: taskData.machineName || '',
      department: taskData.department || 'Production',
      productionLocation: taskData.productionLocation || '',
      originalQty: Number(taskData.originalQty || taskData.quantity || 1),
      completedQty: Number(taskData.completedQty || 0),
      rejectedQty: Number(taskData.rejectedQty || 0),
      reworkQty: Number(taskData.reworkQty || 0),
      finalQty: Number(taskData.finalQty || taskData.quantity || 1),
      attachmentUrl: taskData.attachmentUrl || '',
      supervisor: taskData.supervisor || '',
      qcStatus: taskData.qcStatus || 'Pending',
      createdBy: activeUser?.name || 'Staff',
      createdAt: new Date().toISOString(),
      completedBy: '',
      completedAt: '',
      timeLogs: isStarting ? [{
        id: `TL-${taskId}-1`,
        action: 'START',
        timestamp: new Date().toISOString(),
        loggedBy: taskData.employeeName,
        notes: 'Task started on creation',
        elapsedSeconds: 0
      }] : []
    };

    try {
      await api.createProductionTask(newTask);
    } catch (e) {
      console.warn("API createProductionTask fallback to local state:", e);
    }

    setProductionTasks(prev => [newTask, ...prev]);
    return newTask;
  };

  const updateProductionTask = async (id, taskData) => {
    try {
      await api.updateProductionTask(id, taskData);
    } catch (e) {
      console.warn("API updateProductionTask fallback to local state:", e);
    }

    setProductionTasks(prev => prev.map(t => t.id === id ? { ...t, ...taskData } : t));
  };

  const executeTaskAction = async (id, actionData) => {
    const { action, notes = '', reworkQty = 0, rejectedQty = 0, completedQty = 0 } = actionData;
    const now = new Date();
    const nowIso = now.toISOString();
    const timeFormatted = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    try {
      await api.executeTaskAction(id, {
        action,
        notes,
        loggedBy: activeUser?.name || 'Staff',
        reworkQty,
        rejectedQty,
        completedQty
      });
    } catch (e) {
      console.warn("API executeTaskAction fallback to local state:", e);
    }

    setProductionTasks(prev => prev.map(t => {
      if (t.id !== id) return t;

      let newStatus = t.status;
      let newDuration = Number(t.totalDurationMinutes || 0);
      let newStartTime = t.startTime || '';
      let newEndTime = t.endTime || '';
      let newCompletedAt = t.completedAt;
      let newCompletedBy = t.completedBy;
      let newReworkQty = Number(t.reworkQty || 0);
      let newRejectedQty = Number(t.rejectedQty || 0);
      let newCompletedNum = Number(t.completedQty || 0);
      let elapsedSecondsSegment = 0;

      const logs = t.timeLogs || [];
      const activeStartLog = [...logs].reverse().find(l => l.action === 'START' || l.action === 'RESUME');

      if (action === 'START') {
        newStatus = 'Started';
        if (!newStartTime) newStartTime = timeFormatted;
      } else if (action === 'PAUSE') {
        newStatus = 'Paused';
        if (activeStartLog && t.status !== 'Paused') {
          const startMillis = new Date(activeStartLog.timestamp).getTime();
          elapsedSecondsSegment = Math.max(0, Math.floor((now.getTime() - startMillis) / 1000));
          newDuration += Math.round(elapsedSecondsSegment / 60);
        }
      } else if (action === 'RESUME') {
        newStatus = 'Started';
      } else if (action === 'COMPLETE') {
        newStatus = 'Completed';
        newEndTime = timeFormatted;
        newCompletedAt = nowIso;
        newCompletedBy = activeUser?.name || t.employeeName;
        if (activeStartLog && t.status !== 'Paused') {
          const startMillis = new Date(activeStartLog.timestamp).getTime();
          elapsedSecondsSegment = Math.max(0, Math.floor((now.getTime() - startMillis) / 1000));
          newDuration += Math.round(elapsedSecondsSegment / 60);
        }
        if (completedQty) newCompletedNum = Number(completedQty);
        else if (newCompletedNum === 0) newCompletedNum = Number(t.quantity || 1);
      } else if (action === 'REWORK') {
        newStatus = 'Rework';
        if (reworkQty) newReworkQty += Number(reworkQty);
        if (rejectedQty) newRejectedQty += Number(rejectedQty);
      }

      const newLog = {
        id: `TL-${id}-${Date.now()}`,
        action,
        timestamp: nowIso,
        loggedBy: activeUser?.name || 'Staff',
        notes,
        elapsedSeconds: elapsedSecondsSegment
      };

      return {
        ...t,
        status: newStatus,
        startTime: newStartTime,
        endTime: newEndTime,
        totalDurationMinutes: newDuration,
        completedAt: newCompletedAt,
        completedBy: newCompletedBy,
        completedQty: newCompletedNum,
        rejectedQty: newRejectedQty,
        reworkQty: newReworkQty,
        timeLogs: [...(t.timeLogs || []), newLog]
      };
    }));
  };

  const deleteProductionTask = async (id) => {
    try {
      await api.deleteProductionTask(id);
    } catch (e) {
      console.warn("API deleteProductionTask fallback to local state:", e);
    }

    setProductionTasks(prev => prev.filter(t => t.id !== id));
  };

  const takeProductionTask = async (taskId) => {
    try {
      const res = await api.takeProductionTask(taskId);
      if (res && res.success) {
        if (res.task) {
          setProductionTasks(prev => {
            const exists = prev.some(t => t.id === res.task.id);
            if (exists) return prev.map(t => t.id === res.task.id ? res.task : t);
            return [res.task, ...prev];
          });
        }
        fetchAllERPData();
        return res;
      }
      return res;
    } catch (err) {
      console.error("takeProductionTask error:", err);
      throw err;
    }
  };

  const takeJobOrderItem = async (itemData) => {
    try {
      const res = await api.takeJobOrderItem(itemData);
      if (res && res.success) {
        if (res.task) {
          setProductionTasks(prev => {
            const exists = prev.some(t => t.id === res.task.id);
            if (exists) return prev.map(t => t.id === res.task.id ? res.task : t);
            return [res.task, ...prev];
          });
        }
        fetchAllERPData();
        return res;
      }
      return res;
    } catch (err) {
      console.error("takeJobOrderItem error:", err);
      throw err;
    }
  };

  const reassignProductionTask = async (taskId, reassignData) => {
    try {
      const res = await api.reassignProductionTask(taskId, reassignData);
      if (res && res.success) {
        if (res.task) {
          setProductionTasks(prev => prev.map(t => t.id === res.task.id ? res.task : t));
        }
        fetchAllERPData();
        return res;
      }
      return res;
    } catch (err) {
      console.error("reassignProductionTask error:", err);
      throw err;
    }
  };

  const fetchOrderArtwork = async (orderId) => {
    return await api.fetchOrderArtwork(orderId);
  };

  const uploadArtwork = async (orderId, artworkData) => {
    const res = await api.createOrderArtwork(orderId, artworkData);
    await fetchAllERPData();
    return res;
  };

  const approveArtwork = async (versionId, approvalData) => {
    const res = await api.approveArtwork(versionId, approvalData);
    await fetchAllERPData();
    return res;
  };

  const fetchDeliveries = async (filters = {}) => {
    const res = await api.fetchDeliveries(filters);
    if (res && res.success) {
      setDeliveries(res.deliveries || []);
    }
    return res;
  };

  const createDelivery = async (deliveryData) => {
    const res = await api.createDelivery(deliveryData);
    await fetchAllERPData();
    return res;
  };

  const fetchCustomerReconciliation = async () => {
    const res = await api.fetchCustomerReconciliation();
    if (res && res.success) {
      setReconciliationData(res.reconciliation || []);
    }
    return res;
  };

  const fetchBackups = async () => {
    const res = await api.fetchBackups();
    if (res && res.success) {
      setBackups(res.backups || []);
    }
    return res;
  };

  const createBackup = async () => {
    const res = await api.createBackup();
    await fetchBackups();
    return res;
  };

  return (
    <ERPContext.Provider
      value={{
        session,
        loading,
        companyProfile,
        setCompanyProfile,
        updateCompanyProfile,
        companyBankAccounts,
        setCompanyBankAccounts,
        activeRole,
        activeUser,
        switchUser,
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
        machines,
        setMachines,
        addMachine,
        updateMachine,
        deleteMachine,
        workflows,
        setWorkflows,
        addWorkflow,
        updateWorkflow,
        deleteWorkflow,
        wastageRecords,
        setWastageRecords,
        updateJobOrderStage,
        updateJobWastage,
        updateJobCosting,
        assignJobMachineAndOperator,
        productionProcesses,
        setProductionProcesses,
        productionTasks,
        setProductionTasks,
        addProductionProcess,
        updateProductionProcess,
        deleteProductionProcess,
        createProductionTask,
        updateProductionTask,
        executeTaskAction,
        deleteProductionTask,
        takeProductionTask,
        takeJobOrderItem,
        reassignProductionTask,
        globalSearchQuery,
        setGlobalSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        isFollowUpsOpen,
        setIsFollowUpsOpen,
        resetDemoData,
        loginAsDemoAdmin,
        expenses,
        setExpenses,
        addExpense,
        removeExpense,
        inventoryTransactions,
        addInventoryTransaction,
        reworkTickets,
        addReworkTicket,
        auditLogs,
        usersList,
        realtimeConnected,
        commitPayroll,
        loginWithCredentials,
        logoutUser,
        deliveries,
        fetchDeliveries,
        createDelivery,
        fetchOrderArtwork,
        uploadArtwork,
        approveArtwork,
        reconciliationData,
        fetchCustomerReconciliation,
        backups,
        fetchBackups,
        createBackup
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
