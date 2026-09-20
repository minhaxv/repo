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
  Cpu,
  History,
  Workflow,
  Trash2,
  Scissors,
  CheckSquare,
  Printer,
  Sliders,
  Flame,
  Contact,
  Activity
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
    id: 'sales',
    label: 'Sales',
    icon: ShoppingCart,
    roles: ['Admin', 'Manager', 'Sales', 'Designer', 'Accounts'],
    subItems: [
      { id: 'quotations', label: 'Quotations', icon: FileText, roles: ['Admin', 'Manager', 'Sales'] },
      { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart, highlight: true, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'job-orders', label: 'Job Orders', icon: Factory, highlight: true, roles: ['Admin', 'Manager', 'Sales', 'Production'] },
      { id: 'gst-invoicing', label: 'Invoices', icon: Receipt, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'sales-order-audit', label: 'Order Revision Logs', icon: History, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
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
      { id: 'my-work', label: 'My Work', icon: UserCheck, highlight: true, roles: ['Admin', 'Manager', 'Production', 'Designer'] },
      { id: 'available-work', label: 'Available Work', icon: Clock, roles: ['Admin', 'Manager', 'Production', 'Designer'] },
      { id: 'job-cards', label: 'Job Cards', icon: FileText, roles: ['Admin', 'Manager', 'Production', 'Sales'] },
      { id: 'designers', label: 'Designing Queue', icon: Palette, roles: ['Admin', 'Manager', 'Designer'] },
      { id: 'printing-dept', label: 'Printing Floor', icon: Printer, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'finishing-dept', label: 'Finishing & Assembly', icon: Scissors, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'qc-dept', label: 'Quality Check (QC)', icon: CheckSquare, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'wastage', label: 'Wastage Tracking', icon: Trash2, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'machines', label: 'Machines Master', icon: Cpu, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'vendors', label: 'Outsource Vendors', icon: Building2, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    roles: ['Admin', 'Manager', 'Production'],
    subItems: [
      { id: 'inventory', label: 'Stock Register', icon: Boxes, highlight: true, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'materials-spec', label: 'Media & Materials', icon: Layers, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'stock-ledger', label: 'Stock Ledger', icon: History, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'purchase', label: 'Purchases', icon: ShoppingBag, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'suppliers', label: 'Suppliers / Vendors', icon: Building2, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'wastage', label: 'Wastage Tracking', icon: Trash2, highlight: true, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    roles: ['Admin', 'Manager', 'Sales', 'Accounts'],
    subItems: [
      { id: 'customers', label: 'Customers Directory', icon: Users, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'care-of-persons', label: 'Care Of / Partners', icon: UserCheck, highlight: true, roles: ['Admin', 'Manager', 'Sales'] },
      { id: 'sales-persons', label: 'Sales Persons', icon: TrendingUp, roles: ['Admin', 'Manager', 'Sales'] }
    ]
  },
  {
    id: 'masters',
    label: 'Master Data',
    icon: Layers,
    roles: ['Admin', 'Manager'],
    subItems: [
      { id: 'products', label: 'Products Master', icon: Package, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'materials-master', label: 'Materials Master', icon: Layers, roles: ['Admin', 'Manager'] },
      { id: 'machines', label: 'Machines Master', icon: Cpu, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'employees', label: 'Employees Master', icon: Users, roles: ['Admin', 'Manager'] },
      { id: 'workflows', label: 'Workflow Master', icon: Workflow, highlight: true, roles: ['Admin', 'Manager'] }
    ]
  },
  {
    id: 'outsource',
    label: 'Outsource',
    icon: Building2,
    roles: ['Admin', 'Manager', 'Production'],
    subItems: [
      { id: 'vendors', label: 'Vendors Directory', icon: Building2, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'outsource-jobs', label: 'Outsource Jobs', icon: Briefcase, highlight: true, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'delivery-pillar',
    label: 'Delivery',
    icon: Truck,
    roles: ['Admin', 'Manager', 'Delivery', 'Production'],
    subItems: [
      { id: 'delivery', label: 'Ready Orders', icon: Package, highlight: true, roles: ['Admin', 'Manager', 'Delivery', 'Production'] },
      { id: 'delivery-dispatch', label: 'Dispatch Register', icon: Truck, roles: ['Admin', 'Manager', 'Delivery'] },
      { id: 'delivery-installation', label: 'Installation', icon: CheckCircle2, roles: ['Admin', 'Manager', 'Delivery'] },
      { id: 'delivery-pod', label: 'Proof of Delivery (POD)', icon: CheckSquare, roles: ['Admin', 'Manager', 'Delivery'] }
    ]
  },
  {
    id: 'hr-section',
    label: 'HR & Biometrics',
    icon: UserCheck,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'employees', label: 'Employees Master', icon: Users, roles: ['Admin', 'Manager'] },
      { id: 'attendance', label: 'Attendance & Biometrics', icon: Clock, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'biometrics', label: 'Biometric Devices', icon: Cpu, roles: ['Admin', 'Manager'] },
      { id: 'hr-payroll', label: 'Payroll & Salaries', icon: DollarSign, highlight: true, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'report-employee-work', label: 'Daily Work Logs', icon: FileText, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'accounts',
    label: 'Finance & Accounts',
    icon: CreditCard,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'payments', label: 'Payments & Receipts', icon: CreditCard, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'outstanding-receivables', label: 'Receivables', icon: ArrowDownLeft, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'outstanding-payables', label: 'Payables', icon: ArrowUpRight, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'expense-entry', label: 'Expenses', icon: DollarSign, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'journal-entries', label: 'Journal Entries', icon: BookOpen, highlight: true, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'general-ledger', label: 'General Ledger', icon: FileSpreadsheet, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'gst-summary', label: 'GST Summary', icon: Receipt, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'income-statement', label: 'Profit & Loss', icon: TrendingUp, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'balance-sheet', label: 'Balance Sheet', icon: Scale, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'cash-flow', label: 'Cash Flow', icon: Landmark, roles: ['Admin', 'Manager', 'Accounts'] }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['Admin', 'Manager'],
    subItems: [
      { id: 'report-employee-work', label: 'Employee Daily Work Report', icon: FileText, highlight: true, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'report-sales', label: 'Sales Reports', icon: TrendingUp, roles: ['Admin', 'Manager'] },
      { id: 'report-production', label: 'Production Reports', icon: Factory, roles: ['Admin', 'Manager'] },
      { id: 'report-profit', label: 'Profitability Analysis', icon: DollarSign, roles: ['Admin', 'Manager'] },
      { id: 'report-stock', label: 'Inventory & Stock Report', icon: Boxes, roles: ['Admin', 'Manager'] },
      { id: 'report-accounts', label: 'Finance & Accounts', icon: BookOpen, roles: ['Admin', 'Manager'] }
    ]
  },
  {
    id: 'admin-section',
    label: 'Admin & Settings',
    icon: Shield,
    roles: ['Admin', 'Manager'],
    subItems: [
      { id: 'user-management', label: 'User Accounts', icon: Shield, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'roles-permissions', label: 'Roles & Permissions', icon: UserCheck, roles: ['Admin'] },
      { id: 'workflows', label: 'Workflow Master', icon: Workflow, roles: ['Admin', 'Manager'] },
      { id: 'machines-admin', label: 'Machines Master', icon: Cpu, roles: ['Admin', 'Manager'] },
      { id: 'settings', label: 'General Settings', icon: Settings, roles: ['Admin'] },
      { id: 'sales-order-audit', label: 'System Audit Logs', icon: History, roles: ['Admin', 'Manager'] },
      { id: 'system-health', label: 'System Diagnostics & WAL Health', icon: Activity, roles: ['Admin'] }
    ]
  }
];
