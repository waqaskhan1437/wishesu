# Quick Setup

## Step 1: Install
```bash
npm install
```

## Step 2: Run ALL database migrations
```bash
# Add whop_product_id column to products
npx wrangler d1 execute secure-shop-db --remote --file=./migrations/0001_add_whop_product_id.sql

# Create settings table
npx wrangler d1 execute secure-shop-db --remote --file=./migrations/0002_create_settings_table.sql
```

## Step 3: Deploy
```bash
npm run deploy
```

## Step 4: Configure Whop in Admin
1. Open your production URL
2. Go to **Settings** page
3. Enter your **Whop Product ID** (e.g., `prod_XXXXXXX`)
4. Click **Save Whop Settings**

That's it! All products will now use this Whop Product ID for checkout.

---

## Get Whop Product ID

1. Go to https://dash.whop.com
2. Click on your product
3. Copy the product ID (starts with `prod_`)

---

## Notes

- The global Whop Product ID is used for ALL products
- If a specific product has its own `whop_product_id`, that takes priority
- Localhost testing may not work due to wrangler dev bugs - test on production
