import { json } from '../../../core/utils/response/response.js';
import { CORS } from '../../../core/config/cors/cors.js';
import { getArchiveKeys, buildPresign, buildTempKey, putTempFile, getR2Object } from '../service/service.js';

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

export async function tempFile(req, env, url) {
  const sessionId = url.searchParams.get('sessionId');
  const filename = url.searchParams.get('filename');
  if (!sessionId || !filename) return json({ error: 'Missing sessionId or filename' }, 400, CORS);
  let body = req.body;
  let contentType = req.headers.get('content-type') || 'application/octet-stream';
  if (!body) {
    const formData = await req.formData().catch(() => null);
    const file = formData?.get('file');
    if (!file) return json({ error: 'No file provided' }, 400, CORS);
    body = await file.arrayBuffer();
    contentType = file.type || contentType;
  }
  const key = buildTempKey(sessionId, filename);
  const result = await putTempFile(env, key, body, contentType);
  if (result.error) return json({ error: result.error }, 500, CORS);
  const publicUrl = `${url.protocol}//${url.host}/api/r2/file?key=${encodeURIComponent(`R2_BUCKET/${key}`)}`;
  return json({ success: true, tempUrl: `r2://R2_BUCKET/${key}`, url: publicUrl }, 200, CORS);
}

export async function r2File(req, env, url) {
  const key = url.searchParams.get('key');
  if (!key) return json({ error: 'Missing key' }, 400, CORS);
  const result = await getR2Object(env, key);
  if (result.error) return json({ error: result.error }, result.status || 500, CORS);
  const headers = new Headers(CORS);
  const contentType = result.object.httpMetadata?.contentType || 'application/octet-stream';
  headers.set('content-type', contentType);
  return new Response(result.object.body, { status: 200, headers });
}
