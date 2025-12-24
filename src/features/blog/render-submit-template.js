/**
 * Blog submit template builder.
 */

import { submitStyles } from './render-styles.js';
import { submitScript } from './render-scripts.js';

export function buildSubmitHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Submit a Blog Post</title><style>${submitStyles()}</style></head>
  <body><div class="wrap"><a class="back" href="/blog">&lt;- Back to Blog</a>
    <div class="card"><h1 style="margin:0 0 12px;font-size:24px">Submit a blog post</h1>
    <label>Name</label><input id="blog-name" type="text" placeholder="Your name" />
    <label style="margin-top:10px">Email</label><input id="blog-email" type="email" placeholder="you@example.com" />
    <label style="margin-top:10px">Title</label><input id="blog-title" type="text" placeholder="Post title" />
    <label style="margin-top:10px">Body</label><textarea id="blog-body" placeholder="Write your post..."></textarea>
    <button class="btn" id="blog-submit" type="button" style="margin-top:12px">Submit for approval</button>
    <div class="note">Every submission needs admin approval. Only one pending submission is allowed per email.</div>
    <div class="msg" id="blog-msg"></div></div></div>
    <script>${submitScript()}</script></body></html>`;
}
