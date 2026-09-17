/**
 * DFEMS — Phase 4 Comprehensive Authentication, Authorization & RBAC Test Suite
 * Validates all 10 test criteria required by the project specification.
 */

import http from 'http';
import { createApp } from '../src/app.js';
import { query, closeDatabasePool } from '../src/config/database.js';
import { generateToken } from '../src/utils/token.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';

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

async function runTests() {
  console.log('================================================================');
  console.log('DFEMS — PHASE 4 AUTHENTICATION & RBAC AUTOMATED TEST SUITE');
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

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Database Connection & Verification of Admin Account 'Krishan'
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Oracle Database Connection & Admin User Verification ---');
    const dbUserRes = await query(
      `SELECT User_ID, Username, Role, Account_Status, Password_Hash FROM APP_USER WHERE Username = 'Krishan'`
    );
    const adminUser = dbUserRes.rows?.[0];
    assert(
      adminUser && adminUser.ROLE === 'Admin' && adminUser.ACCOUNT_STATUS === 'Active',
      'Test 1: Oracle DB connected and administrator "Krishan" exists with Role=Admin & Status=Active',
      JSON.stringify(adminUser)
    );

    // -------------------------------------------------------------------------
    // TEST 2: Failed Login with Incorrect Password
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Failed Login with Incorrect Password ---');
    const wrongPassRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'Krishan', password: 'WrongPassword999!' },
    });
    const wrongCode = wrongPassRes.data?.error?.code;
    assert(
      wrongPassRes.status === 401 && wrongCode === 'INVALID_CREDENTIALS',
      'Test 2: Rejects incorrect password with HTTP 401 (INVALID_CREDENTIALS)',
      `Status: ${wrongPassRes.status}, Error Code: ${wrongCode}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Failed Login with Unknown Username
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Failed Login with Unknown Username ---');
    const unknownUserRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { username: 'nonexistent.agent', password: 'SomePassword123!' },
    });
    const unknownCode = unknownUserRes.data?.error?.code;
    assert(
      unknownUserRes.status === 401 && unknownCode === 'INVALID_CREDENTIALS',
      'Test 3: Rejects nonexistent user with HTTP 401 without revealing username existence',
      `Status: ${unknownUserRes.status}, Error Code: ${unknownCode}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Requests to Protected Endpoints Without Authentication
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Requests to Protected Endpoints Without Authentication ---');
    const noAuthCaseRes = await makeRequest('/api/cases');
    const noAuthMeRes = await makeRequest('/api/auth/me');
    const noAuthUsersRes = await makeRequest('/api/auth/users');
    assert(
      noAuthCaseRes.status === 401 && noAuthMeRes.status === 401 && noAuthUsersRes.status === 401,
      'Test 4: Unauthenticated access to /cases, /auth/me, /auth/users strictly denied with HTTP 401',
      `Statuses: /cases=${noAuthCaseRes.status}, /auth/me=${noAuthMeRes.status}, /auth/users=${noAuthUsersRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Requests Using Invalid or Expired Credentials
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: Requests Using Invalid or Expired Credentials ---');
    const badTokenRes = await makeRequest('/api/cases', {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    const badTokenCode = badTokenRes.data?.error?.code;
    assert(
      badTokenRes.status === 401 && badTokenCode === 'INVALID_TOKEN',
      'Test 5a: Malformed token rejected with HTTP 401 (INVALID_TOKEN)',
      `Status: ${badTokenRes.status}, Error Code: ${badTokenCode}`
    );

    // Create intentionally expired token
    const expiredToken = jwt.sign(
      { userId: 1, username: 'Krishan', role: 'Admin' },
      env.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expiredTokenRes = await makeRequest('/api/cases', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const expiredCode = expiredTokenRes.data?.error?.code;
    assert(
      expiredTokenRes.status === 401 && expiredCode === 'TOKEN_EXPIRED',
      'Test 5b: Expired token rejected with HTTP 401 (TOKEN_EXPIRED)',
      `Status: ${expiredTokenRes.status}, Error Code: ${expiredCode}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Admin-Only Endpoints Accessed by Non-Admin Users
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Admin-Only Endpoints Accessed by Non-Admin Users ---');
    // Generate valid signed tokens for role-based boundary testing
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
      firstName: 'Test',
      lastName: 'Investigator',
    });

    const labTechToken = generateToken({
      userId: 1,
      username: 'Krishan',
      role: 'Lab Technician',
      firstName: 'Test',
      lastName: 'Technician',
    });

    // Test Admin route (/api/auth/users) as Investigator -> Should return 403 Forbidden
    const nonAdminUserMgmtRes = await makeRequest('/api/auth/users', {
      headers: { Authorization: `Bearer ${investigatorToken}` },
    });
    const nonAdminCode = nonAdminUserMgmtRes.data?.error?.code;
    assert(
      nonAdminUserMgmtRes.status === 403 && nonAdminCode === 'FORBIDDEN',
      'Test 6a: Non-admin (Investigator) blocked from /api/auth/users with HTTP 403 (FORBIDDEN)',
      `Status: ${nonAdminUserMgmtRes.status}, Error Code: ${nonAdminCode}`
    );

    // Test Admin route (/api/auth/users) as Admin -> Should return 200 OK
    const adminUserMgmtRes = await makeRequest('/api/auth/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      adminUserMgmtRes.status === 200 && adminUserMgmtRes.data.success === true,
      'Test 6b: Admin allowed access to /api/auth/users with HTTP 200',
      `Status: ${adminUserMgmtRes.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Investigator and Lab Technician Permission Boundaries
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 7: Role Permission Boundaries (Investigator vs Lab Technician) ---');
    // Lab Technician attempting to create a Case -> Must be blocked (403)
    const labTechCasePostRes = await makeRequest('/api/cases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${labTechToken}` },
      body: { title: 'Unauthorized Case from Lab' },
    });
    const labTechCode = labTechCasePostRes.data?.error?.code;
    assert(
      labTechCasePostRes.status === 403 && labTechCode === 'FORBIDDEN',
      'Test 7a: Lab Technician blocked from Case Creation (/api/cases POST) with HTTP 403',
      `Status: ${labTechCasePostRes.status}, Error Code: ${labTechCode}`
    );

    // Investigator attempting to post Forensic Analysis Findings -> Must be blocked (403)
    const invAnalysisPostRes = await makeRequest('/api/analysis', {
      method: 'POST',
      headers: { Authorization: `Bearer ${investigatorToken}` },
      body: { evidenceId: 1, analystId: 1, findings: 'Unauthorized analysis findings' },
    });
    const invAnalysisCode = invAnalysisPostRes.data?.error?.code;
    assert(
      invAnalysisPostRes.status === 403 && invAnalysisCode === 'FORBIDDEN',
      'Test 7b: Investigator blocked from Forensic Analysis submission (/api/analysis POST) with HTTP 403',
      `Status: ${invAnalysisPostRes.status}, Error Code: ${invAnalysisCode}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Password Hashes Never Appear in API Responses
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 8: Password Hashes Never Appear in API Responses ---');
    const meRes = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersRes = await makeRequest('/api/auth/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    const meString = JSON.stringify(meRes.data);
    const usersString = JSON.stringify(usersRes.data);

    const hashPattern = /\$2[aby]\$\d+\$[./A-Za-z0-9]{53}/;
    const meHasHash = hashPattern.test(meString) || meString.includes('PASSWORD_HASH') || meString.includes('passwordHash');
    const usersHasHash = hashPattern.test(usersString) || usersString.includes('PASSWORD_HASH') || usersString.includes('passwordHash');

    assert(
      !meHasHash && !usersHasHash,
      'Test 8: Password hashes and hash keys are completely absent from /api/auth/me and /api/auth/users',
      `meHasHash: ${meHasHash}, usersHasHash: ${usersHasHash}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Authenticated Profile Fetch & Database Integrity
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 9: Authenticated Profile Fetch & Database Integrity ---');
    assert(
      meRes.status === 200 && meRes.data.data.username === 'Krishan' && meRes.data.data.role === 'Admin',
      'Test 9: /api/auth/me returns authentic user identity from Oracle APP_USER table',
      `User: ${meRes.data?.data?.username}, Role: ${meRes.data?.data?.role}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Logout and Audit Trail Behavior
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 10: Logout and Audit Trail Behavior ---');
    const logoutRes = await makeRequest('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      logoutRes.status === 200 && logoutRes.data.success === true,
      'Test 10a: /api/auth/logout succeeds with HTTP 200',
      `Status: ${logoutRes.status}`
    );

    // Verify that the logout event was recorded in AUDIT_LOG
    const auditRes = await query(
      `SELECT Action, Details FROM AUDIT_LOG WHERE Action = 'LOGOUT' ORDER BY Log_ID DESC`
    );
    assert(
      auditRes.rows && auditRes.rows.length > 0 && auditRes.rows[0].ACTION === 'LOGOUT',
      'Test 10b: Logout event successfully recorded in Oracle AUDIT_LOG table',
      `Latest Action: ${auditRes.rows?.[0]?.ACTION}, Details: ${auditRes.rows?.[0]?.DETAILS}`
    );

  } catch (err) {
    console.error('[UNEXPECTED ERROR DURING TESTS]:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await closeDatabasePool();
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
