import { query, withTransaction } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

export async function getCustodyLedger(req, res, next) {
  try {
    const { evidenceId } = req.query;

    let sql = `
      SELECT 
        c.Log_ID,
        c.Evidence_ID,
        e.Description AS Evidence_Desc,
        cs.Title AS Case_Title,
        c.Action,
        c.Actor,
        TO_CHAR(c.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At
      FROM CHAIN_OF_CUSTODY c
      JOIN EVIDENCE e ON c.Evidence_ID = e.Evidence_ID
      JOIN CASE_TABLE cs ON e.Case_ID = cs.Case_ID
    `;

    const binds = {};
    if (evidenceId && evidenceId !== 'ALL') {
      sql += ` WHERE c.Evidence_ID = :evidenceId`;
      binds.evidenceId = parseInt(evidenceId, 10);
    }

    sql += ` ORDER BY c.Log_ID DESC`;

    const result = await query(sql, binds);
    return apiResponse.success(res, result.rows || [], { count: result.rows?.length || 0 });
  } catch (error) {
    next(error);
  }
}

export async function transferCustody(req, res, next) {
  try {
    const { evidenceId, newStatus, actor, reason } = req.body;

    const actionText = reason ? `${newStatus} (${reason})` : newStatus;

    await withTransaction(async (conn) => {
      // 1. Log append-only transfer record
      const custodySql = `
        INSERT INTO CHAIN_OF_CUSTODY (
          Evidence_ID,
          Action,
          Actor,
          Timestamp_At
        ) VALUES (
          :evidenceId,
          :action,
          :actor,
          SYSTIMESTAMP
        )
      `;
      await conn.execute(custodySql, {
        evidenceId: parseInt(evidenceId, 10),
        action: actionText,
        actor: actor || 'Authorized Custodian',
      });

      // 2. Synchronize current status on evidence entity
      const updateEvSql = `
        UPDATE EVIDENCE
        SET Status = :newStatus
        WHERE Evidence_ID = :evidenceId
      `;
      await conn.execute(updateEvSql, {
        newStatus,
        evidenceId: parseInt(evidenceId, 10),
      });
    });

    return apiResponse.success(
      res,
      {
        evidenceId,
        newStatus,
        actor,
        action: actionText,
        message: 'Chain of custody transfer committed cleanly to append-only Oracle ledger.',
      },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint demonstrating trigger trg_custody_no_update intercepting UPDATE statements.
 */
export async function testTriggerUpdate(req, res, next) {
  try {
    const sql = `
      UPDATE CHAIN_OF_CUSTODY
      SET Action = 'Attempted Tamper via Direct SQL'
      WHERE Log_ID = 1
    `;

    await query(sql, {});
    // If the trigger did not fire (e.g. trigger not compiled yet), return warning
    return apiResponse.success(res, {
      tamperAllowed: true,
      message: 'Trigger did not throw — verify that database/oracle_programs.sql has been compiled in FREEPDB1.',
    });
  } catch (error) {
    // Pass to centralized errorHandler to return structured 403 TRIGGER_IMMUTABILITY_ENFORCED
    next(error);
  }
}

/**
 * Endpoint demonstrating trigger trg_custody_no_delete intercepting DELETE statements.
 */
export async function testTriggerDelete(req, res, next) {
  try {
    const sql = `
      DELETE FROM CHAIN_OF_CUSTODY
      WHERE Log_ID = 1
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
