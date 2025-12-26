/**
 * Product Checkout Handler
 * Handles checkout button clicks and Whop integration
 */
import { openWhopCheckout } from '../whop/checkout.js';

let currentTotal = 0;
let currentProduct = null;

export const setCurrentTotal = (total) => { currentTotal = total; };
export const getCurrentTotal = () => currentTotal;
export const setCurrentProduct = (product) => { currentProduct = product; };

const collectAddonValues = () => {
  const addons = [];
  const form = document.querySelector('.addon-form');
  if (!form) return addons;

  form.querySelectorAll('.addon-field').forEach((field) => {
    const label = field.querySelector('label')?.textContent || 'Field';
    
    // Text/Email/Textarea inputs
    const textInput = field.querySelector('input[type="text"], input[type="email"], textarea');
    if (textInput && textInput.value.trim()) {
      addons.push({ field: label, value: textInput.value.trim() });
      return;
    }

    // Select
    const select = field.querySelector('select');
    if (select) {
      const opt = select.selectedOptions[0];
      if (opt) {
        addons.push({ field: label, value: opt.textContent });
        
        // Check for nested text/file in select extras
        const optIdx = opt.dataset.optIdx;
        const extras = field.querySelector(`.option-extra[data-opt-idx="${optIdx}"]`);
        if (extras?.classList.contains('is-open')) {
          collectExtras(extras, addons, label);
        }
      }
      return;
    }

    // Radio/Checkbox
    const checked = field.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');
    if (checked) {
      const optLabel = checked.nextElementSibling?.textContent || checked.value;
      addons.push({ field: label, value: optLabel });
      
      const extras = checked.closest('.option-item')?.querySelector('.option-extra');
      if (extras?.classList.contains('is-open')) {
        collectExtras(extras, addons, label);
      }
      return;
    }

    // File input at field level
    const fileInput = field.querySelector('input[type="file"]');
    if (fileInput?.dataset.uploaded) {
      try {
        const urls = JSON.parse(fileInput.dataset.uploaded);
        urls.forEach((url, i) => {
          addons.push({ field: `${label} Photo ${i + 1}`, value: `[PHOTO LINK]:${url}` });
        });
      } catch (e) {}
    }
  });

  return addons;
};

const collectExtras = (container, addons, parentLabel) => {
  container.querySelectorAll('input[type="text"]').forEach((input) => {
    if (input.value.trim()) {
      const subLabel = input.previousElementSibling?.textContent || 'Details';
      addons.push({ field: `${parentLabel} - ${subLabel}`, value: input.value.trim() });
    }
  });

  container.querySelectorAll('input[type="file"]').forEach((input) => {
    if (input.dataset.uploaded) {
      try {
        const urls = JSON.parse(input.dataset.uploaded);
        urls.forEach((url, i) => {
          addons.push({ field: `${parentLabel} Photo ${i + 1}`, value: `[PHOTO LINK]:${url}` });
        });
      } catch (e) {}
    }
  });
};

const getEmailFromForm = () => {
  const emailInput = document.querySelector('.addon-form input[type="email"]');
  return emailInput?.value.trim() || '';
};

export async function handleCheckout(product) {
  const email = getEmailFromForm();
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address');
    return;
  }

  const addons = collectAddonValues();
  const amount = currentTotal || product.price || 0;

  // Get whop_product_id from product
  const whopProductId = product.whop_product_id || '';
  if (!whopProductId) {
    alert('Checkout not configured for this product');
    return;
  }

  try {
    const res = await fetch('/api/whop/create-plan-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: product.id,
        whop_product_id: whopProductId,
        amount,
        email,
        addons
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to create checkout');
    }

    // Open Whop checkout with plan ID
    if (data.plan_id) {
      await openWhopCheckout(data.plan_id, {
        product_id: String(product.id),
        product_title: product.title,
        email,
        addons,
        amount
      });
    } else if (data.checkout_url) {
      // Fallback: redirect to checkout URL
      window.location.href = data.checkout_url;
    }
  } catch (err) {
    console.error('Checkout error:', err);
    alert(err.message || 'Checkout failed. Please try again.');
  }
}
