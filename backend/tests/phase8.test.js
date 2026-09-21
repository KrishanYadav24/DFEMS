/**
 * DFEMS — Phase 8 Dashboard, Search, PDF Reports and Audit Automated Test Suite
 *
 * Requirements Covered:
 * 1. Live Oracle-backed dashboard statistics for cases, evidence, statuses, and custody.
 * 2. Role-aware dashboards: Admin receives system-wide metrics, Investigator receives scoped data.
 * 3. Search, filtering, and pagination over cases, evidence, and audit logs.
 * 4. Audit-log viewing with strict RBAC: Admin and Auditor allowed; others receive 403 Forbidden.
 * 5. Official PDF report generation using real Oracle results via PDFKit:
 *    - Case Dossier PDF (/api/reports/case/:id/dossier)
 *    - Chain of Custody Certificate PDF (/api/reports/evidence/:id/custody)
 *    - Cryptographic Integrity Verification Audit PDF (/api/reports/case/:id/integrity)
 *    - Security Audit Trail PDF (/api/reports/audit-trail)
 * 6. PDF headers and binary validation (%PDF- signature).
 * 7. Server-side authorization check preventing unauthorized report exports.
 */

import http from 'http';
import { createApp } from '../src/app.js';
import { query, closeDatabasePool } from '../src/config/database.js';
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

