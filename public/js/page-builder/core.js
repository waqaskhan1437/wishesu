// Page Builder - Core Functionality
// Main page builder logic using other modules

(function(global) {
  'use strict';

  const PageBuilderCore = {
    // State
    currentPageType: 'custom',
    editingSection: null,
    editingPageId: null,
    originalPageSlug: '',
    previousEditableSlug: '',

    // Initialize page builder
    init: function() {
      this.updateCanvasEmptyState();
      this.loadCurrentDefaults();
      this.setupEventListeners();
      this.initHistory();
      
      // Check for edit parameter in URL
      var params = new URLSearchParams(window.location.search);
      var editPage = params.get('edit');
      if (editPage) this.loadExistingPage(editPage);
    },

    // Setup all event listeners
    setupEventListeners: function() {
      var slugInput = document.getElementById('seo-slug');
      var defaultCheckbox = document.getElementById('is-default');
      
      if (slugInput) {
        slugInput.addEventListener('input', function() {
          if (!slugInput.readOnly) {
            this.previousEditableSlug = slugInput.value.trim();
          }
        }.bind(this));
      }
      
      if (defaultCheckbox) {
        defaultCheckbox.addEventListener('change', function() {
          this.syncSlugField();
        }.bind(this));
      }
      
      this.syncSlugField();

      // Feature image preview
      var featureFile = document.getElementById('feature-image-file');
      if (featureFile) {
        featureFile.addEventListener('change', this.handleFeatureImageUpload.bind(this));
      }
      
      var featureUrl = document.getElementById('feature_image_url');
      if (featureUrl) {
        featureUrl.addEventListener('input', this.handleFeatureImageUrl.bind(this));
      }

      // Modal close
      var codeModal = document.getElementById('code-modal');
      if (codeModal) {
        codeModal.addEventListener('click', function(e) {
          if (e.target === this) this.closeCodeModal();
        }.bind(this));
      }
    },

    // Initialize history
    initHistory: function() {
      if (typeof PageBuilderHistory !== 'undefined') {
        PageBuilderHistory.init('#builder-canvas');
        
        // Setup undo/redo buttons
        var undoBtn = document.getElementById('undo-btn');
        var redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) {
          undoBtn.addEventListener('click', function() {
            PageBuilderHistory.undo();
          });
        }
        
        if (redoBtn) {
          redoBtn.addEventListener('click', function() {
            PageBuilderHistory.redo();
          });
        }
      }
    },

    // Handle feature image file upload
    handleFeatureImageUpload: function() {
      var preview = document.getElementById('feature-preview');
      var fileInput = document.getElementById('feature-image-file');
      
      if (fileInput.files && fileInput.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
          preview.innerHTML = '<img src="' + e.target.result + '" style="width:80px;height:60px;object-fit:cover;border-radius:6px;">';
          preview.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
      }
    },

    // Handle feature image URL input
    handleFeatureImageUrl: function() {
      var preview = document.getElementById('feature-preview');
      var urlInput = document.getElementById('feature_image_url');
      
      if (urlInput.value) {
        preview.innerHTML = '<img src="' + urlInput.value + '" style="width:80px;height:60px;object-fit:cover;border-radius:6px;" onerror="this.style.display=\'none\';">';
        preview.style.display = 'block';
      } else {
        preview.style.display = 'none';
      }
    },

    // Load template
    loadTemplate: function(type) {
      if (!confirm('Load ' + type + ' template? This will replace current content.')) return;
      
      var canvas = document.getElementById('builder-canvas');
      var templates = PageBuilderTemplates.getAllTemplates();
      var template = templates[type];
      
      if (!template) return;
      
      document.getElementById('seo-title').value = template.title;
      document.getElementById('seo-slug').value = template.slug;
      this.setPageType(template.type);
      
      canvas.innerHTML = '';
      
      if (template.content) {
        var wrapper = this.createSectionWrapper();
        wrapper.innerHTML = template.content + this.createControls();
        canvas.appendChild(wrapper);
        this.enableEditing(wrapper);
        if (typeof PageBuilderWidgets !== 'undefined') {
          PageBuilderWidgets.initWidgets(wrapper);
        }
      } else if (template.sections) {
        template.sections.forEach(function(sectionType) {
          this.addSection(sectionType);
        }.bind(this));
      }
      
      this.updateCanvasEmptyState();
    },

    // Add section to canvas
    addSection: function(type) {
      var canvas = document.getElementById('builder-canvas');
      var wrapper = this.createSectionWrapper();
      
      var featureImg = document.getElementById('feature_image_url').value.trim();
      var sectionHtml;
      
      if (type === 'hero') {
        sectionHtml = PageBuilderTemplates.getHeroSection(featureImg);
      } else {
        sectionHtml = PageBuilderTemplates.sections[type];
      }
      
      wrapper.innerHTML = sectionHtml + this.createControls();
      canvas.appendChild(wrapper);
      
      this.enableEditing(wrapper);
      if (typeof PageBuilderWidgets !== 'undefined') {
        PageBuilderWidgets.initWidgets(wrapper);
      }
      
      this.updateCanvasEmptyState();
    },

    // Create section wrapper
    createSectionWrapper: function() {
      var wrapper = document.createElement('div');
      wrapper.className = 'section-wrapper';
      return wrapper;
    },

    // Create section control buttons
    createControls: function() {
      return '<div class="section-controls">' +
        '<button onclick="PageBuilderCore.moveSection(this.closest(\'.section-wrapper\'), -1)" title="Move Up">↑</button>' +
        '<button onclick="PageBuilderCore.moveSection(this.closest(\'.section-wrapper\'), 1)" title="Move Down">↓</button>' +
        '<button onclick="PageBuilderCore.editCode(this.closest(\'.section-wrapper\'))" title="Edit Code">&lt;/&gt;</button>' +
        '<button onclick="PageBuilderCore.duplicateSection(this.closest(\'.section-wrapper\'))" title="Duplicate">📋</button>' +
        '<button onclick="PageBuilderCore.deleteSection(this.closest(\'.section-wrapper\'))" title="Delete">🗑️</button>' +
      '</div>';
    },

    // Enable contenteditable on elements
    enableEditing: function(wrapper) {
      wrapper.querySelectorAll('[contenteditable]').forEach(function(el) {
        el.addEventListener('focus', function() {
          el.style.outline = '2px solid #3b82f6';
          el.style.outlineOffset = '2px';
        });
        el.addEventListener('blur', function() {
          el.style.outline = 'none';
        });
      });
    },

    // Move section up or down
    moveSection: function(wrapper, direction) {
      var canvas = document.getElementById('builder-canvas');
      var sections = Array.from(canvas.querySelectorAll('.section-wrapper'));
      var index = sections.indexOf(wrapper);
      var newIndex = index + direction;
      
      if (newIndex < 0 || newIndex >= sections.length) return;
      
      if (direction < 0) {
        canvas.insertBefore(wrapper, sections[newIndex]);
      } else {
        canvas.insertBefore(sections[newIndex], wrapper);
      }
    },

    // Duplicate section
    duplicateSection: function(wrapper) {
      var clone = wrapper.cloneNode(true);
      wrapper.parentNode.insertBefore(clone, wrapper.nextSibling);
      this.enableEditing(clone);
      if (typeof PageBuilderWidgets !== 'undefined') {
        PageBuilderWidgets.initWidgets(clone);
      }
    },

    // Delete section
    deleteSection: function(wrapper) {
      if (!confirm('Delete this section?')) return;
      wrapper.remove();
      this.updateCanvasEmptyState();
    },

    // Edit section code
    editCode: function(wrapper) {
      this.editingSection = wrapper;
      var content = Array.from(wrapper.children)
        .filter(function(child) { return !child.classList.contains('section-controls'); })
        .map(function(child) { return child.outerHTML; }).join('\n');
      
      document.getElementById('code-editor').value = content;
      document.getElementById('code-modal').classList.add('active');
    },

    // Close code modal
    closeCodeModal: function() {
      document.getElementById('code-modal').classList.remove('active');
      this.editingSection = null;
    },

    // Save code from modal
    saveCode: function() {
      if (!this.editingSection) return;
      
      var code = document.getElementById('code-editor').value;
      var preserveCustomCode = document.getElementById('preserve-custom-code').checked;

      this.editingSection.innerHTML = code + this.createControls();
      this.enableEditing(this.editingSection);

      if (!preserveCustomCode) {
        if (typeof PageBuilderWidgets !== 'undefined') {
          PageBuilderWidgets.initWidgets(this.editingSection);
        }
      } else {
        var hasWidgetConfig = this.editingSection.querySelector('.widget-config');
        if (hasWidgetConfig && typeof PageBuilderWidgets !== 'undefined') {
          PageBuilderWidgets.setupLimitCustomInput(this.editingSection);
        }
      }

      this.closeCodeModal();
    },

    // Check if should use root homepage URL
    shouldUseRootHomepageUrl: function() {
      return this.currentPageType === 'home' && document.getElementById('is-default').checked;
    },

    // Sync slug field based on page type
    syncSlugField: function() {
      var slugInput = document.getElementById('seo-slug');
      if (!slugInput) return;

      if (this.shouldUseRootHomepageUrl()) {
        var currentValue = slugInput.value.trim();
        if (currentValue && currentValue !== '/') {
          this.previousEditableSlug = currentValue;
        }
        slugInput.value = '/';
        slugInput.readOnly = true;
        slugInput.placeholder = '/';
        slugInput.title = 'Default Home page always publishes at root URL /';
        slugInput.style.background = '#f3f4f6';
      } else {
        var wasLocked = slugInput.readOnly;
        slugInput.readOnly = false;
        slugInput.placeholder = 'my-awesome-page';
        slugInput.title = '';
        slugInput.style.background = '';

        if (wasLocked && slugInput.value.trim() === '/') {
          var fallbackSlug = this.previousEditableSlug || (this.originalPageSlug && this.originalPageSlug !== 'home' ? this.originalPageSlug : 'home');
          slugInput.value = fallbackSlug;
        }
      }
    },

    // Set page type
    setPageType: function(type) {
      this.currentPageType = type;
      
      document.querySelectorAll('.type-option').forEach(function(opt) {
        opt.classList.toggle('active', opt.dataset.type === type);
      });
      
      var info = document.getElementById('default-info');
      if (type === 'custom') {
        info.style.display = 'none';
        document.getElementById('is-default').checked = false;
        document.getElementById('is-default').disabled = true;
      } else {
        info.style.display = 'block';
        info.textContent = 'When set as default, this page will be used as the main ' + type.replace('_', ' ') + ' page.';
        document.getElementById('is-default').disabled = false;
      }
      
      this.syncSlugField();
    },

    // Load current default pages
    loadCurrentDefaults: function() {
      var container = document.getElementById('defaults-list');
      var types = ['home', 'blog_archive', 'forum_archive', 'product_grid'];
      var self = this;
      
      var html = '';
      var pending = types.length;
      
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
                '<span style="color:var(--success);font-size:0.8rem;">' + publicUrl + '</span>' +
              '</div>';
            } else {
              html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">' +
                '<span>' + icon + '</span><span style="flex:1;">' + label + '</span>' +
                '<span style="color:var(--gray);font-size:0.8rem;">Not set</span>' +
              '</div>';
            }
            
            pending--;
            if (pending === 0) {
              container.innerHTML = html || '<p style="color:var(--gray);">No defaults set</p>';
            }
          })
          .catch(function(e) {
            console.error('Error loading default for', type, e);
            pending--;
          });
      });
    },

    // Update canvas empty state
    updateCanvasEmptyState: function() {
      var canvas = document.getElementById('builder-canvas');
      var hasSections = canvas.querySelectorAll('.section-wrapper').length > 0;
      canvas.classList.toggle('empty', !hasSections);
    },

    // Generate output HTML
    generateOutputHtml: function() {
      var parts = [];
      var self = this;
      
      document.querySelectorAll('#builder-canvas .section-wrapper').forEach(function(wrapper) {
        var cloneWrapper = wrapper.cloneNode(true);
        
        cloneWrapper.querySelectorAll('.section-controls').forEach(function(el) { el.remove(); });
        
        cloneWrapper.querySelectorAll('[contenteditable]').forEach(function(el) {
          el.removeAttribute('contenteditable');
          el.style.outline = '';
          el.style.outlineOffset = '';
        });
        
        cloneWrapper.querySelectorAll('.widget-config').forEach(function(el) { el.remove(); });
        
        cloneWrapper.querySelectorAll('.product-widget-container, .blog-widget-container, .reviews-widget-container').forEach(function(el) {
          el.removeAttribute('id');
          el.innerHTML = '';
        });
        
        var sectionHTML = '<div data-section="true">' + cloneWrapper.innerHTML + '</div>';
        parts.push(sectionHTML);
      });
      
      return parts.join('\n');
    },

    // Set preview mode (desktop/tablet/mobile)
    setPreviewMode: function(mode) {
      var canvas = document.getElementById('builder-canvas');
      canvas.classList.remove('preview-tablet', 'preview-mobile');
      
      if (mode === 'tablet') canvas.classList.add('preview-tablet');
      else if (mode === 'mobile') canvas.classList.add('preview-mobile');
      
      document.querySelectorAll('.preview-mode-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
    },

    // Load existing page
    loadExistingPage: function(name) {
      var self = this;
      
      console.log('Loading page:', name);
      
      fetch('/api/pages/load?name=' + encodeURIComponent(name))
        .then(function(res) {
          console.log('Response status:', res.status);
          if (!res.ok) {
            throw new Error('HTTP ' + res.status + ': ' + res.statusText);
          }
          return res.json();
        })
        .then(function(data) {
          console.log('Response data:', data);
          
          if (data.error) {
            alert('❌ Error: ' + data.error);
            return;
          }
          
          if (data.content) {
            self.editingPageId = data.id ? Number(data.id) : null;
            self.originalPageSlug = (data.slug || name || '').toString().trim();
            self.previousEditableSlug = self.originalPageSlug && self.originalPageSlug !== 'home' ? self.originalPageSlug : '';

            var canvas = document.getElementById('builder-canvas');
            var parser = new DOMParser();
            var doc = parser.parseFromString(data.content, 'text/html');
            
            var titleEl = doc.querySelector('title');
            if (titleEl) document.getElementById('seo-title').value = titleEl.textContent;
            
            var metaDesc = doc.querySelector('meta[name="description"]');
            if (metaDesc) document.getElementById('seo-desc').value = metaDesc.getAttribute('content') || '';
            
            if (data.page_type) self.setPageType(data.page_type);
            document.getElementById('is-default').checked = data.is_default === 1;
            document.getElementById('seo-slug').value = (data.page_type === 'home' && data.is_default === 1) ? '/' : (data.slug || name);
            self.syncSlugField();

            // Load feature image
            var featureImageUrl = data.feature_image_url || '';
            document.getElementById('feature_image_url').value = featureImageUrl;
            if (featureImageUrl) {
              var preview = document.getElementById('feature-preview');
              preview.innerHTML = '<img src="' + featureImageUrl + '" style="width:80px;height:60px;object-fit:cover;border-radius:6px;" onerror="this.style.display=\'none\';">';
              preview.style.display = 'block';
            }
            
            var body = doc.body;
            canvas.innerHTML = '';
            
            if (body) {
              Array.from(body.children).forEach(function(child) {
                if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return;
                
                var wrapper = self.createSectionWrapper();
                var sectionHtml;
                
                if (child.getAttribute && child.getAttribute('data-section') === 'true') {
                  sectionHtml = child.innerHTML;
                } else {
                  sectionHtml = child.outerHTML;
                }
                
                wrapper.innerHTML = sectionHtml + self.createControls();
                canvas.appendChild(wrapper);
                self.enableEditing(wrapper);
                if (typeof PageBuilderWidgets !== 'undefined') {
                  PageBuilderWidgets.initWidgets(wrapper);
                }
              });
            }
            
            self.updateCanvasEmptyState();
            alert('✅ Page loaded!');
          } else if (data.error) {
            alert('❌ Error: ' + data.error);
          } else {
            alert('Page not found or empty');
          }
        })
        .catch(function(err) { 
          console.error('Load error:', err);
          alert('❌ Error: ' + err.message); 
        });
    }
  };

  // Export to global
  global.PageBuilderCore = PageBuilderCore;

})(typeof window !== 'undefined' ? window : this);