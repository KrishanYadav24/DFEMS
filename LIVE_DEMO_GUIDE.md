# DFEMS — Live Demonstration & Evaluation Guide
**Digital Forensic Evidence Management System (DFEMS)**  
**Target Platform:** Oracle Database 26ai Free (`FREEPDB1` Pluggable Database)  
**Author / Candidate:** Krishan Yadav (25BRS1220)  
**Status:** **Phase 9 Integration & Verification Complete**

---

## 1. Prerequisites & Environment Setup

Ensure the following prerequisites are met before beginning the demonstration:

### 1.1 Services & Ports
1. **Oracle Database 26ai Free:** Running on `localhost:1521/FREEPDB1`.
2. **Backend Express API:** Running on `http://localhost:5000`.
3. **Frontend Vite UI:** Running on `http://localhost:5173`.

### 1.2 Starting the Servers
From two separate PowerShell or Bash terminals:

**Terminal 1 — Backend:**
```powershell
cd d:\DEFMS\backend
npm start
```
*Expected Output:*
```
[INFO] Oracle 26ai connection pool established successfully.
[INFO] Server running in development mode on port 5000.
```

**Terminal 2 — Frontend:**
```powershell
cd d:\DEFMS\frontend
npm run dev
```
*Expected Output:*
```
VITE v8.3.4  ready in 320 ms
➜  Local:   http://localhost:5173/
```

### 1.3 Demonstration Credentials
| Role | Username | Password | Purpose / Scoped Permissions |
|---|---|---|---|
| **System Admin** | `Krishan` | `Krishan_2404` | Full system access, audit log viewer, user management, PDF exports |
| **Investigator** | `ravi.kumar` | `Investigator_2404` | Case creation, evidence registration, custody transfer initiation |
| **Lab Technician / Examiner** | `karthik.menon` | `Examiner_2404` | Forensic analysis findings, hash verification, examiner certification |

---

## 2. Step-by-Step Live Demonstration Script

Follow these 13 steps in sequence for a complete live evaluation:

### Step 1: Real Oracle 26ai Database Connectivity
1. Open browser to `http://localhost:5173`.
2. Observe the Topbar **Database Health Indicator**:
   - Status badge displays **"Oracle 26ai Connected"** with a green pulse dot.
   - PDB target: `FREEPDB1`, schema: `dfems_user`.
3. *(Alternative / Verification via CLI):*
   ```powershell
   cd d:\DEFMS\backend
   npm run test:db
   ```
   *Proves live TCP Thin-Mode communication with Oracle latency < 150ms.*

---

### Step 2: Authentication & RBAC Verification
1. Log in as Administrator:
   - Username: `Krishan`
   - Password: `Krishan_2404`
2. Observe successful authentication, JWT issuance, and redirection to the **Dashboard**.
3. Verify that the Topbar displays the user badge: **"Krishan — Admin"**.
4. Log out and demonstrate rejection of invalid credentials:
   - Try username: `Krishan` with password `WrongPassword!`.
   - Observe error banner: *"Invalid username or password"*.

---

### Step 3: Interactive Dashboard & Live KPIs
1. Log back in as `Krishan`.
2. Review the live KPI cards:
   - **Active Cases** (real-time `COUNT(*)` from `CASE_TABLE`).
   - **Total Evidence Items** (real-time `COUNT(*)` from `EVIDENCE`).
   - **Custody Transfers** (real-time count from `CHAIN_OF_CUSTODY`).
   - **Stale Evidence Alerts** (computed via `sp_flag_stale_evidence`).
3. Review charts powered by live Oracle data:
   - Evidence by Status distribution.
   - Evidence by Classification (Device vs. File).

---

### Step 4: Case Creation & Permitted Status Transitions
1. Navigate to **Cases** (`/cases`).
2. Click **"+ New Case"**:
   - Title: `Operation Phantom Breach — Corporate Extortion`
   - Crime Type: `Ransomware & IP Exfiltration`
   - Location: `Cyber Cell HQ - New Delhi`
3. Click **"Create Case"**.
4. Observe the immediate appearance of the new case in the table with initial status **`Open`**.
5. Click on the newly created case row:
   - Change Status to **`Under Investigation`**.
   - Observe status pill update and automatic entry created in `AUDIT_LOG`.

---

### Step 5: Evidence Intake & Cryptographic Hashing
1. Navigate to **Evidence** (`/evidence`).
2. Click **"+ Register Evidence"**:
   - Parent Case: Select `Operation Phantom Breach`.
   - Category: `Digital Device` (or `File Record`).
   - Description: `Western Digital 4TB Red NAS Hard Drive`.
   - Serial Number: `WDC-WD40EFAX-68JH4N0`.
   - Upload any sample forensic image or document.
3. Observe real-time **SHA-256 computation** directly from file bytes.
4. Click **"Register Evidence"**:
   - Atomically inserts into `EVIDENCE` and `DEVICE`.
   - Invokes Oracle procedure `sp_register_evidence`.
   - Automatically writes initial custodial intake into `CHAIN_OF_CUSTODY`.

---

