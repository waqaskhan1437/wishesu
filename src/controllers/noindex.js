/**
 * Noindex Controller 2025 - Hide pages from search results
 * Google-compliant implementation using robots meta tags
 */

import { json } from '../utils/response.js';

// Simple cache
let noindexCache = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

const DEFAULT_NOINDEX = [];

/**
 * Ensure noindex table exists
 */
async function ensureTable(env) {
  if (!env.DB) return;
  
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS noindex_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url_pattern TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
  } catch (e) {
    console.error('Noindex table error:', e);
  }
}

/**
 * Get noindex patterns with cache
 */
async function getNoindexPatterns(env) {
  const now = Date.now();
  if (noindexCache && (now - cacheTime) < CACHE_TTL) {
    return noindexCache;
  }

  await ensureTable(env);

  try {
    const result = await env.DB.prepare('SELECT url_pattern FROM noindex_pages ORDER BY id').all();
    noindexCache = (result.results || []).map(r => r.url_pattern);
    cacheTime = now;
    return noindexCache;
  } catch (e) {
    return DEFAULT_NOINDEX;
  }
}

/**
 * API: Get noindex list
 */
export async function getNoindexList(env) {
  try {
    const patterns = await getNoindexPatterns(env);
    return json({ success: true, urls: patterns });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * API: Add noindex URL
 */
export async function addNoindexUrl(env, body) {
  try {
    await ensureTable(env);
    
    const url = body.url?.trim();
    if (!url) {
      return json({ error: 'URL is required' }, 400);
    }

    // Insert if not exists
    await env.DB.prepare(`
      INSERT OR IGNORE INTO noindex_pages (url_pattern) VALUES (?)
    `).bind(url).run();

    noindexCache = null; // Clear cache

    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * API: Remove noindex URL by index
 */
export async function removeNoindexUrl(env, body) {
  try {
    await ensureTable(env);
    
    const index = body.index;
    if (typeof index !== 'number') {
      return json({ error: 'Index is required' }, 400);
    }

    // Get all patterns ordered by ID
    const result = await env.DB.prepare('SELECT id, url_pattern FROM noindex_pages ORDER BY id').all();
    const patterns = result.results || [];
    
    if (index >= 0 && index < patterns.length) {
      const patternToRemove = patterns[index].url_pattern;
      await env.DB.prepare('DELETE FROM noindex_pages WHERE url_pattern = ? LIMIT 1').bind(patternToRemove).run();
      
      noindexCache = null; // Clear cache
      return json({ success: true });
    }

    return json({ error: 'Pattern not found' }, 404);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * Check if a URL should be noindexed
 */
export async function shouldNoindexUrl(env, pathname) {
  const patterns = await getNoindexPatterns(env);
  
  for (const pattern of patterns) {
    if (matchesPattern(pathname, pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Helper: Check if pathname matches pattern
 * Supports: exact match, prefix match (* wildcard)
 */
function matchesPattern(pathname, pattern) {
  // Exact match
  if (pathname === pattern) return true;
  
  // Wildcard pattern (e.g., /product-*)
  if (pattern.includes('*')) {
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pathname);
  }
  
  // Prefix match (e.g., /admin/ matches /admin/login.html)
  if (pattern.endsWith('/') && pathname.startsWith(pattern)) {
    return true;
  }
  
  return false;
}

/**
 * Get noindex meta tags for a page
 */
export async function getNoindexMetaTags(env, pathname) {
  if (await shouldNoindexUrl(env, pathname)) {
    return '<meta name="robots" content="noindex">';
  }
  return '';
}
