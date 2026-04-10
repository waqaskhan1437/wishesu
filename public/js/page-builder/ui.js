export function attachBuilderActionDelegates(handlers) {
  const handleClick = event => {
    const actionEl = event.target.closest('[data-builder-action]');
    if (actionEl) {
      const wrapper = actionEl.closest('.section-wrapper');
      switch (actionEl.dataset.builderAction) {
        case 'preview-mode':
          handlers.onPreviewMode?.(actionEl.dataset.mode || 'desktop');
          break;
        case 'load-template':
          handlers.onLoadTemplate?.(actionEl.dataset.template);
          break;
        case 'add-section':
          handlers.onAddSection?.(actionEl.dataset.section);
          break;
        case 'set-page-type':
          handlers.onSetPageType?.(actionEl.dataset.pageType);
          break;
        case 'close-code-modal':
          handlers.onCloseCodeModal?.();
          break;
        case 'save-code':
          handlers.onSaveCode?.();
          break;
        case 'move-up':
          if (wrapper) handlers.onMoveSection?.(wrapper, -1);
          break;
        case 'move-down':
          if (wrapper) handlers.onMoveSection?.(wrapper, 1);
          break;
        case 'edit-code':
          if (wrapper) handlers.onEditCode?.(wrapper);
          break;
        case 'duplicate-section':
          if (wrapper) handlers.onDuplicateSection?.(wrapper);
          break;
        case 'delete-section':
          if (wrapper) handlers.onDeleteSection?.(wrapper);
          break;
      }
      return;
    }

    const faqToggle = event.target.closest('.faq-toggle');
    if (faqToggle && faqToggle.closest('#builder-canvas')) {
      faqToggle.parentElement.classList.toggle('open');
    }
  };

  const handleKeydown = event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const actionEl = event.target.closest('[data-builder-action]');
    if (!actionEl || actionEl.tagName === 'BUTTON') return;
    event.preventDefault();
    actionEl.click();
  };

  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeydown);

  return () => {
    document.removeEventListener('click', handleClick);
    document.removeEventListener('keydown', handleKeydown);
  };
}

export function renderFeaturePreview(url, previewId = 'feature-preview') {
  const preview = document.getElementById(previewId);
  if (!preview) return;

  preview.replaceChildren();
  if (!url) {
    preview.hidden = true;
    return;
  }

  const img = document.createElement('img');
  img.className = 'feature-preview-image';
  img.src = url;
  img.alt = '';
  img.addEventListener('error', () => {
    preview.hidden = true;
  });

  preview.appendChild(img);
  preview.hidden = false;
}

export function createControls() {
  return `
    <div class="section-controls">
      <button type="button" data-builder-action="move-up" title="Move Up">â†‘</button>
      <button type="button" data-builder-action="move-down" title="Move Down">â†“</button>
      <button type="button" data-builder-action="edit-code" title="Edit Code">&lt;/&gt;</button>
      <button type="button" data-builder-action="duplicate-section" title="Duplicate">ðŸ“‹</button>
      <button type="button" data-builder-action="delete-section" title="Delete">ðŸ—‘ï¸</button>
    </div>
  `;
}
