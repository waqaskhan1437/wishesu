const DEFAULT_PAGE_TYPES = ['home', 'blog_archive', 'forum_archive', 'product_grid'];

function getPageTypeIcon(type) {
  if (type === 'home') return '🏠';
  if (type === 'blog_archive') return '📝';
  if (type === 'forum_archive') return '💬';
  return '🛒';
}

function getPageTypeLabel(type) {
  return type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function buildSeoOverrideTags({ ogTitle, ogDesc, ogImage, canonicalUrl, robotsMeta }) {
  let seoOverrideTags = '';
  if (ogTitle) seoOverrideTags += `\n  <meta property="og:title" content="${ogTitle.replace(/"/g, '&quot;')}">`;
  if (ogDesc) seoOverrideTags += `\n  <meta property="og:description" content="${ogDesc.replace(/"/g, '&quot;')}">`;
  if (ogImage) seoOverrideTags += `\n  <meta property="og:image" content="${ogImage}">`;
  if (ogTitle) seoOverrideTags += `\n  <meta name="twitter:title" content="${ogTitle.replace(/"/g, '&quot;')}">`;
  if (ogDesc) seoOverrideTags += `\n  <meta name="twitter:description" content="${ogDesc.replace(/"/g, '&quot;')}">`;
  if (ogImage) seoOverrideTags += `\n  <meta name="twitter:image" content="${ogImage}">`;
  if (canonicalUrl) seoOverrideTags += `\n  <link rel="canonical" href="${canonicalUrl}">`;
  if (robotsMeta) seoOverrideTags += `\n  <meta name="robots" content="${robotsMeta}">`;
  return seoOverrideTags;
}

export function createPageManager(deps) {
  let currentPageType = 'custom';
  let editingPageId = null;
  let originalPageSlug = '';
  let previousEditableSlug = '';

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
      slugInput.classList.add('field-readonly-locked');
      return;
    }

    const wasLocked = slugInput.readOnly;
    slugInput.readOnly = false;
    slugInput.placeholder = 'my-awesome-page';
    slugInput.title = '';
    slugInput.classList.remove('field-readonly-locked');

    if (wasLocked && slugInput.value.trim() === '/') {
      const fallbackSlug = previousEditableSlug || (originalPageSlug && originalPageSlug !== 'home' ? originalPageSlug : 'home');
      slugInput.value = fallbackSlug;
    }
  }

  function setPageType(type) {
    currentPageType = type;
    document.querySelectorAll('.type-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.type === type);
    });

    const info = document.getElementById('default-info');
    const isDefault = document.getElementById('is-default');
    if (!info || !isDefault) {
      syncSlugField();
      return;
    }

    if (type === 'custom') {
      info.hidden = true;
      isDefault.checked = false;
      isDefault.disabled = true;
    } else {
      info.hidden = false;
      info.textContent = `When set as default, this page will be used as the main ${type.replace('_', ' ')} page.`;
      isDefault.disabled = false;
    }

    syncSlugField();
  }

  async function loadCurrentDefaults() {
    const container = document.getElementById('defaults-list');
    if (!container) return;

    let html = '';
    for (const type of DEFAULT_PAGE_TYPES) {
      try {
        const res = await fetch(`/api/pages/default?type=${type}`);
        const data = await res.json();
        const label = getPageTypeLabel(type);
        const icon = getPageTypeIcon(type);
        if (data.page) {
          const publicUrl = data.page.public_url || (type === 'home' ? '/' : `/${data.page.slug}`);
          html += `<div class="pbx-0174">
              <span>${icon}</span><span class="pbx-0175">${label}</span>
              <span class="pbx-0176">${publicUrl}</span>
            </div>`;
        } else {
          html += `<div class="pbx-0174">
              <span>${icon}</span><span class="pbx-0177">${label}</span>
              <span class="pbx-0178">Not set</span>
            </div>`;
        }
      } catch (error) {
        console.error('Error loading default for', type, error);
      }
    }

    container.innerHTML = html || '<p class="pbx-0179">No defaults set</p>';
  }

  async function savePage() {
    const title = document.getElementById('seo-title').value.trim();
    let slug = document.getElementById('seo-slug').value.trim();
    const desc = document.getElementById('seo-desc').value.trim();
    const isDefault = document.getElementById('is-default').checked;
    const useRootHomepageUrl = shouldUseRootHomepageUrl();

    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '⏳ Saving...';
    saveBtn.disabled = true;

    while (typeof window.isUploadInProgress === 'function' && window.isUploadInProgress()) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    let featureImageUrl = document.getElementById('feature_image_url').value.trim();
    if (typeof window.getUploadedFiles === 'function') {
      const uploads = window.getUploadedFiles();
      if (uploads['feature-image-file']) featureImageUrl = uploads['feature-image-file'];
    }

    if (!title) {
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

    const html = deps.generateOutputHtml();
    const seoOverrideTags = buildSeoOverrideTags({
      ogTitle: document.getElementById('seo-og-title').value.trim(),
      ogDesc: document.getElementById('seo-og-desc').value.trim(),
      ogImage: document.getElementById('seo-og-image').value.trim() || featureImageUrl,
      canonicalUrl: document.getElementById('seo-canonical').value.trim(),
      robotsMeta: document.getElementById('seo-robots').value
    });

    const fullHTML = deps.buildPublishedPageHtml({
      title,
      description: desc,
      seoOverrideTags,
      html
    });

    try {
      const payload = {
        title,
        slug,
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

      const res = await fetch('/api/page/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      saveBtn.textContent = originalText;
      saveBtn.disabled = false;

      if (!data.success) {
        alert('❌ Save failed: ' + (data.error || 'Unknown error'));
        return;
      }

      const savedSlug = data.slug || slug;
      const publicUrl = data.public_url || (useRootHomepageUrl ? '/' : `/${savedSlug}`);
      if (data.id) editingPageId = Number(data.id);
      originalPageSlug = savedSlug;
      previousEditableSlug = savedSlug;
      document.getElementById('seo-slug').value = useRootHomepageUrl ? '/' : savedSlug;
      syncSlugField();
      alert(`✅ Page saved!\n\nURL: ${window.location.origin}${publicUrl}`);
      await loadCurrentDefaults();
    } catch (error) {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
      alert('❌ Error: ' + error.message);
    }
  }

  function previewPage() {
    const html = deps.generateOutputHtml();
    const title = document.getElementById('seo-title').value || 'Preview';
    const previewWindow = window.open('', 'preview', 'width=1200,height=800');
    previewWindow.document.write(deps.buildPreviewDocumentHtml({ title, html }));
    previewWindow.document.close();
  }

  async function loadExistingPage(name) {
    try {
      const res = await fetch(`/api/pages/load?name=${encodeURIComponent(name)}`);
      const data = await res.json();

      if (!data.content) {
        alert('Page not found or empty');
        return;
      }

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

      const featureImageUrl = data.feature_image_url || '';
      document.getElementById('feature_image_url').value = featureImageUrl;
      deps.renderFeaturePreview(featureImageUrl);

      canvas.innerHTML = '';
      if (doc.body) {
        Array.from(doc.body.children).forEach(child => {
          if (child.tagName === 'SCRIPT' || child.tagName === 'STYLE') return;

          const wrapper = deps.createSectionWrapper();
          const sectionHtml = child.getAttribute && child.getAttribute('data-section') === 'true'
            ? child.innerHTML
            : child.outerHTML;
          wrapper.innerHTML = sectionHtml + deps.createControls();
          canvas.appendChild(wrapper);
          deps.enableEditing(wrapper);
          deps.initDynamicWidgets(wrapper);
        });
      }

      deps.updateCanvasEmptyState();
      alert('✅ Page loaded!');
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  }

  async function promptAndLoadPage() {
    const name = prompt('Enter page slug to load:');
    if (!name) return;
    await loadExistingPage(name);
  }

  function initialize() {
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
      defaultCheckbox.addEventListener('change', syncSlugField);
    }

    syncSlugField();

    const params = new URLSearchParams(window.location.search);
    const editPage = params.get('edit');
    if (editPage) loadExistingPage(editPage);
  }

  return {
    initialize,
    loadCurrentDefaults,
    loadExistingPage,
    previewPage,
    promptAndLoadPage,
    savePage,
    setPageType
  };
}
