**BUDGET FLOW**

**Project Document Registry**

*Navigation Guide, Document Index & Full Glossary*

Version 1.0 — May 2025

# How to Use This Document

This registry is the starting point for every session of work on Budget
Flow. Before diving into any specification, check the Quick-Lookup
section below to find exactly which document — and which section of that
document — covers what you need. The Document Index gives you a complete
map of the entire suite. The Glossary defines every term, acronym, and
project-specific concept in one place.

Colour coding used throughout:

|  |  |
|----|----|
|  | Green tint — MVP Phase 1 & 2 documents. Read these before building anything. |
|  | Blue tint — Future / Premium Phase 3 documents. Relevant when Phase 3 begins. |
|  | Amber tint — Reference documents. Relevant at all phases. |

# Part 1 — Quick-Lookup: I Need to Know About…

Use this table when you have a specific question and need to know
exactly where to find the answer. Documents are abbreviated — full names
and descriptions are in Part 2.

|  |  |  |
|----|----|----|
| **If you need to know about…** | **Go to this document** | **Read this section** |
| How safe-to-spend is calculated | **FRS** | Safe-to-Spend Logic |
| What triggers a safe-to-spend recalculation | **FRS + Impl. Guide** | Safe-to-Spend Logic / Section 13 |
| How paycheck cycles work | **FRS + DB Design** | Paycheck Logic / Paycheck Terminology Reference |
| Variable bill confirmation logic | **FRS** | Variable Recurring Bill Logic |
| Pending vs charged purchase behaviour | **FRS** | Pending Purchase Logic |
| Essential reserve deduction | **FRS** | Safe-to-Spend Logic |
| Cash withdrawal handling | **FRS** | Cash Handling |
| Full SQLite schema (all tables & fields) | **DB Design v2** | Entity Schemas (Section 4) |
| Which entities use soft-delete | **DB Design v2** | Soft Delete Strategy (Section 8) |
| Why money is stored as integer cents | **DB Design v2** | Monetary Value Storage (Section 6) |
| What sync_queue is and how it works | **DB Design v2** | sync_queue Table |
| profiles vs accounts — what's the difference | **DB Design v2 + API Spec** | Paycheck Terminology / Identity Model (Section 3) |
| Entity relationships & ERD guidance | **DB Design v2** | Entity Relationships (Section 10) |
| Indexing strategy | **DB Design v2** | Indexing Strategy (Section 11) |
| Why Spring Boot isn't needed for MVP | **System Arch. v3** | System Tiers and MVP Scope |
| How sync will work in Phase 3 | **System Arch. v3** | Future Premium Synchronization Flow |
| What the backend modules will be | **System Arch. v3** | Backend Module Structure |
| Where financial logic lives in the code | **System Arch. v3 + Impl. Guide** | On-Device Business Logic / Section 12 |
| What to build first and why | **Impl. Guide** | Sections 4 — 10 (Development Strategy + Layers) |
| Repository interface pattern (async) | **Impl. Guide** | Section 11.1 |
| How to build the financial engine | **Impl. Guide** | Sections 12 — 16 |
| Folder structure for the project | **Impl. Guide** | Appendix A |
| Naming conventions | **Impl. Guide** | Appendix B |
| Git branching strategy | **Impl. Guide** | Appendix D |
| Environment configuration (.env) | **Impl. Guide** | Appendix C |
| sync_queue write pattern in repositories | **Impl. Guide** | Section 11.2 |
| How Phase 3 sync activates without MVP rewrite | **Impl. Guide** | Section 29 |
| What financial tests are required | **Testing Strategy** | Sections 4.1 — 4.3 |
| The 7 acceptance test scenarios (A–G) | **Testing Strategy** | Financial Logic Acceptance Tests (Section 4.3) |
| Soft-delete exclusion test requirements | **Testing Strategy** | Integration Tests (Section 4.2) |
| Phase 3 backend parity tests | **Testing Strategy** | Section 4.8 |
| Pre-release QA checklist | **Testing Strategy** | Pre-Release QA Checklist |
| REST API endpoints for premium sync | **API Spec v2** | Synchronization Endpoints (Section 10) |
| user_id vs profile_id — difference | **API Spec v2** | Identity Model (Section 3) |
| Which entities sync and which don't | **API Spec v2** | Sync-Eligible Entities (Section 4) |
| sync/push request body fields | **API Spec v2** | POST /v1/sync/push |
| Conflict resolution (last-write-wins) | **API Spec v2** | POST /v1/sync/push — Conflict Handling |
| On-device data privacy requirements | **Security & Privacy** | MVP Security Model (Section 3) |
| Import file privacy (stripping sensitive data) | **Security & Privacy** | CSV and PDF Import Processing (Section 3.2) |
| Phase 3 API security requirements | **Security & Privacy** | Future Premium Security Model (Section 4) |
| What's in each sprint | **Sprint Roadmap** | Phase 1, 2, 3 sprint sections |
| Sprint development gates | **Sprint Roadmap** | Milestone Summary |
| Phase 3 backend sprint tasks | **Sprint Roadmap** | Sprints 10–14 |
| Dashboard layout and information hierarchy | **UI/UX Spec** | Dashboard Screen |
| Bottom navigation structure | **UI/UX Spec** | Navigation Structure |
| Screen list for implementation | **UI/UX Spec** | Mockup Guidance (Primary Screens) |
| Visual tone and colour direction | **UI/UX Spec** | Color and Style Direction |
| Why Budget Flow exists / product vision | **Product Vision** | Application Overview + Problem Statement |
| Target users | **URD** | Target Users (Section 6) |
| MVP feature scope (what's in, what's out) | **URD** | MVP Scope + Out of Scope for MVP |
| User stories by feature area | **User Stories** | User Stories by Feature Area (Section 4) |
| Use cases with step-by-step flows | **User Stories** | Primary Use Cases (Section 5) |

