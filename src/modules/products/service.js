export async function getAllProducts(db) {
  const result = await db.prepare(
    'SELECT * FROM products ORDER BY id DESC'
  ).all();
  return result.results || [];
}

export async function getProductByIdOrSlug(db, id) {
  return db.prepare(
    'SELECT * FROM products WHERE id = ? OR slug = ? LIMIT 1'
  ).bind(Number(id) || 0, String(id || '')).first();
}

export async function updateProduct(db, data) {
  return db.prepare(
    `UPDATE products
     SET title = ?, slug = ?, price = ?, status = ?, instant = ?, delivery_days = ?,
         media_json = ?, addons_json = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.title,
    data.slug,
    data.price,
    data.status,
    data.instant,
    data.deliveryDays,
    data.mediaJson,
    data.addonsJson,
    data.videoUrl,
    data.id
  ).run();
}

export async function createProduct(db, data) {
  return db.prepare(
    `INSERT INTO products (title, slug, price, status, instant, delivery_days, media_json, addons_json, video_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.title,
    data.slug,
    data.price,
    data.status,
    data.instant,
    data.deliveryDays,
    data.mediaJson,
    data.addonsJson,
    data.videoUrl
  ).run();
}

export async function removeProduct(db, id) {
  return db.prepare('DELETE FROM products WHERE id = ?')
    .bind(Number(id))
    .run();
}
