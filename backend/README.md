# DFEMS Backend — Node.js & Oracle Database 26ai Free

RESTful API service for the **Digital Forensic Evidence Management System (DFEMS)** built with Express.js and the official `oracledb` Thin-Mode driver.

---

## 1. Directory Structure

```
backend/
├── .env.example              # Template environment variables (safe defaults)
├── package.json              # Backend dependencies, metadata & test scripts
├── scripts/                  # Administrative & database utility scripts
│   ├── bootstrapAdmin.js     # Secure CLI to create initial administrator
│   ├── resetPassword.js      # Password reset utility
│   └── seedLabs.js           # Idempotent laboratory parent record seeder
├── src/                      # Application source code
│   ├── app.js                # Express app configuration & middleware pipeline
│   ├── server.js             # HTTP server entrypoint & pool lifecycle
│   ├── config/               # System configurations
│   │   ├── database.js       # Oracle connection pool & query wrappers
│   │   └── env.js            # Environment validation & defaults
│   ├── controllers/          # Business logic & request handlers
│   │   ├── analysisController.js   # Forensic laboratory analysis findings
│   │   ├── analyticsController.js  # Live KPI stats & DBMS demo queries
│   │   ├── auditController.js      # System audit log retrieval & filtering
│   │   ├── authController.js       # Authentication, registration & profile
│   │   ├── caseController.js       # Case management & lifecycle transitions
│   │   ├── custodyController.js    # Chain of custody handoffs & transfers
│   │   ├── evidenceController.js   # Evidence intake, vault & hash verification
│   │   ├── healthController.js     # Health probe & Oracle ping
│   │   └── reportController.js     # Court-ready PDF dossier & certificate generation
│   ├── middleware/           # Express middleware pipeline
│   │   ├── auth.js           # JWT authentication & multi-role RBAC guards
│   │   ├── errorHandler.js   # Centralized ORA error translator & logger
│   │   ├── rateLimiter.js    # Rate limiting on sensitive endpoints
│   │   ├── requestLogger.js  # Morgan/Winston HTTP request logger
│   │   ├── upload.js         # Multer secure evidence file upload config
│   │   └── validate.js       # Request payload schema validation
│   ├── routes/               # API endpoint route declarations
│   │   ├── analysisRoutes.js
│   │   ├── analyticsRoutes.js
│   │   ├── auditRoutes.js
│   │   ├── authRoutes.js
│   │   ├── caseRoutes.js
│   │   ├── custodyRoutes.js
│   │   ├── evidenceRoutes.js
│   │   ├── healthRoutes.js
│   │   ├── index.js          # Unified /api route aggregator
│   │   └── reportRoutes.js
│   └── utils/                # Shared utilities & helpers
│       ├── apiResponse.js    # Standardized JSON response envelope
│       ├── logger.js         # Structured Winston console & file logger
│       ├── token.js          # JWT signing and verification helpers
│       └── vault.js          # Evidence vault filesystem operations
├── tests/                    # Automated integration & demonstration suites
│   ├── auth.test.js          # Authentication, token expiry & RBAC tests (9 tests)
│   ├── crud.test.js          # Case & Evidence CRUD transactions (12 tests)
│   ├── custody.test.js       # Cryptographic hashing & immutability triggers (15 tests)
│   ├── demo.test.js          # Joins A1-A4, Subqueries B1-B4, Aggregates C1-C4 (35 tests)
│   ├── integration.test.js   # Phase 9 End-to-end integration workflows (33 tests)
│   ├── phase8.test.js        # Dashboard KPIs, search & PDF generators (14 tests)
│   └── testConnection.js     # Oracle Thin-Mode latency & bind diagnostic (2 checks)
└── vault/                    # Local evidence file storage repository
    └── evidence/             # Case-segregated evidence directories (.gitkeep)
```

---

## 2. Prerequisites & Database Service

- **Node.js**: v20+ / v22+ LTS
- **Oracle Database**: Oracle Database 26ai Free (`FREEPDB1`) on `localhost:1521`
- **Driver Mode**: Thin Mode (Pure JavaScript TCP protocol, no Oracle Instant Client required)
- **Database Schema**: `dfems_user`

