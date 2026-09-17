import { verifyToken } from '../utils/token.js';
import { apiResponse } from '../utils/apiResponse.js';
import { query } from '../config/database.js';

// Normalize role names to support assignment synonyms (e.g., 'Lab Technician' <-> 'Forensic Examiner')
function normalizeRole(role) {
  if (!role) return '';
  const r = role.toLowerCase().trim();
  if (r === 'lab technician' || r === 'lab_technician' || r === 'forensic examiner' || r === 'forensic_examiner') {
    return 'forensic examiner';
  }
  return r;
}

/**
 * Middleware to authenticate requests via Bearer JWT.
 * Verifies token validity, extracts trusted claims, and confirms active account status in Oracle DB.
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return apiResponse.error(
      res,
      'Authentication required: No Bearer token provided in Authorization header.',
      'UNAUTHORIZED',
      null,
      401
    );
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);

    // Verify user still exists and account is Active in Oracle database
    const userResult = await query(
      `SELECT User_ID, Username, Role, Account_Status FROM APP_USER WHERE User_ID = :userId`,
      { userId: decoded.userId }
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return apiResponse.error(
        res,
        'User account associated with this token no longer exists.',
        'ACCOUNT_NOT_FOUND',
        null,
        401
      );
    }

    const dbUser = userResult.rows[0];

    if (dbUser.ACCOUNT_STATUS !== 'Active') {
      return apiResponse.error(
        res,
        `Account is ${dbUser.ACCOUNT_STATUS.toLowerCase()}. Access denied.`,
        'ACCOUNT_INACTIVE',
        null,
        403
      );
    }

    // Role derived from securely validated authentication claims (verified by server's JWT secret)
    // with fallback to database record
    const trustedRole = decoded.role || dbUser.ROLE;

    // Attach trusted identity and server-verified role to request
    req.user = {
      userId: dbUser.USER_ID,
      username: dbUser.USERNAME,
      role: trustedRole,
      firstName: decoded.firstName || '',
      lastName: decoded.lastName || '',
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return apiResponse.error(
        res,
        'Authentication session has expired. Please log in again.',
        'TOKEN_EXPIRED',
        null,
        401
      );
    }

    return apiResponse.error(
      res,
      'Invalid authentication credentials provided.',
      'INVALID_TOKEN',
      null,
      401
    );
  }
}

/**
 * Role-Based Access Control (RBAC) middleware.
 * Ensures the authenticated user's role matches at least one of the allowed roles.
 * Never trusts client-supplied roles; uses server-verified role from authenticateToken.
 * @param  {...string} allowedRoles
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return apiResponse.error(
        res,
        'Authentication required before role authorization check.',
        'UNAUTHORIZED',
        null,
        401
      );
    }

    const userRoleNorm = normalizeRole(req.user.role);
    const normalizedAllowed = allowedRoles.map(normalizeRole);

    const hasPermission = normalizedAllowed.includes(userRoleNorm);

    if (!hasPermission) {
      return apiResponse.error(
        res,
        `Access forbidden: Role '${req.user.role}' is not authorized to perform this operation.`,
        'FORBIDDEN',
        {
          requiredRoles: allowedRoles,
          userRole: req.user.role,
        },
        403
      );
    }

    next();
  };
}
