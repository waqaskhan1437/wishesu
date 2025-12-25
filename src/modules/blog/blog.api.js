/**
 * Blog API routes.
 */

import {
  listBlogPosts,
  getBlogPost,
  saveBlogPost,
  deleteBlogPost,
  setBlogStatus,
  submitBlogPost
} from './controllers/index.js';

async function readRequestBody(req) {
  let body = {};
  try { body = await req.json(); } catch (_) {}
  if (!body || Object.keys(body).length === 0) {
    try {
      const fd = await req.formData();
      body = Object.fromEntries(fd.entries());
    } catch (_) {}
  }
  return body;
}

export async function routeBlog(req, env, url, path, method) {
  if (method === 'GET' && path === '/api/blog/list') {
    return listBlogPosts(env);
  }
  if (method === 'GET' && path === '/api/blog/get') {
    const slug = url.searchParams.get('slug');
    return getBlogPost(env, slug);
  }
  if (method === 'POST' && path === '/api/blog/save') {
    const body = await req.json().catch(() => ({}));
    return saveBlogPost(env, body);
  }
  if (method === 'POST' && path === '/api/blog/status') {
    const body = await req.json().catch(() => ({}));
    return setBlogStatus(env, body);
  }
  if (method === 'DELETE' && path === '/api/blog/delete') {
    const slug = url.searchParams.get('slug');
    return deleteBlogPost(env, slug);
  }
  if (method === 'POST' && path === '/api/blog/submit') {
    const body = await readRequestBody(req);
    return submitBlogPost(env, body);
  }
  return null;
}
