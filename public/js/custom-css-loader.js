/**
 * Custom CSS & Code Loader - Loads and injects custom CSS and code snippets from admin settings
 * Auto-detects page type and loads appropriate CSS/code sections
 */

(function() {
  'use strict';

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
    return 'page'; // generic page
  }

  // Load and inject custom CSS
  async function loadCustomCSS() {
    const pageType = detectPageType();
    
    try {
      const res = await fetch('/api/settings/custom-css');
      const data = await res.json();
      
      if (!data.success || !data.settings) {
        return;
      }
      
      const settings = data.settings;
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
      
      // Inject CSS if there's any
      if (cssToInject.trim()) {
        injectCSS(cssToInject);
      }
    } catch (err) {
      console.warn('Custom CSS loader: Could not load settings', err);
    }
  }

  // Inject CSS into page
  function injectCSS(css) {
    const style = document.createElement('style');
    style.id = 'custom-css-injected';
    style.setAttribute('data-source', 'admin-settings');
    style.textContent = css;
    
    // Remove existing custom CSS if any
    const existing = document.getElementById('custom-css-injected');
    if (existing) {
      existing.remove();
    }
    
    // Append to head
    document.head.appendChild(style);
  }

  // Load and inject code snippets
  async function loadCodeSnippets() {
    const pageType = detectPageType();
    
    try {
      const res = await fetch('/api/settings/code-snippets');
      const data = await res.json();
      
      if (!data.success || !data.snippets || data.snippets.length === 0) {
        return;
      }
      
      const snippets = data.snippets;
      
      // Filter and inject snippets based on page type and position
      snippets.forEach(snippet => {
        if (!snippet.enabled) return;
        
        // Check if this snippet should load on current page
        const shouldLoad = snippet.pages.includes('all') || 
                          snippet.pages.includes(pageType) ||
                          (pageType === 'page' && snippet.pages.includes('all'));
        
        if (!shouldLoad) return;
        
        // Inject based on type and position
        injectSnippet(snippet);
      });
    } catch (err) {
      console.warn('Code snippets loader: Could not load snippets', err);
    }
  }

  // Inject a single snippet
  function injectSnippet(snippet) {
    const id = 'snippet-' + snippet.id;
    
    // Remove existing if any
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }
    
    let element;
    
    if (snippet.type === 'css') {
      // CSS - inject as style tag
      element = document.createElement('style');
      element.id = id;
      element.setAttribute('data-snippet', snippet.name);
      element.textContent = snippet.code;
      document.head.appendChild(element);
      return;
    }
    
    if (snippet.type === 'js') {
      // JavaScript - could be inline script or script with src
      // Check if code contains <script> tags
      if (snippet.code.includes('<script')) {
        // Has script tags, inject as HTML
        injectHTML(snippet, id);
      } else {
        // Plain JS code
        element = document.createElement('script');
        element.id = id;
        element.setAttribute('data-snippet', snippet.name);
        element.textContent = snippet.code;
        injectByPosition(element, snippet.position);
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
    container.setAttribute('data-snippet', snippet.name);
    container.innerHTML = snippet.code;
    
    // Execute any scripts within the HTML
    const scripts = container.querySelectorAll('script');
    scripts.forEach(oldScript => {
      const newScript = document.createElement('script');
      
      // Copy attributes
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy content or src
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
    
    injectByPosition(container, snippet.position);
  }

  // Inject element by position
  function injectByPosition(element, position) {
    switch (position) {
      case 'head':
        document.head.appendChild(element);
        break;
      case 'body-start':
        if (document.body.firstChild) {
          document.body.insertBefore(element, document.body.firstChild);
        } else {
          document.body.appendChild(element);
        }
        break;
      case 'body-end':
      default:
        document.body.appendChild(element);
        break;
    }
  }

  // Initialize
  function init() {
    loadCustomCSS();
    loadCodeSnippets();
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
