import { el } from '../../utils/utils.js';

export function createToastHost() {
  const host = el('div', { class: 'toast-host' });

  const show = (message) => {
    const toast = el('div', { class: 'toast', text: message });
    host.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-out'), 2200);
    setTimeout(() => toast.remove(), 2600);
  };

  return { node: host, show };
}