---

## 3. Environment Configuration

Create a local `.env` inside `backend/` based on `.env.example`:

```env
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

# Oracle Database 26ai Free (FREEPDB1)
DB_USER=dfems_user
DB_PASSWORD=your_secure_oracle_password
DB_CONNECT_STRING=localhost:1521/FREEPDB1

# Connection Pool Settings
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_INCREMENT=2
DB_POOL_TIMEOUT=60
DB_QUEUE_TIMEOUT=5000

# Security Tokens
JWT_SECRET=your_long_random_jwt_secret_key_here
JWT_EXPIRES_IN=8h
```

---

## 4. API Endpoints Catalog

| Domain | Route | Methods | Permitted Roles | Description |
|---|---|:---:|---|---|
| **Health** | `/api/health` | `GET` | Public | Real-time Oracle ping and connection status |
| **Auth** | `/api/auth/login` | `POST` | Public | Bcrypt credential verification; returns signed JWT |
| | `/api/auth/logout` | `POST` | Authenticated | Session invalidation and audit log recording |
| | `/api/auth/me` | `GET` | Authenticated | Current user profile and permission scopes |
| | `/api/auth/users` | `GET`, `POST` | Admin | Administrative user directory and registration |
| **Cases** | `/api/cases` | `GET`, `POST` | Admin, Inv | List cases with search/filters; create new case |
| | `/api/cases/:id` | `GET`, `PUT` | Admin, Inv | Case particulars; update title/location |
| | `/api/cases/:id/status`| `PUT` | Admin, Inv | Sequential status change (Open -> Under Investigation -> Closed -> Archived) |
| **Evidence**| `/api/evidence` | `GET`, `POST` | Admin, Inv | Query evidence by case/status; register new exhibit |
| | `/api/evidence/:id` | `GET`, `PUT` | Admin, Inv, Exam | Full exhibit details; update permitted metadata |
| | `/api/evidence/upload` | `POST` | Admin, Inv | Multipart file upload with automated SHA-256 byte hashing |
| | `/api/evidence/:id/verify-hash` | `POST` | All Roles | Invokes Oracle PL/SQL function `fn_verify_hash` |
| **Custody** | `/api/custody` | `GET` | All Roles | Chronological chain of custody trail |
| | `/api/custody/transfer`| `POST` | Admin, Inv, Exam | Atomic transfer via stored procedure `sp_transfer_custody` |
| **Analysis** | `/api/analysis` | `POST` | Admin, Exam | Log forensic findings via stored procedure `sp_add_analysis` |
| **Analytics**| `/api/analytics/dashboard-stats` | `GET` | All Roles | Real-time Oracle KPI aggregates & distributions |
| **Reports** | `/api/reports/case/:id/dossier` | `GET` | Admin, Inv | Court-ready Case Dossier PDF (`%PDF-`) |
| | `/api/reports/evidence/:id/custody` | `GET` | All Roles | Official Custody Certificate PDF |
| | `/api/reports/case/:id/integrity` | `GET` | All Roles | Cryptographic Integrity Verification Audit PDF |
| | `/api/reports/audit-trail` | `GET` | Admin, Auditor | Administrative Security Audit Trail PDF |
| **Audit** | `/api/audit-logs` | `GET` | Admin, Auditor | Paginated security and administrative telemetry |

---

## 5. Automated Test Suites

All tests run against the live Oracle 26ai Free instance using isolated test records and guaranteed automated cleanup:

```powershell
# 1. Oracle 26ai connectivity diagnostic (latency & bind test)
npm run test:db

# 2. Authentication, JWT, and RBAC test suite
npm run test:auth

# 3. Case and Evidence CRUD operations
npm run test:crud

# 4. Chain of custody handoffs & trigger immutability
npm run test:custody

# 5. Assignment DBMS Demonstrations (Joins, Subqueries, Aggregates, PL/SQL)
npm run test:demo

# 6. Analytics, Search, Filters & PDF reporting
npm run test:phase8

# 7. Phase 9 End-to-End integration test suite
npm run test:integration

# 8. Run full automated battery (118 / 118 tests passed)
npm test
```
