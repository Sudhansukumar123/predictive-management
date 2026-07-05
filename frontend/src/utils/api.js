const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/api/v1/ws';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userEmail');
      // Optional: reload to trigger auth page redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || 'API execution failed');
  }
  return response.json();
};

export const api = {
  // Auth
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
    });
    const data = await handleResponse(res);
    localStorage.setItem('token', data.access_token);
    
    // Fetch profile to get role
    const profileRes = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const profile = await handleResponse(profileRes);
    localStorage.setItem('role', profile.role);
    localStorage.setItem('userEmail', profile.email);
    localStorage.setItem('userName', profile.full_name || '');
    return { token: data.access_token, ...profile };
  },

  register: async (email, password, role, fullName) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, full_name: fullName }),
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Machines
  getMachines: async () => {
    const res = await fetch(`${API_BASE_URL}/machines/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getMachineDetail: async (id) => {
    const res = await fetch(`${API_BASE_URL}/machines/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  injectAnomaly: async (id, anomalyType) => {
    const res = await fetch(`${API_BASE_URL}/machines/${id}/anomaly?anomaly_type=${anomalyType}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  clearAnomaly: async (id) => {
    const res = await fetch(`${API_BASE_URL}/machines/${id}/anomaly`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Sensors Upload
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_BASE_URL}/sensors/upload-csv`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(res);
  },

  // ML stats
  getMLStats: async () => {
    const res = await fetch(`${API_BASE_URL}/predictions/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  retrainModels: async () => {
    const res = await fetch(`${API_BASE_URL}/predictions/retrain`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getExplanation: async (machineId) => {
    const res = await fetch(`${API_BASE_URL}/predictions/explain/${machineId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Maintenance Scheduler
  getTasks: async () => {
    const res = await fetch(`${API_BASE_URL}/maintenance/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  createTask: async (taskData) => {
    const res = await fetch(`${API_BASE_URL}/maintenance/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(taskData)
    });
    return handleResponse(res);
  },

  updateTask: async (taskId, updateData) => {
    const res = await fetch(`${API_BASE_URL}/maintenance/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  // Inventory
  getInventory: async () => {
    const res = await fetch(`${API_BASE_URL}/inventory/`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  updateInventory: async (itemId, updateData) => {
    const res = await fetch(`${API_BASE_URL}/inventory/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(updateData)
    });
    return handleResponse(res);
  },

  getInventoryRecommendations: async () => {
    const res = await fetch(`${API_BASE_URL}/inventory/recommendations`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Chat
  queryChat: async (queryText) => {
    const res = await fetch(`${API_BASE_URL}/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ query: queryText })
    });
    return handleResponse(res);
  },

  // Reports (URLs to download directly)
  getPDFDownloadUrl: () => `${API_BASE_URL}/reports/pdf?token=${localStorage.getItem('token')}`,
  getExcelDownloadUrl: () => `${API_BASE_URL}/reports/excel?token=${localStorage.getItem('token')}`,
  getWebSocketUrl: () => WS_BASE_URL,
};
