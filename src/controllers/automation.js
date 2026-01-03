/**
 * Automation Controller
 * Handles all automated notifications, webhooks, and alerts
 * - Admin alerts (tips, reviews, comments, forum activity)
 * - Customer alerts (chat replies, forum replies, order updates)
 * - Webhook integrations (Slack, Discord, custom webhooks)
 * - Email notifications via external services
 */

import { json } from '../utils/response.js';

// Notification types
const NOTIFICATION_TYPES = {
  // Admin alerts
  NEW_ORDER: 'new_order',
  NEW_TIP: 'new_tip',
  NEW_REVIEW: 'new_review',
  NEW_BLOG_COMMENT: 'new_blog_comment',
  NEW_FORUM_QUESTION: 'new_forum_question',
  NEW_FORUM_REPLY: 'new_forum_reply',
  NEW_CHAT_MESSAGE: 'new_chat_message',
  ORDER_DELIVERED: 'order_delivered',
  
  // Customer alerts
  CUSTOMER_ORDER_CONFIRMED: 'customer_order_confirmed',
  CUSTOMER_ORDER_DELIVERED: 'customer_order_delivered',
  CUSTOMER_CHAT_REPLY: 'customer_chat_reply',
  CUSTOMER_FORUM_REPLY: 'customer_forum_reply',
  CUSTOMER_REVIEW_APPROVED: 'customer_review_approved'
};

/**
 * Get automation settings
 */
export async function getAutomationSettings(env) {
  try {
    const settings = {};
    const keys = [
      'automation_enabled',
      'admin_email',
      'admin_webhook_url',
      'admin_webhook_type',
      'admin_alert_new_order',
      'admin_alert_new_tip',
      'admin_alert_new_review',
      'admin_alert_blog_comment',
      'admin_alert_forum_question',
      'admin_alert_forum_reply',
      'admin_alert_chat_message',
      'customer_email_enabled',
      'customer_email_order_confirmed',
      'customer_email_order_delivered',
      'customer_email_chat_reply',
      'customer_email_forum_reply',
      'email_service',
      'email_api_key',
      'email_from_name',
      'email_from_address',
      'custom_email_api_url',
      'custom_email_api_method',
      'custom_email_api_headers',
      'custom_email_api_body',
      'slack_webhook_url',
      'discord_webhook_url',
      'custom_webhook_url',
      'custom_webhook_secret'
    ];
    
    for (const key of keys) {
      const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
      settings[key] = row?.value || '';
    }
    
    return json({ success: true, settings });
  } catch (e) {
    console.error('Get automation settings error:', e);
    return json({ error: e.message }, 500);
  }
}

/**
 * Save automation settings
 */
export async function saveAutomationSettings(env, body) {
  try {
    const allowedKeys = [
      'automation_enabled',
      'admin_email',
      'admin_webhook_url',
      'admin_webhook_type',
      'admin_alert_new_order',
      'admin_alert_new_tip',
      'admin_alert_new_review',
      'admin_alert_blog_comment',
      'admin_alert_forum_question',
      'admin_alert_forum_reply',
      'admin_alert_chat_message',
      'customer_email_enabled',
      'customer_email_order_confirmed',
      'customer_email_order_delivered',
      'customer_email_chat_reply',
      'customer_email_forum_reply',
      'email_service',
      'email_api_key',
      'email_from_name',
      'email_from_address',
      'custom_email_api_url',
      'custom_email_api_method',
      'custom_email_api_headers',
      'custom_email_api_body',
      'slack_webhook_url',
      'discord_webhook_url',
      'custom_webhook_url',
      'custom_webhook_secret'
    ];
    
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
        ).bind(key, String(body[key])).run();
      }
    }
    
    return json({ success: true, message: 'Automation settings saved' });
  } catch (e) {
    console.error('Save automation settings error:', e);
    return json({ error: e.message }, 500);
  }
}

/**
 * Get automation logs
 */
export async function getAutomationLogs(env, limit = 50) {
  try {
    // Create logs table if not exists
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        recipient TEXT,
        subject TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    const result = await env.DB.prepare(`
      SELECT * FROM automation_logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `).bind(limit).all();
    
    return json({ success: true, logs: result.results || [] });
  } catch (e) {
    console.error('Get automation logs error:', e);
    return json({ error: e.message }, 500);
  }
}

