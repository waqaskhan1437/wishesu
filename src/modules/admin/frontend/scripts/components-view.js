/**
 * Components View
 * Quick access to builders and tools.
 */

import { createViewHeader } from './view-helpers.js';

function createCard(title, description, href) {
  const card = document.createElement('div');
  card.style.cssText = 'background:#fff;border-radius:12px;padding:18px;box-shadow:0 2px 8px rgba(0,0,0,0.08);display:flex;flex-direction:column;gap:8px;';

  const h = document.createElement('h3');
  h.textContent = title;
  h.style.margin = '0';

  const p = document.createElement('p');
  p.textContent = description;
  p.style.margin = '0';
  p.style.color = '#6b7280';

  const link = document.createElement('a');
  link.textContent = 'Open';
  link.href = href;
  link.className = 'btn btn-primary';
  link.style.width = 'fit-content';

  card.appendChild(h);
  card.appendChild(p);
  card.appendChild(link);
  return card;
}

export class ComponentsView {
  constructor(container) {
    this.container = container;
  }

  async render() {
    this.container.innerHTML = '';
    this.container.appendChild(createViewHeader('Components'));

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;';

    grid.appendChild(createCard(
      'Landing Builder',
      'Build landing pages with sections and widgets.',
      '/admin/landing-builder.html'
    ));
    grid.appendChild(createCard(
      'Page Builder',
      'Edit static pages using the builder.',
      '/page-builder.html'
    ));
    grid.appendChild(createCard(
      'Product Form',
      'Create or update a product.',
      '/admin/product-form.html'
    ));

    this.container.appendChild(grid);
  }
}

export default ComponentsView;
