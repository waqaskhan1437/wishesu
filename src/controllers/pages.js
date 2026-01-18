/**
 * Pages controller - Dynamic page management
 * OPTIMIZED: Added edge caching for public endpoints
 */

import { json, cachedJson } from '../utils/response.js';
import { toISO8601 } from '../utils/formatting.js';

// Page type constants
const PAGE_TYPES = {
  CUSTOM: 'custom',
  HOME: 'home',
  BLOG_ARCHIVE: 'blog_archive',
  FORUM_ARCHIVE: 'forum_archive',
  PRODUCT_GRID: 'product_grid'
};

/**
 * Get active pages (public - cached)
 */
export async function getPages(env) {
  const r = await env.DB.prepare(
    'SELECT id, slug, title, meta_description, page_type, is_default, created_at, updated_at FROM pages WHERE status = ? ORDER BY id DESC'
  ).bind('published').all();
  
  const pages = (r.results || []).map(page => {
    if (page.created_at) page.created_at = toISO8601(page.created_at);
    if (page.updated_at) page.updated_at = toISO8601(page.updated_at);
    return page;
  });

  // Cache for 2 minutes
  return cachedJson({ pages }, 120);
}

/**
 * Get all pages (admin) - Returns format expected by dashboard.js
 * Maps to: { name, url, size, uploaded, id, status, page_type, is_default }
 */
export async function getPagesList(env) {
  let r;
  let hasNewColumns = true;
  
  try {
    r = await env.DB.prepare(
      'SELECT id, slug, title, content, status, page_type, is_default, created_at, updated_at FROM pages ORDER BY id DESC'
    ).all();
  } catch (e) {
    // Fallback: new columns don't exist
    hasNewColumns = false;
    r = await env.DB.prepare(
      'SELECT id, slug, title, content, status, created_at, updated_at FROM pages ORDER BY id DESC'
    ).all();
  }
  
  const pages = (r.results || []).map(page => {
    // Calculate approximate size of content
    const contentSize = page.content ? page.content.length : 0;
    
    // Format size for display
    let sizeStr = '0 B';
    if (contentSize >= 1024 * 1024) {
      sizeStr = (contentSize / (1024 * 1024)).toFixed(2) + ' MB';
    } else if (contentSize >= 1024) {
      sizeStr = (contentSize / 1024).toFixed(2) + ' KB';
    } else {
      sizeStr = contentSize + ' B';
    }
    
    // Convert datetime to ISO format
    const uploaded = page.updated_at 
      ? toISO8601(page.updated_at) 
      : (page.created_at ? toISO8601(page.created_at) : new Date().toISOString());
    
    return {
      id: page.id,
      name: page.slug || page.title || 'Untitled',
      title: page.title || page.slug || 'Untitled',
      url: `/${page.slug}`,
      size: sizeStr,
      uploaded: uploaded,
      status: page.status || 'draft',
      page_type: hasNewColumns ? (page.page_type || 'custom') : 'custom',
      is_default: hasNewColumns ? (page.is_default || 0) : 0
    };
  });

  return json({ success: true, pages });
}

/**
 * Get page by slug
 */
export async function getPage(env, slug) {
  const row = await env.DB.prepare('SELECT * FROM pages WHERE slug = ?').bind(slug).first();
  if (!row) return json({ error: 'Page not found' }, 404);

  if (row.created_at) row.created_at = toISO8601(row.created_at);
  if (row.updated_at) row.updated_at = toISO8601(row.updated_at);

  return json({ page: row });
}

/**
 * Get default page by type
 */
export async function getDefaultPage(env, pageType) {
  try {
    const row = await env.DB.prepare(
      'SELECT * FROM pages WHERE page_type = ? AND is_default = 1 AND status = ?'
    ).bind(pageType, 'published').first();
    
    if (!row) return json({ page: null });
    
    if (row.created_at) row.created_at = toISO8601(row.created_at);
    if (row.updated_at) row.updated_at = toISO8601(row.updated_at);
    
    return json({ page: row });
  } catch (e) {
    // Columns might not exist yet
    return json({ page: null });
  }
}

