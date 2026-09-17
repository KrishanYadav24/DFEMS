-- ============================================================================
-- DFEMS — ORACLE DATABASE 26ai DEMONSTRATION & VERIFICATION QUERIES
-- Database: Oracle AI Database 26ai Free
-- PDB / Service: FREEPDB1
-- Schema / Application User: dfems_user
-- ============================================================================
-- PREREQUISITES:
-- 1. Run database/oracle_schema.sql first.
-- 2. Run database/oracle_programs.sql second.
-- 3. Execute queries below using SQL*Plus or any Oracle client:
--      sqlplus dfems_user@//localhost:1521/FREEPDB1
--      @database/demo_queries.sql
-- ============================================================================

SET SERVEROUTPUT ON;
SET LINESIZE 200;
SET PAGESIZE 100;
SET ECHO ON;

-- ============================================================================
-- SECTION 1: CRUD OPERATIONS DEMONSTRATION (DA2 SECTION 4, SCREENSHOTS 13-14)
-- ============================================================================

-- 1.1. CREATE (Insert new test record)
INSERT INTO APP_USER (First_Name, Last_Name, Phone_Number, Username, Role)
VALUES ('Test', 'User', '9999900000', 'test.user', 'Investigator');
COMMIT;

-- 1.2. READ (Verify inserted test record)
SELECT User_ID, First_Name, Last_Name, Phone_Number, Role, Account_Status
FROM APP_USER
WHERE Phone_Number = '9999900000';

-- 1.3. UPDATE (Modify the test record)
UPDATE APP_USER
SET Last_Name = 'Updated'
WHERE Phone_Number = '9999900000';
COMMIT;

-- 1.4. READ AFTER UPDATE (Verify state change)
SELECT User_ID, First_Name, Last_Name, Phone_Number, Role
FROM APP_USER
WHERE Phone_Number = '9999900000';

-- 1.5. DELETE (Remove test record)
DELETE FROM APP_USER
WHERE Phone_Number = '9999900000';
COMMIT;

-- 1.6. VERIFY DELETION (Must return zero rows)
SELECT * FROM APP_USER
WHERE Phone_Number = '9999900000';


-- ============================================================================
-- SECTION 2: BASIC RETRIEVAL & FILTERING (DA2 SECTION 5, SCREENSHOTS 15-19)
-- ============================================================================

-- 2.1. Inspect Schema & Current Database User
SELECT SYS_CONTEXT('USERENV', 'CURRENT_USER') AS Current_User,
       SYS_CONTEXT('USERENV', 'CON_NAME') AS Pluggable_Database
FROM DUAL;

-- 2.2. List All Tables in Application Schema
SELECT TABLE_NAME 
FROM USER_TABLES 
ORDER BY TABLE_NAME;

-- 2.3. Roster of All Cases
SELECT Case_ID, Title, Status, Created_By, Assigned_To, Location_ID, Crime_Type
FROM CASE_TABLE
ORDER BY Case_ID;

-- 2.4. Distinct Statuses in Evidence Vault
SELECT DISTINCT Status 
FROM EVIDENCE
ORDER BY Status;

-- 2.5. Evidence currently under analysis
SELECT Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value
FROM EVIDENCE
WHERE Status = 'Under Analysis'
ORDER BY Evidence_ID;

-- 2.6. Most recently collected evidence (Top 5 using Oracle 12c+ FETCH FIRST)
SELECT Evidence_ID, Description, Collection_Date, Case_ID, Status
FROM EVIDENCE
ORDER BY Collection_Date DESC, Evidence_ID DESC
FETCH FIRST 5 ROWS ONLY;


-- ============================================================================
-- SECTION 3: MULTI-TABLE JOINS (DA2 SECTION 6, QUERIES A1-A4, SCREENSHOTS 20-22)
-- ============================================================================

-- A1. Evidence with Case Title and Assigned Lead Investigator (DA2 Screenshot 20)
SELECT
    e.Evidence_ID,
    e.Description,
    e.Status,
    c.Title AS Case_Title,
    (u.First_Name || ' ' || u.Last_Name) AS Assigned_Investigator
FROM EVIDENCE e
JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
JOIN APP_USER u ON c.Assigned_To = u.User_ID
ORDER BY c.Case_ID, e.Evidence_ID;

-- A2. Full Chronological Custody Trail for Evidence_ID = 1 (DA2 Screenshot 21)
SELECT
    e.Evidence_ID,
    e.Description,
    cc.Timestamp_At,
    cc.Action
