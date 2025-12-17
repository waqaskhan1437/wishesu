# 🚀 INTEGRATION GUIDE - CodeWords Notifications

## What's Included
✅ Fixed video player (universal-player.js)
✅ Fixed container sizing (order-detail.js)
✅ Enhanced Google Apps Script (colorful sheets!)
✅ CodeWords Notification Hub (deployed)

## Setup Google Apps Script

1. Open your Google Sheet
2. Extensions → Apps Script  
3. Paste code from: ENHANCED_GOOGLE_APPS_SCRIPT.js
4. Deploy → Web app (Execute as: Me, Access: Anyone)
5. Your URL: https://script.google.com/macros/s/AKfycbwzpStpsHoOzMR38cM00Fd7U-KKgTm7jgqBjmb8ANnnbnFwLreYbJTGQXuO_ziFmR7t1Q/exec

## Connect to CodeWords

Add this to your worker.js:

```javascript
// Send notifications via CodeWords
async function notifyCustomer(eventType, orderData, env) {
  const response = await fetch('https://runtime.codewords.ai/run/customer_notification_hub_a4cf4393', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': env.CODEWORDS_API_KEY
    },
    body: JSON.stringify({
      event_type: eventType,
      customer_email: orderData.email,
      customer_phone: orderData.phone,
      order_id: orderData.orderId,
      product_title: orderData.productTitle,
      customer_name: orderData.customerName,
      order_total: orderData.orderTotal,
      video_url: orderData.videoUrl || '',
      order_detail_url: orderData.orderDetailUrl || ''
    })
  });
}

// Call when order created:
await notifyCustomer('order.created', {...}, env);

// Call when video delivered:
await notifyCustomer('order.delivered', {...}, env);
```

Get API key: https://codewords.agemo.ai/account/settings

## Deploy

```bash
npm run deploy
```

Done! 🎉
