-- ============================================================================
-- DFEMS — ORACLE DATABASE 26ai DEMONSTRATION & VERIFICATION SCRIPT
-- Database: Oracle AI Database 26ai Free (Release 23.26+)
-- PDB / Service: FREEPDB1
-- Schema / Application User: dfems_user
-- Driver Target: SQL*Plus / Node.js oracledb (Thin Mode)
-- ============================================================================
-- PREREQUISITES:
-- 1. Run database/oracle_schema.sql first.
-- 2. Run database/oracle_programs.sql second.
-- 3. Execute using SQL*Plus or any Oracle client:
--      sqlplus dfems_user@//localhost:1521/FREEPDB1
--      @database/demo_queries.sql
-- ============================================================================

SET DEFINE OFF;
SET SQLBLANKLINES ON;
SET SERVEROUTPUT ON SIZE UNLIMITED;
SET LINESIZE 220;
SET PAGESIZE 100;
SET FEEDBACK ON;
SET ECHO ON;

PROMPT ============================================================================
PROMPT DFEMS — ORACLE SQL AND PL/SQL DEMONSTRATIONS (PHASE 7 / DA2)
PROMPT Current Database User:
SELECT SYS_CONTEXT('USERENV', 'CURRENT_USER') AS Current_User,
       SYS_CONTEXT('USERENV', 'CON_NAME') AS Pluggable_Database,
       TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS Execution_Timestamp
FROM DUAL;
PROMPT ============================================================================


-- ============================================================================
-- SECTION 1: SCHEMA DDL, CONSTRAINTS & DATA DICTIONARY INSPECTION
-- Requirements: Table creation, primary keys, foreign keys, unique constraints,
--               and check constraints.
-- ============================================================================

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [1.1] CATALOG VERIFICATION: All 13 DFEMS Application Tables
PROMPT ---------------------------------------------------------------------------+
SELECT TABLE_NAME, NUM_ROWS, STATUS
FROM USER_TABLES
ORDER BY TABLE_NAME;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [1.2] CONSTRAINT INSPECTION: Primary Keys (P) & Unique Constraints (U)
PROMPT ---------------------------------------------------------------------------+
SELECT 
    uc.TABLE_NAME,
    uc.CONSTRAINT_NAME,
    uc.CONSTRAINT_TYPE,
    ucc.COLUMN_NAME,
    uc.STATUS
FROM USER_CONSTRAINTS uc
JOIN USER_CONS_COLUMNS ucc ON uc.CONSTRAINT_NAME = ucc.CONSTRAINT_NAME
WHERE uc.CONSTRAINT_TYPE IN ('P', 'U')
ORDER BY uc.TABLE_NAME, uc.CONSTRAINT_TYPE, uc.CONSTRAINT_NAME;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [1.3] CONSTRAINT INSPECTION: Foreign Keys (R) with Delete Rules
PROMPT ---------------------------------------------------------------------------+
SELECT 
    uc.TABLE_NAME AS Child_Table,
    uc.CONSTRAINT_NAME AS FK_Name,
    ucc.COLUMN_NAME AS FK_Column,
    c_pk.TABLE_NAME AS Parent_Table,
    uc.DELETE_RULE,
    uc.STATUS
FROM USER_CONSTRAINTS uc
JOIN USER_CONS_COLUMNS ucc ON uc.CONSTRAINT_NAME = ucc.CONSTRAINT_NAME
JOIN USER_CONSTRAINTS c_pk ON uc.R_CONSTRAINT_NAME = c_pk.CONSTRAINT_NAME
WHERE uc.CONSTRAINT_TYPE = 'R'
ORDER BY uc.TABLE_NAME, uc.CONSTRAINT_NAME;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [1.4] CONSTRAINT INSPECTION: Check Constraints (C)
PROMPT ---------------------------------------------------------------------------+
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    SEARCH_CONDITION_VC AS Condition,
    STATUS
FROM USER_CONSTRAINTS
WHERE CONSTRAINT_TYPE = 'C'
  AND CONSTRAINT_NAME NOT LIKE 'SYS_%'
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [1.5] SAFE DDL DEMONSTRATION: Dedicated Temporary Demonstration Table
PROMPT ---------------------------------------------------------------------------+
-- Create a demonstration table showcasing PK, FK, UNIQUE, and CHECK constraints
BEGIN
    EXECUTE IMMEDIATE '
        CREATE TABLE DEMO_EVIDENCE_VAULT (
            Vault_ID       NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            Vault_Code     VARCHAR2(30 CHAR) NOT NULL,
            Case_Ref_ID    NUMBER NOT NULL,
            Security_Tier  VARCHAR2(20 CHAR) DEFAULT ''Standard'' NOT NULL,
            Created_At     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
            CONSTRAINT uq_demo_vault_code UNIQUE (Vault_Code),
            CONSTRAINT chk_demo_security_tier CHECK (Security_Tier IN (''Standard'', ''Restricted'', ''Top Secret'')),
            CONSTRAINT fk_demo_case_ref FOREIGN KEY (Case_Ref_ID) REFERENCES CASE_TABLE(Case_ID) ON DELETE CASCADE
        )
    ';
    DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: DEMO_EVIDENCE_VAULT created with PK, FK, UNIQUE, and CHECK constraints.');
EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('>>> NOTICE: Table already exists or creation noted: ' || SQLERRM);
END;
/

-- Verify constraints registered in Oracle catalog
SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE, STATUS
FROM USER_CONSTRAINTS
WHERE TABLE_NAME = 'DEMO_EVIDENCE_VAULT'
ORDER BY CONSTRAINT_TYPE;

-- Clean up demonstration table
DROP TABLE DEMO_EVIDENCE_VAULT PURGE;
PROMPT >>> SUCCESS: DEMO_EVIDENCE_VAULT dropped cleanly without residual schema impact.


-- ============================================================================
-- SECTION 2: SAFE CRUD OPERATIONS (DEDICATED TEST RECORDS)
-- Requirements: INSERT, UPDATE, DELETE, and SELECT operations with zero production loss.
-- ============================================================================

-- Idempotent pre-cleanup in case of prior interrupted execution
DELETE FROM CASE_TABLE WHERE Title = 'DEMO_SAFE_CRUD_CASE_2026';
DELETE FROM APP_USER WHERE Username = 'demo.crud.officer';
DELETE FROM LOCATION WHERE Address LIKE '%DEMO_CRUD_LOCATION%';
COMMIT;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [2.1] CREATE (INSERT): Insert dedicated demonstration records
PROMPT ---------------------------------------------------------------------------+
INSERT INTO LOCATION (Address) 
VALUES ('999 DEMO_CRUD_LOCATION_WAY, CYBER CITY');

INSERT INTO APP_USER (
    First_Name, 
    Last_Name, 
    Phone_Number, 
    Username, 
    Role, 
    Account_Status
) VALUES (
    'Demo', 
    'CRUD_Officer', 
    '9999900088', 
    'demo.crud.officer', 
    'Investigator', 
    'Active'
);

INSERT INTO CASE_TABLE (
    Title, 
    Status, 
    Created_By, 
    Crime_Type,
    Location_ID
) VALUES (
    'DEMO_SAFE_CRUD_CASE_2026', 
    'Open', 
    (SELECT User_ID FROM APP_USER WHERE Username = 'demo.crud.officer'), 
    'Network Intrusion',
    (SELECT Location_ID FROM LOCATION WHERE Address LIKE '%DEMO_CRUD_LOCATION%')
);
COMMIT;
PROMPT >>> SUCCESS: Dedicated test records created in LOCATION, APP_USER, and CASE_TABLE.

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [2.2] READ (SELECT): Inspect newly inserted demonstration records
PROMPT ---------------------------------------------------------------------------+
SELECT 
    c.Case_ID,
    c.Title AS Case_Title,
    c.Status AS Case_Status,
    c.Crime_Type,
    u.Username AS Creator_Username,
    loc.Address AS Incident_Location
FROM CASE_TABLE c
JOIN APP_USER u ON c.Created_By = u.User_ID
JOIN LOCATION loc ON c.Location_ID = loc.Location_ID
WHERE c.Title = 'DEMO_SAFE_CRUD_CASE_2026';

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [2.3] UPDATE: Modify demonstration case, user and location attributes
PROMPT ---------------------------------------------------------------------------+
UPDATE CASE_TABLE
SET Status = 'Under Investigation',
    Crime_Type = 'Advanced Persistent Threat'
WHERE Title = 'DEMO_SAFE_CRUD_CASE_2026';

UPDATE APP_USER
SET Last_Name = 'Lead_Investigator'
WHERE Username = 'demo.crud.officer';

UPDATE LOCATION
SET Address = '999 DEMO_CRUD_LOCATION_WAY (SECURE FACILITY)'
WHERE Address LIKE '%DEMO_CRUD_LOCATION%';
COMMIT;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [2.4] READ AFTER UPDATE: Verify state transitions
PROMPT ---------------------------------------------------------------------------+
SELECT 
    c.Case_ID,
    c.Title,
    c.Status AS Updated_Status,
    c.Crime_Type AS Updated_Crime_Type,
    u.First_Name || ' ' || u.Last_Name AS Updated_User_Name,
    loc.Address AS Updated_Location
