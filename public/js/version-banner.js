/**
 * Version Banner - Shows current version on all pages
 * Auto-checks if latest version is loaded
 */

(function() {
  const EXPECTED_VERSION = '1766444251';
  const BANNER_KEY = 'version-banner-dismissed';

  // Check if banner was dismissed in last hour
  const dismissed = localStorage.getItem(BANNER_KEY);
  if (dismissed && Date.now() - parseInt(dismissed) < 3600000) {
    return; // Don't show if dismissed within last hour
  }

  async function checkVersion() {
    try {
      const response = await fetch('/api/debug?_=' + Date.now());
      const data = await response.json();
      const serverVersion = data.version || 'unknown';

      // Check if version matches
      const isLatest = serverVersion === EXPECTED_VERSION;

      // Only show banner if version mismatch or for debugging
      if (!isLatest || window.location.search.includes('debug')) {
        showBanner(serverVersion, isLatest);
      }
    } catch (err) {
      console.error('Version check failed:', err);
    }
  }

  function showBanner(serverVersion, isLatest) {
    // Create banner element
    const banner = document.createElement('div');
    banner.id = 'version-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: ${isLatest ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'};
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      max-width: 350px;
      animation: slideIn 0.3s ease-out;
    `;

    const icon = isLatest ? '✅' : '⚠️';
    const title = isLatest ? 'Latest Version' : 'Update Available';
    const message = isLatest
      ? `Running v${serverVersion}`
      : `Old version: ${serverVersion}<br>Expected: ${EXPECTED_VERSION}`;

    banner.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px;">${icon}</div>
        <div style="flex: 1;">
          <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
          <div style="font-size: 13px; opacity: 0.9; margin-bottom: 10px;">${message}</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${!isLatest ? `
              <button onclick="location.href='/clear-cache.html'" style="padding: 6px 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: 600;">
                Clear Cache
              </button>
            ` : ''}
            <button onclick="location.href='/version-check.html'" style="padding: 6px 12px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: 600;">
              Debug
            </button>
            <button onclick="document.getElementById('version-banner').remove(); localStorage.setItem('${BANNER_KEY}', Date.now());" style="padding: 6px 12px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 5px; cursor: pointer; font-size: 12px;">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(banner);

    // Auto-dismiss after 10 seconds if latest version
    if (isLatest) {
      setTimeout(() => {
        banner.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => banner.remove(), 300);
      }, 10000);
    }
  }

  // Check version on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkVersion);
  } else {
    checkVersion();
  }

  // Also log to console
  console.log(`%c🔍 Version Check`, 'font-size: 14px; font-weight: bold; color: #60a5fa;');
  console.log(`Expected: ${EXPECTED_VERSION}`);
  console.log(`Debug page: ${window.location.origin}/version-check.html`);
})();
