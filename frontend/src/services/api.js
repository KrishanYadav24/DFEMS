import axios from 'axios';

// Base API client
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dfems_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized / Token Expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear expired credentials
      localStorage.removeItem('dfems_token');
      localStorage.removeItem('dfems_user');
      window.dispatchEvent(new Event('dfems_auth_expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
