/**
 * Blog archive template builder.
 */

import { archiveStyles } from './styles.js';

export function buildArchiveHtml(itemsHtml, latestHtml) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Blog</title><style>${archiveStyles()}</style>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"></head>
  <body><div class="wrap"><div class="hero"><div><h1>Blog</h1>
    <p class="sub">Fresh thoughts, stories, and updates. Explore the latest posts.</p></div>
    <a href="/blog/submit" class="submit">Submit a post</a></div>
    <div class="layout"><div class="list">${itemsHtml}</div>
    <aside class="side"><h3>Latest posts</h3><div class="side-links">${latestHtml}</div>
    <div class="cta">Want to contribute? <a href="/blog/submit">Submit your post</a></div>
    </aside></div></div></body></html>`;
}
