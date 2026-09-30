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
  BarChart3,
  Layers,
  Settings,
  Shield,
  Receipt,
  BookOpen,
  DollarSign,
  ArrowDownLeft,
  Clock,
  Briefcase,
  Cpu,
  History,
  Workflow,
  Trash2,
  Database
} from 'lucide-react';

/**
 * Single Canonical Navigation Structure
 * Strictly enforces ONE logical ownership location per feature.
 * Master records reside exclusively under Master Data.
 * Operational modules consume and reference master data without duplicate master management screens.
 */
export const NAVIGATION_MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['Admin', 'Manager', 'Sales', 'Designer', 'Production', 'Accounts', 'Delivery'],
    subItems: []
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    roles: ['Admin', 'Manager', 'Sales', 'Accounts'],
    subItems: [
      { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart, highlight: true, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'quotations', label: 'Quotations', icon: FileText, roles: ['Admin', 'Manager', 'Sales'] },
      { id: 'gst-invoicing', label: 'Tax Invoices', icon: Receipt, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'delivery', label: 'Delivery & Dispatch', icon: Truck, roles: ['Admin', 'Manager', 'Delivery', 'Production'] }
    ]
  },
  {
    id: 'production',
    label: 'Production',
    icon: Factory,
    roles: ['Admin', 'Manager', 'Production', 'Designer'],
    subItems: [
      { id: 'production', label: 'Production Board', icon: Factory, highlight: true, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'employee-tasks', label: 'Employee Tasks', icon: UserCheck, highlight: true, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'designers', label: 'Designing Queue', icon: Palette, roles: ['Admin', 'Manager', 'Designer'] },
      { id: 'wastage', label: 'Wastage Tracking', icon: Trash2, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory & Procurement',
    icon: Boxes,
    roles: ['Admin', 'Manager', 'Production', 'Accounts'],
    subItems: [
      { id: 'inventory', label: 'Stock Register & Balances', icon: Boxes, highlight: true, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'purchase', label: 'Purchases & POs', icon: ShoppingBag, roles: ['Admin', 'Manager', 'Production', 'Accounts'] }
    ]
  },
  {
    id: 'outsource',
    label: 'Outsource Work',
    icon: Building2,
    roles: ['Admin', 'Manager', 'Production', 'Accounts'],
    subItems: [
      { id: 'outsource-jobs', label: 'Outsource Work Orders', icon: Briefcase, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'outsource-bills', label: 'Bills & Payments', icon: Receipt, highlight: true, roles: ['Admin', 'Manager', 'Production', 'Accounts'] }
    ]
  },
  {
    id: 'crm',
    label: 'Customers & CRM',
    icon: Users,
    roles: ['Admin', 'Manager', 'Sales', 'Accounts'],
    subItems: [
      { id: 'sales-persons', label: 'Sales Persons & Commissions', icon: TrendingUp, roles: ['Admin', 'Manager', 'Sales'] },
      { id: 'care-of-persons', label: 'Care Of / Partners', icon: UserCheck, roles: ['Admin', 'Manager', 'Sales'] },
      { id: 'party-statement', label: 'Customer Ledger & Statements', icon: FileText, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] }
    ]
  },
  {
    id: 'accounts',
    label: 'Finance & Accounts',
    icon: CreditCard,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'payments', label: 'Customer Receipts', icon: CreditCard, highlight: true, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'expense-entry', label: 'Expense Entry', icon: DollarSign, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'outstanding-receivables', label: 'Receivables & Payables', icon: ArrowDownLeft, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'journal-entries', label: 'Journal Entries', icon: BookOpen, highlight: true, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'income-statement', label: 'Profit & Loss and Balance Sheet', icon: TrendingUp, roles: ['Admin', 'Manager'] }
    ]
  },
  {
    id: 'hr-section',
    label: 'HR & Staff Operations',
    icon: UserCheck,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'attendance', label: 'Attendance & Biometrics', icon: Clock, roles: ['Admin', 'Manager'] },
      { id: 'hr-payroll', label: 'Payroll & Salaries', icon: DollarSign, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'report-employee-work', label: 'Daily Work Report', icon: FileText, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'master-data',
    label: 'Master Data',
    icon: Database,
    roles: ['Admin', 'Manager'],
    subItems: [
      { id: 'products', label: 'Products & Categories Master', icon: Package, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'materials-master', label: 'Media & Materials Master', icon: Layers, roles: ['Admin', 'Manager'] },
      { id: 'customers', label: 'Customers Master', icon: Users, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'suppliers', label: 'Suppliers & Outsource Vendors', icon: Building2, roles: ['Admin', 'Manager'] },
      { id: 'employees', label: 'Employees Master', icon: UserCheck, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'machines', label: 'Machines & Equipment', icon: Cpu, roles: ['Admin', 'Manager'] },
      { id: 'workflows', label: 'Workflows & Standard Processes', icon: Workflow, roles: ['Admin', 'Manager'] }
    ]
  },
  {
    id: 'settings-admin',
    label: 'Settings & Reports',
    icon: Settings,
    roles: ['Admin', 'Manager'],
    subItems: [
      { id: 'user-management', label: 'User Accounts & Roles', icon: Shield, roles: ['Admin'] },
      { id: 'settings', label: 'Settings & Data Reset', icon: Settings, roles: ['Admin'] },
      { id: 'sales-order-audit', label: 'System Audit Logs', icon: History, roles: ['Admin', 'Manager'] },
      { id: 'reports', label: 'Executive Reports', icon: BarChart3, roles: ['Admin', 'Manager'] }
    ]
  }
];
