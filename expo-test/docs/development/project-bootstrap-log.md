# Budget Flow — Project Bootstrap Log

## Purpose

This document tracks major project setup milestones, architectural decisions,
environment configuration steps, and foundational engineering work performed
during the initialization of the Budget Flow codebase.

This is not intended to log every terminal command or minor change.
Instead, it serves as a high-level engineering journal documenting the
evolution of the project structure and technical foundation.

---

# Bootstrap Timeline

## June 19, 2026 — Home Composition Cleanup

### Feature-Owned Route Composition

Reduced the Expo route layer and removed unused starter template files so new
Budget Flow work lands in feature-owned modules instead of the app route file.

Completed:
- kept `src/app/index.tsx` as a thin route that renders the home controller
- split home composition into header, pager, modal, and floating action pieces
- moved the splash overlay into a Budget Flow app feature folder
- removed the unused Expo starter Explore route, starter components, hooks, and theme constants
- preserved existing service, repository, financial engine, and database boundaries

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 234 tests

---

## June 19, 2026 — Shared UI Layer Cleanup

### Production UI Naming

Renamed the remaining shared UI helper layer from prototype terminology to
production-oriented naming so future UI work has a clear structural home.

Completed:
- moved shared UI components, keyboard accessory IDs, styles, and view-model types into `src/shared/ui`
- updated feature imports from `@/shared/prototype` to `@/shared/ui`
- removed the empty `src/shared/prototype` directory after the move
- refreshed the sprint roadmap wording that still described old prototype/in-memory UI state
- kept service, repository, database, and financial-engine code unchanged

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 234 tests

---

## June 19, 2026 — Expo SDK 56 Architecture Alignment

### Current Mobile Runtime Decision

The active phone app is an Expo SDK 56 / Expo Router application. Older bootstrap
notes are retained as historical context, but current mobile implementation work
should follow the versioned Expo SDK 56 documentation and the repository's
feature/service/repository boundaries.

Current state:
- Expo runtime: `expo@~56.0.8`
- route entry: `expo-router/entry`
- local persistence: Expo SQLite through the app runtime adapter
- backend readiness: sync queue and repository/service contracts remain in place for future Spring Boot/Postgres work

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 234 tests

---

## June 19, 2026 — Sprint 5 PDF Import UI Slice 1

### Text PDF Import Entry Point

Completed the visible PDF import slice without adding a native PDF parsing
dependency. The Settings import review can now pick text-based PDFs and route
extractable statement text through the existing recurring suggestion pipeline.

Completed:
- added a feature-owned PDF file picker using Expo FileSystem MIME filtering
- added conservative text extraction for text-based PDF source strings
- wired a `+ PDF` action into Import review next to CSV
- reused the existing PDF adapter and ImportService statement-text pipeline
- kept scanned/image-only PDF behavior explicit with a user-facing readable-text error

Validation:
- focused PDF import tests pass locally
- TypeScript typecheck passes

---

## June 19, 2026 — Sprint 5 PDF Import Fix 1

### Binary PDF Read Path

Fixed physical-device PDF import for real bank PDFs that cannot be opened as
plain text because their file encoding cannot be determined.

Completed:
- changed PDF import to read picked PDFs through Expo FileSystem `arrayBuffer`
- decodes bytes into a byte-preserving source string before text extraction
- kept a text-read fallback for compatible runtimes and tests
- added focused coverage for the binary PDF read path and cleanup behavior

Validation:
- focused PDF import tests pass locally
- TypeScript typecheck passes

---

## June 19, 2026 — Sprint 5 PDF Import Candidate Slice 1

### Single-Statement Bill Candidates

Adjusted PDF imports for real bank statements where a monthly PDF may only show
each bill once. PDF imports can now surface likely bill-looking single
transactions as review candidates without treating everyday purchases as bills.

Completed:
- added an import parser option for single-occurrence bill candidates
- enabled that option only for PDF-derived statement imports
- keeps CSV recurring detection conservative by default
- uses bill-like merchant keywords to avoid obvious one-off purchases
- changed the PDF no-result message to point toward OCR when no candidates are found

Validation:
- focused import parser, ImportService, and PDF adapter tests pass locally
- TypeScript typecheck passes

---

## June 19, 2026 — Sprint 5 PDF OCR Spike 1

### iPhone On-Device OCR Bridge

Added the first native OCR spike for bank PDFs that do not expose readable text
through the lightweight PDF parser.

Completed:
- added an iOS native React Native module named `BudgetFlowOcr`
- renders PDF pages locally with PDFKit
- recognizes text locally with Apple Vision text recognition
- PDF import now falls back to native OCR only when embedded text extraction returns no text
- kept OCR behind a feature-owned import service boundary
- kept CSV, readable PDF text extraction, and import suggestion confirmation workflows unchanged

Validation:
- `npm run check` passes locally
- Xcode project file lint passes
- native compile validation is pending user-run Xcode/iPhone build

---

## June 19, 2026 — Sprint 5 PDF OCR Feedback Slice 1

### OCR Attempt Visibility

Made PDF import feedback explicit about whether OCR actually ran so physical
device testing can distinguish OCR failures from parser/no-candidate results.

Completed:
- PDF file import now returns `embedded-text` or `ocr` as the extraction method
- OCR imports include total and recognized page counts
- Settings import review messages now say when OCR scanned the PDF but found no bill candidates
- readable text PDFs now report that OCR was not needed

Validation:
- focused PDF import tests pass locally
- TypeScript typecheck passes

---

## June 19, 2026 — Sprint 5 PDF OCR Retry Slice 1

### Embedded Text Retry

Adjusted PDF import so readable-but-unhelpful embedded PDF text does not block
OCR. If the first embedded-text import finds zero bill candidates, the workflow
retries the same picked PDF with native OCR and reports the final extraction
method to the user.

Completed:
- PDF file import now returns the picked file URI with extraction metadata
- Settings import workflow retries OCR after zero embedded-text candidates
- import feedback now reflects whether the final result came from OCR or embedded text
- parser and service behavior remain unchanged

