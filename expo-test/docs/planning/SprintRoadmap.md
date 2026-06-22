**BUDGET FLOW**

**Sprint Roadmap & Development Plan**

MVP & Premium Release Planning

Version 1.0 \| May 2025

# Document Overview

This Sprint Roadmap defines the phased development plan for the Budget
Flow MVP and post-MVP premium releases. It organizes the full feature
scope into structured sprints, establishes clear delivery milestones,
and provides the independent development effort with a prioritized,
dependency-aware implementation sequence.

This document should be treated as a living plan. Sprint scope and
sequencing should be reviewed at the conclusion of each sprint and
adjusted based on actual velocity, user testing feedback, and technical
findings. Story point estimates, where included, are indicative planning
estimates and should be re-evaluated throughout implementation as
development priorities and technical findings evolve.

# Development Phases

Budget Flow development is organized into three sequential phases, each
with a clear scope boundary and a distinct delivery goal:

|  |  |  |
|----|----|----|
| **Phase** | **Focus** | **Outcome** |
| Phase 1 — MVP Foundation | Sprints 1–6 | A fully functional, offline-capable local budgeting application ready for internal testing and beta release. |
| Phase 2 — MVP Polish & Beta | Sprints 7–9 | A production-ready MVP with onboarding refinement, QA hardening, performance tuning, and App Store submission readiness. |
| Phase 3 — Premium Sync | Deferred | Optional cloud synchronization, premium account management, and multi-device support as an additive premium tier. This phase is intentionally paused until the phone app is complete and validated. |

Phase 3 work must not begin until Phase 1 and Phase 2 are complete and
the MVP has been validated with real users. No Phase 3 feature may
introduce any dependency, regression, or behavioral change in the
local-first MVP experience.

Current planning decision as of June 19, 2026: post-MVP backend
implementation work is paused. Do not start PostgreSQL, Spring Boot,
cloud sync, cloud backup, or premium account implementation until the
mobile phone app is complete, tested on physical devices, and explicitly
re-approved for backend expansion. Mobile work should still preserve
backend readiness by maintaining clear service boundaries, stable data
contracts, sync-aware entity fields, backup/export formats, and tested
financial calculation contracts.

# Phase 1 — MVP Foundation

## Sprint 1 — Project Setup & Data Foundation

Status: **Complete as of June 1, 2026**.

Completion notes:
- Expo SDK 56 application foundation is established.
- `expo-sqlite` is selected and installed for the local-first MVP data layer.
- SQLite connection, migration flow, and `PRAGMA foreign_keys = ON` enforcement are implemented.
- MVP schema includes profiles, paychecks, bills, bill_cycle_instances, purchases, balance_adjustments, activity_log, notification_settings, import_suggestions, backup_metadata, and sync_queue.
- Schema contract tests, financial fixture builders, currency utilities, Vitest test runner, coverage tooling, and GitHub Actions CI quality gate are in place.
- Local quality gate passes with `npm run check`.

Goal: Establish the complete project infrastructure and implement the
full database schema. No user-facing features are delivered in this
sprint — the outcome is a solid, tested foundation for all subsequent
work.

|  |  |
|----|----|
| **Task** | **Detail** |
| Repository and project structure | Initialize React Native project. Establish folder structure aligned with feature-domain module organization. |
| SQLite integration | Integrate SQLite library. Implement database initialization, connection management, and PRAGMA foreign_keys = ON enforcement. |
| Full schema implementation | Implement all tables: profiles, paychecks, bills, bill_cycle_instances, purchases, balance_adjustments, activity_log, notification_settings, import_suggestions, backup_metadata, sync_queue. All tables as defined in the Database Design Document v2. Note: the entity previously named ‘users’ is profiles in the final schema — profiles is the SQLite financial data root, distinct from the cloud authentication account created in Phase 3. |
| Seed data and test fixtures | Create realistic synthetic test data fixtures for use across all future test suites. |
| Unit test infrastructure | Configure test runner, coverage tooling, and CI pipeline for automated test execution on every commit. |
| Core date and monetary utilities | Implement ISO 8601 date handling, cent-based integer arithmetic, and display formatting helpers with full unit test coverage. |

