// Page Builder - Widgets Configuration and Rendering
// Contains all widget configuration, rendering, and dynamic widget functionality

(function(global) {
  'use strict';

  const PageBuilderWidgets = {
    // Get default widget config based on type
    getDefaultConfig: function(type) {
      if (type === 'review') {
        return { type: type, limit: 6, columns: 3, minRating: 5, showAvatar: true };
      }
      return { type: type, limit: 6, columns: 3, layout: 'grid', filter: 'all', ids: [] };
    },

    // Get existing widget config from element
    getExistingConfig: function(wrapper, type) {
      var selector;
      if (type === 'product') {
        selector = '.product-widget-container[data-embed*="product"]';
      } else if (type === 'blog') {
        selector = '.blog-widget-container[data-embed*="blog"]';
      } else {
        selector = '.reviews-widget-container[data-embed*="review"]';
      }
      
      var widget = wrapper.querySelector(selector);
      var fallback = this.getDefaultConfig(type);
      
      if (!widget) return fallback;
      
      try {
        return Object.assign({}, fallback, JSON.parse(widget.getAttribute('data-embed') || '{}'));
      } catch (_) {
        return fallback;
      }
    },

    // Get widget config from UI panel
    getWidgetConfig: function(wrapper, type) {
      var configPanel = wrapper.querySelector('.widget-config');
      var fallback = this.getDefaultConfig(type);
      
      if (!configPanel) return this.getExistingConfig(wrapper, type);

      var layout = configPanel.querySelector('.widget-layout')?.value || fallback.layout || 'grid';
      var columns = parseInt(configPanel.querySelector('.widget-columns')?.value || String(fallback.columns || 3)) || 3;
      var filter = configPanel.querySelector('.widget-filter')?.value || fallback.filter || 'all';

      // Handle custom limit
      var limitSelect = configPanel.querySelector('.widget-limit-select');
      var limitCustom = configPanel.querySelector('.widget-limit-custom');
      var limit = fallback.limit || 6;
      
      if (limitSelect) {
        if (limitSelect.value === 'custom' && limitCustom) {
          limit = parseInt(limitCustom.value) || limit;
        } else {
          limit = parseInt(limitSelect.value) || limit;
        }
      }

      if (type === 'review') {
        var minRating = parseInt(configPanel.querySelector('.widget-min-rating')?.value || String(fallback.minRating || 5)) || 5;
        var showAvatar = configPanel.querySelector('.widget-show-avatar')?.checked !== false;
        var productId = configPanel.querySelector('.widget-product-id')?.value?.trim() || '';
        
        var config = { type: type, limit: limit, columns: columns, minRating: minRating, showAvatar: showAvatar };
        if (productId) config.productId = productId;
        return config;
      }

      // Handle custom IDs
      var idsInput = configPanel.querySelector('.widget-ids-input');
      var ids = [];
      if (filter === 'custom' && idsInput && idsInput.value.trim()) {
        ids = idsInput.value.split(',').map(function(id) { return id.trim(); }).filter(function(id) { return id; });
      }

      return { type: type, limit: limit, columns: columns, layout: layout, filter: filter, ids: ids };
    },

    // Setup limit custom input toggle
    setupLimitCustomInput: function(wrapper) {
      var configPanel = wrapper.querySelector('.widget-config');
      if (!configPanel) return;

      var limitSelect = configPanel.querySelector('.widget-limit-select');
      var limitCustom = configPanel.querySelector('.widget-limit-custom');
      
      if (limitSelect && limitCustom) {
        limitSelect.addEventListener('change', function() {
          if (this.value === 'custom') {
            limitCustom.style.display = 'block';
            limitCustom.focus();
          } else {
            limitCustom.style.display = 'none';
          }
        });
      }

      var filterSelect = configPanel.querySelector('.widget-filter');
      var customIdsDiv = configPanel.querySelector('.widget-custom-ids');
      if (filterSelect && customIdsDiv) {
        filterSelect.addEventListener('change', function() {
          if (this.value === 'custom') {
            customIdsDiv.style.display = 'block';
          } else {
            customIdsDiv.style.display = 'none';
          }
        });
      }
    },

    // Update widget data-embed attribute
    updateDataEmbed: function(widget, config) {
      widget.setAttribute('data-embed', JSON.stringify(config));
    },

    // Render product widget
    renderProduct: function(containerId, config) {
      var container = document.getElementById(containerId);
      if (!container) return;
      
      container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Loading products...</p>';

      var self = this;
      setTimeout(function() {
        if (typeof ProductCards !== 'undefined') {
          var opts = {
            limit: config.limit,
            columns: config.columns,
            filter: config.filter,
            ids: config.ids || []
          };
          if (config.layout === 'slider' && ProductCards.renderSlider) {
            ProductCards.renderSlider(containerId, opts);
          } else {
            ProductCards.render(containerId, opts);
          }
        }
      }, 100);
    },

    // Render blog widget
    renderBlog: function(containerId, config) {
      var container = document.getElementById(containerId);
      if (!container) return;
      
      container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Loading blogs...</p>';

      setTimeout(function() {
        if (typeof BlogCards !== 'undefined') {
          var opts = {
            limit: config.limit,
            columns: config.columns,
            showPagination: false,
            ids: config.ids || []
          };
          if (config.layout === 'slider' && BlogCards.renderSlider) {
            BlogCards.renderSlider(containerId, opts);
          } else {
            BlogCards.render(containerId, opts);
          }
        }
      }, 100);
    },

    // Render reviews widget
    renderReviews: function(containerId, config) {
      var container = document.getElementById(containerId);
      if (!container) return;
      
      container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Loading reviews...</p>';

      setTimeout(function() {
        if (typeof ReviewsWidget !== 'undefined') {
          var opts = {
            limit: config.limit,
            columns: config.columns,
            minRating: config.minRating,
            showAvatar: config.showAvatar !== false
          };
          if (config.productId) opts.productId = config.productId;
          ReviewsWidget.render(containerId, opts);
        }
      }, 100);
    },

    // Initialize dynamic widgets in a wrapper
    initWidgets: function(wrapper) {
      this.setupLimitCustomInput(wrapper);

      // Product widget
      var productWidget = wrapper.querySelector('.product-widget-container[data-embed*="product"]');
      if (productWidget && typeof ProductCards !== 'undefined') {
        var containerId = 'pc-' + Date.now();
        productWidget.id = containerId;
        var config = this.getWidgetConfig(wrapper, 'product');
        this.renderProduct(containerId, config);

        var configPanel = wrapper.querySelector('.widget-config');
        if (configPanel) {
          configPanel.querySelectorAll('select, input').forEach(function(el) {
            el.addEventListener('change', function() {
              var newConfig = this.getWidgetConfig(wrapper, 'product');
              this.updateDataEmbed(productWidget, newConfig);
              this.renderProduct(containerId, newConfig);
            }.bind(this));
          });
        }
      }

      // Blog widget
      var blogWidget = wrapper.querySelector('.blog-widget-container[data-embed*="blog"]');
      if (blogWidget && typeof BlogCards !== 'undefined') {
        var containerId = 'bc-' + Date.now();
        blogWidget.id = containerId;
        var config = this.getWidgetConfig(wrapper, 'blog');
        this.renderBlog(containerId, config);

        var configPanel = wrapper.querySelector('.widget-config');
        if (configPanel) {
          configPanel.querySelectorAll('select, input').forEach(function(el) {
            el.addEventListener('change', function() {
              var newConfig = this.getWidgetConfig(wrapper, 'blog');
              this.updateDataEmbed(blogWidget, newConfig);
              this.renderBlog(containerId, newConfig);
            }.bind(this));
          });
        }
      }

      // Reviews widget
      var reviewsWidget = wrapper.querySelector('.reviews-widget-container[data-embed*="review"]');
      if (reviewsWidget && typeof ReviewsWidget !== 'undefined') {
        var containerId = 'rw-' + Date.now();
        reviewsWidget.id = containerId;
        var config = this.getWidgetConfig(wrapper, 'review');
        this.renderReviews(containerId, config);

        var configPanel = wrapper.querySelector('.widget-config');
        if (configPanel) {
          configPanel.querySelectorAll('select, input').forEach(function(el) {
            el.addEventListener('change', function() {
              var newConfig = this.getWidgetConfig(wrapper, 'review');
              this.updateDataEmbed(reviewsWidget, newConfig);
              this.renderReviews(containerId, newConfig);
            }.bind(this));
          });
        }
      }
    },

    // Render all embedded widgets in a page (for saved pages)
    renderAllWidgets: function() {
      var self = this;
      
      // Product widgets
      document.querySelectorAll('[data-embed*="product"]').forEach(function(el, i) {
        if (typeof ProductCards !== 'undefined') {
          var cid = 'pc-' + i + '-' + Date.now();
          el.id = cid;
          var config = { limit: 6, columns: 3, filter: 'all', layout: 'grid' };
          try { config = Object.assign(config, JSON.parse(el.getAttribute('data-embed'))); } catch(e) {}
          if (config.layout === 'slider') {
            ProductCards.renderSlider ? ProductCards.renderSlider(cid, config) : ProductCards.render(cid, config);
          } else {
            ProductCards.render(cid, config);
          }
        }
      });

      // Blog widgets
      document.querySelectorAll('[data-embed*="blog"]').forEach(function(el, i) {
        if (typeof BlogCards !== 'undefined') {
          var cid = 'bc-' + i + '-' + Date.now();
          el.id = cid;
          var config = { limit: 6, columns: 3, layout: 'grid' };
          try { config = Object.assign(config, JSON.parse(el.getAttribute('data-embed'))); } catch(e) {}
          if (config.layout === 'slider') {
            BlogCards.renderSlider ? BlogCards.renderSlider(cid, config) : BlogCards.render(cid, config);
          } else {
            BlogCards.render(cid, { limit: config.limit, columns: config.columns, showPagination: false });
          }
        }
      });

      // Review widgets
      document.querySelectorAll('[data-embed*="review"]').forEach(function(el, i) {
        if (typeof ReviewsWidget !== 'undefined') {
          var cid = 'rw-' + i + '-' + Date.now();
          el.id = cid;
          var config = { limit: 6, columns: 3, minRating: 5, showAvatar: true };
          try { config = Object.assign(config, JSON.parse(el.getAttribute('data-embed'))); } catch(e) {}
          ReviewsWidget.render(cid, config);
        }
      });
    }
  };

  // Export to global
  global.PageBuilderWidgets = PageBuilderWidgets;

})(typeof window !== 'undefined' ? window : this);