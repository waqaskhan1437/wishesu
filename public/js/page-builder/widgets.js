var PageBuilderWidgets = (function() {
  function getDefaultWidgetConfig(type) {
    if (type === 'review') {
      return { type: type, limit: 6, columns: 3, minRating: 5, showAvatar: true };
    }
    return { type: type, limit: 6, columns: 3, layout: 'grid', filter: 'all', ids: [] };
  }

  function getExistingWidgetConfig(wrapper, type) {
    var selector = type === 'product'
      ? '.product-widget-container[data-embed*="product"]'
      : type === 'blog'
        ? '.blog-widget-container[data-embed*="blog"]'
        : '.reviews-widget-container[data-embed*="review"]';
    var widget = wrapper.querySelector(selector);
    var fallback = getDefaultWidgetConfig(type);
    if (!widget) return fallback;
    try {
      return Object.assign({}, fallback, JSON.parse(widget.getAttribute('data-embed') || '{}'));
    } catch (_) {
      return fallback;
    }
  }

  function getWidgetConfig(wrapper, type) {
    var configPanel = wrapper.querySelector('.widget-config');
    var fallback = getDefaultWidgetConfig(type);
    if (!configPanel) return getExistingWidgetConfig(wrapper, type);

    var layoutEl = configPanel.querySelector('.widget-layout');
    var columnsEl = configPanel.querySelector('.widget-columns');
    var filterEl = configPanel.querySelector('.widget-filter');

    var layout = layoutEl ? layoutEl.value : (fallback.layout || 'grid');
    var columns = columnsEl ? parseInt(columnsEl.value) : (fallback.columns || 3);
    var filter = filterEl ? filterEl.value : (fallback.filter || 'all');

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
      var minRatingEl = configPanel.querySelector('.widget-min-rating');
      var showAvatarEl = configPanel.querySelector('.widget-show-avatar');
      var productIdEl = configPanel.querySelector('.widget-product-id');
      var minRating = minRatingEl ? parseInt(minRatingEl.value) : (fallback.minRating || 5);
      var showAvatar = showAvatarEl ? showAvatarEl.checked !== false : true;
      var productId = productIdEl ? productIdEl.value.trim() : '';
      var config = { type: type, limit: limit, columns: columns, minRating: minRating, showAvatar: showAvatar };
      if (productId) config.productId = productId;
      return config;
    }

    var idsInput = configPanel.querySelector('.widget-ids-input');
    var ids = [];
    if (filter === 'custom' && idsInput && idsInput.value.trim()) {
      ids = idsInput.value.split(',').map(function(id) { return id.trim(); }).filter(function(id) { return id; });
    }

    return { type: type, limit: limit, columns: columns, layout: layout, filter: filter, ids: ids };
  }

  function setupLimitCustomInput(wrapper) {
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
  }

  function updateWidgetDataEmbed(widget, config) {
    widget.setAttribute('data-embed', JSON.stringify(config));
  }

  function renderProductWidget(containerId, config) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;color:#6b7280;padding:20px;">Loading products...</p>';

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
  }

  function renderBlogWidget(containerId, config) {
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
  }

  function renderReviewsWidget(containerId, config) {
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
  }

  function initDynamicWidgets(wrapper) {
    setupLimitCustomInput(wrapper);

    var productWidget = wrapper.querySelector('.product-widget-container[data-embed*="product"]');
    if (productWidget && typeof ProductCards !== 'undefined') {
      var containerId = 'pc-' + Date.now();
      productWidget.id = containerId;
      var config = getWidgetConfig(wrapper, 'product');
      renderProductWidget(containerId, config);

      var configPanel = wrapper.querySelector('.widget-config');
      if (configPanel) {
        configPanel.querySelectorAll('select, input').forEach(function(el) {
          el.addEventListener('change', function() {
            var newConfig = getWidgetConfig(wrapper, 'product');
            updateWidgetDataEmbed(productWidget, newConfig);
            renderProductWidget(containerId, newConfig);
          });
        });
      }
    }

    var blogWidget = wrapper.querySelector('.blog-widget-container[data-embed*="blog"]');
    if (blogWidget && typeof BlogCards !== 'undefined') {
      var containerId = 'bc-' + Date.now();
      blogWidget.id = containerId;
      var config = getWidgetConfig(wrapper, 'blog');
      renderBlogWidget(containerId, config);

      var configPanel = wrapper.querySelector('.widget-config');
      if (configPanel) {
        configPanel.querySelectorAll('select, input').forEach(function(el) {
          el.addEventListener('change', function() {
            var newConfig = getWidgetConfig(wrapper, 'blog');
            updateWidgetDataEmbed(blogWidget, newConfig);
            renderBlogWidget(containerId, newConfig);
          });
        });
      }
    }

    var reviewsWidget = wrapper.querySelector('.reviews-widget-container[data-embed*="review"]');
    if (reviewsWidget && typeof ReviewsWidget !== 'undefined') {
      var containerId = 'rw-' + Date.now();
      reviewsWidget.id = containerId;
      var config = getWidgetConfig(wrapper, 'review');
      renderReviewsWidget(containerId, config);

      var configPanel = wrapper.querySelector('.widget-config');
      if (configPanel) {
        configPanel.querySelectorAll('select, input').forEach(function(el) {
          el.addEventListener('change', function() {
            var newConfig = getWidgetConfig(wrapper, 'review');
            updateWidgetDataEmbed(reviewsWidget, newConfig);
            renderReviewsWidget(containerId, newConfig);
          });
        });
      }
    }
  }

  return {
    getDefaultWidgetConfig: getDefaultWidgetConfig,
    getExistingWidgetConfig: getExistingWidgetConfig,
    getWidgetConfig: getWidgetConfig,
    setupLimitCustomInput: setupLimitCustomInput,
    updateWidgetDataEmbed: updateWidgetDataEmbed,
    renderProductWidget: renderProductWidget,
    renderBlogWidget: renderBlogWidget,
    renderReviewsWidget: renderReviewsWidget,
    initDynamicWidgets: initDynamicWidgets
  };
})();
