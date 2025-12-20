// Pages API controller
import { json } from '../utils/response.js';

/**
 * Get all pages
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
 */
export async function getPages(env) {
   const r = await env.DB.prepare('SELECT id, slug, title, status, created_at, updated_at FROM pages ORDER BY id DESC').all();

   // Convert created_at and updated_at to ISO 8601 format with Z suffix for UTC
   const pages = (r.results || []).map(page => {
     if (page.created_at && typeof page.created_at === 'string') {
       page.created_at = page.created_at.replace(' ', 'T') + 'Z';
     }
     if (page.updated_at && typeof page.updated_at === 'string') {
       page.updated_at = page.updated_at.replace(' ', 'T') + 'Z';
     }
     return page;
   });

   return json({ pages });
}

/**
 * Get a single page by slug
 * @param {Object} env - Environment bindings
 * @param {string} slug - Page slug
 * @returns {Promise<Response>}
 */
export async function getPage(env, slug) {
   const row = await env.DB.prepare('SELECT * FROM pages WHERE slug = ?').bind(slug).first();
   if (!row) return json({ error: 'Page not found' }, 404);

   // Convert created_at and updated_at to ISO 8601 format with Z suffix for UTC
   if (row.created_at && typeof row.created_at === 'string') {
     row.created_at = row.created_at.replace(' ', 'T') + 'Z';
   }
   if (row.updated_at && typeof row.updated_at === 'string') {
     row.updated_at = row.updated_at.replace(' ', 'T') + 'Z';
   }

   return json({ page: row });
}

/**
 * Save a page (create or update)
 * @param {Object} env - Environment bindings
 * @param {Object} body - Page data
 * @returns {Promise<Response>}
 */
export async function savePage(env, body) {
  if (!body.slug || !body.title) return json({ error: 'slug and title required' }, 400);
  
  if (body.id) {
    await env.DB.prepare(
      'UPDATE pages SET slug=?, title=?, content=?, meta_description=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
    ).bind(body.slug, body.title, body.content || '', body.meta_description || '', body.status || 'published', Number(body.id)).run();
    return json({ success: true, id: body.id });
  }
  
  const r = await env.DB.prepare(
    'INSERT INTO pages (slug, title, content, meta_description, status) VALUES (?, ?, ?, ?, ?)'
  ).bind(body.slug, body.title, body.content || '', body.meta_description || '', body.status || 'published').run();
  return json({ success: true, id: r.meta?.last_row_id });
}

/**
 * Delete a page
 * @param {Object} env - Environment bindings
 * @param {string} id - Page ID
 * @returns {Promise<Response>}
 */
export async function deletePage(env, id) {
  await env.DB.prepare('DELETE FROM pages WHERE id = ?').bind(Number(id)).run();
  return json({ success: true });
}

/**
 * Save page from page builder (convenience endpoint)
 * @param {Object} env - Environment bindings
 * @param {Object} body - Page builder data
 * @returns {Promise<Response>}
 */
export async function savePageBuilder(env, body) {
  const name = (body.name || '').trim();
  const html = (body.html || '').trim();
  if (!name || !html) {
    return json({ error: 'name and html required' }, 400);
  }
  // Sanitize the slug: lower-case and replace non-alphanumeric characters with dashes
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  // Check if page already exists
  const existing = await env.DB.prepare('SELECT id FROM pages WHERE slug = ?').bind(slug).first();
  if (existing) {
    await env.DB.prepare(
      'UPDATE pages SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(name, html, existing.id).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO pages (slug, title, content, meta_description, status) VALUES (?, ?, ?, ?, ?)'
    ).bind(slug, name, html, '', 'published').run();
  }
  return json({ success: true, slug });
}

/**
 * Get pages list for admin UI
 * @param {Object} env - Environment bindings
 * @returns {Promise<Response>}
 */
