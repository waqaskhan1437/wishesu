/**
 * Base Modal Component
 * Reusable modal dialog with customizable content
 * Eliminates duplicate modal creation code across dashboard
 */

import { createElement } from '../../utils/dom-helper.js';
import eventBus from '../../scripts/event-bus.js';

export class Modal {
  constructor(options = {}) {
    this.options = {
      title: options.title || 'Modal',
      content: options.content || '',
      size: options.size || 'medium', // small, medium, large, fullscreen
      closable: options.closable !== false,
      backdrop: options.backdrop !== false,
      keyboard: options.keyboard !== false,
      footer: options.footer || null,
      onShow: options.onShow || null,
      onHide: options.onHide || null,
      onConfirm: options.onConfirm || null,
      className: options.className || ''
    };

    this.element = null;
    this.backdrop = null;
    this.isVisible = false;
  }

  /**
   * Create modal HTML structure
   */
  _createModal() {
    const sizeClass = `modal-${this.options.size}`;
    const customClass = this.options.className;

    // Create backdrop
    this.backdrop = createElement('div', {
      className: 'modal-backdrop'
    });

    // Create modal
    this.element = createElement('div', {
      className: `modal ${sizeClass} ${customClass}`,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-title'
    });

    // Create modal dialog
    const dialog = createElement('div', { className: 'modal-dialog' });

    // Create modal content
    const content = createElement('div', { className: 'modal-content' });

    // Header
    const header = this._createHeader();
    content.appendChild(header);

    // Body
    const body = createElement('div', { className: 'modal-body' });
    if (typeof this.options.content === 'string') {
      body.innerHTML = this.options.content;
    } else if (this.options.content instanceof Node) {
      body.appendChild(this.options.content);
    }
    content.appendChild(body);

    // Footer
    if (this.options.footer) {
      const footer = this._createFooter();
      content.appendChild(footer);
    }

    dialog.appendChild(content);
    this.element.appendChild(dialog);

    // Add event listeners
    this._attachEvents();

    return this.element;
  }

  /**
   * Create modal header
   */
  _createHeader() {
    const header = createElement('div', { className: 'modal-header' });

    const title = createElement('h3', {
      className: 'modal-title',
      id: 'modal-title',
      textContent: this.options.title
    });

    header.appendChild(title);

    if (this.options.closable) {
      const closeBtn = createElement('button', {
        className: 'modal-close',
        type: 'button',
        'aria-label': 'Close',
        innerHTML: '&times;'
      });

      closeBtn.addEventListener('click', () => this.hide());
      header.appendChild(closeBtn);
    }

    return header;
  }

  /**
   * Create modal footer
   */
  _createFooter() {
    const footer = createElement('div', { className: 'modal-footer' });

    if (typeof this.options.footer === 'string') {
      footer.innerHTML = this.options.footer;
    } else if (Array.isArray(this.options.footer)) {
      this.options.footer.forEach(btn => {
        const button = createElement('button', {
          className: btn.className || 'btn',
          textContent: btn.text,
          type: 'button'
        });

        if (btn.onClick) {
          button.addEventListener('click', btn.onClick);
        }

        footer.appendChild(button);
      });
    } else if (this.options.footer instanceof Node) {
      footer.appendChild(this.options.footer);
    }

    return footer;
  }

  /**
   * Attach event listeners
   */
  _attachEvents() {
    // Close on backdrop click
    if (this.options.backdrop && this.options.closable) {
      this.backdrop.addEventListener('click', () => this.hide());
    }

    // Close on Escape key
    if (this.options.keyboard && this.options.closable) {
      this._handleKeydown = (e) => {
        if (e.key === 'Escape') {
          this.hide();
        }
      };
      document.addEventListener('keydown', this._handleKeydown);
    }

    // Prevent modal click from closing
    this.element.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Show modal
   */
  show() {
    if (this.isVisible) return;

    if (!this.element) {
      this._createModal();
    }

    // Append to body
    document.body.appendChild(this.backdrop);
    document.body.appendChild(this.element);

    // Trigger show
    setTimeout(() => {
      this.backdrop.classList.add('show');
      this.element.classList.add('show');
      this.isVisible = true;

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Trigger callback
      if (this.options.onShow) {
        this.options.onShow(this);
      }

      // Emit event
      eventBus.emitSync('modal:show', { modal: this });
    }, 10);

    return this;
  }

  /**
   * Hide modal
   */
  hide() {
    if (!this.isVisible) return;

    this.backdrop.classList.remove('show');
    this.element.classList.remove('show');

    setTimeout(() => {
      if (this.backdrop.parentNode) {
        this.backdrop.parentNode.removeChild(this.backdrop);
      }
      if (this.element.parentNode) {
        this.element.parentNode.removeChild(this.element);
      }

      this.isVisible = false;

      // Restore body scroll
      document.body.style.overflow = '';

      // Trigger callback
      if (this.options.onHide) {
        this.options.onHide(this);
      }

      // Emit event
      eventBus.emitSync('modal:hide', { modal: this });
    }, 300); // Wait for animation

    return this;
  }

  /**
   * Update modal content
   */
  setContent(content) {
    const body = this.element.querySelector('.modal-body');
    if (body) {
      if (typeof content === 'string') {
        body.innerHTML = content;
      } else if (content instanceof Node) {
        body.innerHTML = '';
        body.appendChild(content);
      }
    }
    return this;
  }

  /**
   * Update modal title
   */
  setTitle(title) {
    const titleElement = this.element.querySelector('.modal-title');
    if (titleElement) {
      titleElement.textContent = title;
    }
    return this;
  }

  /**
   * Destroy modal
   */
  destroy() {
    if (this._handleKeydown) {
      document.removeEventListener('keydown', this._handleKeydown);
    }

    this.hide();

    this.element = null;
    this.backdrop = null;
  }

  /**
   * Static helper to create and show modal
   */
  static show(options) {
    const modal = new Modal(options);
    modal.show();
    return modal;
  }
}

export default Modal;