# Part 2 — Complete Document Index

Every document in the Budget Flow project suite, with a description of
its purpose and the right time to read it.

**MVP PHASE DOCUMENTS (Phase 1 & 2)**

|  |  |  |  |
|----|----|----|----|
| **Document** | **File Name** | **Read When** | **Key Topics** |
| **Product Vision** | *ProductVision.md* | Day one — big picture | Why the app exists, product philosophy, MVP scope, future roadmap, UI emotional direction |
| **User Requirements Document (URD)** | *UserRequirements.md* | Before design or implementation | Target users, user pain points, user goals, usability requirements, success criteria |
| **User Stories & Use Cases** | *UserStories.md* | Before building any screen | User stories per feature, use cases with step-by-step flows, acceptance criteria, alternate flows |
| **Functional Requirements Specification (FRS)** | *FunctionalRequirements.md* | Before implementing any financial logic | Safe-to-spend rules, pending purchase logic, variable bill logic, paycheck logic, import rules, notification rules, system constraints |
| **Non-Functional Requirements (NFR)** | *NonFunctionalRequirementsV2.docx* | Sprint 1 — architecture decisions | Offline-first requirements, performance expectations, privacy, battery efficiency, testability, maintainability, calculation consistency across platforms |
| **Database Design Document v2** | *DatabaseDesignV2.md* | Sprint 1 — before writing schema | All SQLite tables, field definitions, relationships, soft-delete strategy, sync_queue design, integer-cent rationale, indexing strategy, ERD guidance |
| **System Architecture Design v3** | *SystemArchitectureV3.md* | Sprint 1 — before any code | MVP two-tier architecture, on-device financial logic, backend deferral, sync_queue outbox model, profiles vs accounts, Spring Boot module structure |
| **UI/UX Design Specification** | *UI-UX-Specifications.docx* | Before building any screen | Visual tone, colour direction, navigation structure, dashboard hierarchy, screen-by-screen specifications, emotional UX philosophy |
| **Security & Privacy Design** | *SecurityandPrivacy.md* | Sprint 1 + Sprint 5 (import) | On-device data storage security, import privacy rules, backup file handling, Phase 3 API security and JWT requirements |
| **Testing Strategy & QA Plan** | *BudgetFlow_TestingStrategy_v2_Revised.docx* | Sprint 2 — alongside financial engine | Test coverage requirements, unit test plan by module, 7 acceptance scenarios, integration test plan, soft-delete exclusion tests, Phase 3 parity tests, QA checklist |
| **Sprint Roadmap** | *SprintRoadmap.md* | Sprint planning, every sprint | Phase 1–3 sprint breakdown, task descriptions per sprint, milestone summary, planning assumptions |

**PHASE 3 DOCUMENTS (Future Premium)**

|  |  |  |  |
|----|----|----|----|
| **Document** | **File Name** | **Read When** | **Key Topics** |
| **API Specification v2** | *APISpecsV2.md* | Sprint 10 — when backend starts | REST endpoints for auth, sync push/pull, cloud backup, identity model, sync-eligible entities, conflict handling, error codes, rate limiting |

**REFERENCE DOCUMENTS (All Phases)**

