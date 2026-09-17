import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';
import { query, withTransaction } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';
import { generateToken } from '../utils/token.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/auth/users
 * Returns list of system users (Protected: Admin only).
 */
export async function getUsers(req, res, next) {
  try {
    const { role } = req.query;

    let sql = `
      SELECT 
        u.User_ID,
        u.First_Name,
        u.Last_Name,
        u.Phone_Number,
        u.Username,
        u.Role,
        u.Account_Status,
        u.Created_At,
        i.Badge_Number,
        fa.Certification,
        lab.Lab_Name
      FROM APP_USER u
      LEFT JOIN INVESTIGATOR i ON u.User_ID = i.User_ID
      LEFT JOIN FORENSIC_ANALYST fa ON u.User_ID = fa.User_ID
      LEFT JOIN LABORATORY lab ON fa.Laboratory_ID = lab.Laboratory_ID
      WHERE 1=1
    `;

    const binds = {};
    if (role && role !== 'ALL') {
      sql += ` AND u.Role = :role`;
      binds.role = role;
    }

    sql += ` ORDER BY u.User_ID ASC`;

    const result = await query(sql, binds);
    return apiResponse.success(res, result.rows || [], { count: result.rows?.length || 0 });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticates user credentials via bcrypt and issues signed JWT.
 * Mitigates username enumeration via generic errors and constant-time comparison.
 */
export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return apiResponse.error(res, 'Username and password are required.', 'VALIDATION_ERROR', null, 400);
    }

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    // Query user by username (case-insensitive lookup via LOWER)
    const sql = `
      SELECT 
        User_ID,
        First_Name,
        Last_Name,
        Phone_Number,
        Username,
        Password_Hash,
        Role,
        Account_Status
      FROM APP_USER
      WHERE LOWER(Username) = LOWER(:username)
    `;

    const result = await query(sql, { username: username.trim() });
    const user = result.rows?.[0];

    // Dummy hash comparison to prevent timing side-channel attacks when username does not exist
    const dummyHash = '$2a$12$e8Y6e3iK1iTj0gH7Z1bVyeR6R3Wb.p3L2uD7uV7w3l2a8s4o1m8mK';
    const targetHash = user?.PASSWORD_HASH || dummyHash;

    const isMatch = await bcrypt.compare(password, targetHash);

    if (!user || !isMatch) {
      // Log failed authentication attempt into AUDIT_LOG without recording submitted password
      try {
        await query(
          `INSERT INTO AUDIT_LOG (
            User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
          ) VALUES (
            :userId, 'LOGIN_FAILED', 'APP_USER', :entityId, :ip, :details
          )`,
          {
            userId: user?.USER_ID || null,
            entityId: user?.USER_ID || null,
            ip: clientIp,
            details: `Failed authentication attempt for username: ${username.trim()}`,
          },
          { autoCommit: true }
        );
      } catch (auditErr) {
        logger.warn('Could not record failed login to AUDIT_LOG', auditErr);
      }

      // Safe generic message — never reveal whether username exists
      return apiResponse.error(res, 'Invalid username or password.', 'INVALID_CREDENTIALS', null, 401);
    }

    // Check account status
    if (user.ACCOUNT_STATUS !== 'Active') {
      return apiResponse.error(
        res,
        `Account status is ${user.ACCOUNT_STATUS.toLowerCase()}. Access denied.`,
        'ACCOUNT_INACTIVE',
        null,
        403
      );
    }

    // Record successful login into AUDIT_LOG
    try {
      await query(
        `INSERT INTO AUDIT_LOG (
          User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
        ) VALUES (
          :userId, 'LOGIN_SUCCESS', 'APP_USER', :userId, :ip, :details
        )`,
        {
          userId: user.USER_ID,
          ip: clientIp,
          details: `User ${user.USERNAME} logged in successfully.`,
        },
        { autoCommit: true }
      );
    } catch (auditErr) {
      logger.warn('Could not record login success to AUDIT_LOG', auditErr);
    }

    // Generate signed JWT
    const token = generateToken({
      userId: user.USER_ID,
      username: user.USERNAME,
      role: user.ROLE,
      firstName: user.FIRST_NAME,
      lastName: user.LAST_NAME,
    });

    // Sanitized user profile payload (NEVER return Password_Hash)
    const safeUser = {
      userId: user.USER_ID,
      username: user.USERNAME,
      firstName: user.FIRST_NAME,
      lastName: user.LAST_NAME,
      phone: user.PHONE_NUMBER,
      role: user.ROLE,
      status: user.ACCOUNT_STATUS,
    };

    return apiResponse.success(res, {
      user: safeUser,
      token,
      message: 'Authentication successful.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Returns currently authenticated user profile.
 */
export async function getCurrentUser(req, res, next) {
  try {
    const userResult = await query(
      `SELECT 
        u.User_ID,
        u.First_Name,
        u.Last_Name,
        u.Phone_Number,
        u.Username,
        u.Role,
        u.Account_Status,
        u.Created_At,
        i.Badge_Number,
        fa.Certification,
        lab.Lab_Name
      FROM APP_USER u
      LEFT JOIN INVESTIGATOR i ON u.User_ID = i.User_ID
      LEFT JOIN FORENSIC_ANALYST fa ON u.User_ID = fa.User_ID
      LEFT JOIN LABORATORY lab ON fa.Laboratory_ID = lab.Laboratory_ID
      WHERE u.User_ID = :userId`,
      { userId: req.user.userId }
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return apiResponse.error(res, 'User record not found.', 'USER_NOT_FOUND', null, 404);
    }

    const r = userResult.rows[0];
    const safeUser = {
      userId: r.USER_ID,
      username: r.USERNAME,
      firstName: r.FIRST_NAME,
      lastName: r.LAST_NAME,
      phone: r.PHONE_NUMBER,
      role: r.ROLE,
      status: r.ACCOUNT_STATUS,
      createdAt: r.CREATED_AT,
      badgeNumber: r.BADGE_NUMBER || null,
      certification: r.CERTIFICATION || null,
      labName: r.LAB_NAME || null,
    };

    return apiResponse.success(res, safeUser);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Logs logout event in AUDIT_LOG.
 */
export async function logout(req, res, next) {
  try {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    if (req.user?.userId) {
      try {
        await query(
          `INSERT INTO AUDIT_LOG (
            User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
          ) VALUES (
            :userId, 'LOGOUT', 'APP_USER', :userId, :ip, :details
          )`,
          {
            userId: req.user.userId,
            ip: clientIp,
            details: `User ${req.user.username} logged out.`,
          },
          { autoCommit: true }
        );
      } catch (auditErr) {
        logger.warn('Could not record logout to AUDIT_LOG', auditErr);
      }
    }

    return apiResponse.success(res, { message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/users
 * Administrative creation of new user accounts with secure password hashing.
 * (Protected: Admin only).
 */
export async function createUser(req, res, next) {
  try {
    const { firstName, lastName, phone, username, password, role, badge, cert, labId } = req.body;

    // Check if username already exists
    const existingCheck = await query(
      `SELECT COUNT(*) AS CNT FROM APP_USER WHERE LOWER(Username) = LOWER(:username)`,
      { username: username.trim() }
    );

    if ((existingCheck.rows?.[0]?.CNT || 0) > 0) {
      return apiResponse.error(res, `Username '${username}' is already in use.`, 'DUPLICATE_USERNAME', null, 409);
    }

    // Hash password with bcrypt (work factor 12)
    const plainPassword = password || 'DefaultPass@2026';
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    const newUser = await withTransaction(async (conn) => {
      // 1. Insert into APP_USER
      const userSql = `
        INSERT INTO APP_USER (
          First_Name,
          Last_Name,
          Phone_Number,
          Username,
          Password_Hash,
          Role,
          Account_Status
        ) VALUES (
          :firstName,
          :lastName,
          :phone,
          :username,
          :passwordHash,
          :role,
          'Active'
        ) RETURNING User_ID INTO :outUserId
      `;

      const binds = {
        firstName,
        lastName,
        phone: phone || null,
        username: username.trim(),
        passwordHash,
        role,
        outUserId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      };

      const result = await conn.execute(userSql, binds);
      const generatedUserId = result.outBinds.outUserId[0];

      // 2. Insert into role-specific sub-table
      if (role === 'Investigator' && badge) {
        await conn.execute(
          `INSERT INTO INVESTIGATOR (User_ID, Badge_Number) VALUES (:userId, :badge)`,
          { userId: generatedUserId, badge }
        );
      } else if (role === 'Forensic Examiner' || role === 'Lab Technician') {
        await conn.execute(
          `INSERT INTO FORENSIC_ANALYST (User_ID, Certification, Laboratory_ID) VALUES (:userId, :cert, :labId)`,
          {
            userId: generatedUserId,
            cert: cert || 'Certified Forensic Examiner',
            labId: labId ? parseInt(labId, 10) : 1,
          }
        );
      }

      // 3. Emit audit record for user creation
      await conn.execute(
        `INSERT INTO AUDIT_LOG (
          User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
        ) VALUES (
          :adminUserId, 'USER_CREATED', 'APP_USER', :newUserId, :ip, :details
        )`,
        {
          adminUserId: req.user?.userId || generatedUserId,
          newUserId: generatedUserId,
          ip: clientIp,
          details: `Account for '${username}' (${role}) created by administrator.`,
        }
      );

      return {
        userId: generatedUserId,
        firstName,
        lastName,
        username,
        role,
        status: 'Active',
      };
    });

    return apiResponse.success(res, newUser, { message: 'User provisioned successfully.' }, 201);
  } catch (error) {
    next(error);
  }
}
