/**
 * Card Styles Module
 * Injects basic styles for product cards.
 */
export function addStyles() {
  if (document.getElementById('wm-product-cards-styles')) return;

  const style = document.createElement('style');
  style.id = 'wm-product-cards-styles';
  style.textContent = `
    .wm-cards-grid{display:grid;gap:16px}
    .wm-card{display:block;border:1px solid #e6e6e6;border-radius:14px;overflow:hidden;background:#fff;text-decoration:none;color:inherit}
    .wm-card:hover{box-shadow:0 6px 18px rgba(0,0,0,.08)}
    .wm-card-img{width:100%;aspect-ratio:16/9;object-fit:cover;background:#f3f3f3;display:block}
    .wm-card-body{padding:12px}
    .wm-card-title{font-size:16px;font-weight:700;margin:0 0 6px}
    .wm-card-meta{font-size:13px;opacity:.75;margin:0 0 10px}
    .wm-card-price{font-size:15px;font-weight:700}
    .wm-card-price s{font-weight:400;opacity:.6;margin-left:6px}
    .wm-cards-empty{padding:18px;border:1px dashed #ddd;border-radius:14px;text-align:center;opacity:.8}
  `;
  document.head.appendChild(style);
}
