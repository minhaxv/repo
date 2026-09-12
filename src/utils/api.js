// Client REST API module for local SQLite database synchronization
const API_BASE = '/api';

export const api = {
  // Fetch all initial data
  async fetchAll() {
    const res = await fetch(`${API_BASE}/all`);
    if (!res.ok) throw new Error(`API fetchAll failed with status ${res.status}`);
    return await res.json();
  },

  // Products
  async createProduct(product, specs) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, specs })
    });
    if (!res.ok) throw new Error(`API createProduct failed`);
    return await res.json();
  },

  async updateProduct(id, product, specs) {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, specs })
    });
    if (!res.ok) throw new Error(`API updateProduct failed`);
    return await res.json();
  },

  async deleteProduct(id) {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API deleteProduct failed`);
    return await res.json();
  },

  // Customers
  async createCustomer(customer) {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer)
    });
    if (!res.ok) throw new Error(`API createCustomer failed`);
    return await res.json();
  },

  // Sales Orders (Atomic creation of Order + Line Items + Job Work + Outsource Jobs)
  async createSalesOrder(orderData) {
    const res = await fetch(`${API_BASE}/sales-orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    if (!res.ok) throw new Error(`API createSalesOrder failed`);
    return await res.json();
  },

  // Production Status update
  async updateProductionStatus(orderId, itemId, status) {
    const res = await fetch(`${API_BASE}/sales-orders/${orderId}/items/${itemId}/production-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error(`API updateProductionStatus failed`);
    return await res.json();
  },

  // Worker 0.5% Profit Incentive Log
  async recordWorkerIncentive(incentiveData) {
    const res = await fetch(`${API_BASE}/worker-incentives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/production-tasks${qs}`);
    if (!res.ok) throw new Error(`API fetchProductionTasks failed`);
    return await res.json();
  },

  async createProductionTask(task) {
    const res = await fetch(`${API_BASE}/production-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error(`API createProductionTask failed`);
    return await res.json();
  },

  async updateProductionTask(id, task) {
    const res = await fetch(`${API_BASE}/production-tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error(`API updateProductionTask failed`);
    return await res.json();
  },

  async executeTaskAction(id, actionData) {
    const res = await fetch(`${API_BASE}/production-tasks/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionData)
    });
    if (!res.ok) throw new Error(`API executeTaskAction failed`);
    return await res.json();
  },

  async deleteProductionTask(id) {
    const res = await fetch(`${API_BASE}/production-tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`API deleteProductionTask failed`);
    return await res.json();
  }
};
