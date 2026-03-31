/**
 * Dashboard Shared Utilities
 * Common functions used across admin dashboard modules.
 * Eliminates duplication of jfetch, toast, confirm helpers.
 */

(function (AD) {

  /**
   * Centralized fetch wrapper with JSON parsing and error handling.
   * Supports FormData (skips Content-Type so browser sets multipart boundary).
   */
  AD.jfetch = async function jfetch(url, opts = {}) {
    const isFormData = opts.body instanceof FormData;
    const headers = { ...(opts.headers || {}) };
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, { ...opts, headers });
    let data;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }

    if (!res.ok) {
      const msg = (data && (data.error || data.message))
        ? (data.error || data.message)
        : 'Request failed (' + res.status + ')';
      throw new Error(msg);
    }
    return data;
  };

  /**
   * Show a toast notification. Finds element by id, or creates a floating one.
   * @param {string} msg - Message to display
   * @param {boolean} ok - true for success (green), false for error (red)
   * @param {string} [toastId] - Optional specific toast element ID
   */
  AD.toast = function toast(msg, ok, toastId) {
    if (ok === undefined) ok = true;
    let el = null;

    // Try specific ID first
    if (toastId) {
      el = document.getElementById(toastId);
    }

    // Fallback: find any visible toast element in current panel
    if (!el) {
      el = document.querySelector('.admin-toast') ||
           document.querySelector('[id$="-toast"]');
    }

    if (!el) return;

    el.textContent = msg;
    el.style.display = 'block';
    el.style.background = ok ? '#10b981' : '#ef4444';
    setTimeout(function () {
      el.style.display = 'none';
    }, 3000);
  };

  /**
   * Confirm deletion of a single item.
   * @param {string} itemName - e.g. "this blog post"
   * @returns {boolean}
   */
  AD.confirmDelete = function confirmDelete(itemName) {
    return window.confirm('Delete ' + (itemName || 'this item') + '?\n\nThis action cannot be undone.');
  };

  /**
   * Confirm bulk deletion.
   * @param {string} keyword - e.g. "ALL pages"
   * @returns {boolean}
   */
  AD.confirmDeleteAll = function confirmDeleteAll(keyword) {
    return window.confirm('Delete ' + (keyword || 'ALL items') + '?\n\nThis action is permanent and cannot be undone.');
  };

  /**
   * POST JSON to an admin endpoint. Convenience wrapper around jfetch.
   * @param {string} url
   * @param {object} body
   * @returns {Promise<any>}
   */
  AD.adminPostJson = async function adminPostJson(url, body) {
    return AD.jfetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  };

  /**
   * Common placeholder image URLs.
   */
  AD.PLACEHOLDER = {
    THUMB: 'https://via.placeholder.com/60x40?text=No+Image',
    CARD: 'https://via.placeholder.com/400x225?text=No+Image',
    PREVIEW: 'https://via.placeholder.com/1280x720?text=Preview',
    PRODUCT: 'https://via.placeholder.com/600',
    SMALL_PRODUCT: 'https://via.placeholder.com/150x84?text=Product',
    SMALL_BLOG: 'https://via.placeholder.com/150x84?text=Blog',
    CARD_SM: 'https://via.placeholder.com/300x169?text=No+Image',
    LANDING_300: 'https://via.placeholder.com/300x160',
    LANDING_350: 'https://via.placeholder.com/350x180',
    AVATAR: 'https://via.placeholder.com/50'
  };

  /**
   * Escape HTML to prevent XSS in dynamic content.
   */
  AD.escapeHtml = function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /**
   * RFC 4180 compliant CSV parser.
   * Returns array of objects keyed by header row values.
   */
  AD.parseCsv = function parseCsv(text) {
    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    var len = text.length;

    while (i < len) {
      var ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < len && text[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            inQuotes = false;
            i++;
          }
        } else {
          field += ch;
          i++;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
        } else if (ch === ',') {
          row.push(field);
          field = '';
          i++;
        } else if (ch === '\r') {
          row.push(field);
          field = '';
          rows.push(row);
          row = [];
          i++;
          if (i < len && text[i] === '\n') i++;
        } else if (ch === '\n') {
          row.push(field);
          field = '';
          rows.push(row);
          row = [];
          i++;
        } else {
          field += ch;
          i++;
        }
      }
    }
    // last field/row
    if (field || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    if (rows.length === 0) return [];
    var headers = rows[0];
    var result = [];
    for (var r = 1; r < rows.length; r++) {
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        obj[headers[c]] = (c < rows[r].length) ? rows[r][c] : '';
      }
      result.push(obj);
    }
    return result;
  };

})(window.AdminDashboard = window.AdminDashboard || {});