/**
 * Log automation event
 */
async function logAutomation(env, type, recipient, subject, message, status, response) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS automation_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        recipient TEXT,
        subject TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    await env.DB.prepare(`
      INSERT INTO automation_logs (type, recipient, subject, message, status, response)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(type, recipient || '', subject || '', message || '', status, response || '').run();
  } catch (e) {
    console.error('Log automation error:', e);
  }
}

/**
 * Get setting value
 */
async function getSetting(env, key) {
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
    return row?.value || '';
  } catch (e) {
    return '';
  }
}

/**
 * Check if automation is enabled for a specific type
 */
async function isEnabled(env, settingKey) {
  const enabled = await getSetting(env, 'automation_enabled');
  if (enabled !== 'true' && enabled !== '1') return false;
  
  const specific = await getSetting(env, settingKey);
  return specific === 'true' || specific === '1';
}

/**
 * Send webhook notification (Slack, Discord, or Custom)
 */
async function sendWebhook(env, type, data) {
  try {
    const webhookType = await getSetting(env, 'admin_webhook_type');
    let webhookUrl = '';
    
    switch (webhookType) {
      case 'slack':
        webhookUrl = await getSetting(env, 'slack_webhook_url');
        break;
      case 'discord':
        webhookUrl = await getSetting(env, 'discord_webhook_url');
        break;
      case 'custom':
        webhookUrl = await getSetting(env, 'custom_webhook_url');
        break;
      default:
        webhookUrl = await getSetting(env, 'admin_webhook_url');
    }
    
    if (!webhookUrl) return { success: false, error: 'No webhook URL configured' };
    
    let payload;
    const timestamp = new Date().toISOString();
    
    // Format based on webhook type
    if (webhookType === 'slack') {
      payload = {
        text: data.title,
        blocks: [
          {
            type: 'header',
            text: { type: 'plain_text', text: data.title, emoji: true }
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: data.message }
          },
          {
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `Type: *${type}* | ${timestamp}` }
            ]
          }
        ]
      };
      if (data.link) {
        payload.blocks.push({
          type: 'actions',
          elements: [{
            type: 'button',
            text: { type: 'plain_text', text: 'View Details' },
            url: data.link
          }]
        });
      }
    } else if (webhookType === 'discord') {
      payload = {
        embeds: [{
          title: data.title,
          description: data.message,
          color: data.color || 5814783, // Purple default
          timestamp: timestamp,
          footer: { text: `Type: ${type}` },
          url: data.link || undefined
        }]
      };
    } else {
      // Custom webhook - send raw data
      payload = {
        type: type,
        title: data.title,
        message: data.message,
        link: data.link,
        data: data.extra || {},
        timestamp: timestamp
      };
      
      // Add secret if configured
      const secret = await getSetting(env, 'custom_webhook_secret');
      if (secret) {
        payload.secret = secret;
      }
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const responseText = await response.text();
    await logAutomation(env, `webhook_${type}`, webhookUrl, data.title, data.message, 
      response.ok ? 'sent' : 'failed', responseText);
    
    return { success: response.ok, status: response.status, response: responseText };
  } catch (e) {
    console.error('Webhook error:', e);
    await logAutomation(env, `webhook_${type}`, '', data.title, data.message, 'error', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Send email notification
 */
async function sendEmail(env, to, subject, htmlBody, textBody) {
  try {
    const service = await getSetting(env, 'email_service');
    const apiKey = await getSetting(env, 'email_api_key');
    const fromName = await getSetting(env, 'email_from_name') || 'WishesU';
    const fromEmail = await getSetting(env, 'email_from_address');
    
    if (!service || !apiKey || !fromEmail) {
      return { success: false, error: 'Email service not configured' };
    }
    
    let response;
    
    switch (service) {
      case 'resend':
        response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [to],
            subject: subject,
            html: htmlBody,
            text: textBody
          })
        });
        break;
        
      case 'sendgrid':
        response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail, name: fromName },
            subject: subject,
            content: [
              { type: 'text/plain', value: textBody },
              { type: 'text/html', value: htmlBody }
            ]
          })
        });
        break;
        
      case 'mailgun':
        const domain = fromEmail.split('@')[1];
        const formData = new FormData();
        formData.append('from', `${fromName} <${fromEmail}>`);
        formData.append('to', to);
        formData.append('subject', subject);
        formData.append('html', htmlBody);
        formData.append('text', textBody);
        
        response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${apiKey}`)}`
          },
          body: formData
        });
        break;
        
      case 'postmark':
        response = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'X-Postmark-Server-Token': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            From: `${fromName} <${fromEmail}>`,
            To: to,
            Subject: subject,
            HtmlBody: htmlBody,
            TextBody: textBody
          })
        });
        break;
      
      case 'custom':
        // Custom API - allows any email service
        const customUrl = await getSetting(env, 'custom_email_api_url');
        const customMethod = await getSetting(env, 'custom_email_api_method') || 'POST';
        const customHeadersStr = await getSetting(env, 'custom_email_api_headers') || '{}';
        const customBodyTemplate = await getSetting(env, 'custom_email_api_body') || '';
        
        if (!customUrl) {
          return { success: false, error: 'Custom API URL not configured' };
        }
        
        // Parse headers JSON
        let customHeaders = {};
        try {
          customHeaders = JSON.parse(customHeadersStr);
        } catch (e) {
          console.warn('Failed to parse custom headers:', e);
        }
        
        // Add content-type if not specified
        if (!customHeaders['Content-Type'] && !customHeaders['content-type']) {
          customHeaders['Content-Type'] = 'application/json';
        }
        
        // Replace placeholders in body template
        // Available: {{to}}, {{subject}}, {{html}}, {{text}}, {{from_name}}, {{from_email}}, {{api_key}}
        let customBody = customBodyTemplate
          .replace(/\{\{to\}\}/g, to)
          .replace(/\{\{subject\}\}/g, subject)
          .replace(/\{\{html\}\}/g, JSON.stringify(htmlBody).slice(1, -1)) // Escape for JSON
          .replace(/\{\{text\}\}/g, JSON.stringify(textBody).slice(1, -1))
          .replace(/\{\{from_name\}\}/g, fromName)
          .replace(/\{\{from_email\}\}/g, fromEmail)
          .replace(/\{\{api_key\}\}/g, apiKey);
        
        // Replace placeholders in headers too
        const processedHeaders = {};
        for (const [key, value] of Object.entries(customHeaders)) {
          processedHeaders[key] = String(value)
            .replace(/\{\{api_key\}\}/g, apiKey)
            .replace(/\{\{from_email\}\}/g, fromEmail);
        }
        
        response = await fetch(customUrl, {
          method: customMethod,
          headers: processedHeaders,
          body: customBody
        });
        break;
        
      default:
        return { success: false, error: `Unknown email service: ${service}` };
    }
    
    const responseText = await response.text();
    await logAutomation(env, 'email', to, subject, textBody.substring(0, 200), 
      response.ok ? 'sent' : 'failed', responseText);
    
    return { success: response.ok, status: response.status };
  } catch (e) {
    console.error('Email error:', e);
    await logAutomation(env, 'email', to, subject, '', 'error', e.message);
    return { success: false, error: e.message };
  }
}

/**
 * Generate email HTML template
 */
function generateEmailHTML(title, message, buttonText, buttonUrl, footerText) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">🎬 WishesU</h1>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <h2 style="color:#1f2937;margin:0 0 15px 0;">${title}</h2>
      <p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">${message}</p>
      ${buttonUrl ? `
      <div style="text-align:center;margin:25px 0;">
        <a href="${buttonUrl}" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;">
          ${buttonText || 'View Details'}
        </a>
      </div>
      ` : ''}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:25px 0;">
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        ${footerText || 'This is an automated notification from WishesU.'}
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ==================== ADMIN NOTIFICATIONS ====================

/**
 * Notify admin of new order
 */
export async function notifyNewOrder(env, orderData) {
  if (!await isEnabled(env, 'admin_alert_new_order')) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '💰 New Order Received!';
  const message = `
