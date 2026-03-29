import test from 'node:test';
import assert from 'node:assert/strict';

import worker, { getCanonicalRedirectPath, shouldServeCanonicalAliasDirectly } from '../src/index.js';
import { isHeadCompatibleApiPath, routeApiRequest } from '../src/router.js';
import { createAdminSessionCookie } from '../src/utils/auth.js';

function createDbEnv(options = {}) {
  const {
    settings = {},
    whopGateway = null,
    ...envOverrides
  } = options;

  return {
    DB: {
      prepare(query) {
        const state = {
          bindings: []
        };

        return {
          bind(...args) {
            state.bindings = args;
            return this;
          },
          async first() {
            if (/FROM payment_gateways/i.test(query)) {
              return whopGateway;
            }

            if (/FROM settings/i.test(query)) {
              const key = state.bindings[0];
              if (Object.prototype.hasOwnProperty.call(settings, key)) {
                const value = settings[key];
                return {
                  value: typeof value === 'string' ? value : JSON.stringify(value)
                };
              }
            }

            return null;
          },
          async all() {
            return { results: [] };
          },
          async run() {
            return { success: true };
          }
        };
      },
      async batch() {
        return [];
      }
    },
    ...envOverrides
  };
}

test('direct aliases bypass canonical redirects', () => {
  assert.equal(shouldServeCanonicalAliasDirectly('/index.html'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/home'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/products-grid'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/blog.html'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/terms'), true);

  assert.equal(getCanonicalRedirectPath('/index.html'), null);
  assert.equal(getCanonicalRedirectPath('/home'), null);
  assert.equal(getCanonicalRedirectPath('/products-grid'), null);
  assert.equal(getCanonicalRedirectPath('/blog.html'), null);
  assert.equal(getCanonicalRedirectPath('/terms.html'), null);
  assert.equal(getCanonicalRedirectPath('/order-success'), null);
});

test('non-direct aliases still canonicalize', () => {
  assert.equal(getCanonicalRedirectPath('/page-builder'), '/admin/page-builder.html');
});

test('HEAD-safe API matcher stays limited to read endpoints', () => {
  assert.equal(isHeadCompatibleApiPath('/api/health'), true);
  assert.equal(isHeadCompatibleApiPath('/api/products'), true);
  assert.equal(isHeadCompatibleApiPath('/api/blogs/published'), true);
  assert.equal(isHeadCompatibleApiPath('/api/forum/question/test-slug'), true);
  assert.equal(isHeadCompatibleApiPath('/api/order/buyer/ord_123'), true);

  assert.equal(isHeadCompatibleApiPath('/api/reviews/add'), false);
  assert.equal(isHeadCompatibleApiPath('/api/product/save'), false);
  assert.equal(isHeadCompatibleApiPath('/api/forum/submit-reply'), false);
});

test('HEAD on safe API path returns GET metadata without body', async () => {
  const request = new Request('https://example.com/api/health', { method: 'HEAD' });
  const url = new URL(request.url);
  const response = await routeApiRequest(request, {}, url, url.pathname, request.method);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/json/i);
  assert.equal(await response.text(), '');
});