Validation:
- focused PDF/import tests pass locally
- TypeScript typecheck passes

---

## June 19, 2026 — Sprint 5 PDF OCR Fix 2

### OCR Before Temp File Cleanup

Fixed the OCR retry path so it does not try to open a picked PDF after the
temporary file copy has already been deleted.

Completed:
- PDF file import now captures optional OCR text while the picked file still exists
- embedded-text imports can carry OCR retry text and page counts back to the workflow
- the import workflow retries parsing stored OCR text instead of reopening a stale URI
- preserved temp-file cleanup after extraction/OCR completes

Validation:
- focused PDF/import tests pass locally
- TypeScript typecheck passes

---

## June 19, 2026 — Sprint 5 PDF OCR Fix 3

### Force Statement Parsing

Fixed OCR text from PDFs being incorrectly treated as CSV when commas appeared
in recognized statement lines.

Completed:
- added a statement-text parser option to the import parser
- PDF imports now force statement-text parsing instead of CSV header detection
- added regression coverage for OCR text with commas
- tightened statement merchant cleanup around punctuation

Validation:
- focused import parser, ImportService, and PDF adapter tests pass locally
- TypeScript typecheck passes

---

## June 19, 2026 — Sprint 5 PDF OCR Parser Slice 1

### Multiline OCR Transactions

Improved OCR statement parsing for bank PDFs where Vision returns transaction
parts on separate lines instead of one clean row.

Completed:
- statement-text imports now stitch short OCR line windows beginning with a date
- stitched lines close when an amount or debit-like marker is found
- generic OCR/header lines are ignored
- merchant cleanup removes bank action phrases like `Bill Pay`
- added regression coverage for multiline OCR bill candidate detection

Validation:
- focused import parser, ImportService, and PDF adapter tests pass locally
- TypeScript typecheck passes

---

## June 19, 2026 — Sprint 6 Backup Export Slice 6

### Native Share/Save Sheet

Fixed the physical-device export usability gap where backup JSON files were
written to app document storage but were not easy to find from the phone.

Completed:
- installed the Expo SDK 56-compatible `expo-sharing` package
- kept backup writing isolated in the backup file export boundary
- opens the native share/save sheet after the backup JSON is written
- returns whether sharing was available while still preserving the written file URI
- added focused coverage for share-sheet success and unavailable-share fallback

Validation:
- focused backup export tests pass locally
- TypeScript typecheck passes

---

## May 2026 — Repository Initialization

### Repository Structure Established

Initialized the Budget Flow monorepo structure with the following top-level directories:

- mobile/
- backend/
- shared/
- docs/
- scripts/
- assets/

Purpose:
- Separate the React Native mobile application from future backend infrastructure
- Support future premium synchronization architecture without restructuring
- Maintain clean separation between application layers and documentation

---

## May 2026 — Mobile Architecture Initialization

### React Native Architecture Decision

Selected bare React Native instead of Expo managed workflow.

Reasoning:
- Direct native SQLite integration
- Better long-term support for SQLCipher/encryption
- Improved native module flexibility
- Better alignment with offline-first financial architecture
- Easier future support for notifications/background processing
- Stronger enterprise/mobile engineering portfolio alignment

Architecture References:
- System Architecture Design v3
- Database Design v2
- Master Implementation Guide

---

## May 2026 — Initial Mobile Folder Structure

Created the foundational mobile application structure:

mobile/src/
- engine/
- database/
- features/
- navigation/
- shared/
- tests/

Purpose:
- Maintain strict separation between financial engine logic, database access,
  feature modules, and shared UI/utilities
- Support modular monolith architecture
- Keep financial calculation engine isolated from UI framework concerns

---

## May 2026 — Financial Architecture Principles

Established the following non-negotiable engineering principles:

- SQLite is the MVP source of truth
- Financial calculations execute entirely on-device
- Safe-to-spend calculations must be deterministic
- Monetary values stored as integer cents only
- Offline functionality is mandatory
- Premium sync is additive only and never replaces local functionality

---

# Current Status

Current phase:
- Sprint 2 — Core Financial Logic

Next planned milestones:
1. Complete remaining financial engine helpers
2. Implement variable bill confirmation workflow
3. Implement append-only activity log writer
4. Add repository and service layer integration
5. Expand acceptance-style financial calculation contracts

---

# Notes

This document should be updated whenever:
- Major architecture decisions are made
- Core dependencies are introduced or replaced
- Foundational project structure changes occur
- Significant engineering milestones are completed

---

## May 2026 — Development Tooling & CI

### Engineering Tooling Configuration

Configured the foundational engineering tooling stack for the mobile application.

Completed:
- ESLint
- Prettier
- Jest
- GitHub Actions CI

Purpose:
- enforce consistent code quality standards
- automate formatting validation
- establish automated test execution
- validate pushes automatically through CI workflows

CI Workflow:
- lint validation
- formatting validation
- automated Jest test execution

Result:
- successful green CI pipeline on GitHub Actions

---

## May 2026 — SQLite Foundation

### SQLite Library Selection

Selected `expo-sqlite` as the SQLite implementation for the Budget Flow MVP.

Version:
- Expo SDK 56 bundled package `expo-sqlite` `~56.0.4`

Reasoning:
- first-party Expo SDK support
- async SQLite API
- persisted local database storage
- strong local-first support
- compatibility with the current Expo managed app
- long-term scalability for offline financial data
- alignment with future sync-ready architecture

Validation:
- package is present in `package.json`
- connection layer imports from `expo-sqlite`
- database opens with `SQLite.openDatabaseAsync`

---

## June 1, 2026 — Sprint 1 Closure

### Project Setup & Data Foundation Complete

Sprint 1 is complete for the local codebase foundation.

Completed:
- Expo SDK 56 project foundation
- `expo-sqlite` integration and dependency lock
- SQLite connection and versioned migration flow
- foreign key enforcement via `PRAGMA foreign_keys = ON`
- full MVP schema implementation
- schema contract tests
- financial fixture builders and realistic safe-to-spend fixture
- cent-based currency parsing, validation, and formatting helpers
- Vitest unit test infrastructure
- V8 coverage reporting
- GitHub Actions CI quality gate

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes

