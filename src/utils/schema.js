/**
 * SEO Schema generation utilities for JSON-LD structured data
 */

import { canonicalProductPath } from './formatting.js';

function resolveSchemaBrandName(baseUrl, fallback = 'Prankwish') {
  try {
    const hostname = new URL(String(baseUrl || 'https://prankwish.com')).hostname.replace(/^www\./i, '');
    const firstLabel = hostname.split('.')[0] || '';
    const brand = firstLabel
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return brand || fallback;
  } catch (_) {
    return fallback;
  }
}

/**
 * Generate Offer object for Product schemas
 * @param {Object} product - Product data
 * @param {string} baseUrl - Site base URL
 * @returns {Object} Offer schema
 */
export function generateOfferObject(product, baseUrl) {
  const brandName = resolveSchemaBrandName(baseUrl);
  const price = parseFloat(product.sale_price || product.normal_price || 0);
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  const priceValidUntil = date.toISOString().split('T')[0];
  
  // Check if product is digital - handle various data types from database
  const instantDelivery = product.instant_delivery;
  const isDigital = instantDelivery === 1 || instantDelivery === '1' || instantDelivery === true;
  
  // Get delivery time in days - parse from various possible formats
  let deliveryDays = 1;
  if (product.normal_delivery_text) {
    const match = String(product.normal_delivery_text).match(/\d+/);
    if (match) deliveryDays = parseInt(match[0]) || 1;
  } else if (product.delivery_time_days) {
    deliveryDays = parseInt(product.delivery_time_days) || 1;
  }

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
      "name": brandName
    }
  };

  // ALWAYS add shippingDetails - required for Google Rich Results
  offer.shippingDetails = {
    "@type": "OfferShippingDetails",
    "shippingDestination": {
      "@type": "DefinedRegion",
      "addressCountry": "US"
    },
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
        "minValue": isDigital ? 0 : 1,
        "maxValue": isDigital ? 0 : Math.max(1, deliveryDays),
        "unitCode": "DAY"
      }
    }
  };
  
  // ALWAYS add hasMerchantReturnPolicy - required for Google Rich Results
  offer.hasMerchantReturnPolicy = {
    "@type": "MerchantReturnPolicy",
    "applicableCountry": "US",
    "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
    "merchantReturnDays": 0
  };

  return offer;
}

/**
 * Generate VideoObject schema for video content
 * @param {Object} product - Product data
 * @param {string} baseUrl - Site base URL
 * @returns {Object|null} VideoObject schema or null if no video
 */
export function generateVideoObject(product, baseUrl) {
  const brandName = resolveSchemaBrandName(baseUrl);
  // Check for video URL in various fields
  const videoUrl = product.video_url || product.preview_video_url || product.sample_video_url;
  
  if (!videoUrl) return null;
  
  // Get upload date - use product created_at or current date
  const uploadDate = product.created_at 
    ? new Date(product.created_at).toISOString() 
    : new Date().toISOString();
  
  // Estimate duration - default 60 seconds for personalized videos
  const duration = product.video_duration || "PT1M";
  
  const videoSchema = {
    "@type": "VideoObject",
    "name": `${product.title} - Personalized Video`,
    "description": product.seo_description || product.description || `Watch ${product.title} personalized video greeting`,
    "thumbnailUrl": product.thumbnail_url || `${baseUrl}/favicon.ico`,
    "uploadDate": uploadDate,
    "duration": duration,
    "contentUrl": videoUrl,
    "embedUrl": videoUrl,
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": { "@type": "WatchAction" },
      "userInteractionCount": parseInt(product.view_count) || 0
    },
    "publisher": {
      "@type": "Organization",
      "name": brandName,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/favicon.ico`
      }
    }
  };
  
  // Add potentialAction for video
  videoSchema.potentialAction = {
    "@type": "WatchAction",
    "target": `${baseUrl}${canonicalProductPath(product)}`
  };
  
  return videoSchema;
}

/**
 * Generate Product schema for individual product pages
 * @param {Object} product - Product data from database
 * @param {string} baseUrl - Site base URL
 * @param {Array} reviews - Individual reviews for this product
 * @returns {string} JSON-LD schema as string
 */
export function generateProductSchema(product, baseUrl, reviews = []) {
  const brandName = resolveSchemaBrandName(baseUrl);
  const sku = product.slug ? `WV-${product.id}-${product.slug.toUpperCase().replace(/-/g, '')}` : `WV-${product.id}`;
  const productUrl = `${baseUrl}${canonicalProductPath(product)}`;

  // Build images array - include thumbnail and video thumbnail
  const images = [];
  if (product.thumbnail_url) images.push(product.thumbnail_url);
  if (product.gallery_images) {
    try {
      const gallery = typeof product.gallery_images === 'string' 
        ? JSON.parse(product.gallery_images) 
        : product.gallery_images;
      if (Array.isArray(gallery)) {
        images.push(...gallery.slice(0, 5));
      }
    } catch (e) {}
  }

  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "@id": productUrl,
    "name": product.title,
    "description": product.seo_description || product.description || product.title,
    "sku": sku,
    "mpn": sku,
    "image": images.length > 0 ? images : [`${baseUrl}/favicon.ico`],
    "brand": {
      "@type": "Brand",
      "name": brandName,
      "logo": `${baseUrl}/favicon.ico`
    },
    "manufacturer": {
      "@type": "Organization",
      "name": brandName,
      "url": baseUrl
    },
    "category": "Digital Goods > Personalized Videos",
    "offers": generateOfferObject(product, baseUrl)
  };

  // Add video if available - this enables video rich results
  const videoObject = generateVideoObject(product, baseUrl);
  if (videoObject) {
    schema.video = videoObject;
    // Also add subjectOf for additional video association
    schema.subjectOf = {
      "@type": "VideoObject",
      "@id": `${productUrl}#video`,
      ...videoObject
    };
  }

  // Only add aggregateRating when real reviews exist
  if (parseInt(product.review_count) > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": parseFloat(product.rating_average),
      "reviewCount": parseInt(product.review_count),
      "bestRating": 5,
      "worstRating": 1
    };
  }

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
 * Generate standalone VideoObject schema for video-focused pages
 * @param {Object} product - Product data
 * @param {string} baseUrl - Site base URL
 * @returns {string} JSON-LD VideoObject schema as string
 */
