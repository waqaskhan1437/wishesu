/**
 * Render blog post page.
 */

import { getBlogPostBySlug } from './post-data.js';
import { buildPostHtml } from './post-template.js';

export async function renderBlogPost(env, slug) {
  const post = await getBlogPostBySlug(env, slug);
  if (!post) return new Response('Not found', { status: 404 });

  const page = buildPostHtml(post);

  return new Response(page, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