export async function getPagesList(env) {
  // Return all pages with their publish status. The admin UI uses this to
  // display published/draft pages and provide actions.  Selecting the
  // status column allows distinguishing between published and draft.
  const r = await env.DB.prepare(
    'SELECT slug, title, content, created_at, status FROM pages ORDER BY id DESC'
  ).all();
  const pages = (r.results || []).map(p => {
    const size = p.content ? p.content.length : 0;
    // Convert created_at to ISO 8601 format with Z suffix for UTC
    let createdAt = p.created_at;
    if (createdAt && typeof createdAt === 'string') {
      createdAt = createdAt.replace(' ', 'T') + 'Z';
    }
    return {
      name: p.slug,
      slug: p.slug,
      title: p.title,
      url: `/${p.slug}.html`,
      uploaded: createdAt,
      size: size,
      status: p.status || 'published'
    };
  });
  return json({ success: true, pages });
}

/**
 * Delete page by name/slug (convenience endpoint)
 * @param {Object} env - Environment bindings
 * @param {Object} body - Request body with name
 * @returns {Promise<Response>}
 */
export async function deletePageByName(env, body) {
  const name = (body.name || '').trim();
  if (!name) {
    return json({ error: 'name required' }, 400);
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await env.DB.prepare('DELETE FROM pages WHERE slug = ?').bind(slug).run();
  return json({ success: true });
}

/**
 * Update page status
 * @param {Object} env - Environment bindings
 * @param {Object} body - Request body with name and status
 * @returns {Promise<Response>}
 */
export async function updatePageStatus(env, body) {
  const name = (body.name || '').trim();
  const status = (body.status || '').trim().toLowerCase();
  if (!name || !status) {
    return json({ error: 'name and status required' }, 400);
  }
  if (status !== 'published' && status !== 'draft') {
    return json({ error: 'invalid status' }, 400);
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const existing = await env.DB.prepare('SELECT id FROM pages WHERE slug = ?').bind(slug).first();
  if (!existing) {
    return json({ error: 'Page not found' }, 404);
  }
  await env.DB.prepare('UPDATE pages SET status = ? WHERE slug = ?').bind(status, slug).run();
  return json({ success: true });
}

/**
 * Duplicate a page
 * @param {Object} env - Environment bindings
 * @param {Object} body - Request body with name
 * @returns {Promise<Response>}
 */
export async function duplicatePage(env, body) {
  const name = (body.name || '').trim();
  if (!name) {
    return json({ error: 'name required' }, 400);
  }
  const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const row = await env.DB.prepare('SELECT title, content, meta_description FROM pages WHERE slug = ?').bind(baseSlug).first();
  if (!row) {
    return json({ error: 'Page not found' }, 404);
  }
  // Determine new slug by adding '-copy' and ensuring uniqueness
  let newSlug = baseSlug + '-copy';
  let idx = 1;
  let exists = await env.DB.prepare('SELECT slug FROM pages WHERE slug = ?').bind(newSlug).first();
  while (exists) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx++;
    exists = await env.DB.prepare('SELECT slug FROM pages WHERE slug = ?').bind(newSlug).first();
  }
  const newTitle = (row.title || baseSlug) + ' Copy';
  const metaDesc = row.meta_description || '';
  await env.DB.prepare(
    'INSERT INTO pages (slug, title, content, meta_description, status) VALUES (?, ?, ?, ?, ?)'
  ).bind(newSlug, newTitle, row.content || '', metaDesc, 'draft').run();
  return json({ success: true, slug: newSlug });
}

/**
 * Load page for page builder (separate HTML and CSS)
 * @param {Object} env - Environment bindings
 * @param {URL} url - Request URL with name parameter
 * @returns {Promise<Response>}
 */
export async function loadPageForBuilder(env, url) {
  const name = url.searchParams.get('name');
  if (!name) {
    return json({ error: 'name required' }, 400);
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const row = await env.DB.prepare('SELECT content FROM pages WHERE slug = ?').bind(slug).first();
  if (!row) {
    return json({ error: 'Page not found' }, 404);
  }
  let full = row.content || '';
  let css = '';
  let htmlBody = '';
  try {
    // Extract CSS between <style> tags
    const styleMatch = full.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
      css = styleMatch[1];
    }
    // Extract body content between <body> tags
    const bodyMatch = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    htmlBody = bodyMatch ? bodyMatch[1] : full;
  } catch (e) {
    htmlBody = full;
  }
  return json({ success: true, html: htmlBody.trim(), css: css.trim() });
}