import { el } from '../../utils/utils.js';

export function createModal() {
  const overlay = el('div', { class: 'modal hidden' });
  const card = el('div', { class: 'card' });
  overlay.appendChild(card);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const open = (content) => {
    card.innerHTML = '';
    card.appendChild(content);
    overlay.classList.remove('hidden');
  };

  const close = () => overlay.classList.add('hidden');
  return { node: overlay, open, close };
}

