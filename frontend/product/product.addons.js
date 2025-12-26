import { initAddonUploads } from './product.upload.js';

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else node.setAttribute(key, value);
  });
  ([]).concat(children).forEach((child) => {
    if (child === null || child === undefined) return;
    node.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
  });
  return node;
};

const parseDelivery = (raw) => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
};

const buildOptionExtras = (fieldIdx, optIdx, opt) => {
  const extra = el('div', { class: 'option-extra' });
  let hasAny = false;

  if (opt.textField) {
    hasAny = true;
    extra.appendChild(el('label', { text: opt.textLabel || 'Details' }));
    extra.appendChild(el('input', {
      type: 'text',
      name: `addon-${fieldIdx}-text-${optIdx}`,
      placeholder: opt.textPlaceholder || ''
    }));
  }

  if (opt.file || opt.fileQuantity) {
    hasAny = true;
    const qty = Number(opt.fileQuantity || 1);
    extra.appendChild(el('label', { text: qty > 1 ? `Upload ${qty} files` : 'Upload file' }));
    for (let i = 0; i < qty; i += 1) {
      const row = el('div', { class: 'file-row' });
      row.appendChild(el('input', {
        type: 'file',
        name: `addon-${fieldIdx}-file-${optIdx}-${i + 1}`
      }));
      row.appendChild(el('span', { class: 'upload-status' }));
      extra.appendChild(row);
    }
  }

  if (!hasAny) return null;
  return extra;
};

const refreshExtras = (wrap) => {
  wrap.querySelectorAll('.option-extra').forEach((box) => {
    box.classList.remove('is-open');
  });
  wrap.querySelectorAll('select').forEach((select) => {
    const idx = select.selectedOptions[0]?.dataset?.optIdx;
    if (!idx) return;
    const target = select.parentElement.querySelector(`.option-extra[data-opt-idx="${idx}"]`);
    if (target) target.classList.add('is-open');
  });
  wrap.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach((input) => {
    const extra = input.closest('.option-item')?.querySelector('.option-extra');
    if (!extra) return;
    if (input.checked) extra.classList.add('is-open');
  });
};

const refreshDelivery = (wrap, onDeliveryChange) => {
  let delivery = null;
  wrap.querySelectorAll('select').forEach((select) => {
    const raw = select.selectedOptions[0]?.dataset?.delivery;
    const parsed = parseDelivery(raw);
    if (parsed) delivery = parsed;
  });
  if (!delivery) {
    wrap.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach((input) => {
      if (!input.checked || delivery) return;
      const parsed = parseDelivery(input.dataset.delivery);
      if (parsed) delivery = parsed;
    });
  }
  onDeliveryChange(delivery);
};

const refreshTotals = (wrap, basePrice, onTotal) => {
  let total = Number(basePrice || 0);
  wrap.querySelectorAll('select').forEach((select) => {
    const opt = select.selectedOptions[0];
    total += Number(opt?.dataset?.price || 0);
  });
  wrap.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach((input) => {
    if (input.checked) total += Number(input.dataset.price || 0);
  });
  onTotal(total);
};

export const createAddonForm = ({ addons, formatMoney, basePrice, onTotal, onDeliveryChange }) => {
  const fields = Array.isArray(addons) ? addons : [];
  const wrap = el('div', { class: 'addon-form' });
  if (!fields.length) {
    wrap.appendChild(el('p', { class: 'muted', text: 'No addons added yet.' }));
    return wrap;
  }

  fields.forEach((field, idx) => {
    if (field.type === 'heading') {
      wrap.appendChild(el('div', { class: 'addon-heading', text: field.label || field.text || 'Section' }));
      return;
    }
    const fieldWrap = el('div', { class: 'addon-field' });
    const label = field.label || `Option ${idx + 1}`;
    fieldWrap.appendChild(el('label', { text: label }));

    if (['text', 'email'].includes(field.type)) {
      fieldWrap.appendChild(el('input', { type: field.type, placeholder: field.placeholder || '' }));
      wrap.appendChild(fieldWrap);
      return;
    }
    if (field.type === 'textarea') {
      fieldWrap.appendChild(el('textarea', { rows: 3, placeholder: field.placeholder || '' }));
      wrap.appendChild(fieldWrap);
      return;
    }
    if (field.type === 'file' || field.file) {
      const fileInput = el('input', { type: 'file' });
      if (field.file?.multiple) fileInput.setAttribute('multiple', '');
      fieldWrap.appendChild(fileInput);
      wrap.appendChild(fieldWrap);
      return;
    }
    if (field.type === 'select') {
      const select = el('select');
      const extrasWrap = el('div', { class: 'select-extras' });
      (field.options || []).forEach((opt, optIdx) => {
        const priceValue = Number(opt.price || 0);
        const price = opt.price ? ` +${formatMoney(opt.price)}` : '';
        const option = el('option', { text: `${opt.label}${price}`, value: priceValue });
        if (opt.default) option.selected = true;
        option.dataset.price = String(priceValue);
        option.dataset.optIdx = String(optIdx);
        if (opt.delivery) option.dataset.delivery = JSON.stringify(opt.delivery);
        select.appendChild(option);

        const extras = buildOptionExtras(idx, optIdx, opt);
        if (extras) {
          extras.dataset.optIdx = String(optIdx);
          extrasWrap.appendChild(extras);
        }
      });
      fieldWrap.appendChild(select);
      if (extrasWrap.children.length) fieldWrap.appendChild(extrasWrap);
      wrap.appendChild(fieldWrap);
      return;
    }
    if (field.type === 'radio' || field.type === 'checkbox_group') {
      const list = el('div', { class: 'option-list' });
      (field.options || []).forEach((opt, optIdx) => {
        const priceValue = Number(opt.price || 0);
        const price = opt.price ? ` +${formatMoney(opt.price)}` : '';
        const id = `opt-${idx}-${optIdx}`;
        const input = el('input', { type: field.type === 'radio' ? 'radio' : 'checkbox', name: `addon-${idx}`, id });
        input.dataset.price = String(priceValue);
        if (opt.delivery) input.dataset.delivery = JSON.stringify(opt.delivery);
        if (opt.default) input.checked = true;
        const labelEl = el('label', { for: id, text: `${opt.label}${price}` });
        const row = el('div', { class: 'option-item' }, [input, labelEl]);
        const extras = buildOptionExtras(idx, optIdx, opt);
        if (extras) row.appendChild(extras);
        list.appendChild(row);
      });
      fieldWrap.appendChild(list);
      wrap.appendChild(fieldWrap);
      return;
    }
    wrap.appendChild(fieldWrap);
  });

  const refreshAll = () => {
    refreshExtras(wrap);
    refreshTotals(wrap, basePrice, onTotal);
    refreshDelivery(wrap, onDeliveryChange);
  };
  wrap.addEventListener('change', refreshAll);
  wrap.addEventListener('input', refreshAll);
  refreshAll();
  initAddonUploads(wrap);

  return wrap;
};
