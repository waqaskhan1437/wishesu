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

// Payment gateways management
let paymentGateways = [];
let currentEditingGateway = null;

// Initialize payment tab
async function initPaymentTab() {
    console.log('Initializing Payment Gateway Management...');
    await loadPaymentGateways();
    renderPaymentGateways();
    setupPaymentEventListeners();
}

// Load payment gateways from API
async function loadPaymentGateways() {
    try {
        // Add cache buster to force fresh data
        const response = await fetch('/api/admin/payment-universal/gateways?_=' + Date.now());
        const data = await response.json();
        console.log('API Response:', data);
        if (data.success) {
            paymentGateways = data.gateways || [];
            console.log('Loaded payment gateways:', paymentGateways.length, paymentGateways);
        } else {
            console.error('Failed to load payment gateways:', data.error);
            paymentGateways = [];
        }
    } catch (error) {
        console.error('Error loading payment gateways:', error);
        paymentGateways = [];
    }
}

// Render payment gateways table
function renderPaymentGateways() {
    const container = document.getElementById('main-panel');
    if (!container) return;

    // Check if Whop gateway exists
    const hasWhop = paymentGateways.some(g => g.gateway_type === 'whop');

    container.innerHTML = `
        <div class="payment-management">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2>💳 Universal Payment Gateway Manager</h2>
                <div style="display: flex; gap: 10px;">
                    ${!hasWhop ? `<button class="btn" onclick="migrateWhopSettings()" style="background: #f59e0b;">🔄 Setup Whop</button>` : ''}
                    <button class="btn btn-primary" onclick="showAddGatewayModal()">+ Add Payment Gateway</button>
                </div>
            </div>

            ${!hasWhop ? `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; padding: 15px; margin-bottom: 20px;">
                <strong style="color: #92400e;">💡 Tip:</strong>
                <span style="color: #78350f;">Click "Setup Whop" to automatically create Whop gateway from your existing settings, or use "Add Payment Gateway" to add manually.</span>
            </div>
            ` : ''}

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="payment-gateways-tbody">
                        ${renderPaymentGatewayRows()}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Migrate Whop settings from legacy to payment_gateways
async function migrateWhopSettings() {
    try {
        const response = await fetch('/api/admin/payment/migrate-whop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.success) {
            showMessage('✅ ' + result.message, 'success');
            // Reload gateways
            await loadPaymentGateways();
            renderPaymentGateways();
        } else {
            showMessage('❌ ' + (result.error || 'Migration failed'), 'error');
        }
    } catch (error) {
        showMessage('❌ Error: ' + error.message, 'error');
    }
}

// Render individual payment gateway rows
function renderPaymentGatewayRows() {
    if (!paymentGateways || paymentGateways.length === 0) {
        return '<tr><td colspan="5" style="text-align: center; padding: 20px;">No payment gateways configured yet</td></tr>';
    }
    
    return paymentGateways.map(gateway => `
        <tr>
            <td>
                <strong>${escapeHtml(gateway.name)}</strong>
                <div style="font-size: 0.8em; color: #666; margin-top: 4px;">${gateway.gateway_type || 'Custom'}</div>
            </td>
            <td>
                ${gateway.gateway_type ? escapeHtml(gateway.gateway_type) : 'Custom'}
            </td>
            <td>
                <span class="status-${gateway.enabled ? 'paid' : 'pending'}">
                    ${gateway.enabled ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                ${new Date(gateway.created_at).toLocaleDateString()}
            </td>
            <td>
                <button class="btn" onclick="editGateway(${gateway.id})" style="margin-right: 5px;">Edit</button>
                <button class="btn" onclick="deleteGateway(${gateway.id})" style="background: #ef4444;">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Set up event listeners for payment tab
function setupPaymentEventListeners() {
    // Update page title
    document.getElementById('page-title').textContent = 'Payment Gateways';
}

// Show add gateway modal
function showAddGatewayModal() {
    currentEditingGateway = null;
    showModal('Add Payment Gateway', createGatewayFormHTML());
}

// Show edit gateway modal
function editGateway(gatewayId) {
    const gateway = paymentGateways.find(g => g.id === gatewayId);
    if (!gateway) return;
    
    currentEditingGateway = gateway;
    showModal('Edit Payment Gateway', createGatewayFormHTML(gateway));
}

// Create gateway form HTML
function createGatewayFormHTML(gateway = null) {
    const isEdit = !!gateway;
    const title = isEdit ? gateway.name : 'New Gateway';
    const name = gateway?.name || '';
    const gatewayType = gateway?.gateway_type || '';
    const webhookUrl = gateway?.webhook_url || '';
    const secret = gateway?.secret || '';
    const customCode = gateway?.custom_code || '';
    const enabled = gateway?.enabled !== false; // Default to true

    // Whop-specific fields (API key comes from env variable WHOP_API_KEY)
    const whopProductId = gateway?.whop_product_id || '';
    const whopTheme = gateway?.whop_theme || 'light';

    return `
        <div class="gateway-form">
            <div class="form-group">
                <label for="gateway-name">Gateway Name *</label>
                <input type="text" id="gateway-name" placeholder="e.g., Stripe, PayPal, Custom Gateway"
                       value="${escapeHtml(name)}" required>
            </div>

            <div class="form-group">
                <label for="gateway-type">Gateway Type</label>
                <select id="gateway-type" onchange="toggleWhopFields()">
                    <option value="">Custom (Generic)</option>
                    <option value="stripe" ${gatewayType === 'stripe' ? 'selected' : ''}>Stripe</option>
                    <option value="paypal" ${gatewayType === 'paypal' ? 'selected' : ''}>PayPal</option>
                    <option value="whop" ${gatewayType === 'whop' ? 'selected' : ''}>Whop</option>
                    <option value="gumroad" ${gatewayType === 'gumroad' ? 'selected' : ''}>Gumroad</option>
                    <option value="shopify" ${gatewayType === 'shopify' ? 'selected' : ''}>Shopify</option>
                    <option value="square" ${gatewayType === 'square' ? 'selected' : ''}>Square</option>
                    <option value="paystack" ${gatewayType === 'paystack' ? 'selected' : ''}>Paystack</option>
                    <option value="razorpay" ${gatewayType === 'razorpay' ? 'selected' : ''}>Razorpay</option>
                    <option value="custom" ${gatewayType === 'custom' ? 'selected' : ''}>Custom Integration</option>
                </select>
                <small>Select a pre-built template or choose Custom for generic integration</small>
            </div>

            <!-- Whop-specific settings (hidden by default) -->
            <div id="whop-specific-settings" style="display: ${gatewayType === 'whop' ? 'block' : 'none'}; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 15px; color: #0369a1;">Whop Settings</h4>

                <div class="form-group" style="margin-bottom: 12px;">
                    <label for="whop-product-id">Product ID *</label>
                    <input type="text" id="whop-product-id" placeholder="prod_xxxxxxxxxxxxx"
                           value="${escapeHtml(whopProductId)}">
                    <small>Whop Product ID - used for dynamic checkout on product pages</small>
                </div>

                <div class="form-group" style="margin-bottom: 12px;">
                    <label for="whop-theme">Checkout Theme</label>
                    <select id="whop-theme">
                        <option value="light" ${whopTheme === 'light' ? 'selected' : ''}>Light</option>
                        <option value="dark" ${whopTheme === 'dark' ? 'selected' : ''}>Dark</option>
                    </select>
                    <small>Theme for Whop embedded checkout</small>
                </div>

                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 10px; margin-top: 10px;">
                    <strong style="color: #92400e;">API Key:</strong>
                    <span style="color: #78350f;">Set in Cloudflare environment variable <code>WHOP_API_KEY</code></span>
                </div>
            </div>

            <div class="form-group">
                <label for="webhook-url">Webhook URL *</label>
                <input type="url" id="webhook-url" placeholder="https://yourdomain.com/api/payment/webhook"
                       value="${escapeHtml(webhookUrl)}" required>
                <small>The URL where payment gateway will send webhook notifications</small>
            </div>

            <div class="form-group">
                <label for="gateway-secret">Secret Key / Signature</label>
                <input type="password" id="gateway-secret" placeholder="Enter webhook signing secret"
                       value="${escapeHtml(secret)}">
                <small>Used to verify webhook authenticity (optional but recommended)</small>
            </div>

            <div class="form-group">
                <label for="custom-code">Custom Processing Code</label>
                <textarea id="custom-code" placeholder="JavaScript code to process webhook data..."
                          style="width: 100%; min-height: 200px; font-family: monospace; font-size: 0.9em;">${escapeHtml(customCode)}</textarea>
                <small>Custom JavaScript code to handle specific gateway logic (optional)</small>
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; font-weight: bold;">Show Code Template</summary>
                    <div style="margin-top: 10px; background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 0.85em;">
                        <strong>Template:</strong><br>
                        <code>
function processWebhook(payload, headers) {<br>
&nbsp;&nbsp;// Your custom processing logic here<br>
&nbsp;&nbsp;// Return processed data or throw error<br>
&nbsp;&nbsp;return {<br>
&nbsp;&nbsp;&nbsp;&nbsp;orderId: payload.order_id,<br>
&nbsp;&nbsp;&nbsp;&nbsp;amount: payload.amount,<br>
&nbsp;&nbsp;&nbsp;&nbsp;currency: payload.currency,<br>
&nbsp;&nbsp;&nbsp;&nbsp;status: 'completed'<br>
&nbsp;&nbsp;};<br>
}
                        </code>
                    </div>
                </details>
            </div>

            <div class="form-group">
                <label>
                    <input type="checkbox" id="gateway-enabled" ${enabled ? 'checked' : ''}>
                    Enable Gateway
                </label>
                <small>Toggle to activate/deactivate this payment gateway</small>
            </div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
            <button class="btn" onclick="closeModal()" style="background: #6c757d;">Cancel</button>
            <button class="btn btn-primary" onclick="${isEdit ? 'updateGateway' : 'saveGateway'}()">
                ${isEdit ? 'Update Gateway' : 'Add Gateway'}
            </button>
        </div>
    `;
}

// Toggle Whop-specific fields visibility
function toggleWhopFields() {
    const gatewayType = document.getElementById('gateway-type').value;
    const whopSettings = document.getElementById('whop-specific-settings');
    if (whopSettings) {
        whopSettings.style.display = gatewayType === 'whop' ? 'block' : 'none';
    }
}

// Save new gateway
async function saveGateway() {
    const name = document.getElementById('gateway-name').value.trim();
    const gatewayType = document.getElementById('gateway-type').value;
    const webhookUrl = document.getElementById('webhook-url').value.trim();
    const secret = document.getElementById('gateway-secret').value.trim();
    const customCode = document.getElementById('custom-code').value.trim();
    const enabled = document.getElementById('gateway-enabled').checked;

    // Whop-specific fields (API key comes from env variable, not UI)
    const whopProductId = document.getElementById('whop-product-id')?.value.trim() || '';
    const whopTheme = document.getElementById('whop-theme')?.value || 'light';

    if (!name || !webhookUrl) {
        alert('Name and Webhook URL are required!');
        return;
    }

    // Validate Whop Product ID when gateway type is whop
    if (gatewayType === 'whop' && !whopProductId) {
        alert('Whop Product ID is required for Whop gateway!');
        return;
    }

    try {
        const response = await fetch('/api/admin/payment-universal/gateways', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                gateway_type: gatewayType,
                webhook_url: webhookUrl,
                secret,
                custom_code: customCode,
                enabled,
                // Whop-specific (API key from env variable WHOP_API_KEY)
                whop_product_id: whopProductId,
                whop_theme: whopTheme
            })
        });
        
        const result = await response.json();
        if (result.success) {
            closeModal();
            await loadPaymentGateways();
            renderPaymentGateways();
            showMessage('Payment gateway added successfully!', 'success');
        } else {
            showMessage(result.error || 'Failed to add payment gateway', 'error');
        }
    } catch (error) {
        showMessage('Error saving payment gateway: ' + error.message, 'error');
    }
}

