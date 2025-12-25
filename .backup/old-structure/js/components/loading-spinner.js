/**
 * Loading Spinner Component
 * Reusable loading indicator
 */

import { createElement } from '../utils/dom-helper.js';

export class LoadingSpinner {
  constructor(options = {}) {
    this.options = {
      size: options.size || 'medium', // small, medium, large
      text: options.text || 'Loading...',
      overlay: options.overlay !== false,
      className: options.className || ''
    };

    this.element = null;
    this.isVisible = false;
  }

  /**
   * Create spinner element
   */
  _createSpinner() {
    const wrapper = createElement('div', {
      className: `loading-spinner ${this.options.size} ${this.options.className}`
    });

    if (this.options.overlay) {
      wrapper.classList.add('loading-overlay');
    }

    const spinner = createElement('div', {
      className: 'spinner'
    });

    wrapper.appendChild(spinner);

    if (this.options.text) {
      const text = createElement('div', {
        className: 'loading-text',
        textContent: this.options.text
      });
      wrapper.appendChild(text);
    }

    return wrapper;
  }

  /**
   * Show spinner
   */
  show(container = null) {
    if (this.isVisible) return this;

    if (!this.element) {
      this.element = this._createSpinner();
    }

    const target = container
      ? (typeof container === 'string' ? document.querySelector(container) : container)
      : document.body;

    if (target) {
      target.appendChild(this.element);
      this.isVisible = true;
    }

    return this;
  }

  /**
   * Hide spinner
   */
  hide() {
    if (!this.isVisible || !this.element) return this;

    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.isVisible = false;
    return this;
  }

  /**
   * Update text
   */
  setText(text) {
    if (!this.element) return this;

    const textElement = this.element.querySelector('.loading-text');
    if (textElement) {
      textElement.textContent = text;
    }

    return this;
  }

  /**
   * Static helper
   */
  static show(options = {}) {
    const spinner = new LoadingSpinner(options);
    spinner.show();
    return spinner;
  }
}

export default LoadingSpinner;
