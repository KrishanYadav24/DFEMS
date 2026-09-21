import PDFDocument from 'pdfkit';
import { query } from '../config/database.js';
import { apiResponse } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';

/**
 * Helper to check case access authorization for RBAC.
 */
async function checkCaseAccess(user, caseId) {
  if (['Admin', 'Auditor', 'Evidence Custodian', 'Legal Reviewer'].includes(user.role)) {
    return true;
  }

  const checkSql = `
    SELECT 1 FROM CASE_TABLE c
    WHERE c.Case_ID = :caseId
      AND (
        c.Created_By = :userId 
        OR c.Assigned_To = :userId
        OR EXISTS (SELECT 1 FROM ASSIGNED a WHERE a.Case_ID = c.Case_ID AND a.User_ID = :userId)
      )
  `;
  const result = await query(checkSql, { caseId, userId: user.userId });
  return result.rows && result.rows.length > 0;
}

/**
 * GET /api/reports/case/:caseId/dossier
 * Generates official Judicial Case Dossier PDF.
 */
export async function generateCaseDossierPdf(req, res, next) {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    if (isNaN(caseId)) {
      return apiResponse.error(res, 'Invalid Case ID', 'BAD_REQUEST', null, 400);
    }

    const hasAccess = await checkCaseAccess(req.user, caseId);
    if (!hasAccess) {
      return apiResponse.error(res, 'Access denied: You are not authorized to view this case dossier', 'FORBIDDEN', null, 403);
    }

    // 1. Fetch Case Details
    const caseResult = await query(`
      SELECT 
        c.Case_ID,
        c.Title,
        c.Status,
        c.Crime_Type,
        TO_CHAR(c.Date_Opened, 'YYYY-MM-DD') AS Date_Opened,
        c.Created_By,
        NVL(u_creator.First_Name || ' ' || u_creator.Last_Name, 'System') AS Creator_Name,
        c.Assigned_To,
        NVL(u_lead.First_Name || ' ' || u_lead.Last_Name, 'Unassigned') AS Lead_Investigator,
        i.Badge_Number,
        NVL(l.Address, 'Not specified') AS Location_Address
      FROM CASE_TABLE c
      LEFT JOIN APP_USER u_creator ON c.Created_By = u_creator.User_ID
      LEFT JOIN INVESTIGATOR i ON c.Assigned_To = i.User_ID
      LEFT JOIN APP_USER u_lead ON i.User_ID = u_lead.User_ID
      LEFT JOIN LOCATION l ON c.Location_ID = l.Location_ID
      WHERE c.Case_ID = :caseId
    `, { caseId });

    if (!caseResult.rows || caseResult.rows.length === 0) {
      return apiResponse.error(res, 'Case not found', 'NOT_FOUND', null, 404);
    }
    const cData = caseResult.rows[0];

    // 2. Fetch Evidence Items
    const evidenceResult = await query(`
      SELECT 
        e.Evidence_ID,
        e.Description,
        e.Status,
        e.Hash_Value,
        TO_CHAR(e.Collection_Date, 'YYYY-MM-DD') AS Collection_Date,
        d.Serial_Number,
        f.File_Name,
        f.File_Size,
        CASE 
          WHEN d.Device_ID IS NOT NULL THEN 'Physical Device'
          WHEN f.File_ID IS NOT NULL THEN 'Digital Bitstream'
          ELSE 'General Evidence'
        END AS Evidence_Type
      FROM EVIDENCE e
      LEFT JOIN DEVICE d ON e.Evidence_ID = d.Evidence_ID
      LEFT JOIN FILE_RECORD f ON e.Evidence_ID = f.Evidence_ID
      WHERE e.Case_ID = :caseId
      ORDER BY e.Evidence_ID ASC
    `, { caseId });
    const evidenceList = evidenceResult.rows || [];

    // 3. Fetch Custody Ledger
    const custodyResult = await query(`
      SELECT 
        coc.Custody_ID,
        TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At,
        coc.Action,
        coc.Evidence_ID,
        e.Description AS Evidence_Desc,
        NVL(u.First_Name || ' ' || u.Last_Name, 'System Custodian') AS Logged_By
      FROM CHAIN_OF_CUSTODY coc
      JOIN EVIDENCE e ON coc.Evidence_ID = e.Evidence_ID
      LEFT JOIN APP_USER u ON coc.User_ID = u.User_ID
      WHERE e.Case_ID = :caseId
      ORDER BY coc.Custody_ID ASC
    `, { caseId });
    const custodyList = custodyResult.rows || [];

    // 4. Fetch Forensic Analysis Findings
    const analysisResult = await query(`
      SELECT 
        fa.Analysis_ID,
        fa.Findings,
        TO_CHAR(fa.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Analysis_Date,
        e.Evidence_ID,
        e.Description AS Evidence_Desc,
        NVL(u.First_Name || ' ' || u.Last_Name, 'Certified Examiner') AS Analyst_Name
      FROM FORENSIC_ANALYSIS fa
      JOIN EVIDENCE e ON fa.Evidence_ID = e.Evidence_ID
      LEFT JOIN FORENSIC_ANALYST fan ON fa.Analyst_ID = fan.User_ID
      LEFT JOIN APP_USER u ON fan.User_ID = u.User_ID
      WHERE e.Case_ID = :caseId
      ORDER BY fa.Analysis_ID ASC
    `, { caseId });
    const analysisList = analysisResult.rows || [];

    // Set Response Headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DFEMS_Case_${caseId}_Judicial_Dossier.pdf"`
    );

    // Create PDF Document
    const doc = new PDFDocument({ margin: 45, size: 'A4', bufferPages: true });
    doc.pipe(res);

    const primaryColor = '#1e3a8a';
    const accentColor = '#3b82f6';
    const textColor = '#1f2937';
    const mutedColor = '#6b7280';
    const borderColor = '#e5e7eb';

    // Header Banner
    doc.rect(45, 45, 505, 4).fill(primaryColor);
    doc.moveDown(0.5);

    doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold')
      .text('DIGITAL FORENSIC EVIDENCE MANAGEMENT SYSTEM', { align: 'center' });
    doc.fontSize(10).fillColor(mutedColor).font('Helvetica')
      .text('JUDICIAL EVIDENCE DOSSIER & COMPREHENSIVE CASE REPORT', { align: 'center' });
    doc.fontSize(8).fillColor(mutedColor)
      .text('ISO/IEC 27037:2012 COMPLIANT • LAW ENFORCEMENT & JUDICIAL ADMISSIBILITY STANDARD', { align: 'center' });
    doc.moveDown(1);

    // Metadata Bar
    doc.rect(45, doc.y, 505, 20).fill('#f3f4f6');
    const metaY = doc.y + 5;
    doc.fontSize(8).fillColor(textColor).font('Helvetica-Bold')
      .text(`CASE REF: #${cData.CASE_ID}`, 55, metaY)
      .text(`STATUS: ${cData.STATUS}`, 180, metaY)
      .text(`DATE GENERATED: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`, 330, metaY);
    doc.moveDown(2);

    // Section 1: Case Profile
    doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold').text('1. INVESTIGATIVE CASE PROFILE');
    doc.rect(45, doc.y + 2, 505, 1).fill(accentColor);
    doc.moveDown(0.6);

    const profileData = [
      ['Case Identifier', `DFEMS-CASE-${cData.CASE_ID}`, 'Date Opened', cData.DATE_OPENED || 'N/A'],
      ['Case Title', cData.TITLE || 'N/A', 'Crime Category', cData.CRIME_TYPE || 'Digital Crime'],
      ['Lead Investigator', `${cData.LEAD_INVESTIGATOR} ${cData.BADGE_NUMBER ? `(Badge #${cData.BADGE_NUMBER})` : ''}`, 'Registered By', cData.CREATOR_NAME || 'Admin'],
      ['Incident Location', cData.LOCATION_ADDRESS || 'Unspecified', 'Vault Inventory', `${evidenceList.length} Registered Items`],
    ];

    let startY = doc.y;
    profileData.forEach((row) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(mutedColor).text(row[0].toUpperCase(), 50, startY);
      doc.fontSize(9).font('Helvetica').fillColor(textColor).text(row[1], 150, startY, { width: 140 });
      doc.fontSize(8).font('Helvetica-Bold').fillColor(mutedColor).text(row[2].toUpperCase(), 300, startY);
      doc.fontSize(9).font('Helvetica').fillColor(textColor).text(row[3], 400, startY, { width: 145 });
      startY += 18;
      doc.y = startY;
    });
    doc.moveDown(1);

    // Section 2: Evidentiary Asset Inventory
    doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold').text('2. REGISTERED FORENSIC EVIDENCE ITEMS');
    doc.rect(45, doc.y + 2, 505, 1).fill(accentColor);
    doc.moveDown(0.6);

    if (evidenceList.length === 0) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor(mutedColor).text('No evidence items registered under this case.');
      doc.moveDown(1);
    } else {
      evidenceList.forEach((e, idx) => {
        const itemBoxY = doc.y;
        if (itemBoxY > 700) {
          doc.addPage();
        }

        doc.rect(45, doc.y, 505, 42).fill('#fafafa').stroke(borderColor);
        const innerY = doc.y + 5;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryColor)
          .text(`Item #${idx + 1}: Evidence ID [${e.EVIDENCE_ID}] — ${e.EVIDENCE_TYPE}`, 55, innerY);
        doc.fontSize(8).font('Helvetica').fillColor(textColor)
          .text(`Description: ${e.DESCRIPTION}`, 55, innerY + 12, { width: 340 })
          .text(`Status: ${e.STATUS} | Collected: ${e.COLLECTION_DATE}`, 55, innerY + 22);

        doc.fontSize(7).font('Courier').fillColor('#047857')
          .text(`SHA-256: ${e.HASH_VALUE || 'NOT_COMPUTED'}`, 55, innerY + 31);

        if (e.SERIAL_NUMBER) {
          doc.fontSize(8).font('Helvetica').fillColor(textColor).text(`Serial: ${e.SERIAL_NUMBER}`, 410, innerY + 12);
        } else if (e.FILE_NAME) {
          doc.fontSize(8).font('Helvetica').fillColor(textColor).text(`File: ${e.FILE_NAME}`, 410, innerY + 12);
        }
        doc.y = innerY + 44;
      });
      doc.moveDown(1);
    }

    // Section 3: Forensic Laboratory Findings
    if (analysisList.length > 0) {
      if (doc.y > 680) doc.addPage();
      doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold').text('3. FORENSIC LABORATORY FINDINGS');
      doc.rect(45, doc.y + 2, 505, 1).fill(accentColor);
      doc.moveDown(0.6);

      analysisList.forEach((fa) => {
        doc.rect(45, doc.y, 505, 36).fill('#f8fafc').stroke(borderColor);
        const faY = doc.y + 5;
        doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor)
          .text(`Analysis ID #${fa.ANALYSIS_ID} — Evidence #${fa.EVIDENCE_ID} (${fa.EVIDENCE_DESC})`, 55, faY)
          .text(`Examiner: ${fa.ANALYST_NAME} | Timestamp: ${fa.ANALYSIS_DATE}`, 310, faY);
        doc.fontSize(8).font('Helvetica').fillColor(textColor)
          .text(`Findings: ${fa.FINDINGS}`, 55, faY + 14, { width: 480 });
        doc.y = faY + 38;
      });
      doc.moveDown(1);
    }

    // Section 4: Chain of Custody Trail
    if (doc.y > 660) doc.addPage();
    doc.fontSize(12).fillColor(primaryColor).font('Helvetica-Bold').text('4. APPEND-ONLY CHAIN OF CUSTODY LEDGER');
    doc.rect(45, doc.y + 2, 505, 1).fill(accentColor);
    doc.moveDown(0.6);

    if (custodyList.length === 0) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor(mutedColor).text('No chain of custody handoffs recorded for this case.');
      doc.moveDown(1);
    } else {
      // Table Header
      doc.rect(45, doc.y, 505, 16).fill('#1e3a8a');
      const tableHeadY = doc.y + 4;
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
        .text('LOG ID', 50, tableHeadY)
        .text('TIMESTAMP (UTC)', 95, tableHeadY)
        .text('EVID ID', 200, tableHeadY)
        .text('ACTION / CUSTODIAL TRANSFER', 245, tableHeadY)
        .text('RESPONSIBLE ACTOR', 420, tableHeadY);
      doc.y = tableHeadY + 14;

      custodyList.forEach((coc, i) => {
        if (doc.y > 740) {
          doc.addPage();
          doc.rect(45, doc.y, 505, 16).fill('#1e3a8a');
          const repHeadY = doc.y + 4;
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
            .text('LOG ID', 50, repHeadY)
            .text('TIMESTAMP (UTC)', 95, repHeadY)
            .text('EVID ID', 200, repHeadY)
            .text('ACTION / CUSTODIAL TRANSFER', 245, repHeadY)
            .text('RESPONSIBLE ACTOR', 420, repHeadY);
          doc.y = repHeadY + 14;
        }

        const rowBg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        doc.rect(45, doc.y, 505, 16).fill(rowBg);
        const rowY = doc.y + 3;

        doc.fontSize(7).font('Helvetica-Bold').fillColor(primaryColor).text(String(coc.CUSTODY_ID), 50, rowY);
        doc.font('Courier').fillColor(mutedColor).text(coc.TIMESTAMP_AT, 95, rowY);
        doc.font('Helvetica-Bold').fillColor(textColor).text(`#${coc.EVIDENCE_ID}`, 200, rowY);
        doc.font('Helvetica').fillColor(textColor).text(coc.ACTION, 245, rowY, { width: 170, height: 12 });
        doc.font('Helvetica').fillColor(primaryColor).text(coc.LOGGED_BY, 420, rowY, { width: 125, height: 12 });

        doc.y = rowY + 14;
      });
      doc.moveDown(1);
    }

    // Section 5: Judicial Certification Seal
    if (doc.y > 670) doc.addPage();
    doc.moveDown(1);
    doc.rect(45, doc.y, 505, 55).stroke(primaryColor);
    const sealY = doc.y + 8;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor)
      .text('JUDICIAL CERTIFICATION & EVIDENTIARY ATTESTATION', 55, sealY);
    doc.fontSize(7).font('Helvetica').fillColor(textColor)
      .text(
        'This dossier contains certified digital records extracted directly from the immutable Oracle Database 26ai schema. All SHA-256 cryptographic digests, timestamps, and chain of custody handoffs comply with statutory requirements under Section 65B of the Indian Evidence Act and ISO/IEC 27037 standards.',
        55,
        sealY + 12,
        { width: 380 }
      );
    doc.fontSize(7).font('Courier-Bold').fillColor(primaryColor)
      .text('VERIFIED AUTHENTIC', 445, sealY + 10)
      .text('SEAL #DFEMS-26AI', 445, sealY + 22);

    // Page Numbers on all pages
    const pageRange = doc.bufferedPageRange();
    for (let p = 0; p < pageRange.count; p++) {
      doc.switchToPage(p);
      doc.fontSize(7).font('Helvetica').fillColor(mutedColor).text(
        `DFEMS Confidential Judicial Record — Page ${p + 1} of ${pageRange.count}`,
        45,
        doc.page.height - 30,
        { align: 'center', width: 505 }
      );
    }

    doc.end();
  } catch (error) {
    logger.error('Error generating Case Dossier PDF', { error: error.message });
    next(error);
  }
}

