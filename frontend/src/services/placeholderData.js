/**
 * ============================================================================
 * DFEMS — DEVELOPMENT PLACEHOLDER DATASET (PHASE 1 FRONTEND FOUNDATION)
 * ============================================================================
 * NOTICE & DOCUMENTATION OF REMOVAL:
 * This file provides baseline layout data strictly derived from the verified
 * DA2 Oracle seed dataset (15 evidence items, 8 cases, 10 users, 33 custody events).
 *
 * It exists ONLY to validate frontend UI/UX typography, tables, and responsiveness
 * in Phase 1 before the Express API & Oracle FREEPDB1 connection are wired up.
 *
 * REMOVAL ROADMAP:
 * In Phase 2 & 3, each component will be switched to live Axios API calls
 * (e.g. api.getCases(), api.getEvidence(), api.getCustodyTrail(id)) backed by
 * the Node.js oracledb driver connected to FREEPDB1.
 * ============================================================================
 */

export const IS_DEVELOPMENT_PLACEHOLDER = true;

export const INITIAL_USERS = [
  { id: 1, firstName: 'Ravi', lastName: 'Kumar', phone: '9876500001', username: 'ravi.kumar', role: 'Investigator', badge: 'INV-1001', status: 'Active' },
  { id: 2, firstName: 'Ananya', lastName: 'Rao', phone: '9876500002', username: 'ananya.rao', role: 'Investigator', badge: 'INV-1002', status: 'Active' },
  { id: 3, firstName: 'Suresh', lastName: 'Iyer', phone: '9876500003', username: 'suresh.iyer', role: 'Investigator', badge: 'INV-1003', status: 'Active' },
  { id: 4, firstName: 'Priya', lastName: 'Nair', phone: '9876500004', username: 'priya.nair', role: 'Investigator', badge: 'INV-1004', status: 'Active' },
  { id: 5, firstName: 'Karthik', lastName: 'Menon', phone: '9876500005', username: 'karthik.menon', role: 'Forensic Examiner', cert: 'EnCase Certified Examiner (EnCE)', lab: 'Central Forensic Science Laboratory', status: 'Active' },
  { id: 6, firstName: 'Divya', lastName: 'Pillai', phone: '9876500006', username: 'divya.pillai', role: 'Forensic Examiner', cert: 'GIAC Certified Forensic Analyst (GCFA)', lab: 'Cyber Forensics Unit Lab', status: 'Active' },
  { id: 7, firstName: 'Arjun', lastName: 'Reddy', phone: '9876500007', username: 'arjun.reddy', role: 'Forensic Examiner', cert: 'Certified Computer Examiner (CCE)', lab: 'Central Forensic Science Laboratory', status: 'Active' },
  { id: 8, firstName: 'Meera', lastName: 'Krishnan', phone: '9876500008', username: 'meera.krishnan', role: 'Forensic Examiner', cert: 'AccessData Certified Examiner (ACE)', lab: 'Regional Digital Forensics Lab', status: 'Active' },
  { id: 9, firstName: 'Vikram', lastName: 'Shah', phone: '9876500009', username: 'vikram.shah', role: 'Admin', status: 'Active' },
  { id: 10, firstName: 'Lakshmi', lastName: 'Narayan', phone: '9876500010', username: 'lakshmi.narayan', role: 'Auditor', status: 'Active' },
];

