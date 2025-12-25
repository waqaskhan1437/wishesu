import { archiveCredentials, r2Presign } from './controller.js';

export async function mediaRouter(req, env, url, path, method) {
  if (method === 'POST' && path === '/api/upload/archive-credentials') {
    return archiveCredentials(env);
  }
  if (method === 'POST' && path === '/api/upload/r2-presign') {
    return r2Presign(req, env);
  }
  return null;
}
