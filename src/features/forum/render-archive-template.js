/**
 * Forum archive template builder.
 */

import { archiveStyles } from './styles.js';
import { archiveScript } from './scripts.js';

export function buildArchiveHtml(itemsHtml, latestHtml) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Forum</title><style>${archiveStyles()}</style>
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet"></head>
  <body><div class="wrap"><div class="hero"><div><h1>Community Forum</h1>
    <p class="sub">Ask questions, share ideas, and help each other grow.</p>
    <div class="chip"><span>*</span> Moderated community</div></div>
    <div class="hero-actions"><div class="chip"><span>OK</span> Respectful discussions</div></div></div>
    <div class="layout"><div><div class="search"><input id="forum-search" type="text" placeholder="Search discussions..." /></div>
    <div class="list" id="forum-list">${itemsHtml}</div><div class="card">
    <h2 style="margin:0 0 12px;font-size:20px">Start a discussion</h2>
    <label>Name</label><input id="forum-name" type="text" placeholder="Your name" />
    <label style="margin-top:10px">Email</label><input id="forum-email" type="email" placeholder="you@example.com" />
    <label style="margin-top:10px">Title</label><input id="forum-title" type="text" placeholder="Topic title" />
    <label style="margin-top:10px">Body</label><textarea id="forum-body" placeholder="Write your discussion..."></textarea>
    <button class="btn" id="forum-submit" type="button" style="margin-top:12px">Submit for approval</button>
    <div class="note">Every post needs admin approval. Only one pending submission is allowed per email.</div>
    <div class="msg" id="forum-msg"></div></div></div>
    <aside class="side"><h3>Trending now</h3><div class="side-links">${latestHtml}</div>
    <div class="card"><strong>Community links</strong>
    <div style="margin-top:8px;color:#94a3b8;font-size:13px">Be kind - Stay on topic - Help others</div></div></aside></div></div>
    <script>${archiveScript()}</script></body></html>`;
}
