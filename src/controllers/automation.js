/**
 * Advanced Automation Controller v2.0
 * - Multiple webhook endpoints with routing
 * - Multiple email services with routing
 * - Notification type specific routing
 * - Low CPU, high performance with caching
 */

import { json } from '../utils/response.js';

// Notification types
const NOTIFICATION_TYPES = {
  NEW_ORDER: 'new_order',
  NEW_TIP: 'new_tip',
  NEW_REVIEW: 'new_review',
  BLOG_COMMENT: 'blog_comment',
  FORUM_QUESTION: 'forum_question',
  FORUM_REPLY: 'forum_reply',
  CHAT_MESSAGE: 'chat_message',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_REVISION_REQUESTED: 'order_revision_requested',
  CUSTOMER_ORDER_CONFIRMED: 'customer_order_confirmed',
  CUSTOMER_ORDER_DELIVERED: 'customer_order_delivered',
  CUSTOMER_CHAT_REPLY: 'customer_chat_reply',
  CUSTOMER_FORUM_REPLY: 'customer_forum_reply'
};

// In-memory config cache
let configCache = null;
let configCacheTime = 0;
const CACHE_TTL = 60000;

/**
 * Get automation config with caching
 */
async function getConfig(env, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && configCache && (now - configCacheTime) < CACHE_TTL) {
    return configCache;
  }
  
  try {
    const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('automation_config_v2').first();
    if (row?.value) {
      configCache = JSON.parse(row.value);
    } else {
      configCache = getDefaultConfig();
    }
    configCacheTime = now;
    return configCache;
  } catch (e) {
    console.error('Failed to load automation config:', e);
    return getDefaultConfig();
  }
}

function getDefaultConfig() {
  return {
    enabled: false,
    adminEmail: '',
    webhooks: [],
    emailServices: [],
    routing: {
      new_order: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      new_tip: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      new_review: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      blog_comment: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      forum_question: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      forum_reply: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      chat_message: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      order_delivered: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      order_revision_requested: { webhooks: [], emailService: null, adminEmail: true, enabled: true },
      customer_order_confirmed: { webhooks: [], emailService: null, adminEmail: false, enabled: true },
      customer_order_delivered: { webhooks: [], emailService: null, adminEmail: false, enabled: true },
      customer_chat_reply: { webhooks: [], emailService: null, adminEmail: false, enabled: true },
      customer_forum_reply: { webhooks: [], emailService: null, adminEmail: false, enabled: true }
    }
  };
}

/**
 * Save automation config
 */
async function saveConfig(env, config) {
  try {
    await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .bind('automation_config_v2', JSON.stringify(config))
      .run();
    configCache = config;
    configCacheTime = Date.now();
    return true;
  } catch (e) {
    console.error('Failed to save automation config:', e);
    return false;
  }
}

/**
 * API: Get automation config
 */
