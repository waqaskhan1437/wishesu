/**
 * 🔍 WISHESU ADVANCED DEBUG SYSTEM
 * ================================
 * Easy to enable/disable - just change DEBUG_ENABLED
 * All debug code is in this single file
 * Remove this file to disable debugging completely
 */

// ⚡ MASTER SWITCH - Set to false to disable all debugging
export const DEBUG_ENABLED = true;

// 🎨 Debug categories with colors
const CATEGORIES = {
  REQUEST: { emoji: '📥', color: '#4CAF50', name: 'REQUEST' },
  RESPONSE: { emoji: '📤', color: '#2196F3', name: 'RESPONSE' },
  ASSETS: { emoji: '📁', color: '#FF9800', name: 'ASSETS' },
  ROUTER: { emoji: '🛣️', color: '#9C27B0', name: 'ROUTER' },
  DATABASE: { emoji: '🗄️', color: '#00BCD4', name: 'DATABASE' },
  ERROR: { emoji: '❌', color: '#F44336', name: 'ERROR' },
  WARNING: { emoji: '⚠️', color: '#FFC107', name: 'WARNING' },
  SUCCESS: { emoji: '✅', color: '#4CAF50', name: 'SUCCESS' },
  INFO: { emoji: 'ℹ️', color: '#607D8B', name: 'INFO' },
  TIMING: { emoji: '⏱️', color: '#E91E63', name: 'TIMING' },
  ENV: { emoji: '🔧', color: '#795548', name: 'ENV' },
  SPA: { emoji: '🖥️', color: '#3F51B5', name: 'SPA' },
  API: { emoji: '🔌', color: '#009688', name: 'API' },
  FIX: { emoji: '🔨', color: '#FF5722', name: 'FIX SUGGESTION' }
};

