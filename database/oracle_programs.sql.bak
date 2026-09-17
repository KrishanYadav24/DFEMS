-- ============================================================================
-- DFEMS — ORACLE DATABASE 26ai PROCEDURAL PROGRAMS, VIEWS & TRIGGERS
-- Database: Oracle AI Database 26ai Free
-- PDB / Service: FREEPDB1
-- Schema / Application User: dfems_user
-- Driver Target: Node.js oracledb (Thin Mode)
-- ============================================================================
-- PREREQUISITES & EXECUTION INSTRUCTIONS:
-- 1. Must be executed AFTER database/oracle_schema.sql has completed.
-- 2. Connect as application user dfems_user:
--      sqlplus dfems_user@//localhost:1521/FREEPDB1
-- 3. Execute using:
--      @database/oracle_programs.sql
-- ============================================================================

SET DEFINE OFF;
SET ECHO ON;

-- ============================================================================
-- SECTION 1: VIEWS (DA2 SECTION 9)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- View 1: v_custody_trail
-- Consolidates chronological chain of custody events with evidence description
-- and associated case title (DA2 View 1, Screenshot 29).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_custody_trail AS
SELECT
    e.Evidence_ID,
    e.Description AS Evidence_Description,
    c.Title AS Case_Title,
    cc.Custody_ID,
    cc.Timestamp_At,
    cc.Action
FROM CHAIN_OF_CUSTODY cc
JOIN EVIDENCE e ON cc.Evidence_ID = e.Evidence_ID
JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID;
/

-- ----------------------------------------------------------------------------
-- View 2: v_case_summary
-- Summarizes case metadata, physical location, assigned lead investigator,
-- and live correlated count of registered evidence items (DA2 View 2, Screenshot 30).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_case_summary AS
SELECT
    c.Case_ID,
    c.Title,
    c.Status,
    loc.Address AS Location,
    (u.First_Name || ' ' || u.Last_Name) AS Assigned_Investigator,
    (
        SELECT COUNT(*)
        FROM EVIDENCE e
        WHERE e.Case_ID = c.Case_ID
    ) AS Evidence_Count
FROM CASE_TABLE c
JOIN LOCATION loc ON c.Location_ID = loc.Location_ID
JOIN APP_USER u ON c.Assigned_To = u.User_ID;
/

-- ----------------------------------------------------------------------------
-- View 3: v_evidence_full
-- Complete polymorphic evidence roster classifying items into Device, File,
-- or Other, displaying hardware serial numbers where applicable (DA2 View 3, Screenshot 31).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_evidence_full AS
SELECT
    e.Evidence_ID,
    e.Description,
    e.Status,
    e.Collection_Date,
    e.Hash_Value,
    c.Title AS Case_Title,
    CASE
        WHEN d.Device_ID IS NOT NULL THEN 'Device'
        WHEN f.File_ID IS NOT NULL THEN 'File'
        ELSE 'Other'
    END AS Evidence_Type,
    d.Serial_Number
FROM EVIDENCE e
JOIN CASE_TABLE c ON e.Case_ID = c.Case_ID
LEFT JOIN DEVICE d ON d.Evidence_ID = e.Evidence_ID
LEFT JOIN FILE_RECORD f ON f.Evidence_ID = e.Evidence_ID;
/

-- ============================================================================
-- SECTION 2: STORED FUNCTIONS (DA2 SECTION 11)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function 1: fn_days_in_current_status
-- Calculates the elapsed calendar days that an evidence record has stayed in
-- its current lifecycle status (DA2 Function 1, Screenshot 36).
-- Evaluates the latest 'Status changed%' timestamp in CHAIN_OF_CUSTODY;
-- falls back to Collection_Date if no status change event has occurred.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_days_in_current_status(
    p_evidence_id IN NUMBER
)
RETURN NUMBER
AS
    v_last_change TIMESTAMP := NULL;
    v_collected   DATE;
BEGIN
    SELECT Collection_Date
    INTO v_collected
    FROM EVIDENCE
    WHERE Evidence_ID = p_evidence_id;

    SELECT MAX(Timestamp_At)
    INTO v_last_change
    FROM CHAIN_OF_CUSTODY
    WHERE Evidence_ID = p_evidence_id
      AND Action LIKE 'Status changed%';

    IF v_last_change IS NULL THEN
        RETURN TRUNC(SYSDATE) - TRUNC(v_collected);
    ELSE
        RETURN TRUNC(SYSDATE) - TRUNC(CAST(v_last_change AS DATE));
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN 0;
END fn_days_in_current_status;
/

