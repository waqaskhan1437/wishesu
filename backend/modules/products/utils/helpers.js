/**
 * Product Helper Functions
 * Shared utilities for product operations
 */

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

export const decorate = (row) => ({
  ...row,
  slug: row.slug || slugify(row.title),
  price: row.normal_price ?? row.price ?? 0,
  instant: row.instant ?? row.instant_delivery ?? 0,
  delivery_days: row.delivery_days ?? 0,
  media: parseJsonArray(row.gallery_images || row.media_json),
  addons: parseJsonArray(row.addons_json)
});
