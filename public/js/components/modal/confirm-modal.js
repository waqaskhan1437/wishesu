/**
 * Confirm Modal Component
 * Specialized modal for confirmation dialogs
 * Replaces duplicate confirmation logic across codebase
 */

import Modal from './modal.js';

export class ConfirmModal extends Modal {
  constructor(options = {}) {
    const defaultOptions = {
      title: options.title || 'Confirm',
      message: options.message || 'Are you sure?',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      confirmClass: options.confirmClass || 'btn-primary',
      cancelClass: options.cancelClass || 'btn-secondary',
      type: options.type || 'default', // default, danger, warning, info
      onConfirm: options.onConfirm || null,
      onCancel: options.onCancel || null
    };

    // Set content as message
    const content = `<p class="confirm-message">${defaultOptions.message}</p>`;

    // Create footer buttons
    const footer = [
      {
        text: defaultOptions.cancelText,
        className: `btn ${defaultOptions.cancelClass}`,
        onClick: () => {
          if (defaultOptions.onCancel) {
            defaultOptions.onCancel();
          }
          this.hide();
        }
      },
      {
        text: defaultOptions.confirmText,
        className: `btn ${defaultOptions.confirmClass}`,
        onClick: async () => {
          if (defaultOptions.onConfirm) {
            try {
              await defaultOptions.onConfirm();
              this.hide();
            } catch (error) {
              console.error('Confirm action error:', error);
            }
          } else {
            this.hide();
          }
        }
      }
    ];

    super({
      title: defaultOptions.title,
      content,
      footer,
      size: 'small',
      className: `confirm-modal confirm-${defaultOptions.type}`,
      closable: true,
      onShow: options.onShow,
      onHide: options.onHide
    });
  }

  /**
   * Static helper to show confirm dialog
   */
  static confirm(options) {
    return new Promise((resolve, reject) => {
      const modal = new ConfirmModal({
        ...options,
        onConfirm: async () => {
          try {
            if (options.onConfirm) {
              await options.onConfirm();
            }
            resolve(true);
          } catch (error) {
            reject(error);
          }
        },
        onCancel: () => {
          if (options.onCancel) {
            options.onCancel();
          }
          resolve(false);
        }
      });
      modal.show();
    });
  }

  /**
   * Static helper for delete confirmation
   */
  static delete(itemName, onConfirm) {
    return ConfirmModal.confirm({
      title: 'Delete Confirmation',
      message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmClass: 'btn-danger',
      type: 'danger',
      onConfirm
    });
  }

  /**
   * Static helper for warning confirmation
   */
  static warning(message, onConfirm) {
    return ConfirmModal.confirm({
      title: 'Warning',
      message,
      confirmText: 'Continue',
      cancelText: 'Cancel',
      confirmClass: 'btn-warning',
      type: 'warning',
      onConfirm
    });
  }

  /**
   * Static helper for info confirmation
   */
  static info(message, onConfirm) {
    return ConfirmModal.confirm({
      title: 'Information',
      message,
      confirmText: 'OK',
      cancelText: 'Cancel',
      confirmClass: 'btn-info',
      type: 'info',
      onConfirm
    });
  }
}

export default ConfirmModal;
