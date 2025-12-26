import { safeFetch } from '../../api/api.js';

export const SettingsAPI = {
  async saveAnalytics(payload) {
    return safeFetch('/api/settings/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
  }
};

