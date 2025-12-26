# Wishesu v2

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Run database migration (REQUIRED for checkout)
```bash
npx wrangler d1 execute secure-shop-db --remote --file=./migrations/0001_add_whop_product_id.sql
```

### 3. Set Whop Product ID for your products
You need to set the `whop_product_id` for each product. Get this from your Whop dashboard.

**Option A: Via SQL**
```bash
npx wrangler d1 execute secure-shop-db --remote --command="UPDATE products SET whop_product_id = 'prod_XXXXXXX' WHERE id = 29"
```

**Option B: Via Admin Panel**
Update the product in admin panel and set the Whop Product ID field.

### 4. Deploy
```bash
npm run deploy
```

## Architecture

This project uses `run_worker_first = true`:
- ALL requests go through the Worker first
- Worker handles API routes (`/api/*`)  
- Worker serves static files via `env.ASSETS.fetch()`

## Commands

```bash
npm run dev      # Development (uses --remote)
npm run deploy   # Deploy to production
```

## Whop Integration

Each product needs:
1. `whop_product_id` - Your Whop product ID (e.g., `prod_XXXXXXX`)

Without this, checkout will show "Checkout not configured for this product".

## File Structure

```
wishesu-main/
├── backend/
│   ├── index/index.js     # Worker entry point
│   ├── core/              # Shared utilities
│   └── modules/           # API modules (products, orders, whop, etc.)
├── frontend/              # Static files
├── migrations/            # D1 database migrations
├── wrangler.jsonc         # Wrangler config
└── package.json
```
