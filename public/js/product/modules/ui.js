/**
 * Checkout button helpers.
 */

export function setButtonLoading(btn, message) {
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = `
    <span style="display: inline-flex; align-items: center; gap: 8px;">
      <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>
      ${message}
    </span>
  `;
}

export function resetButton(btn, originalText) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = originalText;
}

export function setButtonText(btn, text) {
  if (!btn) return;
  btn.textContent = text;
}
