/**
 * Order Detail Main Logic
 * Admin view for order details
 */

import { displayOrder, displayRequirements, showError } from './display.js';
import { showDelivery } from './video-player.js';
import { submitDelivery } from './upload.js';
import { initReviewHandlers, initTipHandlers } from './review.js';

(function() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  const isAdmin = urlParams.get('admin') === '1';
  let orderData = null;
  let countdownTimer = null;

  if (!orderId) {
    showError('Order ID not found');
    return;
  }

  // Setup view
  if (isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    document.getElementById('back-btn').href = '/admin/dashboard.html';
  } else {
    document.querySelectorAll('.buyer-only').forEach(el => el.style.display = 'block');
    document.getElementById('back-btn').href = '/';
  }

  // Initialize timer offset (no server sync for admin page)
  window.timerOffset = 0;

  loadOrder();

  async function loadOrder() {
    try {
      const res = await fetch(`/api/order/buyer/${orderId}`);
      const data = await res.json();
      if (!res.ok || !data.order) throw new Error(data.error || 'Order not found');
      orderData = data.order;
      handleOrderDisplay(orderData);
    } catch (err) {
      showError('Error: ' + err.message);
    }
  }

  function handleOrderDisplay(order) {
    displayOrder(order, isAdmin);
    displayRequirements(order.addons || []);

    if (order.status === 'delivered' && order.delivered_video_url) {
      showDelivery(order, isAdmin);
    } else {
      if (isAdmin) {
        document.getElementById('delivery-section').style.display = 'block';
      } else {
        startCountdown(order.delivery_time_minutes || 60, order.created_at);
        document.getElementById('status-message').className = 'status-message status-processing';
        document.getElementById('status-message').innerHTML = '<h3> Video Being Created</h3><p>Processing your order...</p>';
      }
    }

    // Initialize handlers
    initReviewHandlers(orderData, loadOrder);
    initTipHandlers(orderData);

    // Admin delivery handler
    const submitBtn = document.getElementById('submit-delivery-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => submitDelivery(orderId, loadOrder));
    }
  }

  function startCountdown(minutes, createdAt) {
    if (countdownTimer) {
      countdownTimer.stop();
    }
    countdownTimer = new CountdownTimer('countdown-display', minutes, createdAt, {
      serverTimeOffset: window.timerOffset || 0
    });
    countdownTimer.start();
  }
})();

