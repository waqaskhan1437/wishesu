// Page Builder - SERP Preview Functionality
// Contains Google search result preview functionality

(function(global) {
  'use strict';

  const PageBuilderSerp = {
    // Initialize SERP preview
    init: function() {
      var titleInput = document.getElementById('seo-title');
      var slugInput = document.getElementById('seo-slug');
      var descInput = document.getElementById('seo-desc');
      
      if (titleInput) titleInput.addEventListener('input', this.updatePreview.bind(this));
      if (slugInput) slugInput.addEventListener('input', this.updatePreview.bind(this));
      if (descInput) descInput.addEventListener('input', this.updatePreview.bind(this));
      
      // Initial update
      setTimeout(this.updatePreview.bind(this), 500);
    },

    // Update SERP preview
    updatePreview: function() {
      var titleEl = document.getElementById('serp-title');
      var urlEl = document.getElementById('serp-url');
      var descEl = document.getElementById('serp-desc');
      
      var titleInput = document.getElementById('seo-title');
      var slugInput = document.getElementById('seo-slug');
      var descInput = document.getElementById('seo-desc');
      
      var title = (titleInput && titleInput.value.trim()) || 'Page Title';
      var slug = (slugInput && slugInput.value.trim()) || 'page-slug';
      var desc = (descInput && descInput.value.trim()) || 'Your meta description will appear here...';
      
      if (titleEl) {
        titleEl.textContent = title.length > 60 ? title.substring(0, 57) + '...' : title;
      }
      
      if (urlEl) {
        var baseUrl = window.location.origin;
        var displayUrl = slug === '/' ? '' : slug;
        urlEl.textContent = baseUrl + '/' + displayUrl;
      }
      
      if (descEl) {
        descEl.textContent = desc.length > 160 ? desc.substring(0, 157) + '...' : desc;
      }
    }
  };

  // Export to global
  global.PageBuilderSerp = PageBuilderSerp;

})(typeof window !== 'undefined' ? window : this);