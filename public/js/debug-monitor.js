/**
 * INTELLIGENT Debug Monitor - Optimized Real-time Debugging
 * Smart memory management, detailed tracking, performance optimized
 */

(function() {
  const DEBUG_VERSION = '1766444251';
  const DEBUG_ENABLED = true; // Always enabled

  // Smart Configuration - Prevents memory overflow
  const CONFIG = {
    MAX_LOGS: 100,           // Maximum logs to keep in memory
    MAX_NETWORK_LOGS: 50,    // Maximum network requests to track
    MAX_ERROR_LOGS: 30,      // Maximum errors to keep
    CLEANUP_INTERVAL: 30000, // Clean old data every 30 seconds
    MONITOR_PERFORMANCE: true,
    MONITOR_MEMORY: true,
    AUTO_EXPORT_ON_ERROR: false
  };

  // Store all debug data with size limits
  const debugData = {
    version: DEBUG_VERSION,
    pageLoad: new Date().toISOString(),
    errors: [],
    warnings: [],
    info: [],
    network: [],
    scripts: [],
    performance: {},
    environment: {},
    memorySnapshots: []
  };

  // Create debug console
  function createDebugConsole() {
    const container = document.createElement('div');
    container.id = 'debug-monitor';
    container.innerHTML = `
      <style>
        #debug-monitor {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          max-height: 300px;
          background: rgba(0, 0, 0, 0.95);
          color: #00ff00;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          z-index: 999999;
          overflow: hidden;
          border-top: 3px solid #00ff00;
          box-shadow: 0 -5px 20px rgba(0, 255, 0, 0.2);
          transition: all 0.3s ease;
        }

        #debug-monitor.minimized {
          max-height: 40px;
        }

        .debug-header {
          background: #001100;
          padding: 8px 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #00ff00;
          cursor: pointer;
        }

        .debug-title {
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .debug-status {
          display: flex;
          gap: 15px;
          font-size: 11px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .status-ok { background: #00ff00; }
        .status-warn { background: #ffff00; }
        .status-error { background: #ff0000; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .debug-controls {
          display: flex;
          gap: 8px;
        }

        .debug-btn {
          background: transparent;
          border: 1px solid #00ff00;
          color: #00ff00;
          padding: 4px 10px;
          cursor: pointer;
          font-size: 11px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }

        .debug-btn:hover {
          background: #00ff00;
          color: #000;
        }

        .debug-content {
          max-height: 260px;
          overflow-y: auto;
          padding: 10px;
        }

        .debug-content::-webkit-scrollbar {
          width: 8px;
        }

        .debug-content::-webkit-scrollbar-track {
          background: #001100;
        }

        .debug-content::-webkit-scrollbar-thumb {
          background: #00ff00;
          border-radius: 4px;
        }

        .debug-section {
          margin-bottom: 15px;
          border: 1px solid #003300;
          border-radius: 4px;
          overflow: hidden;
        }

        .debug-section-header {
          background: #002200;
          padding: 6px 10px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .debug-section-header:hover {
          background: #003300;
        }

        .debug-section-content {
          padding: 8px 10px;
          max-height: 200px;
          overflow-y: auto;
        }

        .debug-section-content.collapsed {
          display: none;
        }

        .debug-line {
          padding: 3px 0;
          display: flex;
          gap: 10px;
          border-bottom: 1px solid #001100;
        }

        .debug-time {
          color: #666;
          min-width: 80px;
        }

        .debug-type {
          min-width: 70px;
          font-weight: bold;
        }

        .debug-type.info { color: #00ffff; }
        .debug-type.warn { color: #ffff00; }
        .debug-type.error { color: #ff0000; }
        .debug-type.success { color: #00ff00; }
        .debug-type.network { color: #ff00ff; }

        .debug-message {
          flex: 1;
          word-break: break-word;
        }

        .debug-badge {
          display: inline-block;
          background: #003300;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          margin-left: 5px;
        }

        .debug-toggle {
          font-size: 18px;
          line-height: 1;
        }
      </style>

      <div class="debug-header" onclick="window.debugMonitor.toggle()">
        <div class="debug-title">
          🐛 <span>DEBUG MONITOR</span>
          <span class="debug-badge">v${DEBUG_VERSION}</span>
        </div>
        <div class="debug-status">
          <div class="status-item">
            <div class="status-dot status-ok"></div>
            <span id="debug-ok-count">0</span>
          </div>
          <div class="status-item">
            <div class="status-dot status-warn"></div>
            <span id="debug-warn-count">0</span>
          </div>
          <div class="status-item">
            <div class="status-dot status-error"></div>
            <span id="debug-error-count">0</span>
          </div>
        </div>
        <div class="debug-controls">
          <button class="debug-btn" onclick="event.stopPropagation(); window.debugMonitor.clear()">Clear</button>
          <button class="debug-btn" onclick="event.stopPropagation(); window.debugMonitor.export()">Export</button>
          <span class="debug-toggle">▼</span>
        </div>
      </div>

      <div class="debug-content" id="debug-content">
        <div class="debug-section">
          <div class="debug-section-header" onclick="window.debugMonitor.toggleSection(this)">
            📊 SYSTEM INFO
            <span>▼</span>
          </div>
          <div class="debug-section-content" id="system-info"></div>
        </div>

        <div class="debug-section">
          <div class="debug-section-header" onclick="window.debugMonitor.toggleSection(this)">
            📜 ACTIVITY LOG
            <span>▼</span>
          </div>
          <div class="debug-section-content" id="activity-log"></div>
        </div>

        <div class="debug-section">
          <div class="debug-section-header" onclick="window.debugMonitor.toggleSection(this)">
            🌐 NETWORK
            <span>▼</span>
          </div>
          <div class="debug-section-content" id="network-log"></div>
        </div>

        <div class="debug-section">
          <div class="debug-section-header" onclick="window.debugMonitor.toggleSection(this)">
            📦 SCRIPTS
            <span>▼</span>
          </div>
          <div class="debug-section-content" id="scripts-log"></div>
        </div>

        <div class="debug-section">
          <div class="debug-section-header" onclick="window.debugMonitor.toggleSection(this)">
            ❌ ERRORS
            <span>▼</span>
          </div>
          <div class="debug-section-content" id="errors-log"></div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    return container;
  }

  // Smart Log function with memory management
  function log(type, message, details = null) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = { timestamp, type, message, details };

    // Add to appropriate array with size limit
    if (type === 'error') {
      debugData.errors.push(entry);
      if (debugData.errors.length > CONFIG.MAX_ERROR_LOGS) {
        debugData.errors.shift(); // Remove oldest
      }
      updateCount('debug-error-count', debugData.errors.length);
    } else if (type === 'warn') {
      debugData.warnings.push(entry);
      if (debugData.warnings.length > CONFIG.MAX_LOGS) {
        debugData.warnings.shift();
      }
      updateCount('debug-warn-count', debugData.warnings.length);
    } else {
      debugData.info.push(entry);
      if (debugData.info.length > CONFIG.MAX_LOGS) {
        debugData.info.shift();
      }
      updateCount('debug-ok-count', debugData.info.length);
    }

    // Add to activity log
    addLogLine(timestamp, type, message, details);

    // Also log to console (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
      console.log(`[DEBUG ${type.toUpperCase()}]`, message, details || '');
    }
  }

  function addLogLine(time, type, message, details) {
    const logContainer = document.getElementById('activity-log');
    if (!logContainer) return;

    const line = document.createElement('div');
    line.className = 'debug-line';
    line.innerHTML = `
      <span class="debug-time">${time}</span>
      <span class="debug-type ${type}">${type.toUpperCase()}</span>
      <span class="debug-message">${message} ${details ? `<br><small>${JSON.stringify(details).substring(0, 100)}</small>` : ''}</span>
    `;

    logContainer.insertBefore(line, logContainer.firstChild);

    // Keep only last 50 entries
    while (logContainer.children.length > 50) {
      logContainer.removeChild(logContainer.lastChild);
    }
  }

  function updateCount(id, count) {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  }

  // System info
  function collectSystemInfo() {
    const info = {
      // Page Info
      url: window.location.href,
      pathname: window.location.pathname,
      title: document.title,

      // Version Info
      expectedVersion: DEBUG_VERSION,

      // Browser Info
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,

      // Screen Info
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewport: `${window.innerWidth}x${window.innerHeight}`,

      // Performance
      loadTime: performance.now().toFixed(2) + 'ms',

      // Storage
      localStorage: Object.keys(localStorage).length + ' keys',
      sessionStorage: Object.keys(sessionStorage).length + ' keys'
    };

    debugData.environment = info;
    displaySystemInfo(info);
    return info;
  }

  function displaySystemInfo(info) {
    const container = document.getElementById('system-info');
    if (!container) return;

    container.innerHTML = Object.keys(info).map(key => `
      <div class="debug-line">
        <span class="debug-type info">${key}</span>
        <span class="debug-message">${info[key]}</span>
      </div>
    `).join('');
  }

  // Check scripts
  function checkScripts() {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const scriptsContainer = document.getElementById('scripts-log');

    scripts.forEach(script => {
      const src = script.getAttribute('src');
      const versionMatch = src.match(/v=(\d+)/);
      const version = versionMatch ? versionMatch[1] : 'none';
      const status = version === DEBUG_VERSION ? 'success' : (version === 'none' ? 'warn' : 'error');

      debugData.scripts.push({ src, version, status });

      if (scriptsContainer) {
        const line = document.createElement('div');
        line.className = 'debug-line';
        line.innerHTML = `
          <span class="debug-type ${status}">${status === 'success' ? '✅' : status === 'warn' ? '⚠️' : '❌'}</span>
          <span class="debug-message">${src} <span class="debug-badge">v=${version}</span></span>
        `;
        scriptsContainer.appendChild(line);
      }

      if (status === 'error') {
        log('error', `Script version mismatch: ${src}`, { expected: DEBUG_VERSION, got: version });
      } else if (status === 'warn') {
        log('warn', `Script not versioned: ${src}`);
      }
    });

    log('info', `Checked ${scripts.length} scripts`, {
      total: scripts.length,
      correct: debugData.scripts.filter(s => s.status === 'success').length,
      missing: debugData.scripts.filter(s => s.status === 'warn').length,
      wrong: debugData.scripts.filter(s => s.status === 'error').length
    });
  }

  // Optimized Network monitoring with smart filtering
  function monitorNetwork() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      const startTime = performance.now();

      // Skip monitoring debug/health check endpoints to reduce noise
      const skipUrls = ['/api/debug', '/health', '/ping'];
      const shouldSkip = skipUrls.some(skip => url.includes(skip));

      if (!shouldSkip) {
        log('network', `→ ${url.split('?')[0]}`); // Log only path, not query params
      }

      return originalFetch.apply(this, args)
        .then(response => {
          const duration = (performance.now() - startTime).toFixed(2);
          const status = response.ok ? 'success' : 'error';

          if (!shouldSkip) {
            // Smart size limiting
            debugData.network.push({
              url: url.split('?')[0], // Store only path
              status: response.status,
              ok: response.ok,
              duration,
              timestamp: new Date().toISOString()
            });

            // Keep only recent network logs
            if (debugData.network.length > CONFIG.MAX_NETWORK_LOGS) {
              debugData.network.shift();
            }

            const networkContainer = document.getElementById('network-log');
            if (networkContainer) {
              const line = document.createElement('div');
              line.className = 'debug-line';
              line.innerHTML = `
                <span class="debug-type ${status}">${response.status}</span>
                <span class="debug-message">${url.split('?')[0]} <span class="debug-badge">${duration}ms</span></span>
              `;
              networkContainer.insertBefore(line, networkContainer.firstChild);

              // Keep only last 30 in DOM
              while (networkContainer.children.length > 30) {
                networkContainer.removeChild(networkContainer.lastChild);
              }
            }

            if (duration > 2000) {
              log('warn', `Slow request: ${url.split('?')[0]} (${duration}ms)`);
            } else if (!response.ok) {
              log('error', `${response.status} ${url.split('?')[0]} (${duration}ms)`);
            }
          }
          return response;
        })
        .catch(error => {
          const duration = (performance.now() - startTime).toFixed(2);
          if (!shouldSkip) {
            log('error', `Fetch failed: ${url.split('?')[0]}`, error.message);
          }
          throw error;
        });
    };
  }

  // Monitor errors
  function monitorErrors() {
    window.addEventListener('error', (event) => {
      const error = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? event.error.stack : null
      };

      debugData.errors.push(error);
      log('error', `JavaScript Error: ${event.message}`, error);

      const errorsContainer = document.getElementById('errors-log');
      if (errorsContainer) {
        const line = document.createElement('div');
        line.className = 'debug-line';
        line.innerHTML = `
          <span class="debug-type error">ERROR</span>
          <span class="debug-message">
            ${event.message}<br>
            <small>${event.filename}:${event.lineno}:${event.colno}</small>
          </span>
        `;
        errorsContainer.insertBefore(line, errorsContainer.firstChild);
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = {
        reason: event.reason,
        promise: event.promise
      };

      debugData.errors.push(error);
      log('error', `Unhandled Promise Rejection: ${event.reason}`, error);

      const errorsContainer = document.getElementById('errors-log');
      if (errorsContainer) {
        const line = document.createElement('div');
        line.className = 'debug-line';
        line.innerHTML = `
          <span class="debug-type error">PROMISE</span>
          <span class="debug-message">${event.reason}</span>
        `;
        errorsContainer.insertBefore(line, errorsContainer.firstChild);
      }
    });
  }

  // Check server version
  async function checkServerVersion() {
    try {
      log('info', 'Checking server version...');
      const response = await fetch('/api/debug?_=' + Date.now());
      const data = await response.json();

      const serverVersion = data.version;
      const match = serverVersion === DEBUG_VERSION;

      log(match ? 'success' : 'error', `Server version: ${serverVersion}`, {
        expected: DEBUG_VERSION,
        actual: serverVersion,
        match
      });

      if (!match) {
        log('error', `VERSION MISMATCH! Expected ${DEBUG_VERSION}, got ${serverVersion}`);
      }

      return data;
    } catch (error) {
      log('error', 'Failed to check server version', error.message);
    }
  }

  // Check Service Worker
  async function checkServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      log('warn', 'Service Worker not supported');
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      log('info', `Service Worker registrations: ${registrations.length}`);

      registrations.forEach((reg, i) => {
        const state = reg.active ? 'active' : reg.installing ? 'installing' : 'waiting';
        log('info', `SW ${i + 1}: ${state}`, { scope: reg.scope });
      });
    } catch (error) {
      log('error', 'Service Worker check failed', error.message);
    }
  }

  // Check caches
  async function checkCaches() {
    if (!('caches' in window)) {
      log('warn', 'Cache API not supported');
      return;
    }

    try {
      const cacheNames = await caches.keys();
      log('info', `Caches found: ${cacheNames.length}`, cacheNames);

      cacheNames.forEach(name => {
        const isCurrent = name.includes(DEBUG_VERSION);
        log(isCurrent ? 'success' : 'warn', `Cache: ${name}`, { current: isCurrent });
      });
    } catch (error) {
      log('error', 'Cache check failed', error.message);
    }
  }

  // Public API
  window.debugMonitor = {
    log: log,

    toggle: function() {
      const monitor = document.getElementById('debug-monitor');
      if (monitor) {
        monitor.classList.toggle('minimized');
      }
    },

    toggleSection: function(header) {
      const content = header.nextElementSibling;
      const arrow = header.querySelector('span:last-child');
      content.classList.toggle('collapsed');
      arrow.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
    },

    clear: function() {
      debugData.errors = [];
      debugData.warnings = [];
      debugData.info = [];
      debugData.network = [];

      ['activity-log', 'network-log', 'errors-log'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
      });

      updateCount('debug-ok-count', 0);
      updateCount('debug-warn-count', 0);
      updateCount('debug-error-count', 0);

      log('info', 'Debug log cleared');
    },

    export: function() {
      const data = JSON.stringify(debugData, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug-log-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      log('success', 'Debug data exported');
    },

    getData: function() {
      return debugData;
    }
  };

  // Initialize
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  // Memory cleanup task
  function startMemoryCleanup() {
    setInterval(() => {
      // Check memory usage
      if (CONFIG.MONITOR_MEMORY && performance.memory) {
        const memUsage = {
          used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
          total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
          limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)
        };

        debugData.memorySnapshots.push({
          timestamp: new Date().toISOString(),
          ...memUsage
        });

        // Keep only last 10 snapshots
        if (debugData.memorySnapshots.length > 10) {
          debugData.memorySnapshots.shift();
        }

        // Warn if memory is high
        const usagePercent = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 80) {
          log('warn', `High memory usage: ${usagePercent.toFixed(1)}% (${memUsage.used}MB / ${memUsage.limit}MB)`);
        }
      }

      // Clean old DOM elements
      ['activity-log', 'network-log', 'errors-log'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.children.length > 50) {
          while (el.children.length > 30) {
            el.removeChild(el.lastChild);
          }
        }
      });
    }, CONFIG.CLEANUP_INTERVAL);
  }

  // Performance monitoring
  function monitorPerformance() {
    if (!CONFIG.MONITOR_PERFORMANCE) return;

    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        if (perfData) {
          debugData.performance = {
            dns: (perfData.domainLookupEnd - perfData.domainLookupStart).toFixed(2),
            connect: (perfData.connectEnd - perfData.connectStart).toFixed(2),
            ttfb: (perfData.responseStart - perfData.requestStart).toFixed(2),
            download: (perfData.responseEnd - perfData.responseStart).toFixed(2),
            domReady: (perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart).toFixed(2),
            load: (perfData.loadEventEnd - perfData.loadEventStart).toFixed(2),
            total: (perfData.loadEventEnd - perfData.fetchStart).toFixed(2)
          };

          log('info', `Page loaded in ${debugData.performance.total}ms`, debugData.performance);
        }
      }, 0);
    });
  }

  function setup() {
    log('info', '🐛 Intelligent Debug Monitor Started', { version: DEBUG_VERSION, page: window.location.pathname });

    createDebugConsole();
    collectSystemInfo();
    monitorNetwork();
    monitorErrors();
    monitorPerformance();
    startMemoryCleanup();

    // Run checks
    setTimeout(() => {
      checkScripts();
      checkServerVersion();
      checkServiceWorker();
      checkCaches();

      log('success', '✅ All checks complete - Monitor active with smart memory management');
    }, 1000);
  }

  init();
})();
