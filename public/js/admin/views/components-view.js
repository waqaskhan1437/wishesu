/**
 * Components View
 * UI Components showcase and documentation
 */

import Toast from '../../components/shared/toast-notification.js';
import LoadingSpinner from '../../components/shared/loading-spinner.js';
import ConfirmModal from '../../components/modal/confirm-modal.js';
import FormModal from '../../components/modal/form-modal.js';
import { createElement } from '../../utils/dom-helper.js';

export class ComponentsView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = '';

    const header = this._createHeader();
    this.container.appendChild(header);

    const content = this._createContent();
    this.container.appendChild(content);
  }

  _createHeader() {
    const header = createElement('div', {
      className: 'view-header',
      style: 'margin-bottom: 30px;'
    });

    const title = createElement('h2', {
      textContent: 'UI Components',
      style: 'margin: 0 0 10px 0;'
    });

    const subtitle = createElement('p', {
      textContent: 'Test and preview available UI components',
      style: 'color: #666; margin: 0;'
    });

    header.appendChild(title);
    header.appendChild(subtitle);
    return header;
  }

  _createContent() {
    const content = createElement('div', {
      className: 'components-grid',
      style: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;'
    });

    // Toast Component Card
    content.appendChild(this._createCard(
      '🔔 Toast Notifications',
      'Display success, error, warning, and info messages',
      [
        { label: 'Success', onClick: () => Toast.show({ message: 'Operation successful!', type: 'success' }) },
        { label: 'Error', onClick: () => Toast.show({ message: 'Something went wrong!', type: 'error' }) },
        { label: 'Warning', onClick: () => Toast.show({ message: 'Please be careful!', type: 'warning' }) },
        { label: 'Info', onClick: () => Toast.show({ message: 'Here is some info', type: 'info' }) }
      ]
    ));

    // Loading Spinner Card
    content.appendChild(this._createCard(
      '⏳ Loading Spinner',
      'Show loading state during async operations',
      [
        { label: 'Show Spinner (2s)', onClick: () => {
          const spinner = LoadingSpinner.show({ text: 'Loading...' });
          setTimeout(() => LoadingSpinner.hide(spinner), 2000);
        }},
        { label: 'Custom Text', onClick: () => {
          const spinner = LoadingSpinner.show({ text: 'Processing your request...' });
          setTimeout(() => LoadingSpinner.hide(spinner), 2000);
        }}
      ]
    ));

    // Confirm Modal Card
    content.appendChild(this._createCard(
      '❓ Confirm Modal',
      'Ask user for confirmation before actions',
      [
        { label: 'Show Confirm', onClick: async () => {
          const result = await ConfirmModal.show({
            title: 'Confirm Action',
            message: 'Are you sure you want to proceed?',
            confirmText: 'Yes, proceed',
            cancelText: 'Cancel'
          });
          Toast.show({ message: result ? 'Confirmed!' : 'Cancelled', type: result ? 'success' : 'info' });
        }},
        { label: 'Delete Confirm', onClick: async () => {
          const result = await ConfirmModal.show({
            title: 'Delete Item',
            message: 'This action cannot be undone. Are you sure?',
            confirmText: 'Delete',
            cancelText: 'Keep'
          });
          Toast.show({ message: result ? 'Deleted!' : 'Kept safe', type: result ? 'warning' : 'success' });
        }}
      ]
    ));

    // Form Modal Card
    content.appendChild(this._createCard(
      '📝 Form Modal',
      'Display forms in a modal dialog',
      [
        { label: 'Simple Form', onClick: async () => {
          const result = await FormModal.show({
            title: 'Contact Form',
            fields: [
              { name: 'name', label: 'Name', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'message', label: 'Message', type: 'textarea' }
            ],
            submitText: 'Send'
          });
          if (result) {
            Toast.show({ message: `Form submitted: ${JSON.stringify(result)}`, type: 'success' });
          }
        }},
        { label: 'With Select', onClick: async () => {
          const result = await FormModal.show({
            title: 'Settings',
            fields: [
              { name: 'theme', label: 'Theme', type: 'select', options: [
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' }
              ]},
              { name: 'notifications', label: 'Enable Notifications', type: 'checkbox' }
            ],
            submitText: 'Save'
          });
          if (result) {
            Toast.show({ message: 'Settings saved!', type: 'success' });
          }
        }}
      ]
    ));

    // Buttons Card
    content.appendChild(this._createCard(
      '🔘 Buttons',
      'Available button styles',
      [],
      this._createButtonShowcase()
    ));

    // Colors Card
    content.appendChild(this._createCard(
      '🎨 Colors',
      'Theme color palette',
      [],
      this._createColorShowcase()
    ));

    return content;
  }

  _createCard(title, description, buttons, customContent = null) {
    const card = createElement('div', {
      className: 'component-card',
      style: `
        background: white;
        border-radius: 8px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `
    });

    const cardTitle = createElement('h3', {
      textContent: title,
      style: 'margin: 0 0 10px 0; font-size: 18px;'
    });

    const cardDesc = createElement('p', {
      textContent: description,
      style: 'color: #666; margin: 0 0 15px 0; font-size: 14px;'
    });

    card.appendChild(cardTitle);
    card.appendChild(cardDesc);

    if (customContent) {
      card.appendChild(customContent);
    }

    if (buttons.length > 0) {
      const btnContainer = createElement('div', {
        style: 'display: flex; flex-wrap: wrap; gap: 10px;'
      });

      buttons.forEach(btn => {
        const button = createElement('button', {
          className: 'btn btn-primary btn-sm',
          textContent: btn.label
        });
        button.addEventListener('click', btn.onClick);
        btnContainer.appendChild(button);
      });

      card.appendChild(btnContainer);
    }

    return card;
  }

  _createButtonShowcase() {
    const container = createElement('div', {
      style: 'display: flex; flex-wrap: wrap; gap: 10px;'
    });

    const buttons = [
      { class: 'btn btn-primary', text: 'Primary' },
      { class: 'btn btn-secondary', text: 'Secondary' },
      { class: 'btn btn-success', text: 'Success' },
      { class: 'btn btn-danger', text: 'Danger' },
      { class: 'btn btn-warning', text: 'Warning' },
      { class: 'btn btn-info', text: 'Info' }
    ];

    buttons.forEach(btn => {
      const button = createElement('button', {
        className: btn.class,
        textContent: btn.text
      });
      container.appendChild(button);
    });

    return container;
  }

  _createColorShowcase() {
    const container = createElement('div', {
      style: 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;'
    });

    const colors = [
      { name: 'Primary', color: '#007bff' },
      { name: 'Success', color: '#28a745' },
      { name: 'Danger', color: '#dc3545' },
      { name: 'Warning', color: '#ffc107' },
      { name: 'Info', color: '#17a2b8' },
      { name: 'Dark', color: '#343a40' }
    ];

    colors.forEach(c => {
      const colorBox = createElement('div', {
        style: `
          background: ${c.color};
          color: white;
          padding: 10px;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
        `,
        textContent: c.name
      });
      container.appendChild(colorBox);
    });

    return container;
  }
}

export default ComponentsView;