**Order ID:** ${orderData.orderId}
**Product:** ${orderData.productTitle || 'N/A'}
**Amount:** $${orderData.amount || 0}
**Email:** ${orderData.email || 'N/A'}
  `.trim();
  
  // Send webhook
  await sendWebhook(env, NOTIFICATION_TYPES.NEW_ORDER, {
    title,
    message,
    link: `${baseUrl}/admin/dashboard.html#orders`,
    color: 3066993, // Green
    extra: orderData
  });
  
  // Send email to admin
  const adminEmail = await getSetting(env, 'admin_email');
  if (adminEmail) {
    await sendEmail(env, adminEmail, title,
      generateEmailHTML(title, message.replace(/\n/g, '<br>').replace(/\*\*/g, ''), 'View Order', `${baseUrl}/admin/dashboard.html#orders`),
      message.replace(/\*\*/g, '')
    );
  }
}

/**
 * Notify admin of new tip
 */
export async function notifyNewTip(env, tipData) {
  if (!await isEnabled(env, 'admin_alert_new_tip')) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '💝 New Tip Received!';
  const message = `
**Order ID:** ${tipData.orderId}
**Tip Amount:** $${tipData.amount || 0}
**From:** ${tipData.email || 'Anonymous'}
  `.trim();
  
  await sendWebhook(env, NOTIFICATION_TYPES.NEW_TIP, {
    title,
    message,
    link: `${baseUrl}/admin/dashboard.html#orders`,
    color: 15844367, // Gold
    extra: tipData
  });
  
  const adminEmail = await getSetting(env, 'admin_email');
  if (adminEmail) {
    await sendEmail(env, adminEmail, title,
      generateEmailHTML(title, message.replace(/\n/g, '<br>').replace(/\*\*/g, ''), 'View Order', `${baseUrl}/admin/dashboard.html#orders`),
      message.replace(/\*\*/g, '')
    );
  }
}

