/**
 * System Standard Roles, Permissions, Role-Permission Templates & Production Processes
 * Provides authoritative definitions and offline fallbacks for Employee Access Control & RBAC
 */

export const ALL_PRODUCTION_PROCESSES = [
  'Flex Printing', 'Digital Printing', 'Eco-Solvent Printing', 'UV Flatbed Printing',
  'Machine Operation', 'Designing', 'Lamination', 'Plotter Cutting',
  'Acrylic Laser Cutting', 'CNC Router Engraving', 'Letter Bending',
  'Channel Letter Fabrication', 'LED Module Wiring', 'Welding & Iron Framing',
  'Eyeletting', 'Thermal Lamination', 'Foam Sheet Pasting', 'Die Cutting',
  'Scoring & Creasing', 'Hardcover Book Binding', 'Quality Inspection',
  'Packing & Wrapping', 'Dispatch', 'Site Installation'
];

export const DEFAULT_PERMISSIONS = [
  // MODULE ACCESS PERMISSIONS
  { id: 'module.dashboard', module: 'dashboard', category: 'MODULE', name: 'Dashboard Access', description: 'Access top-level KPI overview & metrics', is_dangerous: 0, display_order: 1 },
  { id: 'module.sales_orders', module: 'sales', category: 'MODULE', name: 'Sales Orders Module', description: 'Access sales orders listing and tracking', is_dangerous: 0, display_order: 2 },
  { id: 'module.quotations', module: 'sales', category: 'MODULE', name: 'Quotations Module', description: 'Access cost estimation & quotes', is_dangerous: 0, display_order: 3 },
  { id: 'module.customers', module: 'crm', category: 'MODULE', name: 'Customer Directory', description: 'Access customer records & accounts', is_dangerous: 0, display_order: 4 },
  { id: 'module.production', module: 'production', category: 'MODULE', name: 'Production Floor Module', description: 'Access production board & task dispatcher', is_dangerous: 0, display_order: 5 },
  { id: 'module.printing', module: 'production', category: 'MODULE', name: 'Printing Station', description: 'Access printing floor queue & jobs', is_dangerous: 0, display_order: 6 },
  { id: 'module.finishing', module: 'production', category: 'MODULE', name: 'Finishing & Assembly', description: 'Access fabrication & finishing queue', is_dangerous: 0, display_order: 7 },
  { id: 'module.inventory', module: 'inventory', category: 'MODULE', name: 'Inventory & Media', description: 'Access raw material stock & rolls register', is_dangerous: 0, display_order: 8 },
  { id: 'module.purchases', module: 'inventory', category: 'MODULE', name: 'Purchase Orders', description: 'Access purchase order register & receipt', is_dangerous: 0, display_order: 9 },
  { id: 'module.accounting', module: 'finance', category: 'MODULE', name: 'Accounting & Ledgers', description: 'Access double-entry journals & financial books', is_dangerous: 0, display_order: 10 },
  { id: 'module.payments', module: 'finance', category: 'MODULE', name: 'Payments & Receipts', description: 'Access cashier payment recording', is_dangerous: 0, display_order: 11 },
  { id: 'module.hr', module: 'hr', category: 'MODULE', name: 'HR & Biometrics', description: 'Access employee attendance & directory', is_dangerous: 0, display_order: 12 },
  { id: 'module.payroll', module: 'hr', category: 'MODULE', name: 'Payroll & Salaries', description: 'Access staff salary slips & disbursements', is_dangerous: 1, display_order: 13 },
  { id: 'module.reports', module: 'reports', category: 'MODULE', name: 'Executive Reports', description: 'Access operational reports & analytics', is_dangerous: 0, display_order: 14 },
  { id: 'module.admin', module: 'admin', category: 'MODULE', name: 'Admin Console', description: 'Access company profile, settings & controls', is_dangerous: 1, display_order: 15 },

  // PRODUCTION ACTION PERMISSIONS
  { id: 'production.view_own', module: 'production', category: 'ACTION', name: 'View My Assigned Work', description: 'View tasks assigned specifically to current worker', is_dangerous: 0, display_order: 20 },
  { id: 'production.view_available', module: 'production', category: 'ACTION', name: 'View Available Tasks', description: 'View unassigned work matching permitted processes', is_dangerous: 0, display_order: 21 },
  { id: 'production.take_work', module: 'production', category: 'ACTION', name: 'Take Work (Claim Task)', description: 'Claim unassigned task into My Assigned Work', is_dangerous: 0, display_order: 22 },
  { id: 'production.start', module: 'production', category: 'ACTION', name: 'Start Task', description: 'Record start timestamp on machine workstation', is_dangerous: 0, display_order: 23 },
  { id: 'production.pause', module: 'production', category: 'ACTION', name: 'Pause Task', description: 'Pause execution with pause reason', is_dangerous: 0, display_order: 24 },
  { id: 'production.resume', module: 'production', category: 'ACTION', name: 'Resume Task', description: 'Resume execution of paused job', is_dangerous: 0, display_order: 25 },
  { id: 'production.complete', module: 'production', category: 'ACTION', name: 'Complete Task', description: 'Mark stage complete & trigger material consumption', is_dangerous: 0, display_order: 26 },
  { id: 'production.submit_rework', module: 'production', category: 'ACTION', name: 'Submit Rework Ticket', description: 'Log rejection or rework issue with reason', is_dangerous: 0, display_order: 27 },

  // PRODUCTION MANAGEMENT PERMISSIONS
  { id: 'production.view_all', module: 'production', category: 'ACTION', name: 'View All Floor Tasks', description: 'See all jobs across all departments and staff', is_dangerous: 0, display_order: 30 },
  { id: 'production.view_employee_workload', module: 'production', category: 'ACTION', name: 'View Workload Roster', description: 'Inspect active tasks and output per operator', is_dangerous: 0, display_order: 31 },
  { id: 'production.assign', module: 'production', category: 'ACTION', name: 'Assign Tasks', description: 'Manually dispatch task to a specific worker or machine', is_dangerous: 0, display_order: 32 },
  { id: 'production.reassign', module: 'production', category: 'ACTION', name: 'Reassign Tasks', description: 'Change assigned worker or release claimed job', is_dangerous: 0, display_order: 33 },
  { id: 'production.change_status', module: 'production', category: 'ACTION', name: 'Override Stage Status', description: 'Directly alter job card lifecycle status', is_dangerous: 0, display_order: 34 },
  { id: 'production.override_workflow', module: 'production', category: 'ACTION', name: 'Override Routing Workflow', description: 'Bypass standard sequential stage routing', is_dangerous: 1, display_order: 35 },

  // SALES ACTION PERMISSIONS
  { id: 'sales.view_orders', module: 'sales', category: 'ACTION', name: 'View Sales Orders', description: 'View customer sales orders list', is_dangerous: 0, display_order: 40 },
  { id: 'sales.create_order', module: 'sales', category: 'ACTION', name: 'Create Sales Order', description: 'Book new print orders with customer specifications', is_dangerous: 0, display_order: 41 },
  { id: 'sales.edit_order', module: 'sales', category: 'ACTION', name: 'Edit Sales Order', description: 'Update pending order items or specifications', is_dangerous: 0, display_order: 42 },
  { id: 'sales.cancel_order', module: 'sales', category: 'ACTION', name: 'Cancel Sales Order', description: 'Cancel an order before production starts', is_dangerous: 1, display_order: 43 },
  { id: 'sales.view_customers', module: 'crm', category: 'ACTION', name: 'View Customers', description: 'Browse customer directory and history', is_dangerous: 0, display_order: 44 },
  { id: 'sales.create_customer', module: 'crm', category: 'ACTION', name: 'Create Customer', description: 'Register new client with mobile and GSTIN', is_dangerous: 0, display_order: 45 },
  { id: 'sales.edit_customer', module: 'crm', category: 'ACTION', name: 'Edit Customer', description: 'Update customer contact or address details', is_dangerous: 0, display_order: 46 },
  { id: 'sales.create_quotation', module: 'sales', category: 'ACTION', name: 'Create Quotation', description: 'Generate quotation estimate for prospective client', is_dangerous: 0, display_order: 47 },
  { id: 'sales.convert_quotation', module: 'sales', category: 'ACTION', name: 'Convert Quotation to Order', description: 'Convert quotation into firm confirmed sales order', is_dangerous: 0, display_order: 48 },
  { id: 'sales.view_invoices', module: 'sales', category: 'ACTION', name: 'View Tax Invoices', description: 'View and print official GST sales invoices', is_dangerous: 0, display_order: 49 },

  // BILLING & CASHIER PERMISSIONS
  { id: 'billing.create_invoice', module: 'billing', category: 'ACTION', name: 'Generate Tax Invoice', description: 'Issue finalized GST invoice with number sequence', is_dangerous: 0, display_order: 50 },
  { id: 'billing.collect_payment', module: 'billing', category: 'ACTION', name: 'Collect & Record Payment', description: 'Record advance, cash, UPI or cheque receipt', is_dangerous: 0, display_order: 51 },
  { id: 'billing.view_payments', module: 'billing', category: 'ACTION', name: 'View Payment Receipts', description: 'View transaction receipts and bank vouchers', is_dangerous: 0, display_order: 52 },
  { id: 'billing.reverse_payment', module: 'billing', category: 'ACTION', name: 'Reverse / Refund Payment', description: 'Void receipt or refund client money', is_dangerous: 1, display_order: 53 },

  // ACCOUNTING PERMISSIONS
  { id: 'accounting.view_ledger', module: 'accounting', category: 'ACTION', name: 'View General Ledger', description: 'Browse chart of accounts and debit/credit ledger', is_dangerous: 0, display_order: 60 },
  { id: 'accounting.view_customer_ledger', module: 'accounting', category: 'ACTION', name: 'View Customer Statements', description: 'Party ledger statement for customers', is_dangerous: 0, display_order: 61 },
  { id: 'accounting.view_supplier_ledger', module: 'accounting', category: 'ACTION', name: 'View Supplier Statements', description: 'Party ledger statement for vendors', is_dangerous: 0, display_order: 62 },
  { id: 'accounting.view_receivables', module: 'accounting', category: 'ACTION', name: 'View Receivables & Payables', description: 'Track outstanding balances and aging analysis', is_dangerous: 0, display_order: 63 },
  { id: 'accounting.view_payables', module: 'accounting', category: 'ACTION', name: 'View Outsource Payables', description: 'Track vendor job work bills pending payment', is_dangerous: 0, display_order: 64 },
  { id: 'accounting.create_journal', module: 'accounting', category: 'ACTION', name: 'Post Journal Voucher', description: 'Create balanced double-entry vouchers', is_dangerous: 0, display_order: 65 },
  { id: 'accounting.edit_journal', module: 'accounting', category: 'ACTION', name: 'Edit Journal Voucher', description: 'Modify draft or posted journal voucher', is_dangerous: 1, display_order: 66 },
  { id: 'accounting.approve_journal', module: 'accounting', category: 'ACTION', name: 'Approve Journal Voucher', description: 'Authorize formal voucher posting to books', is_dangerous: 1, display_order: 67 },
  { id: 'accounting.view_pnl', module: 'accounting', category: 'ACTION', name: 'View Profit & Loss Statement', description: 'View revenue, COGS and net operating income', is_dangerous: 1, display_order: 68 },
  { id: 'accounting.view_balance_sheet', module: 'accounting', category: 'ACTION', name: 'View Balance Sheet', description: 'View company assets, liabilities & capital', is_dangerous: 0, display_order: 69 },
  { id: 'accounting.view_cash_flow', module: 'accounting', category: 'ACTION', name: 'View Cash & Bank Book', description: 'Track liquidity, cash in hand and bank accounts', is_dangerous: 0, display_order: 70 },
  { id: 'accounting.view_gst', module: 'accounting', category: 'ACTION', name: 'View GST e-Filing Reports', description: 'View GSTR-1, GSTR-3B tax schedules and summaries', is_dangerous: 0, display_order: 71 },

  // HR & ATTENDANCE PERMISSIONS
  { id: 'hr.view_employees', module: 'hr', category: 'ACTION', name: 'View Employees Directory', description: 'Browse company staff roster and contact info', is_dangerous: 0, display_order: 80 },
  { id: 'hr.create_employee', module: 'hr', category: 'ACTION', name: 'Create Employee', description: 'Add new staff record into HR database', is_dangerous: 0, display_order: 81 },
  { id: 'hr.edit_employee', module: 'hr', category: 'ACTION', name: 'Edit Employee', description: 'Update employee designation or mobile', is_dangerous: 0, display_order: 82 },
  { id: 'hr.view_attendance', module: 'hr', category: 'ACTION', name: 'View Attendance & Punches', description: 'Inspect daily shift logs and biometric records', is_dangerous: 0, display_order: 83 },
  { id: 'hr.edit_attendance', module: 'hr', category: 'ACTION', name: 'Manual Attendance Correction', description: 'Correct clock-in or add missing punch manually', is_dangerous: 1, display_order: 84 },
  { id: 'hr.view_salary', module: 'hr', category: 'ACTION', name: 'View Staff Salary Info', description: 'Access base salary, commission & incentives data', is_dangerous: 1, display_order: 85 },
  { id: 'hr.create_payroll', module: 'hr', category: 'ACTION', name: 'Generate Monthly Payroll', description: 'Calculate monthly wages, OT, and deductions', is_dangerous: 1, display_order: 86 },
  { id: 'hr.approve_payroll', module: 'hr', category: 'ACTION', name: 'Authorize Salary Payout', description: 'Approve payslips for disbursement', is_dangerous: 1, display_order: 87 },

  // INVENTORY & MATERIAL PERMISSIONS
  { id: 'inventory.view_stock', module: 'inventory', category: 'ACTION', name: 'View Stock Register', description: 'Check physical rolls, vinyl, flex and substrate stock', is_dangerous: 0, display_order: 90 },
  { id: 'inventory.view_ledger', module: 'inventory', category: 'ACTION', name: 'View Inventory Movements', description: 'Audit inbound, consumption, and scrap ledger', is_dangerous: 0, display_order: 91 },
  { id: 'inventory.stock_adjustment', module: 'inventory', category: 'ACTION', name: 'Physical Stock Adjustment', description: 'Manual physical count adjustment override', is_dangerous: 1, display_order: 92 },
  { id: 'inventory.material_issue', module: 'inventory', category: 'ACTION', name: 'Issue Material to Floor', description: 'Issue substrate or inks to printing machines', is_dangerous: 0, display_order: 93 },
  { id: 'inventory.material_return', module: 'inventory', category: 'ACTION', name: 'Return Material to Stock', description: 'Return unused partial roll or substrate to stock', is_dangerous: 0, display_order: 94 },
  { id: 'inventory.view_purchases', module: 'inventory', category: 'ACTION', name: 'View Purchase Orders', description: 'Track raw material supplier orders', is_dangerous: 0, display_order: 95 },
  { id: 'inventory.create_purchase', module: 'inventory', category: 'ACTION', name: 'Create Purchase Order', description: 'Order raw media rolls from suppliers', is_dangerous: 0, display_order: 96 },
  { id: 'inventory.approve_purchase', module: 'inventory', category: 'ACTION', name: 'Approve Purchase Order', description: 'Authorize supplier procurement spend', is_dangerous: 1, display_order: 97 },
  { id: 'inventory.stock_valuation', module: 'inventory', category: 'ACTION', name: 'View Stock Valuation', description: 'View total inventory asset value at cost price', is_dangerous: 1, display_order: 98 },

  // SENSITIVE ADMIN PERMISSIONS
  { id: 'sensitive.invoice_cancel', module: 'admin', category: 'SENSITIVE', name: 'Invoice Cancellation', description: 'Void or cancel an issued GST tax invoice', is_dangerous: 1, display_order: 110 },
  { id: 'sensitive.payment_reversal', module: 'admin', category: 'SENSITIVE', name: 'Payment Reversal', description: 'Reverse cash/bank payment voucher', is_dangerous: 1, display_order: 111 },
  { id: 'sensitive.stock_adjustment', module: 'admin', category: 'SENSITIVE', name: 'Inventory Force Adjustment', description: 'Override physical stock without PO', is_dangerous: 1, display_order: 112 },
  { id: 'sensitive.journal_edit', module: 'admin', category: 'SENSITIVE', name: 'Journal Audit Override', description: 'Alter posted double-entry journal records', is_dangerous: 1, display_order: 113 },
  { id: 'sensitive.payroll_approve', module: 'admin', category: 'SENSITIVE', name: 'Payroll Final Approval', description: 'Authorize company salary disbursements', is_dangerous: 1, display_order: 114 },
  { id: 'sensitive.user_management', module: 'admin', category: 'SENSITIVE', name: 'Employee User Control', description: 'Create user logins and edit permissions', is_dangerous: 1, display_order: 115 },
  { id: 'sensitive.role_management', module: 'admin', category: 'SENSITIVE', name: 'Role Template Management', description: 'Define and edit system role permission matrices', is_dangerous: 1, display_order: 116 },
  { id: 'sensitive.gst_settings', module: 'admin', category: 'SENSITIVE', name: 'GST & Legal Settings', description: 'Configure company legal name, GSTIN & state', is_dangerous: 1, display_order: 117 },
  { id: 'sensitive.bank_settings', module: 'admin', category: 'SENSITIVE', name: 'Bank Accounts & UPI Settings', description: 'Add or modify company bank accounts & QR UPI', is_dangerous: 1, display_order: 118 }
];

