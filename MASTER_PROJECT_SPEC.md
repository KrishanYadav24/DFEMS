# DFEMS — MASTER PROJECT SPECIFICATION

## Project title
**Digital Forensic Evidence Management System (DFEMS)**

## 1. Project objective

Build a complete, secure, fully functional, professional full-stack web application for managing digital forensic cases, evidence, forensic analysis, and chain of custody.

This project must satisfy DA1, DA2, and the live-demonstration requirements. It must be ready to demonstrate using real database records, working application workflows, and verified SQL operations.

This is not merely a frontend prototype. Every implemented feature must connect to a real backend and database where applicable.

## 2. Mandatory source documents

Read both `DA1.pdf` and `DA2.docx` completely before implementation.

- Use DA1 to understand the project problem, expected features, security, evidence lifecycle, and workflows.
- Use DA2 to determine the required database schema and DBMS concepts.
- Inspect the actual existing MySQL database before making schema assumptions.
- Where requirements conflict, document the conflict and ask for clarification when necessary.
- Do not silently replace the assignment's schema with a different design.

## 3. Technology stack

Use the following stack unless the existing project or assignment makes a documented change necessary:

- Frontend: React, Vite, JavaScript, Tailwind CSS, Lucide icons.
- Charts: Recharts or an equivalent suitable charting library.
- HTTP client: Axios.
- Backend: Node.js and Express.
- Database: MySQL, using mysql2 and parameterized queries.
- Validation: Zod or an equivalent validation library.
- Authentication: secure password hashing with bcrypt and a properly configured authentication mechanism.
- Security: Helmet, backend authorization, validation, and safe handling of secrets.
- PDF reports: PDFKit or an equivalent library.

Keep the architecture modular and maintainable. Do not add unnecessary frameworks or dependencies.

## 4. Database preservation

The required database is `dfems_db`.

Preserve the existing database, data, tables, constraints, views, procedures, functions, and triggers. Never drop or recreate the database to simplify implementation.

DA2 identifies these tables:

- `app_user`
- `investigator`
- `forensic_analyst`
- `laboratory`
- `location`
- `case_table`
- `assigned`
- `evidence`
- `device`
- `file_record`
- `chain_of_custody`
- `forensic_analysis`

Verify these names and their actual columns against the existing database and DA2 before coding.

Use backward-compatible migrations for necessary additions. Review potentially destructive changes before execution. Keep credentials in environment variables.

## 5. The 28 mandatory project requirements

### Requirement 1 — Requirements traceability
Create `REQUIREMENTS_CHECKLIST.md`. Map every DA1 requirement, DA2 requirement, and live-demonstration requirement to its implementation, database tables, API endpoints, and test.

### Requirement 2 — Professional application architecture
Create a maintainable frontend/backend structure with reusable components, routes, controllers, services, validation, database access, and configuration.

### Requirement 3 — Professional UI/UX
Build a refined enterprise SaaS interface with consistent typography, spacing, colors, layouts, forms, tables, navigation, dialogs, notifications, and responsive behavior. Avoid a generic CRUD appearance.

### Requirement 4 — Authentication
Provide a working login and logout flow, secure password hashing, protected endpoints, and appropriate session or token handling. Never expose passwords or secrets.

### Requirement 5 — Role-based access control
Support the applicable roles from DA1: Admin, Investigator, Forensic Examiner, Evidence Custodian, Legal/Court Reviewer, and Auditor. Enforce permissions on the backend.

### Requirement 6 — Database connectivity
Connect the backend to the existing `dfems_db`. Handle connection failures properly and verify connectivity with a real health check.

### Requirement 7 — Evidence and case CRUD
Implement real Create, Read, Update, and appropriately controlled Delete operations for cases, evidence, and other supported entities. Confirm changes persist in MySQL.

### Requirement 8 — Case management
Support case creation, viewing, permitted updates, assignment, status tracking, and relationships to relevant evidence and personnel.

### Requirement 9 — Evidence registration
Record evidence metadata and link evidence to the appropriate case. Implement the metadata and relationships supported by the verified schema.

