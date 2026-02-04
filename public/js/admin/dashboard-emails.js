/**
 * Emails Admin Module
 *
 * This dashboard module allows store owners to manage email templates for
 * transactional and marketing communications. Templates are stored
 * server-side and injected when events occur (order placed, order delivered,
 * chat message received, or marketing outreach). The module also renders
 * simple forms for editing each template and saves changes via API calls.
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
        <div style="margin-bottom:30px;">
          <h2 style="margin:0 0 8px;font-size:28px;color:#1f2937;">✉️ Email Templates</h2>
          <p style="margin:0;color:#6b7280;font-size:15px;">Create and manage emails for orders, delivery, chats and marketing.</p>
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

  // Expose functions to AdminDashboard
  AD.loadEmails = loadEmails;
  AD.saveEmailTemplate = saveEmailTemplate;
})(window.AdminDashboard = window.AdminDashboard || {});