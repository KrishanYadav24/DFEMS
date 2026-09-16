import oracledb from 'oracledb';
import { query } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

export async function runQuery(req, res, next) {
  try {
    const { type, key } = req.params;

    const queryCatalog = {
      // Joins (A1 - A4)
      joins: {
        A1: {
          title: 'Query A1: Evidence with Case Title & Lead Investigator',
          sql: `
            SELECT
              e.Evidence_ID,
              e.Description,
              e.Status,
              c.Title AS Case_Title,
              u.First_Name || ' ' || u.Last_Name AS Investigator_Name,
              i.Badge_Number
            FROM EVIDENCE e
            JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
            JOIN INVESTIGATOR i ON c.Assigned_To = i.User_ID
            JOIN APP_USER u ON i.User_ID = u.User_ID
            ORDER BY e.Evidence_ID
          `,
        },
        A2: {
          title: 'Query A2: Custody Trail with Evidence & Case Info',
          sql: `
            SELECT
              coc.Log_ID,
              TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At,
              coc.Action,
              coc.Actor,
              e.Description AS Evidence_Description,
              c.Title AS Case_Title
            FROM CHAIN_OF_CUSTODY coc
            JOIN EVIDENCE e ON coc.Evidence_ID = e.Evidence_ID
            JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
            ORDER BY coc.Log_ID
          `,
        },
        A3: {
          title: 'Query A3: Forensic Analysis with Examiner, Certification & Lab',
          sql: `
            SELECT
              fa.Analysis_ID,
              e.Description AS Evidence_Description,
              u.First_Name || ' ' || u.Last_Name AS Examiner_Name,
              fan.Certification,
              lab.Lab_Name,
              fa.Findings
            FROM FORENSIC_ANALYSIS fa
            JOIN EVIDENCE e ON fa.Evidence_ID = e.Evidence_ID
            JOIN FORENSIC_ANALYST fan ON fa.Analyst_ID = fan.User_ID
            JOIN APP_USER u ON fan.User_ID = u.User_ID
            JOIN LABORATORY lab ON fan.Laboratory_ID = lab.Laboratory_ID
            ORDER BY fa.Analysis_ID
          `,
        },
        A4: {
          title: 'Query A4: Unanalyzed Evidence (LEFT JOIN & NULL check)',
          sql: `
            SELECT
              e.Evidence_ID,
              e.Description,
              e.Status,
              c.Title AS Case_Title
            FROM EVIDENCE e
            JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
            LEFT JOIN FORENSIC_ANALYSIS fa ON e.Evidence_ID = fa.Evidence_ID
            WHERE fa.Analysis_ID IS NULL
            ORDER BY e.Evidence_ID
          `,
        },
      },

      // Nested Queries (B1 - B4)
      nested: {
        B1: {
          title: 'Query B1: Cases with More Than 2 Evidence Items (EXISTS Subquery)',
          sql: `
            SELECT
              c.Case_ID,
              c.Title,
              c.Status
            FROM CASE_TABLE c
            WHERE EXISTS (
              SELECT 1
              FROM EVIDENCE e
              WHERE e.Case_ID = c.Case_ID
              HAVING COUNT(*) > 2
              GROUP BY e.Case_ID
            )
            ORDER BY c.Case_ID
          `,
        },
        B2: {
          title: 'Query B2: Evidence in Cases Assigned to Ravi Kumar (IN Subquery)',
          sql: `
            SELECT
              e.Evidence_ID,
              e.Description,
              e.Status,
              e.Case_ID
            FROM EVIDENCE e
            WHERE e.Case_ID IN (
              SELECT c.Case_ID
              FROM CASE_TABLE c
              WHERE c.Assigned_To = (
                SELECT u.User_ID
                FROM APP_USER u
                WHERE u.Username = 'ravi.kumar'
              )
            )
            ORDER BY e.Evidence_ID
          `,
        },
        B3: {
          title: 'Query B3: Cases with Evidence Count Above Average (Scalar Subquery)',
          sql: `
            SELECT
              c.Case_ID,
              c.Title,
              COUNT(e.Evidence_ID) AS Evidence_Count
            FROM CASE_TABLE c
            JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
            GROUP BY c.Case_ID, c.Title
            HAVING COUNT(e.Evidence_ID) > (
              SELECT AVG(ev_count)
              FROM (
                SELECT COUNT(*) AS ev_count
                FROM EVIDENCE
                GROUP BY Case_ID
              )
            )
            ORDER BY Evidence_Count DESC
          `,
        },
        B4: {
          title: 'Query B4: Investigators with Zero Assigned Cases (NOT IN Subquery)',
          sql: `
            SELECT
              u.User_ID,
              u.First_Name || ' ' || u.Last_Name AS Investigator_Name,
              inv.Badge_Number
            FROM INVESTIGATOR inv
            JOIN APP_USER u ON inv.User_ID = u.User_ID
            WHERE inv.User_ID NOT IN (
              SELECT DISTINCT Assigned_To
              FROM CASE_TABLE
              WHERE Assigned_To IS NOT NULL
            )
            ORDER BY u.User_ID
          `,
        },
      },

      // Aggregates & Grouping (C1 - C4)
      aggregates: {
        C1: {
          title: 'Query C1: Evidence Count per Case (GROUP BY & HAVING >= 2)',
          sql: `
            SELECT
              c.Case_ID,
              c.Title,
              COUNT(e.Evidence_ID) AS Total_Evidence
            FROM CASE_TABLE c
            JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
            GROUP BY c.Case_ID, c.Title
            HAVING COUNT(e.Evidence_ID) >= 2
            ORDER BY Total_Evidence DESC
          `,
        },
        C2: {
          title: 'Query C2: Evidence Distribution by Vault Status',
          sql: `
            SELECT
              Status,
              COUNT(*) AS Item_Count,
              ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM EVIDENCE), 1) AS Pct_Share
            FROM EVIDENCE
            GROUP BY Status
            ORDER BY Item_Count DESC
          `,
        },
        C3: {
          title: 'Query C3: Chain of Custody Event Frequency per Evidence Item',
          sql: `
            SELECT
              e.Evidence_ID,
              e.Description,
              COUNT(coc.Log_ID) AS Custody_Transfers,
              MIN(TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD')) AS First_Logged,
              MAX(TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD')) AS Last_Logged
            FROM EVIDENCE e
            JOIN CHAIN_OF_CUSTODY coc ON e.Evidence_ID = coc.Evidence_ID
            GROUP BY e.Evidence_ID, e.Description
            ORDER BY Custody_Transfers DESC
          `,
        },
        C4: {
          title: 'Query C4: Forensic Analysis Volume per Certified Examiner',
          sql: `
            SELECT
              u.First_Name || ' ' || u.Last_Name AS Examiner_Name,
              fan.Certification,
              lab.Lab_Name,
              COUNT(fa.Analysis_ID) AS Analyses_Completed
            FROM FORENSIC_ANALYST fan
            JOIN APP_USER u ON fan.User_ID = u.User_ID
            JOIN LABORATORY lab ON fan.Laboratory_ID = lab.Laboratory_ID
            LEFT JOIN FORENSIC_ANALYSIS fa ON fan.User_ID = fa.Analyst_ID
            GROUP BY u.First_Name, u.Last_Name, fan.Certification, lab.Lab_Name
            ORDER BY Analyses_Completed DESC
          `,
        },
      },
    };

    const targetCategory = queryCatalog[type?.toLowerCase()];
    if (!targetCategory) {
      return apiResponse.error(res, `Unknown query category "${type}". Available: joins, nested, aggregates`, 'BAD_REQUEST', null, 400);
    }

    const queryDef = targetCategory[key?.toUpperCase()];
    if (!queryDef) {
      return apiResponse.error(res, `Unknown query key "${key}" in category "${type}".`, 'NOT_FOUND', null, 404);
    }

    const result = await query(queryDef.sql, {});

    return apiResponse.success(res, {
      category: type.toUpperCase(),
      key: key.toUpperCase(),
      title: queryDef.title,
      sql: queryDef.sql.trim(),
      rows: result.rows || [],
      rowCount: result.rows?.length || 0,
    });
  } catch (error) {
    next(error);
  }
}

