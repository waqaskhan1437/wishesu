# Cloudflare E-Commerce Deployment Checklist

## 🚀 Quick Deployment

### 1. Prerequisites
- Node.js installed (v18+)
- Wrangler CLI installed: `npm install -g wrangler`
- Cloudflare account with Workers enabled

### 2. Configure Environment Variables

Create `.env` file with:
```
CF_API_TOKEN=your_api_token_here
CF_ACCOUNT_ID=your_account_id_here

# Optional: For development
ADMIN_SESSION_SECRET=your_secret_key_here
TURNSTILE_SECRET_KEY=your_turnstile_key_here

# R2 Configuration
PRODUCT_MEDIA_BUCKET=your_product_media_bucket
R2_BUCKET=temp-uploads-bucket

# Archive.org (for direct uploads)
ARCHIVE_ACCESS_KEY=your_archive_key
ARCHIVE_SECRET_KEY=your_archive_secret
```

### 3. Database Setup
```bash
# Create D1 database
npx wrangler d1 create secure-shop-db

# Update wrangler.toml with database ID
# database_id = "your_database_id_here"
```

### 4. R2 Buckets Setup
```bash
# Create R2 buckets
npx wrangler r2 bucket create product-media-bucket
npx wrangler r2 bucket create temp-uploads-bucket
```

### 5. Deploy
```bash
# Install dependencies
npm install

# Deploy to Cloudflare
npm run deploy

# Or deploy to production
npm run deploy:prod
```

## 📋 Configuration Checklist

### ✅ Required Settings
- [ ] D1 Database created and ID added to `wrangler.toml`
- [ ] R2 buckets created and names verified
- [ ] Environment variables configured
- [ ] Domain configured (if using custom domain)

### ✅ Optional Settings
- [ ] Turnstile captcha configured for uploads
- [ ] Archive.org credentials for direct uploads
- [ ] Custom domain routes configured
- [ ] Cloudflare CDN caching configured

### ✅ Security Settings
- [ ] Admin session secret configured
- [ ] Rate limiting enabled
- [ ] CORS settings verified
- [ ] HTTPS enforced

## 📁 File Structure

```
project/
├── src/                 # Worker code
├── public/              # Static assets
├── package.json         # Dependencies
├── wrangler.toml        # Cloudflare configuration
├── .env                # Environment variables (create this)
└── README.md           # Documentation
```

## 🔧 Post-Deployment

1. **Initialize Database**
   ```bash
   npx wrangler d1 execute --file init-db.sql
   ```

2. **Test API Endpoints**
   ```bash
   curl https://your-domain.com/api/health
   ```

3. **Verify Uploads**
   - Test R2 upload functionality
   - Verify direct download links work

4. **Set Up Admin Access**
   - Configure admin credentials
   - Set up initial site settings

## 📊 Common Issues

### Database Connection
- Ensure database ID is correct in `wrangler.toml`
- Check that D1 is enabled in your Cloudflare account

### R2 Access
- Verify bucket names match those in configuration
- Check R2 permissions and CORS settings

### Deploy Failures
- Check API token permissions
- Verify account ID is correct
- Ensure all required environment variables are set

## 🐛 Troubleshooting

### Logs
```bash
# View recent logs
npx wrangler tail

# Check specific endpoint
curl -v https://your-domain.com/api/health
```

### Development
```bash
# Local development
npm run dev

# View local server
http://localhost:5000
```

## 🔄 Updates

### Version Management
- Update `VERSION` in `wrangler.toml` before each deploy
- Increment version to force cache refresh

### Dependencies
- Keep dependencies updated with `npm update`
- Test after major dependency updates

## 📝 Notes

- This is a complete e-commerce solution
- All features are production-ready
- R2 upload functionality is included
- No test files or temporary assets included
- Ready for immediate deployment