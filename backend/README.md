# DFEMS Backend — Node.js & Oracle Database 26ai Free

Digital Forensic Evidence Management System (DFEMS) REST API service built with Express.js and the official `oracledb` thin-mode driver.

---

## 1. Prerequisites & Database Service

- **Node.js**: v18+ (tested on v20+)
- **Oracle Database**: Oracle Database 26ai Free (`FREEPDB1`) running on `localhost:1521`
- **Database User**: `DFEMS_USER`

---

## 2. Environment Configuration

Create a local `.env` inside `backend/` (do not commit secrets):

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=your_secure_256_bit_secret_here
JWT_EXPIRES_IN=24h

DB_USER=dfems_user
DB_PASSWORD=your_database_password
DB_CONNECT_STRING=localhost:1521/FREEPDB1
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_QUEUE_TIMEOUT_MS=5000
```

---

## 3. Implemented API Endpoints

### 3.1 Authentication & RBAC (Phase 4)
- `POST /api/auth/login` — Authenticate user via bcrypt hash verification; returns JWT
- `POST /api/auth/logout` — Invalidate session; records `LOGOUT` in `AUDIT_LOG`
- `GET /api/auth/me` — Return current authenticated profile (hashes redacted)
- `GET /api/auth/users` — Administrative user directory (Admin role only)

### 3.2 Case Management (Phase 5)
- `GET /api/cases` — List cases with filtering (`status`, `search`, `page`, `limit`) & investigator data isolation
- `GET /api/cases/:id` — Case dossier with incident location and linked evidence items
- `POST /api/cases` — Register case with dynamic location resolution and transaction boundaries (`Admin`, `Investigator`)
- `PUT /api/cases/:id` — Update case metadata (`title`, `crimeType`, `location`, `assignedTo`)
- `PUT /api/cases/:id/status` — Lifecycle transition (`Open` -> `Under Investigation` -> `Closed` -> `Archived`)

### 3.3 Evidence Management (Phase 5)
- `GET /api/evidence` — List evidence with filters (`caseId`, `status`, `type`, `search`)
- `GET /api/evidence/:id` — Evidence details, device/file record metadata, and complete `CHAIN_OF_CUSTODY` trail
- `POST /api/evidence` — Atomic intake transaction across `EVIDENCE`, `DEVICE`/`FILE_RECORD`, `CHAIN_OF_CUSTODY`, and `AUDIT_LOG` (`Admin`, `Investigator`)
- `PUT /api/evidence/:id` — Update permitted metadata (`description`, `status`). *Note: SHA-256 hash is legally immutable.*
- `POST /api/evidence/:id/verify-hash` — Cryptographic hash validation invoking Oracle PL/SQL function `fn_verify_hash(:id, :hash)`

---

## 4. Test Suite Execution

All test commands run against the live Oracle 26ai Free instance:

```bash
# 1. Oracle 26ai connectivity diagnostic
npm run test:db

# 2. Authentication, JWT, and RBAC test suite (Phase 4)
npm run test:auth

# 3. Case and Evidence CRUD, data isolation & PL/SQL verification (Phase 5)
npm run test:crud

# 4. Full test suite execution
npm test
```

---

## 5. Security & Forensic Controls

1. **Strict Parameterization**: Every user value is passed via Oracle bind variables (`:param`).
2. **Atomic Transactions**: Evidence intake and case allocations run within managed transactions with rollback on error.
3. **Immutability Protection**: `CHAIN_OF_CUSTODY` update and delete operations are rejected by Oracle database triggers (`TRG_CUSTODY_NO_UPDATE`, `TRG_CUSTODY_NO_DELETE`).
4. **Tamper Detection**: Hash verification queries Oracle function `fn_verify_hash` directly in the database engine.
5. **Auditing**: Sensitive operations write immutable records to `AUDIT_LOG`.