export function generateVideoSchema(product, baseUrl) {
  const videoObject = generateVideoObject(product, baseUrl);
  
  if (!videoObject) {
    return '{}';
  }
  
  const schema = {
    "@context": "https://schema.org/",
    ...videoObject,
    "@id": `${baseUrl}${canonicalProductPath(product)}#video`
  };
  
  return JSON.stringify(schema);
}

/**
 * Generate ItemList schema for product collection pages
 * @param {Array} products - Array of product data
 * @param {string} baseUrl - Site base URL
 * @returns {string} JSON-LD schema as string
 */
export function generateCollectionSchema(products, baseUrl) {
  const brandName = resolveSchemaBrandName(baseUrl);
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

    // Add video thumbnail to images if video exists
    const videoUrl = product.video_url || product.preview_video_url;
    if (videoUrl && product.thumbnail_url) {
      item.item.video = {
        "@type": "VideoObject",
        "name": product.title,
        "thumbnailUrl": product.thumbnail_url,
        "contentUrl": videoUrl
      };
    }

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
    "name": `${brandName} Products`,
    "numberOfItems": products.length,
    "itemListElement": itemListElement
  };

  return JSON.stringify(schema);
}

/**
 * Generate BlogPosting JSON-LD schema for individual blog posts
 * @param {Object} blog - Blog data from database
 * @param {string} baseUrl - Site base URL
 * @returns {string} JSON-LD schema as string
 */
export function generateBlogPostingSchema(blog, baseUrl) {
  const brandName = resolveSchemaBrandName(baseUrl);
  const blogHeadline = blog.seo_title || blog.title || '';
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": blogHeadline,
    "description": (blog.seo_description || blog.description || '').substring(0, 160),
    "image": blog.thumbnail_url || `${baseUrl}/favicon.ico`,
    "datePublished": blog.created_at ? new Date(blog.created_at).toISOString() : new Date().toISOString(),
    "dateModified": blog.updated_at
      ? new Date(blog.updated_at).toISOString()
      : (blog.created_at ? new Date(blog.created_at).toISOString() : new Date().toISOString()),
    "author": {
      "@type": "Organization",
      "name": brandName
    },
    "publisher": {
      "@type": "Organization",
      "name": brandName,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/favicon.ico`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${blog.slug}`
    }
  };
  return JSON.stringify(schema);
}

/**
 * Generate QAPage JSON-LD schema for forum question pages
 * @param {Object} question - Forum question data
 * @param {Array} replies - Array of approved replies
 * @param {string} baseUrl - Site base URL
 * @returns {string} JSON-LD schema as string
 */
