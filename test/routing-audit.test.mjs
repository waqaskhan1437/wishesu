import test from 'node:test';
import assert from 'node:assert/strict';

import worker, { getCanonicalRedirectPath, shouldServeCanonicalAliasDirectly } from '../src/index.js';
import { handleProductRouting } from '../src/controllers/products.js';
import { handleNoJsRoutes } from '../src/controllers/nojs.js';
import { isHeadCompatibleApiPath, routeApiRequest } from '../src/router.js';
import { createAdminSessionCookie } from '../src/utils/auth.js';
import { rewriteLegacyInternalLinksInHtml } from '../src/utils/canonical.js';

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

async function requestRoute(method, routeUrl, env = createDbEnv(), init = {}) {
  const request = new Request(routeUrl, {
    method,
    ...init
  });
  const url = new URL(request.url);
  const response = await routeApiRequest(request, env, url, url.pathname, request.method);
  return response;
}

async function assertUnauthorizedRoute(method, routeUrl, init = {}) {
  const response = await requestRoute(method, routeUrl, createDbEnv(), init);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
}

test('legacy aliases stay recognized and now redirect to canonical URLs', () => {
  assert.equal(shouldServeCanonicalAliasDirectly('/index.html'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/home'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/products-grid'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/blog.html'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/terms'), true);

  assert.equal(getCanonicalRedirectPath('/index.html'), '/');
  assert.equal(getCanonicalRedirectPath('/home'), '/');
  assert.equal(getCanonicalRedirectPath('/products-grid'), '/products');
  assert.equal(getCanonicalRedirectPath('/blog.html'), '/blog');
  assert.equal(getCanonicalRedirectPath('/terms.html'), '/terms');
  assert.equal(getCanonicalRedirectPath('/order-success'), '/success');
  assert.equal(getCanonicalRedirectPath('/products/'), '/products');
  assert.equal(getCanonicalRedirectPath('/blog/'), '/blog');
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

test('OPTIONS preflight allows Authorization and X-API-Key headers', async () => {
  const request = new Request('https://example.com/api/orders', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://app.example.com',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Authorization, X-API-Key, Content-Type'
    }
  });
  const response = await worker.fetch(request, {}, { waitUntil() {} });
  const allowedHeaders = response.headers.get('access-control-allow-headers') || '';

  assert.equal(response.status, 200);
  assert.match(allowedHeaders, /Authorization/i);
  assert.match(allowedHeaders, /X-API-Key/i);
  assert.match(allowedHeaders, /Content-Type/i);
  assert.equal(response.headers.get('access-control-max-age'), '86400');
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

test('customer upload route stays public without exposing archive credentials', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('', { status: 200 });

  try {
    const env = createDbEnv({
      ARCHIVE_ACCESS_KEY: 'ARCHIVE_ACCESS_PUBLIC',
      ARCHIVE_SECRET_KEY: 'ARCHIVE_SECRET_PUBLIC'
    });
    const response = await requestRoute(
      'POST',
      'https://example.com/api/upload/customer-file?sessionId=upload_123&itemId=item_123&filename=clip.mp4&originalFilename=clip.mp4',
      env,
      {
        headers: {
          'content-type': 'video/mp4',
          'content-length': '3'
        },
        body: new Uint8Array([1, 2, 3])
      }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.url, 'https://archive.org/download/item_123/clip.mp4');
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test('product management routes require admin auth', async () => {
  await assertUnauthorizedRoute('GET', 'https://example.com/api/products/list');
  await assertUnauthorizedRoute('POST', 'https://example.com/api/products/status', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 1, status: 'draft' })
  });
  await assertUnauthorizedRoute('POST', 'https://example.com/api/product/save', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Locked Product' })
  });
  await assertUnauthorizedRoute('DELETE', 'https://example.com/api/product/delete?id=1');
});

test('payment and coupon admin routes require auth', async () => {
  await assertUnauthorizedRoute('GET', 'https://example.com/api/settings/payments');
  await assertUnauthorizedRoute('POST', 'https://example.com/api/settings/payment-methods', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enable_paypal: true })
  });
  await assertUnauthorizedRoute('GET', 'https://example.com/api/coupons');
  await assertUnauthorizedRoute('POST', 'https://example.com/api/coupons/create', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: 'LOCKED10', discount_value: 10 })
  });
});

test('page and blog admin routes require auth', async () => {
  await assertUnauthorizedRoute('GET', 'https://example.com/api/pages/list');
  await assertUnauthorizedRoute('GET', 'https://example.com/api/page/hidden-draft');
  await assertUnauthorizedRoute('POST', 'https://example.com/api/pages/status', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 1, status: 'published' })
  });
  await assertUnauthorizedRoute('GET', 'https://example.com/api/blogs/list');
  await assertUnauthorizedRoute('GET', 'https://example.com/api/blog/hidden-draft');
  await assertUnauthorizedRoute('POST', 'https://example.com/api/blogs/status', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 1, status: 'published' })
  });
});

