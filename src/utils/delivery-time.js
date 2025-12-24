/**
 * Centralized Delivery Time Utility
 * Universal logic for delivery time formatting across the entire application
 *
 * STRICT IMPLEMENTATION:
 * - instant = 1 (true) → "Instant Delivery In 60 Minutes"
 * - delivery_time = 1 → "24 Hours Express Delivery"
 * - delivery_time = 2 → "2 Days Delivery"
 * - delivery_time = 3 → "3 Days Delivery"
 */

/**
 * Get delivery text based on instant flag and delivery days
 * @param {boolean|number} instant - Whether instant delivery is enabled (1 or true)
 * @param {number|string} deliveryDays - Number of delivery days (1, 2, 3, etc.)
 * @returns {string} Formatted delivery text
 */
function getDeliveryText(instant, deliveryDays) {
  // STRICT: If instant delivery is enabled (1 or true)
  if (instant === 1 || instant === true || instant === '1') {
    return 'Instant Delivery In 60 Minutes';
  }

  // Parse delivery days to number - STRICT parsing
  let days = null;

  // If deliveryDays is already a number
  if (typeof deliveryDays === 'number') {
    days = deliveryDays;
  }
  // If deliveryDays is a string number like "1", "2", "3"
  else if (typeof deliveryDays === 'string') {
    const trimmed = deliveryDays.trim();
    if (trimmed !== '') {
      const parsed = parseInt(trimmed, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        days = parsed;
      }
    }
  }

  // STRICT: Return formatted text based on days
  if (days === 1) {
    return '24 Hours Express Delivery';
  } else if (days === 2) {
    return '2 Days Delivery';
  } else if (days === 3) {
    return '3 Days Delivery';
  } else if (days !== null && days > 0) {
    return `${days} Days Delivery`;
  }

  // Default fallback
  return '2 Days Delivery';
}

/**
 * Parse delivery text to extract number of days
 * @param {string|number} value - Raw delivery text or number
 * @returns {string} Number of days as string (empty for instant)
 */
function parseDeliveryDays(value) {
  if (value === null || value === undefined) return '';

  const raw = String(value).toLowerCase();
  if (!raw) return '';

  // Check for instant delivery indicators
  if (raw.includes('instant') || raw.includes('60')) return '';

  // Check for specific day patterns
  if (raw.includes('24') || raw.includes('1 day') || raw.includes('24 hour')) return '1';
  if (raw.includes('48') || raw.includes('2 day')) return '2';
  if (raw.includes('72') || raw.includes('3 day')) return '3';

  // Extract number from text
  const match = raw.match(/\d+/);
  if (!match) return '';

  const num = parseInt(match[0], 10);
  return Number.isFinite(num) && num > 0 ? String(num) : '';
}

/**
 * Check if delivery is instant based on text
 * @param {string} value - Delivery text
 * @returns {boolean} True if instant delivery
 */
function isInstantDelivery(value) {
  if (!value) return false;
  const raw = String(value).toLowerCase();
  return raw.includes('instant') || raw.includes('60 minute');
}

/**
 * Get delivery icon based on text
 * @param {string} text - Delivery text
 * @returns {string} Icon class or emoji
 */
function getDeliveryIcon(text) {
  if (!text) return '🚚';
  const lower = text.toLowerCase();
  if (lower.includes('instant') || lower.includes('60')) return '⚡';
  if (lower.includes('24') || lower.includes('1 day')) return '🚀';
  return '🚚';
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getDeliveryText,
    parseDeliveryDays,
    isInstantDelivery,
    getDeliveryIcon
  };
}

// For browser environment
if (typeof window !== 'undefined') {
  window.DeliveryTimeUtils = {
    getDeliveryText,
    parseDeliveryDays,
    isInstantDelivery,
    getDeliveryIcon
  };
}
