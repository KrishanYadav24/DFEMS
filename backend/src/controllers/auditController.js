import { query } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

export async function getAuditLogs(req, res, next) {
  try {
    const { action, search, page = 1, limit = 50, startDate, endDate } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let filterSql = ` WHERE 1=1`;
    const binds = {};

    if (action && action !== 'ALL') {
      filterSql += ` AND a.Action = :action`;
      binds.action = action;
    }

    if (startDate) {
      filterSql += ` AND a.Timestamp_At >= TO_DATE(:startDate, 'YYYY-MM-DD')`;
      binds.startDate = startDate;
    }

    if (endDate) {
      filterSql += ` AND a.Timestamp_At <= TO_DATE(:endDate || ' 23:59:59', 'YYYY-MM-DD HH24:MI:SS')`;
      binds.endDate = endDate;
    }

    if (search && search.trim()) {
      filterSql += ` AND (UPPER(a.Details) LIKE :search OR UPPER(a.Action) LIKE :search OR UPPER(u.Username) LIKE :search)`;
      binds.search = `%${search.trim().toUpperCase()}%`;
    }

    // 1. Total Count Query
    const countSql = `
      SELECT COUNT(*) AS Total
      FROM AUDIT_LOG a
      LEFT JOIN APP_USER u ON a.User_ID = u.User_ID
      ${filterSql}
    `;
    const countResult = await query(countSql, binds);
    const total = countResult.rows?.[0]?.TOTAL || 0;

    // 2. Data Query with Oracle 12c+ Pagination
    const dataSql = `
      SELECT 
        a.Log_ID,
        a.User_ID,
        NVL(u.Username, 'System') AS Username,
        NVL(u.Role, 'System') AS Role,
        a.Action,
        a.Entity_Name,
        a.Entity_ID,
        a.IP_Address,
        TO_CHAR(a.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At,
        a.Details
      FROM AUDIT_LOG a
      LEFT JOIN APP_USER u ON a.User_ID = u.User_ID
      ${filterSql}
      ORDER BY a.Log_ID DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const dataBinds = {
      ...binds,
      offset,
      limit: limitNum,
    };

    const result = await query(dataSql, dataBinds);
    return apiResponse.success(res, result.rows || [], {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
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
