// public/core/app/bootstrapper.js
import eventBus from '../scripts/event-bus.js';
import { createAppState } from './state.js';
import { createServices } from './services.js';

function domReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

async function safeImport(importFn, label, eventBus) {
  try {
    return await importFn();
  } catch (err) {
    console.error(`[bootstrap] Failed to load ${label}`, err);
    try {
      eventBus.emitSync('system:moduleFailed', { label, err });
    } catch (_) {}
    return null;
  }
}

function detectPage() {
  // Admin product form
  if (document.getElementById('product-form')) return 'admin-product-form';

  // Buyer order page
  if (document.getElementById('order-content') && new URLSearchParams(location.search).get('id')) {
    return 'buyer-order';
  }

  return 'generic';
}

(async function bootstrap() {
  await domReady();

  const appState = createAppState(eventBus);
  const services = await createServices({ eventBus });

  const ctx = { eventBus, appState, services };

  // Global ready signal
  appState.set('app.ready', true);
  eventBus.emitSync('app:ready', { ok: true });

  const page = detectPage();

  if (page === 'admin-product-form') {
    const mod = await safeImport(() => import('../../modules/products/scripts/main.js'), 'products/main', eventBus);
    if (mod && typeof mod.init === 'function') await mod.init(ctx);
  }

  if (page === 'buyer-order') {
    const mod = await safeImport(() => import('../../modules/orders/scripts/buyer-order.js'), 'orders/buyer-order', eventBus);
    if (mod && typeof mod.init === 'function') await mod.init(ctx);
  }
})();
