/**
 * Analytics & Verification Controller
 *
 * This module manages settings related to search engine verification and
 * third‑party analytics/tracking scripts. It allows admins to store codes
 * for Google Analytics (GA4), Facebook Pixel, and site verification tags
 * required by search engines like Google and Bing. It also provides a
 * utility to inject the appropriate meta tags and scripts into HTML
 * responses. All lookups are cached for one minute to reduce database
 * overhead.
 */

import { json } from '../utils/response.js';
import { getMinimalSEOSettings, getSettings as getSeoSettingsDirect } from './seo-minimal.js';

// Cache for analytics settings
let analyticsCache = null;
let analyticsCacheTime = 0;
let analyticsTableEnsured = false;
const ANALYTICS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes (was 1 minute)

// Default values for analytics settings
const DEFAULT_ANALYTICS_SETTINGS = {
  ga_id: '',
  google_verify: '',
  bing_verify: '',
  fb_pixel_id: '',
  /**
   * Custom analytics or tracking script provided by the admin. This can contain
   * any HTML/JS snippet (e.g. full Google Analytics script, Hotjar, etc.).
   * It will be injected as-is into the <head> of every public page.
   */
  custom_script: ''
};

/**
 * Ensure the analytics_settings table exists. This table stores a single
 * row with codes for analytics/tracking integrations. If new columns are
 * added in the future, this function should be updated accordingly.
 *
 * @param {object} env Cloudflare environment with DB binding
 */