|  |  |  |  |
|----|----|----|----|
| **Document** | **File Name** | **Read When** | **Key Topics** |
| **Master Implementation Guide** | *ImplementationGuide.md* | Every sprint — your daily companion | Build order, dependency map, financial engine implementation, repository async pattern, testing strategy, sync_queue write pattern, Phase 3 integration, folder structure, naming conventions, git strategy |
| **Project Document Registry (this document)** | *DocumentRegistry.md* | Start of every working session | Quick-lookup index, document directory, full glossary and acronym reference |
| **Non-Technical Overview** | *NonTechnicalOverview.md* | Sharing with friends, family, or App Store | Plain-language description of what Budget Flow does, who it's for, privacy approach, and what's coming |

# Part 3 — Full Glossary & Acronym Reference

Every term, acronym, and project-specific concept used across the Budget
Flow document suite. When a term appears in any specification and you're
unsure what it means, find it here.

## Document Acronyms

|  |  |  |
|----|----|----|
| **Acronym** | **Stands For** | **What It Is** |
| **FRS** | *Functional Requirements Specification* | The authoritative behavioural contract for the app. Defines exactly how every feature must work — safe-to-spend rules, bill logic, purchase logic, import handling, notifications. |
| **URD** | *User Requirements Document* | Defines who the app is built for, what their goals are, and what success looks like. Read before any design or implementation work. |
| **NFR** | *Non-Functional Requirements* | Defines how the system must behave beyond its features — performance, offline operation, privacy, battery efficiency, maintainability. |
| **DB** | *Database (Design Document)* | Short for 'Database Design Document v2'. Contains the full SQLite schema. |
| **API** | *Application Programming Interface* | In Budget Flow context: the Spring Boot REST API used for Phase 3 premium synchronisation. Not active during MVP. |
| **UI** | *User Interface* | The visual screens and components the user interacts with. |
| **UX** | *User Experience* | The overall feel and usability of the app — how easy and stress-free it is to use. |
| **QA** | *Quality Assurance / Testing* | The process of verifying the app behaves correctly through automated and manual testing. |
| **MVP** | *Minimum Viable Product* | The complete, fully functional first release of Budget Flow. Phases 1 and 2 of the sprint roadmap. Local-only, no backend required. |
| **SDLC** | *Software Development Life Cycle* | The structured process of planning, building, testing, and releasing software. |

## Technical Acronyms

|  |  |  |
|----|----|----|
| **Acronym** | **Stands For** | **What It Is** |
| **SQLite** | *Structured Query Language Lite* | The on-device database used by Budget Flow. Stores all financial data locally on the phone. The authoritative data store for the entire MVP. |
| **SQL** | *Structured Query Language* | The language used to read from and write to the SQLite database. |
| **UUID** | *Universally Unique Identifier* | A randomly generated ID string (e.g. 550E8400-E29B-41D4-A716-446655440000) used as the primary key for every entity. Guarantees uniqueness across devices without coordination. |
| **ISO 8601** | *International date/time standard* | The timestamp format used throughout the database: YYYY-MM-DDTHH:MM:SSZ for datetimes, YYYY-MM-DD for date-only fields. Sortable as text strings. |
| **UTC** | *Coordinated Universal Time* | The timezone all timestamps are stored in. Display formatting converts to the user's local time at the presentation layer. |
| **REST** | *Representational State Transfer* | The API style used by the Phase 3 Spring Boot backend. Endpoints follow standard HTTP verbs (GET, POST, PATCH, DELETE). |
| **JWT** | *JSON Web Token* | The authentication token format used by the Phase 3 API. Issued on login, sent in every API request header, expires after 60 minutes. |
| **JSON** | *JavaScript Object Notation* | The data format used for local backup files and API payloads. |
| **RN** | *React Native* | The cross-platform mobile framework used to build the Budget Flow app. Runs on both iOS and Android from a single codebase. |
| **TS** | *TypeScript* | The programming language used throughout the Budget Flow codebase. A typed superset of JavaScript — required for financial logic correctness. |
| **FK** | *Foreign Key* | A database field that references the primary key (id) of another table. E.g. purchases.profile_id is a foreign key referencing profiles.id. |
| **PRAGMA** | *SQLite directive* | A SQLite-specific command. PRAGMA foreign_keys = ON must be run on every database connection to enable referential integrity enforcement. |
| **DXA** | *Document eXtended Attribute (units)* | The unit of measurement used in Word document formatting. Approximately 1/1440 of an inch. Not relevant to app development. |
| **CSV** | *Comma-Separated Values* | A plain-text file format used for bank statement exports. Budget Flow can parse CSV files locally to detect recurring expenses. |
| **PDF** | *Portable Document Format* | A document format also supported for statement import. Processed locally, raw file deleted after parsing. |