## Sprint 2 — Core Financial Logic

Status: **In progress as of June 1, 2026**.

Progress notes:
- Safe-to-spend calculation, running balance derivation, paycheck cycle boundaries, bill cycle instance generation, variable bill confirmation helpers, and activity log entry builder are implemented with unit tests.
- Repository slice 1 is implemented: ProfileRepository, SyncQueueRepository, shared repository types, row mappers, and tests for transaction-scoped sync queue writes.
- Repository slice 2 is implemented: PaycheckRepository with ordered reads, cycle lookup, create/update/mark-received/soft-delete, and transaction-scoped sync queue writes.
- Repository slice 3 is implemented: BillRepository and BillCycleInstanceRepository with active-cycle reads, create/update/pause/resume/mark-paid/variable-confirm/soft-delete workflows, and transaction-scoped sync queue writes.
- Repository slice 4 is implemented: PurchaseRepository with profile/cycle/pending reads, create/update/pending/charged/soft-delete workflows, and transaction-scoped sync queue writes.
- Repository slice 5 is implemented: BalanceAdjustmentRepository with append-only create, ordered reads, soft-delete workflow, delta calculation, and transaction-scoped sync queue writes.
- Repository slice 6 is implemented: NotificationSettingsRepository with single-profile reads, create/update workflows, defaults, validation, and transaction-scoped sync queue writes.
- Repository slice 7 is implemented: ImportSuggestionRepository with local-only import session reads, pending-profile reads, create/confirm/reject/soft-delete workflows, and no sync queue writes.
- Repository slice 8 is implemented: ActivityLogRepository with append-only local-only writes, ordered profile reads, engine-backed event validation, and no sync queue writes.
- Service wiring slice 1 is implemented: PurchaseService coordinates purchase create/update/state-change/delete workflows with paycheck cycle assignment, activity log entries, and financial-state change events.
- Service wiring slice 2 is implemented: BillService coordinates bill create/update/pause/resume/delete, bill payment, variable bill confirmation, parent default amount refresh, activity log entries, and financial-state change events.
- Service wiring slice 3 is implemented: PaycheckService coordinates paycheck create/update/confirm/delete workflows with activity log entries and financial-state change events.
- Service wiring slice 4 is implemented: DashboardService assembles active profile, current paycheck cycle, purchases, bill instances, balance adjustments, and safe-to-spend breakdown for UI consumption.
- Service wiring slice 5 is implemented: SettingsService coordinates essential reserve updates, notification setting defaults/updates, reserve activity log entries, and financial-state change events for reserve changes.
- Service wiring slice 6 is implemented: app service composition factory builds repository and service instances from a shared database executor and financial event bus.
- UI wiring slice 1 is implemented: app runtime opens/migrates Expo SQLite, adapts it to repository executors, composes services, and exposes a subscribable financial event bus.
- UI wiring slice 2 is implemented: Dashboard screen loads a real DashboardService snapshot and refreshes on FINANCIAL_STATE_CHANGED; later UI wiring slices moved purchases, bills, paychecks, and settings onto persisted service workflows.
- UI wiring slice 3 is implemented: purchase entry writes through PurchaseService, creates a local profile when needed, and maps persisted purchases into the Purchases screen.
- UI wiring slice 4 is implemented: Settings reserve saves through SettingsService and refreshes the dashboard through financial-state change events.
- UI wiring slice 5 is implemented: Settings current balance saves through a balance adjustment workflow and refreshes DashboardService safe-to-spend output.
- UI wiring slice 6 is implemented: Paychecks screen displays persisted DashboardService paychecks and supports add/mark-received actions through PaycheckService.
- UI wiring slice 7 is implemented: Bills screen displays persisted current-cycle bill instances with parent bill names and supports add, mark-paid, and variable-amount confirmation through BillService.
- UI wiring slice 8 is implemented: Purchases screen supports persisted mark-charged, mark-pending, and delete actions through PurchaseService.
- UI wiring slice 9 is implemented: Paychecks screen supports persisted delete actions through PaycheckService.
- UI wiring slice 10 is implemented: Bills screen supports persisted delete actions that remove both the parent bill and visible current-cycle instance through BillService.
- UI refactor slice 1 is implemented: feature-owned entry and confirmation modal components were extracted from app index for purchases, bills, and paychecks.
- UI refactor slice 2 is implemented: route-level dashboard loading, screen pager state, form state, and service action handlers were extracted from app index into a home screen controller hook.
- UI refactor slice 3 is implemented: the home screen controller was split into focused hooks for paging, dashboard snapshot loading, derived UI data, purchase entry, bill entry/confirmation, paycheck entry, and settings actions.
- Sprint 4 bills workflow slice 1 is implemented: Bills screen supports editing current-cycle bills and paused bill definitions, plus pause/resume actions that keep current-cycle bill instances and safe-to-spend aligned.
- Sprint 4 purchase workflow slice 1 is implemented: Purchases screen supports editing purchase description, amount, and Pending/Charged state through the shared purchase entry modal.
- Sprint 5 paycheck layout slice 1 is implemented: Paychecks screen is reorganized into clearer current-cycle, next-cycle, and schedule sections with reduced visual clutter.
- UI consistency slice 1 is implemented: Purchases, Bills, and Paycheck Schedule use lighter unboxed row lists with compact row actions instead of heavy list containers.
- UI consistency slice 2 is implemented: list rows use a subtle off-white surface, border, spacing, and navy left accent for stronger scan contrast without returning to heavy cards.
- UI consistency slice 3 is implemented: list rows now use divider-style rows with a subtle navy left accent instead of individual boxed item containers.
- UI consistency slice 4 is implemented: list-heavy screens use one off-white list container with internal rows, not individual boxed items.
- Bills workflow fix 1 is implemented: saved bill definitions remain visible as Scheduled rows when they do not create a current-cycle bill instance.
- Bills cycle grouping slice 1 is implemented: Bills screen displays the active paycheck-cycle window above the bill list so current-cycle obligations are tied back to their paycheck anchor.
- Bills cycle grouping slice 2 is implemented: Bills screen separates active paycheck-cycle bills from Scheduled bills in distinct sections.
- Sprint 5 paycheck workflow slice 1 is implemented: Paychecks screen supports editing paycheck label, amount, and expected date through the shared paycheck entry modal.
- Sprint 5 paycheck workflow slice 2 is implemented: Paycheck add/edit supports recurrence selection and displays the saved recurrence in the schedule list.
- Sprint 5 import slice 1 is implemented: CSV import foundation parses local CSV text, detects recurring expense suggestions, strips sensitive identifiers, and persists pending import_suggestions without activating bills.
- Sprint 5 import slice 2 is implemented: ImportService supports explicit suggestion confirmation into bills and suggestion rejection while keeping unresolved suggestions pending.
- Sprint 5 import slice 3 is implemented: ImportService exposes pending and session-scoped suggestion reads for the upcoming review workflow.
- Sprint 5 import slice 4 is implemented: Settings now hosts a compact import review section for pending suggestions with a reject action, without adding file picking or new import calculations.
- Sprint 5 import slice 5 is implemented: Settings can pick a local CSV file, read the cache copy on-device, import recurring suggestions, delete the cache copy after reading, and refresh the review list.
- Sprint 5 import slice 6 is implemented: pending import suggestions can be confirmed as bills from the Settings review section after name, amount, and due date are reviewed.
- Sprint 5 import slice 7 is implemented: ImportService now has a shared statement-text import pipeline that CSV uses today and future PDF text extraction can reuse.
- Sprint 5 import slice 8 is implemented: statement text can move through the shared import pipeline in tests as a bridge for future PDF-derived text, but no pasted-text action is exposed in the app UI.
- Sprint 5 import slice 9 is implemented: copied statement/PDF-derived text lines can be parsed through the existing recurring suggestion pipeline without adding a native PDF extraction dependency.
- Sprint 5 import cleanup 1 is implemented: the temporary Paste import UI was removed from Settings so the visible import workflow matches the documented CSV/PDF design.
- Sprint 5 import privacy verification slice 1 is implemented: CSV file-picking tests verify the temporary cache file is deleted after successful reads and failed reads.
- Sprint 5 PDF import adapter slice 1 is implemented: extracted PDF text has a feature-owned adapter into the existing statement import pipeline; native PDF text extraction is still intentionally not added.
- Sprint 5 PDF import privacy verification slice 1 is implemented: extracted PDF text adapter tests verify sanitized suggestions are persisted without account identifiers.
- Sprint 5 PDF import UI slice 1 is implemented: Settings import review exposes a PDF picker for text-based PDFs and routes extracted statement text through the existing suggestion pipeline.
- Sprint 5 PDF import candidate slice 1 is implemented: PDF imports can surface likely bill-looking single-statement candidates for review while still ignoring everyday one-off purchases.
- Sprint 5 multiple income verification slice 1 is implemented: Scenario F engine coverage verifies multiple paycheck sources affect safe-to-spend only after each source is individually received.
- Sprint 5 multiple income verification slice 2 is implemented: DashboardService coverage verifies multiple paycheck sources keep individual received statuses through the dashboard safe-to-spend snapshot.
- Sprint 5 paycheck cycle card cleanup 1 is implemented: the redundant Paychecks current-cycle safe-to-spend card was removed so Dashboard remains the primary current-cycle summary surface.
- Sprint 5 multiple income workflow slice 1 is implemented: PaycheckService coverage verifies multiple paycheck sources are marked received independently with separate activity log entries and refresh events.
- Sprint 5 paycheck cycle card slice 2 is implemented: Paychecks screen next-paycheck panel now shows projected balance after the paycheck and after projected bills using existing dashboard data.
- Sprint 5 paycheck schedule clarity slice 1 is implemented: Paychecks screen groups paycheck rows into Expected income and Received income sections without changing actions or calculations.
- Sprint 5 closeout audit slice 1 is implemented: CSV import, import review, paycheck workflows, multiple-income behavior, and import privacy are complete; PDF is parser/adapter-ready, while native PDF extraction and PDF UI are intentionally deferred until an on-device extraction spike passes.
- Sprint 5 PDF OCR note: scanned/image-only/compressed bank PDFs still require a dedicated OCR/dev-build spike; the current MVP path supports readable PDF text plus likely single-statement bill candidates.
- Sprint 6 settings preferences slice 1 is implemented: Settings now loads notification defaults through SettingsService and exposes a real on/off switch instead of static preference text.
- Sprint 6 backup export slice 1 is implemented: BackupService builds a JSON-ready financial-core payload with record counts while excluding local operational tables.
- Sprint 6 backup export slice 2 is implemented: BackupService can package the backup payload as formatted JSON with a deterministic export file name and record count.
- Sprint 6 backup export slice 3 is implemented: backup export packages can be written to the device Documents directory through an isolated Expo FileSystem boundary.
- Sprint 6 backup export slice 4 is implemented: successful backup exports can record local backup_metadata and backup_exported activity after the device file write succeeds.
- Sprint 6 backup export slice 5 is implemented: Settings exposes a compact Export backup action wired to BackupService.exportToDevice with inline success and error feedback.
- Sprint 6 backup export slice 6 is implemented: successful backup exports open the native share/save sheet so the JSON file can be saved to Files, iCloud Drive, AirDrop, or another destination.
- Sprint 6 backup restore groundwork slice 1 is implemented: backup JSON now has a shared local validation contract that verifies schema version, record counts, profile ownership, and bill-instance references before any future restore writes touch SQLite.
- Current local quality gate passes with `npm run check`.

