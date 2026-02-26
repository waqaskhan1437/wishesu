/**
 * Emergency uploads controller
 *
 * Goal:
 * - Allow admin to upload ANY file to R2
 * - Return a PUBLIC download link (served by Worker)
 * - Keep a history in D1 to show last link and "show all"
 */

import { json } from '../utils/response.js';
import { getMimeTypeFromFilename, sanitizeFilename } from '../utils/upload-helper.js';

function randomId() {
  // URL-safe id
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function ensureTable(env) {
  if (!env?.DB) return;

  // 1) Ensure table exists
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS emergency_uploads (
      id TEXT PRIMARY KEY,
      r2_key TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT,
      size INTEGER,
      created_at INTEGER NOT NULL
    )
  `).run();

  // 2) Migration for older deployments where emergency_uploads had wrong column types
  // This fixes: D1_ERROR: datatype mismatch: SQLITE_MISMATCH
  try {
    const info = await env.DB.prepare('PRAGMA table_info(emergency_uploads)').all();
    const cols = (info.results || []).map(r => ({ name: r.name, type: String(r.type || '').toUpperCase() }));
    const idCol = cols.find(c => c.name === 'id');

    // If id isn't TEXT, rebuild the table.
    if (idCol && idCol.type && idCol.type !== 'TEXT') {
      const backup = `emergency_uploads_old_${Date.now()}`;

      await env.DB.prepare(`ALTER TABLE emergency_uploads RENAME TO ${backup}`).run();

      await env.DB.prepare(`
        CREATE TABLE emergency_uploads (
          id TEXT PRIMARY KEY,
          r2_key TEXT NOT NULL,
          filename TEXT NOT NULL,
          content_type TEXT,
          size INTEGER,
          created_at INTEGER NOT NULL
        )
      `).run();

      // Copy what we can from old table. Cast id to TEXT.
      await env.DB.prepare(`
        INSERT INTO emergency_uploads (id, r2_key, filename, content_type, size, created_at)
        SELECT CAST(id AS TEXT), r2_key, filename, content_type, size, created_at
        FROM ${backup}
      `).run();
    }
  } catch (e) {
    // If PRAGMA isn't allowed or migration fails, don't block requests.
    // The next request may still work if schema is already correct.
  }
}

/**
 * POST /api/admin/emergency-uploads
 * Multipart form-data:
 * - file: binary
 */
export async function uploadEmergencyFileApi(env, req) {
  try {
    if (!env?.R2_BUCKET) {
      return json({ error: 'R2_BUCKET not configured' }, 500);
    }

    await ensureTable(env);

    const ct = req.headers.get('content-type') || '';
    if (!ct.toLowerCase().includes('multipart/form-data')) {
      return json({ error: 'Expected multipart/form-data' }, 400);
    }

    const form = await req.formData();
    const file = form.get('file');

    if (!file) {
      return json({ error: 'Missing file field' }, 400);
    }

    // Cloudflare File object
    const filenameRaw = file?.name || 'file';
    const filename = sanitizeFilename(filenameRaw);
    // IMPORTANT: do NOT use request content-type here because it is multipart/form-data.
    // Prefer the uploaded file's mime type, then infer from filename.
    const contentType = (file.type && file.type !== 'application/octet-stream')
      ? file.type
      : (getMimeTypeFromFilename(filename) || 'application/octet-stream');
    const size = Number(file.size || 0);

    // Basic size limit (adjust if you want)
    const maxBytes = 1024 * 1024 * 500; // 500MB
    if (size > maxBytes) {
      return json({ error: 'File too large (max 500MB)' }, 400);
    }

    const id = randomId();
    const createdAt = Date.now();

    // Keep files under a dedicated prefix
    const r2Key = `emergency/${createdAt}-${id}-${filename}`;

    const isInlineType = /^(video\/|audio\/|image\/)/i.test(contentType);

    await env.R2_BUCKET.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType,
        // Inline for media so it can be embedded/played on product pages.
        // Force download still possible via /api/public-download/:id?download=1
        contentDisposition: `${isInlineType ? 'inline' : 'attachment'}; filename="${filename}"`
      }
    });

    await env.DB.prepare(
      'INSERT INTO emergency_uploads (id, r2_key, filename, content_type, size, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, r2Key, filename, contentType, size, createdAt).run();

    // Public link served via worker route (no auth)
    const downloadUrl = new URL(req.url);
    downloadUrl.pathname = `/api/public-download/${id}`;
    downloadUrl.search = '';

    return json({
      success: true,
      id,
      filename,
      contentType,
      size,
      createdAt,
      downloadUrl: downloadUrl.toString()
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * GET /api/admin/emergency-uploads?limit=50&cursor=...
 * Returns latest uploads.
 */
export async function listEmergencyUploadsApi(env, url) {
  try {
    await ensureTable(env);

    const limitRaw = Number(url.searchParams.get('limit') || 50);
    const limit = Math.max(1, Math.min(200, limitRaw));

    const rows = await env.DB.prepare(
      'SELECT id, filename, content_type as contentType, size, created_at as createdAt FROM emergency_uploads ORDER BY created_at DESC LIMIT ?'
    ).bind(limit).all();

    return json({
      success: true,
      uploads: (rows.results || []).map(r => ({
        ...r,
        downloadUrl: `${url.origin}/api/public-download/${r.id}`
      }))
    });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * GET /api/public-download/:id
 * Public endpoint.
 */
export async function getEmergencyDownloadApi(env, req, id) {
  try {
    if (!env?.R2_BUCKET) {
      return json({ error: 'R2_BUCKET not configured' }, 500);
    }

    await ensureTable(env);

    // IMPORTANT:
    // - For <video> playback, browsers often require Range requests.
    // - Do NOT force attachment for video/audio/images.
    // - Still allow "force download" via ?download=1

    const row = await env.DB.prepare(
      'SELECT r2_key, filename, content_type, size, created_at FROM emergency_uploads WHERE id = ?'
    ).bind(id).first();

    if (!row?.r2_key) {
      return json({ error: 'Not found' }, 404);
    }

    const url = new URL(req.url);
    const forceDownload = url.searchParams.get('download') === '1';

    const rangeHeader = req.headers.get('Range');

    const obj = await env.R2_BUCKET.get(row.r2_key, rangeHeader ? { range: rangeHeader } : undefined);
    if (!obj) {
      return json({ error: 'File missing from storage' }, 404);
    }

    const headers = new Headers();

    // Content type
    const contentType = row.content_type || obj.httpMetadata?.contentType || 'application/octet-stream';
    headers.set('Content-Type', contentType);

    // Disposition
    // Inline for video/audio/image so product video can play.
    const isInlineType = /^(video\/|audio\/|image\/)/i.test(contentType);
    const disposition = (forceDownload || !isInlineType)
      ? `attachment; filename="${row.filename || 'file'}"`
      : `inline; filename="${row.filename || 'file'}"`;
    headers.set('Content-Disposition', disposition);

    // Range support
    headers.set('Accept-Ranges', 'bytes');

    // If R2 returned a range response, it includes Content-Range and a 206 status.
    if (obj.range) {
      headers.set('Content-Range', `bytes ${obj.range.offset}-${obj.range.end}/${obj.range.length}`);
      headers.set('Content-Length', String(obj.range.end - obj.range.offset + 1));
      return new Response(obj.body, { status: 206, headers });
    }

    // Normal response
    if (obj.size != null) {
      headers.set('Content-Length', String(obj.size));
    } else if (row.size != null) {
      headers.set('Content-Length', String(row.size));
    }

    // Cache
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new Response(obj.body, { status: 200, headers });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
