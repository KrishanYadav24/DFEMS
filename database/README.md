# DFEMS — ORACLE DATABASE 26ai LAYER GUIDE

> **System:** Digital Forensic Evidence Management System (DFEMS)  
> **Database:** Oracle AI Database 26ai Free  
> **Pluggable Database (PDB):** `FREEPDB1`  
> **Application User:** `dfems_user`  
> **Default Port:** `1521`  
> **Driver:** Node.js `oracledb` (Thin Mode)  

---

## 1. Overview

This directory contains the complete database scripts and technical documentation for the DFEMS Oracle Database 26ai layer. It translates and integrates the requirements from **DA1**, **DA2**, and **`MASTER_PROJECT_SPEC.md`** into native, high-performance Oracle SQL and PL/SQL.

### File Manifest

| File | Purpose | Execution Mode |
|---|---|---|
| **`oracle_schema.sql`** | Core relational DDL (13 tables, constraints, indexes) and seed dataset (10 users, 8 cases, 15 evidence, 33 custody entries, etc.). | SQL*Plus / Database Client |
| **`oracle_programs.sql`** | Procedural logic (3 Views, 2 Functions, 4 Stored Procedures including Cursor & Transaction Savepoints, 3 Triggers). | SQL*Plus / Database Client |
| **`demo_queries.sql`** | Executable test suite (CRUD, Joins A1–A4, Nested Queries B1–B4, Aggregates C1–C4, Procedure tests, Trigger tests, Transaction tests). | SQL*Plus / Demo Console |
| **`DBMS_OBJECTS.md`** | Comprehensive architectural object catalog detailing tables, columns, indexes, signatures, and queries. | Documentation |
| **`README.md`** | Setup instructions, prerequisite verification, execution order, and troubleshooting. | Documentation |

---

## 2. Prerequisites & Safety Constraints

1. **Oracle AI Database 26ai Free** must be running locally with the listener active on port `1521`.
2. The Pluggable Database **`FREEPDB1`** must be open in `READ WRITE` mode.
3. The dedicated schema user **`dfems_user`** must exist and have the following privileges:
   ```sql
   -- Granted by SYSDBA:
   GRANT CONNECT, RESOURCE, CREATE VIEW, CREATE PROCEDURE, CREATE TRIGGER TO dfems_user;
   ALTER USER dfems_user QUOTA UNLIMITED ON USERS;
   ```
4. **Safety Rule:** No scripts contain hardcoded passwords or destructive `DROP DATABASE` statements.

---

## 3. Recommended Script Execution Sequence

When ready to initialize the database schema, execute the scripts in the following order using SQL*Plus or Oracle SQL Developer:

### Step 1: Connect to Pluggable Database as `dfems_user`
```bash
sqlplus dfems_user@//localhost:1521/FREEPDB1
```

### Step 2: Create Schema Tables & Load Seed Data
```sql
@database/oracle_schema.sql
```
* **What it does:** Creates all 13 tables (`APP_USER`, `LABORATORY`, `INVESTIGATOR`, `FORENSIC_ANALYST`, `LOCATION`, `CASE_TABLE`, `ASSIGNED`, `EVIDENCE`, `DEVICE`, `FILE_RECORD`, `CHAIN_OF_CUSTODY`, `FORENSIC_ANALYSIS`, `AUDIT_LOG`), applies indexes, and populates the verified DA2 seed dataset.

### Step 3: Compile Views, Procedures, Functions & Triggers
```sql
@database/oracle_programs.sql
```
* **What it does:** Compiles views (`v_custody_trail`, `v_case_summary`, `v_evidence_full`), functions (`fn_days_in_current_status`, `fn_verify_hash`), procedures (`sp_register_evidence`, `sp_add_analysis`, `sp_flag_stale_evidence`, `sp_transfer_custody`), and append-only triggers.

### Step 4: Run Verification & Demonstration Queries
```sql
@database/demo_queries.sql
```
* **What it does:** Runs tests for CRUD, Joins A1–A4, Nested Queries B1–B4, Aggregates C1–C4, procedure executions with bind variables, function verification, trigger validation, and referential integrity checks.

---

## 4. Expected Verification Results

When `demo_queries.sql` runs, verify that the output matches the following baseline metrics:

