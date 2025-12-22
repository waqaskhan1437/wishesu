/**
 * Storage Manager
 * Wrapper for localStorage and sessionStorage with error handling and JSON support
 * Prevents scattered try-catch blocks throughout the codebase
 */

export class StorageManager {
  constructor(storageType = 'local') {
    this.storage = storageType === 'session' ? sessionStorage : localStorage;
    this.prefix = 'wishesu_';
  }

  /**
   * Build key with prefix
   */
  _buildKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Set item in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON.stringified if object)
   * @returns {boolean} Success status
   */
  set(key, value) {
    try {
      const finalKey = this._buildKey(key);
      const finalValue = typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
      this.storage.setItem(finalKey, finalValue);
      return true;
    } catch (error) {
      console.error(`Storage.set error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Get item from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Stored value or default
   */
  get(key, defaultValue = null) {
    try {
      const finalKey = this._buildKey(key);
      const value = this.storage.getItem(finalKey);

      if (value === null) {
        return defaultValue;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(value);
      } catch {
        // Return as string if not valid JSON
        return value;
      }
    } catch (error) {
      console.error(`Storage.get error for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Get string value (no JSON parsing)
   */
  getString(key, defaultValue = '') {
    try {
      const finalKey = this._buildKey(key);
      const value = this.storage.getItem(finalKey);
      return value !== null ? value : defaultValue;
    } catch (error) {
      console.error(`Storage.getString error for key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Get number value
   */
  getNumber(key, defaultValue = 0) {
    const value = this.get(key, defaultValue);
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get boolean value
   */
  getBoolean(key, defaultValue = false) {
    const value = this.getString(key);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return defaultValue;
  }

  /**
   * Get array value
   */
  getArray(key, defaultValue = []) {
    const value = this.get(key, defaultValue);
    return Array.isArray(value) ? value : defaultValue;
  }

  /**
   * Get object value
   */
  getObject(key, defaultValue = {}) {
    const value = this.get(key, defaultValue);
    return typeof value === 'object' && value !== null ? value : defaultValue;
  }

  /**
   * Check if key exists
   */
  has(key) {
    try {
      const finalKey = this._buildKey(key);
      return this.storage.getItem(finalKey) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  remove(key) {
    try {
      const finalKey = this._buildKey(key);
      this.storage.removeItem(finalKey);
      return true;
    } catch (error) {
      console.error(`Storage.remove error for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Clear all items with prefix
   */
  clear() {
    try {
      const keys = this.keys();
      keys.forEach(key => this.remove(key));
      return true;
    } catch (error) {
      console.error('Storage.clear error:', error);
      return false;
    }
  }

  /**
   * Get all keys (without prefix)
   */
  keys() {
    try {
      const allKeys = Object.keys(this.storage);
      return allKeys
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.substring(this.prefix.length));
    } catch (error) {
      console.error('Storage.keys error:', error);
      return [];
    }
  }

  /**
   * Get all items as object
   */
  getAll() {
    const result = {};
    const keys = this.keys();
    keys.forEach(key => {
      result[key] = this.get(key);
    });
    return result;
  }

  /**
   * Get storage size in bytes (approximate)
   */
  size() {
    try {
      let total = 0;
      const keys = this.keys();
      keys.forEach(key => {
        const finalKey = this._buildKey(key);
        const value = this.storage.getItem(finalKey) || '';
        total += finalKey.length + value.length;
      });
      return total * 2; // UTF-16 uses 2 bytes per character
    } catch (error) {
      return 0;
    }
  }

  /**
   * Set item with expiration
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @param {number} ttl - Time to live in milliseconds
   */
  setWithExpiry(key, value, ttl) {
    const item = {
      value,
      expiry: Date.now() + ttl
    };
    return this.set(key, item);
  }

  /**
   * Get item with expiration check
   */
  getWithExpiry(key, defaultValue = null) {
    const item = this.get(key);

    if (!item || typeof item !== 'object' || !item.expiry) {
      return defaultValue;
    }

    if (Date.now() > item.expiry) {
      this.remove(key);
      return defaultValue;
    }

    return item.value;
  }

  /**
   * Debug: Log all storage items
   */
  debug() {
    console.group('Storage Debug');
    console.log('Type:', this.storage === localStorage ? 'localStorage' : 'sessionStorage');
    console.log('Prefix:', this.prefix);
    console.log('Keys:', this.keys());
    console.log('Items:', this.getAll());
    console.log('Size:', `${(this.size() / 1024).toFixed(2)} KB`);
    console.groupEnd();
  }
}

// Create singleton instances
const localStorage = new StorageManager('local');
const sessionStorage = new StorageManager('session');

// Export instances
export default localStorage;
export { sessionStorage };

// Export convenience functions for localStorage
export function set(key, value) {
  return localStorage.set(key, value);
}

export function get(key, defaultValue) {
  return localStorage.get(key, defaultValue);
}

export function has(key) {
  return localStorage.has(key);
}

export function remove(key) {
  return localStorage.remove(key);
}
