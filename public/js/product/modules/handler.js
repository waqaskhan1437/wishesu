/**
 * Checkout handler.
 */

import { collectSelectedAddons } from './addons.js';
import { collectUploadedFileAddons, isUploadInProgress } from './uploads.js';
import { validateRequiredAddons } from './validation.js';
import { createPlanCheckout } from './whop-api.js';
import { getCachedAddonEmail, syncEmailToWhop } from './email-sync.js';
import { resetButton, setButtonLoading, setButtonText } from './ui.js';

function getFormEmail() {
  const emailInput = document.querySelector('#addons-form input[type="email"]');
  if (emailInput && emailInput.value.includes('@')) {
    return emailInput.value.trim();
  }
  return '';
}

function buildCheckoutPayload(email, selectedAddons) {
  return {
    product_id: window.productData.id,
    amount: window.currentTotal,
    email: email,
    metadata: {
      addons: selectedAddons
    }
  };
}

function storePendingOrder(selectedAddons, email, productId) {
  const orderData = {
    addons: selectedAddons,
    email: email,
    amount: window.currentTotal,
    productId: productId,
    timestamp: Date.now()
  };
  localStorage.setItem('pendingOrderData', JSON.stringify(orderData));
}

function openEmbeddedCheckout(data, selectedAddons, email, btn, originalText) {
  if (!window.whopCheckout) return false;

  if (data.email_prefilled) {
    setButtonText(btn, 'Email auto-filled. Opening checkout...');
    setTimeout(() => {
      setButtonText(btn, originalText);
    }, 2000);
  }

  storePendingOrder(selectedAddons, data.email || email, data.product_id || window.productData.id);

  window.whopCheckout({
    planId: data.plan_id,
    email: data.email || email,
    metadata: {
      ...data.metadata,
      addons: selectedAddons,
      product_id: window.productData.id,
      productId: window.productData.id
    },
    productId: data.product_id || window.productData.id,
    amount: window.currentTotal,
    checkoutUrl: data.checkout_url
  });

  return true;
}

export async function handleCheckout() {
  const btn = document.getElementById('checkout-btn');
  if (!btn) {
    console.error('Checkout button not found');
    return;
  }

  if (btn.disabled) {
    return;
  }

  if (!validateRequiredAddons()) {
    alert('Please fill required fields');
    return;
  }

  const originalText = btn.textContent;
  setButtonLoading(btn, 'Opening checkout...');

  if (isUploadInProgress()) {
    alert('Please wait for file uploads to complete.');
    resetButton(btn, originalText);
    return;
  }

  const formEl = document.getElementById('addons-form');
  const selectedAddons = collectSelectedAddons(formEl);

  const uploadData = collectUploadedFileAddons();
  uploadData.selectedAddons.forEach(addon => selectedAddons.push(addon));

  let email = getCachedAddonEmail() || '';
  const formEmail = getFormEmail();
  if (formEmail) email = formEmail;
  if (email) syncEmailToWhop(email);

  setButtonLoading(btn, 'Processing...');

  try {
    const payload = buildCheckoutPayload(email, selectedAddons);
    const { response, data } = await createPlanCheckout(payload);

    if (!response.ok || data.error) {
      let errorMsg = 'Failed to create checkout';
      if (data.error) {
        if (typeof data.error === 'string') {
          errorMsg = data.error;
        } else if (typeof data.error === 'object') {
          errorMsg = JSON.stringify(data.error, null, 2);
        }
      }
      alert('Checkout Error:\n\n' + errorMsg);
      resetButton(btn, originalText);
      return;
    }

    if (!data.plan_id && !data.checkout_url) {
      alert('Error: No checkout information received');
      resetButton(btn, originalText);
      return;
    }

    resetButton(btn, originalText);

    const opened = openEmbeddedCheckout(data, selectedAddons, email, btn, originalText);

    if (!opened && data.checkout_url) {
      window.location.href = data.checkout_url;
      return;
    }

    if (!opened) {
      alert('Checkout not available. Please refresh the page and try again.');
    }
  } catch (err) {
    alert('Checkout Error:\n\n' + err.message + '\n\nPlease check your internet connection and try again.');
    resetButton(btn, originalText);
  }
}