async function ensureAnalyticsTable(env) {
  if (!env.DB || analyticsTableEnsured) return;
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS analytics_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        ga_id TEXT,
        google_verify TEXT,
        bing_verify TEXT,
        fb_pixel_id TEXT,
        custom_script TEXT
      )
    `).run();
    // Add missing columns in case of schema upgrades
    const columns = [
      ['ga_id', 'TEXT'],
      ['google_verify', 'TEXT'],
      ['bing_verify', 'TEXT'],
      ['fb_pixel_id', 'TEXT'],
      ['custom_script', 'TEXT']
    ];
    for (const [col, def] of columns) {
      try {
        await env.DB.prepare(`ALTER TABLE analytics_settings ADD COLUMN ${col} ${def}`).run();
      } catch (e) {
        // Column already exists, ignore
      }
    }
    analyticsTableEnsured = true;
  } catch (e) {
    console.error('Analytics table error:', e);
  }
}

/**
 * Retrieve analytics settings from the database. Results are cached to
 * reduce repeated queries. If the table does not exist it will be
 * created automatically. Missing fields fall back to defaults.
 *
 * @param {object} env Cloudflare environment
 * @returns {Promise<object>} analytics settings
 */
export async function getAnalyticsSettings(env) {
  const now = Date.now();
  if (analyticsCache && (now - analyticsCacheTime) < ANALYTICS_CACHE_TTL) {
    return analyticsCache;
  }
  await ensureAnalyticsTable(env);
  try {
    const row = await env.DB.prepare('SELECT * FROM analytics_settings WHERE id = 1').first();
    analyticsCache = { ...DEFAULT_ANALYTICS_SETTINGS, ...(row || {}) };
    analyticsCacheTime = now;
    return analyticsCache;
  } catch (e) {
    return DEFAULT_ANALYTICS_SETTINGS;
  }
}

/**
 * API handler: Get analytics settings for admin UI. Sensitive fields
 * are returned as is because the admin needs to view and edit them.
 *
 * @param {object} env Cloudflare environment
 */
export async function getAnalyticsSettingsApi(env) {
  try {
    const settings = await getAnalyticsSettings(env);
    return json({ success: true, settings });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * Save analytics settings from admin UI. Values are trimmed to remove
 * extraneous whitespace. If a field is empty it is stored as an empty
 * string. Cache is invalidated after saving.
 *
 * @param {object} env Cloudflare environment
 * @param {object} body request payload containing analytics fields
 */
export async function saveAnalyticsSettings(env, body) {
  try {
    await ensureAnalyticsTable(env);
    const gaId = String(body.ga_id || '').trim();
    const googleVerify = String(body.google_verify || '').trim();
    const bingVerify = String(body.bing_verify || '').trim();
    const fbPixel = String(body.fb_pixel_id || '').trim();
    const customScript = String(body.custom_script || '').trim();
    await env.DB.prepare(
      `INSERT OR REPLACE INTO analytics_settings
       (id, ga_id, google_verify, bing_verify, fb_pixel_id, custom_script)
       VALUES (1, ?, ?, ?, ?, ?)`
    ).bind(gaId, googleVerify, bingVerify, fbPixel, customScript).run();
    analyticsCache = null;
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * Inject analytics scripts, verification meta tags, and default SEO
 * meta/social tags into HTML. This helper is intended to be used in
 * the worker after SEO and noindex tags have been applied. It checks
 * existing tags to avoid duplication. Only when relevant settings are
 * present will tags be added. Default Open Graph and Twitter tags are
 * inserted only if the page does not already define its own OG tags.
 *
 * @param {object} env Cloudflare environment
 * @param {string} html the HTML string to modify
 * @returns {Promise<string>} modified HTML with injected tags
 */
export async function injectAnalyticsAndMeta(env, html) {
  if (!html || typeof html !== 'string' || !html.includes('</head>')) return html;

  const snippets = [];
  try {
    const [analytics, seo] = await Promise.all([
      getAnalyticsSettings(env),
      getSeoSettingsDirect(env)
    ]);

    // --- Analytics / Tracking Scripts ---
    // Scan the <head> section only (not full HTML) for existing tags
    const headEnd = html.indexOf('</head>');
    const headSection = headEnd > -1 ? html.slice(0, headEnd) : html;

    if (analytics) {
      const { ga_id: gaId = '', google_verify: gVerify = '', bing_verify: bVerify = '', fb_pixel_id: fbPixel = '' } = analytics;
      if (gaId && !headSection.includes(gaId)) {
        snippets.push(
          `<!-- Google tag (gtag.js) - deferred for performance -->\n` +
          `<script>\n` +
          `window.addEventListener('load', function() {\n` +
          `  function initGA() {\n` +
          `    window.dataLayer = window.dataLayer || [];\n` +
          `    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };\n` +
          `    window.gtag('js', new Date());\n` +
          `    window.gtag('config', '${gaId}');\n` +
          `    var s = document.createElement('script');\n` +
          `    s.src = 'https://www.googletagmanager.com/gtag/js?id=${gaId}';\n` +
          `    s.async = true;\n` +
          `    document.head.appendChild(s);\n` +
          `  }\n` +
          `  if ('requestIdleCallback' in window) {\n` +
          `    requestIdleCallback(initGA, { timeout: 2000 });\n` +
          `  } else {\n` +
          `    setTimeout(initGA, 1);\n` +
          `  }\n` +
          `});\n` +
          `</script>`
        );
      }
      if (gVerify && !headSection.includes('google-site-verification')) {
        snippets.push(`<meta name="google-site-verification" content="${gVerify}">`);
      }
      if (bVerify && !headSection.includes('msvalidate.01')) {
        snippets.push(`<meta name="msvalidate.01" content="${bVerify}">`);
      }
      if (fbPixel && !headSection.includes(fbPixel)) {
        snippets.push(
          `<script>\n` +
          `window.addEventListener('load', function() {\n` +
          `  !function(f,b,e,v,n,t,s){\n` +
          `   if(f.fbq)return;\n` +
          `   n=f.fbq=function(){n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};\n` +
          `   if(!f._fbq)f._fbq=n;\n` +
          `   n.push=n; n.loaded=!0; n.version='2.0'; n.queue=[];\n` +
          `   t=b.createElement(e); t.async=!0; t.src=v;\n` +
          `   s=b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t,s)\n` +
          `  }(window, document, 'script','https://connect.facebook.net/en_US/fbevents.js');\n` +
          `  fbq('init','${fbPixel}');\n` +
          `  fbq('track','PageView');\n` +
          `});\n` +
          `</script>\n` +
          `<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${fbPixel}&ev=PageView&noscript=1"/></noscript>`
        );
      }
      if (analytics.custom_script) {
        const trimmedCustom = String(analytics.custom_script).trim();
        if (trimmedCustom && !headSection.includes(trimmedCustom)) {
          snippets.push(trimmedCustom);
        }
      }
    }

    // --- Default SEO & Social Meta Tags ---
    if (seo) {
      const title = String(seo.site_title || '').trim();
      const desc = String(seo.site_description || '').trim();
      const ogEnabled = !!seo.og_enabled;
      const ogImg = String(seo.og_image || '').trim();
      if (desc && !headSection.includes('name="description"')) {
        snippets.push(`<meta name="description" content="${desc.replace(/"/g, '&quot;')}">`);
      }
      if (ogEnabled && !headSection.includes('og:title')) {
        if (title) snippets.push(`<meta property="og:title" content="${title.replace(/"/g, '&quot;')}">`);
        if (desc) snippets.push(`<meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">`);
        if (ogImg) snippets.push(`<meta property="og:image" content="${ogImg}">`);
        if (title) snippets.push(`<meta property="og:site_name" content="${title.replace(/"/g, '&quot;')}">`);
      }
      if (ogEnabled && !headSection.includes('twitter:card')) {
        snippets.push(`<meta name="twitter:card" content="summary_large_image">`);
        if (title) snippets.push(`<meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}">`);
        if (desc) snippets.push(`<meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}">`);
        if (ogImg) snippets.push(`<meta name="twitter:image" content="${ogImg}">`);
      }
    }
  } catch (err) {
    // Ignore errors; tags will simply not be injected
  }
  if (snippets.length > 0) {
    const injection = snippets.join('\n');
    html = html.slice(0, html.indexOf('</head>')) + injection + '\n' + html.slice(html.indexOf('</head>'));
  }
  return html;
}