/**
 * Notify admin of new review
 */
export async function notifyNewReview(env, reviewData) {
  if (!await isEnabled(env, 'admin_alert_new_review')) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '⭐ New Product Review!';
  const stars = '⭐'.repeat(reviewData.rating || 5);
  const message = `
**Product:** ${reviewData.productTitle || 'N/A'}
**Rating:** ${stars} (${reviewData.rating}/5)
**Author:** ${reviewData.authorName || 'Anonymous'}
**Comment:** ${(reviewData.comment || '').substring(0, 200)}
  `.trim();
  
  await sendWebhook(env, NOTIFICATION_TYPES.NEW_REVIEW, {
    title,
    message,
    link: `${baseUrl}/admin/dashboard.html#reviews`,
    color: 16776960, // Yellow
    extra: reviewData
  });
  
  const adminEmail = await getSetting(env, 'admin_email');
  if (adminEmail) {
    await sendEmail(env, adminEmail, title,
      generateEmailHTML(title, message.replace(/\n/g, '<br>').replace(/\*\*/g, ''), 'Review & Approve', `${baseUrl}/admin/dashboard.html#reviews`),
      message.replace(/\*\*/g, '')
    );
  }
}

/**
 * Notify admin of new blog comment
 */
export async function notifyNewBlogComment(env, commentData) {
  if (!await isEnabled(env, 'admin_alert_blog_comment')) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '📝 New Blog Comment!';
  const message = `
**Blog:** ${commentData.blogTitle || 'N/A'}
**Author:** ${commentData.name || 'Anonymous'}
**Email:** ${commentData.email || 'N/A'}
**Comment:** ${(commentData.comment || '').substring(0, 200)}
  `.trim();
  
  await sendWebhook(env, NOTIFICATION_TYPES.NEW_BLOG_COMMENT, {
    title,
    message,
    link: `${baseUrl}/admin/dashboard.html#blog-comments`,
    color: 3447003, // Blue
    extra: commentData
  });
  
  const adminEmail = await getSetting(env, 'admin_email');
  if (adminEmail) {
    await sendEmail(env, adminEmail, title,
      generateEmailHTML(title, message.replace(/\n/g, '<br>').replace(/\*\*/g, ''), 'Review & Approve', `${baseUrl}/admin/dashboard.html#blog-comments`),
      message.replace(/\*\*/g, '')
    );
  }
}

