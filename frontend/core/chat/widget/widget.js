import { createLeader } from '../leader/leader.js';

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  });
  [].concat(children).filter(Boolean).forEach((child) => {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return node;
};

const state = {
  sessionId: '',
  lastId: 0,
  open: false
};

const api = {
  async start() {
    const res = await fetch('/api/chat/start', { method: 'POST', body: '{}' });
    const data = await res.json().catch(() => ({}));
    return data.session_id || '';
  },
  async send(message) {
    return fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: state.sessionId, message })
    });
  },
  async poll() {
    const url = `/api/chat/poll?session_id=${encodeURIComponent(state.sessionId)}&since_id=${state.lastId}`;
    const res = await fetch(url);
    return res.json().catch(() => ({ messages: [] }));
  }
};

export function mountChatWidget() {
  const shell = el('div', { class: 'chat-widget' });
  const header = el('button', { class: 'chat-toggle', text: 'Need help?' });
  const panel = el('div', { class: 'chat-panel hidden' });
  const list = el('div', { class: 'chat-log' });
  const input = el('input', { class: 'chat-input', placeholder: 'Type a message...' });
  const sendBtn = el('button', { class: 'chat-send', text: 'Send' });

  const row = el('div', { class: 'chat-row' }, [input, sendBtn]);
  panel.appendChild(list);
  panel.appendChild(row);
  shell.appendChild(header);
  shell.appendChild(panel);
  document.body.appendChild(shell);

  const addMessage = (msg) => {
    list.appendChild(el('div', { class: 'chat-bubble', text: msg.message }));
    list.scrollTop = list.scrollHeight;
    state.lastId = Math.max(state.lastId, Number(msg.id || 0));
  };

  header.addEventListener('click', () => {
    state.open = !state.open;
    panel.classList.toggle('hidden', !state.open);
  });

  sendBtn.addEventListener('click', async () => {
    const text = input.value.trim();
    if (!text) return;
    await api.send(text);
    input.value = '';
  });

  const leader = createLeader(() => {});
  leader.start();

  const pollLoop = async () => {
    if (!state.sessionId) state.sessionId = await api.start();
    if (leader.isLeader()) {
      const data = await api.poll();
      (data.messages || []).forEach(addMessage);
    }
    setTimeout(pollLoop, 3000);
  };

  pollLoop();
}

