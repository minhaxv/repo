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
  Trash2
} from 'lucide-react';

/**
 * Single Canonical Navigation Structure
 * Enforces strictly ONE logical navigation location per feature.
 * Zero duplicate screens, zero redundant routes.
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
      { id: 'wastage', label: 'Wastage Tracking', icon: Trash2, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'workflows', label: 'Production Routes', icon: Workflow, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory & Purchases',
    icon: Boxes,
    roles: ['Admin', 'Manager', 'Production', 'Accounts'],
    subItems: [
      { id: 'inventory', label: 'Stock Register', icon: Boxes, highlight: true, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'materials-spec', label: 'Media & Materials', icon: Layers, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'purchase', label: 'Purchases & POs', icon: ShoppingBag, roles: ['Admin', 'Manager', 'Production', 'Accounts'] }
    ]
  },
  {
    id: 'crm',
    label: 'Customers & CRM',
    icon: Users,
    roles: ['Admin', 'Manager', 'Sales', 'Accounts'],
    subItems: [
      { id: 'customers', label: 'Customers Directory', icon: Users, highlight: true, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'sales-persons', label: 'Sales Persons', icon: TrendingUp, roles: ['Admin', 'Manager', 'Sales'] },
      { id: 'care-of-persons', label: 'Care Of / Partners', icon: UserCheck, roles: ['Admin', 'Manager', 'Sales'] }
    ]
  },
  {
    id: 'outsource',
    label: 'Outsource Work',
    icon: Building2,
    roles: ['Admin', 'Manager', 'Production', 'Accounts'],
    subItems: [
      { id: 'outsource-jobs', label: 'Outsource Work Orders', icon: Briefcase, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'outsource-bills', label: 'Bills & Payments', icon: Receipt, highlight: true, roles: ['Admin', 'Manager', 'Production', 'Accounts'] },
      { id: 'vendors', label: 'Outsource Vendors', icon: Building2, roles: ['Admin', 'Manager', 'Production'] }
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
    label: 'HR & Staff',
    icon: UserCheck,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'employees', label: 'Employees Directory', icon: Users, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'attendance', label: 'Attendance & Biometrics', icon: Clock, roles: ['Admin', 'Manager'] },
      { id: 'hr-payroll', label: 'Payroll & Salaries', icon: DollarSign, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'report-employee-work', label: 'Daily Work Report', icon: FileText, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'masters-settings',
    label: 'Master Data & Settings',
    icon: Settings,
    roles: ['Admin', 'Manager'],
    subItems: [
      { id: 'products', label: 'Products Master', icon: Package, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'machines', label: 'Machines & Printers', icon: Cpu, roles: ['Admin', 'Manager'] },
      { id: 'user-management', label: 'User Accounts & Roles', icon: Shield, roles: ['Admin'] },
      { id: 'settings', label: 'Settings & Data Reset', icon: Settings, roles: ['Admin'] },
      { id: 'sales-order-audit', label: 'System Audit Logs', icon: History, roles: ['Admin', 'Manager'] },
      { id: 'reports', label: 'Executive Reports', icon: BarChart3, roles: ['Admin', 'Manager'] }
    ]
  }
];
