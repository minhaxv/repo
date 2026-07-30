// Domain Constants & Types for Indian Printing & Signage Business ERP

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

export const PRODUCTION_STATUS = {
  NEW: 'New',
  DESIGN: 'Design',
  PRINTING: 'Printing',
  OUTSOURCE: 'Outsource',
  FINISHING: 'Finishing',
  QUALITY_CHECK: 'Quality Check',
  READY: 'Ready for Delivery',
  DELIVERED: 'Delivered'
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
  CREDIT: 'Credit'
};

export const DELIVERY_MODES = {
  PICKUP: 'Customer Pickup',
  COURIER: 'Courier / Transport',
  LOCAL: 'Local Express Delivery'
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
  'Rft (Running Feet)'
];

export const MATERIAL_PRESETS = [
  'Star Flex 240gsm (Frontlit)',
  'Star Flex 340gsm (Heavy Duty)',
  'Backlit Flex Media',
  'Self-Adhesive Frontlit Vinyl',
  'Eco-Solvent Glossy Vinyl',
  'Translucent Vinyl (Backlit)',
  'One Way Vision Mesh',
  '3mm Cast Acrylic Sheet',
  '5mm Cast Acrylic Sheet',
  '5mm PVC Sunboard Sheet',
  'Cast Acrylic Cutout Letters',
  'ACP Signboard Panel 3mm',
  'LED Module 1.2W Samsung IP67',
  'Standee Rollup Aluminum 2x5ft',
  'Standee Rollup Heavy 3x6ft',
  '350gsm Velvet Matte Visiting Card',
  '300gsm Art Paper Brochure',
  'Canopy Tent 6x6 ft Frame & Flex'
];
