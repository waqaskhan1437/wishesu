/**
 * Input validation utilities
 * Consolidated from all validators across codebase
 */

/**
 * Enforce rate limit for chat messages (1 message per second)
 * @param {Object} env - Environment bindings
 * @param {string} sessionId
 * @throws {Error} If rate limited
 */
export async function enforceUserRateLimit(env, sessionId) {
  const row = await env.DB.prepare(
    `SELECT strftime('%s', created_at) AS ts
     FROM chat_messages
     WHERE session_id = ? AND role = 'user'
     ORDER BY id DESC
     LIMIT 1`
  ).bind(sessionId).first();

  if (!row?.ts) return;

  const lastTs = Number(row.ts) || 0;
  const nowTs = Math.floor(Date.now() / 1000);

  if (nowTs - lastTs < 1) {
    const err = new Error('Rate limited');
    err.status = 429;
    throw err;
  }
}

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate required fields
 * @param {Object} data
 * @param {Array<string>} fields
 * @returns {{valid: boolean, missing: Array<string>}}
 */
export function validateRequired(data, fields) {
  const missing = fields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
  return { valid: missing.length === 0, missing };
}

/**
 * Check if value is a valid number
 * @param {*} value
 * @returns {boolean}
 */
export function isValidNumber(value) {
  if (value === undefined || value === null || value === '') return false;
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
}

/**
 * Validate Whop plan ID format
 * @param {string} planId
 * @returns {boolean}
 */
export function isValidWhopPlanId(planId) {
  if (!planId || typeof planId !== 'string') return false;
  return planId.startsWith('plan_') && planId.length > 5;
}

/**
 * Validate phone number format
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^[\d\s\-+()]{10,20}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Validate URL format
 * @param {string} url
 * @returns {boolean}
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate slug format
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {{valid: boolean, message: string}}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  return { valid: true, message: 'Password is valid' };
}

/**
 * Validate object ID
 * @param {string|number} id
 * @returns {boolean}
 */
export function isValidId(id) {
  if (id === undefined || id === null) return false;
  const num = Number(id);
  return !isNaN(num) && num > 0;
}

/**
 * Validate date string
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidDate(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Validate file type
 * @param {string} filename
 * @param {Array<string>} allowedTypes
 * @returns {boolean}
 */
export function isValidFileType(filename, allowedTypes = []) {
  if (!filename || !allowedTypes.length) return false;
  const ext = filename.split('.').pop()?.toLowerCase();
  return allowedTypes.map(t => t.toLowerCase()).includes(ext);
}

/**
 * Validate file size
 * @param {number} size
 * @param {number} maxSizeMB
 * @returns {boolean}
 */
export function isValidFileSize(size, maxSizeMB = 10) {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return size > 0 && size <= maxBytes;
}

/**
 * Sanitize string input
 * @param {string} input
 * @param {number} maxLength
 * @returns {string}
 */
export function sanitizeInput(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}
