/**
 * Chat Widget Session Management
 * Session creation and authentication modal
 */

import { API_ENDPOINTS } from './config.js';

export class ChatSession {
  constructor(storage, ui) {
    this.storage = storage;
    this.ui = ui;
  }

  async startSession() {
    const res = await fetch(API_ENDPOINTS.START, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: this.storage.name,
        email: this.storage.email
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.sessionId) {
      throw new Error(data.error || 'Failed to start session');
    }

    this.storage.saveSession(data.sessionId, this.storage.name, this.storage.email);
    return data.sessionId;
  }

  showSessionModal(onComplete) {
    this.ui.elements.input.disabled = true;
    this.ui.elements.sendBtn.disabled = true;
    this.ui.updateAuthUI(false);

    const modal = this.ui.createElement('div', { class: 'wc-modal', id: 'wc-modal' }, [
      this.ui.createElement('div', { style: 'font-weight:800; margin-bottom:8px;' }, ['Start chat']),
      this.ui.createElement('label', {}, ['Name']),
      this.ui.createElement('input', { id: 'wc-name', value: this.storage.name || '' }),
      this.ui.createElement('label', {}, ['Email']),
      this.ui.createElement('input', { id: 'wc-email', value: this.storage.email || '' }),
      this.ui.createElement('div', { class: 'row' }, [
        this.ui.createElement('button', {
          class: 'wc-secondary',
          type: 'button',
          onclick: () => {
            if (onComplete) onComplete(false);
          }
        }, ['Cancel']),
        this.ui.createElement('button', {
          class: 'wc-primary',
          type: 'button',
          onclick: async () => {
            const n = String(modal.querySelector('#wc-name').value || '').trim();
            const e = String(modal.querySelector('#wc-email').value || '').trim();
            if (!n || !e) return alert('Please enter name and email.');

            this.storage.name = n;
            this.storage.email = e;

            try {
              await this.startSession();
              modal.remove();
              this.ui.elements.input.disabled = false;
              this.ui.elements.sendBtn.disabled = false;
              this.ui.elements.input.focus();
              this.ui.updateAuthUI(true);

              if (onComplete) onComplete(true);
            } catch (err) {
              alert('Failed to start session: ' + err.message);
            }
          }
        }, ['Start'])
      ])
    ]);

    this.ui.elements.body.insertBefore(modal, this.ui.elements.messagesEl.nextSibling);
  }

  async ensureSession(onComplete) {
    if (this.storage.sessionId) {
      if (onComplete) onComplete(true);
      return;
    }

    const old = this.ui.elements.panel.querySelector('#wc-modal');
    if (old) old.remove();

    this.showSessionModal(onComplete);
  }
}
