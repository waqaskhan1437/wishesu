import test from 'node:test';
import assert from 'node:assert/strict';

import worker from '../src/index.js';
import { VERSION } from '../src/config/constants.js';
import { createAdminSessionCookie } from '../src/utils/auth.js';

const seed = {
  products: [
    {
      id: 7,
      title: 'Birthday Blast',
      slug: 'birthday-blast',
      description: 'Personalized birthday prank video.',
      normal_price: 50,
      sale_price: 40,
      thumbnail_url: 'https://cdn.example.com/birthday.jpg',
      normal_delivery_text: '2',
      instant_delivery: 0,
      status: 'active',
      sort_order: 1
    }
  ],
  pages: [
    {
      id: 1,
      slug: 'home',
      title: 'Welcome to WishesU',
      meta_description: 'Home intro',
      content: '<section><h2>Home Hero</h2><p>Server rendered intro</p></section>',
      page_type: 'home',
      is_default: 1,
      status: 'published',
      updated_at: '2026-03-01T09:00:00Z'
    },
    {
      id: 2,
      slug: 'product-grid',
      title: 'All Products',
      meta_description: 'Product archive intro',
      content: '<section><h2>Products Intro</h2><p>Rendered on server.</p></section>',
      page_type: 'product_grid',
      is_default: 1,
      status: 'published',
      updated_at: '2026-03-02T09:00:00Z'
    },
    {
      id: 3,
      slug: 'about-us',
      title: 'About Us',
      meta_description: 'About page',
      content: '<section><h1>About WishesU</h1><p>Trusted video platform.</p></section>',
      page_type: 'custom',
      is_default: 0,
      status: 'published',
      updated_at: '2026-03-03T09:00:00Z'
    }
  ],
  blogs: [
    {
      id: 4,
      title: 'Launch Story',
      slug: 'launch-story',
      description: 'How we built the product.',
      content: '<p>Launch content</p>',
      thumbnail_url: 'https://cdn.example.com/blog.jpg',
      status: 'published',
      created_at: '2026-03-04T08:00:00Z',
      updated_at: '2026-03-04T08:00:00Z'
    }
  ],
  forumQuestions: [
    {
      id: 9,
      title: 'How does delivery work?',
      slug: 'how-does-delivery-work',
      content: 'Need details about delivery.',
      name: 'Buyer',
      reply_count: 1,
      status: 'approved',
      created_at: '2026-03-05T08:00:00Z'
    }
  ]
};

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

class Statement {
  constructor(sql, data, args = []) {
    this.sql = sql;
    this.data = data;
    this.args = args;
  }

  bind(...args) {
    return new Statement(this.sql, this.data, args);
  }

  async first() {
    return resolveFirst(this.sql, this.args, this.data);
  }

  async all() {
    return { results: resolveAll(this.sql, this.args, this.data) };
  }

  async run() {
    return { success: true };
  }
}

function resolveFirst(sql, args, data) {
  const normalized = normalizeSql(sql);

  if (normalized.includes('select value from settings where key = ?')) {
    if (args[0] === 'last_purge_version') {
      return { value: String(VERSION) };
    }
    return null;
  }

  if (normalized.includes('from pages') && normalized.includes('where slug = ?')) {
    return data.pages.find((page) => page.slug === String(args[0]) && page.status === 'published') || null;
  }

  if (normalized.includes('from pages') && normalized.includes('where page_type = ?')) {
    return data.pages.find((page) => page.page_type === String(args[0]) && Number(page.is_default) === 1 && page.status === 'published') || null;
  }

  return null;
}

function resolveAll(sql, args, data) {
  const normalized = normalizeSql(sql);

  if (normalized.includes('from products') && normalized.includes('order by sort_order asc, id desc')) {
    return data.products
      .filter((product) => product.status === 'active')
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order) || Number(b.id) - Number(a.id));
  }

  if (normalized.includes('from pages') && normalized.includes('order by id desc')) {
    return data.pages
      .slice()
      .sort((a, b) => Number(b.id) - Number(a.id));
  }

  if (normalized.includes('from blogs') && normalized.includes("where status = 'published'")) {
    return data.blogs
      .filter((blog) => blog.status === 'published')
      .slice()
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  if (normalized.includes('from forum_questions') && normalized.includes("where status = 'approved'")) {
    return data.forumQuestions
      .filter((question) => question.status === 'approved')
      .slice()
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  return [];
}

function createDbMock(overrides = {}) {
  const data = {
    products: overrides.products ?? seed.products,
    pages: overrides.pages ?? seed.pages,
    blogs: overrides.blogs ?? seed.blogs,
    forumQuestions: overrides.forumQuestions ?? seed.forumQuestions
  };

  return {
    prepare(sql) {
      return new Statement(sql, data);
    },
    async batch(statements) {
      return Promise.all((statements || []).map((statement) => (
        typeof statement?.run === 'function' ? statement.run() : { success: true }
      )));
    }
  };
}

function createEnv(overrides = {}) {
  const assetState = { hits: 0 };
  const db = createDbMock(overrides);

  return {
    env: {
      DB: db,
      ADMIN_SESSION_SECRET: 'worker-ssr-secret',
      ASSETS: {
        async fetch() {
          assetState.hits += 1;
          return new Response('<html><body>legacy asset fallback</body></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        }
      },
      ...overrides
    },
    assetState
  };
}

async function callWorker(pathname, options = {}) {
  const { env, assetState } = createEnv(options.envOverrides || {});
  const request = new Request(`https://example.com${pathname}`, {
    method: options.method || 'GET',
    headers: options.headers
  });
  const response = await worker.fetch(request, env, { waitUntil() {} });
  return { response, assetHits: assetState.hits, env };
}

test('worker prefers SSR products archive over static assets', async () => {
  const { response, assetHits } = await callWorker('/products');
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(assetHits, 0);
  assert.match(html, /All Products/);
  assert.match(html, /Birthday Blast/);
});

test('worker prefers SSR blog archive over static assets', async () => {
  const { response, assetHits } = await callWorker('/blog');
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(assetHits, 0);
  assert.match(html, /Blog Archive/);
  assert.match(html, /Launch Story/);
});

test('worker prefers SSR forum archive over loading shell assets', async () => {
  const { response, assetHits } = await callWorker('/forum');
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(assetHits, 0);
  assert.match(html, /How does delivery work\?/);
  assert.doesNotMatch(html, /Loading\.\.\./);
});

test('worker prefers SSR custom published pages over duplicate html assets', async () => {
  const { response, assetHits } = await callWorker('/about-us');
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(assetHits, 0);
  assert.match(html, /About WishesU/);
  assert.match(html, /Trusted video platform/);
});

test('worker prefers SSR admin pages over dashboard asset fallback', async () => {
  const { env, assetState } = createEnv();
  const adminCookie = await createAdminSessionCookie(env);
  const request = new Request('https://example.com/admin/pages', {
    headers: {
      Cookie: adminCookie
    }
  });

  const response = await worker.fetch(request, env, { waitUntil() {} });
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.equal(assetState.hits, 0);
  assert.match(html, /Admin Pages/);
  assert.match(html, /About Us/);
  assert.doesNotMatch(html, /legacy asset fallback/);
});
