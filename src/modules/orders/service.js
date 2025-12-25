export async function listOrders(db) {
  const result = await db.prepare(
    'SELECT * FROM orders ORDER BY id DESC'
  ).all();
  return result.results || [];
}

export async function getOrderById(db, id) {
  return db.prepare(
    'SELECT * FROM orders WHERE id = ? OR order_id = ? LIMIT 1'
  ).bind(Number(id) || 0, String(id || '')).first();
}

export async function getProductSnapshot(db, productId) {
  return db.prepare(
    'SELECT id, title, instant, delivery_days, addons_json FROM products WHERE id = ? LIMIT 1'
  ).bind(productId).first();
}

export async function insertOrder(db, data) {
  return db.prepare(
    `INSERT INTO orders (order_id, email, product_id, product_title, status, delivery_days, instant, addons_json, due_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.orderId,
    data.email,
    data.productId,
    data.productTitle,
    data.status,
    data.deliveryDays,
    data.instant,
    data.addonsJson,
    data.dueAt
  ).run();
}

export async function setOrderStatus(db, data) {
  return db.prepare(
    `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`
  ).bind(data.status, data.orderId).run();
}

export async function setOrderDelivered(db, data) {
  return db.prepare(
    `UPDATE orders
     SET status = 'delivered', archive_url = ?, updated_at = CURRENT_TIMESTAMP
     WHERE order_id = ?`
  ).bind(data.archiveUrl, data.orderId).run();
}
