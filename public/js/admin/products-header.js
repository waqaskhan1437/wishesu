/**
 * Products header builder.
 */

import { createElement } from '../utils/dom-helper.js';

export function createProductsHeader(onCreate) {
  const header = createElement('div', {
    className: 'view-header'
  });

  const createBtn = createElement('button', {
    className: 'btn btn-primary',
    textContent: 'Create New Product'
  });

  createBtn.addEventListener('click', () => {
    if (typeof onCreate === 'function') onCreate();
  });

  header.appendChild(createBtn);
  return header;
}
