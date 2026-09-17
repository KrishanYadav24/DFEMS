import rateLimit from 'express-rate-limit';
import { apiResponse } from '../utils/apiResponse.js';

/**
 * Rate limiter for authentication attempts (prevents brute force / credential stuffing).
 * Allows max 15 login attempts per 15-minute window per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return apiResponse.error(
      res,
      'Too many login attempts from this IP address. Please try again after 15 minutes.',
      'RATE_LIMIT_EXCEEDED',
      { retryAfterMinutes: 15 },
      429
    );
  },
});