Result:
- Sprint 2 may proceed with the database foundation treated as closed.

---

## June 1, 2026 — Sprint 2 Repository Slice 3

### Bills and Bill Cycle Instance Persistence

Implemented the bill persistence layer for the local-first MVP.

Completed:
- BillRepository with ordered reads, active-cycle reads, create/update, pause/resume, and soft-delete workflows
- BillCycleInstanceRepository with cycle reads, existing-instance lookup, create/update, mark-paid, variable amount confirmation, and soft-delete workflows
- shared repository types and row mappers for bills and bill_cycle_instances
- transaction-scoped sync_queue writes for every create, update, and delete operation
- focused unit tests covering persistence parameters, row mapping, sync queue side effects, and validation failures

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 105 tests

---

## June 1, 2026 — Sprint 2 Repository Slice 4

### Purchase Persistence

Implemented the purchase persistence layer for the local-first MVP.

Completed:
- PurchaseRepository with profile reads, paycheck-cycle reads, pending purchase reads, create/update, charged/pending state transitions, and soft-delete workflows
- shared repository types and row mapper for purchases
- transaction-scoped sync_queue writes for every create, update, and delete operation
- focused unit tests covering persistence parameters, row mapping, sync queue side effects, state transitions, default values, and validation failures

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 117 tests

---

## June 1, 2026 — Sprint 2 Repository Slice 5

### Balance Adjustment Persistence

Implemented the balance adjustment persistence layer for the local-first MVP.

Completed:
- BalanceAdjustmentRepository with active reads, ordered profile reads, append-only create, and soft-delete workflow
- automatic delta_cents derivation from adjusted_balance_cents minus previous_balance_cents
- shared repository types and row mapper for balance_adjustments
- transaction-scoped sync_queue writes for create and delete operations
- focused unit tests covering persistence parameters, row mapping, sync queue side effects, positive and negative deltas, reason normalization, and validation failures

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 124 tests

---

## June 1, 2026 — Sprint 2 Repository Slices 6 and 7

### Notification Settings and Import Suggestion Persistence

Implemented the notification settings and import suggestion persistence layers.

Completed:
- NotificationSettingsRepository with single-profile lookup, defaults, create/update workflows, and validation
- transaction-scoped sync_queue writes for notification_settings create and update operations
- ImportSuggestionRepository with import session reads, pending-profile reads, create, confirm, reject, and soft-delete workflows
- local-only import suggestion persistence with no sync_queue writes, matching the sync contract
- shared repository types and row mappers for notification_settings and import_suggestions
- focused unit tests covering row mapping, persistence parameters, sync queue side effects where expected, local-only behavior where required, defaults, resolution flows, and validation failures

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 138 tests

---

## June 1, 2026 — Sprint 2 Repository Slice 8

### Activity Log Persistence

Implemented the activity log persistence layer for the local-first MVP.

Completed:
- ActivityLogRepository with ordered profile reads and append-only create workflow
- engine-backed activity event validation and summary normalization
- shared repository types and row mapper for activity_log
- local-only activity log persistence with no sync_queue writes, matching the sync contract
- focused unit tests covering row mapping, read limits, insert parameters, local-only behavior, import/backup events without entity ids, and validation failures

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 144 tests

---

## June 1, 2026 — Sprint 2 Service Wiring Slice 1

### Purchase Workflow Service

Implemented the first service-layer workflow for purchase actions.

Completed:
- PurchaseService under the purchases feature service layer
- purchase creation with paycheck cycle assignment via PaycheckRepository
- purchase update, pending/charged state transitions, and soft-delete orchestration
- activity_log entries for purchase added, updated, state changed, and deleted events
- shared FINANCIAL_STATE_CHANGED event contract for dashboard recalculation wiring
- focused unit tests using mocked repositories to verify orchestration and side effects

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 151 tests

---

## June 1, 2026 — Sprint 2 Service Wiring Slice 2

### Bill Workflow Service

Implemented the service-layer workflow for bill and bill cycle instance actions.

Completed:
- BillService under the bills feature service layer
- bill create, update, pause, resume, and soft-delete orchestration
- bill cycle instance mark-paid workflow
- variable bill confirmation workflow that also updates the parent bill default amount for future estimates
- activity_log entries for bill added, updated, paused, resumed, deleted, paid, and variable bill confirmed events
- FINANCIAL_STATE_CHANGED event emission after balance/projection-affecting bill actions
- focused unit tests using mocked repositories to verify orchestration and side effects

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 159 tests

---

## June 1, 2026 — Sprint 2 Service Wiring Slices 3 and 4

### Paycheck Workflow and Dashboard Snapshot Services

Implemented two additional service-layer workflows.

Completed:
- PaycheckService under the paychecks feature service layer
- paycheck create, update, mark-received, and soft-delete orchestration
- activity_log entries for paycheck added, adjusted, confirmed, and deleted events
- FINANCIAL_STATE_CHANGED event emission after paycheck actions
- DashboardService under the dashboard feature service layer
- dashboard snapshot assembly from active profile, paycheck cycle, paychecks, purchases, bill cycle instances, and balance adjustments
- safe-to-spend breakdown calculation via the financial engine
- focused unit tests using mocked repositories to verify orchestration, empty state, cycle behavior, and calculated dashboard output

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 168 tests

---

## June 1, 2026 — Sprint 2 Service Wiring Slices 5 and 6

### Settings Workflow and App Service Composition

Implemented settings workflow orchestration and the first application service composition layer.

Completed:
- SettingsService under the settings feature service layer
- essential reserve update workflow with profile persistence, activity_log entry, and FINANCIAL_STATE_CHANGED event emission
- notification settings get-or-create defaults and update workflow
- notification preference updates kept separate from financial recalculation events
- app service composition factory that builds all repositories and current services from a shared database executor and financial event bus
- focused unit tests covering settings orchestration, notification defaults, recalculation event behavior, and service composition

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 174 tests

---

## June 1, 2026 — Sprint 2 UI Wiring Slices 1 and 2