Goal: Implement and fully test the on-device financial calculation
engine before any UI is built. Financial correctness is established here
and protected by tests from this point forward. The calculation rules
defined in this sprint — safe-to-spend derivation, paycheck-cycle
boundaries, bill scheduling, pending purchase handling, and reserve
deduction — constitute the authoritative business rule set for the
entire platform. The same rules will be implemented on the Spring Boot
backend in Sprint 11 for web client rendering and synchronized state
validation. Sprint 2 defines them; Sprint 11 mirrors them. Both
implementations must produce identical outputs for the same input state.

|  |  |
|----|----|
| **Task** | **Detail** |
| Safe-to-spend calculation engine | Implement the complete on-device safe-to-spend derivation: confirmed balance minus upcoming confirmed bill instances, estimated variable bills, pending purchases, and essential reserve. This is the authoritative implementation of the safe-to-spend business rule. Document the precise input set and calculation sequence in code comments — the backend implementation in Sprint 11 must replicate this logic exactly. |
| Paycheck cycle boundary logic | Implement cycle boundary calculations for weekly, biweekly, semimonthly, and monthly recurrence patterns. |
| Bill cycle instance generation | Implement the logic that generates bill_cycle_instances from bill definitions for each paycheck cycle. |
| Running balance derivation | Implement balance calculation from confirmed paychecks, purchases, paid bills, and manual adjustments. |
| Variable bill estimation | Implement default_amount inheritance for variable bill instances and the confirmation update workflow. |
| Activity log service | Implement the append-only activity log writer with all event_type values defined. |
| Full unit and integration test coverage | All financial logic in this sprint must achieve 100% unit test coverage and comprehensive integration test coverage before sprint close. Unit tests must be structured around clearly named input/output contracts — these contracts will be reused in Sprint 11 to verify that the backend calculation implementation produces identical results for the same inputs. |

