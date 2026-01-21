# Universal Webhook System v3.0 - Complete Setup Guide

## 🎉 Kya Changes Huey Hain?

### ❌ Purana System (Removed)
```
✗ Email services (Resend, SendGrid, Mailgun, etc.) - REMOVED
✗ Individual webhook routing per event - REMOVED  
✗ Complex automation.js controller - DEPRECATED
✗ Separate email/webhook configuration - REMOVED
```

### ✅ Naya System (Clean & Universal)
```
✓ Single universal webhook endpoint
✓ Works with ANY service (Make.com, n8n, Zapier, etc.)
✓ Clean JSON payloads
✓ Email via external services (Make.com recommended)
✓ Simple UI - easy configuration
```

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Admin Dashboard Setup

1. **Login to Admin Dashboard**
   ```
   https://your-domain.com/admin
   ```

2. **Open Webhooks Settings**
   - Click **"⚡ Webhooks"** button (new button in dashboard)
   - Enable master toggle: **"Enable Webhooks System"**

3. **Add Webhook Endpoint**
   - Click **"+ Add Endpoint"**
   - Enter name: `Make.com - All Events`
   - Enter webhook URL (from Step 2)
   - Select events to listen to
   - Click **"Save Changes"**

---

### Step 2: Make.com Setup (Recommended for Emails)

#### A. Create New Scenario

