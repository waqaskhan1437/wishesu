/**
 * Card Renderer Module
 * Handles individual product card rendering
 */

/**
 * Get delivery text using centralized utility
 */
function getDeliveryText(instant, deliveryDays) {
  if (!window.DeliveryTimeUtils) {
    console.error('DeliveryTimeUtils not loaded');
    return '2 Days Delivery';
  }
  return window.DeliveryTimeUtils.getDeliveryText(instant, deliveryDays);
}

/**
 * Get delivery icon
 */
function getDeliveryIcon(deliveryText) {
  if (!window.DeliveryTimeUtils) return '';
  return window.DeliveryTimeUtils.getDeliveryIcon(deliveryText);
}

/**
 * Format rating text
 */
function formatRatingText(rating, count) {
  const safeRating = Number.isFinite(rating) ? rating : 5;
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
  const stars = '*'.repeat(Math.max(1, Math.round(safeRating)));
  return `${stars} ${safeRating.toFixed(1)} (${safeCount})`;
}

/**
 * Render single product card
 */
export function renderCard(product, opts = {}) {
  const { showReviews = true, showDelivery = true, showButton = true } = opts;
  const {
    id,
    title,
    slug,
    thumbnail_url,
    normal_price,
    sale_price,
    normal_delivery_text,
    instant_delivery,
    average_rating,
    review_count
  } = product;

  const safeSlug = slug ? String(slug) : (title ? String(title).toLowerCase().trim().replace(/['"`]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-') : 'product');
  const productUrl = id ? `/product-${encodeURIComponent(id)}/${encodeURIComponent(safeSlug)}` : (slug ? `/product/${encodeURIComponent(slug)}` : '/');

  // Price calculation
  const originalPrice = parseFloat(normal_price || 0);
  const salePrice = parseFloat(sale_price || originalPrice);
  const hasDiscount = salePrice < originalPrice;
  const discount = hasDiscount ? Math.round((1 - salePrice / originalPrice) * 100) : 0;

  // Delivery text
  const deliveryText = getDeliveryText(instant_delivery, normal_delivery_text);
  const deliveryIcon = getDeliveryIcon(deliveryText);

  // Rating text
  const rating = parseFloat(average_rating || 5);
  const ratingText = formatRatingText(rating, review_count);

  const priceHtml = `
    <div class="product-prices">
      ${hasDiscount ? `<span class="original-price">$${originalPrice}</span>` : ''}
      <span class="sale-price">$${salePrice}</span>
    </div>
  `;
  const reviewHtml = `
    <div class="product-reviews">
      <span class="rating-text">${ratingText}</span>
    </div>
  `;
  const deliveryHtml = `
    <div class="product-delivery">
      ${deliveryIcon ? `<span class="delivery-icon">${deliveryIcon}</span>` : ''}
      <span class="delivery-text">${deliveryText}</span>
    </div>
  `;
  return `
    <a class="product-card" data-product-id="${id}" href="${productUrl}">
      <!-- Thumbnail -->
      <div class="product-thumbnail">
        <img src="${thumbnail_url || '/placeholder.jpg'}" alt="${title}">
        ${hasDiscount ? `<div class="discount-badge">${discount}% OFF</div>` : ''}
      </div>

      <!-- Content -->
      <div class="product-content">
        <!-- Title -->
        <h3 class="product-title">${title}</h3>

        <!-- Price & Reviews Row -->
        <div class="product-meta-row">
          ${priceHtml}
          ${showReviews ? reviewHtml : ''}
        </div>

        <!-- Delivery Info -->
        ${showDelivery ? deliveryHtml : ''}

        <!-- Book Now Button (optional) -->
        ${showButton ? '<span class="book-now-btn">Book Now</span>' : ''}
      </div>
    </a>
  `;
}

/**
 * Render stars (utility for future use)
 */
export function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '';

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars += '<span class="star star-full">*</span>';
    } else if (i === fullStars && hasHalfStar) {
      stars += '<span class="star star-half">*</span>';
    } else {
      stars += '<span class="star star-empty"></span>';
    }
  }

  return `<div class="rating-stars">${stars}</div>`;
}


