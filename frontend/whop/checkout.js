/**
 * Whop Checkout Module
 * Handles Whop SDK loading and checkout overlay
 */

let whopScriptLoaded = false;
let whopScriptLoading = false;
const WHOP_SDK_URL = 'https://cdn.whop.com/scripts/checkout.umd.js';

export function loadWhopScript() {
  return new Promise((resolve, reject) => {
    if (whopScriptLoaded && window.WhopApp) {
      resolve(window.WhopApp);
      return;
    }
    if (whopScriptLoading) {
      const check = setInterval(() => {
        if (window.WhopApp) {
          clearInterval(check);
          resolve(window.WhopApp);
        }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error('Whop SDK timeout')); }, 10000);
      return;
    }

    whopScriptLoading = true;
    const script = document.createElement('script');
    script.src = WHOP_SDK_URL;
    script.async = true;
    script.onload = () => {
      whopScriptLoaded = true;
      whopScriptLoading = false;
      if (window.WhopApp) resolve(window.WhopApp);
      else reject(new Error('WhopApp not found'));
    };
    script.onerror = () => {
      whopScriptLoading = false;
      reject(new Error('Failed to load Whop SDK'));
    };
    document.head.appendChild(script);
  });
}

function createOverlay() {
  let overlay = document.getElementById('whop-checkout-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'whop-checkout-overlay';
  overlay.className = 'whop-overlay';
  overlay.innerHTML = `
    <div class="whop-modal">
      <div class="whop-header">
        <span class="whop-title">Complete Your Purchase</span>
        <button class="whop-close" aria-label="Close">&times;</button>
      </div>
      <div id="whop-checkout-container" class="whop-container"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Add styles if not already present
  if (!document.getElementById('whop-checkout-styles')) {
    const style = document.createElement('style');
    style.id = 'whop-checkout-styles';
    style.textContent = getOverlayStyles();
    document.head.appendChild(style);
  }

  overlay.querySelector('.whop-close').addEventListener('click', () => closeOverlay());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });

  return overlay;
}

function closeOverlay() {
  const overlay = document.getElementById('whop-checkout-overlay');
  if (overlay) overlay.style.display = 'none';
}

export async function openWhopCheckout(planId, metadata = {}) {
  try {
    await loadWhopScript();
    const overlay = createOverlay();
    overlay.style.display = 'flex';

    const container = document.getElementById('whop-checkout-container');
    container.innerHTML = '<div class="whop-loading">Loading checkout...</div>';

    if (window.WhopApp && window.WhopApp.renderCheckout) {
      window.WhopApp.renderCheckout({
        elementId: 'whop-checkout-container',
        planId: planId,
        metadata: metadata,
        onComplete: () => {
          console.log('Whop checkout complete');
          closeOverlay();
          window.location.href = '/success.html';
        },
        onError: (err) => {
          console.error('Whop checkout error:', err);
          container.innerHTML = `<div class="whop-error">Checkout error. Please try again.</div>`;
        }
      });
    } else {
      // Fallback: open checkout URL in new window
      const checkoutUrl = `https://whop.com/checkout/${planId}`;
      window.open(checkoutUrl, '_blank');
      closeOverlay();
    }
  } catch (err) {
    console.error('Failed to open Whop checkout:', err);
    alert('Failed to load checkout. Please try again.');
  }
}

function getOverlayStyles() {
  return `
    .whop-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; }
    .whop-modal { background: #fff; border-radius: 16px; width: 95%; max-width: 500px; max-height: 90vh; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .whop-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
    .whop-title { font-weight: 600; font-size: 16px; }
    .whop-close { background: none; border: none; color: #fff; font-size: 28px; cursor: pointer; line-height: 1; padding: 0; opacity: 0.8; }
    .whop-close:hover { opacity: 1; }
    .whop-container { min-height: 400px; padding: 20px; }
    .whop-loading, .whop-error { text-align: center; padding: 60px 20px; color: #666; }
    .whop-error { color: #dc2626; }
  `;
}

export { closeOverlay };