### App Runtime and Dashboard Service Bridge

Implemented the first phone-visible bridge from the prototype shell to the real service layer.

Completed:
- SimpleFinancialEventBus with subscribe/unsubscribe support for FINANCIAL_STATE_CHANGED
- app runtime singleton that opens and migrates Expo SQLite, adapts Expo's SQLite API to the repository executor contract, and composes repositories/services
- Dashboard screen props extended for service-driven labels, loading state, and projected paycheck values
- app index loads DashboardService snapshots from the runtime and refreshes on financial-state change events
- remaining Purchases, Bills, Paychecks, and Settings prototype screens remain in-memory pending their own wiring slices

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 175 tests
- Expo web visual check was attempted, but port 8081 was already occupied by another Expo instance and the non-interactive command skipped the dev server

---

## June 1, 2026 — Sprint 2 UI Wiring Slices 3 and 4

### Purchase Entry and Settings Service Wiring

Implemented the next phone-visible bridge from prototype interactions to persisted service workflows.

Completed:
- app index creates a local active profile on first real-data load when no profile exists
- purchase entry modal writes through PurchaseService instead of in-memory state
- Purchases screen receives persisted purchases mapped from DashboardService snapshots
- Settings screen supports async saves and displays persisted reserve values
- essential reserve saves through SettingsService and emits FINANCIAL_STATE_CHANGED for dashboard refresh
- current balance saves through SettingsService, creates a balance_adjustments row, logs balance_adjusted, and emits FINANCIAL_STATE_CHANGED for dashboard refresh

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 179 tests

---

## June 1, 2026 — Sprint 2 UI Wiring Slice 6

### Paychecks Screen Service Wiring

Implemented the Paychecks screen bridge from prototype content to persisted paycheck workflows.

Completed:
- Paychecks screen now renders paychecks from DashboardService snapshots instead of hardcoded cards
- added an empty state for profiles without paycheck records
- added paycheck creation from the Paychecks tab through PaycheckService
- added mark-received action through PaycheckService so confirmed income refreshes safe-to-spend through FINANCIAL_STATE_CHANGED
- added a paycheck amount keyboard accessory for iOS decimal-pad dismissal

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 179 tests

---

## June 1, 2026 — Sprint 2 UI Wiring Slice 7

### Bills Screen Service Wiring

Implemented the Bills screen bridge from prototype content to persisted bill workflows.

Completed:
- DashboardService snapshots now include parent bill records alongside current-cycle bill instances
- Bills screen displays persisted current-cycle bill instances with resolved bill names and due/paid/needs-confirmation status
- added bill creation from the Bills tab through BillService
- BillService can create a current-cycle bill instance using the existing bill instance generation engine when a new bill is due in the active pay cycle
- mark-paid and variable-amount confirmation actions now route through BillService and refresh safe-to-spend through FINANCIAL_STATE_CHANGED
- added a separate bill-entry amount keyboard accessory for iOS decimal-pad dismissal

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 181 tests

---

## June 1, 2026 — Sprint 2 UI Refactor Slice 1

### Feature-Owned Entry Modals

Reduced app index size by moving feature-specific sheet UI into the owning feature folders.

Completed:
- extracted PurchaseEntryModal into the purchases feature
- extracted BillEntryModal and BillConfirmationModal into the bills feature
- extracted PaycheckEntryModal into the paychecks feature
- kept service orchestration and state ownership in app index for this slice to avoid behavior changes
- preserved iOS keyboard accessory behavior for all decimal-pad inputs

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 181 tests

---

## June 1, 2026 — Sprint 2 UI Refactor Slice 2

### Home Screen Controller Extraction

Reduced app index size further by moving route orchestration into a home feature controller hook.

Completed:
- extracted dashboard snapshot loading and FINANCIAL_STATE_CHANGED subscription into useHomeScreenController
- extracted screen pager state and navigation handlers into useHomeScreenController
- extracted purchase, bill, paycheck, and settings action handlers into useHomeScreenController
- extracted repository-to-prototype mapping helpers into the controller module
- reduced src/app/index.tsx to a presentation-focused route component

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 181 tests

---

## June 1, 2026 — Sprint 2 UI Refactor Slice 3

### Home Controller Workflow Split

Split the home feature controller into focused hooks so route orchestration is no longer concentrated in one large file.

Completed:
- extracted static home fallback data and repository-to-UI mappers into homeData
- extracted pager state and pager event handlers into useHomePager
- extracted dashboard snapshot loading into useDashboardSnapshot
- extracted dashboard totals and visible list derivation into useHomeDerivedData
- extracted purchase, paycheck, bill, and settings workflows into focused controller hooks
- reduced useHomeScreenController to a composition hook

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 181 tests

---

## June 1, 2026 — Sprint 2 UI Wiring Slice 8

### Purchase State Actions

Completed the next Purchases screen service workflow without adding new route-level logic.

Completed:
- Purchases screen now exposes mark-charged, mark-pending, and delete actions for each purchase row
- purchase action handlers live in the purchase entry controller hook
- actions route through PurchaseService so activity logging and FINANCIAL_STATE_CHANGED refreshes remain centralized
- app index only passes purchase action props through to the screen

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 181 tests

---

## June 1, 2026 — Sprint 2 UI Wiring Slice 9

### Paycheck Delete Action

Completed the next Paychecks screen service workflow without adding route-level logic.

Completed:
- Paychecks screen now exposes a delete action for each paycheck row
- delete handler lives in the paycheck entry controller hook
- delete routes through PaycheckService so activity logging and FINANCIAL_STATE_CHANGED refreshes remain centralized
- app index only passes the paycheck delete action prop through to the screen

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 181 tests

---

## June 1, 2026 — Sprint 2 UI Wiring Slice 10

### Bill Delete Action

Completed the next Bills screen service workflow without adding route-level logic.

Completed:
- Bills screen now exposes a delete action for each current-cycle bill row
- prototype bill rows carry both the visible bill-cycle instance id and parent bill id
- BillService can delete a bill for the current cycle by soft-deleting the parent bill and visible bill-cycle instance
- delete handler lives in the bill entry controller hook
- app index only passes the bill delete action prop through to the screen

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 182 tests

