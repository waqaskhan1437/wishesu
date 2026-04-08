// Shared Components - Embed Builder Module
// Generates embed code for products and reviews widgets

(function(global) {
  'use strict';

  const SiteComponentsEmbed = {
    // Generate product list embed code
    buildProductEmbed: function(id, options) {
      var END = '</' + 'script>';
      return '<div id="' + id + '"></div>\n<script defer src="/js/product-cards.js">' + END + '\n<script>\n(function(){\n  function run(){\n    if (window.ProductCards && typeof window.ProductCards.render === "function") {\n      window.ProductCards.render("' + id + '", ' + JSON.stringify(options, null, 2) + ');\n      return;\n    }\n    setTimeout(run, 50);\n  }\n  if (document.readyState === "loading") {\n    document.addEventListener("DOMContentLoaded", run);\n  } else {\n    run();\n  }\n})();\n' + END;
    },

    // Generate review list embed code
    buildReviewEmbed: function(id, options) {
      var END = '</' + 'script>';
      return '<div id="' + id + '"></div>\n<script defer src="/js/reviews-widget.js">' + END + '\n<script>\n(function(){\n  function run(){\n    if (window.ReviewsWidget && typeof window.ReviewsWidget.render === "function") {\n      window.ReviewsWidget.render("' + id + '", ' + JSON.stringify(options, null, 2) + ');\n      return;\n    }\n    setTimeout(run, 50);\n  }\n  if (document.readyState === "loading") {\n    document.addEventListener("DOMContentLoaded", run);\n  } else {\n    run();\n  }\n})();\n' + END;
    }
  };

  // Export
  global.SiteComponentsEmbed = SiteComponentsEmbed;

})(typeof window !== 'undefined' ? window : this);