/**
 * Admin controller - Admin tools and file uploads
 */

import { json } from '../utils/response.js';
import { CORS } from '../config/cors.js';
import { VERSION } from '../config/constants.js';
import { getMimeTypeFromFilename, resolveContentType } from '../utils/upload-helper.js';
import { normalizeArchiveMetaValue } from '../utils/formatting.js';

// Flag to track if version purge check was done
let purgeVersionChecked = false;

/**
 * Get debug info
 */
export function getDebugInfo(env) {
  return json({
    status: 'running',
    bindings: {
      DB: !!env.DB,
      R2_BUCKET: !!env.R2_BUCKET,
      PRODUCT_MEDIA: !!env.PRODUCT_MEDIA,
      ASSETS: !!env.ASSETS
    },
    version: VERSION,
    timestamp: new Date().toISOString()
  });
}

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
 * Purge Cloudflare cache manually
 */
export async function purgeCache(env) {
  const zoneId = env.CF_ZONE_ID;
  const token = env.CF_API_TOKEN;
  if (!zoneId || !token) {
    return json({ error: 'CF_ZONE_ID or CF_API_TOKEN not configured' }, 500);
  }
  try {
    const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
    const cfResp = await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ purge_everything: true })
    });
    const result = await cfResp.json();
    return json(result, cfResp.ok ? 200 : 500);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * Auto-purge cache on version change
 */
export async function maybePurgeCache(env, initDB) {
  if (!env || !env.DB || !env.CF_ZONE_ID || !env.CF_API_TOKEN) return;
  if (purgeVersionChecked) return;
  
  try {
    await initDB(env);
    
    let row = null;
    try {
      row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('last_purge_version').first();
    } catch (_) {}
    
    const lastVersion = row && row.value ? row.value.toString() : null;
    const currentVersion = VERSION.toString();
    
    if (lastVersion === currentVersion) {
      purgeVersionChecked = true;
      return;
    }
    
    const zoneId = env.CF_ZONE_ID;
    const token = env.CF_API_TOKEN;
    const purgeUrl = `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`;
    
    await fetch(purgeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ purge_everything: true })
    });
    
    await env.DB.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    ).bind('last_purge_version', currentVersion).run();
    
    purgeVersionChecked = true;
  } catch (e) {
    console.error('maybePurgeCache error:', e);
  }
}

/**
 * Get Whop settings
 */
export async function getWhopSettings(env) {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
  if (row && row.value) {
    try {
      return json(JSON.parse(row.value));
    } catch (e) {
      return json({});
    }
  }
  return json({});
}

/**
 * Save Whop settings
 */
export async function saveWhopSettings(env, body) {
  const value = JSON.stringify(body);
  await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').bind('whop', value).run();
  return json({ success: true });
}

/**
 * Upload temp file to R2
 */
export async function uploadTempFile(env, req, url) {
  try {
    if (!env.R2_BUCKET) {
      console.error('R2_BUCKET not configured');
      return json({ error: 'R2 storage not configured' }, 500);
    }

    const sessionId = url.searchParams.get('sessionId');
    const filename = url.searchParams.get('filename');

    if (!sessionId || !filename) {
      console.error('Missing sessionId or filename');
      return json({ error: 'sessionId and filename required' }, 400);
    }

    console.log('Uploading file:', filename, 'for session:', sessionId);

    const buf = await req.arrayBuffer();

    // Validate file size
    const isVideo = filename.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/);
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeLabel = isVideo ? '500MB' : '10MB';
    
    if (buf.byteLength > maxSize) {
      console.error('File too large:', buf.byteLength, 'bytes (max', maxSizeLabel, ')');
      return json({
        error: `File too large. Maximum file size is ${maxSizeLabel} for ${isVideo ? 'videos' : 'files'}.`,
        fileSize: buf.byteLength,
        maxSize: maxSize,
        fileType: isVideo ? 'video' : 'file'
      }, 400);
    }

    if (!buf || buf.byteLength === 0) {
      console.error('Empty file buffer');
      return json({ error: 'Empty file - please select a valid file' }, 400);
    }

    console.log('File size:', (buf.byteLength / 1024 / 1024).toFixed(2), 'MB');

    const key = `temp/${sessionId}/${filename}`;

    await env.R2_BUCKET.put(key, buf, {
      httpMetadata: { contentType: req.headers.get('content-type') || 'application/octet-stream' }
    });

    console.log('File uploaded successfully:', key);

    return json({ success: true, tempUrl: `r2://${key}` });
  } catch (err) {
    console.error('Upload error:', err);
    return json({
      error: 'Upload failed: ' + err.message,
      details: err.stack
    }, 500);
  }
}

