import { buildPreviewDocumentHtml, buildPublishedPageHtml, generateOutputHtml } from './page-documents.js';
import { createPageManager } from './page-manager.js';
import { getSectionMarkup, TEMPLATES } from './templates.js';
import { attachBuilderActionDelegates, createControls, renderFeaturePreview } from './ui.js';
import { initDynamicWidgets, setupWidgetConfigInputs } from './widgets.js';

let editingSection = null;

const pageManager = createPageManager({
  buildPreviewDocumentHtml,
  buildPublishedPageHtml,
  createControls,
  createSectionWrapper,
  enableEditing,
  generateOutputHtml,
  initDynamicWidgets,
  renderFeaturePreview,
  updateCanvasEmptyState
});

attachBuilderActionDelegates({
  onPreviewMode: setPreviewMode,
  onLoadTemplate: loadTemplate,
  onAddSection: addSection,
  onSetPageType: pageManager.setPageType,
  onCloseCodeModal: closeCodeModal,
  onSaveCode: saveCode,
  onMoveSection: moveSection,
  onEditCode: editCode,
  onDuplicateSection: duplicateSection,
  onDeleteSection: deleteSection
});

document.addEventListener('DOMContentLoaded', () => {
  updateCanvasEmptyState();
  pageManager.initialize();
  updateSerpPreview();
});

document.getElementById('feature-image-file').addEventListener('change', function() {
  const urlInput = document.getElementById('feature_image_url');
  if (this.files[0]) {
    const reader = new FileReader();
    reader.onload = event => {
      renderFeaturePreview(event.target.result);
    };
    reader.readAsDataURL(this.files[0]);
  } else {
    renderFeaturePreview(urlInput ? urlInput.value.trim() : '');
  }
});

document.getElementById('feature_image_url').addEventListener('input', function() {
  renderFeaturePreview(this.value.trim());
});

document.getElementById('save-btn').addEventListener('click', () => {
  pageManager.savePage();
});

document.getElementById('preview-btn').addEventListener('click', () => {
  pageManager.previewPage();
});

document.getElementById('load-btn').addEventListener('click', () => {
  pageManager.promptAndLoadPage();
});

document.getElementById('code-modal').addEventListener('click', function(event) {
  if (event.target === this) closeCodeModal();
});

function loadTemplate(type) {
  if (!confirm('Load ' + type + ' template? This will replace current content.')) return;

  const canvas = document.getElementById('builder-canvas');
  const template = TEMPLATES[type];
  if (!template) return;

  document.getElementById('seo-title').value = template.title;
  document.getElementById('seo-slug').value = template.slug;
  pageManager.setPageType(template.type);

  canvas.innerHTML = '';

  if (template.content) {
    const wrapper = createSectionWrapper();
    wrapper.innerHTML = template.content + createControls();
    canvas.appendChild(wrapper);
    enableEditing(wrapper);
    initDynamicWidgets(wrapper);
  } else if (template.sections) {
    template.sections.forEach(sectionType => addSection(sectionType));
  }

  updateCanvasEmptyState();
}

function addSection(type) {
  const canvas = document.getElementById('builder-canvas');
  const wrapper = createSectionWrapper();
  const featureImageUrl = document.getElementById('feature_image_url').value.trim();
  const sectionHtml = getSectionMarkup(type, featureImageUrl);

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
    el.addEventListener('focus', () => {
      el.style.outline = '2px solid #3b82f6';
      el.style.outlineOffset = '2px';
    });
    el.addEventListener('blur', () => {
      el.style.outline = 'none';
    });
  });
}

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
    .map(child => child.outerHTML)
    .join('\n');

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

  if (!preserveCustomCode) {
    initDynamicWidgets(editingSection);
  } else if (editingSection.querySelector('.widget-config')) {
    setupWidgetConfigInputs(editingSection);
  }

  closeCodeModal();
}

function updateCanvasEmptyState() {
  const canvas = document.getElementById('builder-canvas');
  const hasSections = canvas.querySelectorAll('.section-wrapper').length > 0;
  canvas.classList.toggle('empty', !hasSections);
}

function setPreviewMode(mode) {
  const canvas = document.getElementById('builder-canvas');
  canvas.classList.remove('preview-tablet', 'preview-mobile');
  if (mode === 'tablet') canvas.classList.add('preview-tablet');
  else if (mode === 'mobile') canvas.classList.add('preview-mobile');

  document.querySelectorAll('.preview-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

let undoStack = [];
let redoStack = [];
let lastSnapshot = '';

function takeSnapshot() {
  const canvas = document.getElementById('builder-canvas');
  const snap = canvas.innerHTML;
  if (snap === lastSnapshot) return;

  undoStack.push(lastSnapshot);
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  lastSnapshot = snap;
  updateUndoRedoButtons();
}

function restoreSnapshot(snap) {
  const canvas = document.getElementById('builder-canvas');
  canvas.innerHTML = snap;
  lastSnapshot = snap;
  updateCanvasEmptyState();

  canvas.querySelectorAll('.section-wrapper').forEach(wrapper => {
    enableEditing(wrapper);
    initDynamicWidgets(wrapper);
  });

  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  if (undoBtn) undoBtn.disabled = undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = redoStack.length === 0;
}

document.getElementById('undo-btn').addEventListener('click', () => {
  if (undoStack.length === 0) return;
  redoStack.push(lastSnapshot);
  restoreSnapshot(undoStack.pop());
});

document.getElementById('redo-btn').addEventListener('click', () => {
  if (redoStack.length === 0) return;
  undoStack.push(lastSnapshot);
  restoreSnapshot(redoStack.pop());
});

(() => {
  const canvas = document.getElementById('builder-canvas');
  lastSnapshot = canvas.innerHTML;

  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(takeSnapshot, 600);
  });

  observer.observe(canvas, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true
  });
})();

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

['seo-title', 'seo-slug', 'seo-desc'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', updateSerpPreview);
});
