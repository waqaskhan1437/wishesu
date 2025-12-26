/**
 * Standard JSON Response Helper
 * Creates consistent API responses
 */

import { CORS_HEADERS } from '../middleware/cors.js';

export const json = (data, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
};

export const success = (data, status = 200) => json(data, status);

export const error = (message, status = 400) => json({ error: message }, status);

export const notFound = (message = 'Not found') => error(message, 404);

export const serverError = (message = 'Server error') => error(message, 500);
