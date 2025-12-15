import { TabManager } from './components/TabManager.js';
import { FormManager } from './components/FormManager.js';
import { ApiClient } from './utils/ApiClient.js';

class App {
  constructor() {
    this.api = new ApiClient();
    this.init();
  }

  async init() {
    const root = document.getElementById('app');
    root.innerHTML = this.render();
    
    await this.loadStyles();
    this.setupManagers();
  }

  async loadStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './styles/tabs.css';
    document.head.appendChild(link);
  }

  setupManagers() {
    this.tabs = new TabManager();
    this.form = new FormManager(this.api, this.tabs);
  }

  render() {
    return `
      <div class="container">
        <h1>Product Manager</h1>
        
        <div class="card">
          <div class="progress-bar">
            <div class="progress-fill" id="progress"></div>
          </div>
          
          <div class="tabs" id="tabs"></div>
          <form id="product-form"></form>
          
          <div class="tab-nav">
            <button type="button" class="btn" id="prev">Previous</button>
            <button type="button" class="btn btn-primary" id="next">Next</button>
          </div>
        </div>
      </div>
    `;
  }
}

new App();
