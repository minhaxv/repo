// Clean Authoritative Master Structures & Zero Initial Transactional/Master Records
// Guarantees completely fresh software initialization across all modules

export const initialCompanyProfile = {
  name: "ScreenArts Digital & Signage India Pvt Ltd",
  tagline: "Total Digital, Offset, Flex & Signage Solutions",
  gstin: "32AAAAA0000A1Z5",
  state: "Kerala",
  stateCode: "32",
  phone: "+91 98470 12345",
  email: "orders@screenarts.in",
  website: "www.screenarts.online",
  address: "Building 4, Print & Signage Industrial Estate, Kozhikode, Kerala 673001",
  bankDetails: {
    bankName: "HDFC Bank Ltd",
    accountName: "ScreenArts Digital & Signage India Pvt Ltd",
    accountNo: "50200048192837",
    ifsc: "HDFC0000123",
    branch: "Goregaon East, Mumbai",
    upiId: "screenarts@hdfcbank"
  },
  termsAndConditions: "1. 50% Advance mandatory on work confirmation.\n2. GST 18% extra as applicable on all orders.\n3. Goods once dispatched/collected cannot be returned."
};

export const initialCompanyBankAccounts = [
  {
    id: "BANK-01",
    bankName: "HDFC Bank Ltd",
    accountName: "ScreenArts Digital & Signage India Pvt Ltd",
    accountNumber: "50200048192837",
    ifscCode: "HDFC0000123",
    branchName: "Goregaon East, Mumbai",
    upiId: "screenarts@hdfcbank",
    isPrimary: true,
    openingBalance: 0,
    currentBalance: 0
  }
];

// Clean 0-record datasets for fresh production start
export const initialCustomers = [];
export const initialSalesPersons = [];
export const initialCareOfPersons = [];
export const initialEmployees = [];
export const initialWorkers = [];
export const initialDesigners = [];
export const initialVendors = [];
export const initialProducts = [];
export const initialProductMaterialSpecs = [];
export const initialSalesOrders = [];
export const initialInventory = [];
export const initialPurchaseOrders = [];
export const initialPayments = [];
export const initialFollowUps = [];
export const initialAttendance = [];
export const initialPayroll = [];
export const initialWorkerJobIncentives = [];
export const initialOrderAuditLogs = [];
export const initialMachines = [];
export const initialWorkflows = [];
export const initialProductionTasks = [];

