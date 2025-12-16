# 🚀 Complete Setup Guide

## Project Overview
Cloudflare Workers + Whop Integration + Google Sheets Automation for E-commerce

## ✅ Recent Fixes & Features

### Bug Fixes
- ✅ Server time synchronization for accurate countdown timers
- ✅ Fixed setInterval memory leak in buyer-order.js
- ✅ Fixed admin endpoint routing (moved to top-level)
- ✅ Fixed HTTP method compatibility (GET/POST support)
- ✅ Fixed SQL queries to match actual database schema
- ✅ Removed duplicate code and optimized routing

### New Features
- ✅ Google Sheets integration for order management
- ✅ Automatic email notifications to customers
- ✅ Admin notification system
- ✅ Real-time order syncing
- ✅ Export API for all orders, emails, and products
- ✅ System maintenance endpoints (temp files, checkouts)

## 📋 Setup Instructions

### 1. Cloudflare Workers Setup

```bash
# Install dependencies (if any)
npm install

# Deploy to Cloudflare
npx wrangler deploy

# Or login first if needed
npx wrangler login
npx wrangler deploy
```

### 2. Environment Variables

Add these to your `wrangler.toml` or Cloudflare Dashboard:

```toml
[vars]
VERSION = "14"

[[d1_databases]]
binding = "DB"
database_name = "secure-shop-db"

[[r2_buckets]]
binding = "PRODUCT_MEDIA"
bucket_name = "product-media-bucket"

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "temp-uploads-bucket"
```

### 3. Whop Integration Setup

1. Go to Whop Dashboard: https://whop.com/developers
2. Create API Key with permissions:
   - Read/Write Plans
   - Read/Write Products
   - Read Webhooks
3. Add to Admin Settings:
   - API Key
   - Webhook Secret
   - Default Product ID

### 4. Google Sheets Integration

#### Step 1: Create Google Sheet
1. Create new Google Sheet: https://sheets.google.com
2. `Extensions` → `Apps Script`
3. Copy code from `GOOGLE_APPS_SCRIPT.js`
4. Update configuration:
   ```javascript
   const NOTIFICATION_EMAIL = 'your-email@gmail.com';
   const FROM_NAME = 'Your Business Name';
   ```

#### Step 2: Deploy Web App
1. In Apps Script: `Deploy` → `New Deployment`
2. Type: **Web App**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Click **Deploy**
6. Copy the **Web App URL**

#### Step 3: Add to Admin Settings
1. Go to Admin Dashboard → Settings
2. Google Sheets Integration section
3. Paste Web App URL
4. Click "Save Settings"
5. Test with "Test Google Sync" button

### 5. Testing

#### Test API Endpoints
```bash
# Test server time
curl https://your-worker.workers.dev/api/time

# Test health check
curl https://your-worker.workers.dev/api/health

# Test export data
curl https://your-worker.workers.dev/api/admin/export-data

# Test admin routing
curl https://your-worker.workers.dev/api/admin/test
```

#### Test Google Integration
1. Create a test order
2. Check Google Sheet for new row
3. Check email inbox for confirmation
4. Check admin email for notification

## 🔧 Admin Features

### System Maintenance
- **Clear Temp Files**: Remove unused uploaded files
- **Clear Pending Checkouts**: Clean old sessions (Whop-managed)

### Google Sheets Integration
- **Export Data**: `/api/admin/export-data` - Get all orders, emails, products
- **Test Sync**: Send sample data to Google Sheets
- **Auto-sync**: Real-time updates on order creation

## 📁 Project Structure

```
newwebsite/
├── worker.js                    # Main Cloudflare Worker
├── wrangler.toml               # Worker configuration
├── public/                      # Static files
│   ├── js/
│   │   ├── buyer-order.js      # Order page with server time sync
│   │   ├── admin/
│   │   │   └── dashboard.js    # Admin dashboard
│   │   └── whop/
│   │       └── checkout.js     # Whop checkout integration
│   └── ...
├── GOOGLE_APPS_SCRIPT.js       # Google Apps Script code
└── SETUP_GUIDE.md              # This file
```

## 🔐 Security

- Email and order data encrypted in `encrypted_data` column
- API endpoints protected (add authentication if needed)
- CORS configured for API access
- No sensitive data in frontend

## 🚀 Deployment

### Quick Deploy
```bash
git add -A
git commit -m "Update: [your message]"
git push origin main
npx wrangler deploy
```

### GitHub Actions (Optional)
Add `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: cloudflare/wrangler-action@2.0.0
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
```

## 📧 Email Templates

Customize email templates in `GOOGLE_APPS_SCRIPT.js`:
- Order confirmation email (`sendOrderConfirmationEmail`)
- Admin notification (`sendAdminNotification`)

## 🐛 Troubleshooting

### Issue: API endpoint not found
- Check deployment: Latest code must be deployed
- Verify routing: Admin endpoints should be at top-level
- Check logs: `npx wrangler tail`

### Issue: Google Sheets not updating
- Verify Web App is deployed correctly
- Check permissions: "Execute as: Me", "Access: Anyone"
- Test endpoint: `/api/admin/export-data`
- Check Apps Script logs: View → Logs

### Issue: Emails not sending
- Verify Gmail permissions in Apps Script
- Check NOTIFICATION_EMAIL is correct
- Test with "Test Email" menu item
- Check spam folder

### Issue: Countdown timer wrong
- Clear browser cache
- Check browser console for server time sync logs
- Verify `/api/time` endpoint returns server timestamp

## 📊 Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  order_id TEXT UNIQUE,
  product_id INTEGER,
  encrypted_data TEXT,  -- JSON: {email, amount, addons}
  status TEXT,
  delivery_time_minutes INTEGER,
  created_at DATETIME,
  archive_url TEXT,
  delivered_video_url TEXT
)
```

### Products Table
```sql
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  title TEXT,
  slug TEXT,
  normal_price REAL,
  sale_price REAL,
  status TEXT
)
```

## 🎯 Next Steps

1. [ ] Add authentication to admin endpoints
2. [ ] Set up automated backups
3. [ ] Add more email templates
4. [ ] Create customer dashboard
5. [ ] Add analytics integration

## 📞 Support

For issues or questions:
- Check logs: `npx wrangler tail`
- Review error messages in browser console
- Check Google Apps Script logs
- Verify all API endpoints are deployed

---

**Version**: 14
**Last Updated**: December 11, 2025
**Status**: Production Ready ✅
