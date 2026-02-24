// Server-side renderer for Product pages (NO-JS HTML)
// Goal: product page should render fully from the server and load ZERO browser JS.

function escapeHtml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(p) {
  const n = Number(p);
  if (Number.isFinite(n)) return n.toFixed(2);
  return '0.00';
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

function buildStars(ratingAvg) {
  const r = Number(ratingAvg || 0);
  const full = Math.max(0, Math.min(5, Math.round(r)));
  return '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
}

function pickSiteNameFromUrl(canonicalUrl) {
  try {
    if (!canonicalUrl) return 'WishVideo';
    const host = new URL(canonicalUrl).hostname.replace(/^www\./i, '');
    return host || 'WishVideo';
  } catch (_) {
    return 'WishVideo';
  }
}

export function renderProductSSR({
  product,
  reviews = [],
  canonicalUrl,
  robots = 'index, follow',
  branding = {}
}) {
  const title = (product?.seo_title || product?.title || 'Product').trim();
  const description = (product?.seo_description || product?.description || '').trim();
  const ogImage = product?.thumbnail_url || branding?.logo_url || '';
  const favicon = branding?.favicon_url || '/favicon.ico';
  const siteName = pickSiteNameFromUrl(canonicalUrl);

  const sale = product?.sale_price;
  const normal = product?.normal_price;
  const hasSale = Number(sale) > 0 && Number(normal) > 0 && Number(sale) < Number(normal);
  const finalPrice = hasSale ? Number(sale) : Number(normal || sale || 0);
  const originalPrice = hasSale ? Number(normal) : null;
  const discountPct = (hasSale && Number(normal) > 0)
    ? Math.max(1, Math.min(99, Math.round((1 - (Number(sale) / Number(normal))) * 100)))
    : null;

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
  const starsText = buildStars(ratingAvg);

  const deliveryText = product?.instant_delivery
    ? 'Instant delivery'
    : `Delivery in ${escapeHtml(product?.normal_delivery_text || '1')} day(s)`;

  const headerHtml = `
    <header class="site-header">
      <div class="header-inner">
        <a class="logo" href="/" aria-label="Home">
          ${branding?.logo_url
            ? `<img src="${escapeHtml(branding.logo_url)}" alt="${escapeHtml(siteName)}" style="height:32px;display:block;">`
            : escapeHtml(siteName)
          }
        </a>
        <nav class="site-nav" aria-label="Primary">
          <a href="/products-grid">Products</a>
          <a href="/blog">Blog</a>
        </nav>
      </div>
    </header>
  `;

  const footerHtml = `
    <footer class="site-footer">
      <p>© ${new Date().getFullYear()} ${escapeHtml(siteName)}</p>
    </footer>
  `;

  const addonsHtml = addons.length
    ? `
      <div class="addons-container" style="margin-top:1rem;">
        <div class="addon-group">
          <div class="addon-group-label">Available add-ons</div>
          <ul class="pw-addons-list">
            ${addons.map(a => {
              const aName = a?.name || a?.title || 'Add-on';
              const aPrice = a?.price || a?.amount || '';
              return `<li><span>${escapeHtml(aName)}</span>${aPrice !== '' ? `<span class="pw-addon-price">+$${escapeHtml(formatPrice(aPrice))}</span>` : ''}</li>`;
            }).join('')}
          </ul>
          <div class="review-count" style="margin-top:.5rem;">Select add-ons during checkout.</div>
        </div>
      </div>
    `
    : '';

  const reviewsHtml = (reviews || []).slice(0, 5).map(r => {
    const rs = buildStars(r.rating || 0);
    return `
      <div class="pw-review">
        <div class="pw-review-head">
          <span class="pw-stars" aria-label="Rating">${escapeHtml(rs)}</span>
          <span class="pw-review-name">${escapeHtml(r.name || 'Customer')}</span>
        </div>
        <div class="pw-review-body">${escapeHtml(r.comment || '')}</div>
      </div>`;
  }).join('\n');

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

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
    <link rel="stylesheet" href="/css/style.css">

    <style>
      /* Small SSR-only styles (no JS) */
      .pw-review{border:1px solid var(--border);border-radius:12px;padding:12px;background:#fff;}
      .pw-review-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:6px;}
      .pw-stars{letter-spacing:1px;}
      .pw-review-name{font-weight:700;}
      .pw-review-body{color:var(--text-muted);}
      .pw-reviews{display:grid;gap:12px;margin-top:10px;}
      .pw-addons-list{list-style:none;padding:0;margin:10px 0 0;}
      .pw-addons-list li{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eef2f7;}
      .pw-addons-list li:last-child{border-bottom:none;}
      .pw-addon-price{color:var(--text-main);font-weight:700;}
      .pw-thumb-link{display:block;}
      .pw-gallery-note{color:var(--text-muted);font-size:.9rem;margin-top:.5rem;}
    </style>
  </head>
  <body>
    ${headerHtml}
    <main id="main-content">
      <nav class="breadcrumb" aria-label="Breadcrumb navigation">
        <a href="/" aria-label="Go back to home page">&larr; Back to Home</a>
      </nav>

      <div class="product-page">
        <div class="product-main-row">
          <div class="product-media-col">
            <div class="video-wrapper">
              ${videoUrl
                ? `<video controls preload="metadata" poster="${escapeHtml(heroImg)}" src="${escapeHtml(videoUrl)}"></video>`
                : (heroImg ? `<img class="main-img" src="${escapeHtml(heroImg)}" alt="${escapeHtml(product?.title || 'Product')}" loading="eager">` : '')
              }
            </div>

            ${gallery.length
              ? `<div class="thumbnails" aria-label="Product gallery">
                  ${gallery.slice(0, 10).map((img) => (`
                    <a class="pw-thumb-link" href="${escapeHtml(img)}">
                      <img class="thumb" src="${escapeHtml(img)}" alt="${escapeHtml(product?.title || 'Product')}" loading="lazy">
                    </a>
                  `)).join('')}
                </div>
                <div class="pw-gallery-note">Gallery is static on this page (no JavaScript).</div>
              `
              : ''
            }
          </div>

          <div class="product-info-col">
            <div class="product-info-panel">
              <h1 class="product-title">${escapeHtml(product?.title || title)}</h1>
              <div class="rating-row">
                <span class="stars" aria-label="Rating">${escapeHtml(starsText)}</span>
                <span class="review-count">${escapeHtml(String(reviewCount))} reviews</span>
              </div>

              <div class="badges-row">
                <div class="badge-box badge-delivery">
                  <div class="icon">⚡</div>
                  <div id="delivery-badge-text">${deliveryText}</div>
                </div>

                <div class="badge-box badge-price">
                  <div>
                    <span class="price-final">$${escapeHtml(formatPrice(finalPrice))}</span>
                    ${originalPrice ? `<span class="price-original">$${escapeHtml(formatPrice(originalPrice))}</span>` : ''}
                  </div>
                  ${discountPct ? `<span class="discount-tag">${escapeHtml(String(discountPct))}% OFF</span>` : ''}
                </div>
              </div>

              ${addonsHtml}

              <a class="btn-buy" href="/checkout?id=${encodeURIComponent(String(product?.id))}">Buy now</a>
            </div>
          </div>
        </div>

        ${description ? `
          <div class="product-desc-row">
            <div class="product-desc">
              <h2>Description</h2>
              <p style="white-space:pre-wrap;">${escapeHtml(description)}</p>
            </div>
          </div>
        ` : ''}

        <div class="product-desc-row" style="margin-top:1rem;">
          <div class="product-desc">
            <h2>Latest Reviews</h2>
            <div class="pw-reviews">
              ${reviewsHtml || '<p class="review-count">No reviews yet.</p>'}
            </div>
          </div>
        </div>
      </div>
    </main>
    ${footerHtml}
  </body>
</html>`;
}
