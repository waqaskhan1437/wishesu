/**
 * Blog post template builder.
 */

import { escapeHtml } from './helpers.js';
import { postStyles } from './render-styles.js';

export function buildPostHtml(post) {
  const title = escapeHtml(post.title || post.slug);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title><style>${postStyles()}</style>
    <style>${post.css || ''}</style></head>
  <body><div class="wrap"><a class="back" href="/blog">&lt;- Back to Blog</a>
    ${post.html || ''}
    </div></body></html>`;
}
