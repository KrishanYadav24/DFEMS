/**
 * DFEMS Secure Logger Utility
 * Automatically masks passwords, authentication tokens, hashes, and binary payloads.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordhash',
  'token',
  'jwt',
  'authorization',
  'secret',
  'cookie',
  'file_content',
  'payload',
  'hash_value'
]);

function sanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

export const logger = {
  info: (message, meta = null) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.log(`[INFO]  ${timestamp} - ${message}`, JSON.stringify(sanitize(meta)));
    } else {
      console.log(`[INFO]  ${timestamp} - ${message}`);
    }
  },

  warn: (message, meta = null) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.warn(`[WARN]  ${timestamp} - ${message}`, JSON.stringify(sanitize(meta)));
    } else {
      console.warn(`[WARN]  ${timestamp} - ${message}`);
    }
  },

  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    if (error instanceof Error) {
      console.error(`[ERROR] ${timestamp} - ${message}: ${error.message}`);
      if (error.stack && process.env.NODE_ENV !== 'production') {
        console.error(error.stack);
      }
    } else if (error) {
      console.error(`[ERROR] ${timestamp} - ${message}:`, JSON.stringify(sanitize(error)));
    } else {
      console.error(`[ERROR] ${timestamp} - ${message}`);
    }
  },

  debug: (message, meta = null) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      if (meta) {
        console.log(`[DEBUG] ${timestamp} - ${message}`, JSON.stringify(sanitize(meta)));
      } else {
        console.log(`[DEBUG] ${timestamp} - ${message}`);
      }
    }
  },
};
