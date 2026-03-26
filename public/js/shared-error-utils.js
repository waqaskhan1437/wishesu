/**
 * Shared Error Utilities
 * Used by checkout-page.js, payment-selector.js, product/checkout.js
 */

(function (root) {
  /**
   * Extract a human-readable error message from any value.
   * @param {*} value - Error, string, object, or other value
   * @param {string} [fallback='Something went wrong'] - Default message
   * @returns {string}
   */
  function extractErrorMessage(value, fallback) {
    if (fallback === undefined) fallback = 'Something went wrong';
    if (!value) return fallback;

    if (typeof value === 'string') {
      var msg = value.trim();
      return msg || fallback;
    }

    if (value instanceof Error) {
      return extractErrorMessage(value.message, fallback);
    }

    if (typeof value === 'object') {
      var candidates = [
        value.error,
        value.message,
        value.detail,
        value.details,
        value.description,
        value.reason,
        value.statusText
      ];
      for (var i = 0; i < candidates.length; i++) {
        var msg = extractErrorMessage(candidates[i], '');
        if (msg) return msg;
      }
      try {
        var serialized = JSON.stringify(value);
        if (serialized && serialized !== '{}' && serialized !== '[]') return serialized;
      } catch (e) {}
    }

    return fallback;
  }

  root.extractErrorMessage = extractErrorMessage;
})(window);
