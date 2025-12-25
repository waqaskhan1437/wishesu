/**
 * Reviews header builder.
 */

import { createElement } from '../utils/dom-helper.js';

export function createReviewsHeader() {
  return createElement('h2', {
    textContent: 'Reviews Management',
    style: 'margin-bottom: 20px;'
  });
}
