# Digital Forensic Evidence Management System (DFEMS)

> **Enterprise-Grade Forensic Integrity, Chain of Custody, and Evidence Tracking**  
> **Course / Assignment:** DBMS Digital Assignment 1 & 2 (DA1 & DA2)  
> **Candidate / Author:** Krishan Yadav (Registration No. 25BRS1220)  
> **Target Database:** Oracle AI Database 26ai Free (`FREEPDB1` Pluggable Database)  
> **Backend:** Node.js Express with native `oracledb` Thin-Mode Driver  
> **Frontend:** React 19 + Vite with Enterprise Design Tokens  
> **Verification Status:** **100% Passed (118/118 Automated Tests Passed, Zero Build/Lint Errors)**

---

## 1. Project Overview & Architecture

The **Digital Forensic Evidence Management System (DFEMS)** is a full-stack, enterprise-grade forensic case and evidence custody platform engineered to comply with stringent legal standards for court-admissible digital evidence (ISO/IEC 27037). 

DFEMS bridges the critical gap between law enforcement evidence collection, laboratory forensic examination, and legal accountability. It guarantees end-to-end evidence authenticity through **cryptographic SHA-256 byte-level intake verification** and **database-level append-only triggers** that prevent tampering or deletion of custody logs.

### High-Level Architecture Diagram

```
+--------------------------------------------------------------------------+
|                       Presentation Tier (React 19 + Vite)                |
|  - Enterprise Dark Slate Theme (#172033) & WCAG 2.2 AA High Contrast     |
|  - Role-Scoped Views: Admin, Investigator, Forensic Examiner, Auditor    |
|  - Live Oracle Dashboard & Recharts Visualizations                       |
|  - Drag-and-Drop Intake Vault & Instant SHA-256 Hash Calculation         |
|  - Interactive Custody Timeline & Court-Ready PDF Dossier Downloads      |
+--------------------------------------------------------------------------+
                                     │  HTTPS / REST (JSON)
                                     ▼
+--------------------------------------------------------------------------+
|                     Application Tier (Express 4 on Node.js)              |
|  - Multi-Role RBAC Middleware & JWT Token Lifecycle Management           |
|  - Bcrypt Password Hashing (Work Factor 12)                              |
|  - Input Validation & Parameterized Query Sanitization                   |
|  - Streaming PDF Document Generation Engine (PDFKit)                     |
|  - Node.js oracledb Connection Pool (Thin Mode, Auto-Draining)           |
+--------------------------------------------------------------------------+
                                     │  Oracle Net Protocol (Port 1521)
                                     ▼
+--------------------------------------------------------------------------+
|              Database Tier (Oracle Database 26ai Free - FREEPDB1)         |
|  - 13 BCNF-Normalized Relations with Primary, Foreign, Check & Unique     |
|  - 12 Targeted Performance & Referential Indexes (IDX_*)                 |
|  - PL/SQL Stored Procedures with Explicit Cursors (sp_flag_stale_evidence)|
|  - Transaction Atomicity & Savepoints (sp_transfer_custody)              |
|  - Deterministic PL/SQL Integrity Functions (fn_verify_hash)             |
|  - Append-Only Forensic Triggers (trg_custody_no_update/delete)          |
|  - Analytical Views (v_custody_trail, v_case_summary, v_evidence_full)   |
+--------------------------------------------------------------------------+
```

---

## 2. Technology Stack

