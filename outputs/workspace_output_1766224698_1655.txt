// Helper functions for Cloudflare Workers

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} input - Input string
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Normalize quick action text for comparison
 * @param {string} text - Input text
 * @returns {string} Normalized text
 */
export function normalizeQuickAction(text) {
  return String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Get MIME type from filename extension
 * @param {string} filename - Filename
 * @returns {string} MIME type
 */
export function getMimeTypeFromFilename(filename) {
  const ext = (filename || '').split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'm4v':
      return 'video/x-m4v';
    case 'mkv':
      return 'video/x-matroska';
    case 'avi':
      return 'video/x-msvideo';
    case 'wmv':
      return 'video/x-ms-wmv';
    case 'flv':
      return 'video/x-flv';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    case 'zip':
      return 'application/zip';
    default:
      return '';
  }
}

/**
 * Resolve content type from request headers and filename
 * @param {Request} req - Request object
 * @param {string} filename - Filename
 * @returns {string} Content type
 */
export function resolveContentType(req, filename) {
  const headerContentType = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (headerContentType && headerContentType !== 'application/octet-stream') {
    return headerContentType;
  }
  return getMimeTypeFromFilename(filename) || headerContentType || 'application/octet-stream';
}

/**
 * Normalize archive metadata value
 * @param {string} value - Metadata value
 * @returns {string} Normalized value
 */
export function normalizeArchiveMetaValue(value) {
  return (value || '').toString().replace(/[\r\n\t]+/g, ' ').trim();
}

/**
 * Slugify string for URLs
 * @param {string} input - Input string
 * @returns {string} Slugified string
 */
export function slugifyStr(input) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/**
 * Generate canonical product path
 * @param {Object} product - Product object
 * @returns {string} Canonical path
 */
export function canonicalProductPath(product) {
  const id = product && product.id != null ? String(product.id) : '';
  const slug = (product && product.slug) ? String(product.slug) : slugifyStr(product && product.title ? product.title : 'product');
  return `/product-${id}/${encodeURIComponent(slug)}`;
}

/**
 * Enforce user rate limit (1 message per second)
 * @param {Object} env - Environment bindings
 * @param {string} sessionId - Chat session ID
 * @returns {Promise<void>}
 */
export async function enforceUserRateLimit(env, sessionId) {
  const row = await env.DB.prepare(
    `SELECT strftime('%s', created_at) AS ts
     FROM chat_messages
     WHERE session_id = ? AND role = 'user'
     ORDER BY id DESC
     LIMIT 1`
  ).bind(sessionId).first();

  if (!row?.ts) return;

  const lastTs = Number(row.ts) || 0;
  const nowTs = Math.floor(Date.now() / 1000);

  if (nowTs - lastTs < 1) {
    const err = new Error('Rate limited');
    err.status = 429;
    throw err;
  }
}

/**
 * Get latest order for email
 * @param {Object} env - Environment bindings
 * @param {string} email - Email address
 * @returns {Promise<Object|null>} Latest order or null
 */
export async function getLatestOrderForEmail(env, email) {
  const candidates = await env.DB.prepare(
    `SELECT order_id, status, archive_url, encrypted_data, created_at
     FROM orders
     ORDER BY datetime(created_at) DESC
     LIMIT 80`
  ).all();

  const list = candidates?.results || [];
  const target = String(email || '').trim().toLowerCase();
  if (!target) return null;

  for (const o of list) {
    try {
      if (!o.encrypted_data) continue;
      const data = JSON.parse(o.encrypted_data);
      const e = String(data.email || '').trim().toLowerCase();
      if (e && e === target) {
        return {
          order_id: o.order_id,
          status: o.status,
          trackLink: `/buyer-order.html?id=${encodeURIComponent(o.order_id)}`
        };
      }
    } catch {}
  }
  return null;
}

/**
 * Get Whop API key from database or environment
 * @param {Object} env - Environment bindings
 * @returns {Promise<string|null>} API key or null
 */
export async function getWhopApiKey(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.api_key) {
          return settings.api_key;
        }
      }
    }
  } catch (e) {
    console.error('Error reading API key from database:', e);
  }
  // Fallback to environment variable
  return env.WHOP_API_KEY || null;
}

/**
 * Get Whop webhook secret from database or environment
 * @param {Object} env - Environment bindings
 * @returns {Promise<string|null>} Webhook secret or null
 */
export async function getWhopWebhookSecret(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.webhook_secret) {
          return settings.webhook_secret;
        }
      }
    }
  } catch (e) {
    console.error('Error reading webhook secret from database:', e);
  }
  // Fallback to environment variable
  return env.WHOP_WEBHOOK_SECRET || null;
}

/**
 * Get Google Apps Script URL from database settings
 * @param {Object} env - Environment bindings
 * @returns {Promise<string|null>} Script URL or null
 */
export async function getGoogleScriptUrl(env) {
  try {
    if (env.DB) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('whop').first();
      if (row && row.value) {
        const settings = JSON.parse(row.value);
        if (settings.google_webapp_url) {
          return settings.google_webapp_url;
        }
      }
    }
  } catch (e) {
    console.warn('Error reading Google Script URL from database:', e);
  }
  return null;
}

/**
 * Helper function to generate Offer object for Product schemas
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
        {
          "@type": "DefinedRegion",
          "addressCountry": "US"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "GB"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "CA"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "AU"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "DE"
        },
        {
          "@type": "DefinedRegion",
          "addressCountry": "FR"
        }
      ],
      "shippingRate": {
        "@type": "MonetaryAmount",
        "currency": "USD",
        "value": "0"
      },
      "deliveryTime": {
        "@type": "ShippingDeliveryTime",
        "handlingTime": {
          "@type": "QuantitativeValue",
          "minValue": 0,
          "maxValue": 1,
          "unitCode": "DAY"
        },
        "transitTime": {
          "@type": "QuantitativeValue",
          "minValue": 1,
          "maxValue": 3,
          "unitCode": "DAY"
        }
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
        "description": product.description || product.title,
        "image": product.thumbnail_url || `${baseUrl}/placeholder.jpg`,
        "brand": {
          "@type": "Brand",
          "name": "WishVideo"
        },
        "offers": generateOfferObject(product, baseUrl)
      }
    };

    // Add aggregateRating (always present for better Rich Results)
    item.item.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": parseFloat(product.rating_average) || 5.0,
      "reviewCount": Math.max(1, parseInt(product.review_count) || 1),
      "bestRating": 5,
      "worstRating": 1
    };

    return item;
  });

  const schema = {
    "@context": "https://schema.org/",
    "@type": "ItemList",
    "itemListElement": itemListElement
  };

  return JSON.stringify(schema);
}

/**
 * Inject schema into HTML by replacing placeholder
 * @param {string} html - Original HTML content
 * @param {string} schemaId - ID of schema tag (product-schema or collection-schema)
 * @param {string} schemaJson - JSON-LD schema string
 * @returns {string} Modified HTML with schema injected
 */
export function injectSchemaIntoHTML(html, schemaId, schemaJson) {
  // Replace empty schema placeholder with actual data
  const placeholder = `<script type="application/ld+json" id="${schemaId}">{}</script>`;
  const replacement = `<script type="application/ld+json" id="${schemaId}">${schemaJson}</script>`;
  return html.replace(placeholder, replacement);
}