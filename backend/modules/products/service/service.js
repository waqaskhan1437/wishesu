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
     SET title = ?, description = ?, slug = ?, normal_price = ?, sale_price = ?, status = ?,
         instant = ?, delivery_days = ?, instant_delivery = ?, normal_delivery_text = ?,
         thumbnail_url = ?, video_url = ?, addons_json = ?, gallery_images = ?, whop_product_id = ?
     WHERE id = ?`
  ).bind(
    data.title,
    data.description,
    data.slug,
    data.normalPrice,
    data.salePrice,
    data.status,
    data.instant,
    data.deliveryDays,
    data.instantDelivery,
    data.normalDeliveryText,
    data.thumbnailUrl,
    data.videoUrl,
    data.addonsJson,
    data.galleryImages,
    data.whopProductId || null,
    data.id
  ).run();
}

export async function createProduct(db, data) {
  return db.prepare(
    `INSERT INTO products (
      title, description, slug, normal_price, sale_price, status,
      instant, delivery_days, instant_delivery, normal_delivery_text,
      thumbnail_url, video_url, addons_json, gallery_images, whop_product_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.title,
    data.description,
    data.slug,
    data.normalPrice,
    data.salePrice,
    data.status,
    data.instant,
    data.deliveryDays,
    data.instantDelivery,
    data.normalDeliveryText,
    data.thumbnailUrl,
    data.videoUrl,
    data.addonsJson,
    data.galleryImages,
    data.whopProductId || null
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
    `INSERT INTO products (
      title, description, slug, normal_price, sale_price, status,
      instant, delivery_days, instant_delivery, normal_delivery_text,
      thumbnail_url, video_url, addons_json, gallery_images
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    `${source.title || 'Product'} Copy`,
    source.description || '',
    newSlug,
    source.normal_price || 0,
    source.sale_price || null,
    'draft',
    source.instant || 0,
    source.delivery_days || 2,
    source.instant_delivery || 0,
    source.normal_delivery_text || '',
    source.thumbnail_url || '',
    source.video_url || '',
    source.addons_json || '[]',
    source.gallery_images || '[]'
  ).run();
}