export const DEFAULT_ROLES = [
  { id: 'ROLE-ADMIN', name: 'Admin', department: 'Management', description: 'Full administrative control over all ERP modules, data and security', is_system: 1 },
  { id: 'ROLE-MGT', name: 'Management', department: 'Management', description: 'Executive oversight, job approvals, workload roster and P&L analysis', is_system: 1 },
  { id: 'ROLE-SALES', name: 'Sales Executive', department: 'Sales', description: 'Customer quotes, order booking, order status and client directory', is_system: 1 },
  { id: 'ROLE-BILLING', name: 'Billing Staff', department: 'Sales', description: 'Sales invoicing, payment receipts collection and tax invoice management', is_system: 1 },
  { id: 'ROLE-DESIGNER', name: 'Designer', department: 'Design', description: 'Design workstation queue, customer proofing and artwork approvals', is_system: 1 },
  { id: 'ROLE-OPERATOR', name: 'Printing Operator', department: 'Printing', description: 'Large format digital, offset, flex and screen printing floor tasks', is_system: 1 },
  { id: 'ROLE-FINISHER', name: 'Finishing Staff', department: 'Finishing', description: 'Post-print binding, lamination, scoring, fabrication and mounting', is_system: 1 },
  { id: 'ROLE-QC', name: 'QC Staff', department: 'Quality', description: 'Quality inspection, dispatch sign-off and rework ticket logging', is_system: 1 },
  { id: 'ROLE-ACCOUNTANT', name: 'Accountant', department: 'Accounts', description: 'Double-entry day book, cash register, GST filing and reconciliation', is_system: 1 },
  { id: 'ROLE-HR', name: 'HR Staff', department: 'HR', description: 'Staff directory, daily attendance, biometric logs and leave approvals', is_system: 1 },
  { id: 'ROLE-DELIVERY', name: 'Delivery Staff', department: 'Delivery', description: 'Order dispatch, delivery challans, customer signature and COD receipt', is_system: 1 }
];

