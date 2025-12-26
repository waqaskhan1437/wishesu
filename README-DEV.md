# Development Instructions

## Issue Fixed
The "Unable to parse URL" error was caused by a **known wrangler bug** in local miniflare when using assets + D1 databases together.

## Solution
Use `--remote` flag for development which uses Cloudflare's actual infrastructure instead of buggy local miniflare.

## Commands

```bash
# Install dependencies
npm install

# Development (uses --remote flag - RECOMMENDED)
npm run dev

# Deploy to production
npm run deploy
```

## Important Notes

1. **`npm run dev`** uses `--remote` flag by default - this connects to your actual Cloudflare account and uses real D1/R2 bindings
2. The `--remote` flag bypasses the local miniflare URL parsing bug
3. Static files (HTML, CSS, JS) are automatically served from `./frontend` folder
4. API routes (`/api/*`) are handled by the Worker

## If you see errors

1. Make sure you're logged in to wrangler: `npx wrangler login`
2. Use `npm run dev` (NOT just `wrangler dev`)
3. After changes, redeploy with `npm run deploy`

## File Changes Made

1. **package.json**: Added `--remote` flag to dev script
2. **backend/index/index.js**: Added `{ ...router }` spread export (fixes itty-router bug)
3. **wrangler.toml**: Simplified assets configuration
