(() => {
  // Prevent double init across navigations / partial reloads
  if (window.__WISHESU_CHAT_WIDGET_INITIALIZED__) return;
  window.__WISHESU_CHAT_WIDGET_INITIALIZED__ = true;

  const API_START = '/api/chat/start';
  const API_SEND = '/api/chat/send';
  const API_SYNC = '/api/chat/sync';

  const MAX_LEN = 500;
  const POLL_MS = 10000;
  const COOLDOWN_MS = 10000;

  const LS_SESSION_OBJ = 'wishesu_chat_session';
  // Back-compat keys (older widget versions)
  const LS_SESSION_ID = 'chat_session_id';
  const LS_NAME = 'chat_name';
  const LS_EMAIL = 'chat_email';
  const LS_OPEN = 'chat_is_open';
  const TAB_ID = (crypto?.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  const LS_POLL_LEADER = 'chat_poll_leader_v1'; // { id, ts }
  const LEADER_STALE_MS = 15000;

  function getLeader() {
    try { return JSON.parse(localStorage.getItem(LS_POLL_LEADER) || 'null'); } catch { return null; }
  }
  function isLeaderFresh(leader) {
    return leader && leader.id && leader.ts && (Date.now() - leader.ts) < LEADER_STALE_MS;
  }
  function tryBecomeLeader() {
    const leader = getLeader();
    if (!isLeaderFresh(leader) || leader.id === TAB_ID) {
      localStorage.setItem(LS_POLL_LEADER, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
      return true;
    }
    return false;
  }
  function heartbeatLeader() {
    const leader = getLeader();
    if (leader && leader.id === TAB_ID) {
      localStorage.setItem(LS_POLL_LEADER, JSON.stringify({ id: TAB_ID, ts: Date.now() }));
      return true;
    }
    return false;
  }
  function releaseLeader() {
    const leader = getLeader();
    if (leader && leader.id === TAB_ID) {
      localStorage.removeItem(LS_POLL_LEADER);
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key === LS_POLL_LEADER && isOpen) {
      // if another tab became leader, stop polling here
      const leader = getLeader();
      if (leader && leader.id !== TAB_ID) stopPolling();
      if ((!leader || !isLeaderFresh(leader)) && !document.hidden) startPolling();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopPolling();
      releaseLeader();
    } else if (isOpen) {
      startPolling();
      syncNow();
    }
  });

  const LS_COOLDOWN_UNTIL = 'chat_cooldown_until';

  let sessionId = '';
  let name = '';
  let email = '';

  // Prefer the new single-key session object
  try {
    const obj = JSON.parse(localStorage.getItem(LS_SESSION_OBJ) || 'null');
    if (obj && typeof obj === 'object') {
      sessionId = String(obj.sessionId || '');
      name = String(obj.name || '');
      email = String(obj.email || '');
    }
  } catch {}

  // Back-compat: fall back to older separate keys
  if (!sessionId) sessionId = localStorage.getItem(LS_SESSION_ID) || '';
  if (!name) name = localStorage.getItem(LS_NAME) || '';
  if (!email) email = localStorage.getItem(LS_EMAIL) || '';
  let isOpen = localStorage.getItem(LS_OPEN) === 'true';

  let lastId = 0;
  const seenIds = new Set();
  let pollTimer = null;

  let isSending = false;
  const recentLocal = [];
  let cooldownTimer = null;

  function el(tag, attrs = {}, children = []) {
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

  function escapeText(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatTime(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: '2-digit' });
  }

  function nowMs() {
    return Date.now();
  }

  function getCooldownUntil() {
    const v = Number(localStorage.getItem(LS_COOLDOWN_UNTIL) || '0') || 0;
    return v;
  }

  function setCooldownUntil(ts) {
    localStorage.setItem(LS_COOLDOWN_UNTIL, String(ts));
  }

  // ---- UI ----
  const style = el('style', {}, [`
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
      cursor: move; user-select: none;
      font-weight: 800;
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
      max-width: 85%;
      padding: 10px 12px; border-radius: 12px;
      line-height: 1.25; font-size: 14px;
      border: 1px solid #e6e6e6;
      background: #fff;
      white-space: pre-wrap; word-break: break-word;
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

  const btn = el('button', { class: 'wc-chat-btn', title: 'Chat' }, ['💬']);
  const panel = el('div', { class: 'wc-chat-panel', role: 'dialog', 'aria-label': 'Chat' });

  const logoutBtn = el('button', { class: 'wc-link', type: 'button' }, ['Log out / Change Email']);
  const closeBtn = el('button', {
    style: 'border:0;background:transparent;font-size:18px;cursor:pointer;padding:6px;',
    type: 'button',
    'aria-label': 'Close'
  }, ['✕']);

  const header = el('div', { class: 'wc-chat-header' }, [
    el('div', {}, ['Support']),
    el('div', { class: 'wc-right' }, [logoutBtn, closeBtn])
  ]);

  const messagesEl = el('div', { class: 'wc-chat-messages' });
  const quickRow = el('div', { class: 'wc-quick' }, []);

  const input = el('input', { type: 'text', placeholder: 'Type a message…', maxlength: String(MAX_LEN) });
  const sendBtn = el('button', { type: 'button' }, ['Send']);
  const counter = el('div', { class: 'wc-counter' }, [`0/${MAX_LEN}`]);
  const hint = el('div', { class: 'wc-hint' }, ['']);

  const inputWrap = el('div', {}, [input, counter]);
  const inputBar = el('div', { class: 'wc-inputbar' }, [inputWrap, sendBtn]);

  const body = el('div', { class: 'wc-chat-body' }, [messagesEl, quickRow, inputBar, hint]);
  panel.appendChild(header);
  panel.appendChild(body);

  document.head.appendChild(style);
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // Draggable panel by header
  (function enableDrag() {
    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    header.addEventListener('mousedown', (e) => {
      // ignore dragging when clicking buttons
      if (e.target === logoutBtn || e.target === closeBtn) return;

      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = `${startLeft}px`;
      panel.style.top = `${startTop}px`;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = `${startLeft + dx}px`;
      panel.style.top = `${startTop + dy}px`;
    });

    window.addEventListener('mouseup', () => { dragging = false; });
  })();

  // ---- Persistence (open/closed across pages) ----
  function setOpen(open) {
    isOpen = !!open;
    localStorage.setItem(LS_OPEN, isOpen ? 'true' : 'false');
    panel.style.display = isOpen ? 'block' : 'none';
    if (isOpen) {
      ensureSession().then(() => {
        startPolling();
        syncNow();
        applyCooldownUI();
      }).catch(() => {});
    } else {
      stopPolling();
    }
  }

  btn.addEventListener('click', () => setOpen(!isOpen));
  closeBtn.addEventListener('click', () => setOpen(false));

  // ---- Logout / Change Email ----
  function clearSessionLocal() {
    // New single-key session
    localStorage.removeItem(LS_SESSION_OBJ);

    // Back-compat cleanup
    localStorage.removeItem(LS_SESSION_ID);
    localStorage.removeItem(LS_NAME);
    localStorage.removeItem(LS_EMAIL);

    localStorage.removeItem(LS_COOLDOWN_UNTIL);
    sessionId = '';
    name = '';
    email = '';
    lastId = 0;
    seenIds.clear();
    messagesEl.innerHTML = '';
  }

  logoutBtn.addEventListener('click', async () => {
    clearSessionLocal();
    // Keep panel open; show modal again
    await ensureSession();
  });

  // ---- Quick actions ----
  function addQuickAction(label, payload) {
    const b = el('button', { type: 'button' }, [label]);
    b.addEventListener('click', () => sendMessage(payload));
    quickRow.appendChild(b);
  }

  addQuickAction('📦 My Order Status', 'My Order Status');
  addQuickAction('💬 Talk to Human', 'Talk to Human');
  addQuickAction('🚚 Check Delivery Status', 'Check Delivery Status');

  // ---- Message rendering ----
  function appendMessage(role, content, created_at) {
    const wrap = el('div', { class: `wc-msg ${role}` });
    const bubble = el('div', { class: 'wc-bubble' });
    bubble.innerHTML = escapeText(content);

    const meta = el('div', { class: 'wc-meta' }, [
      role === 'user' ? 'You' : (role === 'admin' ? 'Admin' : 'System'),
      created_at ? ` • ${formatTime(created_at)}` : ''
    ]);

    wrap.appendChild(bubble);
    wrap.appendChild(meta);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ---- Session creation modal ----
  function updateAuthUI() {
    const authed = !!sessionId;
    logoutBtn.style.display = authed ? 'inline-flex' : 'none';
    messagesEl.style.display = authed ? 'block' : 'none';
    quickRow.style.display = authed ? 'flex' : 'none';
    inputBar.style.display = authed ? 'grid' : 'none';
    hint.style.display = authed ? 'block' : 'none';
  }

  function showSessionModal() {
    input.disabled = true;
    sendBtn.disabled = true;
    updateAuthUI();

    const modal = el('div', { class: 'wc-modal', id: 'wc-modal' }, [
      el('div', { style: 'font-weight:800; margin-bottom:8px;' }, ['Start chat']),
      el('label', {}, ['Name']),
      el('input', { id: 'wc-name', value: name || '' }),
      el('label', {}, ['Email']),
      el('input', { id: 'wc-email', value: email || '' }),
      el('div', { class: 'row' }, [
        el('button', { class: 'wc-secondary', type: 'button', onclick: () => setOpen(false) }, ['Cancel']),
        el('button', { class: 'wc-primary', type: 'button', onclick: async () => {
          const n = String(modal.querySelector('#wc-name').value || '').trim();
          const e = String(modal.querySelector('#wc-email').value || '').trim();
          if (!n || !e) return alert('Please enter name and email.');
          name = n; email = e;
          localStorage.setItem(LS_NAME, name);
          localStorage.setItem(LS_EMAIL, email);
          localStorage.setItem(LS_SESSION_OBJ, JSON.stringify({ sessionId: sessionId || '', name, email }));

          await startSession();
          modal.remove();
          input.disabled = false;
          sendBtn.disabled = false;
          input.focus();
          updateAuthUI();
          syncNow();
          applyCooldownUI();
        } }, ['Start'])
      ])
    ]);

    // Place modal above input bar
    body.insertBefore(modal, messagesEl.nextSibling);
  }

  async function startSession() {
    const res = await fetch(API_START, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.sessionId) {
      throw new Error(data.error || 'Failed to start session');
    }
    sessionId = data.sessionId;

    // Save in the new single-key format
    localStorage.setItem(LS_SESSION_OBJ, JSON.stringify({ sessionId, name, email }));

    // Back-compat (keep for older code paths)
    localStorage.setItem(LS_SESSION_ID, sessionId);
  }

  async function ensureSession() {
    if (sessionId) return;

    const old = panel.querySelector('#wc-modal');
    if (old) old.remove();

    showSessionModal();
  }

  // ---- Frontend cooldown (10 seconds) ----
  function startCooldown() {
    const until = nowMs() + COOLDOWN_MS;
    setCooldownUntil(until);
    applyCooldownUI();
  }

  function applyCooldownUI() {
    const until = getCooldownUntil();
    const remaining = Math.max(0, until - nowMs());

    // If currently sending, sending lock rules
    if (isSending) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending…';
      hint.textContent = '';
      return;
    }

    if (!sessionId) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Send';
      hint.textContent = '';
      return;
    }

    if (remaining <= 0) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
      hint.textContent = '';
      if (cooldownTimer) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
      }
      return;
    }

    sendBtn.disabled = true;
    const secs = Math.ceil(remaining / 1000);
    sendBtn.textContent = `Wait ${secs}s`;
    hint.textContent = 'Please wait before sending another message.';

    if (!cooldownTimer) {
      cooldownTimer = setInterval(() => {
        const rem = Math.max(0, getCooldownUntil() - nowMs());
        if (rem <= 0) {
          clearInterval(cooldownTimer);
          cooldownTimer = null;
          applyCooldownUI();
        } else {
          const s = Math.ceil(rem / 1000);
          sendBtn.textContent = `Wait ${s}s`;
        }
      }, 250);
    }
  }

  // ---- Sending (debounce + cooldown) ----
  function updateCounter() {
    const val = String(input.value || '');
    counter.textContent = `${val.length}/${MAX_LEN}`;
  }
  input.addEventListener('input', updateCounter);

  async function sendMessage(text) {
    if (!isOpen) setOpen(true);
    if (isSending) return;
    if (!sessionId) return;

    // cooldown gate
    if (getCooldownUntil() > nowMs()) {
      applyCooldownUI();
      return;
    }

    const msg = String(text ?? input.value ?? '').trim();
    if (!msg) return;

    if (msg.length > MAX_LEN) {
      alert(`Max ${MAX_LEN} characters.`);
      return;
    }

    isSending = true;
    applyCooldownUI();

    try {
      const res = await fetch(API_SEND, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, role: 'user', content: msg })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Failed to send');
        return;
      }

      const mid = Number(data.messageId || 0);
      if (mid) {
        lastId = Math.max(lastId, mid);
        seenIds.add(mid);
      }
      recentLocal.push({ content: escapeText(msg), ts: Date.now() });
      if (recentLocal.length > 10) recentLocal.shift();
      appendMessage('user', msg, new Date().toISOString());

      input.value = '';
      updateCounter();

      startCooldown(); // 10-second delay after sending
      await syncNow();
    } finally {
      isSending = false;
      applyCooldownUI();
    }
  }

  // Ensure handlers attach only once
  sendBtn.addEventListener('click', () => sendMessage());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // ---- Polling ----
  async function syncNow() {
    if (!sessionId) return;

    const res = await fetch(`${API_SYNC}?sessionId=${encodeURIComponent(sessionId)}&sinceId=${encodeURIComponent(String(lastId))}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;

    const messages = data.messages || [];
    for (const m of messages) {
      const mid = Number(m.id) || 0;
      if (mid && seenIds.has(mid)) continue;
      if (m.role === 'user') {
        const dup = recentLocal.find(r => r.content === String(m.content || '') && (Date.now() - r.ts) < 10000);
        if (dup) {
          if (mid) seenIds.add(mid);
          lastId = Math.max(lastId, mid || lastId);
          continue;
        }
      }
      if (mid) seenIds.add(mid);
      lastId = Math.max(lastId, mid || lastId);
      appendMessage(m.role, m.content, m.created_at);
    }
    if (Number(data.lastId)) {
      lastId = Math.max(lastId, Number(data.lastId));
    }
  }

  function startPolling() {
    if (pollTimer) return;
    if (document.hidden) return;

    // Only one tab should poll to save requests
    if (!tryBecomeLeader()) return;

    pollTimer = window.setInterval(async () => {
      if (!isOpen) return;
      if (document.hidden) {
        stopPolling();
        return;
      }

      // keep leadership alive; if we lost it, stop
      if (!heartbeatLeader()) {
        stopPolling();
        return;
      }

      await syncNow();
    }, POLL_MS);
  }

  function stopPolling() {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // Restore open state
  updateAuthUI();
  if (isOpen) setOpen(true);
  // Also restore cooldown UI if panel opened later
})();

