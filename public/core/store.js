const listeners = new Set();

export const state = {
  user: { name: 'Wishesu Admin', role: 'Owner' },
  stats: { revenue: 128540, orders: 128, delivery: 92, rating: 4.9 },
  orders: [],
  products: []
};

export const setState = (patch) => {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
};

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