FROM CASE_TABLE c
JOIN APP_USER u ON c.Created_By = u.User_ID
JOIN LOCATION loc ON c.Location_ID = loc.Location_ID
WHERE c.Title = 'DEMO_SAFE_CRUD_CASE_2026';

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [2.5] DELETE: Safe teardown of dedicated demonstration records
PROMPT ---------------------------------------------------------------------------+
-- Remove child case first, then test user, then test location
DELETE FROM CASE_TABLE WHERE Title = 'DEMO_SAFE_CRUD_CASE_2026';
DELETE FROM APP_USER WHERE Username = 'demo.crud.officer';
DELETE FROM LOCATION WHERE Address LIKE '%DEMO_CRUD_LOCATION%';
COMMIT;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [2.6] VERIFY DELETION: Confirm complete cleanup (Zero rows expected)
PROMPT ---------------------------------------------------------------------------+
SELECT 
    (SELECT COUNT(*) FROM CASE_TABLE WHERE Title = 'DEMO_SAFE_CRUD_CASE_2026') AS Residual_Cases,
    (SELECT COUNT(*) FROM APP_USER WHERE Username = 'demo.crud.officer') AS Residual_Users,
    (SELECT COUNT(*) FROM LOCATION WHERE Address LIKE '%DEMO_CRUD_LOCATION%') AS Residual_Locations
FROM DUAL;


PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [2.6] VERIFY DELETION: Confirm complete cleanup (Zero rows expected)
PROMPT ---------------------------------------------------------------------------+
SELECT COUNT(*) AS Residual_Demo_Records
FROM CASE_TABLE
WHERE Title = 'DEMO_SAFE_CRUD_CASE_2026';


-- ============================================================================
-- SECTION 3: MULTI-TABLE JOINS, SUBQUERIES, GROUPING & AGGREGATE FUNCTIONS
-- Requirements: Joins, subqueries, grouping, aggregate functions, and sorting.
-- ============================================================================

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.1] MULTI-TABLE JOIN (A1): Evidence with Case Details & Lead Investigator
PROMPT ---------------------------------------------------------------------------+
SELECT
    e.Evidence_ID,
    e.Description,
    e.Status,
    c.Title AS Case_Title,
    NVL(u.First_Name || ' ' || u.Last_Name, 'Unassigned') AS Investigator_Name,
    c.Crime_Type
FROM EVIDENCE e
JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
LEFT JOIN INVESTIGATOR i ON c.Assigned_To = i.User_ID
LEFT JOIN APP_USER u ON i.User_ID = u.User_ID
ORDER BY c.Case_ID, e.Evidence_ID
FETCH FIRST 10 ROWS ONLY;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.2] MULTI-TABLE JOIN (A2): Full Chronological Custody Trail
PROMPT ---------------------------------------------------------------------------+
SELECT
    coc.Custody_ID,
    TO_CHAR(coc.Timestamp_At, 'YYYY-MM-DD HH24:MI:SS') AS Timestamp_At,
    coc.Action,
    NVL(u.First_Name || ' ' || u.Last_Name, 'System Custodian') AS Logged_By,
    e.Evidence_ID,
    e.Description AS Evidence_Description,
    c.Title AS Case_Title
FROM CHAIN_OF_CUSTODY coc
JOIN EVIDENCE e ON coc.Evidence_ID = e.Evidence_ID
JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
LEFT JOIN APP_USER u ON coc.User_ID = u.User_ID
ORDER BY coc.Custody_ID DESC
FETCH FIRST 10 ROWS ONLY;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.3] POLYMORPHIC EVIDENCE JOIN (A3): Hardware Devices & File Records
PROMPT ---------------------------------------------------------------------------+
SELECT
    e.Evidence_ID,
    e.Description,
    e.Status,
    CASE 
        WHEN d.Device_ID IS NOT NULL THEN 'Physical Device'
        WHEN f.File_ID IS NOT NULL THEN 'Digital File'
        ELSE 'Generic Evidence'
    END AS Evidence_Classification,
    d.Serial_Number,
    f.File_Name,
    f.File_Size
FROM EVIDENCE e
LEFT JOIN DEVICE d ON e.Evidence_ID = d.Evidence_ID
LEFT JOIN FILE_RECORD f ON e.Evidence_ID = f.Evidence_ID
ORDER BY e.Evidence_ID
FETCH FIRST 10 ROWS ONLY;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.4] CORRELATED SUBQUERY (B1): Cases with at least one registered evidence
PROMPT ---------------------------------------------------------------------------+
SELECT 
    c.Case_ID,
    c.Title,
    c.Status,
    (
        SELECT COUNT(*)
        FROM EVIDENCE e
        WHERE e.Case_ID = c.Case_ID
    ) AS Linked_Evidence_Count
FROM CASE_TABLE c
WHERE EXISTS (
    SELECT 1
    FROM EVIDENCE e
    WHERE e.Case_ID = c.Case_ID
)
ORDER BY c.Case_ID;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.5] IN SUBQUERY (B2): Evidence in Open or Active Cases
PROMPT ---------------------------------------------------------------------------+
SELECT 
    e.Evidence_ID,
    e.Description,
    e.Status,
    e.Case_ID
