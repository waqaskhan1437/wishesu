/**
 * Chat Widget Messaging
 * Message sending, receiving, and polling
 */

import { API_ENDPOINTS, LIMITS } from './config.js';
import { TabLeader } from './leader.js';

export class ChatMessaging {
  constructor(storage, ui) {
    this.storage = storage;
    this.ui = ui;
    this.lastId = 0;
    this.seenIds = new Set();
    this.recentLocal = [];
    this.pollTimer = null;
    this.isSending = false;
    this.cooldownTimer = null;
  }

  startCooldown() {
    const until = Date.now() + LIMITS.COOLDOWN_MS;
    this.storage.setCooldownUntil(until);
    this.applyCooldownUI();
  }

  applyCooldownUI() {
    const until = this.storage.getCooldownUntil();
    const remaining = Math.max(0, until - Date.now());

    if (this.isSending) {
      this.ui.elements.sendBtn.disabled = true;
      this.ui.elements.sendBtn.textContent = 'Sending';
      this.ui.elements.hint.textContent = '';
      return;
    }

    if (!this.storage.sessionId) {
      this.ui.elements.sendBtn.disabled = true;
      this.ui.elements.sendBtn.textContent = 'Send';
      this.ui.elements.hint.textContent = '';
      return;
    }

    if (remaining <= 0) {
      this.ui.elements.sendBtn.disabled = false;
      this.ui.elements.sendBtn.textContent = 'Send';
      this.ui.elements.hint.textContent = '';
      if (this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
      return;
    }

    this.ui.elements.sendBtn.disabled = true;
    const secs = Math.ceil(remaining / 1000);
    this.ui.elements.sendBtn.textContent = `Wait ${secs}s`;
    this.ui.elements.hint.textContent = 'Please wait before sending another message.';

    if (!this.cooldownTimer) {
      this.cooldownTimer = setInterval(() => {
        const rem = Math.max(0, this.storage.getCooldownUntil() - Date.now());
        if (rem <= 0) {
          clearInterval(this.cooldownTimer);
          this.cooldownTimer = null;
          this.applyCooldownUI();
        } else {
          const s = Math.ceil(rem / 1000);
          this.ui.elements.sendBtn.textContent = `Wait ${s}s`;
        }
      }, 250);
    }
  }

  async sendMessage(text) {
    if (this.isSending) return;
    if (!this.storage.sessionId) return;

    if (this.storage.getCooldownUntil() > Date.now()) {
      this.applyCooldownUI();
      return;
    }

    const msg = String(text ?? this.ui.elements.input.value ?? '').trim();
    if (!msg) return;

    if (msg.length > LIMITS.MAX_MESSAGE_LENGTH) {
      alert(`Max ${LIMITS.MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    this.isSending = true;
    this.applyCooldownUI();

    try {
      const res = await fetch(API_ENDPOINTS.SEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.storage.sessionId,
          role: 'user',
          content: msg
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Failed to send');
        return;
      }

      const mid = Number(data.messageId || 0);
      if (mid) {
        this.lastId = Math.max(this.lastId, mid);
        this.seenIds.add(mid);
      }

      this.recentLocal.push({
        content: this.ui.escapeText(msg),
        ts: Date.now()
      });
      if (this.recentLocal.length > 10) this.recentLocal.shift();

      this.ui.appendMessage('user', msg, new Date().toISOString());
      this.ui.elements.input.value = '';
      this.ui.updateCounter();

      this.startCooldown();
      await this.syncNow();
    } finally {
      this.isSending = false;
      this.applyCooldownUI();
    }
  }

  async syncNow() {
    if (!this.storage.sessionId) return;

    const res = await fetch(
      `${API_ENDPOINTS.SYNC}?sessionId=${encodeURIComponent(this.storage.sessionId)}&sinceId=${encodeURIComponent(String(this.lastId))}`
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;

    const messages = data.messages || [];
    for (const m of messages) {
      const mid = Number(m.id) || 0;
      if (mid && this.seenIds.has(mid)) continue;

      if (m.role === 'user') {
        const dup = this.recentLocal.find(
          r => r.content === String(m.content || '') && (Date.now() - r.ts) < 10000
        );
        if (dup) {
          if (mid) this.seenIds.add(mid);
          this.lastId = Math.max(this.lastId, mid || this.lastId);
          continue;
        }
      }

      if (mid) this.seenIds.add(mid);
      this.lastId = Math.max(this.lastId, mid || this.lastId);
      this.ui.appendMessage(m.role, m.content, m.created_at);
    }

    if (Number(data.lastId)) {
      this.lastId = Math.max(this.lastId, Number(data.lastId));
    }
  }

  startPolling() {
    if (this.pollTimer) return;
    if (document.hidden) return;

    if (!TabLeader.tryBecomeLeader()) return;

    this.pollTimer = window.setInterval(async () => {
      if (document.hidden) {
        this.stopPolling();
        return;
      }

      if (!TabLeader.heartbeatLeader()) {
        this.stopPolling();
        return;
      }

      await this.syncNow();
    }, LIMITS.POLL_INTERVAL_MS);
  }

  stopPolling() {
    if (!this.pollTimer) return;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }
}

