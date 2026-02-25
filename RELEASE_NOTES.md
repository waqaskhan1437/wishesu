Release: Product Page Stability + Description Render Fix
Date: 2026-02-25

Included critical fixes:
- src/index.js: product description rich-html sanitize (SSR)
- public/js/product/layout-extra.js: client fallback sanitize
- public/_product_template.tpl: added critical layout CSS to stop initial thumbnail jump
- public/_product_template.tpl: layout-extra.js cache bump v=30
- src/controllers/whop.js: metadata cap/retry + timeout 20s (from previous hotfix)
