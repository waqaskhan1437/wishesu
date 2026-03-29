/**
 * CORS and cache configuration for all API responses
 */
const DEFAULT_ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-API-Key',
  'Accept',
  'Origin'
];

function mergeAllowedHeaders(requestedHeaders = '') {
  const headers = new Set(DEFAULT_ALLOWED_HEADERS);

  for (const rawHeader of String(requestedHeaders || '').split(',')) {
    const header = rawHeader.trim();
    if (header) headers.add(header);
  }

  return Array.from(headers).join(', ');
}

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': mergeAllowedHeaders(),
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin, Access-Control-Request-Headers',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
};

/**
 * Handle CORS preflight OPTIONS request
 * @param {Request} req
 * @returns {Response}
 */
export function handleOptions(req) {
  const requestHeaders = req?.headers?.get('Access-Control-Request-Headers') || '';
  return new Response(null, {
    headers: {
      ...CORS,
      'Access-Control-Allow-Headers': mergeAllowedHeaders(requestHeaders)
    }
  });
}