---

## June 18, 2026 — Sprint 4 Bills Workflow Slice 1

### Bill Edit and Pause/Resume Actions

Completed the next Bills screen management workflow while keeping route files presentation-focused.

Completed:
- Bills screen now exposes edit and pause/resume actions for bill rows
- Bill entry modal supports both add and edit modes
- BillService can update a parent bill and its visible current-cycle instance together
- pausing a current-cycle bill pauses the parent bill and removes the visible instance from safe-to-spend
- resuming a paused bill regenerates the current-cycle instance when it belongs in the active cycle
- paused bill definitions remain visible so the user can resume or delete them

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 18, 2026 — Sprint 5 Paycheck Workflow Slice 1

### Paycheck Edit Action

Completed the next Paychecks screen management workflow.

Completed:
- Paychecks screen now exposes an edit action for each paycheck row
- Paycheck entry modal supports both add and edit modes
- paycheck edit saves label, amount, and expected date through PaycheckService
- home controller exposes explicit openAddPaycheck and openPaycheckEdit actions
- app index remains prop wiring only

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 18, 2026 — Bills Cycle Grouping Slice 2

### Current Cycle and Scheduled Bill Sections

Separated Bills screen rows by paycheck-cycle assignment.

Completed:
- current paycheck-cycle bills render under the active cycle label
- saved bill definitions that are not assigned to the active cycle render under Scheduled bills
- Bills screen shows a calm empty row when no bills are assigned to the current paycheck cycle
- repeated bill-row UI is extracted into a local BillRow component

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 18, 2026 — Bills Cycle Grouping Slice 1

### Active Paycheck Cycle Label

Added the first Bills screen paycheck-cycle indicator without changing financial calculations.

Completed:
- derived the active paycheck-cycle label from DashboardService snapshot data
- passed the label through the home controller to BillsScreen
- displayed the active paycheck-cycle window above the bill list
- kept route files as prop wiring only

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 18, 2026 — UI Consistency Slice 4

### Grouped List Container

Adjusted list-heavy screens to use a single off-white list container with internal rows instead of boxed item containers.

Completed:
- restored a shared off-white container around lightweight financial lists
- kept individual list items as rows with dividers and subtle left accents
- applied through the shared plain list group style used by Purchases, Bills, and Paycheck Schedule

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 18, 2026 — Bills Workflow Fix 1 and UI Consistency Slice 3

### Saved Bills Visibility and Divider Rows

Fixed a Bills tab visibility issue and refined list styling based on in-app review.

Completed:
- saved bill definitions now appear as Scheduled rows even when they do not generate a current-cycle bill instance
- scheduled bill rows can be edited, paused, or deleted through the existing Bills workflows
- list-heavy screens now use divider-style rows with a subtle navy left accent instead of individual boxed item containers
- retained compact row actions while reducing visual heaviness

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 19, 2026 — Sprint 5 Import Slice 8

### Pasted Statement Text Import

Added a testable bridge for PDF-derived statement text without adding a PDF
extraction dependency yet.

Completed:
- added a feature-owned pasted statement text modal
- added a Paste action beside CSV import in the Settings import review section
- imported pasted text through ImportService.importStatementText
- refreshed pending suggestions after pasted-text import
- added shared text-area styling for multiline import input

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 205 tests

---

## June 19, 2026 — Sprint 5 Import Slice 9

### Copied Statement Text Parsing

Extended the existing import parser so pasted statement/PDF-derived text lines
can produce recurring bill suggestions without adding a native PDF extraction
dependency.

Completed:
- added a plain statement-line fallback for non-CSV pasted text
- detected recurring expenses from copied statement lines with signed amounts
- detected positive debit-marked statement lines while ignoring positive deposits
- kept the existing ImportService persistence and review workflow unchanged
- added parser and service-level coverage for copied statement text imports

Validation:
- focused parser test passes locally with 11 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 209 tests

---

## June 19, 2026 — Sprint 5 Import Cleanup 1

### Removed Temporary Paste Import UI

Removed the product-facing pasted statement import controls so the Settings
import review surface stays aligned with the documented CSV/PDF import design.

Completed:
- removed the Paste button from the Settings import review header
- removed pasted-text modal wiring from the app route
- removed pasted-text modal state from the home import review controller
- deleted the unused pasted statement text modal component
- kept ImportService.importStatementText and parser coverage for future PDF text extraction

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 209 tests

---

## June 19, 2026 — Sprint 5 Import Privacy Verification Slice 1

### CSV Raw File Deletion Coverage

Added test coverage for the CSV file-picking boundary so import privacy rules
are verified independently of the UI.

Completed:
- mocked the Expo FileSystem picker boundary in a feature-owned service test
- verified canceled file picking returns without reading a file
- verified a successfully read CSV cache copy is deleted
- verified a picked CSV cache copy is still deleted when file reading fails

Validation:
- focused CSV file import test passes locally with 3 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 212 tests

---

## June 19, 2026 — Sprint 5 PDF Import Adapter Slice 1

### Extracted PDF Text Adapter

Added a small feature-owned adapter for future PDF text extraction without
adding a native PDF dependency or exposing temporary UI.

Completed:
- added importExtractedPdfText as the PDF import adapter boundary
- routed extracted PDF text through ImportService.importStatementText
- validated missing profile ids before importing
- validated empty extracted text before importing
- exported the adapter from the imports service barrel

Validation:
- focused PDF import adapter test passes locally with 3 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 215 tests

---

## June 19, 2026 — Sprint 5 PDF Import Privacy Verification Slice 1

### Extracted PDF Text Sanitization Coverage

Extended PDF adapter tests to verify extracted PDF text persists sanitized
import suggestions through the real ImportService pipeline.

Completed:
- routed extracted PDF text through the real ImportService in adapter coverage
- verified recurring PDF-derived suggestions are persisted
- verified account identifiers from extracted PDF text are not written to import_suggestions
- kept native PDF extraction out of scope for this slice

