/**
 * Standard response helpers for JSON and error responses
 */

import { CORS } from '../config/cors.js';

/**
 * Create a JSON response with CORS headers and no-cache
 * @param {Object} data - Data to serialize
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export function errorResponse(message, status = 500) {
  return json({ error: message }, status);
}

/**
 * Create a success response
 * @param {Object} data - Additional data to include
 * @returns {Response}
 */
export function successResponse(data = {}) {
  return json({ success: true, ...data });
}
