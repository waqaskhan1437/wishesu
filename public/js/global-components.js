/**
 * Global Components Injector
 * Automatically injects headers and footers on all pages
 * Also loads site branding (logo, favicon)
 * Respects exclusion settings from admin panel
 */

(function() {
  const STORAGE_KEY = 'siteComponents';
  const BRANDING_KEY = 'siteBranding';
  const BRANDING_CACHE_TTL = 600000; // 10 minutes (reduced API calls)
  
  // Don't run on admin pages
  if (window.location.pathname.startsWith('/admin')) {
    return;
  }

  // Load branding from cache or fetch
  async function loadBranding() {
    try {
      // Check cache
      const cached = localStorage.getItem(BRANDING_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        if (data.timestamp && (Date.now() - data.timestamp) < BRANDING_CACHE_TTL) {
          applyBranding(data.branding);
          return;
        }
      }
      
      // Fetch from API
      const res = await fetch('/api/settings/branding');
      const data = await res.json();
      
      if (data.success && data.branding) {
        // Cache it
        localStorage.setItem(BRANDING_KEY, JSON.stringify({
          branding: data.branding,
          timestamp: Date.now()
        }));
        applyBranding(data.branding);
      }
    } catch (e) {
      console.error('Failed to load branding:', e);
    }
  }

  // Apply branding to page
  function applyBranding(branding) {
    if (!branding) return;
    
    // Apply favicon
    if (branding.favicon_url) {
      let link = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel="shortcut icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.favicon_url;
      
      // Also add apple-touch-icon
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = branding.favicon_url;
    }
    
    // Replace logo images with custom logo
    if (branding.logo_url) {
      // Replace elements with data-site-logo attribute
      document.querySelectorAll('[data-site-logo]').forEach(el => {
        if (el.tagName === 'IMG') {
          el.src = branding.logo_url;
        } else {
          el.style.backgroundImage = `url(${branding.logo_url})`;
        }
      });
      
      // Store for dynamic use
      window.siteLogo = branding.logo_url;
    }
    
    // Store branding globally for JS access
    window.siteBranding = branding;
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
    // Always load branding
    loadBranding();
    
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
