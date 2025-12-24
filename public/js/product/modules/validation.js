/**
 * Checkout validation helpers.
 */

export function validateRequiredAddons() {
  let valid = true;
  document.querySelectorAll('.addon-group').forEach(grp => {
    const lbl = grp.querySelector('.addon-group-label');
    if (lbl && lbl.innerText.includes('*')) {
      const inp = grp.querySelector('input, select, textarea');
      if (inp && !inp.value) {
        inp.style.borderColor = 'red';
        valid = false;
      }
    }
  });
  return valid;
}