/**
 * Notify admin of new forum question
 */
export async function notifyNewForumQuestion(env, questionData) {
  if (!await isEnabled(env, 'admin_alert_forum_question')) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '❓ New Forum Question!';
  const message = `
**Title:** ${questionData.title || 'N/A'}
**Author:** ${questionData.name || 'Anonymous'}
**Email:** ${questionData.email || 'N/A'}
**Question:** ${(questionData.content || '').substring(0, 200)}
  `.trim();
  
  await sendWebhook(env, NOTIFICATION_TYPES.NEW_FORUM_QUESTION, {
    title,
    message,
    link: `${baseUrl}/admin/dashboard.html#forum`,
    color: 10181046, // Purple
    extra: questionData
  });
  
  const adminEmail = await getSetting(env, 'admin_email');
  if (adminEmail) {
    await sendEmail(env, adminEmail, title,
      generateEmailHTML(title, message.replace(/\n/g, '<br>').replace(/\*\*/g, ''), 'Review & Approve', `${baseUrl}/admin/dashboard.html#forum`),
      message.replace(/\*\*/g, '')
    );
  }
}

/**
 * Notify admin of new forum reply
 */
export async function notifyNewForumReply(env, replyData) {
  if (!await isEnabled(env, 'admin_alert_forum_reply')) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '💬 New Forum Reply!';
  const message = `
**Question:** ${replyData.questionTitle || 'N/A'}
**Reply By:** ${replyData.name || 'Anonymous'}
**Email:** ${replyData.email || 'N/A'}
**Reply:** ${(replyData.content || '').substring(0, 200)}
  `.trim();
  
  await sendWebhook(env, NOTIFICATION_TYPES.NEW_FORUM_REPLY, {
    title,
    message,
    link: `${baseUrl}/admin/dashboard.html#forum`,
    color: 10181046, // Purple
    extra: replyData
  });
  
  const adminEmail = await getSetting(env, 'admin_email');
  if (adminEmail) {
    await sendEmail(env, adminEmail, title,
      generateEmailHTML(title, message.replace(/\n/g, '<br>').replace(/\*\*/g, ''), 'Review & Approve', `${baseUrl}/admin/dashboard.html#forum`),
      message.replace(/\*\*/g, '')
    );
  }
}

/**
 * Notify admin of new chat message
 */
export async function notifyNewChatMessage(env, chatData) {
  if (!await isEnabled(env, 'admin_alert_chat_message')) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '💬 New Support Message!';
  const message = `
**From:** ${chatData.name || 'Customer'}
**Email:** ${chatData.email || 'N/A'}
**Message:** ${(chatData.content || '').substring(0, 200)}
  `.trim();
  
  await sendWebhook(env, NOTIFICATION_TYPES.NEW_CHAT_MESSAGE, {
    title,
    message,
    link: `${baseUrl}/admin/dashboard.html#chats`,
    color: 15105570, // Orange
    extra: chatData
  });
  
  const adminEmail = await getSetting(env, 'admin_email');
  if (adminEmail) {
    await sendEmail(env, adminEmail, title,
      generateEmailHTML(title, message.replace(/\n/g, '<br>').replace(/\*\*/g, ''), 'Reply Now', `${baseUrl}/admin/dashboard.html#chats`),
      message.replace(/\*\*/g, '')
    );
  }
}

// ==================== CUSTOMER NOTIFICATIONS ====================

/**
 * Send order confirmation to customer
 */
export async function notifyCustomerOrderConfirmed(env, orderData) {
  if (!await isEnabled(env, 'customer_email_order_confirmed')) return;
  if (!orderData.email) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '🎉 Order Confirmed!';
  const message = `
Thank you for your order! We've received your request and are working on it.

<strong>Order ID:</strong> ${orderData.orderId}<br>
<strong>Product:</strong> ${orderData.productTitle || 'Custom Video'}<br>
<strong>Amount:</strong> $${orderData.amount || 0}<br>
<strong>Estimated Delivery:</strong> ${orderData.deliveryTime || '24 hours'}

You can track your order status anytime using the link below.
  `.trim();
  
  await sendEmail(env, orderData.email, title,
    generateEmailHTML(title, message, 'Track Your Order', `${baseUrl}/order/${orderData.orderId}`, 'Thank you for choosing WishesU!'),
    message.replace(/<[^>]*>/g, '')
  );
}