export const INITIAL_CASES = [
  { id: 1, title: 'Corporate Data Breach - TechCorp Pvt Ltd', status: 'Under Investigation', createdBy: 'Vikram Shah', assignedTo: 'Ravi Kumar', location: '12 MG Road, Bengaluru', crimeType: 'Data Exfiltration', evidenceCount: 2, dateOpened: '2026-01-05' },
  { id: 2, title: 'Cryptocurrency Fraud Ring', status: 'Open', createdBy: 'Ravi Kumar', assignedTo: 'Ananya Rao', location: '45 Anna Salai, Chennai', crimeType: 'Financial Fraud', evidenceCount: 2, dateOpened: '2026-01-10' },
  { id: 3, title: 'Cyberstalking Case', status: 'Closed', createdBy: 'Vikram Shah', assignedTo: 'Suresh Iyer', location: '78 Park Street, Kolkata', crimeType: 'Cyber Harassment', evidenceCount: 2, dateOpened: '2025-11-15' },
  { id: 4, title: 'Ransomware Attack - City Hospital', status: 'Under Investigation', createdBy: 'Ravi Kumar', assignedTo: 'Ravi Kumar', location: '22 Marine Drive, Mumbai', crimeType: 'Ransomware Extortion', evidenceCount: 3, dateOpened: '2026-01-30' },
  { id: 5, title: 'Identity Theft Network', status: 'Open', createdBy: 'Ananya Rao', assignedTo: 'Priya Nair', location: '9 Sector 17, Chandigarh', crimeType: 'Identity Theft', evidenceCount: 2, dateOpened: '2026-01-20' },
  { id: 6, title: 'Corporate Espionage - Trade Secrets Leak', status: 'Under Investigation', createdBy: 'Vikram Shah', assignedTo: 'Ananya Rao', location: '12 MG Road, Bengaluru', crimeType: 'Corporate Espionage', evidenceCount: 2, dateOpened: '2025-12-10' },
  { id: 7, title: 'Missing Person - Digital Trail', status: 'Closed', createdBy: 'Suresh Iyer', assignedTo: 'Suresh Iyer', location: '45 Anna Salai, Chennai', crimeType: 'Missing Person', evidenceCount: 1, dateOpened: '2025-10-01' },
  { id: 8, title: 'Narcotics Trafficking - Encrypted Chat Evidence', status: 'Open', createdBy: 'Ravi Kumar', assignedTo: 'Priya Nair', location: '78 Park Street, Kolkata', crimeType: 'Narcotics', evidenceCount: 1, dateOpened: '2026-02-05' },
];