export async function getAutomationSettings(env) {
  try {
    const config = await getConfig(env, true);
    const safeConfig = JSON.parse(JSON.stringify(config));
    
    // Mask sensitive data
    safeConfig.emailServices = (safeConfig.emailServices || []).map(s => ({
      ...s,
      apiKey: s.apiKey ? '••••' + s.apiKey.slice(-4) : ''
    }));
    safeConfig.webhooks = (safeConfig.webhooks || []).map(w => ({
      ...w,
      secret: w.secret ? '••••••••' : ''
    }));
    
    return json({ success: true, config: safeConfig });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * API: Save automation config
 */
export async function saveAutomationSettings(env, body) {
  try {
    const currentConfig = await getConfig(env, true);
    const newConfig = body.config || body;
    
    // Preserve masked API keys
    if (newConfig.emailServices) {
      newConfig.emailServices = newConfig.emailServices.map(s => {
        if (s.apiKey?.startsWith('••••')) {
          const existing = currentConfig.emailServices?.find(e => e.id === s.id);
          s.apiKey = existing?.apiKey || '';
        }
        return s;
      });
    }
    
    if (newConfig.webhooks) {
      newConfig.webhooks = newConfig.webhooks.map(w => {
        if (w.secret === '••••••••') {
          const existing = currentConfig.webhooks?.find(e => e.id === w.id);
          w.secret = existing?.secret || '';
        }
        return w;
      });
    }
    
    const success = await saveConfig(env, newConfig);
    return json({ success });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * Log automation event
 */
async function logAutomation(env, type, target, title, message, status, response = '') {
  try {
    await env.DB.prepare(`
      INSERT INTO automation_logs (type, target, title, message, status, response, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(type, target || '', title || '', message || '', status, (response || '').substring(0, 500)).run();
  } catch (e) {
    console.error('Log error:', e);
  }
}

/**
 * Get automation logs
 */
export async function getAutomationLogs(env, limit = 50) {
  try {
    const r = await env.DB.prepare('SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT ?').bind(limit).all();
    return json({ success: true, logs: r.results || [] });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

/**
 * Clear automation logs
 */
export async function clearAutomationLogs(env) {
  try {
    await env.DB.prepare('DELETE FROM automation_logs').run();
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// =============================================
// WEBHOOK FUNCTIONS
// =============================================

async function sendWebhook(env, webhook, payload) {
  if (!webhook?.enabled || !webhook.url) return { success: false, error: 'Disabled' };
  
  try {
    let body, headers = { 'Content-Type': 'application/json' };
    
    switch (webhook.type) {
      case 'slack':
        body = JSON.stringify({
          text: payload.title,
          blocks: [
            { type: 'header', text: { type: 'plain_text', text: payload.title } },
            { type: 'section', text: { type: 'mrkdwn', text: payload.message } }
          ]
        });
        break;
        
      case 'discord':
        body = JSON.stringify({
          content: payload.title,
          embeds: [{ title: payload.title, description: payload.message, color: 0x667eea }]
        });
        break;
        
      case 'custom':
      default:
        if (webhook.headers) {
          try { headers = { ...headers, ...JSON.parse(webhook.headers) }; } catch (e) {}
        }
        if (webhook.secret) headers['X-Webhook-Secret'] = webhook.secret;
        
        // Custom body template support
        if (webhook.bodyTemplate) {
          body = webhook.bodyTemplate
            .replace(/\{\{notificationType\}\}/g, payload.notificationType || payload.type || '')
            .replace(/\{\{event\}\}/g, payload.event || '')
            .replace(/\{\{title\}\}/g, payload.title || '')
            .replace(/\{\{message\}\}/g, JSON.stringify(payload.message || '').slice(1,-1))
            .replace(/\{\{data\}\}/g, JSON.stringify(payload.data || {}))
            .replace(/\{\{buttonText\}\}/g, JSON.stringify(payload.buttonText || '').slice(1,-1))
            .replace(/\{\{buttonUrl\}\}/g, JSON.stringify(payload.buttonUrl || '').slice(1,-1))
            .replace(/\{\{timestamp\}\}/g, new Date().toISOString());
        } else {
          body = JSON.stringify({
            notificationType: payload.notificationType || null,
            event: payload.event,
            title: payload.title,
            message: payload.message,
            data: payload.data,
            buttonText: payload.buttonText || null,
            buttonUrl: payload.buttonUrl || null,
            timestamp: new Date().toISOString()
          });
        }
    }
    
    const res = await fetch(webhook.url, { method: webhook.method || 'POST', headers, body });
    const resText = await res.text();
    await logAutomation(env, 'webhook', webhook.name, payload.title, '', res.ok ? 'sent' : 'failed', resText);
    return { success: res.ok };
  } catch (e) {
    await logAutomation(env, 'webhook', webhook.name, payload.title, '', 'error', e.message);
    return { success: false, error: e.message };
  }
}

async function sendToWebhooks(env, webhookIds, payload, allWebhooks) {
  if (!webhookIds?.length) return [];
  const webhooks = allWebhooks.filter(w => webhookIds.includes(w.id) && w.enabled);
  const results = await Promise.allSettled(webhooks.map(w => sendWebhook(env, w, payload)));
  return results.map((r, i) => ({ webhook: webhooks[i].name, success: r.status === 'fulfilled' && r.value?.success }));
}

// =============================================
// EMAIL FUNCTIONS
// =============================================

async function sendEmail(env, service, to, subject, htmlBody, textBody) {
  if (!service?.enabled || !service.apiKey || !service.fromEmail) {
    return { success: false, error: 'Service not configured' };
  }
  
  const { type, apiKey, fromName, fromEmail } = service;
  
  try {
    let res;
    
    switch (type) {
      case 'resend':
        res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [to], subject, html: htmlBody, text: textBody })
        });
        break;
        
      case 'sendgrid':
        res = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: fromEmail, name: fromName },
            subject,
            content: [{ type: 'text/plain', value: textBody }, { type: 'text/html', value: htmlBody }]
          })
        });
        break;
        
      case 'mailgun':
        const domain = fromEmail.split('@')[1];
        const fd = new FormData();
        fd.append('from', `${fromName} <${fromEmail}>`);
        fd.append('to', to);
        fd.append('subject', subject);
        fd.append('html', htmlBody);
        fd.append('text', textBody);
        res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${btoa(`api:${apiKey}`)}` },
          body: fd
        });
        break;
        
      case 'postmark':
        res = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: { 'X-Postmark-Server-Token': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ From: `${fromName} <${fromEmail}>`, To: to, Subject: subject, HtmlBody: htmlBody, TextBody: textBody })
        });
        break;
        
      case 'brevo':
        res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email: to }], subject, htmlContent: htmlBody, textContent: textBody })
        });
        break;
        
      case 'elasticemail':
        res = await fetch('https://api.elasticemail.com/v4/emails', {
          method: 'POST',
          headers: { 'X-ElasticEmail-ApiKey': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Recipients: [{ Email: to }],
            Content: { From: fromEmail, FromName: fromName, Subject: subject, Body: [{ ContentType: 'HTML', Content: htmlBody }, { ContentType: 'PlainText', Content: textBody }] }
          })
        });
        break;
        
      case 'custom':
        if (!service.customUrl) return { success: false, error: 'Custom URL missing' };
        let headers = { 'Content-Type': 'application/json' };
        if (service.customHeaders) {
          try { headers = { ...headers, ...JSON.parse(service.customHeaders) }; } catch (e) {}
        }
        const replacePlaceholders = (str) => str
          .replace(/\{\{to\}\}/g, to)
          .replace(/\{\{subject\}\}/g, subject)
          .replace(/\{\{html\}\}/g, JSON.stringify(htmlBody).slice(1,-1))
          .replace(/\{\{text\}\}/g, JSON.stringify(textBody).slice(1,-1))
          .replace(/\{\{from_name\}\}/g, fromName)
          .replace(/\{\{from_email\}\}/g, fromEmail)
          .replace(/\{\{api_key\}\}/g, apiKey);
        
        for (const k of Object.keys(headers)) headers[k] = replacePlaceholders(String(headers[k]));
        res = await fetch(service.customUrl, {
          method: service.customMethod || 'POST',
          headers,
          body: replacePlaceholders(service.customBody || '{}')
        });
        break;
        
      default:
        return { success: false, error: `Unknown type: ${type}` };
    }
    
    const resText = await res.text();
    await logAutomation(env, 'email', to, subject, '', res.ok ? 'sent' : 'failed', resText);
    return { success: res.ok };
  } catch (e) {
    await logAutomation(env, 'email', to, subject, '', 'error', e.message);
    return { success: false, error: e.message };
  }
}

