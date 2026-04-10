function escapeHtmlAttribute(value) {
  return String(value || '').replace(/"/g, '&quot;');
}

function buildSharedAssetsMarkup() {
  return `<link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/page-builder-runtime.css">
  <script defer src="/js/product-cards.js"><\/script>
  <script defer src="/js/blog-cards.js"><\/script>
  <script defer src="/js/reviews-widget.js"><\/script>
  <script defer src="/js/page-builder/runtime.js"><\/script>`;
}

export function generateOutputHtml({ canvasSelector = '#builder-canvas' } = {}) {
  const parts = [];
  document.querySelectorAll(`${canvasSelector} .section-wrapper`).forEach(wrapper => {
    const cloneWrapper = wrapper.cloneNode(true);
    cloneWrapper.querySelectorAll('.section-controls').forEach(el => el.remove());
    cloneWrapper.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.classList.remove('builder-editable', 'is-editing');
    });
    cloneWrapper.querySelectorAll('.widget-config').forEach(el => el.remove());
    cloneWrapper.querySelectorAll('.product-widget-container, .blog-widget-container, .reviews-widget-container').forEach(el => {
      el.removeAttribute('id');
      el.innerHTML = '';
    });
    parts.push(`<div data-section="true">${cloneWrapper.innerHTML}</div>`);
  });
  return parts.join('\n');
}

export function buildPublishedPageHtml({ title, description, seoOverrideTags = '', html }) {
  const safeDescription = escapeHtmlAttribute(description);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${safeDescription}">${seoOverrideTags}
  ${buildSharedAssetsMarkup()}
</head>
<body class="page-builder-runtime-body">
${html}
</body>
</html>`;
}

export function buildPreviewDocumentHtml({ title, html }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
  ${buildSharedAssetsMarkup()}
</head>
<body class="page-builder-runtime-body">
  ${html}
</body>
</html>`;
}
