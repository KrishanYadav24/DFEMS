import { logger } from '../utils/logger.js';
import { apiResponse } from '../utils/apiResponse.js';

export function errorHandler(err, req, res, next) {
  // If response headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const message = err.message || 'An unexpected server error occurred';
  const errString = String(err.message || '');

  // Log error securely
  logger.error('Centralized Error Handler caught exception', {
    url: req.originalUrl,
    method: req.method,
    message,
    code: err.code,
  });

  // 1. ORACLE CONNECTION / NETWORK ERRORS -> HTTP 503 Service Unavailable
  if (
    errString.includes('ORA-12541') || // Cannot connect to listener
    errString.includes('ORA-01017') || // Invalid credentials
    errString.includes('ORA-12514') || // Service not found
    errString.includes('NJS-040') ||   // Connection request timeout
    errString.includes('NJS-500') ||   // Pool not initialized
    err.code === 'ECONNREFUSED' ||
    errString.includes('DPI-1047')
  ) {
    const oraCode = errString.match(/ORA-\d+/)?.[0] || err.code || 'ORACLE_UNAVAILABLE';
    return apiResponse.error(
      res,
      'Oracle Database service FREEPDB1 is currently unavailable or rejecting connections.',
      'ORACLE_CONNECTION_ERROR',
      {
        oracleCode: oraCode,
        detail: 'Verify that Oracle Free listener is running on port 1521 and credentials in .env are valid.',
      },
      503
    );
  }

  // 2. ORACLE CUSTOM APPLICATION TRIGGERS (Append-only immutability) -> HTTP 403 Forbidden
  if (errString.includes('ORA-20001')) {
    return apiResponse.error(
      res,
      'Chain of Custody alteration is prohibited by database trigger trg_custody_no_update. Records are legally immutable.',
      'TRIGGER_IMMUTABILITY_ENFORCED',
      { trigger: 'trg_custody_no_update', oracleCode: 'ORA-20001' },
      403
    );
  }

  if (errString.includes('ORA-20002')) {
    return apiResponse.error(
      res,
      'Chain of Custody deletion is prohibited by database trigger trg_custody_no_delete. Deletion violates ISO 27037 integrity standards.',
      'TRIGGER_IMMUTABILITY_ENFORCED',
      { trigger: 'trg_custody_no_delete', oracleCode: 'ORA-20002' },
      403
    );
  }

  if (errString.includes('ORA-20003')) {
    return apiResponse.error(
      res,
      'Transaction rolled back by stored procedure sp_transfer_custody due to an invalid evidence reference.',
      'TRANSACTION_ROLLBACK',
      { procedure: 'sp_transfer_custody', oracleCode: 'ORA-20003' },
      400
    );
  }

  // 3. ORACLE UNIQUE CONSTRAINT VIOLATION -> HTTP 409 Conflict
  if (errString.includes('ORA-00001')) {
    const constraintMatch = errString.match(/\((.*?)\)/)?.[1] || 'UNIQUE_CONSTRAINT';
    return apiResponse.error(
      res,
      'A record with this identifier or unique attribute already exists.',
      'DUPLICATE_ENTITY',
      { constraint: constraintMatch },
      409
    );
  }

  // 4. ORACLE FOREIGN KEY CONSTRAINT VIOLATION -> HTTP 400 Bad Request
  if (errString.includes('ORA-02291')) {
    return apiResponse.error(
      res,
      'Referenced entity (case, user, or location) does not exist in the database.',
      'FOREIGN_KEY_VIOLATION',
      { oracleCode: 'ORA-02291' },
      400
    );
  }

  // 5. ORACLE CHECK CONSTRAINT VIOLATION -> HTTP 400 Bad Request
  if (errString.includes('ORA-02290')) {
    return apiResponse.error(
      res,
      'Provided value violates database check constraint rules (e.g. invalid status or role classification).',
      'CHECK_CONSTRAINT_VIOLATION',
      { oracleCode: 'ORA-02290' },
      400
    );
  }

  // 6. GENERAL APPLICATION ERRORS
  const statusCode = err.statusCode || 500;
  return apiResponse.error(
    res,
    message,
    err.code || 'SERVER_ERROR',
    process.env.NODE_ENV === 'development' ? err.details || null : null,
    statusCode
  );
}

// 404 Route Not Found Handler
export function notFoundHandler(req, res) {
  return apiResponse.error(
    res,
    `Cannot ${req.method} ${req.originalUrl} — endpoint does not exist.`,
    'ROUTE_NOT_FOUND',
    null,
    404
  );
}
