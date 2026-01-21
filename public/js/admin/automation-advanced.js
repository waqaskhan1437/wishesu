/**
 * Advanced Automation Settings UI v2.0
 * Lightweight, fast, low CPU usage
 */

(function() {
  'use strict';

  // Debug: confirm that the latest automation module loaded (helps diagnose caching)
  console.log('[AdvAutomation] Loaded automation-advanced.js v23');
  
  let config = null;
  
  const NOTIFICATION_TYPES = {
    new_order: { icon: '🎉', label: 'New Order', desc: 'When customer places order' },
    new_tip: { icon: '💰', label: 'New Tip', desc: 'When customer sends tip' },
    new_review: { icon: '⭐', label: 'New Review', desc: 'When review submitted' },
    blog_comment: { icon: '📝', label: 'Blog Comment', desc: 'New blog comment' },
    forum_question: { icon: '❓', label: 'Forum Question', desc: 'New forum question' },
    forum_reply: { icon: '💬', label: 'Forum Reply', desc: 'Forum reply posted' },
    chat_message: { icon: '💬', label: 'Chat Message', desc: 'New support chat' },
    customer_order_confirmed: { icon: '✅', label: 'Order Confirmed', desc: 'To customer on order' },
    customer_order_delivered: { icon: '🎬', label: 'Order Delivered', desc: 'To customer when ready' },
    customer_chat_reply: { icon: '💬', label: 'Chat Reply', desc: 'To customer on chat reply' },
    customer_forum_reply: { icon: '💬', label: 'Forum Reply', desc: 'To customer on forum reply' }
  };
  
  const EMAIL_TYPES = [
    { id: 'resend', name: 'Resend', desc: 'Fast & reliable' },
    { id: 'sendgrid', name: 'SendGrid', desc: 'Enterprise grade' },
    { id: 'mailgun', name: 'Mailgun', desc: 'Developer friendly' },
    { id: 'postmark', name: 'Postmark', desc: 'Transactional focus' },
    { id: 'brevo', name: 'Brevo', desc: 'Free tier available' },
    { id: 'elasticemail', name: 'Elastic Email', desc: 'Budget friendly' },
    { id: 'custom', name: 'Custom API', desc: 'Any HTTP API' }
  ];
  
  const WEBHOOK_TYPES = [
    { id: 'slack', name: 'Slack', desc: 'Team notifications' },
    { id: 'discord', name: 'Discord', desc: 'Community alerts' },
    { id: 'google_chat', name: 'Google Chat', desc: 'Google Chat rooms' },
    { id: 'custom', name: 'Custom', desc: 'Any webhook URL' }
  ];

  function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
  }

  async function loadConfig() {
    try {
      const res = await fetch('/api/admin/automation/settings');
      const data = await res.json();
    config = data.config || getDefaultConfig();
    // ensure subscriptions array exists for older configs
    if (!config.subscriptions) {
      config.subscriptions = [];
    }
    } catch (e) {
      console.error('Load config error:', e);
      config = getDefaultConfig();
    }
    return config;
  }

  function getDefaultConfig() {
    return {
      enabled: false,
      adminEmail: '',
      // webhook subscriptions: each subscription includes topics (events) it listens to
      subscriptions: [],
      emailServices: [],
      // routing used only for email configuration per event
      routing: Object.keys(NOTIFICATION_TYPES).reduce((acc, k) => {
        acc[k] = {
          emailService: null,
          adminEmail: k.startsWith('customer_') ? false : true,
          enabled: true
        };
        return acc;
      }, {})
    };
  }

  async function saveConfig() {
    try {
      const res = await fetch('/api/admin/automation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });
      const data = await res.json();
      return data.success;
    } catch (e) {
      console.error('Save error:', e);
      return false;
    }
  }

  function openModal() {
    loadConfig().then(() => renderModal());
  }

  function closeModal() {
    const modal = document.getElementById('adv-auto-modal');
    if (modal) modal.remove();
  }

  function renderModal() {
    closeModal();
    
    const modal = document.createElement('div');
    modal.id = 'adv-auto-modal';
    modal.innerHTML = `
      <style>
        #adv-auto-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;animation:aafade .15s}
        @keyframes aafade{from{opacity:0}to{opacity:1}}
        .aa-modal{background:#1a1a2e;border-radius:16px;width:95%;max-width:1100px;max-height:90vh;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.5);display:flex;flex-direction:column}
        .aa-header{background:linear-gradient(135deg,#667eea,#764ba2);padding:20px 25px;display:flex;justify-content:space-between;align-items:center}
        .aa-header h2{margin:0;color:#fff;font-size:1.3em;display:flex;align-items:center;gap:10px}
        .aa-close{background:rgba(255,255,255,0.2);border:none;color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;transition:all .15s}
        .aa-close:hover{background:rgba(255,255,255,0.3);transform:scale(1.1)}
        .aa-body{display:flex;flex:1;overflow:hidden}
        .aa-sidebar{width:200px;background:#16162a;padding:15px;border-right:1px solid #2d2d4a;overflow-y:auto}
        .aa-nav-btn{width:100%;padding:12px 15px;margin:4px 0;background:transparent;border:none;border-radius:8px;color:#9ca3af;text-align:left;cursor:pointer;font-size:13px;transition:all .1s;display:flex;align-items:center;gap:8px}
        .aa-nav-btn:hover{background:#2d2d4a;color:#fff}
        .aa-nav-btn.active{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
        .aa-content{flex:1;padding:20px;overflow-y:auto;background:#0d0d1a}
        .aa-panel{display:none}
        .aa-panel.active{display:block}
        .aa-card{background:#1a1a2e;border-radius:12px;padding:18px;margin-bottom:15px;border:1px solid #2d2d4a}
        .aa-card h3{margin:0 0 12px;color:#fff;font-size:1em;display:flex;align-items:center;gap:8px}
        .aa-card p{margin:0 0 15px;color:#9ca3af;font-size:0.85em}
        .aa-row{display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap}
        .aa-col{flex:1;min-width:200px}
        .aa-label{display:block;color:#9ca3af;font-size:12px;margin-bottom:6px}
        .aa-input,.aa-select{width:100%;padding:10px 12px;background:#0d0d1a;border:1px solid #2d2d4a;border-radius:8px;color:#fff;font-size:13px;box-sizing:border-box}
        .aa-input:focus,.aa-select:focus{outline:none;border-color:#667eea}
        .aa-textarea{width:100%;padding:10px;background:#0d0d1a;border:1px solid #2d2d4a;border-radius:8px;color:#fff;font-size:12px;font-family:monospace;resize:vertical;min-height:80px;box-sizing:border-box}
        .aa-btn{padding:10px 18px;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;transition:all .1s}
        .aa-btn-primary{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
        .aa-btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(102,126,234,0.4)}
        .aa-btn-success{background:#10b981;color:#fff}
        .aa-btn-danger{background:#ef4444;color:#fff}
        .aa-btn-ghost{background:transparent;border:1px solid #2d2d4a;color:#9ca3af}
        .aa-btn-ghost:hover{border-color:#667eea;color:#fff}
        .aa-btn-sm{padding:6px 12px;font-size:12px}
        .aa-toggle{display:flex;align-items:center;gap:10px;padding:12px;background:#0d0d1a;border-radius:8px;margin-bottom:8px;cursor:pointer;border:1px solid transparent;transition:all .1s}
        .aa-toggle:hover{border-color:#2d2d4a}
        .aa-toggle input{width:16px;height:16px;accent-color:#667eea}
        .aa-toggle-label{flex:1}
        .aa-toggle-label strong{color:#fff;font-size:13px}
        .aa-toggle-label span{display:block;color:#6b7280;font-size:11px;margin-top:2px}
        .aa-list{max-height:300px;overflow-y:auto}
        .aa-list-item{display:flex;align-items:center;gap:10px;padding:12px;background:#0d0d1a;border-radius:8px;margin-bottom:8px;border:1px solid #2d2d4a}
        .aa-list-item-info{flex:1}
        .aa-list-item-name{color:#fff;font-weight:600;font-size:13px}
        .aa-list-item-type{color:#6b7280;font-size:11px}
        .aa-badge{padding:3px 8px;border-radius:4px;font-size:10px;font-weight:600}
        .aa-badge-on{background:#10b981;color:#fff}
        .aa-badge-off{background:#6b7280;color:#fff}
        .aa-routing-grid{display:grid;gap:8px}
        .aa-routing-row{display:grid;grid-template-columns:180px 1fr 1fr 80px 50px;gap:10px;align-items:center;padding:10px;background:#0d0d1a;border-radius:8px;font-size:12px}
        .aa-routing-row.header{background:transparent;color:#6b7280;font-weight:600;padding:8px 10px}
        .aa-routing-label{display:flex;align-items:center;gap:6px;color:#fff}
        .aa-routing-label span{font-size:16px}
        .aa-multi-select{position:relative}
        .aa-multi-btn{padding:8px 10px;background:#0d0d1a;border:1px solid #2d2d4a;border-radius:6px;color:#9ca3af;font-size:12px;cursor:pointer;text-align:left;width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .aa-multi-btn:hover{border-color:#667eea}
        .aa-multi-dropdown{position:absolute;top:100%;left:0;right:0;background:#1a1a2e;border:1px solid #2d2d4a;border-radius:8px;padding:8px;z-index:100;display:none;max-height:200px;overflow-y:auto}
        .aa-multi-dropdown.show{display:block}
        .aa-multi-opt{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;cursor:pointer;color:#fff;font-size:12px}
        .aa-multi-opt:hover{background:#2d2d4a}
        .aa-multi-opt input{width:14px;height:14px;accent-color:#667eea}
        .aa-footer{padding:15px 20px;background:#16162a;border-top:1px solid #2d2d4a;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
        .aa-status{color:#6b7280;font-size:12px}
        .aa-log-item{padding:10px;background:#0d0d1a;border-radius:6px;margin-bottom:6px;font-size:12px;border-left:3px solid #667eea}
        .aa-log-item.error{border-left-color:#ef4444}
        .aa-log-item.sent{border-left-color:#10b981}
        .aa-log-time{color:#6b7280}
        .aa-log-title{color:#fff;margin:4px 0}
        .aa-log-target{color:#9ca3af}
        @media(max-width:768px){.aa-body{flex-direction:column}.aa-sidebar{width:100%;border-right:none;border-bottom:1px solid #2d2d4a;display:flex;overflow-x:auto;padding:10px}.aa-nav-btn{white-space:nowrap}.aa-routing-row{grid-template-columns:1fr;gap:6px}}
      </style>
      <div class="aa-modal">
        <div class="aa-header">
          <h2>⚡ Advanced Automation</h2>
          <button class="aa-close" onclick="window.AdvAutomation.close()">&times;</button>
        </div>
        <div class="aa-body">
          <div class="aa-sidebar">
            <button class="aa-nav-btn active" data-panel="general">⚙️ General</button>
            <button class="aa-nav-btn" data-panel="webhooks">🔗 Webhooks</button>
            <button class="aa-nav-btn" data-panel="email">📧 Email</button>
            <button class="aa-nav-btn" data-panel="routing">🔀 Routing</button>
            <button class="aa-nav-btn" data-panel="logs">📋 Logs</button>
          </div>
          <div class="aa-content" id="aa-content"></div>
        </div>
        <div class="aa-footer">
          <div class="aa-status" id="aa-status">Ready</div>
          <div style="display:flex;gap:10px">
            <button class="aa-btn aa-btn-ghost" onclick="window.AdvAutomation.close()">Cancel</button>
            <button class="aa-btn aa-btn-primary" onclick="window.AdvAutomation.save()">💾 Save All</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup nav
    modal.querySelectorAll('.aa-nav-btn').forEach(btn => {
      btn.onclick = () => {
        modal.querySelectorAll('.aa-nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderPanel(btn.dataset.panel);
      };
    });
    
    // Close on backdrop click
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    renderPanel('general');
  }

  function renderPanel(panel) {
    const content = document.getElementById('aa-content');
    if (!content) return;
    
    switch (panel) {
      case 'general': content.innerHTML = renderGeneralPanel(); break;
      case 'webhooks': content.innerHTML = renderWebhooksPanel(); break;
      case 'email': content.innerHTML = renderEmailPanel(); break;
      case 'routing': content.innerHTML = renderRoutingPanel(); break;
      case 'logs': content.innerHTML = renderLogsPanel(); loadLogs(); break;
    }
    
    setupPanelHandlers(panel);
  }

  function renderGeneralPanel() {
    return `
      <div class="aa-panel active">
        <div class="aa-card">
          <h3>⚡ Automation Status</h3>
          <label class="aa-toggle">
            <input type="checkbox" id="aa-enabled" ${config.enabled ? 'checked' : ''}>
            <div class="aa-toggle-label">
              <strong>Enable Automation</strong>
              <span>Turn on/off all automated notifications</span>
            </div>
          </label>
        </div>
        
        <div class="aa-card">
          <h3>👤 Admin Email</h3>
          <p>Primary email for admin notifications</p>
          <input type="email" class="aa-input" id="aa-admin-email" value="${config.adminEmail || ''}" placeholder="admin@yourdomain.com">
        </div>
        
        <div class="aa-card">
          <h3>📊 Quick Stats</h3>
          <div class="aa-row">
            <div class="aa-col" style="text-align:center;padding:15px">
              <div style="font-size:2em;color:#667eea">${(config.subscriptions || []).filter(s => s.enabled).length}</div>
              <div style="color:#6b7280;font-size:12px">Active Webhooks</div>
            </div>
            <div class="aa-col" style="text-align:center;padding:15px">
              <div style="font-size:2em;color:#10b981">${(config.emailServices || []).filter(s => s.enabled).length}</div>
              <div style="color:#6b7280;font-size:12px">Email Services</div>
            </div>
            <div class="aa-col" style="text-align:center;padding:15px">
              <div style="font-size:2em;color:#f59e0b">${Object.values(config.routing || {}).filter(r => r.enabled).length}</div>
              <div style="color:#6b7280;font-size:12px">Active Routes</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderWebhooksPanel() {
    const subs = config.subscriptions || [];
    return `
      <div class="aa-panel active">
        <div class="aa-card">
          <h3>🔗 Webhook Subscriptions</h3>
          <p>Create endpoints and select which notifications they receive</p>
          <button class="aa-btn aa-btn-primary aa-btn-sm" onclick="window.AdvAutomation.addSubscription()">+ Add Webhook</button>
        </div>
        <div class="aa-list" id="aa-webhooks-list">
          ${subs.length === 0 ? '<div style="text-align:center;padding:30px;color:#6b7280">No webhooks configured</div>' : 
            subs.map((s, i) => `
              <div class="aa-card" data-idx="${i}">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
                  <div>
                    <strong style="color:#fff">${s.name || 'Unnamed'}</strong>
                    <span class="aa-badge ${s.enabled ? 'aa-badge-on' : 'aa-badge-off'}" style="margin-left:8px">${s.enabled ? 'ON' : 'OFF'}</span>
                    <div style="color:#6b7280;font-size:11px;margin-top:4px">${s.type?.toUpperCase() || 'CUSTOM'} • ${s.url?.substring(0,40) || 'No URL'}...</div>
                    <div style="color:#6b7280;font-size:11px;margin-top:2px">${s.topics?.length || 0} events selected</div>
                  </div>
                  <div>
                    <button class="aa-btn aa-btn-success aa-btn-sm" onclick="window.AdvAutomation.testWebhookById('${s.id}')">Test</button>
                    <button class="aa-btn aa-btn-ghost aa-btn-sm" onclick="window.AdvAutomation.editSubscription(${i})">Edit</button>
                    <button class="aa-btn aa-btn-danger aa-btn-sm" onclick="window.AdvAutomation.deleteSubscription(${i})">×</button>
                  </div>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  function renderEmailPanel() {
    const services = config.emailServices || [];
    return `
      <div class="aa-panel active">
        <div class="aa-card">
          <h3>📧 Email Services</h3>
          <p>Configure multiple email providers for different notification types</p>
          <button class="aa-btn aa-btn-primary aa-btn-sm" onclick="window.AdvAutomation.addEmailService()">+ Add Email Service</button>
        </div>
        
        <div class="aa-list" id="aa-email-list">
          ${services.length === 0 ? '<div style="text-align:center;padding:30px;color:#6b7280">No email services configured</div>' : 
            services.map((s, i) => `
              <div class="aa-card" data-idx="${i}">
                <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
                  <div>
                    <strong style="color:#fff">${s.name || EMAIL_TYPES.find(t => t.id === s.type)?.name || 'Email Service'}</strong>
                    <span class="aa-badge ${s.enabled ? 'aa-badge-on' : 'aa-badge-off'}" style="margin-left:8px">${s.enabled ? 'ON' : 'OFF'}</span>
                    <div style="color:#6b7280;font-size:11px;margin-top:4px">${s.type?.toUpperCase() || 'CUSTOM'} • ${s.fromEmail || 'No sender email'}</div>
                  </div>
                  <div>
                    <button class="aa-btn aa-btn-success aa-btn-sm" onclick="window.AdvAutomation.testEmailService(${i})">Test</button>
                    <button class="aa-btn aa-btn-ghost aa-btn-sm" onclick="window.AdvAutomation.editEmailService(${i})">Edit</button>
                    <button class="aa-btn aa-btn-danger aa-btn-sm" onclick="window.AdvAutomation.deleteEmailService(${i})">×</button>
                  </div>
                </div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  function renderRoutingPanel() {
    // Display routing for email only; webhooks are handled via subscriptions automatically
    const services = config.emailServices || [];
    return `
      <div class="aa-panel active">
        <div class="aa-card">
          <h3>🔀 Notification Routing</h3>
          <p>Assign email services and admin notifications per event. Webhook subscriptions are configured separately.</p>
        </div>
        <div class="aa-card" style="overflow-x:auto">
          <div class="aa-routing-grid">
            <div class="aa-routing-row header">
              <div>Notification</div>
              <div>Email Service</div>
              <div>Admin</div>
              <div>On</div>
            </div>
            ${Object.entries(NOTIFICATION_TYPES).map(([key, info]) => {
              const route = config.routing?.[key] || { emailService: null, adminEmail: !key.startsWith('customer_'), enabled: true };
              return `
                <div class="aa-routing-row" data-route="${key}">
                  <div class="aa-routing-label"><span>${info.icon}</span> ${info.label}</div>
                  <select class="aa-select" data-field="emailService" style="padding:8px">
                    <option value="">None</option>
                    ${services.map(s => `<option value="${s.id}" ${route.emailService === s.id ? 'selected' : ''}>${s.name || s.type}</option>`).join('')}
                  </select>
                  <input type="checkbox" data-field="adminEmail" ${route.adminEmail ? 'checked' : ''} style="width:18px;height:18px;accent-color:#667eea">
                  <input type="checkbox" data-field="enabled" ${route.enabled ? 'checked' : ''} style="width:18px;height:18px;accent-color:#10b981">
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function renderLogsPanel() {
    return `
      <div class="aa-panel active">
        <div class="aa-card">
          <h3>📋 Automation Logs</h3>
          <p>Recent automation activity</p>
          <div style="display:flex;gap:10px;margin-top:10px">
            <button class="aa-btn aa-btn-ghost aa-btn-sm" onclick="window.AdvAutomation.loadLogs()">🔄 Refresh</button>
            <button class="aa-btn aa-btn-danger aa-btn-sm" onclick="window.AdvAutomation.clearLogs()">🗑️ Clear</button>
          </div>
        </div>
        <div id="aa-logs-container" style="max-height:400px;overflow-y:auto">
          <div style="text-align:center;padding:30px;color:#6b7280">Loading...</div>
        </div>
      </div>
    `;
  }

  async function loadLogs() {
    const container = document.getElementById('aa-logs-container');
    if (!container) return;
    
    try {
      const res = await fetch('/api/admin/automation/logs?limit=50');
      const data = await res.json();
      const logs = data.logs || [];
      
      if (logs.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:30px;color:#6b7280">No logs yet</div>';
        return;
      }
      
      container.innerHTML = logs.map(log => `
        <div class="aa-log-item ${log.status}">
          <div class="aa-log-time">${new Date(log.created_at).toLocaleString()}</div>
          <div class="aa-log-title">${log.type?.toUpperCase()}: ${log.title}</div>
          <div class="aa-log-target">${log.target} - ${log.status}</div>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = '<div style="color:#ef4444;padding:20px">Failed to load logs</div>';
    }
  }

  async function clearLogs() {
    if (!confirm('Clear all logs?')) return;
    await fetch('/api/admin/automation/logs/clear', { method: 'POST' });
    loadLogs();
  }

  function setupPanelHandlers(panel) {
    // General panel
    if (panel === 'general') {
      const enabled = document.getElementById('aa-enabled');
      const email = document.getElementById('aa-admin-email');
      if (enabled) enabled.onchange = () => config.enabled = enabled.checked;
      if (email) email.oninput = () => config.adminEmail = email.value;
    }
    
    // Routing panel
    if (panel === 'routing') {
      document.querySelectorAll('.aa-routing-row[data-route]').forEach(row => {
        const key = row.dataset.route;
        if (!config.routing[key]) config.routing[key] = { emailService: null, adminEmail: !key.startsWith('customer_'), enabled: true };
        // Email service
        const emailSel = row.querySelector('[data-field="emailService"]');
        if (emailSel) emailSel.onchange = () => config.routing[key].emailService = emailSel.value || null;
        // Admin email checkbox
        const adminCb = row.querySelector('[data-field="adminEmail"]');
        if (adminCb) adminCb.onchange = () => config.routing[key].adminEmail = adminCb.checked;
        // Enabled checkbox
        const enabledCb = row.querySelector('[data-field="enabled"]');
        if (enabledCb) enabledCb.onchange = () => config.routing[key].enabled = enabledCb.checked;
      });
    }
  }

  function toggleMulti(btn) {
    const dropdown = btn.nextElementSibling;
    document.querySelectorAll('.aa-multi-dropdown.show').forEach(d => { if (d !== dropdown) d.classList.remove('show'); });
    dropdown.classList.toggle('show');
  }

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.aa-multi-select')) {
      document.querySelectorAll('.aa-multi-dropdown.show').forEach(d => d.classList.remove('show'));
    }
  });

  /**
   * Subscription management functions
   * Subscriptions define a webhook endpoint and which events (topics) it listens to.
   */
  function addSubscription() {
    const id = generateId();
    showSubscriptionEditor({
      id,
      name: '',
      type: 'custom',
      url: '',
      method: 'POST',
      headers: '',
      secret: '',
      bodyTemplate: '',
      enabled: true,
      topics: []
    }, -1);
  }

  function editSubscription(idx) {
    showSubscriptionEditor(config.subscriptions[idx], idx);
  }

  function deleteSubscription(idx) {
    if (!confirm('Delete this webhook subscription?')) return;
    config.subscriptions.splice(idx, 1);
    renderPanel('webhooks');
  }

  function showSubscriptionEditor(sub, idx) {
    const isNew = idx === -1;
    const content = document.getElementById('aa-content');
    content.innerHTML = `
      <div class="aa-panel active">
        <div class="aa-card">
          <h3>${isNew ? '➕ Add' : '✏️ Edit'} Webhook</h3>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">Name</label>
              <input type="text" class="aa-input" id="subs-name" value="${sub.name || ''}" placeholder="My Webhook">
            </div>
            <div class="aa-col">
              <label class="aa-label">Type</label>
              <select class="aa-select" id="subs-type">
                ${WEBHOOK_TYPES.map(t => `<option value="${t.id}" ${sub.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">Webhook URL</label>
              <input type="url" class="aa-input" id="subs-url" value="${sub.url || ''}" placeholder="https://hooks.slack.com/...">
            </div>
          </div>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">Events</label>
              <div class="aa-multi-select" id="subs-topics-select">
                <button type="button" class="aa-multi-btn" id="subs-topics-btn" onclick="window.AdvAutomation.toggleMulti(this)">Select events</button>
                <div class="aa-multi-dropdown" id="subs-topics-dropdown">
                  ${Object.entries(NOTIFICATION_TYPES).map(([k, v]) => `
                    <div class="aa-multi-opt">
                      <input type="checkbox" value="${k}" ${Array.isArray(sub.topics) && sub.topics.includes(k) ? 'checked' : ''}>
                      ${v.label}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          <div id="subs-custom-fields" style="display:${sub.type === 'custom' ? 'block' : 'none'}">
            <div class="aa-row">
              <div class="aa-col" style="max-width:100px">
                <label class="aa-label">Method</label>
                <select class="aa-select" id="subs-method">
                  <option value="POST" ${sub.method === 'POST' ? 'selected' : ''}>POST</option>
                  <option value="PUT" ${sub.method === 'PUT' ? 'selected' : ''}>PUT</option>
                </select>
              </div>
              <div class="aa-col">
                <label class="aa-label">Secret (optional)</label>
                <input type="text" class="aa-input" id="subs-secret" value="${sub.secret || ''}" placeholder="webhook-secret">
              </div>
            </div>
            <div class="aa-row">
              <div class="aa-col">
                <label class="aa-label">Headers (JSON)</label>
                <textarea class="aa-textarea" id="subs-headers" placeholder="{\"X-Custom\": \"value\"}">${sub.headers || ''}</textarea>
              </div>
            </div>
            <div class="aa-row">
              <div class="aa-col">
                <label class="aa-label">Body Template (JSON) - Use {{event}}, {{title}}, {{message}}, {{data}}</label>
                <textarea class="aa-textarea" id="subs-body" placeholder="{\"text\": \"{{title}}: {{message}}\"}">${sub.bodyTemplate || ''}</textarea>
              </div>
            </div>
          </div>
          <label class="aa-toggle" style="margin-top:15px">
            <input type="checkbox" id="subs-enabled" ${sub.enabled ? 'checked' : ''}>
            <div class="aa-toggle-label"><strong>Enabled</strong></div>
          </label>
          <div style="margin-top:20px;display:flex;gap:10px">
            <button class="aa-btn aa-btn-primary" onclick="window.AdvAutomation.saveSubscription(${idx})">💾 Save</button>
            <button class="aa-btn aa-btn-ghost" onclick="window.AdvAutomation.renderPanel('webhooks')">Cancel</button>
            ${!isNew ? `<button class="aa-btn aa-btn-success" onclick="window.AdvAutomation.testWebhookById('${sub.id}')">🧪 Test</button>` : ''}
          </div>
        </div>
      </div>
    `;
    // Manage multi-select selections
    const selected = new Set(Array.isArray(sub.topics) ? sub.topics : []);
    function renderMultiButton() {
      const btn = document.getElementById('subs-topics-btn');
      if (!btn) return;
      if (selected.size === 0) {
        btn.textContent = 'Select events';
        btn.style.color = '#9ca3af';
      } else {
        btn.textContent = selected.size + (selected.size === 1 ? ' event selected' : ' events selected');
        btn.style.color = '#fff';
      }
    }
    function updateTopics() {
      selected.clear();
      document.querySelectorAll('#subs-topics-dropdown input:checked').forEach(cb => {
        selected.add(cb.value);
      });
      renderMultiButton();
    }
    document.querySelectorAll('#subs-topics-dropdown input').forEach(cb => {
      cb.onchange = updateTopics;
    });
    renderMultiButton();
    document.getElementById('subs-type').onchange = function() {
      document.getElementById('subs-custom-fields').style.display = this.value === 'custom' ? 'block' : 'none';
    };
    // attach selected set for retrieval during save
    document.getElementById('subs-topics-select').selectedTopics = selected;
  }

  function saveSubscription(idx) {
    const selected = document.getElementById('subs-topics-select').selectedTopics || new Set();
    const sub = {
      id: idx === -1 ? generateId() : config.subscriptions[idx].id,
      name: document.getElementById('subs-name').value || 'Unnamed',
      type: document.getElementById('subs-type').value,
      url: document.getElementById('subs-url').value,
      method: document.getElementById('subs-method')?.value || 'POST',
      headers: document.getElementById('subs-headers')?.value || '',
      secret: document.getElementById('subs-secret')?.value || '',
      bodyTemplate: document.getElementById('subs-body')?.value || '',
      enabled: document.getElementById('subs-enabled').checked,
      topics: Array.from(selected)
    };
    if (idx === -1) {
      config.subscriptions.push(sub);
    } else {
      config.subscriptions[idx] = sub;
    }
    renderPanel('webhooks');
  }

  function addWebhook() {
    const id = generateId();
    showWebhookEditor({
      id,
      name: '',
      type: 'custom',
      url: '',
      method: 'POST',
      headers: '',
      secret: '',
      bodyTemplate: '',
      enabled: true
    }, -1);
  }

  function editWebhook(idx) {
    showWebhookEditor(config.webhooks[idx], idx);
  }

  function deleteWebhook(idx) {
    if (!confirm('Delete this webhook?')) return;
    config.webhooks.splice(idx, 1);
    renderPanel('webhooks');
  }

  function showWebhookEditor(webhook, idx) {
    const isNew = idx === -1;
    const content = document.getElementById('aa-content');
    content.innerHTML = `
      <div class="aa-panel active">
        <div class="aa-card">
          <h3>${isNew ? '➕ Add' : '✏️ Edit'} Webhook</h3>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">Name</label>
              <input type="text" class="aa-input" id="wh-name" value="${webhook.name || ''}" placeholder="My Slack">
            </div>
            <div class="aa-col">
              <label class="aa-label">Type</label>
              <select class="aa-select" id="wh-type">
                ${WEBHOOK_TYPES.map(t => `<option value="${t.id}" ${webhook.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">Webhook URL</label>
              <input type="url" class="aa-input" id="wh-url" value="${webhook.url || ''}" placeholder="https://hooks.slack.com/...">
            </div>
          </div>
          <div id="wh-custom-fields" style="display:${webhook.type === 'custom' ? 'block' : 'none'}">
            <div class="aa-row">
              <div class="aa-col" style="max-width:100px">
                <label class="aa-label">Method</label>
                <select class="aa-select" id="wh-method">
                  <option value="POST" ${webhook.method === 'POST' ? 'selected' : ''}>POST</option>
                  <option value="PUT" ${webhook.method === 'PUT' ? 'selected' : ''}>PUT</option>
                </select>
              </div>
              <div class="aa-col">
                <label class="aa-label">Secret (optional)</label>
                <input type="text" class="aa-input" id="wh-secret" value="${webhook.secret || ''}" placeholder="webhook-secret">
              </div>
            </div>
            <div class="aa-row">
              <div class="aa-col">
                <label class="aa-label">Headers (JSON)</label>
                <textarea class="aa-textarea" id="wh-headers" placeholder='{"X-Custom": "value"}'>${webhook.headers || ''}</textarea>
              </div>
            </div>
            <div class="aa-row">
              <div class="aa-col">
                <label class="aa-label">Body Template (JSON) - Use {{event}}, {{title}}, {{message}}, {{data}}</label>
                <textarea class="aa-textarea" id="wh-body" placeholder='{"text": "{{title}}: {{message}}"}'>${webhook.bodyTemplate || ''}</textarea>
              </div>
            </div>
          </div>
          <label class="aa-toggle" style="margin-top:15px">
            <input type="checkbox" id="wh-enabled" ${webhook.enabled ? 'checked' : ''}>
            <div class="aa-toggle-label"><strong>Enabled</strong></div>
          </label>
          <div style="margin-top:20px;display:flex;gap:10px">
            <button class="aa-btn aa-btn-primary" onclick="window.AdvAutomation.saveWebhook(${idx})">💾 Save</button>
            <button class="aa-btn aa-btn-ghost" onclick="window.AdvAutomation.renderPanel('webhooks')">Cancel</button>
            ${!isNew ? `<button class="aa-btn aa-btn-success" onclick="window.AdvAutomation.testWebhookById('${webhook.id}')">🧪 Test</button>` : ''}
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('wh-type').onchange = function() {
      document.getElementById('wh-custom-fields').style.display = this.value === 'custom' ? 'block' : 'none';
    };
  }

  function saveWebhook(idx) {
    const webhook = {
      id: idx === -1 ? generateId() : config.webhooks[idx].id,
      name: document.getElementById('wh-name').value || 'Unnamed',
      type: document.getElementById('wh-type').value,
      url: document.getElementById('wh-url').value,
      method: document.getElementById('wh-method')?.value || 'POST',
      headers: document.getElementById('wh-headers')?.value || '',
      secret: document.getElementById('wh-secret')?.value || '',
      bodyTemplate: document.getElementById('wh-body')?.value || '',
      enabled: document.getElementById('wh-enabled').checked
    };
    
    if (idx === -1) {
      config.webhooks.push(webhook);
    } else {
      config.webhooks[idx] = webhook;
    }
    
    renderPanel('webhooks');
  }

  /**
   * Edit the universal webhook configuration. Opens a form similar to editing a
   * normal webhook but writes values to config.universalWebhook instead of the
   * webhooks array. The universal webhook triggers all notifications.
   */
  function editUniversalWebhook() {
    const uw = config.universalWebhook || {};
    showUniversalWebhookEditor({
      id: uw.id || 'universal',
      name: uw.name || 'Universal',
      type: uw.type || 'custom',
      url: uw.url || '',
      method: uw.method || 'POST',
      headers: uw.headers || '',
      secret: uw.secret || '',
      bodyTemplate: uw.bodyTemplate || '',
      enabled: uw.enabled !== false
    });
  }

  /**
   * Display a form to edit the universal webhook. This reuses many of the
   * controls from the normal webhook editor but omits deletion and test
   * buttons.
   */
  function showUniversalWebhookEditor(webhook) {
    const content = document.getElementById('aa-content');
    content.innerHTML = `
      <div class="aa-panel active">
        <div class="aa-card">
          <h3>✏️ Universal Webhook</h3>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">Name</label>
              <input type="text" class="aa-input" id="uw-name" value="${webhook.name || ''}" placeholder="Universal">
            </div>
            <div class="aa-col">
              <label class="aa-label">Type</label>
              <select class="aa-select" id="uw-type">
                ${WEBHOOK_TYPES.map(t => `<option value="${t.id}" ${webhook.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">Webhook URL</label>
              <input type="url" class="aa-input" id="uw-url" value="${webhook.url || ''}" placeholder="https://hooks.slack.com/...">
            </div>
          </div>
          <div id="uw-custom-fields" style="display:${webhook.type === 'custom' ? 'block' : 'none'}">
            <div class="aa-row">
              <div class="aa-col" style="max-width:100px">
                <label class="aa-label">Method</label>
                <select class="aa-select" id="uw-method">
                  <option value="POST" ${webhook.method === 'POST' ? 'selected' : ''}>POST</option>
                  <option value="PUT" ${webhook.method === 'PUT' ? 'selected' : ''}>PUT</option>
                </select>
              </div>
              <div class="aa-col">
                <label class="aa-label">Secret (optional)</label>
                <input type="text" class="aa-input" id="uw-secret" value="${webhook.secret || ''}" placeholder="webhook-secret">
              </div>
            </div>
            <div class="aa-row">
              <div class="aa-col">
                <label class="aa-label">Headers (JSON)</label>
                <textarea class="aa-textarea" id="uw-headers" placeholder='{"X-Custom": "value"}'>${webhook.headers || ''}</textarea>
              </div>
            </div>
            <div class="aa-row">
              <div class="aa-col">
                <label class="aa-label">Body Template (JSON) - Use {{event}}, {{title}}, {{message}}, {{data}}</label>
                <textarea class="aa-textarea" id="uw-body" placeholder='{"text": "{{title}}: {{message}}"}'>${webhook.bodyTemplate || ''}</textarea>
              </div>
            </div>
          </div>
          <label class="aa-toggle" style="margin-top:15px">
            <input type="checkbox" id="uw-enabled" ${webhook.enabled ? 'checked' : ''}>
            <div class="aa-toggle-label"><strong>Enabled</strong></div>
          </label>
          <div style="margin-top:20px;display:flex;gap:10px">
            <button class="aa-btn aa-btn-primary" onclick="window.AdvAutomation.saveUniversalWebhook()">💾 Save</button>
            <button class="aa-btn aa-btn-ghost" onclick="window.AdvAutomation.renderPanel('webhooks')">Cancel</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('uw-type').onchange = function() {
      document.getElementById('uw-custom-fields').style.display = this.value === 'custom' ? 'block' : 'none';
    };
  }

  /**
   * Persist changes to the universal webhook back into the config and
   * redisplay the webhooks panel.
   */
  function saveUniversalWebhook() {
    const uw = {
      id: 'universal',
      name: document.getElementById('uw-name').value || 'Universal',
      type: document.getElementById('uw-type').value,
      url: document.getElementById('uw-url').value,
      method: document.getElementById('uw-method')?.value || 'POST',
      headers: document.getElementById('uw-headers')?.value || '',
      secret: document.getElementById('uw-secret')?.value || '',
      bodyTemplate: document.getElementById('uw-body')?.value || '',
      enabled: document.getElementById('uw-enabled').checked
    };
    config.universalWebhook = uw;
    renderPanel('webhooks');
  }

  async function testWebhookById(id) {
    setStatus('Testing webhook...');
    const res = await fetch(`/api/admin/automation/test/webhook?id=${id}`, { method: 'POST' });
    const data = await res.json();
    setStatus(data.success ? '✅ Webhook test sent!' : '❌ Test failed: ' + (data.error || 'Unknown error'));
  }

  function addEmailService() {
    showEmailEditor({
      id: generateId(),
      name: '',
      type: 'resend',
      apiKey: '',
      fromName: 'WishesU',
      fromEmail: '',
      customUrl: '',
      customMethod: 'POST',
      customHeaders: '',
      customBody: '',
      enabled: true
    }, -1);
  }

  function editEmailService(idx) {
    showEmailEditor(config.emailServices[idx], idx);
  }

  function deleteEmailService(idx) {
    if (!confirm('Delete this email service?')) return;
    config.emailServices.splice(idx, 1);
    renderPanel('email');
  }

  function showEmailEditor(service, idx) {
    const isNew = idx === -1;
    const content = document.getElementById('aa-content');
    content.innerHTML = `
      <div class="aa-panel active">
        <div class="aa-card">
          <h3>${isNew ? '➕ Add' : '✏️ Edit'} Email Service</h3>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">Name</label>
              <input type="text" class="aa-input" id="es-name" value="${service.name || ''}" placeholder="Primary Email">
            </div>
            <div class="aa-col">
              <label class="aa-label">Provider</label>
              <select class="aa-select" id="es-type">
                ${EMAIL_TYPES.map(t => `<option value="${t.id}" ${service.type === t.id ? 'selected' : ''}>${t.name} - ${t.desc}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">API Key</label>
              <input type="password" class="aa-input" id="es-apikey" value="${service.apiKey || ''}" placeholder="Enter API key">
            </div>
          </div>
          <div class="aa-row">
            <div class="aa-col">
              <label class="aa-label">From Name</label>
              <input type="text" class="aa-input" id="es-fromname" value="${service.fromName || 'WishesU'}" placeholder="WishesU">
            </div>
            <div class="aa-col">
              <label class="aa-label">From Email</label>
              <input type="email" class="aa-input" id="es-fromemail" value="${service.fromEmail || ''}" placeholder="noreply@domain.com">
            </div>
          </div>
          <div id="es-custom-fields" style="display:${service.type === 'custom' ? 'block' : 'none'}">
            <div class="aa-row">
              <div class="aa-col">
                <label class="aa-label">API URL</label>
                <input type="url" class="aa-input" id="es-url" value="${service.customUrl || ''}" placeholder="https://api.service.com/send">
              </div>
              <div class="aa-col" style="max-width:100px">
                <label class="aa-label">Method</label>
                <select class="aa-select" id="es-method">
                  <option value="POST" ${service.customMethod === 'POST' ? 'selected' : ''}>POST</option>
                  <option value="PUT" ${service.customMethod === 'PUT' ? 'selected' : ''}>PUT</option>
                </select>
              </div>
            </div>
            <div class="aa-row">
              <div class="aa-col">
                <label class="aa-label">Headers (JSON) - Use {{api_key}}</label>
                <textarea class="aa-textarea" id="es-headers">${service.customHeaders || '{"Authorization": "Bearer {{api_key}}", "Content-Type": "application/json"}'}</textarea>
              </div>
            </div>
            <div class="aa-row">
              <div class="aa-col">
                <label class="aa-label">Body (JSON) - Use {{to}}, {{subject}}, {{html}}, {{text}}, {{from_name}}, {{from_email}}</label>
                <textarea class="aa-textarea" id="es-body" style="min-height:120px">${service.customBody || '{"to": "{{to}}", "from": "{{from_name}} <{{from_email}}>", "subject": "{{subject}}", "html": "{{html}}"}'}</textarea>
              </div>
            </div>
          </div>
          <label class="aa-toggle" style="margin-top:15px">
            <input type="checkbox" id="es-enabled" ${service.enabled ? 'checked' : ''}>
            <div class="aa-toggle-label"><strong>Enabled</strong></div>
          </label>
          <div style="margin-top:20px;display:flex;gap:10px">
            <button class="aa-btn aa-btn-primary" onclick="window.AdvAutomation.saveEmailService(${idx})">💾 Save</button>
            <button class="aa-btn aa-btn-ghost" onclick="window.AdvAutomation.renderPanel('email')">Cancel</button>
            ${!isNew ? `<button class="aa-btn aa-btn-success" onclick="window.AdvAutomation.testEmailServiceById('${service.id}')">🧪 Test</button>` : ''}
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('es-type').onchange = function() {
      document.getElementById('es-custom-fields').style.display = this.value === 'custom' ? 'block' : 'none';
    };
  }

  function saveEmailService(idx) {
    const currentApiKey = idx !== -1 ? config.emailServices[idx].apiKey : '';
    const newApiKey = document.getElementById('es-apikey').value;
    
    const service = {
      id: idx === -1 ? generateId() : config.emailServices[idx].id,
      name: document.getElementById('es-name').value || 'Email Service',
      type: document.getElementById('es-type').value,
      apiKey: newApiKey || currentApiKey,
      fromName: document.getElementById('es-fromname').value || 'WishesU',
      fromEmail: document.getElementById('es-fromemail').value,
      customUrl: document.getElementById('es-url')?.value || '',
      customMethod: document.getElementById('es-method')?.value || 'POST',
      customHeaders: document.getElementById('es-headers')?.value || '',
      customBody: document.getElementById('es-body')?.value || '',
      enabled: document.getElementById('es-enabled').checked
    };
    
    if (idx === -1) {
      config.emailServices.push(service);
    } else {
      config.emailServices[idx] = service;
    }
    
    renderPanel('email');
  }

  async function testEmailService(idx) {
    const service = config.emailServices[idx];
    if (!service) return;
    testEmailServiceById(service.id);
  }

  async function testEmailServiceById(id) {
    const email = prompt('Enter test email address:', config.adminEmail || '');
    if (!email) return;
    
    setStatus('Sending test email...');
    const res = await fetch(`/api/admin/automation/test/email?id=${id}&email=${encodeURIComponent(email)}`, { method: 'POST' });
    const data = await res.json();
    setStatus(data.success ? '✅ Test email sent!' : '❌ Failed: ' + (data.error || 'Unknown error'));
  }

  function setStatus(msg) {
    const el = document.getElementById('aa-status');
    if (el) el.textContent = msg;
  }

  async function save() {
    setStatus('Saving...');
    const success = await saveConfig();
    setStatus(success ? '✅ Saved!' : '❌ Failed to save');
    if (success) setTimeout(() => setStatus('Ready'), 2000);
  }

  // Export API
  window.AdvAutomation = {
    open: openModal,
    close: closeModal,
    save,
    renderPanel,
    addSubscription,
    editSubscription,
    deleteSubscription,
    saveSubscription,
    testWebhookById,
    addEmailService,
    editEmailService,
    deleteEmailService,
    saveEmailService,
    testEmailService,
    testEmailServiceById,
    toggleMulti,
    loadLogs,
    clearLogs
  };
  
  console.log('✅ Advanced Automation UI loaded');
})();
