/**
 * HTML cache helpers for Cloudflare Workers.
 */

export function buildHtmlCacheKey(req) {
  return new Request(req.url, {
    method: 'GET',
    headers: { 'Accept': 'text/html' }
  });
}

export async function getCachedHtml(req) {
  const cacheKey = buildHtmlCacheKey(req);
  return caches.default.match(cacheKey);
}

export async function setCachedHtml(req, response) {
  const cacheKey = buildHtmlCacheKey(req);
  return caches.default.put(cacheKey, response);
}
