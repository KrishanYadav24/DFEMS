import oracledb from 'oracledb';
import { query, withTransaction } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

export async function getEvidence(req, res, next) {
  try {
    const { status, type, caseId, search } = req.query;

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
      LEFT JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
      LEFT JOIN DEVICE d ON e.Evidence_ID = d.Evidence_ID
      LEFT JOIN FILE_RECORD f ON e.Evidence_ID = f.Evidence_ID
      WHERE 1=1
    `;

    const binds = {};

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

    if (search && search.trim()) {
      sql += ` AND (UPPER(e.Description) LIKE :search OR UPPER(d.Serial_Number) LIKE :search OR UPPER(f.File_Name) LIKE :search)`;
      binds.search = `%${search.trim().toUpperCase()}%`;
    }

    sql += ` ORDER BY e.Evidence_ID DESC`;

    const result = await query(sql, binds);
    return apiResponse.success(res, result.rows || [], { count: result.rows?.length || 0 });
  } catch (error) {
    next(error);
  }
}

export async function getEvidenceById(req, res, next) {
  try {
    const evidenceId = req.params.id;

    const sql = `
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
        f.Mime_Type
      FROM EVIDENCE e
      LEFT JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
      LEFT JOIN DEVICE d ON e.Evidence_ID = d.Evidence_ID
      LEFT JOIN FILE_RECORD f ON e.Evidence_ID = f.Evidence_ID
      WHERE e.Evidence_ID = :evidenceId
    `;

    const result = await query(sql, { evidenceId });
    if (!result.rows || result.rows.length === 0) {
      return apiResponse.error(res, `Evidence item #${evidenceId} not found.`, 'NOT_FOUND', null, 404);
    }

    const item = result.rows[0];

    // Fetch chain of custody trail
    const custodySql = `
      SELECT 
        Log_ID,
        Action,
        Actor,
        TO_CHAR(Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At
      FROM CHAIN_OF_CUSTODY
      WHERE Evidence_ID = :evidenceId
      ORDER BY Timestamp_At ASC
    `;
    const custodyResult = await query(custodySql, { evidenceId });
    item.custodyTrail = custodyResult.rows || [];

    return apiResponse.success(res, item);
  } catch (error) {
    next(error);
  }
}

export async function registerEvidence(req, res, next) {
  try {
    const {
      description,
      caseId,
      evidenceType,
      serialNumber,
      fileName,
      fileSize,
      mimeType,
      hashValue,
      actor,
    } = req.body;

    // Use transaction to atomically insert into EVIDENCE, sub-table, and CHAIN_OF_CUSTODY
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
        description,
        caseId: parseInt(caseId, 10),
        hashValue,
        outEvId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      };

      const evResult = await conn.execute(evSql, evBinds);
      const generatedEvidenceId = evResult.outBinds.outEvId[0];

      // 2. Insert into subtype table
      if (evidenceType === 'Device' && serialNumber) {
        await conn.execute(
          `INSERT INTO DEVICE (Serial_Number, Evidence_ID) VALUES (:serialNumber, :evidenceId)`,
          { serialNumber, evidenceId: generatedEvidenceId }
        );
      } else if (evidenceType === 'File') {
        await conn.execute(
          `INSERT INTO FILE_RECORD (Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
           VALUES (:evidenceId, :fileName, :filePath, :fileSize, :mimeType)`,
          {
            evidenceId: generatedEvidenceId,
            fileName: fileName || 'evidence_file.bin',
            filePath: `evidence_vault/case_${caseId}/${fileName || 'evidence_file.bin'}`,
            fileSize: fileSize || 1024,
            mimeType: mimeType || 'application/octet-stream',
          }
        );
      }

      // 3. Log initial intake custody entry
      await conn.execute(
        `INSERT INTO CHAIN_OF_CUSTODY (
          Evidence_ID,
          Action,
          Actor,
          Timestamp_At
        ) VALUES (
          :evidenceId,
          'Collected at scene',
          :actor,
          SYSTIMESTAMP
        )`,
        {
          evidenceId: generatedEvidenceId,
          actor: actor || 'Investigating Officer',
        }
      );

      return {
        evidenceId: generatedEvidenceId,
        description,
        caseId,
        status: 'Collected',
        hashValue,
      };
    });

    return apiResponse.success(
      res,
      {
        ...newEvidence,
        message: 'Evidence intake committed atomically to Oracle 26ai with initial custody record.',
      },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function verifyHash(req, res, next) {
  try {
    const evidenceId = req.params.id;
    const { providedHash } = req.body;

    if (!providedHash) {
      return apiResponse.error(res, 'A hash value must be provided for verification.', 'MISSING_HASH', null, 400);
    }

    // Call Oracle database function fn_verify_hash with bind variables
    const sql = `
      SELECT fn_verify_hash(:evidenceId, :providedHash) AS VERIFICATION_OUTCOME
      FROM DUAL
    `;

    const result = await query(sql, {
      evidenceId: parseInt(evidenceId, 10),
      providedHash: providedHash.trim(),
    });

    const outcome = result.rows?.[0]?.VERIFICATION_OUTCOME || 'UNKNOWN';
    const isMatch = outcome === 'MATCH';

    return apiResponse.success(res, {
      evidenceId: parseInt(evidenceId, 10),
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
