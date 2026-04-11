/**
 * Blog Controller - Blog posts CRUD operations
 * OPTIMIZED: Added edge caching for public endpoints
 */

import { json, cachedJson } from '../utils/response.js';

/**
 * Internal helper to sanitize blog slug.
 */
function sanitizeBlogSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/**
 * Internal helper to save or update a blog post.
 * Consolidates logic from saveBlog and duplicateBlog.
 */
async function internalSaveBlog(env, {
  id,
  title,
  slug,
  description = '',
  content = '',
  thumbnail_url = '',
  custom_css = '',
  custom_js = '',
  seo_title = '',
  seo_description = '',
  seo_keywords = '',
  status = 'draft',
  created_at = null,
  updated_at = null
}) {
  if (!title) throw new Error('Title is required');

  const finalSlug = sanitizeBlogSlug(slug || title);
  const now = Date.now();
  const finalCreatedAt = created_at || now;
  const finalUpdatedAt = updated_at || now;

  const blogData = [
    title,
    finalSlug,
    description || '',
    content || '',
    thumbnail_url || '',
    custom_css || '',
    custom_js || '',
    seo_title || '',
    seo_description || '',
    seo_keywords || '',
    status
  ];

  if (id) {
    await env.DB.prepare(`
      UPDATE blogs SET
        title = ?, slug = ?, description = ?, content = ?, thumbnail_url = ?,
        custom_css = ?, custom_js = ?, seo_title = ?, seo_description = ?,
        seo_keywords = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).bind(...blogData, finalUpdatedAt, id).run();

    return { success: true, id, slug: finalSlug };
  }

  const result = await env.DB.prepare(`
    INSERT INTO blogs (
      title, slug, description, content, thumbnail_url, custom_css, custom_js,
      seo_title, seo_description, seo_keywords, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(...blogData, finalCreatedAt, finalUpdatedAt).run();

  return { success: true, id: result.meta?.last_row_id, slug: finalSlug };
}

/**
 * Get all blog posts (admin - no cache)
 */
export async function getBlogs(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT * FROM blogs ORDER BY created_at DESC
    `).all();
    return json({ success: true, blogs: result.results || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Get blog posts list (minimal data for admin table - no cache)
 */
export async function getBlogsList(env) {
  try {
    const result = await env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url, status, created_at, updated_at
      FROM blogs ORDER BY created_at DESC
    `).all();
    return json({ success: true, blogs: result.results || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Get published blogs for archive page with pagination (PUBLIC - cached)
 * OPTIMIZED: Use parallel queries for count and data
 */
export async function getPublishedBlogs(env, url) {
  try {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '30');
    const offset = (page - 1) * limit;

    // OPTIMIZED: Run count and data queries in parallel
    const [countResult, result] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as total FROM blogs WHERE status = 'published'`).first(),
      env.DB.prepare(`
        SELECT id, title, slug, description, thumbnail_url, created_at
        FROM blogs 
        WHERE status = 'published'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `).bind(limit, offset).all()
    ]);
    
    const total = countResult?.total || 0;

    // Cache for 3 minutes
    return cachedJson({
      success: true,
      blogs: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Get single blog by ID or slug
 */
export async function getBlog(env, idOrSlug) {
  try {
    let blog;
    
    // Check if it's an ID (numeric) or slug
    if (/^\d+$/.test(idOrSlug)) {
      blog = await env.DB.prepare(`
        SELECT * FROM blogs WHERE id = ?
      `).bind(parseInt(idOrSlug)).first();
    } else {
      blog = await env.DB.prepare(`
        SELECT * FROM blogs WHERE slug = ?
      `).bind(idOrSlug).first();
    }

    if (!blog) {
      return json({ error: 'Blog post not found' }, 404);
    }

    return json({ success: true, blog });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Get published blog by slug (public)
 */
export async function getPublishedBlog(env, slug) {
  try {
    const blog = await env.DB.prepare(`
      SELECT * FROM blogs WHERE slug = ? AND status = 'published'
    `).bind(slug).first();

    if (!blog) {
      return json({ error: 'Blog post not found' }, 404);
    }

    return json({ success: true, blog });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Get previous blogs before the current one (for related posts)
 */
export async function getPreviousBlogs(env, currentId, limit = 2) {
  try {
    const result = await env.DB.prepare(`
      SELECT id, title, slug, description, thumbnail_url, created_at
      FROM blogs 
      WHERE status = 'published' AND id < ?
      ORDER BY id DESC
      LIMIT ?
    `).bind(currentId, limit).all();

    return json({ success: true, blogs: result.results || [] });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Save blog post (create or update)
 */
export async function saveBlog(env, body) {
  try {
    let blogParams = { ...body };

    if (body.id) {
      const existing = await env.DB.prepare('SELECT * FROM blogs WHERE id = ?').bind(body.id).first();
      if (!existing) return json({ error: 'Blog post not found' }, 404);
      
      const pick = (key, fallback) => (key in body) ? (body[key] ?? '') : (fallback ?? '');
      blogParams = {
        ...existing,
        ...body,
        description: pick('description', existing.description),
        content: pick('content', existing.content),
        thumbnail_url: pick('thumbnail_url', existing.thumbnail_url),
        custom_css: pick('custom_css', existing.custom_css),
        custom_js: pick('custom_js', existing.custom_js),
        seo_title: pick('seo_title', existing.seo_title),
        seo_description: pick('seo_description', existing.seo_description),
        seo_keywords: pick('seo_keywords', existing.seo_keywords),
        status: pick('status', existing.status)
      };
    }

    const result = await internalSaveBlog(env, blogParams);
    return json(result);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Delete blog post
 */
export async function deleteBlog(env, id) {
  try {
    if (!id) {
      return json({ error: 'Blog ID required' }, 400);
    }

    await env.DB.prepare('DELETE FROM blogs WHERE id = ?').bind(id).run();
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Delete all blogs (admin cleanup)
 */
export async function deleteAllBlogs(env) {
  try {
    const commentsResult = await env.DB.prepare(
      'DELETE FROM blog_comments WHERE blog_id IN (SELECT id FROM blogs)'
    ).run();
    const blogsResult = await env.DB.prepare('DELETE FROM blogs').run();

    return json({
      success: true,
      count: blogsResult?.changes || 0,
      deleted_blog_comments: commentsResult?.changes || 0
    });
  } catch (err) {
    return json({ error: err.message || 'Failed to delete all blogs' }, 500);
  }
}

/**
 * Update blog status
 */
export async function updateBlogStatus(env, body) {
  try {
    const { id, status } = body;
    
    if (!id || !status) {
      return json({ error: 'ID and status required' }, 400);
    }

    await env.DB.prepare(`
      UPDATE blogs SET status = ?, updated_at = ? WHERE id = ?
    `).bind(status, Date.now(), id).run();

    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Duplicate blog post
 */
export async function duplicateBlog(env, body) {
  try {
    const { id } = body;
    
    if (!id) {
      return json({ error: 'Blog ID required' }, 400);
    }

    // Get original blog
    const original = await env.DB.prepare('SELECT * FROM blogs WHERE id = ?').bind(id).first();
    
    if (!original) {
      return json({ error: 'Blog not found' }, 404);
    }

    let baseSlug = sanitizeBlogSlug(original.slug || 'post');
    let newSlugCandidate = `${baseSlug}-copy`;
    let counter = 1;
    while (true) {
      const exists = await env.DB.prepare('SELECT id FROM blogs WHERE slug = ? LIMIT 1').bind(newSlugCandidate).first();
      if (!exists) break;
      newSlugCandidate = `${baseSlug}-copy${counter++}`;
    }

    const result = await internalSaveBlog(env, {
      ...original,
      id: null,
      title: `${original.title} (Copy)`,
      slug: newSlugCandidate,
      status: 'draft'
    });

    return json(result);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