function generateEmailHTML(title, message, buttonText, buttonUrl) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#667eea,#764ba2);padding:30px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:24px;">${title}</h1></td></tr>
<tr><td style="padding:30px;"><div style="color:#333;font-size:15px;line-height:1.6;white-space:pre-line;">${message}</div>
${buttonText && buttonUrl ? `<div style="text-align:center;margin-top:25px;"><a href="${buttonUrl}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;">${buttonText}</a></div>` : ''}
</td></tr>
<tr><td style="background:#f9fafb;padding:15px;text-align:center;color:#666;font-size:12px;">Sent via WishesU</td></tr>
</table></td></tr></table></body></html>`;
}

// =============================================
// NOTIFICATION DISPATCHER
// =============================================

async function dispatchNotification(env, notificationType, payload, recipientEmail = null) {
  const config = await getConfig(env);
  if (!config.enabled) return { success: false, error: 'Automation disabled' };
  
  const routing = config.routing?.[notificationType];
  if (!routing?.enabled) return { success: false, error: 'Route disabled' };
  
  // Attach routing key for external webhook receivers
  const fullPayload = { ...payload, notificationType };

  const results = { webhooks: [], email: null };
  
  // Send webhooks (parallel)
  if (routing.webhooks?.length) {
    results.webhooks = await sendToWebhooks(env, routing.webhooks, fullPayload, config.webhooks || []);
  }
  
  // Send email
  const service = routing.emailService ? (config.emailServices || []).find(s => s.id === routing.emailService) : null;
  const to = recipientEmail || (routing.adminEmail ? config.adminEmail : null);
  
  if (to && (service || routing.adminEmail)) {
    const emailService = service || (config.emailServices || []).find(s => s.enabled);
    if (emailService) {
      const html = generateEmailHTML(payload.title, payload.message, payload.buttonText, payload.buttonUrl);
      results.email = await sendEmail(env, emailService, to, payload.title, html, payload.message);
    }
  }
  
  return { success: true, results };
}

// =============================================
// NOTIFICATION TRIGGERS
// =============================================

export async function notifyNewOrder(env, data) {
  return dispatchNotification(env, 'new_order', {
    event: 'new_order',
    title: '🎉 New Order Received!',
    message: `Order #${data.orderId || data.id}\nProduct: ${data.productTitle || data.product_title}\nAmount: $${data.amount || data.total}\nCustomer: ${data.customerName || data.customer_name}\nEmail: ${data.email}`,
    data,
    buttonText: 'View Order',
    buttonUrl: data.adminUrl || '/admin/dashboard.html#orders'
  });
}

