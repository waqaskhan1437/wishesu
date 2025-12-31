/**
 * System Pages Controller - Built-in pages (Blog, Forum) with SEO settings
 * These pages cannot be edited in Page Builder
 */

import { json } from '../utils/response.js';

// System page types - these are fixed and cannot be created via page builder
const SYSTEM_PAGE_TYPES = {
  BLOG_ARCHIVE: 'blog_archive',
  BLOG_POST: 'blog_post',
  FORUM: 'forum',
  FORUM_QUESTION: 'forum_question'
};

/**
 * Ensure system_pages table exists
 */
async function ensureSystemPagesTable(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS system_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_type TEXT UNIQUE NOT NULL,
        slug TEXT NOT NULL,
        seo_title TEXT,
        seo_description TEXT,
        seo_keywords TEXT,
        custom_css TEXT,
        custom_js TEXT,
        header_content TEXT,
        footer_content TEXT,
        enabled INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `).run();
    
    // Insert default system pages if they don't exist
    const now = Date.now();
    const defaults = [
      { type: 'blog_archive', slug: 'blog', title: 'Blog', desc: 'Read our latest articles and updates' },
      { type: 'blog_post', slug: 'blog', title: 'Blog Post', desc: 'Read this article' },
      { type: 'forum', slug: 'forum', title: 'Community Forum', desc: 'Ask questions and get help from our community' },
      { type: 'forum_question', slug: 'forum', title: 'Forum Question', desc: 'View question and answers' }
    ];
    
    for (const d of defaults) {
      try {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO system_pages (page_type, slug, seo_title, seo_description, enabled, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, ?, ?)
        `).bind(d.type, d.slug, d.title, d.desc, now, now).run();
      } catch (e) {
        // Ignore if already exists
      }
    }
  } catch (e) {
    console.error('System pages table error:', e);
  }
}

/**
 * Get all system pages (admin)
 */
export async function getSystemPages(env) {
  try {
    await ensureSystemPagesTable(env);
    
    const result = await env.DB.prepare(`
      SELECT * FROM system_pages ORDER BY id ASC
    `).all();
    
    return json({
      success: true,
      pages: result.results || []
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Get system page by type (public/internal)
 */
export async function getSystemPage(env, pageType) {
  try {
    await ensureSystemPagesTable(env);
    
    const page = await env.DB.prepare(`
      SELECT * FROM system_pages WHERE page_type = ?
    `).bind(pageType).first();
    
    if (!page) {
      return json({ page: null });
    }
    
    return json({ success: true, page });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Update system page SEO settings
 */
export async function updateSystemPage(env, body) {
  try {
    await ensureSystemPagesTable(env);
    
    const { page_type, slug, seo_title, seo_description, seo_keywords, custom_css, custom_js, header_content, footer_content, enabled } = body;
    
    if (!page_type) {
      return json({ error: 'page_type is required' }, 400);
    }
    
    const now = Date.now();
    const isEnabled = enabled !== undefined ? (enabled ? 1 : 0) : 1;
    
    // Check if page exists
    const existing = await env.DB.prepare(`
      SELECT id FROM system_pages WHERE page_type = ?
    `).bind(page_type).first();
    
    if (existing) {
      await env.DB.prepare(`
        UPDATE system_pages SET 
          slug = ?,
          seo_title = ?,
          seo_description = ?,
          seo_keywords = ?,
          custom_css = ?,
          custom_js = ?,
          header_content = ?,
          footer_content = ?,
          enabled = ?,
          updated_at = ?
        WHERE page_type = ?
      `).bind(
        slug || '',
        seo_title || '',
        seo_description || '',
        seo_keywords || '',
        custom_css || '',
        custom_js || '',
        header_content || '',
        footer_content || '',
        isEnabled,
        now,
        page_type
      ).run();
    } else {
      await env.DB.prepare(`
        INSERT INTO system_pages (page_type, slug, seo_title, seo_description, seo_keywords, custom_css, custom_js, header_content, footer_content, enabled, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        page_type,
        slug || '',
        seo_title || '',
        seo_description || '',
        seo_keywords || '',
        custom_css || '',
        custom_js || '',
        header_content || '',
        footer_content || '',
        isEnabled,
        now,
        now
      ).run();
    }
    
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Toggle system page enabled/disabled
 */
export async function toggleSystemPage(env, body) {
  try {
    await ensureSystemPagesTable(env);
    
    const { page_type, enabled } = body;
    
    if (!page_type) {
      return json({ error: 'page_type is required' }, 400);
    }
    
    const now = Date.now();
    const isEnabled = enabled ? 1 : 0;
    
    await env.DB.prepare(`
      UPDATE system_pages SET enabled = ?, updated_at = ? WHERE page_type = ?
    `).bind(isEnabled, now, page_type).run();
    
    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export { SYSTEM_PAGE_TYPES };
