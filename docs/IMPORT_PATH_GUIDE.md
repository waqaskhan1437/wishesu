# Import Path Update Guide

## Overview
This guide explains how to update old import paths to use the new modular structure with path aliases.

## Path Alias Configuration

The project now uses path aliases defined in `jsconfig.json`:

```javascript
{
  "@/*": "src/*",
  "@modules/*": "src/modules/*",
  "@shared/*": "src/shared/*",
  "@components/*": "src/shared/components/*",
  "@utils/*": "src/shared/utils/*",
  "@core/*": "src/shared/core/*",
  "@config/*": "src/config/*"
}
```

## Old vs New Import Patterns

### Module Imports

#### Products Module
```javascript
// ❌ OLD - Relative paths
import { ProductCard } from '../../../public/js/components/product-card.js';
import { getProducts } from '../../../src/api/products.api.js';

// ✅ NEW - Module paths
import { ProductCard } from '@modules/products/frontend/scripts/product-card.js';
import { getProducts } from '@modules/products/backend/api/products.api.js';
```

#### Orders Module
```javascript
// ❌ OLD
import { OrderDetail } from '../../../public/js/order-detail.js';
import { getOrders } from '../../../src/api/orders.api.js';

// ✅ NEW
import { OrderDetail } from '@modules/orders/frontend/scripts/order-detail.js';
import { getOrders } from '@modules/orders/backend/api/orders.api.js';
```

#### Admin Module
```javascript
// ❌ OLD
import { Dashboard } from '../../../public/js/admin/dashboard-view.js';
import { adminAPI } from '../../../src/api/admin.api.js';

// ✅ NEW
import { Dashboard } from '@modules/admin/frontend/scripts/dashboard-view.js';
import { adminAPI } from '@modules/admin/backend/api/admin.api.js';
```

### Shared Resources

#### Components
```javascript
// ❌ OLD
import { Modal } from '../../../public/js/components/modal.js';
import { Toast } from '../../../public/js/components/toast-notification.js';

// ✅ NEW
import { Modal } from '@components/frontend/scripts/modal.js';
import { Toast } from '@components/frontend/scripts/toast-notification.js';
```

#### Utilities
```javascript
// ❌ OLD
import { formatDate } from '../../../public/js/utils/date-utils.js';
import { validate } from '../../../public/js/utils/validation-utils.js';

// ✅ NEW
import { formatDate } from '@utils/frontend/date-utils.js';
import { validate } from '@utils/frontend/validation-utils.js';
```

#### Core
```javascript
// ❌ OLD
import { apiClient } from '../../../public/js/core/api-client.js';
import { eventBus } from '../../../public/js/core/event-bus.js';

// ✅ NEW
import { apiClient } from '@core/frontend/api-client.js';
import { eventBus } from '@core/frontend/event-bus.js';
```

### Configuration
```javascript
// ❌ OLD
import { DB_CONFIG } from '../../../src/config/db.js';
import { CONSTANTS } from '../../../src/config/constants.js';

// ✅ NEW
import { DB_CONFIG } from '@config/db.js';
import { CONSTANTS } from '@config/constants.js';
```

## Common Import Patterns by Location

### From Module Frontend Scripts
```javascript
// Importing from same module
import { helper } from './helper.js';

// Importing from other modules
import { ProductCard } from '@modules/products/frontend/scripts/product-card.js';

// Importing shared resources
import { Modal } from '@components/frontend/scripts/modal.js';
import { formatDate } from '@utils/frontend/date-utils.js';
import { apiClient } from '@core/frontend/api-client.js';

// Importing backend API (for module's own backend)
import { getProducts } from '@modules/products/backend/api/products.api.js';
```

### From Module Backend
```javascript
// Importing from same module backend
import { helper } from './helper.js';

// Importing from other module backends
import { orderHelpers } from '@modules/orders/backend/controllers/order-helpers.js';

// Importing shared utilities
import { dateUtils } from '@utils/backend/date-utils.js';

// Importing config
import { DB_CONFIG } from '@config/db.js';
```

### From Shared Components
```javascript
// Importing other shared components
import { Toast } from '@components/frontend/scripts/toast-notification.js';

// Importing utils
import { formatDate } from '@utils/frontend/date-utils.js';

// Importing core
import { eventBus } from '@core/frontend/event-bus.js';
```

## Module-Specific Import Examples

### Products Module Files

