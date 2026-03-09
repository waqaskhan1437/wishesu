import test from 'node:test';
import assert from 'node:assert/strict';

import { getCanonicalRedirectPath, shouldServeCanonicalAliasDirectly } from '../src/index.js';
import { isHeadCompatibleApiPath, routeApiRequest } from '../src/router.js';

test('direct aliases bypass canonical redirects', () => {
  assert.equal(shouldServeCanonicalAliasDirectly('/index.html'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/products-grid'), true);
  assert.equal(shouldServeCanonicalAliasDirectly('/blog.html'), true);

  assert.equal(getCanonicalRedirectPath('/index.html'), null);
  assert.equal(getCanonicalRedirectPath('/products-grid'), null);
  assert.equal(getCanonicalRedirectPath('/blog.html'), null);
  assert.equal(getCanonicalRedirectPath('/order-success'), null);
});

test('non-direct aliases still canonicalize', () => {
  assert.equal(getCanonicalRedirectPath('/home'), '/');
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
