import React, { useState, useMemo } from 'react';
import { useERP } from '../context/ERPContext';
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  Building2,
  DollarSign,
  Package,
  Factory,
  Palette,
  FileText,
  Truck,
  Boxes,
  Briefcase,
  Grid,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { filterSalesOrders, groupOrdersBy, formatINR, exportToCSV, printReportPDF } from '../utils/reportEngine';
import { ReportFilterBar } from '../components/reports/ReportFilterBar';
import { BarChartWidget, DonutChartWidget, TrendLineWidget } from '../components/reports/ReportCharts';
import { PivotReportView } from '../components/reports/PivotReportView';
import { EmailScheduleModal } from '../components/modals/EmailScheduleModal';

export const ReportsView = () => {
  const { companyProfile, salesOrders, customers, salesPersons, careOfPersons, workers, vendors, products, inventory, designers, payments } = useERP();

  // Active Category & Sub-Report State
  const [activeCategory, setActiveCategory] = useState('INCENTIVES');
  const [activeSubReport, setActiveSubReport] = useState('SALES_INCENTIVES');

  // Filter Bar State
  const [filters, setFilters] = useState({
    datePreset: 'ALL',
    startDate: '',
    endDate: '',
    customerId: '',
    salesPersonId: '',
    careOfId: '',
    vendorId: '',
    productId: '',
    productionStatus: '',
    paymentStatus: '',
    gstType: '',
    searchQuery: ''
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Email & Schedule Modal State
  const [emailModalState, setEmailModalState] = useState({ isOpen: false, mode: 'email' });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      datePreset: 'ALL',
      startDate: '',
      endDate: '',
      customerId: '',
      salesPersonId: '',
      careOfId: '',
      vendorId: '',
      productId: '',
      productionStatus: '',
      paymentStatus: '',
      gstType: '',
      searchQuery: ''
    });
    setCurrentPage(1);
  };

  // Filtered Orders Pipeline
  const filteredOrders = useMemo(() => {
    return filterSalesOrders(salesOrders, filters);
  }, [salesOrders, filters]);

  // Categories Definition
  const reportCategories = [
    { id: 'INCENTIVES', label: 'Incentive Reports', icon: Award, count: 3 },
    { id: 'PNL', label: 'Profit & Loss (P&L)', icon: DollarSign, count: 1 },
    { id: 'PRODUCT_SALES', label: 'Product-Based Report', icon: Package, count: 1 },
    { id: 'CUSTOMER_DEBT', label: 'Customer-Based Report', icon: Users, count: 1 },
    { id: 'SALES', label: 'Sales Reports', icon: TrendingUp, count: 19 },
    { id: 'CUSTOMER', label: 'Customer Directory', icon: Users, count: 10 },
    { id: 'PRODUCT', label: 'Product Master', icon: Package, count: 9 },
    { id: 'PROFIT', label: 'Profit Analysis', icon: DollarSign, count: 11 },
    { id: 'OUTSOURCE', label: 'Outsource Reports', icon: Building2, count: 8 },
    { id: 'PRODUCTION', label: 'Production Reports', icon: Factory, count: 8 },
    { id: 'DESIGN', label: 'Design Reports', icon: Palette, count: 5 },
    { id: 'PAYMENT', label: 'Payment Reports', icon: DollarSign, count: 10 },
    { id: 'GST', label: 'GST Tax Reports', icon: FileText, count: 11 },
    { id: 'DELIVERY', label: 'Delivery Reports', icon: Truck, count: 6 },
    { id: 'INVENTORY', label: 'Inventory Reports', icon: Boxes, count: 6 },
    { id: 'EMPLOYEE', label: 'Employee Performance', icon: Briefcase, count: 7 },
    { id: 'PIVOT', label: 'Pivot Matrix', icon: Grid, count: 1 }
  ];

  // Sub-reports Map by Category
  const subReportOptions = {
    INCENTIVES: [
      { id: 'SALES_INCENTIVES', label: 'Sales Person Incentives' },
      { id: 'CAREOF_INCENTIVES', label: 'Care Of (Referred) Incentives' },
      { id: 'WORKER_INCENTIVES', label: 'Worker & Staff Production Incentives' }
    ],
    PNL: [
      { id: 'STATEMENT', label: 'Profit & Loss Statement (P&L)' }
    ],
    PRODUCT_SALES: [
      { id: 'SUMMARY', label: 'Product-Based Sales & Margin Report' }
    ],
    CUSTOMER_DEBT: [
      { id: 'SUMMARY', label: 'Customer Sales & Outstanding Debt Report' }
    ],
    SALES: [
      { id: 'DAILY', label: 'Daily Sales' },
      { id: 'WEEKLY', label: 'Weekly Sales' },
      { id: 'MONTHLY', label: 'Monthly Sales' },
      { id: 'YEARLY', label: 'Yearly Sales' },
      { id: 'BY_CUSTOMER', label: 'Sales by Customer' },
      { id: 'BY_PRODUCT', label: 'Sales by Product' },
      { id: 'BY_CATEGORY', label: 'Sales by Category' },
      { id: 'BY_SALESPERSON', label: 'Sales by Sales Person' },
      { id: 'BY_CAREOF', label: 'Sales by Care Of Person' },
      { id: 'BY_BRANCH', label: 'Sales by Branch' },
      { id: 'BY_SOURCE', label: 'Sales by Source' },
      { id: 'BY_PAYMENT_METHOD', label: 'Sales by Payment Method' },
      { id: 'BY_GST_TYPE', label: 'Sales by GST Type' },
      { id: 'CANCELLED', label: 'Cancelled Sales' },
      { id: 'PENDING_SO', label: 'Pending Sales Orders' },
      { id: 'COMPLETED_SO', label: 'Completed Sales Orders' },
      { id: 'DELIVERY_PENDING', label: 'Delivery Pending Orders' },
      { id: 'OUTSTANDING_SO', label: 'Outstanding Sales Orders' }
    ],
    CUSTOMER: [
      { id: 'LEDGER', label: 'Customer Ledger' },
      { id: 'OUTSTANDING', label: 'Customer Outstanding' },
      { id: 'PAYMENT_HISTORY', label: 'Customer Payment History' },
      { id: 'ORDER_HISTORY', label: 'Customer Order History' },
      { id: 'PROFITABILITY', label: 'Customer Profitability' },
      { id: 'TOP_CUSTOMERS', label: 'Top Customers' },
      { id: 'INACTIVE', label: 'Inactive Customers' },
      { id: 'NEW_CUSTOMERS', label: 'New Customers' },
      { id: 'CREDIT_LIMIT', label: 'Customer Credit Limit' },
      { id: 'AGEING', label: 'Customer Ageing Report' }
    ],
    PRODUCT: [
      { id: 'PRODUCT_SALES', label: 'Product Sales' },
      { id: 'MOST_SELLING', label: 'Most Selling Products' },
      { id: 'LEAST_SELLING', label: 'Least Selling Products' },
      { id: 'PRODUCT_PROFIT', label: 'Product Profit' },
      { id: 'COST_ANALYSIS', label: 'Product Cost Analysis' },
      { id: 'MARGIN', label: 'Product Margin' },
      { id: 'GST_SUMMARY', label: 'Product GST Summary' },
      { id: 'STOCK', label: 'Product Stock' },
      { id: 'MOVEMENT', label: 'Product Movement' }
    ],
    PROFIT: [
      { id: 'ESTIMATED_PROFIT', label: 'Estimated Profit' },
      { id: 'ACTUAL_PROFIT', label: 'Actual Profit' },
      { id: 'GROSS_PROFIT', label: 'Gross Profit' },
      { id: 'NET_PROFIT', label: 'Net Profit' },
      { id: 'PROFIT_BY_CUSTOMER', label: 'Profit by Customer' },
      { id: 'PROFIT_BY_PRODUCT', label: 'Profit by Product' },
      { id: 'PROFIT_BY_SALESPERSON', label: 'Profit by Sales Person' },
      { id: 'PROFIT_BY_VENDOR', label: 'Profit by Vendor' },
      { id: 'PROFIT_BY_MONTH', label: 'Profit by Month' },
      { id: 'LOSS_MAKING', label: 'Loss Making Orders' },
      { id: 'HIGH_MARGIN', label: 'High Margin Orders' }
    ],
    OUTSOURCE: [
      { id: 'VENDOR_LEDGER', label: 'Vendor Ledger' },
      { id: 'BILLS_PENDING', label: 'Vendor Bills Pending' },
      { id: 'PAYMENT_REPORT', label: 'Vendor Payment Report' },
      { id: 'VENDOR_OUTSTANDING', label: 'Vendor Outstanding' },
      { id: 'COST_REPORT', label: 'Vendor Cost Report' },
      { id: 'VENDOR_PROFIT', label: 'Vendor Profitability' },
      { id: 'TURNAROUND_TIME', label: 'Vendor Turnaround Time' },
      { id: 'PERFORMANCE', label: 'Vendor Performance' }
    ],
    PRODUCTION: [
      { id: 'QUEUE', label: 'Production Queue' },
      { id: 'DESIGN_JOBS', label: 'Jobs in Design' },
      { id: 'PRINTING_JOBS', label: 'Jobs in Printing' },
      { id: 'FINISHING_JOBS', label: 'Jobs in Finishing' },
      { id: 'READY_DELIVERY', label: 'Ready for Delivery' },
      { id: 'COMPLETED_JOBS', label: 'Completed Jobs' },
      { id: 'DELAYED_JOBS', label: 'Delayed Jobs' },
      { id: 'AVG_TIME', label: 'Average Production Time' }
    ],
    DESIGN: [
      { id: 'WORKLOAD', label: 'Designer Workload' },
      { id: 'PRODUCTIVITY', label: 'Designer Productivity' },
      { id: 'DESIGN_PENDING', label: 'Design Pending' },
      { id: 'DESIGN_COMPLETED', label: 'Design Completed' },
      { id: 'APPROVAL_PENDING', label: 'Design Approval Pending' }
    ],
    PAYMENT: [
      { id: 'ADVANCE_COLLECTION', label: 'Advance Collection' },
      { id: 'BALANCE_COLLECTION', label: 'Balance Collection' },
      { id: 'DAILY_COLLECTION', label: 'Daily Collection' },
      { id: 'CASH_COLLECTION', label: 'Cash Collection' },
      { id: 'UPI_COLLECTION', label: 'UPI Collection' },
      { id: 'CARD_COLLECTION', label: 'Card Collection' },
      { id: 'BANK_COLLECTION', label: 'Bank Collection' },
      { id: 'CREDIT_SALES', label: 'Credit Sales' },
      { id: 'OUTSTANDING_PAYMENTS', label: 'Outstanding Payments' },
      { id: 'FOLLOW_UP', label: 'Payment Follow-up' }
    ],
    GST: [
      { id: 'GST_SUMMARY', label: 'GST Summary' },
      { id: 'CGST_REPORT', label: 'CGST Report' },
      { id: 'SGST_REPORT', label: 'SGST Report' },
      { id: 'IGST_REPORT', label: 'IGST Report' },
      { id: 'GST_BY_CUSTOMER', label: 'GST by Customer' },
      { id: 'GST_BY_PRODUCT', label: 'GST by Product' },
      { id: 'SALES_REGISTER', label: 'GST Sales Register' },
      { id: 'PURCHASE_REGISTER', label: 'GST Purchase Register' },
      { id: 'ETR_SALES', label: 'ETR Sales' },
      { id: 'ITR_SALES', label: 'ITR Sales' },
      { id: 'NTR_SALES', label: 'NTR Sales' }
    ],
    DELIVERY: [
      { id: 'READY_DELIVERY', label: 'Ready for Delivery' },
      { id: 'DELIVERED', label: 'Delivered Orders' },
      { id: 'PENDING_DELIVERIES', label: 'Pending Deliveries' },
      { id: 'COURIER', label: 'Courier Report' },
      { id: 'PICKUP', label: 'Pickup Report' },
      { id: 'DELIVERY_PERFORMANCE', label: 'Delivery Performance' }
    ],
    INVENTORY: [
      { id: 'CURRENT_STOCK', label: 'Current Stock' },
      { id: 'LOW_STOCK', label: 'Low Stock' },
      { id: 'CONSUMPTION', label: 'Material Consumption' },
      { id: 'PURCHASE', label: 'Material Purchase' },
      { id: 'VALUATION', label: 'Inventory Valuation' },
      { id: 'STOCK_MOVEMENT', label: 'Stock Movement' }
    ],
    EMPLOYEE: [
      { id: 'SALESPERSON_PERF', label: 'Sales Person Performance' },
      { id: 'CAREOF_PERF', label: 'Care Of Performance' },
      { id: 'DESIGNER_PERF', label: 'Designer Performance' },
      { id: 'PRODUCTION_PERF', label: 'Production Performance' },
      { id: 'COLLECTION_PERF', label: 'Collection Performance' },
      { id: 'INCENTIVE', label: 'Incentive Report' },
      { id: 'TARGET_ACHIEVED', label: 'Target Achievement' }
    ]
  };

  // Compute Table Data Columns and Rows based on active category & sub-report
  const reportData = useMemo(() => {
    let cols = [];
    let rows = [];
    let totals = null;

    if (activeCategory === 'INCENTIVES') {
      if (activeSubReport === 'CAREOF_INCENTIVES') {
        cols = [
          { key: 'name', label: 'Care Of Partner / Referred Agent', align: 'left' },
          { key: 'role', label: 'Role / Relationship', align: 'left' },
          { key: 'orderCount', label: 'Referred Orders', align: 'center' },
          { key: 'totalSales', label: 'Referred Sales Volume', align: 'right', accessor: (r) => formatINR(r.totalSales) },
          { key: 'referralCommissionPct', label: 'Referral Rate', align: 'center', accessor: (r) => `${r.referralCommissionPct}%` },
          { key: 'earnedIncentive', label: 'Earned Referral Fee', align: 'right', accessor: (r) => formatINR(r.earnedIncentive) }
        ];

        rows = careOfPersons.map((co) => {
          const referred = filteredOrders.filter((o) => o.careOfId === co.id);
          const totalSales = referred.reduce((sum, o) => sum + (o.subtotal || 0), 0);
          const earnedIncentive = (totalSales * (co.referralCommissionPct || 5.0)) / 100;
          return {
            id: co.id,
            name: co.name,
            role: co.role || 'Referred Agent',
            orderCount: referred.length,
            totalSales,
            referralCommissionPct: co.referralCommissionPct || 5.0,
            earnedIncentive
          };
        });

        const totVol = rows.reduce((a, r) => a + r.totalSales, 0);
        const totInc = rows.reduce((a, r) => a + r.earnedIncentive, 0);
        totals = {
          name: 'TOTAL REFERRAL INCENTIVES',
          role: `${careOfPersons.length} Partners`,
          orderCount: rows.reduce((a, r) => a + r.orderCount, 0),
          totalSales: formatINR(totVol),
          referralCommissionPct: '',
          earnedIncentive: formatINR(totInc)
        };
      } else if (activeSubReport === 'WORKER_INCENTIVES') {
        cols = [
          { key: 'name', label: 'Worker / Production Operator', align: 'left' },
          { key: 'role', label: 'Specialization Role', align: 'left' },
          { key: 'jobsCompleted', label: 'Jobs Completed', align: 'center' },
          { key: 'sqFtHandled', label: 'Total Sq.Ft Handled', align: 'right', accessor: (r) => `${r.sqFtHandled.toLocaleString()} sqft` },
          { key: 'incentivePerSqFt', label: 'Sq.Ft Rate', align: 'right', accessor: (r) => `₹${r.incentivePerSqFt}/sqft` },
          { key: 'incentivePerJob', label: 'Job Fee', align: 'right', accessor: (r) => `₹${r.incentivePerJob}/job` },
          { key: 'totalIncentive', label: 'Earned Worker Incentive', align: 'right', accessor: (r) => formatINR(r.totalIncentive) }
        ];

        rows = (workers || []).map((w) => {
          const sqftInc = (w.sqFtHandledThisMonth || 0) * (w.incentivePerSqFt || 0.5);
          const jobInc = (w.jobsCompletedThisMonth || 0) * (w.incentivePerJob || 50);
          const totalIncentive = sqftInc + jobInc;
          return {
            id: w.id,
            name: w.name,
            role: w.role,
            jobsCompleted: w.jobsCompletedThisMonth || 0,
            sqFtHandled: w.sqFtHandledThisMonth || 0,
            incentivePerSqFt: w.incentivePerSqFt || 0.5,
            incentivePerJob: w.incentivePerJob || 50,
            totalIncentive
          };
        });

        const totWrkInc = rows.reduce((a, r) => a + r.totalIncentive, 0);
        totals = {
          name: 'TOTAL WORKER INCENTIVES',
          role: `${rows.length} Staff`,
          jobsCompleted: rows.reduce((a, r) => a + r.jobsCompleted, 0),
          sqFtHandled: `${rows.reduce((a, r) => a + r.sqFtHandled, 0).toLocaleString()} sqft`,
          incentivePerSqFt: '',
          incentivePerJob: '',
          totalIncentive: formatINR(totWrkInc)
        };
      } else {
        // Sales Person Incentives (Default)
        cols = [
          { key: 'name', label: 'Sales Representative', align: 'left' },
          { key: 'target', label: 'Monthly Sales Target', align: 'right', accessor: (r) => formatINR(r.target) },
          { key: 'achieved', label: 'Achieved Sales Volume', align: 'right', accessor: (r) => formatINR(r.achieved) },
          { key: 'achievementPct', label: 'Target Achieved', align: 'center', accessor: (r) => `${r.achievementPct}%` },
          { key: 'commissionRate', label: 'Comm. %', align: 'center', accessor: (r) => `${r.commissionRate}%` },
          { key: 'payable', label: 'Earned Sales Incentive', align: 'right', accessor: (r) => formatINR(r.payable) }
        ];

        rows = salesPersons.map((sp) => {
          const spOrders = filteredOrders.filter((o) => o.salesPersonId === sp.id);
          const achievedSales = spOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0) || sp.achieved || 0;
          const target = sp.target || 500000;
          const achievementPct = target > 0 ? parseFloat(((achievedSales / target) * 100).toFixed(1)) : 0;
          const payable = (achievedSales * (sp.commissionRate || 3.5)) / 100;
          return {
            id: sp.id,
            name: sp.name,
            target,
            achieved: achievedSales,
            achievementPct,
            commissionRate: sp.commissionRate || 3.5,
            payable
          };
        });

        const totTgt = rows.reduce((a, r) => a + r.target, 0);
        const totAch = rows.reduce((a, r) => a + r.achieved, 0);
        const totPay = rows.reduce((a, r) => a + r.payable, 0);
        totals = {
          name: 'TOTAL SALES INCENTIVES',
          target: formatINR(totTgt),
          achieved: formatINR(totAch),
          achievementPct: `${totTgt > 0 ? ((totAch / totTgt) * 100).toFixed(1) : 0}%`,
          commissionRate: '',
          payable: formatINR(totPay)
        };
      }
    } else if (activeCategory === 'PNL') {
      const grossSales = filteredOrders.reduce((a, o) => a + (o.grandTotal || 0), 0);
      const totalGstCollected = filteredOrders.reduce((a, o) => a + (o.cgst || 0) + (o.sgst || 0) + (o.igst || 0), 0);
      const netTaxableRevenue = filteredOrders.reduce((a, o) => a + (o.subtotal || 0), 0);
      const materialCosts = filteredOrders.reduce((a, o) => a + (o.totalEstimatedCost || 0), 0);
      const outsourceBills = filteredOrders.reduce((a, o) => a + (o.totalActualCost || 0), 0);
      const totalIncentives = (salesPersons.reduce((a, s) => a + (s.achieved * s.commissionRate / 100), 0)) + (careOfPersons.reduce((a, c) => a + (c.totalReferredSales * c.referralCommissionPct / 100), 0));
      const totalCogs = outsourceBills + (materialCosts * 0.5) + totalIncentives;
      const grossProfit = netTaxableRevenue - totalCogs;
      const netProfitMarginPct = netTaxableRevenue > 0 ? parseFloat(((grossProfit / netTaxableRevenue) * 100).toFixed(1)) : 0;

      cols = [
        { key: 'head', label: 'Financial Statement Line Item', align: 'left' },
        { key: 'category', label: 'Accounting Classification', align: 'left' },
        { key: 'amount', label: 'Amount (₹)', align: 'right', accessor: (r) => formatINR(r.amount) },
        { key: 'pct', label: '% of Taxable Revenue', align: 'right', accessor: (r) => `${r.pct}%` }
      ];

      rows = [
        { head: '1. Gross Billing Sales Revenue', category: 'Total Invoiced Revenue', amount: grossSales, pct: 100 },
        { head: '2. Less: GST Tax Liability (CGST+SGST+IGST)', category: 'Government Tax Liability', amount: -totalGstCollected, pct: grossSales > 0 ? parseFloat(((-totalGstCollected / grossSales) * 100).toFixed(1)) : 0 },
        { head: '3. NET TAXABLE SALES REVENUE', category: 'Operating Income', amount: netTaxableRevenue, pct: 100 },
        { head: '4. Less: Outsource Vendor Job Bills', category: 'Cost of Goods Sold (COGS)', amount: -outsourceBills, pct: netTaxableRevenue > 0 ? parseFloat(((-outsourceBills / netTaxableRevenue) * 100).toFixed(1)) : 0 },
        { head: '5. Less: Direct Material & Ink Cost (Est.)', category: 'Cost of Goods Sold (COGS)', amount: -materialCosts, pct: netTaxableRevenue > 0 ? parseFloat(((-materialCosts / netTaxableRevenue) * 100).toFixed(1)) : 0 },
        { head: '6. Less: Sales & Care-Of Commissions', category: 'Staff Commissions', amount: -totalIncentives, pct: netTaxableRevenue > 0 ? parseFloat(((-totalIncentives / netTaxableRevenue) * 100).toFixed(1)) : 0 },
        { head: '7. TOTAL DIRECT PRODUCTION COSTS (COGS)', category: 'Total Expenses', amount: -totalCogs, pct: netTaxableRevenue > 0 ? parseFloat(((-totalCogs / netTaxableRevenue) * 100).toFixed(1)) : 0 },
        { head: '8. NET OPERATING PROFIT / (LOSS)', category: 'Bottom Line Net Income', amount: grossProfit, pct: netProfitMarginPct }
      ];

      totals = {
        head: 'NET OPERATING MARGIN',
        category: 'Overall Business Health',
        amount: formatINR(grossProfit),
        pct: `${netProfitMarginPct}% Net Margin`
      };
    } else if (activeCategory === 'PRODUCT_SALES') {
      const prodMap = {};
      filteredOrders.forEach((o) => {
        (o.items || []).forEach((it) => {
          const pName = it.productName || 'Custom Print Job';
          if (!prodMap[pName]) {
            prodMap[pName] = {
              name: pName,
              category: it.category || 'Printing',
              orderCount: 0,
              totalSqFt: 0,
              totalQty: 0,
              revenue: 0,
              outsourceCost: 0,
              estimatedCost: 0
            };
          }
          prodMap[pName].orderCount += 1;
          prodMap[pName].totalSqFt += (it.totalSqFt || 0);
          prodMap[pName].totalQty += (it.qty || 1);
          prodMap[pName].revenue += (it.amount || 0);
          prodMap[pName].outsourceCost += (it.actualVendorBill || it.actualCost || 0);
          prodMap[pName].estimatedCost += (it.estimatedCost || 0);
        });
      });

      cols = [
        { key: 'name', label: 'Product Title', align: 'left' },
        { key: 'category', label: 'Category', align: 'left' },
        { key: 'totalSqFt', label: 'Total Volume', align: 'right', accessor: (r) => `${r.totalSqFt ? r.totalSqFt.toLocaleString() + ' sqft' : r.totalQty + ' pcs'}` },
        { key: 'revenue', label: 'Total Billed Revenue', align: 'right', accessor: (r) => formatINR(r.revenue) },
        { key: 'outsourceCost', label: 'Outsource Cost', align: 'right', accessor: (r) => formatINR(r.outsourceCost) },
        { key: 'grossProfit', label: 'Product Profit', align: 'right', accessor: (r) => formatINR(r.grossProfit) },
        { key: 'marginPct', label: 'Margin %', align: 'center', accessor: (r) => `${r.marginPct}%` }
      ];

      rows = Object.values(prodMap).map((p) => {
        const cost = p.outsourceCost > 0 ? p.outsourceCost : p.estimatedCost;
        const grossProfit = p.revenue - cost;
        const marginPct = p.revenue > 0 ? parseFloat(((grossProfit / p.revenue) * 100).toFixed(1)) : 0;
        return { ...p, grossProfit, marginPct };
      });

      const totRev = rows.reduce((a, r) => a + r.revenue, 0);
      const totProfit = rows.reduce((a, r) => a + r.grossProfit, 0);
      totals = {
        name: 'TOTAL PRODUCT SALES',
        category: `${rows.length} Products`,
        totalSqFt: `${rows.reduce((a, r) => a + r.totalSqFt, 0).toLocaleString()} sqft`,
        revenue: formatINR(totRev),
        outsourceCost: formatINR(rows.reduce((a, r) => a + r.outsourceCost, 0)),
        grossProfit: formatINR(totProfit),
        marginPct: totRev > 0 ? `${((totProfit / totRev) * 100).toFixed(1)}%` : '0%'
      };
    } else if (activeCategory === 'CUSTOMER_DEBT') {
      cols = [
        { key: 'name', label: 'Customer Name', align: 'left' },
        { key: 'type', label: 'Customer Type', align: 'left' },
        { key: 'creditLimit', label: 'Credit Limit', align: 'right', accessor: (r) => formatINR(r.creditLimit) },
        { key: 'orderCount', label: 'Total Orders', align: 'center' },
        { key: 'totalBilled', label: 'Total Billed Revenue', align: 'right', accessor: (r) => formatINR(r.totalBilled) },
        { key: 'outstanding', label: 'Outstanding Balance Due', align: 'right', accessor: (r) => formatINR(r.outstanding) },
        { key: 'marginPct', label: 'Profit Margin', align: 'center', accessor: (r) => `${r.marginPct}%` }
      ];

      rows = customers.map((c) => {
        const custOrders = filteredOrders.filter((o) => o.customerId === c.id);
        const totalBilled = custOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
        const totalSub = custOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
        const totalCost = custOrders.reduce((sum, o) => sum + (o.totalActualCost || o.totalEstimatedCost || 0), 0);
        const profit = totalSub - totalCost;
        const marginPct = totalSub > 0 ? parseFloat(((profit / totalSub) * 100).toFixed(1)) : 0;
        return {
          id: c.id,
          name: c.name,
          type: c.type || 'Regular',
          creditLimit: c.creditLimit || 0,
          orderCount: custOrders.length,
          totalBilled,
          outstanding: c.outstanding || 0,
          marginPct
        };
      });

      const totBilled = rows.reduce((a, r) => a + r.totalBilled, 0);
      const totOut = rows.reduce((a, r) => a + r.outstanding, 0);
      totals = {
        name: 'TOTAL CUSTOMER DEBTORS',
        type: `${customers.length} Clients`,
        creditLimit: formatINR(customers.reduce((a, c) => a + (c.creditLimit || 0), 0)),
        orderCount: rows.reduce((a, r) => a + r.orderCount, 0),
        totalBilled: formatINR(totBilled),
        outstanding: formatINR(totOut),
        marginPct: ''
      };
    } else if (activeCategory === 'SALES') {
      if (['BY_CUSTOMER', 'BY_SALESPERSON', 'BY_CAREOF', 'BY_BRANCH', 'BY_SOURCE', 'BY_PAYMENT_METHOD', 'BY_GST_TYPE'].includes(activeSubReport)) {
        let grpKey = 'CUSTOMER';
        if (activeSubReport === 'BY_SALESPERSON') grpKey = 'SALESPERSON';
        if (activeSubReport === 'BY_CAREOF') grpKey = 'CAREOF';
        if (activeSubReport === 'BY_BRANCH') grpKey = 'BRANCH';
        if (activeSubReport === 'BY_SOURCE') grpKey = 'SOURCE';
        if (activeSubReport === 'BY_PAYMENT_METHOD') grpKey = 'PAYMENT_METHOD';
        if (activeSubReport === 'BY_GST_TYPE') grpKey = 'GST_TYPE';

        const grouped = groupOrdersBy(filteredOrders, grpKey);
        cols = [
          { key: 'key', label: 'Group / Entity', align: 'left' },
          { key: 'count', label: 'Total Orders', align: 'right' },
          { key: 'subtotal', label: 'Taxable Subtotal', align: 'right', accessor: (r) => formatINR(r.subtotal) },
          { key: 'actualCost', label: 'Vendor / Cost', align: 'right', accessor: (r) => formatINR(r.actualCost) },
          { key: 'grossProfit', label: 'Gross Profit', align: 'right', accessor: (r) => formatINR(r.grossProfit) },
          { key: 'marginPct', label: 'Margin %', align: 'right', accessor: (r) => `${r.marginPct}%` },
          { key: 'grandTotal', label: 'Grand Total Revenue', align: 'right', accessor: (r) => formatINR(r.grandTotal) }
        ];

        rows = grouped;
        const totSub = grouped.reduce((a, r) => a + r.subtotal, 0);
        const totCost = grouped.reduce((a, r) => a + r.actualCost, 0);
        const totProfit = grouped.reduce((a, r) => a + r.grossProfit, 0);
        const totGrand = grouped.reduce((a, r) => a + r.grandTotal, 0);
        const totCount = grouped.reduce((a, r) => a + r.count, 0);
        const avgMargin = totSub > 0 ? parseFloat(((totProfit / totSub) * 100).toFixed(1)) : 0;

        totals = {
          key: 'GRAND TOTAL',
          count: totCount,
          subtotal: formatINR(totSub),
          actualCost: formatINR(totCost),
          grossProfit: formatINR(totProfit),
          marginPct: `${avgMargin}%`,
          grandTotal: formatINR(totGrand)
        };
      } else {
        // Detailed Sales Orders Table
        cols = [
          { key: 'id', label: 'Order #', align: 'left' },
          { key: 'orderDate', label: 'Date', align: 'left' },
          { key: 'customerName', label: 'Customer Name', align: 'left' },
          { key: 'salesPersonName', label: 'Sales Person', align: 'left' },
          { key: 'careOfName', label: 'Care Of', align: 'left' },
          { key: 'productionStatus', label: 'Status', align: 'center' },
          { key: 'subtotal', label: 'Subtotal', align: 'right', accessor: (r) => formatINR(r.subtotal) },
          { key: 'cgst', label: 'CGST', align: 'right', accessor: (r) => formatINR(r.cgst) },
          { key: 'sgst', label: 'SGST', align: 'right', accessor: (r) => formatINR(r.sgst) },
          { key: 'igst', label: 'IGST', align: 'right', accessor: (r) => formatINR(r.igst) },
          { key: 'grandTotal', label: 'Grand Total', align: 'right', accessor: (r) => formatINR(r.grandTotal) },
          { key: 'grossProfit', label: 'Gross Profit', align: 'right', accessor: (r) => formatINR(r.grossProfit) },
          { key: 'profitMarginPct', label: 'Margin %', align: 'right', accessor: (r) => `${r.profitMarginPct}%` }
        ];

        let filteredSub = [...filteredOrders];
        if (activeSubReport === 'CANCELLED') filteredSub = filteredSub.filter((o) => o.productionStatus === 'Cancelled');
        if (activeSubReport === 'PENDING_SO') filteredSub = filteredSub.filter((o) => o.productionStatus !== 'Delivered');
        if (activeSubReport === 'COMPLETED_SO') filteredSub = filteredSub.filter((o) => o.productionStatus === 'Delivered');
        if (activeSubReport === 'DELIVERY_PENDING') filteredSub = filteredSub.filter((o) => o.productionStatus === 'Ready for Delivery');
        if (activeSubReport === 'OUTSTANDING_SO') filteredSub = filteredSub.filter((o) => o.balanceAmount > 0);

        rows = filteredSub;
        const totSub = filteredSub.reduce((a, r) => a + r.subtotal, 0);
        const totCgst = filteredSub.reduce((a, r) => a + r.cgst, 0);
        const totSgst = filteredSub.reduce((a, r) => a + r.sgst, 0);
        const totIgst = filteredSub.reduce((a, r) => a + r.igst, 0);
        const totGrand = filteredSub.reduce((a, r) => a + r.grandTotal, 0);
        const totProfit = filteredSub.reduce((a, r) => a + r.grossProfit, 0);
        const avgMargin = totSub > 0 ? parseFloat(((totProfit / totSub) * 100).toFixed(1)) : 0;

        totals = {
          id: 'TOTAL',
          orderDate: `${filteredSub.length} Orders`,
          customerName: '',
          salesPersonName: '',
          careOfName: '',
          productionStatus: '',
          subtotal: formatINR(totSub),
          cgst: formatINR(totCgst),
          sgst: formatINR(totSgst),
          igst: formatINR(totIgst),
          grandTotal: formatINR(totGrand),
          grossProfit: formatINR(totProfit),
          profitMarginPct: `${avgMargin}%`
        };
      }
    } else if (activeCategory === 'CUSTOMER') {
      cols = [
        { key: 'name', label: 'Customer Name', align: 'left' },
        { key: 'mobile', label: 'Mobile', align: 'left' },
        { key: 'type', label: 'Type', align: 'left' },
        { key: 'gstin', label: 'GSTIN', align: 'left' },
        { key: 'creditLimit', label: 'Credit Limit', align: 'right', accessor: (r) => formatINR(r.creditLimit) },
        { key: 'outstanding', label: 'Outstanding Balance', align: 'right', accessor: (r) => formatINR(r.outstanding) },
        { key: 'totalOrders', label: 'Total Orders', align: 'right' }
      ];
      rows = customers;
      const totOut = customers.reduce((a, c) => a + c.outstanding, 0);
      const totCredit = customers.reduce((a, c) => a + c.creditLimit, 0);
      totals = { name: 'TOTAL', mobile: `${customers.length} Clients`, type: '', gstin: '', creditLimit: formatINR(totCredit), outstanding: formatINR(totOut), totalOrders: customers.reduce((a, c) => a + c.totalOrders, 0) };
    } else if (activeCategory === 'PRODUCT') {
      cols = [
        { key: 'name', label: 'Product Name', align: 'left' },
        { key: 'category', label: 'Category', align: 'left' },
        { key: 'unit', label: 'Unit', align: 'left' },
        { key: 'defaultRate', label: 'Default Rate', align: 'right', accessor: (r) => formatINR(r.defaultRate) },
        { key: 'estimatedCost', label: 'Est. Cost', align: 'right', accessor: (r) => formatINR(r.estimatedCost) },
        { key: 'gstRate', label: 'GST %', align: 'right', accessor: (r) => `${r.gstRate}%` },
        { key: 'hsnCode', label: 'HSN Code', align: 'center' }
      ];
      rows = products;
    } else if (activeCategory === 'PROFIT') {
      cols = [
        { key: 'id', label: 'Order #', align: 'left' },
        { key: 'customerName', label: 'Customer', align: 'left' },
        { key: 'subtotal', label: 'Subtotal Revenue', align: 'right', accessor: (r) => formatINR(r.subtotal) },
        { key: 'totalEstimatedCost', label: 'Est Cost', align: 'right', accessor: (r) => formatINR(r.totalEstimatedCost) },
        { key: 'totalActualCost', label: 'Actual Vendor Cost', align: 'right', accessor: (r) => formatINR(r.totalActualCost) },
        { key: 'grossProfit', label: 'Gross Profit', align: 'right', accessor: (r) => formatINR(r.grossProfit) },
        { key: 'profitMarginPct', label: 'Margin %', align: 'right', accessor: (r) => `${r.profitMarginPct}%` }
      ];
      rows = filteredOrders;
      const totRev = filteredOrders.reduce((a, o) => a + o.subtotal, 0);
      const totEst = filteredOrders.reduce((a, o) => a + o.totalEstimatedCost, 0);
      const totAct = filteredOrders.reduce((a, o) => a + o.totalActualCost, 0);
      const totProfit = filteredOrders.reduce((a, o) => a + o.grossProfit, 0);
      totals = { id: 'TOTAL', customerName: `${filteredOrders.length} Orders`, subtotal: formatINR(totRev), totalEstimatedCost: formatINR(totEst), totalActualCost: formatINR(totAct), grossProfit: formatINR(totProfit), profitMarginPct: totRev > 0 ? `${((totProfit / totRev) * 100).toFixed(1)}%` : '0%' };
    } else if (activeCategory === 'OUTSOURCE') {
      cols = [
        { key: 'name', label: 'Vendor Name', align: 'left' },
        { key: 'category', label: 'Specialization', align: 'left' },
        { key: 'mobile', label: 'Mobile', align: 'left' },
        { key: 'gstin', label: 'GSTIN', align: 'left' },
        { key: 'pendingPayment', label: 'Pending Unpaid Bills', align: 'right', accessor: (r) => formatINR(r.pendingPayment) }
      ];
      rows = vendors;
      totals = { name: 'TOTAL', category: `${vendors.length} Vendors`, mobile: '', gstin: '', pendingPayment: formatINR(vendors.reduce((a, v) => a + v.pendingPayment, 0)) };
    } else if (activeCategory === 'PRODUCTION') {
      cols = [
        { key: 'id', label: 'Order #', align: 'left' },
        { key: 'customerName', label: 'Customer', align: 'left' },
        { key: 'careOfName', label: 'Care Of', align: 'left' },
        { key: 'productionStatus', label: 'Production Stage', align: 'center' },
        { key: 'deliveryDate', label: 'Target Delivery', align: 'left' },
        { key: 'grandTotal', label: 'Order Value', align: 'right', accessor: (r) => formatINR(r.grandTotal) }
      ];
      rows = filteredOrders;
    } else if (activeCategory === 'DESIGN') {
      cols = [
        { key: 'name', label: 'Designer Name', align: 'left' },
        { key: 'mobile', label: 'Mobile', align: 'left' },
        { key: 'activeJobs', label: 'Active Jobs', align: 'right' },
        { key: 'pendingApprovals', label: 'Pending Proof Approvals', align: 'right' },
        { key: 'completedMonth', label: 'Completed Jobs (This Month)', align: 'right' }
      ];
      rows = designers;
    } else if (activeCategory === 'PAYMENT') {
      cols = [
        { key: 'id', label: 'Voucher #', align: 'left' },
        { key: 'date', label: 'Date', align: 'left' },
        { key: 'orderId', label: 'Order #', align: 'left' },
        { key: 'customerName', label: 'Customer', align: 'left' },
        { key: 'method', label: 'Payment Method', align: 'center' },
        { key: 'refNo', label: 'Reference / Bank Ref', align: 'left' },
        { key: 'amount', label: 'Amount Collected', align: 'right', accessor: (r) => formatINR(r.amount) }
      ];
      rows = payments;
      totals = { id: 'TOTAL', date: `${payments.length} Payments`, orderId: '', customerName: '', method: '', refNo: '', amount: formatINR(payments.reduce((a, p) => a + p.amount, 0)) };
    } else if (activeCategory === 'GST') {
      cols = [
        { key: 'id', label: 'Order #', align: 'left' },
        { key: 'orderDate', label: 'Invoice Date', align: 'left' },
        { key: 'customerName', label: 'Customer', align: 'left' },
        { key: 'subtotal', label: 'Taxable Subtotal', align: 'right', accessor: (r) => formatINR(r.subtotal) },
        { key: 'cgst', label: 'CGST (9%)', align: 'right', accessor: (r) => formatINR(r.cgst) },
        { key: 'sgst', label: 'SGST (9%)', align: 'right', accessor: (r) => formatINR(r.sgst) },
        { key: 'igst', label: 'IGST (18%)', align: 'right', accessor: (r) => formatINR(r.igst) },
        { key: 'grandTotal', label: 'Gross Invoice Total', align: 'right', accessor: (r) => formatINR(r.grandTotal) }
      ];
      rows = filteredOrders;
      totals = {
        id: 'TOTAL',
        orderDate: '',
        customerName: `${filteredOrders.length} Invoices`,
        subtotal: formatINR(filteredOrders.reduce((a, o) => a + o.subtotal, 0)),
        cgst: formatINR(filteredOrders.reduce((a, o) => a + o.cgst, 0)),
        sgst: formatINR(filteredOrders.reduce((a, o) => a + o.sgst, 0)),
        igst: formatINR(filteredOrders.reduce((a, o) => a + o.igst, 0)),
        grandTotal: formatINR(filteredOrders.reduce((a, o) => a + o.grandTotal, 0))
      };
    } else if (activeCategory === 'DELIVERY') {
      cols = [
        { key: 'id', label: 'Order #', align: 'left' },
        { key: 'customerName', label: 'Customer Name', align: 'left' },
        { key: 'deliveryMode', label: 'Dispatch Mode', align: 'left' },
        { key: 'deliveredBy', label: 'Delivered By', align: 'left' },
        { key: 'productionStatus', label: 'Delivery Status', align: 'center' }
      ];
      rows = filteredOrders;
    } else if (activeCategory === 'INVENTORY') {
      cols = [
        { key: 'id', label: 'Item Code', align: 'left' },
        { key: 'name', label: 'Material Name', align: 'left' },
        { key: 'category', label: 'Category', align: 'left' },
        { key: 'currentStock', label: 'Current Stock', align: 'right' },
        { key: 'unit', label: 'Unit', align: 'left' },
        { key: 'reorderLevel', label: 'Reorder Level', align: 'right' },
        { key: 'unitCost', label: 'Unit Cost', align: 'right', accessor: (r) => formatINR(r.unitCost) },
        { key: 'valuation', label: 'Total Stock Value', align: 'right', accessor: (r) => formatINR(r.currentStock * r.unitCost) }
      ];
      rows = inventory;
      totals = { id: 'TOTAL', name: `${inventory.length} Stock Items`, category: '', currentStock: '', unit: '', reorderLevel: '', unitCost: '', valuation: formatINR(inventory.reduce((a, i) => a + (i.currentStock * i.unitCost), 0)) };
    } else if (activeCategory === 'EMPLOYEE') {
      cols = [
        { key: 'name', label: 'Sales Representative', align: 'left' },
        { key: 'mobile', label: 'Mobile', align: 'left' },
        { key: 'target', label: 'Monthly Target', align: 'right', accessor: (r) => formatINR(r.target) },
        { key: 'achieved', label: 'Achieved Sales', align: 'right', accessor: (r) => formatINR(r.achieved) },
        { key: 'commissionRate', label: 'Comm. %', align: 'right', accessor: (r) => `${r.commissionRate}%` },
        { key: 'payable', label: 'Incentive Payable', align: 'right', accessor: (r) => formatINR((r.achieved * r.commissionRate) / 100) }
      ];
      rows = salesPersons;
    }

    return { cols, rows, totals };
  }, [activeCategory, activeSubReport, filteredOrders, customers, products, vendors, designers, payments, inventory, salesPersons]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return reportData.rows;
    const startIdx = (currentPage - 1) * pageSize;
    return reportData.rows.slice(startIdx, startIdx + pageSize);
  }, [reportData.rows, currentPage, pageSize]);

  const totalPages = pageSize > 0 ? Math.ceil(reportData.rows.length / pageSize) : 1;

  // Chart Data Preparation
  const chartCategoryData = useMemo(() => {
    const grouped = groupOrdersBy(filteredOrders, 'CUSTOMER');
    return grouped.map((g) => ({ label: g.key, value: g.grandTotal }));
  }, [filteredOrders]);

  const chartStatusData = useMemo(() => {
    const grp = groupOrdersBy(filteredOrders, 'STATUS');
    return grp.map((g) => ({ label: g.key, value: g.count }));
  }, [filteredOrders]);

  return (
    <div className="view-container">
      {/* Top Banner Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={26} color="#2563eb" /> ERPNext Enterprise Intelligence & Analytics Engine
          </h2>
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Multi-dimensional reporting across 12 business domains, 80+ specialized sub-reports, GST registers & Profit margins
          </span>
        </div>
      </div>

      {/* Category Selection Tabs (ERPNext Module Bar) */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {reportCategories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  const firstSub = subReportOptions[cat.id]?.[0]?.id || '';
                  setActiveSubReport(firstSub);
                  setCurrentPage(1);
                }}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{ whiteSpace: 'nowrap', gap: '0.4rem', fontSize: '0.8rem', height: '36px' }}
              >
                <Icon size={15} /> {cat.label}
                <span className={`badge ${isActive ? 'badge-emerald' : 'badge-slate'}`} style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Reports Selector Strip (Only if not Pivot Matrix) */}
      {activeCategory !== 'PIVOT' && subReportOptions[activeCategory] && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '0.6rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Report View:
            </span>
            {subReportOptions[activeCategory].map((sub) => {
              const isSelected = activeSubReport === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setActiveSubReport(sub.id);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: isSelected ? '#1e40af' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 4px rgba(30,64,175,0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Filter Bar */}
      <ReportFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        customers={customers}
        salesPersons={salesPersons}
        careOfPersons={careOfPersons}
        vendors={vendors}
        products={products}
        onExportCSV={() => {
          const subTitle = subReportOptions[activeCategory]?.find((s) => s.id === activeSubReport)?.label || activeCategory;
          exportToCSV(`${activeCategory}_${subTitle}`, reportData.cols, reportData.rows);
        }}
        onExportPDF={() => {
          const subTitle = subReportOptions[activeCategory]?.find((s) => s.id === activeSubReport)?.label || activeCategory;
          printReportPDF(
            `${reportCategories.find((c) => c.id === activeCategory)?.label || ''} - ${subTitle}`,
            `ScreenArts Printflow ERP Intelligence Ledger`,
            companyProfile,
            reportData.cols,
            reportData.rows,
            reportData.totals
          );
        }}
        onOpenEmailModal={(mode) => setEmailModalState({ isOpen: true, mode })}
      />

      {/* Render Dynamic Pivot Table Matrix Tab */}
      {activeCategory === 'PIVOT' ? (
        <PivotReportView orders={filteredOrders} />
      ) : (
        <>
          {/* Visual Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <BarChartWidget title="Revenue Breakdown by Customer" items={chartCategoryData} />
            <DonutChartWidget title="Production Stage Distribution" items={chartStatusData} />
            <TrendLineWidget title="Monthly Sales Revenue vs Gross Profit" />
          </div>

          {/* ERPNext Responsive Report Table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#2563eb" />
                {reportCategories.find((c) => c.id === activeCategory)?.label} —{' '}
                <span style={{ color: '#2563eb' }}>
                  {subReportOptions[activeCategory]?.find((s) => s.id === activeSubReport)?.label || activeSubReport}
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                Showing {reportData.rows.length} total records
              </span>
            </div>

            <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="erp-table">
                <thead>
                  <tr>
                    {reportData.cols.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          textAlign: col.align || 'left',
                          position: 'sticky',
                          top: 0,
                          zIndex: 10,
                          background: '#f1f5f9'
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={reportData.cols.length} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        No report records found matching the active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row, idx) => (
                      <tr key={idx}>
                        {reportData.cols.map((col) => {
                          const val = col.accessor ? col.accessor(row) : row[col.key];
                          return (
                            <td
                              key={col.key}
                              style={{
                                textAlign: col.align || 'left',
                                fontWeight: col.key === 'id' || col.key === 'name' || col.key === 'key' ? 800 : 400,
                                color: col.key === 'id' ? '#1e40af' : '#0f172a'
                              }}
                            >
                              {val !== undefined && val !== null ? val : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
                {reportData.totals && (
                  <tfoot>
                    <tr style={{ background: '#e2e8f0', fontWeight: 800 }}>
                      {reportData.cols.map((col) => {
                        const val = reportData.totals[col.key];
                        return (
                          <td key={col.key} style={{ textAlign: col.align || 'left', color: '#1e40af' }}>
                            {val !== undefined ? val : ''}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination & Row Count Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="form-control"
                  style={{ width: '80px', height: '30px', fontSize: '0.78rem' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={0}>All</option>
                </select>
              </div>

              {pageSize > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '0.2rem 0.5rem' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="btn btn-sm btn-secondary"
                    style={{ padding: '0.2rem 0.5rem' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Email / Schedule Modal */}
      <EmailScheduleModal
        isOpen={emailModalState.isOpen}
        onClose={() => setEmailModalState((prev) => ({ ...prev, isOpen: false }))}
        mode={emailModalState.mode}
        reportName={`${reportCategories.find((c) => c.id === activeCategory)?.label || ''} - ${subReportOptions[activeCategory]?.find((s) => s.id === activeSubReport)?.label || activeSubReport}`}
      />
    </div>
  );
};
