# Whop Integration Setup Guide

## 🚀 Quick Start

Your e-commerce platform is now integrated with Whop for automatic checkout creation and payment processing!

## 📋 Requirements

1. **Whop Account** - Sign up at https://whop.com
2. **Whop API Key** - Get from Whop Dashboard
3. **Whop Plan ID** - Create products in Whop and get Plan IDs

---

## ⚙️ Step 1: Get Your Whop API Key

1. Go to https://whop.com/dashboard
2. Navigate to **Settings** → **API Keys**
3. Click **"Generate API Token"**
4. Copy the API key (starts with `whop_`)

---

## 🔧 Step 2: Configure Cloudflare Worker

Add your Whop API key to your Cloudflare Worker:

```bash
# Using Wrangler CLI
wrangler secret put WHOP_API_KEY
# Paste your API key when prompted

# OR add to wrangler.toml (for development only, NOT production!)
[vars]
WHOP_API_KEY = "whop_your_api_key_here"
```

---

## 📦 Step 3: Create Products in Whop

1. Go to Whop Dashboard → **Products**
2. Click **"Create Product"**
3. Set up your product:
   - **Name**: "Video Editing Service"
   - **Price**: $20
   - **Type**: One-time payment or Subscription
4. After creating, copy the **Plan ID** (starts with `plan_`)

---

## 🗃️ Step 4: Link Products in Your Database

Update your products table with Whop Plan IDs:

```sql
-- Update product with Whop plan ID
UPDATE products 
SET whop_plan = 'plan_xxxxxxxxxxxxx' 
WHERE id = 1;
```

**OR** use the Admin UI:
1. Go to `/admin/products.html`
2. Edit your product
3. Paste the Whop Plan ID in the "Whop Plan" field
4. Save

---

## 🎯 Step 5: Set Up Webhooks (Important!)

Webhooks automatically delete temporary checkouts after payment.

1. Go to Whop Dashboard → **Settings** → **Webhooks**
2. Click **"Add Webhook"**
3. Configure:
   - **URL**: `https://your-domain.com/api/whop/webhook`
   - **Events**: Select these:
     - `payment.succeeded`
     - `membership.went_valid`
4. Save webhook

---

## ✅ Step 6: Test Your Integration

1. Open: `https://your-domain.com/product-example.html`
2. Click **"Buy Now"**
3. You should be redirected to Whop checkout
4. Complete test payment
5. After payment, checkout will be auto-deleted ✨

---

## 📊 How It Works

```
User clicks "Buy Now"
    ↓
Your API creates temporary Whop checkout
    ↓
User redirected to unique checkout URL
    ↓
User completes payment on Whop
    ↓
Whop sends webhook to your server
    ↓
Your webhook handler:
  - Deletes temporary checkout ✓
  - Creates order in database ✓
  - Grants user access ✓
```

---

## 🔐 Security Features

✅ **Unique checkout per payment** - No link reuse
✅ **Temporary sessions** - Auto-deleted after payment
✅ **Metadata tracking** - Product ID, timestamp stored
✅ **Secure webhooks** - Payment verification from Whop

---

## 🎨 Frontend Integration Example

```html
<button onclick="buyProduct(1)">Buy Now</button>

<script>
async function buyProduct(productId) {
  const response = await fetch('/api/whop/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Redirect to Whop checkout
    window.location.href = data.checkout_url;
  }
}
</script>
```

---

## 🐛 Troubleshooting

### "Whop API key not configured"
→ Make sure you added `WHOP_API_KEY` secret to Cloudflare Worker

### "Whop not configured for this product"
→ Update product's `whop_plan` field in database

### "Failed to create checkout session"
→ Check that your Plan ID is correct in Whop Dashboard

### Checkout not deleting after payment
→ Verify webhook is configured correctly in Whop Dashboard

---

## 📱 API Endpoints

### Create Checkout
```
POST /api/whop/create-checkout
Body: { "product_id": 1 }
Response: { 
  "success": true, 
  "checkout_id": "ch_xxxx",
  "checkout_url": "https://whop.com/checkout/ch_xxxx"
}
```

### Webhook Handler
```
POST /api/whop/webhook
Body: Whop webhook payload
Response: { "received": true }
```

---

## 🎉 You're All Set!

Your platform now automatically:
- ✅ Creates unique checkout for each payment
- ✅ Deletes checkout after successful payment
- ✅ Tracks orders in your database
- ✅ Processes payments securely via Whop

For questions, check Whop docs: https://docs.whop.com
