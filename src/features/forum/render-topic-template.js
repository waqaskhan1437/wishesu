/**
 * Forum topic template builder.
 */

import { escapeHtml } from '../helpers.js';
import { topicStyles } from './styles.js';
import { topicScript } from './scripts.js';

export function buildTopicHtml(topic, repliesHtml, latestHtml) {
  const title = escapeHtml(topic.title || topic.slug);
  const dateText = escapeHtml(topic.created_at ? new Date(topic.created_at).toLocaleDateString() : '');
  const author = escapeHtml(topic.author_name || 'Anonymous');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title><style>${topicStyles()}</style>
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet"></head>
  <body><div class="wrap"><a class="back" href="/forum">&lt;- Back to Forum</a>
    <div class="layout"><div><div class="card"><h1>${title}</h1>
    <div class="meta">By ${author} - ${dateText}</div>
    <div style="margin-top:12px">${repliesHtml.body}</div></div>
    <div class="card"><h2 style="margin:0 0 12px;font-size:20px">Replies</h2>${repliesHtml.items}</div>
    <div class="form"><h2 style="margin:0 0 12px;font-size:20px">Reply</h2>
    <label>Name</label><input id="reply-name" type="text" placeholder="Your name" />
    <label style="margin-top:10px">Email</label><input id="reply-email" type="email" placeholder="you@example.com" />
    <label style="margin-top:10px">Body</label><textarea id="reply-body" placeholder="Write your reply..."></textarea>
    <button class="btn" id="reply-submit" type="button" style="margin-top:12px">Submit for approval</button>
    <div class="msg" id="reply-msg"></div></div></div>
    <aside class="side"><h3>Latest discussions</h3><div class="side-links">${latestHtml}</div>
    <div class="card" style="margin-top:14px;"><strong>Ask better questions</strong>
    <div style="margin-top:8px;color:#94a3b8;font-size:13px">Share context - Be specific - Stay kind</div></div></aside></div></div>
    <script>${topicScript(topic.slug)}</script></body></html>`;
}
