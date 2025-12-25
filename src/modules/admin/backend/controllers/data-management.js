/**
 * Admin Data Management Controller
 * Data reset and secure download operations
 */

import { json } from '../../../../core/utils/response.js';
import { CORS } from '../../../../core/config/cors.js';
import { getMimeTypeFromFilename } from '../../../../core/utils/upload-helper.js';

/**
 * Reset data tables (keeps schema and code intact)
 */
export async function resetData(env) {
  const tables = [
    'products',
    'orders',
    'reviews',
    'pages',
    'blog_posts',
    'forum_replies',
    'forum_topics',
    'chat_messages',
    'chat_sessions',
    'checkout_sessions',
    'settings',
    'customers',
    'pending_checkouts'
  ];

  for (const t of tables) {
    try {
      await env.DB.prepare(`DELETE FROM ${t}`).run();
    } catch (_) {
      // ignore missing tables
    }
  }

  return json({ success: true });
}

/**
 * Handle secure download
 */
export async function handleSecureDownload(env, orderId, baseUrl) {
  const order = await env.DB.prepare(
    'SELECT archive_url, delivered_video_url FROM orders WHERE order_id = ?'
  ).bind(orderId).first();

  const sourceUrl = (order?.delivered_video_url || order?.archive_url || '').toString().trim();

  if (!sourceUrl) {
    return new Response('Download link expired or not found', { status: 404 });
  }

  const lowered = sourceUrl.toLowerCase();
  const openOnly =
    lowered.includes('youtube.com') ||
    lowered.includes('youtu.be') ||
    lowered.includes('vimeo.com') ||
    lowered.includes('iframe.mediadelivery.net/embed/') ||
    lowered.includes('video.bunnycdn.com/play/') ||
    (lowered.includes('archive.org/details/') && !lowered.includes('/download/'));

  if (openOnly) {
    return Response.redirect(sourceUrl, 302);
  }

  const fileResp = await fetch(sourceUrl);
  if (!fileResp.ok) {
    return new Response('File not available', { status: 404 });
  }

  const srcUrl = new URL(sourceUrl, baseUrl);
  let filename = srcUrl.pathname.split('/').pop() || 'video.mp4';
  try {
    filename = decodeURIComponent(filename);
  } catch (_) {}
  filename = filename.replace(/"/g, '');

  const contentTypeHeader = (fileResp.headers.get('content-type') || '').split(';')[0].trim();
  const contentType = contentTypeHeader || getMimeTypeFromFilename(filename) || 'application/octet-stream';

  const headers = new Headers({ ...CORS });
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);

  const contentLength = fileResp.headers.get('content-length');
  if (contentLength) {
    headers.set('Content-Length', contentLength);
  }

  return new Response(fileResp.body, {
    status: 200,
    headers
  });
}

/**
 * Upload customer file (two-stage: R2 + Archive.org)
 */
export async function uploadCustomerFile(env, req, url) {
  // This function is not currently used in the codebase
  // Keeping it for backward compatibility
  return json({ error: 'This endpoint is deprecated' }, 410);
}
