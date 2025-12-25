/**
 * Form Modal Component
 * Modal with form submission functionality
 * Replaces duplicate form modal creation in dashboard
 */

import Modal from './modal.js';
import { createElement } from '../utils/dom-helper.js';

export class FormModal extends Modal {
  constructor(options = {}) {
    const defaultOptions = {
      title: options.title || 'Form',
      fields: options.fields || [],
      submitText: options.submitText || 'Submit',
      cancelText: options.cancelText || 'Cancel',
      onSubmit: options.onSubmit || null,
      onCancel: options.onCancel || null,
      formData: options.formData || {}
    };

    // Create form content
    const form = createElement('form', { className: 'modal-form' });

    // Create form fields
    defaultOptions.fields.forEach(field => {
      const formGroup = FormModal._createField(field, defaultOptions.formData);
      form.appendChild(formGroup);
    });

    // Create footer buttons
    const footer = [
      {
        text: defaultOptions.cancelText,
        className: 'btn btn-secondary',
        onClick: () => {
          if (defaultOptions.onCancel) {
            defaultOptions.onCancel();
          }
          this.hide();
        }
      },
      {
        text: defaultOptions.submitText,
        className: 'btn btn-primary',
        onClick: async () => {
          const formData = this._getFormData(form);
          if (defaultOptions.onSubmit) {
            try {
              const result = await defaultOptions.onSubmit(formData);
              if (result !== false) {
                this.hide();
              }
            } catch (error) {
              console.error('Form submit error:', error);
            }
          }
        }
      }
    ];

    super({
      title: defaultOptions.title,
      content: form,
      footer,
      size: options.size || 'medium',
      className: 'form-modal',
      closable: true,
      onShow: options.onShow,
      onHide: options.onHide
    });

    this.form = form;

    // Submit on Enter key
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = this.element.querySelector('.btn-primary');
      if (submitBtn) submitBtn.click();
    });
  }

  /**
   * Create form field
   */
  static _createField(field, formData) {
    const formGroup = createElement('div', { className: 'form-group' });

    // Label
    if (field.label) {
      const label = createElement('label', {
        textContent: field.label,
        htmlFor: field.name
      });
      if (field.required) {
        label.innerHTML += ' <span class="required">*</span>';
      }
      formGroup.appendChild(label);
    }

    // Input element
    let input;
    const value = formData[field.name] || field.defaultValue || '';

    switch (field.type) {
      case 'textarea':
        input = createElement('textarea', {
          name: field.name,
          id: field.name,
          className: 'form-control',
          placeholder: field.placeholder || '',
          rows: field.rows || 4
        });
        input.value = value;
        break;

      case 'select':
        input = createElement('select', {
          name: field.name,
          id: field.name,
          className: 'form-control'
        });
        if (field.options) {
          field.options.forEach(opt => {
            const option = createElement('option', {
              value: opt.value,
              textContent: opt.label
            });
            if (opt.value === value) {
              option.selected = true;
            }
            input.appendChild(option);
          });
        }
        break;

      case 'checkbox':
        input = createElement('input', {
          type: 'checkbox',
          name: field.name,
          id: field.name,
          className: 'form-check-input'
        });
        input.checked = !!value;
        formGroup.classList.add('form-check');
        break;

      default:
        input = createElement('input', {
          type: field.type || 'text',
          name: field.name,
          id: field.name,
          className: 'form-control',
          placeholder: field.placeholder || ''
        });
        input.value = value;
    }

    if (field.required) {
      input.required = true;
    }

    if (field.pattern) {
      input.pattern = field.pattern;
    }

    if (field.min !== undefined) {
      input.min = field.min;
    }

    if (field.max !== undefined) {
      input.max = field.max;
    }

    formGroup.appendChild(input);

    // Help text
    if (field.help) {
      const helpText = createElement('small', {
        className: 'form-text text-muted',
        textContent: field.help
      });
      formGroup.appendChild(helpText);
    }

    return formGroup;
  }

  /**
   * Get form data as object
   */
  _getFormData(form) {
    const formData = {};
    const elements = form.elements;

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.name) {
        if (element.type === 'checkbox') {
          formData[element.name] = element.checked;
        } else if (element.type === 'number') {
          formData[element.name] = element.value ? Number(element.value) : null;
        } else {
          formData[element.name] = element.value;
        }
      }
    }

    return formData;
  }

  /**
   * Static helper to show form modal
   */
  static show(options) {
    const modal = new FormModal(options);
    modal.show();
    return modal;
  }

  /**
   * Static helper with promise
   */
  static prompt(options) {
    return new Promise((resolve, reject) => {
      const modal = new FormModal({
        ...options,
        onSubmit: async (formData) => {
          try {
            if (options.onSubmit) {
              await options.onSubmit(formData);
            }
            resolve(formData);
          } catch (error) {
            reject(error);
            return false; // Don't close modal
          }
        },
        onCancel: () => {
          resolve(null);
        }
      });
      modal.show();
    });
  }
}

export default FormModal;
