/**
 * Upload Temp File Action
 * POST /api/upload/temp-file
 */

import { json, error, serverError } from '../../../core/utils/response.js';
import { buildTempKey, putTempFile } from '../services/r2.service.js';

export const tempFile = async (request, env) => {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const filename = url.searchParams.get('filename');

  if (!sessionId || !filename) {
    return error('Missing sessionId or filename');
  }

  let body = request.body;
  let contentType = request.headers.get('content-type') || 'application/octet-stream';

  if (!body) {
    const formData = await request.formData().catch(() => null);
    const file = formData?.get('file');

    if (!file) {
      return error('No file provided');
    }

    body = await file.arrayBuffer();
    contentType = file.type || contentType;
  }

  const key = buildTempKey(sessionId, filename);
  const result = await putTempFile(env, key, body, contentType);

  if (result.error) {
    return serverError(result.error);
  }

  const publicUrl = `${url.protocol}//${url.host}/api/r2/file?key=${encodeURIComponent(`R2_BUCKET/${key}`)}`;

  return json({
    success: true,
    tempUrl: `r2://R2_BUCKET/${key}`,
    url: publicUrl
  });
};
