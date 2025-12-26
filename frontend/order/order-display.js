/**
 * Order Display Module
 * Handles rendering of order information, requirements, countdown
 */
import { showVideo } from './order-video.js';

let countdownInterval = null;

export function showError(msg) {
  document.getElementById('loading').style.display = 'none';
  const error = document.getElementById('error');
  error.textContent = msg;
  error.style.display = 'block';
}

const formatDate = (dt) => {
  if (!dt) return 'N/A';
  return new Date(dt).toLocaleString();
};

const formatStatus = (status) => {
  const map = { paid: 'Paid', pending: 'Pending', delivered: 'Delivered', revision: 'Revision' };
  return map[status?.toLowerCase()] || status || 'Unknown';
};

function displayOrderDetails(order) {
  document.getElementById('order-id').textContent = order.order_id || order.id || '-';
  document.getElementById('email').textContent = order.email || 'N/A';
  document.getElementById('date').textContent = formatDate(order.created_at);
  
  const statusEl = document.getElementById('status');
  statusEl.textContent = formatStatus(order.status);
  statusEl.className = `status-badge status-${(order.status || '').toLowerCase()}`;
}

function displayProductSummary(order) {
  const container = document.getElementById('product-summary');
  if (!order.product_title && !order.product_thumbnail) return;
  
  container.innerHTML = '';
  container.style.display = 'flex';

  if (order.product_thumbnail) {
    const img = document.createElement('img');
    img.className = 'product-thumb';
    img.src = order.product_thumbnail;
    img.alt = order.product_title || 'Product';
    container.appendChild(img);
  }

  const meta = document.createElement('div');
  meta.className = 'product-meta';
  
  const title = document.createElement('p');
  title.className = 'product-title';
  title.textContent = order.product_title || 'Your Product';
  meta.appendChild(title);

  const link = document.createElement('a');
  link.href = `/product/?id=${order.product_id}`;
  link.textContent = 'View Product';
  link.className = 'product-link';
  meta.appendChild(link);

  container.appendChild(meta);
}

function displayRequirements(addons) {
  const list = document.getElementById('requirements');
  const photos = [];

  if (!addons || !addons.length) {
    list.innerHTML = '<div class="addon-item muted">No requirements provided.</div>';
    return;
  }

  const filtered = addons.filter(a => a.field !== '_temp_session');
  if (!filtered.length) {
    list.innerHTML = '<div class="addon-item muted">No requirements provided.</div>';
    return;
  }

  list.innerHTML = filtered.map(a => {
    const label = a.field || 'Item';
    let val = a.value || '';

    if (val.includes('[TEMP_FILE]') || val.includes('[PHOTO LINK]')) {
      const url = val.split(']:')[1]?.trim();
      if (url) {
        photos.push(url);
        return `<div class="addon-item"><span class="addon-label">${label}:</span> <a href="${url}" target="_blank" class="photo-link">View Photo 📷</a></div>`;
      }
      return `<div class="addon-item"><span class="addon-label">${label}:</span> Photo uploaded</div>`;
    }
    return `<div class="addon-item"><span class="addon-label">${label}:</span> ${val}</div>`;
  }).join('');

  if (photos.length) {
    document.getElementById('photos-section').style.display = 'block';
    document.getElementById('photos').innerHTML = photos.map(url => 
      `<div class="photo-item"><img src="${url}" onclick="window.open('${url}')" onerror="this.style.display='none'"></div>`
    ).join('');
  }
}

function startCountdown(dueAt) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  const display = document.getElementById('countdown-display');
  if (!dueAt) {
    display.textContent = '--:--:--';
    return;
  }

  const dueTime = new Date(dueAt).getTime();
  const offset = window.timerOffset || 0;

  const update = () => {
    const now = Date.now() - offset;
    const diff = dueTime - now;

    if (diff <= 0) {
      display.textContent = '00:00:00';
      display.classList.add('expired');
      if (countdownInterval) clearInterval(countdownInterval);
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    display.textContent = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  };

  update();
  countdownInterval = setInterval(update, 1000);
}

function displayDeliveredStatus() {
  const statusEl = document.getElementById('status-message');
  statusEl.className = 'status-message status-delivered';
  statusEl.innerHTML = '<h3>✅ Video Ready!</h3><p>Your video has been delivered and is ready to watch</p>';
  statusEl.style.display = 'block';
}

export function displayOrder(order, orderId) {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('order-content').style.display = 'block';

  displayOrderDetails(order);
  displayProductSummary(order);
  displayRequirements(order.addons || []);

  if (order.status === 'delivered' && order.archive_url) {
    displayDeliveredStatus();
    document.getElementById('countdown-section').style.display = 'none';
    document.getElementById('video-section').style.display = 'block';
    showVideo(order.archive_url, orderId);
  } else {
    document.getElementById('status-message').style.display = 'none';
    startCountdown(order.due_at);
  }
}