### Requirement 10 — Evidence file handling
Provide secure file upload and retrieval where required. Validate file size and type, restrict unauthorized access, and avoid exposing sensitive evidence files.

### Requirement 11 — Evidence integrity
Calculate SHA-256 hashes for files at intake and re-verify them when required. Detect mismatches and display a clear, truthful integrity status. Never fabricate successful verification.

### Requirement 12 — Chain of custody
Record relevant access, transfers, status changes, and other required evidence events. Capture actor, timestamp, action, reason, and evidence reference where available. Preserve historical records.

### Requirement 13 — Forensic analysis
Provide appropriate analysis records, examiner relationships, findings, and timestamps based on the actual schema and DA1 requirements.

### Requirement 14 — Evidence lifecycle
Implement valid transitions through the lifecycle specified in DA1, including collection, storage, analysis, court presentation, and archival/disposal as applicable. Validate transitions and record them appropriately.

### Requirement 15 — Search and filtering
Provide useful search and filters for case ID, evidence type, date, examiner, status, and other supported fields. Include sorting and pagination for larger result sets.

### Requirement 16 — Audit logging
Record relevant authentication attempts, sensitive access, and important data changes. Protect audit history against unauthorized alteration. Prevent duplicate events when both application logic and database triggers are involved.

### Requirement 17 — Input validation and integrity
Validate required fields and business rules. Use appropriate primary keys, foreign keys, unique constraints, indexes, and database transactions. Handle duplicate records and invalid relationships clearly.

### Requirement 18 — SQL CRUD demonstration
Provide executable and verified SQL examples for insertion, retrieval, updates, and permitted deletion. Include instructions for verifying results in MySQL.

### Requirement 19 — Joins
Implement meaningful joins across related entities, such as cases, evidence, users, assignments, and custody records where the actual relationships support them.

### Requirement 20 — Nested queries and aggregate functions
Provide tested nested queries and meaningful aggregate queries using functions such as `COUNT`, `SUM`, `AVG`, `MIN`, and `MAX`, along with `GROUP BY` and `HAVING` where appropriate.

### Requirement 21 — Views
Create or reuse useful views, such as case-evidence summaries, where compatible with DA2. Demonstrate querying each required view.

### Requirement 22 — Stored procedures
Implement and test useful stored procedures where required. Document parameters, execution commands, and expected results.

### Requirement 23 — Database functions
Implement and test meaningful database functions where required. Document their purpose, invocation, and results.

### Requirement 24 — Triggers and transactions
Implement and demonstrate relevant triggers and transactions, including `COMMIT`, `ROLLBACK`, and `SAVEPOINT` where required. Avoid duplicate audit entries and unintended destructive side effects.

### Requirement 25 — Live-data dashboard
Build a dashboard using real database results, with useful case and evidence metrics, status/type summaries, recent activity, and integrity alerts where supported. Never use hardcoded numbers as real statistics.

### Requirement 26 — Reports and visualizations
Generate useful downloadable PDF reports for case summaries, custody history, and audit trails as applicable. Ensure charts, tables, and reports reflect actual data and respect access permissions.

### Requirement 27 — Testing and error handling
Test authentication, authorization, CRUD, validation, database errors, foreign-key failures, search, SQL objects, hashing, custody, dashboard calculations, reports, and responsive layouts. Fix defects and report test results honestly.

### Requirement 28 — Live demonstration and documentation
Provide repeatable setup instructions, demo data instructions, startup commands, verified SQL scripts, a test report, and `LIVE_DEMO_GUIDE.md`. Ensure the core application and DBMS concepts can be demonstrated without manually editing source code during the presentation.

## 6. Mandatory professional UI/UX design system

### Visual direction
Create a polished, restrained, premium enterprise interface appropriate for a digital forensic platform. Prioritize clarity, trust, accuracy, and efficient workflows over decorative effects.

### Color tokens
Use centralized design tokens, approximately:

- Application background: `#F5F7FA`
- Surface: `#FFFFFF`
- Primary text: `#172033`
- Secondary text: `#667085`
- Borders: `#E3E8EF`
- Sidebar: `#111827`
- Sidebar hover: `#1D2939`
- Primary action: `#356AE6`
- Success: `#16805D`
- Warning: `#B7791F`
- Error: `#C63D4F`

