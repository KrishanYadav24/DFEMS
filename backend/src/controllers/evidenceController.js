import oracledb from 'oracledb';
import { query, withTransaction } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

const VALID_EVIDENCE_STATUSES = [
  'Collected',
  'In Storage',
  'Under Analysis',
  'Presented in Court',
  'Archived',
  'Disposed',
];

/**
 * GET /api/evidence
 * List digital evidence items with search, filters, pagination, and RBAC data isolation.
 */
export async function getEvidence(req, res, next) {
  try {
    const { status, type, caseId, search, page = 1, limit = 50 } = req.query;
    const user = req.user;

    let sql = `
      SELECT 
        e.Evidence_ID,
        e.Description,
        TO_CHAR(e.Collection_Date, 'YYYY-MM-DD') AS Collection_Date,
        e.Status,
        e.Hash_Value,
        e.Case_ID,
        c.Title AS Case_Title,
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
      JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
      LEFT JOIN DEVICE d ON e.Evidence_ID = d.Evidence_ID
      LEFT JOIN FILE_RECORD f ON e.Evidence_ID = f.Evidence_ID
      WHERE 1=1
    `;

    const binds = {};

    // 1. RBAC Data Isolation
    if (user.role === 'Investigator') {
      sql += ` AND (
        c.Created_By = :currentUserId 
        OR c.Assigned_To = :currentUserId 
        OR EXISTS (SELECT 1 FROM ASSIGNED a WHERE a.Case_ID = c.Case_ID AND a.User_ID = :currentUserId)
      )`;
      binds.currentUserId = user.userId;
    }

    // 2. Filters
    if (status && status !== 'ALL') {
      sql += ` AND e.Status = :status`;
      binds.status = status;
    }

    if (caseId) {
      sql += ` AND e.Case_ID = :caseId`;
      binds.caseId = parseInt(caseId, 10);
    }

    if (type && type !== 'ALL') {
      if (type.toLowerCase() === 'device') {
        sql += ` AND d.Device_ID IS NOT NULL`;
      } else if (type.toLowerCase() === 'file') {
        sql += ` AND f.File_ID IS NOT NULL`;
      }
    }

    // 3. Keyword Search
    if (search && search.trim()) {
      sql += ` AND (
        UPPER(e.Description) LIKE :search 
        OR UPPER(d.Serial_Number) LIKE :search 
        OR UPPER(f.File_Name) LIKE :search
        OR UPPER(e.Hash_Value) LIKE :search
        OR UPPER(c.Title) LIKE :search
      )`;
      binds.search = `%${search.trim().toUpperCase()}%`;
    }

    sql += ` ORDER BY e.Evidence_ID DESC`;

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
 * GET /api/evidence/:id
 * Retrieve evidence details including subtype records and complete chain of custody trail.
 */
export async function getEvidenceById(req, res, next) {
  try {
    const evidenceId = parseInt(req.params.id, 10);
    const user = req.user;

    const sql = `
      SELECT 
        e.Evidence_ID,
        e.Description,
        TO_CHAR(e.Collection_Date, 'YYYY-MM-DD') AS Collection_Date,
        e.Status,
        e.Hash_Value,
        e.Case_ID,
        c.Title AS Case_Title,
        c.Created_By AS Case_Creator,
        c.Assigned_To AS Case_Lead,
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
      JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
      LEFT JOIN DEVICE d ON e.Evidence_ID = d.Evidence_ID
      LEFT JOIN FILE_RECORD f ON e.Evidence_ID = f.Evidence_ID
      WHERE e.Evidence_ID = :evidenceId
    `;

    const result = await query(sql, { evidenceId });
    if (!result.rows || result.rows.length === 0) {
      return apiResponse.error(res, `Evidence item #${evidenceId} not found.`, 'NOT_FOUND', null, 404);
    }

    const item = result.rows[0];

    // Data Isolation Check for Investigators
    if (user.role === 'Investigator') {
      const isCreator = item.CASE_CREATOR === user.userId;
      const isLead = item.CASE_LEAD === user.userId;

      const assignCheck = await query(
        `SELECT COUNT(*) AS CNT FROM ASSIGNED WHERE Case_ID = :caseId AND User_ID = :userId`,
        { caseId: item.CASE_ID, userId: user.userId }
      );
      const isAssigned = (assignCheck.rows?.[0]?.CNT || 0) > 0;

      if (!isCreator && !isLead && !isAssigned) {
        return apiResponse.error(
          res,
          `Access forbidden: You are not authorized to view Evidence #${evidenceId}.`,
          'FORBIDDEN',
          null,
          403
        );
      }
    }

    // Fetch Chain of Custody trail (using verified schema columns: Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
    const custodySql = `
      SELECT 
        cc.Custody_ID,
        cc.Action,
        cc.User_ID,
        NVL(u.First_Name || ' ' || u.Last_Name, 'System Custodian') AS Actor,
        u.Role AS Actor_Role,
        TO_CHAR(cc.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At
      FROM CHAIN_OF_CUSTODY cc
      LEFT JOIN APP_USER u ON cc.User_ID = u.User_ID
      WHERE cc.Evidence_ID = :evidenceId
      ORDER BY cc.Custody_ID ASC
    `;
    const custodyResult = await query(custodySql, { evidenceId });
    item.custodyTrail = custodyResult.rows || [];

    return apiResponse.success(res, item);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/evidence
 * Atomic evidence intake: writes to EVIDENCE, subtype (DEVICE/FILE_RECORD),
 * records initial custody entry into CHAIN_OF_CUSTODY, and writes to AUDIT_LOG.
 */
export async function registerEvidence(req, res, next) {
  try {
    const {
      description,
      caseId,
      evidenceType = 'General',
      serialNumber,
      fileName,
      fileSize,
      mimeType,
      hashValue,
    } = req.body;

    const user = req.user;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    if (!description || !description.trim()) {
      return apiResponse.error(res, 'Evidence description is required.', 'VALIDATION_ERROR', null, 400);
    }
    if (!caseId) {
      return apiResponse.error(res, 'Case ID is required.', 'VALIDATION_ERROR', null, 400);
    }
    if (!hashValue || !hashValue.trim()) {
      return apiResponse.error(res, 'Cryptographic hash value (SHA-256) is required for evidence intake.', 'VALIDATION_ERROR', null, 400);
    }

    // Verify parent case exists and check investigator assignment
    const caseCheck = await query(
      `SELECT Case_ID, Title, Created_By, Assigned_To FROM CASE_TABLE WHERE Case_ID = :caseId`,
      { caseId: parseInt(caseId, 10) }
    );
    if (!caseCheck.rows || caseCheck.rows.length === 0) {
      return apiResponse.error(res, `Referenced Case #${caseId} does not exist.`, 'CASE_NOT_FOUND', null, 404);
    }

    const parentCase = caseCheck.rows[0];

    if (user.role === 'Investigator') {
      const isCreator = parentCase.CREATED_BY === user.userId;
      const isLead = parentCase.ASSIGNED_TO === user.userId;
      const assignCheck = await query(
        `SELECT COUNT(*) AS CNT FROM ASSIGNED WHERE Case_ID = :caseId AND User_ID = :userId`,
        { caseId: parentCase.CASE_ID, userId: user.userId }
      );
      const isAssigned = (assignCheck.rows?.[0]?.CNT || 0) > 0;

      if (!isCreator && !isLead && !isAssigned) {
        return apiResponse.error(
          res,
          `Access forbidden: You cannot register evidence to unassigned Case #${caseId}.`,
          'FORBIDDEN',
          null,
          403
        );
      }
    }

    // Execute atomic intake transaction
    const newEvidence = await withTransaction(async (conn) => {
      // 1. Insert into EVIDENCE
      const evSql = `
        INSERT INTO EVIDENCE (
          Description,
          Collection_Date,
          Case_ID,
          Status,
          Hash_Value
        ) VALUES (
          :description,
          SYSDATE,
          :caseId,
          'Collected',
          :hashValue
        ) RETURNING Evidence_ID INTO :outEvId
      `;

      const evBinds = {
        description: description.trim(),
        caseId: parseInt(caseId, 10),
        hashValue: hashValue.trim(),
        outEvId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      };

      const evResult = await conn.execute(evSql, evBinds);
      const generatedEvidenceId = evResult.outBinds.outEvId[0];

      // 2. Insert into hardware/file subtype table
      if (evidenceType === 'Device' && serialNumber) {
        await conn.execute(
          `INSERT INTO DEVICE (Serial_Number, Evidence_ID) VALUES (:serialNumber, :evidenceId)`,
          { serialNumber: serialNumber.trim(), evidenceId: generatedEvidenceId }
        );
      } else if (evidenceType === 'File' && fileName) {
        await conn.execute(
          `INSERT INTO FILE_RECORD (Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
           VALUES (:evidenceId, :fileName, :filePath, :fileSize, :mimeType)`,
          {
            evidenceId: generatedEvidenceId,
            fileName: fileName.trim(),
            filePath: `evidence_vault/case_${caseId}/${fileName.trim()}`,
            fileSize: fileSize ? parseInt(fileSize, 10) : 1024,
            mimeType: mimeType || 'application/octet-stream',
          }
        );
      }

      // 3. Insert initial chain of custody entry (using verified schema columns: Evidence_ID, Action, User_ID, Timestamp_At)
      await conn.execute(
        `INSERT INTO CHAIN_OF_CUSTODY (
          Evidence_ID,
          Action,
          User_ID,
          Timestamp_At
        ) VALUES (
          :evidenceId,
          'Collected at scene',
          :userId,
          SYSTIMESTAMP
        )`,
        {
          evidenceId: generatedEvidenceId,
          userId: user.userId,
        }
      );

      // 4. Emit audit log event
      await conn.execute(
        `INSERT INTO AUDIT_LOG (
          User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
        ) VALUES (
          :userId, 'EVIDENCE_REGISTERED', 'EVIDENCE', :evidenceId, :ip, :details
        )`,
        {
          userId: user.userId,
          evidenceId: generatedEvidenceId,
          ip: clientIp,
          details: `Evidence #${generatedEvidenceId} ("${description.trim()}") intake registered for Case #${caseId} by ${user.username}.`,
        }
      );

      return {
        evidenceId: generatedEvidenceId,
        description: description.trim(),
        caseId: parseInt(caseId, 10),
        status: 'Collected',
        hashValue: hashValue.trim(),
        evidenceType,
      };
    });

    return apiResponse.success(
      res,
      newEvidence,
      { message: 'Evidence intake committed atomically to Oracle database.' },
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/evidence/:id
 * Update permitted evidence metadata (description, status).
 * Note: Hash_Value is legally immutable and cannot be altered post-intake.
 */
export async function updateEvidence(req, res, next) {
  try {
    const evidenceId = parseInt(req.params.id, 10);
    const { description, status } = req.body;
    const user = req.user;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    // Verify evidence exists
    const existing = await query(
      `SELECT e.Evidence_ID, e.Status, e.Case_ID, c.Created_By, c.Assigned_To 
       FROM EVIDENCE e 
       JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID 
       WHERE e.Evidence_ID = :evidenceId`,
      { evidenceId }
    );

    if (!existing.rows || existing.rows.length === 0) {
      return apiResponse.error(res, `Evidence #${evidenceId} not found.`, 'NOT_FOUND', null, 404);
    }

    const current = existing.rows[0];

    // Data isolation
    if (user.role === 'Investigator') {
      const isCreator = current.CREATED_BY === user.userId;
      const isLead = current.ASSIGNED_TO === user.userId;
      if (!isCreator && !isLead) {
        return apiResponse.error(
          res,
          `Access forbidden: You cannot modify Evidence #${evidenceId}.`,
          'FORBIDDEN',
          null,
          403
        );
      }
    }

    // Validate status if updating
    if (status && !VALID_EVIDENCE_STATUSES.includes(status)) {
      return apiResponse.error(
        res,
        `Invalid status '${status}'. Must be one of: ${VALID_EVIDENCE_STATUSES.join(', ')}`,
        'INVALID_STATUS',
        null,
        400
      );
    }

    await withTransaction(async (conn) => {
      let updates = [];
      let binds = { evidenceId };

      if (description && description.trim()) {
        updates.push(`Description = :description`);
        binds.description = description.trim();
      }
      if (status) {
        updates.push(`Status = :status`);
        binds.status = status;
      }

      if (updates.length > 0) {
        await conn.execute(
          `UPDATE EVIDENCE SET ${updates.join(', ')} WHERE Evidence_ID = :evidenceId`,
          binds
        );

        // Record Audit Event
        await conn.execute(
          `INSERT INTO AUDIT_LOG (
            User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
          ) VALUES (
            :userId, 'EVIDENCE_METADATA_UPDATED', 'EVIDENCE', :evidenceId, :ip, :details
          )`,
          {
            userId: user.userId,
            evidenceId,
            ip: clientIp,
            details: `Evidence #${evidenceId} metadata updated by ${user.username}. (${updates.join(', ')}).`,
          }
        );
      }
    });

    return apiResponse.success(res, {
      evidenceId,
      updated: true,
      message: 'Evidence metadata updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/evidence/:id/verify-hash
 * Calls Oracle database function fn_verify_hash with bind variables.
 */
export async function verifyHash(req, res, next) {
  try {
    const evidenceId = parseInt(req.params.id, 10);
    const { providedHash } = req.body;

    if (!providedHash) {
      return apiResponse.error(res, 'A hash value must be provided for verification.', 'MISSING_HASH', null, 400);
    }

    // Call Oracle function fn_verify_hash directly in SQL
    const sql = `
      SELECT fn_verify_hash(:evidenceId, :providedHash) AS VERIFICATION_OUTCOME
      FROM DUAL
    `;

    const result = await query(sql, {
      evidenceId,
      providedHash: providedHash.trim(),
    });

    const outcome = result.rows?.[0]?.VERIFICATION_OUTCOME || 'UNKNOWN';
    const isMatch = outcome === 'MATCH';

    return apiResponse.success(res, {
      evidenceId,
      providedHash,
      outcome,
      intact: isMatch,
      status: isMatch ? 'VERIFIED' : 'POSSIBLE_TAMPERING',
      message: isMatch
        ? 'SHA-256 checksum matches stored intake digest. Evidentiary integrity verified.'
        : 'CRITICAL ALERT: Cryptographic mismatch detected against stored intake hash.',
    });
  } catch (error) {
    next(error);
  }
}
