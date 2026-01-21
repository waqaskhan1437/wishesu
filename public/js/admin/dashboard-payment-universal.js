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
        const response = await fetch('/api/admin/payment-universal/gateways');
        const data = await response.json();
        if (data.success) {
            paymentGateways = data.gateways || [];
            console.log('Loaded payment gateways:', paymentGateways);
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

    container.innerHTML = `
        <div class="payment-management">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>💳 Universal Payment Gateway Manager</h2>
                <button class="btn btn-primary" onclick="showAddGatewayModal()">+ Add Payment Gateway</button>
            </div>
            
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
    
    return `
        <div class="gateway-form">
            <div class="form-group">
                <label for="gateway-name">Gateway Name *</label>
                <input type="text" id="gateway-name" placeholder="e.g., Stripe, PayPal, Custom Gateway" 
                       value="${escapeHtml(name)}" required>
            </div>
            
            <div class="form-group">
                <label for="gateway-type">Gateway Type</label>
                <select id="gateway-type">
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

// Save new gateway
async function saveGateway() {
    const name = document.getElementById('gateway-name').value.trim();
    const gatewayType = document.getElementById('gateway-type').value;
    const webhookUrl = document.getElementById('webhook-url').value.trim();
    const secret = document.getElementById('gateway-secret').value.trim();
    const customCode = document.getElementById('custom-code').value.trim();
    const enabled = document.getElementById('gateway-enabled').checked;
    
    if (!name || !webhookUrl) {
        alert('Name and Webhook URL are required!');
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
                enabled
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
    
    if (!name || !webhookUrl) {
        alert('Name and Webhook URL are required!');
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
                enabled
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