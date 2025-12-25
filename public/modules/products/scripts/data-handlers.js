/**
 * Product Form Data Handlers
 * Functions for collecting, filling, and reading form data
 */

import { parseDeliveryDays } from './utils.js';

export function collectBase(form) {
  const days = parseDeliveryDays(form.normal_delivery_text.value);
  return {
    title: form.title.value.trim(),
    slug: form.slug.value.trim(),
    description: form.description.value.trim(),
    normal_price: parseFloat(form.normal_price.value) || 0,
    sale_price: form.sale_price.value ? parseFloat(form.sale_price.value) : null,
    instant_delivery: form.instant_delivery.checked ? 1 : 0,
    normal_delivery_text: days,
    whop_plan: form.whop_plan ? form.whop_plan.value.trim() : '',
    whop_price_map: form.whop_price_map ? form.whop_price_map.value.trim() : ''
  };
}

export function readMediaFields(form) {
  const thumbFile = form.thumbnail_file?.files?.[0] || null;
  const videoFile = form.video_file?.files?.[0] || null;
  const galleryRows = Array.from(form.querySelectorAll('#gallery-wrapper .gallery-row'));
  const galleryFiles = [];
  const galleryUrls = [];

  galleryRows.forEach(row => {
    const f = row.querySelector('input[name="gallery_files[]"]');
    const u = row.querySelector('input[name="gallery_urls[]"]');
    if (f && f.files && f.files[0]) galleryFiles.push(f.files[0]);
    if (u && u.value.trim()) galleryUrls.push(u.value.trim());
  });

  return {
    meta: {
      thumbnail_url: form.thumbnail_url.value.trim(),
      video_url: form.video_url.value.trim(),
      gallery_urls: galleryUrls
    },
    files: {
      thumbnail_file: thumbFile,
      video_file: videoFile,
      gallery_files: galleryFiles
    }
  };
}

export function fillBaseFields(form, product) {
  form.title.value = product.title || '';
  form.slug.value = product.slug || '';
  form.description.value = product.description || '';
  form.normal_price.value = product.normal_price || '';
  form.sale_price.value = product.sale_price || '';
  form.instant_delivery.checked = !!product.instant_delivery;
  form.normal_delivery_text.value = parseDeliveryDays(product.normal_delivery_text || '');
  if (product.thumbnail_url) form.thumbnail_url.value = product.thumbnail_url;
  if (product.video_url) form.video_url.value = product.video_url;
  if (form.whop_plan && product.whop_plan) form.whop_plan.value = product.whop_plan;
  if (form.whop_price_map && product.whop_price_map) form.whop_price_map.value = product.whop_price_map;
}

export function fillDemoProduct(form) {
  form.title.value = 'Happy Birthday Video from Africa';
  form.slug.value = 'happy-birthday-video-africa';
  form.description.value = 'Description...';
  form.normal_price.value = '40';
  form.sale_price.value = '25';
  form.thumbnail_url.value = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
}