## Project-Specific Terms

|  |  |  |
|----|----|----|
| **Term** | **Type** | **Definition** |
| **Safe-to-Spend** | *Financial concept* | The application's primary financial indicator. The amount of money available right now after deducting upcoming bill instances, pending purchases, and the essential reserve from the confirmed balance. Always calculated on-device from live SQLite data. May be negative — this is valid and meaningful. |
| **Essential Reserve** | *Financial concept* | A user-configured buffer amount (stored in profiles.essential_reserve as integer cents) that is always deducted from safe-to-spend. Protects against unexpected expenses. Default is 0 — user sets their own. |
| **Paycheck Cycle** | *Financial concept* | The budgeting window that begins on a paycheck's expected_date and ends immediately before the next paycheck's expected_date. Bills and purchases are assigned to cycles, not calendar months. The paycheck record is both the income event and the cycle anchor. |
| **Cycle Anchor** | *Financial concept* | The paycheck record that defines the start of a paycheck cycle. Its expected_date is the cycle start. The next paycheck's expected_date is the cycle end. |
| **Running Balance** | *Financial concept* | The total tracked balance derived from: confirmed paychecks minus charged purchases minus pending purchases minus paid bills plus/minus manual balance adjustments. |
| **Fixed Bill** | *Financial concept* | A recurring bill with a consistent amount each cycle (e.g. rent, car payment). Generated as confirmed instances automatically. |
| **Variable Bill** | *Financial concept* | A recurring bill whose amount changes each cycle (e.g. electricity, credit card). Generated with the last confirmed amount as an estimate; requires user confirmation each cycle before it is treated as finalised. |
| **Bill Cycle Instance** | *Financial concept* | A single occurrence of a recurring bill within one paycheck cycle. Stored in the bill_cycle_instances table. Tracks cycle_amount_cents, is_paid, is_variable_confirmed, and due_date independently per cycle. |
| **Pending Purchase** | *Financial concept* | A purchase entered as unsettled — e.g. a restaurant tip hold or gas station authorisation. Reduces safe-to-spend immediately, same as a charged purchase. Flagged for resolution if unresolved beyond the configured threshold. |
| **Charged Purchase** | *Financial concept* | A finalised purchase transaction. Reduces safe-to-spend immediately. |
| **Soft Delete** | *Database concept* | A deletion pattern where records are never physically removed. Instead, a deleted_at timestamp is set. All queries filter WHERE deleted_at IS NULL by default. Required for sync safety and audit integrity. Used on all financial entities. |
| **Integer Cents** | *Database concept* | The monetary storage convention throughout Budget Flow. All amounts are stored as INTEGER values representing cents (e.g. \$42.10 = 4210). Eliminates floating-point rounding errors from financial calculations. Display formatting only happens at the UI layer. |
| **Local-First** | *Architecture* | The design principle that the mobile app and its SQLite database are the complete, authoritative system during MVP. No network required. No backend required. All calculations and data operations happen on-device. |
| **Offline-First** | *Architecture* | The requirement that every core feature works without internet connectivity. Connectivity is treated as an enhancement, not a requirement. |
| **sync_queue** | *Architecture* | A local SQLite table that acts as an outbox for future synchronisation. Every create, update, or soft-delete on a sync-eligible entity writes a row here. Rows are dormant during MVP (status = 'pending', nothing reads them). In Phase 3, the sync engine reads and transmits them to the Spring Boot API. |
| **Outbox Pattern** | *Architecture* | The design pattern implemented by sync_queue. Mutations are written to a local queue table within the same database transaction as the financial write. A background process (Phase 3) reads the queue and transmits entries to the remote API. |
| **Modular Monolith** | *Architecture* | The Spring Boot backend architecture style. All backend modules (auth, accounts, sync, safe_to_spend, etc.) are in one deployable application with clean internal boundaries. No microservices. |
| **Shared Business Rules** | *Architecture* | The principle that mobile and backend must implement identical financial calculation logic. The mobile engine (Sprint 2) defines the rules; the backend (Sprint 11) mirrors them. Both must produce the same result for the same input state. |
| **Parallel Implementation** | *Architecture* | Describes how backend financial calculations relate to mobile calculations. The backend implements the same rules for web clients and sync validation — it does not replace or override the mobile engine. Both run independently. |
| **profiles** | *SQLite table* | The root entity of the on-device database. One row per device installation. Stores the financial data root, essential reserve, currency code, and onboarding state. profile_id is the foreign key used by all other financial entities. |
| **paychecks** | *SQLite table* | Stores income records and acts as paycheck cycle anchors. is_received = 1 means a paycheck has been confirmed received and affects the balance. Unconfirmed paychecks are informational projections only. |
| **bills** | *SQLite table* | Recurring bill definitions. Stores the template (name, type, default_amount_cents, recurrence). Does not track payment — that's bill_cycle_instances. |
| **bill_cycle_instances** | *SQLite table* | One record per bill per paycheck cycle. Tracks cycle_amount_cents, is_paid, is_variable_confirmed, and due_date for that specific cycle. Used directly by the safe-to-spend calculation. |
| **purchases** | *SQLite table* | All manually entered transactions. State = 'charged' or 'pending'. Both states reduce safe-to-spend immediately on creation. |
| **balance_adjustments** | *SQLite table* | Manual balance corrections. Append-only — never modified once written. Positive or negative delta_cents applied to the running balance. |
| **activity_log** | *SQLite table* | Append-only audit trail of significant financial events. Records are never modified or deleted. Not synchronised in Phase 3 — device-local only. |
| **notification_settings** | *SQLite table* | Notification preferences per profile (one row). Master toggle, pending purchase reminder threshold, bill reminder advance days. Sync-eligible in Phase 3. |
| **import_suggestions** | *SQLite table* | Transient records generated by the CSV/PDF import pipeline. Represent detected recurring expenses awaiting user confirmation. Never synchronised — local workflow data only. |
| **backup_metadata** | *SQLite table* | Records of local backup export and restore events. Not synchronised — device-local only. |
| **profile_id** | *Identity concept* | The UUID primary key of a profiles row. The local financial data root identifier. Used as a foreign key on every financial entity. Present in all sync_queue payloads and Phase 3 API requests to route records to the correct cloud account. |
| **user_id** | *Identity concept* | The cloud account identifier returned by the Phase 3 authentication API after login or registration. Distinct from profile_id. The cloud auth identity layer only — not stored in the MVP SQLite schema. |
| **accounts module** | *Backend concept* | The Phase 3 Spring Boot module that manages cloud authentication identity. Handles registration, login, and the association of user_id with profile_id on first sync. |
| **queue_entry_id** | *Sync concept* | The UUID primary key of a sync_queue row. Included in Phase 3 sync push requests. Returned in the API response so the device can update the correct sync_queue row's status to 'synced' or 'failed'. |
| **sync_status** | *Sync concept* | 'local' \| 'pending' \| 'synced'. A field on all sync-eligible entities. Set to 'local' on creation during MVP. The Phase 3 sync engine updates this field alongside the sync_queue row status after successful cloud persistence. |
| **last-write-wins** | *Sync concept* | The conflict resolution strategy for Phase 3 synchronisation. If two devices modify the same record before syncing, the record with the more recent client_updated_at timestamp prevails. |
| **device_id** | *Sync concept* | A stable identifier for the originating device. Included in Phase 3 sync push requests to support multi-device conflict detection. Not stored as a column in the MVP SQLite schema — deferred to Phase 3. |
| **PostgreSQL mirror** | *Sync concept* | PostgreSQL stores a server-side copy of sync-eligible financial entities for Phase 3 premium users. It mirrors confirmed local state — it is not the upstream source of truth. The device's SQLite database remains authoritative. |
| **Acceptance Scenario** | *Testing concept* | One of 7 named end-to-end financial test scenarios (A through G) defined in the Testing Strategy. Used to verify financial correctness across complete realistic user states. Also used in Phase 3 as the basis for backend parity tests. |
| **Parity Test** | *Testing concept* | A Phase 3 test that seeds identical financial state into both SQLite and PostgreSQL, runs both the mobile engine and the backend engine, and asserts that safe-to-spend results are equal to the cent. Any divergence is a blocking defect. |
| **Test Contract** | *Testing concept* | A named input/output specification for a financial calculation. Written during Sprint 2 as unit tests, documented in /docs/calculation-contracts/, and reused in Sprint 11 as the acceptance criteria for the backend financial engine. |
| **Coverage Floor** | *Testing concept* | The minimum acceptable test coverage percentage for a module. Safe-to-spend, balance derivation, cycle boundary logic, and currency utilities all have a 100% coverage floor. See the Testing Strategy for the full coverage table. |

*This registry should be updated whenever a new document is added to the
project suite or a significant section is renamed.*
