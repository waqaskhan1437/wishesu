// Page Builder - Main Loader
// Loads all page builder modules in proper order

(function(global) {
  'use strict';

  const PageBuilderLoader = {
    // Scripts to load
    scripts: [
      '/js/page-builder/templates.js',
      '/js/page-builder/widgets.js',
      '/js/page-builder/history.js',
      '/js/page-builder/serp.js',
      '/js/page-builder/core.js'
    ],

    // Additional scripts required by page builder
    additionalScripts: [
      '/js/product-cards.js',
      '/js/blog-cards.js',
      '/js/reviews-widget.js'
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

    // Load all page builder modules
    load: function() {
      var self = this;
      
      // First load additional scripts
      var allScripts = this.additionalScripts.concat(this.scripts);
      
      // Load sequentially to ensure proper order
      var promise = Promise.resolve();
      
      allScripts.forEach(function(src) {
        promise = promise.then(function() {
          return self.loadScript(src);
        });
      });
      
      return promise;
    },

    // Load and initialize page builder
    init: function() {
      var self = this;
      
      return this.load().then(function() {
        console.log('Page Builder modules loaded successfully');
        
        // Initialize components that need initialization
        if (typeof PageBuilderSerp !== 'undefined') {
          PageBuilderSerp.init();
        }
        
        if (typeof PageBuilderHistory !== 'undefined') {
          PageBuilderHistory.init('#builder-canvas');
        }
        
        return true;
      }).catch(function(err) {
        console.error('Error loading page builder:', err);
        return false;
      });
    },

    // Check if all modules are loaded
    isReady: function() {
      return typeof PageBuilderTemplates !== 'undefined' &&
             typeof PageBuilderWidgets !== 'undefined' &&
             typeof PageBuilderHistory !== 'undefined' &&
             typeof PageBuilderSerp !== 'undefined';
    }
  };

  // Export to global
  global.PageBuilderLoader = PageBuilderLoader;

})(typeof window !== 'undefined' ? window : this);