export class PricingTab {
  render() {
    return `
      <div class="form-group">
        <label>Price *</label>
        <input type="number" name="price" id="price" min="0" step="0.01" required>
      </div>
      
      <div class="form-group">
        <label>Currency</label>
        <select name="currency" id="currency">
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Stock Quantity</label>
        <input type="number" name="stock" id="stock" min="0" value="0">
      </div>
      
      <div class="form-group">
        <label>SKU</label>
        <input type="text" name="sku" id="sku">
      </div>
    `;
  }

  getData() {
    return {
      price: parseFloat(document.getElementById('price').value) || 0,
      currency: document.getElementById('currency').value,
      stock: parseInt(document.getElementById('stock').value) || 0,
      sku: document.getElementById('sku').value
    };
  }

  populate(product) {
    document.getElementById('price').value = product.price || 0;
    document.getElementById('currency').value = product.currency || 'USD';
    document.getElementById('stock').value = product.stock || 0;
    document.getElementById('sku').value = product.sku || '';
  }
}
