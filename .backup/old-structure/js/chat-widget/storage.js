/**
 * Chat Widget Storage Management
 * LocalStorage operations and session data
 */

import { STORAGE_KEYS } from './config.js';

export class ChatStorage {
  constructor() {
    this.sessionId = '';
    this.name = '';
    this.email = '';
    this.loadSession();
  }

  loadSession() {
    // Prefer the new single-key session object
    try {
      const obj = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_OBJ) || 'null');
      if (obj && typeof obj === 'object') {
        this.sessionId = String(obj.sessionId || '');
        this.name = String(obj.name || '');
        this.email = String(obj.email || '');
      }
    } catch {}

    // Back-compat: fall back to older separate keys
    if (!this.sessionId) this.sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID) || '';
    if (!this.name) this.name = localStorage.getItem(STORAGE_KEYS.NAME) || '';
    if (!this.email) this.email = localStorage.getItem(STORAGE_KEYS.EMAIL) || '';
  }

  saveSession(sessionId, name, email) {
    this.sessionId = sessionId || this.sessionId;
    this.name = name || this.name;
    this.email = email || this.email;

    localStorage.setItem(STORAGE_KEYS.SESSION_OBJ, JSON.stringify({
      sessionId: this.sessionId,
      name: this.name,
      email: this.email
    }));

    // Back-compat
    if (this.sessionId) localStorage.setItem(STORAGE_KEYS.SESSION_ID, this.sessionId);
  }

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION_OBJ);
    localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    localStorage.removeItem(STORAGE_KEYS.NAME);
    localStorage.removeItem(STORAGE_KEYS.EMAIL);
    localStorage.removeItem(STORAGE_KEYS.COOLDOWN_UNTIL);

    this.sessionId = '';
    this.name = '';
    this.email = '';
  }

  getIsOpen() {
    return localStorage.getItem(STORAGE_KEYS.OPEN) === 'true';
  }

  setIsOpen(open) {
    localStorage.setItem(STORAGE_KEYS.OPEN, open ? 'true' : 'false');
  }

  getCooldownUntil() {
    const v = Number(localStorage.getItem(STORAGE_KEYS.COOLDOWN_UNTIL) || '0') || 0;
    return v;
  }

  setCooldownUntil(ts) {
    localStorage.setItem(STORAGE_KEYS.COOLDOWN_UNTIL, String(ts));
  }
}
