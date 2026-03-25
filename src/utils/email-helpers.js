/**
 * Email Helpers - Consolidated email utilities
 */

export function buildEmailHtml(title, content, footer = '') {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:#111827;padding:20px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:600;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;color:#374151;font-size:16px;line-height:1.6;">
              ${content}
            </td>
          </tr>
          ${footer ? `
          <tr>
            <td style="padding:20px 30px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              ${footer}
            </td>
          </tr>
          ` : ''}
        </table>
        <p style="margin-top:20px;color:#9ca3af;font-size:12px;text-align:center;">
          &copy; ${new Date().getFullYear()} WishVideo. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function buildOrderEmailHtml(order, product, buyerInfo) {
  const content = `
    <p>Thank you for your order!</p>
    <table width="100%" cellpadding="10" cellspacing="0" style="margin:20px 0;border:1px solid #e5e7eb;border-radius:4px;">
      <tr>
        <td style="border-bottom:1px solid #e5e7eb;"><strong>Order ID</strong></td>
        <td style="border-bottom:1px solid #e5e7eb;">${order.order_id}</td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e5e7eb;"><strong>Product</strong></td>
        <td style="border-bottom:1px solid #e5e7eb;">${product?.title || 'N/A'}</td>
      </tr>
      <tr>
        <td style="border-bottom:1px solid #e5e7eb;"><strong>Amount</strong></td>
        <td style="border-bottom:1px solid #e5e7eb;">$${order.amount || '0.00'}</td>
      </tr>
      <tr>
        <td><strong>Delivery Time</strong></td>
        <td>${order.delivery_time_minutes || 60} minutes</td>
      </tr>
    </table>
    <p><strong>Delivery will be sent to:</strong></p>
    <p>Email: ${buyerInfo.email || 'N/A'}</p>
    ${buyerInfo.whatsapp ? `<p>WhatsApp: ${buyerInfo.whatsapp}</p>` : ''}
  `;

  return buildEmailHtml('Order Confirmed - WishVideo', content);
}

export function buildDeliveryEmailHtml(order, product, videoUrl) {
  const content = `
    <p>Great news! Your video is ready!</p>
    <p>Your order <strong>${order.order_id}</strong> has been delivered.</p>
    <div style="margin:30px 0;text-align:center;">
      <a href="${videoUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;padding:15px 30px;text-decoration:none;border-radius:8px;font-weight:600;">
        Watch Your Video
      </a>
    </div>
    <p style="color:#6b7280;font-size:14px;">
      If the button doesn't work, copy and paste this link:<br>
      ${videoUrl}
    </p>
  `;

  return buildEmailHtml('Your Video is Ready! - WishVideo', content);
}

export function buildContactFormEmail(name, email, message) {
  const content = `
    <p><strong>New Contact Form Submission</strong></p>
    <table width="100%" cellpadding="10" cellspacing="0">
      <tr>
        <td><strong>Name:</strong></td>
        <td>${name}</td>
      </tr>
      <tr>
        <td><strong>Email:</strong></td>
        <td>${email}</td>
      </tr>
      <tr>
        <td valign="top"><strong>Message:</strong></td>
        <td>${message}</td>
      </tr>
    </table>
  `;

  return buildEmailHtml('New Contact Form - WishVideo', content);
}

export function parseEmailTemplate(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}
