import { json } from '../../core/utils/response.js';
import { CORS } from '../../core/config/cors.js';
import { getArchiveKeys, buildPresign } from './service.js';

export async function archiveCredentials(env) {
  const creds = getArchiveKeys(env);
  if (!creds) return json({ error: 'Archive credentials not configured' }, 500, CORS);
  return json(creds, 200, CORS);
}

export async function r2Presign(req, env) {
  const body = await req.json().catch(() => ({}));
  const result = await buildPresign(env, body);
  if (result.error) {
    const status = result.error === 'Missing key' || result.error === 'Invalid bucket' ? 400 : 500;
    return json({ error: result.error }, status, CORS);
  }
  return json(result, 200, CORS);
}
