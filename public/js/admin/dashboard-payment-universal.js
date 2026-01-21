/**
 * Universal Payment Gateway System 2025 - Support Any Payment Method
 * 
 * Features:
 * - Add any payment gateway with webhook/secret
 * - Custom code injection for complex integrations
 * - Universal webhook handler
 * - Secure signature verification
 * - Modular plugin architecture
 */

(function(AD) {
  
  function toast(msg, ok=true) {
    const el = document.getElementById('payment-toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = ok ? '#10b981' : '#ef4444';
    setTimeout(() => el.style.display = 'none', 3000);
  }

  async function jfetch(url, opts={}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) },
      ...opts
    });
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  }

  async function loadPayment(panel) {
    panel.innerHTML = `
      <div style="max-width:1000px;margin:0 auto;padding:20px;">
        <div id="payment-toast" style="display:none;position:fixed;top:20px;right:20px;padding:15px 25px;border-radius:10px;color:white;font-weight:600;z-index:1000;"></div>
        
        <!-- Header -->
        <div style="margin-bottom:30px;">
          <h2 style="margin:0 0 8px;font-size:28px;color:#1f2937;">💳 Universal Payment Gateway</h2>
          <p style="margin:0;color:#6b7280;font-size:15px;">Add any payment method with custom integration</p>
        </div>

        <!-- Info Card -->
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.1);border-left:4px solid #8b5cf6;">
          <h3 style="margin:0 0 15px;font-size:18px;color:#1f2937;">🔧 How It Works</h3>
          <ul style="margin:0;padding-left:20px;color:#4b5563;font-size:14px;line-height:1.8;">
            <li><strong>Add Gateway:</strong> Configure any payment gateway</li>
            <li><strong>Webhook Setup:</strong> Provide webhook URL and secret</li>
            <li><strong>Custom Code:</strong> Add custom processing if needed</li>
            <li><strong>Universal Handler:</strong> All payments processed uniformly</li>
            <li><strong>Secure:</strong> Signature verification built-in</li>
          </ul>
        </div>

        <!-- Add Gateway Form -->
        <div style="background:white;border-radius:16px;padding:25px;margin-bottom:25px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 20px;font-size:18px;color:#1f2937;">➕ Add Payment Gateway</h3>
          
          <div style="display:grid;gap:20px;">
            <div>
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">Gateway Name *</label>
              <input id="gateway-name" type="text" placeholder="Stripe, PayPal, Gumroad, etc." required
                style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;">
            </div>

            <div>
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">Webhook URL</label>
              <input id="webhook-url" type="url" placeholder="https://yoursite.com/webhooks/gateway-name"
                style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;">
              <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">Where the gateway sends payment notifications</p>
            </div>

            <div>
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">Webhook Secret</label>
              <input id="webhook-secret" type="password" placeholder="Webhook signature secret"
                style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:15px;">
              <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">For verifying webhook authenticity</p>
            </div>

            <div>
              <label style="display:block;margin-bottom:8px;font-weight:600;color:#374151;font-size:14px;">Custom Processing Code (Optional)</label>
              <textarea id="custom-code" placeholder="// Custom code for this gateway
// Example: 
// if (event.type === 'payment_intent.succeeded') {
//   // Process custom logic
// }" rows="6"
                style="width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:10px;font-size:14px;font-family:monospace;resize:vertical;"></textarea>
              <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">JavaScript code to handle custom gateway logic</p>
            </div>

            <div>
              <label style="display:flex;align-items:center;cursor:pointer;margin-bottom:15px;">
                <input id="is-enabled" type="checkbox" checked style="width:20px;height:20px;margin-right:12px;cursor:pointer;">
                <span style="font-weight:600;color:#374151;">Enable Gateway</span>
              </label>
            </div>

            <button onclick="AD.addPaymentGateway()" 
              style="padding:14px 28px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;border:none;border-radius:12px;cursor:pointer;font-size:16px;font-weight:600;box-shadow:0 4px 12px rgba(139,92,246,0.3);">
              ➕ Add Payment Gateway
            </button>
          </div>
        </div>

        <!-- Current Gateways -->
        <div style="background:white;border-radius:16px;padding:25px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <div style="display:flex;justify-content:space-between;align-items-center;margin-bottom:20px;">
            <h3 style="margin:0;font-size:18px;color:#1f2937;">🌐 Active Payment Gateways</h3>
            <span id="gateways-count" style="background:#e5e7eb;padding:5px 12px;border-radius:20px;font-size:14px;color:#4b5563;">Loading...</span>
          </div>
          
          <div id="gateways-list" style="min-height:100px;">
            <div style="text-align:center;padding:40px 20px;color:#9ca3af;">
              <div style="font-size:48px;margin-bottom:12px;">💳</div>
              <p style="margin:0;font-size:16px;">No payment gateways configured yet</p>
              <p style="margin-top:8px;font-size:14px;">Add your first payment gateway to get started</p>
            </div>
          </div>
        </div>

        <!-- Pre-built Gateways -->
        <div style="margin-top:30px;background:white;border-radius:16px;padding:25px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin:0 0 20px;font-size:18px;color:#1f2937;">🚀 Quick Setup (Pre-built)</h3>
          
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;">
            <button onclick="AD.quickSetup('stripe')" 
              style="padding:15px;background:#6366f1;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;transition:transform 0.2s;">
              Stripe
            </button>
            <button onclick="AD.quickSetup('paypal')" 
              style="padding:15px;background:#0070ba;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;transition:transform 0.2s;">
              PayPal
            </button>
            <button onclick="AD.quickSetup('whop')" 
              style="padding:15px;background:#4ade80;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;transition:transform 0.2s;">
              Whop
            </button>
            <button onclick="AD.quickSetup('gumroad')" 
              style="padding:15px;background:#ff6347;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;transition:transform 0.2s;">
              Gumroad
            </button>
            <button onclick="AD.quickSetup('razorpay')" 
              style="padding:15px;background:#008080;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;transition:transform 0.2s;">
              Razorpay
            </button>
            <button onclick="AD.quickSetup('paystack')" 
              style="padding:15px;background:#00c853;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:600;transition:transform 0.2s;">
              Paystack
            </button>
          </div>
        </div>
      </div>
    `;

    // Load current gateways
    await loadGatewaysList();
  }

  async function loadGatewaysList() {
    const panel = document.getElementById('main-panel');
    try {
      const data = await jfetch('/api/admin/payment/gateways');
      const gateways = data.gateways || [];
      
      const listDiv = panel.querySelector('#gateways-list');
      const countSpan = panel.querySelector('#gateways-count');
      
      if (gateways.length === 0) {
        listDiv.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:#9ca3af;">
            <div style="font-size:48px;margin-bottom:12px;">💳</div>
            <p style="margin:0;font-size:16px;">No payment gateways configured yet</p>
            <p style="margin-top:8px;font-size:14px;">Add your first payment gateway to get started</p>
          </div>
        `;
      } else {
        listDiv.innerHTML = `
          <div style="display:grid;gap:15px;">
            ${gateways.map((gw, index) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;">
                <div>
                  <div style="font-weight:600;color:#1f2937;font-size:15px;">${gw.name}</div>
                  <div style="font-size:13px;color:#6b7280;margin-top:4px;">${gw.webhook_url || 'No webhook'}</div>
                  <div style="font-size:12px;color:${gw.is_enabled ? '#10b981' : '#ef4444'};margin-top:4px;">
                    ${gw.is_enabled ? '🟢 Enabled' : '🔴 Disabled'}
                  </div>
                </div>
                <div style="display:flex;gap:8px;">
                  <button onclick="AD.editGateway(${index})" 
                    style="padding:8px 16px;background:#374151;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">
                    Edit
                  </button>
                  <button onclick="AD.deleteGateway('${gw.id}')" 
                    style="padding:8px 16px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">
                    Delete
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
      
      countSpan.textContent = `${gateways.length} gateway${gateways.length !== 1 ? 's' : ''}`;
      
    } catch (e) {
      listDiv.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:#9ca3af;">
          <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
          <p style="margin:0;font-size:16px;">Failed to load gateways</p>
          <p style="margin-top:8px;font-size:14px;">Please try again later</p>
        </div>
      `;
    }
  }

  async function addPaymentGateway() {
    const panel = document.getElementById('main-panel');
    
    const gateway = {
      name: panel.querySelector('#gateway-name').value.trim(),
      webhook_url: panel.querySelector('#webhook-url').value.trim(),
      webhook_secret: panel.querySelector('#webhook-secret').value.trim(),
      custom_code: panel.querySelector('#custom-code').value.trim(),
      is_enabled: panel.querySelector('#is-enabled').checked
    };

    if (!gateway.name) {
      toast('Please enter a gateway name', false);
      return;
    }

    try {
      await jfetch('/api/admin/payment/gateways', {
        method: 'POST',
        body: JSON.stringify(gateway)
      });
      
      // Clear form
      panel.querySelector('#gateway-name').value = '';
      panel.querySelector('#webhook-url').value = '';
      panel.querySelector('#webhook-secret').value = '';
      panel.querySelector('#custom-code').value = '';
      panel.querySelector('#is-enabled').checked = true;
      
      await loadGatewaysList();
      toast('✅ Payment gateway added successfully!', true);
    } catch (e) {
      toast('Failed to add payment gateway', false);
    }
  }

  async function deleteGateway(id) {
    if (!confirm('Are you sure you want to delete this payment gateway?')) {
      return;
    }

    try {
      await jfetch('/api/admin/payment/gateways/' + id, {
        method: 'DELETE'
      });
      
      await loadGatewaysList();
      toast('✅ Payment gateway deleted', true);
    } catch (e) {
      toast('Failed to delete gateway', false);
    }
  }

  async function editGateway(index) {
    toast('Edit functionality coming soon', false);
  }

  async function quickSetup(gateway) {
    const panel = document.getElementById('main-panel');
    const nameInput = panel.querySelector('#gateway-name');
    const webhookInput = panel.querySelector('#webhook-url');
    const secretInput = panel.querySelector('#webhook-secret');
    const codeInput = panel.querySelector('#custom-code');
    
    // Pre-fill based on gateway
    nameInput.value = gateway.charAt(0).toUpperCase() + gateway.slice(1);
    webhookInput.value = `https://your-site.com/webhooks/${gateway}`;
    
    // Pre-fill custom code based on gateway
    const codeTemplates = {
      stripe: `// Stripe webhook handler
if (event.type === 'payment_intent.succeeded') {
  const paymentIntent = event.data.object;
  // Process successful payment
  console.log('Stripe payment succeeded:', paymentIntent.id);
}`,
      paypal: `// PayPal webhook handler
if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
  const payment = event.resource;
  // Process successful payment
  console.log('PayPal payment completed:', payment.id);
}`,
      whop: `// Whop webhook handler
if (event.type === 'checkout.completed') {
  const order = event.data;
  // Process successful order
  console.log('Whop order completed:', order.id);
}`,
      gumroad: `// Gumroad webhook handler
if (event.action === 'charge_success') {
  const sale = event.sale;
  // Process successful sale
  console.log('Gumroad sale completed:', sale.product_name);
}`
    };
    
    codeInput.value = codeTemplates[gateway] || '';
    
    toast(`Pre-filled ${gateway} settings`, true);
  }

  // Export
  AD.loadPayment = loadPayment;
  AD.addPaymentGateway = addPaymentGateway;
  AD.deleteGateway = deleteGateway;
  AD.editGateway = editGateway;
  AD.quickSetup = quickSetup;

})(window.AdminDashboard);