// Update existing gateway
async function updateGateway() {
    if (!currentEditingGateway) return;

    const name = document.getElementById('gateway-name').value.trim();
    const gatewayType = document.getElementById('gateway-type').value;
    const webhookUrl = document.getElementById('webhook-url').value.trim();
    const secret = document.getElementById('gateway-secret').value.trim();
    const customCode = document.getElementById('custom-code').value.trim();
    const enabled = document.getElementById('gateway-enabled').checked;

    // Whop-specific fields (API key comes from env variable, not UI)
    const whopProductId = document.getElementById('whop-product-id')?.value.trim() || '';
    const whopTheme = document.getElementById('whop-theme')?.value || 'light';

    if (!name || !webhookUrl) {
        alert('Name and Webhook URL are required!');
        return;
    }

    // Validate Whop Product ID when gateway type is whop
    if (gatewayType === 'whop' && !whopProductId) {
        alert('Whop Product ID is required for Whop gateway!');
        return;
    }

    try {
        const response = await fetch('/api/admin/payment-universal/gateways', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentEditingGateway.id,
                name,
                gateway_type: gatewayType,
                webhook_url: webhookUrl,
                secret,
                custom_code: customCode,
                enabled,
                // Whop-specific (API key from env variable WHOP_API_KEY)
                whop_product_id: whopProductId,
                whop_theme: whopTheme
            })
        });
        
        const result = await response.json();
        if (result.success) {
            closeModal();
            await loadPaymentGateways();
            renderPaymentGateways();
            showMessage('Payment gateway updated successfully!', 'success');
        } else {
            showMessage(result.error || 'Failed to update payment gateway', 'error');
        }
    } catch (error) {
        showMessage('Error updating payment gateway: ' + error.message, 'error');
    }
}

