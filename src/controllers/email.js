/**
 * Email & Lead Management Controller
 *
 * Provides CRUD functions for email templates used for transactional and marketing
 * emails (order confirmations, delivery notifications, chat alerts, and general
 * marketing). Also exposes a lead capture API for storing user contact
 * information when they initiate checkout or submit a form but do not complete
 * an order. These functions are designed to be lightweight and only perform
 * work when triggered by an event, avoiding unnecessary background requests.
 */

import { json } from '../utils/response.js';
import { initDB } from '../config/db.js';

// In‑memory caches for templates to avoid frequent DB queries
let templatesCache = null;
let templatesCacheTime = 0;
const TEMPLATES_CACHE_TTL = 60000; // 1 minute

/**
 * Ensure the email_templates and leads tables exist. If they do not, create
 * them. This function is idempotent and can be called multiple times without
 * side effects. The email_templates table stores a unique template per type.
 * The leads table stores captured leads with a timestamp.
 *
 * @param {object} env Cloudflare environment with DB binding
 */
async function ensureEmailTables(env) {
  if (!env.DB) return;
  // Create email_templates table
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT UNIQUE,
      subject TEXT,
      body TEXT,
      updated_at INTEGER
    )
  `).run();
  // Create leads table
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      name TEXT,
      source TEXT,
      created_at INTEGER
    )
  `).run();
}

/**
 * Fetch all email templates from the database. Results are cached for a
 * short period to reduce DB overhead. You may optionally pass a type
 * parameter to return only a specific template.
 *
 * @param {object} env Cloudflare environment
 * @param {string} type Optional template type filter
 */
export async function getEmailTemplates(env, type = null) {
  const now = Date.now();
  if (templatesCache && (now - templatesCacheTime) < TEMPLATES_CACHE_TTL) {
    // Return cached copy if present
    if (type) {
      return templatesCache.filter(t => t.type === type);
    }
    return templatesCache;
  }
  await ensureEmailTables(env);
  try {
    const sql = type ? 'SELECT * FROM email_templates WHERE type = ?' : 'SELECT * FROM email_templates';
    const stmt = env.DB.prepare(sql);
    const rows = type ? (await stmt.bind(type).all()).results : (await stmt.all()).results;
    templatesCache = rows || [];
    templatesCacheTime = now;
    return templatesCache;
  } catch (e) {
    console.error('Email templates fetch error:', e);
    return [];
  }
}

/**
 * API wrapper for getEmailTemplates. Returns a JSON response suitable
 * for admin consumption. Pass ?type=xyz to filter.
 *
 * @param {object} env Cloudflare environment
 * @param {Request} req Incoming request
 */
export async function getEmailTemplatesApi(env, req) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const templates = await getEmailTemplates(env, type);
    return json({ success: true, templates });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * Insert or update an email template. If a template with the same type exists
 * it will be updated; otherwise a new row will be created. The updated_at
 * field is set to the current timestamp. Cache is invalidated after save.
 *
 * @param {object} env Cloudflare environment
 * @param {object} body JSON body containing type, subject, body
 */
export async function saveEmailTemplate(env, body) {
  try {
    await ensureEmailTables(env);
    const type = String(body.type || '').trim();
    const subject = String(body.subject || '').trim();
    const content = String(body.body || '').trim();
    if (!type) {
      return json({ error: 'Missing template type' }, 400);
    }
    // Upsert the template
    await env.DB.prepare(`
      INSERT INTO email_templates (type, subject, body, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(type) DO UPDATE SET
        subject = excluded.subject,
        body = excluded.body,
        updated_at = excluded.updated_at
    `).bind(type, subject, content, Date.now()).run();
    templatesCache = null;
    return json({ success: true });
  } catch (e) {
    console.error('Email template save error:', e);
    return json({ error: e.message }, 500);
  }
}

/**
 * API wrapper for saveEmailTemplate. Accepts JSON body from admin UI.
 *
 * @param {object} env Cloudflare environment
 * @param {object} body Request body parsed as JSON
 */
export async function saveEmailTemplateApi(env, body) {
  return saveEmailTemplate(env, body);
}

/**
 * Insert a new lead (email capture) into the leads table. This is called
 * when a user enters their email in a form (e.g. checkout, contact) but
 * does not necessarily complete an order. No validation is performed
 * beyond simple trimming. Source can indicate where the lead originated.
 *
 * @param {object} env Cloudflare environment
 * @param {object} body Contains email, name (optional), and source (optional)
 */
export async function addLead(env, body) {
  try {
    await ensureEmailTables(env);
    const email = String(body.email || '').trim().toLowerCase();
    const name = body.name ? String(body.name).trim() : '';
    const source = body.source ? String(body.source).trim() : '';
    if (!email || !email.includes('@')) {
      return json({ error: 'Invalid email' }, 400);
    }
    await env.DB.prepare(
      'INSERT INTO leads (email, name, source, created_at) VALUES (?, ?, ?, ?)'
    ).bind(email, name, source, Date.now()).run();
    return json({ success: true });
  } catch (e) {
    console.error('Lead insert error:', e);
    return json({ error: e.message }, 500);
  }
}

/**
 * API wrapper for addLead. Accepts JSON body containing email and optional
 * name/source fields.
 *
 * @param {object} env Cloudflare environment
 * @param {object} body JSON body
 */
export async function addLeadApi(env, body) {
  return addLead(env, body);
}