/**
 * Set page as default for its type
 */
export async function setDefaultPage(env, body) {
  const { id, page_type } = body;
  
  if (!id || !page_type) {
    return json({ error: 'id and page_type required' }, 400);
  }
  
  try {
    // First, unset any existing default for this type
    await env.DB.prepare(
      'UPDATE pages SET is_default = 0 WHERE page_type = ?'
    ).bind(page_type).run();
    
    // Then set the new default
    await env.DB.prepare(
      'UPDATE pages SET is_default = 1, page_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(page_type, Number(id)).run();
    
    return json({ success: true });
  } catch (e) {
    return json({ error: 'Columns not available. Please redeploy to add page_type support.' }, 500);
  }
}

/**
 * Clear default page for a type
 */
export async function clearDefaultPage(env, body) {
  const { page_type } = body;
  
  if (!page_type) {
    return json({ error: 'page_type required' }, 400);
  }
  
  await env.DB.prepare(
    'UPDATE pages SET is_default = 0 WHERE page_type = ?'
  ).bind(page_type).run();
  
  return json({ success: true });
}

/**
 * Save page (create or update)
 */
export async function savePage(env, body) {
  if (!body.slug || !body.title) return json({ error: 'slug and title required' }, 400);
  
  const pageType = body.page_type || 'custom';
  const isDefault = body.is_default ? 1 : 0;
  
  // If setting as default, clear other defaults first
  if (isDefault && pageType !== 'custom') {
    await env.DB.prepare(
      'UPDATE pages SET is_default = 0 WHERE page_type = ?'
    ).bind(pageType).run();
  }
  
  if (body.id) {
    await env.DB.prepare(
      'UPDATE pages SET slug=?, title=?, content=?, meta_description=?, page_type=?, is_default=?, feature_image_url=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(body.slug, body.title, body.content || '', body.meta_description || '', pageType, isDefault, body.feature_image_url || '', body.status || 'published', Number(body.id)).run();
    return json({ success: true, id: body.id });
  }
  
  const r = await env.DB.prepare(
    'INSERT INTO pages (slug, title, content, meta_description, page_type, is_default, feature_image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(body.slug, body.title, body.content || '', body.meta_description || '', pageType, isDefault, body.feature_image_url || '', body.status || 'published').run();
  return json({ success: true, id: r.meta?.last_row_id });
}

/**
 * Save page builder (simplified endpoint)
 */
export async function savePageBuilder(env, body) {
  const name = (body.name || '').trim();
  const content = body.content || '';
  const pageType = body.page_type || 'custom';
  const isDefault = body.is_default ? 1 : 0;
  
  if (!name) return json({ error: 'name required' }, 400);

  // If setting as default, clear other defaults first
  if (isDefault && pageType !== 'custom') {
    try {
      await env.DB.prepare(
        'UPDATE pages SET is_default = 0 WHERE page_type = ?'
      ).bind(pageType).run();
    } catch (e) {
      // Column might not exist yet, ignore
    }
  }

  const existing = await env.DB.prepare('SELECT id FROM pages WHERE slug = ?').bind(name).first();
  
  if (existing) {
    // Try with new columns first, fallback to old schema
    try {
      await env.DB.prepare(
        'UPDATE pages SET content=?, page_type=?, is_default=?, feature_image_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).bind(content, pageType, isDefault, body.feature_image_url || '', existing.id).run();
    } catch (e) {
      // Fallback: columns don't exist, use basic update
      await env.DB.prepare(
        'UPDATE pages SET content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
      ).bind(content, existing.id).run();
    }
    return json({ success: true, id: existing.id });
  }
  
  // Try with new columns first, fallback to old schema
  try {
    const r = await env.DB.prepare(
      'INSERT INTO pages (slug, title, content, page_type, is_default, feature_image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(name, name, content, pageType, isDefault, body.feature_image_url || '', 'published').run();
    return json({ success: true, id: r.meta?.last_row_id });
  } catch (e) {
    // Fallback: columns don't exist, use basic insert
    const r = await env.DB.prepare(
      'INSERT INTO pages (slug, title, content, status) VALUES (?, ?, ?, ?)'
    ).bind(name, name, content, 'published').run();
    return json({ success: true, id: r.meta?.last_row_id });
  }
}

/**
 * Delete page by ID
 */
export async function deletePage(env, id) {
  await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

/**
 * Delete page by slug
 */
export async function deletePageBySlug(env, body) {
  const name = (body.name || '').trim();
  if (!name) return json({ error: 'name required' }, 400);
  
  await env.DB.prepare('DELETE FROM pages WHERE slug = ?').bind(name).run();
  return json({ success: true });
}

/**
 * Update page status
 */
export async function updatePageStatus(env, body) {
  const id = body.id;
  const status = (body.status || '').trim().toLowerCase();
  if (!id || !status) {
    return json({ error: 'id and status required' }, 400);
  }
  if (status !== 'published' && status !== 'draft') {
    return json({ error: 'invalid status' }, 400);
  }
  await env.DB.prepare('UPDATE pages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, Number(id)).run();
  return json({ success: true });
}

/**
 * Update page type
 */
export async function updatePageType(env, body) {
  const { id, page_type, is_default } = body;
  
  if (!id || !page_type) {
    return json({ error: 'id and page_type required' }, 400);
  }
  
  const setDefault = is_default ? 1 : 0;
  
  // If setting as default, clear other defaults first
  if (setDefault && page_type !== 'custom') {
    await env.DB.prepare(
      'UPDATE pages SET is_default = 0 WHERE page_type = ?'
    ).bind(page_type).run();
  }
  
  await env.DB.prepare(
    'UPDATE pages SET page_type = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(page_type, setDefault, Number(id)).run();
  
  return json({ success: true });
}

/**
 * Duplicate page
 */
export async function duplicatePage(env, body) {
  const id = body.id;
  if (!id) {
    return json({ error: 'id required' }, 400);
  }
  const row = await env.DB.prepare('SELECT * FROM pages WHERE id = ?').bind(Number(id)).first();
  if (!row) {
    return json({ error: 'Page not found' }, 404);
  }
  
  const baseSlug = row.slug || 'page';
  let newSlug = baseSlug + '-copy';
  let idx = 1;
  let exists = await env.DB.prepare('SELECT slug FROM pages WHERE slug = ?').bind(newSlug).first();
  while (exists) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx++;
    exists = await env.DB.prepare('SELECT slug FROM pages WHERE slug = ?').bind(newSlug).first();
  }
  
  const r = await env.DB.prepare(
    'INSERT INTO pages (slug, title, content, meta_description, page_type, is_default, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    newSlug,
    (row.title || '') + ' Copy',
    row.content || '',
    row.meta_description || '',
    row.page_type || 'custom',
    0, // Never copy default status
    'draft'
  ).run();
  
  return json({ success: true, id: r.meta?.last_row_id, slug: newSlug });
}

/**
 * Load page builder content
 */
export async function loadPageBuilder(env, name) {
  if (!name) return json({ error: 'name required' }, 400);
  
  const row = await env.DB.prepare('SELECT content, page_type, is_default, feature_image_url FROM pages WHERE slug = ?').bind(name).first();
  if (!row) return json({ content: '', page_type: 'custom', is_default: 0, feature_image_url: '' });

  return json({
    content: row.content || '',
    page_type: row.page_type || 'custom',
    is_default: row.is_default || 0,
    feature_image_url: row.feature_image_url || ''
  });
}

/**
 * Serve dynamic page
 */
export async function serveDynamicPage(env, slug) {
  const row = await env.DB.prepare(
    'SELECT * FROM pages WHERE slug = ? AND status = ?'
  ).bind(slug, 'published').first();
  
  if (!row) return null;

  // Return page content with basic HTML wrapper
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${row.title || slug}</title>
  ${row.meta_description ? `<meta name="description" content="${row.meta_description}">` : ''}
  <style>body{font-family:-apple-system,system-ui,sans-serif;margin:0;padding:0;}</style>
</head>
<body>
  ${row.content || ''}
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
