export function initDynamicWidgets(wrapper) {
      // Setup custom limit input toggle
      setupWidgetConfigInputs(wrapper);

      // Product widget
      const productWidget = wrapper.querySelector('.product-widget-container[data-embed*="product"]');
      if (productWidget && typeof ProductCards !== 'undefined') {
        const containerId = 'pc-' + Date.now();
        productWidget.id = containerId;
        const config = getWidgetConfig(wrapper, 'product');
        renderProductWidget(containerId, config);

        // Listen for config changes
        const configPanel = wrapper.querySelector('.widget-config');
        if (configPanel) {
          configPanel.querySelectorAll('select, input').forEach(el => {
            el.addEventListener('change', () => {
              const newConfig = getWidgetConfig(wrapper, 'product');
              updateWidgetDataEmbed(productWidget, newConfig);
              renderProductWidget(containerId, newConfig);
            });
          });
        }
      }

      // Blog widget
      const blogWidget = wrapper.querySelector('.blog-widget-container[data-embed*="blog"]');
      if (blogWidget && typeof BlogCards !== 'undefined') {
        const containerId = 'bc-' + Date.now();
        blogWidget.id = containerId;
        const config = getWidgetConfig(wrapper, 'blog');
        renderBlogWidget(containerId, config);

        // Listen for config changes
        const configPanel = wrapper.querySelector('.widget-config');
        if (configPanel) {
          configPanel.querySelectorAll('select, input').forEach(el => {
            el.addEventListener('change', () => {
              const newConfig = getWidgetConfig(wrapper, 'blog');
              updateWidgetDataEmbed(blogWidget, newConfig);
              renderBlogWidget(containerId, newConfig);
            });
          });
        }
      }

      // Reviews widget
      const reviewsWidget = wrapper.querySelector('.reviews-widget-container[data-embed*="review"]');
      if (reviewsWidget && typeof ReviewsWidget !== 'undefined') {
        const containerId = 'rw-' + Date.now();
        reviewsWidget.id = containerId;
        const config = getWidgetConfig(wrapper, 'review');
        renderReviewsWidget(containerId, config);

        const configPanel = wrapper.querySelector('.widget-config');
        if (configPanel) {
          configPanel.querySelectorAll('select, input').forEach(el => {
            el.addEventListener('change', () => {
              const newConfig = getWidgetConfig(wrapper, 'review');
              updateWidgetDataEmbed(reviewsWidget, newConfig);
              renderReviewsWidget(containerId, newConfig);
            });
          });
        }
      }
    }

    function getDefaultWidgetConfig(type) {
      if (type === 'review') {
        return { type, limit: 6, columns: 3, minRating: 5, showAvatar: true };
      }
      if (type === 'blog') {
        return { type, limit: 6, columns: 3, layout: 'grid', filter: 'all', ids: [], showPagination: false };
      }
      return { type, limit: 6, columns: 3, layout: 'grid', filter: 'all', ids: [] };
    }

    function getExistingWidgetConfig(wrapper, type) {
      const selector = type === 'product'
        ? '.product-widget-container[data-embed*="product"]'
        : type === 'blog'
          ? '.blog-widget-container[data-embed*="blog"]'
          : '.reviews-widget-container[data-embed*="review"]';
      const widget = wrapper.querySelector(selector);
      const fallback = getDefaultWidgetConfig(type);
      if (!widget) return fallback;
      try {
        return Object.assign({}, fallback, JSON.parse(widget.getAttribute('data-embed') || '{}'));
      } catch (_) {
        return fallback;
      }
    }

    function getWidgetConfig(wrapper, type) {
      const configPanel = wrapper.querySelector('.widget-config');
      const fallback = getDefaultWidgetConfig(type);
      if (!configPanel) return getExistingWidgetConfig(wrapper, type);

      const layout = configPanel.querySelector('.widget-layout')?.value || fallback.layout || 'grid';
      const columns = parseInt(configPanel.querySelector('.widget-columns')?.value || String(fallback.columns || 3));
      const filter = configPanel.querySelector('.widget-filter')?.value || fallback.filter || 'all';

      // Handle custom limit
      const limitSelect = configPanel.querySelector('.widget-limit-select');
      const limitCustom = configPanel.querySelector('.widget-limit-custom');
      let limit = fallback.limit || 6;
      if (limitSelect) {
        if (limitSelect.value === 'custom' && limitCustom) {
          limit = parseInt(limitCustom.value) || limit;
        } else {
          limit = parseInt(limitSelect.value) || limit;
        }
      }

      if (type === 'review') {
        const minRating = parseInt(configPanel.querySelector('.widget-min-rating')?.value || String(fallback.minRating || 5)) || 5;
        const showAvatar = configPanel.querySelector('.widget-show-avatar')?.checked !== false;
        const productId = configPanel.querySelector('.widget-product-id')?.value?.trim() || '';
        const config = { type, limit, columns, minRating, showAvatar };
        if (productId) config.productId = productId;
        return config;
      }

      // Handle custom IDs
      const idsInput = configPanel.querySelector('.widget-ids-input');
      let ids = [];
      if (filter === 'custom' && idsInput && idsInput.value.trim()) {
        ids = idsInput.value.split(',').map(id => id.trim()).filter(id => id);
      }

      return { type, limit, columns, layout, filter, ids };
    }

export function setupWidgetConfigInputs(wrapper) {
      const configPanel = wrapper.querySelector('.widget-config');
      if (!configPanel) return;

      // Limit custom input toggle
      const limitSelect = configPanel.querySelector('.widget-limit-select');
      const limitCustom = configPanel.querySelector('.widget-limit-custom');
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

      // Filter custom IDs toggle
      const filterSelect = configPanel.querySelector('.widget-filter');
      const customIdsDiv = configPanel.querySelector('.widget-custom-ids');
      if (filterSelect && customIdsDiv) {
        filterSelect.addEventListener('change', function() {
          if (this.value === 'custom') {
            customIdsDiv.style.display = 'block';
          } else {
            customIdsDiv.style.display = 'none';
          }
        });
      }
    }

    function updateWidgetDataEmbed(widget, config) {
      widget.setAttribute('data-embed', JSON.stringify(config));
    }

    function renderProductWidget(containerId, config) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Loading products...</p>';

      setTimeout(() => {
        if (typeof ProductCards !== 'undefined') {
          const opts = {
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
    }

    function renderBlogWidget(containerId, config) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Loading blogs...</p>';

      setTimeout(() => {
        if (typeof BlogCards !== 'undefined') {
          const opts = {
            limit: config.limit,
            columns: config.columns,
            showPagination: config.showPagination === true,
            ids: config.ids || []
          };
          if (config.layout === 'slider' && BlogCards.renderSlider) {
            BlogCards.renderSlider(containerId, opts);
          } else {
            BlogCards.render(containerId, opts);
          }
        }
      }, 100);
    }

    function renderReviewsWidget(containerId, config) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Loading reviews...</p>';

      setTimeout(() => {
        if (typeof ReviewsWidget !== 'undefined') {
          const opts = {
            limit: config.limit,
            columns: config.columns,
            minRating: config.minRating,
            showAvatar: config.showAvatar !== false
          };
          if (config.productId) opts.productId = config.productId;
          ReviewsWidget.render(containerId, opts);
        }
      }, 100);
    }


