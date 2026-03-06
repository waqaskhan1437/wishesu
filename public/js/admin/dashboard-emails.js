/**
 * Emails Admin Module
 *
 * This dashboard module allows store owners to manage email templates for
 * transactional and marketing communications. Templates are stored
 * server-side and injected when events occur (order placed, order delivered,
 * chat message received, or marketing outreach). The module also renders
 * simple forms for editing each template and saves changes via API calls.
 * 
 * NEW: Manual Email Sending - Send custom emails directly to users
 */

(function(AD) {
  // Local helper: show toast notification at top‑right of page
  function toast(msg, ok = true) {
    const el = document.getElementById('emails-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = ok ? '#10b981' : '#ef4444';
    setTimeout(() => (el.style.display = 'none'), 3000);
  }

  // Fetch helper with JSON parsing and error handling
  async function jfetch(url, opts = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      ...opts
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || 'Request failed');
    }
    return res.json();
  }

  // Define template types and friendly labels
  const TEMPLATE_DEFINITIONS = [
    {
      type: 'order_confirmation',
      title: 'Order Confirmation',
      description: 'Sent immediately after an order is placed, confirming the order details.'
    },
    {
      type: 'order_delivered',
      title: 'Order Delivered',
      description: 'Notifies customers when their order has been delivered or completed.'
    },
    {
      type: 'chat_notification',
      title: 'Chat Notification',
      description: 'Alerts customers when a new chat message is sent from support or sellers.'
    },
    {
      type: 'marketing',
      title: 'Marketing & Promotions',
      description: 'Used for marketing newsletters, promotions, and abandoned checkout reminders.'
    }
  ];

  /**
   * Load email templates into the admin panel. It fetches existing templates
   * from the backend and populates the form fields. If a template does not
   * exist, the fields remain blank for the admin to fill in.
   *
   * @param {HTMLElement} panel The main content panel to render into
   */
  async function loadEmails(panel) {
    panel.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:20px;">
        <div id="emails-toast" style="display:none;position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:10px;color:white;font-weight:600;z-index:1000;"></div>
        
        <!-- SEND EMAIL SECTION -->
        <div style="margin-bottom:30px;">
          <h2 style="margin:0 0 8px;font-size:28px;color:#1f2937;">📧 Send Email</h2>
          <p style="margin:0;color:#6b7280;font-size:15px;">Send custom emails directly to users.</p>
        </div>
        
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:35px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #3b82f6;">
          <h3 style="margin:0 0 15px;font-size:18px;color:#1f2937;">✉️ Compose New Email</h3>
          
          <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;font-size:14px;">
              To (Recipient Email) <span style="color:#ef4444;">*</span>
            </label>
            <input id="send-to" type="email" placeholder="customer@example.com" 
              style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;" />
          </div>
          
          <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;font-size:14px;">
              Subject <span style="color:#ef4444;">*</span>
            </label>
            <input id="send-subject" type="text" placeholder="Enter email subject..." 
              style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;" />
          </div>
          
          <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;font-size:14px;">
              Message <span style="color:#ef4444;">*</span>
            </label>
            <textarea id="send-message" rows="8" placeholder="Type your message here..."
              style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;resize:vertical;"></textarea>
            <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">Plain text is supported. Line breaks will be preserved.</p>
          </div>
          
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
            <input type="checkbox" id="send-html" style="width:18px;height:18px;cursor:pointer;" />
            <label for="send-html" style="cursor:pointer;color:#374151;font-size:14px;">
              Send as HTML (allows HTML tags in message)
            </label>
          </div>
          
          <button class="btn btn-primary" id="send-email-btn" 
            style="padding:12px 24px;border-radius:10px;font-size:15px;font-weight:600;background:#3b82f6;color:white;border:none;cursor:pointer;"
            onclick="AdminDashboard.sendManualEmail()">
            🚀 Send Email
          </button>
          <span id="send-status" style="margin-left:15px;font-size:14px;color:#6b7280;"></span>
        </div>
        
        <hr style="border:none;border-top:2px solid #e5e7eb;margin:30px 0;">
        
        <!-- EMAIL TEMPLATES SECTION -->
        <div style="margin-bottom:30px;">
          <h2 style="margin:0 0 8px;font-size:28px;color:#1f2937;">✉️ Email Templates</h2>
          <p style="margin:0;color:#6b7280;font-size:15px;">Create and manage email templates for orders, delivery, chats and marketing.</p>
        </div>
        <div id="email-templates-container"></div>
      </div>
    `;
    
    const container = panel.querySelector('#email-templates-container');
    // Fetch existing templates
    let existing = [];
    try {
      const data = await jfetch('/api/admin/email-templates');
      existing = data.templates || [];
    } catch (e) {
      toast('❌ Failed to load templates', false);
    }
    const map = {};
    existing.forEach(t => { map[t.type] = t; });
    // Build cards
    let html = '';
    TEMPLATE_DEFINITIONS.forEach(def => {
      const tpl = map[def.type] || {};
      const subject = tpl.subject || '';
      const body = tpl.body || '';
      html += `
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 10px;font-size:20px;color:#1f2937;">${def.title}</h3>
          <p style="margin:0 0 15px;color:#6b7280;font-size:14px;">${def.description}</p>
          <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;font-size:14px;">Subject</label>
            <input id="subject-${def.type}" type="text" value="${subject.replace(/"/g, '&quot;')}" style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;" />
          </div>
          <div style="margin-bottom:15px;">
            <label style="display:block;margin-bottom:5px;font-weight:600;color:#374151;font-size:14px;">Body (HTML supported)</label>
            <textarea id="body-${def.type}" rows="6" style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;">${body.replace(/<\//g, '<\/')}</textarea>
            <p style="margin:6px 0 0;font-size:12px;color:#6b7280;">Use placeholders like <code>{{order_id}}</code>, <code>{{customer_name}}</code>, <code>{{product_name}}</code> etc.</p>
          </div>
          <button class="btn btn-primary" style="padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;" onclick="AdminDashboard.saveEmailTemplate('${def.type}')">💾 Save</button>
        </div>
      `;
    });
    container.innerHTML = html;
    toast('✅ Templates loaded', true);
  }

  /**
   * Save a single email template. Reads values from the form based on type
   * and posts them to the backend. Shows a toast on success or error.
   *
   * @param {string} type Template type identifier
   */
  async function saveEmailTemplate(type) {
    const panel = document.getElementById('main-panel');
    const subjEl = panel.querySelector(`#subject-${type}`);
    const bodyEl = panel.querySelector(`#body-${type}`);
    if (!subjEl || !bodyEl) {
      toast('❌ Cannot find template fields', false);
      return;
    }
    const payload = {
      type,
      subject: subjEl.value.trim(),
      body: bodyEl.value.trim()
    };
    try {
      await jfetch('/api/admin/email-templates', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      toast(`✅ ${type.replace(/_/g, ' ')} template saved!`, true);
    } catch (e) {
      toast('❌ Failed to save template', false);
    }
  }

  /**
   * Send a manual email to a recipient.
   * Reads values from the send email form and posts to the backend.
   */
  async function sendManualEmail() {
    const panel = document.getElementById('main-panel');
    const toEl = panel.querySelector('#send-to');
    const subjectEl = panel.querySelector('#send-subject');
    const messageEl = panel.querySelector('#send-message');
    const htmlEl = panel.querySelector('#send-html');
    const btnEl = panel.querySelector('#send-email-btn');
    const statusEl = panel.querySelector('#send-status');

    if (!toEl || !subjectEl || !messageEl) {
      toast('❌ Cannot find email form fields', false);
      return;
    }

    const to = toEl.value.trim();
    const subject = subjectEl.value.trim();
    const message = messageEl.value.trim();
    const isHtml = htmlEl ? htmlEl.checked : false;

    // Validation
    if (!to) {
      toast('❌ Please enter recipient email', false);
      toEl.focus();
      return;
    }
    if (!to.includes('@')) {
      toast('❌ Please enter a valid email address', false);
      toEl.focus();
      return;
    }
    if (!subject) {
      toast('❌ Please enter subject', false);
      subjectEl.focus();
      return;
    }
    if (!message) {
      toast('❌ Please enter message', false);
      messageEl.focus();
      return;
    }

    // Disable button during send
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.style.opacity = '0.7';
      btnEl.textContent = '⏳ Sending...';
    }
    if (statusEl) {
      statusEl.textContent = 'Sending email...';
      statusEl.style.color = '#6b7280';
    }

    const payload = {
      to: to,
      subject: subject,
      message: message,
      html: isHtml
    };

    try {
      const result = await jfetch('/api/admin/send-email', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (result.success) {
        toast('✅ Email sent successfully!', true);
        if (statusEl) {
          statusEl.textContent = '✅ Sent to ' + to;
          statusEl.style.color = '#10b981';
        }
        // Clear form
        toEl.value = '';
        subjectEl.value = '';
        messageEl.value = '';
        if (htmlEl) htmlEl.checked = false;
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (e) {
      console.error('Send email error:', e);
      toast('❌ Failed to send: ' + e.message, false);
      if (statusEl) {
        statusEl.textContent = '❌ Failed: ' + e.message;
        statusEl.style.color = '#ef4444';
      }
    } finally {
      // Re-enable button
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.style.opacity = '1';
        btnEl.textContent = '🚀 Send Email';
      }
    }
  }

  // Expose functions to AdminDashboard
  AD.loadEmails = loadEmails;
  AD.saveEmailTemplate = saveEmailTemplate;
  AD.sendManualEmail = sendManualEmail;
})(window.AdminDashboard = window.AdminDashboard || {});
