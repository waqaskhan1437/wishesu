/**
 * Render blog archive.
 */

import { getBlogArchivePosts } from './render-archive-data.js';
import { buildArchiveItems, buildArchiveLatest } from './render-archive-markup.js';
import { buildArchiveHtml } from './render-archive-template.js';

export async function renderBlogArchive(env, origin) {
  const posts = await getBlogArchivePosts(env);
  const items = buildArchiveItems(posts);
  const latest = buildArchiveLatest(posts);
  const html = buildArchiveHtml(items, latest, origin);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