Validation:
- focused PDF import adapter test passes locally with 4 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 216 tests

---

## June 19, 2026 — Sprint 5 Multiple Income Verification Slice 1

### Scenario F Engine Coverage

Added acceptance-style financial engine coverage for multiple income sources in
the same paycheck cycle.

Completed:
- added Scenario F coverage to the safe-to-spend engine tests
- verified unreceived income sources do not increase safe-to-spend
- verified the first received paycheck source updates confirmed income and safe-to-spend
- verified the second received paycheck source updates the same breakdown independently

Validation:
- focused safe-to-spend engine test passes locally with 4 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 217 tests

---

## June 19, 2026 — Sprint 5 Multiple Income Verification Slice 2

### Dashboard Scenario F Coverage

Added dashboard service coverage for multiple income sources so the screen data
path preserves the engine's received-paycheck behavior.

Completed:
- added DashboardService coverage with primary and secondary paycheck sources
- verified the dashboard snapshot keeps both paycheck records
- verified an unreceived secondary income source does not increase confirmed income
- verified safe-to-spend is calculated from only the received paycheck source

Validation:
- focused DashboardService test passes locally with 5 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 218 tests

---

## June 19, 2026 — Sprint 5 Paycheck Cycle Card Slice 1

### Current-Cycle Summary Detail

Expanded the Paychecks screen current-cycle card using existing dashboard totals
so it better matches the Sprint 5 cycle-card requirement without adding new
calculations.

Completed:
- made safe-to-spend the primary current-cycle value on the Paychecks tab
- added received funds, upcoming bills, and reserve rows beneath the primary value
- passed existing dashboard totals through the app route into PaychecksScreen
- kept PaycheckService, database schema, and financial engine unchanged

Validation:
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 218 tests

---

## June 19, 2026 — Sprint 5 Multiple Income Workflow Slice 1

### Independent Paycheck Confirmation Coverage

Added PaycheckService coverage for confirming multiple income sources as
separate workflow actions.

Completed:
- verified two paycheck sources are marked received by their own ids
- verified each confirmation writes its own activity log entry
- verified each confirmation emits its own financial-state refresh event
- kept PaycheckService behavior unchanged

Validation:
- focused PaycheckService test passes locally with 6 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 219 tests

---

## June 19, 2026 — Sprint 5 Paycheck Cycle Card Slice 2

### Next-Cycle Projection Detail

Expanded the Paychecks screen next-paycheck panel with projected balance rows
using existing dashboard totals and existing next-cycle preview data.

Completed:
- added projected balance after the next paycheck
- added projected balance after projected bills when the next cycle can be projected
- kept projection display inside the existing Paychecks screen panel
- kept database, service, and financial engine behavior unchanged

Validation:
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 219 tests

---

## June 19, 2026 — Sprint 5 Paycheck Cycle Card Cleanup 1

### Removed Redundant Current-Cycle Card

Removed the Paychecks tab current-cycle safe-to-spend card after product review
showed it duplicated the Dashboard hierarchy.

Completed:
- removed the Paychecks screen current-cycle summary card
- removed unused reserve, unpaid bills, and safe-to-spend props from PaychecksScreen
- removed the matching route prop wiring from app index
- kept next-paycheck projection and paycheck schedule behavior unchanged

Validation:
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 219 tests

---

## June 19, 2026 — Sprint 5 Paycheck Schedule Clarity Slice 1

### Expected and Received Income Groups

Grouped the Paychecks schedule by income status so the screen focuses on
paycheck timing instead of a mixed record list.

Completed:
- split schedule rows into Expected income and Received income sections
- kept existing row details, status badges, and overflow actions
- left PaycheckService, database schema, and financial calculations unchanged

Validation:
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 219 tests

---

## June 19, 2026 — Sprint 5 Closeout Audit Slice 1

### Paychecks and Import Status

Audited the Sprint 5 implementation status and recorded the remaining PDF
decision point without exposing unfinished PDF UI.

Completed:
- confirmed CSV import, suggestion review, confirm/reject, and privacy coverage are implemented
- confirmed paycheck add/edit/receive/delete, recurrence, multiple-income behavior, and schedule clarity are implemented
- recorded that PDF import is parser/adapter-ready through extracted text
- recorded that native PDF text extraction and PDF UI are deferred until an on-device extraction spike passes on a physical phone

Validation:
- no code changes in this slice
- current quality gate remains `npm run check` passing with 219 tests from the previous slice

---

## June 19, 2026 — Sprint 6 Settings Preferences Slice 1

### Notification Toggle Wiring

Started Sprint 6 Settings work by replacing the static Notifications preference
row with a real settings-backed toggle.

Completed:
- loaded or created notification settings through SettingsService from the home settings action hook
- displayed the current notifications enabled state in Settings
- added a native on/off switch that updates notification settings through SettingsService
- kept notification changes separate from financial recalculation events
- kept app index limited to prop wiring

Validation:
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 219 tests

---

## June 19, 2026 — Sprint 6 Backup Export Slice 1

### Backup Payload Builder

Started the backup workflow with a feature-owned BackupService that builds a
JSON-ready financial-core payload before any file export UI is exposed.

Completed:
- added BackupService under the backup feature service layer
- serialized the active profile and financial-core records for export
- collected bill cycle instances through paycheck cycle anchors
- included notification settings as user preferences
- excluded local operational tables: activity_log, import_suggestions, backup_metadata, and sync_queue
- wired BackupService into the shared app service container
- added focused backup payload and container coverage

Validation:
- focused BackupService test passes locally with 3 tests
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 222 tests

---

## June 19, 2026 — Sprint 6 Backup Export Slice 2

### Backup Export Package

Added the packaging layer for local backup export before introducing file
writing or Settings UI controls.

Completed:
- added BackupService.buildExportPackage
- generated a deterministic backup file name from the export timestamp
- serialized the backup payload as formatted JSON
- returned the record count with the package for future export confirmation UI

Validation:
- focused BackupService test passes locally with 4 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 223 tests

---

## June 19, 2026 — Sprint 6 Backup Export Slice 3

### Backup File Writer Boundary