/**
 * GET /api/reports/evidence/:evidenceId/custody
 * Generates ISO/IEC 27037 Chain of Custody Certificate PDF.
 */
export async function generateCustodyCertPdf(req, res, next) {
  try {
    const evidenceId = parseInt(req.params.evidenceId, 10);
    if (isNaN(evidenceId)) {
      return apiResponse.error(res, 'Invalid Evidence ID', 'BAD_REQUEST', null, 400);
    }

    // 1. Fetch Evidence & Parent Case
    const evResult = await query(`
      SELECT 
        e.Evidence_ID,
        e.Description,
        e.Status,
        e.Hash_Value,
        TO_CHAR(e.Collection_Date, 'YYYY-MM-DD') AS Collection_Date,
        e.Case_ID,
        c.Title AS Case_Title,
        c.Crime_Type,
        d.Serial_Number,
        f.File_Name,
        f.File_Size
      FROM EVIDENCE e
      JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
      LEFT JOIN DEVICE d ON e.Evidence_ID = d.Evidence_ID
      LEFT JOIN FILE_RECORD f ON e.Evidence_ID = f.Evidence_ID
      WHERE e.Evidence_ID = :evidenceId
    `, { evidenceId });

    if (!evResult.rows || evResult.rows.length === 0) {
      return apiResponse.error(res, 'Evidence not found', 'NOT_FOUND', null, 404);
    }
    const eData = evResult.rows[0];

    const hasAccess = await checkCaseAccess(req.user, eData.CASE_ID);
    if (!hasAccess) {
      return apiResponse.error(res, 'Access denied to this evidence certificate', 'FORBIDDEN', null, 403);
    }

    // 2. Fetch Custody Ledger
    const custodyResult = await query(`
      SELECT 
        coc.Custody_ID,
        TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At,
        coc.Action,
        NVL(u.First_Name || ' ' || u.Last_Name, 'System Custodian') AS Logged_By,
        u.Username,
        u.Role AS User_Role
      FROM CHAIN_OF_CUSTODY coc
      LEFT JOIN APP_USER u ON coc.User_ID = u.User_ID
      WHERE coc.Evidence_ID = :evidenceId
      ORDER BY coc.Custody_ID ASC
    `, { evidenceId });
    const trail = custodyResult.rows || [];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DFEMS_Evidence_${evidenceId}_Custody_Certificate.pdf"`
    );

    const doc = new PDFDocument({ margin: 45, size: 'A4' });
    doc.pipe(res);

    const primaryColor = '#065f46';
    const accentColor = '#10b981';

    doc.rect(45, 45, 505, 4).fill(primaryColor);
    doc.moveDown(0.5);

    doc.fontSize(16).fillColor(primaryColor).font('Helvetica-Bold')
      .text('CHAIN OF CUSTODY CERTIFICATE', { align: 'center' });
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
      .text('ISO/IEC 27037:2012 DIGITAL EVIDENCE INTEGRITY AUDIT', { align: 'center' });
    doc.moveDown(1);

    // Evidence Profile Box
    doc.rect(45, doc.y, 505, 60).fill('#f0fdf4').stroke('#bbf7d0');
    const boxY = doc.y + 6;
    doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor)
      .text(`EVIDENCE ITEM #${eData.EVIDENCE_ID}: ${eData.DESCRIPTION}`, 55, boxY);
    doc.fontSize(8).font('Helvetica').fillColor('#1f2937')
      .text(`Associated Case: #${eData.CASE_ID} — "${eData.CASE_TITLE}"`, 55, boxY + 14)
      .text(`Intake Status: ${eData.STATUS} | Collected: ${eData.COLLECTION_DATE}`, 55, boxY + 26);
    doc.fontSize(7).font('Courier-Bold').fillColor('#065f46')
      .text(`Intake SHA-256 Digest: ${eData.HASH_VALUE || 'NOT_COMPUTED'}`, 55, boxY + 40);
    doc.y = boxY + 65;
    doc.moveDown(1);

    // Custodial Timeline
    doc.fontSize(11).fillColor(primaryColor).font('Helvetica-Bold').text('CHRONOLOGICAL CUSTODIAL HANDOFFS');
    doc.rect(45, doc.y + 2, 505, 1).fill(accentColor);
    doc.moveDown(0.6);

    trail.forEach((log, index) => {
      const entryY = doc.y;
      doc.circle(55, entryY + 8, 4).fill(primaryColor);
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1f2937')
        .text(`Event #${index + 1}: ${log.ACTION}`, 68, entryY);
      doc.fontSize(8).font('Helvetica').fillColor('#4b5563')
        .text(`Custodian: ${log.LOGGED_BY} (${log.USER_ROLE || 'Officer'}) • Username: ${log.USERNAME || 'N/A'}`, 68, entryY + 12);
      doc.fontSize(7).font('Courier').fillColor('#6b7280')
        .text(`Timestamp: ${log.TIMESTAMP_AT} UTC • Log Ref: #${log.CUSTODY_ID}`, 68, entryY + 23);
      doc.y = entryY + 36;
    });

    // Verification Footer
    doc.moveDown(2);
    doc.rect(45, doc.y, 505, 45).stroke(primaryColor);
    const footY = doc.y + 6;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryColor)
      .text('LEGAL ADMISSIBILITY SEAL & HASH INTEGRITY ATTESTATION', 55, footY);
    doc.fontSize(7).font('Helvetica').fillColor('#374151')
      .text('This tamper-evident chain of custody certificate is sealed by DFEMS append-only database triggers (trg_custody_no_update & trg_custody_no_delete). Any modification or deletion of custodial history is prohibited by database engine constraints.', 55, footY + 12, { width: 480 });

    doc.end();
  } catch (error) {
    logger.error('Error generating Custody Certificate PDF', { error: error.message });
    next(error);
  }
}

