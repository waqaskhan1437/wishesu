/**
 * Whop settings form.
 */

import { createElement } from '../utils/dom-helper.js';

export function createWhopForm(settings, onSave) {
  const form = createElement('form', {
    className: 'settings-form',
    id: 'whop-settings-form'
  });

  const apiKeyGroup = createFormGroup('apiKey', 'Whop API Key', 'text', settings.apiKey || '');
  form.appendChild(apiKeyGroup);

  const planIdGroup = createFormGroup('planId', 'Plan ID (optional)', 'text', settings.planId || '');
  form.appendChild(planIdGroup);

  const saveBtn = createElement('button', {
    type: 'submit',
    className: 'btn btn-primary',
    textContent: 'Save Settings'
  });

  form.appendChild(saveBtn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (typeof onSave === 'function') {
      await onSave();
    }
  });

  return form;
}

function createFormGroup(name, label, type, value) {
  const group = createElement('div', {
    className: 'form-group'
  });

  const labelElement = createElement('label', {
    htmlFor: name,
    textContent: label
  });

  const input = createElement('input', {
    type,
    id: name,
    name,
    className: 'form-control',
    value: value || ''
  });

  group.appendChild(labelElement);
  group.appendChild(input);

  return group;
}
