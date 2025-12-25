import { el } from '../utils.js';
import { MessagesAPI } from '../services/messages-api.js';

export function MessagesView() {
  const wrap = el('div', { class: 'section fade-in' });
  wrap.appendChild(el('h2', { text: 'Support Lounge' }));
  wrap.appendChild(el('p', { text: 'Auto-replies, blocking, and smart queues for faster support.' }));

  const fallbackSessions = [
    { name: 'Sana Malik', last: 'Need delivery update', status: 'Open', time: '2m' },
    { name: 'Haris Khan', last: 'Video looks amazing!', status: 'Resolved', time: '1h' },
    { name: 'Ayesha Ali', last: 'Can I add more photos?', status: 'Pending', time: '3h' }
  ];

  const chatList = el('div', { class: 'chat-list' });
  const renderList = (sessions) => {
    chatList.innerHTML = '';
    sessions.forEach((s) => {
      chatList.appendChild(
        el('div', { class: 'chat-item' }, [
          el('div', { class: 'chat-title', text: s.name }),
          el('div', { class: 'chat-meta' }, [
            el('span', { text: s.last }),
            el('span', { class: 'chat-badge', text: s.status })
          ]),
          el('small', { text: s.time })
        ])
      );
    });
  };

  const chatBody = el('div', { class: 'chat-body' }, [
    el('div', { class: 'chat-thread' }, [
      el('div', { class: 'chat-bubble inbound', text: 'Salam! delivery update mil sakti hai?' }),
      el('div', { class: 'chat-bubble outbound', text: 'Ji bilkul, team update bhej rahi hai.' }),
      el('div', { class: 'chat-bubble inbound', text: 'Thanks! aur photos add kar sakti hun?' })
    ]),
    el('div', { class: 'chat-actions' }, [
      el('button', { class: 'btn-ghost', text: 'Auto-Reply: On' }),
      el('button', { class: 'btn-ghost', text: 'Block User' })
    ]),
    el('div', { class: 'chat-input' }, [
      el('input', { placeholder: 'Type a reply...' }),
      el('button', { class: 'btn', text: 'Send' })
    ])
  ]);

  const load = async () => {
    const res = await MessagesAPI.list();
    const sessions = res.ok && res.data?.results?.length ? res.data.results : fallbackSessions;
    renderList(sessions);
  };

  const shell = el('div', { class: 'chat-shell' }, [chatList, chatBody]);
  wrap.appendChild(shell);
  load();
  return wrap;
}
