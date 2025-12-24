/**
 * Product Info Panel Module
 * Renders product information, badges, ratings, and checkout buttons
 */

/**
 * Compute delivery badge data
 */
function computeDeliveryBadge(instant, deliveryDays) {
  if (!window.DeliveryTimeUtils) {
    console.error('DeliveryTimeUtils not loaded');
    return { icon: '', text: '2 Days Delivery' };
  }
  const text = window.DeliveryTimeUtils.getDeliveryText(instant, deliveryDays);
  const icon = window.DeliveryTimeUtils.getDeliveryIcon(text);
  return { icon, text };
}

/**
 * Set delivery badge content
 */
function setDeliveryBadge(instant, deliveryDays, badgeRow) {
  const { icon, text } = computeDeliveryBadge(instant, deliveryDays);
  const iconEl = badgeRow.querySelector('#delivery-badge-icon');
  const textEl = badgeRow.querySelector('#delivery-badge-text');
  if (iconEl) iconEl.textContent = icon;
  if (textEl) textEl.textContent = text;
}

/**
 * Wrapper for updateDeliveryBadge that accepts text and converts to proper format
 */
function updateDeliveryBadgeFromText(displayText) {
  const text = (displayText || '').toString().toLowerCase();
  let instant = 0;
  let days = 2;

  if (text.includes('instant') || text.includes('60')) {
    instant = 1;
    days = null;
  } else if (text.includes('24') || text.includes('1 day')) {
    days = 1;
  } else if (text.includes('2 day')) {
    days = 2;
  } else if (text.includes('3 day')) {
    days = 3;
  }

  const badgeRow = document.querySelector('.badges-row');
  if (badgeRow) {
    setDeliveryBadge(instant, days, badgeRow);
  }
}

/**
 * Render rating row
 */
function renderRatingRow(product) {
  const ratingRow = document.createElement('div');
  ratingRow.className = 'rating-row';

  const reviewCount = product.review_count || 0;
  const ratingAverage = product.rating_average || 5.0;

  const fullStars = Math.floor(ratingAverage);
  const halfStar = ratingAverage % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;

  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) starsHtml += '*';
  if (halfStar) starsHtml += '*';
  for (let i = 0; i < emptyStars; i++) starsHtml += '';

  const reviewText = reviewCount === 0
    ? 'No reviews yet'
    : `${ratingAverage.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'Review' : 'Reviews'})`;

  ratingRow.innerHTML = `<span class="stars">${starsHtml}</span> <span class="review-count">${reviewText}</span>`;
  return ratingRow;
}

/**
 * Render badges row (delivery + price)
 */
function renderBadgesRow(product, addonGroups) {
  const badgeRow = document.createElement('div');
  badgeRow.className = 'badges-row';

  badgeRow.innerHTML = `
    <div class="badge-box badge-delivery" id="delivery-badge">
      <div class="icon" id="delivery-badge-icon"></div>
      <span id="delivery-badge-text"></span>
    </div>
  `;

  // PRIORITY SYSTEM: Addon > Product Basic Info
  let initialInstant = 0;
  let initialDays = 2;

  const deliveryField = (addonGroups || []).find(g => g && g.id === 'delivery-time' && (g.type === 'radio' || g.type === 'select') && Array.isArray(g.options));
  if (deliveryField) {
    const defaultOpt = deliveryField.options.find(o => o && o.default) || deliveryField.options[0];
    if (defaultOpt && defaultOpt.delivery) {
      initialInstant = defaultOpt.delivery.instant ? 1 : 0;
      initialDays = defaultOpt.delivery.text || 2;
    }
  } else {
    initialInstant = product.instant_delivery || 0;
    initialDays = product.normal_delivery_text || 2;
  }

  setDeliveryBadge(initialInstant, initialDays, badgeRow);
  window.updateDeliveryBadge = updateDeliveryBadgeFromText;

  const priceBadge = document.createElement('div');
  priceBadge.className = 'badge-box badge-price';
  const normalPrice = parseFloat(product.normal_price) || 0;
  let priceHtml = '<div class="price-final">$' + window.basePrice.toLocaleString() + '</div>';
  if (window.basePrice < normalPrice) {
    const off = Math.round(((normalPrice - window.basePrice) / normalPrice) * 100);
    priceHtml += '<div style="font-size:0.9rem"><span class="price-original">$' + normalPrice + '</span></div>';
    priceHtml += '<div class="discount-tag">' + off + '% OFF</div>';
  }
  priceBadge.innerHTML = priceHtml;
  badgeRow.appendChild(priceBadge);

  return badgeRow;
}