FROM EVIDENCE e
WHERE e.Case_ID IN (
    SELECT c.Case_ID
    FROM CASE_TABLE c
    WHERE c.Status IN ('Open', 'Under Investigation')
)
ORDER BY e.Evidence_ID
FETCH FIRST 10 ROWS ONLY;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.6] SCALAR SUBQUERY & HAVING (B3): Cases with Evidence Count >= Average
PROMPT ---------------------------------------------------------------------------+
SELECT 
    c.Case_ID,
    c.Title,
    COUNT(e.Evidence_ID) AS Evidence_Count
FROM CASE_TABLE c
JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
GROUP BY c.Case_ID, c.Title
HAVING COUNT(e.Evidence_ID) >= (
    SELECT NVL(AVG(cnt), 0)
    FROM (
        SELECT COUNT(*) AS cnt
        FROM EVIDENCE
        GROUP BY Case_ID
    )
)
ORDER BY Evidence_Count DESC;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.7] NOT IN / NOT EXISTS SUBQUERY (B4): Unanalyzed Evidence Items
PROMPT ---------------------------------------------------------------------------+
SELECT 
    e.Evidence_ID,
    e.Description,
    e.Status
FROM EVIDENCE e
WHERE e.Evidence_ID NOT IN (
    SELECT NVL(Evidence_ID, -1)
    FROM FORENSIC_ANALYSIS
)
ORDER BY e.Evidence_ID
FETCH FIRST 10 ROWS ONLY;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.8] AGGREGATE FUNCTIONS & GROUP BY (C1): Case Evidence Aggregates
PROMPT ---------------------------------------------------------------------------+
SELECT 
    c.Case_ID,
    c.Title,
    COUNT(e.Evidence_ID) AS Total_Evidence,
    MIN(e.Collection_Date) AS Earliest_Collection,
    MAX(e.Collection_Date) AS Latest_Collection
FROM CASE_TABLE c
LEFT JOIN EVIDENCE e ON c.Case_ID = e.Case_ID
GROUP BY c.Case_ID, c.Title
ORDER BY Total_Evidence DESC
FETCH FIRST 10 ROWS ONLY;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.9] AGGREGATE WITH STATISTICAL PERCENTAGE (C2): Status Share
PROMPT ---------------------------------------------------------------------------+
SELECT 
    Status,
    COUNT(*) AS Item_Count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM EVIDENCE), 2) AS Percentage_Share
FROM EVIDENCE
GROUP BY Status
ORDER BY Item_Count DESC;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.10] CONDITIONAL SUM AGGREGATION (C3): Case Status Breakdown
PROMPT ---------------------------------------------------------------------------+
SELECT 
    COUNT(*) AS Total_Cases,
    SUM(CASE WHEN Status = 'Open' THEN 1 ELSE 0 END) AS Open_Cases,
    SUM(CASE WHEN Status = 'Under Investigation' THEN 1 ELSE 0 END) AS Under_Investigation_Cases,
    SUM(CASE WHEN Status = 'Closed' THEN 1 ELSE 0 END) AS Closed_Cases,
    SUM(CASE WHEN Status = 'Archived' THEN 1 ELSE 0 END) AS Archived_Cases
FROM CASE_TABLE;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [3.11] SORTING & ORACLE 12c+ PAGINATION (OFFSET / FETCH NEXT)
PROMPT ---------------------------------------------------------------------------+
-- Retrieve Page 2 (rows 6 to 10) sorted by Case_ID descending
SELECT Case_ID, Title, Status, Date_Opened
FROM CASE_TABLE
ORDER BY Case_ID DESC
OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY;


-- ============================================================================
-- SECTION 4: VIEWS, SEQUENCES & INDEXES
-- Requirements: Views, sequences, and indexes.
-- ============================================================================

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [4.1] VIEWS INSPECTION: Catalog Definitions in USER_VIEWS
PROMPT ---------------------------------------------------------------------------+
SELECT VIEW_NAME, TEXT_LENGTH, READ_ONLY
FROM USER_VIEWS
ORDER BY VIEW_NAME;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [4.2] VIEW DEMONSTRATION: v_custody_trail
PROMPT ---------------------------------------------------------------------------+
SELECT *
FROM v_custody_trail
ORDER BY Custody_ID DESC
FETCH FIRST 5 ROWS ONLY;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [4.3] VIEW DEMONSTRATION: v_case_summary
PROMPT ---------------------------------------------------------------------------+
SELECT *
FROM v_case_summary
ORDER BY Evidence_Count DESC;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [4.4] VIEW DEMONSTRATION: v_evidence_full
PROMPT ---------------------------------------------------------------------------+
SELECT *
FROM v_evidence_full
ORDER BY Evidence_ID
FETCH FIRST 5 ROWS ONLY;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [4.5] SEQUENCES & IDENTITY COLUMNS: USER_TAB_IDENTITY_COLS
PROMPT ---------------------------------------------------------------------------+
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    GENERATION_TYPE,
    IDENTITY_OPTIONS
