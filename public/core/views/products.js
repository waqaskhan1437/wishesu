import { el } from '../utils.js';
import { DataTable } from '../components/data-table.js';
import { ProductForm } from '../components/product-form.js';
import { ProductAPI } from '../services/product-api.js';

export function ProductsView() {
  const wrap = el('div', { class: 'section fade-in' });
  wrap.appendChild(el('h2', { text: 'Products Studio' }));
  wrap.appendChild(el('p', { text: 'Manage product media, pricing, and personalized video presets.' }));

  const form = ProductForm({ onSaved: () => load() });
  const list = el('div', { class: 'section' });

  const renderList = (items) => {
    list.innerHTML = '';
    const columns = [
      { key: 'id', label: 'Product ID' },
      {
        key: 'thumbnail',
        label: 'Thumbnail',
        render: (row) => {
          const url = (row.media || [])[0];
          return url ? el('img', { src: url, alt: 'thumb', width: '60' }) : el('span', { text: '-' });
        }
      },
      {
        key: 'link',
        label: 'Link',
        render: (row) => el('a', { href: `/product.html?id=${row.id}`, text: 'Open', target: '_blank' })
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row) => {
          const wrap = el('div', { class: 'chips' });
          const edit = el('button', { class: 'page-btn', text: 'Edit' });
          const del = el('button', { class: 'page-btn', text: 'Delete' });
          const dup = el('button', { class: 'page-btn', text: 'Duplicate' });
          edit.addEventListener('click', () => form.setValues(row));
          del.addEventListener('click', async () => {
            await ProductAPI.remove(row.id);
            load();
          });
          dup.addEventListener('click', async () => {
            await ProductAPI.duplicate(row.id);
            load();
          });
          wrap.appendChild(edit);
          wrap.appendChild(del);
          wrap.appendChild(dup);
          return wrap;
        }
      }
    ];
    list.appendChild(DataTable({ columns, rows: items }));
  };

  const load = async () => {
    const res = await ProductAPI.list();
    const items = res.ok && res.data?.results?.length ? res.data.results : [];
    renderList(items);
  };

  wrap.appendChild(form.node);
  wrap.appendChild(list);
  load();
  return wrap;
}
