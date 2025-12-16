# Cloudflare Workers E-commerce Platform

## Overview
This is a Cloudflare Workers-based e-commerce platform with Whop payment integration and Google Sheets automation. It runs locally in development mode using Wrangler.

## Project Structure
```
/
├── worker.js           # Main Cloudflare Worker entry point (backend API)
├── wrangler.toml       # Wrangler configuration for Cloudflare Workers
├── package.json        # Node.js dependencies and scripts
├── public/             # Static frontend assets
│   ├── admin/          # Admin dashboard HTML pages
│   ├── css/            # Stylesheets
│   ├── js/             # JavaScript files
│   │   ├── admin/      # Admin-specific scripts
│   │   ├── product/    # Product page scripts
│   │   ├── whop/       # Whop checkout scripts
│   │   └── addons/     # Add-on builder scripts
│   └── *.html          # Public-facing HTML pages
└── *.md                # Documentation files
```

## Tech Stack
- **Runtime**: Cloudflare Workers (via Wrangler CLI)
- **Database**: D1 (SQLite) - local in development
- **Storage**: R2 buckets - local in development
- **Frontend**: Static HTML/CSS/JS served from public/ directory
- **Payments**: Whop integration (requires API key configuration)

## Development
Run the development server with:
```bash
npm run dev
```

This starts Wrangler in local mode on port 5000 with:
- Local D1 database (SQLite)
- Local R2 bucket simulation
- Static asset serving from public/

## Key URLs
- Homepage: `/` - Products listing
- Admin Dashboard: `/admin` - Full admin panel
- API Health: `/api/health` - Health check
- API Debug: `/api/debug` - Shows binding status

## API Endpoints
- `GET /api/products` - List products
- `GET /api/orders` - List orders
- `POST /api/whop/create-checkout` - Create checkout session
- Various admin endpoints for CRUD operations

## Configuration
The app requires Whop API credentials for payment processing. These can be configured in the admin Settings page or via environment variables.

## Recent Changes
- December 12, 2025: Enhanced Product Schema for Google Rich Results
  - Added SKU, MPN, itemCondition fields
  - Added seller and manufacturer info
  - Added multi-country shipping destinations
  - Added Twitter Cards support
  - Added real reviews to schema when available
  - Added video object for products with preview videos
- December 12, 2025: Adapted for Replit environment
  - Changed `exec()` to `prepare().run()` for D1 compatibility
  - Configured Wrangler to bind to 0.0.0.0:5000

## Notes
- This is designed for Cloudflare Workers deployment
- Local development uses simulated D1/R2 storage
- Production deployment requires `wrangler deploy` with Cloudflare account