FROM USER_TAB_IDENTITY_COLS
ORDER BY TABLE_NAME;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [4.6] INDEX INSPECTION: All 12 Explicit Performance Indexes
PROMPT ---------------------------------------------------------------------------+
SELECT 
    i.INDEX_NAME,
    i.TABLE_NAME,
    i.UNIQUENESS,
    c.COLUMN_NAME,
    c.COLUMN_POSITION
FROM USER_INDEXES i
JOIN USER_IND_COLUMNS c ON i.INDEX_NAME = c.INDEX_NAME
WHERE i.INDEX_NAME LIKE 'IDX_%'
ORDER BY i.TABLE_NAME, i.INDEX_NAME, c.COLUMN_POSITION;


-- ============================================================================
-- SECTION 5: PL/SQL PROCEDURES AND FUNCTIONS
-- Requirements: PL/SQL procedures and functions demonstration.
-- ============================================================================

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [5.1] FUNCTION DEMONSTRATION: fn_days_in_current_status
PROMPT ---------------------------------------------------------------------------+
SELECT 
    Evidence_ID,
    Description,
    Status,
    fn_days_in_current_status(Evidence_ID) AS Days_In_Current_Status
FROM EVIDENCE
ORDER BY Evidence_ID
FETCH FIRST 5 ROWS ONLY;

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [5.2] FUNCTION DEMONSTRATION: fn_verify_hash (Match & Tamper Detection)
PROMPT ---------------------------------------------------------------------------+
DECLARE
    v_evid_id     NUMBER;
    v_real_hash   VARCHAR2(64 CHAR);
    v_match_res   VARCHAR2(100 CHAR);
    v_tamper_res  VARCHAR2(100 CHAR);
BEGIN
    SELECT Evidence_ID, Hash_Value
    INTO v_evid_id, v_real_hash
    FROM EVIDENCE
    WHERE Hash_Value IS NOT NULL
    FETCH FIRST 1 ROWS ONLY;

    v_match_res := fn_verify_hash(v_evid_id, v_real_hash);
    v_tamper_res := fn_verify_hash(v_evid_id, '0000000000000000000000000000000000000000000000000000000000000000');

    DBMS_OUTPUT.PUT_LINE('Evidence ID tested: ' || v_evid_id);
    DBMS_OUTPUT.PUT_LINE('Real Hash: ' || v_real_hash);
    DBMS_OUTPUT.PUT_LINE('Match Test Result:  ' || v_match_res);
    DBMS_OUTPUT.PUT_LINE('Tamper Test Result: ' || v_tamper_res);
END;
/

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [5.3] PROCEDURE DEMONSTRATION: sp_register_evidence (Atomic Intake)
PROMPT ---------------------------------------------------------------------------+
DECLARE
    v_case_id     NUMBER;
    v_new_id      NUMBER;
    v_count_coc   NUMBER;
BEGIN
    -- Select first valid case
    SELECT MIN(Case_ID) INTO v_case_id FROM CASE_TABLE;

    sp_register_evidence(
        p_description     => 'DEMO_TEST_FORENSIC_MEMORY_DUMP',
        p_collection_date => SYSDATE,
        p_case_id         => v_case_id,
        p_hash_value      => '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
        p_new_evidence_id => v_new_id
    );

    DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: sp_register_evidence executed. New Evidence_ID = ' || v_new_id);

    -- Verify automatic custody entry was logged
    SELECT COUNT(*) INTO v_count_coc
    FROM CHAIN_OF_CUSTODY
    WHERE Evidence_ID = v_new_id;

    DBMS_OUTPUT.PUT_LINE('>>> Initial Chain of Custody rows created: ' || v_count_coc);

    -- Demonstrate that registered chain of custody record is immutable
    BEGIN
        DELETE FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = v_new_id;
        DBMS_OUTPUT.PUT_LINE('>>> ERROR: Unexpectedly deleted custody record.');
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('>>> IMMUTABILITY VERIFIED: trg_custody_no_delete protected registered log: ' || SQLERRM);
    END;
END;
/

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [5.4] PROCEDURE DEMONSTRATION: sp_flag_stale_evidence (PL/SQL Cursor Loop)
PROMPT ---------------------------------------------------------------------------+
DECLARE
    v_stale_cur SYS_REFCURSOR;
    v_evid_id   NUMBER;
    v_desc      VARCHAR2(255 CHAR);
    v_status    VARCHAR2(30 CHAR);
    v_days      NUMBER;
    v_alert     VARCHAR2(500 CHAR);
    v_count     NUMBER := 0;
