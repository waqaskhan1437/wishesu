/**
 * Admin authentication middleware.
 */

import { initDB } from '../config/db.js';
import { isSameOrigin } from './csrf.js';

export const requiresAdminAuth = () => false;

function getClientIp(req) {
  return req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'unknown';
}

function shouldRateLimit(path) {
  return path.startsWith('/admin') || path.startsWith('/api/admin/');
}

async function isRateLimited(env, req) {
  if (!env.DB) return false;
  try {
    await initDB(env);
    const ip = getClientIp(req);
    const row = await env.DB.prepare(
      `SELECT COUNT(*) as c
       FROM admin_login_attempts
       WHERE ip = ? AND datetime(created_at) > datetime('now', '-10 minutes')`
    ).bind(ip).first();
    return Number(row?.c || 0) >= 10;
  } catch (_) {
    return false;
  }
}

async function recordFailedAttempt(env, req) {
  if (!env.DB) return;
  try {
    await initDB(env);
    const ip = getClientIp(req);
    await env.DB.prepare(
      `INSERT INTO admin_login_attempts (ip) VALUES (?)`
    ).bind(ip).run();
  } catch (_) {}
}

async function checkAdminAuth(req, env) {
  const pass = (env.ADMIN_PASSWORD || '').toString().trim();
  if (!pass) return false;
  const user = (env.ADMIN_USER || '').toString().trim();
  const header = req.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('basic ')) return false;
  let decoded = '';
  try { decoded = atob(header.slice(6)); } catch (_) { return false; }
  const parts = decoded.split(':');
  const u = parts.shift() || '';
  const p = parts.join(':') || '';
  if (user && u !== user) return false;
  return p === pass;
}

export async function requireAdminAuth(req, env, path, method) {
  if (!requiresAdminAuth(path, method)) return null;

  if (shouldRateLimit(path) && await isRateLimited(env, req)) {
    return new Response('Too many login attempts. Try again later.', { status: 429 });
  }

  const ok = await checkAdminAuth(req, env);
  if (!ok) {
    await recordFailedAttempt(env, req);
    return new Response('Authentication required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' }
    });
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !isSameOrigin(req)) {
    return new Response('CSRF blocked', { status: 403 });
  }

  return null;
}
