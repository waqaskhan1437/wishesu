/**
 * Blog archive markup helpers.
 */

import { escapeHtml, makeExcerpt } from '../helpers.js';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '';
}

export function buildArchiveItems(posts) {
  const items = (posts || []).map(p => {
    const d = formatDate(p.created_at);
    const desc = makeExcerpt(p.html, 240);
    return `<a class="post" href="/blog/${encodeURIComponent(p.slug)}">
      <div class="title">${escapeHtml(p.title || p.slug)}</div>
      <div class="meta">${escapeHtml(d)}</div>
      <div class="desc">${escapeHtml(desc)}</div>
      <div class="read">Read post</div>
    </a>`;
  }).join('');

  return items || '<div style="color:#6b7280">No posts yet.</div>';
}

export function buildArchiveLatest(posts) {
  const items = (posts || []).slice(0, 6).map(p => {
    const d = formatDate(p.created_at);
    return `<a class="side-link" href="/blog/${encodeURIComponent(p.slug)}">
      <div class="side-title">${escapeHtml(p.title || p.slug)}</div>
      <div class="side-date">${escapeHtml(d)}</div>
    </a>`;
  }).join('');

  return items || '<div style="color:#6b7280">No posts yet.</div>';
}