test('review and admin comment routes require auth', async () => {
  await assertUnauthorizedRoute('POST', 'https://example.com/api/reviews/update', {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 1, status: 'approved' })
  });
  await assertUnauthorizedRoute('DELETE', 'https://example.com/api/reviews/delete?id=1');
  await assertUnauthorizedRoute('GET', 'https://example.com/api/admin/blog-comments');
  await assertUnauthorizedRoute('GET', 'https://example.com/api/admin/users');
});

test('debug and operational test routes require admin auth', async () => {
  await assertUnauthorizedRoute('GET', 'https://example.com/api/debug');
  await assertUnauthorizedRoute('GET', 'https://example.com/api/whop/test-webhook');
  await assertUnauthorizedRoute('POST', 'https://example.com/api/purge-cache');
  await assertUnauthorizedRoute('GET', 'https://example.com/api/whop/test-api');
  await assertUnauthorizedRoute('GET', 'https://example.com/api/paypal/test');
  await assertUnauthorizedRoute('GET', 'https://example.com/api/payment/universal/test');
});

test('r2 file endpoint only allows public temp objects anonymously', async () => {
  const tempEnv = createDbEnv({
    R2_BUCKET: {
      async get(key) {
        assert.equal(key, 'temp/session/example.png');
        return {
          body: new TextEncoder().encode('temp-file'),
          httpMetadata: { contentType: 'text/plain' }
        };
      }
    }
  });

  const tempResponse = await requestRoute(
    'GET',
    'https://example.com/api/r2/file?key=temp%2Fsession%2Fexample.png',
    tempEnv
  );

  assert.equal(tempResponse.status, 200);
  assert.equal(await tempResponse.text(), 'temp-file');

  await assertUnauthorizedRoute('GET', 'https://example.com/api/r2/file?key=orders%2Fsecret.mp4');
});

test('api and html responses include baseline security headers', async () => {
  const apiResponse = await worker.fetch(new Request('https://example.com/api/time'), {}, { waitUntil() {} });
  const htmlResponse = await worker.fetch(new Request('https://example.com/terms'), {}, { waitUntil() {} });

  for (const response of [apiResponse, htmlResponse]) {
    assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
    assert.match(response.headers.get('strict-transport-security') || '', /max-age=31536000/);
  }
});

test('worker redirects duplicate public aliases before rendering', async () => {
  const response = await worker.fetch(new Request('https://example.com/home'), {}, { waitUntil() {} });

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://example.com/');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('no-js storefront also redirects duplicate aliases', async () => {
  const request = new Request('https://example.com/products-grid.html');
  const url = new URL(request.url);
  const response = await handleNoJsRoutes(request, {}, url, url.pathname, request.method);

  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://example.com/products');
});

test('legacy internal links in HTML are rewritten to canonical paths', () => {
  const html = '<a href="/home">Home</a><form action="/products-grid"></form><a href="https://prankwish.com/blog.html">Blog</a>';
  const normalized = rewriteLegacyInternalLinksInHtml(html, 'https://prankwish.com');

  assert.match(normalized, /href="\/"/);
  assert.match(normalized, /action="\/products"/);
  assert.match(normalized, /href="https:\/\/prankwish\.com\/blog"/);
  assert.doesNotMatch(normalized, /\/home|\/products-grid|blog\.html/);
});

test('legacy product routes redirect to canonical product URLs', async () => {
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(value) {
            return {
              async first() {
                const normalized = String(sql || '').replace(/\s+/g, ' ').trim().toLowerCase();
                if (normalized.includes('where id = ?')) {
                  return Number(value) === 62 ? { id: 62, slug: 'pure-magic', title: 'Pure Magic' } : null;
                }
                if (normalized.includes('where slug = ?')) {
                  return String(value) === 'pure-magic' ? { id: 62, slug: 'pure-magic', title: 'Pure Magic' } : null;
                }
                return null;
              }
            };
          }
        };
      }
    }
  };

  const idUrl = new URL('https://example.com/product?id=62');
  const slugUrl = new URL('https://example.com/product/pure-magic');
  const bareCanonicalUrl = new URL('https://example.com/product-62');

  const fromId = await handleProductRouting(env, idUrl, idUrl.pathname);
  const fromSlug = await handleProductRouting(env, slugUrl, slugUrl.pathname);
  const fromBareCanonical = await handleProductRouting(env, bareCanonicalUrl, bareCanonicalUrl.pathname);

  assert.equal(fromId.status, 301);
  assert.equal(fromSlug.status, 301);
  assert.equal(fromBareCanonical.status, 301);
  assert.equal(fromId.headers.get('location'), 'https://example.com/product-62/pure-magic');
  assert.equal(fromSlug.headers.get('location'), 'https://example.com/product-62/pure-magic');
  assert.equal(fromBareCanonical.headers.get('location'), 'https://example.com/product-62/pure-magic');
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