/**
 * Send delivery notification to customer
 */
export async function notifyCustomerOrderDelivered(env, orderData) {
  if (!await isEnabled(env, 'customer_email_order_delivered')) return;
  if (!orderData.email) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '🎬 Your Video is Ready!';
  const message = `
Great news! Your personalized video is ready for viewing.

<strong>Order ID:</strong> ${orderData.orderId}<br>
<strong>Product:</strong> ${orderData.productTitle || 'Custom Video'}

Click the button below to watch your video. We hope you love it!

If you're happy with your video, we'd really appreciate a review ⭐
  `.trim();
  
  await sendEmail(env, orderData.email, title,
    generateEmailHTML(title, message, '🎬 Watch Your Video', `${baseUrl}/order/${orderData.orderId}`, 'Thank you for choosing WishesU!'),
    message.replace(/<[^>]*>/g, '')
  );
}

/**
 * Send chat reply notification to customer
 */
export async function notifyCustomerChatReply(env, chatData) {
  if (!await isEnabled(env, 'customer_email_chat_reply')) return;
  if (!chatData.email) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '💬 New Reply to Your Message';
  const message = `
Hi ${chatData.name || 'there'},

You have a new reply to your support message:

<div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #667eea;">
${(chatData.replyContent || '').substring(0, 500)}
</div>

Click below to continue the conversation.
  `.trim();
  
  await sendEmail(env, chatData.email, title,
    generateEmailHTML(title, message, 'View Conversation', baseUrl, 'This is an automated notification. Please do not reply to this email.'),
    message.replace(/<[^>]*>/g, '')
  );
}

/**
 * Send forum reply notification to question author
 */
export async function notifyCustomerForumReply(env, replyData) {
  if (!await isEnabled(env, 'customer_email_forum_reply')) return;
  if (!replyData.questionAuthorEmail) return;
  
  const baseUrl = env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev';
  const title = '💬 New Reply to Your Question';
  const message = `
Hi ${replyData.questionAuthorName || 'there'},

Someone replied to your forum question: <strong>"${replyData.questionTitle}"</strong>

<div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:15px 0;border-left:4px solid #667eea;">
<strong>${replyData.replyAuthorName || 'Someone'}:</strong><br>
${(replyData.replyContent || '').substring(0, 500)}
</div>

Click below to view the full discussion.
  `.trim();
  
  await sendEmail(env, replyData.questionAuthorEmail, title,
    generateEmailHTML(title, message, 'View Discussion', `${baseUrl}/forum/${replyData.questionSlug}`, 'This is an automated notification.'),
    message.replace(/<[^>]*>/g, '')
  );
}

/**
 * Test automation settings
 */
export async function testAutomation(env, type) {
  try {
    const testData = {
      title: '🧪 Test Notification',
      message: 'This is a test notification from your WishesU automation system.\n\nIf you see this, your setup is working correctly!',
      link: env.SITE_URL || 'https://wishesu1.waqaskhan1437.workers.dev',
      color: 5814783
    };
    
    if (type === 'webhook') {
      const result = await sendWebhook(env, 'test', testData);
      return json(result);
    } else if (type === 'email') {
      const adminEmail = await getSetting(env, 'admin_email');
      if (!adminEmail) {
        return json({ success: false, error: 'Admin email not configured' });
      }
      const result = await sendEmail(env, adminEmail, testData.title,
        generateEmailHTML(testData.title, testData.message.replace(/\n/g, '<br>'), 'Visit Site', testData.link),
        testData.message
      );
      return json(result);
    }
    
    return json({ success: false, error: 'Invalid test type' });
  } catch (e) {
    return json({ success: false, error: e.message });
  }
}

/**
 * Clear automation logs
 */
export async function clearAutomationLogs(env) {
  try {
    await env.DB.prepare('DELETE FROM automation_logs').run();
    return json({ success: true, message: 'Logs cleared' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
