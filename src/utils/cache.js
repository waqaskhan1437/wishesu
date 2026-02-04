/**
 * Centralized Cache Utility
 */
const caches = new Map();

export function cacheGet(namespace, key, ttl = 300000) {
  const cache = caches.get(namespace);
  if (!cache) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function cacheSet(namespace, key, data) {
  if (!caches.has(namespace)) caches.set(namespace, new Map());
  const cache = caches.get(namespace);
  if (cache.size > 1000) cache.delete(cache.keys().next().value);
  cache.set(key, { data, time: Date.now() });
}

export function cacheInvalidate(namespace, key = null) {
  if (key) {
    const cache = caches.get(namespace);
    if (cache) cache.delete(key);
  } else {
    caches.delete(namespace);
  }
}

export function cacheClearAll() { caches.clear(); }

export const CACHE_NS = {
  PRODUCTS: 'products', COUPONS: 'coupons', ANALYTICS: 'analytics',
  BRANDING: 'branding', SESSIONS: 'sessions', WEBHOOKS: 'webhooks'
};
export const CACHE_TTL = { SHORT: 30000, MEDIUM: 60000, LONG: 300000 };
