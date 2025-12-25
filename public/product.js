import { getDeliveryText } from './core/delivery.js';
import { getAddonDisplay } from './core/addons.js';

const root = document.getElementById('product');
const params = new URLSearchParams(location.search);
const token = params.get('id') || params.get('slug') || '';

const formatMoney = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK')}`;
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const renderError = (message) => {
  root.innerHTML = `<div class="product-card">${escapeHtml(message)}</div>`;
};

const renderProduct = (product) => {
  const addons = getAddonDisplay(product.addons || []);
  root.innerHTML = `
    <section class="product-shell">
      <div class="product-card">
        <div class="product-media"></div>
      </div>
      <div class="product-card product-meta">
        <h1>${escapeHtml(product.title || 'Product')}</h1>
        <strong>${formatMoney(product.price)}</strong>
        <div class="chip">${getDeliveryText(product.instant, product.delivery_days)}</div>
        <div class="addons">
          <h3>Addons</h3>
          ${addons.length ? addons.map((a) => {
            const suffix = a.deliveryText ? ` ? ${a.deliveryText}` : '';
            return `<div class="chip">${escapeHtml(a.label)}${suffix}</div>`;
          }).join('') : '<small>No addons added.</small>'}
        </div>
      </div>
    </section>
  `;
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
    renderProduct(data.product || {});
  } catch (err) {
    renderError(err.message || 'Network error.');
  }
};

load();