## Sprint 3 — Navigation Shell & Dashboard

Goal: Deliver the application shell, bottom navigation, and the MVP
Dashboard screen displaying real calculated data from the database.

|  |  |
|----|----|
| **Task** | **Detail** |
| Bottom navigation shell | Implement five-tab bottom navigation: Dashboard, Purchases, Bills, Paychecks, Settings. |
| Dashboard screen | Implement the Dashboard displaying: safe-to-spend amount, upcoming paycheck summary, essential reserve, upcoming bills summary, and running balance. All values sourced from the financial calculation engine. |
| Safe-to-spend breakdown | Implement the tap-to-expand breakdown of safe-to-spend calculation components. |
| Floating add purchase button | Implement the persistent floating action button for quick purchase entry on the Dashboard. |
| Empty state handling | Implement calm, informative empty states for all dashboard sections when no data exists. |
| Real-time recalculation | Verify that all dashboard values update immediately in response to database state changes. |

## Sprint 4 — Purchases & Bills Screens

Goal: Deliver the Purchases and Bills screens with full create, edit,
and management functionality.

|  |  |
|----|----|
| **Task** | **Detail** |
| Purchase entry bottom sheet | Implement amount input, optional description, and Charged/Pending state selector. Amount field focused on open. |
| Purchase history screen | Implement chronological purchase list with amount, date, description, and state. Running balance visible at top. |
| Purchase edit and delete | Implement edit and delete workflows for existing purchases, including pending-to-charged state transition. |
| Bills screen | Implement bills list organized by paycheck cycle, sorted by due date within each cycle. |
| Add and edit bill workflow | Implement bill creation and editing: name, amount, due date, recurrence interval, fixed/variable type, and optional end date. |
| Mark bill as paid | Implement the mark-paid action on bill_cycle_instances, with immediate balance recalculation. |
| Variable bill confirmation | Implement the variable bill confirmation bottom sheet: estimated amount pre-populated, user updates and confirms. |
| Pause and resume bill | Implement bill pause and resume with correct is_paused behavior and projection impact. |

