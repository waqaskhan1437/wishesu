/**
 * Global Error Handler Middleware
 * Catches all errors and returns JSON response
 */

import { CORS_HEADERS } from './cors.js';

export const errorHandler = (error) => {
  console.error('[Worker Error]', error?.message || error);
  return new Response(
    JSON.stringify({
      error: error?.message || 'Internal Server Error',
      status: 500
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS
      }
    }
  );
};
