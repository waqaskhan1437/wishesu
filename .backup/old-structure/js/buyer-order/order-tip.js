/**
 * Order Tip Module
 * Handles tip processing with Whop checkout
 */

/**
 * Process tip payment
 */
export async function processTip(amount, btnEl, orderData, orderId) {
  const amt = parseFloat(amount);
  if (!amt || amt <= 0) return;

  // Prevent double-click
  if (btnEl && btnEl.dataset.processing === '1') return;
  if (btnEl) {
    btnEl.dataset.processing = '1';
    btnEl.classList.add('is-processing');
    btnEl.disabled = true;
    const oldText = btnEl.textContent;
    btnEl.dataset.oldText = oldText;
    btnEl.textContent = 'Preparing...';
  }

  try {
    if (!orderData || !orderData.product_id) {
      throw new Error('Order product not found');
    }
    const email = (orderData.email || '').trim();

    // Create dynamic Whop plan checkout
    const resp = await fetch('/api/whop/create-plan-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: orderData.product_id,
        amount: amt,
        email: email,
        metadata: {
          type: 'tip',
          order_id: orderId,
          tip_amount: amt
        }
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      throw new Error((data && (data.error || data.message)) || 'Payment not available');
    }
    if (!data || !data.plan_id) {
      throw new Error('Whop plan not returned');
    }

    // Store context for embedded checkout handler
    try {
      localStorage.setItem('pendingOrderData', JSON.stringify({
        email: email,
        amount: amt,
        productId: data.product_id || orderData.product_id,
        orderId: orderId,
        type: 'tip',
        timestamp: Date.now()
      }));
    } catch (e) {}

    if (!window.whopCheckout) {
      throw new Error('Payment not available');
    }

    window.whopCheckout({
      planId: data.plan_id,
      email: email,
      productId: data.product_id || orderData.product_id,
      amount: amt,
      metadata: {
        ...(data.metadata || {}),
        type: 'tip',
        order_id: orderId,
        tip_amount: amt
      }
    });
  } catch (err) {
    console.error('Tip checkout error:', err);
    alert(err.message || 'Payment not available');
  } finally {
    if (btnEl) {
      btnEl.dataset.processing = '0';
      btnEl.classList.remove('is-processing');
      btnEl.disabled = false;
      const oldText = btnEl.dataset.oldText;
      if (oldText) btnEl.textContent = oldText;
    }
  }
}

/**
 * Setup tip button handlers
 */
export function setupTipHandlers(orderData, orderId) {
  document.querySelectorAll('.tip-btn').forEach(b => {
    b.addEventListener('click', function(e) {
      e.preventDefault();
      processTip(this.dataset.amount, this, orderData, orderId);
    });
  });
}

