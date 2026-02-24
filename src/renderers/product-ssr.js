// Server-side renderer for Product pages (NO-JS HTML)

function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripScripts(html) {
  if (!html) return '';
  // Remove script tags entirely
  return String(html).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function formatPrice(p) {
  const n = Number(p);
  if (Number.isFinite(n)) return n.toFixed(2);
  return '';
}

function normalizeGallery(galleryImages) {
  if (!galleryImages) return [];
  try {
    const parsed = typeof galleryImages === 'string' ? JSON.parse(galleryImages) : galleryImages;
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
  } catch (_) {}
  // Some installs store comma-separated URLs
  if (typeof galleryImages === 'string' && galleryImages.includes(',')) {
    return galleryImages.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function pickDefaultComponent(components, listKey, defaultIdKey) {
  if (!components) return '';
  const list = Array.isArray(components[listKey]) ? components[listKey] : [];
  const defaultId = components[defaultIdKey];
  if (defaultId) {
    const found = list.find(x => String(x?.id) === String(defaultId));
    if (found?.code) return found.code;
  }
  // fallback to first
  if (list[0]?.code) return list[0].code;
  return '';
}

export function renderProductSSR({
  product,
  reviews = [],
  canonicalUrl,
  robots = 'index, follow',
  branding = {},
  components = null
}) {
  const title = (product?.seo_title || product?.title || 'Product').trim();
  const description = (product?.seo_description || product?.description || '').trim();
  const ogImage = product?.thumbnail_url || branding?.logo_url || '';

  const headerCodeRaw = pickDefaultComponent(components, 'headers', 'defaultHeaderId');
  const footerCodeRaw = pickDefaultComponent(components, 'footers', 'defaultFooterId');
  const headerCode = stripScripts(headerCodeRaw);
  const footerCode = stripScripts(footerCodeRaw);

  const favicon = branding?.favicon_url || '/favicon.ico';

  const sale = product?.sale_price;
  const normal = product?.normal_price;
  const hasSale = Number(sale) > 0 && Number(normal) > 0 && Number(sale) < Number(normal);

  const gallery = normalizeGallery(product?.gallery_images);
  const heroImg = product?.thumbnail_url || gallery[0] || '';
  const videoUrl = product?.video_url || product?.preview_video_url || '';

  let addons = [];
  try {
    addons = JSON.parse(product?.addons_json || '[]');
    if (!Array.isArray(addons)) addons = [];
  } catch (_) {
    addons = [];
  }

  const reviewCount = Number(product?.review_count || 0);
  const ratingAvg = product?.rating_average ? (Math.round(Number(product.rating_average) * 10) / 10) : 0;

  const priceHtml = hasSale
    ? `<div class="pw-price"><span class="pw-price-sale">$${escapeHtml(formatPrice(sale))}</span> <span class="pw-price-normal">$${escapeHtml(formatPrice(normal))}</span></div>`
    : `<div class="pw-price"><span class="pw-price-sale">$${escapeHtml(formatPrice(normal || sale || 0))}</span></div>`;

  const delivery = product?.instant_delivery
    ? `<div class="pw-delivery"><strong>Delivery:</strong> Instant</div>`
    : `<div class="pw-delivery"><strong>Delivery:</strong> ${escapeHtml(product?.normal_delivery_text || '1')} day(s)</div>`;

  const reviewsHtml = (reviews || []).slice(0, 5).map(r => {
    const stars = '★★★★★'.slice(0, Math.max(0, Math.min(5, Number(r.rating || 0))));
    return `
      <div class="pw-review">
        <div class="pw-review-head">
          <span class="pw-stars">${escapeHtml(stars)}</span>
          <span class="pw-review-name">${escapeHtml(r.name || 'Customer')}</span>
        </div>
        <div class="pw-review-body">${escapeHtml(r.comment || '')}</div>
      </div>`;
  }).join('\n');

  const addonsHtml = addons.length
    ? `<div class="pw-card">
        <h2>Add-ons</h2>
        <ul class="pw-addons">
          ${addons.map(a => {
            const aName = a?.name || a?.title || 'Add-on';
            const aPrice = a?.price || a?.amount || '';
            return `<li><span>${escapeHtml(aName)}</span>${aPrice !== '' ? `<span class="pw-addon-price">+$${escapeHtml(formatPrice(aPrice))}</span>` : ''}</li>`;
          }).join('')}
        </ul>
        <p class="pw-muted">Add-ons selection happens on checkout.</p>
      </div>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="${escapeHtml(robots)}">
    ${canonicalUrl ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">` : ''}

    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="product">
    ${canonicalUrl ? `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">` : ''}
    ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ''}
    <meta name="twitter:card" content="summary_large_image">
    ${ogImage ? `<meta name="twitter:image" content="${escapeHtml(ogImage)}">` : ''}

    <link rel="icon" href="${escapeHtml(favicon)}">
    <link rel="apple-touch-icon" href="${escapeHtml(favicon)}">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/whop.css">
    <style>
      /* Minimal layout tweaks for SSR product page */
      .pw-wrap{max-width:1100px;margin:0 auto;padding:24px 16px;}
      .pw-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:start;}
      @media(max-width:900px){.pw-grid{grid-template-columns:1fr;}}
      .pw-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;box-shadow:0 1px 2px rgba(0,0,0,0.04);}
      .pw-hero img{width:100%;height:auto;border-radius:12px;display:block;}
      .pw-title{font-size:28px;line-height:1.2;margin:0 0 10px;}
      .pw-muted{color:#6b7280;font-size:14px;margin:8px 0 0;}
      .pw-price{margin:10px 0 8px;font-size:22px;}
      .pw-price-sale{font-weight:800;}
      .pw-price-normal{text-decoration:line-through;color:#6b7280;margin-left:8px;font-size:16px;}
      .pw-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;}
      .pw-btn{display:inline-block;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700;}
      .pw-btn-primary{background:#4f46e5;color:#fff;}
      .pw-btn-secondary{background:#111827;color:#fff;}
      .pw-rating{display:flex;gap:10px;align-items:center;margin-top:6px;}
      .pw-addons{list-style:none;padding:0;margin:10px 0 0;}
      .pw-addons li{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eef2f7;}
      .pw-addons li:last-child{border-bottom:none;}
      .pw-addon-price{color:#111827;font-weight:700;}
      .pw-reviews{display:grid;gap:12px;margin-top:10px;}
      .pw-review{border:1px solid #eef2f7;border-radius:12px;padding:12px;}
      .pw-review-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:6px;}
      .pw-stars{letter-spacing:1px;}
      .pw-video{margin-top:12px;}
      .pw-video video{width:100%;border-radius:12px;display:block;}
    </style>
  </head>
  <body>
    ${headerCode || ''}
    <main class="pw-wrap">
      <div class="pw-grid">
        <section class="pw-card pw-hero">
          ${heroImg ? `<img src="${escapeHtml(heroImg)}" alt="${escapeHtml(product?.title || 'Product')}" loading="eager">` : ''}
          ${videoUrl ? `<div class="pw-video"><video controls preload="metadata" src="${escapeHtml(videoUrl)}"></video></div>` : ''}
        </section>

        <aside class="pw-card">
          <h1 class="pw-title">${escapeHtml(product?.title || title)}</h1>
          <div class="pw-rating">
            <span><strong>${escapeHtml(String(ratingAvg || 0))}</strong>/5</span>
            <span class="pw-muted">(${escapeHtml(String(reviewCount))} reviews)</span>
          </div>
          ${priceHtml}
          ${delivery}
          <div class="pw-actions">
            <a class="pw-btn pw-btn-primary" href="/checkout?id=${encodeURIComponent(String(product?.id))}">Buy now</a>
            <a class="pw-btn pw-btn-secondary" href="/products-grid">View all products</a>
          </div>
          ${description ? `<p style="margin-top:14px;white-space:pre-wrap;">${escapeHtml(description)}</p>` : ''}
          <p class="pw-muted">Server rendered product page (no JavaScript)</p>
        </aside>
      </div>

      ${addonsHtml}

      <section class="pw-card" style="margin-top:24px;">
        <h2>Latest Reviews</h2>
        <div class="pw-reviews">
          ${reviewsHtml || '<p class="pw-muted">No reviews yet.</p>'}
        </div>
      </section>
    </main>
    ${footerCode || ''}
  </body>
</html>`;
}
