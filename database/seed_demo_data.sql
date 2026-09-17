-- ============================================================================
-- DFEMS — ORACLE DATABASE 26ai OPTIONAL EVALUATION SEED DATASET
-- Database: Oracle AI Database 26ai Free
-- PDB / Service: FREEPDB1
-- Schema / Application User: dfems_user
-- ============================================================================
-- PURPOSE:
-- This script contains the standalone academic and evaluation dataset specified
-- in DBMS Digital Assignment 2 (DA2). It is intended SOLELY for evaluation,
-- grading, and automated testing of the queries in demo_queries.sql.
--
-- EXECUTION NOTICE:
-- 1. Run this script ONLY after database/oracle_schema.sql and database/oracle_programs.sql
--    have been executed.
-- 2. This script is OPTIONAL. If you are performing a production deployment, do NOT
--    run this file; run backend/scripts/bootstrapAdmin.js instead.
-- 3. Connect as dfems_user via SQL*Plus:
--      sqlplus dfems_user@//localhost:1521/FREEPDB1
--      @database/seed_demo_data.sql
-- ============================================================================

SET DEFINE OFF;
SET ECHO ON;

-- ============================================================================
-- 1. APP_USER (10 Evaluation Seed Accounts)
-- ============================================================================
INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (1, 'Ravi', 'Kumar', '9876500001', 'ravi.kumar', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Investigator', 'Active');

INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (2, 'Ananya', 'Rao', '9876500002', 'ananya.rao', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Investigator', 'Active');

INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (3, 'Suresh', 'Iyer', '9876500003', 'suresh.iyer', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Investigator', 'Active');

INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (4, 'Priya', 'Nair', '9876500004', 'priya.nair', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Investigator', 'Active');

INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (5, 'Karthik', 'Menon', '9876500005', 'karthik.menon', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Forensic Examiner', 'Active');

INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (6, 'Divya', 'Pillai', '9876500006', 'divya.pillai', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Forensic Examiner', 'Active');

INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (7, 'Arjun', 'Reddy', '9876500007', 'arjun.reddy', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Forensic Examiner', 'Active');

INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (8, 'Meera', 'Krishnan', '9876500008', 'meera.krishnan', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Forensic Examiner', 'Active');

INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (9, 'Vikram', 'Shah', '9876500009', 'vikram.shah', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Admin', 'Active');

INSERT INTO APP_USER (User_ID, First_Name, Last_Name, Phone_Number, Username, Password_Hash, Role, Account_Status)
VALUES (10, 'Lakshmi', 'Narayan', '9876500010', 'lakshmi.narayan', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqNNw73iQp/J.K6', 'Auditor', 'Active');

-- ============================================================================
-- 2. LABORATORY (3 Forensic Labs)
-- ============================================================================
INSERT INTO LABORATORY (Laboratory_ID, Lab_Name) VALUES (1, 'Central Forensic Science Laboratory');
INSERT INTO LABORATORY (Laboratory_ID, Lab_Name) VALUES (2, 'Cyber Forensics Unit Lab');
INSERT INTO LABORATORY (Laboratory_ID, Lab_Name) VALUES (3, 'Regional Digital Forensics Lab');

-- ============================================================================
-- 3. INVESTIGATOR (4 Subtype Profiles)
-- ============================================================================
INSERT INTO INVESTIGATOR (User_ID, Badge_Number) VALUES (1, 'INV-1001');
INSERT INTO INVESTIGATOR (User_ID, Badge_Number) VALUES (2, 'INV-1002');
INSERT INTO INVESTIGATOR (User_ID, Badge_Number) VALUES (3, 'INV-1003');
INSERT INTO INVESTIGATOR (User_ID, Badge_Number) VALUES (4, 'INV-1004');

-- ============================================================================
-- 4. FORENSIC_ANALYST (4 Subtype Profiles)
-- ============================================================================
INSERT INTO FORENSIC_ANALYST (User_ID, Certification, Laboratory_ID) VALUES (5, 'EnCase Certified Examiner (EnCE)', 1);
INSERT INTO FORENSIC_ANALYST (User_ID, Certification, Laboratory_ID) VALUES (6, 'GIAC Certified Forensic Analyst (GCFA)', 2);
INSERT INTO FORENSIC_ANALYST (User_ID, Certification, Laboratory_ID) VALUES (7, 'Certified Computer Examiner (CCE)', 1);
INSERT INTO FORENSIC_ANALYST (User_ID, Certification, Laboratory_ID) VALUES (8, 'AccessData Certified Examiner (ACE)', 3);

-- ============================================================================
-- 5. LOCATION (5 Crime/Incident Scenes)
-- ============================================================================
INSERT INTO LOCATION (Location_ID, Address) VALUES (1, '12 MG Road, Bengaluru');
INSERT INTO LOCATION (Location_ID, Address) VALUES (2, '45 Anna Salai, Chennai');
INSERT INTO LOCATION (Location_ID, Address) VALUES (3, '78 Park Street, Kolkata');
INSERT INTO LOCATION (Location_ID, Address) VALUES (4, '22 Marine Drive, Mumbai');
INSERT INTO LOCATION (Location_ID, Address) VALUES (5, '9 Sector 17, Chandigarh');

-- ============================================================================
-- 6. CASE_TABLE (8 Case Dossiers)
-- ============================================================================
INSERT INTO CASE_TABLE (Case_ID, Title, Status, Created_By, Assigned_To, Location_ID, Crime_Type, Date_Opened)
VALUES (1, 'Corporate Data Breach - TechCorp Pvt Ltd', 'Under Investigation', 9, 1, 1, 'Data Breach / Exfiltration', TO_DATE('2026-01-05', 'YYYY-MM-DD'));

INSERT INTO CASE_TABLE (Case_ID, Title, Status, Created_By, Assigned_To, Location_ID, Crime_Type, Date_Opened)
VALUES (2, 'Cryptocurrency Fraud Ring', 'Open', 1, 2, 2, 'Financial Fraud', TO_DATE('2026-01-10', 'YYYY-MM-DD'));

INSERT INTO CASE_TABLE (Case_ID, Title, Status, Created_By, Assigned_To, Location_ID, Crime_Type, Date_Opened)
VALUES (3, 'Cyberstalking Case', 'Closed', 9, 3, 3, 'Harassment / Stalking', TO_DATE('2025-11-15', 'YYYY-MM-DD'));

INSERT INTO CASE_TABLE (Case_ID, Title, Status, Created_By, Assigned_To, Location_ID, Crime_Type, Date_Opened)
VALUES (4, 'Ransomware Attack - City Hospital', 'Under Investigation', 1, 1, 4, 'Ransomware Extortion', TO_DATE('2026-01-30', 'YYYY-MM-DD'));

INSERT INTO CASE_TABLE (Case_ID, Title, Status, Created_By, Assigned_To, Location_ID, Crime_Type, Date_Opened)
VALUES (5, 'Identity Theft Network', 'Open', 2, 4, 5, 'Identity Theft', TO_DATE('2026-01-20', 'YYYY-MM-DD'));

INSERT INTO CASE_TABLE (Case_ID, Title, Status, Created_By, Assigned_To, Location_ID, Crime_Type, Date_Opened)
VALUES (6, 'Corporate Espionage - Trade Secrets Leak', 'Under Investigation', 9, 2, 1, 'Corporate Espionage', TO_DATE('2025-12-10', 'YYYY-MM-DD'));

INSERT INTO CASE_TABLE (Case_ID, Title, Status, Created_By, Assigned_To, Location_ID, Crime_Type, Date_Opened)
VALUES (7, 'Missing Person - Digital Trail', 'Closed', 3, 3, 2, 'Missing Person Investigation', TO_DATE('2025-10-01', 'YYYY-MM-DD'));

INSERT INTO CASE_TABLE (Case_ID, Title, Status, Created_By, Assigned_To, Location_ID, Crime_Type, Date_Opened)
VALUES (8, 'Narcotics Trafficking - Encrypted Chat Evidence', 'Open', 1, 4, 3, 'Narcotics / Organized Crime', TO_DATE('2026-02-05', 'YYYY-MM-DD'));

-- ============================================================================
-- 7. ASSIGNED (10 Case Assignments)
-- ============================================================================
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (1, 1, TO_DATE('2026-01-05', 'YYYY-MM-DD'));
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (2, 2, TO_DATE('2026-01-10', 'YYYY-MM-DD'));
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (3, 3, TO_DATE('2025-11-15', 'YYYY-MM-DD'));
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (1, 4, TO_DATE('2026-01-30', 'YYYY-MM-DD'));
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (4, 5, TO_DATE('2026-01-20', 'YYYY-MM-DD'));
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (2, 6, TO_DATE('2025-12-10', 'YYYY-MM-DD'));
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (3, 7, TO_DATE('2025-10-01', 'YYYY-MM-DD'));
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (4, 8, TO_DATE('2026-02-05', 'YYYY-MM-DD'));
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (2, 1, TO_DATE('2026-01-06', 'YYYY-MM-DD'));
INSERT INTO ASSIGNED (User_ID, Case_ID, Assigned_Date) VALUES (4, 2, TO_DATE('2026-01-12', 'YYYY-MM-DD'));

-- ============================================================================
-- 8. EVIDENCE (15 Seized Forensic Artifacts)
-- ============================================================================
INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (1, 'Seized laptop from suspect residence', TO_DATE('2026-01-05', 'YYYY-MM-DD'), 1, 'Under Analysis', 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (2, 'Server access log export (.log)', TO_DATE('2026-01-06', 'YYYY-MM-DD'), 1, 'In Storage', 'b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff011');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (3, 'Mobile phone - suspect (Android)', TO_DATE('2026-01-10', 'YYYY-MM-DD'), 2, 'Under Analysis', 'c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff01122');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (4, 'Wallet transaction export (.csv)', TO_DATE('2026-01-11', 'YYYY-MM-DD'), 2, 'Presented in Court', 'd4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0112233');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (5, 'Suspect desktop hard drive image', TO_DATE('2025-11-20', 'YYYY-MM-DD'), 3, 'Archived', 'e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff011223344');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (6, 'Social media message export (.pdf)', TO_DATE('2025-11-21', 'YYYY-MM-DD'), 3, 'Archived', 'f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff01122334455');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (7, 'Hospital server memory dump', TO_DATE('2026-02-01', 'YYYY-MM-DD'), 4, 'Under Analysis', '0718293a4b5c6d7e8f90112233445566778899aabbccddeeff0112233445566');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (8, 'Ransomware binary sample', TO_DATE('2026-02-01', 'YYYY-MM-DD'), 4, 'Under Analysis', '18293a4b5c6d7e8f90112233445566778899aabbccddeeff011223344556677');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (9, 'Network capture file (.pcap)', TO_DATE('2026-02-02', 'YYYY-MM-DD'), 4, 'In Storage', '293a4b5c6d7e8f90112233445566778899aabbccddeeff01122334455667788');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (10, 'Phishing email header export', TO_DATE('2026-01-25', 'YYYY-MM-DD'), 5, 'Collected', '3a4b5c6d7e8f90112233445566778899aabbccddeeff0112233445566778899');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (11, 'Bank statement PDF export', TO_DATE('2026-01-26', 'YYYY-MM-DD'), 5, 'In Storage', '4b5c6d7e8f90112233445566778899aabbccddeeff0112233445566778899aa');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (12, 'Company laptop - departing employee', TO_DATE('2025-12-15', 'YYYY-MM-DD'), 6, 'Under Analysis', '5c6d7e8f90112233445566778899aabbccddeeff0112233445566778899aabb');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (13, 'USB drive with exported files', TO_DATE('2025-12-15', 'YYYY-MM-DD'), 6, 'In Storage', '6d7e8f90112233445566778899aabbccddeeff0112233445566778899aabbcc');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (14, 'Missing person phone GPS extraction', TO_DATE('2025-10-05', 'YYYY-MM-DD'), 7, 'Presented in Court', '7e8f90112233445566778899aabbccddeeff0112233445566778899aabbccdd');

INSERT INTO EVIDENCE (Evidence_ID, Description, Collection_Date, Case_ID, Status, Hash_Value)
VALUES (15, 'Encrypted messaging app chat export', TO_DATE('2026-02-10', 'YYYY-MM-DD'), 8, 'Under Analysis', '8f90112233445566778899aabbccddeeff0112233445566778899aabbccddee');

-- ============================================================================
-- 9. DEVICE (6 Hardware Profiles)
-- ============================================================================
INSERT INTO DEVICE (Device_ID, Serial_Number, Evidence_ID) VALUES (1, 'DELL-LT-88213X', 1);
INSERT INTO DEVICE (Device_ID, Serial_Number, Evidence_ID) VALUES (2, 'SAMS-MOB-77410Y', 3);
INSERT INTO DEVICE (Device_ID, Serial_Number, Evidence_ID) VALUES (3, 'WD-HDD-55219Z', 5);
INSERT INTO DEVICE (Device_ID, Serial_Number, Evidence_ID) VALUES (4, 'HP-LT-33012A', 12);
INSERT INTO DEVICE (Device_ID, Serial_Number, Evidence_ID) VALUES (5, 'SANDISK-USB-44871B', 13);
INSERT INTO DEVICE (Device_ID, Serial_Number, Evidence_ID) VALUES (6, 'IPHN-MOB-99201C', 14);

-- ============================================================================
-- 10. FILE_RECORD (9 Digital Forensic Files)
-- ============================================================================
INSERT INTO FILE_RECORD (File_ID, Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
VALUES (1, 2, 'server_access_log.log', 'evidence_vault/case_1/server_access_log.log', 1048576, 'text/plain');

INSERT INTO FILE_RECORD (File_ID, Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
VALUES (2, 4, 'wallet_transactions.csv', 'evidence_vault/case_2/wallet_transactions.csv', 524288, 'text/csv');

INSERT INTO FILE_RECORD (File_ID, Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
VALUES (3, 6, 'social_messages.pdf', 'evidence_vault/case_3/social_messages.pdf', 2097152, 'application/pdf');

INSERT INTO FILE_RECORD (File_ID, Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
VALUES (4, 7, 'memdump_hospital_srv.raw', 'evidence_vault/case_4/memdump_hospital_srv.raw', 8388608, 'application/octet-stream');

INSERT INTO FILE_RECORD (File_ID, Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
VALUES (5, 8, 'ransomware_sample.bin', 'evidence_vault/case_4/ransomware_sample.bin', 65536, 'application/octet-stream');

INSERT INTO FILE_RECORD (File_ID, Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
VALUES (6, 9, 'hospital_traffic.pcap', 'evidence_vault/case_4/hospital_traffic.pcap', 16777216, 'application/vnd.tcpdump.pcap');

INSERT INTO FILE_RECORD (File_ID, Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
VALUES (7, 10, 'phishing_headers.eml', 'evidence_vault/case_5/phishing_headers.eml', 32768, 'message/rfc822');

INSERT INTO FILE_RECORD (File_ID, Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
VALUES (8, 11, 'bank_statement_export.pdf', 'evidence_vault/case_5/bank_statement_export.pdf', 1048576, 'application/pdf');

INSERT INTO FILE_RECORD (File_ID, Evidence_ID, File_Name, File_Path, File_Size, Mime_Type) 
VALUES (9, 15, 'encrypted_chat_backup.enc', 'evidence_vault/case_8/encrypted_chat_backup.enc', 4194304, 'application/octet-stream');

-- ============================================================================
-- 11. CHAIN_OF_CUSTODY (33 Historical Events)
-- ============================================================================
INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (1, TO_TIMESTAMP('2026-01-05 09:15:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 1, 1);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (2, TO_TIMESTAMP('2026-01-05 14:30:00', 'YYYY-MM-DD HH24:MI:SS'), 'Transferred to lab', 1, 1);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (3, TO_TIMESTAMP('2026-01-06 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Analysis started', 1, 5);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (4, TO_TIMESTAMP('2026-01-06 11:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 2, 1);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (5, TO_TIMESTAMP('2026-01-06 16:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Logged into storage', 2, 1);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (6, TO_TIMESTAMP('2026-01-10 08:45:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 3, 2);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (7, TO_TIMESTAMP('2026-01-10 13:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Transferred to lab', 3, 2);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (8, TO_TIMESTAMP('2026-01-11 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Analysis started', 3, 6);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (9, TO_TIMESTAMP('2026-01-11 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 4, 2);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (10, TO_TIMESTAMP('2026-01-20 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Presented in court', 4, 2);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (11, TO_TIMESTAMP('2025-11-20 12:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 5, 3);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (12, TO_TIMESTAMP('2025-12-01 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Archived after case closure', 5, 3);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (13, TO_TIMESTAMP('2025-11-21 15:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 6, 3);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (14, TO_TIMESTAMP('2025-12-01 09:10:00', 'YYYY-MM-DD HH24:MI:SS'), 'Archived after case closure', 6, 3);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (15, TO_TIMESTAMP('2026-02-01 07:30:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 7, 1);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (16, TO_TIMESTAMP('2026-02-01 12:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Transferred to lab', 7, 1);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (17, TO_TIMESTAMP('2026-02-02 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Analysis started', 7, 7);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (18, TO_TIMESTAMP('2026-02-01 08:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 8, 1);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (19, TO_TIMESTAMP('2026-02-02 09:30:00', 'YYYY-MM-DD HH24:MI:SS'), 'Analysis started', 8, 7);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (20, TO_TIMESTAMP('2026-02-02 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 9, 1);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (21, TO_TIMESTAMP('2026-02-02 15:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Logged into storage', 9, 1);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (22, TO_TIMESTAMP('2026-01-25 11:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 10, 4);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (23, TO_TIMESTAMP('2026-01-26 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 11, 4);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (24, TO_TIMESTAMP('2026-01-27 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Logged into storage', 11, 4);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (25, TO_TIMESTAMP('2025-12-15 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 12, 2);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (26, TO_TIMESTAMP('2025-12-16 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Transferred to lab', 12, 2);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (27, TO_TIMESTAMP('2025-12-17 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Analysis started', 12, 8);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (28, TO_TIMESTAMP('2025-12-15 09:05:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 13, 2);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (29, TO_TIMESTAMP('2025-12-16 09:05:00', 'YYYY-MM-DD HH24:MI:SS'), 'Logged into storage', 13, 2);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (30, TO_TIMESTAMP('2025-10-05 08:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 14, 3);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (31, TO_TIMESTAMP('2025-10-20 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Presented in court', 14, 3);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (32, TO_TIMESTAMP('2026-02-10 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Collected at scene', 15, 4);

INSERT INTO CHAIN_OF_CUSTODY (Custody_ID, Timestamp_At, Action, Evidence_ID, User_ID)
VALUES (33, TO_TIMESTAMP('2026-02-11 09:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'Analysis started', 15, 8);

-- ============================================================================
-- 12. FORENSIC_ANALYSIS (8 Examination Findings)
-- ============================================================================
INSERT INTO FORENSIC_ANALYSIS (Analysis_ID, Findings, Evidence_ID, Analyst_ID, Timestamp_At)
VALUES (1, 'Recovered deleted files indicating unauthorized data export prior to breach.', 1, 5, TO_TIMESTAMP('2026-01-08 14:00:00', 'YYYY-MM-DD HH24:MI:SS'));

INSERT INTO FORENSIC_ANALYSIS (Analysis_ID, Findings, Evidence_ID, Analyst_ID, Timestamp_At)
VALUES (2, 'Confirmed SIM swap activity and unauthorized wallet access attempts.', 3, 6, TO_TIMESTAMP('2026-01-14 11:30:00', 'YYYY-MM-DD HH24:MI:SS'));

INSERT INTO FORENSIC_ANALYSIS (Analysis_ID, Findings, Evidence_ID, Analyst_ID, Timestamp_At)
VALUES (3, 'Transaction trail matches suspect wallet addresses across 3 exchanges.', 4, 6, TO_TIMESTAMP('2026-01-16 16:45:00', 'YYYY-MM-DD HH24:MI:SS'));

INSERT INTO FORENSIC_ANALYSIS (Analysis_ID, Findings, Evidence_ID, Analyst_ID, Timestamp_At)
VALUES (4, 'Memory dump shows ransomware process injection and C2 communication.', 7, 7, TO_TIMESTAMP('2026-02-04 10:15:00', 'YYYY-MM-DD HH24:MI:SS'));

INSERT INTO FORENSIC_ANALYSIS (Analysis_ID, Findings, Evidence_ID, Analyst_ID, Timestamp_At)
VALUES (5, 'Binary matches known ransomware family signature; encryption routine identified.', 8, 7, TO_TIMESTAMP('2026-02-05 15:20:00', 'YYYY-MM-DD HH24:MI:SS'));

INSERT INTO FORENSIC_ANALYSIS (Analysis_ID, Findings, Evidence_ID, Analyst_ID, Timestamp_At)
VALUES (6, 'Recovered corporate documents transferred to personal cloud storage.', 12, 8, TO_TIMESTAMP('2025-12-20 13:10:00', 'YYYY-MM-DD HH24:MI:SS'));

INSERT INTO FORENSIC_ANALYSIS (Analysis_ID, Findings, Evidence_ID, Analyst_ID, Timestamp_At)
VALUES (7, 'GPS extraction places device at last known location on date of disappearance.', 14, 5, TO_TIMESTAMP('2025-10-12 09:40:00', 'YYYY-MM-DD HH24:MI:SS'));

INSERT INTO FORENSIC_ANALYSIS (Analysis_ID, Findings, Evidence_ID, Analyst_ID, Timestamp_At)
VALUES (8, 'Chat export decrypted; references to shipment coordination identified.', 15, 8, TO_TIMESTAMP('2026-02-14 17:00:00', 'YYYY-MM-DD HH24:MI:SS'));

-- ============================================================================
-- 13. RESTART IDENTITY SEQUENCES
-- Advances Oracle internal identity sequences past the manually seeded IDs
-- to prevent ORA-00001 (unique constraint violation) on subsequent application inserts.
-- ============================================================================
ALTER TABLE APP_USER MODIFY (User_ID GENERATED BY DEFAULT AS IDENTITY (START WITH 11));
ALTER TABLE LABORATORY MODIFY (Laboratory_ID GENERATED BY DEFAULT AS IDENTITY (START WITH 4));
ALTER TABLE LOCATION MODIFY (Location_ID GENERATED BY DEFAULT AS IDENTITY (START WITH 6));
ALTER TABLE CASE_TABLE MODIFY (Case_ID GENERATED BY DEFAULT AS IDENTITY (START WITH 9));
ALTER TABLE EVIDENCE MODIFY (Evidence_ID GENERATED BY DEFAULT AS IDENTITY (START WITH 16));
ALTER TABLE DEVICE MODIFY (Device_ID GENERATED BY DEFAULT AS IDENTITY (START WITH 7));
ALTER TABLE FILE_RECORD MODIFY (File_ID GENERATED BY DEFAULT AS IDENTITY (START WITH 10));
ALTER TABLE CHAIN_OF_CUSTODY MODIFY (Custody_ID GENERATED BY DEFAULT AS IDENTITY (START WITH 34));
ALTER TABLE FORENSIC_ANALYSIS MODIFY (Analysis_ID GENERATED BY DEFAULT AS IDENTITY (START WITH 9));

COMMIT;
