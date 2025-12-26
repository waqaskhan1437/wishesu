/**
 * Buyer Order Page Controller
 * Orchestrates order display, video player, countdown
 */
import { displayOrder, showError } from './order-display.js';

const params = new URLSearchParams(location.search);
const orderId = params.get('id');

async function fetchServerTimeOffset() {
  try {
    const res = await fetch('/api/time');
    const data = await res.json();
    return Date.now() - (data.serverTime || Date.now());
  } catch (e) {
    return 0;
  }
}

async function loadOrder() {
  if (!orderId) {
    showError('Order ID not found');
    return;
  }

  try {
    const res = await fetch(`/api/order/buyer/${encodeURIComponent(orderId)}`);
    const data = await res.json();
    
    if (!res.ok || !data.order) {
      throw new Error(data.error || 'Order not found');
    }
    
    displayOrder(data.order, orderId);
  } catch (err) {
    showError(err.message);
  }
}

// Initialize
fetchServerTimeOffset().then(offset => {
  window.timerOffset = offset;
  loadOrder();
}).catch(() => {
  window.timerOffset = 0;
  loadOrder();
});
