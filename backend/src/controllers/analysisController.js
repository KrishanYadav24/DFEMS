import oracledb from 'oracledb';
import { query, withTransaction } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

export async function getAnalyses(req, res, next) {
  try {
    const { evidenceId } = req.query;

    let sql = `
      SELECT 
        a.Analysis_ID,
        a.Evidence_ID,
        e.Description AS Evidence_Desc,
        a.Analyst_ID,
        u.First_Name || ' ' || u.Last_Name AS Analyst_Name,
        fa.Certification,
        l.Lab_Name,
        a.Findings,
        TO_CHAR(a.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At
      FROM FORENSIC_ANALYSIS a
      JOIN EVIDENCE e ON a.Evidence_ID = e.Evidence_ID
      JOIN FORENSIC_ANALYST fa ON a.Analyst_ID = fa.User_ID
      JOIN APP_USER u ON fa.User_ID = u.User_ID
      LEFT JOIN LABORATORY l ON fa.Laboratory_ID = l.Laboratory_ID
    `;

    const binds = {};
    if (evidenceId) {
      sql += ` WHERE a.Evidence_ID = :evidenceId`;
      binds.evidenceId = parseInt(evidenceId, 10);
    }

    sql += ` ORDER BY a.Analysis_ID DESC`;

    const result = await query(sql, binds);
    return apiResponse.success(res, result.rows || [], { count: result.rows?.length || 0 });
  } catch (error) {
    next(error);
  }
}

export async function addAnalysis(req, res, next) {
  try {
    const { evidenceId, analystId, findings } = req.body;

    const newAnalysis = await withTransaction(async (conn) => {
      // 1. Insert analysis finding
      const insertSql = `
        INSERT INTO FORENSIC_ANALYSIS (
          Evidence_ID,
          Analyst_ID,
          Findings,
          Timestamp_At
        ) VALUES (
          :evidenceId,
          :analystId,
          :findings,
          SYSTIMESTAMP
        ) RETURNING Analysis_ID INTO :outAnalysisId
      `;

      const binds = {
        evidenceId: parseInt(evidenceId, 10),
        analystId: parseInt(analystId, 10),
        findings,
        outAnalysisId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      };

      const result = await conn.execute(insertSql, binds);
      const generatedAnalysisId = result.outBinds.outAnalysisId[0];

      // 2. Transition evidence status to 'Under Analysis'
      await conn.execute(
        `UPDATE EVIDENCE SET Status = 'Under Analysis' WHERE Evidence_ID = :evidenceId`,
        { evidenceId: parseInt(evidenceId, 10) }
      );

      return {
        analysisId: generatedAnalysisId,
        evidenceId,
        analystId,
        findings,
      };
    });

    return apiResponse.success(
      res,
      {
        ...newAnalysis,
        message: 'Forensic analysis finding recorded successfully in Oracle database.',
      },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}
