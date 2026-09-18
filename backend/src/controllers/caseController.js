import oracledb from 'oracledb';
import { query, withTransaction } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

const VALID_CASE_STATUSES = ['Open', 'Under Investigation', 'Closed', 'Archived'];

/**
 * GET /api/cases
 * List cases with search, status filtering, and role-based data isolation.
 */
export async function getCases(req, res, next) {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const user = req.user;

    let sql = `
      SELECT 
        c.Case_ID,
        c.Title,
        c.Status,
        c.Crime_Type,
        TO_CHAR(c.Date_Opened, 'YYYY-MM-DD') AS Date_Opened,
        c.Created_By,
        u_creator.First_Name || ' ' || u_creator.Last_Name AS Creator_Name,
        c.Assigned_To,
        u_lead.First_Name || ' ' || u_lead.Last_Name AS Assigned_Investigator,
        i.Badge_Number,
        l.Address AS Location_Address,
        (SELECT COUNT(*) FROM EVIDENCE e WHERE e.Case_ID = c.Case_ID) AS Evidence_Count
      FROM CASE_TABLE c
      LEFT JOIN APP_USER u_creator ON c.Created_By = u_creator.User_ID
      LEFT JOIN INVESTIGATOR i ON c.Assigned_To = i.User_ID
      LEFT JOIN APP_USER u_lead ON i.User_ID = u_lead.User_ID
      LEFT JOIN LOCATION l ON c.Location_ID = l.Location_ID
      WHERE 1=1
    `;

    const binds = {};

    // 1. Server-side RBAC Data Isolation
    // Investigators only see cases they created, lead, or are assigned to
    if (user.role === 'Investigator') {
      sql += ` AND (
        c.Created_By = :currentUserId 
        OR c.Assigned_To = :currentUserId 
        OR EXISTS (SELECT 1 FROM ASSIGNED a WHERE a.Case_ID = c.Case_ID AND a.User_ID = :currentUserId)
      )`;
      binds.currentUserId = user.userId;
    }

    // 2. Status Filtering
    if (status && status !== 'ALL') {
      sql += ` AND c.Status = :status`;
      binds.status = status;
    }

    // 3. Keyword Search (Title, Crime Type, Location, Investigator)
    if (search && search.trim()) {
      sql += ` AND (
        UPPER(c.Title) LIKE :search 
        OR UPPER(c.Crime_Type) LIKE :search
        OR UPPER(l.Address) LIKE :search
      )`;
      binds.search = `%${search.trim().toUpperCase()}%`;
    }

    sql += ` ORDER BY c.Case_ID DESC`;

    const result = await query(sql, binds);
    const rows = result.rows || [];

    return apiResponse.success(res, rows, {
      total: rows.length,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/cases/:id
 * Fetch single case details with linked evidence and authorization enforcement.
 */
export async function getCaseById(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const user = req.user;

    const caseSql = `
      SELECT 
        c.Case_ID,
        c.Title,
        c.Status,
        c.Crime_Type,
        TO_CHAR(c.Date_Opened, 'YYYY-MM-DD') AS Date_Opened,
        c.Created_By,
        u_creator.First_Name || ' ' || u_creator.Last_Name AS Created_By_Name,
        c.Assigned_To,
        u_lead.First_Name || ' ' || u_lead.Last_Name AS Assigned_To_Name,
        i.Badge_Number,
        l.Address AS Location_Address
      FROM CASE_TABLE c
      LEFT JOIN APP_USER u_creator ON c.Created_By = u_creator.User_ID
      LEFT JOIN INVESTIGATOR i ON c.Assigned_To = i.User_ID
      LEFT JOIN APP_USER u_lead ON i.User_ID = u_lead.User_ID
      LEFT JOIN LOCATION l ON c.Location_ID = l.Location_ID
      WHERE c.Case_ID = :caseId
    `;

    const caseResult = await query(caseSql, { caseId });
    if (!caseResult.rows || caseResult.rows.length === 0) {
      return apiResponse.error(res, `Case #${caseId} not found.`, 'NOT_FOUND', null, 404);
    }

    const caseData = caseResult.rows[0];

    // Data Isolation Check for Investigators
    if (user.role === 'Investigator') {
      const isCreator = caseData.CREATED_BY === user.userId;
      const isLead = caseData.ASSIGNED_TO === user.userId;

      const assignCheck = await query(
        `SELECT COUNT(*) AS CNT FROM ASSIGNED WHERE Case_ID = :caseId AND User_ID = :userId`,
        { caseId, userId: user.userId }
      );
      const isAssigned = (assignCheck.rows?.[0]?.CNT || 0) > 0;

      if (!isCreator && !isLead && !isAssigned) {
        return apiResponse.error(
          res,
          `Access forbidden: You are not assigned to Case #${caseId}.`,
          'FORBIDDEN_UNASSIGNED_CASE',
          null,
          403
        );
      }
    }

    // Fetch linked evidence items
    const evidenceSql = `
      SELECT 
        e.Evidence_ID,
        e.Description,
        e.Status,
        e.Hash_Value,
        TO_CHAR(e.Collection_Date, 'YYYY-MM-DD') AS Collection_Date,
        d.Serial_Number,
        f.File_Name,
        f.File_Size,
        f.Mime_Type,
        CASE 
          WHEN d.Device_ID IS NOT NULL THEN 'Device'
          WHEN f.File_ID IS NOT NULL THEN 'File'
          ELSE 'General'
        END AS Evidence_Type
      FROM EVIDENCE e
      LEFT JOIN DEVICE d ON e.Evidence_ID = d.Evidence_ID
      LEFT JOIN FILE_RECORD f ON e.Evidence_ID = f.Evidence_ID
      WHERE e.Case_ID = :caseId
      ORDER BY e.Evidence_ID ASC
    `;

    const evidenceResult = await query(evidenceSql, { caseId });
    caseData.evidence = evidenceResult.rows || [];

    return apiResponse.success(res, caseData);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/cases
 * Register new forensic case (Protected: Admin, Investigator).
 */
export async function createCase(req, res, next) {
  try {
    const { title, crimeType, assignedTo, locationAddress } = req.body;
    const user = req.user;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    if (!title || !title.trim()) {
      return apiResponse.error(res, 'Case title is required.', 'VALIDATION_ERROR', null, 400);
    }

    const newCase = await withTransaction(async (conn) => {
      // 1. Resolve Location ID if locationAddress is provided
      let resolvedLocationId = null;
      if (locationAddress && locationAddress.trim()) {
        const locCheck = await conn.execute(
          `SELECT Location_ID FROM LOCATION WHERE LOWER(Address) = LOWER(:addr)`,
          { addr: locationAddress.trim() }
        );

        if (locCheck.rows && locCheck.rows.length > 0) {
          resolvedLocationId = locCheck.rows[0].LOCATION_ID;
        } else {
          const locInsert = await conn.execute(
            `INSERT INTO LOCATION (Address) VALUES (:addr) RETURNING Location_ID INTO :outLocId`,
            {
              addr: locationAddress.trim(),
              outLocId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
            }
          );
          resolvedLocationId = locInsert.outBinds.outLocId[0];
        }
      }

      // 2. Validate Assigned Investigator (must exist in INVESTIGATOR table if provided)
      let resolvedAssignedTo = null;
      if (assignedTo) {
        const invCheck = await conn.execute(
          `SELECT User_ID FROM INVESTIGATOR WHERE User_ID = :invId`,
          { invId: parseInt(assignedTo, 10) }
        );
        if (invCheck.rows && invCheck.rows.length > 0) {
          resolvedAssignedTo = parseInt(assignedTo, 10);
        }
      }

      // 3. Insert into CASE_TABLE
      const caseSql = `
        INSERT INTO CASE_TABLE (
          Title,
          Status,
          Created_By,
          Assigned_To,
          Location_ID,
          Crime_Type,
          Date_Opened
        ) VALUES (
          :title,
          'Open',
          :createdBy,
          :assignedTo,
          :locationId,
          :crimeType,
          SYSDATE
        ) RETURNING Case_ID INTO :outCaseId
      `;

      const caseResult = await conn.execute(caseSql, {
        title: title.trim(),
        createdBy: user.userId, // Authenticated user ID (never trusted from body)
        assignedTo: resolvedAssignedTo,
        locationId: resolvedLocationId,
        crimeType: crimeType ? crimeType.trim() : 'General Forensic Investigation',
        outCaseId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      });

      const generatedCaseId = caseResult.outBinds.outCaseId[0];

      // 4. If assigned, record initial junction row in ASSIGNED table
      if (resolvedAssignedTo) {
        await conn.execute(
          `INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (:userId, :caseId, SYSDATE)`,
          { userId: resolvedAssignedTo, caseId: generatedCaseId }
        );
      }

      // 5. Emit Audit Log Event
      await conn.execute(
        `INSERT INTO AUDIT_LOG (
          User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
        ) VALUES (
          :userId, 'CASE_CREATED', 'CASE_TABLE', :caseId, :ip, :details
        )`,
        {
          userId: user.userId,
          caseId: generatedCaseId,
          ip: clientIp,
          details: `Case #${generatedCaseId} "${title.trim()}" opened by ${user.username}.`,
        }
      );

      return {
        caseId: generatedCaseId,
        title: title.trim(),
        status: 'Open',
        crimeType: crimeType ? crimeType.trim() : 'General Forensic Investigation',
        assignedTo: resolvedAssignedTo,
        locationId: resolvedLocationId,
      };
    });

    return apiResponse.success(
      res,
      newCase,
      { message: 'Case successfully created and registered in Oracle database.' },
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/cases/:id
 * Update case details (title, crimeType, locationAddress, assignedTo).
 */
export async function updateCase(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { title, crimeType, locationAddress, assignedTo, status } = req.body;
    const user = req.user;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    // Verify case exists and check authorization
    const existing = await query(
      `SELECT Case_ID, Created_By, Assigned_To, Status FROM CASE_TABLE WHERE Case_ID = :caseId`,
      { caseId }
    );
    if (!existing.rows || existing.rows.length === 0) {
      return apiResponse.error(res, `Case #${caseId} not found.`, 'NOT_FOUND', null, 404);
    }

    const currentCase = existing.rows[0];

    // Data isolation: Investigators can only update cases they own/lead
    if (user.role === 'Investigator') {
      const isCreator = currentCase.CREATED_BY === user.userId;
      const isLead = currentCase.ASSIGNED_TO === user.userId;
      if (!isCreator && !isLead) {
        return apiResponse.error(
          res,
          `Access forbidden: You cannot modify Case #${caseId}.`,
          'FORBIDDEN',
          null,
          403
        );
      }
    }

    // Validate status if changing
    if (status && !VALID_CASE_STATUSES.includes(status)) {
      return apiResponse.error(
        res,
        `Invalid status. Must be one of: ${VALID_CASE_STATUSES.join(', ')}`,
        'INVALID_STATUS',
        null,
        400
      );
    }

    await withTransaction(async (conn) => {
      // Resolve location if string passed
      let locId = undefined;
      if (locationAddress !== undefined) {
        if (locationAddress && locationAddress.trim()) {
          const locCheck = await conn.execute(
            `SELECT Location_ID FROM LOCATION WHERE LOWER(Address) = LOWER(:addr)`,
            { addr: locationAddress.trim() }
          );
          if (locCheck.rows && locCheck.rows.length > 0) {
            locId = locCheck.rows[0].LOCATION_ID;
          } else {
            const locIns = await conn.execute(
              `INSERT INTO LOCATION (Address) VALUES (:addr) RETURNING Location_ID INTO :outLocId`,
              {
                addr: locationAddress.trim(),
                outLocId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
              }
            );
            locId = locIns.outBinds.outLocId[0];
          }
        } else {
          locId = null;
        }
      }

      let updates = [];
      let binds = { caseId };

      if (title && title.trim()) {
        updates.push(`Title = :title`);
        binds.title = title.trim();
      }
      if (crimeType !== undefined) {
        updates.push(`Crime_Type = :crimeType`);
        binds.crimeType = crimeType ? crimeType.trim() : null;
      }
      if (status) {
        updates.push(`Status = :status`);
        binds.status = status;
      }
      if (locId !== undefined) {
        updates.push(`Location_ID = :locId`);
        binds.locId = locId;
      }
      if (assignedTo !== undefined) {
        updates.push(`Assigned_To = :assignedTo`);
        binds.assignedTo = assignedTo ? parseInt(assignedTo, 10) : null;
      }

      if (updates.length > 0) {
        const updateSql = `UPDATE CASE_TABLE SET ${updates.join(', ')} WHERE Case_ID = :caseId`;
        await conn.execute(updateSql, binds);

        // Record audit entry
        await conn.execute(
          `INSERT INTO AUDIT_LOG (
            User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
          ) VALUES (
            :userId, 'CASE_UPDATED', 'CASE_TABLE', :caseId, :ip, :details
          )`,
          {
            userId: user.userId,
            caseId,
            ip: clientIp,
            details: `Case #${caseId} updated by ${user.username}. Modified fields: ${updates.join(', ')}.`,
          }
        );
      }
    });

    return apiResponse.success(res, { caseId, updated: true, message: 'Case updated successfully.' });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/cases/:id/status
 * Quick lifecycle status transition endpoint.
 */
export async function updateCaseStatus(req, res, next) {
  try {
    const caseId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const user = req.user;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    if (!status || !VALID_CASE_STATUSES.includes(status)) {
      return apiResponse.error(
        res,
        `Invalid status '${status}'. Permitted values: ${VALID_CASE_STATUSES.join(', ')}`,
        'INVALID_STATUS',
        null,
        400
      );
    }

    const existing = await query(
      `SELECT Case_ID, Status, Created_By, Assigned_To FROM CASE_TABLE WHERE Case_ID = :caseId`,
      { caseId }
    );
    if (!existing.rows || existing.rows.length === 0) {
      return apiResponse.error(res, `Case #${caseId} not found.`, 'NOT_FOUND', null, 404);
    }

    const currentCase = existing.rows[0];

    // Data isolation
    if (user.role === 'Investigator') {
      const isCreator = currentCase.CREATED_BY === user.userId;
      const isLead = currentCase.ASSIGNED_TO === user.userId;
      if (!isCreator && !isLead) {
        return apiResponse.error(
          res,
          `Access forbidden: You cannot change status for Case #${caseId}.`,
          'FORBIDDEN',
          null,
          403
        );
      }
    }

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE CASE_TABLE SET Status = :status WHERE Case_ID = :caseId`,
        { status, caseId }
      );

      await conn.execute(
        `INSERT INTO AUDIT_LOG (
          User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
        ) VALUES (
          :userId, 'CASE_STATUS_CHANGED', 'CASE_TABLE', :caseId, :ip, :details
        )`,
        {
          userId: user.userId,
          caseId,
          ip: clientIp,
          details: `Case #${caseId} status updated: ${currentCase.STATUS} -> ${status}.`,
        }
      );
    });

    return apiResponse.success(res, {
      caseId,
      oldStatus: currentCase.STATUS,
      newStatus: status,
      updated: true,
    });
  } catch (error) {
    next(error);
  }
}
