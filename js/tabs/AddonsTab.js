export class AddonsTab {
  constructor() {
    this.addons = [];
  }

  render() {
    return `
      <div class="addons-builder">
        <div class="form-group">
          <label>Product Addons</label>
          <button type="button" class="btn" id="add-addon">+ Add Addon</button>
        </div>
        
        <div id="addons-list"></div>
      </div>
      
      <style>
        .addon-item {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          background: #fafafa;
        }
        
        .addon-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .addon-fields {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1rem;
        }
        
        .addon-remove {
          background: var(--error);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
        }
      </style>
    `;
  }

  afterRender() {
    document.getElementById('add-addon').addEventListener('click', () => {
      this.addAddon();
    });
  }

  addAddon(data = {}) {
    const addon = {
      id: data.id || Date.now(),
      name: data.name || '',
      price: data.price || 0,
      required: data.required || false
    };
    
    this.addons.push(addon);
    this.renderAddons();
  }

  renderAddons() {
    const container = document.getElementById('addons-list');
    
    container.innerHTML = this.addons.map((addon, i) => `
      <div class="addon-item">
        <div class="addon-header">
          <strong>Addon ${i + 1}</strong>
          <button type="button" class="addon-remove" data-index="${i}">Remove</button>
        </div>
        
        <div class="addon-fields">
          <div>
            <label>Name</label>
            <input type="text" value="${addon.name}" data-addon="${i}" data-field="name">
          </div>
          
          <div>
            <label>Price</label>
            <input type="number" value="${addon.price}" data-addon="${i}" data-field="price" step="0.01">
          </div>
          
          <div>
            <label>Required</label>
            <select data-addon="${i}" data-field="required">
              <option value="false" ${!addon.required ? 'selected' : ''}>No</option>
              <option value="true" ${addon.required ? 'selected' : ''}>Yes</option>
            </select>
          </div>
        </div>
      </div>
    `).join('');
    
    this.setupAddonEvents();
  }

  setupAddonEvents() {
    document.querySelectorAll('.addon-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.removeAddon(parseInt(btn.dataset.index));
      });
    });

    document.querySelectorAll('[data-addon]').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.addon);
        const field = e.target.dataset.field;
        let value = e.target.value;
        
        if (field === 'price') value = parseFloat(value) || 0;
        if (field === 'required') value = value === 'true';
        
        this.addons[index][field] = value;
      });
    });
  }

  removeAddon(index) {
    this.addons.splice(index, 1);
    this.renderAddons();
  }

  getData() {
    return { addons: this.addons };
  }

  populate(product) {
    if (product.addons && Array.isArray(product.addons)) {
      this.addons = [];
      product.addons.forEach(addon => this.addAddon(addon));
    }
  }
}
