import { el } from './element.js';

export const createOptionRow = () => {
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
