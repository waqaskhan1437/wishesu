/**
 * Backup Controller - Full Site Backup (Media Links Only)
 * - Exports ALL D1 tables (including settings/api keys)
 * - Does NOT include media files; only extracts and stores media links/keys
 * - Stores backup JSON in R2 (env.R2_BUCKET) and keeps metadata in D1 `backups` table
 * - Designed for Cloudflare Workers + D1 + R2
 */

import { json } from '../utils/response.js';
import { CORS } from '../config/cors.js';

const MAX_TABLES = 200; // safety
const MAX_ROWS_PER_TABLE = 200000; // safety
const BACKUP_PREFIX = 'backups/';

function safeIdent(name) {
  // Safely quote SQLite identifiers (table/column names)
  return '"' + String(name).replace(/"/g, '""') + '"';
}

function nowIso() {
  return new Date().toISOString();
}

function isInternalTable(name) {
  const n = String(name || '');
  // Skip SQLite internal + Cloudflare system tables
  return (
    n.startsWith('sqlite_') ||
    n.startsWith('_cf_') ||
    n.includes(':') ||            // e.g. _cf_KV:key
    n.startsWith('__')            // any other internal tables
  );
}

function extractLinksFromValue(val) {
  const links = new Set();
  if (val == null) return links;
  if (typeof val !== 'string') return links;

  // Try JSON parse (gallery_images, addons_json, etc.)
  const trimmed = val.trim();
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const stack = [parsed];
      while (stack.length) {
        const cur = stack.pop();
        if (typeof cur === 'string') {
          if (cur.startsWith('http://') || cur.startsWith('https://')) links.add(cur);
          continue;
        }
        if (Array.isArray(cur)) {
          for (const x of cur) stack.push(x);
          continue;
        }
        if (cur && typeof cur === 'object') {
          for (const k of Object.keys(cur)) stack.push(cur[k]);
        }
      }
    } catch {
      // ignore
    }
  }

  // Raw URL scan (simple)
  const urlRe = /(https?:\/\/[^\s"'<>]+)/g;
  let m;
  while ((m = urlRe.exec(val)) !== null) {
    links.add(m[1]);
  }

  return links;
}

async function ensureBackupsTable(env) {
  await env.DB
    .prepare(
      `CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        size INTEGER DEFAULT 0,
        media_count INTEGER DEFAULT 0,
        r2_key TEXT
      )`
    )
    .run();
}

async function listTables(env) {
  // Only user tables (skip sqlite_ and Cloudflare internal)
  const res = await env.DB
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name")
    .all();
  const names = (res?.results || []).map((r) => r.name).filter((n) => !isInternalTable(n));
  return names.slice(0, MAX_TABLES);
}

async function getTableColumns(env, table) {
  const info = await env.DB.prepare(`PRAGMA table_info(${safeIdent(table)})`).all();
  return (info?.results || []).map((r) => r.name);
}

async function exportTable(env, table) {
  const rowsRes = await env.DB.prepare(`SELECT * FROM ${safeIdent(table)}`).all();
  const rows = rowsRes?.results || [];
  if (rows.length > MAX_ROWS_PER_TABLE) {
    throw new Error(`Table ${table} too large (${rows.length} rows).`);
  }
  const columns = await getTableColumns(env, table);
  return { columns, rows };
}

export async function generateBackupData(env) {
  if (!env?.DB) throw new Error('Database binding not configured (env.DB missing).');

  const created_at = nowIso();
  const tables = {};
  const mediaLinks = new Set();

  const tableNames = await listTables(env);

  for (const t of tableNames) {
    // Skip backups table itself to avoid recursion
    if (t === 'backups') continue;

    const exported = await exportTable(env, t);
    tables[t] = exported;

    // extract links from string fields
    for (const row of exported.rows) {
      for (const k of Object.keys(row)) {
        const val = row[k];
        if (typeof val === 'string') {
          for (const link of extractLinksFromValue(val)) mediaLinks.add(link);
        }
      }
    }
  }

  const data = {
    kind: 'wishesu_full_backup',
    version: 2,
    created_at,
    notes: 'Media files are NOT included. Only media links/keys are captured.',
    tables,
    media_links: Array.from(mediaLinks),
  };

  const jsonStr = JSON.stringify(data);
  return {
    data,
    jsonStr,
    size: new TextEncoder().encode(jsonStr).byteLength,
    media_count: data.media_links.length,
  };
}

/**
 * Get backup history (stored backups metadata)
 */
export async function getBackupHistory(env) {
  try {
    await ensureBackupsTable(env);
    const res = await env.DB
      .prepare('SELECT id, created_at as timestamp, size, media_count FROM backups ORDER BY created_at DESC LIMIT 30')
      .all();
    return json({ ok: true, backups: res?.results || [] });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}

/**
 * Create a backup, store JSON in R2 and metadata in D1
 */
export async function createBackup(env) {
  try {
    await ensureBackupsTable(env);

    if (!env.R2_BUCKET) {
      throw new Error('R2 binding missing (env.R2_BUCKET). Add an R2 bucket binding for backups.');
    }

    const { jsonStr, size, media_count } = await generateBackupData(env);
    const id = 'backup-' + Date.now();
    const r2_key = `${BACKUP_PREFIX}${id}.json`;

    // Put into R2 (avoid D1 size limits)
    await BUCKET.put(r2_key, jsonStr, {
      httpMetadata: { contentType: 'application/json; charset=utf-8' },
    });

    await env.DB
      .prepare('INSERT INTO backups (id, created_at, size, media_count, r2_key) VALUES (?, ?, ?, ?, ?)')
      .bind(id, nowIso(), size, media_count, r2_key)
      .run();

    return json({ ok: true, id, size, media_count });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}

/**
 * Download backup JSON by id (from R2)
 */
export async function downloadBackup(env, backupId) {
  try {
    await ensureBackupsTable(env);

    const BUCKET = getBackupBucket(env);

    if (!BUCKET) {
      return json({ ok: false, error: 'R2 bucket binding missing (R2_BUCKET/PRODUCT_MEDIA).' }, 500);
    }

    const row = await env.DB.prepare('SELECT id, r2_key FROM backups WHERE id = ?').bind(backupId).first();
    if (!row || !row.r2_key) {
      return json({ ok: false, error: 'Backup not found' }, 404);
    }

    const obj = await BUCKET.get(row.r2_key);
    if (!obj) {
      return json({ ok: false, error: 'Backup file missing in storage' }, 404);
    }

    const body = await obj.text();
    const filename = `${row.id}.json`;

    return new Response(body, {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(new TextEncoder().encode(body).byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}

async function wipeAllTables(env, keepTables = new Set(['backups'])) {
  const tableNames = await listTables(env);
  for (const t of tableNames) {
    if (keepTables.has(t)) continue;
    await env.DB.prepare(`DELETE FROM ${safeIdent(t)}`).run();
  }
}

async function insertRows(env, table, columns, rows) {
  if (!rows || rows.length === 0) return;

  const safeTable = safeIdent(table);
  const colList = columns.map((c) => safeIdent(c)).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const stmt = env.DB.prepare(`INSERT INTO ${safeTable} (${colList}) VALUES (${placeholders})`);

  const batch = [];
  for (const row of rows) {
    const vals = columns.map((c) => row[c]);
    batch.push(stmt.bind(...vals));
    if (batch.length >= 100) {
      await env.DB.batch(batch.splice(0, batch.length));
    }
  }
  if (batch.length) await env.DB.batch(batch);
}

/**
 * Restore a backup:
 * body can contain:
 * - { backupId: "backup-..." }  (preferred)
 * - { backupJson: "{...}" } (string)
 * - { backup: {...} } (object)
 * It will RESET all tables and then re-import exactly.
 */
export async function restoreBackup(env, body = {}) {
  try {
    await ensureBackupsTable(env);

    let backupObj = null;

    if (body.backupId) {
      if (!env.R2_BUCKET) return json({ ok: false, error: 'R2 binding missing (env.R2_BUCKET).' }, 500);

      const row = await env.DB.prepare('SELECT r2_key FROM backups WHERE id = ?').bind(body.backupId).first();
      if (!row || !row.r2_key) return json({ ok: false, error: 'Backup not found' }, 404);

      const obj = await BUCKET.get(row.r2_key);
      if (!obj) return json({ ok: false, error: 'Backup file missing in storage' }, 404);

      backupObj = JSON.parse(await obj.text());
    } else if (typeof body.backupJson === 'string') {
      backupObj = JSON.parse(body.backupJson);
    } else if (body.backup && typeof body.backup === 'object') {
      backupObj = body.backup;
    } else {
      return json({ ok: false, error: 'No backup provided' }, 400);
    }

    if (backupObj?.kind !== 'wishesu_full_backup' || !backupObj?.tables) {
      return json({ ok: false, error: 'Invalid backup format' }, 400);
    }

    await wipeAllTables(env, new Set(['backups']));

    for (const [table, payload] of Object.entries(backupObj.tables)) {
      if (table === 'backups') continue;
      const columns = payload.columns || (payload.rows && payload.rows[0] ? Object.keys(payload.rows[0]) : []);
      const rows = payload.rows || [];
      if (!columns.length) continue;
      await insertRows(env, table, columns, rows);
    }

    return json({ ok: true, restored_at: nowIso(), media_links_count: (backupObj.media_links || []).length });
  } catch (e) {
    return json({ ok: false, error: e?.message || String(e) }, 500);
  }
}

/** Import endpoint convenience */
export async function importBackup(env, body = {}) {
  return restoreBackup(env, body);
}

/**
 * Send email via MailChannels (optional, used by scheduled cron)
 */
export async function sendBackupEmail(env, subject, text, attachmentName, attachmentText) {
  if (!env.BACKUP_EMAIL_TO || !env.BACKUP_EMAIL_FROM) {
    return { ok: false, skipped: true, reason: 'Email env vars not configured' };
  }

  const payload = {
    personalizations: [{ to: [{ email: env.BACKUP_EMAIL_TO }] }],
    from: { email: env.BACKUP_EMAIL_FROM, name: env.BACKUP_EMAIL_NAME || 'WishesU Backup' },
    subject,
    content: [{ type: 'text/plain', value: text }],
  };

  // Optional attachment (base64). NOTE: keep small.
  if (attachmentName && attachmentText) {
    const b64 = btoa(unescape(encodeURIComponent(attachmentText)));
    payload.attachments = [{ filename: attachmentName, content: b64, type: 'application/json', disposition: 'attachment' }];
  }

  const resp = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { ok: resp.ok, status: resp.status, body: resp.ok ? null : await resp.text().catch(() => null) };
}
function getBackupBucket(env) {
  // Prefer dedicated backup bucket, fallback to PRODUCT_MEDIA if configured
  return env.R2_BUCKET || env.PRODUCT_MEDIA || null;
}

