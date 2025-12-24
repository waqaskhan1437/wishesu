/**
 * Shared view container helpers.
 */

import { createElement } from '../../../utils/dom-helper.js';

export function createTableContainer(id) {
  return createElement('div', {
    className: 'table-container',
    id: id
  });
}
