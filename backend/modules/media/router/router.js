import { archiveCredentials, r2Presign, tempFile, r2File } from '../controller/controller.js';

export async function mediaRouter(req, env, url, path, method) {
  if (method === 'POST' && path === '/api/upload/archive-credentials') {
    return archiveCredentials(env);
  }
  if (method === 'POST' && path === '/api/upload/r2-presign') {
    return r2Presign(req, env);
  }
  if (method === 'POST' && path === '/api/upload/temp-file') {
    return tempFile(req, env, url);
  }
  if (method === 'GET' && path === '/api/r2/file') {
    return r2File(req, env, url);
  }
  return null;
}
