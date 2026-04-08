/**
 * Shared HTML Utilities
 * Common HTML escaping and string manipulation functions
 * Refactored to eliminate code duplication
 */

(function() {
  if (window.HtmlUtils) return;

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} value - Value to escape
   * @returns {string} Escaped HTML string
   */
  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Truncate text to a maximum length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   */
  function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  window.HtmlUtils = {
    escapeHtml,
    truncateText
  };
})();