export async function notifyNewTip(env, data) {
  return dispatchNotification(env, 'new_tip', {
    event: 'new_tip',
    title: '💰 New Tip Received!',
    message: `Amount: $${data.amount}\nFrom: ${data.name || 'Anonymous'}\nMessage: ${data.message || 'No message'}`,
    data
  });
}

export async function notifyNewReview(env, data) {
  return dispatchNotification(env, 'new_review', {
    event: 'new_review',
    title: '⭐ New Review!',
    message: `Product: ${data.productTitle || data.product_title}\nRating: ${'⭐'.repeat(data.rating || 5)}\nCustomer: ${data.customerName || data.customer_name}\nReview: ${data.reviewText || data.review_text || 'No comment'}`,
    data,
    buttonText: 'Manage Reviews',
    buttonUrl: '/admin/dashboard.html#reviews'
  });
}

export async function notifyBlogComment(env, data) {
  const postTitle = data?.postTitle || data?.post_title || data?.blogTitle || data?.blog_title || '';
  const authorName = data?.authorName || data?.author_name || data?.name || data?.author || '';
  const authorEmail = data?.email || data?.authorEmail || data?.author_email || '';
  const comment = data?.content || data?.comment || data?.message || '';

  return dispatchNotification(env, 'blog_comment', {
    event: 'blog_comment',
    title: '💬 New Blog Comment!',
    message: `Post: ${postTitle}\nAuthor: ${authorName}${authorEmail ? ` <${authorEmail}>` : ''}\nComment: ${comment}`,
    data,
    buttonText: 'Moderate',
    buttonUrl: '/admin/dashboard.html#blog-comments'
  });
}

export async function notifyForumQuestion(env, data) {
  const title = data?.title || '';
  const authorName = data?.authorName || data?.author_name || data?.name || '';
  const authorEmail = data?.email || data?.authorEmail || data?.author_email || '';
  const question = data?.content || data?.body || data?.message || '';
  const url = data?.url || (data?.id ? `/forum/question.html?id=${data.id}` : '/forum');

  return dispatchNotification(env, 'forum_question', {
    event: 'forum_question',
    title: '❓ New Forum Question!',
    message: `Title: ${title}\nAuthor: ${authorName}${authorEmail ? ` <${authorEmail}>` : ''}\nQuestion: ${question}`,
    data,
    buttonText: 'View',
    buttonUrl: url
  });
}

export async function notifyForumReply(env, data) {
  const questionTitle = data?.questionTitle || data?.question_title || '';
  const replyBy = data?.authorName || data?.author_name || data?.replyAuthorName || data?.name || '';
  const replyEmail = data?.email || data?.authorEmail || data?.author_email || '';
  const replyText = data?.content || data?.body || data?.replyContent || data?.reply || '';

  return dispatchNotification(env, 'forum_reply', {
    event: 'forum_reply',
    title: '💬 New Forum Reply!',
    message: `Question: ${questionTitle}\nReply by: ${replyBy}${replyEmail ? ` <${replyEmail}>` : ''}\nReply: ${replyText}`,
    data
  });
}

