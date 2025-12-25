import { el } from '../core/utils.js';
import { createRouter } from '../core/router.js';
import { StatsView } from '../core/views/stats.js';
import { OrdersView } from '../core/views/orders.js';
import { ProductsView } from '../core/views/products.js';
import { MessagesView } from '../core/views/messages.js';
import { SettingsView } from '../core/views/settings.js';
import { createToastHost } from '../core/components/toast.js';

const app = document.getElementById('app');

const navItems = [
  { path: '/', label: 'Stats' },
  { path: '/orders', label: 'Orders' },
  { path: '/products', label: 'Products' },
  { path: '/messages', label: 'Messages' },
  { path: '/settings', label: 'Settings' }
];

const routes = {
  '/': StatsView,
  '/orders': OrdersView,
  '/products': ProductsView,
  '/messages': MessagesView,
  '/settings': SettingsView
};

const sidebar = el('aside', { class: 'sidebar glass' }, [
  el('div', {}, [
    el('div', { class: 'brand' }, [
      el('div', { class: 'brand-badge', text: 'W' }),
      el('div', { text: 'Wishesu Admin' })
    ]),
    el('nav', { class: 'nav' }, navItems.map((item) =>
      el('a', { href: `#${item.path}`, 'data-route': item.path, text: item.label })
    ))
  ]),
  el('div', { class: 'card' }, [
    el('small', { text: 'Status' }),
    el('strong', { text: 'All systems ready' })
  ])
]);

const topbar = el('header', { class: 'topbar glass' }, [
  el('div', { class: 'search', text: 'Search orders, products, or clients…' }),
  el('button', { class: 'btn', text: 'Create New' })
]);

const outlet = el('main');
const main = el('div', { class: 'main' }, [topbar, outlet]);
app.appendChild(sidebar);
app.appendChild(main);

const toast = createToastHost();
app.appendChild(toast.node);
window.toast = toast.show;
setTimeout(() => toast.show('Welcome back! Dashboard synced.'), 600);

const router = createRouter({ routes, outlet });
router.init();
