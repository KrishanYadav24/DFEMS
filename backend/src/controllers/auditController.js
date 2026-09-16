import { query } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

export async function getAuditLogs(req, res, next) {
  try {
    const { action, search } = req.query;

    let sql = `
      SELECT 
        a.Log_ID,
        a.User_ID,
        u.Username,
        u.Role,
        a.Action,
        a.Entity_Name,
        a.Entity_ID,
        a.IP_Address,
        TO_CHAR(a.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At,
        a.Details
      FROM AUDIT_LOG a
      LEFT JOIN APP_USER u ON a.User_ID = u.User_ID
      WHERE 1=1
    `;

    const binds = {};

    if (action && action !== 'ALL') {
      sql += ` AND a.Action = :action`;
      binds.action = action;
    }

    if (search && search.trim()) {
      sql += ` AND (UPPER(a.Details) LIKE :search OR UPPER(a.Action) LIKE :search OR UPPER(u.Username) LIKE :search)`;
      binds.search = `%${search.trim().toUpperCase()}%`;
    }

    sql += ` ORDER BY a.Log_ID DESC`;

    const result = await query(sql, binds);
    return apiResponse.success(res, result.rows || [], { count: result.rows?.length || 0 });
  } catch (error) {
    next(error);
  }
}

export async function logEvent(req, res, next) {
  try {
    const { userId, action, entityName, entityId, details } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const sql = `
      INSERT INTO AUDIT_LOG (
        User_ID,
        Action,
        Entity_Name,
        Entity_ID,
        IP_Address,
        Timestamp_At,
        Details
      ) VALUES (
        :userId,
        :action,
        :entityName,
        :entityId,
        :ipAddress,
        SYSTIMESTAMP,
        :details
      )
    `;

    await query(sql, {
      userId: userId ? parseInt(userId, 10) : null,
      action: action || 'SECURITY_EVENT',
      entityName: entityName || 'SYSTEM',
      entityId: entityId ? parseInt(entityId, 10) : null,
      ipAddress,
      details: details || 'Telemetry event logged by application',
    });

    return apiResponse.success(res, { logged: true }, {}, 201);
  } catch (error) {
    next(error);
  }
}
