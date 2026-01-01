/**
 * Custom CSS Loader - Loads and injects custom CSS from admin settings
 * Auto-detects page type and loads appropriate CSS sections
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
    return 'page'; // generic page
  }

  // Load and inject custom CSS
  async function loadCustomCSS() {
    const pageType = detectPageType();
    
    try {
      // Fetch CSS settings
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

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCustomCSS);
  } else {
    loadCustomCSS();
  }
})();
