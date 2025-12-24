/**
 * Render forum archive.
 */

import { getForumArchiveTopics } from './archive-data.js';
import { buildArchiveItems, buildArchiveLatest } from './archive-markup.js';
import { buildArchiveHtml } from './archive-template.js';

export async function renderForumArchive(env) {
  const topics = await getForumArchiveTopics(env);
  const items = buildArchiveItems(topics);
  const latest = buildArchiveLatest(topics);
  const html = buildArchiveHtml(items, latest);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