export async function notifyChatMessage(env, data) {
  const fromName = data?.senderName || data?.sender_name || data?.name || 'Customer';
  const fromEmail = data?.email || data?.senderEmail || data?.sender_email || '';
  const msg = data?.message || data?.content || '';
  return dispatchNotification(env, 'chat_message', {
    event: 'chat_message',
    title: '💬 New Chat Message!',
    message: `From: ${fromName}${fromEmail ? ` <${fromEmail}>` : ''}\nMessage: ${msg}`,
    data,
    buttonText: 'View Chats',
    buttonUrl: '/admin/dashboard.html#chats'
  });
}

export async function notifyOrderDeliveredAdmin(env, data) {
  const orderId = data?.orderId || data?.order_id || data?.id || '';
  const productTitle = data?.productTitle || data?.product_title || '';
  const email = data?.email || data?.customerEmail || data?.customer_email || '';
  return dispatchNotification(env, 'order_delivered', {
    event: 'order_delivered',
    title: '🎬 Order Delivered',
    message: `Order #${orderId}\nProduct: ${productTitle}\nCustomer: ${email}\nVideo: ${data.videoUrl || data.video_url || ''}`,
    data,
    buttonText: 'View Order',
    buttonUrl: data.adminUrl || '/admin/dashboard.html#orders'
  });
}

export async function notifyRevisionRequested(env, data) {
  const orderId = data?.orderId || data?.order_id || data?.id || '';
  const productTitle = data?.productTitle || data?.product_title || '';
  const email = data?.email || data?.customerEmail || data?.customer_email || '';
  const reason = data?.reason || data?.revision_reason || '';
  const count = data?.revisionCount || data?.revision_count || '';
  return dispatchNotification(env, 'order_revision_requested', {
    event: 'order_revision_requested',
    title: '🛠️ Revision Requested',
    message: `Order #${orderId}\nProduct: ${productTitle}\nCustomer: ${email}\nReason: ${reason}\nRevision #: ${count}`,
    data,
    buttonText: 'View Order',
    buttonUrl: data.adminUrl || '/admin/dashboard.html#orders'
  });
}

export async function notifyOrderDelivered(env, data) {
  return dispatchNotification(env, 'customer_order_delivered', {
    event: 'order_delivered',
    title: '🎬 Your Video is Ready!',
    message: `Hi ${data.customerName || 'there'}!\n\nYour video for "${data.productTitle || data.product_title}" is ready!\n\nClick below to view and download.`,
    data,
    buttonText: 'View Video',
    buttonUrl: data.deliveryUrl || data.delivery_url
  }, data.email);
}

export async function notifyCustomerOrderConfirmed(env, data) {
  return dispatchNotification(env, 'customer_order_confirmed', {
    event: 'order_confirmed',
    title: '✅ Order Confirmed!',
    message: `Hi ${data.customerName || 'there'}!\n\nThank you for your order!\n\nOrder #${data.orderId || data.order_id}\nProduct: ${data.productTitle || data.product_title}\nAmount: $${data.amount || data.total}\n\nWe'll notify you when ready!`,
    data,
    buttonText: 'Track Order',
    buttonUrl: data.trackingUrl || data.tracking_url
  }, data.email);
}

export async function notifyCustomerChatReply(env, data) {
  const toEmail = data?.customerEmail || data?.customer_email || data?.email || '';
  const customerName = data?.customerName || data?.customer_name || data?.name || 'there';
  const reply = data?.replyMessage || data?.reply_message || data?.replyContent || data?.reply || '';
  const chatUrl = data?.chatUrl || data?.chat_url || '/support';
  return dispatchNotification(env, 'customer_chat_reply', {
    event: 'chat_reply',
    title: '💬 New Reply!',
    message: `Hi ${customerName}!\n\nYou have a new reply:\n"${reply}"`,
    data,
    buttonText: 'View',
    buttonUrl: chatUrl
  }, toEmail);
}