export function generateQAPageSchema(question, replies, baseUrl) {
  const suggestedAnswers = (replies || []).map(r => ({
    "@type": "Answer",
    "text": r.content || '',
    "dateCreated": r.created_at ? new Date(r.created_at).toISOString() : undefined,
    "author": {
      "@type": "Person",
      "name": r.name || 'Anonymous'
    }
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": question.title || '',
      "text": question.content || '',
      "dateCreated": question.created_at ? new Date(question.created_at).toISOString() : undefined,
      "author": {
        "@type": "Person",
        "name": question.name || 'Anonymous'
      },
      "answerCount": suggestedAnswers.length
    }
  };

  if (suggestedAnswers.length > 0) {
    schema.mainEntity.suggestedAnswer = suggestedAnswers;
    // Mark the first reply as the accepted answer if available
    schema.mainEntity.acceptedAnswer = suggestedAnswers[0];
  }

  return JSON.stringify(schema);
}

/**
 * Generate BreadcrumbList JSON-LD schema
 * @param {Array} items - Array of {name, url} breadcrumb items
 * @returns {string} JSON-LD schema as string
 */
export function generateBreadcrumbSchema(items) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
  return JSON.stringify(schema);
}

/**
 * Generate Organization JSON-LD schema for homepage
 * @param {Object} settings - Site settings (site_url, site_title, etc.)
 * @returns {string} JSON-LD schema as string
 */
export function generateOrganizationSchema(settings) {
  const baseUrl = settings.site_url || '';
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": settings.site_title || resolveSchemaBrandName(baseUrl),
    "url": baseUrl,
    "logo": `${baseUrl}/favicon.ico`
  };
  return JSON.stringify(schema);
}

/**
 * Generate WebSite JSON-LD schema for homepage
 * @param {Object} settings - Site settings
 * @returns {string} JSON-LD schema as string
 */
export function generateWebSiteSchema(settings) {
  const baseUrl = settings.site_url || '';
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": settings.site_title || resolveSchemaBrandName(baseUrl),
    "url": baseUrl
  };
  return JSON.stringify(schema);
}

/**
 * Generate WebPage JSON-LD schema for custom pages
 * @param {Object} page - Page data (title, slug, meta_description, etc.)
 * @param {string} baseUrl - Site base URL
 * @param {Object} settings - Site settings (site_title, etc.)
 * @returns {string} JSON-LD schema as string
 */
export function generateWebPageSchema(page, baseUrl, settings = {}) {
  const brandName = settings.site_title || resolveSchemaBrandName(baseUrl);
  const pageUrl = page.slug === 'home'
    ? `${baseUrl}/`
    : `${baseUrl}/${page.slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": page.title || page.slug || 'Page',
    "description": (page.meta_description || '').substring(0, 160),
    "url": pageUrl,
    "isPartOf": {
      "@type": "WebSite",
      "name": brandName,
      "url": baseUrl
    }
  };

  if (page.feature_image_url) {
    schema.primaryImageOfPage = {
      "@type": "ImageObject",
      "url": page.feature_image_url
    };
  }

  if (page.created_at) {
    schema.datePublished = new Date(page.created_at).toISOString();
  }
  if (page.updated_at) {
    schema.dateModified = new Date(page.updated_at).toISOString();
  }

  // Add breadcrumb
  schema.breadcrumb = {
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": `${baseUrl}/`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": page.title || page.slug || 'Page',
        "item": pageUrl
      }
    ]
  };

  return JSON.stringify(schema);
}

/**
 * Generate FAQPage JSON-LD schema from FAQ content
 * @param {Array} faqItems - Array of {question, answer} objects
 * @param {string} baseUrl - Site base URL
 * @returns {string} JSON-LD schema as string
 */
export function generateFAQPageSchema(faqItems, baseUrl) {
  if (!Array.isArray(faqItems) || faqItems.length === 0) return '{}';

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqItems.map(item => ({
      "@type": "Question",
      "name": item.question || '',
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer || ''
      }
    }))
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
  if (String(html || '').includes(placeholder)) {
    return html.replace(placeholder, replacement);
  }

  const existingSchemaRegex = new RegExp(`<script\\s+type=["']application/ld\\+json["']\\s+id=["']${schemaId}["'][^>]*>[\\s\\S]*?<\\/script>`, 'i');
  if (existingSchemaRegex.test(String(html || ''))) {
    return html.replace(existingSchemaRegex, replacement);
  }

  if (/<\/head>/i.test(String(html || ''))) {
    return html.replace(/<\/head>/i, `${replacement}\n</head>`);
  }

  return `${html}\n${replacement}`;
}
