/**
 * Logger - Structured logging utilities
 * Consolidated from 100+ console.log statements
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const currentLevel = LOG_LEVELS.INFO;

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

export function logDebug(message, meta = {}) {
  if (currentLevel <= LOG_LEVELS.DEBUG) {
    console.debug(formatMessage('DEBUG', message, meta));
  }
}

export function logInfo(message, meta = {}) {
  if (currentLevel <= LOG_LEVELS.INFO) {
    console.log(formatMessage('INFO', message, meta));
  }
}

export function logWarn(message, meta = {}) {
  if (currentLevel <= LOG_LEVELS.WARN) {
    console.warn(formatMessage('WARN', message, meta));
  }
}

export function logError(message, error = null, meta = {}) {
  if (currentLevel <= LOG_LEVELS.ERROR) {
    const errorInfo = error ? { error: error.message, stack: error.stack } : {};
    console.error(formatMessage('ERROR', message, { ...meta, ...errorInfo }));
  }
}

export function logApi(endpoint, method, statusCode, duration, meta = {}) {
  logInfo(`API: ${method} ${endpoint}`, { statusCode, duration: `${duration}ms`, ...meta });
}

export function logDb(operation, table, duration, meta = {}) {
  logDebug(`DB: ${operation} on ${table}`, { duration: `${duration}ms`, ...meta });
}

export function logUpload(filename, size, duration, meta = {}) {
  logInfo(`Upload: ${filename}`, { size: `${(size / 1024).toFixed(2)}KB`, duration: `${duration}ms`, ...meta });
}

export function logPayment(gateway, amount, status, meta = {}) {
  logInfo(`Payment: ${gateway} - ${amount}`, { status, ...meta });
}

export function logWebhook(event, gateway, status, meta = {}) {
  logInfo(`Webhook: ${event} from ${gateway}`, { status, ...meta });
}

export function logOrder(orderId, action, meta = {}) {
  logInfo(`Order: ${orderId} - ${action}`, meta);
}

export function logEmail(to, subject, status, meta = {}) {
  logInfo(`Email: ${to} - ${subject}`, { status, ...meta });
}

export function createLogger(context) {
  return {
    debug: (message, meta = {}) => logDebug(`[${context}] ${message}`, meta),
    info: (message, meta = {}) => logInfo(`[${context}] ${message}`, meta),
    warn: (message, meta = {}) => logWarn(`[${context}] ${message}`, meta),
    error: (message, error = null, meta = {}) => logError(`[${context}] ${message}`, error, meta)
  };
}
