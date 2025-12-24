/**
 * CORS middleware helpers.
 */

import { CORS } from '../../config/cors.js';

export function applyCors(headers = new Headers()) {
  const out = new Headers(headers);
  Object.entries(CORS).forEach(([key, value]) => {
    out.set(key, value);
  });
  return out;
}

export function handleCorsPreflight(req) {
  if (req.method !== 'OPTIONS') return null;
  return new Response(null, { headers: CORS });
}
