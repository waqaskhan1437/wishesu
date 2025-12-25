# Project Cleanup Plan

## Files/Folders to DELETE (Already Migrated)

### ✅ Old Public JS Structure (Migrated to src/modules/)
```
public/js/admin/          → Migrated to src/modules/admin/frontend/scripts/
public/js/components/     → Migrated to src/shared/components/frontend/scripts/
public/js/utils/          → Migrated to src/shared/utils/frontend/
public/js/core/           → Migrated to src/shared/core/frontend/
public/js/addons/         → Migrated to src/modules/addons/frontend/scripts/
public/js/players/        → Migrated to src/modules/players/frontend/scripts/
public/js/product/        → Migrated to src/modules/products/frontend/scripts/
public/js/buyer-order/    → Migrated to src/modules/orders/frontend/scripts/
public/js/order-detail/   → Migrated to src/modules/orders/frontend/scripts/
public/js/page-builder/   → Migrated to src/modules/page-builder/frontend/scripts/
public/js/chat-widget/    → Migrated to src/modules/chat/frontend/scripts/
public/js/whop/           → Migrated to src/modules/whop/frontend/scripts/
public/js/product-cards/  → Migrated to src/modules/products/frontend/scripts/
```

### ✅ Old Src API Structure (Migrated to modules/backend/api/)
```
src/api/products.api.js   → src/modules/products/backend/api/
src/api/orders.api.js     → src/modules/orders/backend/api/
src/api/admin.api.js      → src/modules/admin/backend/api/
src/api/blog.api.js       → src/modules/blog/backend/api/
src/api/chat.api.js       → src/modules/chat/backend/api/
src/api/forum.api.js      → src/modules/forum/backend/api/
src/api/reviews.api.js    → src/modules/reviews/backend/api/
src/api/whop.api.js       → src/modules/whop/backend/api/
```

### ✅ Old Src Controllers (Migrated to modules/backend/controllers/)
```
src/controllers/products.js    → src/modules/products/backend/controllers/
src/controllers/orders.js      → src/modules/orders/backend/controllers/
src/controllers/reviews.js     → src/modules/reviews/backend/controllers/
src/controllers/chat.js        → src/modules/chat/backend/controllers/
src/controllers/admin/         → src/modules/admin/backend/controllers/
src/controllers/blog/          → src/modules/blog/backend/controllers/
src/controllers/forum/         → src/modules/forum/backend/controllers/
src/controllers/whop/          → src/modules/whop/backend/controllers/
```

### ✅ Old Src Utils (Migrated to shared/)
```
src/utils/order-helpers.js → src/modules/orders/backend/controllers/order-helpers.js
```

### ✅ Duplicate HTML Files in public/
```
public/buyer-order.html        → Already in src/modules/orders/frontend/views/
public/order-detail.html       → Already in src/modules/orders/frontend/views/
public/order-success.html      → Already in src/modules/orders/frontend/views/
public/page-builder.html       → Already in src/modules/page-builder/frontend/views/
```

### ✅ Old CSS Files (Migrated)
```
public/css/admin-nav.css       → src/modules/admin/frontend/styles/
public/css/style.admin.css     → src/modules/admin/frontend/styles/
public/css/product-form.*.css  → src/modules/products/frontend/styles/
public/css/whop.css            → src/modules/whop/frontend/styles/
```

## Files to KEEP

### Keep Root Files
```
✓ package.json
✓ package-lock.json
✓ wrangler.toml
✓ README.md
✓ jsconfig.json (newly created)
```

### Keep Public Files (Not migrated)
```
✓ public/index.html
✓ public/success.html
✓ public/clear-cache.html
✓ public/sw.js
✓ public/favicon.ico
✓ public/css/style.base.css
✓ public/css/style.css
```

### Keep Src Files (System files)
```
✓ src/index.js
✓ src/admin.js
✓ src/router.js
✓ src/config/*
✓ src/routes/*
✓ src/worker/*
✓ src/features/* (if contains non-migrated code)
```

### Keep New Structure
```
✓ src/modules/*
✓ src/shared/*
✓ docs/*
✓ scripts/*
✓ tests/*
```

## Backup Before Deletion
Create backup of old structure before cleanup.
