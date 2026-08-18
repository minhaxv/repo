import {
  LayoutDashboard,
  Users,
  UserCheck,
  TrendingUp,
  ShoppingCart,
  FileText,
  Truck,
  CreditCard,
  Factory,
  Palette,
  Building2,
  Boxes,
  Package,
  ShoppingBag,
  Calendar,
  BarChart3,
  Layers,
  Settings,
  Shield,
  Receipt,
  BookOpen,
  DollarSign,
  PieChart,
  Scale,
  Landmark,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  FilePlus,
  CheckCircle2,
  Clock,
  Briefcase,
  Cpu
} from 'lucide-react';

export const NAVIGATION_MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['Admin', 'Manager', 'Sales', 'Designer', 'Production', 'Accounts', 'Delivery'],
    subItems: []
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    roles: ['Admin', 'Manager', 'Sales', 'Accounts'],
    subItems: [
      { id: 'customers', label: 'Customers', icon: Users, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'care-of-persons', label: 'Care Of Persons', icon: UserCheck, roles: ['Admin', 'Manager', 'Sales'] },
      { id: 'sales-persons', label: 'Sales Persons', icon: TrendingUp, roles: ['Admin', 'Manager', 'Sales'] }
    ]
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    roles: ['Admin', 'Manager', 'Sales', 'Designer', 'Accounts'],
    subItems: [
      { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart, highlight: true, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'quotations', label: 'Quotations', icon: FileText, roles: ['Admin', 'Manager', 'Sales'] },
      { id: 'gst-invoicing', label: 'Sales Invoices', icon: Receipt, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'delivery', label: 'Delivery Notes', icon: Truck, roles: ['Admin', 'Manager', 'Delivery', 'Production'] },
      { id: 'payments', label: 'Payments & Collections', icon: CreditCard, roles: ['Admin', 'Manager', 'Accounts'] }
    ]
  },
  {
    id: 'production',
    label: 'Production',
    icon: Factory,
    roles: ['Admin', 'Manager', 'Production', 'Designer'],
    subItems: [
      { id: 'production', label: 'Shop Floor & Printing', icon: Factory, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'designers', label: 'Design Queue & Proofing', icon: Palette, roles: ['Admin', 'Manager', 'Designer'] },
      { id: 'vendors', label: 'Outsource Vendors', icon: Building2, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    roles: ['Admin', 'Manager', 'Production'],
    subItems: [
      { id: 'inventory', label: 'Inventory Stock', icon: Boxes, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'products', label: 'Products Catalog', icon: Package, roles: ['Admin', 'Manager', 'Production', 'Sales'] }
    ]
  },
  {
    id: 'purchase',
    label: 'Purchase',
    icon: ShoppingBag,
    roles: ['Admin', 'Manager', 'Production'],
    subItems: [
      { id: 'purchase', label: 'Purchase Orders', icon: ShoppingBag, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'hr-attendance',
    label: 'HR & Attendance',
    icon: Calendar,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'attendance', label: 'Daily Attendance Register', icon: Calendar, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'hr-payroll', label: 'Payroll & Salary Slips', icon: DollarSign, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'employees', label: 'Employees Master', icon: Users, roles: ['Admin', 'Manager', 'Accounts'] }
    ]
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: CreditCard,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'accounts-dashboard', label: 'Accounts Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'accounts-daily', label: 'Daily Transactions', icon: Clock, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'cash-book', label: 'Cash Book', icon: BookOpen, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'bank-book', label: 'Bank Book', icon: Landmark, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'day-book', label: 'Day Book', icon: FileSpreadsheet, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'general-ledger', label: 'General Ledger', icon: BookOpen, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'journal-entries', label: 'Journal Entries', icon: FileText, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'party-ledger', label: 'Party Ledger', icon: Users, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'party-statement', label: 'Party Statement', icon: FileText, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'party-pending', label: 'Party Pending Accounts', icon: Clock, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'outstanding-receivables', label: 'Outstanding Receivables', icon: ArrowDownLeft, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'outstanding-payables', label: 'Outstanding Payables', icon: ArrowUpRight, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'future-transactions', label: 'Future Transactions', icon: Clock, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'cheque-clearance', label: 'Cheque Clearance', icon: CheckCircle2, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'bank-statement', label: 'Bank Statement', icon: FileSpreadsheet, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'bank-reconciliation', label: 'Bank Reconciliation', icon: Landmark, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'cash-flow', label: 'Cash Flow Statement', icon: TrendingUp, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'income-statement', label: 'Income Statement (P&L)', icon: DollarSign, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'trial-balance', label: 'Trial Balance', icon: Scale, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'balance-sheet', label: 'Balance Sheet', icon: PieChart, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'gst-e-filing', label: 'GST e-Filing', icon: Receipt, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'tax-summary', label: 'Tax Summary', icon: FileText, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'payment-receipt', label: 'Payment Receipt', icon: FilePlus, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'payment-entry', label: 'Payment Entry', icon: CreditCard, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'expense-entry', label: 'Expense Entry', icon: ArrowUpRight, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'income-entry', label: 'Income Entry', icon: ArrowDownLeft, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'contra-entry', label: 'Contra Entry', icon: Landmark, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'debit-note', label: 'Debit Note', icon: FileText, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'credit-note', label: 'Credit Note', icon: FileText, roles: ['Admin', 'Manager', 'Accounts'] }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['Admin', 'Manager'],
    subItems: [
      { id: 'report-dashboard', label: 'Business Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Manager'] },
      { id: 'report-sales', label: 'Sales Reports', icon: TrendingUp, roles: ['Admin', 'Manager'] },
      { id: 'report-quotation', label: 'Quotation Report', icon: FileText, roles: ['Admin', 'Manager'] },
      { id: 'report-sales-order', label: 'Sales Order Report', icon: ShoppingCart, roles: ['Admin', 'Manager'] },
      { id: 'report-delivery', label: 'Delivery Report', icon: Truck, roles: ['Admin', 'Manager'] },
      { id: 'report-invoice', label: 'Sales Invoice Report', icon: Receipt, roles: ['Admin', 'Manager'] },
      { id: 'report-customer-outstanding', label: 'Customer Outstanding Report', icon: ArrowDownLeft, roles: ['Admin', 'Manager'] },
      { id: 'report-customer-ledger', label: 'Customer Ledger Report', icon: Users, roles: ['Admin', 'Manager'] },
      { id: 'report-purchase', label: 'Purchase Report', icon: ShoppingBag, roles: ['Admin', 'Manager'] },
      { id: 'report-supplier-outstanding', label: 'Supplier Outstanding Report', icon: ArrowUpRight, roles: ['Admin', 'Manager'] },
      { id: 'report-production', label: 'Production Report', icon: Factory, roles: ['Admin', 'Manager'] },
      { id: 'report-job-card', label: 'Job Card Report', icon: FileText, roles: ['Admin', 'Manager'] },
      { id: 'report-outsource', label: 'Outsource Report', icon: Building2, roles: ['Admin', 'Manager'] },
      { id: 'report-machine', label: 'Machine Production Report', icon: Cpu, roles: ['Admin', 'Manager'] },
      { id: 'report-material-usage', label: 'Material Usage Report', icon: Boxes, roles: ['Admin', 'Manager'] },
      { id: 'report-stock', label: 'Stock Report', icon: Boxes, roles: ['Admin', 'Manager'] },
      { id: 'report-stock-value', label: 'Stock Value Report', icon: DollarSign, roles: ['Admin', 'Manager'] },
      { id: 'report-stock-flow', label: 'Stock Flow Report', icon: TrendingUp, roles: ['Admin', 'Manager'] },
      { id: 'report-stock-detail', label: 'Stock Details Flow Report', icon: FileSpreadsheet, roles: ['Admin', 'Manager'] },
      { id: 'report-inventory-aging', label: 'Inventory Aging Report', icon: Clock, roles: ['Admin', 'Manager'] },
      { id: 'report-other-charges', label: 'Other Charges Report', icon: FileText, roles: ['Admin', 'Manager'] },
      { id: 'report-employee', label: 'Employee Report', icon: Briefcase, roles: ['Admin', 'Manager'] },
      { id: 'report-attendance', label: 'Attendance Report', icon: Calendar, roles: ['Admin', 'Manager'] },
      { id: 'report-payroll', label: 'Payroll Report', icon: CreditCard, roles: ['Admin', 'Manager'] },
      { id: 'report-accounts', label: 'Accounts Report', icon: BookOpen, roles: ['Admin', 'Manager'] },
      { id: 'report-gst', label: 'GST Reports', icon: Receipt, roles: ['Admin', 'Manager'] },
      { id: 'report-profit', label: 'Profit Analysis', icon: DollarSign, roles: ['Admin', 'Manager'] }
    ]
  },
  {
    id: 'masters',
    label: 'Masters',
    icon: Layers,
    roles: ['Admin', 'Manager'],
    subItems: [
      { id: 'products', label: 'Products Master', icon: Package, roles: ['Admin', 'Manager'] },
      { id: 'employees', label: 'Employee Master', icon: Users, roles: ['Admin', 'Manager'] },
      { id: 'customers', label: 'Customer Master', icon: Users, roles: ['Admin', 'Manager'] },
      { id: 'vendors', label: 'Vendor Master', icon: Building2, roles: ['Admin', 'Manager'] }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    roles: ['Admin'],
    subItems: [
      { id: 'settings', label: 'General Settings', icon: Settings, roles: ['Admin'] },
      { id: 'user-management', label: 'User Management', icon: Shield, roles: ['Admin'] }
    ]
  }
];
