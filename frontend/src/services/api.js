import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Her isteğe JWT token ekle
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - 401 hatalarını yakala
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token geçersiz veya süresi dolmuş
      localStorage.removeItem('token');
      
      // Login sayfasında değilsek yönlendir
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Users API
export const getUsers = () => api.get('/users');
export const getUser = (id) => api.get(`/users/${id}`);
export const createUser = (data) => api.post('/users', data);
export const createBulkUsers = (users) => api.post('/users/bulk', { users });
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const getUsersByGroup = (group) => api.get(`/users/group/${group}`);

// Campaigns API
export const getCampaigns = () => api.get('/campaigns');
export const getCampaign = (id) => api.get(`/campaigns/${id}`);
export const createCampaign = (data) => api.post('/campaigns', data);
export const updateCampaign = (id, data) => api.put(`/campaigns/${id}`, data);
export const deleteCampaign = (id) => api.delete(`/campaigns/${id}`);
export const sendCampaign = (id) => api.post(`/campaigns/${id}/send`);
export const stopCampaign = (id) => api.post(`/campaigns/${id}/stop`);

// Reports API
export const getOverviewReport = () => api.get('/reports');
export const getCampaignReport = (id) => api.get(`/reports/${id}`);
export const getCampaignEvents = (id, type) => {
  const params = type ? { type } : {};
  return api.get(`/reports/${id}/events`, { params });
};
export const getUserReport = (id) => api.get(`/reports/user/${id}`);

// Export API
export const exportCampaignPDF = (id) => 
  api.get(`/reports/${id}/export/pdf`, { responseType: 'blob' });
export const exportCampaignCSV = (id) => 
  api.get(`/reports/${id}/export/csv`, { responseType: 'blob' });

// Scheduled Campaigns API
export const getScheduledCampaigns = () => api.get('/scheduled-campaigns');
export const getScheduledCampaign = (id) => api.get(`/scheduled-campaigns/${id}`);
export const createScheduledCampaign = (data) => api.post('/scheduled-campaigns', data);
export const updateScheduledCampaign = (id, data) => api.put(`/scheduled-campaigns/${id}`, data);
export const deleteScheduledCampaign = (id) => api.delete(`/scheduled-campaigns/${id}`);
export const startScheduledCampaign = (id) => api.post(`/scheduled-campaigns/${id}/start`);
export const stopScheduledCampaign = (id) => api.post(`/scheduled-campaigns/${id}/stop`);
export const executeScheduledCampaign = (id) => api.post(`/scheduled-campaigns/${id}/execute`);

export default api;
