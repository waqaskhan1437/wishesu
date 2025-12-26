/**
 * Get R2 File Action
 * GET /api/r2/file
 */

import { error, serverError } from '../../../core/utils/response.js';
import { getR2Object } from '../services/r2.service.js';
import { CORS_HEADERS } from '../../../core/middleware/cors.js';

export const r2File = async (request, env) => {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!key) {
    return error('Missing key');
  }

  const result = await getR2Object(env, key);

  if (result.error) {
    if (result.status === 404) {
      return error(result.error, 404);
    }
    return serverError(result.error);
  }

  const headers = new Headers(CORS_HEADERS);
  const contentType =
    result.object.httpMetadata?.contentType || 'application/octet-stream';
  headers.set('content-type', contentType);

  return new Response(result.object.body, { status: 200, headers });
};
