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
              NVL(u.First_Name || ' ' || u.Last_Name, 'Unassigned') AS Investigator_Name,
              i.Badge_Number
            FROM EVIDENCE e
            JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
            LEFT JOIN INVESTIGATOR i ON c.Assigned_To = i.User_ID
            LEFT JOIN APP_USER u ON i.User_ID = u.User_ID
            ORDER BY e.Evidence_ID
          `,
        },
        A2: {
          title: 'Query A2: Custody Trail with Evidence & Case Info',
          sql: `
            SELECT
              coc.Custody_ID,
              TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At,
              coc.Action,
              NVL(u.First_Name || ' ' || u.Last_Name, 'System Custodian') AS Logged_By,
              e.Description AS Evidence_Description,
              c.Title AS Case_Title
            FROM CHAIN_OF_CUSTODY coc
            JOIN EVIDENCE e ON coc.Evidence_ID = e.Evidence_ID
            JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
            LEFT JOIN APP_USER u ON coc.User_ID = u.User_ID
            ORDER BY coc.Custody_ID
          `,
        },
        A3: {
          title: 'Query A3: Forensic Analysis with Examiner, Certification & Lab',
          sql: `
            SELECT
              fa.Analysis_ID,
              e.Description AS Evidence_Description,
              NVL(u.First_Name || ' ' || u.Last_Name, 'Forensic Examiner') AS Examiner_Name,
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
          title: 'Query B1: Cases with Registered Evidence (EXISTS Subquery)',
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
              HAVING COUNT(*) >= 1
              GROUP BY e.Case_ID
            )
            ORDER BY c.Case_ID
          `,
        },
        B2: {
          title: 'Query B2: Evidence in Open or Active Cases (IN Subquery)',
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
              WHERE c.Status IN ('Open', 'Under Investigation')
            )
            ORDER BY e.Evidence_ID
          `,
        },
        B3: {
          title: 'Query B3: Cases with Evidence Count At or Above Average (Scalar Subquery)',
          sql: `
            SELECT
              c.Case_ID,
              c.Title,
              COUNT(e.Evidence_ID) AS Evidence_Count
            FROM CASE_TABLE c
            JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
            GROUP BY c.Case_ID, c.Title
            HAVING COUNT(e.Evidence_ID) >= (
              SELECT NVL(AVG(ev_count), 0)
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
          title: 'Query B4: Evidence with No Forensic Analysis (NOT IN Subquery)',
          sql: `
            SELECT
              e.Evidence_ID,
              e.Description,
              e.Status
            FROM EVIDENCE e
            WHERE e.Evidence_ID NOT IN (
              SELECT NVL(Evidence_ID, -1)
              FROM FORENSIC_ANALYSIS
            )
            ORDER BY e.Evidence_ID
          `,
        },
      },

      // Aggregates & Grouping (C1 - C4)
      aggregates: {
        C1: {
          title: 'Query C1: Evidence Count per Case (GROUP BY & COUNT)',
          sql: `
            SELECT
              c.Case_ID,
              c.Title,
              COUNT(e.Evidence_ID) AS Total_Evidence
            FROM CASE_TABLE c
            JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
            GROUP BY c.Case_ID, c.Title
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
              COUNT(coc.Custody_ID) AS Custody_Transfers,
              MIN(TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS')) AS First_Logged,
              MAX(TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS')) AS Last_Logged
            FROM EVIDENCE e
            JOIN CHAIN_OF_CUSTODY coc ON e.Evidence_ID = coc.Evidence_ID
            GROUP BY e.Evidence_ID, e.Description
            ORDER BY Custody_Transfers DESC
          `,
        },
        C4: {
          title: 'Query C4: Case and Evidence Volume by Case Status',
          sql: `
            SELECT
              c.Status AS Case_Status,
              COUNT(*) AS Total_Cases,
              COUNT(e.Evidence_ID) AS Total_Evidence
            FROM CASE_TABLE c
            LEFT JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
            GROUP BY c.Status
            ORDER BY Total_Cases DESC
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
      v_custody_trail: 'SELECT * FROM v_custody_trail',
      v_case_summary: 'SELECT * FROM v_case_summary',
      v_evidence_full: 'SELECT * FROM v_evidence_full',
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
    const user = req.user;
    const isInvestigator = user && user.role === 'Investigator';
    const binds = isInvestigator ? { investigatorUserId: user.userId } : {};

    const caseFilter = isInvestigator
      ? `WHERE (c.Created_By = :investigatorUserId OR c.Assigned_To = :investigatorUserId OR EXISTS (SELECT 1 FROM ASSIGNED a WHERE a.Case_ID = c.Case_ID AND a.User_ID = :investigatorUserId))`
      : '';

    const evidenceFilter = isInvestigator
      ? `WHERE e.Case_ID IN (SELECT c.Case_ID FROM CASE_TABLE c WHERE c.Created_By = :investigatorUserId OR c.Assigned_To = :investigatorUserId OR EXISTS (SELECT 1 FROM ASSIGNED a WHERE a.Case_ID = c.Case_ID AND a.User_ID = :investigatorUserId))`
      : '';

    const custodyFilter = isInvestigator
      ? `WHERE e.Case_ID IN (SELECT c.Case_ID FROM CASE_TABLE c WHERE c.Created_By = :investigatorUserId OR c.Assigned_To = :investigatorUserId OR EXISTS (SELECT 1 FROM ASSIGNED a WHERE a.Case_ID = c.Case_ID AND a.User_ID = :investigatorUserId))`
      : '';

    // 1. Cases count
    const casesResult = await query(`
      SELECT 
        COUNT(*) AS Total_Cases,
        COUNT(CASE WHEN c.Status IN ('Open', 'Under Investigation') THEN 1 END) AS Active_Cases,
        COUNT(CASE WHEN c.Status = 'Closed' THEN 1 END) AS Closed_Cases,
        COUNT(CASE WHEN c.Status = 'Archived' THEN 1 END) AS Archived_Cases
      FROM CASE_TABLE c
      ${caseFilter}
    `, binds);

    // 2. Evidence counts
    const evidenceResult = await query(`
      SELECT 
        COUNT(*) AS Total_Evidence,
        COUNT(CASE WHEN e.Status = 'Under Analysis' THEN 1 END) AS Under_Analysis,
        COUNT(CASE WHEN e.Status = 'In Storage' THEN 1 END) AS In_Storage,
        COUNT(CASE WHEN e.Status = 'Presented in Court' THEN 1 END) AS In_Court,
        COUNT(CASE WHEN e.Status = 'Collected' THEN 1 END) AS Collected,
        COUNT(CASE WHEN e.Status = 'Archived' THEN 1 END) AS Archived
      FROM EVIDENCE e
      ${evidenceFilter}
    `, binds);

    // 3. Custody total
    const custodyResult = await query(`
      SELECT COUNT(*) AS Total_Logs
      FROM CHAIN_OF_CUSTODY coc
      JOIN EVIDENCE e ON coc.Evidence_ID = e.Evidence_ID
      ${custodyFilter}
    `, binds);

    // 4. Status Breakdown for Charts
    const breakdownResult = await query(`
      SELECT e.Status AS Name, COUNT(*) AS Value
      FROM EVIDENCE e
      ${evidenceFilter}
      GROUP BY e.Status
      ORDER BY Value DESC
    `, binds);

    // 5. Evidence per Case (Top 8 for bar chart)
    const perCaseResult = await query(`
      SELECT c.Case_ID, c.Title, COUNT(e.Evidence_ID) AS Evidence_Count
      FROM CASE_TABLE c
      LEFT JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
      ${caseFilter}
      GROUP BY c.Case_ID, c.Title
      ORDER BY Evidence_Count DESC, c.Case_ID ASC
      FETCH FIRST 8 ROWS ONLY
    `, binds);

    // 6. Evidence Type Distribution (Device vs File vs General)
    const typeDistResult = await query(`
      SELECT 
        CASE 
          WHEN d.Device_ID IS NOT NULL THEN 'Physical Device'
          WHEN f.File_ID IS NOT NULL THEN 'Digital Bitstream'
          ELSE 'General Evidence'
        END AS Name,
        COUNT(*) AS Value
      FROM EVIDENCE e
      LEFT JOIN DEVICE d ON e.Evidence_ID = d.Evidence_ID
      LEFT JOIN FILE_RECORD f ON e.Evidence_ID = f.Evidence_ID
      ${evidenceFilter}
      GROUP BY 
        CASE 
          WHEN d.Device_ID IS NOT NULL THEN 'Physical Device'
          WHEN f.File_ID IS NOT NULL THEN 'Digital Bitstream'
          ELSE 'General Evidence'
        END
      ORDER BY Value DESC
    `, binds);

    // 7. Hash Integrity Metrics
    const integrityResult = await query(`
      SELECT 
        COUNT(e.Hash_Value) AS Hashed_Count,
        COUNT(*) AS Total_Items
      FROM EVIDENCE e
      ${evidenceFilter}
    `, binds);

    // 8. Stale Evidence Count (fn_days_in_current_status > 30)
    const staleResult = await query(`
      SELECT COUNT(*) AS Stale_Count
      FROM EVIDENCE e
      ${evidenceFilter ? evidenceFilter + ' AND' : 'WHERE'} 
        e.Status NOT IN ('Archived', 'Disposed', 'Presented in Court')
        AND fn_days_in_current_status(e.Evidence_ID) > 30
    `, binds);

    // 9. Recent Custody Activity (Top 5)
    const recentCustodyResult = await query(`
      SELECT 
        coc.Custody_ID AS ID,
        TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp,
        coc.Action,
        coc.Evidence_ID AS Evidence_ID,
        e.Description AS Evidence_Desc,
        c.Title AS Case_Title,
        NVL(u.First_Name || ' ' || u.Last_Name, 'System Custodian') AS Actor
      FROM CHAIN_OF_CUSTODY coc
      JOIN EVIDENCE e ON coc.Evidence_ID = e.Evidence_ID
      JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
      LEFT JOIN APP_USER u ON coc.User_ID = u.User_ID
      ${custodyFilter}
      ORDER BY coc.Custody_ID DESC
      FETCH FIRST 5 ROWS ONLY
    `, binds);

    return apiResponse.success(res, {
      role: user?.role || 'Guest',
      isIsolated: Boolean(isInvestigator),
      cases: casesResult.rows?.[0] || { TOTAL_CASES: 0, ACTIVE_CASES: 0, CLOSED_CASES: 0 },
      evidence: evidenceResult.rows?.[0] || { TOTAL_EVIDENCE: 0, UNDER_ANALYSIS: 0, IN_STORAGE: 0, IN_COURT: 0 },
      custody: custodyResult.rows?.[0] || { TOTAL_LOGS: 0 },
      statusBreakdown: breakdownResult.rows || [],
      evidenceDistribution: perCaseResult.rows || [],
      typeDistribution: typeDistResult.rows || [],
      integrity: integrityResult.rows?.[0] || { HASHED_COUNT: 0, TOTAL_ITEMS: 0 },
      staleEvidence: staleResult.rows?.[0] || { STALE_COUNT: 0 },
      recentCustody: recentCustodyResult.rows || [],
    });
  } catch (error) {
    next(error);
  }
}