async function runPhase8Tests() {
  console.log('================================================================');
  console.log('DFEMS — PHASE 8 DASHBOARD, SEARCH, PDF REPORTS & AUDIT SUITE');
  console.log('================================================================\n');

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[INFO] Phase 8 test server listening on ${baseUrl}\n`);
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

  // Active user in Oracle is Krishan (User_ID = 1)
  const adminToken = generateToken({
    userId: 1,
    username: 'Krishan',
    role: 'Admin',
    firstName: 'Krishan',
    lastName: 'Yadav',
  });

  const auditorToken = generateToken({
    userId: 1,
    username: 'Krishan',
    role: 'Auditor',
    firstName: 'Krishan',
    lastName: 'Yadav',
  });

  const investigatorToken = generateToken({
    userId: 1,
    username: 'Krishan',
    role: 'Investigator',
    firstName: 'Krishan',
    lastName: 'Yadav',
  });

  const custodianToken = generateToken({
    userId: 1,
    username: 'Krishan',
    role: 'Evidence Custodian',
    firstName: 'Krishan',
    lastName: 'Yadav',
  });

  let unassignedInvestigatorToken = null;
  let createdUnassignedUserId = null;

  try {
    // -------------------------------------------------------------------------
    // 0. Locate sample Case and Evidence from database
    // -------------------------------------------------------------------------
    const caseResult = await query(`
      SELECT Case_ID, Title FROM CASE_TABLE ORDER BY Case_ID ASC FETCH FIRST 1 ROWS ONLY
    `);
    const testCaseId = caseResult.rows?.[0]?.CASE_ID || 1;

    const evidenceResult = await query(`
      SELECT Evidence_ID, Case_ID FROM EVIDENCE ORDER BY Evidence_ID ASC FETCH FIRST 1 ROWS ONLY
    `);
    const testEvidenceId = evidenceResult.rows?.[0]?.EVIDENCE_ID || 1;

    console.log(`[SETUP] Using Database Case_ID #${testCaseId}, Evidence_ID #${testEvidenceId}\n`);

    // Create a secondary investigator user who is NOT assigned to testCaseId
    const unassignedUsername = `inv_test_${Date.now()}`;
    const createInvRes = await makeRequest('/api/auth/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        firstName: 'External',
        lastName: 'Investigator',
        username: unassignedUsername,
        role: 'Investigator',
        password: 'ValidPass123!@#',
      },
    });

    if (createInvRes.status === 201 && (createInvRes.data?.data?.userId || createInvRes.data?.data?.id)) {
      createdUnassignedUserId = createInvRes.data.data.userId || createInvRes.data.data.id;
      unassignedInvestigatorToken = generateToken({
        userId: createdUnassignedUserId,
        username: unassignedUsername,
        role: 'Investigator',
      });
      console.log(`[SETUP] Created unassigned investigator #${createdUnassignedUserId} (${unassignedUsername})\n`);
    }

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated Requests Rejection
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Unauthenticated Rejections ---');
    const noAuthStats = await makeRequest('/api/analytics/dashboard-stats');
    const noAuthAudit = await makeRequest('/api/audit-logs');
    const noAuthDossier = await makeRequest(`/api/reports/case/${testCaseId}/dossier`);
    const noAuthAuditTrail = await makeRequest('/api/reports/audit-trail');

    assert(
      noAuthStats.status === 401 &&
      noAuthAudit.status === 401 &&
      noAuthDossier.status === 401 &&
      noAuthAuditTrail.status === 401,
      'Rejects all unauthenticated requests to dashboard, audit, and report endpoints with 401'
    );

    // -------------------------------------------------------------------------
    // TEST 2: Dashboard Statistics API & Role-Aware Scope
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Dashboard Statistics API & Role-Aware Isolation ---');
    const adminStatsRes = await makeRequest('/api/analytics/dashboard-stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      adminStatsRes.status === 200 &&
      adminStatsRes.data?.success === true &&
      adminStatsRes.data?.data?.cases?.TOTAL_CASES !== undefined &&
      adminStatsRes.data?.data?.evidence?.TOTAL_EVIDENCE !== undefined &&
      Array.isArray(adminStatsRes.data?.data?.statusBreakdown) &&
      Array.isArray(adminStatsRes.data?.data?.typeDistribution) &&
      adminStatsRes.data?.data?.isIsolated === false,
      'Admin retrieves comprehensive Oracle-backed system-wide dashboard statistics'
    );

    const invStatsRes = await makeRequest('/api/analytics/dashboard-stats', {
      headers: { Authorization: `Bearer ${investigatorToken}` },
    });

    assert(
      invStatsRes.status === 200 &&
      invStatsRes.data?.success === true &&
      invStatsRes.data?.data?.isIsolated === true,
      'Investigator dashboard isolates statistics to assigned cases and evidence'
    );

    // -------------------------------------------------------------------------
    // TEST 3: Audit Log RBAC, Pagination & Filters
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Audit Log Telemetry RBAC & Search Filters ---');
    
    // Investigator should be forbidden from accessing security audit logs
    const invAuditRes = await makeRequest('/api/audit-logs', {
      headers: { Authorization: `Bearer ${investigatorToken}` },
    });
    assert(
      invAuditRes.status === 403,
      'Investigator is forbidden (403) from accessing security audit telemetry'
    );

    // Custodian should also be forbidden
    const custAuditRes = await makeRequest('/api/audit-logs', {
      headers: { Authorization: `Bearer ${custodianToken}` },
    });
    assert(
      custAuditRes.status === 403,
      'Evidence Custodian is forbidden (403) from accessing security audit telemetry'
    );

    // Auditor is allowed
    const auditorAuditRes = await makeRequest('/api/audit-logs?limit=10&page=1', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert(
      auditorAuditRes.status === 200 &&
      Array.isArray(auditorAuditRes.data?.data) &&
      auditorAuditRes.data?.meta?.limit === 10,
      'Auditor can query and paginate audit logs with Oracle 12c+ OFFSET/FETCH'
    );

    // Admin is allowed with search filter
    const adminAuditRes = await makeRequest('/api/audit-logs?search=LOGIN', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminAuditRes.status === 200 &&
      Array.isArray(adminAuditRes.data?.data),
      'Admin can search audit logs with parameterized keyword filter'
    );

    // -------------------------------------------------------------------------
    // TEST 4: Case Dossier PDF Report Generation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Judicial Case Dossier PDF Generation ---');
    const dossierRes = await makeRequest(`/api/reports/case/${testCaseId}/dossier`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const isPdfDossier = dossierRes.rawBuffer.slice(0, 4).toString('ascii') === '%PDF';
    assert(
      dossierRes.status === 200 &&
      dossierRes.headers['content-type'] === 'application/pdf' &&
      isPdfDossier &&
      dossierRes.rawBuffer.length > 500,
      `Generates valid PDF binary dossier for Case #${testCaseId} (%PDF- header verified, size: ${dossierRes.rawBuffer.length} bytes)`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Chain of Custody Certificate PDF Generation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Chain of Custody Certificate PDF Generation ---');
    const custodyPdfRes = await makeRequest(`/api/reports/evidence/${testEvidenceId}/custody`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const isPdfCustody = custodyPdfRes.rawBuffer.slice(0, 4).toString('ascii') === '%PDF';
    assert(
      custodyPdfRes.status === 200 &&
      custodyPdfRes.headers['content-type'] === 'application/pdf' &&
      isPdfCustody &&
      custodyPdfRes.rawBuffer.length > 500,
      `Generates valid Chain of Custody Certificate PDF for Evidence #${testEvidenceId} (%PDF- header verified, size: ${custodyPdfRes.rawBuffer.length} bytes)`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Cryptographic Integrity Verification Audit PDF Generation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Cryptographic Integrity Verification Audit PDF ---');
    const integrityPdfRes = await makeRequest(`/api/reports/case/${testCaseId}/integrity`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const isPdfIntegrity = integrityPdfRes.rawBuffer.slice(0, 4).toString('ascii') === '%PDF';
    assert(
      integrityPdfRes.status === 200 &&
      integrityPdfRes.headers['content-type'] === 'application/pdf' &&
      isPdfIntegrity &&
      integrityPdfRes.rawBuffer.length > 500,
      `Generates valid Integrity Verification Audit PDF for Case #${testCaseId} (%PDF- header verified, size: ${integrityPdfRes.rawBuffer.length} bytes)`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Security Audit Trail PDF Generation & RBAC
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Security Audit Trail PDF & Role Restrictions ---');
    const invAuditTrailRes = await makeRequest('/api/reports/audit-trail', {
      headers: { Authorization: `Bearer ${investigatorToken}` },
    });
    assert(
      invAuditTrailRes.status === 403,
      'Investigator is forbidden (403) from exporting Security Audit Trail PDF'
    );

    const auditorAuditTrailRes = await makeRequest('/api/reports/audit-trail', {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    const isPdfAudit = auditorAuditTrailRes.rawBuffer.slice(0, 4).toString('ascii') === '%PDF';
    assert(
      auditorAuditTrailRes.status === 200 &&
      auditorAuditTrailRes.headers['content-type'] === 'application/pdf' &&
      isPdfAudit &&
      auditorAuditTrailRes.rawBuffer.length > 500,
      `Auditor can export Security Audit Trail PDF (%PDF- header verified, size: ${auditorAuditTrailRes.rawBuffer.length} bytes)`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Server-Side Authorization Boundary on Case Dossier
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Server-Side Authorization Boundary on Dossier ---');
    if (unassignedInvestigatorToken) {
      const unauthDossierRes = await makeRequest(`/api/reports/case/${testCaseId}/dossier`, {
        headers: { Authorization: `Bearer ${unassignedInvestigatorToken}` },
      });
      assert(
        unauthDossierRes.status === 403,
        `Unassigned Investigator cannot export dossier for Case #${testCaseId} (403 Forbidden)`
      );
    } else {
      console.log('  [SKIP] Unassigned investigator test skipped (could not create test user)');
    }

    // Non-existent case
    const notFoundDossierRes = await makeRequest('/api/reports/case/999999/dossier', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      notFoundDossierRes.status === 404,
      'Requesting dossier for non-existent case returns 404 Not Found'
    );

  } catch (err) {
    console.error('[UNCAUGHT ERROR IN TEST SUITE]:', err);
    failed++;
  } finally {
    if (createdUnassignedUserId) {
      try {
        await query(`DELETE FROM APP_USER WHERE User_ID = :userId`, { userId: createdUnassignedUserId });
        console.log(`[CLEANUP] Deleted test investigator #${createdUnassignedUserId}`);
      } catch (_) {}
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await closeDatabasePool();
    console.log('\n================================================================');
    console.log(`PHASE 8 TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runPhase8Tests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
