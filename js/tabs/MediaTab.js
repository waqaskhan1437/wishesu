export class MediaTab {
  constructor(api) {
    this.api = api;
    this.images = [];
  }

  render() {
    return `
      <div class="media-upload">
        <div class="form-group">
          <label>Product Images</label>
          <input type="file" id="media-input" accept="image/*" multiple>
        </div>
        
        <div id="media-preview" class="media-grid"></div>
      </div>
      
      <style>
        .media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .media-item {
          position: relative;
          aspect-ratio: 1;
          border: 2px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .media-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .media-item .remove {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: var(--error);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }
      </style>
    `;
  }

  afterRender() {
    const input = document.getElementById('media-input');
    input.addEventListener('change', (e) => this.handleFiles(e.target.files));
  }

  async handleFiles(files) {
    for (const file of files) {
      await this.addImage(file);
    }
    this.renderPreview();
  }

  async addImage(file) {
    const reader = new FileReader();
    
    return new Promise((resolve) => {
      reader.onload = (e) => {
        this.images.push({
          file,
          preview: e.target.result,
          id: Date.now() + Math.random()
        });
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  renderPreview() {
    const container = document.getElementById('media-preview');
    
    container.innerHTML = this.images.map((img, i) => `
      <div class="media-item">
        <img src="${img.preview}" alt="Preview ${i + 1}">
        <button type="button" class="remove" data-index="${i}">×</button>
      </div>
    `).join('');
    
    container.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this.removeImage(parseInt(btn.dataset.index));
      });
    });
  }

  removeImage(index) {
    this.images.splice(index, 1);
    this.renderPreview();
  }

  getData() {
    return {
      images: this.images.map(img => ({
        file: img.file.name,
        preview: img.preview
      }))
    };
  }

  populate(product) {
    if (product.images) {
      this.images = product.images.map(img => ({
        preview: img.url,
        id: img.id
      }));
      this.renderPreview();
    }
  }
}
