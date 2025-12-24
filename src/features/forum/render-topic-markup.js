/**
 * Forum topic markup helpers.
 */

import { escapeHtml, toParagraphs } from './helpers.js';

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '';
}

export function buildReplyItems(replies) {
  const items = (replies || []).map(r => {
    const d = formatDate(r.created_at);
    return `<div class="reply">
      <div class="meta">${escapeHtml(r.author_name || 'Anonymous')} - ${escapeHtml(d)}</div>
      <div class="body">${toParagraphs(r.body || '')}</div>
    </div>`;
  }).join('');

  return items || '<div style="color:#94a3b8">No replies yet.</div>';
}

export function buildTopicLatest(latest) {
  const items = (latest || []).map(t => {
    const d = formatDate(t.created_at);
    return `<a class="side-link" href="/forum/${encodeURIComponent(t.slug)}">
      <div class="side-title">${escapeHtml(t.title || t.slug)}</div>
      <div class="side-date">${escapeHtml(d)}</div>
    </a>`;
  }).join('');

  return items || '<div style="color:#94a3b8">No topics yet.</div>';
}