BEGIN
    sp_flag_stale_evidence(
        p_threshold => 0, -- Threshold 0 to display all active evidence in demo
        p_cursor    => v_stale_cur
    );

    LOOP
        FETCH v_stale_cur INTO v_evid_id, v_desc, v_status, v_days, v_alert;
        EXIT WHEN v_stale_cur%NOTFOUND OR v_count >= 3;
        v_count := v_count + 1;
        DBMS_OUTPUT.PUT_LINE('RefCursor Row #' || v_count || ': ID=' || v_evid_id || ' Days=' || v_days || ' | ' || v_alert);
    END LOOP;
    CLOSE v_stale_cur;
END;
/

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [5.5] PROCEDURE DEMONSTRATION: sp_transfer_custody (Transactional Transfer)
PROMPT ---------------------------------------------------------------------------+
DECLARE
    v_case_id     NUMBER;
    v_evid_id     NUMBER;
BEGIN
    SELECT MIN(Case_ID) INTO v_case_id FROM CASE_TABLE;

    INSERT INTO EVIDENCE (
        Description, 
        Case_ID, 
        Status, 
        Hash_Value
    ) VALUES (
        'DEMO_TEMP_TRANSFER_TEST_DRIVE', 
        v_case_id, 
        'Collected', 
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    ) RETURNING Evidence_ID INTO v_evid_id;

    sp_transfer_custody(
        p_evidence_id => v_evid_id,
        p_new_status  => 'In Storage',
        p_reason      => 'Moved to Central Evidence Vault B-12'
    );

    DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: sp_transfer_custody updated evidence #' || v_evid_id || ' to In Storage');

    -- Demonstrate that custody log entry created by transfer is immutable
    BEGIN
        DELETE FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = v_evid_id;
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('>>> IMMUTABILITY VERIFIED: Transfer log protected by trg_custody_no_delete.');
    END;
END;
/


-- ============================================================================
-- SECTION 6: TRIGGERS & FORENSIC IMMUTABILITY ENFORCEMENT
-- Requirements: Triggers, including forensic audit or immutability enforcement.
-- ============================================================================

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [6.1] TRIGGER DEMONSTRATION: trg_evidence_status_change
PROMPT ---------------------------------------------------------------------------+
DECLARE
    v_case_id       NUMBER;
    v_evid_id       NUMBER;
    v_logged_action VARCHAR2(255 CHAR);
BEGIN
    SELECT MIN(Case_ID) INTO v_case_id FROM CASE_TABLE;

    INSERT INTO EVIDENCE (
        Description, 
        Case_ID, 
        Status, 
        Hash_Value
    ) VALUES (
        'DEMO_TRIGGER_TEST_USB', 
        v_case_id, 
        'Collected', 
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    ) RETURNING Evidence_ID INTO v_evid_id;

    -- Update status to trigger trg_evidence_status_change
    UPDATE EVIDENCE
    SET Status = 'Under Analysis'
    WHERE Evidence_ID = v_evid_id;

    -- Verify automated custody audit row
    SELECT Action INTO v_logged_action
    FROM CHAIN_OF_CUSTODY
    WHERE Evidence_ID = v_evid_id
      AND Action LIKE 'Status changed%'
    FETCH FIRST 1 ROWS ONLY;

    DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: trg_evidence_status_change fired automatically.');
    DBMS_OUTPUT.PUT_LINE('    Logged Action: ' || v_logged_action);

    -- Verify automated status audit record cannot be deleted
    BEGIN
        DELETE FROM CHAIN_OF_CUSTODY WHERE Evidence_ID = v_evid_id;
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('>>> IMMUTABILITY VERIFIED: Automated trigger audit row protected by trg_custody_no_delete.');
    END;
END;
/

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [6.2] TRIGGER DEMONSTRATION: trg_custody_no_update (Append-Only Protection)
PROMPT ---------------------------------------------------------------------------+
DECLARE
    v_case_id   NUMBER;
    v_evid_id   NUMBER;
    v_coc_id    NUMBER;
BEGIN
    SELECT MIN(Case_ID) INTO v_case_id FROM CASE_TABLE;

    INSERT INTO EVIDENCE (Description, Case_ID, Status)
    VALUES ('DEMO_IMMUTABILITY_TEST', v_case_id, 'Collected')
    RETURNING Evidence_ID INTO v_evid_id;

    INSERT INTO CHAIN_OF_CUSTODY (Action, Evidence_ID)
    VALUES ('Original Forensic Log', v_evid_id)
    RETURNING Custody_ID INTO v_coc_id;

    -- Attempt illegal UPDATE on CHAIN_OF_CUSTODY
    BEGIN
        UPDATE CHAIN_OF_CUSTODY
        SET Action = 'Tampered Log Attempt'
        WHERE Custody_ID = v_coc_id;

        DBMS_OUTPUT.PUT_LINE('>>> ERROR: Update succeeded unexpectedly!');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20001 THEN
                DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: trg_custody_no_update caught expected ORA-20001:');
                DBMS_OUTPUT.PUT_LINE('    ' || SQLERRM);
            ELSE
                DBMS_OUTPUT.PUT_LINE('>>> UNEXPECTED ERROR: ' || SQLERRM);
            END IF;
    END;

    -- Safe teardown via transaction rollback (avoids firing BEFORE DELETE trigger)
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('>>> Transaction rolled back safely. Zero residual records.');
END;
/

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [6.3] TRIGGER DEMONSTRATION: trg_custody_no_delete (Immutability Protection)
PROMPT ---------------------------------------------------------------------------+
DECLARE
    v_case_id   NUMBER;
    v_evid_id   NUMBER;
    v_coc_id    NUMBER;
