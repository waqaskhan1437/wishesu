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
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('GlobalComponents: Failed to load data', e);
    }
    return null;
  }

  // Check if current page is excluded
  function isExcluded(excludedPages) {
    if (!excludedPages || !excludedPages.length) return false;
    
    const path = window.location.pathname;
    
    for (const excluded of excludedPages) {
      // Exact match
      if (excluded === path) return true;
      
      // Prefix match (e.g., /product/ matches /product/123)
      if (excluded.endsWith('/') && path.startsWith(excluded)) return true;
      
      // Also check without trailing slash
      if (path.startsWith(excluded + '/')) return true;
    }
    
    return false;
  }

  // Inject header
  function injectHeader(code) {
    // Check if header already exists
    if (document.querySelector('.site-header, #global-header')) {
      return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.id = 'global-header';
    wrapper.innerHTML = code;
    
    // Insert at the start of body
    if (document.body.firstChild) {
      document.body.insertBefore(wrapper, document.body.firstChild);
    } else {
      document.body.appendChild(wrapper);
    }
  }

  // Inject footer
  function injectFooter(code) {
    // Check if footer already exists
    if (document.querySelector('.site-footer, #global-footer')) {
      return;
    }
    
    const wrapper = document.createElement('div');
    wrapper.id = 'global-footer';
    wrapper.innerHTML = code;
    
    // Insert at the end of body
    document.body.appendChild(wrapper);
  }

  // Main initialization
  function init() {
    const data = loadData();
    
    if (!data) {
      console.log('GlobalComponents: No component data found');
      return;
    }

    // Check exclusions
    if (isExcluded(data.excludedPages)) {
      console.log('GlobalComponents: Page excluded');
      return;
    }

    // Inject header if enabled
    if (data.settings?.enableGlobalHeader !== false && data.defaultHeaderId) {
      const header = (data.headers || []).find(h => h.id === data.defaultHeaderId);
      if (header && header.code) {
        injectHeader(header.code);
        console.log('GlobalComponents: Header injected');
      }
    }

    // Inject footer if enabled
    if (data.settings?.enableGlobalFooter !== false && data.defaultFooterId) {
      const footer = (data.footers || []).find(f => f.id === data.defaultFooterId);
      if (footer && footer.code) {
        injectFooter(footer.code);
        console.log('GlobalComponents: Footer injected');
      }
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to ensure body is available
    setTimeout(init, 10);
  }
})();
