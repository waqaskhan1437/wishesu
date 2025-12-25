/**
 * Format Utilities
 * Text formatting, slug generation, and other formatting functions
 * Consolidates duplicate formatting logic across codebase
 */

/**
 * Generate URL-friendly slug from string
 * Replaces duplicate implementations in product-form.js, product-cards.js, etc.
 */
export function slugify(text) {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount, currency = '$') {
  if (amount === null || amount === undefined) return 'N/A';

  const num = Number(amount);
  if (isNaN(num)) return 'N/A';

  return `${currency}${num.toFixed(2)}`;
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';

  const parsed = Number(num);
  if (isNaN(parsed)) return '0';

  return parsed.toLocaleString('en-US');
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return 'N/A';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text, maxLength = 100, suffix = '...') {
  if (!text) return '';

  const str = text.toString();
  if (str.length <= maxLength) return str;

  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter of string
 */
export function capitalize(text) {
  if (!text) return '';

  const str = text.toString();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalize first letter of each word
 */
export function capitalizeWords(text) {
  if (!text) return '';

  return text
    .toString()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(text) {
  if (!text) return '';

  return text
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(text) {
  if (!text) return '';

  return text
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(text) {
  if (!text) return '';

  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Unescape HTML entities
 */
export function unescapeHTML(html) {
  if (!html) return '';

  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

/**
 * Strip HTML tags from string
 */
export function stripHTML(html) {
  if (!html) return '';

  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Extract plain text from HTML (preserving line breaks)
 */
export function htmlToText(html) {
  if (!html) return '';

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Convert newlines to <br> tags
 */
export function nl2br(text) {
  if (!text) return '';

  return text.toString().replace(/\n/g, '<br>');
}

/**
 * Generate random string
 */
export function randomString(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate UUID v4
 */
export function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Pluralize word based on count
 */
export function pluralize(word, count, pluralForm = null) {
  if (count === 1) return word;

  if (pluralForm) return pluralForm;

  // Simple pluralization rules
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch')) {
    return word + 'es';
  }
  return word + 's';
}

/**
 * Format count with word (e.g., "5 items")
 */
export function formatCount(count, word, pluralForm = null) {
  const num = Number(count);
  const w = pluralize(word, num, pluralForm);
  return `${num} ${w}`;
}

/**
 * Pad number with leading zeros
 */
export function padNumber(num, length = 2) {
  return num.toString().padStart(length, '0');
}

/**
 * Extract initials from name
 */
export function getInitials(name, maxLength = 2) {
  if (!name) return '';

  const parts = name.trim().split(/\s+/);
  const initials = parts.map(part => part.charAt(0).toUpperCase());

  return initials.slice(0, maxLength).join('');
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  if (!email) return false;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate URL format
 */
export function isValidURL(url) {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format phone number (basic US format)
 */
export function formatPhone(phone) {
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Parse query string to object
 */
export function parseQueryString(queryString) {
  const params = {};
  const search = queryString.replace(/^\?/, '');

  if (!search) return params;

  search.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  });

  return params;
}

/**
 * Build query string from object
 */
export function buildQueryString(params) {
  if (!params || typeof params !== 'object') return '';

  const parts = [];

  Object.keys(params).forEach(key => {
    const value = params[key];
    if (value !== null && value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });

  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
}

/**
 * Check if object is empty
 */
export function isEmpty(obj) {
  if (!obj) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
}
