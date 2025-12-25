/**
 * Event Bus
 * Pub/Sub system for component communication
 * Enables loose coupling between modules
 */

export class EventBus {
  constructor() {
    this._events = new Map();
    this._onceEvents = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event name to listen for
   * @param {function} callback - Function to call when event fires
   * @param {object} options - Options: { priority: number, context: object }
   * @returns {function} Unsubscribe function
   */
  on(eventName, callback, options = {}) {
    if (typeof callback !== 'function') {
      throw new Error('Event callback must be a function');
    }

    if (!this._events.has(eventName)) {
      this._events.set(eventName, []);
    }

    const listener = {
      callback,
      priority: options.priority || 0,
      context: options.context || null,
      id: `${Date.now()}_${Math.random()}`
    };

    const listeners = this._events.get(eventName);
    listeners.push(listener);

    // Sort by priority (higher priority first)
    listeners.sort((a, b) => b.priority - a.priority);

    // Return unsubscribe function
    return () => this.off(eventName, listener.id);
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first call)
   * @param {string} eventName - Event name to listen for
   * @param {function} callback - Function to call when event fires
   * @returns {function} Unsubscribe function
   */
  once(eventName, callback) {
    if (!this._onceEvents.has(eventName)) {
      this._onceEvents.set(eventName, []);
    }

    const listener = {
      callback,
      id: `${Date.now()}_${Math.random()}`
    };

    this._onceEvents.get(eventName).push(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this._onceEvents.get(eventName);
      if (listeners) {
        const index = listeners.findIndex(l => l.id === listener.id);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event name
   * @param {string} listenerId - Listener ID to remove (optional, removes all if not provided)
   */
  off(eventName, listenerId = null) {
    if (!listenerId) {
      // Remove all listeners for this event
      this._events.delete(eventName);
      this._onceEvents.delete(eventName);
      return;
    }

    // Remove specific listener
    const listeners = this._events.get(eventName);
    if (listeners) {
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          this._events.delete(eventName);
        }
      }
    }
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name to emit
   * @param {*} data - Data to pass to listeners
   * @returns {Promise} Resolves when all listeners complete
   */
  async emit(eventName, data = null) {
    const results = [];

    // Execute once listeners
    const onceListeners = this._onceEvents.get(eventName);
    if (onceListeners) {
      for (const listener of [...onceListeners]) {
        try {
          const result = await listener.callback(data);
          results.push({ success: true, result });
        } catch (error) {
          console.error(`Error in once listener for "${eventName}":`, error);
          results.push({ success: false, error });
        }
      }
      // Clear once listeners
      this._onceEvents.delete(eventName);
    }

    // Execute regular listeners
    const listeners = this._events.get(eventName);
    if (listeners) {
      for (const listener of listeners) {
        try {
          const context = listener.context || null;
          const result = await listener.callback.call(context, data);
          results.push({ success: true, result });
        } catch (error) {
          console.error(`Error in listener for "${eventName}":`, error);
          results.push({ success: false, error });
        }
      }
    }

    return results;
  }

  /**
   * Emit event synchronously (doesn't wait for promises)
   * @param {string} eventName - Event name to emit
   * @param {*} data - Data to pass to listeners
   */
  emitSync(eventName, data = null) {
    // Execute once listeners
    const onceListeners = this._onceEvents.get(eventName);
    if (onceListeners) {
      for (const listener of [...onceListeners]) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error(`Error in once listener for "${eventName}":`, error);
        }
      }
      this._onceEvents.delete(eventName);
    }

    // Execute regular listeners
    const listeners = this._events.get(eventName);
    if (listeners) {
      for (const listener of listeners) {
        try {
          const context = listener.context || null;
          listener.callback.call(context, data);
        } catch (error) {
          console.error(`Error in listener for "${eventName}":`, error);
        }
      }
    }
  }

  /**
   * Check if event has listeners
   */
  hasListeners(eventName) {
    const hasRegular = this._events.has(eventName) && this._events.get(eventName).length > 0;
    const hasOnce = this._onceEvents.has(eventName) && this._onceEvents.get(eventName).length > 0;
    return hasRegular || hasOnce;
  }

  /**
   * Get count of listeners for an event
   */
  listenerCount(eventName) {
    const regular = this._events.has(eventName) ? this._events.get(eventName).length : 0;
    const once = this._onceEvents.has(eventName) ? this._onceEvents.get(eventName).length : 0;
    return regular + once;
  }

  /**
   * Get all event names
   */
  eventNames() {
    const regular = Array.from(this._events.keys());
    const once = Array.from(this._onceEvents.keys());
    return [...new Set([...regular, ...once])];
  }

  /**
   * Clear all events
   */
  clear() {
    this._events.clear();
    this._onceEvents.clear();
  }

  /**
   * Debug: Log all events
   */
  debug() {
    console.group('Event Bus Debug');
    console.log('Regular events:', Array.from(this._events.keys()).map(key => ({
      event: key,
      listeners: this._events.get(key).length
    })));
    console.log('Once events:', Array.from(this._onceEvents.keys()).map(key => ({
      event: key,
      listeners: this._onceEvents.get(key).length
    })));
    console.groupEnd();
  }
}

// Create singleton instance
const eventBus = new EventBus();

export default eventBus;

// Export convenience functions
export function on(eventName, callback, options) {
  return eventBus.on(eventName, callback, options);
}

export function once(eventName, callback) {
  return eventBus.once(eventName, callback);
}

export function off(eventName, listenerId) {
  eventBus.off(eventName, listenerId);
}

export function emit(eventName, data) {
  return eventBus.emit(eventName, data);
}

export function emitSync(eventName, data) {
  eventBus.emitSync(eventName, data);
}
