/**
 * Cloudflare Worker entrypoint
 */

import { handleOptions } from './core/config/cors.js';
import { routeApiRequest } from './router.js';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+?/g, '/');
    const method = req.method;

    if (method === 'OPTIONS') {
      return handleOptions(req);
    }

    if (path.startsWith('/api/')) {
      return routeApiRequest(req, env, url, path, method);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(req);
    }

    return new Response('Assets binding missing', { status: 500 });
  }
};
