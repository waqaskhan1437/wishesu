import { ADDON_TYPES } from '../data/data.js';
import { slugify, toNum, toInt } from '../utils/utils.js';

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  [].concat(children).filter(Boolean).forEach((child) => {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
};

const optionRow = () => {
  const row = el('div', { class: 'addon-option' }, [
    el('input', { class: 'addon-opt-label', placeholder: 'Option label' }),
    el('input', { class: 'addon-opt-price', type: 'number', placeholder: 'Price' }),
    el('label', { class: 'addon-inline' }, [el('input', { class: 'addon-opt-file', type: 'checkbox' }), 'File']),
    el('input', { class: 'addon-opt-fileqty opt-hidden', type: 'number', placeholder: 'Qty' }),
    el('label', { class: 'addon-inline' }, [el('input', { class: 'addon-opt-text', type: 'checkbox' }), 'Text']),
    el('input', { class: 'addon-opt-textlabel opt-hidden', placeholder: 'Text label' }),
    el('input', { class: 'addon-opt-textph opt-hidden', placeholder: 'Text placeholder' }),
    el('label', { class: 'addon-inline' }, [el('input', { class: 'addon-opt-default', type: 'checkbox' }), 'Default']),
    el('label', { class: 'addon-inline' }, [el('input', { class: 'addon-opt-delivery', type: 'checkbox' }), 'Delivery']),
    el('label', { class: 'addon-inline opt-hidden' }, [el('input', { class: 'addon-opt-delivery-instant', type: 'checkbox' }), 'Instant']),
    el('input', { class: 'addon-opt-delivery-days opt-hidden', type: 'number', placeholder: 'Days' }),
    el('button', { class: 'btn-ghost', type: 'button', text: 'Remove' })
  ]);
  const updateVisibility = () => {
    const showFile = row.querySelector('.addon-opt-file')?.checked;
    const showText = row.querySelector('.addon-opt-text')?.checked;
    const showDelivery = row.querySelector('.addon-opt-delivery')?.checked;
    row.querySelector('.addon-opt-fileqty')?.classList.toggle('opt-hidden', !showFile);
    row.querySelector('.addon-opt-textlabel')?.classList.toggle('opt-hidden', !showText);
    row.querySelector('.addon-opt-textph')?.classList.toggle('opt-hidden', !showText);
    row.querySelector('.addon-opt-delivery-instant')?.closest('.addon-inline')?.classList.toggle('opt-hidden', !showDelivery);
    row.querySelector('.addon-opt-delivery-days')?.classList.toggle('opt-hidden', !showDelivery);
  };
  row.querySelector('.addon-opt-file')?.addEventListener('change', updateVisibility);
  row.querySelector('.addon-opt-text')?.addEventListener('change', updateVisibility);
  row.querySelector('.addon-opt-delivery')?.addEventListener('change', updateVisibility);
  updateVisibility();
  row.querySelector('button').addEventListener('click', () => row.remove());
  return row;
};

const renderOptions = (wrap) => {
  const list = el('div', { class: 'addon-options' });
  const add = el('button', { class: 'btn-ghost', type: 'button', text: 'Add option' });
  add.addEventListener('click', () => list.appendChild(optionRow()));
  list.appendChild(optionRow());
  wrap.appendChild(list);
  wrap.appendChild(add);
};

export const renderTypeConfig = (field) => {
  const type = field.querySelector('.addon-type')?.value || '';
  const cfg = field.querySelector('.addon-config');
  cfg.innerHTML = '';
  if (type === 'heading') {
    cfg.appendChild(el('input', { class: 'addon-heading-text', placeholder: 'Heading text' }));
  } else if (type === 'text' || type === 'textarea' || type === 'email') {
    cfg.appendChild(el('input', { class: 'addon-placeholder', placeholder: 'Placeholder' }));
    cfg.appendChild(el('input', { class: 'addon-price', type: 'number', placeholder: 'Price' }));
    cfg.appendChild(el('label', { class: 'addon-inline' }, [el('input', { class: 'addon-required', type: 'checkbox' }), 'Required']));
  } else if (type === 'file') {
    cfg.appendChild(el('input', { class: 'addon-file-price', type: 'number', placeholder: 'Price per unit' }));
    cfg.appendChild(el('label', { class: 'addon-inline' }, [el('input', { class: 'addon-file-multi', type: 'checkbox' }), 'Multiple']));
    cfg.appendChild(el('label', { class: 'addon-inline' }, [el('input', { class: 'addon-file-qty', type: 'checkbox' }), 'Ask quantity']));
    cfg.appendChild(el('label', { class: 'addon-inline' }, [el('input', { class: 'addon-required', type: 'checkbox' }), 'Required']));
  } else if (type === 'radio' || type === 'select' || type === 'checkbox_group') {
    renderOptions(cfg);
  }
};

export const createFieldRow = (idx) => {
  const row = el('div', { class: 'addon-field' }, [
    el('select', { class: 'addon-type' }, ADDON_TYPES.map((t) => el('option', { value: t.v, text: t.t }))),
    el('input', { class: 'addon-label', placeholder: 'Field label' }),
    el('div', { class: 'addon-config' }),
    el('button', { class: 'btn-ghost', type: 'button', text: 'Remove' })
  ]);
  row.querySelector('button').addEventListener('click', () => row.remove());
  row.querySelector('.addon-type').addEventListener('change', () => renderTypeConfig(row));
  return row;
};

export const applyFieldConfig = (row, cfg) => {
  if (!cfg) return;
  const typeSel = row.querySelector('.addon-type');
  const labelInput = row.querySelector('.addon-label');
  if (typeSel) typeSel.value = cfg.type || '';
  if (labelInput) labelInput.value = cfg.label || '';
  renderTypeConfig(row);
  if (cfg.type === 'heading') {
    const heading = row.querySelector('.addon-heading-text');
    if (heading) heading.value = cfg.text || cfg.label || '';
  }
  if (cfg.type === 'text' || cfg.type === 'textarea' || cfg.type === 'email') {
    const placeholder = row.querySelector('.addon-placeholder');
    const price = row.querySelector('.addon-price');
    const required = row.querySelector('.addon-required');
    if (placeholder) placeholder.value = cfg.placeholder || '';
    if (price) price.value = String(cfg.price || 0);
    if (required) required.checked = !!cfg.required;
  }
  if (cfg.type === 'file') {
    const price = row.querySelector('.addon-file-price');
    const multi = row.querySelector('.addon-file-multi');
    const qty = row.querySelector('.addon-file-qty');
    const required = row.querySelector('.addon-required');
    if (price) price.value = String(cfg.file?.pricePerUnit || 0);
    if (multi) multi.checked = !!cfg.file?.multiple;
    if (qty) qty.checked = !!cfg.file?.askQuantity;
    if (required) required.checked = !!cfg.required;
  }
  if (cfg.type === 'radio' || cfg.type === 'select' || cfg.type === 'checkbox_group') {
    const wrap = row.querySelector('.addon-options');
    if (!wrap) return;
    wrap.innerHTML = '';
    (cfg.options || []).forEach((opt) => {
      const optRow = optionRow();
      wrap.appendChild(optRow);
      const setCheck = (selector, value) => {
        const input = optRow.querySelector(selector);
        if (!input) return;
        input.checked = !!value;
        input.dispatchEvent(new Event('change'));
      };
      const setValue = (selector, value) => {
        const input = optRow.querySelector(selector);
        if (input && value !== undefined) input.value = value;
      };
      setValue('.addon-opt-label', opt.label || '');
      setValue('.addon-opt-price', String(opt.price || 0));
      setCheck('.addon-opt-file', !!opt.file);
      setValue('.addon-opt-fileqty', String(opt.fileQuantity || 1));
      setCheck('.addon-opt-text', !!opt.textField);
      setValue('.addon-opt-textlabel', opt.textLabel || '');
      setValue('.addon-opt-textph', opt.textPlaceholder || '');
      setCheck('.addon-opt-default', !!opt.default);
      if (opt.delivery) {
        setCheck('.addon-opt-delivery', true);
        setCheck('.addon-opt-delivery-instant', !!opt.delivery.instant);
        setValue('.addon-opt-delivery-days', String(opt.delivery.days || 0));
      }
    });
  }
};

export const readFieldConfig = (field, idx) => {
  const type = field.querySelector('.addon-type')?.value || '';
  const label = (field.querySelector('.addon-label')?.value || '').trim();
  if (!type) return null;
  if (!label && type !== 'heading') return null;
  const base = { id: slugify(label || 'heading', idx + 1), type, label };
  if (type === 'heading') {
    base.text = (field.querySelector('.addon-heading-text')?.value || label).trim();
  } else if (type === 'text' || type === 'textarea' || type === 'email') {
    base.placeholder = (field.querySelector('.addon-placeholder')?.value || '').trim();
    base.price = toNum(field.querySelector('.addon-price')?.value);
    base.required = !!field.querySelector('.addon-required')?.checked;
  } else if (type === 'file') {
    base.file = {
      pricePerUnit: toNum(field.querySelector('.addon-file-price')?.value),
      multiple: !!field.querySelector('.addon-file-multi')?.checked,
      askQuantity: !!field.querySelector('.addon-file-qty')?.checked
    };
    base.required = !!field.querySelector('.addon-required')?.checked;
  } else if (type === 'radio' || type === 'select' || type === 'checkbox_group') {
    const opts = [];
    field.querySelectorAll('.addon-option').forEach((row) => {
      const lab = (row.querySelector('.addon-opt-label')?.value || '').trim();
      if (!lab) return;
      const opt = {
        label: lab,
        price: toNum(row.querySelector('.addon-opt-price')?.value),
        file: !!row.querySelector('.addon-opt-file')?.checked,
        textField: !!row.querySelector('.addon-opt-text')?.checked,
        default: !!row.querySelector('.addon-opt-default')?.checked
      };
      if (opt.file) opt.fileQuantity = toInt(row.querySelector('.addon-opt-fileqty')?.value) || 1;
      if (opt.textField) {
        opt.textLabel = (row.querySelector('.addon-opt-textlabel')?.value || '').trim();
        opt.textPlaceholder = (row.querySelector('.addon-opt-textph')?.value || '').trim();
      }
      if (row.querySelector('.addon-opt-delivery')?.checked) {
        opt.delivery = {
          instant: !!row.querySelector('.addon-opt-delivery-instant')?.checked,
          days: toInt(row.querySelector('.addon-opt-delivery-days')?.value) || 0
        };
      }
      opts.push(opt);
    });
    if (!opts.length) return null;
    base.options = opts;
  }
  return base;
};

