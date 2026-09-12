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
  Contact
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
      { id: 'employee-tasks', label: 'Employee Production Tasks', icon: UserCheck, highlight: true, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'designers', label: 'Designing Queue', icon: Palette, roles: ['Admin', 'Manager', 'Designer'] },
      { id: 'printing-dept', label: 'Printing Floor', icon: Printer, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'finishing-dept', label: 'Finishing & Assembly', icon: Scissors, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'qc-dept', label: 'Quality Check (QC)', icon: CheckSquare, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'vendors', label: 'Outsource Vendors', icon: Building2, roles: ['Admin', 'Manager', 'Production'] }
    ]
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    roles: ['Admin', 'Manager', 'Production'],
    subItems: [
      { id: 'materials-spec', label: 'Media & Materials', icon: Layers, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'inventory', label: 'Stock Register', icon: Boxes, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'purchase', label: 'Purchases', icon: ShoppingBag, roles: ['Admin', 'Manager', 'Production'] },
      { id: 'vendors', label: 'Suppliers / Vendors', icon: Building2, roles: ['Admin', 'Manager', 'Production'] },
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
      { id: 'products', label: 'Products Master', icon: Package, roles: ['Admin', 'Manager'] },
      { id: 'materials-master', label: 'Materials Master', icon: Layers, roles: ['Admin', 'Manager'] },
      { id: 'machines', label: 'Machines Master', icon: Cpu, highlight: true, roles: ['Admin', 'Manager'] },
      { id: 'employees', label: 'Employees Master', icon: Users, roles: ['Admin', 'Manager'] },
      { id: 'workflows', label: 'Workflow Master', icon: Workflow, highlight: true, roles: ['Admin', 'Manager'] }
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: CreditCard,
    roles: ['Admin', 'Manager', 'Accounts'],
    subItems: [
      { id: 'payments', label: 'Payments & Receipts', icon: CreditCard, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'outstanding-receivables', label: 'Receivables', icon: ArrowDownLeft, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'outstanding-payables', label: 'Payables', icon: ArrowUpRight, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'expense-entry', label: 'Expenses', icon: DollarSign, roles: ['Admin', 'Manager', 'Accounts'] },
      { id: 'gst-invoicing', label: 'GST Invoices', icon: Receipt, roles: ['Admin', 'Manager', 'Accounts'] }
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

