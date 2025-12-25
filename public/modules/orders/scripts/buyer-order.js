/**
 * Buyer Order Page Controller (Event-Driven + ESM)
 * - Loads order data
 * - Emits events instead of passing null dependencies
 */

import {
  displayOrderSummary,
  displayOrderDetails,
  displayRequirements,
  displayDeliveredStatus,
  hideStatusMessage,
  showThankYouMessage,
  startCountdown
} from './order-display.js';

import { showVideo } from './order-video.js';
import { setupReviewHandlers, updateStars } from './order-review.js';
import { setupTipHandlers } from './order-tip.js';

export async function init(ctx = {}) {
  const eventBus = ctx.eventBus;
  const appState = ctx.appState;
  const api = ctx.services?.api;
  const timer = ctx.services?.timer;

  const orderId = new URLSearchParams(location.search).get('id');
  if (!orderId) return showError('Order ID not found');

  let selectedRating = 5;
  let orderData = null;

  // Bind review/tip handlers AFTER data is loaded (no more null orderData)
  function bindHandlers(order) {
    setupReviewHandlers(order, selectedRating, loadOrder);
    setupTipHandlers(order, orderId);
    updateStars(selectedRating);
  }

  // Rating click handling (if present in DOM)
  const stars = document.querySelectorAll('.rating-star');
  stars.forEach((star) => {
    star.addEventListener('click', () => {
      selectedRating = Number(star.dataset.rating || 5);
      updateStars(selectedRating);
      eventBus?.emitSync?.('review:ratingChanged', { rating: selectedRating });
    });
  });

  // Preload whop settings (non-fatal)
  try {
    const whopResp = api?.getWhopSettings ? await api.getWhopSettings() : null;
    appState?.set?.('whop.settings', whopResp?.settings || {});
    eventBus?.emitSync?.('whop:loaded', { settings: appState?.get?.('whop.settings') || {} });
  } catch (e) {
    console.warn('Whop settings load failed:', e);
  }

  // Server time offset (non-fatal)
  try {
    const offset = timer?.fetchServerTimeOffset ? await timer.fetchServerTimeOffset() : 0;
    appState?.set?.('timer.offset', offset);
  } catch (_) {}

  await loadOrder();

  async function loadOrder() {
    try {
      const res = await fetch(`/api/order/buyer/${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (!res.ok || !data.order) throw new Error(data.error || 'Not found');

      orderData = data.order;
      appState?.set?.('order.current', orderData);

      displayOrder(orderData);
      bindHandlers(orderData);

      eventBus?.emitSync?.('order:loaded', { orderId, order: orderData });
    } catch (err) {
      console.error('Order load failed', err);
      eventBus?.emitSync?.('order:error', { err });
      showError(err.message || 'Failed to load order');
    }
  }

  function displayOrder(o) {
    const loading = document.getElementById('loading');
    const content = document.getElementById('order-content');
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'block';

    displayOrderSummary(o);
    displayOrderDetails(o);
    displayRequirements(o.addons || []);

    if (o.status === 'delivered' && o.delivered_video_url) {
      displayDeliveredStatus();

      let videoMetadata = null;
      if (o.delivered_video_metadata) {
        try { videoMetadata = JSON.parse(o.delivered_video_metadata); } catch (_) {}
      }

      showVideo(o.delivered_video_url, videoMetadata, orderId);

      if (o.has_review) {
        showThankYouMessage();
      }
    } else {
      hideStatusMessage();
      startCountdown(o.delivery_time_minutes || 60, o.created_at);
    }
  }

  function showError(msg) {
    const loading = document.getElementById('loading');
    const errEl = document.getElementById('error');
    if (loading) loading.style.display = 'none';
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  }
}
