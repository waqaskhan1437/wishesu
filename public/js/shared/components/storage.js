// Shared Components - Data Storage Module
// Used by both dashboard-components.js and page-builder.js

(function(global) {
  'use strict';

  const SiteComponentsStorage = {
    STORAGE_KEY: 'siteComponents',

    // Default component data structure
    getDefaultData: function() {
      return {
        headers: [],
        footers: [],
        productLists: [],
        reviewLists: [],
        defaultHeaderId: null,
        defaultFooterId: null,
        excludedPages: [],
        settings: {
          enableGlobalHeader: true,
          enableGlobalFooter: true
        }
      };
    },

    // Load from API (with localStorage fallback)
    load: async function() {
      try {
        var res = await fetch('/api/admin/settings/components');
        if (res.ok) {
          var json = await res.json();
          if (json.components) {
            console.log('✅ Loaded components from API');
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(json.components));
            return Object.assign({}, this.getDefaultData(), json.components);
          }
        }
      } catch (e) {
        console.error('Failed to load components from API:', e);
      }

      // Fallback to localStorage
      try {
        var stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          console.log('⚠️ Loaded components from localStorage (API fallback)');
          return Object.assign({}, this.getDefaultData(), JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load components:', e);
      }
      return this.getDefaultData();
    },

    // Save to API
    save: async function(data) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        console.log('✅ Components saved to localStorage');

        var res = await fetch('/api/admin/settings/components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        var result = await res.json();
        if (result.success) {
          console.log('✅ Components saved to API');
          return true;
        } else {
          console.error('Failed to save to API:', result.error);
          return false;
        }
      } catch (e) {
        console.error('Failed to save components:', e);
        return false;
      }
    }
  };

  // Export
  global.SiteComponentsStorage = SiteComponentsStorage;

})(typeof window !== 'undefined' ? window : this);