Keep colors consistent. Do not communicate status by color alone.

### Typography
Use Inter or a comparable readable typeface. Use a clear hierarchy:

- Page headings: approximately 26–30 px
- Section headings: approximately 17–20 px
- Body text: approximately 13–15 px
- Table text: approximately 13–14 px
- Labels and metadata: approximately 12–13 px

Use tabular numerals for metrics and a monospaced font for hashes and technical identifiers.

### Application shell
- Sidebar approximately 248 px wide on desktop, with grouped navigation.
- Topbar approximately 64–72 px high.
- Clear active, hover, disabled, and keyboard-focus states.
- Breadcrumbs, global search, notifications, and profile actions where useful.
- Main content padding approximately 28–36 px on desktop.
- Collapsible sidebar and mobile navigation drawer.

### Required reusable components
Create reusable components for the application shell, sidebar, topbar, page header, buttons, inputs, select fields, status badges, tables, filter bars, pagination, modal dialogs, confirmations, tabs, toasts, skeletons, empty states, error states, and custody timelines.

### Dashboard
Use clear KPI cards, restrained charts, recent activity, and relevant alerts. Do not invent trends or claim hash integrity without verification.

### Data tables
Include meaningful column labels, search, sorting, filters, pagination, loading states, empty states, error states, and row actions subject to permissions. Maintain usable layouts on small screens.

### Forms and dialogs
Provide inline validation, required-field indicators, understandable error messages, clear primary and secondary actions, and confirmation for destructive actions.

### Accessibility and responsive behavior
Aim for WCAG 2.2 AA practices. Support keyboard navigation, visible focus, accessible labels, sufficient contrast, and reduced motion. Test desktop, tablet, and mobile widths.

### Interaction quality
Use subtle transitions, generally around 120–200 ms, where appropriate. Avoid excessive animations, distracting effects, and decorative loading screens.

### Visual verification
Run the actual application and inspect rendered pages when preview/browser tools are available. Fix clipping, overflow, inconsistent spacing, broken layouts, unreadable tables, and nonfunctional controls. Do not claim visual testing occurred if it did not.

## 7. Required project documentation

Maintain these files as appropriate:

- `MASTER_PROJECT_SPEC.md`
- `REQUIREMENTS_CHECKLIST.md`
- `database/schema_inspection.md`
- `database/migrations/`
- `database/demo_queries.sql`
- `database/DBMS_OBJECTS.md`
- `TEST_REPORT.md`
- `LIVE_DEMO_GUIDE.md`
- `.env.example`
- `README.md`

Do not commit actual credentials, secrets, real sensitive forensic files, or production personal data.

## 8. Required live demonstration

The completed project must support a live demonstration of:

1. Frontend/application and navigation.
2. Real MySQL connectivity.
3. Data insertion and retrieval.
4. Update and permitted deletion.
5. SQL CRUD statements.
6. Joins, nested queries, and aggregate functions.
7. Views.
8. Stored procedures, functions, and triggers as required and implemented.
9. Dashboard metrics and visualizations.
10. Security and access control.
11. Validation, error handling, and testing.
12. Evidence hashing and chain-of-custody workflows.
13. PDF reports where implemented.

NoSQL and cloud database operations are not mandatory unless DA1, DA2, or the instructor explicitly requires them. Do not add them merely for appearance.

## 9. Implementation rules

- Read this specification before each phase.
- Work in small, verifiable phases.
- Inspect existing files before modifying them.
- Preserve the existing database and data.
- Never invent schema names or claim untested features work.
- Do not leave placeholder buttons or mock API responses in completed features.
- Run relevant tests after each phase.
- Fix blocking defects before advancing.
- Update the requirements checklist as work progresses.
- Stop and report blockers instead of silently bypassing requirements.

## 10. Definition of done

The project is complete only when all applicable requirements have an implementation status, the frontend and backend run, the database persists changes, security restrictions work, required SQL objects have been tested, core workflows pass, and the live demonstration guide has been verified.

Clearly document anything that remains incomplete. Never claim the project is fully demonstration-ready without evidence of testing.