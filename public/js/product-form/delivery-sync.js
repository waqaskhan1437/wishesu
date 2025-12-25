/**
 * Product Form Delivery Time Addon Synchronization
 * Syncs delivery time between main form and addon builder
 */

import { parseDeliveryDays, formatDeliveryLabel } from './utils.js';

export function initDeliveryTimeAddonSync(form, opts = {}) {
  const { applyInitial = false } = opts;

  const builder = form.querySelector('#addons-builder');
  const instantDeliveryInput = form.querySelector('#instant_delivery');
  const normalDeliveryTextInput = form.querySelector('#normal_delivery_text');

  if (!builder || !instantDeliveryInput || !normalDeliveryTextInput) return;
  if (typeof window.buildAddonsConfig !== 'function') return;

  let syncing = false;

  const slug = (str) => {
    const b = (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return b || 'field_1';
  };

  const findDeliveryField = (cfg) => {
    return (cfg || []).find(f => {
      if (!f) return false;
      if (f.id === 'delivery-time') return true;
      if (!Array.isArray(f.options)) return false;
      return f.options.some(o => o && o.delivery);
    });
  };

  const applyFromAddons = () => {
    if (syncing) return;

    const cfg = window.buildAddonsConfig(form);
    const deliveryField = findDeliveryField(cfg);
    if (!deliveryField || !Array.isArray(deliveryField.options) || !deliveryField.options.length) return;

    const selected = deliveryField.options.find(o => o && o.default) || deliveryField.options[0];
    if (!selected) return;

    const label = (selected.label || '').toString().trim();
    let instant = false;
    let text = '';

    if (selected.delivery && typeof selected.delivery === 'object') {
      instant = !!selected.delivery.instant;
      text = (selected.delivery.text || '').toString().trim();
    } else {
      const v = label.toLowerCase();
      instant = v.includes('instant') || v.includes('60');
      text = instant ? '' : label;
    }

    syncing = true;
    instantDeliveryInput.checked = instant;
    if (instant) {
      normalDeliveryTextInput.value = '';
    } else {
      normalDeliveryTextInput.value = parseDeliveryDays(text || label);
    }
    syncing = false;
  };

  const applyToAddons = () => {
    if (syncing) return;

    const cfg = window.buildAddonsConfig(form);
    const deliveryField = findDeliveryField(cfg);
    if (!deliveryField || !deliveryField.id) return;

    const fieldEls = Array.from(builder.querySelectorAll('.addon-field'));
    const fieldEl = fieldEls.find(el => slug(el.querySelector('.addon-label')?.value || '') === deliveryField.id);
    if (!fieldEl) return;

    const type = fieldEl.querySelector('.addon-type')?.value;
    if (type !== 'radio' && type !== 'select') return;

    const rows = Array.from(fieldEl.querySelectorAll('.addon-option-row'));
    if (!rows.length) return;

    const wantInstant = !!instantDeliveryInput.checked;
    const wantDays = parseDeliveryDays(normalDeliveryTextInput.value);

    const getRowMeta = (row) => {
      const hasDelivery = !!row.querySelector('.addon-opt-delivery')?.checked;
      const rowInstant = !!row.querySelector('.addon-opt-delivery-instant')?.checked;
      const rowText = (row.querySelector('.addon-opt-delivery-text')?.value || '').trim().toLowerCase();
      const rowLabel = (row.querySelector('.addon-opt-label')?.value || '').trim().toLowerCase();
      const rowDays = parseDeliveryDays(rowText || rowLabel);
      return { hasDelivery, rowInstant, rowText, rowLabel, rowDays };
    };

    let targetRow = null;

    if (wantInstant) {
      targetRow = rows.find(r => {
        const { hasDelivery, rowInstant, rowLabel } = getRowMeta(r);
        if (hasDelivery) return rowInstant;
        return rowLabel.includes('instant') || rowLabel.includes('60');
      });
    } else {
      targetRow = rows.find(r => {
        const { hasDelivery, rowInstant, rowDays, rowLabel } = getRowMeta(r);
        if (hasDelivery) {
          if (rowInstant) return false;
          if (wantDays) return rowDays === wantDays;
          return true;
        }
        if (wantDays) return rowDays === wantDays;
        return !(rowLabel.includes('instant') || rowLabel.includes('60'));
      });
    }

    if (!targetRow) targetRow = rows[0];

    syncing = true;
    rows.forEach(r => {
      const def = r.querySelector('.addon-opt-default');
      if (def) def.checked = r === targetRow;
    });
    syncing = false;

    if (typeof window.syncAddonsHidden === 'function') window.syncAddonsHidden(form);
  };

  builder.addEventListener('change', e => {
    const t = e.target;
    if (!t) return;

    if (t.matches('.addon-opt-default') || t.matches('.addon-type') ||
        t.matches('.addon-opt-delivery') || t.matches('.addon-opt-delivery-instant')) {
      applyFromAddons();
    }
  });

  builder.addEventListener('input', e => {
    const t = e.target;
    if (!t) return;

    if (t.matches('.addon-opt-label') || t.matches('.addon-opt-delivery-text') ||
        t.matches('.addon-opt-price')) {
      applyFromAddons();
    }
  });

  instantDeliveryInput.addEventListener('change', applyToAddons);
  normalDeliveryTextInput.addEventListener('input', applyToAddons);

  window.syncDeliveryTimeFromAddon = function(dataset) {
    if (syncing) return;

    syncing = true;

    const instant = dataset.needsInstant === 'true' || (dataset.price && parseInt(dataset.price, 10) === 0);
    const text = dataset.deliveryText || '';

    instantDeliveryInput.checked = instant;
    normalDeliveryTextInput.value = instant ? '' : parseDeliveryDays(text);

    syncing = false;

    if (typeof window.updateDeliveryBadge === 'function') {
      const badgeText = formatDeliveryLabel(parseDeliveryDays(text), instant);
      window.updateDeliveryBadge(badgeText);
    }
  };

  if (applyInitial) setTimeout(applyFromAddons, 0);
}
