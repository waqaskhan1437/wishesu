/**
 * Order Queries - Database queries for orders
 * Consolidated from router.js and controllers
 */

import { queryOne, queryAll, runQuery, countRows } from '../utils/db-helpers.js';
import { decodeOrderData } from '../utils/order-decoder.js';

export async function getOrderById(env, id) {
  return queryOne(env, 'SELECT * FROM orders WHERE id = ?', [Number(id)]);
}

export async function getOrderByOrderId(env, orderId) {
  return queryOne(env, 'SELECT * FROM orders WHERE order_id = ?', [orderId]);
}

export async function getOrders(env, options = {}) {
  const { limit = 50, offset = 0, status = null } = options;
  const where = status ? 'WHERE status = ?' : '';
  const bindings = status ? [status] : [];
  const sql = `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [...bindings, limit, offset]);
}

export async function getOrdersByEmail(env, email, options = {}) {
  const { limit = 20 } = options;
  const sql = `SELECT * FROM orders ORDER BY created_at DESC LIMIT ?`;
  const orders = await queryAll(env, sql, [limit]);
  return orders.filter(o => {
    try {
      const data = decodeOrderData(o.encrypted_data);
      return data.email?.toLowerCase() === email.toLowerCase();
    } catch {
      return false;
    }
  });
}

export async function getOrderCount(env, status = null) {
  if (status) {
    return countRows(env, 'orders', 'WHERE status = ?', [status]);
  }
  return countRows(env, 'orders');
}

export async function createOrder(env, orderData) {
  const { order_id, product_id, encrypted_data, status, delivery_time_minutes } = orderData;
  const sql = `INSERT INTO orders (order_id, product_id, encrypted_data, status, delivery_time_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
  return runQuery(env, sql, [order_id, product_id, encrypted_data, status || 'pending', delivery_time_minutes || 60, Date.now()]);
}

export async function updateOrderStatus(env, orderId, newStatus) {
  const sql = `UPDATE orders SET status = ?, updated_at = ? WHERE order_id = ?`;
  return runQuery(env, sql, [newStatus, Date.now(), orderId]);
}

export async function deleteOrder(env, id) {
  return runQuery(env, 'DELETE FROM orders WHERE id = ?', [id]);
}

export async function getOrdersByProduct(env, productId, options = {}) {
  const { limit = 50, offset = 0 } = options;
  const sql = `SELECT * FROM orders WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [productId, limit, offset]);
}

export async function getRecentOrders(env, limit = 10) {
  const sql = `SELECT * FROM orders ORDER BY created_at DESC LIMIT ?`;
  return queryAll(env, sql, [limit]);
}

export async function searchOrders(env, searchTerm, options = {}) {
  const { limit = 20 } = options;
  const orders = await getRecentOrders(env, 100);
  const term = searchTerm.toLowerCase();
  
  return orders.filter(o => {
    if (o.order_id?.toLowerCase().includes(term)) return true;
    try {
      const data = decodeOrderData(o.encrypted_data);
      return data.name?.toLowerCase().includes(term) || 
             data.email?.toLowerCase().includes(term);
    } catch {
      return false;
    }
  }).slice(0, limit);
}
