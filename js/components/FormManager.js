import { BasicTab } from '../tabs/BasicTab.js';
import { PricingTab } from '../tabs/PricingTab.js';
import { MediaTab } from '../tabs/MediaTab.js';
import { AddonsTab } from '../tabs/AddonsTab.js';
import { SeoTab } from '../tabs/SeoTab.js';

export class FormManager {
  constructor(api, tabManager) {
    this.api = api;
    this.tabManager = tabManager;
    this.productId = new URLSearchParams(location.search).get('id');
    
    this.tabs = {
      basic: new BasicTab(),
      pricing: new PricingTab(),
      media: new MediaTab(api),
      addons: new AddonsTab(),
      seo: new SeoTab()
    };
    
    this.init();
  }

  async init() {
    this.renderForm();
    this.setupEvents();
    
    if (this.productId) {
      await this.loadProduct();
    }
  }

  renderForm() {
    const form = document.getElementById('product-form');
    
    form.innerHTML = Object.entries(this.tabs).map(([id, tab], i) => `
      <div class="tab-content ${i === 0 ? 'active' : ''}" data-tab="${id}">
        ${tab.render()}
      </div>
    `).join('');
    
    Object.values(this.tabs).forEach(tab => {
      if (tab.afterRender) tab.afterRender();
    });
  }

  setupEvents() {
    document.addEventListener('tabChange', (e) => {
      this.handleTabChange(e.detail);
    });

    document.getElementById('next').addEventListener('click', async () => {
      if (this.tabManager.getCurrentTab() === 'seo') {
        await this.saveProduct();
      }
    });
  }

  handleTabChange(detail) {
    document.querySelectorAll('.tab-content').forEach((content, i) => {
      content.classList.toggle('active', i === detail.index);
    });
  }

  async loadProduct() {
    try {
      const product = await this.api.get(`/products/${this.productId}`);
      Object.values(this.tabs).forEach(tab => {
        if (tab.populate) tab.populate(product);
      });
    } catch (err) {
      console.error('Load failed:', err);
      alert('Failed to load product');
    }
  }

  async saveProduct() {
    try {
      const data = this.collectData();
      
      const url = this.productId 
        ? `/products/${this.productId}` 
        : '/products';
      
      const method = this.productId ? 'PUT' : 'POST';
      
      const result = await this.api.request(url, {
        method,
        body: JSON.stringify(data)
      });
      
      alert('Product saved!');
      if (!this.productId && result.id) {
        location.href = `?id=${result.id}`;
      }
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  }

  collectData() {
    const data = {};
    Object.values(this.tabs).forEach(tab => {
      if (tab.getData) {
        Object.assign(data, tab.getData());
      }
    });
    return data;
  }
}
