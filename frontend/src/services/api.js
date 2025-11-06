import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;