| Check | Expected Result | Source Verification |
|---|---|---|
| **Table Row Counts** | `APP_USER`: 10, `CASE_TABLE`: 8, `EVIDENCE`: 15, `CHAIN_OF_CUSTODY`: 33, `FORENSIC_ANALYSIS`: 8 | DA2 Screenshot 49–51 |
| **Referential Integrity** | Orphan Evidence check returns `0` rows | DA2 Screenshot 54 |
| **Joins (Query A1)** | 15 rows returned combining Evidence, Case Title, and Lead Investigator | DA2 Screenshot 20 |
| **Nested (Query B1)** | Case #4 ("Ransomware Attack - City Hospital") returned (> 2 evidence items) | DA2 Screenshot 23 |
| **Aggregates (Query C1)** | 8 cases listed with evidence counts ranging from 1 to 3 items | DA2 Screenshot 26 |
| **Function `fn_verify_hash`** | Returns `'MATCH'` for authentic hash; returns `'MISMATCH - POSSIBLE TAMPERING'` for altered hash | DA2 Screenshot 38 & 54 |
| **Append-Only Triggers** | `UPDATE` on `CHAIN_OF_CUSTODY` raises `ORA-20001`<br>`DELETE` on `CHAIN_OF_CUSTODY` raises `ORA-20002` | DA2 Screenshot 42–43 |
| **Transaction Rollback** | `sp_transfer_custody` with invalid ID safely rolls back to `before_transfer` savepoint and raises `ORA-20003` | DA2 Screenshot 44–45 |

---

## 5. Node.js `oracledb` Integration Details

The Node.js backend connects using **`oracledb` in Thin Mode**:

```javascript
import oracledb from 'oracledb';

const pool = await oracledb.createPool({
  user: process.env.ORACLE_USER || 'dfems_user',
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/FREEPDB1',
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 2
});
```

* **Thin Mode Benefits:** 100% pure JavaScript protocol. No Oracle Instant Client C-binaries required.
* **SYS_REFCURSOR Support:** Procedure `sp_flag_stale_evidence` returns an open cursor directly fetched by Node.js.
* **Bind Variables:** Standard named binds (`:caseId`, `:hashValue`) prevent SQL injection attacks.

---

## 6. Development Seed Accounts & Secure Initial Administrator Setup

### 6.1 Policy on Seed Accounts & Passwords
1. **No Permanent Default Passwords:** The transient development placeholder (`Password123!`) must **never** be used for permanent or production environments.
2. **Approval Gate:** The seed data section in `oracle_schema.sql` is **not executed** into Oracle until explicit approval is given by the project lead. The initial schema deployment is executed manually via SQL*Plus only after script review.
3. **Password Security:** All credentials in `APP_USER` must be stored as salted bcrypt hashes (work factor >= 12). Plaintext passwords are never logged or stored.

### 6.2 Development Evaluation Seed Accounts (DA2 Specification)
These accounts exist purely for academic/evaluation demonstration of the 4 role types:

| User ID | Username | Full Name | Role | Credentials Note |
|---|---|---|---|---|
| 1 | `ravi.kumar` | Ravi Kumar | Investigator | Development Evaluation Seed (INV-1001) |
| 2 | `ananya.rao` | Ananya Rao | Investigator | Development Evaluation Seed (INV-1002) |
| 3 | `suresh.iyer` | Suresh Iyer | Investigator | Development Evaluation Seed (INV-1003) |
| 4 | `priya.nair` | Priya Nair | Investigator | Development Evaluation Seed (INV-1004) |
| 5 | `karthik.menon` | Karthik Menon | Forensic Examiner | Development Evaluation Seed (CFSL / EnCE) |
| 6 | `divya.pillai` | Divya Pillai | Forensic Examiner | Development Evaluation Seed (CFU / GCFA) |
| 7 | `arjun.reddy` | Arjun Reddy | Forensic Examiner | Development Evaluation Seed (CFSL / CCE) |
| 8 | `meera.krishnan` | Meera Krishnan | Forensic Examiner | Development Evaluation Seed (RDFL / ACE) |
| 9 | `vikram.shah` | Vikram Shah | Admin | Development Evaluation Seed |
| 10 | `lakshmi.narayan` | Lakshmi Narayan | Auditor | Development Evaluation Seed |

### 6.3 Secure Initial Administrator Bootstrapping Process (Production Mode)
For permanent or secure deployment without pre-seeded accounts:
1. Run the relational DDL without the seed block to establish empty tables and constraints.
2. Execute the administrative provisioning script:
   ```bash
   node scripts/bootstrap_admin.js
   ```
3. The script:
   - Prompts interactively for the administrator's username, full name, phone number, and a strong passphrase (minimum 12 characters, requiring uppercase, lowercase, numbers, and special symbols).
   - Generates a cryptographically random salt and hashes the passphrase using bcrypt (`12` rounds).
   - Inserts a single record into `APP_USER` with `Role = 'Admin'` and `Account_Status = 'Active'`.
   - Emits an immutable record into `AUDIT_LOG` recording the initialization event with timestamp and host IP.

