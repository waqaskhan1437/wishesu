/**
 * Product addon email helpers.
 */

let cachedAddonEmail = '';

export function syncEmailToWhop(email) {
  cachedAddonEmail = email || '';
  window.cachedAddonEmail = cachedAddonEmail;

  const embed = document.getElementById('whop-embedded-checkout');
  if (!embed) return;

  if (cachedAddonEmail) {
    embed.setAttribute('data-whop-checkout-email', cachedAddonEmail);
  } else {
    embed.removeAttribute('data-whop-checkout-email');
  }
}

export function getCachedAddonEmail() {
  return cachedAddonEmail;
}

export function initAddonEmailListener() {
  const form = document.getElementById('addons-form');
  if (!form) return;
  const emailInput = form.querySelector('input[type="email"]');
  if (!emailInput) return;

  const handleEmailUpdate = () => {
    const val = (emailInput.value || '').trim();
    if (val && val.includes('@')) {
      syncEmailToWhop(val);
    } else {
      syncEmailToWhop('');
    }
  };

  emailInput.addEventListener('input', handleEmailUpdate);
  emailInput.addEventListener('change', handleEmailUpdate);
  handleEmailUpdate();
}
