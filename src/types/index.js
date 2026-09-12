// Domain Constants & Types for ScreenArts Printing, Signage & Production ERP

export const CUSTOMER_TYPES = {
  WALKIN: 'Walk-in',
  REGULAR: 'Regular',
  DEALER: 'Dealer',
  CORPORATE: 'Corporate',
  GOVT: 'Government',
  CREDIT: 'Credit Customer'
};

export const TAX_TYPES = {
  ETR: 'ETR (Exclusive Tax)',
  ITR: 'ITR (Inclusive Tax)',
  NTR: 'NTR (No Tax)'
};

// Production Stages for Printing Business
export const PRODUCTION_STAGES = {
  DESIGNING: 'Designing',
  PRINTING: 'Printing',
  FINISHING: 'Finishing',
  QUALITY_CHECK: 'Quality Check',
  READY: 'Ready for Delivery',
  DELIVERY: 'Delivered'
};

// Stage Lifecycle Statuses
export const STAGE_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  DELAYED: 'Delayed',
  CANCELLED: 'Cancelled'
};

export const STAGE_STATUS_COLORS = {
  'Pending': { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', dot: '#f59e0b' },
  'In Progress': { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd', dot: '#2563eb' },
  'Completed': { bg: '#dcfce7', text: '#15803d', border: '#86efac', dot: '#16a34a' },
  'Delayed': { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5', dot: '#dc2626' },
  'Cancelled': { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', dot: '#94a3b8' }
};

export const JOB_PRIORITIES = {
  URGENT: 'Urgent',
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low'
};

export const PRODUCTION_STATUS = {
  NEW: 'New',
  DESIGN: 'Designing',
  PRINTING: 'Printing',
  OUTSOURCE: 'Outsource',
  FINISHING: 'Finishing',
  QUALITY_CHECK: 'Quality Check',
  READY: 'Ready for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};

export const MACHINE_TYPES = {
  LARGE_FORMAT_FLEX: 'Large Format Flex & Banner',
  ECO_SOLVENT_VINYL: 'Eco-Solvent Digital Vinyl',
  UV_FLATBED: 'UV Flatbed & Roll-to-Roll',
  DIGITAL_LASER: 'Production Digital Laser Press',
  OFFSET_PRESS: 'Commercial Offset Press',
  CNC_ROUTER: 'CNC Router & Engraver',
  LASER_CUTTER: 'Fiber & CO2 Laser Cutting',
  LAMINATION: 'Thermal & Cold Roll Laminator',
  CUTTING_PLOTTER: 'Digital Die-Cutting & Plotter',
  BINDING_FOLDING: 'Folding, Creasing & Binding'
};

export const MACHINE_STATUS = {
  RUNNING: 'Running',
  IDLE: 'Idle',
  MAINTENANCE: 'Maintenance',
  BREAKDOWN: 'Breakdown'
};

export const MATERIAL_CATEGORIES = {
  PAPER: 'Paper & Cardstock',
  VINYL: 'Vinyl & Self-Adhesive Films',
  FLEX: 'Flex & Banner Media',
  FABRIC: 'Fabric & Canvas',
  BOARDS: 'Acrylic, Foam & ACP Boards',
  INK: 'Solvent, Eco-Solvent & UV Inks',
  TONER: 'Digital Toners & Developers',
  LAMINATION_FILM: 'Lamination Films (Matte/Gloss/Velvet)',
  ADHESIVES: 'Tapes, Adhesives & Glues',
  HARDWARE: 'Display Hardware & Standees',
  PACKAGING: 'Packaging & Corrugated Boxes',
  OTHER: 'Consumables & Accessories'
};

export const PAYMENT_METHODS = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  BANK: 'Bank Transfer',
  CREDIT: 'Credit Account'
};

export const PAYMENT_STATUS = {
  PAID: 'Paid',
  PARTIAL: 'Partial',
  PENDING: 'Pending',
  CREDIT: 'Credit',
  OVERDUE: 'Overdue'
};

export const DELIVERY_MODES = {
  PICKUP: 'Customer Pickup',
  OWN_DELIVERY: 'Own Delivery / Dispatch Van',
  COURIER: 'Courier / Express Cargo',
  TRANSPORT: 'Heavy Road Transport',
  PARTIAL: 'Partial Batch Delivery'
};

export const USER_ROLES = {
  ADMIN: 'Admin',
  SALES: 'Sales',
  DESIGNER: 'Designer',
  PRODUCTION: 'Production',
  ACCOUNTS: 'Accounts',
  DELIVERY: 'Delivery',
  MANAGER: 'Manager'
};

export const DEFAULT_UNITS = [
  'Sq.Ft',
  'Sq.Inch',
  'Sq.Meter',
  'Pcs',
  'Box',
  'Set',
  'Sheets',
  'Rolls',
  'Rft (Running Feet)'
];

