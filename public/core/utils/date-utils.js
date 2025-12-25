/**
 * Date Utilities
 * Centralized date formatting and manipulation functions
 * Eliminates duplicate formatDate implementations across codebase
 */

/**
 * Format date to readable string
 * Replaces duplicate implementations in dashboard.js and other files
 */
export function formatDate(dateStr, options = {}) {
  if (!dateStr) return options.fallback || 'N/A';

  const date = new Date(dateStr);

  // Validate date
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
    return options.fallback || 'N/A';
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };

  try {
    return date.toLocaleDateString('en-US', defaultOptions);
  } catch (error) {
    console.error('formatDate error:', error);
    return options.fallback || 'N/A';
  }
}

/**
 * Format date with time
 */
export function formatDateTime(dateStr, options = {}) {
  if (!dateStr) return options.fallback || 'N/A';

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) {
    return options.fallback || 'N/A';
  }

  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  try {
    return date.toLocaleString('en-US', defaultOptions);
  } catch (error) {
    console.error('formatDateTime error:', error);
    return options.fallback || 'N/A';
  }
}

/**
 * Format date to ISO string
 */
export function formatDateISO(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return 'Unknown';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
}

/**
 * Get countdown time remaining
 * Returns object with days, hours, minutes, seconds
 */
export function getCountdown(targetDateStr) {
  if (!targetDateStr) return null;

  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return null;

  const now = new Date();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return { expired: false, days, hours, minutes, seconds };
}

/**
 * Format countdown as string
 */
export function formatCountdown(targetDateStr) {
  const countdown = getCountdown(targetDateStr);

  if (!countdown) return 'Invalid date';
  if (countdown.expired) return 'Expired';

  const parts = [];

  if (countdown.days > 0) {
    parts.push(`${countdown.days}d`);
  }
  if (countdown.hours > 0 || countdown.days > 0) {
    parts.push(`${countdown.hours}h`);
  }
  if (countdown.minutes > 0 || countdown.hours > 0 || countdown.days > 0) {
    parts.push(`${countdown.minutes}m`);
  }
  parts.push(`${countdown.seconds}s`);

  return parts.join(' ');
}

/**
 * Add days to a date
 */
export function addDays(dateStr, days) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Add hours to a date
 */
export function addHours(dateStr, hours) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  date.setHours(date.getHours() + hours);
  return date;
}

/**
 * Check if date is in the past
 */
export function isPast(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  return date < new Date();
}

/**
 * Check if date is in the future
 */
export function isFuture(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  return date > new Date();
}

/**
 * Get date difference in days
 */
export function getDaysDifference(date1Str, date2Str) {
  const date1 = new Date(date1Str);
  const date2 = new Date(date2Str);

  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return null;

  const diffMs = Math.abs(date2 - date1);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Parse date from various formats
 */
export function parseDate(input) {
  if (!input) return null;

  // Already a Date object
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }

  // ISO string or other standard format
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Get current timestamp
 */
export function now() {
  return new Date();
}

/**
 * Get current timestamp in ISO format
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * Get current Unix timestamp (seconds)
 */
export function nowUnix() {
  return Math.floor(Date.now() / 1000);
}
