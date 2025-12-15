export class BasicTab {
  render() {
    return `
      <div class="form-group">
        <label>Product Title *</label>
        <input type="text" name="title" id="title" required>
      </div>
      
      <div class="form-group">
        <label>Slug (URL) *</label>
        <input type="text" name="slug" id="slug" required>
        <small style="color: var(--text-light);">Auto-generated from title</small>
      </div>
      
      <div class="form-group">
        <label>Description</label>
        <textarea name="description" id="description" rows="4"></textarea>
      </div>
      
      <div class="form-group">
        <label>Status</label>
        <select name="status" id="status">
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </div>
    `;
  }

  afterRender() {
    this.setupAutoSlug();
  }

  setupAutoSlug() {
    const titleInput = document.getElementById('title');
    const slugInput = document.getElementById('slug');
    
    titleInput.addEventListener('input', () => {
      if (!new URLSearchParams(location.search).get('id')) {
        slugInput.value = this.generateSlug(titleInput.value);
      }
    });
  }

  generateSlug(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  getData() {
    return {
      title: document.getElementById('title').value,
      slug: document.getElementById('slug').value,
      description: document.getElementById('description').value,
      status: document.getElementById('status').value
    };
  }

  populate(product) {
    document.getElementById('title').value = product.title || '';
    document.getElementById('slug').value = product.slug || '';
    document.getElementById('description').value = product.description || '';
    document.getElementById('status').value = product.status || 'draft';
  }
}