-- ----------------------------------------------------------------------------
-- Function 2: fn_verify_hash
-- Verifies cryptographic SHA-256 hash against the intake value in EVIDENCE
-- (DA2 Function 2, Screenshot 37).
-- Returns:
--   'MATCH'                          -> Verification succeeded
--   'MISMATCH - POSSIBLE TAMPERING'  -> Hashes differ (integrity alert)
--   'ERROR: Evidence not found'      -> Invalid Evidence ID
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_verify_hash(
    p_evidence_id   IN NUMBER,
    p_current_hash  IN VARCHAR2
)
RETURN VARCHAR2
AS
    v_stored_hash VARCHAR2(64 CHAR) := NULL;
    v_exists      NUMBER := 0;
BEGIN
    SELECT COUNT(*)
    INTO v_exists
    FROM EVIDENCE
    WHERE Evidence_ID = p_evidence_id;

    IF v_exists = 0 THEN
        RETURN 'ERROR: Evidence not found';
    END IF;

    SELECT Hash_Value
    INTO v_stored_hash
    FROM EVIDENCE
    WHERE Evidence_ID = p_evidence_id;

    IF v_stored_hash IS NOT NULL AND v_stored_hash = p_current_hash THEN
        RETURN 'MATCH';
    ELSE
        RETURN 'MISMATCH - POSSIBLE TAMPERING';
    END IF;
END fn_verify_hash;
/

-- ============================================================================
-- SECTION 3: STORED PROCEDURES (DA2 SECTION 10 & 13)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Procedure 1: sp_register_evidence
-- Registers new digital evidence and automatically writes the initial
-- 'Collected at scene' entry into CHAIN_OF_CUSTODY (DA2 Procedure 1, Screenshot 32).
-- Uses PL/SQL RETURNING clause for atomic ID assignment.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_register_evidence(
    p_description      IN  VARCHAR2,
    p_collection_date  IN  DATE,
    p_case_id          IN  NUMBER,
    p_hash_value       IN  VARCHAR2,
    p_new_evidence_id  OUT NUMBER
)
AS
BEGIN
    INSERT INTO EVIDENCE (
        Description, 
        Collection_Date, 
        Case_ID, 
        Status, 
        Hash_Value
    ) VALUES (
        p_description, 
        NVL(p_collection_date, SYSDATE), 
        p_case_id, 
        'Collected', 
        p_hash_value
    ) RETURNING Evidence_ID INTO p_new_evidence_id;

    INSERT INTO CHAIN_OF_CUSTODY (
        Timestamp_At, 
        Action, 
        Evidence_ID
    ) VALUES (
        SYSTIMESTAMP, 
        'Collected at scene', 
        p_new_evidence_id
    );

    COMMIT;
END sp_register_evidence;
/

-- ----------------------------------------------------------------------------
-- Procedure 2: sp_add_analysis
-- Logs forensic examination findings and automatically shifts evidence
-- lifecycle status to 'Under Analysis' (DA2 Procedure 2, Screenshot 33).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_add_analysis(
    p_evidence_id  IN NUMBER,
    p_analyst_id   IN NUMBER,
    p_findings     IN VARCHAR2
)
AS
BEGIN
    UPDATE EVIDENCE
    SET Status = 'Under Analysis'
    WHERE Evidence_ID = p_evidence_id
      AND Status <> 'Under Analysis';

    INSERT INTO FORENSIC_ANALYSIS (
        Findings, 
        Evidence_ID, 
        Analyst_ID, 
        Timestamp_At
    ) VALUES (
        p_findings, 
        p_evidence_id, 
        p_analyst_id, 
        SYSTIMESTAMP
    );

    COMMIT;
END sp_add_analysis;
/

-- ----------------------------------------------------------------------------
-- Procedure 3: sp_flag_stale_evidence (PL/SQL CURSOR)
-- Iterates over non-archived evidence records using an explicit CURSOR loop
-- and flags items stagnant for more than p_threshold days (DA2 Procedure 3, Screenshot 34).
-- Outputs diagnostic alerts via DBMS_OUTPUT and returns an open SYS_REFCURSOR
-- for direct consumption by the Node.js oracledb API.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_flag_stale_evidence(
    p_threshold  IN  NUMBER DEFAULT 30,
    p_cursor     OUT SYS_REFCURSOR
)
AS
    CURSOR c_stale IS
        SELECT 
            Evidence_ID, 
            Description, 
            Status
        FROM EVIDENCE
        WHERE Status NOT IN ('Archived', 'Disposed', 'Presented in Court');
        
    v_days    NUMBER;
    v_alert   VARCHAR2(500 CHAR);
