import { query, withTransaction } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

const VALID_EVIDENCE_STATUSES = [
  'Collected',
  'In Storage',
  'Under Analysis',
  'Presented in Court',
  'Archived',
  'Disposed',
];

/**
 * GET /api/custody
 * Retrieve chronological chain of custody ledger with optional filtering by Evidence_ID.
 */
export async function getCustodyLedger(req, res, next) {
  try {
    const { evidenceId, limit = 100 } = req.query;

    let sql = `
      SELECT 
        c.Custody_ID,
        c.Evidence_ID,
        e.Description AS Evidence_Desc,
        cs.Title AS Case_Title,
        c.Action,
        c.User_ID,
        NVL(u.First_Name || ' ' || u.Last_Name, 'System Custodian') AS Actor,
        u.Username AS Actor_Username,
        u.Role AS Actor_Role,
        TO_CHAR(c.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At
      FROM CHAIN_OF_CUSTODY c
      JOIN EVIDENCE e ON c.Evidence_ID = e.Evidence_ID
      JOIN CASE_TABLE cs ON e.Case_ID = cs.Case_ID
      LEFT JOIN APP_USER u ON c.User_ID = u.User_ID
    `;

    const binds = {};
    if (evidenceId && evidenceId !== 'ALL') {
      sql += ` WHERE c.Evidence_ID = :evidenceId`;
      binds.evidenceId = parseInt(evidenceId, 10);
    }

    sql += ` ORDER BY c.Custody_ID DESC`;

    const result = await query(sql, binds);
    return apiResponse.success(res, result.rows || [], { count: result.rows?.length || 0 });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/custody/:evidenceId
 * Retrieve chronological chain of custody trail for a specific evidence item.
 */
export async function getCustodyByEvidenceId(req, res, next) {
  try {
    const evidenceId = parseInt(req.params.evidenceId, 10);

    const sql = `
      SELECT 
        c.Custody_ID,
        c.Evidence_ID,
        e.Description AS Evidence_Desc,
        cs.Title AS Case_Title,
        c.Action,
        c.User_ID,
        NVL(u.First_Name || ' ' || u.Last_Name, 'System Custodian') AS Actor,
        u.Username AS Actor_Username,
        u.Role AS Actor_Role,
        TO_CHAR(c.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At
      FROM CHAIN_OF_CUSTODY c
      JOIN EVIDENCE e ON c.Evidence_ID = e.Evidence_ID
      JOIN CASE_TABLE cs ON e.Case_ID = cs.Case_ID
      LEFT JOIN APP_USER u ON c.User_ID = u.User_ID
      WHERE c.Evidence_ID = :evidenceId
      ORDER BY c.Custody_ID ASC
    `;

    const result = await query(sql, { evidenceId });
    return apiResponse.success(res, result.rows || [], { count: result.rows?.length || 0 });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/custody/transfer
 * Records custodial transfer capturing:
 * - Evidence ID
 * - Transferring party (current authenticated user)
 * - Receiving party (assigned recipient user)
 * - Location
 * - Purpose / Reason
 * - Timestamp (SYSTIMESTAMP)
 * - New Lifecycle Status
 *
 * Enforces transaction boundaries and calls Oracle stored procedure sp_transfer_custody
 * (SAVEPOINT before_transfer, ROLLBACK TO before_transfer on failure).
 */
export async function transferCustody(req, res, next) {
  try {
    const { evidenceId, newStatus, toUserId, location, purpose, reason } = req.body;
    const user = req.user;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    const evId = parseInt(evidenceId, 10);
    if (isNaN(evId)) {
      return apiResponse.error(res, 'Valid numeric Evidence ID is required.', 'VALIDATION_ERROR', null, 400);
    }

    if (!newStatus || !VALID_EVIDENCE_STATUSES.includes(newStatus)) {
      return apiResponse.error(
        res,
        `Invalid status '${newStatus}'. Must be one of: ${VALID_EVIDENCE_STATUSES.join(', ')}`,
        'INVALID_STATUS',
        null,
        400
      );
    }

    // 1. Verify evidence existence and current status
    const evCheck = await query(
      `SELECT e.Evidence_ID, e.Status, e.Case_ID, c.Created_By, c.Assigned_To 
       FROM EVIDENCE e
       JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
       WHERE e.Evidence_ID = :evidenceId`,
      { evidenceId: evId }
    );

    if (!evCheck.rows || evCheck.rows.length === 0) {
      return apiResponse.error(res, `Evidence item #${evId} does not exist.`, 'EVIDENCE_NOT_FOUND', null, 404);
    }

    const currentEvidence = evCheck.rows[0];

    // Check terminal statuses
    if (['Disposed', 'Archived'].includes(currentEvidence.STATUS)) {
      return apiResponse.error(
        res,
        `Evidence #${evId} is in terminal status '${currentEvidence.STATUS}' and cannot undergo custody transfer.`,
        'TERMINAL_STATUS',
        null,
        400
      );
    }

    // 2. Enforce Investigator Data Isolation
    if (user.role === 'Investigator') {
      const isCreator = currentEvidence.CREATED_BY === user.userId;
      const isLead = currentEvidence.ASSIGNED_TO === user.userId;
      const assignCheck = await query(
        `SELECT COUNT(*) AS CNT FROM ASSIGNED WHERE Case_ID = :caseId AND User_ID = :userId`,
        { caseId: currentEvidence.CASE_ID, userId: user.userId }
      );
      const isAssigned = (assignCheck.rows?.[0]?.CNT || 0) > 0;

      if (!isCreator && !isLead && !isAssigned) {
        return apiResponse.error(
          res,
          `Access forbidden: You are not authorized to transfer Evidence #${evId}.`,
          'FORBIDDEN',
          null,
          403
        );
      }
    }

    // 3. Validate receiving party if provided
    let recipientName = 'Authorized Personnel';
    let recipientRole = 'Custodian';
    let recipientUserId = null;

    if (toUserId) {
      const rId = parseInt(toUserId, 10);
      const userCheck = await query(
        `SELECT User_ID, Username, First_Name, Last_Name, Role, Account_Status FROM APP_USER WHERE User_ID = :toUserId`,
        { toUserId: rId }
      );

      if (!userCheck.rows || userCheck.rows.length === 0) {
        return apiResponse.error(res, `Receiving user #${rId} does not exist in APP_USER.`, 'USER_NOT_FOUND', null, 400);
      }

      const rUser = userCheck.rows[0];
      if (rUser.ACCOUNT_STATUS !== 'Active') {
        return apiResponse.error(res, `Receiving user #${rId} (${rUser.USERNAME}) is inactive.`, 'USER_INACTIVE', null, 400);
      }

      recipientName = `${rUser.FIRST_NAME || ''} ${rUser.LAST_NAME || ''}`.trim() || rUser.USERNAME;
      recipientRole = rUser.ROLE;
      recipientUserId = rUser.USER_ID;
    }

    // 4. Format structured transfer metadata
    const transferorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
    const transferLocation = location ? location.trim() : 'Central Evidence Repository';
    const transferPurpose = purpose ? purpose.trim() : (reason ? reason.trim() : 'Operational transfer');

    // Human-readable action format fits comfortably in VARCHAR2(255)
    // sp_transfer_custody prepends "Transfer reason: " to this string
    const formattedReason = `From: ${transferorName} -> To: ${recipientName} @ ${transferLocation} | Purpose: ${transferPurpose}`;

    // 5. Execute transfer atomically using Oracle stored procedure sp_transfer_custody
    await withTransaction(async (conn) => {
      // Call Oracle Stored Procedure sp_transfer_custody (SAVEPOINT, COMMIT, ROLLBACK)
      await conn.execute(
        `BEGIN sp_transfer_custody(:evidenceId, :newStatus, :reason); END;`,
        {
          evidenceId: evId,
          newStatus,
          reason: formattedReason,
        }
      );

      // Record in system AUDIT_LOG
      await conn.execute(
        `INSERT INTO AUDIT_LOG (
          User_ID, Action, Entity_Name, Entity_ID, IP_Address, Details
        ) VALUES (
          :userId, 'CUSTODY_TRANSFER', 'EVIDENCE', :evidenceId, :ip, :details
        )`,
        {
          userId: user.userId,
          evidenceId: evId,
          ip: clientIp,
          details: JSON.stringify({
            evidenceId: evId,
            transferor: { userId: user.userId, name: transferorName, role: user.role },
            recipient: recipientUserId ? { userId: recipientUserId, name: recipientName, role: recipientRole } : { name: recipientName },
            location: transferLocation,
            purpose: transferPurpose,
            previousStatus: currentEvidence.STATUS,
            newStatus,
          }),
        }
      );
    });

    return apiResponse.success(
      res,
      {
        evidenceId: evId,
        previousStatus: currentEvidence.STATUS,
        newStatus,
        transferor: transferorName,
        recipient: recipientName,
        location: transferLocation,
        purpose: transferPurpose,
        action: `Transfer reason: ${formattedReason}`,
        message: 'Chain of custody transfer committed cleanly to append-only Oracle ledger via sp_transfer_custody.',
      },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Test endpoint demonstrating trigger trg_custody_no_update intercepting UPDATE statements.
 */
export async function testTriggerUpdate(req, res, next) {
  try {
    const sql = `
      UPDATE CHAIN_OF_CUSTODY
      SET Action = 'Attempted Tamper via Direct SQL'
      WHERE Custody_ID = 1
    `;

    await query(sql, {});
    return apiResponse.success(res, {
      tamperAllowed: true,
      message: 'Trigger did not throw — verify that database/oracle_programs.sql has been compiled in FREEPDB1.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Test endpoint demonstrating trigger trg_custody_no_delete intercepting DELETE statements.
 */
export async function testTriggerDelete(req, res, next) {
  try {
    const sql = `
      DELETE FROM CHAIN_OF_CUSTODY
      WHERE Custody_ID = 1
    `;

    await query(sql, {});
    return apiResponse.success(res, {
      deleteAllowed: true,
      message: 'Trigger did not throw — verify that database/oracle_programs.sql has been compiled in FREEPDB1.',
    });
  } catch (error) {
    next(error);
  }
}