/**
 * Render digital delivery note
 */
function renderDigitalNote() {
  const note = document.createElement('div');
  note.className = 'digital-note';
  note.innerHTML = '<span></span> <span><strong>Digital Delivery:</strong> Receive via WhatsApp/Email.</span>';
  return note;
}

/**
 * Render addons form
 */
function renderAddonsForm(addonGroups) {
  const addonsForm = document.createElement('form');
  addonsForm.id = 'addons-form';
  addonsForm.style.marginTop = '1.5rem';

  if (addonGroups && addonGroups.length > 0) {
    addonGroups.forEach(group => {
      if (group.type === 'heading') {
        const h = document.createElement('h3');
        h.textContent = group.text || group.label;
        h.style.marginTop = '1.5rem';
        h.style.fontSize = '1.1rem';
        addonsForm.appendChild(h);
      } else {
        addonsForm.appendChild(window.renderAddonField(group));
      }
    });
  }

  return addonsForm;
}

/**
 * Render checkout footer with buttons
 */
function renderCheckoutFooter() {
  const stickyFooter = document.createElement('div');
  stickyFooter.style.marginTop = '2rem';
  stickyFooter.style.paddingTop = '1rem';
  stickyFooter.style.borderTop = '1px solid #e5e5e5';

  const useMinimal = window.whopSettings && window.whopSettings.enable_minimal_checkout;

  if (useMinimal) {
    // Minimal Checkout: Apple Pay + Card buttons
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';

    const applePayBtn = document.createElement('button');
    applePayBtn.id = 'apple-pay-btn';
    applePayBtn.className = 'btn-buy';
    applePayBtn.style.cssText = 'flex: 1; min-width: 140px; background: #000; color: #fff;';
    applePayBtn.innerHTML = ' Pay';
    applePayBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof handleCheckout === 'function') handleCheckout();
    });

    const cardBtn = document.createElement('button');
    cardBtn.id = 'checkout-btn';
    cardBtn.className = 'btn-buy';
    cardBtn.style.cssText = 'flex: 1; min-width: 140px; background: #2563eb; color: #fff;';
    cardBtn.textContent = 'Pay with Card';
    cardBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof handleCheckout === 'function') handleCheckout();
    });

    btnContainer.appendChild(applePayBtn);
    btnContainer.appendChild(cardBtn);
    stickyFooter.appendChild(btnContainer);
  } else {
    // Standard Checkout Button
    const checkoutBtn = document.createElement('button');
    checkoutBtn.id = 'checkout-btn';
    checkoutBtn.className = 'btn-buy';
    checkoutBtn.textContent = 'Checkout - $' + window.currentTotal.toLocaleString();
    checkoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (typeof handleCheckout === 'function') handleCheckout();
    });
    stickyFooter.appendChild(checkoutBtn);
  }

  return stickyFooter;
}

/**
 * Render complete product info panel
 */
export function renderProductInfoPanel(product, addonGroups) {
  const panel = document.createElement('div');
  panel.className = 'product-info-panel';

  const title = document.createElement('h1');
  title.className = 'product-title';
  title.textContent = product.title;
  panel.appendChild(title);

  panel.appendChild(renderRatingRow(product));
  panel.appendChild(renderBadgesRow(product, addonGroups));
  panel.appendChild(renderDigitalNote());
  panel.appendChild(renderAddonsForm(addonGroups));
  panel.appendChild(renderCheckoutFooter());

  return panel;
}


