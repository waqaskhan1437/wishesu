// Shared Components - Templates Module
// Contains header/footer templates and page exclusion paths
// Used by both dashboard-components.js and page-builder.js

(function(global) {
  'use strict';

  const SiteComponentsTemplates = {
    // Header Templates
    headers: [
      {
        name: 'Simple Centered',
        code: `<header class="site-header" style="background:#fff;padding:20px 0;border-bottom:1px solid #e5e7eb;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;text-align:center;">
    <a href="/" style="font-size:1.8rem;font-weight:800;color:#1f2937;text-decoration:none;">PRANKWISH</a>
  </div>
</header>`
      },
      {
        name: 'With Navigation',
        code: `<header class="site-header" style="background:#fff;padding:15px 0;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;">
    <a href="/" style="font-size:1.5rem;font-weight:800;color:#4f46e5;text-decoration:none;">PRANKWISH</a>
    <nav style="display:flex;gap:25px;flex-wrap:wrap;">
      <a href="/" style="color:#374151;text-decoration:none;font-weight:500;">Home</a>
      <a href="/products" style="color:#374151;text-decoration:none;font-weight:500;">Products</a>
      <a href="/blog" style="color:#374151;text-decoration:none;font-weight:500;">Blog</a>
      <a href="/forum" style="color:#374151;text-decoration:none;font-weight:500;">Forum</a>
    </nav>
  </div>
</header>`
      },
      {
        name: 'Gradient Hero',
        code: `<header class="site-header" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:60px 20px;text-align:center;color:white;">
  <div style="max-width:800px;margin:0 auto;">
    <h1 style="font-size:2.5rem;margin:0 0 10px;font-weight:800;">Personalized Video Greetings</h1>
    <p style="font-size:1.2rem;opacity:0.9;margin:0;">Make every occasion special with custom video messages</p>
  </div>
</header>`
      },
      {
        name: 'Dark Professional',
        code: `<header class="site-header" style="background:#1f2937;padding:20px 0;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;">
    <a href="/" style="font-size:1.5rem;font-weight:800;color:#fff;text-decoration:none;">PRANKWISH</a>
    <nav style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
      <a href="/" style="color:#d1d5db;text-decoration:none;">Home</a>
      <a href="/products" style="color:#d1d5db;text-decoration:none;">Products</a>
      <a href="/products" style="background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Book Now</a>
    </nav>
  </div>
</header>`
      },
      {
        name: 'Sticky Transparent',
        code: `<header class="site-header" style="position:sticky;top:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);padding:15px 0;border-bottom:1px solid rgba(0,0,0,0.1);z-index:1000;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;">
    <a href="/" style="font-size:1.5rem;font-weight:800;color:#1f2937;text-decoration:none;">PRANKWISH</a>
    <nav style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;">
      <a href="/" style="color:#374151;text-decoration:none;font-weight:500;">Home</a>
      <a href="/products" style="color:#374151;text-decoration:none;font-weight:500;">Products</a>
      <a href="/blog" style="color:#374151;text-decoration:none;font-weight:500;">Blog</a>
    </nav>
  </div>
</header>`
      }
    ],

    // Footer Templates
    footers: [
      {
        name: 'Simple Copyright',
        code: `<footer class="site-footer" style="background:#f9fafb;padding:30px 20px;text-align:center;border-top:1px solid #e5e7eb;">
  <p style="color:#6b7280;margin:0;">&copy; 2025 Prankwish. All rights reserved.</p>
</footer>`
      },
      {
        name: 'With Links',
        code: `<footer class="site-footer" style="background:#1f2937;color:#d1d5db;padding:50px 20px;">
  <div style="max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:40px;">
    <div>
      <h4 style="color:#fff;margin:0 0 15px;font-size:1.1rem;">Prankwish</h4>
      <p style="margin:0;font-size:0.9rem;line-height:1.6;">Creating memorable video greetings for your special moments.</p>
    </div>
    <div>
      <h4 style="color:#fff;margin:0 0 15px;font-size:1.1rem;">Quick Links</h4>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <a href="/" style="color:#d1d5db;text-decoration:none;font-size:0.9rem;">Home</a>
        <a href="/products" style="color:#d1d5db;text-decoration:none;font-size:0.9rem;">Products</a>
        <a href="/blog" style="color:#d1d5db;text-decoration:none;font-size:0.9rem;">Blog</a>
      </div>
    </div>
    <div>
      <h4 style="color:#fff;margin:0 0 15px;font-size:1.1rem;">Contact</h4>
      <p style="margin:0;font-size:0.9rem;">support@prankwish.com</p>
    </div>
  </div>
  <div style="max-width:1200px;margin:40px auto 0;padding-top:20px;border-top:1px solid #374151;text-align:center;">
    <p style="margin:0;font-size:0.85rem;">&copy; 2025 Prankwish. All rights reserved.</p>
  </div>
</footer>`
      },
      {
        name: 'Gradient CTA',
        code: `<footer class="site-footer" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:40px 20px;text-align:center;">
  <div style="max-width:800px;margin:0 auto;">
    <h3 style="margin:0 0 10px;font-size:1.5rem;">Ready to create something special?</h3>
    <p style="margin:0 0 20px;opacity:0.9;">Order your personalized video greeting today!</p>
    <a href="/products" style="display:inline-block;background:white;color:#667eea;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:700;">Browse Products</a>
  </div>
  <p style="margin:30px 0 0;font-size:0.85rem;opacity:0.8;">&copy; 2025 Prankwish</p>
</footer>`
      },
      {
        name: 'Modern Minimal',
        code: `<footer class="site-footer" style="background:#fff;padding:40px 20px;border-top:1px solid #e5e7eb;">
  <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px;">
    <div>
      <a href="/" style="font-size:1.3rem;font-weight:800;color:#1f2937;text-decoration:none;">PRANKWISH</a>
    </div>
    <nav style="display:flex;gap:25px;flex-wrap:wrap;">
      <a href="/" style="color:#6b7280;text-decoration:none;font-size:0.9rem;">Home</a>
      <a href="/products" style="color:#6b7280;text-decoration:none;font-size:0.9rem;">Products</a>
      <a href="/blog" style="color:#6b7280;text-decoration:none;font-size:0.9rem;">Blog</a>
      <a href="/forum" style="color:#6b7280;text-decoration:none;font-size:0.9rem;">Forum</a>
    </nav>
    <p style="margin:0;color:#9ca3af;font-size:0.85rem;">&copy; 2025 Prankwish</p>
  </div>
</footer>`
      }
    ],

    // Common page paths for exclusion
    commonPages: [
      { path: '/', label: 'Home Page' },
      { path: '/products', label: 'Products' },
      { path: '/product/', label: 'Product Pages (all)' },
      { path: '/blog', label: 'Blog' },
      { path: '/blog/', label: 'Blog Posts (all)' },
      { path: '/forum', label: 'Forum' },
      { path: '/forum/', label: 'Forum Posts (all)' },
      { path: '/admin', label: 'Admin Pages (all)' },
      { path: '/success', label: 'Success Page' },
      { path: '/order', label: 'Order Pages' }
    ]
  };

  // Export
  global.SiteComponentsTemplates = SiteComponentsTemplates;

})(typeof window !== 'undefined' ? window : this);