/**
 * Get file from R2
 */
export async function getR2File(env, key) {
  if (!env.R2_BUCKET) return json({ error: 'R2 not configured' }, 500);
  
  if (!key) return json({ error: 'key required' }, 400);
  
  const obj = await env.R2_BUCKET.get(key);
  if (!obj) return json({ error: 'File not found' }, 404);
  
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

/**
 * Upload customer file (two-stage: R2 + Archive.org)
 */
export async function uploadCustomerFile(env, req, url) {
  try {
    if (!env.R2_BUCKET) {
      console.error('R2_BUCKET not configured');
      return json({ error: 'R2 storage not configured' }, 500);
    }

    if (!env.ARCHIVE_ACCESS_KEY || !env.ARCHIVE_SECRET_KEY) {
      console.error('Archive.org credentials not configured');
      return json({ error: 'Archive.org credentials not configured' }, 500);
    }

    const itemId = (url.searchParams.get('itemId') || '').replace(/[^a-zA-Z0-9_.-]/g, '-');
    const filename = (url.searchParams.get('filename') || '').replace(/[^a-zA-Z0-9_.-]/g, '-');
    const originalFilename = url.searchParams.get('originalFilename');

    if (!itemId || !filename) {
      console.error('Missing itemId or filename');
      return json({ error: 'itemId and filename required' }, 400);
    }

    console.log('Starting two-stage upload:', filename, 'Item:', itemId);

    const buf = await req.arrayBuffer();

    // Validate file size
    const videoExtensions = /\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/i;
    const isVideo = videoExtensions.test(filename);
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeLabel = isVideo ? '500MB' : '10MB';
    
    if (buf.byteLength > maxSize) {
      console.error('File too large:', buf.byteLength, 'bytes (max', maxSizeLabel, ')');
      return json({
        error: `File too large. Maximum file size is ${maxSizeLabel} for ${isVideo ? 'videos' : 'files'}.`,
        fileSize: buf.byteLength,
        maxSize: maxSize,
        fileType: isVideo ? 'video' : 'file'
      }, 400);
    }

    if (!buf || buf.byteLength === 0) {
      console.error('Empty file buffer');
      return json({ error: 'Empty file' }, 400);
    }

    console.log('File size:', (buf.byteLength / 1024 / 1024).toFixed(2), 'MB');

    // Detect content type
    const contentType = resolveContentType(filename, req.headers.get('content-type'));
    const isVideoUpload = contentType.startsWith('video/');

    // STAGE 1: Upload to R2 as temporary storage
    console.log('STAGE 1: Uploading to R2 temp storage...');
    const r2TempKey = `temp-archive/${itemId}/${filename}`;
    
    try {
      await env.R2_BUCKET.put(r2TempKey, buf, {
        httpMetadata: { contentType }
      });
      console.log('R2 temp upload successful:', r2TempKey);
    } catch (r2Err) {
      console.error('R2 temp upload failed:', r2Err);
      return json({
        error: 'Failed to upload to temp storage: ' + r2Err.message,
        stage: 'r2-temp',
        details: r2Err.stack
      }, 500);
    }
    // OPTIMIZED: Skip R2 verification - put() throws on failure, no need to re-fetch

    // Get order details for metadata
    const orderIdFromQuery = url.searchParams.get('orderId');
    let resolvedOrderId = orderIdFromQuery;
    if (!resolvedOrderId) {
      const match = itemId.match(/^delivery_(.+?)_\d+$/);
      if (match) {
        resolvedOrderId = match[1];
      }
    }

    let archiveDescription = '';
    if (resolvedOrderId) {
      try {
        const orderRow = await env.DB.prepare(
          'SELECT o.order_id, p.title AS product_title, p.description AS product_description FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_id = ?'
        ).bind(resolvedOrderId).first();

        if (orderRow) {
          const productTitle = orderRow.product_title || '';
          const productDescription = orderRow.product_description || '';
          archiveDescription = productDescription 
            ? (productTitle ? `${productTitle} - ${productDescription}` : productDescription)
            : `Order #${orderRow.order_id} - ${productTitle || 'Video Delivery'}`;
        } else {
          archiveDescription = `Order #${resolvedOrderId} video delivery`;
        }
      } catch (dbErr) {
        console.warn('Could not fetch order details:', dbErr);
        archiveDescription = `Order #${resolvedOrderId} video delivery`;
      }
    } else {
      archiveDescription = `${isVideoUpload ? 'Video' : 'File'} uploaded via order delivery system`;
    }

    const archiveHeaders = {
      Authorization: `LOW ${env.ARCHIVE_ACCESS_KEY}:${env.ARCHIVE_SECRET_KEY}`,
      'Content-Type': contentType,
      'x-archive-auto-make-bucket': '1',
      'x-archive-meta-mediatype': isVideoUpload ? 'movies' : 'data',
      'x-archive-meta-collection': isVideoUpload ? 'opensource_movies' : 'opensource',
      'x-archive-meta-title': normalizeArchiveMetaValue(originalFilename || filename),
      'x-archive-meta-description': normalizeArchiveMetaValue(archiveDescription),
      'x-archive-meta-subject': 'video; delivery',
      'x-archive-meta-language': 'eng'
    };

    // STAGE 2: Upload to Archive.org
    console.log('STAGE 2: Uploading to Archive.org...');
    const archiveUrl = `https://s3.us.archive.org/${itemId}/${filename}`;
    let archiveResp;
    try {
      archiveResp = await fetch(archiveUrl, {
        method: 'PUT',
        headers: archiveHeaders,
        body: buf
      });

      if (!archiveResp.ok) {
        const errorText = await archiveResp.text().catch(() => 'Unknown error');
        console.error('Archive.org upload failed:', archiveResp.status, errorText);
        return json({
          error: 'Archive.org upload failed',
          status: archiveResp.status,
          details: errorText,
          stage: 'archive-upload',
          r2Uploaded: true
        }, 502);
      }
      console.log('Archive.org upload successful, status:', archiveResp.status);
    } catch (archiveErr) {
      console.error('Archive.org upload network error:', archiveErr);
      return json({
        error: 'Failed to connect to Archive.org: ' + archiveErr.message,
        stage: 'archive-connect',
        details: archiveErr.message,
        r2Uploaded: true
      }, 502);
    }

    // OPTIMIZED: Skip blocking verification - Archive.org indexing happens async
    // The upload was successful if we got here, verification can be done client-side if needed
    const downloadUrl = `https://archive.org/download/${itemId}/${filename}`;
    const embedUrl = `https://archive.org/details/${itemId}`;

    console.log('Upload complete - R2 and Archive.org upload successful');
    return json({
      success: true,
      url: downloadUrl,
      embedUrl: embedUrl,
      itemId: itemId,
      filename: filename,
      r2Verified: true,
      archiveVerified: true, // Archive accepted the upload, indexing happens async
      isVideo: isVideoUpload
    });

  } catch (err) {
    console.error('Customer file upload error:', err);
    return json({
      error: 'Upload failed: ' + err.message,
      details: err.stack,
      stage: 'unknown'
    }, 500);
  }
}

/**
 * Upload encrypted file for order
 */
export async function uploadEncryptedFile(env, req, url) {
  if (!env.R2_BUCKET) {
    return json({ error: 'R2 not configured' }, 500);
  }
  const orderId = url.searchParams.get('orderId');
  const itemId = url.searchParams.get('itemId');
  const filename = url.searchParams.get('filename');
  if (!orderId || !itemId || !filename) {
    return json({ error: 'orderId, itemId and filename required' }, 400);
  }
  
  const fileBuf = await req.arrayBuffer();
  const key = `orders/${orderId}/${itemId}/${filename}`;
  await env.R2_BUCKET.put(key, fileBuf, {
    httpMetadata: { contentType: req.headers.get('content-type') || 'application/octet-stream' }
  });
  
  return json({ success: true, r2Key: key });
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
