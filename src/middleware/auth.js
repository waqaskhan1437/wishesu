/**
 * Auth Middleware - Authentication and authorization helpers
 */

import { isValidEmail } from '../utils/validation.js';

export function requireAuth(req) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization header' };
  }
  return { authorized: true };
}

export function getClientIp(req) {
  const forwarded = req.headers.get('CF-Connecting-IP') ||
                    req.headers.get('X-Forwarded-For') ||
                    req.headers.get('X-Real-IP') ||
                    'unknown';
  return forwarded.split(',')[0].trim();
}

export function getUserAgent(req) {
  return req.headers.get('User-Agent') || 'unknown';
}

export async function checkAdminIp(env, req) {
  const clientIp = getClientIp(req);
  const allowedIps = env.ADMIN_ALLOWED_IPS ? env.ADMIN_ALLOWED_IPS.split(',') : [];
  
  if (allowedIps.length === 0) return true;
  
  return allowedIps.some(ip => clientIp.startsWith(ip.trim()));
}

export function generateSessionToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

export function createSession(userId, expiresIn = 86400000) {
  return {
    userId,
    token: generateSessionToken(),
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresIn
  };
}

export function isSessionValid(session) {
  if (!session || !session.expiresAt) return false;
  return Date.now() < session.expiresAt;
}

export function getBasicAuthCredentials(req) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const base64 = authHeader.slice(6);
    const decoded = atob(base64);
    const [username, password] = decoded.split(':');
    return { username, password };
  } catch {
    return null;
  }
}

export function requireApiKey(req, env) {
  const apiKey = req.headers.get('X-API-Key') || req.url.split('api_key=')[1];
  
  if (!apiKey) {
    return { valid: false, error: 'API key required' };
  }

  if (env.API_KEY && apiKey !== env.API_KEY) {
    return { valid: false, error: 'Invalid API key' };
  }

  return { valid: true };
}

export function rateLimitKey(req, endpoint) {
  const ip = getClientIp(req);
  return `ratelimit:${endpoint}:${ip}`;
}
