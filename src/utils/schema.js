/**
 * SEO Schema generation utilities for JSON-LD structured data
 */

import { canonicalProductPath } from './formatting.js';

/**
 * Generate Offer object for Product schemas
 * @param {Object} product - Product data
 * @param {string} baseUrl - Site base URL
 * @returns {Object} Offer schema
 */
export function generateOfferObject(product, baseUrl) {
  const price = parseFloat(product.sale_price || product.normal_price || 0);
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const priceValidUntil = date.toISOString().split('T')[0];
  
  // Check if product is digital (instant_delivery = 1 means digital/no shipping)
  const isDigital = product.instant_delivery === 1;

  const offer = {
    "@type": "Offer",
    "url": `${baseUrl}${canonicalProductPath(product)}`,
    "priceCurrency": "USD",
    "price": price.toString(),
    "availability": "https://schema.org/InStock",
    "itemCondition": "https://schema.org/NewCondition",
    "priceValidUntil": priceValidUntil,
    "seller": {
      "@type": "Organization",
      "name": "WishVideo"
    }
  };

  // Only add shipping details for physical products (non-digital)
  if (!isDigital) {
    offer.shippingDetails = {
      "@type": "OfferShippingDetails",
      "shippingDestination": [
        { "@type": "DefinedRegion", "addressCountry": "US" },
        { "@type": "DefinedRegion", "addressCountry": "GB" },
        { "@type": "DefinedRegion", "addressCountry": "CA" },
        { "@type": "DefinedRegion", "addressCountry": "AU" },
        { "@type": "DefinedRegion", "addressCountry": "DE" },
        { "@type": "DefinedRegion", "addressCountry": "FR" }
      ],
      "shippingRate": {
        "@type": "MonetaryAmount",
        "currency": "USD",
        "value": "0"
      },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": { "@type": "QuantitativeValue", "minValue": 0, "maxValue": 1, "unitCode": "DAY" },
        "transitTime": { "@type": "QuantitativeValue", "minValue": 1, "maxValue": 3, "unitCode": "DAY" }
      }
    };
    
    offer.hasMerchantReturnPolicy = {
      "@type": "MerchantReturnPolicy",
      "applicableCountry": "US",
      "returnPolicyCategory": "MerchantReturnNotPermitted",
      "merchantReturnDays": 0
    };
  }

  return offer;
}

/**
 * Generate Product schema for individual product pages
 * @param {Object} product - Product data from database
 * @param {string} baseUrl - Site base URL
 * @param {Array} reviews - Individual reviews for this product
 * @returns {string} JSON-LD schema as string
 */
export function generateProductSchema(product, baseUrl, reviews = []) {
  const sku = product.slug ? `WV-${product.id}-${product.slug.toUpperCase().replace(/-/g, '')}` : `WV-${product.id}`;

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "@id": `${baseUrl}${canonicalProductPath(product)}`,
    "name": product.title,
    "description": product.seo_description || product.description || product.title,
    "sku": sku,
    "mpn": sku,
    "image": product.thumbnail_url ? [product.thumbnail_url] : [],
    "brand": {
      "@type": "Brand",
      "name": "WishVideo",
      "logo": `${baseUrl}/favicon.ico`
    },
    "manufacturer": {
      "@type": "Organization",
      "name": "WishVideo",
      "url": baseUrl
    },
    "category": "Digital Goods > Personalized Videos",
    "offers": generateOfferObject(product, baseUrl)
  };

  // Add aggregateRating (always present, even with 0 reviews for better Rich Results)
  schema.aggregateRating = {
    "@type": "AggregateRating",
    "ratingValue": parseFloat(product.rating_average) || 5.0,
    "reviewCount": Math.max(1, parseInt(product.review_count) || 1),
    "bestRating": 5,
    "worstRating": 1
  };

  // Add individual reviews (first 5 for Rich Results)
  if (reviews && reviews.length > 0) {
    const limitedReviews = reviews.slice(0, 5);
    schema.review = limitedReviews.map(review => ({
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": 5,
        "worstRating": 1
      },
      "author": {
        "@type": "Person",
        "name": review.author_name || "Customer"
      },
      "reviewBody": review.comment || "",
      "datePublished": review.created_at ? new Date(review.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }));
  }

  return JSON.stringify(schema);
}

/**
 * Generate ItemList schema for product collection pages
 * @param {Array} products - Array of product data
 * @param {string} baseUrl - Site base URL
 * @returns {string} JSON-LD schema as string
 */
export function generateCollectionSchema(products, baseUrl) {
  if (!products || products.length === 0) {
    return '{}';
  }

  const itemListElement = products.map((product, index) => {
    const item = {
      "@type": "ListItem",
      "position": index + 1,
      "url": `${baseUrl}${canonicalProductPath(product)}`,
      "item": {
        "@type": "Product",
        "@id": `${baseUrl}${canonicalProductPath(product)}`,
        "name": product.title,
        "description": product.seo_description || product.description || product.title,
        "image": product.thumbnail_url ? [product.thumbnail_url] : [],
        "offers": generateOfferObject(product, baseUrl)
      }
    };

    // Add aggregateRating if product has reviews
    if (product.review_count > 0) {
      item.item.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": parseFloat(product.rating_average) || 5.0,
        "reviewCount": parseInt(product.review_count) || 1,
        "bestRating": 5,
        "worstRating": 1
      };
    }

    return item;
  });

  const schema = {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    "name": "WishVideo Products",
    "numberOfItems": products.length,
    "itemListElement": itemListElement
  };

  return JSON.stringify(schema);
}

/**
 * Inject schema into HTML by replacing placeholder
 * @param {string} html - HTML content
 * @param {string} schemaId - Schema placeholder ID
 * @param {string} schemaJson - JSON-LD schema string
 * @returns {string} Modified HTML
 */
export function injectSchemaIntoHTML(html, schemaId, schemaJson) {
  const placeholder = `<script type="application/ld+json" id="${schemaId}">{}</script>`;
  const replacement = `<script type="application/ld+json" id="${schemaId}">${schemaJson}</script>`;
  return html.replace(placeholder, replacement);
}
