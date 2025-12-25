/**
 * Table Pagination Module
 * Handles pagination UI and page navigation
 */

import { createElement } from '../utils/dom-helper.js';

/**
 * Create pagination controls
 */
export function createPagination(currentPage, filteredDataLength, pageSize, onPageChange) {
  const pagination = createElement('div', {
    className: 'table-pagination'
  });

  const totalPages = Math.ceil(filteredDataLength / pageSize);

  // Previous button
  const prevBtn = createElement('button', {
    className: 'btn btn-sm',
    textContent: 'Previous',
    disabled: currentPage === 1
  });
  prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
  pagination.appendChild(prevBtn);

  // Page info
  const pageInfo = createElement('span', {
    className: 'page-info',
    textContent: `Page ${currentPage} of ${totalPages}`
  });
  pagination.appendChild(pageInfo);

  // Next button
  const nextBtn = createElement('button', {
    className: 'btn btn-sm',
    textContent: 'Next',
    disabled: currentPage === totalPages
  });
  nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
  pagination.appendChild(nextBtn);

  return pagination;
}

/**
 * Update pagination UI
 */
export function updatePagination(container, currentPage, filteredDataLength, pageSize, onPageChange) {
  const pagination = container.querySelector('.table-pagination');
  if (!pagination) return;

  pagination.innerHTML = '';
  const newPagination = createPagination(currentPage, filteredDataLength, pageSize, onPageChange);
  pagination.parentNode.replaceChild(newPagination, pagination);
}
