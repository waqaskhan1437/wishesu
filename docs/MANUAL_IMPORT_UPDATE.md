# Manual Import Path Update Guide

## Quick Start

For manual updates, follow these simple steps for each file:

## 1. Products Module Files

### Files Location: `src/modules/products/frontend/scripts/`

**Common imports to update:**

```javascript
// OLD imports you'll find:
import { Modal } from '../../../../../public/js/components/modal.js';
import { apiClient } from '../../../../../public/js/core/api-client.js';
import { formatDate } from '../../../../../public/js/utils/date-utils.js';

// UPDATE to:
import { Modal } from '@components/frontend/scripts/modal.js';
import { apiClient } from '@core/frontend/api-client.js';
import { formatDate } from '@utils/frontend/date-utils.js';
```

## 2. Orders Module Files

### Files Location: `src/modules/orders/frontend/scripts/`

```javascript
// OLD:
import { Toast } from '../../../../../public/js/components/toast-notification.js';
import { OrderAPI } from '../../../../../src/api/orders.api.js';

// NEW:
import { Toast } from '@components/frontend/scripts/toast-notification.js';
import { OrderAPI } from '@modules/orders/backend/api/orders.api.js';
```

## 3. Admin Module Files

### Files Location: `src/modules/admin/frontend/scripts/`

```javascript
// OLD:
import { DataTable } from '../../../../../public/js/components/data-table.js';
import { adminCache } from '../../../../../src/controllers/admin/cache.js';

// NEW:
import { DataTable } from '@components/frontend/scripts/data-table.js';
import { adminCache } from '@modules/admin/backend/controllers/cache.js';
```

## 4. Shared Component Files

### Files Location: `src/shared/components/frontend/scripts/`

```javascript
// OLD:
import { eventBus } from '../../../core/event-bus.js';
import { formatDate } from '../../../utils/date-utils.js';

// NEW:
import { eventBus } from '@core/frontend/event-bus.js';
import { formatDate } from '@utils/frontend/date-utils.js';
```

## Path Alias Cheat Sheet

| Type | Alias | Example |
|------|-------|---------|
| Any module | `@modules/[name]/` | `@modules/products/frontend/scripts/product.js` |
| Products | `@modules/products/` | `@modules/products/backend/api/products.api.js` |
| Orders | `@modules/orders/` | `@modules/orders/frontend/scripts/order-detail.js` |
| Admin | `@modules/admin/` | `@modules/admin/frontend/scripts/dashboard.js` |
| Components | `@components/` | `@components/frontend/scripts/modal.js` |
| Utils | `@utils/` | `@utils/frontend/date-utils.js` |
| Core | `@core/` | `@core/frontend/api-client.js` |
| Config | `@config/` | `@config/db.js` |

## Step-by-Step for Each File

### Step 1: Open the file in your editor

### Step 2: Find all import statements
Look for lines starting with `import` or `require`

### Step 3: For each import, determine the source:
- Is it from `public/js/components/`? → Use `@components/`
- Is it from `public/js/utils/`? → Use `@utils/`
- Is it from `public/js/core/`? → Use `@core/`
- Is it from `src/api/`? → Use `@modules/[module]/backend/api/`
- Is it from `src/controllers/`? → Use `@modules/[module]/backend/controllers/`
- Is it from `src/config/`? → Use `@config/`

### Step 4: Replace the path
Remove all `../` and replace with appropriate `@alias/`

### Step 5: Save and test
Make sure the file still works correctly

## Common Patterns to Search For

Use your editor's find & replace:

1. Search for: `from '../`
2. Review each occurrence
3. Replace with appropriate `@alias/` path

## Example: Complete File Update

**Before** (product-detail.js):
```javascript
import { Modal } from '../../../../../public/js/components/modal.js';
import { Toast } from '../../../../../public/js/components/toast-notification.js';
import { apiClient } from '../../../../../public/js/core/api-client.js';
import { formatDate } from '../../../../../public/js/utils/date-utils.js';
import { ProductCard } from './product-card.js'; // same directory - don't change
import { getProducts } from '../../../../../src/api/products.api.js';

// ... rest of code
```

**After** (product-detail.js):
```javascript
import { Modal } from '@components/frontend/scripts/modal.js';
import { Toast } from '@components/frontend/scripts/toast-notification.js';
import { apiClient } from '@core/frontend/api-client.js';
import { formatDate } from '@utils/frontend/date-utils.js';
import { ProductCard } from './product-card.js'; // same directory - unchanged ✓
import { getProducts } from '@modules/products/backend/api/products.api.js';

// ... rest of code
```

## Files Priority Order

Update in this order:

1. **Backend files first** (they have fewer dependencies)
   - `src/modules/*/backend/controllers/*.js`
   - `src/modules/*/backend/api/*.js`

2. **Shared utilities** (other files depend on these)
   - `src/shared/utils/frontend/*.js`
   - `src/shared/core/frontend/*.js`

3. **Shared components** (used by modules)
   - `src/shared/components/frontend/scripts/*.js`

4. **Module frontend files** (last, depend on everything else)
   - `src/modules/*/frontend/scripts/*.js`

## Validation

After updating each file, check:
- [ ] No more `../` going outside the module
- [ ] All imports start with `@` or `./`
- [ ] File still works (no errors in console)

## Quick Commands

If you want to see which files need updating:

```bash
# Find files with old import patterns
grep -r "from '\.\." src/modules/

# Count how many need updating
grep -r "from '\.\." src/modules/ | wc -l
```

## Need Help?

Refer to the full guide: `docs/IMPORT_PATH_GUIDE.md`
Or use the automated script: `node scripts/update-imports.js`
