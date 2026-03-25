/**
 * Product Queries - Database queries for products
 * Consolidated from router.js and controllers
 */

import { queryOne, queryAll, runQuery, countRows } from '../utils/db-helpers.js';

export async function getProductById(env, id, visibilityClause = '') {
  const sql = `SELECT * FROM products WHERE id = ? ${visibilityClause}`;
  return queryOne(env, sql, [Number(id)]);
}

export async function getProductBySlug(env, slug, visibilityClause = '') {
  const sql = `SELECT * FROM products WHERE slug = ? ${visibilityClause}`;
  return queryOne(env, sql, [slug]);
}

export async function getAllProducts(env, options = {}) {
  const { limit = 50, offset = 0, status = 'published', orderBy = 'id DESC' } = options;
  const where = status ? `WHERE status = ?` : '';
  const bindings = status ? [status] : [];
  const sql = `SELECT * FROM products ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [...bindings, limit, offset]);
}

export async function searchProducts(env, searchTerm, options = {}) {
  const { limit = 20, offset = 0, status = 'published' } = options;
  const where = status 
    ? `WHERE (title LIKE ? OR description LIKE ?) AND status = ?`
    : `WHERE title LIKE ? OR description LIKE ?`;
  const searchPattern = `%${searchTerm}%`;
  const bindings = status 
    ? [searchPattern, searchPattern, status]
    : [searchPattern, searchPattern];
  
  const sql = `SELECT * FROM products ${where} ORDER BY id DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [...bindings, limit, offset]);
}

export async function getProductCount(env, status = null) {
  if (status) {
    return countRows(env, 'products', 'WHERE status = ?', [status]);
  }
  return countRows(env, 'products');
}

export async function getProductReviews(env, productId, options = {}) {
  const { limit = 10, offset = 0, status = 'approved' } = options;
  const sql = `SELECT * FROM reviews WHERE product_id = ? AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [productId, status, limit, offset]);
}

export async function createProduct(env, productData) {
  const { title, slug, description, normal_price, sale_price, thumbnail_url, status } = productData;
  const sql = `INSERT INTO products (title, slug, description, normal_price, sale_price, thumbnail_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  return runQuery(env, sql, [title, slug, description, normal_price, sale_price, thumbnail_url, status || 'draft', Date.now()]);
}

export async function updateProduct(env, id, productData) {
  const keys = Object.keys(productData);
  const values = Object.values(productData);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const sql = `UPDATE products SET ${setClause}, updated_at = ? WHERE id = ?`;
  return runQuery(env, sql, [...values, Date.now(), id]);
}

export async function deleteProduct(env, id) {
  return runQuery(env, 'DELETE FROM products WHERE id = ?', [id]);
}

export async function getProductsByCategory(env, category, options = {}) {
  const { limit = 20, offset = 0, status = 'published' } = options;
  const sql = `SELECT * FROM products WHERE category = ? AND status = ? ORDER BY sort_order ASC, id DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [category, status, limit, offset]);
}

export async function getFeaturedProducts(env, limit = 6) {
  const sql = `SELECT * FROM products WHERE status = 'published' ORDER BY sort_order ASC, id DESC LIMIT ?`;
  return queryAll(env, sql, [limit]);
}
