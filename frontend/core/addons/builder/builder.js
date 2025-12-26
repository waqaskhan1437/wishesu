import { createFieldRow, readFieldConfig, renderTypeConfig, applyFieldConfig } from '../fields/fields.js';

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
    read: () => [...list.children].map((row, idx) => readFieldConfig(row, idx)).filter(Boolean),
    set: (config) => {
      list.innerHTML = '';
      const cfg = Array.isArray(config) ? config : [];
      if (!cfg.length) {
        addField();
        return;
      }
      cfg.forEach((item, idx) => {
        const row = createFieldRow(idx);
        list.appendChild(row);
        applyFieldConfig(row, item);
      });
    }
  };
};

