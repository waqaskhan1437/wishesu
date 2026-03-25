/**
 * Blog Queries - Database queries for blogs
 * Consolidated from router.js and controllers
 */

import { queryOne, queryAll, runQuery, countRows } from '../utils/db-helpers.js';

export async function getBlogById(env, id) {
  return queryOne(env, 'SELECT * FROM blogs WHERE id = ?', [Number(id)]);
}

export async function getBlogBySlug(env, slug) {
  return queryOne(env, 'SELECT * FROM blogs WHERE slug = ?', [slug]);
}

export async function getAllBlogs(env, options = {}) {
  const { limit = 20, offset = 0, status = 'published' } = options;
  const where = status ? 'WHERE status = ?' : '';
  const bindings = status ? [status] : [];
  const sql = `SELECT * FROM blogs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [...bindings, limit, offset]);
}

export async function getBlogCount(env, status = null) {
  if (status) {
    return countRows(env, 'blogs', 'WHERE status = ?', [status]);
  }
  return countRows(env, 'blogs');
}

export async function createBlog(env, blogData) {
  const { title, slug, description, content, thumbnail_url, author, status } = blogData;
  const sql = `INSERT INTO blogs (title, slug, description, content, thumbnail_url, author, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  return runQuery(env, sql, [title, slug, description, content, thumbnail_url, author, status || 'draft', Date.now()]);
}

export async function updateBlog(env, id, blogData) {
  const keys = Object.keys(blogData);
  const values = Object.values(blogData);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const sql = `UPDATE blogs SET ${setClause}, updated_at = ? WHERE id = ?`;
  return runQuery(env, sql, [...values, Date.now(), id]);
}

export async function deleteBlog(env, id) {
  return runQuery(env, 'DELETE FROM blogs WHERE id = ?', [id]);
}

export async function getFeaturedBlogs(env, limit = 6) {
  const sql = `SELECT * FROM blogs WHERE status = 'published' ORDER BY created_at DESC LIMIT ?`;
  return queryAll(env, sql, [limit]);
}

export async function searchBlogs(env, searchTerm, options = {}) {
  const { limit = 20, offset = 0, status = 'published' } = options;
  const searchPattern = `%${searchTerm}%`;
  const sql = `SELECT * FROM blogs WHERE (title LIKE ? OR description LIKE ?) AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [searchPattern, searchPattern, status, limit, offset]);
}

export async function getBlogComments(env, blogId, options = {}) {
  const { limit = 50, offset = 0, status = 'approved' } = options;
  const sql = `SELECT * FROM blog_comments WHERE blog_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [blogId, status, limit, offset]);
}

export async function createBlogComment(env, commentData) {
  const { blog_id, name, email, comment, status } = commentData;
  const sql = `INSERT INTO blog_comments (blog_id, name, email, comment, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
  return runQuery(env, sql, [blog_id, name, email, comment, status || 'pending', Date.now()]);
}
