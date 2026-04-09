function escapeHtmlAttribute(value) {
  return String(value || '').replace(/"/g, '&quot;');
}

function buildWidgetRuntimeScript({ preview = false, includeFaq = false, includeCountdown = false } = {}) {
  const productIdFactory = preview
    ? "var cid = 'pc-preview-' + i;"
    : "var cid = 'pc-' + i + '-' + Date.now();";
  const blogIdFactory = preview
    ? "var cid = 'bc-preview-' + i;"
    : "var cid = 'bc-' + i + '-' + Date.now();";
  const reviewIdFactory = preview
    ? "var cid = 'rw-preview-' + i;"
    : "var cid = 'rw-' + i + '-' + Date.now();";

  const faqCode = includeFaq
    ? `
  document.querySelectorAll('.faq-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() { this.parentElement.classList.toggle('open'); });
  });`
    : '';

  const countdownCode = includeCountdown
    ? `
  document.querySelectorAll('.countdown-timer').forEach(function(timer) {
    var endAttr = timer.getAttribute('data-end');
    var end = endAttr ? new Date(endAttr).getTime() : Date.now() + 7*24*60*60*1000;
    function tick() {
      var now = Date.now();
      var diff = Math.max(0, end - now);
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      var de = timer.querySelector('.countdown-days'); if(de) de.textContent = String(d).padStart(2,'0');
      var he = timer.querySelector('.countdown-hours'); if(he) he.textContent = String(h).padStart(2,'0');
      var me = timer.querySelector('.countdown-mins'); if(me) me.textContent = String(m).padStart(2,'0');
      var se = timer.querySelector('.countdown-secs'); if(se) se.textContent = String(s).padStart(2,'0');
      if (diff > 0) requestAnimationFrame(function(){ setTimeout(tick, 1000); });
    }
    tick();
  });`
    : '';

  return `document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[data-embed*="product"]').forEach(function(el, i) {
    if (typeof ProductCards !== 'undefined') {
      ${productIdFactory}
      el.id = cid;
      var config = {limit:6,columns:3,filter:'all',layout:'grid'};
      try { config = Object.assign(config, JSON.parse(el.getAttribute('data-embed'))); } catch(e) {}
      if (config.layout === 'slider') {
        ProductCards.renderSlider ? ProductCards.renderSlider(cid, config) : ProductCards.render(cid, config);
      } else {
        ProductCards.render(cid, config);
      }
    }
  });
  document.querySelectorAll('[data-embed*="blog"]').forEach(function(el, i) {
    if (typeof BlogCards !== 'undefined') {
      ${blogIdFactory}
      el.id = cid;
      var config = {limit:6,columns:3,layout:'grid'};
      try { config = Object.assign(config, JSON.parse(el.getAttribute('data-embed'))); } catch(e) {}
      if (config.layout === 'slider') {
        BlogCards.renderSlider ? BlogCards.renderSlider(cid, config) : BlogCards.render(cid, config);
      } else {
        BlogCards.render(cid, {limit:config.limit,columns:config.columns,showPagination:false});
      }
    }
  });
  document.querySelectorAll('[data-embed*="review"]').forEach(function(el, i) {
    if (typeof ReviewsWidget !== 'undefined') {
      ${reviewIdFactory}
      el.id = cid;
      var config = {limit:6,columns:3,minRating:5,showAvatar:true};
      try { config = Object.assign(config, JSON.parse(el.getAttribute('data-embed'))); } catch(e) {}
      ReviewsWidget.render(cid, config);
    }
  });${faqCode}${countdownCode}
});`;
}

function buildSharedAssetsMarkup() {
  return `<link rel="preload" href="/css/style.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/css/style.css"></noscript>
  <script defer src="/js/product-cards.js"><\/script>
  <script defer src="/js/blog-cards.js"><\/script>
  <script defer src="/js/reviews-widget.js"><\/script>`;
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
  const runtimeScript = buildWidgetRuntimeScript({ includeFaq: true, includeCountdown: true });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${safeDescription}">${seoOverrideTags}
  ${buildSharedAssetsMarkup()}
  <style>.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}.faq-item.open .faq-answer{max-height:500px !important;}.faq-item.open .faq-toggle span:last-child{transform:rotate(180deg);}</style>
 </head>
 <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
${html}
<script>
${runtimeScript}
<\/script>
</body>
</html>`;
}

export function buildPreviewDocumentHtml({ title, html }) {
  const runtimeScript = buildWidgetRuntimeScript({ preview: true });

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title>${buildSharedAssetsMarkup()}</head><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${html}<script>
${runtimeScript}
<\/script></body></html>`;
}