1. Go to [Make.com](https://make.com) (free account works!)

2. **Create New Scenario**

3. **Add Webhook Module**
   - Click **"+"** → Search **"Webhook"**
   - Choose **"Custom Webhook"**
   - Click **"Create a webhook"**
   - Name it: `WishesU Events`
   - **Copy the webhook URL**

4. **Paste URL in Admin Dashboard**
   - Go back to Admin → Webhooks
   - Paste the URL you copied
   - Save settings

5. **Test Webhook**
   - Click **"🧪 Test"** button in Admin
   - Check Make.com - you should see test data!

#### B. Add Email Module

1. **In Make.com scenario:**
   - Click **"+"** after webhook
   - Search **"Email"** or your email service (Gmail, SendGrid, etc.)
   
2. **For Gmail:**
   - Choose **"Gmail" → "Send an Email"**
   - Connect your Gmail account
   - Configure email:
     ```
     To: {{1.data.customerEmail}} or your-admin@email.com
     Subject: {{1.data.event}} - New Notification
     Body: 
       Event: {{1.event}}
       
       Order ID: {{1.data.orderId}}
       Customer: {{1.data.customerName}}
       Email: {{1.data.customerEmail}}
       Product: {{1.data.productTitle}}
       Amount: ${{1.data.amount}}
     ```

3. **Save & Activate Scenario**

---

### Step 3: Event Types Reference

Yeh events available hain webhook ke liye:

#### Admin Notifications
| Event | Description | When Triggered |
|-------|-------------|----------------|
| `order.received` | New order placed | Customer completes payment |
| `order.delivered` | Order completed | Admin delivers order |
| `tip.received` | Customer sent tip | Tip payment received |
| `review.submitted` | New review posted | Customer submits review |
| `blog.comment` | Blog comment added | User comments on blog |
| `forum.question` | Forum question posted | User asks question |
| `forum.reply` | Forum reply posted | User replies to question |
| `chat.message` | New chat message | Customer sends message |

#### Customer Notifications
| Event | Description | When Triggered |
|-------|-------------|----------------|
| `customer.order.confirmed` | Order confirmed | After payment success |
| `customer.order.delivered` | Order ready | Admin marks delivered |
| `customer.chat.reply` | Chat reply received | Admin replies to chat |
| `customer.forum.reply` | Forum reply received | Someone replies to their question |

---

### Step 4: Payload Structure

Webhook sends clean JSON data:

```json
{
  "event": "order.received",
  "timestamp": "2026-01-21T12:30:00.000Z",
  "data": {
    "orderId": "ORD-12345",
    "productId": 1,
    "productTitle": "Birthday Video",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "amount": 25.00,
    "currency": "USD",
    "paymentMethod": "stripe",
    "createdAt": "2026-01-21T12:30:00.000Z"
  },
  "meta": {
    "version": "3.0",
    "source": "wishesu"
  }
}
```

---

## 🔧 Advanced Setup Examples

### Example 1: Slack Notifications

1. **Create Slack Incoming Webhook**
   - Slack → Settings → Integrations
   - Add "Incoming Webhooks"
   - Copy webhook URL

2. **Add to Admin Dashboard**
   - Name: `Slack Notifications`
   - URL: Paste Slack webhook URL
   - Events: Select all admin events
   - Save

✅ Done! Orders ab Slack mein appear honge!

---

### Example 2: Discord Notifications

1. **Create Discord Webhook**
   - Discord Server → Settings → Integrations
   - Create Webhook
   - Copy URL

2. **Add to Admin Dashboard**
   - Name: `Discord Orders`
   - URL: Discord webhook URL
   - Events: `order.received`, `tip.received`
   - Save

---

### Example 3: Custom API Integration

```javascript
// Your custom endpoint receives:
POST https://your-api.com/webhooks/wishesu

Headers:
  Content-Type: application/json
  X-Webhook-Secret: your-secret-key (if configured)
  X-Webhook-Signature: hmac-sha256-signature (if secret configured)

Body:
{
  "event": "order.received",
  "timestamp": "2026-01-21T12:30:00.000Z",
  "data": { ... }
}
```

**Verify Signature (Optional but Recommended):**
```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  const expectedSig = hmac.digest('hex');
  return signature === expectedSig;
}
```

---

## 📧 Email Setup Options

### Option 1: Make.com (Recommended)
- **Pros:** Free tier, easy setup, any email provider
- **Cons:** External dependency
- **Cost:** Free for 1,000 ops/month

### Option 2: n8n (Self-hosted)
- **Pros:** Fully self-hosted, no limits
- **Cons:** Requires server setup
- **Cost:** Free (self-hosted)

### Option 3: Zapier
- **Pros:** Many integrations
- **Cons:** Expensive for high volume
- **Cost:** $20/month minimum

---

## 🧪 Testing

### Test Individual Webhook
1. Admin Dashboard → Webhooks
2. Find your endpoint
3. Click **"🧪 Test"** button
4. Check logs in your service (Make.com/n8n/etc.)

### Test Live Events
1. Place a test order on your site
2. Check webhook received the `order.received` event
3. Check email was sent (if configured)

---

## 🔍 Troubleshooting

### Webhook Not Receiving Data?

**Check 1:** Master toggle enabled?
```
Admin → Webhooks → "Enable Webhooks System" = ON
```

**Check 2:** Endpoint enabled?
```
Each endpoint has its own enable toggle - make sure it's ON
```

**Check 3:** Events selected?
```
Check that the events you want are checked in the endpoint config
```

**Check 4:** URL correct?
```
Copy URL again from Make.com/n8n
Make sure no extra spaces
```

### Emails Not Sending?

**Check 1:** Make.com scenario active?
```
Make.com → Scenarios → Check "Active" status
```

**Check 2:** Email module configured?
```
Test email module separately in Make.com
```

**Check 3:** Check Make.com logs
```
Make.com → History → See error messages
```

### Webhook Returns Error

**Check 1:** Check browser console
```
F12 → Console → Look for errors
```

**Check 2:** Check Cloudflare logs
```
Cloudflare Dashboard → Workers → Logs
```

---

## 📊 Comparison: Old vs New

| Feature | Old System | New System |
|---------|-----------|------------|
| Email Services | Built-in (7 services) | External (via webhooks) |
| Webhook Config | Per-event routing | Universal endpoints |
| Setup Time | 15-30 minutes | 5 minutes |
| Code Complexity | 650+ lines | 350 lines |
| CPU Usage | Higher (email logic in worker) | Lower (external processing) |
| Flexibility | Limited to supported services | ANY service via webhook |
| Email Providers | 7 hardcoded | Unlimited via Make.com |
| Cost | API keys needed | Free tier available |

---

## 🗑️ Migration from Old System

### Automatic Migration
Old config is automatically detected and **ignored**. New system takes priority.

### What Happens to Old Settings?
- Old `automation_config_v2` is **not used**
- New `webhooks_config` is used instead
- No data is lost - old settings remain in DB (inactive)

### Re-enable Old System (Emergency)
If you need to temporarily revert:

1. **Router.js** - Comment out new webhook routes
2. **Controllers** - Change imports back to `./automation.js`
3. **Deploy**

But **NOT recommended** - new system is cleaner and faster!

---

## 🎯 Best Practices

### 1. Use Make.com for Emails
✅ Clean separation of concerns  
✅ Easy to modify email templates  
✅ No code changes needed  
✅ Free tier sufficient for most  

### 2. Secure Your Webhooks
✅ Always set a secret key  
✅ Verify signatures in your endpoint  
✅ Use HTTPS only  

### 3. Monitor Webhook Logs
✅ Check Make.com history regularly  
✅ Set up error alerts  
✅ Test after any changes  

### 4. Group Events Logically
```
Endpoint 1: Admin notifications (all admin events)
Endpoint 2: Customer emails (all customer.* events)  
Endpoint 3: Slack alerts (critical events only)
```

---

## 🆘 Support & Resources

### Documentation
- **Make.com Docs:** https://make.com/en/help
- **n8n Docs:** https://docs.n8n.io
- **Zapier Docs:** https://zapier.com/help

### Example Make.com Templates
Will be added soon - check back!

### Questions?
Check the webhook logs in Admin Dashboard or Cloudflare Worker logs.

---

## 📝 Summary

### What You Did
1. ✅ Removed complex email integrations from worker
2. ✅ Implemented universal webhook system
3. ✅ Setup external automation (Make.com)
4. ✅ Reduced code complexity by 50%
5. ✅ Increased flexibility infinitely

### Result
- **Faster** worker response times
- **Cleaner** codebase
- **Flexible** email providers (any via Make.com)
- **Simple** configuration
- **Free** tier available

---

**Last Updated:** 2026-01-21  
**Version:** 3.0  
**Status:** Production Ready ✅
