/**
 * Custom CSS & Code Loader - OPTIMIZED with localStorage caching
 * Reduces API calls by caching data for 5 minutes
 */

(function() {
  'use strict';

  const CACHE_KEY_CSS = 'wishesu_custom_css';
  const CACHE_KEY_SNIPPETS = 'wishesu_code_snippets';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Detect current page type
  function detectPageType() {
    const path = window.location.pathname;
    
    if (path.startsWith('/product-') || path.includes('/product/')) {
      return 'product';
    }
    if (path.startsWith('/blog/') || path.startsWith('/blog')) {
      return 'blog';
    }
    if (path.startsWith('/forum/') || path.startsWith('/forum')) {
      return 'forum';
    }
    if (path === '/' || path === '/index.html') {
      return 'home';
    }
    if (path.includes('/order') || path.includes('/checkout') || path.includes('/success')) {
      return 'checkout';
    }
    return 'page';
  }

  // Get cached data
  function getCached(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  // Set cache
  function setCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({
        data: data,
        timestamp: Date.now()
      }));
    } catch (e) {
      // localStorage full or disabled
    }
  }

  // Load and inject custom CSS
  async function loadCustomCSS() {
    const pageType = detectPageType();
    
    // Try cache first
    let settings = getCached(CACHE_KEY_CSS);
    
    if (!settings) {
      try {
        const res = await fetch('/api/settings/custom-css');
        const data = await res.json();
        
        if (data.success && data.settings) {
          settings = data.settings;
          setCache(CACHE_KEY_CSS, settings);
        }
      } catch (err) {
        return; // Silently fail
      }
    }
    
    if (!settings) return;
    
    let cssToInject = '';
    
    // Always include global CSS
    if (settings.global) {
      cssToInject += settings.global + '\n';
    }
    
    // Add page-specific CSS
    if (pageType === 'product' && settings.product) {
      cssToInject += settings.product + '\n';
    }
    if (pageType === 'blog' && settings.blog) {
      cssToInject += settings.blog + '\n';
    }
    if (pageType === 'forum' && settings.forum) {
      cssToInject += settings.forum + '\n';
    }
    
    if (cssToInject.trim()) {
      injectCSS(cssToInject);
    }
  }

  // Inject CSS into page
  function injectCSS(css) {
    const existing = document.getElementById('custom-css-injected');
    if (existing) existing.remove();
    
    const style = document.createElement('style');
    style.id = 'custom-css-injected';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // Load and inject code snippets
  async function loadCodeSnippets() {
    const pageType = detectPageType();
    
    // Try cache first
    let snippets = getCached(CACHE_KEY_SNIPPETS);
    
    if (!snippets) {
      try {
        const res = await fetch('/api/settings/code-snippets');
        const data = await res.json();
        
        if (data.success && data.snippets) {
          snippets = data.snippets;
          setCache(CACHE_KEY_SNIPPETS, snippets);
        }
      } catch (err) {
        return; // Silently fail
      }
    }
    
    if (!snippets || snippets.length === 0) return;
    
    // Filter and inject snippets
    snippets.forEach(snippet => {
      if (!snippet.enabled) return;
      
      const shouldLoad = snippet.pages.includes('all') || 
                        snippet.pages.includes(pageType);
      
      if (shouldLoad) {
        injectSnippet(snippet);
      }
    });
  }

  // Inject a single snippet
  function injectSnippet(snippet) {
    const id = 'snippet-' + snippet.id;
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    
    if (snippet.type === 'css') {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = snippet.code;
      document.head.appendChild(style);
      return;
    }
    
    if (snippet.type === 'js') {
      if (snippet.code.includes('<script')) {
        injectHTML(snippet, id);
      } else {
        const script = document.createElement('script');
        script.id = id;
        script.textContent = snippet.code;
        injectByPosition(script, snippet.position);
      }
      return;
    }
    
    if (snippet.type === 'html') {
      injectHTML(snippet, id);
    }
  }

  // Inject HTML content
  function injectHTML(snippet, id) {
    const container = document.createElement('div');
    container.id = id;
    container.innerHTML = snippet.code;
    
    // Execute scripts
    container.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
    
    injectByPosition(container, snippet.position);
  }

  // Inject by position
  function injectByPosition(element, position) {
    switch (position) {
      case 'head':
        document.head.appendChild(element);
        break;
      case 'body-start':
        document.body.insertBefore(element, document.body.firstChild);
        break;
      default:
        document.body.appendChild(element);
    }
  }

  // Initialize - run in background, don't block page
  function init() {
    // Use requestIdleCallback for non-critical loading
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        loadCustomCSS();
        loadCodeSnippets();
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        loadCustomCSS();
        loadCodeSnippets();
      }, 100);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
