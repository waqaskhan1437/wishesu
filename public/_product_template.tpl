<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>Loading Product... | WishVideo</title>
  <meta name="description" content="Custom personalized video greetings from Africa.">
  <meta name="keywords" content="video, greeting, birthday, wish, africa">
  <meta name="robots" content="index, follow">
  
  <meta property="og:type" content="product">
  <meta property="og:title" content="Loading...">
  <meta property="og:description" content="">
  <meta property="og:image" content="">
  
  <!-- Structured Data for SEO -->
  <script type="application/ld+json" id="product-schema">{}</script>

  <!-- Preconnect to critical origins for faster resource loading -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.plyr.io" crossorigin>
  <link rel="preconnect" href="https://res.cloudinary.com" crossorigin>
  <link rel="preconnect" href="https://archive.org" crossorigin>
  
  <!-- DNS prefetch for additional resources -->
  <link rel="dns-prefetch" href="https://ia800906.us.archive.org">

  <!-- Critical CSS inlined for FCP/LCP optimization -->
  <style>
    :root{--primary:#4f46e5;--primary-hover:#4338ca;--success:#047857;--text-main:#1f2937;--text-muted:#4b5563;--bg-page:#f9fafb;--bg-card:#fff;--border:#e5e7eb;--radius:12px;--radius-sm:8px}
    body{margin:0;font-family:'Inter',system-ui,-apple-system,sans-serif;background-color:var(--bg-page);color:var(--text-main);line-height:1.5;-webkit-font-smoothing:antialiased}
    .site-header{background:#fff;border-bottom:1px solid var(--border);padding:1rem 0;margin-bottom:2rem}
    .header-inner{max-width:1200px;margin:0 auto;padding:0 1.5rem;display:flex;justify-content:space-between;align-items:center}
    .logo{font-weight:800;font-size:1.5rem;letter-spacing:-.5px}
    .site-nav a{margin-left:1.5rem;text-decoration:none;color:var(--text-main);font-weight:500;font-size:.95rem}
    main{max-width:1200px;margin:0 auto;padding:0 5% 4rem}
    .breadcrumb{margin-bottom:1.5rem}
    .breadcrumb a{text-decoration:none;color:var(--text-muted);font-size:.9rem;font-weight:500}
    .loading-state{text-align:center;padding:4rem 0}
    .spinner{border:4px solid #f3f3f3;border-top:4px solid var(--primary);border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;margin:0 auto 1rem}
    @keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
    .video-wrapper{position:relative;width:100%;aspect-ratio:16/9;min-height:200px;background:#000;border-radius:var(--radius);overflow:visible}
    .video-wrapper video{border-radius:var(--radius)}
    .video-wrapper img.main-img{width:100%;height:100%;object-fit:cover;display:block;border-radius:var(--radius)}
    .video-facade{position:relative;width:100%;height:100%;aspect-ratio:16/9}
    .play-btn-overlay{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:80px;height:80px;background:rgba(0,0,0,0.7);border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:100}
    #thumbnails-slider video{pointer-events:none}
    #thumbnails-slider video::-webkit-media-controls,#thumbnails-slider video::-webkit-media-controls-panel,#thumbnails-slider video::-webkit-media-controls-enclosure{display:none !important;opacity:0 !important;visibility:hidden !important}
    .site-footer{text-align:center;padding:2rem 0;color:var(--text-muted);border-top:1px solid var(--border);margin-top:3rem}
    /* Product Navigation */
    .product-navigation-section{margin-top:2rem;padding-top:2rem;border-top:1px solid #e5e7eb}
    @media(max-width:600px){.product-navigation-section > div{flex-direction:column !important}.product-navigation-section > div > div{max-width:100% !important;width:100%}}
    /* Skeleton loading to prevent CLS */
    .skeleton-container{display:grid;grid-template-columns:55% 45%;gap:2.5rem;align-items:start}
    .skeleton-media{aspect-ratio:16/9;min-height:350px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:var(--radius)}
    .skeleton-thumbs{display:flex;gap:12px;margin-top:15px;min-height:116px}
    .skeleton-thumb{width:140px;height:100px;background:#f0f0f0;border-radius:10px;flex-shrink:0}
    .skeleton-info{background:#fff;border-radius:var(--radius);padding:2rem;min-height:400px}
    .skeleton-title{height:32px;background:#f0f0f0;border-radius:4px;margin-bottom:1rem;width:80%}
    .skeleton-rating{height:20px;background:#f0f0f0;border-radius:4px;margin-bottom:1.5rem;width:40%}
    .skeleton-badges{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
    .skeleton-badge{height:80px;background:#f0f0f0;border-radius:var(--radius-sm)}
    .skeleton-btn{height:50px;background:#f0f0f0;border-radius:var(--radius-sm);margin-top:1.5rem}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @media(max-width:900px){.skeleton-container{display:flex;flex-direction:column}.skeleton-media{min-height:auto}.video-wrapper{overflow:visible !important}.video-wrapper video{min-height:200px}#thumbnails-slider video::-webkit-media-controls{display:none !important}}
    /* Screen reader only - for accessibility */
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    /* Focus visible for keyboard navigation */
    :focus-visible{outline:3px solid #667eea;outline-offset:2px}
    button:focus-visible,a:focus-visible{outline:3px solid #667eea;outline-offset:2px}
  </style>

  <!-- Non-critical CSS loaded asynchronously -->
  <link rel="preload" href="/css/style.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <link rel="preload" href="/css/whop.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <link rel="preload" href="https://cdn.plyr.io/3.7.8/plyr.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript>
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/whop.css">
    <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css">
  </noscript>

  <!-- Google Fonts loaded async with swap -->
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"></noscript>
</head>
<body>
  <!-- Skip to main content for keyboard users -->
  <a href="#main-content" class="sr-only" style="position:absolute;top:-40px;left:0;background:#4f46e5;color:#fff;padding:8px 16px;z-index:100000;text-decoration:none;font-weight:600;" onfocus="this.style.top='0'" onblur="this.style.top='-40px'">Skip to main content</a>
  
  <script src="/js/global-components.js"></script>

  <main id="main-content">
    <nav class="breadcrumb" aria-label="Breadcrumb navigation">
      <a href="/" aria-label="Go back to home page">&larr; Back to Home</a>
    </nav>

    <div id="product-container" class="loading-state">
      <!-- Skeleton placeholder matching final layout to prevent CLS -->
      <div class="skeleton-container">
        <div>
          <div class="skeleton-media"></div>
          <div class="skeleton-thumbs">
            <div class="skeleton-thumb"></div>
            <div class="skeleton-thumb"></div>
            <div class="skeleton-thumb"></div>
          </div>
        </div>
        <div class="skeleton-info">
          <div class="skeleton-title"></div>
          <div class="skeleton-rating"></div>
          <div class="skeleton-badges">
            <div class="skeleton-badge"></div>
            <div class="skeleton-badge"></div>
          </div>
          <div class="skeleton-btn"></div>
        </div>
      </div>
    </div>
  </main>

  <!-- Load Plyr.js only when needed (lazy-loaded on video click) -->
  <script>
    window.loadPlyr = function(callback) {
      if (window.Plyr) { callback && callback(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdn.plyr.io/3.7.8/plyr.js';
      s.onload = callback;
      document.body.appendChild(s);
    };
  </script>

  <!-- Core scripts with defer for non-blocking load -->
  <script src="/js/api.js" defer></script>
  <script src="/js/universal-player.js" defer></script>
  <script src="/js/instant-upload.js" defer></script>
  <!-- Payment methods -->
  <script src="/js/payment-selector.js" defer></script>
  <!-- Whop checkout integration -->
  <script src="/js/whop/checkout.js" defer></script>
  <!-- Reviews widget -->
  <script src="/js/reviews-widget.js" defer></script>
  <!-- load product modules in dependency order -->
  <script src="/js/product/addon-ui.js" defer></script>
  <script src="/js/product/seo-utils.js" defer></script>
  <script src="/js/product/layout-main.js" defer></script>
  <script src="/js/product/layout-extra.js" defer></script>
  <script src="/js/product/checkout.js" defer></script>
  <script src="/js/product/main.js" defer></script>
  <script src="/js/chat-widget.js" defer></script>
  <script src="/js/custom-css-loader.js" defer></script>
</body>
</html>
