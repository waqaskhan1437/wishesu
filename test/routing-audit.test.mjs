import test from 'node:test';
import assert from 'node:assert/strict';

import worker, { getCanonicalRedirectPath, shouldServeCanonicalAliasDirectly } from '../src/index.js';
import { isHeadCompatibleApiPath, routeApiRequest } from '../src/router.js';
import { createAdminSessionCookie } from '../src/utils/auth.js';

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

test('terms fallback page renders without redirect', async () => {
  const request = new Request('https://example.com/terms');
  const response = await worker.fetch(request, {}, { waitUntil() {} });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-worker-version') ? true : false, true);
  const html = await response.text();
  assert.match(html, /Terms of Service/);
  assert.match(html, /Contact Support/);
});