// Delete gateway
async function deleteGateway(gatewayId) {
    if (!confirm('Are you sure you want to delete this payment gateway?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/payment-universal/gateways?id=${gatewayId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        if (result.success) {
            await loadPaymentGateways();
            renderPaymentGateways();
            showMessage('Payment gateway deleted successfully!', 'success');
        } else {
            showMessage(result.error || 'Failed to delete payment gateway', 'error');
        }
    } catch (error) {
        showMessage('Error deleting payment gateway: ' + error.message, 'error');
    }
}

// Modal functions
function showModal(title, content) {
    // Remove existing modal if any
    const existingModal = document.getElementById('modal-overlay');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 700px;
            max-height: 90vh;
            overflow-y: auto;
            padding: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3>${escapeHtml(title)}</h3>
                <button onclick="closeModal()" style="
                    background: none;
                    border: none;
                    font-size: 1.5em;
                    cursor: pointer;
                    padding: 5px;
                ">&times;</button>
            </div>
            <div id="modal-content">${content}</div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeModal() {
    const modal = document.getElementById('modal-overlay');
    if (modal) modal.remove();
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show message
function showMessage(message, type = 'info') {
    // Remove existing message if any
    const existingMsg = document.getElementById('message-toast');
    if (existingMsg) existingMsg.remove();
    
    const msgDiv = document.createElement('div');
    msgDiv.id = 'message-toast';
    msgDiv.textContent = message;
    msgDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
        ${type === 'success' ? 'background: #10b981;' : 
          type === 'error' ? 'background: #ef4444;' : 
          'background: #3b82f6;'}
    `;
    
    document.body.appendChild(msgDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (msgDiv.parentNode) {
            msgDiv.remove();
        }
    }, 5000);
}

// Add CSS animation for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

// Export the init function for the main dashboard to call
window.initPaymentTab = initPaymentTab;