## Sprint 5 — Paychecks Screen & Import

Goal: Deliver the Paycheck cycle view and the CSV/PDF import pipeline.

|  |  |
|----|----|
| **Task** | **Detail** |
| Paychecks screen — cycle cards | Implement swipeable paycheck cycle cards displaying: paycheck amount, safe-to-spend, reserve, bills summary, and projected balance. |
| Add and edit paycheck | Implement paycheck entry: amount, expected date, recurrence interval, and optional label. |
| Confirm paycheck received | Implement the mark-received action. Paycheck amount does not affect balance until this action is taken. |
| Multiple income sources | Implement support for multiple paycheck entries within the same cycle. |
| CSV import pipeline | Implement local CSV parsing: field extraction, recurring pattern detection, sensitive data stripping, and raw file deletion. |
| PDF import pipeline | Implement local PDF text extraction and recurring pattern detection using the same pipeline as CSV. |
| Recurring expense confirmation screen | Implement the user-confirmation workflow for import suggestions: review, confirm, edit, or reject each suggestion individually. |
| Import privacy verification | Verify in tests that no sensitive fields are written to the database and that the raw file is deleted post-processing. |

## Sprint 6 — Settings, Backup, and Onboarding

Goal: Deliver the Settings screen, local backup functionality, manual
balance adjustment, and the complete onboarding flow.

