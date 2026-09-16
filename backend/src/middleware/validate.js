import { apiResponse } from '../utils/apiResponse.js';

/**
 * Validates request body fields against required list and optional constraints.
 */
export function validateBody(requiredFields = []) {
  return (req, res, next) => {
    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return apiResponse.error(
        res,
        `Missing required fields: ${missing.join(', ')}`,
        'VALIDATION_FAILED',
        { missingFields: missing },
        400
      );
    }

    next();
  };
}

/**
 * Validates numeric parameter IDs (e.g. /:id).
 */
export function validateNumericId(paramName = 'id') {
  return (req, res, next) => {
    const val = req.params[paramName];
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return apiResponse.error(
        res,
        `Invalid parameter "${paramName}": must be a positive integer.`,
        'INVALID_PARAMETER',
        { parameter: paramName, received: val },
        400
      );
    }
    req.params[paramName] = parsed;
    next();
  };
}
