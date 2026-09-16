/**
 * DFEMS Backend — Oracle Connectivity & Diagnostic Test Suite
 * Validates Oracle 26ai Free connectivity via Node.js oracledb Thin Mode.
 */

import { testDatabaseConnectivity, closeDatabasePool, query } from '../src/config/database.js';
import { getSafeConfig } from '../src/config/env.js';

async function runDiagnostics() {
  console.log('================================================================');
  console.log('DFEMS BACKEND — ORACLE CONNECTIVITY DIAGNOSTICS');
  console.log('================================================================');
  console.log('Environment Configuration (Safe View):');
  console.log(JSON.stringify(getSafeConfig(), null, 2));
  console.log('----------------------------------------------------------------');

  console.log('Testing connectivity against Oracle service FREEPDB1...');
  const health = await testDatabaseConnectivity();

  if (health.connected) {
    console.log('>>> [SUCCESS] Connection established successfully to Oracle 26ai!');
    console.log(`    Service:        ${health.service}`);
    console.log(`    User:           ${health.user}`);
    console.log(`    Latency:        ${health.latencyMs} ms`);
    console.log(`    Server Time:    ${health.serverTime}`);
    console.log(`    Open Conns:     ${health.poolStats?.openConnections}`);
    console.log(`    In Use Conns:   ${health.poolStats?.inUseConnections}`);

    // Test a basic parameterized query using Oracle dual
    console.log('----------------------------------------------------------------');
    console.log('Testing parameterized query with bind variable (:num)...');
    try {
      const qResult = await query('SELECT :num * 2 AS RESULT FROM DUAL', { num: 21 });
      console.log('>>> [SUCCESS] Bind variable test passed: 21 * 2 =', qResult.rows?.[0]?.RESULT);
    } catch (qErr) {
      console.error('>>> [FAILED] Bind variable test failed:', qErr.message);
    }
  } else {
    console.log('>>> [NOTICE] Oracle database connection test failed or returned error:');
    console.log(`    Service:        ${health.service}`);
    console.log(`    User:           ${health.user}`);
    console.log(`    Oracle Code:    ${health.code}`);
    console.log(`    Detail Message: ${health.error}`);
    console.log('----------------------------------------------------------------');
    if (health.error?.includes('ORA-01017')) {
      console.log('>>> DIAGNOSIS: ORA-01017 invalid credentials.');
      console.log('    The database service is running on port 1521, but the DB_PASSWORD in backend/.env');
      console.log('    does not match the password assigned to dfems_user in FREEPDB1.');
      console.log('    Update DB_PASSWORD in backend/.env with your valid password.');
    } else if (health.error?.includes('ORA-12541')) {
      console.log('>>> DIAGNOSIS: ORA-12541 No listener.');
      console.log('    Oracle listener is not running on localhost:1521. Start the Oracle service.');
    } else {
      console.log('>>> DIAGNOSIS: Connection error. Check Oracle status and configuration.');
    }
  }

  console.log('----------------------------------------------------------------');
  console.log('Closing database connection pool...');
  await closeDatabasePool();
  console.log('Diagnostics complete.');
  console.log('================================================================');
}

runDiagnostics().catch((err) => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