Completed the on-device file writer boundary for backup exports while keeping
the Settings UI hidden until physical-device export is validated.

Completed:
- added feature-owned BackupFileExport writer
- writes packaged backup JSON to Expo FileSystem Paths.document
- creates/overwrites the deterministic backup file name
- returns file URI, file name, and record count for future UI confirmation
- kept backup export UI hidden until the file export path is tested on iPhone

Validation:
- focused BackupFileExport test passes locally with 2 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 225 tests

---

## June 19, 2026 — Sprint 6 Backup Export Slice 4

### Backup Export Metadata

Completed the local backup metadata layer so successful exports leave a
device-local history record without adding Settings UI yet.

Completed:
- added BackupMetadataRepository for local backup export/restore history
- mapped backup_metadata rows into feature-safe repository types
- wired the repository into the shared app service container
- added BackupService.exportToDevice to build the package, write the file, then record backup_metadata
- records a backup_exported activity log entry after successful device writes
- kept backup metadata out of backup payloads and sync_queue

Validation:
- focused BackupMetadataRepository, BackupService, and createAppServices tests pass locally with 12 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 232 tests

---

## June 19, 2026 — Roadmap Scope Decision

### Backend Phase Deferred

Updated the sprint roadmap to pause all post-MVP backend work until the
phone app is complete.

Decision:
- do not move into PostgreSQL, Spring Boot, cloud sync, cloud backup, or premium account implementation immediately after MVP feature completion
- keep the next work focused on the mobile phone app, physical-device validation, QA, polish, onboarding, import reliability, backup/restore reliability, and App Store readiness
- keep Spring Boot and PostgreSQL as the intended future backend stack, but require explicit re-approval before backend implementation begins
- continue keeping the mobile app backend-ready through stable service boundaries, data contracts, sync-aware fields, backup/export formats, and tested financial calculation contracts

---

## June 19, 2026 — Sprint 6 Backup Export Slice 5

### Settings Export Backup Action

Exposed the local backup export workflow in Settings using the existing
BackupService export path.

Completed:
- added a compact Export action to the Settings Backup row
- wired Settings through the home settings action hook to BackupService.exportToDevice
- shows inline exporting, success, and error states
- keeps Settings UI decoupled from Expo FileSystem and repository details
- preserves the backend-ready service boundary without starting backend work

Validation:
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 232 tests
- physical iPhone backup export validation is still pending

---

## June 19, 2026 — Bills Cycle Sync Fix

### Dashboard Bill Instance Backfill

Fixed saved bill definitions not appearing in the active paycheck cycle when
the current cycle did not already have matching bill_cycle_instances.

Completed:
- DashboardService now backfills missing current-cycle bill instances from saved bill definitions when both current and next paycheck anchors are known
- generated bill instances are persisted through BillCycleInstanceRepository so future loads stay in sync
- existing bill_cycle_instances are respected to avoid duplicates
- safe-to-spend now includes backfilled current-cycle bills immediately

Validation:
- focused DashboardService test passes locally with 7 tests
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 234 tests

---

## June 19, 2026 — Runtime Demo Data Cleanup

### Remove Prototype Display Values

Removed early-sprint prototype values from runtime UI paths so the app displays
only real local SQLite data or empty/loading states.

Completed:
- removed hard-coded initial bills and purchases from the home controller
- replaced prototype balance and reserve defaults with zero-value loading fallbacks
- removed fake dashboard fallback values such as the sample next paycheck label and projected balance
- changed purchase entry placeholder text from example merchants to a generic description
- left test and fixture data in test/support files only

Validation:
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 234 tests

---

## June 19, 2026 — Home Adapter Refactor Slice 1

### Repository-to-UI Adapter Split

Moved repository-to-screen mapping helpers out of homeData so the home feature
has clearer responsibilities without introducing unnecessary classes.

Completed:
- added feature-owned home adapter files for bills, paychecks, and purchases
- moved repository-to-prototype mapping logic out of homeData
- kept homeData focused on screen order, date helpers, and active profile setup
- updated home derived data to import adapters from the new adapter barrel
- preserved current runtime behavior and backend-ready service boundaries

Validation:
- `npm run typecheck` passes locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 234 tests

---

## June 19, 2026 — Home Route Composition Refactor

### Thin Expo Route

Moved home screen composition out of the Expo route file so index.tsx remains
route-level wiring only.

Completed:
- reduced src/app/index.tsx from 289 lines to a thin controller/screen render
- added feature-owned HomeScreen composition under src/features/home
- moved header, pager, modals, floating purchase action, bottom nav, and keyboard accessory assembly into HomeScreen
- kept pager/ref state in the home shell and workflow/business state in useHomeScreenController
- preserved existing service, repository, and engine boundaries

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 234 tests

---

## June 19, 2026 — Sprint 5 Import Slice 7

### Shared Statement Text Import Pipeline

Prepared the import service for future PDF text extraction without adding a PDF
library or changing the CSV user flow.

Completed:
- added ImportService.importStatementText as the format-neutral recurring suggestion pipeline
- kept ImportService.importCsvText as the existing CSV wrapper
- reused the same parser, sensitive-data stripping, pending suggestion persistence, and import session behavior
- added tests for statement-text imports and validation

Validation:
- focused ImportService tests pass locally with 12 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 205 tests

---

## June 19, 2026 — Sprint 5 Import Slice 6

### Import Suggestion Confirmation UI

Completed the import review loop from pending suggestion to saved bill.

Completed:
- added a feature-owned confirmation modal for imported bill suggestions
- added Confirm as bill to the import suggestion overflow menu
- prefilled bill name and amount from the suggestion
- captured due date before confirmation
- saved confirmed suggestions through ImportService.confirmSuggestionAsBill
- removed confirmed suggestions from the pending review list and displayed a save confirmation message

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 203 tests

---

## June 19, 2026 — Sprint 5 Import Parser Tolerance Fix

### Bank Statement CSV Compatibility

Improved CSV parsing after physical-device testing imported a readable file
but detected zero suggestions.

