import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addReview,
  getReviews,
  getReviewMigrationStatus,
  migrateReviewMediaFromOrders
} from '../src/controllers/reviews.js';

function createEnv(overrides = {}) {
  return {
    DB: {
      prepare(sql) {
        return {
          async first() {
            if (/from reviews/i.test(sql)) {
              return {
                total_reviews: overrides.total_reviews ?? 12,
                reviews_with_videos: overrides.reviews_with_videos ?? 7,
                reviews_without_videos: overrides.reviews_without_videos ?? 5,
                reviews_with_orders: overrides.reviews_with_orders ?? 9,
                eligible_for_migration: overrides.eligible_for_migration ?? 4
              };
            }
            return null;
          },
          async run() {
            return { meta: { changes: overrides.rowsUpdated ?? 4 } };
          }
        };
      }
    }
  };
}

function createGetReviewsEnv() {
  const state = { queries: [] };
  return {
    state,
    env: {
      DB: {
        prepare(sql) {
          const entry = { sql, bindings: [] };
          state.queries.push(entry);
          return {
            bind(...args) {
              entry.bindings = args;
              return this;
            },
            async all() {
              return { results: [] };
            }
          };
        }
      }
    }
  };
}

function createAddReviewEnv() {
  const state = {
    inserts: [],
    productLookups: []
  };

  return {
    state,
    env: {
      DB: {
        prepare(sql) {
          const entry = { sql, bindings: [] };
          return {
            bind(...args) {
              entry.bindings = args;
              return this;
            },
            async first() {
              if (/select title from products/i.test(sql)) {
                state.productLookups.push(entry.bindings[0]);
                return { title: 'Test Product' };
              }
              return null;
            },
            async run() {
              state.inserts.push({ sql, bindings: entry.bindings });
              return { success: true };
            }
          };
        }
      }
    }
  };
}

test('getReviews returns all statuses for admin bypass only', async () => {
  const publicHarness = createGetReviewsEnv();
  const publicResponse = await getReviews(publicHarness.env, new URL('https://example.com/api/reviews'));

  assert.equal(publicResponse.status, 200);
  assert.match(publicHarness.state.queries[0].sql, /r\.status = \?/i);
  assert.deepEqual(publicHarness.state.queries[0].bindings, ['approved']);

  const adminHarness = createGetReviewsEnv();
  const adminResponse = await getReviews(adminHarness.env, new URL('https://example.com/api/reviews?admin=1'));

  assert.equal(adminResponse.status, 200);
  assert.doesNotMatch(adminHarness.state.queries[0].sql, /r\.status = \?/i);
  assert.deepEqual(adminHarness.state.queries[0].bindings, []);
});

test('addReview normalizes public payload fields and keeps status approved', async () => {
  const harness = createAddReviewEnv();
  const response = await addReview(harness.env, {
    productId: '7',
    author: ' Alice ',
    rating: '4',
    comment: ' Nice work ',
    orderId: 'ord_7',
    showOnProduct: 0,
    deliveredVideoUrl: ' https://video.example/public ',
    deliveredThumbnailUrl: ''
  }, { notify: false });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.deepEqual(harness.state.productLookups, [7]);
  assert.deepEqual(harness.state.inserts[0].bindings, [
    7,
    'Alice',
    4,
    'Nice work',
    'approved',
    'ord_7',
    0,
    'https://video.example/public',
    null
  ]);
});

test('addReview supports admin status override with snake_case payload', async () => {
  const harness = createAddReviewEnv();
  const response = await addReview(harness.env, {
    product_id: '9',
    author_name: 'Admin User',
    rating: '5',
    comment: 'Looks great',
    status: 'pending',
    show_on_product: '1',
    delivered_video_url: ' https://video.example/admin ',
    delivered_thumbnail_url: ' https://thumb.example/admin '
  }, { allowStatusOverride: true, notify: false });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true });
  assert.deepEqual(harness.state.productLookups, [9]);
  assert.deepEqual(harness.state.inserts[0].bindings, [
    9,
    'Admin User',
    5,
    'Looks great',
    'pending',
    null,
    1,
    'https://video.example/admin',
    'https://thumb.example/admin'
  ]);
});

test('getReviewMigrationStatus returns normalized admin counts', async () => {
  const response = await getReviewMigrationStatus(createEnv({
    total_reviews: 20,
    reviews_with_videos: 11,
    reviews_without_videos: 9,
    reviews_with_orders: 15,
    eligible_for_migration: 6
  }));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload, {
    success: true,
    stats: {
      totalReviews: 20,
      reviewsWithVideos: 11,
      reviewsWithoutVideos: 9,
      reviewsWithOrders: 15,
      eligibleForMigration: 6
    }
  });
});

test('migrateReviewMediaFromOrders returns updated row count', async () => {
  const response = await migrateReviewMediaFromOrders(createEnv({ rowsUpdated: 3 }));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload, {
    success: true,
    rowsUpdated: 3
  });
});
