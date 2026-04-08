// Dashboard Loader
// Loads all dashboard modules in proper order

(function(global) {
  'use strict';

  const DashboardLoader = {
    // Core modules (must load first)
    coreScripts: [
      '/js/admin/dashboard-core.js',
      '/js/admin/dashboard-shared.js'
    ],

    // Feature modules (load after core)
    featureScripts: [
      '/js/admin/dashboard-stats.js',
      '/js/admin/dashboard-orders.js',
      '/js/admin/dashboard-users.js',
      '/js/admin/dashboard-products.js',
      '/js/admin/dashboard-reviews.js',
      '/js/admin/dashboard-blog.js',
      '/js/admin/dashboard-blog-comments.js',
      '/js/admin/dashboard-forum.js',
      '/js/admin/dashboard-settings.js',
      '/js/admin/dashboard-api-keys.js',
      '/js/admin/dashboard-coupons.js',
      '/js/admin/webhooks-simple.js',
      '/js/admin/dashboard-backup.js',
      '/js/admin/dashboard-noindex.js',
      '/js/admin/dashboard-seo-minimal.js',
      '/js/admin/dashboard-analytics.js',
      '/js/admin/dashboard-emails.js',
      '/js/admin/dashboard-pages.js',
      '/js/admin/dashboard-components.js',
      '/js/admin/dashboard-chats.js',
      '/js/admin/dashboard-payment-universal.js'
    ],

    // Load a script and return a promise
    loadScript: function(src) {
      return new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.onload = function() { resolve(src); };
        script.onerror = function() { 
          console.warn('Failed to load: ' + src);
          resolve(src); // Resolve anyway to continue
        };
        document.head.appendChild(script);
      });
    },

    // Load all scripts sequentially
    load: function() {
      var self = this;
      var allScripts = this.coreScripts.concat(this.featureScripts);
      var promise = Promise.resolve();

      allScripts.forEach(function(src) {
        promise = promise.then(function() {
          return self.loadScript(src);
        });
      });

      return promise;
    },

    // Initialize dashboard
    init: function() {
      var self = this;
      
      return this.load().then(function() {
        console.log('✅ Dashboard modules loaded');
        return true;
      }).catch(function(err) {
        console.error('Error loading dashboard:', err);
        return false;
      });
    },

    // Get version for cache busting
    getVersion: function() {
      return 'v=25';
    }
  };

  // Export
  global.DashboardLoader = DashboardLoader;

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      DashboardLoader.init();
    });
  } else {
    setTimeout(function() {
      DashboardLoader.init();
    }, 0);
  }

})(typeof window !== 'undefined' ? window : this);