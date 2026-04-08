var PageBuilderAPI = (function() {
  function generateOutputHtml() {
    var parts = [];
    document.querySelectorAll('#builder-canvas .section-wrapper').forEach(function(wrapper) {
      var cloneWrapper = wrapper.cloneNode(true);
      cloneWrapper.querySelectorAll('.section-controls').forEach(function(el) {
        el.remove();
      });
      cloneWrapper.querySelectorAll('[contenteditable]').forEach(function(el) {
        el.removeAttribute('contenteditable');
        el.style.outline = '';
        el.style.outlineOffset = '';
      });
      cloneWrapper.querySelectorAll('.widget-config').forEach(function(el) {
        el.remove();
      });
      cloneWrapper.querySelectorAll('.product-widget-container, .blog-widget-container, .reviews-widget-container').forEach(function(el) {
        el.removeAttribute('id');
        el.innerHTML = '';
      });
      var sectionHTML = '<div data-section="true">' + cloneWrapper.innerHTML + '</div>';
      parts.push(sectionHTML);
    });
    return parts.join('\n');
  }

  function buildFullHtml(html, title, desc, featureImageUrl, ogTitle, ogDesc, ogImage, canonicalUrl, robotsMeta) {
    var seoOverrideTags = '';
    if (ogTitle) seoOverrideTags += '\n  <meta property="og:title" content="' + ogTitle.replace(/"/g, '&quot;') + '">';
    if (ogDesc) seoOverrideTags += '\n  <meta property="og:description" content="' + ogDesc.replace(/"/g, '&quot;') + '">';
    if (ogImage) seoOverrideTags += '\n  <meta property="og:image" content="' + ogImage + '">';
    if (ogTitle) seoOverrideTags += '\n  <meta name="twitter:title" content="' + ogTitle.replace(/"/g, '&quot;') + '">';
    if (ogDesc) seoOverrideTags += '\n  <meta name="twitter:description" content="' + ogDesc.replace(/"/g, '&quot;') + '">';
    if (ogImage) seoOverrideTags += '\n  <meta name="twitter:image" content="' + ogImage + '">';
    if (canonicalUrl) seoOverrideTags += '\n  <link rel="canonical" href="' + canonicalUrl + '">';
    if (robotsMeta) seoOverrideTags += '\n  <meta name="robots" content="' + robotsMeta + '">';

    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>' + title + '</title>\n  <meta name="description" content="' + desc.replace(/"/g, '&quot;') + '">' + seoOverrideTags + '\n  <link rel="preload" href="/css/style.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">\n  <noscript><link rel="stylesheet" href="/css/style.css"></noscript>\n  <script defer src="/js/product-cards.js"><\\/script>\n  <script defer src="/js/blog-cards.js"><\\/script>\n  <script defer src="/js/reviews-widget.js"><\\/script>\n  <style>.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}.faq-item.open .faq-answer{max-height:500px !important;}.faq-item.open .faq-toggle span:last-child{transform:rotate(180deg);}</style>\n</head>\n<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">\n' + html + '\n<script>\ndocument.addEventListener(\'DOMContentLoaded\', function() {\n  document.querySelectorAll(\'[data-embed*="product"]\').forEach(function(el, i) {\n    if (typeof ProductCards !== \'undefined\') {\n      var cid = \'pc-\' + i + \'-\' + Date.now();\n      el.id = cid;\n      var config = {limit:6,columns:3,filter:\'all\',layout:\'grid\'};\n      try { config = Object.assign(config, JSON.parse(el.getAttribute(\'data-embed\'))); } catch(e) {}\n      if (config.layout === \'slider\') {\n        ProductCards.renderSlider ? ProductCards.renderSlider(cid, config) : ProductCards.render(cid, config);\n      } else {\n        ProductCards.render(cid, config);\n      }\n    }\n  });\n  document.querySelectorAll(\'[data-embed*="blog"]\').forEach(function(el, i) {\n    if (typeof BlogCards !== \'undefined\') {\n      var cid = \'bc-\' + i + \'-\' + Date.now();\n      el.id = cid;\n      var config = {limit:6,columns:3,layout:\'grid\'};\n      try { config = Object.assign(config, JSON.parse(el.getAttribute(\'data-embed\'))); } catch(e) {}\n      if (config.layout === \'slider\') {\n        BlogCards.renderSlider ? BlogCards.renderSlider(cid, config) : BlogCards.render(cid, config);\n      } else {\n        BlogCards.render(cid, {limit:config.limit,columns:config.columns,showPagination:false});\n      }\n    }\n  });\n  document.querySelectorAll(\'[data-embed*="review"]\').forEach(function(el, i) {\n    if (typeof ReviewsWidget !== \'undefined\') {\n      var cid = \'rw-\' + i + \'-\' + Date.now();\n      el.id = cid;\n      var config = {limit:6,columns:3,minRating:5,showAvatar:true};\n      try { config = Object.assign(config, JSON.parse(el.getAttribute(\'data-embed\'))); } catch(e) {}\n      ReviewsWidget.render(cid, config);\n    }\n  });\n  document.querySelectorAll(\'.faq-toggle\').forEach(function(btn) {\n    btn.addEventListener(\'click\', function() { this.parentElement.classList.toggle(\'open\'); });\n  });\n  document.querySelectorAll(\'.countdown-timer\').forEach(function(timer) {\n    var endAttr = timer.getAttribute(\'data-end\');\n    var end = endAttr ? new Date(endAttr).getTime() : Date.now() + 7*24*60*60*1000;\n    function tick() {\n      var now = Date.now();\n      var diff = Math.max(0, end - now);\n      var d = Math.floor(diff / 86400000);\n      var h = Math.floor((diff % 86400000) / 3600000);\n      var m = Math.floor((diff % 3600000) / 60000);\n      var s = Math.floor((diff % 60000) / 1000);\n      var de = timer.querySelector(\'.countdown-days\'); if(de) de.textContent = String(d).padStart(2,\'0\');\n      var he = timer.querySelector(\'.countdown-hours\'); if(he) he.textContent = String(h).padStart(2,\'0\');\n      var me = timer.querySelector(\'.countdown-mins\'); if(me) me.textContent = String(m).padStart(2,\'0\');\n      var se = timer.querySelector(\'.countdown-secs\'); if(se) se.textContent = String(s).padStart(2,\'0\');\n      if (diff > 0) requestAnimationFrame(function(){ setTimeout(tick, 1000); });\n    }\n    tick();\n  });\n});\n<\\/script>\n</body>\n</html>';
  }

  function savePage() {
    return new Promise(function(resolve, reject) {
      var title = document.getElementById('seo-title').value.trim();
      var slugInput = document.getElementById('seo-slug');
      var slug = slugInput ? slugInput.value.trim() : '';
      var desc = document.getElementById('seo-desc').value.trim();
      var isDefault = document.getElementById('is-default').checked;
      var useRootHomepageUrl = PageBuilderState.getStateValue('currentPageType') === 'home' && isDefault;

      var saveBtn = document.getElementById('save-btn');
      var originalText = saveBtn.textContent;
      saveBtn.textContent = '⏳ Saving...';
      saveBtn.disabled = true;

      var checkUpload = setInterval(function() {
        if (typeof window.isUploadInProgress !== 'function' || !window.isUploadInProgress()) {
          clearInterval(checkUpload);
          var featureImageUrl = document.getElementById('feature_image_url').value.trim();
          if (typeof window.getUploadedFiles === 'function') {
            var uploads = window.getUploadedFiles();
            if (uploads['feature-image-file']) featureImageUrl = uploads['feature-image-file'];
          }

          if (!title) {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            reject(new Error('Please enter a Page Title'));
            return;
          }

          if (useRootHomepageUrl) {
            slug = '/';
            slugInput.value = '/';
          } else if (!slug) {
            slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            slugInput.value = slug;
          }

          var html = generateOutputHtml();
          var ogTitle = document.getElementById('seo-og-title').value.trim();
          var ogDesc = document.getElementById('seo-og-desc').value.trim();
          var ogImage = document.getElementById('seo-og-image').value.trim() || featureImageUrl;
          var canonicalUrl = document.getElementById('seo-canonical').value.trim();
          var robotsMeta = document.getElementById('seo-robots').value;

          var fullHTML = buildFullHtml(html, title, desc, featureImageUrl, ogTitle, ogDesc, ogImage, canonicalUrl, robotsMeta);

          var payload = {
            title: title,
            slug: slug,
            content: fullHTML,
            meta_description: desc,
            page_type: PageBuilderState.getStateValue('currentPageType'),
            is_default: isDefault && PageBuilderState.getStateValue('currentPageType') !== 'custom',
            feature_image_url: featureImageUrl,
            status: 'published'
          };

          var editingPageId = PageBuilderState.getStateValue('editingPageId');
          var originalPageSlug = PageBuilderState.getStateValue('originalPageSlug');

          if (editingPageId) {
            payload.id = editingPageId;
          } else if (originalPageSlug) {
            payload.original_slug = originalPageSlug;
          }

          fetch('/api/page/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            if (data.success) {
              var savedSlug = data.slug || slug;
              var publicUrl = data.public_url || (useRootHomepageUrl ? '/' : '/' + savedSlug);
              if (data.id) PageBuilderState.setState('editingPageId', Number(data.id));
              PageBuilderState.setState('originalPageSlug', savedSlug);
              PageBuilderState.setState('previousEditableSlug', savedSlug);
              slugInput.value = useRootHomepageUrl ? '/' : savedSlug;
              PageBuilderUI.syncSlugField();
              resolve({ success: true, slug: savedSlug, publicUrl: publicUrl, id: data.id });
            } else {
              reject(new Error(data.error || 'Unknown error'));
            }
          })
          .catch(function(err) {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            reject(err);
          });
        }
      }, 200);
    });
  }

  function loadExistingPage(name) {
    return new Promise(function(resolve, reject) {
      fetch('/api/pages/load?name=' + encodeURIComponent(name))
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.content) {
          var editingPageId = data.id ? Number(data.id) : null;
          var originalPageSlug = (data.slug || name || '').toString().trim();
          var previousEditableSlug = originalPageSlug && originalPageSlug !== 'home' ? originalPageSlug : '';

          PageBuilderState.setState('editingPageId', editingPageId);
          PageBuilderState.setState('originalPageSlug', originalPageSlug);
          PageBuilderState.setState('previousEditableSlug', previousEditableSlug);

          var canvas = document.getElementById('builder-canvas');
          var parser = new DOMParser();
          var doc = parser.parseFromString(data.content, 'text/html');

          var titleEl = doc.querySelector('title');
          if (titleEl) document.getElementById('seo-title').value = titleEl.textContent;

          var metaDesc = doc.querySelector('meta[name="description"]');
          if (metaDesc) document.getElementById('seo-desc').value = metaDesc.getAttribute('content') || '';

          if (data.page_type) PageBuilderUI.setPageType(data.page_type);
          document.getElementById('is-default').checked = data.is_default === 1;
          document.getElementById('seo-slug').value = (data.page_type === 'home' && data.is_default === 1) ? '/' : (data.slug || name);
          PageBuilderUI.syncSlugField();

          var featureImageUrl = data.feature_image_url || '';
          document.getElementById('feature_image_url').value = featureImageUrl;
          if (featureImageUrl) {
            PageBuilderUtils.setFeatureImagePreview(featureImageUrl);
          }

          var body = doc.body;
          canvas.innerHTML = '';

          if (body) {
            Array.from(body.children).forEach(function(child) {
              if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return;
              var wrapper = PageBuilderUtils.createSectionWrapper();
              var sectionHtml;
              if (child.getAttribute && child.getAttribute('data-section') === 'true') {
                sectionHtml = child.innerHTML;
              } else {
                sectionHtml = child.outerHTML;
              }
              wrapper.innerHTML = sectionHtml + PageBuilderUtils.createControls();
              canvas.appendChild(wrapper);
              PageBuilderUtils.enableEditing(wrapper);
              PageBuilderWidgets.initDynamicWidgets(wrapper);
            });
          }

          PageBuilderUtils.updateCanvasEmptyState();
          resolve({ success: true });
        } else {
          reject(new Error('Page not found or empty'));
        }
      })
      .catch(reject);
    });
  }

  function loadCurrentDefaults() {
    return new Promise(function(resolve, reject) {
      var container = document.getElementById('defaults-list');
      var types = ['home', 'blog_archive', 'forum_archive', 'product_grid'];
      var html = '';
      var completed = 0;

      types.forEach(function(type) {
        fetch('/api/pages/default?type=' + type)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var label = type.replace('_', ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
          var icon = type === 'home' ? '🏠' : type === 'blog_archive' ? '📝' : type === 'forum_archive' ? '💬' : '🛒';
          if (data.page) {
            var publicUrl = data.page.public_url || (type === 'home' ? '/' : '/' + data.page.slug);
            html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">' +
              '<span>' + icon + '</span><span style="flex:1;font-weight:600;">' + label + '</span>' +
              '<span style="color:var(--success);font-size:0.8rem;">' + publicUrl + '</span></div>';
          } else {
            html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">' +
              '<span>' + icon + '</span><span style="flex:1;">' + label + '</span>' +
              '<span style="color:var(--gray);font-size:0.8rem;">Not set</span></div>';
          }
          completed++;
          if (completed === types.length) {
            container.innerHTML = html || '<p style="color:var(--gray);">No defaults set</p>';
            resolve();
          }
        })
        .catch(function(e) {
          console.error('Error loading default for', type, e);
          completed++;
          if (completed === types.length) {
            container.innerHTML = html || '<p style="color:var(--gray);">No defaults set</p>';
            resolve();
          }
        });
      });
    });
  }

  function generatePreviewHtml() {
    var html = generateOutputHtml();
    var title = document.getElementById('seo-title').value || 'Preview';
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + title + '</title><link rel="preload" href="/css/style.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'"><noscript><link rel="stylesheet" href="/css/style.css"></noscript><script defer src="/js/product-cards.js"><\\/script><script defer src="/js/blog-cards.js"><\\/script><script defer src="/js/reviews-widget.js"><\\/script></head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">' + html + '<script>\ndocument.addEventListener(\'DOMContentLoaded\', function() {\n  document.querySelectorAll(\'[data-embed*="product"]\').forEach(function(el, i) {\n    if (typeof ProductCards !== \'undefined\') {\n      var cid = \'pc-preview-\' + i;\n      el.id = cid;\n      var config = {limit:6,columns:3,filter:\'all\',layout:\'grid\'};\n      try { config = Object.assign(config, JSON.parse(el.getAttribute(\'data-embed\'))); } catch(e) {}\n      if (config.layout === \'slider\') {\n        ProductCards.renderSlider ? ProductCards.renderSlider(cid, config) : ProductCards.render(cid, config);\n      } else {\n        ProductCards.render(cid, config);\n      }\n    }\n  });\n  document.querySelectorAll(\'[data-embed*="blog"]\').forEach(function(el, i) {\n    if (typeof BlogCards !== \'undefined\') {\n      var cid = \'bc-preview-\' + i;\n      el.id = cid;\n      var config = {limit:6,columns:3,layout:\'grid\'};\n      try { config = Object.assign(config, JSON.parse(el.getAttribute(\'data-embed\'))); } catch(e) {}\n      if (config.layout === \'slider\') {\n        BlogCards.renderSlider ? BlogCards.renderSlider(cid, config) : BlogCards.render(cid, config);\n      } else {\n        BlogCards.render(cid, {limit:config.limit,columns:config.columns,showPagination:false});\n      }\n    }\n  });\n  document.querySelectorAll(\'[data-embed*="review"]\').forEach(function(el, i) {\n    if (typeof ReviewsWidget !== \'undefined\') {\n      var cid = \'rw-preview-\' + i;\n      el.id = cid;\n      var config = {limit:6,columns:3,minRating:5,showAvatar:true};\n      try { config = Object.assign(config, JSON.parse(el.getAttribute(\'data-embed\'))); } catch(e) {}\n      ReviewsWidget.render(cid, config);\n    }\n  });\n});\n<\\/script></body></html>';
  }

  return {
    generateOutputHtml: generateOutputHtml,
    buildFullHtml: buildFullHtml,
    savePage: savePage,
    loadExistingPage: loadExistingPage,
    loadCurrentDefaults: loadCurrentDefaults,
    generatePreviewHtml: generatePreviewHtml
  };
})();