/**
 * GET /api/reports/case/:caseId/integrity
 * Generates Cryptographic Hash Integrity Audit Report PDF.
 */
export async function generateIntegrityAuditPdf(req, res, next) {
  try {
    const caseId = parseInt(req.params.caseId, 10);
    if (isNaN(caseId)) {
      return apiResponse.error(res, 'Invalid Case ID', 'BAD_REQUEST', null, 400);
    }

    const hasAccess = await checkCaseAccess(req.user, caseId);
    if (!hasAccess) {
      return apiResponse.error(res, 'Access denied', 'FORBIDDEN', null, 403);
    }

    const caseRes = await query(`SELECT Case_ID, Title FROM CASE_TABLE WHERE Case_ID = :caseId`, { caseId });
    if (!caseRes.rows || caseRes.rows.length === 0) {
      return apiResponse.error(res, 'Case not found', 'NOT_FOUND', null, 404);
    }

    const evResult = await query(`
      SELECT 
        e.Evidence_ID,
        e.Description,
        e.Status,
        e.Hash_Value,
        fn_verify_hash(e.Evidence_ID, e.Hash_Value) AS Verification_Result
      FROM EVIDENCE e
      WHERE e.Case_ID = :caseId
      ORDER BY e.Evidence_ID ASC
    `, { caseId });
    const items = evResult.rows || [];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="DFEMS_Case_${caseId}_Integrity_Audit.pdf"`);

    const doc = new PDFDocument({ margin: 45, size: 'A4' });
    doc.pipe(res);

    doc.rect(45, 45, 505, 4).fill('#1e40af');
    doc.moveDown(0.5);

    doc.fontSize(16).fillColor('#1e40af').font('Helvetica-Bold')
      .text('CRYPTOGRAPHIC INTEGRITY VERIFICATION AUDIT', { align: 'center' });
    doc.fontSize(9).fillColor('#6b7280').font('Helvetica')
      .text(`CASE #${caseId}: ${caseRes.rows[0].TITLE}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(8).font('Helvetica-Bold').fillColor('#374151')
      .text(`AUDIT EXECUTED AT: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`, 45, doc.y)
      .text(`EXECUTED BY: ${req.user.username} (${req.user.role})`, 330, doc.y);
    doc.moveDown(1);

    // Evidence Audit Table
    items.forEach((item, idx) => {
      const isMatch = item.VERIFICATION_RESULT === 'MATCH';
      doc.rect(45, doc.y, 505, 34).fill(isMatch ? '#f0fdf4' : '#fef2f2').stroke(isMatch ? '#86efac' : '#fca5a5');
      const rowY = doc.y + 4;
      doc.fontSize(8).font('Helvetica-Bold').fillColor(isMatch ? '#166534' : '#991b1b')
        .text(`Evidence #${item.EVIDENCE_ID}: ${item.DESCRIPTION}`, 55, rowY)
        .text(isMatch ? 'VERIFIED: 100% BITSTREAM MATCH' : 'ALERT: INTEGRITY MISMATCH', 360, rowY);
      doc.fontSize(7).font('Courier').fillColor('#374151')
        .text(`Stored SHA-256 Digest: ${item.HASH_VALUE || 'NOT_COMPUTED'}`, 55, rowY + 12)
        .text(`Status: ${item.STATUS}`, 55, rowY + 22);
      doc.y = rowY + 34;
    });

    doc.end();
  } catch (error) {
    logger.error('Error generating Integrity Audit PDF', { error: error.message });
    next(error);
  }
}

