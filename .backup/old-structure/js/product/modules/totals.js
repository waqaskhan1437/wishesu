/**
 * Pricing total helpers.
 */

export function updateTotal() {
  let addonTotal = 0;
  const selects = document.querySelectorAll('select.form-select');
  selects.forEach(sel => {
    const opt = sel.selectedOptions[0];
    if (opt && opt.dataset.price) addonTotal += parseFloat(opt.dataset.price);
  });
  const inputs = document.querySelectorAll('input.addon-radio:checked, input.addon-checkbox:checked');
  inputs.forEach(el => {
    if (el.dataset.price) addonTotal += parseFloat(el.dataset.price);
  });
  window.currentTotal = window.basePrice + addonTotal;
  const btn = document.getElementById('checkout-btn');
  if (btn) btn.textContent = 'Checkout - $' + window.currentTotal.toLocaleString();
}
