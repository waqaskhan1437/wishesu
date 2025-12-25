import { createFieldRow, readFieldConfig, renderTypeConfig } from './fields.js';

export const createAddonBuilder = () => {
  const wrap = document.createElement('div');
  wrap.className = 'addon-builder';

  const list = document.createElement('div');
  list.className = 'addon-fields';
  wrap.appendChild(list);

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'btn-ghost';
  add.textContent = 'Add Field';
  wrap.appendChild(add);

  const addField = () => {
    const row = createFieldRow(list.children.length);
    list.appendChild(row);
    renderTypeConfig(row);
  };

  add.addEventListener('click', addField);
  addField();

  return {
    node: wrap,
    read: () => [...list.children].map((row, idx) => readFieldConfig(row, idx)).filter(Boolean)
  };
};