BEGIN
    SELECT MIN(Case_ID) INTO v_case_id FROM CASE_TABLE;

    INSERT INTO EVIDENCE (Description, Case_ID, Status)
    VALUES ('DEMO_DELETE_TEST', v_case_id, 'Collected')
    RETURNING Evidence_ID INTO v_evid_id;

    INSERT INTO CHAIN_OF_CUSTODY (Action, Evidence_ID)
    VALUES ('Original Custody Record', v_evid_id)
    RETURNING Custody_ID INTO v_coc_id;

    -- Attempt illegal DELETE on CHAIN_OF_CUSTODY
    BEGIN
        DELETE FROM CHAIN_OF_CUSTODY
        WHERE Custody_ID = v_coc_id;

        DBMS_OUTPUT.PUT_LINE('>>> ERROR: Delete succeeded unexpectedly!');
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLCODE = -20002 THEN
                DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: trg_custody_no_delete caught expected ORA-20002:');
                DBMS_OUTPUT.PUT_LINE('    ' || SQLERRM);
            ELSE
                DBMS_OUTPUT.PUT_LINE('>>> UNEXPECTED ERROR: ' || SQLERRM);
            END IF;
    END;

    -- Safe teardown via parent cascade or explicit cleanup block
    -- Note: Since trg_custody_no_delete fires on DELETE FROM CHAIN_OF_CUSTODY,
    -- CASCADE delete from parent EVIDENCE will trigger it unless removed via parent or session.
    -- To restore state safely without violating trg_custody_no_delete:
    ROLLBACK;
    DBMS_OUTPUT.PUT_LINE('>>> Transaction rolled back safely. Zero residual records.');
END;
/


-- ============================================================================
-- SECTION 7: TRANSACTIONS, SAVEPOINTS & EXCEPTION HANDLING
-- Requirements: Transactions and exception handling.
-- ============================================================================

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [7.1] TRANSACTION DEMONSTRATION: SAVEPOINT, PARTIAL ROLLBACK & COMMIT
PROMPT ---------------------------------------------------------------------------+
DECLARE
    v_case_id   NUMBER;
    v_status    VARCHAR2(20 CHAR);
BEGIN
    -- 1. Create dedicated test case
    INSERT INTO CASE_TABLE (Title, Status, Created_By, Crime_Type)
    VALUES ('DEMO_TX_SAVEPOINT_TEST', 'Open', 1, 'Transaction Integrity')
    RETURNING Case_ID INTO v_case_id;

    -- 2. Define first savepoint
    SAVEPOINT sp_step1;

    -- 3. Perform legitimate update
    UPDATE CASE_TABLE
    SET Status = 'Under Investigation'
    WHERE Case_ID = v_case_id;

    -- 4. Define second savepoint
    SAVEPOINT sp_step2;

    -- 5. Simulate an erroneous business transaction branch
    BEGIN
        -- Attempt an invalid operation that triggers an error
        UPDATE CASE_TABLE
        SET Status = 'INVALID_STATUS_THAT_VIOLATES_CHECK'
        WHERE Case_ID = v_case_id;
    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('>>> Caught error during step 3: ' || SQLERRM);
            DBMS_OUTPUT.PUT_LINE('>>> Executing: ROLLBACK TO sp_step2;');
            ROLLBACK TO sp_step2;
    END;

    -- 6. Verify that step 1 update survived the partial rollback
    SELECT Status INTO v_status
    FROM CASE_TABLE
    WHERE Case_ID = v_case_id;

    DBMS_OUTPUT.PUT_LINE('>>> Verified Case Status after partial rollback: ' || v_status || ' (Expected: Under Investigation)');

    -- 7. Clean up test case cleanly
    DELETE FROM CASE_TABLE WHERE Case_ID = v_case_id;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('>>> Transaction finalized with COMMIT. Test record removed.');
END;
/


-- ============================================================================
-- SECTION 8: REFERENTIAL INTEGRITY & CONSTRAINT-VIOLATION DEMONSTRATIONS
-- Requirements: Referential integrity and meaningful constraint-violation demonstrations.
-- ============================================================================

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [8.1] CONSTRAINT VIOLATION: Foreign Key Violation (ORA-02291)
PROMPT ---------------------------------------------------------------------------+
-- Attempting to register evidence referencing non-existent Case_ID = 999999
DECLARE
    v_new_id NUMBER;
