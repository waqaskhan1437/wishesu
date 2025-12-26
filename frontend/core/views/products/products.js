import { el } from '../../utils/utils.js';
import { ProductForm } from '../../components/product-form/product-form.js';
import { ProductAPI } from '../../services/product-api/product-api.js';
import { createDemoSeeder } from './modules/demo-data.js';
import { renderProductTable } from './modules/table.js';

export function ProductsView() {
  const wrap = el('div', { class: 'section fade-in' });
  wrap.appendChild(el('h2', { text: 'Products Studio' }));
  wrap.appendChild(el('p', { text: 'Manage product media, pricing, and personalized video presets.' }));

  const actionBar = el('div', { class: 'btn-row' }, [
    el('button', { class: 'btn-ghost', text: 'Seed Demo Products' }),
    el('button', { class: 'btn-primary', text: 'Add Demo Product' })
  ]);

  const form = ProductForm({ onSaved: () => load() });
  const list = el('div', { class: 'section' });

  const renderList = (items) => renderProductTable(list, items, {
    onEdit: (row) => form.setValues(row),
    onDelete: async (row) => {
      await ProductAPI.remove(row.id);
      load();
    },
    onDuplicate: async (row) => {
      await ProductAPI.duplicate(row.id);
      load();
    }
  });

  const load = async () => {
    const res = await ProductAPI.list();
    const items = res.ok && res.data?.results?.length ? res.data.results : [];
    renderList(items);
  };

  const [seedBtn, addBtn] = actionBar.querySelectorAll('button');
  const demo = createDemoSeeder();
  seedBtn.addEventListener('click', async () => {
    const batch = demo.seedAll();
    for (const item of batch) {
      await ProductAPI.save(item);
    }
    load();
  });
  addBtn.addEventListener('click', async () => {
    await ProductAPI.save(demo.nextDemo());
    load();
  });

  wrap.appendChild(actionBar);
  wrap.appendChild(form.node);
  wrap.appendChild(list);
  load();
  return wrap;
}



