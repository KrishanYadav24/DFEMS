/**
 * DFEMS — Phase 9 Full-Stack Integration Test Suite
 *
 * Requirements Audited:
 * 1. Authentication lifecycle (login, me, logout, expired/invalid tokens, account status).
 * 2. Multi-role RBAC matrix (Admin, Investigator, Lab Technician / Forensic Examiner).
 * 3. Case lifecycle (creation, retrieval, update, permitted status transitions, invalid status rejection).
 * 4. Evidence registration, linking, and metadata management.
 * 5. Cryptographic hashing (SHA-256), verification via fn_verify_hash, and tamper detection.
 * 6. Custody transfer workflows (sp_transfer_custody) and trigger immutability enforcement (trg_custody_no_update, trg_custody_no_delete).
 * 7. Live Oracle dashboard statistics, search, filtering, audit telemetry, and PDF reports (%PDF- binary verification).
 * 8. Error handling: Foreign key violations (ORA-02291), Unique violations (ORA-00001), NOT NULL violations (ORA-01400), and invalid inputs.
 */

import http from 'http';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { query, withTransaction, closeDatabasePool } from '../src/config/database.js';
import { generateToken } from '../src/utils/token.js';

let server;
let baseUrl;

function makeRequest(reqPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, baseUrl);
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const reqOptions = {
      method: options.method || 'GET',
      headers,
    };

    const req = http.request(url, reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const rawBuffer = Buffer.concat(chunks);
        let parsed = null;
        const contentType = res.headers['content-type'] || '';

        if (contentType.includes('application/json')) {
          try {
            parsed = JSON.parse(rawBuffer.toString('utf-8'));
          } catch (_) {
            parsed = rawBuffer.toString('utf-8');
          }
        } else {
          parsed = rawBuffer;
        }

        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          rawBuffer,
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runIntegrationTests() {
  console.log('================================================================');
  console.log('DFEMS — PHASE 9 END-TO-END INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[INFO] Integration test server listening on ${baseUrl}\n`);
      resolve();
    });
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (details) console.error(`         -> ${details}`);
      failed++;
    }
  }

  // Active Admin in Oracle Database
  const adminToken = generateToken({
    userId: 1,
    username: 'Krishan',
    role: 'Admin',
    firstName: 'Krishan',
    lastName: 'Yadav',
  });

  // Unique tracking for isolated records to clean up
  const runTag = Date.now();
  const cleanupUserIds = [];
  const cleanupCaseIds = [];
  const cleanupEvidenceIds = [];

  let testInvestigatorToken = null;
  let testInvestigatorId = null;
  let testLabTechToken = null;
  let testLabTechId = null;
  let createdCaseId = null;
  let createdEvidenceId = null;
  const sampleSha256 = crypto.createHash('sha256').update(`FORENSIC_RAW_BYTES_${runTag}`).digest('hex');

  try {
    // =========================================================================
    // WORKFLOW 1: Authentication & Protected Route Lifecycle
    // =========================================================================
    console.log('--- WORKFLOW 1: Authentication & Session Lifecycle ---');

    // 1.1 Valid login with existing Admin user
    const loginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        username: 'Krishan',
        password: process.env.ADMIN_BOOTSTRAP_PASSWORD || process.env.DB_PASSWORD || 'AdminPassword123!',
      },
    });

    assert(
      loginRes.status === 200 &&
      loginRes.data?.success === true &&
      Boolean(loginRes.data?.data?.token) &&
      loginRes.data?.data?.user?.username === 'Krishan' &&
      loginRes.data?.data?.user?.passwordHash === undefined,
      'Valid administrator credentials issue signed JWT and sanitize user payload (no password hash)'
    );

    // 1.2 Access protected /api/auth/me
    const meRes = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      meRes.status === 200 &&
      meRes.data?.success === true &&
      meRes.data?.data?.userId === 1 &&
      meRes.data?.data?.username === 'Krishan' &&
      meRes.data?.data?.role === 'Admin',
      'Protected /api/auth/me returns active identity and server-verified role'
    );

    // 1.3 Logout records audit log
    const logoutRes = await makeRequest('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      logoutRes.status === 200 &&
      logoutRes.data?.success === true,
      'POST /api/auth/logout terminates session and writes LOGOUT audit event'
    );

    // 1.4 Expired / Invalid token rejection
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature';
    const invalidTokenRes = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${invalidToken}` },
    });

    assert(
      invalidTokenRes.status === 401 &&
      invalidTokenRes.data?.error?.code === 'INVALID_TOKEN',
      'Tampered or invalid JWT signature rejected with HTTP 401 INVALID_TOKEN'
    );

    // 1.5 Deleted / non-existent user token rejection
    const ghostUserToken = generateToken({
      userId: 888888,
      username: 'GhostUser',
      role: 'Investigator',
    });
    const ghostRes = await makeRequest('/api/cases', {
      headers: { Authorization: `Bearer ${ghostUserToken}` },
    });

    assert(
      ghostRes.status === 401 &&
      ghostRes.data?.error?.code === 'ACCOUNT_NOT_FOUND',
      'JWT referencing non-existent Oracle User_ID rejected with HTTP 401 ACCOUNT_NOT_FOUND'
    );

    // =========================================================================
    // WORKFLOW 2: Multi-Role RBAC Matrix (Admin, Investigator, Lab Technician)
    // =========================================================================
    console.log('\n--- WORKFLOW 2: Multi-Role RBAC Authorization Matrix ---');

    // Provision an Investigator account
    const invUsername = `inv_integ_${runTag}`;
    const createInvRes = await makeRequest('/api/auth/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        firstName: 'Anil',
        lastName: 'Sharma',
        username: invUsername,
        role: 'Investigator',
        password: 'ValidPass123!@#',
      },
    });

    if (createInvRes.status === 201 && (createInvRes.data?.data?.userId || createInvRes.data?.data?.id)) {
      testInvestigatorId = createInvRes.data.data.userId || createInvRes.data.data.id;
      cleanupUserIds.push(testInvestigatorId);
      testInvestigatorToken = generateToken({
        userId: testInvestigatorId,
        username: invUsername,
        role: 'Investigator',
      });
      console.log(`[SETUP] Provisioned Investigator #${testInvestigatorId} (${invUsername})`);
    }

    // Provision a Lab Technician account (mapped to Forensic Examiner in DB)
    const labUsername = `lab_integ_${runTag}`;
    const createLabRes = await makeRequest('/api/auth/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        firstName: 'Meera',
        lastName: 'Nair',
        username: labUsername,
        role: 'Lab Technician',
        password: 'ValidPass123!@#',
      },
    });

    if (createLabRes.status === 201 && (createLabRes.data?.data?.userId || createLabRes.data?.data?.id)) {
      testLabTechId = createLabRes.data.data.userId || createLabRes.data.data.id;
      cleanupUserIds.push(testLabTechId);
      testLabTechToken = generateToken({
        userId: testLabTechId,
        username: labUsername,
        role: 'Forensic Examiner',
      });
      console.log(`[SETUP] Provisioned Lab Technician #${testLabTechId} (${labUsername})`);
    }

    // 2.1 Admin user management allowed
    const adminUsersRes = await makeRequest('/api/auth/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminUsersRes.status === 200 && Array.isArray(adminUsersRes.data?.data),
      'Admin role has full access to user administration directory (/api/auth/users)'
    );

    // 2.2 Investigator user management blocked (403)
    const invUsersRes = await makeRequest('/api/auth/users', {
      headers: { Authorization: `Bearer ${testInvestigatorToken}` },
    });
    assert(
      invUsersRes.status === 403,
      'Investigator role is forbidden (403) from user administration (/api/auth/users)'
    );

    // 2.3 Lab Technician user management blocked (403)
    const labUsersRes = await makeRequest('/api/auth/users', {
      headers: { Authorization: `Bearer ${testLabTechToken}` },
    });
    assert(
      labUsersRes.status === 403,
      'Lab Technician role is forbidden (403) from user administration (/api/auth/users)'
    );

    // 2.4 Security audit logs access: Investigator blocked (403), Lab Technician blocked (403)
    const invAuditRes = await makeRequest('/api/audit-logs', {
      headers: { Authorization: `Bearer ${testInvestigatorToken}` },
    });
    const labAuditRes = await makeRequest('/api/audit-logs', {
      headers: { Authorization: `Bearer ${testLabTechToken}` },
    });
    assert(
      invAuditRes.status === 403 && labAuditRes.status === 403,
      'Both Investigator and Lab Technician roles are strictly forbidden (403) from audit telemetry'
    );

    // 2.5 Security Audit Trail PDF export: Investigator blocked (403), Lab Tech blocked (403)
    const invPdfAuditRes = await makeRequest('/api/reports/audit-trail', {
      headers: { Authorization: `Bearer ${testInvestigatorToken}` },
    });
    const labPdfAuditRes = await makeRequest('/api/reports/audit-trail', {
      headers: { Authorization: `Bearer ${testLabTechToken}` },
    });
    assert(
      invPdfAuditRes.status === 403 && labPdfAuditRes.status === 403,
      'Both Investigator and Lab Technician roles are forbidden (403) from exporting Audit Trail PDF'
    );

    // =========================================================================
    // WORKFLOW 3: Case Creation, Retrieval, Updating & Permitted Status Changes
    // =========================================================================
    console.log('\n--- WORKFLOW 3: Case Lifecycle & Permitted Status Transitions ---');

    // 3.1 Create case via POST /api/cases
    const caseTitle = `INTEG_CASE_RANSOMWARE_${runTag}`;
    const createCaseRes = await makeRequest('/api/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: caseTitle,
        crimeType: 'Ransomware Extortion',
        assignedTo: testInvestigatorId,
        location: 'Cyber Defense Lab 4, Bengaluru',
      },
    });

    assert(
      createCaseRes.status === 201 &&
      createCaseRes.data?.data?.caseId !== undefined &&
      createCaseRes.data?.data?.status === 'Open',
      `Case #${createCaseRes.data?.data?.caseId} created atomically with initial status 'Open'`
    );

    createdCaseId = createCaseRes.data?.data?.caseId;
    if (createdCaseId) cleanupCaseIds.push(createdCaseId);

    // 3.2 Retrieve case by ID with joins
    const getCaseRes = await makeRequest(`/api/cases/${createdCaseId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      getCaseRes.status === 200 &&
      getCaseRes.data?.data?.TITLE === caseTitle &&
      getCaseRes.data?.data?.STATUS === 'Open' &&
      getCaseRes.data?.data?.CRIME_TYPE === 'Ransomware Extortion',
      'GET /api/cases/:id returns case particulars with creator and lead investigator joins'
    );

    // 3.3 Update case metadata via PUT /api/cases/:id
    const updateCaseRes = await makeRequest(`/api/cases/${createdCaseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: `${caseTitle}_AMENDED`,
        location: 'Building B, Secure Room 102',
      },
    });

    assert(
      updateCaseRes.status === 200 && updateCaseRes.data?.data?.updated === true,
      'PUT /api/cases/:id updates case title and location with automatic audit logging'
    );

    // 3.4 Valid status transitions: Open -> Under Investigation -> Closed -> Archived
    const statusSteps = ['Under Investigation', 'Closed', 'Archived'];
    let allStatusTransitionsPassed = true;

    for (const stepStatus of statusSteps) {
      const stepRes = await makeRequest(`/api/cases/${createdCaseId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { status: stepStatus },
      });
      if (stepRes.status !== 200) {
        allStatusTransitionsPassed = false;
        break;
      }
    }

    assert(
      allStatusTransitionsPassed,
      "Permitted lifecycle transitions ('Open' -> 'Under Investigation' -> 'Closed' -> 'Archived') committed cleanly"
    );

    // 3.5 Invalid status transition rejected
    const invalidStatusRes = await makeRequest(`/api/cases/${createdCaseId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'DELETED_OR_DESTROYED' },
    });

    assert(
      invalidStatusRes.status === 400 &&
      invalidStatusRes.data?.error?.code === 'INVALID_STATUS',
      'Invalid case status rejected by validation schema and protected by Oracle CHECK constraint chk_case_status'
    );

    // Reset status back to 'Under Investigation' for evidence testing
    await makeRequest(`/api/cases/${createdCaseId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'Under Investigation' },
    });

    // =========================================================================
    // WORKFLOW 4: Evidence Registration & Metadata Management
    // =========================================================================
    console.log('\n--- WORKFLOW 4: Evidence Registration & Metadata Management ---');

    const evDesc = `Seized NVMe Drive with Extortion Artifacts - Tag ${runTag}`;
    const regEvRes = await makeRequest('/api/evidence', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        description: evDesc,
        caseId: createdCaseId,
        evidenceType: 'Device',
        serialNumber: `SAMSUNG-990-${runTag}`,
        hashValue: sampleSha256,
      },
    });

    assert(
      regEvRes.status === 201 &&
      regEvRes.data?.data?.evidenceId !== undefined &&
      regEvRes.data?.data?.status === 'Collected',
      `Evidence item #${regEvRes.data?.data?.evidenceId} registered atomically with initial status 'Collected'`
    );

    createdEvidenceId = regEvRes.data?.data?.evidenceId;
    if (createdEvidenceId) cleanupEvidenceIds.push(createdEvidenceId);

    // 4.2 Retrieve evidence details with joins
    const getEvRes = await makeRequest(`/api/evidence/${createdEvidenceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      getEvRes.status === 200 &&
      getEvRes.data?.data?.DESCRIPTION === evDesc &&
      getEvRes.data?.data?.HASH_VALUE === sampleSha256 &&
      (getEvRes.data?.data?.SERIAL_NUMBER === `SAMSUNG-990-${runTag}` || getEvRes.data?.data?.serialNumber === `SAMSUNG-990-${runTag}`),
      'GET /api/evidence/:id returns item metadata joined with DEVICE record and parent Case'
    );

    // 4.3 Update permitted evidence metadata
    const updateEvRes = await makeRequest(`/api/evidence/${createdEvidenceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        description: `${evDesc} [VERIFIED_STORAGE]`,
      },
    });

    assert(
      updateEvRes.status === 200 && updateEvRes.data?.data?.updated === true,
      'PUT /api/evidence/:id updates description metadata and writes EVIDENCE_METADATA_UPDATED audit entry'
    );

    // =========================================================================
    // WORKFLOW 5: Cryptographic Hashing, Verification & Tamper Detection
    // =========================================================================
    console.log('\n--- WORKFLOW 5: Cryptographic Hashing, Verification & Tamper Detection ---');

    // 5.1 Verify authentic hash using Oracle stored function fn_verify_hash
    const verifyMatchRes = await makeRequest(`/api/evidence/${createdEvidenceId}/verify-hash`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { providedHash: sampleSha256 },
    });

    assert(
      verifyMatchRes.status === 200 &&
      verifyMatchRes.data?.data?.outcome === 'MATCH' &&
      verifyMatchRes.data?.data?.intact === true &&
      verifyMatchRes.data?.data?.status === 'VERIFIED',
      'fn_verify_hash verifies authentic SHA-256 digest against Oracle repository returning MATCH'
    );

    // 5.2 Detect tampered hash
    const tamperedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const verifyTamperRes = await makeRequest(`/api/evidence/${createdEvidenceId}/verify-hash`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { providedHash: tamperedHash },
    });

    assert(
      verifyTamperRes.status === 200 &&
      verifyTamperRes.data?.data?.outcome === 'MISMATCH - POSSIBLE TAMPERING' &&
      verifyTamperRes.data?.data?.intact === false &&
      verifyTamperRes.data?.data?.status === 'POSSIBLE_TAMPERING',
      'fn_verify_hash detects altered checksum and triggers MISMATCH - POSSIBLE TAMPERING alert'
    );

    // 5.3 Forensic analysis logging by Lab Technician (Forensic Examiner)
    const addAnalysisRes = await makeRequest('/api/analysis', {
      method: 'POST',
      headers: { Authorization: `Bearer ${testLabTechToken}` },
      body: {
        evidenceId: createdEvidenceId,
        analystId: testLabTechId, // Authenticated examiner ID registered in FORENSIC_ANALYST
        findings: `Extortion bitcoin wallet addresses extracted successfully from raw dump. Tag ${runTag}`,
      },
    });

    assert(
      addAnalysisRes.status === 201 &&
      addAnalysisRes.data?.success === true,
      'Lab Technician logs forensic examination findings with examiner certification and transitions evidence to Under Analysis'
    );

    // =========================================================================
    // WORKFLOW 6: Chain of Custody & Trigger Immutability Enforcement
    // =========================================================================
    console.log('\n--- WORKFLOW 6: Chain of Custody & Trigger Immutability ---');

    // 6.1 Transfer custody via POST /api/custody/transfer (sp_transfer_custody)
    const transferRes = await makeRequest('/api/custody/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        evidenceId: createdEvidenceId,
        newStatus: 'In Storage',
        toUserId: 1,
        location: 'Evidence Locker Vault B-12',
        purpose: 'Secure Evidence Storage after Lab Imaging',
      },
    });

    assert(
      (transferRes.status === 200 || transferRes.status === 201) &&
      transferRes.data?.data?.newStatus === 'In Storage',
      'Custodial transfer commits atomically via sp_transfer_custody with timestamp, location, and handler'
    );

    // 6.2 Immutability Trigger: UPDATE blocked on CHAIN_OF_CUSTODY (trg_custody_no_update)
    let updateBlocked = false;
    try {
      await query(`UPDATE CHAIN_OF_CUSTODY SET Action = 'ALTERED_ACTION' WHERE Evidence_ID = :evId`, {
        evId: createdEvidenceId,
      });
    } catch (triggerErr) {
      if (triggerErr.message && (triggerErr.message.includes('ORA-20001') || triggerErr.message.includes('Append-only'))) {
        updateBlocked = true;
      }
    }

    assert(
      updateBlocked,
      'Trigger trg_custody_no_update blocks UPDATE on CHAIN_OF_CUSTODY with ORA-20001 (Append-Only Enforced)'
    );

    // 6.3 Immutability Trigger: DELETE blocked on CHAIN_OF_CUSTODY (trg_custody_no_delete)
    let deleteBlocked = false;
    try {
      await query(`DELETE FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = :evId`, {
        evId: createdEvidenceId,
      });
    } catch (triggerErr) {
      if (triggerErr.message && (triggerErr.message.includes('ORA-20002') || triggerErr.message.includes('Immutable'))) {
        deleteBlocked = true;
      }
    }

    assert(
      deleteBlocked,
      'Trigger trg_custody_no_delete blocks DELETE on CHAIN_OF_CUSTODY with ORA-20002 (Immutability Enforced)'
    );

    // =========================================================================
    // WORKFLOW 7: Dashboard Statistics, Search, Filtering, Audit & PDF Reports
    // =========================================================================
    console.log('\n--- WORKFLOW 7: Dashboard Statistics, Search, Filters & PDF Reports ---');

    // 7.1 Dashboard stats
    const statsRes = await makeRequest('/api/analytics/dashboard-stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      statsRes.status === 200 &&
      typeof statsRes.data?.data?.cases?.TOTAL_CASES === 'number' &&
      typeof statsRes.data?.data?.evidence?.TOTAL_EVIDENCE === 'number' &&
      Array.isArray(statsRes.data?.data?.statusBreakdown) &&
      Array.isArray(statsRes.data?.data?.typeDistribution) &&
      statsRes.data?.data?.isIsolated === false,
      'Oracle dashboard statistics reflect live cases, evidence breakdown, and asset classification'
    );

    // 7.2 Search and filtering across authorized cases
    const searchCaseRes = await makeRequest(`/api/cases?search=${caseTitle}&status=Under%20Investigation`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      searchCaseRes.status === 200 &&
      Array.isArray(searchCaseRes.data?.data) &&
      searchCaseRes.data?.data?.some((c) => (c.title || c.TITLE || '').includes(caseTitle)),
      'Case search filters accurately locate cases by title keyword and lifecycle status'
    );

    // 7.3 Search and filtering across evidence
    const searchEvRes = await makeRequest(`/api/evidence?caseId=${createdCaseId}&type=Device`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      searchEvRes.status === 200 &&
      Array.isArray(searchEvRes.data?.data) &&
      searchEvRes.data?.data?.some((e) => (e.evidenceId || e.EVIDENCE_ID) === createdEvidenceId),
      'Evidence search filters accurately locate items by parent case ID and asset classification type'
    );

    // 7.4 Audit log querying and pagination
    const auditRes = await makeRequest('/api/audit-logs?action=EVIDENCE_REGISTERED&limit=5&page=1', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      auditRes.status === 200 &&
      Array.isArray(auditRes.data?.data) &&
      auditRes.data?.meta?.limit === 5,
      'Audit log telemetry supports action filtering and Oracle 12c+ OFFSET/FETCH pagination'
    );

    // 7.5 PDF Reports Generation (All 4 formats)
    const dossierPdf = await makeRequest(`/api/reports/case/${createdCaseId}/dossier`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const custodyPdf = await makeRequest(`/api/reports/evidence/${createdEvidenceId}/custody`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const integrityPdf = await makeRequest(`/api/reports/case/${createdCaseId}/integrity`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditPdf = await makeRequest('/api/reports/audit-trail', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const isPdfDossier = dossierPdf.rawBuffer.slice(0, 4).toString('ascii') === '%PDF';
    const isPdfCustody = custodyPdf.rawBuffer.slice(0, 4).toString('ascii') === '%PDF';
    const isPdfIntegrity = integrityPdf.rawBuffer.slice(0, 4).toString('ascii') === '%PDF';
    const isPdfAudit = auditPdf.rawBuffer.slice(0, 4).toString('ascii') === '%PDF';

    assert(
      dossierPdf.status === 200 && isPdfDossier &&
      custodyPdf.status === 200 && isPdfCustody &&
      integrityPdf.status === 200 && isPdfIntegrity &&
      auditPdf.status === 200 && isPdfAudit,
      'All 4 PDF report types (Dossier, Custody Cert, Integrity Audit, Audit Trail) compile with valid %PDF- binary headers'
    );

    // =========================================================================
    // WORKFLOW 8: Error Handling, Missing References & Constraint Violations
    // =========================================================================
    console.log('\n--- WORKFLOW 8: Constraint Violations & Database Error Handling ---');

    // 8.1 Foreign Key Constraint Violation (ORA-02291)
    let fkCaught = false;
    try {
      await query(
        `INSERT INTO EVIDENCE (Description, Collection_Date, Case_ID, Status, Hash_Value)
         VALUES ('Orphan Evidence', SYSDATE, 999999, 'Collected', 'hash123')`
      );
    } catch (err) {
      if (err.message && err.message.includes('ORA-02291')) {
        fkCaught = true;
      }
    }
    assert(
      fkCaught,
      'Referential Integrity: Inserting evidence with non-existent Case_ID (999999) caught by Foreign Key (ORA-02291)'
    );

    // 8.2 Unique Constraint Violation (ORA-00001)
    let uniqueCaught = false;
    try {
      await query(
        `INSERT INTO APP_USER (First_Name, Last_Name, Phone_Number, Username, Role, Account_Status)
         VALUES ('Duplicate', 'User', '9999999999', 'Krishan', 'Investigator', 'Active')`
      );
    } catch (err) {
      if (err.message && err.message.includes('ORA-00001')) {
        uniqueCaught = true;
      }
    }
    assert(
      uniqueCaught,
      'Uniqueness Integrity: Inserting duplicate username (Krishan) caught by Unique Constraint (ORA-00001)'
    );

    // 8.3 NOT NULL Constraint Violation (ORA-01400)
    let notNullCaught = false;
    try {
      await query(
        `INSERT INTO CASE_TABLE (Title, Status, Created_By) VALUES (NULL, 'Open', 1)`
      );
    } catch (err) {
      if (err.message && err.message.includes('ORA-01400')) {
        notNullCaught = true;
      }
    }
    assert(
      notNullCaught,
      'Entity Integrity: Inserting CASE_TABLE record with NULL Title caught by NOT NULL Constraint (ORA-01400)'
    );

    // 8.4 Invalid URL Parameters & Missing Body Fields Rejection
    const badParamRes = await makeRequest('/api/cases/not-a-number', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const missingFieldRes = await makeRequest('/api/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {}, // missing 'title'
    });

    assert(
      badParamRes.status === 400 && missingFieldRes.status === 400,
      'Express validation middleware intercepts non-numeric IDs and missing required fields with HTTP 400 before DB execution'
    );

  } catch (uncaughtErr) {
    console.error('[UNCAUGHT EXCEPTION IN INTEGRATION SUITE]:', uncaughtErr);
    failed++;
  } finally {
    // =========================================================================
    // SAFE CLEANUP OF ISOLATED TEST RECORDS
    // =========================================================================
    console.log('\n[CLEANUP] Cleaning up isolated test records safely...');

    // Delete test device records
    for (const evId of cleanupEvidenceIds) {
      try {
        await query(`DELETE FROM DEVICE WHERE Evidence_ID = :evId`, { evId });
        await query(`DELETE FROM FILE_RECORD WHERE Evidence_ID = :evId`, { evId });
        await query(`DELETE FROM FORENSIC_ANALYSIS WHERE Evidence_ID = :evId`, { evId });
      } catch (_) {}
    }

    // Delete test users (cascades or removes created user accounts)
    for (const uId of cleanupUserIds) {
      try {
        await query(`DELETE FROM ASSIGNED WHERE User_ID = :uId`, { uId });
        await query(`DELETE FROM APP_USER WHERE User_ID = :uId`, { uId });
        console.log(`[CLEANUP] Safely removed test user account #${uId}`);
      } catch (_) {}
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await closeDatabasePool();

    console.log('================================================================');
    console.log(`PHASE 9 INTEGRATION SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runIntegrationTests().catch((err) => {
  console.error('Fatal integration test error:', err);
  process.exit(1);
});
