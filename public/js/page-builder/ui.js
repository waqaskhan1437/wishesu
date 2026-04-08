var PageBuilderUI = (function() {
  function shouldUseRootHomepageUrl() {
    return PageBuilderState.getStateValue('currentPageType') === 'home' && document.getElementById('is-default').checked;
  }

  function syncSlugField() {
    var slugInput = document.getElementById('seo-slug');
    if (!slugInput) return;

    if (shouldUseRootHomepageUrl()) {
      var currentValue = slugInput.value.trim();
      if (currentValue && currentValue !== '/') {
        PageBuilderState.setState('previousEditableSlug', currentValue);
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
        var fallbackSlug = PageBuilderState.getStateValue('previousEditableSlug') || (PageBuilderState.getStateValue('originalPageSlug') && PageBuilderState.getStateValue('originalPageSlug') !== 'home' ? PageBuilderState.getStateValue('originalPageSlug') : 'home');
        slugInput.value = fallbackSlug;
      }
    }
  }

  function setPageType(type) {
    PageBuilderState.setState('currentPageType', type);
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
    syncSlugField();
  }

  function setPreviewMode(mode) {
    var canvas = document.getElementById('builder-canvas');
    canvas.classList.remove('preview-tablet', 'preview-mobile');
    if (mode === 'tablet') canvas.classList.add('preview-tablet');
    else if (mode === 'mobile') canvas.classList.add('preview-mobile');
    document.querySelectorAll('.preview-mode-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  function updateSerpPreview() {
    var title = document.getElementById('seo-title').value.trim() || 'Page Title';
    var slug = document.getElementById('seo-slug').value.trim() || 'page-slug';
    var desc = document.getElementById('seo-desc').value.trim() || 'Your meta description will appear here...';
    var serpTitle = document.getElementById('serp-title');
    var serpUrl = document.getElementById('serp-url');
    var serpDesc = document.getElementById('serp-desc');
    if (serpTitle) serpTitle.textContent = title.length > 60 ? title.substring(0, 57) + '...' : title;
    if (serpUrl) serpUrl.textContent = window.location.origin + '/' + (slug === '/' ? '' : slug);
    if (serpDesc) serpDesc.textContent = desc.length > 160 ? desc.substring(0, 157) + '...' : desc;
  }

  function openCodeModal() {
    PageBuilderUtils.showModal('code-modal');
  }

  function closeCodeModal() {
    PageBuilderUtils.hideModal('code-modal');
    PageBuilderState.setState('editingSection', null);
  }

  function initFeatureImagePreview() {
    var fileInput = document.getElementById('feature-image-file');
    var urlInput = document.getElementById('feature_image_url');
    var preview = document.getElementById('feature-preview');

    if (fileInput) {
      fileInput.addEventListener('change', function() {
        if (this.files[0]) {
          var reader = new FileReader();
          reader.onload = function(e) {
            preview.innerHTML = '<img src="' + e.target.result + '" style="width:80px;height:60px;object-fit:cover;border-radius:6px;">';
            preview.style.display = 'block';
          };
          reader.readAsDataURL(this.files[0]);
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', function() {
        if (this.value) {
          preview.innerHTML = '<img src="' + this.value + '" style="width:80px;height:60px;object-fit:cover;border-radius:6px;" onerror="this.style.display=\'none\';">';
          preview.style.display = 'block';
        } else {
          preview.style.display = 'none';
        }
      });
    }
  }

  function initSerpPreview() {
    ['seo-title', 'seo-slug', 'seo-desc'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateSerpPreview);
    });
    setTimeout(updateSerpPreview, 500);
  }

  function initSlugSync() {
    var slugInput = document.getElementById('seo-slug');
    var defaultCheckbox = document.getElementById('is-default');

    if (slugInput) {
      slugInput.addEventListener('input', function() {
        if (!slugInput.readOnly) {
          PageBuilderState.setState('previousEditableSlug', slugInput.value.trim());
        }
      });
    }

    if (defaultCheckbox) {
      defaultCheckbox.addEventListener('change', function() {
        syncSlugField();
      });
    }

    syncSlugField();
  }

  function initCodeModal() {
    var modal = document.getElementById('code-modal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) closeCodeModal();
      });
    }
  }

  return {
    shouldUseRootHomepageUrl: shouldUseRootHomepageUrl,
    syncSlugField: syncSlugField,
    setPageType: setPageType,
    setPreviewMode: setPreviewMode,
    updateSerpPreview: updateSerpPreview,
    openCodeModal: openCodeModal,
    closeCodeModal: closeCodeModal,
    initFeatureImagePreview: initFeatureImagePreview,
    initSerpPreview: initSerpPreview,
    initSlugSync: initSlugSync,
    initCodeModal: initCodeModal
  };
})();
