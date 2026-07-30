import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
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
  initialPayroll
} from '../data/mockData';
import { USER_ROLES, PRODUCTION_STATUS } from '../types';

const ERPContext = createContext();

export const ERPProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // States mirroring database tables
  const [companyProfile, setCompanyProfile] = useState(initialCompanyProfile);
  const [companyBankAccounts, setCompanyBankAccounts] = useState([]);
  const [activeRole, setActiveRole] = useState(USER_ROLES.ADMIN);
  const [activeUser, setActiveUser] = useState({ name: 'Admin User', role: USER_ROLES.ADMIN });
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [designers, setDesigners] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [careOfPersons, setCareOfPersons] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [followUps, setFollowUps] = useState([]);

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
        .single();
      
      if (data) {
        setActiveRole(data.role || USER_ROLES.ADMIN);
        setActiveUser({ name: data.name || data.email.split('@')[0], role: data.role || USER_ROLES.ADMIN });
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  // Fetch all ERP data from Supabase PostgreSQL database
  const fetchAllERPData = async () => {
    try {
      // 1. Company Profile
      const { data: compProfile } = await supabase.from('company_profile').select('*');
      if (compProfile && compProfile.length > 0) {
        const p = compProfile[0];
        setCompanyProfile({
          name: p.name,
          tagline: p.tagline,
          gstin: p.gstin,
          state: p.state,
          stateCode: p.state_code,
          phone: p.phone,
          email: p.email,
          website: p.website,
          address: p.address,
          bankDetails: {
            bankName: p.bank_name,
            accountName: p.account_name,
            accountNo: p.account_no,
            ifsc: p.ifsc,
            branch: p.branch,
            upiId: p.upi_id
          },
          terms: p.terms
        });
      }

      // 2. Bank Accounts
      const { data: banks } = await supabase.from('bank_accounts').select('*');
      setCompanyBankAccounts(banks || []);

      // 3. Customers
      const { data: custs } = await supabase.from('customers').select('*').order('name', { ascending: true });
      setCustomers(custs || []);

      // 4. Sales Persons
      const { data: sps } = await supabase.from('sales_persons').select('*').order('name', { ascending: true });
      setSalesPersons(sps || []);

      // 5. Care Of Persons
      const { data: cops } = await supabase.from('care_of_persons').select('*').order('name', { ascending: true });
      setCareOfPersons(cops || []);

      // 6. Workers
      const { data: wrks } = await supabase.from('workers').select('*').order('name', { ascending: true });
      setWorkers(wrks || []);

      // 7. Designers
      const { data: dsgs } = await supabase.from('designers').select('*').order('name', { ascending: true });
      setDesigners(dsgs || []);

      // 8. Vendors
      const { data: vends } = await supabase.from('vendors').select('*').order('name', { ascending: true });
      setVendors(vends || []);

      // 9. Products
      const { data: prods } = await supabase.from('products').select('*').order('name', { ascending: true });
      setProducts((prods || []).map(p => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        defaultRate: p.default_rate,
        estimatedCost: p.estimated_cost,
        gstRate: p.gst_rate,
        hsnCode: p.hsn_code,
        category: p.category,
        defaultVendor: p.default_vendor,
        defaultMaterial: p.default_material,
        isCustom: p.is_custom
      })));

      // 10. Sales Orders with Items
      const { data: orders } = await supabase.from('sales_orders').select('*').order('created_at', { ascending: false });
      const { data: items } = await supabase.from('sales_order_items').select('*');

      const mappedOrders = (orders || []).map(o => {
        const orderItems = (items || [])
          .filter(i => i.order_id === o.id)
          .map(i => ({
            id: i.id,
            productName: i.product_name,
            category: i.category,
            description: i.description,
            width: i.width,
            height: i.height,
            unit: i.unit,
            qty: i.qty,
            totalSqFt: i.total_sq_ft,
            material: i.material,
            designerRequired: i.designer_required,
            designerId: i.designer_id,
            designerName: i.designer_name,
            artworkStatus: i.artwork_status,
            artworkUrl: i.artwork_url,
            outsource: i.outsource,
            vendorId: i.vendor_id,
            vendorName: i.vendor_name,
            estimatedVendorCost: i.estimated_vendor_cost,
            actualVendorBill: i.actual_vendor_bill,
            vendorBillDate: i.vendor_bill_date,
            vendorPaymentStatus: i.vendor_payment_status,
            estimatedCost: i.estimated_cost,
            actualCost: i.actual_cost,
            sellingRate: i.selling_rate,
            discount: i.discount,
            taxType: i.tax_type,
            gstRate: i.gst_rate,
            amount: i.amount,
            productionStatus: i.production_status,
            jobCardId: i.job_card_id,
            internalEstOutsourceCost: i.internal_est_outsource_cost
          }));

        return {
          id: o.id,
          orderDate: o.order_date,
          deliveryDate: o.delivery_date,
          customerId: o.customer_id,
          customerName: o.customer_name,
          customerMobile: o.customer_mobile,
          customerState: o.customer_state,
          salesPersonId: o.sales_person_id,
          salesPersonName: o.sales_person_name,
          careOfId: o.care_of_id,
          careOfName: o.care_of_name,
          branch: o.branch,
          orderSource: o.order_source,
          referenceNo: o.reference_no,
          remarks: o.remarks,
          subtotal: o.subtotal,
          cgst: o.cgst,
          sgst: o.sgst,
          igst: o.igst,
          roundOff: o.round_off,
          grandTotal: o.grand_total,
          totalEstimatedCost: o.total_estimated_cost,
          totalActualCost: o.total_actual_cost,
          totalInternalEstOutsourceCost: o.total_internal_est_outsource_cost,
          grossProfit: o.gross_profit,
          profitMarginPct: o.profit_margin_pct,
          advanceAmount: o.advance_amount,
          balanceAmount: o.balance_amount,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          productionStatus: o.production_status,
          deliveryMode: o.delivery_mode,
          deliveredBy: o.delivered_by,
          signatureUrl: o.signature_url,
          createdAt: o.created_at,
          editHistory: o.edit_history || [],
          whatsAppOpened: o.whats_app_opened,
          lastWhatsAppDate: o.last_whats_app_date,
          lastWhatsAppTime: o.last_whats_app_time,
          whatsAppSentBy: o.whats_app_sent_by,
          items: orderItems
        };
      });
      setSalesOrders(mappedOrders);

      // 11. Inventory
      const { data: inv } = await supabase.from('inventory').select('*').order('name', { ascending: true });
      setInventory((inv || []).map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        currentStock: i.current_stock,
        unit: i.unit,
        reorderLevel: i.reorder_level,
        unitCost: i.unit_cost
      })));

      // 12. Purchase Orders
      const { data: po } = await supabase.from('purchase_orders').select('*').order('id', { ascending: false });
      setPurchaseOrders((po || []).map(p => ({
        id: p.id,
        vendorName: p.vendor_name,
        orderDate: p.order_date,
        items: p.items,
        amount: p.amount,
        status: p.status
      })));

      // 13. Customer Payments
      const { data: pay } = await supabase.from('payments').select('*').order('date', { ascending: false });
      setPayments((pay || []).map(p => ({
        id: p.id,
        date: p.date,
        orderId: p.order_id,
        customerName: p.customer_name,
        amount: p.amount,
        method: p.method,
        refNo: p.ref_no,
        status: p.status,
        bankAccountId: p.bank_account_id,
        bankAccountName: p.bank_account_name,
        recordedBy: p.recorded_by
      })));

      // 14. Follow-ups
      const { data: follows } = await supabase.from('follow_ups').select('*').order('due_date', { ascending: true });
      setFollowUps((follows || []).map(f => ({
        id: f.id,
        type: f.type,
        orderId: f.order_id,
        customerName: f.customer_name,
        amount: f.amount,
        dueDate: f.due_date,
        careOf: f.care_of,
        status: f.status
      })));

      // 15. Attendance
      const { data: att } = await supabase.from('attendance').select('*').order('date', { ascending: false });
      setAttendanceRecords((att || []).map(a => ({
        id: a.id,
        date: a.date,
        staffId: a.staff_id,
        staffName: a.staff_name,
        type: a.type,
        status: a.status,
        otHours: a.ot_hours,
        notes: a.notes
      })));

      // 16. Payroll
      const { data: payr } = await supabase.from('payroll').select('*').order('month', { ascending: false });
      setPayrollRecords((payr || []).map(p => ({
        id: p.id,
        month: p.month,
        staffId: p.staff_id,
        staffName: p.staff_name,
        role: p.role,
        baseSalary: p.base_salary,
        workingDays: p.working_days,
        daysPresent: p.days_present,
        earnedBasePay: p.earned_base_pay,
        otHours: p.ot_hours,
        otPay: p.ot_pay,
        incentiveEarned: p.incentive_earned,
        advanceDeduction: p.advance_deduction,
        lateDeduction: p.late_deduction,
        netSalary: p.net_salary,
        status: p.status,
        paidDate: p.paid_date,
        paymentMode: p.payment_mode
      })));

    } catch (err) {
      console.error("Error loading ERP database data:", err);
    }
  };

  // Auth Session state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchAllERPData();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
        fetchAllERPData();
      } else {
        // Reset states on logout
        setCompanyBankAccounts([]);
        setCustomers([]);
        setSalesOrders([]);
        setProducts([]);
        setVendors([]);
        setDesigners([]);
        setSalesPersons([]);
        setCareOfPersons([]);
        setWorkers([]);
        setAttendanceRecords([]);
        setPayrollRecords([]);
        setInventory([]);
        setPurchaseOrders([]);
        setPayments([]);
        setFollowUps([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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

  // Add Customer
  const addCustomer = async (customerData) => {
    const newId = `CUST-${100 + customers.length + 1}`;
    const newCode = customerData.code || `${customerData.name.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const newCustomer = {
      id: newId,
      code: newCode,
      name: customerData.name,
      mobile: customerData.mobile,
      email: customerData.email || '',
      gstin: customerData.gstin || '',
      type: customerData.type || 'Walk-in',
      address: customerData.address || '',
      state: customerData.state || 'Maharashtra (27)',
      credit_limit: parseFloat(customerData.creditLimit) || 0,
      outstanding: 0,
      total_orders: 0,
      created_at: new Date().toISOString().split('T')[0]
    };

    try {
      const { error } = await supabase.from('customers').insert(newCustomer);
      if (error) throw error;
      
      // Update UI state
      const uiCustomer = {
        ...newCustomer,
        creditLimit: newCustomer.credit_limit,
        totalOrders: newCustomer.total_orders,
        createdAt: newCustomer.created_at
      };
      setCustomers((prev) => [uiCustomer, ...prev]);
      return uiCustomer;
    } catch (err) {
      console.error("Error creating customer in database:", err);
    }
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

    try {
      const { error } = await supabase.from('care_of_persons').insert(newCareOf);
      if (error) throw error;

      const uiCareOf = {
        ...newCareOf,
        referralCommissionPct: newCareOf.referral_commission_pct,
        totalReferredSales: newCareOf.total_referred_sales,
        activeOrders: newCareOf.active_orders
      };
      setCareOfPersons((prev) => [uiCareOf, ...prev]);
      return uiCareOf;
    } catch (err) {
      console.error("Error adding CareOf in database:", err);
    }
  };

  const updateCareOfPerson = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.referralCommissionPct !== undefined) {
      dbUpdate.referral_commission_pct = updatedData.referralCommissionPct;
      delete dbUpdate.referralCommissionPct;
    }
    if (updatedData.totalReferredSales !== undefined) {
      dbUpdate.total_referred_sales = updatedData.totalReferredSales;
      delete dbUpdate.totalReferredSales;
    }
    if (updatedData.activeOrders !== undefined) {
      dbUpdate.active_orders = updatedData.activeOrders;
      delete dbUpdate.activeOrders;
    }

    try {
      const { error } = await supabase.from('care_of_persons').update(dbUpdate).eq('id', id);
      if (error) throw error;

      setCareOfPersons((prev) =>
        prev.map((co) => (co.id === id ? { ...co, ...updatedData } : co))
      );
    } catch (err) {
      console.error("Error updating CareOf in database:", err);
    }
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

    try {
      const { error } = await supabase.from('workers').insert(newWorker);
      if (error) throw error;

      const uiWorker = {
        ...newWorker,
        incentivePerSqFt: newWorker.incentive_per_sq_ft,
        incentivePerJob: newWorker.incentive_per_job,
        jobsCompletedThisMonth: newWorker.jobs_completed_this_month,
        sqFtHandledThisMonth: newWorker.sq_ft_handled_this_month
      };
      setWorkers((prev) => [uiWorker, ...prev]);
      return uiWorker;
    } catch (err) {
      console.error("Error adding worker to database:", err);
    }
  };

  const updateWorker = async (id, updatedData) => {
    const dbUpdate = { ...updatedData };
    if (updatedData.incentivePerSqFt !== undefined) {
      dbUpdate.incentive_per_sq_ft = updatedData.incentivePerSqFt;
      delete dbUpdate.incentivePerSqFt;
    }
    if (updatedData.incentivePerJob !== undefined) {
      dbUpdate.incentive_per_job = updatedData.incentivePerJob;
      delete dbUpdate.incentivePerJob;
    }
    if (updatedData.jobsCompletedThisMonth !== undefined) {
      dbUpdate.jobs_completed_this_month = updatedData.jobsCompletedThisMonth;
      delete dbUpdate.jobsCompletedThisMonth;
    }
    if (updatedData.sqFtHandledThisMonth !== undefined) {
      dbUpdate.sq_ft_handled_this_month = updatedData.sqFtHandledThisMonth;
      delete dbUpdate.sqFtHandledThisMonth;
    }

    try {
      const { error } = await supabase.from('workers').update(dbUpdate).eq('id', id);
      if (error) throw error;

      setWorkers((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updatedData } : w))
      );
    } catch (err) {
      console.error("Error updating worker in database:", err);
    }
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
    const existingIdx = attendanceRecords.findIndex((a) => a.date === attData.date && a.staffId === attData.staffId);
    const dbRecord = {
      date: attData.date,
      staff_id: attData.staffId,
      staff_name: attData.staffName,
      type: attData.type,
      status: attData.status,
      ot_hours: parseFloat(attData.otHours) || 0,
      notes: attData.notes || ''
    };

    try {
      if (existingIdx >= 0) {
        const id = attendanceRecords[existingIdx].id;
        const { error } = await supabase.from('attendance').update(dbRecord).eq('id', id);
        if (error) throw error;

        setAttendanceRecords((prev) => {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], ...attData };
          return updated;
        });
      } else {
        const newId = `ATT-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        const { error } = await supabase.from('attendance').insert({ id: newId, ...dbRecord });
        if (error) throw error;

        setAttendanceRecords((prev) => [{ id: newId, ...attData }, ...prev]);
      }
    } catch (err) {
      console.error("Error logging attendance in database:", err);
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

  // Create Sales Order in Supabase
  const createSalesOrder = async (orderPayload) => {
    const newOrderId = getNextOrderId();
    const { processedOrder, balance, advance } = processOrderData(orderPayload);

    const dbOrder = {
      id: newOrderId,
      order_date: processedOrder.orderDate || new Date().toISOString().split('T')[0],
      delivery_date: processedOrder.deliveryDate,
      customer_id: processedOrder.customerId,
      customer_name: processedOrder.customerName,
      customer_mobile: processedOrder.customerMobile,
      customer_state: processedOrder.customerState,
      sales_person_id: processedOrder.salesPersonId,
      sales_person_name: processedOrder.salesPersonName,
      care_of_id: processedOrder.careOfId,
      care_of_name: processedOrder.careOfName,
      branch: processedOrder.branch,
      order_source: processedOrder.orderSource,
      reference_no: processedOrder.referenceNo,
      remarks: processedOrder.remarks,
      subtotal: processedOrder.subtotal,
      cgst: processedOrder.cgst,
      sgst: processedOrder.sgst,
      igst: processedOrder.igst,
      round_off: processedOrder.roundOff,
      grand_total: processedOrder.grandTotal,
      total_estimated_cost: processedOrder.totalEstimatedCost,
      total_actual_cost: processedOrder.totalActualCost,
      total_internal_est_outsource_cost: processedOrder.totalInternalEstOutsourceCost,
      gross_profit: processedOrder.grossProfit,
      profit_margin_pct: processedOrder.profitMarginPct,
      advance_amount: processedOrder.advanceAmount,
      balance_amount: processedOrder.balanceAmount,
      payment_method: processedOrder.paymentMethod,
      payment_status: processedOrder.paymentStatus,
      production_status: PRODUCTION_STATUS.NEW,
      delivery_mode: processedOrder.deliveryMode,
      delivered_by: processedOrder.delivered_by,
      signature_url: processedOrder.signatureUrl,
      created_at: new Date().toISOString()
    };

    try {
      // 1. Insert Sales Order
      const { error: orderErr } = await supabase.from('sales_orders').insert(dbOrder);
      if (orderErr) throw orderErr;

      // 2. Insert Order Line Items
      const dbItems = processedOrder.items.map(i => ({
        id: i.id,
        order_id: newOrderId,
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
        production_status: i.productionStatus,
        job_card_id: i.jobCardId,
        internal_est_outsource_cost: i.internalEstOutsourceCost
      }));

      const { error: itemsErr } = await supabase.from('sales_order_items').insert(dbItems);
      if (itemsErr) throw itemsErr;

      // 3. Update Customer Outstanding Balance
      const currentCustomer = customers.find(c => c.id === processedOrder.customerId);
      const newOutstanding = (currentCustomer?.outstanding || 0) + balance;
      const newTotalOrders = (currentCustomer?.totalOrders || 0) + 1;
      
      await supabase
        .from('customers')
        .update({ outstanding: newOutstanding, total_orders: newTotalOrders })
        .eq('id', processedOrder.customerId);

      // 4. Log Payment if Advance > 0
      if (advance > 0) {
        const payId = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
        const newPay = {
          id: payId,
          date: new Date().toISOString().split('T')[0],
          order_id: newOrderId,
          customer_name: processedOrder.customerName,
          amount: advance,
          method: processedOrder.paymentMethod || 'Cash',
          ref_no: `ADV-${newOrderId}`,
          status: 'Verified'
        };
        await supabase.from('payments').insert(newPay);
        setPayments((prev) => [newPay, ...prev]);
      }

      // Refresh UI state
      const finalOrder = {
        ...processedOrder,
        id: newOrderId,
        productionStatus: PRODUCTION_STATUS.NEW,
        createdAt: dbOrder.created_at
      };

      setSalesOrders((prev) => [finalOrder, ...prev]);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === processedOrder.customerId
            ? { ...c, totalOrders: newTotalOrders, outstanding: newOutstanding }
            : c
        )
      );

      return finalOrder;
    } catch (err) {
      console.error("Error creating sales order in database:", err);
    }
  };

  // Edit / Revise Sales Order
  const updateSalesOrder = async (orderId, updatedOrderPayload) => {
    let oldBalance = 0;
    let customerId = updatedOrderPayload.customerId;
    const existing = salesOrders.find((o) => o.id === orderId);

    if (existing) {
      oldBalance = existing.balanceAmount || 0;
      customerId = existing.customerId || updatedOrderPayload.customerId;
    }

    const { processedOrder, balance } = processOrderData(updatedOrderPayload, orderId);
    
    // Generate Audit Trail Logs
    const changeLogs = [];
    if (existing) {
      if (existing.subtotal !== processedOrder.subtotal) changeLogs.push(`Subtotal updated to ₹${processedOrder.subtotal}`);
      if (existing.grandTotal !== processedOrder.grandTotal) changeLogs.push(`Grand Total changed to ₹${processedOrder.grandTotal}`);
      if (existing.advanceAmount !== processedOrder.advanceAmount) changeLogs.push(`Advance updated to ₹${processedOrder.advanceAmount}`);
      if (existing.taxMode !== updatedOrderPayload.taxMode) changeLogs.push(`Tax mode: '${updatedOrderPayload.taxMode}'`);
      if (changeLogs.length === 0) changeLogs.push(`Order remarks updated`);
    }

    const auditEntry = {
      id: `AUDIT-${Date.now()}`,
      editedBy: activeUser?.name || 'Authorized Staff',
      role: activeRole || 'Admin',
      editedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      summary: changeLogs.join(' | ')
    };

    const existingHistory = existing?.editHistory || [];
    const updatedHistory = [auditEntry, ...existingHistory];

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
      branch: processedOrder.branch,
      order_source: processedOrder.orderSource,
      reference_no: processedOrder.referenceNo,
      remarks: processedOrder.remarks,
      subtotal: processedOrder.subtotal,
      cgst: processedOrder.cgst,
      sgst: processedOrder.sgst,
      igst: processedOrder.igst,
      round_off: processedOrder.roundOff,
      grand_total: processedOrder.grandTotal,
      total_estimated_cost: processedOrder.totalEstimatedCost,
      total_actual_cost: processedOrder.totalActualCost,
      total_internal_est_outsource_cost: processedOrder.totalInternalEstOutsourceCost,
      gross_profit: processedOrder.grossProfit,
      profit_margin_pct: processedOrder.profitMarginPct,
      advance_amount: processedOrder.advanceAmount,
      balance_amount: processedOrder.balanceAmount,
      payment_method: processedOrder.paymentMethod,
      payment_status: processedOrder.paymentStatus,
      delivery_mode: processedOrder.deliveryMode,
      delivered_by: processedOrder.delivered_by,
      signature_url: processedOrder.signatureUrl,
      edit_history: updatedHistory
    };

    try {
      // 1. Update order meta
      const { error: orderErr } = await supabase.from('sales_orders').update(dbOrder).eq('id', orderId);
      if (orderErr) throw orderErr;

      // 2. Delete old items & insert new ones
      await supabase.from('sales_order_items').delete().eq('order_id', orderId);
      
      const dbItems = processedOrder.items.map(i => ({
        id: i.id,
        order_id: orderId,
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
        production_status: i.productionStatus,
        job_card_id: i.jobCardId,
        internal_est_outsource_cost: i.internalEstOutsourceCost
      }));
      const { error: itemsErr } = await supabase.from('sales_order_items').insert(dbItems);
      if (itemsErr) throw itemsErr;

      // 3. Update Customer outstanding difference
      const balanceDiff = balance - oldBalance;
      if (balanceDiff !== 0) {
        const currentCustomer = customers.find(c => c.id === customerId);
        const newOutstanding = Math.max(0, (currentCustomer?.outstanding || 0) + balanceDiff);
        await supabase.from('customers').update({ outstanding: newOutstanding }).eq('id', customerId);
        
        setCustomers((prev) =>
          prev.map((c) => (c.id === customerId ? { ...c, outstanding: newOutstanding } : c))
        );
      }

      setSalesOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...existing,
                ...processedOrder,
                editHistory: updatedHistory,
                lastEditedBy: activeUser?.name || 'Authorized Staff',
                lastEditedAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
              }
            : o
        )
      );
    } catch (err) {
      console.error("Error updating sales order:", err);
    }
  };

  // Update Outsource Vendor Bill
  const updateVendorBill = async (orderId, itemId, actualVendorBill, billDate, paymentStatus) => {
    const order = salesOrders.find(o => o.id === orderId);
    if (!order) return;

    let newTotalActCost = 0;
    const updatedItems = order.items.map((item) => {
      if (item.id === itemId) {
        const billAmt = parseFloat(actualVendorBill) || 0;
        newTotalActCost += billAmt;
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

    try {
      // 1. Update line item bill info
      const billAmt = parseFloat(actualVendorBill) || 0;
      const { error: itemErr } = await supabase
        .from('sales_order_items')
        .update({
          actual_vendor_bill: billAmt,
          actual_cost: billAmt,
          vendor_bill_date: billDate,
          vendor_payment_status: paymentStatus
        })
        .eq('id', itemId);

      if (itemErr) throw itemErr;

      // 2. Update order total actual costing and profits
      const { error: orderErr } = await supabase
        .from('sales_orders')
        .update({
          total_actual_cost: newTotalActCost,
          gross_profit: grossProfit,
          profit_margin_pct: profitMarginPct
        })
        .eq('id', orderId);

      if (orderErr) throw orderErr;

      // 3. Log a record into supplier bills table
      const billId = `BILL-${Math.floor(10000 + Math.random() * 90000)}`;
      await supabase.from('supplier_bills').insert({
        id: billId,
        vendor_id: order.items.find(i => i.id === itemId)?.vendorId,
        vendor_name: order.items.find(i => i.id === itemId)?.vendorName,
        bill_no: `VEN-SO-BILL-${orderId}-${itemId.split('-').pop()}`,
        bill_date: billDate,
        amount: billAmt,
        grand_total: billAmt,
        payment_status: paymentStatus,
        order_id: orderId,
        item_id: itemId
      });

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
    } catch (err) {
      console.error("Error updating vendor bill:", err);
    }
  };

  // Update Line Item Production Status
  const updateItemProductionStatus = async (orderId, itemId, newStatus) => {
    const order = salesOrders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map((it) =>
      it.id === itemId ? { ...it, productionStatus: newStatus } : it
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

    try {
      const { error: itemErr } = await supabase
        .from('sales_order_items')
        .update({ production_status: newStatus })
        .eq('id', itemId);

      if (itemErr) throw itemErr;

      const { error: orderErr } = await supabase
        .from('sales_orders')
        .update({ production_status: overallStatus })
        .eq('id', orderId);

      if (orderErr) throw orderErr;

      setSalesOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, items: updatedItems, productionStatus: overallStatus }
            : o
        )
      );
    } catch (err) {
      console.error("Error updating item production status:", err);
    }
  };

  // Update Overall Order Production Status
  const updateProductionStatus = async (orderId, newStatus) => {
    try {
      const { error: orderErr } = await supabase
        .from('sales_orders')
        .update({ production_status: newStatus })
        .eq('id', orderId);
      if (orderErr) throw orderErr;

      const { error: itemErr } = await supabase
        .from('sales_order_items')
        .update({ production_status: newStatus })
        .eq('order_id', orderId);
      if (itemErr) throw itemErr;

      setSalesOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const updatedItems = o.items.map((it) => ({ ...it, productionStatus: newStatus }));
          return { ...o, productionStatus: newStatus, items: updatedItems };
        })
      );
    } catch (err) {
      console.error("Error updating production status:", err);
    }
  };

  // Update Artwork Proof Status
  const updateArtworkStatus = async (orderId, itemId, status, artworkUrl = '') => {
    try {
      const { error } = await supabase
        .from('sales_order_items')
        .update({
          artwork_status: status,
          artwork_url: artworkUrl
        })
        .eq('id', itemId);
      
      if (error) throw error;

      setSalesOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          const updatedItems = o.items.map((it) => {
            if (it.id === itemId) {
              return { ...it, artworkStatus: status, artworkUrl: artworkUrl || it.artworkUrl };
            }
            return it;
          });
          return { ...o, items: updatedItems };
        })
      );
    } catch (err) {
      console.error("Error updating artwork status:", err);
    }
  };

  // Track WhatsApp clicks
  const trackWhatsAppSent = async (orderId) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const sender = activeUser?.name || 'Authorized Staff';

    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({
          whats_app_opened: 'Yes',
          last_whats_app_date: dateStr,
          last_whats_app_time: timeStr,
          whats_app_sent_by: sender
        })
        .eq('id', orderId);

      if (error) throw error;

      setSalesOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                whatsAppOpened: 'Yes',
                lastWhatsAppDate: dateStr,
                lastWhatsAppTime: timeStr,
                whatsAppSentBy: sender
              }
            : o
        )
      );
    } catch (err) {
      console.error("Error tracking WhatsApp dispatch:", err);
    }
  };

  // Record Customer Payment Received
  const recordPayment = async (orderId, amount, method, refNo, bankAccountId = '', bankAccountName = '') => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    const defaultBank = companyBankAccounts[0]?.bankName || 'HDFC Bank Ltd (Primary Current A/c)';
    const selectedBankName = bankAccountName || (method.includes('Bank') || method.includes('UPI') || method.includes('Card') || method.includes('Cheque') ? defaultBank : 'Cash Counter');

    const order = salesOrders.find(o => o.id === orderId);
    if (!order) return;

    const newAdvance = order.advanceAmount + amt;
    const newBalance = Math.max(0, order.grandTotal - newAdvance);
    let newPayStatus = 'Pending';
    if (newBalance === 0) newPayStatus = 'Paid';
    else if (newAdvance > 0) newPayStatus = 'Partial';

    try {
      // 1. Update order payment status
      const { error: orderErr } = await supabase
        .from('sales_orders')
        .update({
          advance_amount: newAdvance,
          balance_amount: newBalance,
          payment_status: newPayStatus
        })
        .eq('id', orderId);

      if (orderErr) throw orderErr;

      // 2. Update Customer outstanding balance
      const customer = customers.find(c => c.id === order.customerId);
      const newOutstanding = Math.max(0, (customer?.outstanding || 0) - amt);
      await supabase.from('customers').update({ outstanding: newOutstanding }).eq('id', order.customerId);

      // 3. Log Payment Voucher
      const payId = `PAY-${Math.floor(1000 + Math.random() * 9000)}`;
      const payVoucher = {
        id: payId,
        date: new Date().toISOString().split('T')[0],
        order_id: orderId,
        customer_name: order.customerName || 'Customer',
        amount: amt,
        method,
        ref_no: refNo,
        status: 'Verified',
        bank_account_id: bankAccountId || null,
        bank_account_name: selectedBankName,
        recorded_by: activeUser?.name || 'Authorized Staff'
      };

      const { error: payErr } = await supabase.from('payments').insert(payVoucher);
      if (payErr) throw payErr;

      setSalesOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                advanceAmount: newAdvance,
                balanceAmount: newBalance,
                paymentStatus: newPayStatus,
                bankAccountId: bankAccountId || o.bankAccountId,
                bankAccountName: selectedBankName || o.bankAccountName
              }
            : o
        )
      );

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === order.customerId ? { ...c, outstanding: newOutstanding } : c
        )
      );

      setPayments((prev) => [payVoucher, ...prev]);
    } catch (err) {
      console.error("Error recording customer payment:", err);
    }
  };

  // Save Delivery Signature
  const saveDeliverySignature = async (orderId, signatureUrl, deliveredBy) => {
    try {
      const { error } = await supabase
        .from('sales_orders')
        .update({
          signature_url: signatureUrl,
          delivered_by: deliveredBy,
          production_status: PRODUCTION_STATUS.DELIVERED
        })
        .eq('id', orderId);

      if (error) throw error;

      setSalesOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                signatureUrl,
                deliveredBy,
                productionStatus: PRODUCTION_STATUS.DELIVERED
              }
            : o
        )
      );
    } catch (err) {
      console.error("Error saving delivery signature:", err);
    }
  };

  // Reset demo data: clear all database tables and insert initial mock records
  const resetDemoData = async () => {
    try {
      setLoading(true);
      
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
        salesOrders,
        createSalesOrder,
        updateSalesOrder,
        updateVendorBill,
        updateProductionStatus,
        updateItemProductionStatus,
        updateArtworkStatus,
        recordPayment,
        trackWhatsAppSent,
        saveDeliverySignature,
        products,
        setProducts,
        vendors,
        setVendors,
        designers,
        setDesigners,
        salesPersons,
        addSalesPerson,
        careOfPersons,
        addCareOfPerson,
        updateCareOfPerson,
        workers,
        setWorkers,
        addWorker,
        updateWorker,
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
        globalSearchQuery,
        setGlobalSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        isFollowUpsOpen,
        setIsFollowUpsOpen,
        resetDemoData
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => useContext(ERPContext);
