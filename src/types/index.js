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