export async function getView(req, res, next) {
  try {
    const { viewName } = req.params;

    const allowedViews = {
      v_case_evidence_summary: 'SELECT * FROM v_case_evidence_summary',
      v_active_chain_of_custody: 'SELECT * FROM v_active_chain_of_custody',
      v_forensic_workload: 'SELECT * FROM v_forensic_workload',
    };

    const sql = allowedViews[viewName.toLowerCase()];
    if (!sql) {
      return apiResponse.error(
        res,
        `View "${viewName}" is not an authorized DFEMS view. Available: ${Object.keys(allowedViews).join(', ')}`,
        'BAD_REQUEST',
        null,
        400
      );
    }

    const result = await query(sql, {});
    return apiResponse.success(res, {
      viewName,
      sql,
      rows: result.rows || [],
      rowCount: result.rows?.length || 0,
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardStats(req, res, next) {
  try {
    // 1. Cases count
    const casesResult = await query(`
      SELECT 
        COUNT(*) AS Total_Cases,
        COUNT(CASE WHEN Status IN ('Open', 'Under Investigation') THEN 1 END) AS Active_Cases,
        COUNT(CASE WHEN Status = 'Closed' THEN 1 END) AS Closed_Cases
      FROM CASE_TABLE
    `);

    // 2. Evidence counts
    const evidenceResult = await query(`
      SELECT 
        COUNT(*) AS Total_Evidence,
        COUNT(CASE WHEN Status = 'Under Analysis' THEN 1 END) AS Under_Analysis,
        COUNT(CASE WHEN Status = 'In Storage' THEN 1 END) AS In_Storage,
        COUNT(CASE WHEN Status = 'Presented in Court' THEN 1 END) AS In_Court
      FROM EVIDENCE
    `);

    // 3. Custody total
    const custodyResult = await query(`SELECT COUNT(*) AS Total_Logs FROM CHAIN_OF_CUSTODY`);

    // 4. Status Breakdown
    const breakdownResult = await query(`
      SELECT Status AS Name, COUNT(*) AS Value
      FROM EVIDENCE
      GROUP BY Status
      ORDER BY Value DESC
    `);

    // 5. Evidence per case
    const perCaseResult = await query(`
      SELECT c.Title, COUNT(e.Evidence_ID) AS Evidence_Count
      FROM CASE_TABLE c
      LEFT JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
      GROUP BY c.Case_ID, c.Title
      ORDER BY c.Case_ID ASC
    `);

    return apiResponse.success(res, {
      cases: casesResult.rows?.[0] || {},
      evidence: evidenceResult.rows?.[0] || {},
      custody: custodyResult.rows?.[0] || {},
      statusBreakdown: breakdownResult.rows || [],
      evidenceDistribution: perCaseResult.rows || [],
    });
  } catch (error) {
    next(error);
  }
}
