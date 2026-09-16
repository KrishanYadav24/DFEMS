import oracledb from 'oracledb';
import { query, withTransaction } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

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

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return apiResponse.error(res, 'Username and password are required.', 'VALIDATION_ERROR', null, 400);
    }

    // Parameterized lookup in APP_USER
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
      WHERE UPPER(Username) = UPPER(:username)
    `;

    const result = await query(sql, { username });
    if (!result.rows || result.rows.length === 0) {
      return apiResponse.error(res, 'Invalid credentials provided.', 'AUTH_FAILED', null, 401);
    }

    const user = result.rows[0];

    // Omit Password_Hash from response
    const { Password_Hash, ...safeUser } = user;

    return apiResponse.success(res, {
      user: safeUser,
      token: 'dfems_jwt_session_token_' + Buffer.from(username).toString('base64'),
      message: 'Authentication successful.',
    });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { firstName, lastName, phone, username, role, badge, cert, labId } = req.body;

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
          '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6',
          :role,
          'Active'
        ) RETURNING User_ID INTO :outUserId
      `;

      const binds = {
        firstName,
        lastName,
        phone: phone || null,
        username,
        role,
        outUserId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      };

      const result = await conn.execute(userSql, binds);
      const generatedUserId = result.outBinds.outUserId[0];

      // 2. Role specific sub-table
      if (role === 'Investigator' && badge) {
        await conn.execute(
          `INSERT INTO INVESTIGATOR (User_ID, Badge_Number) VALUES (:userId, :badge)`,
          { userId: generatedUserId, badge }
        );
      } else if (role === 'Forensic Examiner') {
        await conn.execute(
          `INSERT INTO FORENSIC_ANALYST (User_ID, Certification, Laboratory_ID) VALUES (:userId, :cert, :labId)`,
          { userId: generatedUserId, cert: cert || 'Certified Examiner', labId: labId ? parseInt(labId, 10) : 1 }
        );
      }

      return {
        userId: generatedUserId,
        firstName,
        lastName,
        username,
        role,
      };
    });

    return apiResponse.success(res, newUser, {}, 201);
  } catch (error) {
    next(error);
  }
}
