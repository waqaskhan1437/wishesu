import { el } from '../../../utils/utils.js';
import { DataTable } from '../../../components/data-table/data-table.js';

export const renderProductTable = (list, items, handlers) => {
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
      render: (row) => {
        const slug = row.slug || 'product';
        const href = `/product${row.id}/${encodeURIComponent(slug)}`;
        return el('a', { href, text: 'Open', target: '_blank' });
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const wrap = el('div', { class: 'chips' });
        const edit = el('button', { class: 'page-btn', text: 'Edit' });
        const del = el('button', { class: 'page-btn', text: 'Delete' });
        const dup = el('button', { class: 'page-btn', text: 'Duplicate' });
        edit.addEventListener('click', () => handlers.onEdit(row));
        del.addEventListener('click', () => handlers.onDelete(row));
        dup.addEventListener('click', () => handlers.onDuplicate(row));
        wrap.appendChild(edit);
        wrap.appendChild(del);
        wrap.appendChild(dup);
        return wrap;
      }
    }
  ];
  list.appendChild(DataTable({ columns, rows: items }));
};