|  |  |
|----|----|
| **Task** | **Detail** |
| Settings screen | Implement all settings sections: essential reserve configuration, notification preferences, backup controls, appearance, and about. |
| Essential reserve configuration | Implement reserve amount input in Settings with immediate safe-to-spend recalculation. |
| Local backup export | Implement JSON backup export to user-accessible device storage with record count confirmation. |
| Local backup restore | Implement backup file selection, structural validation, and full database restore with integrity verification. |
| Manual balance adjustment | Implement balance override input with confirmation prompt and activity log entry. |
| Onboarding flow | Implement the complete onboarding sequence: welcome screen, tutorial, paycheck setup, bill entry, optional import, expense confirmation, reserve setup, and dashboard arrival. |
| Skip onboarding | Implement the ability to skip any onboarding step and proceed directly to the dashboard. |
| Notification soft reminders | Implement the single soft reminder for unresolved pending purchases beyond a configurable threshold. |

# Phase 2 — MVP Polish & Beta

## Sprint 7 — Internal QA & Financial Logic Hardening

Goal: Complete internal QA testing across all MVP features. Identify and
resolve all financial logic defects. Achieve coverage targets defined in
the Testing Strategy.

- Execute all financial logic acceptance test scenarios (Scenarios A
  through G from the Testing Strategy)

<!-- -->

- Execute full offline operation verification across all screens and
  workflows

- Execute import privacy compliance tests on physical iOS and Android
  devices

- Execute backup and restore verification on physical devices

- Resolve all identified financial calculation defects — each fix must
  include a regression test

- Achieve all coverage minimums defined in the Testing Strategy before
  sprint close

## Sprint 8 — UX Refinement & Performance

Goal: Refine the user experience based on testing feedback. Validate
performance targets on mid-range devices.

- Address UX friction points identified during Sprint 7 internal testing
  — focus on onboarding flow, purchase entry, and variable bill
  confirmation

- Verify safe-to-spend recalculation and screen transition performance
  on mid-range iOS and Android devices

- Conduct accessibility review: touch target sizes, font scaling, and
  contrast ratios

- Conduct visual QA across target devices: spacing, typography, and
  component rendering consistency

- Implement projected negative balance visual indicator — elevated but
  calm, non-judgmental styling

## Sprint 9 — Beta Preparation & App Store Readiness

Goal: Prepare the application for external beta release and App Store
submission.

- Complete App Store and Google Play listing preparation: screenshots,
  descriptions, and privacy policy

- Implement crash reporting and non-financial diagnostic logging for
  beta monitoring

- Complete pre-release QA checklist as defined in the Testing Strategy

