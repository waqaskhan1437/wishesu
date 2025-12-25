/**
 * Simple State Manager
 * Centralized state management for admin dashboard
 * Prevents scattered global variables and enables reactive updates
 */

export class StateManager {
  constructor(initialState = {}) {
    this._state = { ...initialState };
    this._listeners = new Map();
    this._history = [];
    this._maxHistory = 50;
  }

  /**
   * Get current state or specific key
   */
  get(key = null) {
    if (key === null) {
      return { ...this._state };
    }
    return this._state[key];
  }

  /**
   * Set state value(s)
   * @param {string|object} keyOrObject - Key name or object with multiple keys
   * @param {*} value - Value to set (if key is string)
   */
  set(keyOrObject, value = undefined) {
    const changes = {};

    if (typeof keyOrObject === 'object') {
      Object.keys(keyOrObject).forEach(key => {
        const oldValue = this._state[key];
        const newValue = keyOrObject[key];
        if (oldValue !== newValue) {
          this._state[key] = newValue;
          changes[key] = { oldValue, newValue };
        }
      });
    } else {
      const oldValue = this._state[keyOrObject];
      if (oldValue !== value) {
        this._state[keyOrObject] = value;
        changes[keyOrObject] = { oldValue, newValue: value };
      }
    }

    // Save to history
    if (Object.keys(changes).length > 0) {
      this._addToHistory(changes);
      this._notifyListeners(changes);
    }
  }

  /**
   * Update nested state (merge instead of replace)
   */
  update(key, updates) {
    const currentValue = this._state[key];
    if (typeof currentValue === 'object' && currentValue !== null) {
      this.set(key, { ...currentValue, ...updates });
    } else {
      this.set(key, updates);
    }
  }

  /**
   * Delete state key
   */
  delete(key) {
    if (key in this._state) {
      const oldValue = this._state[key];
      delete this._state[key];
      this._notifyListeners({ [key]: { oldValue, newValue: undefined } });
    }
  }

  /**
   * Check if key exists
   */
  has(key) {
    return key in this._state;
  }

  /**
   * Clear all state
   */
  clear() {
    const oldState = { ...this._state };
    this._state = {};
    this._history = [];
    Object.keys(oldState).forEach(key => {
      this._notifyListeners({ [key]: { oldValue: oldState[key], newValue: undefined } });
    });
  }

  /**
   * Subscribe to state changes
   * @param {string|array|function} keyOrCallback - Key name(s) to watch, or callback for all changes
   * @param {function} callback - Callback function (if first param is key)
   * @returns {function} Unsubscribe function
   */
  subscribe(keyOrCallback, callback = null) {
    let keys = [];
    let fn = null;

    if (typeof keyOrCallback === 'function') {
      // Subscribe to all changes
      keys = ['*'];
      fn = keyOrCallback;
    } else if (Array.isArray(keyOrCallback)) {
      keys = keyOrCallback;
      fn = callback;
    } else {
      keys = [keyOrCallback];
      fn = callback;
    }

    const listenerId = `${Date.now()}_${Math.random()}`;

    keys.forEach(key => {
      if (!this._listeners.has(key)) {
        this._listeners.set(key, new Map());
      }
      this._listeners.get(key).set(listenerId, fn);
    });

    // Return unsubscribe function
    return () => {
      keys.forEach(key => {
        const keyListeners = this._listeners.get(key);
        if (keyListeners) {
          keyListeners.delete(listenerId);
          if (keyListeners.size === 0) {
            this._listeners.delete(key);
          }
        }
      });
    };
  }

  /**
   * Notify listeners of state changes
   */
  _notifyListeners(changes) {
    // Notify specific key listeners
    Object.keys(changes).forEach(key => {
      const keyListeners = this._listeners.get(key);
      if (keyListeners) {
        keyListeners.forEach(callback => {
          try {
            callback(changes[key].newValue, changes[key].oldValue, key);
          } catch (error) {
            console.error(`Error in state listener for key "${key}":`, error);
          }
        });
      }
    });

    // Notify global listeners
    const globalListeners = this._listeners.get('*');
    if (globalListeners) {
      globalListeners.forEach(callback => {
        try {
          callback(changes, this._state);
        } catch (error) {
          console.error('Error in global state listener:', error);
        }
      });
    }
  }

  /**
   * Add change to history
   */
  _addToHistory(changes) {
    this._history.push({
      timestamp: Date.now(),
      changes
    });

    // Limit history size
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  /**
   * Get state change history
   */
  getHistory(limit = 10) {
    return this._history.slice(-limit);
  }

  /**
   * Debug: Log current state
   */
  debug() {
    console.group('State Manager Debug');
    console.groupEnd();
  }
}

// Create singleton instance with initial state
const stateManager = new StateManager({
  currentView: 'dashboard',
  orders: [],
  products: [],
  reviews: [],
  chats: [],
  blogPosts: [],
  forumThreads: [],
  users: [],
  pages: [],
  components: [],
  settings: {},
  loading: false,
  error: null
});

export default stateManager;
