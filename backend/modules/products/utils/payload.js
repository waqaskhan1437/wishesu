/**
 * Product Payload Builder
 * Transforms request body to database payload
 */

import { slugify, parseJsonArray } from './helpers.js';

export const toPayload = (body) => {
  const media = parseJsonArray(
    body.media || body.gallery_images || body.galleryImages
  );
  const normalPrice = Number(
    body.price ?? body.normal_price ?? body.normalPrice ?? 0
  );
  const rawSale = body.sale_price ?? body.salePrice ?? null;
  const salePrice =
    rawSale === null || rawSale === undefined || rawSale === ''
      ? null
      : Number(rawSale || 0);
  const instant =
    body.instant === 1 || body.instant === true || body.instant === '1'
      ? 1
      : 0;
  const instantDelivery =
    body.instant_delivery === 1 ||
    body.instant_delivery === true ||
    body.instant_delivery === '1'
      ? 1
      : instant;

  return {
    id: body.id ? Number(body.id) : null,
    title: String(body.title || '').trim(),
    description: String(body.description || '').trim(),
    slug: slugify(body.slug || body.title),
    normalPrice,
    salePrice,
    status: String(body.status || 'active'),
    instant,
    deliveryDays: Math.max(
      0,
      Math.floor(Number(body.delivery_days || body.deliveryDays || 2))
    ),
    instantDelivery,
    normalDeliveryText: String(
      body.normal_delivery_text || body.normalDeliveryText || ''
    ),
    thumbnailUrl: String(
      body.thumbnail_url || body.thumbnailUrl || media[0] || ''
    ),
    videoUrl: String(body.video_url || ''),
    addonsJson: JSON.stringify(parseJsonArray(body.addons || body.addons_json)),
    galleryImages: JSON.stringify(media)
  };
};
