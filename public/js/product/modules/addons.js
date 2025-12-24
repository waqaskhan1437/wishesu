/**
 * Addon collection helpers.
 */

export function collectSelectedAddons(formEl) {
  const selectedAddons = [];
  if (!formEl) return selectedAddons;

  const formData = new FormData(formEl);
  for (const pair of formData.entries()) {
    const key = pair[0];
    const val = pair[1];
    if (val instanceof File) {
      continue;
    }

    if (val) {
      selectedAddons.push({ field: key, value: val });
    }
  }

  return selectedAddons;
}
