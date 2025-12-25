import { el } from '../utils.js';
import { state } from '../store.js';

export function StatsView() {
  const wrap = el('div', { class: 'section fade-in' });
  const title = el('h2', { text: 'Live Overview' });
  const cards = el('div', { class: 'cards' });

  const items = [
    { label: 'Revenue', value: `?${state.stats.revenue.toLocaleString('en-IN')}` },
    { label: 'Orders', value: state.stats.orders },
    { label: 'On-Time', value: `${state.stats.delivery}%` },
    { label: 'Rating', value: state.stats.rating }
  ];

  items.forEach((item) => {
    cards.appendChild(
      el('div', { class: 'card glass' }, [
        el('span', { text: item.label }),
        el('strong', { text: item.value })
      ])
    );
  });

  const chart = el('div', { class: 'card' }, [
    el('h3', { text: 'Weekly Momentum' }),
    el('p', { text: 'Smooth, real-time sales pulse from your storefront.' }),
    el('div', { class: 'pulse' })
  ]);

  wrap.appendChild(title);
  wrap.appendChild(cards);
  wrap.appendChild(chart);
  return wrap;
}
