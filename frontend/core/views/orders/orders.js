import { el, formatMoney, formatDate } from '../../utils/utils.js';
import { DataTable } from '../../components/data-table/data-table.js';
import { OrdersAPI } from '../../services/orders-api/orders-api.js';

export function OrdersView() {
  const wrap = el('div', { class: 'section fade-in' });
  wrap.appendChild(el('h2', { text: 'Orders Command Center' }));
  wrap.appendChild(el('p', { text: 'Track every order, delivery window, and client message.' }));

  const fallbackRows = [
    { id: 'OD-1081', buyer: 'Sana Malik', total: 4200, status: 'In Production', date: '2025-12-18' },
    { id: 'OD-1082', buyer: 'Haris Khan', total: 2400, status: 'Delivered', date: '2025-12-17' },
    { id: 'OD-1083', buyer: 'Ayesha Ali', total: 5200, status: 'Revision', date: '2025-12-16' },
    { id: 'OD-1084', buyer: 'Zain Raza', total: 1800, status: 'Queued', date: '2025-12-15' }
  ];

  const state = { query: '', status: 'all', page: 1, size: 4 };
  const tableWrap = el('div');
  const pageInfo = el('span');

  const columns = [
    { key: 'id', label: 'Order ID' },
    { key: 'buyer', label: 'Buyer' },
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
    { key: 'total', label: 'Total', render: (r) => formatMoney(r.total) },
    { key: 'status', label: 'Status', render: (r) => el('span', { class: 'badge', text: r.status }) }
  ];

  const render = (rows) => {
    const q = state.query.toLowerCase();
    const filtered = rows.filter((row) => {
      const matchQuery = row.id.toLowerCase().includes(q) || row.buyer.toLowerCase().includes(q);
      const matchStatus = state.status === 'all' || row.status === state.status;
      return matchQuery && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / state.size));
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * state.size;
    const pageRows = filtered.slice(start, start + state.size);

    tableWrap.innerHTML = '';
    tableWrap.appendChild(DataTable({ columns, rows: pageRows }));
    pageInfo.textContent = `Page ${state.page} of ${totalPages}`;
  };

  const filters = el('div', { class: 'filters' }, [
    el('input', {
      placeholder: 'Search order or buyer',
      oninput: (e) => { state.query = e.target.value; state.page = 1; render(currentRows); }
    }),
    el('select', {
      onchange: (e) => { state.status = e.target.value; state.page = 1; render(currentRows); }
    }, [
      el('option', { value: 'all', text: 'All statuses' }),
      el('option', { value: 'Queued', text: 'Queued' }),
      el('option', { value: 'In Production', text: 'In Production' }),
      el('option', { value: 'Revision', text: 'Revision' }),
      el('option', { value: 'Delivered', text: 'Delivered' })
    ]),
    el('select', { onchange: (e) => { state.size = Number(e.target.value); state.page = 1; render(currentRows); } }, [
      el('option', { value: '4', text: '4 per page' }),
      el('option', { value: '6', text: '6 per page' }),
      el('option', { value: '8', text: '8 per page' })
    ])
  ]);

  const chips = el('div', { class: 'chips' }, ['Queued', 'In Production', 'Revision', 'Delivered'].map((label) =>
    el('div', {
      class: `chip ${state.status === label ? 'active' : ''}`,
      text: label,
      onclick: () => { state.status = label; state.page = 1; render(currentRows); renderChips(); }
    })
  ));

  const renderChips = () => {
    [...chips.children].forEach((chip) => {
      chip.classList.toggle('active', chip.textContent === state.status);
    });
  };

  const pagination = el('div', { class: 'pagination' }, [
    el('button', {
      class: 'page-btn',
      text: 'Prev',
      onclick: () => { state.page = Math.max(1, state.page - 1); render(currentRows); }
    }),
    pageInfo,
    el('button', {
      class: 'page-btn',
      text: 'Next',
      onclick: () => { state.page += 1; render(currentRows); }
    })
  ]);

  let currentRows = fallbackRows;
  const load = async () => {
    const res = await OrdersAPI.list();
    const apiRows = (res.ok && res.data?.results?.length) ? res.data.results.map((row) => ({
      id: row.order_id || String(row.id),
      buyer: row.email || 'Unknown',
      total: row.amount || 0,
      status: row.status || 'pending',
      date: row.created_at || new Date().toISOString().slice(0, 10)
    })) : fallbackRows;
    currentRows = apiRows;
    render(currentRows);
  };

  wrap.appendChild(filters);
  wrap.appendChild(chips);
  wrap.appendChild(tableWrap);
  wrap.appendChild(pagination);

  load();
  return wrap;
}

