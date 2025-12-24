/**
 * Whop checkout product helpers.
 */

export async function getProductById(env, productId) {
  return env.DB.prepare('SELECT * FROM products WHERE id = ?')
    .bind(Number(productId))
    .first();
}

export function getBasePrice(product) {
  const sale = product.sale_price;
  const hasSale = sale !== null && sale !== undefined && sale !== '';
  return hasSale ? Number(sale) : Number(product.normal_price);
}
