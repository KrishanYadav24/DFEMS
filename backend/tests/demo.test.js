/**
 * DFEMS — Phase 7 Oracle SQL & PL/SQL Demonstrations Automated Test Suite
 * Validates all 8 categories required by DA2 and MASTER_PROJECT_SPEC.md:
 * 1. Schema Catalog & Constraint Verification (PK, FK, Unique, Check, Safe DDL)
 * 2. Safe CRUD Operations with dedicated test records and 0-row verification
 * 3. Multi-table Joins, Correlated Subqueries, Grouping, Aggregates & Sorting
 * 4. Views (v_custody_trail, v_case_summary, v_evidence_full), Sequences & Indexes
 * 5. PL/SQL Stored Procedures & Functions (fn_verify_hash, sp_flag_stale_evidence, etc.)
 * 6. Triggers & Forensic Immutability Enforcement (trg_custody_no_update, trg_custody_no_delete)
 * 7. Transaction Integrity, Savepoints, Partial Rollback & Exception Handling
 * 8. Referential Integrity & Meaningful Constraint Violations (ORA-02291, ORA-02290, ORA-00001, ORA-01400)
 */

import oracledb from 'oracledb';
import { query, withTransaction, closeDatabasePool } from '../src/config/database.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('DFEMS — PHASE 7 ORACLE SQL & PL/SQL AUTOMATED DEMONSTRATIONS');
  console.log('Target Service: localhost:1521/FREEPDB1 | User: dfems_user');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // CATEGORY 1: Schema Catalog & Constraints
    // -------------------------------------------------------------------------
    console.log('--- Category 1: Schema Catalog & Constraints Verification ---');

    // 1.1 Table verification
    const tablesRes = await query(`
      SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME
    `);
    const tableNames = tablesRes.rows.map((r) => r.TABLE_NAME);
    const expectedTables = [
      'APP_USER',
      'ASSIGNED',
      'AUDIT_LOG',
      'CASE_TABLE',
      'CHAIN_OF_CUSTODY',
      'DEVICE',
      'EVIDENCE',
      'FILE_RECORD',
      'FORENSIC_ANALYSIS',
      'FORENSIC_ANALYST',
      'INVESTIGATOR',
      'LABORATORY',
      'LOCATION',
    ];
    const missingTables = expectedTables.filter((t) => !tableNames.includes(t));
    assert(missingTables.length === 0, `All 13 application tables exist in USER_TABLES (Found: ${tableNames.length})`);

    // 1.2 Primary & Unique Constraints
    const pkRes = await query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, CONSTRAINT_TYPE 
      FROM USER_CONSTRAINTS 
      WHERE CONSTRAINT_TYPE IN ('P', 'U')
    `);
    assert(pkRes.rows.length >= 13, `Catalog has >= 13 Primary & Unique constraints (Found: ${pkRes.rows.length})`);

    // 1.3 Foreign Key Constraints
    const fkRes = await query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME, DELETE_RULE 
      FROM USER_CONSTRAINTS 
      WHERE CONSTRAINT_TYPE = 'R'
    `);
    assert(fkRes.rows.length >= 12, `Catalog has >= 12 Foreign Key constraints (Found: ${fkRes.rows.length})`);

    // 1.4 Check Constraints
    const chkRes = await query(`
      SELECT CONSTRAINT_NAME, TABLE_NAME 
      FROM USER_CONSTRAINTS 
      WHERE CONSTRAINT_TYPE = 'C' AND CONSTRAINT_NAME NOT LIKE 'SYS_%'
    `);
    assert(chkRes.rows.length >= 4, `Catalog has >= 4 explicit Check constraints (Found: ${chkRes.rows.length})`);

    // 1.5 Safe DDL Table Creation and Teardown
    await query(`
      BEGIN
        EXECUTE IMMEDIATE '
          CREATE TABLE DEMO_NODE_VAULT (
            Vault_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            Code     VARCHAR2(30 CHAR) NOT NULL UNIQUE
          )
        ';
      END;
    `);
    const tempCheck = await query(`SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME = 'DEMO_NODE_VAULT'`);
    assert(tempCheck.rows.length === 1, 'Safe DDL creation: DEMO_NODE_VAULT registered in Oracle catalog');
    await query(`DROP TABLE DEMO_NODE_VAULT PURGE`);
    const tempPostCheck = await query(`SELECT TABLE_NAME FROM USER_TABLES WHERE TABLE_NAME = 'DEMO_NODE_VAULT'`);
    assert(tempPostCheck.rows.length === 0, 'Safe DDL teardown: DEMO_NODE_VAULT dropped cleanly without residual footprint');

    // -------------------------------------------------------------------------
    // CATEGORY 2: Safe CRUD Operations
    // -------------------------------------------------------------------------
    console.log('\n--- Category 2: Safe CRUD Operations (Dedicated Test Records) ---');

    // 2.1 CREATE (INSERT)
    const testAddress = '999 NODE_TEST_LOCATION_STREET_' + Date.now();
    await query(`INSERT INTO LOCATION (Address) VALUES (:addr)`, { addr: testAddress });
    const locRead = await query(`SELECT Location_ID, Address FROM LOCATION WHERE Address = :addr`, { addr: testAddress });
    assert(locRead.rows.length === 1, `CREATE (INSERT) verified in LOCATION: ID = ${locRead.rows[0].LOCATION_ID}`);
    const testLocId = locRead.rows[0].LOCATION_ID;

    // 2.2 READ (SELECT)
    const testUsername = 'demo.crud.node.' + Date.now();
    const testPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
    await query(`
      INSERT INTO APP_USER (First_Name, Last_Name, Phone_Number, Username, Role)
      VALUES ('NodeTester', 'CRUD', :phone, :uname, 'Investigator')
    `, { phone: testPhone, uname: testUsername });

    const userRead = await query(`
      SELECT User_ID, First_Name, Last_Name, Phone_Number, Role, Account_Status
      FROM APP_USER
      WHERE Username = :uname
    `, { uname: testUsername });
    assert(userRead.rows.length === 1 && userRead.rows[0].ROLE === 'Investigator', 'READ (SELECT) verified on APP_USER');
    const testUserId = userRead.rows[0].USER_ID;

    // 2.3 UPDATE
    await query(`
      UPDATE APP_USER
      SET Last_Name = 'UpdatedExaminer', Account_Status = 'Active'
      WHERE User_ID = :id
    `, { id: testUserId });

    const userUpdated = await query(`
      SELECT Last_Name, Account_Status FROM APP_USER WHERE User_ID = :id
    `, { id: testUserId });
    assert(userUpdated.rows[0].LAST_NAME === 'UpdatedExaminer', 'UPDATE verified: Last_Name updated to "UpdatedExaminer"');

    // 2.4 DELETE & Zero-Row Verification
    await query(`DELETE FROM APP_USER WHERE User_ID = :id`, { id: testUserId });
    await query(`DELETE FROM LOCATION WHERE Location_ID = :id`, { id: testLocId });

    const verifyUserDel = await query(`SELECT COUNT(*) AS CNT FROM APP_USER WHERE User_ID = :id`, { id: testUserId });
    const verifyLocDel = await query(`SELECT COUNT(*) AS CNT FROM LOCATION WHERE Location_ID = :id`, { id: testLocId });
    assert(verifyUserDel.rows[0].CNT === 0 && verifyLocDel.rows[0].CNT === 0, 'DELETE verified: Zero residual test records');

    // -------------------------------------------------------------------------
    // CATEGORY 3: Joins, Subqueries, Aggregates & Sorting
    // -------------------------------------------------------------------------
    console.log('\n--- Category 3: Joins, Subqueries, Grouping & Aggregates ---');

    // 3.1 Multi-table Join
    const joinRes = await query(`
      SELECT
        e.Evidence_ID,
        e.Description,
        e.Status,
        c.Title AS Case_Title,
        NVL(u.First_Name || ' ' || u.Last_Name, 'Unassigned') AS Investigator_Name
      FROM EVIDENCE e
      JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
      LEFT JOIN INVESTIGATOR i ON c.Assigned_To = i.User_ID
      LEFT JOIN APP_USER u ON i.User_ID = u.User_ID
      ORDER BY e.Evidence_ID
      FETCH FIRST 5 ROWS ONLY
    `);
    assert(joinRes.rows.length > 0, `Multi-table Join (EVIDENCE + CASE + USER) returned ${joinRes.rows.length} rows`);

    // 3.2 Correlated Subquery (EXISTS)
    const subqueryRes = await query(`
      SELECT c.Case_ID, c.Title
      FROM CASE_TABLE c
      WHERE EXISTS (
        SELECT 1
        FROM EVIDENCE e
        WHERE e.Case_ID = c.Case_ID
      )
      ORDER BY c.Case_ID
    `);
    assert(subqueryRes.rows.length > 0, `Correlated Subquery (EXISTS) returned ${subqueryRes.rows.length} cases with evidence`);

    // 3.3 IN Subquery
    const inSubqueryRes = await query(`
      SELECT e.Evidence_ID, e.Description, e.Status
      FROM EVIDENCE e
      WHERE e.Case_ID IN (
        SELECT c.Case_ID
        FROM CASE_TABLE c
        WHERE c.Status IN ('Open', 'Under Investigation')
      )
      ORDER BY e.Evidence_ID
    `);
    assert(Array.isArray(inSubqueryRes.rows), `IN Subquery on active cases returned ${inSubqueryRes.rows.length} items`);

    // 3.4 Aggregates & Group By (COUNT, MIN, MAX)
    const aggRes = await query(`
      SELECT
        c.Case_ID,
        c.Title,
        COUNT(e.Evidence_ID) AS Total_Evidence,
        MIN(e.Collection_Date) AS Earliest_Intake
      FROM CASE_TABLE c
      LEFT JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
      GROUP BY c.Case_ID, c.Title
      ORDER BY Total_Evidence DESC
    `);
    assert(aggRes.rows.length > 0, `Aggregate query (GROUP BY, COUNT, MIN) returned ${aggRes.rows.length} groups`);

    // 3.5 Sorting and Oracle 26ai Pagination (OFFSET / FETCH NEXT)
    const pageRes = await query(`
      SELECT Case_ID, Title, Status
      FROM CASE_TABLE
      ORDER BY Case_ID DESC
      OFFSET 0 ROWS FETCH NEXT 3 ROWS ONLY
    `);
    assert(pageRes.rows.length <= 3 && pageRes.rows.length > 0, `Oracle 26ai pagination (OFFSET 0 FETCH NEXT 3) returned ${pageRes.rows.length} rows`);

    // -------------------------------------------------------------------------
    // CATEGORY 4: Views, Sequences & Indexes
    // -------------------------------------------------------------------------
    console.log('\n--- Category 4: Views, Sequences & Indexes ---');

    // 4.1 Views
    const vCustody = await query(`SELECT * FROM v_custody_trail FETCH FIRST 3 ROWS ONLY`);
    assert(vCustody.rows.length > 0, `View v_custody_trail returned ${vCustody.rows.length} rows`);

    const vCase = await query(`SELECT * FROM v_case_summary FETCH FIRST 3 ROWS ONLY`);
    assert(vCase.rows.length > 0, `View v_case_summary returned ${vCase.rows.length} rows`);

    const vEvid = await query(`SELECT * FROM v_evidence_full FETCH FIRST 3 ROWS ONLY`);
    assert(vEvid.rows.length > 0, `View v_evidence_full returned ${vEvid.rows.length} rows`);

    // 4.2 Identity Columns / Sequences
    const identityRes = await query(`
      SELECT TABLE_NAME, COLUMN_NAME, GENERATION_TYPE 
      FROM USER_TAB_IDENTITY_COLS 
      ORDER BY TABLE_NAME
    `);
    assert(identityRes.rows.length >= 7, `USER_TAB_IDENTITY_COLS has >= 7 auto-increment identity columns (Found: ${identityRes.rows.length})`);

    // 4.3 Indexes
    const idxRes = await query(`
      SELECT INDEX_NAME, TABLE_NAME, UNIQUENESS 
      FROM USER_INDEXES 
      WHERE INDEX_NAME LIKE 'IDX_%'
    `);
    assert(idxRes.rows.length >= 10, `USER_INDEXES has >= 10 explicit performance indexes (Found: ${idxRes.rows.length})`);

    // -------------------------------------------------------------------------
    // CATEGORY 5: PL/SQL Procedures and Functions
    // -------------------------------------------------------------------------
    console.log('\n--- Category 5: PL/SQL Procedures and Functions ---');

    // 5.1 Function fn_days_in_current_status
    const fnDaysRes = await query(`
      SELECT fn_days_in_current_status(1) AS DAYS_IN_STATUS FROM DUAL
    `);
    assert(typeof fnDaysRes.rows[0].DAYS_IN_STATUS === 'number', `Function fn_days_in_current_status(1) returned: ${fnDaysRes.rows[0].DAYS_IN_STATUS} days`);

    // 5.2 Function fn_verify_hash (Match vs Mismatch)
    const validEvidence = await query(`
      SELECT Evidence_ID, Hash_Value FROM EVIDENCE WHERE Hash_Value IS NOT NULL FETCH FIRST 1 ROWS ONLY
    `);
    if (validEvidence.rows.length > 0) {
      const eid = validEvidence.rows[0].EVIDENCE_ID;
      const realHash = validEvidence.rows[0].HASH_VALUE;

      const matchCheck = await query(`
        SELECT fn_verify_hash(:id, :h) AS RESULT FROM DUAL
      `, { id: eid, h: realHash });
      assert(matchCheck.rows[0].RESULT === 'MATCH', `fn_verify_hash MATCH test returned: ${matchCheck.rows[0].RESULT}`);

      const tamperCheck = await query(`
        SELECT fn_verify_hash(:id, :h) AS RESULT FROM DUAL
      `, { id: eid, h: '0000000000000000000000000000000000000000000000000000000000000000' });
      assert(tamperCheck.rows[0].RESULT === 'MISMATCH - POSSIBLE TAMPERING', `fn_verify_hash TAMPER test returned: ${tamperCheck.rows[0].RESULT}`);
    }

    // 5.3 Stored Procedure sp_register_evidence
    let newEvidId = null;
    await withTransaction(async (conn) => {
      const minCase = await conn.execute(`SELECT MIN(Case_ID) AS CID FROM CASE_TABLE`);
      const cid = minCase.rows[0].CID ?? minCase.rows[0][0];

      const bindVars = {
        p_desc: 'NODE_TEST_SEIZED_FLASH_DRIVE',
        p_date: new Date(),
        p_case: cid,
        p_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        p_out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
      };

      const procResult = await conn.execute(`
        BEGIN
          sp_register_evidence(
            p_description     => :p_desc,
            p_collection_date => :p_date,
            p_case_id         => :p_case,
            p_hash_value      => :p_hash,
            p_new_evidence_id => :p_out_id
          );
        END;
      `, bindVars);

      newEvidId = procResult.outBinds.p_out_id;
    });

    assert(newEvidId !== null && newEvidId > 0, `Stored Procedure sp_register_evidence executed successfully, assigned Evidence_ID = ${newEvidId}`);

    // Verify initial custody record was written atomically
    const cocInitial = await query(`SELECT COUNT(*) AS CNT FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = :id`, { id: newEvidId });
    assert(cocInitial.rows[0].CNT >= 1, `Atomic Chain of Custody record registered (Count = ${cocInitial.rows[0].CNT})`);

    // 5.4 Stored Procedure sp_flag_stale_evidence (REF CURSOR)
    await withTransaction(async (conn) => {
      const cursorBinds = {
        p_threshold: 0,
        p_cursor: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
      };
      const curResult = await conn.execute(`
        BEGIN
          sp_flag_stale_evidence(
            p_threshold => :p_threshold,
            p_cursor    => :p_cursor
          );
        END;
      `, cursorBinds);

      const resultSet = curResult.outBinds.p_cursor;
      const rows = await resultSet.getRows(5);
      await resultSet.close();
      assert(rows.length > 0, `Procedure sp_flag_stale_evidence returned open SYS_REFCURSOR with ${rows.length} rows`);
    });

    // -------------------------------------------------------------------------
    // CATEGORY 6: Triggers & Forensic Immutability Enforcement
    // -------------------------------------------------------------------------
    console.log('\n--- Category 6: Triggers & Forensic Immutability Enforcement ---');

    // 6.1 Status Change Trigger trg_evidence_status_change
    await query(`
      UPDATE EVIDENCE
      SET Status = 'Under Analysis'
      WHERE Evidence_ID = :id
    `, { id: newEvidId });

    const auditTrail = await query(`
      SELECT Action FROM CHAIN_OF_CUSTODY
      WHERE Evidence_ID = :id AND Action LIKE 'Status changed%'
    `, { id: newEvidId });
    assert(auditTrail.rows.length >= 1, `Trigger trg_evidence_status_change fired automatically: "${auditTrail.rows[0].ACTION}"`);

    // 6.2 Append-Only UPDATE Block: trg_custody_no_update (ORA-20001)
    let updateBlocked = false;
    try {
      const cocRow = await query(`SELECT MIN(Custody_ID) AS CID FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = :id`, { id: newEvidId });
      await query(`
        UPDATE CHAIN_OF_CUSTODY
        SET Action = 'TAMPERED_ACTION_ATTEMPT'
        WHERE Custody_ID = :cid
      `, { cid: cocRow.rows[0].CID });
    } catch (err) {
      if (err.message.includes('ORA-20001')) {
        updateBlocked = true;
      }
    }
    assert(updateBlocked, 'Trigger trg_custody_no_update blocked UPDATE with expected ORA-20001 (Append-Only Enforced)');

    // 6.3 Append-Only DELETE Block: trg_custody_no_delete (ORA-20002)
    let deleteBlocked = false;
    try {
      const cocRow = await query(`SELECT MIN(Custody_ID) AS CID FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = :id`, { id: newEvidId });
      await query(`
        DELETE FROM CHAIN_OF_CUSTODY
        WHERE Custody_ID = :cid
      `, { cid: cocRow.rows[0].CID });
    } catch (err) {
      if (err.message.includes('ORA-20002')) {
        deleteBlocked = true;
      }
    }
    assert(deleteBlocked, 'Trigger trg_custody_no_delete blocked DELETE with expected ORA-20002 (Immutability Enforced)');

    // -------------------------------------------------------------------------
    // CATEGORY 7: Transactions & Exception Handling
    // -------------------------------------------------------------------------
    console.log('\n--- Category 7: Transactions, Savepoints & Exception Handling ---');

    await withTransaction(async (conn) => {
      // Create test case
      const insRes = await conn.execute(`
        INSERT INTO CASE_TABLE (Title, Status, Created_By, Crime_Type)
        VALUES ('NODE_TX_TEST_CASE', 'Open', 1, 'Transactional Audit')
        RETURNING Case_ID INTO :cid
      `, { cid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } });
      const cid = insRes.outBinds.cid[0];

      // Savepoint 1
      await conn.execute(`SAVEPOINT sp_step1`);

      // Legitimate update
      await conn.execute(`
        UPDATE CASE_TABLE SET Status = 'Under Investigation' WHERE Case_ID = :cid
      `, { cid });

      // Savepoint 2
      await conn.execute(`SAVEPOINT sp_step2`);

      // Simulated failure handled with ROLLBACK TO sp_step2
      try {
        await conn.execute(`
          UPDATE CASE_TABLE SET Status = 'VALUE_WAY_TOO_LONG_FOR_COLUMN_STATUS' WHERE Case_ID = :cid
        `, { cid });
      } catch (_) {
        await conn.execute(`ROLLBACK TO sp_step2`);
      }

      // Verify that step 1 update survived partial rollback
      const checkRes = await conn.execute(`
        SELECT Status FROM CASE_TABLE WHERE Case_ID = :cid
      `, { cid });
      assert((checkRes.rows[0].STATUS ?? checkRes.rows[0][0]) === 'Under Investigation', 'Transaction Integrity: Intermediate update survived partial ROLLBACK TO SAVEPOINT');

      // Clean up test case
      await conn.execute(`DELETE FROM CASE_TABLE WHERE Case_ID = :cid`, { cid });
    });

    // -------------------------------------------------------------------------
    // CATEGORY 8: Referential Integrity & Meaningful Constraint Violations
    // -------------------------------------------------------------------------
    console.log('\n--- Category 8: Referential Integrity & Constraint Violations ---');

    // 8.1 Foreign Key Constraint Violation (ORA-02291)
    let fkFailed = false;
    try {
      await query(`
        INSERT INTO EVIDENCE (Description, Case_ID, Status)
        VALUES ('ORPHAN_ITEM', 9999999, 'Collected')
      `);
    } catch (err) {
      if (err.message.includes('ORA-02291')) fkFailed = true;
    }
    assert(fkFailed, 'Foreign Key Constraint caught expected ORA-02291 (Referencing non-existent Case_ID)');

    // 8.2 Check Constraint Violation (ORA-02290)
    let chkFailed = false;
    try {
      await query(`
        INSERT INTO EVIDENCE (Description, Case_ID, Status)
        VALUES ('ILLEGAL_STATUS_ITEM', 1, 'Destroyed')
      `);
    } catch (err) {
      if (err.message.includes('ORA-02290')) chkFailed = true;
    }
    assert(chkFailed, 'Check Constraint chk_evidence_status caught expected ORA-02290 (Status="Destroyed" prohibited)');

    // 8.3 Unique Constraint Violation (ORA-00001)
    let uqFailed = false;
    try {
      await query(`
        INSERT INTO APP_USER (First_Name, Last_Name, Username, Role)
        VALUES ('Admin', 'Clone', 'Krishan', 'Investigator')
      `);
    } catch (err) {
      if (err.message.includes('ORA-00001')) uqFailed = true;
    }
    assert(uqFailed, 'Unique Constraint uq_app_user_username caught expected ORA-00001 (Duplicate Username="Krishan")');

    // 8.4 NOT NULL Constraint Violation (ORA-01400)
    let notNullFailed = false;
    try {
      await query(`
        INSERT INTO CASE_TABLE (Title, Status, Created_By)
        VALUES (NULL, 'Open', 1)
      `);
    } catch (err) {
      if (err.message.includes('ORA-01400')) notNullFailed = true;
    }
    assert(notNullFailed, 'NOT NULL Constraint caught expected ORA-01400 (NULL Case Title prohibited)');

    // 8.5 Referential Integrity Orphan Audit
    const orphanCheck = await query(`
      SELECT 
        'EVIDENCE Without Case' AS Check_Type, COUNT(*) AS Orphan_Count
      FROM EVIDENCE e
      LEFT JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
      WHERE c.Case_ID IS NULL
      UNION ALL
      SELECT 
        'CHAIN_OF_CUSTODY Without Evidence', COUNT(*)
      FROM CHAIN_OF_CUSTODY coc
      LEFT JOIN EVIDENCE e ON coc.Evidence_ID = e.Evidence_ID
      WHERE e.Evidence_ID IS NULL
    `);
    const totalOrphans = orphanCheck.rows.reduce((sum, r) => sum + r.ORPHAN_COUNT, 0);
    assert(totalOrphans === 0, `Referential Integrity Audit: 0 orphan records found across all forensic relationships`);

    console.log('\n================================================================');
    console.log(`PHASE 7 DEMONSTRATION SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('ALL 8 ORACLE DEMONSTRATION REQUIREMENTS FULLY VERIFIED.');
    console.log('================================================================\n');
  } catch (error) {
    console.error('Demonstration suite halted with error:', error);
    process.exitCode = 1;
  } finally {
    await closeDatabasePool();
  }
}

runTests();
