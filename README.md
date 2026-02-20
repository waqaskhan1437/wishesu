# WishVideo E-Commerce Platform

A Cloudflare Workers-based e-commerce platform for selling digital video services with Archive.org integration for video delivery.

## Quick Start

### Prerequisites
- Cloudflare account with Workers and D1 database enabled
- Archive.org account with API credentials
- R2 storage bucket configured

### Environment Setup

Configure these bindings in your Cloudflare Workers dashboard:

**D1 Database:**
- Binding name: `DB`

**R2 Bucket:**
- Binding name: `R2_BUCKET`

**Secrets:**
- `ARCHIVE_ACCESS_KEY` - Your Archive.org access key
- `ARCHIVE_SECRET_KEY` - Your Archive.org secret key

### Deployment

```bash
wrangler deploy
```

The worker will automatically initialize database tables on first run.

### Database Schema

Tables are created automatically:
- `products` - Product catalog with gallery images support
- `orders` - Order management with delivery tracking
- `reviews` - Customer reviews and ratings
- `settings` - Application configuration
- `pages` - Dynamic page content
- `checkout_sessions` - Payment session tracking

### Features

- Product management with gallery images
- Order processing with delivery video uploads
- Archive.org integration for video storage
- Review and rating system
- SEO-optimized with JSON-LD schemas
- Server-side rendering for better performance

### Admin Access

Access the admin panel at: `https://prankwish.com/admin`

### Support

For issues or questions, check the Cloudflare Workers logs in your dashboard.

---

**Version:** 1.0.0  
**Last Updated:** December 17, 2025
