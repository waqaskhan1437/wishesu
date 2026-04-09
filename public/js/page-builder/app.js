import { buildPreviewDocumentHtml, buildPublishedPageHtml, generateOutputHtml } from './page-documents.js';
import { getSectionMarkup, TEMPLATES } from './templates.js';
import { attachBuilderActionDelegates, createControls, renderFeaturePreview } from './ui.js';
import { initDynamicWidgets } from './widgets.js';

    // State
    let currentPageType = 'custom';
    let editingSection = null;
    let editingPageId = null;
    let originalPageSlug = '';
    let previousEditableSlug = '';
    
    attachBuilderActionDelegates({
      onPreviewMode: setPreviewMode,
      onLoadTemplate: loadTemplate,
      onAddSection: addSection,
      onSetPageType: setPageType,
      onCloseCodeModal: closeCodeModal,
      onSaveCode: saveCode,
      onMoveSection: moveSection,
      onEditCode: editCode,
      onDuplicateSection: duplicateSection,
      onDeleteSection: deleteSection
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      updateCanvasEmptyState();
      loadCurrentDefaults();

      const slugInput = document.getElementById('seo-slug');
      const defaultCheckbox = document.getElementById('is-default');
      if (slugInput) {
        slugInput.addEventListener('input', () => {
          if (!slugInput.readOnly) {
            previousEditableSlug = slugInput.value.trim();
          }
        });
      }
      if (defaultCheckbox) {
        defaultCheckbox.addEventListener('change', () => {
          syncSlugField();
        });
      }
      syncSlugField();

      const params = new URLSearchParams(window.location.search);
      const editPage = params.get('edit');
      if (editPage) loadExistingPage(editPage);
    });

    // Feature image preview
    document.getElementById('feature-image-file').addEventListener('change', function() {
      const urlInput = document.getElementById('feature_image_url');
      if (this.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          renderFeaturePreview(e.target.result);
        };
        reader.readAsDataURL(this.files[0]);
      } else {
        renderFeaturePreview(urlInput ? urlInput.value.trim() : '');
      }
    });
    document.getElementById('feature_image_url').addEventListener('input', function() {
      renderFeaturePreview(this.value.trim());
    });

    // Load Template
    function loadTemplate(type) {
      if (!confirm('Load ' + type + ' template? This will replace current content.')) return;
      
      const canvas = document.getElementById('builder-canvas');
      const template = TEMPLATES[type];
      if (!template) return;
      
      document.getElementById('seo-title').value = template.title;
      document.getElementById('seo-slug').value = template.slug;
      setPageType(template.type);
      
      canvas.innerHTML = '';
      
      if (template.content) {
        const wrapper = createSectionWrapper();
        wrapper.innerHTML = template.content + createControls();
        canvas.appendChild(wrapper);
      } else if (template.sections) {
        template.sections.forEach(sectionType => addSection(sectionType));
      }
      
      updateCanvasEmptyState();
    }

    // Add Section
    function addSection(type) {
      const canvas = document.getElementById('builder-canvas');
      const wrapper = createSectionWrapper();
      const sectionHtml = getSectionMarkup(type, document.getElementById('feature_image_url').value.trim());
      wrapper.innerHTML = sectionHtml + createControls();
      canvas.appendChild(wrapper);
      enableEditing(wrapper);
      updateCanvasEmptyState();
      initDynamicWidgets(wrapper);
    }

    function createSectionWrapper() {
      const wrapper = document.createElement('div');
      wrapper.className = 'section-wrapper';
      return wrapper;
    }

    function enableEditing(wrapper) {
      wrapper.querySelectorAll('[contenteditable]').forEach(el => {
        el.addEventListener('focus', () => { el.style.outline = '2px solid #3b82f6'; el.style.outlineOffset = '2px'; });
        el.addEventListener('blur', () => { el.style.outline = 'none'; });
      });
    }

    // Section Actions
    function moveSection(wrapper, direction) {
      const canvas = document.getElementById('builder-canvas');
      const sections = Array.from(canvas.querySelectorAll('.section-wrapper'));
      const index = sections.indexOf(wrapper);
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= sections.length) return;
      if (direction < 0) canvas.insertBefore(wrapper, sections[newIndex]);
      else canvas.insertBefore(sections[newIndex], wrapper);
    }

    function duplicateSection(wrapper) {
      const clone = wrapper.cloneNode(true);
      wrapper.parentNode.insertBefore(clone, wrapper.nextSibling);
      enableEditing(clone);
      initDynamicWidgets(clone);
    }

    function deleteSection(wrapper) {
      if (!confirm('Delete this section?')) return;
      wrapper.remove();
      updateCanvasEmptyState();
    }

    function editCode(wrapper) {
      editingSection = wrapper;
      const content = Array.from(wrapper.children)
        .filter(child => !child.classList.contains('section-controls'))
        .map(child => child.outerHTML).join('\n');
      document.getElementById('code-editor').value = content;
      document.getElementById('code-modal').classList.add('active');
    }

    function closeCodeModal() {
      document.getElementById('code-modal').classList.remove('active');
      editingSection = null;
    }

    function saveCode() {
      if (!editingSection) return;
      const code = document.getElementById('code-editor').value;
      const preserveCustomCode = document.getElementById('preserve-custom-code').checked;

      editingSection.innerHTML = code + createControls();
      enableEditing(editingSection);

      // Only re-init widgets if user unchecked "Preserve Custom Code"
      // OR if there's a widget-config panel that needs event listeners
      if (!preserveCustomCode) {
        initDynamicWidgets(editingSection);
      } else {
        // Still setup event listeners for widget-config if present
        const hasWidgetConfig = editingSection.querySelector('.widget-config');
        if (hasWidgetConfig) {
          setupLimitCustomInput(editingSection);
        }
      }

      closeCodeModal();
    }

    // Page Type
    function shouldUseRootHomepageUrl() {
      return currentPageType === 'home' && document.getElementById('is-default').checked;
    }

    function syncSlugField() {
      const slugInput = document.getElementById('seo-slug');
      if (!slugInput) return;

      if (shouldUseRootHomepageUrl()) {
        const currentValue = slugInput.value.trim();
        if (currentValue && currentValue !== '/') {
          previousEditableSlug = currentValue;
        }
        slugInput.value = '/';
        slugInput.readOnly = true;
        slugInput.placeholder = '/';
        slugInput.title = 'Default Home page always publishes at root URL /';
        slugInput.style.background = '#f3f4f6';
      } else {
        const wasLocked = slugInput.readOnly;
        slugInput.readOnly = false;
        slugInput.placeholder = 'my-awesome-page';
        slugInput.title = '';
        slugInput.style.background = '';

        if (wasLocked && slugInput.value.trim() === '/') {
          const fallbackSlug = previousEditableSlug || (originalPageSlug && originalPageSlug !== 'home' ? originalPageSlug : 'home');
          slugInput.value = fallbackSlug;
        }
      }
    }

    function setPageType(type) {
      currentPageType = type;
      document.querySelectorAll('.type-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.type === type);
      });
      const info = document.getElementById('default-info');
      if (type === 'custom') {
        info.style.display = 'none';
        document.getElementById('is-default').checked = false;
        document.getElementById('is-default').disabled = true;
      } else {
        info.style.display = 'block';
        info.textContent = `When set as default, this page will be used as the main ${type.replace('_', ' ')} page.`;
        document.getElementById('is-default').disabled = false;
      }
      syncSlugField();
    }

    // Load Current Defaults
    async function loadCurrentDefaults() {
      const container = document.getElementById('defaults-list');
      const types = ['home', 'blog_archive', 'forum_archive', 'product_grid'];
      let html = '';
      for (const type of types) {
        try {
          const res = await fetch(`/api/pages/default?type=${type}`);
          const data = await res.json();
          const label = type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
          const icon = type === 'home' ? '🏠' : type === 'blog_archive' ? '📝' : type === 'forum_archive' ? '💬' : '🛒';
          if (data.page) {
            const publicUrl = data.page.public_url || (type === 'home' ? '/' : `/${data.page.slug}`);
            html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
              <span>${icon}</span><span style="flex:1;font-weight:600;">${label}</span>
              <span style="color:var(--success);font-size:0.8rem;">${publicUrl}</span>
            </div>`;
          } else {
            html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
              <span>${icon}</span><span style="flex:1;">${label}</span>
              <span style="color:var(--gray);font-size:0.8rem;">Not set</span>
            </div>`;
          }
        } catch (e) { console.error('Error loading default for', type); }
      }
      container.innerHTML = html || '<p style="color:var(--gray);">No defaults set</p>';
    }

    function updateCanvasEmptyState() {
      const canvas = document.getElementById('builder-canvas');
      const hasSections = canvas.querySelectorAll('.section-wrapper').length > 0;
      canvas.classList.toggle('empty', !hasSections);
    }
    // Save Page
    document.getElementById('save-btn').addEventListener('click', async () => {
      const title = document.getElementById('seo-title').value.trim();
      let slug = document.getElementById('seo-slug').value.trim();
      const desc = document.getElementById('seo-desc').value.trim();
      const isDefault = document.getElementById('is-default').checked;
      const useRootHomepageUrl = currentPageType === 'home' && isDefault;

      const saveBtn = document.getElementById('save-btn');
      const originalText = saveBtn.textContent; saveBtn.textContent = '⏳ Saving...'; saveBtn.disabled = true;
      while (typeof window.isUploadInProgress === 'function' && window.isUploadInProgress()) { await new Promise(r => setTimeout(r, 200)); }
      let featureImageUrl = document.getElementById('feature_image_url').value.trim();
      if (typeof window.getUploadedFiles === 'function') {
        const uploads = window.getUploadedFiles(); if (uploads['feature-image-file']) featureImageUrl = uploads['feature-image-file'];
      }

      if (!title) {
        // Restore button state before exiting due to validation failure
        alert('Please enter a Page Title');
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        return;
      }
      if (useRootHomepageUrl) {
        slug = '/';
        document.getElementById('seo-slug').value = '/';
      } else if (!slug) {
        slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        document.getElementById('seo-slug').value = slug;
      }
      
      const html = generateOutputHtml();
      const ogTitle = document.getElementById('seo-og-title').value.trim();
      const ogDesc = document.getElementById('seo-og-desc').value.trim();
      const ogImage = document.getElementById('seo-og-image').value.trim() || featureImageUrl;
      const canonicalUrl = document.getElementById('seo-canonical').value.trim();
      const robotsMeta = document.getElementById('seo-robots').value;

      let seoOverrideTags = '';
      if (ogTitle) seoOverrideTags += `\n  <meta property="og:title" content="${ogTitle.replace(/"/g, '&quot;')}">`;
      if (ogDesc) seoOverrideTags += `\n  <meta property="og:description" content="${ogDesc.replace(/"/g, '&quot;')}">`;
      if (ogImage) seoOverrideTags += `\n  <meta property="og:image" content="${ogImage}">`;
      if (ogTitle) seoOverrideTags += `\n  <meta name="twitter:title" content="${ogTitle.replace(/"/g, '&quot;')}">`;
      if (ogDesc) seoOverrideTags += `\n  <meta name="twitter:description" content="${ogDesc.replace(/"/g, '&quot;')}">`;
      if (ogImage) seoOverrideTags += `\n  <meta name="twitter:image" content="${ogImage}">`;
      if (canonicalUrl) seoOverrideTags += `\n  <link rel="canonical" href="${canonicalUrl}">`;
      if (robotsMeta) seoOverrideTags += `\n  <meta name="robots" content="${robotsMeta}">`;

      const fullHTML = buildPublishedPageHtml({
        title,
        description: desc,
        seoOverrideTags,
        html
      });

      try {
        const payload = {
          title: title,
          slug: slug,
          content: fullHTML,
          meta_description: desc,
          page_type: currentPageType,
          is_default: isDefault && currentPageType !== 'custom',
          feature_image_url: featureImageUrl,
          status: 'published'
        };
        if (editingPageId) {
          payload.id = editingPageId;
        } else if (originalPageSlug) {
          payload.original_slug = originalPageSlug;
        }

        // Save full page using /api/page/save so that title and meta description are persisted
        const res = await fetch('/api/page/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        // Restore button state regardless of outcome
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        if (data.success) {
          // Use slug returned from API if available (handles uniqueness)
          const savedSlug = data.slug || slug;
          const publicUrl = data.public_url || (useRootHomepageUrl ? '/' : `/${savedSlug}`);
          if (data.id) editingPageId = Number(data.id);
          originalPageSlug = savedSlug;
          previousEditableSlug = savedSlug;
          document.getElementById('seo-slug').value = useRootHomepageUrl ? '/' : savedSlug;
          syncSlugField();
          alert(`✅ Page saved!

URL: ${window.location.origin}${publicUrl}`);
          loadCurrentDefaults();
        } else {
          alert('❌ Save failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err) {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        alert('❌ Error: ' + err.message);
      }
    });

    // Preview
    document.getElementById('preview-btn').addEventListener('click', () => {
      const html = generateOutputHtml();
      const title = document.getElementById('seo-title').value || 'Preview';
      const previewWindow = window.open('', 'preview', 'width=1200,height=800');
      previewWindow.document.write(buildPreviewDocumentHtml({ title, html }));
      previewWindow.document.close();
    });

    // Load
    document.getElementById('load-btn').addEventListener('click', async () => {
      const name = prompt('Enter page slug to load:');
      if (!name) return;
      loadExistingPage(name);
    });

    async function loadExistingPage(name) {
      try {
        const res = await fetch(`/api/pages/load?name=${encodeURIComponent(name)}`);
        const data = await res.json();
        
        if (data.content) {
          editingPageId = data.id ? Number(data.id) : null;
          originalPageSlug = (data.slug || name || '').toString().trim();
          previousEditableSlug = originalPageSlug && originalPageSlug !== 'home' ? originalPageSlug : '';

          const canvas = document.getElementById('builder-canvas');
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.content, 'text/html');
          
          const titleEl = doc.querySelector('title');
          if (titleEl) document.getElementById('seo-title').value = titleEl.textContent;
          
          const metaDesc = doc.querySelector('meta[name="description"]');
          if (metaDesc) document.getElementById('seo-desc').value = metaDesc.getAttribute('content') || '';
          
          if (data.page_type) setPageType(data.page_type);
          document.getElementById('is-default').checked = data.is_default === 1;
          document.getElementById('seo-slug').value = (data.page_type === 'home' && data.is_default === 1) ? '/' : (data.slug || name);
          syncSlugField();

          // Load feature image
          const featureImageUrl = data.feature_image_url || '';
          document.getElementById('feature_image_url').value = featureImageUrl;
          renderFeaturePreview(featureImageUrl);
          
          const body = doc.body;
          canvas.innerHTML = '';
          
          if (body) {
            Array.from(body.children).forEach(child => {
              if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return;
              const wrapper = createSectionWrapper();
              // If the saved element contains our section marker, unwrap its contents
              let sectionHtml;
              if (child.getAttribute && child.getAttribute('data-section') === 'true') {
                sectionHtml = child.innerHTML;
              } else {
                sectionHtml = child.outerHTML;
              }
              wrapper.innerHTML = sectionHtml + createControls();
              canvas.appendChild(wrapper);
              enableEditing(wrapper);
              initDynamicWidgets(wrapper);
            });
          }
          
          updateCanvasEmptyState();
          alert('✅ Page loaded!');
        } else { alert('Page not found or empty'); }
      } catch (err) { alert('❌ Error: ' + err.message); }
    }

    document.getElementById('code-modal').addEventListener('click', function(e) {
      if (e.target === this) closeCodeModal();
    });

    // Mobile/Tablet preview mode
    function setPreviewMode(mode) {
      const canvas = document.getElementById('builder-canvas');
      canvas.classList.remove('preview-tablet', 'preview-mobile');
      if (mode === 'tablet') canvas.classList.add('preview-tablet');
      else if (mode === 'mobile') canvas.classList.add('preview-mobile');
      document.querySelectorAll('.preview-mode-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });
    }

    // Undo / Redo history
    var undoStack = [];
    var redoStack = [];
    var lastSnapshot = '';

    function takeSnapshot() {
      var canvas = document.getElementById('builder-canvas');
      var snap = canvas.innerHTML;
      if (snap === lastSnapshot) return;
      undoStack.push(lastSnapshot);
      if (undoStack.length > 50) undoStack.shift();
      redoStack = [];
      lastSnapshot = snap;
      updateUndoRedoButtons();
    }

    function restoreSnapshot(snap) {
      var canvas = document.getElementById('builder-canvas');
      canvas.innerHTML = snap;
      lastSnapshot = snap;
      updateCanvasEmptyState();
      canvas.querySelectorAll('.section-wrapper').forEach(function(w) {
        enableEditing(w);
        initDynamicWidgets(w);
      });
      updateUndoRedoButtons();
    }

    function updateUndoRedoButtons() {
      var undoBtn = document.getElementById('undo-btn');
      var redoBtn = document.getElementById('redo-btn');
      if (undoBtn) undoBtn.disabled = undoStack.length === 0;
      if (redoBtn) redoBtn.disabled = redoStack.length === 0;
    }

    document.getElementById('undo-btn').addEventListener('click', function() {
      if (undoStack.length === 0) return;
      redoStack.push(lastSnapshot);
      restoreSnapshot(undoStack.pop());
    });

    document.getElementById('redo-btn').addEventListener('click', function() {
      if (redoStack.length === 0) return;
      undoStack.push(lastSnapshot);
      restoreSnapshot(redoStack.pop());
    });

    // Capture snapshots on mutations
    (function() {
      var canvas = document.getElementById('builder-canvas');
      lastSnapshot = canvas.innerHTML;
      var debounceTimer = null;
      var observer = new MutationObserver(function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(takeSnapshot, 600);
      });
      observer.observe(canvas, { childList: true, subtree: true, characterData: true, attributes: true });
    })();

    // Live SERP preview
    function updateSerpPreview() {
      const title = document.getElementById('seo-title').value.trim() || 'Page Title';
      const slug = document.getElementById('seo-slug').value.trim() || 'page-slug';
      const desc = document.getElementById('seo-desc').value.trim() || 'Your meta description will appear here...';
      const serpTitle = document.getElementById('serp-title');
      const serpUrl = document.getElementById('serp-url');
      const serpDesc = document.getElementById('serp-desc');
      if (serpTitle) serpTitle.textContent = title.length > 60 ? title.substring(0, 57) + '...' : title;
      if (serpUrl) serpUrl.textContent = window.location.origin + '/' + (slug === '/' ? '' : slug);
      if (serpDesc) serpDesc.textContent = desc.length > 160 ? desc.substring(0, 157) + '...' : desc;
    }
    ['seo-title', 'seo-slug', 'seo-desc'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateSerpPreview);
    });
    setTimeout(updateSerpPreview, 500);