- Conduct beta distribution to a small group of target users for
  real-world validation

- Address any critical issues identified during beta testing before
  proceeding to Phase 3

# Phase 3 — Premium Synchronization — Deferred

Phase 3 is intentionally deferred. It begins only after the mobile phone
app is complete, the MVP has been beta-validated, and local-first
operation has been verified as stable on physical devices. All Phase 3
work is additive — no sprint in this phase may alter the behavior,
performance, or data integrity of the local MVP experience.

Do not move into PostgreSQL, Spring Boot, cloud sync, cloud backup, or
premium account implementation as the automatic next step after MVP
feature completion. The immediate post-MVP focus remains the phone app:
QA, polish, physical-device testing, onboarding refinement, import and
backup reliability, and App Store readiness.

Backend readiness remains an active design constraint during mobile
work. It is acceptable to document contracts, keep schema and repository
boundaries backend-compatible, preserve sync_status and sync_queue
semantics, and add tests that protect future backend parity. It is not
acceptable to create backend services, PostgreSQL schemas, API routes,
authentication flows, cloud storage, or premium account infrastructure
until backend expansion is explicitly resumed.

## Sprint 10 — Spring Boot Backend Foundation

Goal: Establish the Spring Boot backend service with authentication
infrastructure and the modular monolith project structure.

- Initialize Spring Boot project with feature-based module structure:
  auth, accounts, sync, backup_restore, notifications, safe_to_spend.
  Note: the accounts module manages cloud authentication identity
  (user_id) — it is distinct from the local SQLite profiles table which
  is the on-device financial data root.

- Implement JWT authentication: registration, login, token refresh, and
  logout endpoints

- Implement PostgreSQL schema mirroring the sync-eligible SQLite
  entities (profiles, paychecks, bills, bill_cycle_instances, purchases,
  balance_adjustments, notification_settings) with device_id and
  cloud_id fields added for multi-device conflict tracking

- Implement API rate limiting, request validation, and standard error
  response structure

- Deploy to a secure hosted staging environment with HTTPS and TLS
  configuration

## Sprint 11 — Synchronization Engine

Goal: Implement the push/pull synchronization API, the on-device
sync_queue management, and the backend financial calculation engine. The
backend financial rules are a parallel implementation of the same rules
defined in Sprint 2 — they serve web client rendering, synchronized
state validation, and multi-device consistency checks. They do not
replace or override mobile offline calculation authority.

- Implement POST /v1/sync/push endpoint: receive sync_queue records
  ordered by created_at, validate structural integrity per entity_type,
  apply last-write-wins conflict detection using client_updated_at,
  persist to PostgreSQL, return results keyed by queue_entry_id. Request
  body must include device_id and profile_id. See API Specification v2
  for full request/response schema.

- Implement GET /v1/sync/pull endpoint for cross-device change retrieval

- Implement on-device sync queue manager: reads from the local
  sync_queue table where status = ‘pending’, ordered by created_at
  ascending; sets status to ‘syncing’ before transmission to prevent
  duplicate dispatch; transmits batches to POST /v1/sync/push including
  queue_entry_id, entity_type, entity_id, operation, payload, and
  client_updated_at; updates sync_queue row status to ‘synced’ or
  ‘failed’ based on response

- Implement backend safe-to-spend calculation engine: implement the same
  safe-to-spend business rules as the Sprint 2 mobile engine (confirmed
  balance minus upcoming bill instances minus reserve) operating on
  PostgreSQL state. This is used for web client rendering and
  synchronized state validation — not for overriding mobile calculations

- Implement sync status update on successful cloud persistence.
  Implement first-sync profile linkage: on the first successful sync
  push from a device, the backend associates the incoming profile_id
  with the authenticated cloud user_id, enabling future multi-device
  routing of synchronized records

