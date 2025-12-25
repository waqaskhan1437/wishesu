/**
 * Product Form Delete Button
 * Adds delete functionality to product edit form
 */

export function addDeleteProductButton(form, productId) {
  const actions = form.querySelector('.form-actions');
  if (!actions) return;

  if (actions.querySelector('[data-action="delete-product"]')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.dataset.action = 'delete-product';
  btn.className = 'btn-danger';
  btn.style.cssText = 'margin-left: 10px; background:#ef4444; border:none; color:white; padding:12px 18px; border-radius:10px; font-weight:600; cursor:pointer; display:inline-flex; gap:8px; align-items:center;';
  btn.innerHTML = '<span>🗑️</span><span>Delete Product</span>';

  btn.addEventListener('click', async () => {
    const ok = confirm('Are you sure you want to permanently delete this product? This cannot be undone.');
    if (!ok) return;

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Deleting...';

    try {
      const resp = await fetch(`/api/product/delete?id=${encodeURIComponent(productId)}`, { method: 'DELETE' });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.success) throw new Error(data.error || 'Delete failed');

      alert('Product deleted successfully');
      window.location.href = '/admin/dashboard.html';
    } catch (err) {
      console.error('Delete error', err);
      alert('Error deleting product: ' + (err.message || 'Unknown error'));
      btn.disabled = false;
      btn.textContent = original;
    }
  });

  actions.appendChild(btn);
}