| Layer | Component | Version | Role / Purpose |
|---|---|---|---|
| **Database** | Oracle AI Database 26ai Free | 26ai | Enterprise relational store (`FREEPDB1`), PL/SQL programs, triggers |
| **DB Driver** | `oracledb` | `^6.8.0` | Native Node.js Thin-Mode driver with connection pooling |
| **Backend Runtime** | Node.js | v20+ / v22+ | Non-blocking asynchronous server environment |
| **API Framework** | Express | `^4.21.2` | RESTful API controllers, middleware, routing, rate limiting |
| **Security & Auth** | `bcryptjs` & `jsonwebtoken` | `^3.0.3` / `^9.0.3` | Password hashing (work factor 12) & stateless JWT auth |
| **Reporting** | `pdfkit` | `^0.20.2` | Dynamic court-admissible PDF report rendering (`%PDF-`) |
| **File Intake** | `multer` | `^2.4.0` | Secure forensic file intake & byte-level hashing |
| **Frontend UI** | React | `^19.0.0` | Declarative component UI tree |
| **Build Tool** | Vite | `^8.3.4` | High-speed frontend development server and bundler |
| **Icons & Charts** | `lucide-react` & `recharts` | Latest | Iconography and responsive data visualizations |
| **Static Analysis** | `oxlint` | Latest | High-performance linter ensuring clean code hygiene |

---

## 3. Prerequisites for Windows

Before setting up DFEMS on Windows, ensure the following components are installed:

