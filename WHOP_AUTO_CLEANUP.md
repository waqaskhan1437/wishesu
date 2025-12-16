# 🕒 Auto-Cleanup Setup Guide

## ⚡ 15-Minute Auto-Delete for Unused Checkouts

Tumhare system me ab automatic cleanup hai! Agar koi customer checkout create kare lekin payment nahi kare, to 15 minutes baad wo checkout automatically delete ho jayega.

---

## 🔧 Setup: Cloudflare Cron Trigger

### Option 1: Using Cloudflare Cron Triggers (Recommended)

1. **Open wrangler.toml** file
2. **Add this section:**

```toml
[triggers]
crons = ["*/15 * * * *"]  # Runs every 15 minutes
```

3. **Deploy:**
```bash
wrangler deploy
```

### Option 2: External Cron Service (Alternative)

Agar Cloudflare Cron use nahi kar sakte, to external service use karo:

**Services:**
- https://cron-job.org (Free)
- https://easycron.com (Free tier)
- Any server with crontab

**Setup:**
```bash
# Har 15 minutes pe cleanup call karo
*/15 * * * * curl -X POST https://yoursite.com/api/whop/cleanup
```

---

## 📋 How It Works

```
Customer creates checkout
    ↓
Checkout stored in database with expiry time (15 min)
    ↓
[If payment completed]
  ├─ Webhook triggered
  ├─ Checkout marked as "completed"
  └─ Checkout deleted from Whop immediately ✅
    ↓
[If payment NOT completed]
  ├─ After 15 minutes, cron job runs
  ├─ Finds expired checkouts
  ├─ Deletes from Whop
  └─ Marks as "expired" in database ✅
```

---

## 🎯 Cleanup Endpoint

### Manual Cleanup
```bash
curl -X POST https://yoursite.com/api/whop/cleanup
```

### Response
```json
{
  "success": true,
  "deleted": 5,
  "failed": 0,
  "message": "Cleaned up 5 expired checkouts"
}
```

---

## 📊 Database Schema

```sql
CREATE TABLE checkout_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkout_id TEXT UNIQUE,           -- Whop checkout ID
  product_id INTEGER,                -- Product reference
  expires_at DATETIME,               -- Expiry time (15 min from creation)
  status TEXT DEFAULT 'pending',     -- pending, completed, expired
  created_at DATETIME,               -- When checkout was created
  completed_at DATETIME              -- When payment completed or expired
);
```

---

## 🔍 Monitor Cleanup

### Check Recent Cleanups
```sql
SELECT * FROM checkout_sessions 
WHERE status = 'expired' 
ORDER BY completed_at DESC 
LIMIT 10;
```

### Check Pending Checkouts
```sql
SELECT checkout_id, product_id, 
       datetime(expires_at) as expires,
       (julianday(expires_at) - julianday('now')) * 24 * 60 as minutes_left
FROM checkout_sessions 
WHERE status = 'pending'
ORDER BY created_at DESC;
```

---

## ⏱️ Timeline Example

```
12:00 PM - Customer creates checkout
12:00 PM - Stored in DB with expires_at = 12:15 PM
12:05 PM - Customer leaves without paying
12:15 PM - Cron job runs
12:15 PM - Finds expired checkout
12:15 PM - Deletes from Whop ✅
12:15 PM - Marks as "expired" in DB ✅
```

---

## 🚀 Testing

### Test Cleanup Manually
```bash
# 1. Create a test checkout
curl -X POST https://yoursite.com/api/whop/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"product_id": 1}'

# 2. Wait 15 minutes (or manually update DB)
# UPDATE checkout_sessions SET expires_at = datetime('now') WHERE id = X;

# 3. Run cleanup
curl -X POST https://yoursite.com/api/whop/cleanup

# 4. Check logs
# Should see: "Cleaned up X expired checkouts"
```

---

## ⚙️ Configuration

### Change Cleanup Frequency

**Every 5 minutes:**
```toml
crons = ["*/5 * * * *"]
```

**Every 30 minutes:**
```toml
crons = ["*/30 * * * *"]
```

**Every hour:**
```toml
crons = ["0 * * * *"]
```

### Change Expiry Time

In `worker.js`, find this line:
```javascript
const expiryTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
```

Change `15` to your desired minutes:
- `10 * 60 * 1000` = 10 minutes
- `30 * 60 * 1000` = 30 minutes

---

## 🐛 Troubleshooting

### Cron not running?
1. Check `wrangler.toml` has `[triggers]` section
2. Redeploy: `wrangler deploy`
3. Check Cloudflare Dashboard → Workers → Your Worker → Triggers

### Cleanup not deleting?
1. Check logs: `wrangler tail`
2. Verify `WHOP_API_KEY` is set
3. Check database has checkout_sessions table
4. Try manual cleanup: `POST /api/whop/cleanup`

### Too many orphan checkouts?
1. Decrease expiry time (5-10 minutes)
2. Increase cron frequency (every 5 minutes)
3. Check webhook is working properly

---

## 📈 Benefits

✅ **No clutter** - Old checkouts auto-deleted
✅ **Better UX** - Fresh checkout every time
✅ **Cost efficient** - No wasted resources
✅ **Automatic** - Set it and forget it
✅ **Trackable** - Full audit trail in database

---

## 🎯 Next Steps

1. ✅ Add cron trigger to wrangler.toml
2. ✅ Deploy worker
3. ✅ Test cleanup endpoint
4. ✅ Monitor logs
5. 🎉 Enjoy automatic cleanup!

---

## 💡 Pro Tips

1. **Monitor regularly**: Check logs weekly to ensure cleanup is running
2. **Adjust timing**: Start with 15 minutes, adjust based on customer behavior
3. **Keep records**: Don't delete from database, just mark as expired
4. **Alert on failures**: Set up monitoring if cleanup fails repeatedly

---

**Questions?** Check the main integration guide or Cloudflare Cron docs.
