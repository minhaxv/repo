const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('stitch_auth_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Auth
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Login failed');
    if (data.token) {
      localStorage.setItem('stitch_auth_token', data.token);
      localStorage.setItem('stitch_erp_active_user', JSON.stringify(data.user));
    }
    return data;
  },

  async fetchMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Session invalid');
    return await res.json();
  },

  async switchUser(target) {
    const res = await fetch(`${API_BASE}/auth/switch-user`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        userId: target.userId || target.id,
        employeeId: target.employeeId || target.id,
        username: target.username || target.name
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to switch user');
    if (data.token) {
      localStorage.setItem('stitch_auth_token', data.token);
      localStorage.setItem('stitch_erp_active_user', JSON.stringify(data.user));
    }
    return data;
  },

  logout() {
    localStorage.removeItem('stitch_auth_token');
    localStorage.removeItem('stitch_erp_active_user');
  },

  // Fetch all initial data
  async fetchAll() {
    const res = await fetch(`${API_BASE}/all`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchAll failed with status ${res.status}`);
    return await res.json();
  },

  // Search Customers
  async searchCustomers(query = '', limit = 20) {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await fetch(`${API_BASE}/customers/search?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Search customers failed`);
    return await res.json();
  },

  // Search Products
  async searchProducts(query = '', category = '', limit = 30) {
    const params = new URLSearchParams({ q: query, category, limit: String(limit) });
    const res = await fetch(`${API_BASE}/products/search?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Search products failed`);
    return await res.json();
  },

  // Company Profile
  async updateCompanyProfile(profile) {
    const res = await fetch(`${API_BASE}/company-profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Failed to update company profile');
    return await res.json();
  },

  // Products
  async createProduct(product, specs) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ product, specs })
    });
    if (!res.ok) throw new Error(`API createProduct failed`);
    return await res.json();
  },

  async updateProduct(id, product, specs) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ product, specs })
    });
    if (!res.ok) throw new Error(`API updateProduct failed`);
    return await res.json();
  },

  async deleteProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error(`API deleteProduct failed`);
    return await res.json();
  },

  async searchProducts(query = '', limit = 25) {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await fetch(`${API_BASE}/products/search?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API searchProducts failed`);
    return await res.json();
  },

  // Customers
  async searchCustomers(query = '', limit = 25) {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const res = await fetch(`${API_BASE}/customers/search?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API searchCustomers failed`);
    return await res.json();
  },

  async createCustomer(customer) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(customer)
    });
    if (!res.ok) throw new Error(`API createCustomer failed`);
    return await res.json();
  },

  async updateCustomer(id, customer) {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(customer)
    });
    if (!res.ok) throw new Error(`API updateCustomer failed`);
    return await res.json();
  },

  // Sales Orders (Atomic creation of Order + Line Items + Job Work + Outsource Jobs)
  async createSalesOrder(orderData) {
    const res = await fetch(`${API_BASE}/sales-orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || `API createSalesOrder failed`);
    return data;
  },

  // Sales Order Edit with Optimistic Locking
  async updateSalesOrder(id, orderData) {
    const res = await fetch(`${API_BASE}/sales-orders/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || `API updateSalesOrder failed`);
    return data;
  },

  // Sales Order Cancellation
  async cancelSalesOrder(id, reason) {
    const res = await fetch(`${API_BASE}/sales-orders/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || `API cancelSalesOrder failed`);
    return data;
  },

  // Production Status update
  async updateProductionStatus(orderId, itemId, status) {
    const res = await fetch(`${API_BASE}/sales-orders/${orderId}/items/${itemId}/production-status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || `API updateProductionStatus failed`);
    return data;
  },

  // Artwork Proofs & Approvals
  async fetchOrderArtwork(orderId) {
    const res = await fetch(`${API_BASE}/sales-orders/${orderId}/artwork`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchOrderArtwork failed`);
    return await res.json();
  },

  async createOrderArtwork(orderId, artworkData) {
    const res = await fetch(`${API_BASE}/sales-orders/${orderId}/artwork`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(artworkData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || `API createOrderArtwork failed`);
    return data;
  },

  async approveArtwork(versionId, approvalData) {
    const res = await fetch(`${API_BASE}/artwork/${versionId}/approve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(approvalData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || `API approveArtwork failed`);
    return data;
  },

  // Partial Deliveries & Dispatches
  async fetchDeliveries(filters = {}) {
    const params = new URLSearchParams();
    if (filters.orderId) params.append('orderId', filters.orderId);
    if (filters.customerId) params.append('customerId', filters.customerId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/deliveries${qs}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchDeliveries failed`);
    return await res.json();
  },

  async createDelivery(deliveryData) {
    const res = await fetch(`${API_BASE}/deliveries`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(deliveryData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || `API createDelivery failed`);
    return data;
  },

  // Customer Outstanding Reconciliation
  async fetchCustomerReconciliation() {
    const res = await fetch(`${API_BASE}/customers/reconciliation`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchCustomerReconciliation failed`);
    return await res.json();
  },

  // Database Online Backups
  async fetchBackups() {
    const res = await fetch(`${API_BASE}/backup/list`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchBackups failed`);
    return await res.json();
  },

  async createBackup() {
    const res = await fetch(`${API_BASE}/backup/create`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || `API createBackup failed`);
    return data;
  },

  // Worker 0.5% Profit Incentive Log
  async recordWorkerIncentive(incentiveData) {
    const res = await fetch(`${API_BASE}/worker-incentives`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(incentiveData)
    });
    if (!res.ok) throw new Error(`API recordWorkerIncentive failed`);
    return await res.json();
  },

  // Biometric ZKTeco K90 Integration
  async fetchDeviceUsers() {
    const res = await fetch(`${API_BASE}/biometric/device-users`);
    if (!res.ok) throw new Error(`API fetchDeviceUsers failed`);
    return await res.json();
  },

  async importK90Users(deviceId = 'DEV-K90-01') {
    const res = await fetch(`${API_BASE}/biometric/import-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });
    if (!res.ok) throw new Error(`API importK90Users failed`);
    return await res.json();
  },

  async mapBiometricUser(mappingId, employeeId) {
    const res = await fetch(`${API_BASE}/biometric/map-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappingId, employeeId })
    });
    if (!res.ok) throw new Error(`API mapBiometricUser failed`);
    return await res.json();
  },

  async unlinkBiometricUser(mappingId) {
    const res = await fetch(`${API_BASE}/biometric/unlink-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappingId })
    });
    if (!res.ok) throw new Error(`API unlinkBiometricUser failed`);
    return await res.json();
  },

  async createAndMapEmployee(mappingId, employeeData) {
    const res = await fetch(`${API_BASE}/biometric/create-and-map-employee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappingId, employeeData })
    });
    if (!res.ok) throw new Error(`API createAndMapEmployee failed`);
    return await res.json();
  },

  async assignBiometricId(employeeId, deviceId, biometricUserId, biometricName) {
    const res = await fetch(`${API_BASE}/biometric/assign-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, deviceId, biometricUserId, biometricName })
    });
    if (!res.ok) throw new Error(`API assignBiometricId failed`);
    return await res.json();
  },

  // Production Processes (Process Master)
  async fetchProcesses() {
    const res = await fetch(`${API_BASE}/processes`);
    if (!res.ok) throw new Error(`API fetchProcesses failed`);
    return await res.json();
  },

  async createProcess(process) {
    const res = await fetch(`${API_BASE}/processes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(process)
    });
    if (!res.ok) throw new Error(`API createProcess failed`);
    return await res.json();
  },

  async updateProcess(id, process) {
    const res = await fetch(`${API_BASE}/processes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(process)
    });
    if (!res.ok) throw new Error(`API updateProcess failed`);
    return await res.json();
  },

  async deleteProcess(id) {
    const res = await fetch(`${API_BASE}/processes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API deleteProcess failed`);
    return await res.json();
  },

  // Multi-Task Employee Production Tasks / Work Logs
  async fetchProductionTasks(filters = {}) {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.orderId) params.append('orderId', filters.orderId);
    if (filters.status) params.append('status', filters.status);
    if (filters.processId) params.append('processId', filters.processId);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/production-tasks${qs}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchProductionTasks failed`);
    return await res.json();
  },

  async fetchAvailableProductionTasks() {
    const res = await fetch(`${API_BASE}/production-tasks/available`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchAvailableProductionTasks failed`);
    return await res.json();
  },

  async takeProductionTask(id) {
    const res = await fetch(`${API_BASE}/production-tasks/${id}/take`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to claim work');
    return data;
  },

  async takeJobOrderItem(itemData) {
    const res = await fetch(`${API_BASE}/production-tasks/take-item`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(itemData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to claim job item');
    return data;
  },

  async reassignProductionTask(id, reassignData) {
    const res = await fetch(`${API_BASE}/production-tasks/${id}/reassign`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(reassignData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reassign task');
    return data;
  },

  async fetchEmployeeWorkload() {
    const res = await fetch(`${API_BASE}/production-tasks/workload`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchEmployeeWorkload failed`);
    return await res.json();
  },

  async fetchTaskTimeline(id) {
    const res = await fetch(`${API_BASE}/production-tasks/${id}/timeline`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchTaskTimeline failed`);
    return await res.json();
  },

  async createProductionTask(task) {
    const res = await fetch(`${API_BASE}/production-tasks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error(`API createProductionTask failed`);
    return await res.json();
  },

  async updateProductionTask(id, task) {
    const res = await fetch(`${API_BASE}/production-tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error(`API updateProductionTask failed`);
    return await res.json();
  },

  async executeTaskAction(id, actionData) {
    const res = await fetch(`${API_BASE}/production-tasks/${id}/action`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(actionData)
    });
    if (!res.ok) throw new Error(`API executeTaskAction failed`);
    return await res.json();
  },

  async deleteProductionTask(id) {
    const res = await fetch(`${API_BASE}/production-tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`API deleteProductionTask failed`);
    return await res.json();
  },

  // Persistent Expenses
  async fetchExpenses() {
    const res = await fetch(`${API_BASE}/expenses`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchExpenses failed`);
    return await res.json();
  },

  async createExpense(expenseData) {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expenseData)
    });
    if (!res.ok) throw new Error(`API createExpense failed`);
    return await res.json();
  },

  async deleteExpense(id) {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`API deleteExpense failed`);
    return await res.json();
  },

  // Inventory Transactions Ledger
  async fetchInventoryTransactions() {
    const res = await fetch(`${API_BASE}/inventory/transactions`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchInventoryTransactions failed`);
    return await res.json();
  },

  async createInventoryTransaction(txData) {
    const res = await fetch(`${API_BASE}/inventory/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(txData)
    });
    if (!res.ok) throw new Error(`API createInventoryTransaction failed`);
    return await res.json();
  },

  // Persistent Payroll
  async fetchPayroll() {
    const res = await fetch(`${API_BASE}/payroll`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchPayroll failed`);
    return await res.json();
  },

  async commitPayroll(payrollData) {
    const res = await fetch(`${API_BASE}/payroll/commit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payrollData)
    });
    if (!res.ok) throw new Error(`API commitPayroll failed`);
    return await res.json();
  },

  // Payments
  async recordPayment(paymentData) {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(paymentData)
    });
    if (!res.ok) throw new Error(`API recordPayment failed`);
    return await res.json();
  },

  // Audit Logs
  async fetchAuditLogs(limit = 100) {
    const res = await fetch(`${API_BASE}/audit-logs?limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchAuditLogs failed`);
    return await res.json();
  },

  // Rework Tickets
  async fetchReworkTickets() {
    const res = await fetch(`${API_BASE}/rework-tickets`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchReworkTickets failed`);
    return await res.json();
  },

  async createReworkTicket(ticketData) {
    const res = await fetch(`${API_BASE}/rework-tickets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(ticketData)
    });
    if (!res.ok) throw new Error(`API createReworkTicket failed`);
    return await res.json();
  },

  // Quotation Conversion
  async convertQuotation(quotationId) {
    const res = await fetch(`${API_BASE}/quotations/${quotationId}/convert`, {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to convert quotation');
    return data;
  },

  // Machines API
  async fetchMachines() {
    const res = await fetch(`${API_BASE}/machines`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchMachines failed`);
    return await res.json();
  },
  async createMachine(machineData) {
    const res = await fetch(`${API_BASE}/machines`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(machineData)
    });
    if (!res.ok) throw new Error(`API createMachine failed`);
    return await res.json();
  },
  async updateMachine(id, machineData) {
    const res = await fetch(`${API_BASE}/machines/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(machineData)
    });
    if (!res.ok) throw new Error(`API updateMachine failed`);
    return await res.json();
  },
  async deleteMachine(id) {
    const res = await fetch(`${API_BASE}/machines/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error(`API deleteMachine failed`);
    return await res.json();
  },

  // Double-Entry Accounting API
  async fetchJournals(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.voucherType) params.append('voucherType', filters.voucherType);
    if (filters.search) params.append('search', filters.search);
    const res = await fetch(`${API_BASE}/accounting/journals?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchJournals failed`);
    return await res.json();
  },
  async postJournal(voucherData) {
    const res = await fetch(`${API_BASE}/accounting/journals`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(voucherData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post journal voucher');
    return data;
  },
  async fetchLedger(filters = {}) {
    const params = new URLSearchParams();
    if (filters.account) params.append('account', filters.account);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    const res = await fetch(`${API_BASE}/accounting/ledger?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchLedger failed`);
    return await res.json();
  },
  async fetchTrialBalance() {
    const res = await fetch(`${API_BASE}/accounting/reports/trial-balance`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchTrialBalance failed`);
    return await res.json();
  },
  async fetchProfitAndLoss() {
    const res = await fetch(`${API_BASE}/accounting/reports/profit-loss`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchProfitAndLoss failed`);
    return await res.json();
  },
  async fetchBalanceSheet() {
    const res = await fetch(`${API_BASE}/accounting/reports/balance-sheet`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchBalanceSheet failed`);
    return await res.json();
  },
  async fetchGstSummary() {
    const res = await fetch(`${API_BASE}/accounting/reports/gst-summary`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchGstSummary failed`);
    return await res.json();
  },

  // Admin User Control & Permissions API
  async fetchUsers() {
    const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchUsers failed`);
    return await res.json();
  },
  async getControlMatrix() {
    const res = await fetch(`${API_BASE}/users/control-matrix`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to fetch employee control matrix');
    return data;
  },
  async createUser(userData) {
    const res = await fetch(`${API_BASE}/users/create`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to create user account');
    return data;
  },
  async updateUserStatus(userId, status, reason = '') {
    const res = await fetch(`${API_BASE}/users/${userId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to update account status');
    return data;
  },
  async updateUserPermissions(userId, { role, overrides, allowedProcesses, reason = '' }) {
    const res = await fetch(`${API_BASE}/users/${userId}/permissions`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ role, overrides, allowedProcesses, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to update permissions');
    return data;
  },
  async getRoles() {
    const res = await fetch(`${API_BASE}/roles`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to fetch roles');
    return data;
  },
  async getPermissions() {
    const res = await fetch(`${API_BASE}/permissions`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to fetch permissions');
    return data;
  },
  async getPermissionAuditLogs() {
    const res = await fetch(`${API_BASE}/audit-logs/permissions`, { headers: getHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error || 'Failed to fetch audit logs');
    return data;
  }
};

export default api;
