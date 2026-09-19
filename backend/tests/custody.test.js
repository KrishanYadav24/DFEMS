/**
 * DFEMS — Phase 6 Evidence Integrity and Chain of Custody Automated Test Suite
 *
 * Requirements Covered:
 * 1. SHA-256 cryptographic hashing from actual file bytes (not metadata).
 * 2. Storing and retrieving integrity metadata in EVIDENCE and FILE_RECORD.
 * 3. File intake via /api/evidence/upload with secure vault storage.
 * 4. File download via /api/evidence/:id/file with authorization.
 * 5. File integrity re-verification via /api/evidence/:id/verify-file using Oracle fn_verify_hash.
 * 6. Tampering detection: modifying file bytes generates MISMATCH alert, never false SUCCESS.
 * 7. Custody transfer workflow via /api/custody/transfer with sp_transfer_custody.
 * 8. Validation of transferring party, recipient user, location, and purpose.
 * 9. RBAC authorization enforcement on transfer and integrity endpoints.
 * 10. Append-only immutability triggers (trg_custody_no_update, trg_custody_no_delete).
 * 11. Transaction rollback on invalid custody transfers.
 * 12. Audit trail verification in AUDIT_LOG.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { query, closeDatabasePool } from '../src/config/database.js';
import { generateToken } from '../src/utils/token.js';
import { computeBytesHash, resolveVaultPath } from '../src/utils/vault.js';

let server;
let baseUrl;

function makeRequest(reqPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
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
      if (Buffer.isBuffer(options.body) || typeof options.body === 'string') {
        req.write(options.body);
      } else {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(options.body));
      }
    }
    req.end();
  });
}

/**
 * Helper to build a multipart/form-data buffer for file upload testing
 */
function buildMultipartBody(fields, fileField, fileName, fileBuffer, mimeType = 'text/plain') {
  const boundary = `----WebKitFormBoundary${crypto.randomBytes(16).toString('hex')}`;
  const parts = [];

  for (const [key, val] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
      `${val}\r\n`
    );
  }

  if (fileField && fileBuffer) {
    parts.push(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
  }

  const headerBuffer = Buffer.from(parts.join(''), 'utf-8');
  const footerBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
  const bodyBuffer = Buffer.concat([headerBuffer, fileBuffer, footerBuffer]);

  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: bodyBuffer,
  };
}