1. **Operating System:** Windows 10/11 or Windows Server 2022.
2. **Node.js:** v20.x or v22.x LTS ([Download Node.js](https://nodejs.org/)).
   - Verify via PowerShell: `node -v` and `npm -v`.
3. **Oracle AI Database 26ai Free:**
   - Installed locally with the standard listener on port `1521`.
   - Pluggable Database **`FREEPDB1`** created and active.
   - Verify via PowerShell: `sqlplus -v`.
4. **Git for Windows:** ([Download Git](https://git-scm.com/)).

---

## 4. Oracle Database 26ai Free Setup (`FREEPDB1`)

### 4.1 Verify Pluggable Database Status
Launch SQL*Plus as `SYSDBA`:
```powershell
sqlplus sys/your_sys_password@//localhost:1521/FREEPDB1 as sysdba
```
Verify the PDB is open in `READ WRITE` mode:
```sql
SELECT name, open_mode FROM v$pdbs;
```
If `FREEPDB1` is mounted rather than open, run:
```sql
ALTER PLUGGABLE DATABASE FREEPDB1 OPEN;
ALTER PLUGGABLE DATABASE FREEPDB1 SAVE STATE;
```

### 4.2 Create the Application User & Schema
In the same SQL*Plus session, provision the dedicated schema account `dfems_user`:
```sql
CREATE USER dfems_user IDENTIFIED BY your_secure_oracle_password_here;
GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE PROCEDURE, CREATE TRIGGER TO dfems_user;
ALTER USER dfems_user QUOTA UNLIMITED ON USERS;
EXIT;
```

---

## 5. Safe Environment Configuration

DFEMS uses environment variables for all server settings and secrets. **Never commit actual database credentials or JWT keys to version control.**

1. Copy the example configuration to create `backend/.env`:
   ```powershell
   cd d:\DEFMS\backend
   Copy-Item .env.example .env
   ```
2. Open `backend/.env` in an editor and populate your local credentials:
   ```ini
   # Server Settings
   PORT=5000
   NODE_ENV=development
   CLIENT_ORIGIN=http://localhost:5173

   # Oracle Database 26ai Free (FREEPDB1)
   DB_USER=dfems_user
   DB_PASSWORD=your_secure_oracle_password_here
   DB_CONNECT_STRING=localhost:1521/FREEPDB1

   # Connection Pool Configuration
   DB_POOL_MIN=2
   DB_POOL_MAX=10
   DB_POOL_INCREMENT=2
   DB_POOL_TIMEOUT=60
   DB_QUEUE_TIMEOUT=5000

   # Security & Session Settings
   JWT_SECRET=your_long_random_jwt_secret_key_here
   JWT_EXPIRES_IN=8h
   ```

---

## 6. Database Initialization

Execute the actual SQL and PL/SQL scripts in the `database/` directory in sequence using SQL*Plus.

### Step 1: Connect as `dfems_user`
```powershell
sqlplus dfems_user@//localhost:1521/FREEPDB1
```

### Step 2: Create Schema Tables & Indexes
```sql
@database/oracle_schema.sql
```
*Creates 13 tables (`APP_USER`, `LABORATORY`, `INVESTIGATOR`, `FORENSIC_ANALYST`, `LOCATION`, `CASE_TABLE`, `ASSIGNED`, `EVIDENCE`, `DEVICE`, `FILE_RECORD`, `CHAIN_OF_CUSTODY`, `FORENSIC_ANALYSIS`, `AUDIT_LOG`) and 12 performance indexes with zero seed records.*

### Step 3: Compile Views, Procedures, Functions & Triggers
```sql
@database/oracle_programs.sql
```
*Compiles views (`v_custody_trail`, `v_case_summary`, `v_evidence_full`), functions (`fn_days_in_current_status`, `fn_verify_hash`), procedures (`sp_register_evidence`, `sp_add_analysis`, `sp_flag_stale_evidence`, `sp_transfer_custody`), and append-only immutability triggers.*

### Step 4: Populate Demonstration Seeds & Laboratories (Recommended for Evaluation)
```sql
@database/seed_demo_data.sql
```
*Populates the academic dataset from the DA2 specification (10 user accounts, 8 cases, 15 evidence records, 33 custody entries, 3 forensic labs) and synchronizes sequence generators.*

Verify object status in SQL*Plus:
```sql
SELECT object_type, count(*) FROM user_objects GROUP BY object_type ORDER BY 1;
EXIT;
```

---

## 7. Secure Administrator Bootstrap

For production or standalone instances without default seed users, run the interactive bootstrap CLI:

```powershell
cd d:\DEFMS\backend
node scripts/bootstrapAdmin.js
```

**Features of the Bootstrap Tool:**
- Secure interactive prompt (password characters are masked).
- Enforces strict complexity: &ge; 10 characters, uppercase, lowercase, number, symbol.
- Hashes the password using `bcrypt` with work factor 12.
- Creates an active `Admin` record in `APP_USER` and writes an immutable audit record into `AUDIT_LOG`.
- Drains and closes the Oracle connection pool safely upon completion.

---

## 8. Installation & Startup Commands

### 8.1 Backend Installation & Startup
Open a new PowerShell terminal:
```powershell
cd d:\DEFMS\backend
npm install
npm start
```
*For development mode with automatic restart:*
```powershell
npm run dev
```
Backend API will be listening on: **`http://localhost:5000`**

### 8.2 Frontend Installation & Startup
Open a second PowerShell terminal:
```powershell
cd d:\DEFMS\frontend
npm install
npm run dev
```
Frontend UI will be running on: **`http://localhost:5173`**

### 8.3 Frontend Production Build
To validate or produce the minified production bundle:
```powershell
cd d:\DEFMS\frontend
npm run build
```
*Build output: `dist/index.html` + `dist/assets/` compiled in ~4.0s.*

---

## 9. API Endpoints & Role-Based Access Control (RBAC)

The DFEMS backend implements strict role-based access control enforced through server-side JWT middleware.

### 9.1 Role-Permission Matrix

| Endpoint Group | Method & Path | Admin | Investigator | Forensic Examiner / Lab Tech | Auditor |
|---|---|:---:|:---:|:---:|:---:|
| **Authentication** | `POST /api/auth/login` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| | `GET /api/auth/me` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Case Management** | `GET /api/cases` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: (Read) |
| | `POST /api/cases` | :white_check_mark: | :white_check_mark: | :x: | :x: |
| | `PUT /api/cases/:id` | :white_check_mark: | :white_check_mark: | :x: | :x: |
| | `PUT /api/cases/:id/status` | :white_check_mark: | :white_check_mark: | :x: | :x: |
| **Evidence Vault** | `GET /api/evidence` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: (Read) |
| | `POST /api/evidence` | :white_check_mark: | :white_check_mark: | :x: | :x: |
| | `PUT /api/evidence/:id` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :x: |
| **Cryptographic Hash** | `POST /api/evidence/:id/verify-hash` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Chain of Custody** | `GET /api/custody/evidence/:id` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| | `POST /api/custody/transfer` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :x: |
| **Forensic Analysis** | `POST /api/analysis` | :white_check_mark: | :x: | :white_check_mark: | :x: |
| **Analytics & KPIs** | `GET /api/analytics/dashboard-stats` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| **Court PDF Reports** | `GET /api/reports/case/:id/dossier` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| | `GET /api/reports/evidence/:id/custody` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| | `GET /api/reports/case/:id/integrity` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| | `GET /api/reports/audit-trail` | :white_check_mark: | :x: | :x: | :white_check_mark: |
| **Audit Logs** | `GET /api/audit-logs` | :white_check_mark: | :x: | :x: | :white_check_mark: |

---

## 10. Testing Instructions & Verified Test Results

All automated test suites execute against the live Oracle Database 26ai instance using **isolated test records with automated cleanup**. No production or seed records are reset or deleted.

### 10.1 Running Individual Test Suites
```powershell
cd d:\DEFMS\backend

# 1. Oracle Connectivity & Latency Ping
npm run test:db

# 2. Authentication & JWT Suite (9 tests)
npm run test:auth

# 3. Case & Evidence CRUD Suite (12 tests)
npm run test:crud

# 4. Chain of Custody & Hash Integrity Suite (15 tests)
npm run test:custody

# 5. Assignment DBMS Demonstrations Suite (35 tests)
npm run test:demo

# 6. Analytics, Search & PDF Reports Suite (14 tests)
npm run test:phase8

# 7. Phase 9 End-to-End Integration Suite (33 tests)
npm run test:integration
```

### 10.2 Running the Full Automated Battery
```powershell
npm test
```

### 10.3 Verified Automated Test Results
```
================================================================
DFEMS COMPREHENSIVE AUTOMATED TEST BATTERY RESULTS
================================================================
  [PASS] testConnection.js      : 2 checks passed (Latency: 127ms)
  [PASS] auth.test.js            : 9 passed, 0 failed
  [PASS] crud.test.js            : 12 passed, 0 failed
  [PASS] custody.test.js         : 15 passed, 0 failed
  [PASS] demo.test.js            : 35 passed, 0 failed
  [PASS] phase8.test.js          : 14 passed, 0 failed
  [PASS] integration.test.js     : 33 passed, 0 failed
----------------------------------------------------------------
TOTAL SUITES PASSED: 7 / 7
TOTAL TESTS PASSED : 118 / 118 (100% Pass Rate)
TOTAL FAILURES     : 0
================================================================
```

### 10.4 Frontend Static Analysis & Build Verification
```powershell
cd d:\DEFMS\frontend

# Linting via oxlint
npm run lint
# Output: 0 errors across 43 files

# Production Build via Vite
npm run build
# Output: Successfully built client environment in ~4.00s
```

*For complete requirement-by-requirement mapping, see [`TEST_REPORT.md`](file:///d:/DEFMS/TEST_REPORT.md).*

---

## 11. Live Demonstration Script

For evaluators and grading demonstrations, follow the detailed 13-step guide in [`LIVE_DEMO_GUIDE.md`](file:///d:/DEFMS/LIVE_DEMO_GUIDE.md):

1. **Database Health Indicator:** Observe live green status badge in topbar (`FREEPDB1` on `localhost:1521`).
2. **Login & RBAC:** Authenticate as Admin (`Krishan`), demonstrate failed login on bad password, switch to Investigator.
3. **Live Dashboard:** Review real-time KPI cards for active cases, evidence items, and transfers.
4. **Case Creation:** Create new case (*Operation Phantom Breach*), observe status `'Open'`, update to `'Under Investigation'`.
5. **Evidence Intake:** Upload forensic file, observe byte-level SHA-256 calculation, commit record to Oracle.
6. **Integrity Verification:** Click "Verify Integrity" to run PL/SQL `fn_verify_hash`, demonstrating `MATCH` and `MISMATCH` tamper detection.
7. **Chain of Custody:** Execute custody transfer via `sp_transfer_custody` and inspect interactive timeline.
8. **Database Immutability:** Attempt `UPDATE` or `DELETE` on `CHAIN_OF_CUSTODY` to demonstrate trigger rejection (`ORA-20001`, `ORA-20002`).
9. **PDF Reports:** Download court-admissible Case Dossier and Custody Certificate PDFs.
10. **SQL Queries:** Demonstrate Joins A1–A4, Subqueries B1–B4, and Aggregates C1–C4 matching DA2.
11. **Stored Procedures & Cursors:** Demonstrate `sp_flag_stale_evidence` cursor loop.
12. **Database Views:** Query `v_custody_trail`, `v_case_summary`, and `v_evidence_full`.
13. **Full Battery Execution:** Run `npm test` in the terminal to show 118 passing tests live.

---

## 12. Troubleshooting & Diagnostics

### Common Issues & Resolutions

| Issue | Root Cause | Resolution |
|---|---|---|
| **`ORA-12541: TNS:no listener`** | Oracle Database listener service is not running on port 1521. | Open Windows Services (`services.msc`) and start `OracleOraDB26Home1TNSListener`. |
| **`ORA-01017: invalid username/password`** | Credentials in `backend/.env` do not match `dfems_user`. | Verify `DB_USER` and `DB_PASSWORD` in `backend/.env`. Reset via SQL*Plus: `ALTER USER dfems_user IDENTIFIED BY new_password;`. |
| **`ORA-01033: ORACLE initialization or shutdown in progress`** or PDB closed | The pluggable database `FREEPDB1` is mounted, not open. | Connect as `SYSDBA` and execute: `ALTER PLUGGABLE DATABASE FREEPDB1 OPEN;`. |
| **`ORA-02291: integrity constraint (FK_ANALYST_LAB) violated`** | Missing records in parent table `LABORATORY`. | Run `node backend/scripts/seedLabs.js` or execute `@database/seed_demo_data.sql`. |
| **Port 5000 or 5173 Already in Use** | A previous Node.js server instance remained running in the background. | In PowerShell: `Get-Process node \| Stop-Process -Force`, then restart the server. |
| **Frontend Network Error (`Failed to fetch`)** | Backend server is not running or CORS blocked. | Ensure `backend` is running on port 5000 and `CLIENT_ORIGIN=http://localhost:5173` is set in `backend/.env`. |

---

## 13. Documentation Manifest

- **[`README.md`](file:///d:/DEFMS/README.md):** Complete system manual, architecture, installation, API catalog, and troubleshooting.
- **[`MASTER_PROJECT_SPEC.md`](file:///d:/DEFMS/MASTER_PROJECT_SPEC.md):** The 28 master requirements, UI design tokens, and evaluation criteria.
- **[`REQUIREMENTS_CHECKLIST.md`](file:///d:/DEFMS/REQUIREMENTS_CHECKLIST.md):** Requirements traceability matrix (all 28 requirements verified as **COMPLETE**).
- **[`TEST_REPORT.md`](file:///d:/DEFMS/TEST_REPORT.md):** Exhaustive test report covering 118 automated test cases, defect log, and manual UI verifications.
- **[`LIVE_DEMO_GUIDE.md`](file:///d:/DEFMS/LIVE_DEMO_GUIDE.md):** 13-step evaluator walkthrough script with exact commands and expected behaviors.
- **[`database/DBMS_OBJECTS.md`](file:///d:/DEFMS/database/DBMS_OBJECTS.md):** Full database dictionary of tables, views, procedures, functions, triggers, and SQL queries.
- **[`database/demo_queries.sql`](file:///d:/DEFMS/database/demo_queries.sql):** SQL demonstration scripts for CRUD, Joins, Subqueries, Aggregates, and Transactions.