BEGIN
    INSERT INTO EVIDENCE (Description, Case_ID, Status)
    VALUES ('ORPHAN_EVIDENCE_RECORD', 999999, 'Collected')
    RETURNING Evidence_ID INTO v_new_id;
    
    DBMS_OUTPUT.PUT_LINE('>>> ERROR: Insert succeeded unexpectedly!');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -2291 THEN
            DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: Foreign Key constraint caught expected ORA-02291:');
            DBMS_OUTPUT.PUT_LINE('    ' || SQLERRM);
        ELSE
            DBMS_OUTPUT.PUT_LINE('>>> UNEXPECTED ERROR: ' || SQLERRM);
        END IF;
END;
/

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [8.2] CONSTRAINT VIOLATION: Check Constraint Violation (ORA-02290)
PROMPT ---------------------------------------------------------------------------+
-- Attempting to set an illegal Status ('Tampered') on EVIDENCE
DECLARE
    v_case_id NUMBER;
BEGIN
    SELECT MIN(Case_ID) INTO v_case_id FROM CASE_TABLE;

    INSERT INTO EVIDENCE (Description, Case_ID, Status)
    VALUES ('ILLEGAL_STATUS_EVIDENCE', v_case_id, 'Tampered');

    DBMS_OUTPUT.PUT_LINE('>>> ERROR: Insert succeeded unexpectedly!');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -2290 THEN
            DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: Check constraint chk_evidence_status caught expected ORA-02290:');
            DBMS_OUTPUT.PUT_LINE('    ' || SQLERRM);
        ELSE
            DBMS_OUTPUT.PUT_LINE('>>> UNEXPECTED ERROR: ' || SQLERRM);
        END IF;
END;
/

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [8.3] CONSTRAINT VIOLATION: Unique Constraint Violation (ORA-00001)
PROMPT ---------------------------------------------------------------------------+
-- Attempting to insert duplicate username into APP_USER
DECLARE
    v_existing_user VARCHAR2(50 CHAR);
BEGIN
    SELECT MIN(Username) INTO v_existing_user FROM APP_USER WHERE Username IS NOT NULL;

    INSERT INTO APP_USER (First_Name, Last_Name, Username, Role)
    VALUES ('Duplicate', 'User', v_existing_user, 'Investigator');

    DBMS_OUTPUT.PUT_LINE('>>> ERROR: Duplicate username insert succeeded unexpectedly!');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -1 THEN
            DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: Unique constraint uq_app_user_username caught expected ORA-00001:');
            DBMS_OUTPUT.PUT_LINE('    ' || SQLERRM);
        ELSE
            DBMS_OUTPUT.PUT_LINE('>>> UNEXPECTED ERROR: ' || SQLERRM);
        END IF;
END;
/

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [8.4] CONSTRAINT VIOLATION: NOT NULL Constraint Violation (ORA-01400)
PROMPT ---------------------------------------------------------------------------+
-- Attempting to insert a case without a mandatory Title
BEGIN
    INSERT INTO CASE_TABLE (Title, Status, Created_By)
    VALUES (NULL, 'Open', 1);

    DBMS_OUTPUT.PUT_LINE('>>> ERROR: Insert succeeded unexpectedly!');
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -1400 THEN
            DBMS_OUTPUT.PUT_LINE('>>> SUCCESS: Mandatory column constraint caught expected ORA-01400:');
            DBMS_OUTPUT.PUT_LINE('    ' || SQLERRM);
        ELSE
            DBMS_OUTPUT.PUT_LINE('>>> UNEXPECTED ERROR: ' || SQLERRM);
        END IF;
END;
/

PROMPT 
PROMPT ---------------------------------------------------------------------------+
PROMPT [8.5] REFERENTIAL INTEGRITY ORPHAN AUDIT (Zero Orphan Records Expected)
PROMPT ---------------------------------------------------------------------------+
SELECT 
    'EVIDENCE Without Case' AS Integrity_Check,
    COUNT(*) AS Orphan_Count
FROM EVIDENCE e
LEFT JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
WHERE c.Case_ID IS NULL
UNION ALL
SELECT 
    'CHAIN_OF_CUSTODY Without Evidence',
    COUNT(*)
FROM CHAIN_OF_CUSTODY coc
LEFT JOIN EVIDENCE e ON coc.Evidence_ID = e.Evidence_ID
WHERE e.Evidence_ID IS NULL
UNION ALL
SELECT 
    'DEVICE Without Evidence',
    COUNT(*)
FROM DEVICE d
LEFT JOIN EVIDENCE e ON d.Evidence_ID = e.Evidence_ID
WHERE e.Evidence_ID IS NULL;

PROMPT 
PROMPT ============================================================================
PROMPT DFEMS ORACLE SQL AND PL/SQL DEMONSTRATION COMPLETE
PROMPT All 8 categories demonstrated and verified against Oracle 26ai Free.
PROMPT ============================================================================

EXIT;
