# ⚡ Quick Start

## If You're in a Hurry:

### Option 1: Local Setup (5 minutes)
```bash
# Install dependencies
npm install

# Create database
npm run db:create
# ⚠️ COPY THE database_id AND UPDATE wrangler.toml

# Run migrations
npm run db:migrate

# Create media bucket
npm run r2:create

# Set secret
npx wrangler secret put TOKEN_SECRET
# Enter: $(openssl rand -base64 32)

# Deploy!
npm run deploy
```

### Option 2: GitHub Auto-Deploy
1. Update `database_id` in `wrangler.toml` (run `npm run db:create` first)
2. Run migrations: `npm run db:migrate`
3. Set secrets in Cloudflare Dashboard (Workers → Your Worker → Settings → Variables)
4. Push to GitHub → Auto-deploys! ✅

## Next Steps
See `SETUP.md` for detailed instructions.
