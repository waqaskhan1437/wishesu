/**
 * Centralized API Client
 * Handles all API requests with cache busting, error handling, and consistent response format
 * Replaces duplicate apiFetch implementations across the codebase
 */

export class ApiClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.version = options.version || Date.now();
    this.defaultHeaders = options.headers || {};
    this.timeout = options.timeout || 30000;
  }

  /**
   * Build URL with cache busting parameter
   */
  _buildUrl(url, params = {}) {
    const urlObj = new URL(url, window.location.origin);

    // Add cache buster
    urlObj.searchParams.set('_t', this.version);

    // Add additional query params
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        urlObj.searchParams.set(key, params[key]);
      }
    });

    return urlObj.toString();
  }

  /**
   * Make HTTP request
   */
  async _request(url, options = {}) {
    const { params, timeout, ...fetchOptions } = options;

    const finalUrl = this._buildUrl(url, params);
    const finalOptions = {
      ...fetchOptions,
      headers: {
        ...this.defaultHeaders,
        ...fetchOptions.headers
      }
    };

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout || this.timeout);

      const response = await fetch(finalUrl, {
        ...finalOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${text}`);
        }
        return { success: true, data: text };
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(url, params = {}, options = {}) {
    return this._request(url, {
      method: 'GET',
      params,
      ...options
    });
  }

  /**
   * POST request with JSON body
   */
  async post(url, data = {}, options = {}) {
    return this._request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });
  }

  /**
   * PUT request with JSON body
   */
  async put(url, data = {}, options = {}) {
    return this._request(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this._request(url, {
      method: 'DELETE',
      ...options
    });
  }

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData(url, formData, options = {}) {
    return this._request(url, {
      method: 'POST',
      body: formData,
      ...options
    });
  }

  /**
   * Legacy compatibility: apiFetch function
   */
  async fetch(url, options = {}) {
    return this._request(url, options);
  }
}

// Create singleton instance
const apiClient = new ApiClient({
  version: Date.now()
});

// Export singleton instance
export default apiClient;

// Export convenience functions for backward compatibility
export async function apiFetch(url, options = {}) {
  return apiClient.fetch(url, options);
}

export async function apiGet(url, params = {}) {
  return apiClient.get(url, params);
}

export async function apiPost(url, data = {}) {
  return apiClient.post(url, data);
}

export async function apiPut(url, data = {}) {
  return apiClient.put(url, data);
}

export async function apiDelete(url) {
  return apiClient.delete(url);
}

export async function apiPostFormData(url, formData) {
  return apiClient.postFormData(url, formData);
}
