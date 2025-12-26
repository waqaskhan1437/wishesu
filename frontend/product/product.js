import { getDeliveryText } from '../core/delivery/delivery.js';
import { createAddonForm } from './product.addons.js';
import { buildMediaItems, renderMedia } from './product.media.js';

const ensureRoot = () => {
  const existing = document.getElementById('product');
  if (existing) return existing;
  const created = document.createElement('div');
  created.id = 'product';
  document.body.appendChild(created);
  return created;
};
const root = ensureRoot();
const params = new URLSearchParams(location.search);

// New pattern: /p/:id/:slug
const newPathMatch = location.pathname.match(/^\/p\/(\d+)\/([a-zA-Z0-9_-]+)$/i);
// Legacy pattern: /product-123/...
const legacyPathMatch = location.pathname.match(/^\/product-?(\d+)\/.*$/);
const pathMatch = newPathMatch || legacyPathMatch;

const token = params.get('id') || params.get('slug') || (pathMatch ? pathMatch[1] : '');

const formatMoney = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;
const resolvePrice = (product) => {
  const sale = Number(product.sale_price ?? product.salePrice ?? 0);
  const normal = Number(product.normal_price ?? product.normalPrice ?? product.price ?? 0);
  if (!Number.isNaN(sale) && sale > 0) return sale;
  if (!Number.isNaN(normal) && normal > 0) return normal;
  return 0;
};
const resolveDeliveryText = (product) => {
  const instant = product.instant ?? product.instant_delivery ?? 0;
  const daysRaw = product.delivery_days ?? product.deliveryDays;
  const days = Number(daysRaw);
  if (!Number.isNaN(days) && days >= 0) return getDeliveryText(instant ? 1 : 0, days);
  if (product.normal_delivery_text) return String(product.normal_delivery_text);
  return getDeliveryText(instant ? 1 : 0, 2);
};

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else node.setAttribute(key, value);
  });
  ([]).concat(children).forEach((child) => {
    if (child === null || child === undefined) return;
    node.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
};

const renderError = (message) => {
  root.innerHTML = '';
  root.appendChild(el('div', { class: 'product-card' }, [
    el('h2', { text: 'Unable to load product' }),
    el('p', { text: message })
  ]));
};


const renderProduct = (product) => {
  const mediaItems = buildMediaItems(product);
  const basePrice = resolvePrice(product);
  const normalRaw = Number(product.normal_price ?? product.normalPrice ?? 0);
  const fallbackNormal = Number(product.price ?? 0);
  const normalPrice = normalRaw > 0 ? normalRaw : fallbackNormal;
  const salePrice = Number(product.sale_price ?? 0);
  const deliveryText = resolveDeliveryText(product);
  const description = String(product.description || product.seo_description || '').trim();

  root.innerHTML = '';

  const topbar = el('div', { class: 'product-topbar' }, [
    el('a', { class: 'product-back', href: '/', text: '<- Back to home' }),
    el('div', { class: 'product-brand', text: 'Wishesu Studio' })
  ]);

  const totalValue = el('span', { class: 'total-amount', text: formatMoney(basePrice) });
  const checkoutBtn = el('button', { class: 'checkout-btn', text: `Checkout - ${formatMoney(basePrice)}` });
  const deliveryChip = el('span', { class: 'chip', text: deliveryText });
  const setTotal = (total) => {
    totalValue.textContent = formatMoney(total);
    checkoutBtn.textContent = `Checkout - ${formatMoney(total)}`;
  };
  const setDelivery = (delivery) => {
    if (!delivery) {
      deliveryChip.textContent = deliveryText;
      return;
    }
    deliveryChip.textContent = getDeliveryText(delivery.instant ? 1 : 0, delivery.days ?? 0);
  };
  const addonForm = createAddonForm({
    addons: product.addons || [],
    formatMoney,
    basePrice,
    onTotal: setTotal,
    onDeliveryChange: setDelivery
  });

  const info = el('div', { class: 'product-info product-card' }, [
    el('div', { class: 'product-title' }, [
      el('h1', { text: product.title || 'Personalized Video' }),
      description ? el('p', { class: 'product-desc', text: description }) : null
    ]),
    el('div', { class: 'product-price-row' }, [
      el('div', { class: 'price-box' }, [
        salePrice > 0 && normalPrice > 0 && normalPrice !== salePrice
          ? el('div', { class: 'price-stack' }, [
              el('span', { class: 'price-old', text: formatMoney(normalPrice) }),
              el('span', { class: 'product-price', text: formatMoney(salePrice) })
            ])
          : el('span', { class: 'product-price', text: formatMoney(basePrice) })
      ]),
      el('div', { class: 'delivery-box' }, [deliveryChip])
    ]),
    el('div', { class: 'product-addons' }, [
      addonForm,
      el('div', { class: 'checkout-row' }, [
        el('span', { class: 'checkout-label', text: 'Total' }),
        totalValue
      ]),
      checkoutBtn
    ])
  ]);

  const grid = el('div', { class: 'product-grid' }, [
    el('div', { class: 'product-media product-card' }, [
      el('h3', { text: 'Media' }),
      renderMedia(mediaItems)
    ]),
    info
  ]);

  const shell = el('section', { class: 'product-page' }, [topbar, grid]);
  root.appendChild(shell);
};

const load = async () => {
  if (!token) {
    renderError('Missing product id or slug.');
    return;
  }
  root.innerHTML = '<div class="product-card">Loading product...</div>';
  try {
    const res = await fetch(`/api/product/${encodeURIComponent(token)}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      renderError(data.error || 'Unable to load product.');
      return;
    }
    const product = data.product || {};
    renderProduct(product);
  } catch (err) {
    renderError(err.message || 'Network error.');
  }
};

load();




















