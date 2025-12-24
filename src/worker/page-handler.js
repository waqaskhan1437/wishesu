/**
 * Page handlers for blog/forum and dynamic pages.
 */

import { initDB } from '../config/db.js';
import { renderBlogArchive, renderBlogPost, renderBlogSubmit } from '../controllers/blog/index.js';
import { renderForumArchive, renderForumTopic } from '../controllers/forum/index.js';

export async function getDefaultPages(env) {
  if (!env.DB) {
    return { homePath: '/index.html', productsPath: '/products-grid.html', blogPath: '/blog' };
  }
  await initDB(env);
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('default_pages').first();
  if (row && row.value) {
    try {
      const v = JSON.parse(row.value);
      return {
        homePath: v.homePath || '/index.html',
        productsPath: v.productsPath || '/products-grid.html',
        blogPath: v.blogPath || '/blog'
      };
    } catch (_) {
      // ignore parse errors
    }
  }
  return { homePath: '/index.html', productsPath: '/products-grid.html', blogPath: '/blog' };
}

export async function getGtmId(env) {
  if (!env.DB) return '';
  await initDB(env);
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('analytics').first();
  if (row && row.value) {
    try {
      const v = JSON.parse(row.value);
      const id = String(v.gtm_id || '').trim();
      return /^GTM-[A-Z0-9]+$/i.test(id) ? id : '';
    } catch (_) {
      return '';
    }
  }
  return '';
}

export function injectGtm(html, gtmId) {
  if (!gtmId) return html;
  if (html.includes('googletagmanager.com/gtm.js')) return html;
  const headSnippet = `\n<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>\n<!-- End Google Tag Manager -->\n`;
  const bodySnippet = `\n<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->\n`;
  let out = html;
  out = out.includes('</head>') ? out.replace('</head>', headSnippet + '</head>') : headSnippet + out;
  out = out.includes('</body>') ? out.replace('</body>', bodySnippet + '</body>') : out + bodySnippet;
  return out;
}

export async function handleBlogRoutes(req, env, url, path, method) {
  if (!(method === 'GET' || method === 'HEAD')) return null;

  if (path === '/blog/submit' || path === '/blog/submit/') {
    if (!env.DB) return null;
    await initDB(env);
    const gtmId = await getGtmId(env);
    const resp = await renderBlogSubmit();
    const html = injectGtm(await resp.text(), gtmId);
    const headers = new Headers(resp.headers);
    return new Response(html, { status: resp.status, headers });
  }

  if (path === '/blog' || path === '/blog/') {
    const defaults = await getDefaultPages(env);
    if (defaults.blogPath && defaults.blogPath !== '/blog') {
      const to = new URL(req.url);
      to.pathname = defaults.blogPath;
      return env.ASSETS ? env.ASSETS.fetch(new Request(to.toString(), req)) : fetch(to.toString(), req);
    }
    if (!env.DB) return null;
    await initDB(env);
    const gtmId = await getGtmId(env);
    const resp = await renderBlogArchive(env, url.origin);
    const html = injectGtm(await resp.text(), gtmId);
    const headers = new Headers(resp.headers);
    return new Response(html, { status: resp.status, headers });
  }

  if (path.startsWith('/blog/')) {
    const slug = path.split('/').filter(Boolean)[1];
    if (!env.DB) return null;
    await initDB(env);
    const gtmId = await getGtmId(env);
    const resp = await renderBlogPost(env, slug);
    const html = injectGtm(await resp.text(), gtmId);
    const headers = new Headers(resp.headers);
    return new Response(html, { status: resp.status, headers });
  }

  return null;
}

export async function handleForumRoutes(req, env, url, path, method) {
  if (!(method === 'GET' || method === 'HEAD')) return null;

  if (path === '/forum' || path === '/forum/') {
    if (!env.DB) return null;
    await initDB(env);
    const gtmId = await getGtmId(env);
    const resp = await renderForumArchive(env, url.origin);
    const html = injectGtm(await resp.text(), gtmId);
    const headers = new Headers(resp.headers);
    return new Response(html, { status: resp.status, headers });
  }

  if (path.startsWith('/forum/')) {
    const slug = path.split('/').filter(Boolean)[1];
    if (!env.DB) return null;
    await initDB(env);
    const gtmId = await getGtmId(env);
    const resp = await renderForumTopic(env, slug);
    const html = injectGtm(await resp.text(), gtmId);
    const headers = new Headers(resp.headers);
    return new Response(html, { status: resp.status, headers });
  }

  return null;
}

export async function resolveDefaultPagePath(env, url, path, method) {
  if (!(method === 'GET' || method === 'HEAD')) return { path, url };
  const isDefault = path === '/' || path === '/index.html' || path === '/products' || path === '/products/' || path === '/products.html';
  if (!isDefault) return { path, url };

  const defaults = await getDefaultPages(env);
  let target = null;
  if (path === '/' || path === '/index.html') target = defaults.homePath;
  else target = defaults.productsPath;

  if (target && target !== path) {
    const nextUrl = new URL(url.toString());
    nextUrl.pathname = target;
    return { path: target, url: nextUrl };
  }
  return { path, url };
}

export async function handleDynamicPage(req, env, url, path, method) {
  if (!(method === 'GET' || method === 'HEAD')) return null;
  if (!path.endsWith('.html') || path.includes('/admin/') || path.startsWith('/admin')) return null;

  const slug = path.slice(1).replace(/\.html$/, '');
  try {
    if (!env.DB) return null;
    await initDB(env);
    const row = await env.DB.prepare(
      `SELECT content FROM pages
       WHERE slug = ?
       AND (status = 'published' OR status = 'active' OR status IS NULL OR status = '')`
    ).bind(slug).first();
    if (row && row.content) {
      const gtmId = await getGtmId(env);
      const html = injectGtm(row.content, gtmId);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  } catch (_) {
    // fall through to static assets
  }

  return null;
}
