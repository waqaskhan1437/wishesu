# 🚀 Setup Instructions

## Prerequisites
- Cloudflare account
- GitHub repository connected to Cloudflare Workers

## Step-by-Step Setup

### 1️⃣ Create D1 Database
```bash
npx wrangler d1 create product_db
```

Copy the `database_id` from the output and update it in `wrangler.toml`:
```toml
database_id = "YOUR_ACTUAL_DATABASE_ID_HERE"
```

### 2️⃣ Run Database Migrations
```bash
npx wrangler d1 execute product_db --file=apps/worker/src/core/db/migrations/0001_init.sql
```

### 3️⃣ Create R2 Bucket for Media
```bash
npx wrangler r2 bucket create product-media
```

### 4️⃣ Set Environment Secrets
```bash
npx wrangler secret put TOKEN_SECRET
# Enter a strong random string (e.g., use: openssl rand -base64 32)
```

### 5️⃣ Deploy
```bash
npx wrangler deploy
```

## GitHub Auto-Deploy Setup

If using GitHub integration:
1. Push this code to your GitHub repo
2. In Cloudflare Dashboard → Workers & Pages → Your Worker → Settings → Builds
3. Set build command: `npx wrangler deploy`
4. Every git push will auto-deploy!

## Environment Variables (for Cloudflare Dashboard)

Go to your Worker Settings → Variables and add:
- `TOKEN_SECRET` - JWT secret key (keep it secret!)

## Testing

After deployment, your API will be available at:
```
https://product-worker.<your-subdomain>.workers.dev
```

### Test Endpoints:
- `POST /auth/register` - Create user
- `POST /auth/login` - Login
- `GET /products` - List products
- `POST /products` - Create product

## Troubleshooting

### "Database not found" error
Run the migration: `npx wrangler d1 execute product_db --file=apps/worker/src/core/db/migrations/0001_init.sql`

### "Bucket not found" error  
Create bucket: `npx wrangler r2 bucket create product-media`

### Deploy fails with "Missing entry-point"
Make sure `wrangler.toml` is in the root directory with correct `main` path.

## Need Help?
Check Cloudflare Workers docs: https://developers.cloudflare.com/workers/
