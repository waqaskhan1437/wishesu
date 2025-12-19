(function () {
  const cfg = window.ChatWidgetConfig || {};
  const WORKER_BASE = (cfg.workerBaseUrl || "").replace(/\/$/, "");
  const TITLE = cfg.title || "Support Chat";

  if (!WORKER_BASE) {
    console.warn("ChatWidgetConfig.workerBaseUrl is required");
    return;
  }

  const LS_SESSION_KEY = "chat_widget_session_id";
  const LS_PROFILE_KEY = "chat_widget_profile";

  let sessionId = localStorage.getItem(LS_SESSION_KEY) || "";
  let profile = safeJsonParse(localStorage.getItem(LS_PROFILE_KEY)) || null;

  let isOpen = false;
  let lastSeenTimestamp = 0; // we’ll use message.created_at as sync cursor
  let pollTimer = null;

  // ---- UI Inject ----
  const styles = document.createElement("style");
  styles.textContent = `
    .cw-btn {
      position: fixed;
      right: 18px;
      bottom: 18px;
      width: 56px;
      height: 56px;
      border-radius: 999px;
      background: #111;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      user-select: none;
      box-shadow: 0 10px 25px rgba(0,0,0,0.25);
      z-index: 2147483647;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      font-size: 20px;
    }
    .cw-btn:active { cursor: grabbing; transform: scale(0.98); }

    .cw-panel {
      position: fixed;
      right: 18px;
      bottom: 84px;
      width: 340px;
      max-width: calc(100vw - 24px);
      height: 460px;
      max-height: calc(100vh - 110px);
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 16px 45px rgba(0,0,0,0.25);
      overflow: hidden;
      z-index: 2147483647;
      display: none;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    }

    .cw-header {
      height: 48px;
      background: #111;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      font-size: 14px;
    }

    .cw-close {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      background: rgba(255,255,255,0.12);
    }

    .cw-body {
      height: calc(100% - 48px);
      display: flex;
      flex-direction: column;
    }

    .cw-messages {
      flex: 1;
      padding: 12px;
      overflow: auto;
      background: #fafafa;
    }

    .cw-msg {
      margin: 8px 0;
      display: flex;
    }

    .cw-msg.user { justify-content: flex-end; }
    .cw-msg.assistant { justify-content: flex-start; }

    .cw-bubble {
      max-width: 78%;
      padding: 10px 12px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.35;
      white-space: pre-wrap;
      word-wrap: break-word;
      box-shadow: 0 6px 14px rgba(0,0,0,0.08);
    }

    .cw-msg.user .cw-bubble { background: #111; color: #fff; border-bottom-right-radius: 4px; }
    .cw-msg.assistant .cw-bubble { background: #fff; color: #111; border: 1px solid #eee; border-bottom-left-radius: 4px; }

    .cw-footer {
      border-top: 1px solid #eee;
      padding: 10px;
      background: #fff;
    }

    .cw-row { display: flex; gap: 8px; }
    .cw-input {
      flex: 1;
      padding: 10px 10px;
      border: 1px solid #ddd;
      border-radius: 10px;
      font-size: 13px;
      outline: none;
    }
    .cw-send {
      padding: 10px 12px;
      border: 0;
      border-radius: 10px;
      background: #111;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
    }
    .cw-send:disabled { opacity: 0.6; cursor: not-allowed; }

    .cw-form {
      padding: 12px;
    }
    .cw-label { font-size: 12px; color: #444; margin: 10px 0 6px; }
    .cw-field {
      width: 100%;
      padding: 10px 10px;
      border: 1px solid #ddd;
      border-radius: 10px;
      font-size: 13px;
      outline: none;
    }
    .cw-primary {
      margin-top: 12px;
      width: 100%;
      padding: 10px 12px;
      border: 0;
      border-radius: 10px;
      background: #111;
      color: #fff;
      cursor: pointer;
      font-size: 13px;
    }
    .cw-note { font-size: 12px; color: #666; margin-top: 10px; line-height: 1.35; }
  `;
  document.head.appendChild(styles);

  const btn = document.createElement("div");
  btn.className = "cw-btn";
  btn.title = "Open chat";
  btn.textContent = "💬";

  const panel = document.createElement("div");
  panel.className = "cw-panel";

  panel.innerHTML = `
    <div class="cw-header">
      <div>${escapeHtml(TITLE)}</div>
      <div class="cw-close" aria-label="Close">✕</div>
    </div>
    <div class="cw-body"></div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  const bodyEl = panel.querySelector(".cw-body");
  const closeEl = panel.querySelector(".cw-close");

  closeEl.addEventListener("click", () => setOpen(false));

  btn.addEventListener("click", () => {
    // Clicking should not toggle if user is dragging; we’ll handle that with a small move threshold
    if (!btn._dragMoved) setOpen(!isOpen);
  });

  // ---- Draggable floating button ----
  makeDraggable(btn, {
    onDragStart: () => (btn._dragMoved = false),
    onDragMove: () => (btn._dragMoved = true),
  });

  // ---- Initial render ----
  render();

  // ---- Polling ----
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(async () => {
      if (!isOpen || !sessionId) return;
      await syncMessages();
    }, 5000);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  function setOpen(open) {
    isOpen = open;
    panel.style.display = isOpen ? "block" : "none";
    if (isOpen) {
      render();
      startPolling();
      if (sessionId) syncMessages();
    } else {
      stopPolling();
    }
  }

  function render() {
    if (!sessionId || !profile) {
      renderProfileForm();
      return;
    }
    renderChatUI();
  }

  function renderProfileForm() {
    bodyEl.innerHTML = `
      <div class="cw-form">
        <div class="cw-note">Enter your details to start. We'll send a notification when you send your first message.</div>

        <div class="cw-label">Name</div>
        <input class="cw-field" type="text" id="cw_name" placeholder="Your name" />

        <div class="cw-label">Email</div>
        <input class="cw-field" type="email" id="cw_email" placeholder="you@example.com" />

        <button class="cw-primary" id="cw_start">Start chat</button>

        <div class="cw-note" id="cw_err" style="display:none;color:#b00020;"></div>
      </div>
    `;

    const nameEl = bodyEl.querySelector("#cw_name");
    const emailEl = bodyEl.querySelector("#cw_email");
    const startEl = bodyEl.querySelector("#cw_start");
    const errEl = bodyEl.querySelector("#cw_err");

    startEl.addEventListener("click", async () => {
      errEl.style.display = "none";
      startEl.disabled = true;

      const name = (nameEl.value || "").trim();
      const email = (emailEl.value || "").trim();

      if (!email) {
        showError("Email is required");
        startEl.disabled = false;
        return;
      }

      try {
        const res = await fetch(`${WORKER_BASE}/api/chat/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data || !data.ok) {
          throw new Error((data && data.error) || `Start failed (${res.status})`);
        }

        sessionId = data.sessionId;
        profile = { name, email };

        localStorage.setItem(LS_SESSION_KEY, sessionId);
        localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(profile));

        lastSeenTimestamp = 0;
        renderChatUI();
        await syncMessages();
      } catch (e) {
        showError(e.message || "Failed to start");
      } finally {
        startEl.disabled = false;
      }
    });

    function showError(msg) {
      errEl.textContent = msg;
      errEl.style.display = "block";
    }
  }

  function renderChatUI() {
    bodyEl.innerHTML = `
      <div class="cw-messages" id="cw_msgs"></div>
      <div class="cw-footer">
        <div class="cw-row">
          <input class="cw-input" id="cw_input" type="text" placeholder="Type a message..." />
          <button class="cw-send" id="cw_send">Send</button>
        </div>
      </div>
    `;

    const input = bodyEl.querySelector("#cw_input");
    const send = bodyEl.querySelector("#cw_send");

    send.addEventListener("click", async () => {
      await sendMessage(input, send);
    });

    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        await sendMessage(input, send);
      }
    });

    // Helpful welcome bubble (local-only)
    appendMessage({ role: "assistant", content: "Hi! Send a message and we’ll get back to you.", created_at: Date.now() }, true);
  }

  async function sendMessage(inputEl, btnEl) {
    const text = (inputEl.value || "").trim();
    if (!text || !sessionId) return;

    btnEl.disabled = true;

    // Optimistic render
    const optimisticTs = Date.now();
    appendMessage({ role: "user", content: text, created_at: optimisticTs }, true);
    inputEl.value = "";

    try {
      const clientMessageId = `c_${Math.random().toString(16).slice(2)}_${optimisticTs}`;

      const res = await fetch(`${WORKER_BASE}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          role: "user",
          content: text,
          clientMessageId,
          payload: {
            profile,
            page: {
              url: location.href,
              title: document.title,
              referrer: document.referrer,
              userAgent: navigator.userAgent,
            },
          },
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) {
        throw new Error((data && data.error) || `Send failed (${res.status})`);
      }

      // Sync after send
      await syncMessages();
    } catch (e) {
      appendMessage({ role: "assistant", content: "Message failed to send. Please try again.", created_at: Date.now() }, true);
    } finally {
      btnEl.disabled = false;
    }
  }

  async function syncMessages() {
    if (!sessionId) return;

    const since = lastSeenTimestamp ? String(lastSeenTimestamp) : "";
    const url = new URL(`${WORKER_BASE}/api/chat/sync`);
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("limit", "200");
    if (since) url.searchParams.set("since", since);

    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) return;

    const msgs = data.messages || [];
    if (!Array.isArray(msgs) || msgs.length === 0) return;

    for (const m of msgs) {
      appendMessage(m, false);
      if (m.created_at && m.created_at > lastSeenTimestamp) lastSeenTimestamp = m.created_at;
    }
  }

  function appendMessage(msg, autoScroll) {
    const msgsEl = bodyEl.querySelector("#cw_msgs");
    if (!msgsEl) return;

    const role = msg.role === "user" ? "user" : "assistant";
    const wrap = document.createElement("div");
    wrap.className = `cw-msg ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "cw-bubble";
    bubble.textContent = String(msg.content || "");

    wrap.appendChild(bubble);
    msgsEl.appendChild(wrap);

    if (autoScroll) msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // ---- Utilities ----
  function safeJsonParse(s) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[c]));
  }

  function makeDraggable(el, hooks) {
    let startX = 0,
      startY = 0;
    let origX = 0,
      origY = 0;
    let dragging = false;

    el.addEventListener("pointerdown", (e) => {
      dragging = true;
      el.setPointerCapture(e.pointerId);

      hooks && hooks.onDragStart && hooks.onDragStart();

      startX = e.clientX;
      startY = e.clientY;

      const rect = el.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;

      // Switch to explicit left/top for reliable dragging
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.left = `${origX}px`;
      el.style.top = `${origY}px`;
    });

    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const nx = clamp(origX + dx, 8, window.innerWidth - el.offsetWidth - 8);
      const ny = clamp(origY + dy, 8, window.innerHeight - el.offsetHeight - 8);

      el.style.left = `${nx}px`;
      el.style.top = `${ny}px`;

      hooks && hooks.onDragMove && hooks.onDragMove();
    });

    el.addEventListener("pointerup", () => {
      dragging = false;
      hooks && hooks.onDragEnd && hooks.onDragEnd();
      setTimeout(() => (el._dragMoved = false), 0);
    });

    function clamp(v, min, max) {
      return Math.max(min, Math.min(max, v));
    }
  }
})();