### Step 6: Evidence Integrity & Cryptographic Tamper Detection
1. Locate the newly registered evidence item in the table.
2. Click **"Verify Integrity"**:
   - The system calls PL/SQL function `fn_verify_hash(:evidence_id, :recomputed_hash)`.
   - Display shows: **`MATCH — Forensic Hash Verified`** with matching SHA-256 digest.
3. Demonstrate tamper detection:
   - Test with an altered simulated digest or tampered file.
   - The system displays: **`MISMATCH - POSSIBLE TAMPERING`** in high-contrast red warning.

---

### Step 7: Chain of Custody Transfer & Immutable Audit Trail
1. Click **"Transfer Custody"** on the evidence item:
   - Transferor: `Ravi Kumar (Investigator)`
   - Recipient: `Karthik Menon (Forensic Examiner)`
   - Destination Location: `CFSL Digital Forensics Lab Room 204`
   - Purpose: `Bit-stream disk imaging and volatile RAM analysis`
2. Click **"Execute Custody Transfer"**:
   - Atomically invokes `sp_transfer_custody`.
   - Automatically transitions evidence status to **`In Storage`** / **`Under Analysis`**.
3. View the **Custody Timeline**:
   - Interactive chronological trail renders every transfer with timestamp, handler, and location.

---

### Step 8: Database Immutability Enforcement (Triggers)
Prove that forensic records cannot be tampered with or deleted at the database tier:
1. Run the test verifying trigger enforcement:
   ```powershell
   cd d:\DEFMS\backend
   npm run test:custody
   ```
2. Demonstrate Trigger `trg_custody_no_update`:
   - Any SQL `UPDATE` statement on `CHAIN_OF_CUSTODY` is rejected with `ORA-20001: Custody records are immutable and cannot be updated`.
3. Demonstrate Trigger `trg_custody_no_delete`:
   - Any SQL `DELETE` statement on `CHAIN_OF_CUSTODY` is rejected with `ORA-20002: Custody records are immutable and cannot be deleted`.

---

### Step 9: Court-Admissible PDF Reports Export
1. On the Case detail page, click **"Export Case Dossier PDF"**:
   - Browser generates and downloads `Case_Dossier_[ID].pdf`.
   - Review court-ready dossier containing case particulars, assigned officers, and evidence table.
2. On the Evidence detail page, click **"Export Custody Certificate PDF"**:
   - Downloads `Custody_Certificate_[ID].pdf`.
   - Review certificate with cryptographic hash seals and complete custody handoff records.
3. On the Navigation menu, go to **Audit Logs** and click **"Export Audit Trail PDF"**:
   - Demonstrates administrative accountability reporting.

---

### Step 10: Multi-Table Joins & Nested Queries (DA2 Demonstrations)
1. Navigate to **DBMS Explorer / Queries** tab in the UI (or run `backend/tests/demo.test.js`):
2. Review Query A1 (Custody with Officer & Evidence):
   ```sql
   SELECT c.Custody_ID, c.Timestamp_At, c.Action, e.Description, u.First_Name || ' ' || u.Last_Name AS Handled_By
   FROM CHAIN_OF_CUSTODY c
   JOIN EVIDENCE e ON c.Evidence_ID = e.Evidence_ID
   JOIN APP_USER u ON c.Custody_ID = u.User_ID;
   ```
3. Review Query A2 (Analyst with Lab & Evidence):
   ```sql
   SELECT a.Analysis_ID, u.First_Name || ' ' || u.Last_Name AS Analyst_Name, l.Lab_Name, e.Description
   FROM FORENSIC_ANALYSIS a
   JOIN FORENSIC_ANALYST fa ON a.Analyst_ID = fa.Analyst_ID
   JOIN APP_USER u ON fa.Analyst_ID = u.User_ID
   JOIN LABORATORY l ON fa.Laboratory_ID = l.Laboratory_ID
   JOIN EVIDENCE e ON a.Evidence_ID = e.Evidence_ID;
   ```
4. Review Nested Subqueries B1–B4 and Aggregates C1–C4 matching assignment requirements.

---

### Step 11: Stored Procedures & Database Cursors
1. Demonstrate `sp_register_evidence`:
   - Registers new evidence and auto-creates the first custody trail record atomically.
2. Demonstrate `sp_add_analysis`:
   - Adds forensic findings and automatically shifts evidence status to 'Under Analysis'.
3. Demonstrate `sp_flag_stale_evidence`:
   - Uses an explicit PL/SQL cursor loop (`CURSOR cur_stale_ev IS ...`) to iterate across items inactive for over 30 days and flag them for review.

---

### Step 12: Database Views Inspection
Demonstrate the three pre-compiled Oracle views:
1. `SELECT * FROM v_custody_trail;` — Complete chronological custody chain with user names.
2. `SELECT * FROM v_case_summary;` — Aggregated metrics per case (evidence count, active items).
3. `SELECT * FROM v_evidence_full;` — Denormalized evidence records with case titles and device/file attributes.

---

### Step 13: Full Automated Test Suite Execution
To prove system soundness in one command before the evaluator:
```powershell
cd d:\DEFMS\backend
npm test
```
*Expected Result:*
```
================================================================
PHASE 9 INTEGRATION SUITE: 33 PASSED, 0 FAILED
================================================================
TOTAL AUTOMATED BATTERY: 118 PASSED, 0 FAILED (100% PASS RATE)
```
