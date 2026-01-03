/**
 * Global Components Injector
 * Automatically injects headers and footers on all pages
 * Respects exclusion settings from admin panel
 */

(function() {
  const STORAGE_KEY = 'siteComponents';
  
  // Don't run on admin pages
  if (window.location.pathname.startsWith('/admin')) {
    return;
  }

  // Load component data
  function loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  }

  // Check if current page is excluded
  function isExcluded(excludedPages) {
    if (!excludedPages || !excludedPages.length) return false;
    const path = window.location.pathname;
    for (const excluded of excludedPages) {
      if (excluded === path) return true;
      if (excluded.endsWith('/') && path.startsWith(excluded)) return true;
      if (path.startsWith(excluded + '/')) return true;
    }
    return false;
  }

  // Inject header
  function injectHeader(code) {
    if (document.querySelector('.site-header, #global-header')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'global-header';
    wrapper.innerHTML = code;
    if (document.body.firstChild) {
      document.body.insertBefore(wrapper, document.body.firstChild);
    } else {
      document.body.appendChild(wrapper);
    }
  }

  // Inject footer
  function injectFooter(code) {
    if (document.querySelector('.site-footer, #global-footer')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'global-footer';
    wrapper.innerHTML = code;
    document.body.appendChild(wrapper);
  }

  // Main initialization
  function init() {
    const data = loadData();
    if (!data) return;
    if (isExcluded(data.excludedPages)) return;

    // Inject header if enabled
    if (data.settings?.enableGlobalHeader !== false && data.defaultHeaderId) {
      const header = (data.headers || []).find(h => h.id === data.defaultHeaderId);
      if (header && header.code) injectHeader(header.code);
    }

    // Inject footer if enabled
    if (data.settings?.enableGlobalFooter !== false && data.defaultFooterId) {
      const footer = (data.footers || []).find(f => f.id === data.defaultFooterId);
      if (footer && footer.code) injectFooter(footer.code);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 10);
  }
})();
