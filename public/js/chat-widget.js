(() => {
  const STORAGE_KEY = 'wishesu_chat_session';
  const POLL_MS = 5000;

  const state = {
    sessionId: null,
    lastId: 0,
    open: false,
    polling: null,
    dragging: null
  };

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style' && v && typeof v === 'object') Object.assign(n.style, v);
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, String(v));
    }
    for (const c of children) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  }

  async function api(url, options) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options && options.headers ? options.headers : {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function loadStoredSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.sessionId) {
        state.sessionId = parsed.sessionId;
        state.lastId = Number(parsed.lastId || 0) || 0;
      }
    } catch {}
  }

  function saveStoredSession() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId: state.sessionId, lastId: state.lastId }));
    } catch {}
  }

  function injectStyles() {
    const css = `
      .ws-chat-btn{position:fixed;right:18px;bottom:18px;z-index:99999;background:#111;color:#fff;border-radius:999px;
        padding:12px 14px;font:600 14px/1.1 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial;cursor:pointer;
        box-shadow:0 10px 30px rgba(0,0,0,.18);user-select:none}
      .ws-chat-btn:active{transform:scale(.98)}
      .ws-chat-wrap{position:fixed;right:18px;bottom:78px;z-index:99999;width:320px;height:420px;background:#fff;border:1px solid #e6e6e6;
        border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.18);display:none;overflow:hidden;font:14px system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial}
      .ws-chat-head{background:#111;color:#fff;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;cursor:move}
      .ws-chat-title{font-weight:700;font-size:13px}
      .ws-chat-close{background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer;line-height:1}
      .ws-chat-body{display:flex;flex-direction:column;height:calc(100% - 42px)}
      .ws-chat-messages{flex:1;overflow:auto;padding:10px;background:#fafafa}
      .ws-chat-msg{max-width:85%;padding:8px 10px;border-radius:12px;margin:6px 0;white-space:pre-wrap;word-break:break-word}
      .ws-chat-msg.user{margin-left:auto;background:#111;color:#fff;border-bottom-right-radius:4px}
      .ws-chat-msg.admin{margin-right:auto;background:#fff;border:1px solid #e6e6e6;border-bottom-left-radius:4px}
      .ws-chat-meta{font-size:11px;opacity:.7;margin-top:4px}
      .ws-chat-compose{display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff}
      .ws-chat-input{flex:1;border:1px solid #ddd;border-radius:10px;padding:10px;font:14px system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial}
      .ws-chat-send{background:#111;color:#fff;border:0;border-radius:10px;padding:10px 12px;cursor:pointer;font-weight:700}
      .ws-chat-send:disabled{opacity:.6;cursor:not-allowed}
      .ws-chat-form{display:flex;flex-direction:column;gap:8px;padding:10px}
      .ws-chat-form input{border:1px solid #ddd;border-radius:10px;padding:10px;font:14px system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial}
      .ws-chat-form button{background:#111;color:#fff;border:0;border-radius:10px;padding:10px 12px;cursor:pointer;font-weight:700}
      .ws-chat-note{font-size:12px;opacity:.8}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function makeUI() {
    const btn = el('div', { class: 'ws-chat-btn', title: 'Chat' }, ['Chat']);
    const wrap = el('div', { class: 'ws-chat-wrap' });

    const head = el('div', { class: 'ws-chat-head' }, [
      el('div', { class: 'ws-chat-title' }, ['Support chat']),
      el('button', { class: 'ws-chat-close', type: 'button', title: 'Close' }, ['×'])
    ]);

    const messages = el('div', { class: 'ws-chat-messages' });

    const input = el('input', { class: 'ws-chat-input', placeholder: 'Type a message…' });
    const sendBtn = el('button', { class: 'ws-chat-send', type: 'button' }, ['Send']);
    const compose = el('div', { class: 'ws-chat-compose' }, [input, sendBtn]);

    const body = el('div', { class: 'ws-chat-body' }, [messages, compose]);

    // Simple onboarding form if no session yet
    const formWrap = el('div', { class: 'ws-chat-form', style: { display: 'none' } }, [
      el('div', { class: 'ws-chat-note' }, ['Enter your name and email so we can reply if you leave the page.']),
      el('input', { id: 'ws-chat-name', placeholder: 'Name' }),
      el('input', { id: 'ws-chat-email', placeholder: 'Email', type: 'email' }),
      el('button', { type: 'button', id: 'ws-chat-start' }, ['Start chat'])
    ]);

    body.insertBefore(formWrap, messages);

    wrap.appendChild(head);
    wrap.appendChild(body);

    // Button toggle
    btn.addEventListener('click', () => toggle(true));
    head.querySelector('.ws-chat-close').addEventListener('click', () => toggle(false));

    // Send actions
    sendBtn.addEventListener('click', () => onSend(input, sendBtn, messages));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend(input, sendBtn, messages);
      }
    });

    // Start chat
    formWrap.querySelector('#ws-chat-start').addEventListener('click', async () => {
      const name = (formWrap.querySelector('#ws-chat-name').value || '').trim();
      const email = (formWrap.querySelector('#ws-chat-email').value || '').trim();
      if (!name || !email) return alert('Please enter name and email.');
      try {
        const data = await api('/api/chat/start', { method: 'POST', body: JSON.stringify({ name, email }) });
        state.sessionId = data.sessionId;
        state.lastId = 0;
        saveStoredSession();
        formWrap.style.display = 'none';
        input.disabled = false;
        sendBtn.disabled = false;
        await sync(messages);
      } catch (e) {
        alert(e.message || 'Unable to start chat.');
      }
    });

    // Dragging (button and window)
    makeDraggable(btn, { clamp: true });
    makeDraggable(wrap, { handle: head, clamp: true });

    document.body.appendChild(btn);
    document.body.appendChild(wrap);

    // expose references
    state.ui = { btn, wrap, messages, input, sendBtn, formWrap };
  }

  function makeDraggable(target, opts = {}) {
    const handle = opts.handle || target;
    handle.style.touchAction = 'none';

    let startX = 0, startY = 0, startLeft = 0, startTop = 0, dragging = false;

    function onDown(e) {
      dragging = true;
      const p = point(e);
      startX = p.x;
      startY = p.y;

      const rect = target.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    }

    function onMove(e) {
      if (!dragging) return;
      if (e.cancelable) e.preventDefault();
      const p = point(e);
      let left = startLeft + (p.x - startX);
      let top = startTop + (p.y - startY);

      target.style.right = 'auto';
      target.style.bottom = 'auto';
      target.style.left = left + 'px';
      target.style.top = top + 'px';

      if (opts.clamp) clampToViewport(target);
    }

    function onUp() {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    }

    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
  }

  function clampToViewport(node) {
    const rect = node.getBoundingClientRect();
    const pad = 8;
    let left = rect.left;
    let top = rect.top;

    const maxLeft = window.innerWidth - rect.width - pad;
    const maxTop = window.innerHeight - rect.height - pad;

    left = Math.min(Math.max(left, pad), maxLeft);
    top = Math.min(Math.max(top, pad), maxTop);

    node.style.left = left + 'px';
    node.style.top = top + 'px';
  }

  function point(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function toggle(open) {
    state.open = open;
    const { wrap, formWrap, input, sendBtn, messages } = state.ui;
    wrap.style.display = open ? 'block' : 'none';

    if (!open) return;

    // Show form if no session
    if (!state.sessionId) {
      formWrap.style.display = 'flex';
      input.disabled = true;
      sendBtn.disabled = true;
    } else {
      formWrap.style.display = 'none';
      input.disabled = false;
      sendBtn.disabled = false;
      sync(messages).catch(() => {});
    }

    startPolling(messages);
  }

  function renderMessage(container, msg) {
    const bubble = el('div', { class: `ws-chat-msg ${msg.role}` }, [
      msg.content || '',
      el('div', { class: 'ws-chat-meta' }, [new Date(msg.created_at || Date.now()).toLocaleString()])
    ]);
    container.appendChild(bubble);
  }

  async function sync(messagesEl) {
    if (!state.sessionId) return;

    const data = await api(`/api/chat/sync?sessionId=${encodeURIComponent(state.sessionId)}&sinceId=${encodeURIComponent(String(state.lastId || 0))}`, { method: 'GET' });
    const msgs = data.messages || [];
    for (const m of msgs) renderMessage(messagesEl, m);
    if (msgs.length) {
      state.lastId = Number(data.lastId || msgs[msgs.length - 1].id) || state.lastId;
      saveStoredSession();
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  async function onSend(input, sendBtn, messagesEl) {
    const text = (input.value || '').trim();
    if (!text) return;
    if (!state.sessionId) return alert('Please start the chat first.');

    sendBtn.disabled = true;
    try {
      await api('/api/chat/send', {
        method: 'POST',
        body: JSON.stringify({ sessionId: state.sessionId, role: 'user', content: text })
      });
      input.value = '';
      await sync(messagesEl);
    } catch (e) {
      alert(e.message || 'Unable to send message.');
    } finally {
      sendBtn.disabled = false;
    }
  }

  function startPolling(messagesEl) {
    if (state.polling) clearInterval(state.polling);
    state.polling = setInterval(() => {
      if (state.open) sync(messagesEl).catch(() => {});
    }, POLL_MS);
  }

  function boot() {
    injectStyles();
    loadStoredSession();
    makeUI();

    // If session exists, pre-sync quietly
    if (state.sessionId) {
      sync(state.ui.messages).catch(() => {});
    }
  }

  boot();
})();
