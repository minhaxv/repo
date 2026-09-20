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
      { id: 'customers', label: 'Customers', icon: Users, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'quotations', label: 'Quotations', icon: FileText, roles: ['Admin', 'Manager', 'Sales'] },
      { id: 'sales-orders', label: 'Sales Orders', icon: ShoppingCart, highlight: true, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'gst-invoicing', label: 'Invoices', icon: Receipt, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] },
      { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['Admin', 'Manager', 'Sales', 'Accounts'] }
    ]
  },
  {
    id: 'production',
    label: 'Production',
    icon: Factory,
    roles: ['Admin', 'Manager', 'Production', 'Designer'],
    subItems: [
      { id: 'production', label: 'Production Board', icon: Factory, highlight: true, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'my-work', label: 'My Work', icon: UserCheck, highlight: true, roles: ['Admin', 'Manager', 'Production', 'Designer'] },
      { id: 'available-work', label: 'Available Work', icon: Clock, roles: ['Admin', 'Manager', 'Production', 'Designer'] },
      { id: 'job-cards', label: 'Job Cards', icon: FileText, roles: ['Admin', 'Manager', 'Production', 'Sales'] },
      { id: 'designers', label: 'Designing', icon: Palette, roles: ['Admin', 'Manager', 'Designer'] },
      { id: 'printing-dept', label: 'Printing', icon: Printer, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'finishing-dept', label: 'Finishing', icon: Scissors, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'qc-dept', label: 'QC', icon: CheckSquare, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'wastage', label: 'Wastage', icon: Trash2, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'machines', label: 'Machines', icon: Cpu, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    roles: ['Admin', 'Manager', 'Production'],
    subItems: [
      { id: 'inventory', label: 'Stock', icon: Boxes, highlight: true, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'materials-spec', label: 'Materials', icon: Layers, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'stock-ledger', label: 'Stock Ledger', icon: History, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'purchase', label: 'Purchases', icon: ShoppingBag, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'suppliers', label: 'Suppliers', icon: Building2, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'outsource',
    label: 'Outsource',
    icon: Building2,
    roles: ['Admin', 'Manager', 'Production'],
    subItems: [
      { id: 'vendors', label: 'Vendors', icon: Building2, roles: ['Admin', 'Manager', 'Production'] },
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
      { id: 'delivery-dispatch', label: 'Dispatch', icon: Truck, roles: ['Admin', 'Manager', 'Delivery'] },
      { id: 'delivery-installation', label: 'Installation', icon: CheckCircle2, roles: ['Admin', 'Manager', 'Delivery'] },
      { id: 'delivery-pod', label: 'POD', icon: CheckSquare, roles: ['Admin', 'Manager', 'Delivery'] }
    ]
  },
  {
    id: 'hr-section',
    label: 'HR',
    icon: UserCheck,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'employees', label: 'Employees', icon: Users, roles: ['Admin', 'Manager'] },
      { id: 'attendance', label: 'Attendance', icon: Clock, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'biometrics', label: 'Biometric', icon: Cpu, roles: ['Admin', 'Manager'] },
      { id: 'hr-payroll', label: 'Payroll', icon: DollarSign, highlight: true, roles: ['Admin', 'Manager', 'Accounts'] }
    ]
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: CreditCard,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'outstanding-receivables', label: 'Receivables', icon: ArrowDownLeft, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'outstanding-payables', label: 'Payables', icon: ArrowUpRight, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'expense-entry', label: 'Expenses', icon: DollarSign, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'journal-entries', label: 'Journal', icon: BookOpen, highlight: true, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'general-ledger', label: 'Ledger', icon: FileSpreadsheet, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'gst-summary', label: 'GST', icon: Receipt, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'income-statement', label: 'P&L', icon: TrendingUp, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'balance-sheet', label: 'Balance Sheet', icon: Scale, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'cash-flow', label: 'Cash Flow', icon: Landmark, roles: ['Admin', 'Manager', 'Accounts'] }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['Admin', 'Manager'],
    subItems: []
  },
  {
    id: 'admin-section',
    label: 'Admin',
    icon: Shield,
    roles: ['Admin', 'Manager'],
    subItems: [
      { id: 'user-management', label: 'Users', icon: Shield, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'roles-permissions', label: 'Roles & Permissions', icon: UserCheck, roles: ['Admin'] },
      { id: 'workflows', label: 'Processes', icon: Workflow, roles: ['Admin', 'Manager'] },
      { id: 'machines-admin', label: 'Machines', icon: Cpu, roles: ['Admin', 'Manager'] },
      { id: 'settings', label: 'Settings', icon: Settings, roles: ['Admin'] },
      { id: 'sales-order-audit', label: 'Audit Logs', icon: History, roles: ['Admin', 'Manager'] },
      { id: 'system-health', label: 'System Health', icon: Activity, roles: ['Admin'] }
    ]
  }
];