- Implement backend paycheck-cycle boundary calculations: replicate the
  cycle boundary rules from Sprint 2 on the backend. Implement backend
  recurring bill scheduling: replicate bill_cycle_instance generation
  logic on the backend for PostgreSQL state. These backend
  implementations must produce identical outputs to the mobile engine
  for the same input data.

- Verify that sync failures at any stage do not alter, corrupt, or lock
  local SQLite state

## Sprint 12 — Cloud Backup & Premium Account

Goal: Implement cloud backup storage and the premium account management
screens.

- Implement POST /v1/backup, GET /v1/backup, and GET /v1/backup/{id}
  endpoints

- Implement cloud backup encryption at rest

- Implement premium account management screens in Settings: account
  profile, password change, and subscription status

- Implement cloud backup UI in Settings: upload current backup, browse
  available cloud backups, and restore from cloud

## Sprint 13 — Premium Integration & Settings

Goal: Integrate premium features into the application settings
experience and implement the premium upgrade flow.

- Implement premium upgrade flow: plan presentation, subscription
  initiation, and account creation

- Implement Backup & Sync settings section: sync status display, manual
  sync trigger, and last-synced timestamp

- Implement calm premium upsell in Settings: convenience-focused,
  non-aggressive presentation of premium benefits

- Implement account deletion workflow with local data preservation
  guarantee

## Sprint 14 — Premium QA & Launch Preparation

Goal: Complete QA testing of all premium features. Verify that no
premium feature has altered MVP local-only behavior.

- Execute backend financial calculation parity tests: for each of the
  seven acceptance test scenarios defined in the Testing Strategy
  (Scenarios A through G), verify that the backend safe-to-spend
  calculation engine produces identical results to the mobile engine for
  the same input state. Any divergence is a blocking defect.

- Execute full regression test suite on local MVP behavior with premium
  infrastructure present in the codebase

- Verify that all core MVP features operate identically for users who
  have not enabled premium features

- Execute synchronization correctness tests: push, pull, conflict
  resolution, and sync failure recovery

- Execute cloud backup and restore verification on physical devices

- Complete security validation of authentication, transport security,
  and server-side data scoping

- Prepare premium launch materials and updated App Store listings

# Milestone Summary

|  |  |  |
|----|----|----|
| **Milestone** | **Target Sprint** | **Criteria** |
| Financial Logic Complete | End of Sprint 2 | On-device financial calculation engine fully implemented and tested with 100% unit test coverage. Calculation contracts documented for backend parity verification in Sprint 11. |
| MVP Feature Complete | End of Sprint 6 | All MVP features implemented and passing automated tests. |
| MVP QA Complete | End of Sprint 7 | All financial acceptance scenarios pass. Coverage targets met. No open financial logic defects. |
| Beta Release | End of Sprint 9 | App Store submission ready. Pre-release checklist completed and verified. |
| Premium Feature Complete | End of Sprint 13 | All premium sync, cloud backup, and backend financial calculation features implemented. Backend financial engine verified against Sprint 2 mobile contracts. |
| Premium Launch Ready | End of Sprint 14 | Premium QA complete. MVP regression verified. Backend/mobile calculation parity verified across all acceptance test scenarios. Security validation completed. |

# Planning Assumptions

The following assumptions underpin the sprint plan and should be
revisited if they change:

- Sprint duration is two weeks throughout all phases

- The project is being developed by a small independent development
  effort with responsibilities shared across mobile, backend, testing,
  and product implementation work.

- React Native is the confirmed mobile framework — no cross-platform
  framework change is anticipated

- Spring Boot and PostgreSQL remain the intended future backend stack,
  but backend implementation is paused until the phone app is complete
  and backend expansion is explicitly re-approved. Mobile work should
  continue to avoid choices that would make a future Spring Boot and
  PostgreSQL backend harder to add.

- App Store and Google Play review timelines are not included in sprint
  estimates and should be added to Phase 2 planning as a buffer

- Phase 3 start date is contingent on positive beta feedback, MVP
  stability, and a deliberate decision to resume backend work — it
  should not be treated as a fixed date on a delivery calendar
