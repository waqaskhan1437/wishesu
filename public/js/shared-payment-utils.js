/**
 * Shared Payment Utilities
 * Contains common payment functions used across the application
 * Refactored to eliminate code duplication
 */

(function() {
  // Only register once
  if (window.SharedPaymentUtils) return;

  /**
   * Load available payment methods from API
   * @returns {Promise<Array>} Array of payment methods
   */
  async function loadPaymentMethods() {
    try {
      const res = await fetch('/api/payment/methods');
      const data = await res.json();
      return Array.isArray(data.methods) ? data.methods : [];
    } catch (e) {
      console.error('Failed to load payment methods:', e);
      return [];
    }
  }

  /**
   * Load PayPal SDK dynamically
   * @param {string} clientId - PayPal client ID
   * @returns {Promise} PayPal SDK instance
   */
  function loadPayPalSDK(clientId) {
    return new Promise((resolve, reject) => {
      if (window.paypal) {
        resolve(window.paypal);
        return;
      }
      
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
      script.onload = () => resolve(window.paypal);
      script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(script);
    });
  }

  /**
   * Format amount as USD currency
   * @param {number} amount - Amount to format
   * @returns {string} Formatted USD string
   */
  function formatUSD(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '';
    return `$${n.toFixed(2)}`;
  }

  // Expose utilities globally
  window.SharedPaymentUtils = {
    loadPaymentMethods,
    loadPayPalSDK,
    formatUSD
  };
})();