/**
 * Batch Request Handler
 * Executes multiple API requests in parallel using Promise.allSettled
 */

import { json, error } from './response.js';

export const handleBatch = async (request, env, ctx, router) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return error('Invalid JSON body', 400);
  }

  if (!Array.isArray(body.requests)) {
    return error('requests array required', 400);
  }

  if (body.requests.length > 10) {
    return error('Maximum 10 requests per batch', 400);
  }

  const origin = new URL(request.url).origin;

  const promises = body.requests.map(async (item, index) => {
    const method = String(item.method || 'GET').toUpperCase();
    const path = String(item.path || '');

    if (!path.startsWith('/api/') || path === '/api/batch') {
      return { index, error: 'Invalid path', status: 400 };
    }

    const subRequest = new Request(`${origin}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: item.body ? JSON.stringify(item.body) : undefined
    });

    try {
      const response = await router.fetch(subRequest, env, ctx);
      const data = await response.json().catch(() => ({}));
      return { index, status: response.status, data };
    } catch (err) {
      return { index, error: err.message, status: 500 };
    }
  });

  const results = await Promise.allSettled(promises);

  const responses = results.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return { index: idx, error: 'Request failed', status: 500 };
  });

  return json({ results: responses });
};