FROM EVIDENCE e
JOIN CHAIN_OF_CUSTODY cc ON cc.Evidence_ID = e.Evidence_ID
WHERE e.Evidence_ID = 1
ORDER BY cc.Timestamp_At;

-- A3. Forensic Findings with Analyst Name and Laboratory (DA2 Screenshot 22)
SELECT
    fa.Analysis_ID,
    e.Description AS Evidence,
    fa.Findings,
    (u.First_Name || ' ' || u.Last_Name) AS Analyst,
    l.Lab_Name
FROM FORENSIC_ANALYSIS fa
JOIN EVIDENCE e ON fa.Evidence_ID = e.Evidence_ID
JOIN FORENSIC_ANALYST fx ON fa.Analyst_ID = fx.User_ID
JOIN APP_USER u ON fx.User_ID = u.User_ID
JOIN LABORATORY l ON fx.Laboratory_ID = l.Laboratory_ID
ORDER BY fa.Analysis_ID;

-- A4. Cases, Incident Locations, and Every Assigned Investigator via Junction (DA2 Screenshot 22)
SELECT
    c.Case_ID,
    c.Title,
    loc.Address,
    (u.First_Name || ' ' || u.Last_Name) AS Investigator
FROM CASE_TABLE c
JOIN LOCATION loc ON c.Location_ID = loc.Location_ID
JOIN ASSIGNED a ON a.Case_ID = c.Case_ID
JOIN APP_USER u ON a.User_ID = u.User_ID
ORDER BY c.Case_ID, u.User_ID;


-- ============================================================================
-- SECTION 4: NESTED QUERIES (DA2 SECTION 7, QUERIES B1-B4, SCREENSHOTS 23-25)
-- ============================================================================

-- B1. Cases with more than 2 evidence items (Correlated Subquery, DA2 Screenshot 23)
SELECT c.Case_ID, c.Title
FROM CASE_TABLE c
WHERE (
    SELECT COUNT(*)
    FROM EVIDENCE e
    WHERE e.Case_ID = c.Case_ID
) > 2;

-- B2. Evidence items belonging to Open cases (IN predicate, DA2 Screenshot 23)
SELECT Evidence_ID, Description, Status
FROM EVIDENCE
WHERE Case_ID IN (
    SELECT Case_ID
    FROM CASE_TABLE
    WHERE Status = 'Open'
)
ORDER BY Evidence_ID;

-- B3. Investigators assigned to more cases than the average investigator (DA2 Screenshot 24)
SELECT
    (u.First_Name || ' ' || u.Last_Name) AS Investigator,
    cnt.Case_Count
FROM (
    SELECT User_ID, COUNT(*) AS Case_Count
    FROM ASSIGNED
    GROUP BY User_ID
) cnt
JOIN APP_USER u ON u.User_ID = cnt.User_ID
WHERE cnt.Case_Count > (
    SELECT AVG(c2)
    FROM (
        SELECT COUNT(*) AS c2
        FROM ASSIGNED
        GROUP BY User_ID
    ) avg_counts
);

-- B4. Evidence with no forensic analysis completed yet (NOT IN, DA2 Screenshot 25)
SELECT Evidence_ID, Description, Status
FROM EVIDENCE
WHERE Evidence_ID NOT IN (
    SELECT Evidence_ID
    FROM FORENSIC_ANALYSIS
)
ORDER BY Evidence_ID;


-- ============================================================================
-- SECTION 5: AGGREGATE FUNCTIONS (DA2 SECTION 8, QUERIES C1-C4, SCREENSHOTS 26-28)
-- ============================================================================

-- C1. Total Evidence Count Per Case (COUNT, GROUP BY, DA2 Screenshot 26)
SELECT
    c.Case_ID,
    c.Title,
    COUNT(e.Evidence_ID) AS Evidence_Count
FROM CASE_TABLE c
LEFT JOIN EVIDENCE e ON e.Case_ID = c.Case_ID
GROUP BY c.Case_ID, c.Title
ORDER BY c.Case_ID;

-- C2. Average days since collection by evidence status (AVG, Date Math, DA2 Screenshot 26)
SELECT
    Status,
    ROUND(AVG(TRUNC(SYSDATE) - TRUNC(Collection_Date)), 1) AS Avg_Days_Since_Collection
FROM EVIDENCE
GROUP BY Status
ORDER BY Avg_Days_Since_Collection DESC;

-- C3. Custody event count per evidence item (COUNT, GROUP BY, DA2 Screenshot 27)
SELECT
    e.Evidence_ID,
    e.Description,
    COUNT(cc.Custody_ID) AS Custody_Events
