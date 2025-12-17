/*
 * SEO helper functions extracted from the original product.js.
 * Updates page title, meta tags, and Open Graph metadata.
 * Schema markup is now injected server-side for better performance and to prevent duplicates.
 */

;(function(){
  function updateSEO(product) {
    // 1. Basic SEO
    document.title = (product.seo_title || product.title) + ' | WishVideo';
    let desc = product.seo_description || product.description || '';
    if (desc.length > 160) desc = desc.substring(0, 160);
    
    setMeta('description', desc);
    setMeta('keywords', product.seo_keywords || 'video, greeting, personalized, custom');
    
    // 2. Social Media (Open Graph)
    setMetaProperty('og:title', product.title);
    setMetaProperty('og:description', desc);
    setMetaProperty('og:image', product.thumbnail_url);
    setMetaProperty('og:type', 'product');
    setMetaProperty('og:url', window.location.href);
    setMetaProperty('og:site_name', 'WishVideo');
    setMetaProperty('og:price:amount', product.sale_price || product.normal_price);
    setMetaProperty('og:price:currency', 'USD');
    
    // Twitter Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', product.title);
    setMeta('twitter:description', desc);
    setMeta('twitter:image', product.thumbnail_url);

    // Note: JSON-LD Schema is now injected server-side in worker.js
    // This prevents duplicate schemas and improves initial page load SEO
  }

  function setMeta(name, content) {
    let e = document.querySelector('meta[name="' + name + '"]');
    if (!e) {
      e = document.createElement('meta');
      e.name = name;
      document.head.appendChild(e);
    }
    e.content = content || '';
  }

  function setMetaProperty(prop, content) {
    let e = document.querySelector('meta[property="' + prop + '"]');
    if (!e) {
      e = document.createElement('meta');
      e.setAttribute('property', prop);
      document.head.appendChild(e);
    }
    e.content = content || '';
  }

  window.updateSEO = updateSEO;
})();
