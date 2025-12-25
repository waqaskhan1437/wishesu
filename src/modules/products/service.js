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

export async function getProductById(db, id) {
  return db.prepare(
    'SELECT * FROM products WHERE id = ? LIMIT 1'
  ).bind(Number(id)).first();
}

export async function slugExists(db, slug) {
  const row = await db.prepare('SELECT id FROM products WHERE slug = ? LIMIT 1')
    .bind(slug)
    .first();
  return !!row;
}

export async function duplicateProduct(db, source) {
  const baseSlug = source.slug || 'product';
  let newSlug = `${baseSlug}-copy`;
  let idx = 1;
  while (await slugExists(db, newSlug)) {
    newSlug = `${baseSlug}-copy${idx}`;
    idx += 1;
  }

  return db.prepare(
    `INSERT INTO products (title, slug, price, status, instant, delivery_days, media_json, addons_json, video_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    `${source.title || 'Product'} Copy`,
    newSlug,
    source.price || 0,
    'draft',
    source.instant || 0,
    source.delivery_days || 2,
    source.media_json || '[]',
    source.addons_json || '[]',
    source.video_url || ''
  ).run();
}
