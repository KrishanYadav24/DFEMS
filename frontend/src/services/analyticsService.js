import api from './api';

export const analyticsService = {
  async getDashboardStats() {
    const response = await api.get('/analytics/dashboard-stats');
    return response.data?.data || null;
  },

  async runCatalogQuery(type, key) {
    const response = await api.get(`/analytics/query/${type}/${key}`);
    return response.data?.data || null;
  },

  async getView(viewName) {
    const response = await api.get(`/analytics/view/${viewName}`);
    return response.data?.data || null;
  },
};
