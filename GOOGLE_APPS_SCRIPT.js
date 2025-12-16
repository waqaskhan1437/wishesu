/**
 * ========================================
 * GOOGLE APPS SCRIPT - ORDER MANAGEMENT
 * ========================================
 *
 * Setup Instructions:
 * 1. Create new Google Sheet
 * 2. Extensions → Apps Script
 * 3. Copy this entire file
 * 4. Update NOTIFICATION_EMAIL and FROM_NAME
 * 5. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 6. Copy Web App URL and add to Admin Settings
 *
 * Features:
 * - Auto-sync orders to Google Sheets
 * - Send confirmation emails to customers
 * - Send notifications to admin
 * - Real-time webhook integration
 */

// ===== CONFIGURATION =====
const NOTIFICATION_EMAIL = 'your-gmail@gmail.com'; // Admin ka email
const FROM_NAME = 'Your Business Name';

/**
 * Handle POST requests from Cloudflare Worker (webhooks)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    Logger.log('📥 Webhook received:', JSON.stringify(data));

    if (data.event === 'order.created') {
      handleNewOrder(data.order);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Order processed successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.event === 'order.delivered') {
      handleOrderDelivered(data.order);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Delivery notification sent'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.event === 'order.revision_requested') {
      handleRevisionRequested(data.order);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Revision notification sent'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.event === 'sync.request') {
      syncAllData();
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Data synced successfully'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Unknown event type'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('❌ Error processing webhook:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle new order - add to sheet and send email
 */
function handleNewOrder(order) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Orders');

  if (!sheet) {
    sheet = ss.insertSheet('Orders');
    sheet.getRange(1, 1, 1, 8).setValues([[
      'Order ID', 'Product ID', 'Email', 'Amount ($)',
      'Status', 'Delivery Time (mins)', 'Created At', 'Archive URL'
    ]]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold')
      .setBackground('#4285f4').setFontColor('white');
  }

  let email = '';
  let amount = 0;
  let addons = [];

  try {
    if (order.encrypted_data) {
      const data = JSON.parse(order.encrypted_data);
      email = data.email || '';
      amount = data.amount || 0;
      addons = data.addons || [];
    }
  } catch (e) {
    Logger.log('Error parsing order data:', e);
  }

  sheet.appendRow([
    order.order_id,
    order.product_id,
    email,
    amount,
    order.status,
    order.delivery_time_minutes,
    order.created_at,
    order.archive_url || order.delivered_video_url || ''
  ]);

  Logger.log('✅ Order added to sheet:', order.order_id);

  if (email) {
    sendOrderConfirmationEmail(email, order.order_id, amount, addons);
  }

  sendAdminNotification(order.order_id, email, amount);
}

/**
 * Send order confirmation email to customer
 */
function sendOrderConfirmationEmail(customerEmail, orderId, amount, addons) {
  try {
    const subject = `✅ Order Confirmed - ${orderId}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4285f4; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Order Confirmed! 🎉</h1>
        </div>

        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Thank you for your order!</h2>
          <p>Your order has been received and is being processed.</p>

          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <p><strong>Order ID:</strong> ${orderId}</p>
            <p><strong>Amount:</strong> $${amount}</p>
            <p><strong>Status:</strong> Processing</p>
          </div>

          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">What happens next?</h3>
            <ol>
              <li>We'll start working on your order immediately</li>
              <li>You'll receive an email when it's ready</li>
              <li>Check your spam folder if you don't see it</li>
            </ol>
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Questions? Reply to this email or contact us at support@yourdomain.com
          </p>
        </div>

        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
        </div>
      </div>
    `;

    const plainBody = `
Order Confirmed! 🎉

Thank you for your order!

Order Details:
- Order ID: ${orderId}
- Amount: $${amount}
- Status: Processing

What happens next?
1. We'll start working on your order immediately
2. You'll receive an email when it's ready
3. Check your spam folder if you don't see it

Questions? Reply to this email or contact us.
    `;

    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: FROM_NAME
    });

    Logger.log('✅ Confirmation email sent to:', customerEmail);

  } catch (error) {
    Logger.log('❌ Error sending email:', error);
  }
}

/**
 * Handle order delivery - send notification to customer
 */
