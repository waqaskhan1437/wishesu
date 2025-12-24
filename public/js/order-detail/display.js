/**
 * Order Detail Display Functions
 * Display order information and requirements
 */

export function displayOrder(order, isAdmin) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('order-content').style.display = 'block';

  document.getElementById('order-id-display').textContent = 'Order #' + order.order_id;
  document.getElementById('order-date').textContent = new Date(order.created_at).toLocaleString();
  document.getElementById('email-display').textContent = order.email || 'N/A';
  document.getElementById('amount-display').textContent = '$' + (order.amount || 0);
  document.getElementById('status-display').textContent = order.status;
  document.getElementById('delivery-time-display').textContent = (order.delivery_time_minutes || 60) + ' minutes';

  return order;
}

export function displayRequirements(addons) {
  const list = document.getElementById('requirements-list');
  list.innerHTML = '';
  const photos = [];

  addons.forEach(addon => {
    if (addon.field === '_temp_session') return;
    const item = document.createElement('div');
    item.className = 'addon-item';

    let value = addon.value || '';
    if (value.includes('[TEMP_FILE]') || value.includes('[PHOTO LINK]')) {
      const url = value.split(']:')[1]?.trim();
      if (url) {
        photos.push(url);
        item.innerHTML = `<span class="addon-label">${addon.field}:</span> <a href="${url}" target="_blank">View Photo</a>`;
      } else {
        item.innerHTML = `<span class="addon-label">${addon.field}:</span> Photo uploaded`;
      }
    } else {
      item.innerHTML = `<span class="addon-label">${addon.field}:</span> ${value}`;
    }
    list.appendChild(item);
  });

  if (photos.length > 0) {
    document.getElementById('photos-section').style.display = 'block';
    const grid = document.getElementById('photos-grid');
    grid.innerHTML = photos.map(url => `<div class="photo-item"><img src="${url}" onclick="window.open('${url}', '_blank')"></div>`).join('');
  }
}

export function showError(msg) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').textContent = msg;
  document.getElementById('error').style.display = 'block';
}
