function escapeHtmlAttribute(value) {
  return String(value || '').replace(/"/g, '&quot;');
}

function buildSharedAssetsMarkup() {
  return `<link rel="stylesheet" href="/css/style.css">
  <script defer src="/js/product-cards.js"><\/script>
  <script defer src="/js/blog-cards.js"><\/script>
  <script defer src="/js/reviews-widget.js"><\/script>
  <script defer src="/js/page-builder/runtime.js"><\/script>`;
}

function buildRuntimeStyles() {
  return `<style>
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
    .faq-item.open .faq-answer{max-height:500px !important;}
    .faq-item.open .faq-toggle span:last-child{transform:rotate(180deg);}
    .forum-question-card:hover{transform:translateY(-2px);box-shadow:0 4px 15px rgba(0,0,0,0.1);}
  </style>`;
}

export function generateOutputHtml({ canvasSelector = '#builder-canvas' } = {}) {
  const parts = [];
  document.querySelectorAll(`${canvasSelector} .section-wrapper`).forEach(wrapper => {
    const cloneWrapper = wrapper.cloneNode(true);
    cloneWrapper.querySelectorAll('.section-controls').forEach(el => el.remove());
    cloneWrapper.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
      el.style.outline = '';
      el.style.outlineOffset = '';
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
  ${buildRuntimeStyles()}
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
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
  ${buildRuntimeStyles()}
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${html}
</body>
</html>`;
}
