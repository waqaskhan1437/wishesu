export class SeoTab {
  render() {
    return `
      <div class="form-group">
        <label>Meta Title</label>
        <input type="text" name="meta_title" id="meta-title" maxlength="60">
        <small style="color: var(--text-light);">
          <span id="title-count">0</span>/60 characters
        </small>
      </div>
      
      <div class="form-group">
        <label>Meta Description</label>
        <textarea name="meta_description" id="meta-desc" rows="3" maxlength="160"></textarea>
        <small style="color: var(--text-light);">
          <span id="desc-count">0</span>/160 characters
        </small>
      </div>
      
      <div class="form-group">
        <label>Keywords (comma-separated)</label>
        <input type="text" name="keywords" id="keywords">
      </div>
      
      <div class="form-group">
        <label>Canonical URL</label>
        <input type="url" name="canonical_url" id="canonical-url">
      </div>
    `;
  }

  afterRender() {
    this.setupCharCounters();
  }

  setupCharCounters() {
    const titleInput = document.getElementById('meta-title');
    const descInput = document.getElementById('meta-desc');
    
    titleInput.addEventListener('input', () => {
      document.getElementById('title-count').textContent = titleInput.value.length;
    });
    
    descInput.addEventListener('input', () => {
      document.getElementById('desc-count').textContent = descInput.value.length;
    });
  }

  getData() {
    return {
      meta_title: document.getElementById('meta-title').value,
      meta_description: document.getElementById('meta-desc').value,
      keywords: document.getElementById('keywords').value,
      canonical_url: document.getElementById('canonical-url').value
    };
  }

  populate(product) {
    if (product.seo) {
      document.getElementById('meta-title').value = product.seo.meta_title || '';
      document.getElementById('meta-desc').value = product.seo.meta_description || '';
      document.getElementById('keywords').value = product.seo.keywords || '';
      document.getElementById('canonical-url').value = product.seo.canonical_url || '';
      
      this.setupCharCounters();
      document.getElementById('meta-title').dispatchEvent(new Event('input'));
      document.getElementById('meta-desc').dispatchEvent(new Event('input'));
    }
  }
}
