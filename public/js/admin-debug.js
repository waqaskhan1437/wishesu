/**
 * Admin Panel Specific Debug Tool
 * Tracks ES6 modules, tab clicks, view loading, and everything!
 */

(function() {
  const DEBUG_VERSION = '1766444251';
  let adminDebugData = {
    modulesLoaded: [],
    modulesFailed: [],
    tabClicks: [],
    viewLoads: [],
    eventListeners: [],
    domChanges: [],
    oldFilesDetected: []
  };

  // Create admin-specific debug panel
  function createAdminDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'admin-debug-panel';
    panel.innerHTML = `
      <style>
        #admin-debug-panel {
          position: fixed;
          top: 60px;
          right: 10px;
          width: 400px;
          max-height: 80vh;
          background: #1a1a1a;
          border: 2px solid #ff6b00;
          border-radius: 8px;
          color: #fff;
          font-family: monospace;
          font-size: 11px;
          z-index: 999998;
          overflow: hidden;
          box-shadow: 0 5px 20px rgba(255, 107, 0, 0.3);
        }

        .admin-debug-header {
          background: #ff6b00;
          color: #000;
          padding: 8px 12px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }

        .admin-debug-content {
          max-height: calc(80vh - 40px);
          overflow-y: auto;
          padding: 10px;
        }

        .admin-debug-content::-webkit-scrollbar {
          width: 6px;
        }

        .admin-debug-content::-webkit-scrollbar-thumb {
          background: #ff6b00;
          border-radius: 3px;
        }

        .admin-debug-section {
          margin-bottom: 12px;
          border: 1px solid #333;
          border-radius: 4px;
        }

        .admin-debug-section-title {
          background: #2a2a2a;
          padding: 6px 8px;
          font-weight: bold;
          color: #ff6b00;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
        }

        .admin-debug-section-content {
          padding: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .admin-debug-section-content.collapsed {
          display: none;
        }

        .admin-debug-item {
          padding: 4px 0;
          border-bottom: 1px solid #222;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }

        .admin-debug-icon {
          min-width: 20px;
          font-size: 14px;
        }

        .admin-debug-text {
          flex: 1;
          word-break: break-word;
        }

        .admin-debug-time {
          color: #888;
          font-size: 10px;
        }

        .status-good { color: #00ff00; }
        .status-bad { color: #ff0000; }
        .status-warn { color: #ffff00; }

        .admin-debug-btn {
          background: #333;
          border: 1px solid #ff6b00;
          color: #ff6b00;
          padding: 3px 8px;
          cursor: pointer;
          border-radius: 3px;
          font-size: 10px;
        }

        .admin-debug-btn:hover {
          background: #ff6b00;
          color: #000;
        }

        .old-file-alert {
          background: #ff0000;
          color: #fff;
          padding: 8px;
          margin: 8px 0;
          border-radius: 4px;
          font-weight: bold;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      </style>

      <div class="admin-debug-header" onclick="window.adminDebug.toggle()">
        <span>🔍 ADMIN DEBUG</span>
        <button class="admin-debug-btn" onclick="event.stopPropagation(); window.adminDebug.runDiagnostics()">Diagnose</button>
      </div>

      <div class="admin-debug-content">
        <div id="old-files-alert"></div>

        <div class="admin-debug-section">
          <div class="admin-debug-section-title" onclick="window.adminDebug.toggleSection(this)">
            📦 ES6 MODULES <span>▼</span>
          </div>
          <div class="admin-debug-section-content" id="modules-list"></div>
        </div>

        <div class="admin-debug-section">
          <div class="admin-debug-section-title" onclick="window.adminDebug.toggleSection(this)">
            🖱️ TAB CLICKS <span>▼</span>
          </div>
          <div class="admin-debug-section-content" id="tab-clicks-list"></div>
        </div>

        <div class="admin-debug-section">
          <div class="admin-debug-section-title" onclick="window.adminDebug.toggleSection(this)">
            📄 VIEW LOADS <span>▼</span>
          </div>
          <div class="admin-debug-section-content" id="view-loads-list"></div>
        </div>

        <div class="admin-debug-section">
          <div class="admin-debug-section-title" onclick="window.adminDebug.toggleSection(this)">
            🎯 EVENT LISTENERS <span>▼</span>
          </div>
          <div class="admin-debug-section-content" id="event-listeners-list"></div>
        </div>

        <div class="admin-debug-section">
          <div class="admin-debug-section-title" onclick="window.adminDebug.toggleSection(this)">
            🔄 DOM CHANGES <span>▼</span>
          </div>
          <div class="admin-debug-section-content" id="dom-changes-list"></div>
        </div>

        <div class="admin-debug-section">
          <div class="admin-debug-section-title" onclick="window.adminDebug.toggleSection(this)">
            ⚙️ ADMIN APP STATE <span>▼</span>
          </div>
          <div class="admin-debug-section-content" id="app-state-list"></div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }

  // Log admin activity
  function logAdmin(section, icon, message, status = 'good') {
    const timestamp = new Date().toLocaleTimeString();
    const container = document.getElementById(section + '-list');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'admin-debug-item';
    item.innerHTML = `
      <span class="admin-debug-icon">${icon}</span>
      <span class="admin-debug-text status-${status}">
        ${message}
        <div class="admin-debug-time">${timestamp}</div>
      </span>
    `;

    container.insertBefore(item, container.firstChild);

    // Keep only last 20 items
    while (container.children.length > 20) {
      container.removeChild(container.lastChild);
    }

    // Also log to console
    console.log(`[ADMIN DEBUG] ${message}`, timestamp);

    // Send to main debug monitor if available
    if (window.debugMonitor) {
      window.debugMonitor.log(status === 'bad' ? 'error' : status === 'warn' ? 'warn' : 'info', message);
    }
  }

  // Track ES6 module loading
  function trackModuleLoading() {
    // Override module import errors
    window.addEventListener('error', (event) => {
      if (event.filename && (event.filename.includes('.js') || event.message.includes('module'))) {
        const isOldFile = !event.filename.includes(DEBUG_VERSION);

        adminDebugData.modulesFailed.push({
          file: event.filename,
          error: event.message,
          time: new Date().toISOString(),
          isOld: isOldFile
        });

        logAdmin('modules', '❌', `Failed to load: ${event.filename}`, 'bad');

        if (isOldFile) {
          logAdmin('modules', '⚠️', `OLD FILE DETECTED: ${event.filename} (no version!)`, 'warn');
          detectOldFile(event.filename, 'Failed to load');
        }
      }
    });

    // Track successful script loads
    document.addEventListener('DOMContentLoaded', () => {
      const scripts = document.querySelectorAll('script[src], script[type="module"]');
      scripts.forEach(script => {
        const src = script.getAttribute('src');
        if (src) {
          const hasVersion = src.includes('v=' + DEBUG_VERSION);
          const status = hasVersion ? 'good' : 'warn';

          adminDebugData.modulesLoaded.push({
            src,
            hasVersion,
            time: new Date().toISOString()
          });

          logAdmin('modules', hasVersion ? '✅' : '⚠️', `${hasVersion ? 'NEW' : 'OLD'}: ${src}`, status);

          if (!hasVersion && !src.includes('http')) {
            detectOldFile(src, 'No version parameter');
          }
        }

        // Track inline modules
        if (script.type === 'module' && !script.src) {
          const content = script.textContent.substring(0, 100);
          logAdmin('modules', '📜', `Inline module: ${content}...`, 'good');
        }
      });
    });
  }

  // Detect old files
  function detectOldFile(filename, reason) {
    adminDebugData.oldFilesDetected.push({
      filename,
      reason,
      time: new Date().toISOString()
    });

    // Show alert
    const alertContainer = document.getElementById('old-files-alert');
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="old-file-alert">
          🚨 OLD FILE DETECTED!<br>
          File: ${filename}<br>
          Reason: ${reason}<br>
          Expected version: ${DEBUG_VERSION}
        </div>
      `;
    }
  }

  // Track tab clicks
  function trackTabClicks() {
    // Wait for DOM to be ready
    setTimeout(() => {
      const menuItems = document.querySelectorAll('.menu-item, [data-view], .sidebar-menu button');

      logAdmin('tab-clicks', '🎯', `Found ${menuItems.length} potential tab elements`, menuItems.length > 0 ? 'good' : 'bad');

      if (menuItems.length === 0) {
        logAdmin('tab-clicks', '❌', 'NO TAB ELEMENTS FOUND! This is the problem!', 'bad');
        logAdmin('tab-clicks', '💡', 'Checking if AdminApp loaded...', 'warn');

        // Check if AdminApp exists
        setTimeout(() => {
          if (typeof AdminApp !== 'undefined' || window.AdminApp) {
            logAdmin('tab-clicks', '✅', 'AdminApp class exists', 'good');
          } else {
            logAdmin('tab-clicks', '❌', 'AdminApp class NOT FOUND! Module failed to load!', 'bad');
            detectOldFile('/js/admin/app.js', 'AdminApp not initialized');
          }
        }, 500);
      }

      menuItems.forEach((item, index) => {
        const viewName = item.getAttribute('data-view') || item.textContent.trim();

        // Track original click handler
        const originalHandler = item.onclick;
        logAdmin('event-listeners', '👂', `Tab ${index + 1} (${viewName}): ${originalHandler ? 'Has onclick' : 'No onclick'}`, originalHandler ? 'good' : 'warn');

        // Add our own click tracker
        item.addEventListener('click', function(e) {
          const timestamp = new Date().toLocaleTimeString();

          adminDebugData.tabClicks.push({
            tab: viewName,
            time: timestamp,
            target: e.target.tagName
          });

          logAdmin('tab-clicks', '🖱️', `Clicked: ${viewName}`, 'good');

          // Check if handler actually runs
          setTimeout(() => {
            logAdmin('tab-clicks', '⏱️', `Handler executed for: ${viewName}`, 'good');
          }, 100);
        }, true);
      });
    }, 1000);
  }

  // Track view loading
  function trackViewLoading() {
    // Monitor main-panel for changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.target.id === 'main-panel') {
          const content = mutation.target.innerHTML.substring(0, 100);

          adminDebugData.viewLoads.push({
            time: new Date().toISOString(),
            content: content
          });

          logAdmin('view-loads', '📄', `View loaded: ${content}...`, 'good');
        }
      });
    });

    setTimeout(() => {
      const mainPanel = document.getElementById('main-panel');
      if (mainPanel) {
        observer.observe(mainPanel, { childList: true, subtree: true });
        logAdmin('view-loads', '👁️', 'Watching main-panel for changes', 'good');
      } else {
        logAdmin('view-loads', '❌', 'main-panel NOT FOUND!', 'bad');
      }
    }, 500);
  }

  // Track DOM changes
  function trackDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              const tag = node.tagName;
              const classes = node.className;

              adminDebugData.domChanges.push({
                type: 'added',
                tag,
                classes,
                time: new Date().toISOString()
              });

              logAdmin('dom-changes', '➕', `Added: <${tag}> ${classes}`, 'good');
            }
          });
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    logAdmin('dom-changes', '👁️', 'Watching DOM changes', 'good');
  }

  // Check AdminApp state
  function checkAdminAppState() {
    setTimeout(() => {
      const stateContainer = document.getElementById('app-state-list');
      if (!stateContainer) return;

      // Check if AdminApp loaded
      const appExists = typeof AdminApp !== 'undefined' || window.AdminApp;
      logAdmin('app-state', appExists ? '✅' : '❌', `AdminApp class: ${appExists ? 'EXISTS' : 'NOT FOUND'}`, appExists ? 'good' : 'bad');

      // Check ES6 module support
      const supportsModules = 'noModule' in HTMLScriptElement.prototype;
      logAdmin('app-state', supportsModules ? '✅' : '❌', `ES6 modules: ${supportsModules ? 'SUPPORTED' : 'NOT SUPPORTED'}`, supportsModules ? 'good' : 'bad');

      // Check main-panel
      const mainPanel = document.getElementById('main-panel');
      logAdmin('app-state', mainPanel ? '✅' : '❌', `main-panel: ${mainPanel ? 'FOUND' : 'NOT FOUND'}`, mainPanel ? 'good' : 'bad');

      // Check sidebar
      const sidebar = document.querySelector('.sidebar');
      logAdmin('app-state', sidebar ? '✅' : '❌', `sidebar: ${sidebar ? 'FOUND' : 'NOT FOUND'}`, sidebar ? 'good' : 'bad');

      // Check menu items
      const menuItems = document.querySelectorAll('.menu-item');
      logAdmin('app-state', menuItems.length > 0 ? '✅' : '❌', `menu-items: ${menuItems.length} found`, menuItems.length > 0 ? 'good' : 'bad');

      // List all scripts
      const allScripts = Array.from(document.querySelectorAll('script[src]'));
      const scriptsList = allScripts.map(s => s.src).join('\n');
      logAdmin('app-state', '📜', `Total scripts: ${allScripts.length}\n${scriptsList}`, 'good');
    }, 1500);
  }

  // Run comprehensive diagnostics
  function runDiagnostics() {
    logAdmin('modules', '🔍', '=== RUNNING DIAGNOSTICS ===', 'warn');

    // Check 1: ES6 Module Support
    const supportsModules = 'noModule' in HTMLScriptElement.prototype;
    logAdmin('modules', supportsModules ? '✅' : '❌', `ES6 Support: ${supportsModules}`, supportsModules ? 'good' : 'bad');

    // Check 2: AdminApp existence
    setTimeout(() => {
      const appExists = typeof AdminApp !== 'undefined' || window.AdminApp;
      logAdmin('modules', appExists ? '✅' : '❌', `AdminApp: ${appExists ? 'Loaded' : 'NOT LOADED'}`, appExists ? 'good' : 'bad');

      if (!appExists) {
        logAdmin('modules', '💡', 'SOLUTION: AdminApp module failed to load. Check console for import errors.', 'warn');
        logAdmin('modules', '💡', 'Possible causes: 1) Module syntax error 2) Import path wrong 3) File not found', 'warn');
      }
    }, 100);

    // Check 3: Tab elements
    setTimeout(() => {
      const tabs = document.querySelectorAll('.menu-item');
      logAdmin('tab-clicks', tabs.length > 0 ? '✅' : '❌', `Tabs: ${tabs.length} found`, tabs.length > 0 ? 'good' : 'bad');

      if (tabs.length === 0) {
        logAdmin('tab-clicks', '💡', 'SOLUTION: No tabs found. Dashboard HTML may not be loading correctly.', 'warn');
      }

      // Check onclick handlers
      tabs.forEach((tab, i) => {
        const hasHandler = tab.onclick !== null;
        const viewName = tab.getAttribute('data-view') || tab.textContent.trim();
        logAdmin('tab-clicks', hasHandler ? '✅' : '❌', `Tab ${i + 1} (${viewName}): ${hasHandler ? 'Has handler' : 'NO HANDLER'}`, hasHandler ? 'good' : 'bad');
      });
    }, 200);

    // Check 4: Old files
    const oldFiles = adminDebugData.oldFilesDetected;
    if (oldFiles.length > 0) {
      logAdmin('modules', '🚨', `OLD FILES: ${oldFiles.length} detected!`, 'bad');
      oldFiles.forEach(file => {
        logAdmin('modules', '⚠️', `${file.filename} - ${file.reason}`, 'bad');
      });
      logAdmin('modules', '💡', 'SOLUTION: Clear cache and hard refresh (Ctrl+Shift+R)', 'warn');
    } else {
      logAdmin('modules', '✅', 'No old files detected', 'good');
    }

    logAdmin('modules', '🔍', '=== DIAGNOSTICS COMPLETE ===', 'warn');
  }

  // Public API
  window.adminDebug = {
    toggle: function() {
      const panel = document.getElementById('admin-debug-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    },

    toggleSection: function(header) {
      const content = header.nextElementSibling;
      const arrow = header.querySelector('span:last-child');
      content.classList.toggle('collapsed');
      arrow.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
    },

    runDiagnostics: runDiagnostics,

    getData: function() {
      return adminDebugData;
    },

    logEvent: function(message, status = 'good') {
      logAdmin('tab-clicks', '📝', message, status);
    }
  };

  // Initialize
  function init() {
    console.log('🔍 Admin Debug Tool Initializing...');

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  function setup() {
    createAdminDebugPanel();
    trackModuleLoading();
    trackTabClicks();
    trackViewLoading();
    trackDOMChanges();
    checkAdminAppState();

    logAdmin('modules', '🚀', 'Admin Debug Tool Started', 'good');

    // Auto-run diagnostics after 2 seconds
    setTimeout(() => {
      runDiagnostics();
    }, 2000);
  }

  init();
})();

// Also expose globally for easy access
console.log('%c🔍 Admin Debug Tool Loaded', 'color: #ff6b00; font-size: 14px; font-weight: bold;');
console.log('%cRun window.adminDebug.runDiagnostics() for full analysis', 'color: #ff6b00;');
