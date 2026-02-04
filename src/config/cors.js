/**
 * CORS and cache configuration for all API responses
 * SECURITY: Restrict origins in production for payment security
 */

// For production, replace '*' with your actual domain(s)
// Example: 'https://wishesu.com' or use env variable
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Allow-Credentials': 'true',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
};

/**
 * Handle CORS preflight OPTIONS request
 * @returns {Response}
 */
export function handleOptions(req) {
  const origin = req?.headers?.get('Origin') || '*';
  return new Response(null, { 
    headers: {
      ...CORS,
      'Access-Control-Allow-Origin': origin
    }
  });
}
