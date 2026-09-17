import api from './api';

export const authService = {
  /**
   * Submits credentials to backend /api/auth/login.
   * On success, stores JWT and user profile in localStorage.
   */
  async login(username, password) {
    const response = await api.post('/auth/login', {
      username: username.trim(),
      password,
    });

    if (response.data && response.data.success) {
      const { user, token } = response.data.data;
      localStorage.setItem('dfems_token', token);
      localStorage.setItem('dfems_user', JSON.stringify(user));
      return user;
    }

    throw new Error(response.data?.error || 'Authentication failed.');
  },

  /**
   * Logs out user, emits audit event, and purges local storage.
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('dfems_token');
      localStorage.removeItem('dfems_user');
      window.dispatchEvent(new Event('dfems_auth_changed'));
    }
  },

  /**
   * Retrieves current authenticated user profile from storage.
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('dfems_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  /**
   * Checks if user has an active token.
   */
  isAuthenticated() {
    return Boolean(localStorage.getItem('dfems_token'));
  },

  /**
   * Checks if current user matches given role(s).
   */
  hasRole(...roles) {
    const user = this.getCurrentUser();
    if (!user || !user.role) return false;
    const normUserRole = user.role.toLowerCase().trim();
    return roles.some((r) => {
      const normR = r.toLowerCase().trim();
      if ((normR === 'lab technician' || normR === 'forensic examiner') &&
          (normUserRole === 'lab technician' || normUserRole === 'forensic examiner')) {
        return true;
      }
      return normR === normUserRole;
    });
  },

  /**
   * Fetches fresh user data from /api/auth/me.
   */
  async fetchProfile() {
    const response = await api.get('/auth/me');
    if (response.data && response.data.success) {
      const user = response.data.data;
      localStorage.setItem('dfems_user', JSON.stringify(user));
      return user;
    }
    return null;
  },
};
