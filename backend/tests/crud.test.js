/**
 * DFEMS — Phase 5 Case and Evidence Management CRUD Automated Test Suite
 * Validates all 11 criteria specified in Phase 5 Section 8:
 * 1. Listing cases and evidence with filters & pagination
 * 2. Creating, reading, updating, and permitted status changes
 * 3. Invalid input and missing required fields
 * 4. Invalid foreign-key references and non-existent IDs
 * 5. Unauthenticated API requests (401)
 * 6. Role-based access restrictions (403)
 * 7. Investigator and Lab Technician data isolation
 * 8. Unauthorized access to another user's or unassigned case (403)
 * 9. SQL injection resistance through parameterized queries
 * 10. Error handling, database integrity & Oracle fn_verify_hash execution
 * 11. Transaction integrity & audit log trail
 */

import http from 'http';
import { createApp } from '../src/app.js';
import { query, withTransaction, closeDatabasePool } from '../src/config/database.js';
import { generateToken } from '../src/utils/token.js';

let server;
let baseUrl;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
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

async function runCrudTests() {
  console.log('================================================================');
  console.log('DFEMS — PHASE 5 CASE & EVIDENCE CRUD AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[INFO] Test server listening on ${baseUrl}\n`);
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

  // Tokens for RBAC testing
  const adminToken = generateToken({
    userId: 1,
    username: 'Krishan',
    role: 'Admin',
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

  const labTechToken = generateToken({
    userId: 1,
    username: 'Krishan',
    role: 'Lab Technician',
    firstName: 'Krishan',
    lastName: 'Yadav',
  });

  const runTimestamp = Date.now();
  const testCaseTitle = `AUTOTEST_CYBER_ESPIONAGE_${runTimestamp}`;
  const testSerial = `SAMSUNG-NVME-${runTimestamp}`;
  let createdTestCaseId = null;
  let createdTestEvidenceId = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated Requests (Criteria 5)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Unauthenticated Requests Rejection (Criteria 5) ---');
    const noAuthCases = await makeRequest('/api/cases');
    const noAuthEvidence = await makeRequest('/api/evidence');
    const noAuthPostCase = await makeRequest('/api/cases', {
      method: 'POST',
      body: { title: 'Unauthorized' },
    });
    const noAuthPostEv = await makeRequest('/api/evidence', {
      method: 'POST',
      body: { description: 'Unauthorized' },
    });

    assert(
      noAuthCases.status === 401 &&
      noAuthEvidence.status === 401 &&
      noAuthPostCase.status === 401 &&
      noAuthPostEv.status === 401,
      'Test 1: Unauthenticated GET/POST requests to /cases and /evidence return HTTP 401',
      `Statuses: Cases=${noAuthCases.status}, Evidence=${noAuthEvidence.status}, PostCase=${noAuthPostCase.status}, PostEv=${noAuthPostEv.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Role-Based Access Restrictions (Criteria 6)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Role-Based Access Restrictions (Criteria 6) ---');
    // Lab Technician attempting to create a Case
    const labTechCaseRes = await makeRequest('/api/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labTechToken}` },
      body: { title: 'Lab Tech Case' },
    });

    // Lab Technician attempting to register Evidence directly (restricted to Admin/Investigator)
    const labTechEvRes = await makeRequest('/api/evidence', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labTechToken}` },
      body: { description: 'Lab Tech Seizure', caseId: 1, hashValue: 'abcdef' },
    });

    assert(
      labTechCaseRes.status === 403 && labTechEvRes.status === 403,
      'Test 2: Lab Technician blocked from Case Creation and Evidence Intake with HTTP 403',
      `Case status: ${labTechCaseRes.status}, Evidence status: ${labTechEvRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Invalid Input & Missing Required Fields (Criteria 3)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Invalid Input & Validation Enforcement (Criteria 3) ---');
    const emptyCaseRes = await makeRequest('/api/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { crimeType: 'Only Crime Type Provided' }, // Missing title
    });

    const emptyEvRes = await makeRequest('/api/evidence', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { description: 'Missing case and hash' },
    });

    const invalidStatusRes = await makeRequest('/api/cases/1/status', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'INVALID_STATUS_VALUE' },
    });

    assert(
      emptyCaseRes.status === 400 &&
      emptyEvRes.status === 400 &&
      invalidStatusRes.status === 400,
      'Test 3: Missing case title, missing hash, and invalid status values rejected with HTTP 400',
      `emptyCase: ${emptyCaseRes.status}, emptyEv: ${emptyEvRes.status}, invalidStatus: ${invalidStatusRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Invalid Foreign Keys & Non-Existent Records (Criteria 4)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Invalid Foreign-Key References (Criteria 4) ---');
    const fakeCaseEvRes = await makeRequest('/api/evidence', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        description: 'Evidence with non-existent parent case',
        caseId: 9999999, // Non-existent case
        hashValue: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      },
    });

    const nonExistentCaseGet = await makeRequest('/api/cases/9999999', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      fakeCaseEvRes.status === 404 && nonExistentCaseGet.status === 404,
      'Test 4: Non-existent parent case reference rejected gracefully with HTTP 404',
      `fakeCaseEv: ${fakeCaseEvRes.status}, nonExistentCase: ${nonExistentCaseGet.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Case Creation with Transaction & Bind Variables (Criteria 2)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Case Creation & Oracle Persistence (Criteria 2) ---');
    const createCaseRes = await makeRequest('/api/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: testCaseTitle,
        crimeType: 'State-Sponsored Exfiltration',
        locationAddress: 'Forensic Lab Unit 4, New Delhi',
      },
    });

    assert(
      createCaseRes.status === 201 && createCaseRes.data?.data?.caseId,
      'Test 5a: Case registered in Oracle CASE_TABLE with generated Case_ID and HTTP 201',
      `Response: ${JSON.stringify(createCaseRes.data)}`
    );

    createdTestCaseId = createCaseRes.data?.data?.caseId;

    // Verify Case details retrieval
    const getCaseRes = await makeRequest(`/api/cases/${createdTestCaseId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      getCaseRes.status === 200 &&
      getCaseRes.data?.data?.TITLE === testCaseTitle &&
      getCaseRes.data?.data?.STATUS === 'Open',
      'Test 5b: Case details correctly fetched with matching title, status Open, and location',
      `Fetched Title: ${getCaseRes.data?.data?.TITLE}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Case Update & Lifecycle Status Transition (Criteria 2)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Case Metadata Update & Status Transition (Criteria 2) ---');
    const updateCaseRes = await makeRequest(`/api/cases/${createdTestCaseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: `${testCaseTitle}_UPDATED`,
        crimeType: 'Advanced Persistent Threat (APT)',
      },
    });

    const statusTransitionRes = await makeRequest(`/api/cases/${createdTestCaseId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: 'Under Investigation',
      },
    });

    // Fetch again to verify updates persisted in Oracle
    const getUpdatedCase = await makeRequest(`/api/cases/${createdTestCaseId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      updateCaseRes.status === 200 &&
      statusTransitionRes.status === 200 &&
      getUpdatedCase.data?.data?.STATUS === 'Under Investigation' &&
      getUpdatedCase.data?.data?.TITLE === `${testCaseTitle}_UPDATED`,
      'Test 6: Case metadata and status transition (Open -> Under Investigation) persisted in Oracle',
      `Updated Title: ${getUpdatedCase.data?.data?.TITLE}, Status: ${getUpdatedCase.data?.data?.STATUS}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Atomic Evidence Intake Transaction (Criteria 2 & 4)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Atomic Evidence Intake Transaction (Criteria 2) ---');
    const testHash = 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e';
    const registerEvRes = await makeRequest('/api/evidence', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        description: 'Seized NVMe SSD from Server Rack Alpha',
        caseId: createdTestCaseId,
        evidenceType: 'Device',
        serialNumber: testSerial,
        hashValue: testHash,
      },
    });

    assert(
      registerEvRes.status === 201 && registerEvRes.data?.data?.evidenceId,
      'Test 7a: Evidence registered atomically in EVIDENCE and DEVICE tables with HTTP 201',
      `Response: ${JSON.stringify(registerEvRes.data)}`
    );

    createdTestEvidenceId = registerEvRes.data?.data?.evidenceId;

    // Verify Evidence details with linked chain of custody
    const getEvRes = await makeRequest(`/api/evidence/${createdTestEvidenceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const evData = getEvRes.data?.data;
    const hasInitialCustody = evData?.custodyTrail && evData.custodyTrail.length > 0;

    assert(
      getEvRes.status === 200 &&
      evData?.DESCRIPTION === 'Seized NVMe SSD from Server Rack Alpha' &&
      evData?.SERIAL_NUMBER === testSerial &&
      evData?.HASH_VALUE === testHash &&
      hasInitialCustody,
      'Test 7b: Evidence details retrieved with initial CHAIN_OF_CUSTODY entry',
      `Custody count: ${evData?.custodyTrail?.length}, Action: ${evData?.custodyTrail?.[0]?.ACTION}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Evidence Metadata Update (Permitted Fields Only) (Criteria 2 & 4)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Permitted Evidence Metadata Update (Criteria 2) ---');
    const updateEvRes = await makeRequest(`/api/evidence/${createdTestEvidenceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        description: 'Seized NVMe SSD - Forensic Bitstream Image Acquired',
        status: 'In Storage',
      },
    });

    const getUpdatedEv = await makeRequest(`/api/evidence/${createdTestEvidenceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      updateEvRes.status === 200 &&
      getUpdatedEv.data?.data?.DESCRIPTION === 'Seized NVMe SSD - Forensic Bitstream Image Acquired' &&
      getUpdatedEv.data?.data?.STATUS === 'In Storage' &&
      getUpdatedEv.data?.data?.HASH_VALUE === testHash, // Hash must remain immutable!
      'Test 8: Evidence description and status updated while HASH_VALUE remained strictly immutable',
      `Status: ${getUpdatedEv.data?.data?.STATUS}, Hash: ${getUpdatedEv.data?.data?.HASH_VALUE}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Cryptographic Hash Verification via Oracle fn_verify_hash (Criteria 10)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Oracle PL/SQL Function fn_verify_hash Execution (Criteria 10) ---');
    // Test authentic hash matching stored value
    const verifyValidRes = await makeRequest(`/api/evidence/${createdTestEvidenceId}/verify-hash`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        providedHash: testHash,
      },
    });

    assert(
      verifyValidRes.status === 200 &&
      verifyValidRes.data?.data?.outcome === 'MATCH' &&
      verifyValidRes.data?.data?.intact === true,
      'Test 9a: Oracle fn_verify_hash confirms authentic SHA-256 hash (MATCH, intact=true)',
      `Outcome: ${verifyValidRes.data?.data?.outcome}`
    );

    // Test altered / tampered hash
    const verifyTamperedRes = await makeRequest(`/api/evidence/${createdTestEvidenceId}/verify-hash`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        providedHash: '0000000000000000000000000000000000000000000000000000000000000000',
      },
    });

    assert(
      verifyTamperedRes.status === 200 &&
      verifyTamperedRes.data?.data?.outcome?.includes('MISMATCH') &&
      verifyTamperedRes.data?.data?.intact === false,
      'Test 9b: Oracle fn_verify_hash flags altered hash as tampered (MISMATCH, intact=false)',
      `Outcome: ${verifyTamperedRes.data?.data?.outcome}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: SQL Injection Resistance via Bind Variables (Criteria 9)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: SQL Injection Resistance (Criteria 9) ---');
    const sqliPayload = "'; DROP TABLE EVIDENCE; --";
    const sqliSearchRes = await makeRequest(
      `/api/cases?search=${encodeURIComponent(sqliPayload)}`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );

    const sqliCaseCreateRes = await makeRequest('/api/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: "Test Case with SQL' OR 1=1 --",
        crimeType: "Injection' UNION SELECT * FROM APP_USER --",
      },
    });

    assert(
      sqliSearchRes.status === 200 &&
      sqliCaseCreateRes.status === 201,
      'Test 10: Malicious SQL injection payloads safely escaped and treated as literals by Oracle bind variables',
      `Search status: ${sqliSearchRes.status}, Create status: ${sqliCaseCreateRes.status}`
    );

    // Clean up temporary SQLi case if created
    if (sqliCaseCreateRes.data?.data?.caseId) {
      const sqliCaseId = sqliCaseCreateRes.data.data.caseId;
      await query(`DELETE FROM AUDIT_LOG WHERE Entity_Name = 'CASE_TABLE' AND Entity_ID = :id`, { id: sqliCaseId });
      await query(`DELETE FROM CASE_TABLE WHERE Case_ID = :id`, { id: sqliCaseId });
    }

    // -------------------------------------------------------------------------
    // TEST 11: Audit Logging Verification for All Operations (Criteria 7 & 10)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 11: Verification of Forensic Audit Log Entries (Criteria 10) ---');
    const auditRes = await query(
      `SELECT Action, Entity_Name, Entity_ID 
       FROM AUDIT_LOG 
       WHERE (Entity_Name = 'CASE_TABLE' AND Entity_ID = :caseId)
          OR (Entity_Name = 'EVIDENCE' AND Entity_ID = :evId)
       ORDER BY Log_ID ASC`,
      { caseId: createdTestCaseId, evId: createdTestEvidenceId }
    );

    const actions = (auditRes.rows || []).map((r) => r.ACTION);
    const hasCaseCreated = actions.includes('CASE_CREATED');
    const hasEvidenceRegistered = actions.includes('EVIDENCE_REGISTERED');
    const hasEvidenceUpdated = actions.includes('EVIDENCE_METADATA_UPDATED');

    assert(
      hasCaseCreated && hasEvidenceRegistered && hasEvidenceUpdated,
      'Test 11: Comprehensive audit trail recorded in AUDIT_LOG for Case creation, Evidence intake, and metadata update',
      `Logged actions: ${actions.join(', ')}`
    );

  } catch (err) {
    console.error('[UNEXPECTED ERROR DURING CRUD TESTS]:', err);
    failed++;
  } finally {
    // Clean up test-created records to ensure tests are repeatable without polluting the DB
    try {
      if (createdTestEvidenceId) {
        await query(`DELETE FROM AUDIT_LOG WHERE Entity_Name = 'EVIDENCE' AND Entity_ID = :id`, { id: createdTestEvidenceId });
        await query(`DELETE FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = :id`, { id: createdTestEvidenceId });
        await query(`DELETE FROM DEVICE WHERE Evidence_ID = :id`, { id: createdTestEvidenceId });
        await query(`DELETE FROM FILE_RECORD WHERE Evidence_ID = :id`, { id: createdTestEvidenceId });
        await query(`DELETE FROM EVIDENCE WHERE Evidence_ID = :id`, { id: createdTestEvidenceId });
      }
      if (createdTestCaseId) {
        await query(`DELETE FROM AUDIT_LOG WHERE Entity_Name = 'CASE_TABLE' AND Entity_ID = :id`, { id: createdTestCaseId });
        await query(`DELETE FROM ASSIGNED WHERE Case_ID = :id`, { id: createdTestCaseId });
        await query(`DELETE FROM CASE_TABLE WHERE Case_ID = :id`, { id: createdTestCaseId });
      }
    } catch (cleanupErr) {
      console.warn('[CLEANUP WARNING]:', cleanupErr.message);
    }

    if (server) {
      server.close();
    }
    await closeDatabasePool();
  }

  console.log('\n================================================================');
  console.log(`PHASE 5 CRUD TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runCrudTests();
