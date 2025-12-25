# Quick Reference Guide - Modular Structure

## 🚀 Quick Module Lookup

### Where to Find Files

| Feature | HTML Views | CSS Styles | Frontend JS | Backend API | Backend Controllers |
|---------|-----------|------------|-------------|-------------|-------------------|
| **Products** | `modules/products/frontend/views/` | `modules/products/frontend/styles/` | `modules/products/frontend/scripts/` | `modules/products/backend/api/` | `modules/products/backend/controllers/` |
| **Orders** | `modules/orders/frontend/views/` | `modules/orders/frontend/styles/` | `modules/orders/frontend/scripts/` | `modules/orders/backend/api/` | `modules/orders/backend/controllers/` |
| **Admin** | `modules/admin/frontend/views/` | `modules/admin/frontend/styles/` | `modules/admin/frontend/scripts/` | `modules/admin/backend/api/` | `modules/admin/backend/controllers/` |
| **Blog** | `modules/blog/frontend/views/` | `modules/blog/frontend/styles/` | `modules/blog/frontend/scripts/` | `modules/blog/backend/api/` | `modules/blog/backend/controllers/` |
| **Chat** | `modules/chat/frontend/views/` | `modules/chat/frontend/styles/` | `modules/chat/frontend/scripts/` | `modules/chat/backend/api/` | `modules/chat/backend/controllers/` |
| **Forum** | `modules/forum/frontend/views/` | `modules/forum/frontend/styles/` | `modules/forum/frontend/scripts/` | `modules/forum/backend/api/` | `modules/forum/backend/controllers/` |
| **Reviews** | - | `modules/reviews/frontend/styles/` | `modules/reviews/frontend/scripts/` | `modules/reviews/backend/api/` | `modules/reviews/backend/controllers/` |
| **Players** | - | `modules/players/frontend/styles/` | `modules/players/frontend/scripts/` | - | - |
| **Page Builder** | `modules/page-builder/frontend/views/` | `modules/page-builder/frontend/styles/` | `modules/page-builder/frontend/scripts/` | - | `modules/page-builder/backend/controllers/` |
| **Whop** | - | `modules/whop/frontend/styles/` | `modules/whop/frontend/scripts/` | `modules/whop/backend/api/` | `modules/whop/backend/controllers/` |

---

## 📂 Common File Patterns

### Module Entry Point
```javascript
// src/modules/[module-name]/index.js
export * from './frontend/scripts/main.js';
export * from './backend/api/api.js';
```

### Frontend Import
```javascript
// In any frontend file
import { ProductCard } from '@/modules/products/frontend/scripts/product-cards.js';
```

### Backend Import
```javascript
// In any backend file
import { getProducts } from '@/modules/products/backend/api/products.api.js';
```

### Shared Component Import
```javascript
// Use shared components
import { Modal } from '@/shared/components/frontend/scripts/modal.js';
import { formatDate } from '@/shared/utils/backend/date-utils.js';
```

---

## 🗺️ Module Categories

### Business Logic
- `products/` - Product catalog
- `orders/` - Order management
- `payment/` - Payment processing
- `users/` - User accounts

### Content Management
- `blog/` - Blog posts
- `forum/` - Discussion boards
- `reviews/` - Product reviews

### Communication
- `chat/` - Real-time messaging
- `notifications/` - Alerts & notifications

### Media
- `players/` - Audio/Video/Image players
- `media/` - Media file management

### Admin & Tools
- `admin/` - Admin dashboard
- `page-builder/` - Page creation tool
- `analytics/` - Data analytics
- `settings/` - App configuration

### Integration
- `whop/` - Whop platform
- `addons/` - Extensions

---

## 🔍 Finding Files by Type

### HTML Files
```bash
find src/modules -path "*/frontend/views/*.html"
```

### CSS Files
```bash
find src/modules -path "*/frontend/styles/*.css"
```

### Frontend JavaScript
```bash
find src/modules -path "*/frontend/scripts/*.js"
```

### Backend API
```bash
find src/modules -path "*/backend/api/*.js"
```

### Backend Controllers
```bash
find src/modules -path "*/backend/controllers/*.js"
```

---

## 🛠️ Common Tasks

### Adding a New Feature File

**HTML View:**
```bash
# Place in: src/modules/[module]/frontend/views/[file].html
```

**CSS Style:**
```bash
# Place in: src/modules/[module]/frontend/styles/[file].css
```

**Frontend Script:**
```bash
# Place in: src/modules/[module]/frontend/scripts/[file].js
```

**Backend API:**
```bash
# Place in: src/modules/[module]/backend/api/[file].api.js
```

**Backend Controller:**
```bash
# Place in: src/modules/[module]/backend/controllers/[file].js
```

### Module Import Pattern

```javascript
// In index.js of module
export * from './frontend/scripts/feature.js';
export * from './backend/api/feature.api.js';

// In other files
import { FeatureName } from '@/modules/[module-name]';
```

---

## 📋 Migration Checklist

When moving files to new structure:

- [ ] Identify the module the file belongs to
- [ ] Determine if it's frontend or backend
- [ ] Place HTML in `frontend/views/`
- [ ] Place CSS in `frontend/styles/`
- [ ] Place client JS in `frontend/scripts/`
- [ ] Place API in `backend/api/`
- [ ] Place controllers in `backend/controllers/`
- [ ] Update import statements
- [ ] Update module index.js
- [ ] Test the functionality

---

## 🎯 Key Benefits

1. **Easy Navigation** - All related files in one place
2. **Clear Boundaries** - Frontend and backend separated
3. **Scalable** - Add new modules without affecting others
4. **Maintainable** - Changes localized to specific modules
5. **Team-Friendly** - Multiple devs can work independently

---

## 📞 Need Help?

- Full structure: See `docs/FOLDER_STRUCTURE_COMPLETE.md`
- Architecture guide: See `docs/MODULAR_STRUCTURE.md`
- Best practices: See `docs/MODULAR_STRUCTURE.md#best-practices`

**Created**: Phase 1 Complete
**Status**: Ready for Phase 2 (File Migration)
