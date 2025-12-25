import { el } from '../utils.js';

export function DataTable({ columns, rows }) {
  const table = el('table', { class: 'table' });
  const thead = el('thead');
  const headRow = el('tr');

  columns.forEach((col) => {
    headRow.appendChild(el('th', { text: col.label }));
  });
  thead.appendChild(headRow);

  const tbody = el('tbody');
  rows.forEach((row) => {
    const tr = el('tr');
    columns.forEach((col) => {
      const cell = el('td');
      const val = typeof col.render === 'function' ? col.render(row) : row[col.key];
      const node = (val instanceof Node)
        ? val
        : document.createTextNode(val === undefined || val === null ? '' : String(val));
      cell.appendChild(node);
      tr.appendChild(cell);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}