// 📝 Store all logs for this request
class DebugSession {
  constructor(requestId) {
    this.requestId = requestId;
    this.startTime = Date.now();
    this.logs = [];
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  log(category, message, data = null) {
    const entry = {
      timestamp: Date.now() - this.startTime,
      category: CATEGORIES[category] || CATEGORIES.INFO,
      message,
      data
    };
    this.logs.push(entry);
    
    if (category === 'ERROR') this.errors.push(entry);
    if (category === 'WARNING') this.warnings.push(entry);
    if (category === 'FIX') this.fixes.push(entry);
  }

  toJSON() {
    return {
      requestId: this.requestId,
      duration: Date.now() - this.startTime,
      totalLogs: this.logs.length,
      errors: this.errors.length,
      warnings: this.warnings.length,
      fixes: this.fixes.length,
      logs: this.logs
    };
  }

  toHTML() {
    return generateDebugHTML(this);
  }
}

// 🎯 Create new debug session for each request
export function createDebugSession(req) {
  if (!DEBUG_ENABLED) return null;
  const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  return new DebugSession(requestId);
}

// 📊 Generate beautiful HTML debug page
function generateDebugHTML(session) {
  const logs = session.logs.map(log => `
    <div class="log-entry" style="border-left: 4px solid ${log.category.color};">
      <div class="log-header">
        <span class="emoji">${log.category.emoji}</span>
        <span class="category" style="color: ${log.category.color};">[${log.category.name}]</span>
        <span class="time">+${log.timestamp}ms</span>
      </div>
      <div class="log-message">${escapeHtml(log.message)}</div>
      ${log.data ? `<pre class="log-data">${escapeHtml(JSON.stringify(log.data, null, 2))}</pre>` : ''}
    </div>
  `).join('');

  const errorSection = session.errors.length > 0 ? `
    <div class="section errors">
      <h2>❌ ERRORS (${session.errors.length})</h2>
      ${session.errors.map(e => `<div class="error-item">${e.message}</div>`).join('')}
    </div>
  ` : '';

  const fixSection = session.fixes.length > 0 ? `
    <div class="section fixes">
      <h2>🔨 HOW TO FIX</h2>
      ${session.fixes.map(f => `<div class="fix-item">${f.message}</div>`).join('')}
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <title>🔍 Wishesu Debug - ${session.requestId}</title>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Consolas', 'Monaco', monospace; 
      background: #1a1a2e; 
      color: #eee; 
      padding: 20px;
      line-height: 1.6;
    }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px; 
      border-radius: 10px; 
      margin-bottom: 20px;
    }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .stats { display: flex; gap: 20px; flex-wrap: wrap; }
    .stat { 
      background: rgba(255,255,255,0.1); 
      padding: 10px 20px; 
      border-radius: 5px;
    }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; opacity: 0.8; }
    
    .section { 
      background: #16213e; 
      border-radius: 10px; 
      padding: 20px; 
      margin-bottom: 20px;
    }
    .section h2 { margin-bottom: 15px; color: #fff; }
    
    .errors { border: 2px solid #F44336; }
    .error-item { 
      background: rgba(244,67,54,0.2); 
      padding: 10px; 
      border-radius: 5px; 
      margin-bottom: 10px;
    }
    
    .fixes { border: 2px solid #FF5722; }
    .fix-item { 
      background: rgba(255,87,34,0.2); 
      padding: 10px; 
      border-radius: 5px; 
      margin-bottom: 10px;
      white-space: pre-wrap;
    }
    
    .log-entry { 
      background: #0f0f23; 
      margin-bottom: 10px; 
      padding: 15px; 
      border-radius: 5px;
    }
    .log-header { 
      display: flex; 
      align-items: center; 
      gap: 10px; 
      margin-bottom: 8px;
    }
    .emoji { font-size: 18px; }
    .category { font-weight: bold; font-size: 12px; }
    .time { 
      margin-left: auto; 
      background: #333; 
      padding: 2px 8px; 
      border-radius: 3px; 
      font-size: 11px;
    }
    .log-message { color: #fff; }
    .log-data { 
      background: #000; 
      padding: 10px; 
      border-radius: 5px; 
      margin-top: 10px; 
      overflow-x: auto;
      font-size: 12px;
      color: #4CAF50;
    }
    
    .copy-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #667eea;
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 30px;
      cursor: pointer;
      font-size: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    }
    .copy-btn:hover { background: #764ba2; }
    
    .json-output {
      background: #000;
      padding: 20px;
      border-radius: 10px;
      margin-top: 20px;
      max-height: 300px;
      overflow: auto;
    }
    
    #toast {
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px 30px;
      border-radius: 5px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 WISHESU DEBUG SYSTEM</h1>
    <p>Request ID: ${session.requestId}</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-value">${session.toJSON().duration}ms</div>
        <div class="stat-label">Duration</div>
      </div>
      <div class="stat">
        <div class="stat-value">${session.logs.length}</div>
        <div class="stat-label">Total Logs</div>
      </div>
      <div class="stat" style="background: ${session.errors.length > 0 ? 'rgba(244,67,54,0.3)' : 'rgba(76,175,80,0.3)'}">
        <div class="stat-value">${session.errors.length}</div>
        <div class="stat-label">Errors</div>
      </div>
      <div class="stat">
        <div class="stat-value">${session.warnings.length}</div>
        <div class="stat-label">Warnings</div>
      </div>
    </div>
  </div>

  ${errorSection}
  ${fixSection}

  <div class="section">
    <h2>📋 ALL LOGS (Click to copy)</h2>
    ${logs}
  </div>

  <div class="section">
    <h2>📄 RAW JSON (for developers)</h2>
    <div class="json-output">
      <pre id="json-data">${escapeHtml(JSON.stringify(session.toJSON(), null, 2))}</pre>
    </div>
  </div>

  <button class="copy-btn" onclick="copyAll()">📋 Copy All Logs</button>
  <div id="toast">✅ Copied to clipboard!</div>

  <script>
    function copyAll() {
      const text = document.getElementById('json-data').textContent;
      navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => toast.style.display = 'none', 2000);
      });
    }
  </script>
</body>
</html>`;
}

// 🔒 Escape HTML
function escapeHtml(str) {
  if (typeof str !== 'string') str = String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 🔍 Debug middleware - wraps the entire request
export function debugMiddleware(handler) {
  if (!DEBUG_ENABLED) return handler;

  return async (req, env, ctx) => {
    const debug = createDebugSession(req);
    const url = new URL(req.url);

    // 📥 Log incoming request
    debug.log('REQUEST', `${req.method} ${url.pathname}`, {
      fullUrl: req.url,
      method: req.method,
      pathname: url.pathname,
      search: url.search,
      headers: Object.fromEntries(req.headers)
    });

    // 🔧 Check environment bindings
    debug.log('ENV', 'Checking environment bindings...', {
      hasASSETS: !!env.ASSETS,
      assetsType: env.ASSETS ? typeof env.ASSETS : 'undefined',
      hasDB: !!env.DB,
      hasPRODUCT_MEDIA: !!env.PRODUCT_MEDIA,
      hasR2_BUCKET: !!env.R2_BUCKET,
      VERSION: env.VERSION
    });

    if (!env.ASSETS) {
      debug.log('ERROR', 'ASSETS binding is missing!');
      debug.log('FIX', `Add this to wrangler.toml:

[assets]
directory = "./frontend"
binding = "ASSETS"
run_worker_first = true`);
    }

    // 📁 Check if it's a static file request
    const isStaticFile = /\.(js|css|html|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map|json)$/i.test(url.pathname);
    debug.log('ROUTER', `Path analysis: ${url.pathname}`, {
      isStaticFile,
      isAPI: url.pathname.startsWith('/api/'),
      isAdmin: url.pathname.startsWith('/admin'),
      isProduct: url.pathname.startsWith('/p/') || url.pathname.startsWith('/product')
    });

    // Store debug in request for access in handler
    req.debug = debug;

    try {
      // ⏱️ Time the handler
      const startTime = Date.now();
      const response = await handler(req, env, ctx);
      const duration = Date.now() - startTime;

      debug.log('TIMING', `Handler completed in ${duration}ms`);

      // 📤 Log response
      debug.log('RESPONSE', `Status: ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        headers: Object.fromEntries(response.headers)
      });

      // ⚠️ Check for problems
      if (response.status === 404 && isStaticFile) {
        debug.log('ERROR', `Static file not found: ${url.pathname}`);
        debug.log('FIX', `Check if file exists at: frontend${url.pathname}
        
1. Verify the file exists in your frontend folder
2. Check wrangler.toml has correct assets directory
3. Make sure file path matches exactly (case-sensitive)`);
      }

      // Check if HTML was returned for JS/CSS
      const contentType = response.headers.get('content-type') || '';
      if (isStaticFile && contentType.includes('text/html')) {
        debug.log('ERROR', `Wrong content type! Expected ${url.pathname.split('.').pop()} but got HTML`);
        debug.log('FIX', `This usually means SPA fallback is incorrectly serving HTML for static files.
        
The ASSETS.fetch() is returning 404 for this file, so the router is falling back to SPA.

Check:
1. File exists at: frontend${url.pathname}
2. Wrangler is uploading all files
3. Run: npx wrangler deploy --dry-run to see what files are included`);
      }

      return response;

    } catch (error) {
      debug.log('ERROR', `Exception: ${error.message}`, {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      debug.log('FIX', `Error occurred: ${error.message}

Stack trace:
${error.stack}

Common fixes:
1. Check import paths are correct
2. Verify all modules exist
3. Check for syntax errors`);

      throw error;
    }
  };
}

// 🎯 Debug endpoint handler
export async function handleDebugRequest(req, env) {
  if (!DEBUG_ENABLED) {
    return new Response('Debug mode is disabled', { status: 404 });
  }

  const url = new URL(req.url);
  const debug = createDebugSession(req);

  debug.log('INFO', 'Debug endpoint accessed');

  // Test ASSETS binding
  debug.log('ASSETS', 'Testing ASSETS binding...');
  
  const testFiles = [
    '/admin/admin.html',
    '/admin/admin.js',
    '/core/theme/theme.css',
    '/admin/admin.layout.css',
    '/admin/admin.components.css',
    '/admin/admin.controls.css',
    '/admin/admin.settings.css',
    '/admin/admin.chat.css',
    '/product/page.html',
    '/product/product.js'
  ];

  const results = {};

  if (env.ASSETS) {
    debug.log('SUCCESS', 'ASSETS binding exists');
    
    for (const file of testFiles) {
      try {
        const testUrl = new URL(file, url.origin);
        const testReq = new Request(testUrl.toString(), { method: 'GET' });
        const resp = await env.ASSETS.fetch(testReq);
        
        results[file] = {
          status: resp.status,
          contentType: resp.headers.get('content-type'),
          size: resp.headers.get('content-length')
        };

        if (resp.status === 200) {
          debug.log('SUCCESS', `✓ ${file} - OK (${resp.headers.get('content-type')})`);
        } else {
          debug.log('ERROR', `✗ ${file} - ${resp.status}`);
          debug.log('FIX', `File missing: frontend${file}
Make sure this file exists and is not in .gitignore`);
        }
      } catch (e) {
        results[file] = { error: e.message };
        debug.log('ERROR', `✗ ${file} - Error: ${e.message}`);
      }
    }
  } else {
    debug.log('ERROR', 'ASSETS binding is NOT available!');
    debug.log('FIX', `ASSETS binding missing. Add to wrangler.toml:

[assets]
directory = "./frontend"
binding = "ASSETS"
run_worker_first = true

Then redeploy with: npx wrangler deploy`);
  }

  // Check all env bindings
  debug.log('ENV', 'All environment bindings:', {
    ASSETS: env.ASSETS ? '✓ Available' : '✗ Missing',
    DB: env.DB ? '✓ Available' : '✗ Missing',
    PRODUCT_MEDIA: env.PRODUCT_MEDIA ? '✓ Available' : '✗ Missing',
    R2_BUCKET: env.R2_BUCKET ? '✓ Available' : '✗ Missing',
    VERSION: env.VERSION || 'Not set'
  });

  // Return HTML debug page
  return new Response(debug.toHTML(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// 📋 Quick JSON debug endpoint
export async function handleDebugJSON(req, env) {
  if (!DEBUG_ENABLED) {
    return new Response(JSON.stringify({ error: 'Debug disabled' }), { 
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(req.url);
  const testFiles = [
    '/admin/admin.html',
    '/admin/admin.js', 
    '/core/theme/theme.css'
  ];

  const results = {
    timestamp: new Date().toISOString(),
    bindings: {
      ASSETS: !!env.ASSETS,
      DB: !!env.DB,
      PRODUCT_MEDIA: !!env.PRODUCT_MEDIA,
      R2_BUCKET: !!env.R2_BUCKET,
      VERSION: env.VERSION
    },
    files: {}
  };

  if (env.ASSETS) {
    for (const file of testFiles) {
      try {
        const testUrl = new URL(file, url.origin);
        const testReq = new Request(testUrl.toString(), { method: 'GET' });
        const resp = await env.ASSETS.fetch(testReq);
        results.files[file] = {
          status: resp.status,
          ok: resp.status === 200
        };
      } catch (e) {
        results.files[file] = { error: e.message };
      }
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
