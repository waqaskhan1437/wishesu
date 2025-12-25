// public/core/app/state.js
export function createAppState(eventBus) {
  const store = new Map();

  return {
    get(key) {
      return store.get(key);
    },

    set(key, value) {
      store.set(key, value);
      try {
        eventBus.emitSync('state:changed', { key, value });
      } catch (_) {}
    },

    when(key) {
      const existing = store.get(key);
      if (existing) return Promise.resolve(existing);

      return new Promise((resolve) => {
        const off = eventBus.on('state:changed', ({ key: k, value }) => {
          if (k === key && value) {
            off();
            resolve(value);
          }
        });
      });
    }
  };
}
