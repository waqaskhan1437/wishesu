# Wishesu v2

## Architecture

This project uses `run_worker_first = true` which means:
- ALL requests go through the Worker first
- Worker handles API routes (`/api/*`)  
- Worker serves static files via `env.ASSETS.fetch()`
- This bypasses wrangler dev's buggy URL parsing

## Quick Start

```bash
# Install
npm install

# Deploy to production (recommended)
npm run deploy

# Development (uses --remote flag)
npm run dev
```

**Note:** For `npm run dev`, login first: `npx wrangler login`

## How It Works

1. **API routes** (`/api/*`) - handled by Worker
2. **Static files** (`.html`, `.css`, `.js`, etc.) - served via ASSETS binding
3. **Directory paths** (`/product/`) - automatically resolved to `/product/index.html`

## File Structure

```
wishesu-main/
├── backend/
│   ├── index/index.js     # Worker entry point
│   ├── core/              # Shared utilities
│   └── modules/           # API modules
├── frontend/              # Static files
│   ├── index.html
│   ├── product/
│   ├── order/
│   └── admin/
├── wrangler.jsonc         # Config (JSON format)
└── package.json
```

## Configuration

Using `wrangler.jsonc` (not `.toml`) for better compatibility:

```json
{
  "assets": {
    "directory": "./frontend",
    "binding": "ASSETS",
    "run_worker_first": true
  }
}
```
