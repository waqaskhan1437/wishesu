(function () {
  const API_BASE = '';
  const POLL_MS = 5000;

  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, val) { try { localStorage.setItem(key, val); } catch {} },
    del(key) { try { localStorage.removeItem(key); } catch {} }
  };

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'style') Object.assign(node.style, v);
      else if (k === 'class') node.className = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null) return;
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    });
    return node;
  }

  function injectStyles() {
    if (document.getElementById('cw-styles')) return;
    const css = `
      #cw-btn {
        position: fixed;
        right: 18px;
        bottom: 18px;
        width: 56px;
        height: 56px;
        border-radius: 999px;
        border: 0;
        cursor: grab;
        z-index: 2147483000;
        box-shadow: 0 10px 30px rgba(0,0,0,.18);
        background: #111827;
        color: #fff;
        font: 600 14px/1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      #cw-btn:active { cursor: grabbing; }
      #cw-panel {
        position: fixed;
        right: 18px;
        bottom: 86px;
        width: 340px;
        max-width: calc(100vw - 24px);
        height: 420px;
        max-height: calc(100vh - 120px);
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,.22);
        z-index: 2147483000;
        display: none;
        overflow: hidden;
        border: 1px solid rgba(0,0,0,.06);
      }
      #cw-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        background: #111827;
        color: #fff;
        cursor: grab;
        user-select: none;
      }
      #cw-header:active { cursor: grabbing; }
      #cw-title { font: 600 13px/1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
      #cw-close {
        border: 0;
        background: transparent;
        color: #fff;
        font-size: 18px;
        cursor: pointer;
        padding: 0 6px;
      }
      #cw-body { height: calc(100% - 44px); display: flex; flex-direction: column; }
      #cw-messages {
        flex: 1;
        padding: 12px;
        overflow: auto;
        background: #f8fafc;
      }
      .cw-msg {
        display: inline-block;
        max-width: 85%;
        margin: 6px 0;
        padding: 10px 10px;
        border-radius: 12px;
        font: 14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .cw-user { background: #111827; color: #fff; margin-left: auto; border-bottom-right-radius: 4px; }
      .cw-assistant { background: #fff; color: #0f172a; border: 1px solid rgba(0,0,0,.08); border-bottom-left-radius: 4px; }
      #cw-inputbar {
        display: flex;
        gap: 8px;
        padding: 10px;
        border-top: 1px solid rgba(0,0,0,.08);
        background: #fff;
      }
      #cw-text {
        flex: 1;
        resize: none;
        border-radius: 10px;
        border: 1px solid rgba(0,0,0,.12);
        padding: 10px;
        outline: none;
        font: 14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        min-height: 38px;
        max-height: 90px;
      }
      #cw-send {
        width: 78px;
        border-radius: 10px;
        border: 0;
        cursor: pointer;
        background: #111827;
        color: #fff;
        font: 600 13px/1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      #cw-start {
        padding: 12px;
      }
      #cw-start h4 { margin: 0 0 10px; font: 700 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
      .cw-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
      .cw-field label { font: 600 12px/1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #334155; }
      .cw-field input {
        border-radius: 10px;
        border: 1px solid rgba(0,0,0,.12);
        padding: 10px;
        outline: none;
        font: 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      #cw-start-btn {
        width: 100%;
        border-radius: 10px;
        border: 0;
        cursor: pointer;
        background: #111827;
        color: #fff;
        padding: 10px;
        font: 700 13px/1 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      #cw-hint { margin-top: 8px; color: #64748b; font: 12px/1.3 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
    `;
    const style = el('style', { id: 'cw-styles' }, css);
    document.head.appendChild(style);
  }

  function makeDraggable(target, handle, boundsPadding = 8) {
    let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;

    function pointerDown(e) {
      dragging = true;
      (handle || target).setPointerCapture?.(e.pointerId);
      const rect = target.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      e.preventDefault();
    }

    function pointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let left = startLeft + dx;
      let top = startTop + dy;

      const maxLeft = window.innerWidth - rectWidth(target) - boundsPadding;
      const maxTop = window.innerHeight - rectHeight(target) - boundsPadding;
      left = Math.max(boundsPadding, Math.min(maxLeft, left));
      top = Math.max(boundsPadding, Math.min(maxTop, top));

      target.style.left = `${left}px`;
      target.style.top = `${top}px`;
      target.style.right = 'auto';
      target.style.bottom = 'auto';
    }

    function pointerUp() { dragging = false; }

    (handle || target).addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);
  }

  function rectWidth(node) { return node.getBoundingClientRect().width; }
  function rectHeight(node) { return node.getBoundingClientRect().height; }

  async function api(path, opts = {}) {
    const res = await fetch(API_BASE + path, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
      const msg = data.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  function scrollToBottom(msgWrap) {
    msgWrap.scrollTop = msgWrap.scrollHeight + 99999;
  }

  function renderMessage(msgWrap, m) {
    const cls = m.role === 'user' ? 'cw-msg cw-user' : 'cw-msg cw-assistant';
    const node = el('div', { class: cls, 'data-id': String(m.id || '') }, m.content || '');
    msgWrap.appendChild(node);
    scrollToBottom(msgWrap);
  }

  function mount() {
    injectStyles();

    const btn = el('button', { id: 'cw-btn', type: 'button', title: 'Chat' }, 'Chat');
    const panel = el('div', { id: 'cw-panel' });

    const header = el('div', { id: 'cw-header' }, [
      el('div', { id: 'cw-title' }, 'Chat'),
      el('button', { id: 'cw-close', type: 'button', title: 'Close' }, '×')
    ]);

    const body = el('div', { id: 'cw-body' });
    const messages = el('div', { id: 'cw-messages' });

    const inputBar = el('div', { id: 'cw-inputbar' }, [
      el('textarea', { id: 'cw-text', rows: '1', placeholder: 'Type a message…' }),
      el('button', { id: 'cw-send', type: 'button' }, 'Send')
    ]);

    body.appendChild(messages);
    body.appendChild(inputBar);

    panel.appendChild(header);
    panel.appendChild(body);

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    // Draggable button and panel
    makeDraggable(btn, btn);
    makeDraggable(panel, header);

    const state = {
      open: false,
      sessionId: storage.get('cw_sessionId'),
      lastId: Number(storage.get('cw_lastId') || 0),
      polling: null
    };

    function setOpen(open) {
      state.open = open;
      panel.style.display = open ? 'block' : 'none';
      if (open) {
        ensureStartedUI();
        startPolling();
      } else {
        stopPolling();
      }
    }

    btn.addEventListener('click', () => setOpen(!state.open));
    header.querySelector('#cw-close').addEventListener('click', () => setOpen(false));

    async function startSession(name, email) {
      const resp = await api('/api/chat/start', {
        method: 'POST',
        body: JSON.stringify({ name, email })
      });
      state.sessionId = resp.sessionId;
      state.lastId = 0;
      storage.set('cw_sessionId', state.sessionId);
      storage.set('cw_lastId', '0');
    }

    async function sendMessage(text) {
      await api('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ sessionId: state.sessionId, role: 'user', message: text })
      });
    }

    async function sync() {
      if (!state.sessionId) return;
      const resp = await api(`/api/chat/sync?sessionId=${encodeURIComponent(state.sessionId)}&sinceId=${encodeURIComponent(String(state.lastId || 0))}`, {
        method: 'GET'
      });
      const list = resp.messages || [];
      if (list.length) {
        list.forEach((m) => {
          renderMessage(messages, m);
          state.lastId = Math.max(state.lastId, Number(m.id || 0));
        });
        storage.set('cw_lastId', String(state.lastId));
      }
    }

    function stopPolling() {
      if (state.polling) {
        clearInterval(state.polling);
        state.polling = null;
      }
    }

    function startPolling() {
      stopPolling();
      state.polling = setInterval(() => {
        sync().catch(() => {});
      }, POLL_MS);
      sync().catch(() => {});
    }

    function clearMessagesUI() {
      while (messages.firstChild) messages.removeChild(messages.firstChild);
    }

    function ensureStartedUI() {
      if (state.sessionId) {
        // Remove start UI if present
        const startEl = panel.querySelector('#cw-start');
        if (startEl) startEl.remove();
        return;
      }

      // Hide input bar until started
      inputBar.style.display = 'none';
      clearMessagesUI();

      const start = el('div', { id: 'cw-start' }, [
        el('h4', {}, 'Before we start'),
        el('div', { class: 'cw-field' }, [el('label', {}, 'Name'), el('input', { id: 'cw-name', type: 'text', autocomplete: 'name', placeholder: 'Your name' })]),
        el('div', { class: 'cw-field' }, [el('label', {}, 'Email'), el('input', { id: 'cw-email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com' })]),
        el('button', { id: 'cw-start-btn', type: 'button' }, 'Start chat'),
        el('div', { id: 'cw-hint' }, 'We’ll use this to notify the team and follow up if needed.')
      ]);

      body.insertBefore(start, messages);

      start.querySelector('#cw-start-btn').addEventListener('click', async () => {
        const name = (start.querySelector('#cw-name').value || '').trim();
        const email = (start.querySelector('#cw-email').value || '').trim();
        if (!name || !email) {
          alert('Please enter your name and email.');
          return;
        }
        try {
          await startSession(name, email);
          start.remove();
          inputBar.style.display = 'flex';
          await sync();
        } catch (e) {
          alert(e.message || 'Unable to start chat.');
        }
      });
    }

    // Sending UI
    const textArea = inputBar.querySelector('#cw-text');
    const sendBtn = inputBar.querySelector('#cw-send');

    function doSend() {
      const text = (textArea.value || '').trim();
      if (!text || !state.sessionId) return;
      textArea.value = '';
      renderMessage(messages, { role: 'user', content: text, id: '' });
      sendMessage(text).then(() => sync()).catch((e) => {
        renderMessage(messages, { role: 'assistant', content: `Error: ${e.message || 'Failed to send.'}`, id: '' });
      });
    }

    sendBtn.addEventListener('click', doSend);
    textArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    });

    // If a session already exists, show input bar immediately
    if (state.sessionId) {
      inputBar.style.display = 'flex';
      sync().catch(() => {});
    } else {
      inputBar.style.display = 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();