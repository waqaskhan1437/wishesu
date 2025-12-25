/**
 * Card Renderer Module
 * Builds an individual product card HTML.
 */

function slugify(input) {
  const s = String(input || '').trim().toLowerCase();
  if (!s) return 'product';
  return s
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

function money(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(0);
}

function deliveryText(instant, daysText) {
  if (instant) return 'Instant Delivery';
  if (daysText) return String(daysText);
  return '2 Days Delivery';
}

export function renderCard(product) {
  const id = product?.id ?? product?.product_id ?? '';
  const title = product?.title ?? 'Product';
  const slug = product?.slug ?? slugify(title);
  const thumb = product?.thumbnail_url || product?.thumbnail || '';

  const normal = Number(product?.normal_price ?? product?.price ?? 0);
  const sale = Number(product?.sale_price ?? normal);
  const hasDiscount = Number.isFinite(normal) && Number.isFinite(sale) && sale > 0 && normal > 0 && sale < normal;

  const url = id
    ? `/product-${encodeURIComponent(String(id))}/${encodeURIComponent(String(slug))}`
    : `/product/${encodeURIComponent(String(slug))}`;

  const meta = deliveryText(product?.instant_delivery, product?.normal_delivery_text);

  return `
    <a class="wm-card" href="${url}">
      ${thumb ? `<img class="wm-card-img" src="${thumb}" alt="${escapeHtml(title)}">` : `<div class="wm-card-img"></div>`}
      <div class="wm-card-body">
        <h3 class="wm-card-title">${escapeHtml(title)}</h3>
        <p class="wm-card-meta">${escapeHtml(meta)}</p>
        <div class="wm-card-price">
          $${money(hasDiscount ? sale : normal)}
          ${hasDiscount ? `<s>$${money(normal)}</s>` : ``}
        </div>
      </div>
    </a>
  `;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
