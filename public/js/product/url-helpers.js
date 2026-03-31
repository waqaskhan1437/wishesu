/**
 * Shared URL optimization helpers for product pages.
 * Used by layout-main.js and layout-extra.js
 */

;(function(){
  function splitUrlSuffix(raw) {
    const s = (raw || '').toString();
    const hashIndex = s.indexOf('#');
    const noHash = hashIndex === -1 ? s : s.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : s.slice(hashIndex);
    const queryIndex = noHash.indexOf('?');
    const base = queryIndex === -1 ? noHash : noHash.slice(0, queryIndex);
    const query = queryIndex === -1 ? '' : noHash.slice(queryIndex);
    return { base, query, hash };
  }

  function optimizeGoogleusercontentUrl(src, targetWidth, targetHeight) {
    const s = (src || '').toString().trim();
    if (!s || !s.includes('googleusercontent.com')) return src;

    const { base, query, hash } = splitUrlSuffix(s);
    const m = base.match(/^(.*)=w(\d+)-h(\d+)(-[^?#]*)?$/);
    if (!m) return src;

    const prefix = m[1];
    const originalW = parseInt(m[2], 10) || 0;
    const originalH = parseInt(m[3], 10) || 0;
    const suffix = m[4] || '';

    const w = Math.max(1, Math.round(Number(targetWidth) || originalW || 0));
    let h = Math.round(Number(targetHeight) || 0);
    if (!h || !Number.isFinite(h)) {
      h = (originalW > 0 && originalH > 0) ? Math.round((originalH * w) / originalW) : 0;
    }
    if (!h || !Number.isFinite(h)) h = originalH || 1;

    return `${prefix}=w${w}-h${h}${suffix}${query}${hash}`;
  }

  // Expose globally for other product modules
  window._productUrlHelpers = {
    splitUrlSuffix,
    optimizeGoogleusercontentUrl
  };
})();
