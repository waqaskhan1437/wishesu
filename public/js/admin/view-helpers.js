/**
 * Shared view helpers.
 */

import { createElement } from '../utils/dom-helper.js';

export function createViewHeader(title, actions = []) {
  const header = createElement('div', {
    className: 'view-header',
    style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px;flex-wrap:wrap;'
  });

  const heading = createElement('h2', {
    textContent: title,
    style: 'margin:0;font-size:1.4rem;color:#111827;'
  });

  const actionsWrap = createElement('div', {
    style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;'
  });

  actions.forEach(action => actionsWrap.appendChild(action));
  header.appendChild(heading);
  header.appendChild(actionsWrap);

  return header;
}
