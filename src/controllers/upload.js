// Upload API controller
import { json } from '../utils/response.js';
import { getMimeTypeFromFilename, resolveContentType, normalizeArchiveMetaValue } from '../utils/helpers.js';

/**
 * Upload temporary file to R2
 * @param {Object} env - Environment bindings
 * @param {Request} req - Request object
 * @param {URL} url - Request URL with query parameters
 * @returns {Promise<Response>}
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

    // Validate file size (max 500MB for videos, 10MB for other files)
    const isVideo = filename.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm|m4v|flv|wmv)$/);
    const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024; // 500MB for videos, 10MB for others
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
 * @param {Object} env - Environment bindings
 * @param {URL} url - Request URL with query parameters
 * @returns {Promise<Response>}
 */
export async function getR2File(env, url) {
  if (!env.R2_BUCKET) return json({ error: 'R2 not configured' }, 500);
  
  const key = url.searchParams.get('key');
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
 * Upload customer file (delivery video) with two-stage process
 * @param {Object} env - Environment bindings
 * @param {Request} req - Request object
 * @param {URL} url - Request URL with query parameters
 * @returns {Promise<Response>}
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

    // Validate file size (max 500MB for videos, 10MB for other files)
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

    if (buf.byteLength === 0) {
      console.error('Empty file');
      return json({ error: 'Empty file - please select a valid file' }, 400);
    }

    console.log('File size:', (buf.byteLength / 1024 / 1024).toFixed(2), 'MB');

    // Force video MIME type for video files
    const contentType = isVideo 
      ? (getMimeTypeFromFilename(filename) || 'video/mp4')
      : resolveContentType(req, filename);
    const isVideoUpload = isVideo;

    // STAGE 1: Upload to R2 temp bucket for verification
    console.log('STAGE 1: Uploading to R2 temp bucket...');
    const r2TempKey = `temp/${itemId}/${filename}`;
    try {
      await env.R2_BUCKET.put(r2TempKey, buf, {
        httpMetadata: { contentType: contentType }
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

    // Verify R2 file exists
    console.log('Verifying R2 temp upload...');
    let r2File;
    try {
      r2File = await env.R2_BUCKET.get(r2TempKey);
      if (!r2File) {
        throw new Error('File not found in R2 after upload');
      }
      console.log('R2 verification successful');
    } catch (verifyErr) {
      console.error('R2 verification failed:', verifyErr);
      return json({
        error: 'R2 upload verification failed: ' + verifyErr.message,
        stage: 'r2-verify',
        details: verifyErr.stack
      }, 500);
    }

    // Get order details for Archive.org metadata
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

          if (productDescription) {
            archiveDescription = productTitle
              ? `${productTitle} - ${productDescription}`
              : productDescription;
          } else {
            archiveDescription = `Order #${orderRow.order_id} - ${productTitle || 'Video Delivery'}`;
          }
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

    console.log('Archive.org Upload Metadata:', {
      isVideo: isVideo,
      isVideoUpload: isVideoUpload,
      contentType: contentType,
      mediatype: archiveHeaders['x-archive-meta-mediatype'],
      filename: filename,
      itemId: itemId
    });

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

    // STAGE 3: Wait for Archive.org to index the file
    console.log('STAGE 3: Waiting for Archive.org indexing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // STAGE 4: Verify Archive.org file is accessible
    console.log('STAGE 4: Verifying Archive.org file...');
    const downloadUrl = `https://archive.org/download/${itemId}/${filename}`;
    const embedUrl = `https://archive.org/details/${itemId}`;
    
    let verifyAttempts = 0;
    const maxVerifyAttempts = 3;
    let archiveVerified = false;

    while (verifyAttempts < maxVerifyAttempts && !archiveVerified) {
      verifyAttempts++;
      try {
        const verifyResp = await fetch(downloadUrl, { method: 'HEAD' });
        if (verifyResp.ok) {
          console.log('Archive.org file verified at attempt', verifyAttempts);
          archiveVerified = true;
          break;
        } else if (verifyResp.status === 404 && verifyAttempts < maxVerifyAttempts) {
          console.log(`Archive.org file not yet available (attempt ${verifyAttempts}/${maxVerifyAttempts}), waiting...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.warn(`Archive.org verification returned status ${verifyResp.status}`);
          break;
        }
      } catch (verifyErr) {
        console.warn(`Archive.org verification attempt ${verifyAttempts} failed:`, verifyErr.message);
        if (verifyAttempts < maxVerifyAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!archiveVerified) {
      console.warn('Archive.org file could not be verified, but upload was successful');
    }

    console.log('Upload complete - both R2 and Archive.org successful');
    return json({ 
      success: true, 
      url: downloadUrl,
      embedUrl: embedUrl,
      itemId: itemId,
      filename: filename,
      r2Verified: true,
      archiveVerified: archiveVerified,
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