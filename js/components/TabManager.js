export class TabManager {
  constructor() {
    this.tabs = [
      { id: 'basic', label: 'Basic Info', icon: '📝' },
      { id: 'pricing', label: 'Pricing', icon: '💰' },
      { id: 'media', label: 'Media', icon: '🖼️' },
      { id: 'addons', label: 'Addons', icon: '➕' },
      { id: 'seo', label: 'SEO', icon: '🔍' }
    ];
    
    this.current = 0;
    this.completed = new Set();
    this.init();
  }

  init() {
    this.renderTabs();
    this.setupNavigation();
    this.updateProgress();
  }

  renderTabs() {
    const container = document.getElementById('tabs');
    container.innerHTML = this.tabs.map((tab, i) => `
      <button type="button" class="tab ${i === 0 ? 'active' : ''}" data-tab="${i}">
        ${tab.icon} ${tab.label}
      </button>
    `).join('');
  }

  setupNavigation() {
    document.querySelectorAll('.tab').forEach((btn, i) => {
      btn.addEventListener('click', () => this.switchTo(i));
    });

    document.getElementById('prev').addEventListener('click', () => {
      this.switchTo(this.current - 1);
    });

    document.getElementById('next').addEventListener('click', () => {
      if (this.validate()) {
        this.completed.add(this.current);
        this.switchTo(this.current + 1);
      }
    });
  }

  switchTo(index) {
    if (index < 0 || index >= this.tabs.length) return;
    
    this.current = index;
    this.updateUI();
    this.updateProgress();
    this.emit('tabChange', { tab: this.tabs[index].id, index });
  }

  updateUI() {
    document.querySelectorAll('.tab').forEach((btn, i) => {
      btn.classList.toggle('active', i === this.current);
      btn.classList.toggle('completed', this.completed.has(i));
    });

    document.getElementById('prev').disabled = this.current === 0;
    
    const nextBtn = document.getElementById('next');
    if (this.current === this.tabs.length - 1) {
      nextBtn.textContent = 'Save Product';
      nextBtn.classList.add('btn-primary');
    } else {
      nextBtn.textContent = 'Next';
    }
  }

  updateProgress() {
    const percent = ((this.current + 1) / this.tabs.length) * 100;
    document.getElementById('progress').style.width = percent + '%';
  }

  validate() {
    const event = new CustomEvent('validateTab', { 
      detail: { tab: this.tabs[this.current].id }
    });
    document.dispatchEvent(event);
    return true;
  }

  emit(event, data) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  }

  getCurrentTab() {
    return this.tabs[this.current].id;
  }
}