// Standard Print & Signage Production Processes Master
export const initialProductionProcesses = [
  { id: 'PROC-01', code: 'PROC-DES', name: 'Designing', category: 'Pre-Press', defaultUnit: 'Jobs', description: 'Artwork creation, vectorization, layout & prepress', isActive: true, sortOrder: 1 },
  { id: 'PROC-02', code: 'PROC-PRF', name: 'Proofing', category: 'Pre-Press', defaultUnit: 'Jobs', description: 'Sample proof generation & client approval check', isActive: true, sortOrder: 2 },
  { id: 'PROC-03', code: 'PROC-DIG', name: 'Digital Printing', category: 'Printing', defaultUnit: 'Sheets', description: 'Digital press printing (Konica, HP, Canon)', isActive: true, sortOrder: 3 },
  { id: 'PROC-04', code: 'PROC-OFF', name: 'Offset Printing', category: 'Printing', defaultUnit: 'Sheets', description: 'Commercial Heidelberg offset press runs', isActive: true, sortOrder: 4 },
  { id: 'PROC-05', code: 'PROC-LFP', name: 'Large Format Printing', category: 'Printing', defaultUnit: 'Sq.Ft', description: 'Flex, banner, vinyl, canvas roll-to-roll printing', isActive: true, sortOrder: 5 },
  { id: 'PROC-06', code: 'PROC-SCR', name: 'Screen Printing', category: 'Printing', defaultUnit: 'Pcs', description: 'Manual & semi-automatic silk screen printing', isActive: true, sortOrder: 6 },
  { id: 'PROC-07', code: 'PROC-SLM', name: 'Seal Making', category: 'Fabrication', defaultUnit: 'Nos', description: 'Rubber seal, flash stamp & polymer stamp production', isActive: true, sortOrder: 7 },
  { id: 'PROC-08', code: 'PROC-STC', name: 'Sticker Cutting', category: 'Finishing', defaultUnit: 'Pcs', description: 'Kiss-cut, half-cut & peel sticker finishing', isActive: true, sortOrder: 8 },
  { id: 'PROC-09', code: 'PROC-PLC', name: 'Plotter Cutting', category: 'Finishing', defaultUnit: 'Rft', description: 'Digital vinyl cutting, contour cutting & decals', isActive: true, sortOrder: 9 },
  { id: 'PROC-10', code: 'PROC-SCO', name: 'Scoring', category: 'Finishing', defaultUnit: 'Nos', description: 'Cardstock crease line scoring for folding', isActive: true, sortOrder: 10 },
  { id: 'PROC-11', code: 'PROC-CRE', name: 'Creasing', category: 'Finishing', defaultUnit: 'Sheets', description: 'Heavy paper and box flap creasing', isActive: true, sortOrder: 11 },
  { id: 'PROC-12', code: 'PROC-LAM', name: 'Lamination', category: 'Finishing', defaultUnit: 'Sq.Ft', description: 'Thermal, cold gloss, matte & velvet film lamination', isActive: true, sortOrder: 12 },
  { id: 'PROC-13', code: 'PROC-FLD', name: 'Folding', category: 'Finishing', defaultUnit: 'Nos', description: 'Bi-fold, tri-fold, accordion folding & map folding', isActive: true, sortOrder: 13 },
  { id: 'PROC-14', code: 'PROC-BND', name: 'Binding', category: 'Finishing', defaultUnit: 'Books', description: 'Spiral, wire-o, center pin & perfect thermal binding', isActive: true, sortOrder: 14 },
  { id: 'PROC-15', code: 'PROC-CUT', name: 'Cutting', category: 'Finishing', defaultUnit: 'Pcs', description: 'Guillotine cutting, trimming & exact sizing', isActive: true, sortOrder: 15 },
  { id: 'PROC-16', code: 'PROC-EYE', name: 'Eyelet', category: 'Post-Press', defaultUnit: 'Nos', description: 'Brass and metal eyelet punching on banner corners', isActive: true, sortOrder: 16 },
  { id: 'PROC-17', code: 'PROC-PST', name: 'Pasting', category: 'Post-Press', defaultUnit: 'Pcs', description: 'Envelopes, box flaps & mount pasting', isActive: true, sortOrder: 17 },
  { id: 'PROC-18', code: 'PROC-MNT', name: 'Mounting', category: 'Post-Press', defaultUnit: 'Sq.Ft', description: 'Foam board, sunpack, MDF & acrylic sheet mounting', isActive: true, sortOrder: 18 },
  { id: 'PROC-19', code: 'PROC-PCK', name: 'Packing', category: 'Dispatch', defaultUnit: 'Boxes', description: 'Shrink wrap, corrugated boxing & bubble wrap packaging', isActive: true, sortOrder: 19 },
  { id: 'PROC-20', code: 'PROC-QCK', name: 'Quality Check', category: 'Quality', defaultUnit: 'Jobs', description: 'Visual, dimensional, color check & quantity count', isActive: true, sortOrder: 20 },
  { id: 'PROC-21', code: 'PROC-DLV', name: 'Delivery', category: 'Dispatch', defaultUnit: 'Trips', description: 'Counter pickup handover, courier or local van transport', isActive: true, sortOrder: 21 },
  { id: 'PROC-22', code: 'PROC-OTH', name: 'Other', category: 'General', defaultUnit: 'Units', description: 'Miscellaneous custom shop-floor operations', isActive: true, sortOrder: 22 }
];
