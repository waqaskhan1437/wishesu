/**
 * Card Styles Module
 * Handles CSS injection for product cards
 */

/**
 * Add CSS styles for product cards
 */
export function addStyles() {
  if (document.getElementById('product-cards-styles')) return;

  const style = document.createElement('style');
  style.id = 'product-cards-styles';
  style.textContent = `
    .product-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      text-decoration: none;
      color: inherit;
    }

    .product-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.15);
    }

    .product-thumbnail {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      overflow: hidden;
      background: #f3f4f6;
    }

    .product-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    .product-card:hover .product-thumbnail img {
      transform: scale(1.05);
    }

    .discount-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.85em;
      box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
    }

    .product-content {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }

    .product-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
      margin: 0;
      line-height: 1.4;
      min-height: 2.8em;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .product-prices {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .original-price {
      font-size: 0.9rem;
      color: #9ca3af;
      text-decoration: line-through;
    }

    .sale-price {
      font-size: 1.5rem;
      font-weight: 700;
      color: #3b82f6;
    }

    .product-reviews {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #111827;
      font-weight: 600;
    }
    .rating-text {
      letter-spacing: 0.2px;
    }

    .rating-stars {
      display: flex;
      gap: 2px;
    }

    .star {
      font-size: 1rem;
      line-height: 1;
    }

    .star-full {
      color: #fbbf24;
    }

    .star-half {
      color: #fbbf24;
      opacity: 0.5;
    }

    .star-empty {
      color: #d1d5db;
    }

    .review-count {
      font-size: 0.85rem;
      color: #6b7280;
    }

    .product-delivery {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      background: #f0f9ff;
      border-radius: 6px;
      font-size: 0.9rem;
      color: #1e40af;
      font-weight: 500;
    }

    .delivery-icon {
      font-size: 1.1em;
    }

    .book-now-btn {
      display: block;
      text-align: center;
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: auto;
    }

    .book-now-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
    }

    .book-now-btn:active {
      transform: translateY(0);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .product-cards-grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 20px !important;
      }
    }

    @media (max-width: 480px) {
      .product-cards-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;
  document.head.appendChild(style);
}
