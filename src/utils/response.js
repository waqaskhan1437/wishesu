// Response utilities for Cloudflare Workers

// The CORS and cache configuration for all API responses.
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
};

/**
 * Standard JSON response helper
 * @param {any} data - Response data
 * @param {number} status - HTTP status code (default: 200)
 * @returns {Response} Response object
 */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}