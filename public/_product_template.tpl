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

  <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />

  <link rel="stylesheet" href="/css/style.css">

  <!-- Additional styles for the Whop checkout modal -->
  <link rel="stylesheet" href="/css/whop.css">
  
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>

  <header class="site-header">
    <div class="header-inner">
      <div class="logo">WISHVIDEO</div>
      <nav class="site-nav">
        <a href="/">Home</a>
        <a href="/all-products">All Products</a>
        <a href="/about">About Us</a>
        <a href="/contact">Contact</a>
      </nav>
    </div>
  </header>

  <main>
    <div class="breadcrumb">
      <a href="/">&larr; Back to Home</a>
    </div>

    <div id="product-container" class="loading-state">
      <div class="skeleton">
        <div>
          <div class="skeleton-media"></div>
          <div class="skeleton-thumbs">
            <div class="skeleton-thumb"></div>
            <div class="skeleton-thumb"></div>
            <div class="skeleton-thumb"></div>
          </div>
        </div>
        <div class="skeleton-info">
          <div class="skeleton-line lg"></div>
          <div class="skeleton-line md"></div>
          <div class="skeleton-line sm"></div>
          <div class="skeleton-line md"></div>
          <div class="skeleton-line sm"></div>
          <div class="skeleton-line md"></div>
        </div>
      </div>
      <div class="spinner" style="margin-top:24px;"></div>
      <p>Loading amazing product...</p>
    </div>
  </main>

  <footer class="site-footer">
    <p>&copy; 2025 WishVideo. All rights reserved.</p>
  </footer>

  <script src="https://cdn.plyr.io/3.7.8/plyr.js"></script>

  <script src="/js/api.js"></script>
  <script src="/js/universal-player.js"></script>
  <script src="/js/instant-upload.js"></script>
  <!-- Whop checkout integration -->
  <script src="/js/whop/checkout.js"></script>
  <!-- Reviews widget -->
  <script src="/js/reviews-widget.js"></script>
  <!-- load product modules in dependency order -->
  <script src="/js/product/addon-ui.js"></script>
  <script src="/js/product/seo-utils.js"></script>
  <script src="/js/product/layout-main.js"></script>
  <script src="/js/product/layout-extra.js"></script>
  <script src="/js/product/checkout.js"></script>
  <script src="/js/product/main.js"></script>
  <script src="/js/chat-widget.js"></script>
</body>
</html>
