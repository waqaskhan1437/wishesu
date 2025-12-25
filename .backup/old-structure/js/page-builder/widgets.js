import { END_SCRIPT } from './script-utils.js';
import { attachControls, enableEditing } from './editor.js';

export function addProductListSection() {
  const filter = prompt('Product filter (all, featured, top-sales):', 'all');
  const limitStr = prompt('Number of products to show:', '6');
  const colsStr = prompt('Columns (1-4):', '3');
  const showReviews = confirm('Show ratings? OK=Yes / Cancel=No');
  const showDelivery = confirm('Show delivery info? OK=Yes / Cancel=No');
  const options = {
    filter: filter || 'all',
    limit: parseInt(limitStr, 10) || 6,
    columns: parseInt(colsStr, 10) || 3,
    ids: [],
    showReviews: showReviews,
    showDelivery: showDelivery,
    showButton: true
  };
  const id = 'product-cards-' + Date.now();
  const wrapper = document.createElement('div');
  wrapper.className = 'section-wrapper product-list-section';
  const container = document.createElement('div');
  container.id = id;
  wrapper.appendChild(container);
  const pre = document.createElement('pre');
  pre.className = 'embed-display';
  pre.style.marginTop = '10px';
  pre.style.background = '#f9fafb';
  pre.style.padding = '10px';
  pre.style.border = '1px solid #e5e7eb';
  pre.style.borderRadius = '6px';
  const embedCode =
    `<div id="${id}"></div>\n` +
    '<!-- Schema now injected server-side -->\n' +
    '<script type="module">\n' +
    "  import '/js/product-cards.js?v=1766444251';\n" +
    '  ProductCards.render(\'' + id + '\', ' + JSON.stringify(options) + ');\n' + END_SCRIPT;
  pre.textContent = embedCode;
  wrapper.appendChild(pre);
  wrapper.setAttribute('data-embed', JSON.stringify({ type: 'product', id: id, options: options }));
  attachControls(wrapper);
  document.getElementById('builder-canvas').appendChild(wrapper);
  try {
    ProductCards.render(id, options);
  } catch (err) {
    console.error('Failed to render product cards:', err);
  }
}

export function addReviewsListSection() {
  const productIdsStr = prompt('Comma separated product IDs (leave blank for all):', '');
  const ratingStr = prompt('Filter by rating 1-5 (leave blank for all):', '');
  const limitStr = prompt('Number of reviews to show:', '6');
  const colsStr = prompt('Columns (1-4):', '2');
  const showAvatar = confirm('Show reviewer avatars? OK=Yes / Cancel=No');
  const options = {
    productIds: productIdsStr ? productIdsStr.split(',').map(x => x.trim()).filter(Boolean).map(Number) : [],
    ids: [],
    rating: ratingStr ? parseInt(ratingStr, 10) : null,
    limit: parseInt(limitStr, 10) || 6,
    columns: parseInt(colsStr, 10) || 2,
    showAvatar: showAvatar
  };
  const id = 'reviews-list-' + Date.now();
  const wrapper = document.createElement('div');
  wrapper.className = 'section-wrapper reviews-list-section';
  const container = document.createElement('div');
  container.id = id;
  wrapper.appendChild(container);
  const pre = document.createElement('pre');
  pre.className = 'embed-display';
  pre.style.marginTop = '10px';
  pre.style.background = '#f9fafb';
  pre.style.padding = '10px';
  pre.style.border = '1px solid #e5e7eb';
  pre.style.borderRadius = '6px';
  const embedCode =
    `<div id="${id}"></div>\n` +
    '<script src="js/reviews-widget.js?v=1766444251">' + END_SCRIPT + '\n' +
    '<script>\n  ReviewsWidget.render(\'' + id + '\', ' + JSON.stringify(options) + ');\n' + END_SCRIPT;
  pre.textContent = embedCode;
  wrapper.appendChild(pre);
  wrapper.setAttribute('data-embed', JSON.stringify({ type: 'reviews', id: id, options: options }));
  attachControls(wrapper);
  document.getElementById('builder-canvas').appendChild(wrapper);
  try {
    ReviewsWidget.render(id, options);
  } catch (err) {
    console.error('Failed to render reviews:', err);
  }
}

export function addPageListSection() {
  const colsStr = prompt('Columns (1-4):', '1');
  const options = {
    columns: parseInt(colsStr, 10) || 1
  };
  const id = 'page-list-' + Date.now();
  const wrapper = document.createElement('div');
  wrapper.className = 'section-wrapper page-list-section';
  const container = document.createElement('div');
  container.id = id;
  wrapper.appendChild(container);
  const pre = document.createElement('pre');
  pre.className = 'embed-display';
  pre.style.marginTop = '10px';
  pre.style.background = '#f9fafb';
  pre.style.padding = '10px';
  pre.style.border = '1px solid #e5e7eb';
  pre.style.borderRadius = '6px';
  const embedCode =
    `<div id="${id}"></div>\n` +
    '<script src="js/page-list-widget.js?v=1766444251">' + END_SCRIPT + '\n' +
    `<script>\n  PageListWidget.render('${id}', ${JSON.stringify(options)});\n` + END_SCRIPT;
  pre.textContent = embedCode;
  wrapper.appendChild(pre);
  wrapper.setAttribute('data-embed', JSON.stringify({ type: 'pages', id: id, options: options }));
  attachControls(wrapper);
  document.getElementById('builder-canvas').appendChild(wrapper);
  try {
    PageListWidget.render(id, options);
  } catch (err) {
    console.error('Failed to render page list:', err);
  }
}

export function addCustomHtmlSection() {
  const wrapper = document.createElement('div');
  wrapper.className = 'section-wrapper custom-html-section';
  wrapper.innerHTML = '<div contenteditable="true" style="min-height:80px; border:1px dashed #d1d5db; padding:10px;">Click the code (</>) button to paste your custom HTML or edit here...</div>';
  enableEditing(wrapper);
  attachControls(wrapper);
  document.getElementById('builder-canvas').appendChild(wrapper);
}

export function addImageSection() {
  const url = prompt('Enter the image URL:');
  if (!url) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'section-wrapper image-section';
  const img = document.createElement('img');
  img.src = url;
  img.style.width = '100%';
  img.style.display = 'block';
  wrapper.appendChild(img);
  attachControls(wrapper);
  document.getElementById('builder-canvas').appendChild(wrapper);
}
