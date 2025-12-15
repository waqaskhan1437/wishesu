# 🧠 SMART AUTO-SETUP SYSTEM

## 🎉 Zero Manual Setup Required!

This system automatically:
- ✅ Creates database tables on first run
- ✅ Detects missing columns and adds them
- ✅ Tracks schema versions
- ✅ Handles database migrations
- ✅ Checks R2 bucket availability

## 🚀 How It Works

### First Deploy:
1. Upload code to Cloudflare
2. Make first request to API
3. System automatically creates everything!

### Adding New Features:
Want to add a new column? Just:
1. Add it to `expectedSchema` in `auto-migration.ts`
2. Deploy
3. Done! Auto-added on next request!

## 📋 Auto-Created Tables

- **users** - User accounts & authentication
- **products** - Product catalog
- **product_media** - Images & media files
- **product_addons** - Product options & variants
- **product_seo** - SEO metadata
- **_schema_version** - Migration tracking (auto-created)

## 🔧 Extended Columns (Auto-Added)

The system will automatically add these columns if missing:

**users:**
- full_name
- phone

**products:**
- stock_quantity
- sku

**product_media:**
- file_size
- mime_type

**product_addons:**
- stock_quantity

**product_seo:**
- keywords

## ⚙️ Configuration

### Required Bindings (wrangler.toml):
```toml
[[d1_databases]]
binding = "DB"
database_name = "product_db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "MEDIA"
bucket_name = "product-media"
```

### Environment Variables:
- `TOKEN_SECRET` - JWT token secret (optional, has default)

## 🎯 Deploy Instructions

### First Time:
```bash
# 1. Create D1 database
wrangler d1 create product_db

# 2. Copy database_id to wrangler.toml

# 3. Create R2 bucket
wrangler r2 bucket create product-media

# 4. Set TOKEN_SECRET (optional)
wrangler secret put TOKEN_SECRET

# 5. Deploy!
wrangler deploy
```

### Updates:
```bash
# Just deploy - auto-migration handles everything!
wrangler deploy
```

## 🧪 Testing Auto-Setup

After first deploy, check logs:
```bash
wrangler tail
```

You should see:
```
🧠 First request - running auto-setup...
🔧 Creating initial database schema...
✅ Initial schema created!
🔍 Checking for schema updates...
✅ Auto-setup complete - ready for requests!
```

## 🆕 Adding New Columns

Edit `apps/worker/src/core/auto-migration.ts`:

```typescript
const expectedSchema = {
  products: [...existingColumns, 'new_column_name'],
  // Add to any table
};
```

Deploy → Auto-added on next request!

## ⚡ Smart Features

1. **Idempotent** - Safe to run multiple times
2. **Version Tracking** - Knows what's applied
3. **Auto-Detection** - Finds missing columns
4. **Error Handling** - Continues even if some migrations fail
5. **Logging** - Clear console output
6. **Non-Blocking** - Doesn't slow down requests

## 🔄 How Schema Versioning Works

The system tracks migrations in `_schema_version` table:

| version | applied_at | description |
|---------|------------|-------------|
| 1 | timestamp | Initial schema |
| 2 | timestamp | Auto-added extended columns |

## 📊 Monitoring

Check migration status:
```sql
SELECT * FROM _schema_version ORDER BY version DESC;
```

Check schema:
```sql
PRAGMA table_info(products);
```

## 🎨 Future Enhancements

Want to add more auto-magic?
- Auto-create indexes
- Auto-optimize queries
- Auto-backup before migrations
- Auto-rollback on errors

Just extend `AutoMigration` class!

## 🆘 Troubleshooting

**"Tables not created"**
- Check D1 binding in wrangler.toml
- Check database_id is correct
- View logs: `wrangler tail`

**"Column not added"**
- Check expectedSchema in auto-migration.ts
- Some column types might need manual SQL
- Check logs for warnings

**"R2 bucket error"**
- Create bucket: `wrangler r2 bucket create product-media`
- Check binding in wrangler.toml

## 🎉 Benefits

- **Zero Manual SQL** - No migrations to run
- **Always Up-to-Date** - Schema auto-updates
- **Developer Friendly** - Just deploy and go!
- **Production Safe** - Non-destructive changes only