export const DEFAULT_ROLE_PERMISSION_MAPPINGS = {
  'ROLE-ADMIN': DEFAULT_PERMISSIONS.map(p => p.id),
  'ROLE-MGT': [
    'module.dashboard', 'module.sales_orders', 'module.quotations', 'module.customers',
    'module.production', 'module.printing', 'module.finishing', 'module.inventory',
    'module.purchases', 'module.accounting', 'module.payments', 'module.hr', 'module.reports',
    'production.view_all', 'production.view_employee_workload', 'production.assign', 'production.reassign', 'production.change_status', 'production.override_workflow',
    'sales.view_orders', 'sales.create_order', 'sales.edit_order', 'sales.view_customers', 'sales.create_quotation', 'sales.convert_quotation', 'sales.view_invoices',
    'accounting.view_ledger', 'accounting.view_customer_ledger', 'accounting.view_supplier_ledger', 'accounting.view_receivables', 'accounting.view_payables', 'accounting.view_pnl', 'accounting.view_balance_sheet', 'accounting.view_cash_flow', 'accounting.view_gst',
    'hr.view_employees', 'hr.view_attendance',
    'inventory.view_stock', 'inventory.view_ledger', 'inventory.view_purchases',
    'billing.view_payments'
  ],
  'ROLE-SALES': [
    'module.dashboard', 'module.sales_orders', 'module.quotations', 'module.customers', 'module.payments',
    'sales.view_orders', 'sales.create_order', 'sales.edit_order', 'sales.view_customers', 'sales.create_customer', 'sales.edit_customer', 'sales.create_quotation', 'sales.convert_quotation', 'sales.view_invoices',
    'billing.collect_payment', 'billing.view_payments'
  ],
  'ROLE-BILLING': [
    'module.dashboard', 'module.sales_orders', 'module.customers', 'module.payments',
    'sales.view_orders', 'sales.view_customers', 'sales.view_invoices',
    'billing.create_invoice', 'billing.collect_payment', 'billing.view_payments'
  ],
  'ROLE-DESIGNER': [
    'module.dashboard', 'module.production',
    'production.view_own', 'production.view_available', 'production.take_work', 'production.start', 'production.pause', 'production.resume', 'production.complete', 'production.submit_rework'
  ],
  'ROLE-OPERATOR': [
    'module.dashboard', 'module.production', 'module.printing',
    'production.view_own', 'production.view_available', 'production.take_work', 'production.start', 'production.pause', 'production.resume', 'production.complete', 'production.submit_rework',
    'inventory.material_issue'
  ],
  'ROLE-FINISHER': [
    'module.dashboard', 'module.production', 'module.finishing',
    'production.view_own', 'production.view_available', 'production.take_work', 'production.start', 'production.pause', 'production.resume', 'production.complete', 'production.submit_rework'
  ],
  'ROLE-QC': [
    'module.dashboard', 'module.production',
    'production.view_all', 'production.complete', 'production.submit_rework'
  ],
  'ROLE-ACCOUNTANT': [
    'module.dashboard', 'module.sales_orders', 'module.customers', 'module.accounting', 'module.payments',
    'sales.view_orders', 'sales.view_customers', 'sales.view_invoices',
    'billing.create_invoice', 'billing.collect_payment', 'billing.view_payments',
    'accounting.view_ledger', 'accounting.view_customer_ledger', 'accounting.view_supplier_ledger', 'accounting.view_receivables', 'accounting.view_payables', 'accounting.create_journal', 'accounting.view_balance_sheet', 'accounting.view_cash_flow', 'accounting.view_gst'
  ],
  'ROLE-HR': [
    'module.dashboard', 'module.hr',
    'hr.view_employees', 'hr.create_employee', 'hr.edit_employee', 'hr.view_attendance', 'hr.edit_attendance'
  ],
  'ROLE-DELIVERY': [
    'module.dashboard', 'module.sales_orders',
    'sales.view_orders'
  ]
};

export const DEFAULT_ROLE_PERMISSIONS = Object.entries(DEFAULT_ROLE_PERMISSION_MAPPINGS).flatMap(
  ([roleId, permIds]) => permIds.map(permId => ({
    id: `RP-${roleId}-${permId}`,
    role_id: roleId,
    permission_id: permId
  }))
);