FROM EVIDENCE e
JOIN CHAIN_OF_CUSTODY cc ON cc.Evidence_ID = e.Evidence_ID
GROUP BY e.Evidence_ID, e.Description
ORDER BY Custody_Events DESC, e.Evidence_ID;

-- C4. Case count and status breakdown per lead investigator (Conditional SUM, DA2 Screenshot 28)
SELECT
    (u.First_Name || ' ' || u.Last_Name) AS Investigator,
    COUNT(*) AS Total_Cases,
    SUM(CASE WHEN c.Status = 'Open' THEN 1 ELSE 0 END) AS Open_Cases,
    SUM(CASE WHEN c.Status = 'Closed' THEN 1 ELSE 0 END) AS Closed_Cases
FROM CASE_TABLE c
JOIN APP_USER u ON c.Assigned_To = u.User_ID
GROUP BY u.First_Name, u.Last_Name;


-- ============================================================================
-- SECTION 6: VIEWS DEMONSTRATION (DA2 SECTION 9, SCREENSHOTS 29-31, 52-53)
-- ============================================================================

-- 6.1. Custody Trail View (Evidence #1 Trail)
SELECT * 
FROM v_custody_trail
WHERE Evidence_ID = 1
ORDER BY Timestamp_At;

-- 6.2. Case Summary View with correlated evidence counts
SELECT * 
FROM v_case_summary
ORDER BY Evidence_Count DESC;

-- 6.3. Polymorphic Evidence Roster (Devices only)
SELECT * 
FROM v_evidence_full
WHERE Evidence_Type = 'Device'
ORDER BY Evidence_ID;


-- ============================================================================
-- SECTION 7: STORED PROCEDURES & PL/SQL EXECUTION (DA2 SEC. 10 & 13)
-- ============================================================================

-- 7.1. Execute Procedure: sp_register_evidence (DA2 Screenshot 32)
-- Uses SQL*Plus Bind Variable for OUT parameter
VARIABLE b_new_evid_id NUMBER;

BEGIN
    sp_register_evidence(
        p_description     => 'Seized secondary backup drive',
        p_collection_date => SYSDATE,
        p_case_id         => 1,
        p_hash_value      => 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        p_new_evidence_id => :b_new_evid_id
    );
END;
/

PRINT b_new_evid_id;

-- Verify newly registered evidence in both EVIDENCE and CHAIN_OF_CUSTODY
SELECT * FROM EVIDENCE WHERE Evidence_ID = :b_new_evid_id;
SELECT * FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = :b_new_evid_id;

-- 7.2. Execute Procedure: sp_add_analysis (DA2 Screenshot 33)
BEGIN
    sp_add_analysis(
        p_evidence_id => :b_new_evid_id,
        p_analyst_id  => 5,
        p_findings    => 'Preliminary inspection complete. File allocation table recovered.'
    );
END;
/

-- Verify evidence status shifted to 'Under Analysis'
SELECT Evidence_ID, Status FROM EVIDENCE WHERE Evidence_ID = :b_new_evid_id;
SELECT * FROM FORENSIC_ANALYSIS WHERE Evidence_ID = :b_new_evid_id;

-- 7.3. Execute Procedure: sp_flag_stale_evidence (CURSOR LOOP, DA2 Screenshots 34, 39, 40)
VARIABLE b_stale_cur REFCURSOR;

BEGIN
    sp_flag_stale_evidence(
        p_threshold => 30,
        p_cursor    => :b_stale_cur
    );
END;
/

PRINT b_stale_cur;


-- ============================================================================
-- SECTION 8: STORED FUNCTIONS DEMONSTRATION (DA2 SECTION 11, SCREENSHOTS 36-38, 54)
-- ============================================================================

-- 8.1. Days in current status for Evidence #1
SELECT fn_days_in_current_status(1) AS Days_In_Current_Status 
FROM DUAL;

-- 8.2. Cryptographic Hash Verification - Success Case (MATCH)
SELECT fn_verify_hash(
    1, 
    'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0'
) AS Hash_Check
FROM DUAL;

-- 8.3. Cryptographic Hash Verification - Tampering Detected (MISMATCH)
SELECT fn_verify_hash(
    1, 
    '0000000000000000000000000000000000000000000000000000000000000000'
) AS Tamper_Check
FROM DUAL;


-- ============================================================================
-- SECTION 9: TRIGGERS & IMMUTABILITY ENFORCEMENT (DA2 SECTION 12, SCREENSHOTS 41-43)
-- ============================================================================

-- 9.1. Test Status Change Trigger (trg_evidence_status_change)
UPDATE EVIDENCE
SET Status = 'Presented in Court'
WHERE Evidence_ID = 1;
COMMIT;

-- Verify automated audit row created in CHAIN_OF_CUSTODY
SELECT * 
FROM CHAIN_OF_CUSTODY
WHERE Evidence_ID = 1
ORDER BY Timestamp_At DESC;

-- 9.2. Test Append-Only Protection: Trigger trg_custody_no_update
-- EXPECTED RESULT: ORA-20001: Chain_of_Custody is append-only: existing entries cannot be modified.
-- UNCOMMENT TO TEST ERROR IN SQL*PLUS:
-- UPDATE CHAIN_OF_CUSTODY SET Action = 'Tampered' WHERE Custody_ID = 1;

-- 9.3. Test Append-Only Protection: Trigger trg_custody_no_delete
-- EXPECTED RESULT: ORA-20002: Chain_of_Custody is append-only: existing entries cannot be deleted.
-- UNCOMMENT TO TEST ERROR IN SQL*PLUS:
-- DELETE FROM CHAIN_OF_CUSTODY WHERE Custody_ID = 1;


-- ============================================================================
-- SECTION 10: TRANSACTIONS & SAVEPOINTS (DA2 SECTION 13, SCREENSHOTS 44-48)
-- ============================================================================

-- 10.1. Execute Procedure: sp_transfer_custody (Success Case)
BEGIN
    sp_transfer_custody(
        p_evidence_id => 2,
        p_new_status  => 'In Storage',
        p_reason      => 'Returned from initial triage'
    );
END;
/

-- Verify custody log updated with transfer reason
SELECT * 
FROM CHAIN_OF_CUSTODY
WHERE Evidence_ID = 2
ORDER BY Timestamp_At DESC;

-- 10.2. Execute Procedure: sp_transfer_custody (Failure with ROLLBACK TO SAVEPOINT)
-- EXPECTED RESULT: ORA-20003: Evidence_ID does not exist.
-- UNCOMMENT TO TEST ERROR HANDLING:
-- BEGIN
--     sp_transfer_custody(9999, 'In Storage', 'Should fail gracefully');
-- END;
-- /

-- 10.3. Explicit Transaction Demonstration (Savepoint, Commit, Rollback)
SAVEPOINT test_point;
UPDATE CASE_TABLE SET Status = 'Closed' WHERE Case_ID = 2;
COMMIT;

SAVEPOINT rollback_point;
UPDATE CASE_TABLE SET Status = 'Closed' WHERE Case_ID = 5;
ROLLBACK TO rollback_point;

-- Expected: Case 2 is Closed; Case 5 remains Open
SELECT Case_ID, Status FROM CASE_TABLE WHERE Case_ID IN (2, 5);


-- ============================================================================
-- SECTION 11: FINAL ROW COUNT & REFERENTIAL INTEGRITY (DA2 SCREENSHOTS 49-54)
-- ============================================================================

SELECT 'APP_USER' AS Table_Name, COUNT(*) AS Row_Count FROM APP_USER
UNION ALL
SELECT 'LABORATORY', COUNT(*) FROM LABORATORY
UNION ALL
SELECT 'INVESTIGATOR', COUNT(*) FROM INVESTIGATOR
UNION ALL
SELECT 'FORENSIC_ANALYST', COUNT(*) FROM FORENSIC_ANALYST
UNION ALL
SELECT 'LOCATION', COUNT(*) FROM LOCATION
UNION ALL
SELECT 'CASE_TABLE', COUNT(*) FROM CASE_TABLE
UNION ALL
SELECT 'ASSIGNED', COUNT(*) FROM ASSIGNED
UNION ALL
SELECT 'EVIDENCE', COUNT(*) FROM EVIDENCE
UNION ALL
SELECT 'DEVICE', COUNT(*) FROM DEVICE
UNION ALL
SELECT 'FILE_RECORD', COUNT(*) FROM FILE_RECORD
UNION ALL
SELECT 'CHAIN_OF_CUSTODY', COUNT(*) FROM CHAIN_OF_CUSTODY
UNION ALL
SELECT 'FORENSIC_ANALYSIS', COUNT(*) FROM FORENSIC_ANALYSIS;

-- Referential Integrity Orphan Check (Must return 0 rows)
SELECT e.Evidence_ID, e.Description
FROM EVIDENCE e
LEFT JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
WHERE c.Case_ID IS NULL;
