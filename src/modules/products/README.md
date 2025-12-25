# Products Module

Complete product management system with frontend UI and backend API.

## 📁 Structure

```
products/
├── frontend/
│   ├── views/
│   │   └── product-form.html           # Product creation/edit form
│   ├── styles/
│   │   ├── product-form.base.css       # Base form styles
│   │   └── product-form.addons.css     # Addon styles
│   └── scripts/
│       ├── product-detail.js           # Single product page
│       ├── product-list.js             # Product listing page
│       ├── product-cards.js            # Product card components
│       ├── product-form.js             # Form handling
│       ├── product-addons.js           # Addon functionality
│       ├── product-seo.js              # SEO management
│       ├── product-card.js             # Individual card component
│       ├── product-grid.js             # Grid layout component
│       ├── product-info-panel.js       # Info panel component
│       ├── product-form-page.js        # Admin form page
│       ├── products-api.js             # Frontend API client
│       ├── products-header.js          # Product header component
│       ├── products-table.js           # Admin table view
│       └── products-view.js            # Admin view component
├── backend/
│   ├── api/
│   │   └── products.api.js             # API routes
│   └── controllers/
│       └── products.controller.js      # Business logic
└── index.js                            # Module entry point
```

## 🎯 Features

### Frontend Features
- **Product Display**: Card and grid layouts
- **Product Forms**: Create and edit products
- **Product Details**: Full product information panel
- **SEO Management**: Product SEO optimization
- **Addons Support**: Product addon functionality
- **Admin Interface**: Product table and management views

### Backend Features
- **CRUD Operations**: Create, Read, Update, Delete products
- **API Endpoints**: RESTful API for product management
- **Product Controllers**: Business logic handling

## 🚀 Usage

### Import the Module

```javascript
// Import entire module
import * as Products from '@/modules/products';

// Import specific components
import { ProductCard } from '@/modules/products/frontend/scripts/product-card.js';
import { ProductGrid } from '@/modules/products/frontend/scripts/product-grid.js';

// Import backend
import { getProducts } from '@/modules/products/backend/api/products.api.js';
```

### Frontend Usage

```javascript
// Initialize product card
const productCard = new ProductCard({
  productId: '123',
  container: document.getElementById('product-container')
});

// Load products grid
const productGrid = new ProductGrid({
  products: productsData,
  columns: 3
});
```

### Backend Usage

```javascript
// In your API routes
import { getProducts, createProduct } from '@/modules/products/backend/api/products.api.js';

// Fetch products
const products = await getProducts();

// Create new product
const newProduct = await createProduct(productData);
```

## 📄 Files Description

### Views
- **product-form.html**: Main product form for creating/editing products

### Styles
- **product-form.base.css**: Core form styling
- **product-form.addons.css**: Styling for product addons

### Scripts

#### Core Scripts
- **product-detail.js**: Handles single product page display
- **product-list.js**: Manages product listing pages
- **product-cards.js**: Product card components logic
- **product-form.js**: Form validation and submission
- **product-addons.js**: Addon management functionality
- **product-seo.js**: SEO meta management

#### Components
- **product-card.js**: Individual product card component
- **product-grid.js**: Grid layout for products
- **product-info-panel.js**: Product information panel

#### Admin Scripts
- **product-form-page.js**: Admin product form page logic
- **products-api.js**: Frontend API client for products
- **products-header.js**: Product list header component
- **products-table.js**: Admin table view for products
- **products-view.js**: Admin product view component

#### Backend Scripts
- **products.api.js**: API route definitions
- **products.controller.js**: Business logic and data handling

## 🔗 Dependencies

This module may depend on:
- Shared components (`@/shared/components`)
- Shared utilities (`@/shared/utils`)
- Core functionality (`@/shared/core`)

## 📝 Notes

- All frontend scripts are in `frontend/scripts/`
- All backend logic is in `backend/api/` and `backend/controllers/`
- HTML templates are in `frontend/views/`
- CSS files are in `frontend/styles/`

## 🎨 Styling

Product styles are split into:
1. **Base styles** (`product-form.base.css`): Core form styling
2. **Addon styles** (`product-form.addons.css`): Additional addon styling

## 🧪 Testing

(Testing documentation to be added)

## 📊 Migration Status

✅ **Status**: MIGRATED
- Frontend files: ✅ Moved
- Backend files: ✅ Moved
- Styles: ✅ Moved
- Views: ✅ Moved

---

**Module Version**: 1.0.0
**Last Updated**: Phase 2 Migration
**Maintainer**: WishesU Team
