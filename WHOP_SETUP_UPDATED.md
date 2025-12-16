# 🚀 Complete Whop Integration Setup - Updated

## ✨ New Features Added!

✅ **Whop Product LINK support** - Paste product link, not just Plan ID
✅ **15-minute auto-expiry** - Unused checkouts automatically deleted
✅ **Instant delete on payment** - Checkouts removed immediately after purchase
✅ **Full tracking** - Database stores all checkout history
✅ **Automatic cleanup** - Cloudflare Cron does the work

---

## 📋 Quick Setup (5 Steps)

### Step 1: Get Your Whop API Key
```bash
# 1. Go to https://whop.com/dashboard
# 2. Settings → API Keys → Generate
# 3. Copy the key (starts with whop_)

# 4. Add to Cloudflare Worker
wrangler secret put WHOP_API_KEY
# Paste your key when prompted
```

### Step 2: Create Product in Whop
1. Go to Whop Dashboard → **Products** → **Create**
2. Set your product name and price (e.g., $20)
3. After creating, you'll get a product link like:
   - `https://whop.com/your-product`
   - OR get the Plan ID: `plan_xxxxxxxxxxxxx`

### Step 3: Add Product Link to Your Database
Go to `/admin/product-form.html` and:
1. Edit your product
2. Scroll to "🔗 Whop Payment Integration"
3. Paste either:
   - Full link: `https://whop.com/checkout/plan_xxxxx`
   - OR just: `plan_xxxxx`
4. Save product

### Step 4: Configure Cron for Auto-Cleanup
Add to your `wrangler.toml`:
```toml
[triggers]
crons = ["*/15 * * * *"]  # Runs every 15 minutes
```

Then deploy:
```bash
wrangler deploy
```

### Step 5: Setup Webhook
1. Whop Dashboard → **Settings** → **Webhooks**
2. **Add Webhook:**
   - URL: `https://yoursite.com/api/whop/webhook`
   - Events: Select `payment.succeeded`
3. Save

---

## 🎯 How It Works

### User Journey:
```
1. Customer clicks "Checkout - $20"
     ↓
2. API extracts Plan ID from link
     ↓
3. Creates temporary Whop checkout
     ↓
4. Saves to database with 15-min expiry
     ↓
5. Customer redirected to Whop payment page

[If customer pays:]
6a. Webhook triggered → Checkout deleted immediately ✅
6b. Order created in database
6c. Customer redirected to success page

[If customer doesn't pay:]
6a. After 15 minutes, cron job runs
6b. Finds expired checkout
6c. Deletes from Whop ✅
6d. Marks as "expired" in database
```

---

## 🔧 API Endpoints

### 1. Create Checkout
```http
POST /api/whop/create-checkout
Content-Type: application/json

{
  "product_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "checkout_id": "ch_xxxxx",
  "checkout_url": "https://whop.com/checkout/ch_xxxxx",
  "expires_in": "15 minutes"
}
```

### 2. Webhook Handler
```http
POST /api/whop/webhook
Content-Type: application/json

{
  "type": "payment.succeeded",
  "data": {
    "checkout_session_id": "ch_xxxxx"
  }
}
```

### 3. Manual Cleanup
```http
POST /api/whop/cleanup
```

**Response:**
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
-- Checkout tracking table (auto-created)
CREATE TABLE checkout_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkout_id TEXT UNIQUE,
  product_id INTEGER,
  expires_at DATETIME,
  status TEXT DEFAULT 'pending',  -- pending, completed, expired
  created_at DATETIME,
  completed_at DATETIME
);
```

---

## 🎨 Frontend Integration

### Simple Buy Button
```html
<button onclick="buyProduct(1)">Buy Now - $20</button>

<script>
async function buyProduct(productId) {
  try {
    const res = await fetch('/api/whop/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId })
    });
    
    const data = await res.json();
    
    if (data.success) {
      // Redirect to Whop checkout
      window.location.href = data.checkout_url;
    } else {
      alert('Error: ' + data.error);
    }
  } catch (e) {
    alert('Failed to create checkout');
  }
}
</script>
```

---

## ⏱️ Timeline Example

```
12:00:00 PM - Customer creates checkout ($20 product)
12:00:00 PM - Stored in DB, expires at 12:15:00 PM
12:00:30 PM - Customer redirected to Whop
12:02:00 PM - Customer completes payment
12:02:00 PM - Webhook received
12:02:01 PM - ✅ Checkout deleted from Whop
12:02:01 PM - ✅ Marked as "completed" in DB
12:02:01 PM - ✅ Order created
12:02:02 PM - Customer redirected to success page
```

**Alternative (no payment):**
```
12:00:00 PM - Customer creates checkout
12:05:00 PM - Customer leaves without paying
12:15:00 PM - Cron job runs
12:15:01 PM - ✅ Finds expired checkout
12:15:02 PM - ✅ Deletes from Whop
12:15:02 PM - ✅ Marks as "expired" in DB
```

---

## 🐛 Troubleshooting

### Issue: Blank checkout modal
**Fix:**
- Check browser console for errors
- Verify product has `whop_plan` set
- Check API key is configured

### Issue: "Could not extract Plan ID from link"
**Fix:**
- Use format: `https://whop.com/checkout/plan_xxxxx`
- Or just use: `plan_xxxxx`

### Issue: Checkouts not deleting
**Fix:**
1. Check cron is set up in `wrangler.toml`
2. Redeploy: `wrangler deploy`
3. Check logs: `wrangler tail`
4. Try manual cleanup: `POST /api/whop/cleanup`

### Issue: "Whop not configured for this product"
**Fix:**
- Go to admin panel
- Edit product
- Add Whop product link or Plan ID
- Save

---

## ✅ Testing Checklist

- [ ] Whop API key added (`wrangler secret put WHOP_API_KEY`)
- [ ] Product created in Whop
- [ ] Product link added to database
- [ ] Cron trigger added to wrangler.toml
- [ ] Worker deployed
- [ ] Webhook configured in Whop Dashboard
- [ ] Test checkout creation
- [ ] Test payment flow
- [ ] Verify checkout deleted after payment
- [ ] Test 15-minute expiry (or manual cleanup)

---

## 📁 Files Updated

```
newwebsite-fixed/
├── worker.js                         # ✅ Updated with Whop integration
├── public/
│   ├── admin/
│   │   └── product-form.html        # ✅ Added Whop link field
│   ├── product-example.html         # Example product page
│   └── success.html                  # Payment success page
├── wrangler.toml.example            # ✅ Cron configuration
├── WHOP_SETUP.md                    # This file
└── WHOP_AUTO_CLEANUP.md             # Cleanup details
```

---

## 🎉 You're All Set!

Your platform now:
- ✅ Accepts Whop product links OR Plan IDs
- ✅ Creates unique checkout per customer
- ✅ Auto-deletes checkout after payment
- ✅ Auto-deletes expired checkouts after 15 min
- ✅ Tracks everything in database
- ✅ Runs 100% automatically

**Next:** Deploy and start selling! 🚀
