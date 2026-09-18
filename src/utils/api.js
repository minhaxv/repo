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

  logout() {
    localStorage.removeItem('stitch_auth_token');
  },

  // Fetch all initial data
  async fetchAll() {
    const res = await fetch(`${API_BASE}/all`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`API fetchAll failed with status ${res.status}`);
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

  // Customers
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
  }
};

export default api;
