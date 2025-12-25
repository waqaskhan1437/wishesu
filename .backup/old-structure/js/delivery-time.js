/**
 * Centralized Delivery Time Utility
 * Browser-safe copy for frontend usage.
 */

function getDeliveryText(instant, deliveryDays) {
  if (instant === 1 || instant === true || instant === '1') {
    return 'Instant Delivery In 60 Minutes';
  }

  let days = null;

  if (typeof deliveryDays === 'number') {
    days = deliveryDays;
  } else if (typeof deliveryDays === 'string') {
    const trimmed = deliveryDays.trim();
    if (trimmed !== '') {
      const parsed = parseInt(trimmed, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        days = parsed;
      }
    }
  }

  if (days === 1) return '24 Hours Express Delivery';
  if (days === 2) return '2 Days Delivery';
  if (days === 3) return '3 Days Delivery';
  if (days !== null && days > 0) return `${days} Days Delivery`;

  return '2 Days Delivery';
}

function parseDeliveryDays(value) {
  if (value === null || value === undefined) return '';
  const raw = String(value).toLowerCase();
  if (!raw) return '';
  if (raw.includes('instant') || raw.includes('60')) return '';
  if (raw.includes('24') || raw.includes('1 day') || raw.includes('24 hour')) return '1';
  if (raw.includes('48') || raw.includes('2 day')) return '2';
  if (raw.includes('72') || raw.includes('3 day')) return '3';
  const match = raw.match(/\d+/);
  if (!match) return '';
  const num = parseInt(match[0], 10);
  return Number.isFinite(num) && num > 0 ? String(num) : '';
}

function isInstantDelivery(value) {
  if (!value) return false;
  const raw = String(value).toLowerCase();
  return raw.includes('instant') || raw.includes('60 minute');
}

function getDeliveryIcon(text) {
  if (!text) return '';
  const lower = text.toLowerCase();
  if (lower.includes('instant') || lower.includes('60')) return '';
  if (lower.includes('24') || lower.includes('1 day')) return '';
  return '';
}

if (typeof window !== 'undefined') {
  window.DeliveryTimeUtils = {
    getDeliveryText,
    parseDeliveryDays,
    isInstantDelivery,
    getDeliveryIcon
  };
}
