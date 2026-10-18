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
export const initialProductPricingSlabs = [];
export const initialSalesOrders = [];
export const initialInventory = [];
export const initialPurchaseOrders = [];
export const initialPayments = [];
export const initialFollowUps = [];
export const initialAttendance = [];
export const initialPayroll = [];
export const initialWorkerJobIncentives = [];
export const initialOrderAuditLogs = [
  {
    id: 'AUD-REV-001',
    orderId: 'SO-2026-0891',
    orderNumber: 'SO-2026-0891',
    customerName: 'Apex Retail Solutions Pvt Ltd',
    customerMobile: '9820011223',
    actionType: 'EDITED',
    actionTitle: 'Order Revised - Material Spec Upgraded & Quantity Increased',
    actor: 'Minhaj V (Admin)',
    role: 'Admin',
    timestamp: '2026-10-18T14:30:00.000Z',
    formattedTime: '18 Oct 2026, 02:30 PM',
    reason: 'Customer requested 340gsm Blackout Flex upgrade for highway hoarding and added 2 extra entrance banners',
    previousAmount: 40600,
    newAmount: 47908,
    diffAmount: 7308,
    refundOrReversal: 0,
    changesSummary: [
      'Item #1: Quantity updated from 2 to 4 Nos',
      'Material changed: Star Flex 240gsm → 340gsm Blackout Flex',
      'Line item total revised: ₹1,200 → ₹2,400',
      'Order Grand Total increased from ₹40,600 to ₹47,908 (+₹7,308 with 18% GST)'
    ]
  },
  {
    id: 'AUD-REV-002',
    orderId: 'SO-2026-0888',
    orderNumber: 'SO-2026-0888',
    customerName: 'Kerala State Handloom Weavers Society',
    customerMobile: '9447012399',
    actionType: 'CANCELLED',
    actionTitle: 'Order Cancelled - Client Postponed Annual Expo',
    actor: 'Priya Patel',
    role: 'Sales',
    timestamp: '2026-10-17T16:15:00.000Z',
    formattedTime: '17 Oct 2026, 04:15 PM',
    reason: 'Annual state handloom exhibition postponed by authorities. Customer requested order cancellation and advance reversal.',
    previousAmount: 28450,
    newAmount: 0,
    diffAmount: -28450,
    refundOrReversal: 14000,
    changesSummary: [
      'Order Status changed: Confirmed → Cancelled',
      'Production job cards (JC-888-1, JC-888-2, JC-888-3) recalled from shop floor',
      'Advance payment ₹14,000 tagged for credit refund to customer account ledger'
    ]
  },
  {
    id: 'AUD-REV-003',
    orderId: 'SO-2026-0885',
    orderNumber: 'SO-2026-0885',
    customerName: 'Maharashtra Tourism Dev Corp (MTDC)',
    customerMobile: '9422077112',
    actionType: 'EDITED',
    actionTitle: 'Order Revised - Dimension Modification by Installation Team',
    actor: 'Ramesh Sharma',
    role: 'Sales',
    timestamp: '2026-10-15T11:20:00.000Z',
    formattedTime: '15 Oct 2026, 11:20 AM',
    reason: 'Site measurements updated by field civil engineer. Hoarding width reduced from 20ft to 16ft across 4 structures.',
    previousAmount: 98500,
    newAmount: 88500,
    diffAmount: -10000,
    refundOrReversal: 0,
    changesSummary: [
      'Item #1 Hoarding Print Size revised: 20ft x 10ft → 16ft x 10ft',
      'Total square footage reduced: 800 Sq.Ft → 640 Sq.Ft',
      'Contract subtotal revised from ₹98,500 to ₹88,500 (-₹10,000)'
    ]
  },
  {
    id: 'AUD-REV-004',
    orderId: 'SO-2026-0879-DRAFT',
    orderNumber: 'SO-2026-0879-DRAFT',
    customerName: 'Walk-in Counter Customer',
    customerMobile: '9895000000',
    actionType: 'DELETED',
    actionTitle: 'Draft Order Purged - Accidental Duplicate Entry',
    actor: 'Minhaj V (Admin)',
    role: 'Admin',
    timestamp: '2026-10-13T18:45:00.000Z',
    formattedTime: '13 Oct 2026, 06:45 PM',
    reason: 'Counter cashier accidentally created a duplicate test order while verifying digital brochure color swatch.',
    previousAmount: 3200,
    newAmount: 0,
    diffAmount: -3200,
    refundOrReversal: 0,
    changesSummary: [
      'Duplicate draft order SO-2026-0879-DRAFT permanently removed from registry',
      'Unprinted digital job sheet discarded prior to RIP processing'
    ]
  },
  {
    id: 'AUD-REV-005',
    orderId: 'SO-2026-0894',
    orderNumber: 'SO-2026-0894',
    customerName: 'Zeta Fashion Pvt Ltd',
    customerMobile: '9811099887',
    actionType: 'CONVERTED',
    actionTitle: 'Quotation Converted to Confirmed Sales Order',
    actor: 'Priya Patel',
    role: 'Sales',
    timestamp: '2026-10-12T10:00:00.000Z',
    formattedTime: '12 Oct 2026, 10:00 AM',
    reason: 'Quotation QT-2026-014 approved by brand manager via WhatsApp. 50% booking advance received via NEFT.',
    previousAmount: 0,
    newAmount: 50976,
    diffAmount: 50976,
    refundOrReversal: 0,
    changesSummary: [
      'Quotation QT-2026-014 converted to active Sales Order SO-2026-0894',
      'Received advance: ₹25,000 tagged to Order #SO-2026-0894',
      'Job cards automatically routed to Pre-Press & Large Format Printing queues'
    ]
  },
  {
    id: 'AUD-REV-006',
    orderId: 'SO-2026-0870',
    orderNumber: 'SO-2026-0870',
    customerName: 'Dr. Alok Mehta (Mehta Eye Clinic)',
    customerMobile: '9867088990',
    actionType: 'EDITED',
    actionTitle: 'Order Revised - Additional Trodat Self-Inking Stamp Added',
    actor: 'Minhaj V (Admin)',
    role: 'Admin',
    timestamp: '2026-10-10T15:10:00.000Z',
    formattedTime: '10 Oct 2026, 03:10 PM',
    reason: 'Doctor called to add an urgent Trodat Printy date & time stamp to prescription pad printing job.',
    previousAmount: 4500,
    newAmount: 5850,
    diffAmount: 1350,
    refundOrReversal: 0,
    changesSummary: [
      'Item #2 added: Trodat 4810 Self-Inking Dater Stamp (1 Nos @ ₹1,350)',
      'Order total revised from ₹4,500 to ₹5,850 (+₹1,350)'
    ]
  }
];
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
