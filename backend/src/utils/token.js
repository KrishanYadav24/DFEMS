import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Signs a JWT with trusted user claims.
 * @param {object} user - User record from database
 * @returns {string} Signed JWT
 */
export function generateToken(user) {
  const payload = {
    userId: user.User_ID || user.userId,
    username: user.Username || user.username,
    role: user.Role || user.role,
    firstName: user.First_Name || user.firstName,
    lastName: user.Last_Name || user.lastName,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

/**
 * Verifies a JWT and returns decoded claims.
 * @param {string} token
 * @returns {object} Decoded payload
 */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  });
}
