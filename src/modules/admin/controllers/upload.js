/**
 * Admin Upload Controller
 * File upload operations (Archive.org, R2, Temp files)
 */

import { json } from '../../../core/utils/response.js';
import { getMimeTypeFromFilename, resolveContentType } from '../../../core/utils/upload-helper.js';
import { normalizeArchiveMetaValue } from '../../../core/utils/formatting.js';
import { CORS } from '../../../core/config/cors.js';

/**
 * Get Archive.org credentials for direct browser upload
 * Zero CPU - just returns credentials, browser uploads directly
 */
export function getArchiveCredentials(env) {
  if (!env.ARCHIVE_ACCESS_KEY || !env.ARCHIVE_SECRET_KEY) {
    return json({ error: 'Archive.org credentials not configured' }, 500);
  }

  return json({
    success: true,
    accessKey: env.ARCHIVE_ACCESS_KEY,
    secretKey: env.ARCHIVE_SECRET_KEY
  });
}

/**
 * Upload encrypted file to R2
 */
export async function uploadEncryptedFile(env, req) {
  if (!env.R2_BUCKET) {
    return json({ error: 'R2_BUCKET not configured' }, 500);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const orderId = formData.get('orderId');

    if (!file || !orderId) {
      return json({ error: 'Missing file or orderId' }, 400);
    }

    const filename = `encrypted-${orderId}-${Date.now()}.enc`;
    const arrayBuffer = await file.arrayBuffer();

    await env.R2_BUCKET.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: 'application/octet-stream'
      }
    });

    return json({
      success: true,
      filename,
      url: `/api/admin/r2-file?key=${encodeURIComponent(filename)}`
    });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Upload temporary file
 */
export async function uploadTempFile(env, req, url) {
  if (!env.R2_BUCKET) {
    return json({ error: 'R2_BUCKET not configured' }, 500);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return json({ error: 'No file provided' }, 400);
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const ext = file.name.split('.').pop();
    const filename = `temp-${timestamp}-${random}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const contentType = getMimeTypeFromFilename(file.name);

    await env.R2_BUCKET.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: contentType || 'application/octet-stream'
      }
    });

    const protocol = url.protocol;
    const host = url.host;
    const publicUrl = `${protocol}//${host}/api/admin/r2-file?key=${encodeURIComponent(filename)}`;

    return json({
      success: true,
      filename,
      url: publicUrl
    });

  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

/**
 * Get R2 file
 */
export async function getR2File(env, key) {
  if (!env.R2_BUCKET) {
    return new Response('R2_BUCKET not configured', { status: 500 });
  }

  if (!key) {
    return new Response('Missing key parameter', { status: 400 });
  }

  try {
    const obj = await env.R2_BUCKET.get(key);

    if (!obj) {
      return new Response('File not found', { status: 404 });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);

    // Add CORS headers
    Object.entries(CORS).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(obj.body, { headers });

  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}

export default {
  getArchiveCredentials,
  uploadEncryptedFile,
  uploadTempFile,
  getR2File
};
