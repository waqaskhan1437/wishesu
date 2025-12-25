/**
 * Product Form Utilities
 * Helper functions for slug generation, delivery parsing, etc.
 */

export function generateSlug(str) {
  const s = (str || '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || '';
}

export function parseDeliveryDays(value) {
  if (!window.DeliveryTimeUtils) {
    console.error('DeliveryTimeUtils not loaded');
    return '';
  }
  return window.DeliveryTimeUtils.parseDeliveryDays(value);
}

export function formatDeliveryLabel(days, instant) {
  if (!window.DeliveryTimeUtils) {
    console.error('DeliveryTimeUtils not loaded');
    return '2 Days Delivery';
  }
  return window.DeliveryTimeUtils.getDeliveryText(instant, days);
}

export function setupGalleryField(form) {
  const wrapper = form.querySelector('#gallery-wrapper');
  const addBtn = document.getElementById('add-gallery-image');
  if (!wrapper || !addBtn) return;

  addBtn.addEventListener('click', () => {
    const first = wrapper.querySelector('.gallery-row');
    if (!first) return;
    const clone = first.cloneNode(true);
    clone.querySelectorAll('input').forEach(inp => inp.value = '');

    if (addBtn.parentNode === wrapper) {
      wrapper.insertBefore(clone, addBtn);
    } else {
      const rows = wrapper.querySelectorAll('.gallery-row');
      const lastRow = rows[rows.length - 1];
      if (lastRow && lastRow.nextSibling) {
        wrapper.insertBefore(clone, lastRow.nextSibling);
      } else {
        wrapper.appendChild(clone);
      }
    }
  });
}
