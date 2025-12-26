/**
 * 🔍 WISHESU FRONTEND DEBUG OVERLAY
 * ==================================
 * Add this script to admin.html for frontend debugging
 * Shows all errors, network issues, and provides diagnostics
 * 
 * Remove the script tag from admin.html to disable
 */

(function() {
  'use strict';

  // 🎛️ Configuration
  const DEBUG_CONFIG = {
    enabled: true,
    showOverlay: true,
    logToConsole: true,
    maxLogs: 100,
    autoCheckAssets: true
  };

  if (!DEBUG_CONFIG.enabled) return;

  // 📦 Store
  const debugStore = {
    logs: [],
    errors: [],
    networkRequests: [],
    assetStatus: {}
  };

  // 🎨 Styles
  const styles = `
    #wishesu-debug-overlay {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 50vh;
      background: rgba(26, 26, 46, 0.98);
      color: #fff;
      font-family: 'Consolas', monospace;
      font-size: 12px;
      z-index: 999999;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      border-top: 3px solid #667eea;
      transition: transform 0.3s ease;
    }
    #wishesu-debug-overlay.minimized {
      transform: translateY(calc(100% - 40px));
    }
    .debug-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      cursor: pointer;
      user-select: none;
    }
    .debug-header h3 {
      margin: 0;
      font-size: 14px;
    }
    .debug-stats {
      display: flex;
      gap: 15px;
    }
    .debug-stat {
      background: rgba(255,255,255,0.2);
      padding: 3px 10px;
      border-radius: 3px;
    }
    .debug-stat.error {
      background: #F44336;
    }
    .debug-content {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }
    .debug-tabs {
      display: flex;
      gap: 5px;
      padding: 10px;
      background: rgba(0,0,0,0.3);
    }
    .debug-tab {
      padding: 5px 15px;
      background: rgba(255,255,255,0.1);
      border: none;
      color: #fff;
      cursor: pointer;
      border-radius: 3px;
    }
    .debug-tab.active {
      background: #667eea;
    }
    .debug-log {
      padding: 8px 10px;
      margin-bottom: 5px;
      background: rgba(0,0,0,0.3);
      border-radius: 3px;
      border-left: 3px solid #607D8B;
    }
    .debug-log.error {
      border-left-color: #F44336;
      background: rgba(244,67,54,0.1);
    }
    .debug-log.warning {
      border-left-color: #FFC107;
    }
    .debug-log.success {
      border-left-color: #4CAF50;
    }
    .debug-log.network {
      border-left-color: #2196F3;
    }
    .debug-log-time {
      color: #888;
      font-size: 10px;
    }
    .debug-log-msg {
      margin-top: 3px;
    }
    .debug-log-data {
      margin-top: 5px;
      padding: 5px;
      background: #000;
      border-radius: 3px;
      font-size: 11px;
      color: #4CAF50;
      max-height: 100px;
      overflow: auto;
    }
    .debug-actions {
      display: flex;
      gap: 10px;
      padding: 10px;
      background: rgba(0,0,0,0.3);
    }
    .debug-btn {
      padding: 8px 15px;
      background: #667eea;
      border: none;
      color: #fff;
      cursor: pointer;
      border-radius: 3px;
    }
    .debug-btn:hover {
      background: #764ba2;
    }
    .debug-btn.danger {
      background: #F44336;
    }
    .debug-fix-box {
      background: rgba(255,87,34,0.2);
      border: 1px solid #FF5722;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
    }
    .debug-fix-box h4 {
      margin: 0 0 10px 0;
      color: #FF5722;
    }
    .debug-fix-box pre {
      background: #000;
      padding: 10px;
      border-radius: 3px;
      overflow-x: auto;
    }
  `;

  // 📝 Logging functions
  function log(type, message, data = null) {
    const entry = {
      time: new Date().toISOString(),
      type,
      message,
      data
    };
    
    debugStore.logs.unshift(entry);
    if (debugStore.logs.length > DEBUG_CONFIG.maxLogs) {
      debugStore.logs.pop();
    }
    
    if (type === 'error') {
      debugStore.errors.unshift(entry);
    }
    
    if (DEBUG_CONFIG.logToConsole) {
      const style = type === 'error' ? 'color: #F44336' : 
                    type === 'warning' ? 'color: #FFC107' : 
                    type === 'success' ? 'color: #4CAF50' : 'color: #2196F3';
      console.log(`%c[WISHESU DEBUG] ${message}`, style, data || '');
    }
    
    updateOverlay();
  }

  // 🌐 Network interceptor
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown';
    const startTime = Date.now();
    
    log('network', `📤 Fetching: ${url}`);
    
    try {
      const response = await originalFetch.apply(this, args);
      const duration = Date.now() - startTime;
      
      const networkEntry = {
        url,
        status: response.status,
        duration,
        ok: response.ok,
        type: response.headers.get('content-type')
      };
      
      debugStore.networkRequests.unshift(networkEntry);
      
      if (!response.ok) {
        log('error', `❌ Network Error: ${url} - ${response.status}`, networkEntry);
        
        // Provide fix suggestions
        if (response.status === 404) {
          if (url.includes('.js') || url.includes('.css')) {
            log('error', `🔨 FIX: Static file not found. Check if file exists and wrangler.toml is configured correctly.`);
          }
        }
      } else {
        log('success', `✅ ${response.status} ${url} (${duration}ms)`);
      }
      
      return response;
    } catch (error) {
      log('error', `❌ Fetch failed: ${url}`, { error: error.message });
      throw error;
    }
  };

  // 🔴 Error handler
  window.addEventListener('error', (event) => {
    log('error', `❌ JavaScript Error: ${event.message}`, {
      filename: event.filename,
      line: event.lineno,
      column: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    log('error', `❌ Unhandled Promise Rejection: ${event.reason}`, {
      reason: String(event.reason)
    });
  });

  // 🎨 Create overlay
  function createOverlay() {
    if (!DEBUG_CONFIG.showOverlay) return;
    
    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'wishesu-debug-overlay';
    overlay.innerHTML = `
      <div class="debug-header" onclick="window.wishesuDebug.toggle()">
        <h3>🔍 WISHESU DEBUG</h3>
        <div class="debug-stats">
          <span class="debug-stat" id="debug-log-count">0 logs</span>
          <span class="debug-stat error" id="debug-error-count">0 errors</span>
        </div>
      </div>
      <div class="debug-tabs">
        <button class="debug-tab active" onclick="window.wishesuDebug.showTab('all')">All</button>
        <button class="debug-tab" onclick="window.wishesuDebug.showTab('errors')">Errors</button>
        <button class="debug-tab" onclick="window.wishesuDebug.showTab('network')">Network</button>
        <button class="debug-tab" onclick="window.wishesuDebug.showTab('assets')">Assets</button>
      </div>
      <div class="debug-content" id="debug-content">
        <div class="debug-log">Loading...</div>
      </div>
      <div class="debug-actions">
        <button class="debug-btn" onclick="window.wishesuDebug.checkAssets()">🔍 Check Assets</button>
        <button class="debug-btn" onclick="window.wishesuDebug.copyLogs()">📋 Copy Logs</button>
        <button class="debug-btn" onclick="window.wishesuDebug.openDebugPage()">📊 Full Debug Page</button>
        <button class="debug-btn danger" onclick="window.wishesuDebug.clear()">🗑️ Clear</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Start minimized
    overlay.classList.add('minimized');
  }

  // 🔄 Update overlay
  function updateOverlay() {
    if (!DEBUG_CONFIG.showOverlay) return;
    
    const content = document.getElementById('debug-content');
    const logCount = document.getElementById('debug-log-count');
    const errorCount = document.getElementById('debug-error-count');
    
    if (!content) return;
    
    if (logCount) logCount.textContent = `${debugStore.logs.length} logs`;
    if (errorCount) errorCount.textContent = `${debugStore.errors.length} errors`;
    
    const currentTab = window.wishesuDebug?.currentTab || 'all';
    let logs = currentTab === 'errors' ? debugStore.errors : 
               currentTab === 'network' ? debugStore.logs.filter(l => l.type === 'network') :
               debugStore.logs;
    
    content.innerHTML = logs.map(log => `
      <div class="debug-log ${log.type}">
        <span class="debug-log-time">${new Date(log.time).toLocaleTimeString()}</span>
        <div class="debug-log-msg">${escapeHtml(log.message)}</div>
        ${log.data ? `<pre class="debug-log-data">${escapeHtml(JSON.stringify(log.data, null, 2))}</pre>` : ''}
      </div>
    `).join('') || '<div class="debug-log">No logs yet</div>';
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  // 🌐 Global debug API
  window.wishesuDebug = {
    currentTab: 'all',
    
    toggle() {
      const overlay = document.getElementById('wishesu-debug-overlay');
      if (overlay) overlay.classList.toggle('minimized');
    },
    
    showTab(tab) {
      this.currentTab = tab;
      document.querySelectorAll('.debug-tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
      updateOverlay();
    },
    
    async checkAssets() {
      log('info', '🔍 Checking assets...');
      
      const assets = [
        '/core/theme/theme.css',
        '/admin/admin.js',
        '/admin/admin.layout.css',
        '/admin/admin.components.css',
        '/admin/admin.controls.css',
        '/admin/admin.settings.css',
        '/admin/admin.chat.css'
      ];
      
      for (const asset of assets) {
        try {
          const resp = await fetch(asset, { method: 'HEAD' });
          debugStore.assetStatus[asset] = resp.ok;
          if (resp.ok) {
            log('success', `✅ ${asset}`);
          } else {
            log('error', `❌ ${asset} - ${resp.status}`);
          }
        } catch (e) {
          log('error', `❌ ${asset} - ${e.message}`);
          debugStore.assetStatus[asset] = false;
        }
      }
    },
    
    copyLogs() {
      const text = JSON.stringify({
        timestamp: new Date().toISOString(),
        logs: debugStore.logs,
        errors: debugStore.errors,
        assetStatus: debugStore.assetStatus
      }, null, 2);
      
      navigator.clipboard.writeText(text).then(() => {
        log('success', '📋 Logs copied to clipboard!');
      });
    },
    
    openDebugPage() {
      window.open('/debug', '_blank');
    },
    
    clear() {
      debugStore.logs = [];
      debugStore.errors = [];
      debugStore.networkRequests = [];
      updateOverlay();
      log('info', '🗑️ Debug logs cleared');
    },
    
    log,
    store: debugStore
  };

  // 🚀 Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createOverlay);
  } else {
    createOverlay();
  }
  
  log('success', '🔍 Wishesu Debug System initialized');
  
  // Auto check assets on load
  if (DEBUG_CONFIG.autoCheckAssets) {
    setTimeout(() => window.wishesuDebug.checkAssets(), 1000);
  }

})();
