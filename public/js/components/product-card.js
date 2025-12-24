/**
 * Product Card Component
 * Unified, reusable product card for all pages
 * Replaces duplicate product card implementations
 */

import { createElement } from '../../utils/dom-helper.js';
import { formatPrice } from '../../utils/format-utils.js';

export class ProductCard {
  constructor(product, options = {}) {
    this.product = product;
    this.options = {
      showReviews: options.showReviews !== false,
      showDelivery: options.showDelivery !== false,
      showDiscount: options.showDiscount !== false,
      cardStyle: options.cardStyle || 'default', // default, compact, detailed
      ...options
    };
  }

  /**
   * Get safe product slug
   */
  _getSafeSlug() {
    const { slug, title } = this.product;
    return slug || title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'product';
  }

  /**
   * Get product URL
   */
  _getProductUrl() {
    const { id, slug } = this.product;
    const safeSlug = this._getSafeSlug();

    if (id) {
      return `/product-${encodeURIComponent(id)}/${encodeURIComponent(safeSlug)}`;
    }
    return `/product/${encodeURIComponent(safeSlug)}`;
  }

  /**
   * Calculate discount
   */
  _calculateDiscount() {
    const { normal_price, sale_price } = this.product;
    const originalPrice = parseFloat(normal_price || 0);
    const salePrice = parseFloat(sale_price || originalPrice);
    const hasDiscount = salePrice < originalPrice;
    const discount = hasDiscount ? Math.round((1 - salePrice / originalPrice) * 100) : 0;

    return { originalPrice, salePrice, hasDiscount, discount };
  }

  /**
   * Get delivery text
   */
  _getDeliveryText() {
    const { instant_delivery, normal_delivery_text } = this.product;

    if (instant_delivery) {
      return ' Instant Delivery';
    }

    return normal_delivery_text || 'Standard Delivery';
  }

  /**
   * Format rating text
   */
  _formatRatingText() {
    const { average_rating, review_count } = this.product;
    const rating = parseFloat(average_rating || 5);
    const count = parseInt(review_count || 0);

    const stars = ''.repeat(Math.round(rating));
    return `${stars} (${count})`;
  }

  /**
   * Render card element
   */
  render() {
    const { title, thumbnail_url } = this.product;
    const productUrl = this._getProductUrl();
    const { originalPrice, salePrice, hasDiscount, discount } = this._calculateDiscount();
    const deliveryText = this._getDeliveryText();
    const ratingText = this._formatRatingText();

    // Create card link
    const card = createElement('a', {
      className: `product-card product-card-${this.options.cardStyle}`,
      href: productUrl,
      dataset: { productId: this.product.id }
    });

    // Thumbnail
    const thumbnail = createElement('div', {
      className: 'product-thumbnail'
    });

    const img = createElement('img', {
      src: thumbnail_url || '/placeholder.jpg',
      alt: title,
      loading: 'lazy'
    });
    thumbnail.appendChild(img);

    // Discount badge
    if (hasDiscount && this.options.showDiscount && discount > 0) {
      const badge = createElement('div', {
        className: 'discount-badge',
        textContent: `${discount}% OFF`
      });
      thumbnail.appendChild(badge);
    }

    card.appendChild(thumbnail);

    // Content
    const content = createElement('div', {
      className: 'product-content'
    });

    // Title
    const titleElement = createElement('h3', {
      className: 'product-title',
      textContent: title
    });
    content.appendChild(titleElement);

    // Meta row (Price & Reviews)
    const metaRow = createElement('div', {
      className: 'product-meta-row'
    });

    // Prices
    const pricesDiv = createElement('div', {
      className: 'product-prices'
    });

    if (hasDiscount) {
      const originalPriceSpan = createElement('span', {
        className: 'original-price',
        textContent: formatPrice(originalPrice)
      });
      pricesDiv.appendChild(originalPriceSpan);
    }

    const salePriceSpan = createElement('span', {
      className: 'sale-price',
      textContent: formatPrice(salePrice)
    });
    pricesDiv.appendChild(salePriceSpan);

    metaRow.appendChild(pricesDiv);

    // Reviews
    if (this.options.showReviews) {
      const reviewsDiv = createElement('div', {
        className: 'product-reviews'
      });

      const ratingSpan = createElement('span', {
        className: 'rating-text',
        textContent: ratingText
      });
      reviewsDiv.appendChild(ratingSpan);

      metaRow.appendChild(reviewsDiv);
    }

    content.appendChild(metaRow);

    // Delivery info
    if (this.options.showDelivery) {
      const deliveryDiv = createElement('div', {
        className: 'product-delivery'
      });

      const deliverySpan = createElement('span', {
        className: 'delivery-text',
        textContent: deliveryText
      });
      deliveryDiv.appendChild(deliverySpan);

      content.appendChild(deliveryDiv);
    }

    // Book Now button (for detailed style)
    if (this.options.cardStyle === 'detailed') {
      const bookBtn = createElement('button', {
        className: 'product-book-btn',
        textContent: 'Book Now'
      });
      content.appendChild(bookBtn);
    }

    card.appendChild(content);

    return card;
  }

  /**
   * Static method to create card from product data
   */
  static create(product, options = {}) {
    const card = new ProductCard(product, options);
    return card.render();
  }
}

export default ProductCard;