BEGIN
    -- Explicit cursor loop with DBMS_OUTPUT logging (satisfies DA2 cursor requirement)
    FOR r IN c_stale LOOP
        v_days := fn_days_in_current_status(r.Evidence_ID);
        IF v_days > p_threshold THEN
            v_alert := 'ALERT: Evidence #' || r.Evidence_ID || ' (' || r.Description ||
                       ') has been in status ''' || r.Status || ''' for ' || v_days || ' days.';
            DBMS_OUTPUT.PUT_LINE(v_alert);
        END IF;
    END LOOP;

    -- Return open SYS_REFCURSOR for Node.js API consumption
    OPEN p_cursor FOR
        SELECT 
            e.Evidence_ID,
            e.Description,
            e.Status,
            fn_days_in_current_status(e.Evidence_ID) AS Days_In_Status,
            'ALERT: Evidence #' || e.Evidence_ID || ' (' || e.Description ||
            ') has been in status ''' || e.Status || ''' for ' ||
            fn_days_in_current_status(e.Evidence_ID) || ' days.' AS Alert_Message
        FROM EVIDENCE e
        WHERE e.Status NOT IN ('Archived', 'Disposed', 'Presented in Court')
          AND fn_days_in_current_status(e.Evidence_ID) > p_threshold;
END sp_flag_stale_evidence;
/

-- ----------------------------------------------------------------------------
-- Procedure 4: sp_transfer_custody (TRANSACTION WITH SAVEPOINT & ROLLBACK)
-- Transfers custody with transactional boundary protection (DA2 Section 13, Screenshot 44).
-- Sets SAVEPOINT before execution. If validation fails or exception occurs,
-- safely rolls back to SAVEPOINT and re-raises the error.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE sp_transfer_custody(
    p_evidence_id  IN NUMBER,
    p_new_status   IN VARCHAR2,
    p_reason       IN VARCHAR2
)
AS
    v_exists NUMBER := 0;
BEGIN
    SAVEPOINT before_transfer;

    SELECT COUNT(*)
    INTO v_exists
    FROM EVIDENCE
    WHERE Evidence_ID = p_evidence_id;

    IF v_exists = 0 THEN
        RAISE_APPLICATION_ERROR(-20003, 'Evidence_ID does not exist.');
    END IF;

    UPDATE EVIDENCE
    SET Status = p_new_status
    WHERE Evidence_ID = p_evidence_id;

    INSERT INTO CHAIN_OF_CUSTODY (
        Timestamp_At, 
        Action, 
        Evidence_ID
    ) VALUES (
        SYSTIMESTAMP, 
        'Transfer reason: ' || p_reason, 
        p_evidence_id
    );

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK TO before_transfer;
        RAISE;
END sp_transfer_custody;
/

-- ============================================================================
-- SECTION 4: DATABASE TRIGGERS (DA2 SECTION 12)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Trigger 1: trg_evidence_status_change
-- Fires AFTER UPDATE on EVIDENCE when Status changes (DA2 Trigger 1, Screenshot 41).
-- Automatically records an immutable audit record in CHAIN_OF_CUSTODY.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_evidence_status_change
AFTER UPDATE OF Status ON EVIDENCE
FOR EACH ROW
BEGIN
    IF (:OLD.Status IS NULL AND :NEW.Status IS NOT NULL) OR 
       (:OLD.Status IS NOT NULL AND :NEW.Status IS NOT NULL AND :OLD.Status <> :NEW.Status) THEN
        INSERT INTO CHAIN_OF_CUSTODY (
            Timestamp_At, 
            Action, 
            Evidence_ID
        ) VALUES (
            SYSTIMESTAMP,
            'Status changed: ' || NVL(:OLD.Status, 'NULL') || ' -> ' || NVL(:NEW.Status, 'NULL'),
            :NEW.Evidence_ID
        );
    END IF;
END;
/

-- ----------------------------------------------------------------------------
-- Trigger 2: trg_custody_no_update
-- Enforces strict append-only immutability on CHAIN_OF_CUSTODY (DA2 Trigger 2, Screenshot 42).
-- Rejects any attempted UPDATE statement with an application error.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_custody_no_update
BEFORE UPDATE ON CHAIN_OF_CUSTODY
FOR EACH ROW
BEGIN
    RAISE_APPLICATION_ERROR(-20001, 'Chain_of_Custody is append-only: existing entries cannot be modified.');
END;
/

-- ----------------------------------------------------------------------------
-- Trigger 3: trg_custody_no_delete
-- Enforces strict append-only immutability on CHAIN_OF_CUSTODY (DA2 Trigger 3, Screenshot 42).
-- Rejects any attempted DELETE statement with an application error.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER trg_custody_no_delete
BEFORE DELETE ON CHAIN_OF_CUSTODY
FOR EACH ROW
BEGIN
    RAISE_APPLICATION_ERROR(-20002, 'Chain_of_Custody is append-only: existing entries cannot be deleted.');
END;
/