Completed:
- supported common statement headers such as Posted, Details, Debit, Withdrawal, and Charge
- treated positive amounts as expenses only when the source column is explicitly expense-only
- kept signed Amount columns conservative so positive income is not imported as a bill suggestion
- added a regression test for fake bank statement CSVs with positive Debit values
- added support for transaction type columns so positive Amount values can be interpreted as expenses when Type is Debit, Withdrawal, Charge, Purchase, or Payment
- grouped recurring detection by sanitized merchant identity instead of exact merchant plus exact amount, allowing variable recurring bills to be suggested with the latest amount

Validation:
- focused CSV parser tests pass locally with 8 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 203 tests

---

## June 19, 2026 — Sprint 5 Import Slice 5

### CSV File Picker Import

Added the first end-to-end CSV test path for physical-device review.

Completed:
- installed Expo SDK 56 compatible `expo-file-system`
- added a feature-owned CSV picker helper using the Expo FileSystem File API
- picked a local CSV file, imported its text, then deleted the temporary picked file
- added an Import CSV action to the Settings import review section
- refreshed pending suggestions after import so detected recurring bills appear immediately
- kept the flow local-only and reused the existing ImportService parser/persistence path

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 200 tests

---

## June 19, 2026 — Sprint 5 Import Slice 4

### Import Review UI Foundation

Added the first visible import review surface without introducing file picking,
PDF parsing, or new financial calculations.

Completed:
- added a feature-owned ImportReviewSection for pending import suggestions
- displayed suggested bill name, amount, detected interval, occurrence count, and pending status
- added a compact overflow action menu with the reject action
- added a home controller hook that loads pending suggestions and removes rejected suggestions from the visible list
- injected the import review section into Settings without making Settings depend on import feature code

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 200 tests

---

## June 19, 2026 — Sprint 5 Import Slice 3

### Import Suggestion Review Reads

Completed the next import service slice needed before building the review UI.

Completed:
- ImportService can load all pending suggestions for a profile
- ImportService can load suggestions created by a specific import session
- blank profile and import session ids are rejected before repository calls
- added focused tests for the new review-read service methods

Validation:
- focused ImportService tests pass locally with 10 tests
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 200 tests

---

## June 18, 2026 — Sprint 5 Import Slice 2

### Import Suggestion Review Service Foundation

Implemented the service foundation for reviewing import suggestions without adding UI yet.

Completed:
- ImportService can confirm a pending suggestion into a bill through BillService
- confirmation marks the import_suggestion as confirmed with the created bill id
- ImportService can reject pending suggestions without creating bills
- resolved suggestions cannot be confirmed or rejected again
- createAppServices wires ImportService with the shared BillService instance
- added tests for confirm, reject, resolved-suggestion guards, and service composition

Validation:
- focused import/service composition tests pass locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 196 tests

---

## June 18, 2026 — Sprint 5 Import Slice 1

### CSV Import Foundation

Implemented the first import pipeline slice without adding UI or activating any bills automatically.

Completed:
- added a pure CSV parser for local statement text
- extracted only merchant/payee name, amount, date, and estimated recurrence interval
- detected recurring weekly, biweekly, monthly, quarterly, and irregular expense suggestions
- stripped sensitive identifiers such as account/card/reference-style numbers from suggested names
- added ImportService to persist pending import_suggestions through the existing local-only repository
- wired ImportService into the app service container for future UI integration
- added parser and service tests covering recurring detection, quoted CSV cells, privacy stripping, empty imports, and invalid CSV shape

Validation:
- focused import tests pass locally
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 193 tests

---

## June 18, 2026 — Sprint 5 Paycheck Workflow Slice 2

### Paycheck Recurrence Selection

Completed the next add/edit paycheck workflow requirement from the Sprint 5 plan.

Completed:
- added a recurrence selector to the paycheck entry modal
- persisted one-time, weekly, biweekly, semimonthly, and monthly paycheck recurrence values
- prefilled the recurrence selector when editing an existing paycheck
- displayed the saved recurrence in the Paycheck Schedule list
- kept the route file limited to prop wiring while feature-owned controller state handles the workflow

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 18, 2026 — UI Consistency Slice 2

### List Row Contrast

Refined lightweight list rows so repeated items remain easy to distinguish without becoming heavy cards.

Completed:
- added a subtle off-white row surface
- added a thin navy left accent on list rows
- added light row borders and spacing between list items
- removed old divider styling from unboxed list rows to avoid double separation

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 18, 2026 — UI Consistency Slice 1

### Lightweight List Rows

Refined list-heavy screens so repeated financial records feel less boxed-in and easier to scan.

Completed:
- added shared unboxed list row styles and compact row action buttons
- updated Purchases to use lightweight divided rows
- updated Bills to use lightweight divided rows with an inline Add action
- updated Paycheck Schedule rows to match the same list pattern
- kept Settings grouped rows unchanged because settings/preferences benefit from containment

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 18, 2026 — Sprint 5 Paycheck Layout Slice 1

### Paychecks Tab Clarity Pass

Refined the Paychecks tab layout to better match the product goal of calm paycheck-cycle visibility.

Completed:
- reorganized Paychecks into current-cycle, next-cycle, and schedule sections
- moved Add into the screen header to reduce vertical clutter
- changed paycheck history from stacked cards to a single grouped schedule list
- compacted next-cycle bill projections and capped visible projected bill details
- kept the change UI-only with no route-level business logic added

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests

---

## June 18, 2026 — Sprint 4 Purchase Workflow Slice 1

### Purchase Edit and State Selector

Completed the next Purchases screen management workflow while keeping route files presentation-focused.

Completed:
- Purchases screen now exposes an edit action for each purchase row
- Purchase entry modal supports both add and edit modes
- purchase modal includes a Pending/Charged selector for add and edit workflows
- purchase edit saves description, amount, and state through PurchaseService
- PurchaseService normalizes charged purchases with a resolved timestamp and emits FINANCIAL_STATE_CHANGED after updates

Validation:
- `npm run check` passes locally
- lint passes
- TypeScript typecheck passes
- coverage-enabled Vitest suite passes with 185 tests