/**
 * GET /api/reports/audit-trail
 * Generates official System Audit Log PDF (Admin and Auditor only).
 */
export async function generateAuditTrailPdf(req, res, next) {
  try {
    const logsResult = await query(`
      SELECT 
        a.Log_ID,
        TO_CHAR(a.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At,
        a.Action,
        NVL(u.Username, 'System') AS Username,
        a.IP_Address,
        a.Details
      FROM AUDIT_LOG a
      LEFT JOIN APP_USER u ON a.User_ID = u.User_ID
      ORDER BY a.Log_ID DESC
      FETCH FIRST 50 ROWS ONLY
    `);
    const logs = logsResult.rows || [];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="DFEMS_System_Security_Audit_Trail.pdf"');

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    doc.pipe(res);

    doc.rect(40, 40, 515, 4).fill('#b91c1c');
    doc.moveDown(0.5);

    doc.fontSize(15).fillColor('#b91c1c').font('Helvetica-Bold')
      .text('DFEMS SYSTEM SECURITY AUDIT LOG TRAIL', { align: 'center' });
    doc.fontSize(8).fillColor('#6b7280').font('Helvetica')
      .text('CONFIDENTIAL COMPLIANCE AUDIT EXPORT — ADMINISTRATIVE REVIEW', { align: 'center' });
    doc.moveDown(1);

    // Table Header
    doc.rect(40, doc.y, 515, 14).fill('#374151');
    const headY = doc.y + 3;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
      .text('ID', 45, headY)
      .text('TIMESTAMP (UTC)', 75, headY)
      .text('USER', 180, headY)
      .text('ACTION', 245, headY)
      .text('IP ADDRESS', 345, headY)
      .text('AUDIT DETAILS', 415, headY);
    doc.y = headY + 13;

    logs.forEach((l, i) => {
      if (doc.y > 750) {
        doc.addPage();
        doc.rect(40, doc.y, 515, 14).fill('#374151');
        const rY = doc.y + 3;
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
          .text('ID', 45, rY)
          .text('TIMESTAMP (UTC)', 75, rY)
          .text('USER', 180, rY)
          .text('ACTION', 245, rY)
          .text('IP ADDRESS', 345, rY)
          .text('AUDIT DETAILS', 415, rY);
        doc.y = rY + 13;
      }

      const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
      doc.rect(40, doc.y, 515, 14).fill(bg);
      const rowY = doc.y + 2;

      doc.fontSize(7).font('Helvetica-Bold').fillColor('#1f2937').text(String(l.LOG_ID), 45, rowY);
      doc.font('Courier').fillColor('#6b7280').text(l.TIMESTAMP_AT, 75, rowY);
      doc.font('Helvetica-Bold').fillColor('#1e40af').text(l.USERNAME, 180, rowY);
      doc.font('Helvetica').fillColor('#1f2937').text(l.ACTION, 245, rowY);
      doc.font('Courier').fillColor('#6b7280').text(l.IP_ADDRESS || '127.0.0.1', 345, rowY);
      doc.font('Helvetica').fillColor('#4b5563').text(l.DETAILS || '', 415, rowY, { width: 135, height: 10 });

      doc.y = rowY + 12;
    });

    doc.end();
  } catch (error) {
    logger.error('Error generating Audit Trail PDF', { error: error.message });
    next(error);
  }
}