export async function notifyCustomerForumReply(env, data) {
  const toEmail = data?.customerEmail || data?.customer_email || data?.questionAuthorEmail || data?.question_author_email || data?.email || '';
  const customerName = data?.customerName || data?.customer_name || data?.questionAuthorName || data?.question_author_name || 'there';
  const questionTitle = data?.questionTitle || data?.question_title || '';
  const replyContent = data?.replyContent || data?.reply_content || data?.reply || '';
  const slug = data?.questionSlug || data?.question_slug || '';
  const questionUrl = data?.questionUrl || data?.question_url || (slug ? `/forum/${slug}` : '/forum');
  return dispatchNotification(env, 'customer_forum_reply', {
    event: 'forum_reply',
    title: '💬 Reply to Your Question',
    message: `Hi ${customerName}!\n\nSomeone replied to "${questionTitle}":\n\n"${replyContent}"`,
    data,
    buttonText: 'View',
    buttonUrl: questionUrl
  }, toEmail);
}

// =============================================
// TEST FUNCTIONS
// =============================================

export async function testWebhook(env, webhookId) {
  const config = await getConfig(env, true);
  const webhook = (config.webhooks || []).find(w => w.id === webhookId);
  if (!webhook) return json({ success: false, error: 'Webhook not found' });
  
  const result = await sendWebhook(env, { ...webhook, enabled: true }, {
    event: 'test', title: '🧪 Test Notification', message: 'Test from WishesU Automation', data: { test: true }
  });
  return json(result);
}

export async function testEmail(env, serviceId, testEmail) {
  const config = await getConfig(env, true);
  const service = (config.emailServices || []).find(s => s.id === serviceId);
  if (!service) return json({ success: false, error: 'Service not found' });
  
  const to = testEmail || config.adminEmail;
  if (!to) return json({ success: false, error: 'No email address' });
  
  const html = generateEmailHTML('🧪 Test Email', 'This is a test email from WishesU Automation.\n\nIf you received this, your email service is configured correctly!', 'Dashboard', '/admin/dashboard.html');
  const result = await sendEmail(env, { ...service, enabled: true }, to, '🧪 Test Email - WishesU', html, 'Test email');
  return json(result);
}

export async function testNotification(env, body) {
  const testData = {
    new_order: { orderId: 'TEST-001', productTitle: 'Test Product', amount: 25, customerName: 'Test Customer', email: 'test@example.com' },
    new_tip: { amount: 10, name: 'Test Tipper', message: 'Great!' },
    new_review: { productTitle: 'Test Product', rating: 5, customerName: 'Happy Customer', reviewText: 'Amazing!' },
    blog_comment: { postTitle: 'Test Post', authorName: 'Commenter', email: 'commenter@example.com', content: 'Great article!' },
    forum_question: { title: 'Test Question', authorName: 'User', email: 'user@example.com', content: 'How does this work?' },
    forum_reply: { questionTitle: 'Test Question', authorName: 'Replier', email: 'replier@example.com', content: 'Here is an answer.' },
    chat_message: { senderName: 'Customer', email: 'customer@example.com', message: 'Hello!' },
    order_delivered: { orderId: 'TEST-001', productTitle: 'Test Product', email: 'customer@example.com', videoUrl: 'https://example.com/video.mp4' },
    order_revision_requested: { orderId: 'TEST-001', productTitle: 'Test Product', email: 'customer@example.com', reason: 'Please change name', revisionCount: 2 }
  };
  
  const data = testData[body.type] || testData.new_order;
  const fn = { new_order: notifyNewOrder, new_tip: notifyNewTip, new_review: notifyNewReview, blog_comment: notifyBlogComment, forum_question: notifyForumQuestion, forum_reply: notifyForumReply, chat_message: notifyChatMessage, order_delivered: notifyOrderDeliveredAdmin, order_revision_requested: notifyRevisionRequested };
  const result = await (fn[body.type] || notifyNewOrder)(env, data);
  return json(result);
}


// Export aliases for backward compatibility with import statements
export { notifyBlogComment as notifyNewBlogComment };
export { notifyChatMessage as notifyNewChatMessage };
export { notifyForumQuestion as notifyNewForumQuestion };
export { notifyForumReply as notifyNewForumReply };
export { notifyOrderDelivered as notifyCustomerOrderDelivered };

export { NOTIFICATION_TYPES };
