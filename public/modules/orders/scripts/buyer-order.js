/**
 * Buyer Order Page Main Controller
 * Orchestrates order display, video player, reviews, and tips
 */

import {
  displayOrderSummary,
  displayOrderDetails,
  displayRequirements,
  displayDeliveredStatus,
  hideStatusMessage,
  showThankYouMessage,
  startCountdown
} from './buyer-order/modules/order-display.js';

import { showVideo } from './buyer-order/modules/order-video.js';
import { setupReviewHandlers, updateStars, hideReviewUIElements } from './buyer-order/modules/order-review.js';
import { setupTipHandlers } from './buyer-order/modules/order-tip.js';

(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  let orderData = null;
  let selectedRating = { value: 5 };

  if (!orderId) {
    showError('Order ID not found');
    return;
  }

  // Load Whop settings
  async function loadWhopSettingsForPage() {
    try {
      if (typeof window.getWhopSettings === 'function') {
        const whopResp = await window.getWhopSettings();
        window.whopSettings = whopResp && whopResp.settings ? whopResp.settings : (window.whopSettings || {});
      }
    } catch (e) {
      console.warn('Whop settings load failed:', e);
      window.whopSettings = window.whopSettings || {};
    }
  }

  loadWhopSettingsForPage();

  // Fetch server time and load order
  fetchServerTimeOffset().then(offset => {
    window.timerOffset = offset;
    loadOrder();
  }).catch(() => {
    window.timerOffset = 0;
    loadOrder();
  });

  // Load order from API
  async function loadOrder() {
    try {
      const res = await fetch(`/api/order/buyer/${orderId}`);
      const data = await res.json();
      if (!res.ok || !data.order) throw new Error(data.error || 'Not found');
      orderData = data.order;
      displayOrder(orderData);
    } catch (err) {
      showError(err.message);
    }
  }

  // Display order information
  function displayOrder(o) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('order-content').style.display = 'block';

    displayOrderSummary(o);
    displayOrderDetails(o);
    displayRequirements(o.addons || []);

    if (o.status === 'delivered' && o.delivered_video_url) {
      displayDeliveredStatus();

      let videoMetadata = null;
      if (o.delivered_video_metadata) {
        try {
          videoMetadata = JSON.parse(o.delivered_video_metadata);
        } catch (e) {
          console.warn('Failed to parse video metadata:', e);
        }
      }
      showVideo(o.delivered_video_url, videoMetadata, orderId);

      if (o.has_review) {
        hideReviewUIElements();
        showThankYouMessage();
      }
    } else {
      hideStatusMessage();
      startCountdown(o.delivery_time_minutes || 60, o.created_at);
    }
  }

  // Setup event handlers
  setupReviewHandlers(orderData, selectedRating, loadOrder);
  setupTipHandlers(orderData, orderId);
  updateStars(5);

  // Error display
  function showError(msg) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').textContent = msg;
    document.getElementById('error').style.display = 'block';
  }
})();
