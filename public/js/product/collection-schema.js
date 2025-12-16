/*
 * Collection Schema Injection for Product Listings
 * Generates JSON-LD schema markup for Google Rich Results on product collection pages
 */

;(function(){
  function injectCollectionSchema(products) {
    if (!products || products.length === 0) {
      return;
    }

    // Remove existing schema to prevent duplicates
    const existing = document.getElementById('collection-schema');
    if (existing) existing.remove();

    // Build itemListElement array
    const itemListElement = products.map((product, index) => {
      const price = parseFloat(product.sale_price || product.normal_price || 0);
      
      return {
        "@type": "ListItem",
        "position": index + 1,
        "url": window.location.origin + "/product?id=" + product.id,
        "item": {
          "@type": "Product",
          "@id": window.location.origin + "/product?id=" + product.id,
          "name": product.title,
          "description": product.description || product.title,
          "image": product.thumbnail_url || (window.location.origin + "/placeholder.jpg"),
          "brand": {
            "@type": "Brand",
            "name": "WishVideo"
          },
          "offers": {
            "@type": "Offer",
            "url": window.location.origin + "/product?id=" + product.id,
            "priceCurrency": "USD",
            "price": price.toString(),
            "availability": "https://schema.org/InStock"
          }
        }
      };
    });

    // Only add aggregate rating if product has reviews
    products.forEach((product, index) => {
      if (product.review_count && product.review_count > 0) {
        itemListElement[index].item.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": parseFloat(product.rating_average) || 5.0,
          "reviewCount": parseInt(product.review_count) || 0,
          "bestRating": 5,
          "worstRating": 1
        };
      }
    });

    // Create ItemList schema
    const schema = {
      "@context": "https://schema.org/",
      "@type": "ItemList",
      "itemListElement": itemListElement
    };

    // Inject schema into page
    const script = document.createElement('script');
    script.id = 'collection-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  window.injectCollectionSchema = injectCollectionSchema;
})();
