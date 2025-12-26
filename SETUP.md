# Quick Setup

## Step 1: Install
```bash
npm install
```

## Step 2: Add whop_product_id column to database
```bash
npx wrangler d1 execute secure-shop-db --remote --file=./migrations/0001_add_whop_product_id.sql
```

## Step 3: Set Whop Product ID for your product
Replace `prod_XXXXX` with your actual Whop product ID and `29` with your product ID:
```bash
npx wrangler d1 execute secure-shop-db --remote --command="UPDATE products SET whop_product_id = 'prod_XXXXX' WHERE id = 29"
```

## Step 4: Deploy to production
```bash
npm run deploy
```

## Step 5: Test on production URL
Open your workers.dev URL - NOT localhost!

---

## Why localhost doesn't work?

There's a known bug in wrangler dev when using assets + D1 together. The local development server has URL parsing issues.

**Solutions:**
1. Deploy to production and test there (recommended)
2. Use `npm run dev` which uses --remote flag

---

## Get Whop Product ID

1. Go to https://dash.whop.com
2. Click on your product
3. Copy the product ID (starts with `prod_`)
