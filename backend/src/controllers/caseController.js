import oracledb from 'oracledb';
import { query } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';

export async function getCases(req, res, next) {
  try {
    const { status, search } = req.query;

    let sql = `
      SELECT 
        c.Case_ID,
        c.Title,
        c.Status,
        c.Crime_Type,
        TO_CHAR(c.Date_Opened, 'YYYY-MM-DD') AS Date_Opened,
        u_lead.First_Name || ' ' || u_lead.Last_Name AS Assigned_Investigator,
        i.Badge_Number,
        l.Address AS Location_Address,
        (SELECT COUNT(*) FROM EVIDENCE e WHERE e.Case_ID = c.Case_ID) AS Evidence_Count
      FROM CASE_TABLE c
      LEFT JOIN INVESTIGATOR i ON c.Assigned_To = i.User_ID
      LEFT JOIN APP_USER u_lead ON i.User_ID = u_lead.User_ID
      LEFT JOIN LOCATION l ON c.Location_ID = l.Location_ID
      WHERE 1=1
    `;

    const binds = {};

    if (status && status !== 'ALL') {
      sql += ` AND c.Status = :status`;
      binds.status = status;
    }

    if (search && search.trim()) {
      sql += ` AND (UPPER(c.Title) LIKE :search OR UPPER(c.Crime_Type) LIKE :search)`;
      binds.search = `%${search.trim().toUpperCase()}%`;
    }

    sql += ` ORDER BY c.Case_ID DESC`;

    const result = await query(sql, binds);
    return apiResponse.success(res, result.rows || [], { count: result.rows?.length || 0 });
  } catch (error) {
    next(error);
  }
}

export async function getCaseById(req, res, next) {
  try {
    const caseId = req.params.id;

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
      return apiResponse.error(res, `Case with ID ${caseId} not found.`, 'NOT_FOUND', null, 404);
    }

    const caseData = caseResult.rows[0];

    // Fetch associated evidence items
    const evidenceSql = `
      SELECT 
        e.Evidence_ID,
        e.Description,
        e.Status,
        e.Hash_Value,
        TO_CHAR(e.Collection_Date, 'YYYY-MM-DD') AS Collection_Date,
        d.Serial_Number,
        f.File_Name
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

export async function createCase(req, res, next) {
  try {
    const { title, crimeType, assignedTo, locationId, createdBy } = req.body;

    const sql = `
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

    const binds = {
      title,
      crimeType: crimeType || 'General Digital Crime',
      createdBy: createdBy || 9, // default to admin if unspecified
      assignedTo: assignedTo || 1,
      locationId: locationId || 1,
      outCaseId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    };

    const result = await query(sql, binds);
    const generatedId = result.outBinds?.outCaseId?.[0];

    return apiResponse.success(
      res,
      {
        caseId: generatedId,
        title,
        status: 'Open',
        message: 'Case successfully registered in Oracle CASE_TABLE.',
      },
      {},
      201
    );
  } catch (error) {
    next(error);
  }
}

export async function updateCaseStatus(req, res, next) {
  try {
    const caseId = req.params.id;
    const { status } = req.body;

    const sql = `
      UPDATE CASE_TABLE
      SET Status = :status
      WHERE Case_ID = :caseId
    `;

    const result = await query(sql, { status, caseId });
    if (result.rowsAffected === 0) {
      return apiResponse.error(res, `Case with ID ${caseId} not found.`, 'NOT_FOUND', null, 404);
    }

    return apiResponse.success(res, { caseId, status, updated: true });
  } catch (error) {
    next(error);
  }
}