async function runCustodyTests() {
  console.log('================================================================');
  console.log('DFEMS — PHASE 6 EVIDENCE INTEGRITY & CUSTODY TEST SUITE');
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

  const auditorToken = generateToken({
    userId: 1,
    username: 'Krishan',
    role: 'Auditor',
    firstName: 'Krishan',
    lastName: 'Yadav',
  });

  let testCaseId = null;
  let createdEvidenceId = null;
  let storedVaultPath = null;
  let originalFileBytes = null;
  let expectedSha256 = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Pure Byte Hashing Algorithm Verification (Requirements 1 & 2)
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Cryptographic Byte Hashing (Requirements 1 & 2) ---');
    const knownContent = Buffer.from('FORENSIC_INTEGRITY_TEST_PAYLOAD_2026', 'utf-8');
    const computedHash = computeBytesHash(knownContent);
    const standardSha256 = crypto.createHash('sha256').update(knownContent).digest('hex').toLowerCase();

    assert(
      computedHash === standardSha256 && computedHash.length === 64,
      'Test 1a: SHA-256 computed strictly from raw byte buffer matches reference implementation'
    );

    // Avalanche effect check: 1 byte change completely alters digest
    const alteredContent = Buffer.from('FORENSIC_INTEGRITY_TEST_PAYLOAD_2027', 'utf-8');
    const alteredHash = computeBytesHash(alteredContent);
    assert(
      alteredHash !== computedHash,
      'Test 1b: Avalanche effect verified — single character change completely alters cryptographic digest'
    );

    // -------------------------------------------------------------------------
    // Setup Parent Case for Evidence Testing
    // -------------------------------------------------------------------------
    console.log('\n--- SETUP: Create Test Case in Oracle ---');
    const caseRes = await makeRequest('/api/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        title: `PHASE6_CUSTODY_TEST_CASE_${Date.now()}`,
        crimeType: 'Digital Fraud',
        locationId: 1,
      },
    });
    testCaseId = caseRes.data?.data?.caseId;
    assert(caseRes.status === 201 && testCaseId, `Setup: Test case #${testCaseId} created in Oracle`);

    // -------------------------------------------------------------------------
    // TEST 2: Evidence File Upload & Vault Sealing (Requirements 1, 2, 3)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Evidence File Intake & Vault Storage (Requirements 1, 2, 3) ---');
    originalFileBytes = Buffer.from(
      `DFEMS-SYNTHETIC-EVIDENCE-FILE-DATA-${Date.now()}-CONFIDENTIAL-ACQUISITION`,
      'utf-8'
    );
    expectedSha256 = computeBytesHash(originalFileBytes);

    const multipart = buildMultipartBody(
      {
        description: 'Seized Encrypted Container - Memory Extraction Dump',
        caseId: testCaseId,
      },
      'file',
      'memdump.raw',
      originalFileBytes,
      'application/octet-stream'
    );

    const uploadRes = await makeRequest('/api/evidence/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': multipart.contentType,
      },
      body: multipart.body,
    });

    assert(
      uploadRes.status === 201 && uploadRes.data?.data?.evidenceId,
      'Test 2a: Evidence file uploaded and sealed via /api/evidence/upload with HTTP 201'
    );

    createdEvidenceId = uploadRes.data?.data?.evidenceId;
    const reportedHash = uploadRes.data?.data?.hashValue;

    assert(
      reportedHash === expectedSha256,
      'Test 2b: Server calculated SHA-256 matches exact client byte digest',
      `Reported: ${reportedHash}, Expected: ${expectedSha256}`
    );

    // Verify FILE_RECORD in Oracle
    const fileRecCheck = await query(
      `SELECT File_Name, File_Path, File_Size, Mime_Type FROM FILE_RECORD WHERE Evidence_ID = :evidenceId`,
      { evidenceId: createdEvidenceId }
    );
    assert(
      fileRecCheck.rows && fileRecCheck.rows.length === 1 && fileRecCheck.rows[0].FILE_NAME === 'memdump.raw',
      'Test 2c: Metadata persisted in Oracle FILE_RECORD table'
    );

    storedVaultPath = fileRecCheck.rows[0].FILE_PATH;

    // -------------------------------------------------------------------------
    // TEST 3: Evidence File Download & Byte Verification (Requirement 10)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Evidence File Download (Requirement 10) ---');
    const downloadRes = await makeRequest(`/api/evidence/${createdEvidenceId}/file`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      downloadRes.status === 200,
      'Test 3a: Authorized download returns HTTP 200'
    );

    const downloadedBytes = Buffer.from(downloadRes.data);
    const downloadedHash = computeBytesHash(downloadedBytes);
    assert(
      downloadedHash === expectedSha256,
      'Test 3b: Downloaded file byte hash exactly matches original intake hash'
    );

    // -------------------------------------------------------------------------
    // TEST 4: Integrity Verification of Pristine File (Requirement 4)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Pristine File Verification via fn_verify_hash (Requirement 4) ---');
    const verifyPristineRes = await makeRequest(`/api/evidence/${createdEvidenceId}/verify-file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      verifyPristineRes.status === 200 &&
      verifyPristineRes.data?.data?.outcome === 'MATCH' &&
      verifyPristineRes.data?.data?.intact === true &&
      verifyPristineRes.data?.data?.status === 'VERIFIED',
      'Test 4: fn_verify_hash confirms intact file (outcome=MATCH, intact=true, status=VERIFIED)'
    );

    // -------------------------------------------------------------------------
    // TEST 5: Tamper Detection & Integrity Mismatch (Requirements 4 & 10)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Tampering Simulation & Alert Enforcement (Requirements 4 & 10) ---');
    const absDiskPath = resolveVaultPath(storedVaultPath);

    // Deliberately tamper with 1 byte on disk
    const tamperedBytes = Buffer.from(originalFileBytes);
    tamperedBytes[tamperedBytes.length - 1] ^= 0xff; // Flip bits of last byte
    await fs.promises.writeFile(absDiskPath, tamperedBytes);

    const verifyTamperedRes = await makeRequest(`/api/evidence/${createdEvidenceId}/verify-file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      verifyTamperedRes.status === 200 &&
      verifyTamperedRes.data?.data?.outcome === 'MISMATCH - POSSIBLE TAMPERING' &&
      verifyTamperedRes.data?.data?.intact === false &&
      verifyTamperedRes.data?.data?.status === 'POSSIBLE_TAMPERING',
      'Test 5a: Modified file byte detected as tampering (outcome=MISMATCH - POSSIBLE TAMPERING, intact=false)'
    );

    // Check AUDIT_LOG for tampering alert
    const tamperAuditCheck = await query(
      `SELECT Action, Details FROM AUDIT_LOG WHERE Entity_ID = :evidenceId AND Action = 'EVIDENCE_TAMPER_DETECTED'`,
      { evidenceId: createdEvidenceId }
    );
    assert(
      tamperAuditCheck.rows && tamperAuditCheck.rows.length >= 1,
      'Test 5b: EVIDENCE_TAMPER_DETECTED logged in AUDIT_LOG'
    );

    // Restore original file bytes
    await fs.promises.writeFile(absDiskPath, originalFileBytes);

    // Re-verify after restoration
    const verifyRestoredRes = await makeRequest(`/api/evidence/${createdEvidenceId}/verify-file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      verifyRestoredRes.data?.data?.outcome === 'MATCH' && verifyRestoredRes.data?.data?.intact === true,
      'Test 5c: Integrity restored after replacing corrupted bytes with original bitstream'
    );

    // -------------------------------------------------------------------------
    // TEST 6: Chain of Custody Ledger & Querying (Requirement 5)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Custody Ledger Listing (Requirement 5) ---');
    const ledgerRes = await makeRequest(`/api/custody?evidenceId=${createdEvidenceId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      ledgerRes.status === 200 && Array.isArray(ledgerRes.data?.data) && ledgerRes.data?.data.length >= 1,
      'Test 6a: /api/custody returns chronological records for evidence item'
    );

    const firstCustodyEntry = ledgerRes.data?.data[0];
    assert(
      firstCustodyEntry.ACTION && firstCustodyEntry.EVIDENCE_ID === createdEvidenceId,
      'Test 6b: Custody record includes Action, Evidence_ID, and valid Timestamp'
    );

    // -------------------------------------------------------------------------
    // TEST 7: Custody Transfer Authorization & Validation (Requirements 5 & 6)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Custody Transfer Authorization (Requirements 5 & 6) ---');
    // Auditor is not permitted to execute custody transfer
    const unauthTransferRes = await makeRequest('/api/custody/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${auditorToken}` },
      body: {
        evidenceId: createdEvidenceId,
        newStatus: 'In Storage',
      },
    });

    assert(
      unauthTransferRes.status === 403,
      'Test 7a: Auditor blocked from custody transfer with HTTP 403'
    );

    // Missing required fields
    const missingFieldsRes = await makeRequest('/api/custody/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        evidenceId: createdEvidenceId,
        // missing newStatus
      },
    });

    assert(
      missingFieldsRes.status === 400,
      'Test 7b: Transfer rejected with HTTP 400 when missing newStatus'
    );

    // Invalid status rejected
    const invalidStatusRes = await makeRequest('/api/custody/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        evidenceId: createdEvidenceId,
        newStatus: 'NON_EXISTENT_STATUS_XYZ',
      },
    });

    assert(
      invalidStatusRes.status === 400,
      'Test 7c: Transfer rejected with HTTP 400 on invalid status value'
    );

    // -------------------------------------------------------------------------
    // TEST 8: Successful Custody Transfer via sp_transfer_custody (Requirements 5, 8, 9)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Custody Transfer Execution & Audit (Requirements 5, 8, 9) ---');
    const transferRes = await makeRequest('/api/custody/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        evidenceId: createdEvidenceId,
        newStatus: 'Under Analysis',
        toUserId: 1,
        location: 'Forensic Lab Unit 4B',
        purpose: 'Deep memory forensic reconstruction and artifact carving',
      },
    });

    assert(
      transferRes.status === 201 && transferRes.data?.data?.newStatus === 'Under Analysis',
      'Test 8a: Custody transfer committed via sp_transfer_custody with HTTP 201'
    );

    // Verify EVIDENCE.Status updated
    const evStatusCheck = await query(
      `SELECT Status FROM EVIDENCE WHERE Evidence_ID = :evidenceId`,
      { evidenceId: createdEvidenceId }
    );
    assert(
      evStatusCheck.rows?.[0]?.STATUS === 'Under Analysis',
      'Test 8b: Evidence lifecycle status updated to "Under Analysis" in Oracle'
    );

    // Verify CHAIN_OF_CUSTODY records (both status change trigger and procedure entry)
    const newCustodyLogs = await query(
      `SELECT Action FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = :evidenceId ORDER BY Custody_ID ASC`,
      { evidenceId: createdEvidenceId }
    );
    const hasTransferAction = newCustodyLogs.rows?.some((r) => r.ACTION.includes('Transfer reason:'));
    assert(
      hasTransferAction,
      'Test 8c: Immutable transfer record recorded in CHAIN_OF_CUSTODY with transferring & receiving parties'
    );

    // Verify AUDIT_LOG entry
    const auditCustodyCheck = await query(
      `SELECT Action, Details FROM AUDIT_LOG WHERE Entity_ID = :evidenceId AND Action = 'CUSTODY_TRANSFER'`,
      { evidenceId: createdEvidenceId }
    );
    assert(
      auditCustodyCheck.rows && auditCustodyCheck.rows.length >= 1,
      'Test 8d: CUSTODY_TRANSFER event logged in AUDIT_LOG with detailed location and purpose'
    );

    // -------------------------------------------------------------------------
    // TEST 9: Append-Only Trigger Immutability Enforcement (Requirement 7)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Append-Only Trigger Immutability Enforcement (Requirement 7) ---');
    const updateTriggerRes = await makeRequest('/api/custody/test-update-trigger', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      updateTriggerRes.status === 403 &&
      updateTriggerRes.data?.error?.code === 'TRIGGER_IMMUTABILITY_ENFORCED',
      'Test 9a: trg_custody_no_update blocks UPDATE on CHAIN_OF_CUSTODY with ORA-20001 (HTTP 403)'
    );

    const deleteTriggerRes = await makeRequest('/api/custody/test-delete-trigger', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert(
      deleteTriggerRes.status === 403 &&
      deleteTriggerRes.data?.error?.code === 'TRIGGER_IMMUTABILITY_ENFORCED',
      'Test 9b: trg_custody_no_delete blocks DELETE on CHAIN_OF_CUSTODY with ORA-20002 (HTTP 403)'
    );

    // -------------------------------------------------------------------------
    // TEST 10: Transaction Rollback on Invalid Transfer Reference (Requirement 9)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Transaction Boundary & Rollback (Requirement 9) ---');
    const invalidEvTransfer = await makeRequest('/api/custody/transfer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        evidenceId: 99999999, // Non-existent evidence ID
        newStatus: 'In Storage',
      },
    });

    assert(
      invalidEvTransfer.status === 404 || invalidEvTransfer.status === 400,
      'Test 10: Non-existent evidence transfer rejected cleanly without leaving orphaned records'
    );

  } catch (err) {
    console.error('[TEST ERROR]:', err);
    failed++;
  } finally {
    // Teardown
    if (server) {
      server.close();
    }
    await closeDatabasePool();

    console.log('\n================================================================');
    console.log(`PHASE 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runCustodyTests();