export const INITIAL_EVIDENCE = [
  { id: 1, description: 'Seized laptop from suspect residence', collectionDate: '2026-01-05', caseId: 1, caseTitle: 'Corporate Data Breach - TechCorp Pvt Ltd', status: 'Under Analysis', type: 'Device', serial: 'DELL-LT-88213X', hash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0', integrityStatus: 'VERIFIED' },
  { id: 2, description: 'Server access log export (.log)', collectionDate: '2026-01-06', caseId: 1, caseTitle: 'Corporate Data Breach - TechCorp Pvt Ltd', status: 'In Storage', type: 'File', hash: 'b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff011', integrityStatus: 'VERIFIED' },
  { id: 3, description: 'Mobile phone - suspect (Android)', collectionDate: '2026-01-10', caseId: 2, caseTitle: 'Cryptocurrency Fraud Ring', status: 'Under Analysis', type: 'Device', serial: 'SAMS-MOB-77410Y', hash: 'c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff01122', integrityStatus: 'VERIFIED' },
  { id: 4, description: 'Wallet transaction export (.csv)', collectionDate: '2026-01-11', caseId: 2, caseTitle: 'Cryptocurrency Fraud Ring', status: 'Presented in Court', type: 'File', hash: 'd4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0112233', integrityStatus: 'VERIFIED' },
  { id: 5, description: 'Suspect desktop hard drive image', collectionDate: '2025-11-20', caseId: 3, caseTitle: 'Cyberstalking Case', status: 'Archived', type: 'Device', serial: 'WD-HDD-55219Z', hash: 'e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff011223344', integrityStatus: 'VERIFIED' },
  { id: 6, description: 'Social media message export (.pdf)', collectionDate: '2025-11-21', caseId: 3, caseTitle: 'Cyberstalking Case', status: 'Archived', type: 'File', hash: 'f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff01122334455', integrityStatus: 'VERIFIED' },
  { id: 7, description: 'Hospital server memory dump', collectionDate: '2026-02-01', caseId: 4, caseTitle: 'Ransomware Attack - City Hospital', status: 'Under Analysis', type: 'File', hash: '0718293a4b5c6d7e8f90112233445566778899aabbccddeeff0112233445566', integrityStatus: 'VERIFIED' },
  { id: 8, description: 'Ransomware binary sample', collectionDate: '2026-02-01', caseId: 4, caseTitle: 'Ransomware Attack - City Hospital', status: 'Under Analysis', type: 'File', hash: '18293a4b5c6d7e8f90112233445566778899aabbccddeeff011223344556677', integrityStatus: 'VERIFIED' },
  { id: 9, description: 'Network capture file (.pcap)', collectionDate: '2026-02-02', caseId: 4, caseTitle: 'Ransomware Attack - City Hospital', status: 'In Storage', type: 'File', hash: '293a4b5c6d7e8f90112233445566778899aabbccddeeff01122334455667788', integrityStatus: 'VERIFIED' },
  { id: 10, description: 'Phishing email header export', collectionDate: '2026-01-25', caseId: 5, caseTitle: 'Identity Theft Network', status: 'Collected', type: 'File', hash: '3a4b5c6d7e8f90112233445566778899aabbccddeeff0112233445566778899', integrityStatus: 'VERIFIED' },
  { id: 11, description: 'Bank statement PDF export', collectionDate: '2026-01-26', caseId: 5, caseTitle: 'Identity Theft Network', status: 'In Storage', type: 'File', hash: '4b5c6d7e8f90112233445566778899aabbccddeeff0112233445566778899aa', integrityStatus: 'VERIFIED' },
  { id: 12, description: 'Company laptop - departing employee', collectionDate: '2025-12-15', caseId: 6, caseTitle: 'Corporate Espionage - Trade Secrets Leak', status: 'Under Analysis', type: 'Device', serial: 'HP-LT-33012A', hash: '5c6d7e8f90112233445566778899aabbccddeeff0112233445566778899aabb', integrityStatus: 'VERIFIED' },
  { id: 13, description: 'USB drive with exported files', collectionDate: '2025-12-15', caseId: 6, caseTitle: 'Corporate Espionage - Trade Secrets Leak', status: 'In Storage', type: 'Device', serial: 'SANDISK-USB-44871B', hash: '6d7e8f90112233445566778899aabbccddeeff0112233445566778899aabbcc', integrityStatus: 'VERIFIED' },
  { id: 14, description: 'Missing person phone GPS extraction', collectionDate: '2025-10-05', caseId: 7, caseTitle: 'Missing Person - Digital Trail', status: 'Presented in Court', type: 'Device', serial: 'IPHN-MOB-99201C', hash: '7e8f90112233445566778899aabbccddeeff0112233445566778899aabbccdd', integrityStatus: 'VERIFIED' },
  { id: 15, description: 'Encrypted messaging app chat export', collectionDate: '2026-02-10', caseId: 8, caseTitle: 'Narcotics Trafficking - Encrypted Chat Evidence', status: 'Under Analysis', type: 'File', hash: '8f90112233445566778899aabbccddeeff0112233445566778899aabbccddee', integrityStatus: 'VERIFIED' },
];

export const INITIAL_CUSTODY = [
  { id: 1, evidenceId: 1, evidenceDesc: 'Seized laptop from suspect residence', caseTitle: 'Corporate Data Breach - TechCorp Pvt Ltd', timestamp: '2026-01-05 09:15:00', action: 'Collected at scene', actor: 'Ravi Kumar' },
  { id: 2, evidenceId: 1, evidenceDesc: 'Seized laptop from suspect residence', caseTitle: 'Corporate Data Breach - TechCorp Pvt Ltd', timestamp: '2026-01-05 14:30:00', action: 'Transferred to lab', actor: 'Ravi Kumar' },
  { id: 3, evidenceId: 1, evidenceDesc: 'Seized laptop from suspect residence', caseTitle: 'Corporate Data Breach - TechCorp Pvt Ltd', timestamp: '2026-01-06 10:00:00', action: 'Analysis started', actor: 'Karthik Menon' },
  { id: 4, evidenceId: 2, evidenceDesc: 'Server access log export (.log)', caseTitle: 'Corporate Data Breach - TechCorp Pvt Ltd', timestamp: '2026-01-06 11:00:00', action: 'Collected at scene', actor: 'Ravi Kumar' },
  { id: 5, evidenceId: 2, evidenceDesc: 'Server access log export (.log)', caseTitle: 'Corporate Data Breach - TechCorp Pvt Ltd', timestamp: '2026-01-06 16:00:00', action: 'Logged into storage', actor: 'Ravi Kumar' },
  { id: 6, evidenceId: 3, evidenceDesc: 'Mobile phone - suspect (Android)', caseTitle: 'Cryptocurrency Fraud Ring', timestamp: '2026-01-10 08:45:00', action: 'Collected at scene', actor: 'Ananya Rao' },
  { id: 7, evidenceId: 3, evidenceDesc: 'Mobile phone - suspect (Android)', caseTitle: 'Cryptocurrency Fraud Ring', timestamp: '2026-01-10 13:00:00', action: 'Transferred to lab', actor: 'Ananya Rao' },
  { id: 8, evidenceId: 3, evidenceDesc: 'Mobile phone - suspect (Android)', caseTitle: 'Cryptocurrency Fraud Ring', timestamp: '2026-01-11 09:00:00', action: 'Analysis started', actor: 'Divya Pillai' },
  { id: 9, evidenceId: 4, evidenceDesc: 'Wallet transaction export (.csv)', caseTitle: 'Cryptocurrency Fraud Ring', timestamp: '2026-01-11 10:00:00', action: 'Collected at scene', actor: 'Ananya Rao' },
  { id: 10, evidenceId: 4, evidenceDesc: 'Wallet transaction export (.csv)', caseTitle: 'Cryptocurrency Fraud Ring', timestamp: '2026-01-20 09:00:00', action: 'Presented in court', actor: 'Ananya Rao' },
];

export const INITIAL_ANALYSES = [
  { id: 1, evidenceId: 1, evidenceDesc: 'Seized laptop from suspect residence', analyst: 'Karthik Menon', lab: 'Central Forensic Science Laboratory', cert: 'EnCE', findings: 'Recovered deleted files indicating unauthorized data export prior to breach.', timestamp: '2026-01-08 14:00:00' },
  { id: 2, evidenceId: 3, evidenceDesc: 'Mobile phone - suspect (Android)', analyst: 'Divya Pillai', lab: 'Cyber Forensics Unit Lab', cert: 'GCFA', findings: 'Confirmed SIM swap activity and unauthorized wallet access attempts.', timestamp: '2026-01-14 11:30:00' },
  { id: 3, evidenceId: 4, evidenceDesc: 'Wallet transaction export (.csv)', analyst: 'Divya Pillai', lab: 'Cyber Forensics Unit Lab', cert: 'GCFA', findings: 'Transaction trail matches suspect wallet addresses across 3 exchanges.', timestamp: '2026-01-16 16:45:00' },
  { id: 4, evidenceId: 7, evidenceDesc: 'Hospital server memory dump', analyst: 'Arjun Reddy', lab: 'Central Forensic Science Laboratory', cert: 'CCE', findings: 'Memory dump shows ransomware process injection and C2 communication.', timestamp: '2026-02-04 10:15:00' },
  { id: 5, evidenceId: 8, evidenceDesc: 'Ransomware binary sample', analyst: 'Arjun Reddy', lab: 'Central Forensic Science Laboratory', cert: 'CCE', findings: 'Binary matches known ransomware family signature; encryption routine identified.', timestamp: '2026-02-05 15:20:00' },
  { id: 6, evidenceId: 12, evidenceDesc: 'Company laptop - departing employee', analyst: 'Meera Krishnan', lab: 'Regional Digital Forensics Lab', cert: 'ACE', findings: 'Recovered corporate documents transferred to personal cloud storage.', timestamp: '2025-12-20 13:10:00' },
  { id: 7, evidenceId: 14, evidenceDesc: 'Missing person phone GPS extraction', analyst: 'Karthik Menon', lab: 'Central Forensic Science Laboratory', cert: 'EnCE', findings: 'GPS extraction places device at last known location on date of disappearance.', timestamp: '2025-10-12 09:40:00' },
  { id: 8, evidenceId: 15, evidenceDesc: 'Encrypted messaging app chat export', analyst: 'Meera Krishnan', lab: 'Regional Digital Forensics Lab', cert: 'ACE', findings: 'Chat export decrypted; references to shipment coordination identified.', timestamp: '2026-02-14 17:00:00' },
];

export const INITIAL_STALE_ALERTS = [
  { evidenceId: 1, description: 'Seized laptop from suspect residence', status: 'Under Analysis', days: 248 },
  { evidenceId: 2, description: 'Server access log export (.log)', status: 'In Storage', days: 247 },
  { evidenceId: 3, description: 'Mobile phone - suspect (Android)', status: 'Under Analysis', days: 243 },
  { evidenceId: 7, description: 'Hospital server memory dump', status: 'Under Analysis', days: 221 },
  { evidenceId: 8, description: 'Ransomware binary sample', status: 'Under Analysis', days: 221 },
  { evidenceId: 9, description: 'Network capture file (.pcap)', status: 'In Storage', days: 220 },
  { evidenceId: 10, description: 'Phishing email header export', status: 'Collected', days: 228 },
  { evidenceId: 11, description: 'Bank statement PDF export', status: 'In Storage', days: 227 },
  { evidenceId: 12, description: 'Company laptop - departing employee', status: 'Under Analysis', days: 269 },
  { evidenceId: 13, description: 'USB drive with exported files', status: 'In Storage', days: 269 },
  { evidenceId: 15, description: 'Encrypted messaging app chat export', status: 'Under Analysis', days: 212 },
];

export const INITIAL_AUDIT_LOGS = [
  { id: 101, timestamp: '2026-10-10 16:45:12', actor: 'ravi.kumar', role: 'Investigator', eventType: 'LOGIN_SUCCESS', ip: '10.0.4.15', details: 'User authenticated via password + session token', status: 'SUCCESS' },
  { id: 102, timestamp: '2026-10-10 16:48:30', actor: 'ravi.kumar', role: 'Investigator', eventType: 'EVIDENCE_ACCESSED', ip: '10.0.4.15', details: 'Viewed metadata and chain of custody for Evidence #1 (DELL-LT-88213X)', status: 'SUCCESS' },
  { id: 103, timestamp: '2026-10-10 16:50:04', actor: 'ravi.kumar', role: 'Investigator', eventType: 'HASH_VERIFIED', ip: '10.0.4.15', details: 'Executed fn_verify_hash against Evidence #1 — Computed matches intake digest', status: 'SUCCESS' },
  { id: 104, timestamp: '2026-10-10 16:52:19', actor: 'karthik.menon', role: 'Forensic Examiner', eventType: 'ANALYSIS_RECORDED', ip: '10.0.8.21', details: 'Invoked sp_add_analysis for Evidence #1 at Central Forensic Science Laboratory', status: 'SUCCESS' },
  { id: 105, timestamp: '2026-10-10 16:55:40', actor: 'unknown_host', role: 'N/A', eventType: 'LOGIN_FAILED', ip: '192.168.1.99', details: 'Failed authentication attempt: Invalid credential signature for user admin_temp', status: 'DENIED' },
  { id: 106, timestamp: '2026-10-10 16:58:02', actor: 'lakshmi.narayan', role: 'Auditor', eventType: 'CHAIN_OF_CUSTODY_EXPORT', ip: '10.0.2.10', details: 'Exported court-admissible custody ledger for Case #1', status: 'SUCCESS' },
  { id: 107, timestamp: '2026-10-10 17:01:15', actor: 'priya.nair', role: 'Investigator', eventType: 'CUSTODY_TRANSFER', ip: '10.0.4.18', details: 'Transfer custody event recorded for Evidence #10 — Received at vault', status: 'SUCCESS' },
  { id: 108, timestamp: '2026-10-10 17:05:44', actor: 'vikram.shah', role: 'Admin', eventType: 'USER_PERMISSION_MODIFIED', ip: '10.0.1.2', details: 'Verified role access boundaries for forensic examiners', status: 'SUCCESS' },
  { id: 109, timestamp: '2026-10-10 17:12:00', actor: 'unauthorized_actor', role: 'Guest', eventType: 'TAMPER_PREVENTION_TRIGGERED', ip: '192.168.1.104', details: 'Blocked direct UPDATE attempt on CHAIN_OF_CUSTODY table via trg_custody_no_update', status: 'BLOCKED' },
];

