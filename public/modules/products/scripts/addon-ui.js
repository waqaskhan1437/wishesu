/*
 * UI helpers for rendering product addon controls.
 * Updated: Forces file inputs to accept ONLY IMAGES.
 */

;(function(){
  // STRICT: Use centralized delivery time utility with addon delivery data
  function mapDeliveryLabel(deliveryText, isInstant) {
    if (!window.DeliveryTimeUtils) {
      console.error('DeliveryTimeUtils not loaded');
      return '2 Days Delivery';
    }
    // STRICT: Pass instant flag and deliveryText (which should be days like "1", "2", "3")
    return window.DeliveryTimeUtils.getDeliveryText(isInstant, deliveryText);
  }

  function renderAddonField(field) {
    const container = document.createElement('div');
    container.className = 'addon-group';

    // 1. Create Main Label
    if (field.label) {
      const lbl = document.createElement('label');
      lbl.className = 'addon-group-label';
      lbl.innerHTML = field.label + (field.required ? ' <span style="color:red">*</span>' : '');
      if (!['radio', 'checkbox_group'].includes(field.type)) lbl.htmlFor = field.id;
      container.appendChild(lbl);
    }

    const extras = document.createElement('div');
    extras.className = 'addon-extras';
    let input;

    // Helper to set dataset
    const setDataset = (el, opt) => {
      el.dataset.price = opt.price || 0;
      if (opt.file) {
        el.dataset.needsFile = 'true';
        el.dataset.fileQty = opt.fileQuantity || 1; 
      }
      if (opt.textField) el.dataset.needsText = 'true';
    };

    if (field.type === 'select') {
      input = document.createElement('select');
      input.className = 'form-select';
      input.name = input.id = field.id;
      
      field.options.forEach(opt => {
        const o = document.createElement('option');
        const isDelivery = field.id === 'delivery-time';
        const deliveryInstant = !!opt.delivery?.instant;
        const displayLabel = isDelivery ? mapDeliveryLabel(opt.delivery?.text || opt.label, deliveryInstant) : opt.label;
        o.value = opt.label;
        o.text = displayLabel + (opt.price > 0 ? ` (+$${opt.price})` : '');
        if (opt.default) o.selected = true;
        setDataset(o, opt);
        input.add(o);
      });

      input.onchange = () => {
        if (window.updateTotal) window.updateTotal();

        if (field.id === 'delivery-time' && typeof window.updateDeliveryBadge === 'function') {
          const selectedOpt = input.selectedOptions[0];
          if (selectedOpt) {
            const selectedLabel = selectedOpt.text.replace(/\s*\(\+\$[\d.]+\)\s*$/, '').trim();
            window.updateDeliveryBadge(selectedLabel);
          }
        }

        renderExtras(extras, input.selectedOptions[0]?.dataset || {}, field.id);
      };
      if (input.selectedOptions[0]) renderExtras(extras, input.selectedOptions[0].dataset, field.id);

    } else if (['radio', 'checkbox_group'].includes(field.type)) {
      input = document.createElement('div');
      const isRadio = field.type === 'radio';
      
      field.options.forEach((opt, idx) => {
        const wrapper = isRadio ? null : document.createElement('div');
        const l = document.createElement('label');
        l.className = 'addon-option-card';
        if (opt.default) l.classList.add('selected');

        const inp = document.createElement('input');
        inp.type = isRadio ? 'radio' : 'checkbox';
        inp.name = field.id + (isRadio ? '' : '[]');
        const isDelivery = field.id === 'delivery-time';
        const deliveryInstant = !!opt.delivery?.instant;
        const displayLabel = isDelivery ? mapDeliveryLabel(opt.delivery?.text || opt.label, deliveryInstant) : opt.label;
        inp.value = opt.label;
        inp.className = isRadio ? 'addon-radio' : 'addon-checkbox';
        if (opt.default) inp.checked = true;
        setDataset(inp, opt);

        const subExtras = isRadio ? extras : document.createElement('div');
        if (!isRadio) subExtras.style.marginLeft = '1.5rem';

        inp.onchange = () => {
          if (window.updateTotal) window.updateTotal();
          if (isRadio) {
            input.querySelectorAll('.addon-option-card').forEach(c => c.classList.remove('selected'));
            if (inp.checked) l.classList.add('selected');
            renderExtras(extras, inp.dataset, field.id);

            if (field.id === 'delivery-time' && inp.checked && typeof window.updateDeliveryBadge === 'function') {
              window.updateDeliveryBadge(displayLabel);
            }
          } else {
            l.classList.toggle('selected', inp.checked);
            renderExtras(subExtras, inp.checked ? inp.dataset : {}, field.id + '_' + idx);
          }
        };

        l.append(inp, document.createTextNode(' ' + displayLabel));
        if (opt.price > 0) {
          const p = document.createElement('span');
          p.className = 'opt-price';
          p.textContent = ' +$' + opt.price;
          l.appendChild(p);
        }

        if (isRadio) {
          input.appendChild(l);
          if (inp.checked) setTimeout(() => renderExtras(extras, inp.dataset, field.id), 0);
        } else {
          wrapper.append(l, subExtras);
          input.appendChild(wrapper);
          if (inp.checked) renderExtras(subExtras, inp.dataset, field.id + '_' + idx);
        }
      });
    } else {
      // Standalone fields
      const isArea = field.type === 'textarea';
      input = document.createElement(isArea ? 'textarea' : 'input');
      input.className = isArea ? 'form-textarea' : 'form-input';
      if (!isArea) input.type = field.type;
      input.name = input.id = field.id;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.required) input.required = true;

      // Add character limits
      if (field.type === 'text' || field.type === 'email') {
        input.maxLength = 1000; // Text fields max 1000 characters
      }
      if (isArea) {
        input.maxLength = 3000; // Textareas max 3000 characters
      }

      // Restrict standalone file inputs to images and 5MB size
      if (field.type === 'file') {
        input.accept = 'image/*';
        // File size validation will be done during upload
      }
    }

    container.appendChild(input);
    if (field.type !== 'checkbox_group') container.appendChild(extras);
    return container;
  }

  function renderExtras(container, ds, idSuffix) {
    container.innerHTML = '';
    const createField = (label, type, name) => {
      const d = document.createElement('div');
      d.style.marginTop = '0.5rem';
      d.innerHTML = `<label for="${name}" style="font-size:0.9rem;display:block;margin-bottom:0.2rem">${label}</label>`;
      const i = document.createElement('input');
      i.type = type; i.name = i.id = name;
      
      // --- RESTRICTION: Only Allow Images ---
      if (type === 'file') {
        i.accept = 'image/*';
      }
      
      if (type === 'text') { i.className = 'form-input'; i.placeholder = 'Enter details...'; }
      d.appendChild(i);
      container.appendChild(d);
    };

    if (ds.needsFile === 'true') {
        const qty = parseInt(ds.fileQty || '1', 10);
        if (qty > 1) {
            for(let i = 1; i <= qty; i++) {
                createField(`Upload Photo ${i}:`, 'file', `file_${idSuffix}_${i}`);
            }
        } else {
            createField('Upload Photo:', 'file', 'file_' + idSuffix);
        }
    }
    
    if (ds.needsText === 'true') createField('Details:', 'text', 'text_' + idSuffix);
  }

  window.renderAddonField = renderAddonField;
  window.renderExtras = renderExtras;
})();
