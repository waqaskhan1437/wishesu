# Product Admin System - Production Ready

## Quick Deploy

```bash
git add .
git commit -m "Production ready"
git push
```

## First-Time Setup (One-Time Only)

### Option 1: Auto (Recommended)
Deploy and visit any page - auto-migration runs!

### Option 2: Manual (If Auto Fails)
Run in D1 Console (Cloudflare Dashboard):

```sql
ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN sale_price REAL;
ALTER TABLE products ADD COLUMN sku TEXT;
ALTER TABLE products ADD COLUMN galleries TEXT;
ALTER TABLE products ADD COLUMN videos TEXT;
ALTER TABLE products ADD COLUMN addons TEXT;
ALTER TABLE products ADD COLUMN seo TEXT;
```

## URLs

- Admin: https://wishesu1.waqaskhan1437.workers.dev/admin
- API: https://wishesu1.waqaskhan1437.workers.dev/products

## Features

### Admin Dashboard
- Image galleries (multi-upload, drag-sort)
- Video upload with thumbnail
- 8 addon types with toolbar
- Sale price support
- Auto-slug generation
- Upload progress indicator

### Backend
- Auto-migration (tables & columns)
- R2 media upload
- Products CRUD API
- Clean modular code

## Troubleshooting

### "Column not found" errors
Run manual SQL above OR wait for auto-migration on first request.

### Save fails
Check browser console (F12) for error details.

## Architecture

See RULES.md for code structure and best practices.