**product-detail.js**:
```javascript
import { ProductCard } from '@modules/products/frontend/scripts/product-card.js';
import { getProducts } from '@modules/products/backend/api/products.api.js';
import { Modal } from '@components/frontend/scripts/modal.js';
import { formatDate } from '@utils/frontend/date-utils.js';
```

**products.api.js (backend)**:
```javascript
import { DB_CONFIG } from '@config/db.js';
import { validateProduct } from '@utils/backend/validation.js';
```

### Orders Module Files

**order-detail.js**:
```javascript
import { OrderDisplay } from '@modules/orders/frontend/scripts/order-display.js';
import { getOrders } from '@modules/orders/backend/api/orders.api.js';
import { Toast } from '@components/frontend/scripts/toast-notification.js';
```

### Admin Module Files

**dashboard-view.js**:
```javascript
import { DashboardStats } from '@modules/admin/frontend/scripts/dashboard-stats.js';
import { getAdminData } from '@modules/admin/backend/api/admin.api.js';
import { DataTable } from '@components/frontend/scripts/data-table.js';
```

## Search & Replace Patterns

Use these patterns to update imports systematically:

### Find & Replace for Modules

1. **Product imports**:
   ```
   Find: from '../../../public/js/product
   Replace: from '@modules/products/frontend/scripts/product
   ```

2. **Order imports**:
   ```
   Find: from '../../../public/js/order
   Replace: from '@modules/orders/frontend/scripts/order
   ```

3. **Admin imports**:
   ```
   Find: from '../../../public/js/admin/
   Replace: from '@modules/admin/frontend/scripts/
   ```

### Find & Replace for Shared Resources

1. **Components**:
   ```
   Find: from '../../../public/js/components/
   Replace: from '@components/frontend/scripts/
   ```

2. **Utils**:
   ```
   Find: from '../../../public/js/utils/
   Replace: from '@utils/frontend/
   ```

3. **Core**:
   ```
   Find: from '../../../public/js/core/
   Replace: from '@core/frontend/
   ```

### Find & Replace for Backend

1. **API imports**:
   ```
   Find: from '../../../src/api/
   Replace: from '@modules/[module-name]/backend/api/
   ```

2. **Controllers**:
   ```
   Find: from '../../../src/controllers/
   Replace: from '@modules/[module-name]/backend/controllers/
   ```

## Step-by-Step Update Process

1. **Identify the file's location** in the new structure
2. **Determine what it imports**:
   - Same module? Use relative paths
   - Other modules? Use `@modules/`
   - Shared resources? Use `@components/`, `@utils/`, `@core/`
   - Config? Use `@config/`
3. **Update import statements** following the patterns above
4. **Test the imports** work correctly

## Validation Checklist

After updating imports, verify:

- [ ] All import paths start with `@` (for cross-module) or `./` (for same directory)
- [ ] No more `../../../` patterns
- [ ] Imports resolve correctly in your IDE
- [ ] No circular dependencies
- [ ] Backend files only import from backend or config
- [ ] Frontend files can import from frontend or shared

## Common Issues & Solutions

### Issue: Import not resolving
**Solution**: Check that the path alias is correct and the file exists at that location

### Issue: Circular dependency
**Solution**: Extract shared code to a separate utility file

### Issue: Backend importing frontend code
**Solution**: Move shared logic to `@shared/utils/backend/` or `@config/`

## Quick Reference Table

| Old Pattern | New Pattern | Use Case |
|------------|-------------|----------|
| `../../../public/js/product/*.js` | `@modules/products/frontend/scripts/*.js` | Product module |
| `../../../public/js/order*.js` | `@modules/orders/frontend/scripts/order*.js` | Orders module |
| `../../../public/js/admin/*.js` | `@modules/admin/frontend/scripts/*.js` | Admin module |
| `../../../public/js/components/*.js` | `@components/frontend/scripts/*.js` | Shared components |
| `../../../public/js/utils/*.js` | `@utils/frontend/*.js` | Frontend utilities |
| `../../../public/js/core/*.js` | `@core/frontend/*.js` | Core functionality |
| `../../../src/api/*.js` | `@modules/[module]/backend/api/*.js` | Backend API |
| `../../../src/controllers/*.js` | `@modules/[module]/backend/controllers/*.js` | Backend controllers |
| `../../../src/config/*.js` | `@config/*.js` | Configuration |

## Next Steps

1. Update imports in migrated files
2. Test each module after updates
3. Fix any broken imports
4. Update HTML script tags if necessary
5. Run tests to verify everything works

---

**Note**: This is a living document. Update as new patterns emerge during the import path updates.
