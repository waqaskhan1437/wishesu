import { SECTION_TEMPLATES } from './templates.js';
import { END_SCRIPT } from './script-utils.js';

function removeEditableAttributes(element) {
  if (element.hasAttribute && element.hasAttribute('contenteditable')) {
    element.removeAttribute('contenteditable');
  }
  if (element.style) {
    element.style.outline = '';
    element.style.outlineOffset = '';
  }
  if (element.querySelectorAll) {
    const controls = element.querySelectorAll('.section-controls');
    controls.forEach(ctrl => ctrl.remove());
  }
  if (element.children) {
    Array.from(element.children).forEach(child => {
      removeEditableAttributes(child);
    });
  }
}

export function cleanHtmlString(htmlString) {
  if (!htmlString) return htmlString;
  return htmlString
    .replace(/\s+contenteditable=["']true["']/gi, '')
    .replace(/\s+contenteditable=["']false["']/gi, '')
    .replace(/\s+contenteditable/gi, '')
    .replace(/\s+style=["'][^"']*outline[^"']*["']/gi, function(match) {
      return match
        .replace(/outline[^;]*;?/gi, '')
        .replace(/style=["']\s*["']/gi, '');
    });
}

export function generateOutputHtml() {
  const parts = [];
  parts.push('<style>.section-controls{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;position:absolute!important;width:0!important;height:0!important;overflow:hidden!important;}.section-wrapper{border:none!important;margin:0!important;padding:0!important;}</style>');
  const embeds = [];
  const includes = { product: false, reviews: false, pages: false };
  const defaultHeader = localStorage.getItem('defaultHeader') || SECTION_TEMPLATES.header || '';
  const defaultFooter = localStorage.getItem('defaultFooter') || SECTION_TEMPLATES.footer || '';

  const canvasWrappers = document.querySelectorAll('#builder-canvas .section-wrapper');
  let hasHeader = false;
  let hasFooter = false;

  canvasWrappers.forEach(wrapper => {
    const headerTag = wrapper.querySelector('header');
    const footerTag = wrapper.querySelector('footer');
    if (headerTag) hasHeader = true;
    if (footerTag) hasFooter = true;
  });

  if (defaultHeader && !hasHeader) parts.push(cleanHtmlString(defaultHeader.trim()));

  document.querySelectorAll('#builder-canvas .section-wrapper').forEach(wrapper => {
    const embed = wrapper.getAttribute('data-embed');
    if (embed) {
      const info = JSON.parse(embed);
      parts.push(`<div id="${info.id}"></div>`);
      embeds.push(info);
      if (info.type === 'product') includes.product = true;
      if (info.type === 'reviews') includes.reviews = true;
      if (info.type === 'pages') includes.pages = true;
    } else {
      Array.from(wrapper.children).forEach(child => {
        if (child.classList.contains('section-controls')) return;
        if (child.classList.contains('embed-display')) return;
        const cleanChild = child.cloneNode(true);
        removeEditableAttributes(cleanChild);
        if (cleanChild.classList && cleanChild.classList.contains('section-wrapper')) {
          cleanChild.classList.remove('section-wrapper');
          if (cleanChild.style) {
            cleanChild.style.border = '';
            cleanChild.style.margin = '';
            cleanChild.style.padding = '';
            cleanChild.style.position = '';
          }
        }
        parts.push(cleanChild.outerHTML);
      });
    }
  });

  if (defaultFooter && !hasFooter) parts.push(cleanHtmlString(defaultFooter.trim()));

  if (embeds.length) {
    if (includes.reviews) parts.push('<script src="js/reviews-widget.js?v=1766444251">' + END_SCRIPT);
    if (includes.pages) parts.push('<script src="js/page-list-widget.js?v=1766444251">' + END_SCRIPT);
    let callBlock = includes.product ? '<script type="module">\n' : '<script>\n';
    if (includes.product) {
      callBlock += "  import '/js/product-cards.js?v=1766444251';\n";
    }
    embeds.forEach(info => {
      if (info.type === 'product') {
        callBlock += `  ProductCards.render('${info.id}', ${JSON.stringify(info.options)});\n`;
      } else if (info.type === 'reviews') {
        callBlock += `  ReviewsWidget.render('${info.id}', ${JSON.stringify(info.options)});\n`;
      } else if (info.type === 'pages') {
        callBlock += `  PageListWidget.render('${info.id}', ${JSON.stringify(info.options)});\n`;
      }
    });
    callBlock += END_SCRIPT;
    parts.push(callBlock);
  }

  return parts.join('\n');
}
