# 🚀 Cloudflare Workers E-commerce Platform

Complete e-commerce solution with Whop integration and Google Sheets automation.

## 🎯 Features

### Core Features
- ✅ **Whop Payment Integration** - Dynamic plan creation, automated checkout
- ✅ **Google Sheets Automation** - Real-time order syncing, email notifications
- ✅ **File Upload System** - Archive.org integration, 5MB limit, instant preview
- ✅ **Order Management** - Encrypted customer data, delivery tracking
- ✅ **Admin Dashboard** - Complete control panel with analytics
- ✅ **Email Automation** - Customer confirmations, admin notifications

### Technical Features
- ✅ **Server Time Sync** - Accurate countdown timers
- ✅ **Memory Optimized** - No interval leaks, proper cleanup
- ✅ **REST API** - Export data, maintenance endpoints
- ✅ **Security** - Encrypted data, CORS configured
- ✅ **Cloudflare D1** - SQLite database for orders/products
- ✅ **R2 Storage** - File uploads and media storage

## 📦 Quick Start

```bash
# 1. Deploy to Cloudflare
npx wrangler deploy

# 2. Setup Google Sheets (see SETUP_GUIDE.md)
# 3. Configure Whop integration in Admin Settings
# 4. Start accepting orders!
```

## 📚 Documentation

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup instructions
- **[GOOGLE_APPS_SCRIPT.js](GOOGLE_APPS_SCRIPT.js)** - Google Sheets integration code
- **[WHOP_INTEGRATION_README.md](WHOP_INTEGRATION_README.md)** - Whop setup guide

## 🔧 Recent Updates

### Latest Fixes (December 11, 2025)
- Fixed server time synchronization for accurate countdowns
- Fixed admin API endpoint routing
- Fixed SQL queries to match database schema
- Added Google Sheets export API
- Added automatic email notifications
- Removed memory leaks in countdown timers
- Added system maintenance endpoints

## 🏗️ Architecture

```
Cloudflare Workers (Edge)
├── D1 Database (SQLite)
├── R2 Storage (File uploads)
├── Whop API Integration
└── Google Sheets Webhook
```

## 🚀 Deployment

### Production
```bash
git push origin main
npx wrangler deploy
```

### Environment
- **Platform**: Cloudflare Workers
- **Database**: D1 (SQLite)
- **Storage**: R2 + Archive.org
- **Payments**: Whop
- **Email**: Google Apps Script

## 📊 API Endpoints

### Public
- `GET /api/health` - Health check
- `GET /api/time` - Server timestamp
- `GET /api/products` - List products
- `POST /api/whop/create-plan-checkout` - Create checkout

### Admin
- `GET /api/admin/export-data` - Export all data
- `POST /api/admin/clear-temp-files` - Clear uploads
- `POST /api/admin/clear-pending-checkouts` - Clear sessions
- `GET /api/admin/test` - Test routing

## 🔐 Security

- Email/order data encrypted in database
- API key authentication for Whop
- CORS configured for frontend
- No sensitive data in client-side code

## 📧 Contact

For support or questions, check the documentation or review error logs.

---

**Version**: 14
**Status**: Production Ready ✅
**Last Updated**: December 11, 2025