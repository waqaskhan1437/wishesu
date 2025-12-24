/**
 * Forum archive markup helpers.
 */

import { escapeHtml, makeExcerpt } from '../helpers.js';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '';
}

export function buildArchiveItems(topics) {
  const items = (topics || []).map(t => {
    const d = formatDate(t.created_at);
    const replies = Number(t.reply_count || 0);
    const excerpt = makeExcerpt(t.body, 220);
    const search = escapeHtml(`${t.title || ''} ${t.body || ''}`);
    return `<a class="topic-card" href="/forum/${encodeURIComponent(t.slug)}" data-search="${search}">
      <div class="topic-head">
        <div class="title">${escapeHtml(t.title || t.slug)}</div>
        <div class="pill">${replies} replies</div>
      </div>
      <div class="meta">By ${escapeHtml(t.author_name || 'Anonymous')} - ${escapeHtml(d)}</div>
      <div class="desc">${escapeHtml(excerpt)}</div>
      <div class="read-more">Read more -&gt;</div>
    </a>`;
  }).join('');

  return items || '<div style="color:#94a3b8">No topics yet.</div>';
}

export function buildArchiveLatest(topics) {
  const items = (topics || []).slice(0, 6).map(t => {
    const d = formatDate(t.created_at);
    return `<a class="side-link" href="/forum/${encodeURIComponent(t.slug)}">
      <div class="side-title">${escapeHtml(t.title || t.slug)}</div>
      <div class="side-date">${escapeHtml(d)}</div>
    </a>`;
  }).join('');

  return items || '<div style="color:#94a3b8">No topics yet.</div>';
}