function handleOrderDelivered(order) {
  try {
    const orderId = order.order_id || 'Unknown';
    const customerEmail = order.email || '';
    const productTitle = order.product_title || 'Your Order';
    const videoUrl = order.delivered_video_url || '';

    if (!customerEmail) {
      Logger.log('⚠️ No email for delivered order:', orderId);
      return;
    }

    const subject = `🎉 Your Video is Ready! - Order #${orderId}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #10b981; margin-top: 0;">🎉 Your Video is Ready!</h2>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Great news! Your video for <strong>${productTitle}</strong> has been completed and is now ready to watch!
          </p>

          <div style="background: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 15px 0; color: #374151;">
              <a href="${videoUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                ▶️ Watch Your Video
              </a>
            </p>
            ${videoUrl ? `<small style="color: #6b7280;">Or copy this link: ${videoUrl}</small>` : ''}
          </div>

          <h3 style="color: #374151; margin-top: 30px;">What's Next?</h3>
          <ul style="color: #374151; line-height: 1.8;">
            <li>✅ Watch your video</li>
            <li>⭐ Leave a review if you love it</li>
            <li>💝 Consider leaving a tip (optional)</li>
            <li>📧 Request revisions if needed</li>
          </ul>

          <p style="color: #6b7280; margin-top: 30px; font-size: 14px;">
            Order ID: <strong>${orderId}</strong>
          </p>

          <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    const plainBody = `
Your video is ready!

Order ID: ${orderId}
Product: ${productTitle}

You can now watch your video. Check your order page for more details.

Thanks for your business!
    `;

    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: FROM_NAME
    });

    Logger.log('✅ Delivery notification sent to:', customerEmail);

  } catch (error) {
    Logger.log('❌ Error sending delivery notification:', error);
  }
}

/**
 * Handle revision request - notify admin and customer
 */
function handleRevisionRequested(order) {
  try {
    const orderId = order.order_id || 'Unknown';
    const customerEmail = order.email || '';
    const productTitle = order.product_title || 'Your Order';
    const reason = order.revision_reason || 'No specific reason provided';
    const revisionCount = order.revision_count || 1;

    if (!customerEmail) {
      Logger.log('⚠️ No email for revision request:', orderId);
      return;
    }

    // Send to customer
    const subject = `🔄 Revision Requested - Order #${orderId}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #f59e0b; margin-top: 0;">🔄 Revision Requested</h2>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We've received your revision request for <strong>${productTitle}</strong> (Order #${orderId}).
          </p>

          <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #92400e;">Your Feedback:</h4>
            <p style="color: #374151; margin: 10px 0; padding: 10px; background: white; border-radius: 6px; border-left: 4px solid #f59e0b;">
              "${reason}"
            </p>
          </div>

          <p style="color: #374151; line-height: 1.6;">
            Revision #${revisionCount} - We'll get started on your changes right away and send you an update soon!
          </p>

          <div style="background: #f3f4f6; border-radius: 8px; padding: 15px; margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</p>
          </div>
        </div>
      </div>
    `;

    const plainBody = `
Revision Requested

Order ID: ${orderId}
Product: ${productTitle}
Revision #: ${revisionCount}

Your feedback:
"${reason}"

We'll get started on your changes right away!
    `;

    MailApp.sendEmail({
      to: customerEmail,
      subject: subject,
      body: plainBody,
      htmlBody: htmlBody,
      name: FROM_NAME
    });

    Logger.log('✅ Revision notification sent to:', customerEmail);

    // Also notify admin
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: `🔔 Revision Requested: ${orderId}`,
      body: `
A customer has requested a revision!

Order ID: ${orderId}
Customer: ${customerEmail}
Product: ${productTitle}
Revision #: ${revisionCount}

Reason:
"${reason}"

Please check your system for details.
      `,
      name: FROM_NAME
    });

  } catch (error) {
    Logger.log('❌ Error sending revision notification:', error);
  }
}

/**
 * Send notification to admin about new order
 */
function sendAdminNotification(orderId, customerEmail, amount) {
  try {
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: `🔔 New Order: ${orderId}`,
      body: `
New order received!

Order ID: ${orderId}
Customer: ${customerEmail}
Amount: ${amount}

Check your Google Sheet for full details.
      `,
      name: FROM_NAME
    });

    Logger.log('✅ Admin notification sent');

  } catch (error) {
    Logger.log('❌ Error sending admin notification:', error);
  }
}

/**
 * Sync all data from API (manual sync)
 */
function syncAllData() {
  const API_URL = 'https://newwebsite.waqaskhan1437.workers.dev/api/admin/export-data';

  try {
    const response = UrlFetchApp.fetch(API_URL);
    const data = JSON.parse(response.getContentText());

    if (!data.success) {
      throw new Error('API returned error');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    updateOrdersSheet(ss, data.data.orders || []);
    updateEmailsSheet(ss, data.data.emails || []);
    updateProductsSheet(ss, data.data.products || []);
    updateMetadataSheet(ss, data.timestamp);

    Logger.log('✅ Full sync completed');

  } catch (error) {
    Logger.log('❌ Sync error:', error);
    throw error;
  }
}

function updateOrdersSheet(ss, orders) {
  let sheet = ss.getSheetByName('Orders');

  if (!sheet) {
    sheet = ss.insertSheet('Orders');
  }

  sheet.clear();

  const headers = [
    'Order ID', 'Product ID', 'Email', 'Amount ($)',
    'Status', 'Delivery Time (mins)', 'Created At', 'Archive URL'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold')
    .setBackground('#4285f4').setFontColor('white');

  if (orders.length > 0) {
    const rows = orders.map(order => {
      let email = '';
      let amount = 0;
      try {
        if (order.encrypted_data) {
          const data = JSON.parse(order.encrypted_data);
          email = data.email || '';
          amount = data.amount || 0;
        }
      } catch (e) {}

      return [
        order.order_id || '',
        order.product_id || '',
        email,
        amount,
        order.status || '',
        order.delivery_time_minutes || '',
        order.created_at || '',
        order.archive_url || order.delivered_video_url || ''
      ];
    });

    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, headers.length);
  Logger.log('✅ Orders sheet updated: ' + orders.length + ' rows');
}

function updateEmailsSheet(ss, emails) {
  let sheet = ss.getSheetByName('Emails');

  if (!sheet) {
    sheet = ss.insertSheet('Emails');
  }

  sheet.clear();

  const headers = ['Email', 'First Order', 'Total Orders'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold')
    .setBackground('#34a853').setFontColor('white');

  if (emails.length > 0) {
    const rows = emails.map(item => [
      item.email || '',
      item.first_order || '',
      item.total_orders || 0
    ]);

    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, headers.length);
  Logger.log('✅ Emails sheet updated: ' + emails.length + ' rows');
}

function updateProductsSheet(ss, products) {
  let sheet = ss.getSheetByName('Products');

  if (!sheet) {
    sheet = ss.insertSheet('Products');
  }

  sheet.clear();

  const headers = ['ID', 'Title', 'Slug', 'Normal Price ($)', 'Sale Price ($)', 'Status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold')
    .setBackground('#fbbc04').setFontColor('white');

  if (products.length > 0) {
    const rows = products.map(product => [
      product.id || '',
      product.title || '',
      product.slug || '',
      product.normal_price || 0,
      product.sale_price || 0,
      product.status || ''
    ]);

    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.autoResizeColumns(1, headers.length);
  Logger.log('✅ Products sheet updated: ' + products.length + ' rows');
}

function updateMetadataSheet(ss, timestamp) {
  let sheet = ss.getSheetByName('Sync Info');

  if (!sheet) {
    sheet = ss.insertSheet('Sync Info');
  }

  sheet.clear();

  const headers = ['Property', 'Value'];
  sheet.getRange(1, 1, 1, 2).setValues([headers]);
  sheet.getRange(1, 1, 1, 2).setFontWeight('bold')
    .setBackground('#ea4335').setFontColor('white');

  const now = new Date();
  const data = [
    ['Last Sync', now.toLocaleString()],
    ['API Timestamp', new Date(timestamp).toLocaleString()],
    ['Status', '✅ Success']
  ];

  sheet.getRange(2, 1, data.length, 2).setValues(data);
  sheet.autoResizeColumns(1, 2);
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📊 Order Management')
    .addItem('🔄 Sync All Data', 'syncAllData')
    .addItem('📧 Test Email', 'testEmail')
    .addToUi();
}

function testEmail() {
  sendOrderConfirmationEmail(
    NOTIFICATION_EMAIL,
    'TEST-123',
    25.00,
    []
  );
  SpreadsheetApp.getUi().alert('✅ Test email sent to: ' + NOTIFICATION_EMAIL);
}
