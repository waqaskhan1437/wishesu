var PageBuilderUtils = (function() {
  function createSectionWrapper() {
    var wrapper = document.createElement('div');
    wrapper.className = 'section-wrapper';
    return wrapper;
  }

  function createControls() {
    return `
      <div class="section-controls">
        <button onclick="PageBuilderSections.moveSection(this.closest('.section-wrapper'), -1)" title="Move Up">↑</button>
        <button onclick="PageBuilderSections.moveSection(this.closest('.section-wrapper'), 1)" title="Move Down">↓</button>
        <button onclick="PageBuilderSections.editCode(this.closest('.section-wrapper'))" title="Edit Code">&lt;/&gt;</button>
        <button onclick="PageBuilderSections.duplicateSection(this.closest('.section-wrapper'))" title="Duplicate">📋</button>
        <button onclick="PageBuilderSections.deleteSection(this.closest('.section-wrapper'))" title="Delete">🗑️</button>
      </div>
    `;
  }

  function enableEditing(wrapper) {
    wrapper.querySelectorAll('[contenteditable]').forEach(function(el) {
      el.addEventListener('focus', function() {
        el.style.outline = '2px solid #3b82f6';
        el.style.outlineOffset = '2px';
      });
      el.addEventListener('blur', function() {
        el.style.outline = 'none';
      });
    });
  }

  function updateCanvasEmptyState() {
    var canvas = document.getElementById('builder-canvas');
    if (!canvas) return;
    var hasSections = canvas.querySelectorAll('.section-wrapper').length > 0;
    canvas.classList.toggle('empty', !hasSections);
  }

  function escapeHtml(text) {
    if (!text) return '';
    var d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  function showModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  }

  function hideModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  }

  function getFeatureImageUrl() {
    return document.getElementById('feature_image_url').value.trim();
  }

  function setFeatureImagePreview(url) {
    var preview = document.getElementById('feature-preview');
    if (!preview) return;
    if (url) {
      preview.innerHTML = '<img src="' + url + '" style="width:80px;height:60px;object-fit:cover;border-radius:6px;" onerror="this.style.display=\'none\';">';
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  }

  return {
    createSectionWrapper: createSectionWrapper,
    createControls: createControls,
    enableEditing: enableEditing,
    updateCanvasEmptyState: updateCanvasEmptyState,
    escapeHtml: escapeHtml,
    showModal: showModal,
    hideModal: hideModal,
    getFeatureImageUrl: getFeatureImageUrl,
    setFeatureImagePreview: setFeatureImagePreview
  };
})();
