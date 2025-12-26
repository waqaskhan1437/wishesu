/**
 * R2 Presign URL Action
 * POST /api/upload/r2-presign
 */

import { json, error } from '../../../core/utils/response.js';
import { buildPresign } from '../services/r2.service.js';

export const r2Presign = async (request, env) => {
  const body = await request.json().catch(() => ({}));
  const result = await buildPresign(env, body);

  if (result.error) {
    const status =
      result.error === 'Missing key' || result.error === 'Invalid bucket'
        ? 400
        : 500;
    return error(result.error, status);
  }

  return json(result);
};
