// Shared Components - Main Loader
// Loads all shared component modules

(function(global) {
  'use strict';

  const SiteComponentsLoader = {
    // Scripts to load
    scripts: [
      '/js/shared/components/storage.js',
      '/js/shared/components/templates.js',
      '/js/shared/components/embed.js'
    ],

    // Load a script and return a promise
    loadScript: function(src) {
      return new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.onload = function() { resolve(src); };
        script.onerror = function() { reject(new Error('Failed to load: ' + src)); };
        document.head.appendChild(script);
      });
    },

    // Load all shared component modules
    load: function() {
      var self = this;
      var promise = Promise.resolve();

      this.scripts.forEach(function(src) {
        promise = promise.then(function() {
          return self.loadScript(src);
        });
      });

      return promise;
    },

    // Check if all modules are loaded
    isReady: function() {
      return typeof global.SiteComponentsStorage !== 'undefined' &&
             typeof global.SiteComponentsTemplates !== 'undefined' &&
             typeof global.SiteComponentsEmbed !== 'undefined';
    },

    // Load and initialize
    init: function() {
      var self = this;

      return this.load().then(function() {
        console.log('✅ Shared Components modules loaded');
        return true;
      }).catch(function(err) {
        console.error('❌ Error loading shared components:', err);
        return false;
      });
    }
  };

  // Export
  global.SiteComponentsLoader = SiteComponentsLoader;

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      SiteComponentsLoader.init();
    });
  } else {
    setTimeout(function() {
      SiteComponentsLoader.init();
    }, 0);
  }

})(typeof window !== 'undefined' ? window : this);