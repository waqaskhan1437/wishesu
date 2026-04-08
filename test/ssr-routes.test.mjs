import test from 'node:test';
import assert from 'node:assert/strict';

import { handleNoJsRoutes } from '../src/controllers/nojs.js';

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
      status: 'published'
    },
    {
      id: 2,
      slug: 'blog',
      title: 'Blog Hub',
      meta_description: 'Blog archive intro',
      content: '<section><h2>Blog Intro</h2><p>Latest stories from the team.</p></section>',
      page_type: 'blog_archive',
      is_default: 1,
      status: 'published'
    },
    {
      id: 3,
      slug: 'forum',
      title: 'Forum Hub',
      meta_description: 'Forum archive intro',
      content: '<section><h2>Forum Intro</h2><p>Ask delivery and product questions.</p></section>',
      page_type: 'forum_archive',
      is_default: 1,
      status: 'published'
    },
    {
      id: 4,
      slug: 'about-us',
      title: 'About Us',
      meta_description: 'About page',
      content: '<section><h1>About WishesU</h1><p>Trusted video platform.</p></section>',
      page_type: 'custom',
      is_default: 0,
      status: 'published'
    }
  ],
  blogs: [
    {
      id: 5,
      title: 'Launch Story',
      slug: 'launch-story',
      description: 'How we built WishesU.',
      thumbnail_url: 'https://cdn.example.com/blog.jpg',
      status: 'published',
      created_at: '2026-03-02T10:00:00Z'
    }
  ],
  forumQuestions: [
    {
      id: 11,
      title: 'How fast is delivery?',
      slug: 'how-fast-is-delivery',
      content: 'Need fast delivery details.',
      name: 'Buyer',
      reply_count: 2,
      status: 'approved',
      created_at: '2026-03-03T10:00:00Z'
    }
  ],
  orders: [
    {
      order_id: 'ord_123',
      product_id: 7,
      status: 'PAID',
      created_at: '2026-03-01T10:00:00Z',
      delivery_time_minutes: 60,
      delivered_video_url: 'https://cdn.example.com/final.mp4',
      encrypted_data: JSON.stringify({ email: 'buyer@example.com', amount: 40, name: 'Buyer Name' })
    }
  ]
};

function createEnv(overrides = {}) {
  return {
    DB: createDbMock(overrides)
  };
}

function createDbMock(overrides = {}) {
  const data = {
    products: overrides.products ?? seed.products,
    pages: overrides.pages ?? seed.pages,
    blogs: overrides.blogs ?? seed.blogs,
    forumQuestions: overrides.forumQuestions ?? seed.forumQuestions,
    orders: overrides.orders ?? seed.orders
  };

  return {
    prepare(sql) {
      return new Statement(sql, data);
    }
  };
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

function normalizeSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function resolveFirst(sql, args, data) {
  const normalized = normalizeSql(sql);

  if (normalized.includes('from products') && normalized.includes('where id = ?')) {
    return data.products.find((product) => Number(product.id) === Number(args[0])) || null;
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

  if (normalized.includes('from products')) {
    return data.products;
  }

  if (normalized.includes('from orders o')) {
    return data.orders.map((order) => ({
      ...order,
      product_title: data.products.find((product) => Number(product.id) === Number(order.product_id))?.title || ''
    }));
  }

  if (normalized.includes('from blogs')) {
    return data.blogs;
  }

  if (normalized.includes('from forum_questions')) {
    return data.forumQuestions;
  }

  return [];
}

async function callRoute(pathname, init = {}) {
  const request = new Request(`https://example.com${pathname}`, init);
  const url = new URL(request.url);
  const response = await handleNoJsRoutes(request, createEnv(), url, url.pathname, request.method);
  return response;
}

test('home route renders SSR content and default home page intro', async () => {
  const response = await callRoute('/');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Welcome to WishesU/);
  assert.match(html, /Home Hero/);
  assert.match(html, /Birthday Blast/);
});

test('products archive route renders product cards on server', async () => {
  const response = await callRoute('/products');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /All Products/);
  assert.match(html, /Birthday Blast/);
  assert.match(html, /Open Product/);
});

test('blog archive route renders default page intro server-side', async () => {
  const response = await callRoute('/blog');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Blog Hub/);
  assert.match(html, /Blog Intro/);
  assert.match(html, /Launch Story/);
});

test('forum archive route renders default page intro server-side', async () => {
  const response = await callRoute('/forum');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Forum Hub/);
  assert.match(html, /Forum Intro/);
  assert.match(html, /How fast is delivery\?/);
});

test('head requests use the same SSR route without a response body', async () => {
  const response = await callRoute('/blog', { method: 'HEAD' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/html/i);
  assert.equal(await response.text(), '');
});

test('legacy checkout alias redirects to canonical SSR product route', async () => {
  const response = await callRoute('/checkout?id=7');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.com/product-7/birthday-blast');
});

test('legacy buyer order alias redirects to SSR order route', async () => {
  const response = await callRoute('/buyer-order.html?id=ord_123');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.com/order/ord_123');
});

test('legacy admin order detail alias redirects to SSR admin detail view', async () => {
  const response = await callRoute('/order-detail.html?id=ord_123');
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://example.com/admin/orders?view=ord_123');
});

test('admin orders detail view renders selected order server-side', async () => {
  const response = await callRoute('/admin/orders?view=ord_123');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Order Detail: ord_123/);
  assert.match(html, /buyer@example.com/);
  assert.match(html, /Birthday Blast/);
});

test('custom published slug page renders server-side', async () => {
  const response = await callRoute('/about-us');
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /About WishesU/);
  assert.match(html, /Trusted video platform/);
});
