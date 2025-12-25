/**
 * Toast Notification Component
 * Non-intrusive notification messages
 */

import { createElement } from '../utils/dom-helper.js';

export class Toast {
  constructor(options = {}) {
    this.options = {
      message: options.message || '',
      type: options.type || 'info', // success, error, warning, info
      duration: options.duration || 3000,
      position: options.position || 'top-right',
      closable: options.closable !== false
    };

    this.element = null;
    this.timeout = null;
  }

  /**
   * Create toast element
   */
  _createToast() {
    const toast = createElement('div', {
      className: `toast toast-${this.options.type}`
    });

    const content = createElement('div', {
      className: 'toast-content',
      textContent: this.options.message
    });

    toast.appendChild(content);

    if (this.options.closable) {
      const closeBtn = createElement('button', {
        className: 'toast-close',
        innerHTML: '&times;',
        type: 'button'
      });

      closeBtn.addEventListener('click', () => this.hide());
      toast.appendChild(closeBtn);
    }

    return toast;
  }

  /**
   * Show toast
   */
  show() {
    if (!this.element) {
      this.element = this._createToast();
    }

    // Get or create container
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = createElement('div', {
        className: `toast-container ${this.options.position}`
      });
      document.body.appendChild(container);
    }

    container.appendChild(this.element);

    // Trigger animation
    setTimeout(() => {
      this.element.classList.add('show');
    }, 10);

    // Auto hide
    if (this.options.duration > 0) {
      this.timeout = setTimeout(() => {
        this.hide();
      }, this.options.duration);
    }

    return this;
  }

  /**
   * Hide toast
   */
  hide() {
    if (!this.element) return this;

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.element.classList.remove('show');

    setTimeout(() => {
      if (this.element && this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }
    }, 300);

    return this;
  }

  /**
   * Static helpers
   */
  static success(message, duration) {
    return new Toast({ message, type: 'success', duration }).show();
  }

  static error(message, duration) {
    return new Toast({ message, type: 'error', duration }).show();
  }

  static warning(message, duration) {
    return new Toast({ message, type: 'warning', duration }).show();
  }

  static info(message, duration) {
    return new Toast({ message, type: 'info', duration }).show();
  }
}

export default Toast;
