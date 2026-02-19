;(function() {
  const INTENT_KEY = 'whop_checkout_intent_v1';
  const LEGACY_KEY = 'pendingOrderData';
  const INTENT_MAX_AGE_MS = 45 * 60 * 1000;

  let loaderPromise = null;

  function extractErrorMessage(value, fallback) {
    if (!value) return fallback;
    if (typeof value === 'string') {
      const msg = value.trim();
      return msg || fallback;
    }
    if (value instanceof Error) {
      return extractErrorMessage(value.message, fallback);
    }
    if (typeof value === 'object') {
      const fields = [value.error, value.message, value.detail, value.details, value.reason];
      for (const field of fields) {
        const msg = extractErrorMessage(field, '');
        if (msg) return msg;
      }
      try {
        const serialized = JSON.stringify(value);
        if (serialized && serialized !== '{}' && serialized !== '[]') return serialized;
      } catch (e) {}
    }
    try {
      const msg = String(value).trim();
      return msg || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setStatus(message, type) {
    const el = document.getElementById('checkout-status');
    if (!el) return;
    if (!message) {
      el.style.display = 'none';
      el.textContent = '';
      return;
    }
    el.style.display = '';
    el.className = `status ${type || 'info'}`;
    el.textContent = message;
  }

  function setBackLink(url) {
    const link = document.getElementById('checkout-back-link');
    if (!link) return;
    link.href = url || '/';
  }

  function setupSummaryDetailsMode() {
    const details = document.getElementById('summary-details');
    if (!details || !window.matchMedia) return;

    const mq = window.matchMedia('(max-width: 900px)');
    const apply = () => {
      if (mq.matches) {
        details.removeAttribute('open');
      } else {
        details.setAttribute('open', '');
      }
    };

    apply();

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(apply);
    }
  }

  function clearIntentStorage() {
    try { sessionStorage.removeItem(INTENT_KEY); } catch (e) {}
    try { localStorage.removeItem(INTENT_KEY); } catch (e) {}
  }

  function readJsonStorage(storage, key) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function normalizeIntent(rawIntent) {
    if (!rawIntent || typeof rawIntent !== 'object') return null;

    const createdAt = Number(rawIntent.created_at || rawIntent.createdAt || 0) || Date.now();
    if (Date.now() - createdAt > INTENT_MAX_AGE_MS) return null;

    const productId = Number(rawIntent.productId || rawIntent.product_id || 0);
    if (!Number.isFinite(productId) || productId <= 0) return null;

    const amount = Number(rawIntent.amount || 0);
    const originalAmount = Number(rawIntent.originalAmount || rawIntent.original_amount || amount || 0);
    const delivery = Number(rawIntent.deliveryTimeMinutes || rawIntent.delivery_time_minutes || 60) || 60;

    return {
      created_at: createdAt,
      productId,
      amount: Number.isFinite(amount) ? amount : 0,
      originalAmount: Number.isFinite(originalAmount) ? originalAmount : 0,
      email: (rawIntent.email || '').trim(),
      addons: Array.isArray(rawIntent.addons) ? rawIntent.addons : [],
      coupon: rawIntent.coupon || null,
      deliveryTimeMinutes: delivery,
      sourceUrl: rawIntent.sourceUrl || rawIntent.source_url || '',
      productTitle: rawIntent.productTitle || rawIntent.product_title || ''
    };
  }

  function loadIntent() {
    const candidates = [];
    try {
      const fromSession = readJsonStorage(sessionStorage, INTENT_KEY);
      if (fromSession) candidates.push(fromSession);
    } catch (e) {}
    try {
      const fromLocal = readJsonStorage(localStorage, INTENT_KEY);
      if (fromLocal) candidates.push(fromLocal);
    } catch (e) {}

    for (const candidate of candidates) {
      const normalized = normalizeIntent(candidate);
      if (normalized) return normalized;
    }

    try {
      const legacy = readJsonStorage(localStorage, LEGACY_KEY);
      if (!legacy) return null;
      return normalizeIntent({
        created_at: legacy.timestamp || Date.now(),
        productId: legacy.productId,
        amount: legacy.amount,
        originalAmount: legacy.originalAmount,
        email: legacy.email,
        addons: legacy.addons,
        coupon: legacy.coupon,
        deliveryTimeMinutes: legacy.deliveryTimeMinutes
      });
    } catch (e) {
      return null;
    }
  }

  function formatUsd(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '$0.00';
    return '$' + n.toFixed(2);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderSummary(intent) {
    const totalEl = document.getElementById('checkout-total');
    if (totalEl) totalEl.textContent = formatUsd(intent.amount);

    const metaEl = document.getElementById('checkout-meta');
    if (!metaEl) return;

    const rows = [
      { label: 'Product', value: '#' + intent.productId }
    ];
    if (intent.email) rows.push({ label: 'Email', value: intent.email });
    if (intent.coupon && intent.coupon.code) rows.push({ label: 'Coupon', value: intent.coupon.code });
    rows.push({ label: 'Add-ons', value: String(Array.isArray(intent.addons) ? intent.addons.length : 0) });
    rows.push({ label: 'Delivery', value: Math.max(1, Math.round((intent.deliveryTimeMinutes || 60) / 60)) + ' hour(s)' });

    metaEl.innerHTML = rows.map((row) => {
      return `<div class="meta-line"><span class="meta-label">${escapeHtml(row.label)}</span><span class="meta-value">${escapeHtml(row.value)}</span></div>`;
    }).join('');

    if (intent.sourceUrl) {
      setBackLink(intent.sourceUrl);
    } else {
      setBackLink(`/product-${encodeURIComponent(intent.productId)}`);
    }
  }

  function serializeWhopMetadata(metadata) {
    const output = {};
    if (!metadata || typeof metadata !== 'object') return output;

    Object.keys(metadata).forEach((key) => {
      const rawValue = metadata[key];
      if (rawValue === null || rawValue === undefined) return;

      if (typeof rawValue === 'string') {
        output[key] = rawValue;
        return;
      }

      if (typeof rawValue === 'number' || typeof rawValue === 'boolean' || typeof rawValue === 'bigint') {
        output[key] = String(rawValue);
        return;
      }

      try {
        output[key] = JSON.stringify(rawValue);
      } catch (e) {
        output[key] = String(rawValue);
      }
    });

    return output;
  }

  function loadWhopScript() {
    if (window.Whop) return Promise.resolve();
    if (loaderPromise) return loaderPromise;

    loaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.whop.com/static/checkout/loader.js';
      script.async = true;
      script.onload = () => {
        loaderPromise = null;
        resolve();
      };
      script.onerror = () => {
        loaderPromise = null;
        reject(new Error('Failed to load Whop checkout script'));
      };
      document.head.appendChild(script);
    });

    return loaderPromise;
  }

  async function createCheckoutSession(intent) {
    const response = await fetch('/api/whop/create-plan-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: intent.productId,
        amount: intent.amount,
        email: intent.email || '',
        couponCode: intent.coupon?.code || '',
        deliveryTimeMinutes: intent.deliveryTimeMinutes || 60,
        metadata: {
          addons: intent.addons || [],
          deliveryTimeMinutes: intent.deliveryTimeMinutes || 60,
          couponCode: intent.coupon?.code || ''
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      const msg = extractErrorMessage(data.error || data.message || data, `Checkout failed (${response.status})`);
      throw new Error(msg);
    }

    if (!data.plan_id) {
      throw new Error('Checkout plan was not generated');
    }

    return data;
  }

  function showEmbedLoader(text) {
    const container = document.getElementById('checkout-embed');
    if (!container) return;
    container.innerHTML = `
      <div class="loader">
        <div class="spinner" aria-hidden="true"></div>
        <div>${text || 'Loading checkout...'}</div>
      </div>
    `;
  }

  async function mountWhopEmbed(checkoutData, intent) {
    const container = document.getElementById('checkout-embed');
    if (!container) throw new Error('Checkout container not found');

    showEmbedLoader('Loading secure payment form...');

    const embedShell = document.createElement('div');
    embedShell.style.opacity = '0';
    embedShell.style.transition = 'opacity .2s ease';

    const embed = document.createElement('div');
    embed.id = 'whop-embedded-checkout';
    embed.setAttribute('data-whop-checkout-plan-id', checkoutData.plan_id);
    embed.setAttribute('data-whop-checkout-theme', 'light');
    embed.setAttribute('data-whop-checkout-on-complete', 'whopEmbeddedCheckoutComplete');

    if (intent.email) {
      embed.setAttribute('data-whop-checkout-email', intent.email);
    }

    const metadata = serializeWhopMetadata({
      product_id: String(intent.productId),
      amount: intent.amount,
      email: intent.email || '',
      addons: intent.addons || [],
      deliveryTimeMinutes: intent.deliveryTimeMinutes || 60,
      couponCode: intent.coupon?.code || ''
    });
    embed.setAttribute('data-whop-checkout-metadata', JSON.stringify(metadata));

    embedShell.appendChild(embed);
    container.innerHTML = '';
    container.appendChild(embedShell);

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      embedShell.style.opacity = '1';
      setStatus('', 'ok');
    };

    const observer = new MutationObserver(() => {
      if (container.querySelector('iframe')) {
        reveal();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    window.whopEmbeddedCheckoutComplete = function(completeData) {
      clearIntentStorage();
      const checkoutId = completeData && completeData.id ? String(completeData.id) : (checkoutData.checkout_id || '');
      const params = new URLSearchParams({
        product: String(intent.productId),
        checkout_id: checkoutId
      });
      window.location.href = `/success.html?${params.toString()}`;
    };

    await loadWhopScript();

    if (container.querySelector('iframe')) {
      reveal();
    }

    setTimeout(() => {
      if (container.querySelector('iframe')) return;
      if (checkoutData.checkout_url) {
        setStatus('Embed is slow to load, redirecting to secure hosted checkout...', 'info');
        window.location.href = checkoutData.checkout_url;
      } else {
        setStatus('Checkout is taking longer than expected. Please refresh the page.', 'error');
      }
    }, 9000);
  }

  async function init() {
    setupSummaryDetailsMode();

    const intent = loadIntent();
    if (!intent) {
      clearIntentStorage();
      setStatus('Checkout session missing or expired. Please start again from product page.', 'error');
      setBackLink('/');
      return;
    }

    renderSummary(intent);
    setStatus('Creating your secure checkout session...', 'info');

    try {
      const checkoutData = await createCheckoutSession(intent);
      setStatus('Checkout session created. Loading payment form...', 'info');
      await mountWhopEmbed(checkoutData, intent);
    } catch (err) {
      console.error('Checkout page error:', err);
      const message = extractErrorMessage(err, 'Failed to initialize checkout');
      setStatus(message, 'error');
      showEmbedLoader('Could not load checkout. Please go back and try again.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