test('archive credentials endpoint requires admin auth', async () => {
  const request = new Request('https://example.com/api/upload/archive-credentials', {
    method: 'POST'
  });
  const url = new URL(request.url);
  const response = await routeApiRequest(request, {}, url, url.pathname, request.method);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('archive credentials endpoint works for authenticated admin', async () => {
  const env = {
    ADMIN_SESSION_SECRET: 'phase-1-secret',
    ARCHIVE_ACCESS_KEY: 'ARCHIVE_ACCESS_1',
    ARCHIVE_SECRET_KEY: 'ARCHIVE_SECRET_1'
  };
  const adminCookie = await createAdminSessionCookie(env);
  const request = new Request('https://example.com/api/upload/archive-credentials', {
    method: 'POST',
    headers: {
      Cookie: adminCookie
    }
  });
  const url = new URL(request.url);
  const response = await routeApiRequest(request, env, url, url.pathname, request.method);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.accessKey, env.ARCHIVE_ACCESS_KEY);
  assert.equal(body.secretKey, env.ARCHIVE_SECRET_KEY);
  assert.equal(body.bucket, 'wishesu_uploads');
});

test('orders list endpoint requires admin auth', async () => {
  const request = new Request('https://example.com/api/orders');
  const url = new URL(request.url);
  const response = await routeApiRequest(request, createDbEnv(), url, url.pathname, request.method);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('manual order creation requires admin auth', async () => {
  const request = new Request('https://example.com/api/order/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      manualOrder: true,
      productId: 1,
      email: 'buyer@example.com'
    })
  });
  const url = new URL(request.url);
  const response = await routeApiRequest(request, createDbEnv(), url, url.pathname, request.method);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('whop settings endpoint requires admin auth', async () => {
  const request = new Request('https://example.com/api/settings/whop');
  const url = new URL(request.url);
  const response = await routeApiRequest(request, createDbEnv(), url, url.pathname, request.method);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('public whop checkout settings stay available', async () => {
  const request = new Request('https://example.com/api/payment/whop/checkout-settings');
  const url = new URL(request.url);
  const response = await routeApiRequest(request, createDbEnv({
    whopGateway: {
      whop_product_id: 'prod_phase3',
      whop_theme: 'dark'
    }
  }), url, url.pathname, request.method);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    product_id: 'prod_phase3',
    theme: 'dark'
  });
});

test('public site components endpoint returns sanitized payload', async () => {
  const request = new Request('https://example.com/api/settings/components');
  const url = new URL(request.url);
  const response = await routeApiRequest(request, createDbEnv({
    settings: {
      site_components: {
        headers: [{ id: 'hdr_1', code: '<header>Header</header>' }],
        footers: [{ id: 'ftr_1', code: '<footer>Footer</footer>' }],
        productLists: [{ id: 'products_1', code: '<div>Products</div>' }],
        reviewLists: [{ id: 'reviews_1', code: '<div>Reviews</div>' }],
        defaultHeaderId: 'hdr_1',
        defaultFooterId: 'ftr_1',
        excludedPages: ['/checkout'],
        settings: {
          enableGlobalHeader: true,
          enableGlobalFooter: false
        }
      }
    }
  }), url, url.pathname, request.method);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.components, {
    headers: [{ id: 'hdr_1', code: '<header>Header</header>' }],
    footers: [{ id: 'ftr_1', code: '<footer>Footer</footer>' }],
    defaultHeaderId: 'hdr_1',
    defaultFooterId: 'ftr_1',
    excludedPages: ['/checkout'],
    settings: {
      enableGlobalHeader: true,
      enableGlobalFooter: false
    }
  });
  assert.equal('productLists' in body.components, false);
  assert.equal('reviewLists' in body.components, false);
});

test('components save endpoint requires admin auth', async () => {
  const request = new Request('https://example.com/api/settings/components', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ headers: [], footers: [] })
  });
  const url = new URL(request.url);
  const response = await routeApiRequest(request, createDbEnv(), url, url.pathname, request.method);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('admin site components endpoint returns full payload for authenticated admin', async () => {
  const env = createDbEnv({
    ADMIN_SESSION_SECRET: 'phase-3-secret',
    settings: {
      site_components: {
        headers: [{ id: 'hdr_1', code: '<header>Header</header>' }],
        footers: [{ id: 'ftr_1', code: '<footer>Footer</footer>' }],
        productLists: [{ id: 'products_1', code: '<div>Products</div>' }],
        reviewLists: [{ id: 'reviews_1', code: '<div>Reviews</div>' }],
        defaultHeaderId: 'hdr_1',
        defaultFooterId: 'ftr_1',
        excludedPages: ['/checkout'],
        settings: {
          enableGlobalHeader: true,
          enableGlobalFooter: true
        }
      }
    }
  });
  const adminCookie = await createAdminSessionCookie(env);
  const request = new Request('https://example.com/api/admin/settings/components', {
    headers: {
      Cookie: adminCookie
    }
  });
  const url = new URL(request.url);
  const response = await routeApiRequest(request, env, url, url.pathname, request.method);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.components.productLists, [{ id: 'products_1', code: '<div>Products</div>' }]);
  assert.deepEqual(body.components.reviewLists, [{ id: 'reviews_1', code: '<div>Reviews</div>' }]);
});

test('branding save endpoint requires admin auth', async () => {
  const request = new Request('https://example.com/api/settings/branding', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ logo_url: 'https://cdn.example.com/logo.png' })
  });
  const url = new URL(request.url);
  const response = await routeApiRequest(request, createDbEnv(), url, url.pathname, request.method);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('cobalt settings endpoint requires admin auth', async () => {
  const request = new Request('https://example.com/api/settings/cobalt');
  const url = new URL(request.url);
  const response = await routeApiRequest(request, createDbEnv(), url, url.pathname, request.method);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});

test('terms fallback page renders without redirect', async () => {
  const request = new Request('https://example.com/terms');
  const response = await worker.fetch(request, {}, { waitUntil() {} });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-worker-version') ? true : false, true);
  const html = await response.text();
  assert.match(html, /Terms of Service/);
  assert.match(html, /Contact Support/);
});
