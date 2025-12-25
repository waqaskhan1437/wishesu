# Orders Module

Complete order management and processing system with buyer-facing and admin interfaces.

## 📁 Structure

```
orders/
├── frontend/
│   ├── views/
│   │   ├── buyer-order.html            # Buyer order page
│   │   ├── order-detail.html           # Order details page
│   │   └── order-success.html          # Order success page
│   ├── styles/
│   │   └── orders.css                  # Order styles
│   └── scripts/
│       ├── order-detail.js             # Order detail logic
│       ├── buyer-order.js              # Buyer order page logic
│       ├── order-display.js            # Order display component
│       ├── order-review.js             # Order review component
│       ├── order-tip.js                # Order tip functionality
│       ├── order-video.js              # Order video player
│       ├── admin-orders.js             # Admin orders page
│       ├── orders.js                   # Orders logic
│       ├── orders-api.js               # Frontend API client
│       ├── orders-countdown.js         # Order countdown timer
│       ├── orders-header.js            # Orders header component
│       ├── orders-modal.js             # Orders modal dialogs
│       ├── orders-table.js             # Admin orders table
│       ├── orders-view.js              # Admin orders view
│       └── dashboard-recent-orders.js  # Recent orders widget
├── backend/
│   ├── api/
│   │   └── orders.api.js               # API routes
│   └── controllers/
│       ├── orders.controller.js        # Business logic
│       └── order-helpers.js            # Helper functions
└── index.js                            # Module entry point
```

## 🎯 Features

### Buyer Features
- **Order Viewing**: View order details and status
- **Order Review**: Submit reviews for completed orders
- **Order Tips**: Add tips to orders
- **Order Videos**: Watch order-related videos
- **Order Success**: Order confirmation page

### Admin Features
- **Order Management**: Full CRUD operations
- **Order Table**: View all orders in table format
- **Order Details**: Detailed order information
- **Order Countdown**: Timer for order deadlines
- **Order Modals**: Quick edit and update modals
- **Recent Orders**: Dashboard widget for recent orders

### Backend Features
- **Order API**: RESTful API for order operations
- **Order Processing**: Business logic for order handling
- **Helper Functions**: Utility functions for order operations

## 🚀 Usage

### Import the Module

```javascript
// Import entire module
import * as Orders from '@/modules/orders';

// Import specific components
import { OrderDetail } from '@/modules/orders/frontend/scripts/order-detail.js';
import { OrdersTable } from '@/modules/orders/frontend/scripts/orders-table.js';

// Import backend
import { getOrders, createOrder } from '@/modules/orders/backend/api/orders.api.js';
```

### Frontend Usage

```javascript
// Initialize order detail page
const orderDetail = new OrderDetail({
  orderId: '12345',
  container: document.getElementById('order-container')
});

// Load orders table
const ordersTable = new OrdersTable({
  orders: ordersData,
  sortable: true
});
```

### Backend Usage

```javascript
// In your API routes
import { getOrders, updateOrderStatus } from '@/modules/orders/backend/api/orders.api.js';

// Fetch orders
const orders = await getOrders({ status: 'pending' });

// Update order
const updated = await updateOrderStatus(orderId, 'completed');
```

## 📄 Files Description

### Views
- **buyer-order.html**: Customer-facing order page
- **order-detail.html**: Detailed order view
- **order-success.html**: Post-purchase success page

### Buyer Scripts
- **order-detail.js**: Order detail page logic
- **buyer-order.js**: Main buyer order page
- **order-display.js**: Order information display
- **order-review.js**: Review submission form
- **order-tip.js**: Tipping functionality
- **order-video.js**: Video player integration

### Admin Scripts
- **admin-orders.js**: Admin orders page controller
- **orders.js**: Core orders logic
- **orders-api.js**: Frontend API client
- **orders-countdown.js**: Countdown timer component
- **orders-header.js**: Orders page header
- **orders-modal.js**: Modal dialogs for quick actions
- **orders-table.js**: Data table for orders list
- **orders-view.js**: Orders view management
- **dashboard-recent-orders.js**: Recent orders dashboard widget

### Backend Scripts
- **orders.api.js**: API route definitions
- **orders.controller.js**: Order business logic
- **order-helpers.js**: Utility and helper functions

## 🔗 Dependencies

This module may depend on:
- Shared components (`@/shared/components`)
- Shared utilities (`@/shared/utils`)
- Products module (`@/modules/products`)
- Payment module (`@/modules/payment`)

## 📊 Order Lifecycle

1. **Order Creation** → New order placed
2. **Processing** → Order being prepared
3. **Fulfillment** → Order being delivered
4. **Completed** → Order finished
5. **Review** → Customer can leave review

## 🧪 Testing

(Testing documentation to be added)

## 📊 Migration Status

✅ **Status**: MIGRATED
- Frontend files: ✅ Moved (15 scripts)
- Backend files: ✅ Moved
- Views: ✅ Moved (3 HTML files)

---

**Module Version**: 1.0.0
**Last Updated**: Phase 2 Migration
**Maintainer**: WishesU Team
