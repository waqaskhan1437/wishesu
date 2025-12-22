/**
 * Chat Widget UI Components
 * DOM creation and manipulation
 */

import { LIMITS } from './config.js';

export class ChatUI {
  constructor() {
    this.elements = {};
    this.createUI();
  }

  createElement(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'class') node.className = v;
      else node.setAttribute(k, String(v));
    }
    for (const c of children) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return node;
  }

  escapeText(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  formatTime(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' });
  }

  createStyles() {
    const style = this.createElement('style', {}, [`
      .wc-chat-btn {
        position: fixed; right: 18px; bottom: 18px; z-index: 999999;
        width: 56px; height: 56px; border-radius: 999px;
        background: #111; color: #fff; border: 0; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; box-shadow: 0 12px 30px rgba(0,0,0,.25);
        user-select: none;
      }
      .wc-chat-panel {
        position: fixed; right: 18px; bottom: 86px; z-index: 999999;
        width: 360px; max-width: calc(100vw - 24px);
        height: 500px; max-height: calc(100vh - 120px);
        border-radius: 14px; background: #fff;
        box-shadow: 0 18px 50px rgba(0,0,0,.2);
        border: 1px solid #eaeaea;
        display: none; overflow: hidden;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial;
      }
      .wc-chat-header {
        height: 48px; display: flex; align-items: center; justify-content: space-between;
        padding: 0 12px; border-bottom: 1px solid #eee; background: #fafafa;
        cursor: move; user-select: none; font-weight: 800;
      }
      .wc-chat-header .wc-right { display:flex; align-items:center; gap:10px; }
      .wc-link {
        border:0; background:transparent; cursor:pointer;
        font-size:12px; color:#444; text-decoration: underline;
        padding: 6px 0;
      }
      .wc-chat-body { height: calc(100% - 48px); display: flex; flex-direction: column; }
      .wc-chat-messages { flex: 1; overflow: auto; padding: 12px; background: #f8f8f8; }
      .wc-msg { margin: 8px 0; display: flex; flex-direction: column; gap: 2px; }
      .wc-bubble {
        max-width: 85%; padding: 10px 12px; border-radius: 12px;
        line-height: 1.25; font-size: 14px; border: 1px solid #e6e6e6;
        background: #fff; white-space: pre-wrap; word-break: break-word;
      }
      .wc-msg.user { align-items: flex-end; }
      .wc-msg.user .wc-bubble { background: #111; color: #fff; border-color: #111; }
      .wc-meta { font-size: 11px; color: #777; }
      .wc-quick {
        padding: 10px 12px; border-top: 1px solid #eee; background: #fff;
        display: flex; gap: 8px; flex-wrap: wrap;
      }
      .wc-quick button {
        border: 1px solid #e6e6e6; background: #fff; border-radius: 999px;
        padding: 6px 10px; cursor: pointer; font-size: 12px;
      }
      .wc-inputbar {
        border-top: 1px solid #eee; background: #fff;
        padding: 10px 12px; display: grid; grid-template-columns: 1fr auto; gap: 10px;
        align-items: center;
      }
      .wc-inputbar input {
        height: 40px; border-radius: 10px; border: 1px solid #ddd;
        padding: 0 10px; font-size: 14px; outline: none;
      }
      .wc-inputbar button {
        height: 40px; border-radius: 10px; border: 0;
        background: #111; color: #fff; font-weight: 800;
        padding: 0 14px; cursor: pointer;
      }
      .wc-inputbar button:disabled { opacity: .6; cursor: not-allowed; }
      .wc-counter {
        margin-top: 6px; font-size: 11px; color: #666;
        display: flex; justify-content: flex-end;
      }
      .wc-modal {
        padding: 12px; background: #fff; border-top: 1px solid #eee;
      }
      .wc-modal label { display:block; font-size: 12px; color:#555; margin: 8px 0 4px; }
      .wc-modal input { width: 100%; height: 38px; border: 1px solid #ddd; border-radius: 10px; padding: 0 10px; }
      .wc-modal .row { display:flex; gap: 10px; margin-top: 10px; }
      .wc-modal .row button { flex:1; height: 40px; border-radius: 10px; border:0; font-weight:800; cursor:pointer; }
      .wc-primary { background:#111; color:#fff; }
      .wc-secondary { background:#f1f1f1; color:#111; }
      .wc-hint { font-size: 12px; color:#666; margin-top:8px; }
    `]);
    document.head.appendChild(style);
  }

  createUI() {
    this.createStyles();

    // Button
    this.elements.btn = this.createElement('button', { class: 'wc-chat-btn', title: 'Chat' }, ['💬']);

    // Panel
    this.elements.panel = this.createElement('div', { class: 'wc-chat-panel', role: 'dialog', 'aria-label': 'Chat' });

    // Header
    this.elements.logoutBtn = this.createElement('button', { class: 'wc-link', type: 'button' }, ['Log out / Change Email']);
    const closeBtn = this.createElement('button', {
      style: 'border:0;background:transparent;font-size:18px;cursor:pointer;padding:6px;',
      type: 'button',
      'aria-label': 'Close'
    }, ['✕']);

    const header = this.createElement('div', { class: 'wc-chat-header' }, [
      this.createElement('div', {}, ['Support']),
      this.createElement('div', { class: 'wc-right' }, [this.elements.logoutBtn, closeBtn])
    ]);

    // Messages area
    this.elements.messagesEl = this.createElement('div', { class: 'wc-chat-messages' });
    this.elements.quickRow = this.createElement('div', { class: 'wc-quick' }, []);

    // Input bar
    this.elements.input = this.createElement('input', { type: 'text', placeholder: 'Type a message…', maxlength: String(LIMITS.MAX_MESSAGE_LENGTH) });
    this.elements.sendBtn = this.createElement('button', { type: 'button' }, ['Send']);
    this.elements.counter = this.createElement('div', { class: 'wc-counter' }, [`0/${LIMITS.MAX_MESSAGE_LENGTH}`]);
    this.elements.hint = this.createElement('div', { class: 'wc-hint' }, ['']);

    const inputWrap = this.createElement('div', {}, [this.elements.input, this.elements.counter]);
    const inputBar = this.createElement('div', { class: 'wc-inputbar' }, [inputWrap, this.elements.sendBtn]);

    // Body
    const body = this.createElement('div', { class: 'wc-chat-body' }, [
      this.elements.messagesEl,
      this.elements.quickRow,
      inputBar,
      this.elements.hint
    ]);

    this.elements.panel.appendChild(header);
    this.elements.panel.appendChild(body);
    this.elements.closeBtn = closeBtn;
    this.elements.body = body;

    // Append to document
    document.body.appendChild(this.elements.btn);
    document.body.appendChild(this.elements.panel);

    this.enableDragging(header);
  }

  enableDragging(header) {
    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    header.addEventListener('mousedown', (e) => {
      if (e.target === this.elements.logoutBtn || e.target === this.elements.closeBtn) return;

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.elements.panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      this.elements.panel.style.right = 'auto';
      this.elements.panel.style.bottom = 'auto';
      this.elements.panel.style.left = `${startLeft}px`;
      this.elements.panel.style.top = `${startTop}px`;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      this.elements.panel.style.left = `${startLeft + dx}px`;
      this.elements.panel.style.top = `${startTop + dy}px`;
    });

    window.addEventListener('mouseup', () => { dragging = false; });
  }

  setVisible(visible) {
    this.elements.panel.style.display = visible ? 'block' : 'none';
  }

  updateAuthUI(hasSession) {
    const authed = !!hasSession;
    this.elements.logoutBtn.style.display = authed ? 'inline-flex' : 'none';
    this.elements.messagesEl.style.display = authed ? 'block' : 'none';
    this.elements.quickRow.style.display = authed ? 'flex' : 'none';
    this.elements.input.parentElement.parentElement.style.display = authed ? 'grid' : 'none';
    this.elements.hint.style.display = authed ? 'block' : 'none';
  }

  appendMessage(role, content, created_at) {
    const wrap = this.createElement('div', { class: `wc-msg ${role}` });
    const bubble = this.createElement('div', { class: 'wc-bubble' });
    bubble.innerHTML = this.escapeText(content);

    const meta = this.createElement('div', { class: 'wc-meta' }, [
      role === 'user' ? 'You' : (role === 'admin' ? 'Admin' : 'System'),
      created_at ? ` • ${this.formatTime(created_at)}` : ''
    ]);

    wrap.appendChild(bubble);
    wrap.appendChild(meta);
    this.elements.messagesEl.appendChild(wrap);
    this.elements.messagesEl.scrollTop = this.elements.messagesEl.scrollHeight;
  }

  clearMessages() {
    this.elements.messagesEl.innerHTML = '';
  }

  addQuickAction(label, onClick) {
    const b = this.createElement('button', { type: 'button' }, [label]);
    b.addEventListener('click', onClick);
    this.elements.quickRow.appendChild(b);
  }

  updateCounter() {
    const val = String(this.elements.input.value || '');
    this.elements.counter.textContent = `${val.length}/${LIMITS.MAX_MESSAGE_LENGTH}`;
  }
}
