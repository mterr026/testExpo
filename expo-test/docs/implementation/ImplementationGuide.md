**BUDGET FLOW**

**Master Implementation Guide**

Development Playbook — Version 1.0

Version 1.0 \| May 2025

# Document Overview

This Master Implementation Guide and Development Playbook is a practical
engineering companion for the Budget Flow project. It is not a rewrite
or replacement of any existing specification. Every architecture
decision, database schema, API contract, and business rule in this guide
derives directly from the existing Budget Flow document suite — the
System Architecture Design v3, Database Design Document v2, Functional
Requirements Specification, API Specification v2, Sprint Roadmap,
Testing Strategy, Security and Privacy Design, and UI/UX Specification.

The purpose of this document is to answer a different question from the
one the specifications answer. The specifications define what the system
must do and how it must be structured. This guide explains how to
actually build it — in what order, with what dependencies in mind, where
the risks are, and how to protect the financial engine through testing
at every stage.

This guide is written for two developers building the application from
scratch, and for any future contributor who needs to get oriented in the
codebase quickly. It assumes familiarity with React Native, SQLite, and
general mobile development practice.

# Purpose of the Implementation Guide

A complete specification suite answers the what and why of a system.
This guide answers the how and when. Specifically, it exists to:

- Translate architecture decisions into actual code structure —
  explaining how the two-tier architecture, on-device financial engine,
  and sync-queue scaffolding map to real directories, files, and
  modules.

<!-- -->

- Establish a dependency-aware build order — the financial engine must
  exist before any screen can display correct data, and the database
  layer must exist before the financial engine. This order is
  non-negotiable and this guide explains it explicitly.

- Identify implementation risks early — particularly around financial
  calculation correctness, SQLite connection management, and the
  boundary between MVP and Phase 3 sync work.

- Protect the financial engine through testing — explaining where test
  coverage is mandatory, what the test contracts look like, and how
  those contracts will be reused in Phase 3 for backend parity
  verification.

- Define the sync_queue integration path — explaining how sync
  scaffolding is built into the MVP without activating it, so Phase 3
  premium sync can be added without restructuring the existing codebase.

# Development Philosophy

| **The MVP is a standalone mobile application. React Native and SQLite are the complete system. Everything else is future infrastructure.** |
|----|

The most important discipline this project requires is resisting the
temptation to build backend-first or to stub in networking
infrastructure before it is needed. The MVP must function as a fully
self-contained financial tool with no network dependency — not
partially, not 'mostly', but completely. Every development decision
should be evaluated against this standard.

The financial calculation engine is the heart of the application. It
must be implemented, tested, and proven correct before a single screen
is built. A dashboard that displays a wrong safe-to-spend number is
worse than no dashboard at all. Build the engine first. Test it
exhaustively. Then build the UI around a proven foundation.

The following principles govern every implementation decision:

- Local first, always — SQLite is the operational source of truth. No
  feature may depend on network availability.

- Financial correctness before visual polish — a correct number on a
  plain screen is better than a wrong number on a beautiful one.

- Test the financial engine like it handles real money — because it
  does. 100% unit test coverage on safe-to-spend logic is the floor, not
  the ceiling.

- Build the sync scaffolding early but activate it never during MVP —
  sync_queue rows get written, but nothing reads them until Phase 3.

- Soft-deletes everywhere on financial entities — deletions are never
  hard deletes; they set deleted_at. This is both a sync requirement and
  a data safety requirement.

- Integer cents throughout — never use floating-point for money. Store
  as INTEGER cents, compute as integers, format for display at the
  presentation layer only.

- Defer gracefully — every part of the codebase that will eventually
  involve the backend should be clearly marked and easily extendable,
  without introducing networking code into the MVP path.

# High-Level Development Strategy

The build order follows a strict dependency chain. Nothing in a later
layer can be correctly implemented without the layer beneath it being
solid. The layers are:

| **Layer** | **What It Contains** | **Why It Must Come First** |
|----|----|----|
| 1 — Infrastructure | Project setup, TypeScript config, SQLite integration, test runner, folder structure | Everything else runs on top of this. CI must be green before any code is written. |
| 2 — Database Schema | All SQLite tables as defined in the Database Design Document v2 | The financial engine queries the database. The schema must be stable before any queries are written. |
| 3 — Financial Engine | Safe-to-spend, balance, cycle boundaries, bill scheduling — all pure TypeScript with no UI | The engine is the ground truth for correctness. Every screen is just a view over engine outputs. |
| 4 — Repository Layer | SQLite read/write operations per entity, using the DB schema | Services need data access before they can compute anything. |
| 5 — Service Layer | Business operations that combine repository calls with financial engine logic | Screens call services. Services cannot exist until the engine and repositories do. |
| 6 — Navigation Shell | Bottom navigation, screen containers, empty states | Screens need a navigation container before they can be built out. |
| 7 — Feature Screens | Dashboard, Purchases, Bills, Paychecks, Settings — in dependency order | Each screen depends on the service and engine layers being complete. |
| 8 — Supporting Features | Import pipeline, backup/restore, onboarding, notifications | These are additive features that depend on the core financial engine working correctly. |
| 9 — QA Hardening | Full scenario testing, offline verification, device testing, beta prep | You cannot harden what you have not built. This phase validates everything. |

| **Never skip layers. The most common mistake in financial app development is building UI before the calculation engine is proven correct. The tests in Layer 3 are the specification for all future UI. Build them first.** |
|----|

# Recommended Development Environment

## 5.1 Required Tools

| **Tool** | **Version / Notes** | **Purpose** |
|----|----|----|
| Node.js | LTS (20.x or later) | React Native toolchain and test runner |
| React Native CLI | Latest stable | Project scaffolding and build management |
| Expo or bare RN | Bare workflow preferred for SQLite access | Cross-platform mobile development |
| TypeScript | 5.x | Type safety across the entire codebase, critical for financial logic |
| Jest | Latest stable | Unit and integration testing — the financial engine test suite lives here |
| SQLite library | op-sqlite (formerly react-native-quick-sqlite) or expo-sqlite | On-device database. Choose one and commit — do not swap later. |
| Flipper or RN Debugger | Latest stable | SQLite inspection and debugging during development |
| Xcode (macOS) | Latest stable for target iOS version | iOS builds and simulator testing |
| Android Studio | Latest stable | Android builds and emulator testing |
| VS Code | With ESLint, Prettier, and Jest extensions | Primary development environment |

## 5.2 Environment Configuration

Store all environment-specific values in a .env file at the project
root. Never commit secrets or API base URLs directly in code. During MVP
development, the only environment variable needed is APP_ENV
(development / staging / production). Phase 3 will add API_BASE_URL and
related keys. See Appendix C for the full environment configuration
template.

## 5.3 Two-Developer Workflow Notes

With two developers sharing a codebase, a few conventions prevent the
most common friction points:

- One developer owns the financial engine (Sprint 2). The other
  developer builds the database/repository layer simultaneously. The
  engine developer writes tests; the repository developer makes those
  tests pass against real SQLite.

- Neither developer writes screen code until the financial engine has
  100% unit test coverage. This is not a suggestion — it is a
  development gate.

- All SQLite schema migrations must be reviewed by both developers
  before being applied. A bad migration is far more expensive to fix
  than a bad UI.

- See Appendix D for the recommended Git branching strategy for two
  developers.

# Recommended Technology Stack Setup

## 6.1 React Native Project Initialization

Initialize the project using the React Native CLI with TypeScript
template. The bare workflow is strongly preferred over Expo Go because
direct SQLite access requires native module support that Expo Go does
not fully provide.

> npx react-native init BudgetFlow --template
> react-native-template-typescript

After initialization, immediately configure ESLint, Prettier, and the
Jest test runner before writing any application code. Enforcing code
style from day one prevents inconsistency from accumulating.

## 6.2 SQLite Library Selection

Choose `expo-sqlite` as the SQLite library for the current Expo SDK 56
application. It offers an asynchronous API that fits the repository
layer described here.
The important architectural decision here is not which API the library
uses internally — it is how you expose the data layer to the rest of the
application. The financial engine itself is synchronous pure TypeScript
and stays that way permanently. It accepts plain objects and returns
plain objects with no I/O. However, the repository functions that feed
data to the engine should return Promises from the start — even during
the MVP when the underlying SQLite calls are fast and local. This
matters because Phase 3 services will mix repository calls with async
network calls to the Spring Boot API. If repositories already return
Promises, adding network calls to services is a clean composition. If
repositories are synchronous, every service signature has to be
rewritten when Phase 3 begins. The pattern: repositories return
Promise\<Entity\>, services use async/await to orchestrate repository
calls and engine calls, and the financial engine functions remain
synchronous and pure. Install the library, verify it works on both iOS
and Android, and confirm async/await resolves correctly on both
platforms before writing any entity-specific repository code.

###NOTE###
`expo-sqlite` was selected because this project is an Expo SDK 56 app,
the package is bundled with the SDK, and its async API aligns with the
local-first financial data model and repository layer.


| **Choose one SQLite library and commit to it before writing any database code. Switching SQLite libraries mid-project means rewriting every repository and every migration. If you are using Expo managed workflow, expo-sqlite is acceptable — its async API aligns naturally with the async repository pattern described above. If you are using the bare React Native workflow, op-sqlite is the better choice.** |
|----|

## 6.3 State Management

Budget Flow does not require a global state management library like
Redux. The financial engine is a pure calculation layer; the UI reads
from the engine via service calls triggered by user actions. React
Context is sufficient for application-level state (current profile,
navigation state). Local component state handles form inputs. Zustand is
an acceptable lightweight alternative if you find React Context
insufficient, but avoid over-engineering state management — the database
is already the source of truth.

## 6.4 TypeScript Configuration

Enable strict mode in tsconfig.json from day one. The financial engine
handles money — TypeScript's strict null checking and strict property
access are not optional for this codebase. Any financial calculation
that can receive undefined should be caught at compile time, not at
runtime.

# Repository Structure Recommendation

The repository is organized by feature domain, not by technical layer.
This reflects the modular monolith philosophy of the System Architecture
Design and makes it straightforward to locate all code related to a
single feature. See Appendix A for the full suggested folder structure.

The top-level structure separates three concerns cleanly:

- /src/engine — the financial calculation engine. Pure TypeScript, no
  React, no SQLite. This is the most important directory in the project.

- /src/database — SQLite schema, migrations, repositories, and the
  database connection singleton.

- /src/features — one subdirectory per feature domain (paychecks, bills,
  purchases, dashboard, settings, import, backup). Each feature
  directory contains its service, its screen(s), and its local state.

- /src/shared — shared UI components, utility functions, date/currency
  helpers, and constants.

- /src/navigation — navigation container and screen registration.

- /\_\_tests\_\_ — mirrors /src structure. A test file lives next to the
  module it tests, not in a separate top-level test directory.

# React Native Application Structure

## 8.1 Layered Architecture in Code

The System Architecture Design's separation of concerns maps directly to
the codebase structure. The mapping is:

| **Architecture Concept** | **Code Location** | **Dependency Direction** |
|----|----|----|
| On-device business logic | /src/engine/ | Has no dependencies on screens, services, or DB |
| SQLite data layer | /src/database/repositories/ | Depends on schema only |
| Service layer | /src/features/\*/services/ | Depends on engine + repositories |
| Screen layer | /src/features/\*/ | Screen components live with their feature and receive prepared view data from controllers/adapters |
| sync_queue writing | /src/database/sync/ | Called by services after writes; inert during MVP |
| Navigation | /src/navigation/ | Depends on screens only |

The most critical discipline here is the dependency direction: screens
must never import directly from the engine or the database. Every screen
gets its data through a service. This keeps screens testable in
isolation and keeps the engine replaceable.

## 8.2 Application Entry Point

The application entry point (App.tsx) initializes the SQLite connection,
runs any pending schema migrations, creates the default profile if none
exists, and then renders the navigation container. No financial
calculations happen at app startup — the app opens the database and
shows the navigation shell. Calculations happen when screens request
data through their services.

# SQLite Integration Strategy

## 9.1 Connection Management

Create a single database connection singleton that is initialized once
at app startup and reused throughout the application's lifetime. Do not
open and close connections per operation — this adds unnecessary
overhead and risks leaving connections in inconsistent states. The
connection singleton lives in /src/database/connection.ts.

| **PRAGMA foreign_keys = ON must be executed on every database connection immediately after opening. SQLite disables foreign key enforcement by default. Forgetting this means referential integrity is silently not enforced.** |
|----|

## 9.2 Schema Initialization and Migrations

The schema initialization module runs on app startup and applies any
pending migrations in version order. Migrations are numbered
sequentially (migration_001.sql, migration_002.sql) and tracked in a
schema_version table. The initialization process is:

1.  Open the database connection and execute PRAGMA foreign_keys = ON.

<!-- -->

1.  Create the schema_version table if it does not exist.

2.  Read the current schema version from schema_version.

3.  Apply all migration files with version numbers higher than the
    current version, in order.

4.  Update schema_version to the latest applied migration number.

| **Never modify a migration file that has already been applied to any device. Once a migration has shipped, it is immutable. Create a new migration to correct it. This applies during development as well — if you need to fix a schema decision, create migration_002.sql rather than editing migration_001.sql.** |
|----|

## 9.3 Transaction Management

All financial write operations that touch multiple tables must be
wrapped in a SQLite transaction. A purchase entry, for example, writes
to purchases and sync_queue atomically. If either write fails, both must
be rolled back. The database module provides a withTransaction(fn)
helper that handles begin, commit, and rollback automatically.

## 9.4 The profiles Table and Single-Profile Assumption

The MVP assumes a single profile per device. The profiles table will
contain exactly one row. The profile_id used in all other tables is the
UUID from this single row, retrieved once at startup and stored in
application context. Do not query profiles repeatedly throughout the app
— load it once and pass it down via context.

# Data Layer Implementation

The data layer consists of the SQLite schema (defined in the Database
Design Document v2), the migration system, and the repository classes.
Build these in the order listed.

## 10.1 Implementation Order Within the Data Layer

5.  Schema initialization and migration runner — verify it works on both
    iOS and Android before writing any entity-specific code.

6.  profiles repository — simplest entity, single row, establishes the
    pattern all other repositories follow.

7.  paychecks repository — needed first by the financial engine.

8.  bills and bill_cycle_instances repositories together — bill
    instances depend on the bills table.

9.  purchases repository.

10. balance_adjustments repository.

11. activity_log repository — append-only, no update or delete.

12. notification_settings repository — single row per profile, similar
    to profiles.

13. import_suggestions repository — transient, used only during import
    flow.

14. sync_queue repository — write path only during MVP. Read path
    deferred to Phase 3.

## 10.2 Monetary Value Handling

All monetary values in the database are stored as INTEGER cents as
defined in the Database Design Document v2. This is not optional. The
data layer must enforce this:

- All repository write functions must accept amounts in cents as
  integers and reject floating-point values.

- All repository read functions return amounts in cents as integers.

- A formatCurrency(cents: number): string utility in
  /src/shared/currency.ts handles display formatting. This function is
  the only place dollars and decimal points appear.

- Write a unit test that verifies formatCurrency(4210) === '\$42.10'. If
  this ever returns '\$42.09' or '\$42.1', there is a floating-point
  error somewhere in the stack.

## 10.3 Soft Delete Convention

All financial entity repositories (paychecks, bills,
bill_cycle_instances, purchases, balance_adjustments) implement soft
deletes. A 'delete' operation sets deleted_at to the current UTC
timestamp — it never executes a DELETE SQL statement. Every SELECT query
in these repositories must include WHERE deleted_at IS NULL by default.
Provide a separate findDeleted() method for the rare cases where deleted
records need to be inspected.

# Repository Layer Implementation

Each repository is a class that encapsulates all SQLite interactions for
one entity. Repositories have no business logic — they only translate
between the application's domain objects and SQLite rows. Business logic
lives in services, which call repositories.

## 11.1 Repository Interface Pattern

Each repository exposes a consistent async interface. All methods return
Promises — even during MVP when the underlying SQLite operations are
synchronous and fast. This ensures the service layer, which calls
repositories, is async throughout and can cleanly accommodate Phase 3
network calls without signature changes:

- findById(id: string): Promise\<Entity \| null\>

- findAll(profileId: string): Promise\<Entity\[\]\>

- create(entity: NewEntity): Promise\<Entity\> — assigns UUID,
  timestamps, and sync_queue write

- update(id: string, changes: Partial\<Entity\>): Promise\<Entity\> —
  updates updated_at and sync_queue

- softDelete(id: string): Promise\<void\> — sets deleted_at and writes
  to sync_queue

## 11.2 sync_queue Writes in Repository Layer

Every create, update, and softDelete operation in a sync-eligible
repository must write a corresponding row to the sync_queue table as
part of the same transaction. This happens inside the repository, not in
the service layer. During MVP, these sync_queue rows are written and
then never read — they accumulate silently. In Phase 3, the sync engine
activates and begins reading them.

The sync_queue write must include: entity_type (matches the table name
convention), entity_id, operation ('create' / 'update' / 'delete'),
payload_json (a JSON snapshot of the current entity state), and
created_at. The queue entry's status defaults to 'pending'.

| **Writing sync_queue rows in the repository layer during MVP costs almost nothing — a single additional INSERT per financial action. The cost of not doing this is a Phase 3 sprint dedicated to retrofitting the entire data layer. Do it now.** |
|----|

# Financial Engine Implementation

| **This is the most important section of this guide. The financial engine is built before any screen, before any service, before any navigation. It is pure TypeScript with no dependencies on React Native or SQLite.** |
|----|

The financial engine lives in /src/engine/. It accepts plain TypeScript
objects as inputs and returns plain TypeScript objects as outputs. It
has no side effects, makes no database calls, and performs no I/O. This
makes it trivially testable and completely independent of every other
part of the application.

## 12.1 Engine Module Structure

| **Module** | **File** | **Responsibility** |
|----|----|----|
| Safe-to-Spend Calculator | safeToSpend.ts | The primary calculation — takes confirmed balance, bills, purchases, reserve as inputs; returns safe-to-spend as an integer (cents). |
| Balance Deriver | balance.ts | Computes running balance from confirmed paychecks, purchases, paid bills, and adjustments. |
| Cycle Boundary Calculator | cycleBoundaries.ts | Computes the start and end date of a paycheck cycle given a paycheck date and recurrence interval. |
| Bill Instance Generator | billInstances.ts | Generates bill_cycle_instance records from bill definitions for a given cycle. |
| Variable Bill Estimator | variableBills.ts | Determines the estimate amount for a variable bill instance using the last confirmed amount. |
| Projection Engine | projections.ts | Generates forward-looking cycle projections for the Paychecks screen. |
| Date Utilities | dates.ts | ISO 8601 parsing, cycle membership checks, due date calculations. |
| Currency Utilities | currency.ts | Integer cent arithmetic, display formatting, validation. |

## 12.2 Engine Input Types

Define strict TypeScript interfaces for all engine inputs. These types
are the contract between the database/service layer and the engine. They
should closely mirror the Database Design Document v2 entity schemas but
contain only the fields the engine actually needs for calculations.

## 12.3 No Database Access in the Engine

The engine must never import from /src/database or perform any SQLite
operation. If a calculation needs data, it is the service layer's job to
query the database and pass the data to the engine as plain objects.
This separation is what makes the engine testable, fast, and portable to
the future backend implementation.

# Safe-to-Spend Calculation Flow

Safe-to-spend is the application's primary financial indicator. Its
calculation must be exact, fast, and triggered immediately on every
state change that affects its inputs. The following describes the
complete calculation flow as it must be implemented.

## 13.1 Inputs to the Calculation

| **Input** | **Source Table** | **How It Affects Safe-to-Spend** |
|----|----|----|
| Confirmed paychecks | paychecks WHERE is_received = 1 AND deleted_at IS NULL | Sum of amount_cents — increases available balance |
| Charged purchases | purchases WHERE state = 'charged' AND deleted_at IS NULL | Sum of amount_cents — decreases safe-to-spend |
| Pending purchases | purchases WHERE state = 'pending' AND deleted_at IS NULL | Sum of amount_cents — decreases safe-to-spend immediately |
| Unpaid bill instances (current cycle) | bill_cycle_instances WHERE is_paid = 0 AND deleted_at IS NULL AND paycheck_cycle_id = \[current\] | Sum of cycle_amount_cents — decreases safe-to-spend |
| Manual balance adjustments | balance_adjustments WHERE deleted_at IS NULL | Sum of delta_cents — positive or negative |
| Essential reserve | profiles.essential_reserve | Fixed deduction — always subtracted |

## 13.2 Calculation Sequence

15. Service layer queries each input table and passes results to the
    engine as typed arrays.

16. Engine calls balance.computeRunningBalance(confirmedPaychecks,
    chargedPurchases, pendingPurchases, adjustments) — returns integer
    cents.

17. Engine calls safeToSpend.calculate(runningBalance,
    unpaidBillInstances, pendingPurchases, essentialReserve) — returns
    integer cents.

18. Result may be negative — this is valid and must be displayed as-is,
    not clamped to zero.

19. Service layer stores result in application state. Dashboard screen
    reads from state.

| **Never cache the safe-to-spend value between user actions. Always recalculate from the database on every relevant state change. The recalculation flow is: service awaits the repository queries to get the latest data, then passes that data synchronously to the financial engine for calculation. The engine call itself is synchronous and near-instant — it is simple integer arithmetic on small arrays. The async overhead is only in the data-fetch step, not the calculation step.** |
|----|

## 13.3 Recalculation Triggers

The following user actions must immediately trigger a safe-to-spend
recalculation:

- Purchase added (charged or pending)

- Purchase state changed (pending → charged)

- Purchase deleted

- Paycheck marked as received

- Paycheck amount adjusted

- Bill marked as paid

- Variable bill confirmed with new amount

- Bill paused or resumed

- Bill deleted

- Essential reserve changed

- Manual balance adjustment saved

# Paycheck Cycle Logic Implementation

Paycheck cycle logic is the foundational concept the rest of the
application is organized around. A paycheck record serves as both an
income event and a cycle anchor — the period from this paycheck's
expected_date to the next paycheck's expected_date is the cycle window.

## 14.1 Cycle Boundary Calculation

The cycleBoundaries.ts engine module calculates the start and end dates
of a cycle given a paycheck record's expected_date and recurrence
interval. The four recurrence patterns and their boundary logic:

| **Recurrence** | **Cycle Start** | **Cycle End** |
|----|----|----|
| weekly | expected_date | expected_date + 6 days |
| biweekly | expected_date | expected_date + 13 days |
| semimonthly | expected_date | 14th or 15th of next period (requires calendar logic) |
| monthly | expected_date | Same day next month minus 1 day |

Write dedicated unit tests for semimonthly cycles — they require careful
date arithmetic around month boundaries and are the most common source
of cycle assignment bugs.

## 14.2 Cycle Assignment for Bills and Purchases

When a bill_cycle_instance is generated or a purchase is saved, it must
be assigned to a paycheck cycle. The assignment logic is: find the
paycheck record whose cycle window (start_date \<= event_date \<
next_start_date) contains the event date. If no cycle window contains
the date (for example, before the first paycheck has been entered),
paycheck_cycle_id is set to NULL.

## 14.3 Idempotent Bill Instance Generation

Bill instances must be generated idempotently — calling the generation
function multiple times for the same cycle must not create duplicate
instances. The uniqueness constraint UNIQUE(bill_id, paycheck_cycle_id,
due_date) on bill_cycle_instances enforces this at the database level.
The generation function must also perform an existence check before each
INSERT to avoid relying on constraint violations as control flow.

# Bill Generation Workflow

Bill instances are generated on-device by the application layer, not by
a background scheduler. Generation is triggered at two points: when a
new paycheck record is created (which opens a new cycle window), and
when an existing cycle is refreshed due to a bill change.

## 15.1 Generation Process

20. Load all active bills for the profile (is_paused = 0, deleted_at IS
    NULL, end_date IS NULL or end_date \> cycle start).

21. For each active bill, compute the due date for the new cycle using
    the bill's recurrence rules and the cycle's start date.

22. Check if the due date falls within the cycle window.

23. Check if a non-deleted instance already exists for (bill_id,
    paycheck_cycle_id, due_date).

24. If no instance exists and the due date is within the window, create
    a new bill_cycle_instance.

25. Fixed bills: set is_variable_confirmed = 1, cycle_amount_cents =
    bill.default_amount_cents.

26. Variable bills: set is_variable_confirmed = 0, cycle_amount_cents =
    bill.default_amount_cents (estimate).

## 15.2 Variable Bill Confirmation

When a user confirms the actual amount for a variable bill instance, the
service layer updates the instance's cycle_amount_cents and sets
is_variable_confirmed to 1. This triggers an immediate safe-to-spend
recalculation, since the deduction amount has changed. The parent bill's
default_amount_cents is also updated to the newly confirmed amount, so
future cycles use it as their opening estimate.

# Purchase Workflow Implementation

Purchases are the most frequent financial action in the application. The
purchase workflow must be fast, low-friction, and immediately reflected
in the safe-to-spend display.

## 16.1 Purchase Creation

27. User enters amount and optional description. State (Charged/Pending)
    defaults to Charged.

28. Service validates: amount must be a positive integer in cents,
    description is optional.

29. Service determines paycheck_cycle_id from purchase_date.

30. Repository creates the purchase record within a transaction that
    also writes to sync_queue.

31. Service triggers safe-to-spend recalculation.

32. Activity log entry is written.

33. UI updates to reflect new safe-to-spend immediately.

## 16.2 Pending Purchase Handling

Both Charged and Pending purchases reduce safe-to-spend immediately upon
creation. The state distinction is for the user's reference only — it
does not change the financial impact. A soft reminder is issued (via the
notification system) when a pending purchase remains unresolved beyond
the threshold configured in notification_settings.

## 16.3 Purchase Deletion

Deleting a purchase is a soft delete. The service sets deleted_at and
triggers safe-to-spend recalculation. The deleted purchase disappears
from the purchase history display but remains in the database for sync
and audit purposes.

# Dashboard Data Flow

The dashboard screen is the most read-heavy screen in the application.
It must display current safe-to-spend, upcoming paycheck information,
upcoming bills, and running balance — all derived from the financial
engine.

## 17.1 Dashboard Service

The DashboardService is responsible for assembling all the data the
dashboard screen needs in a single service call. It does not perform
calculations itself — it queries the necessary repositories, passes the
data to the financial engine, and returns a typed DashboardState object
to the screen.

## 17.2 Data Loading Strategy

The dashboard loads data via async service calls when the screen mounts
and when any financial action triggers a recalculation event. Because
SQLite operations are local and fast, the async overhead is negligible
and data should appear immediately in practice. A brief loading state on
first mount is acceptable, but ongoing recalculation after user actions
should feel instant. If a perceptible delay occurs, it indicates a query
performance problem that should be fixed, not masked with a spinner or
loading indicator.

## 17.3 Dashboard Information Hierarchy

The UI/UX Specification defines the dashboard display order. The service
must return data in this structure:

- safeToSpend: number (cents) — the primary figure, prominently
  displayed at the top

- upcomingPaycheck: { amount, expectedDate, label } \| null

- essentialReserve: number (cents)

- upcomingBills: BillSummaryItem\[\] — bills due before next paycheck,
  sorted by due date

- runningBalance: number (cents)

# UI State Management Strategy

Budget Flow does not require a complex state management solution. The
database is the source of truth — screens read from services, which read
from SQLite. Local component state handles form input. React Context
handles the small amount of global state needed.

## 18.1 Global State via React Context

Three pieces of state belong in global React Context:

- ProfileContext — the current profile record, loaded once at startup
  and available throughout the app.

- FinancialStateContext — the current safe-to-spend, running balance,
  and dashboard snapshot. Updated after every financial action.

- OnboardingContext — whether onboarding has been completed, drives the
  initial navigation flow.

## 18.2 Recalculation Event Model

Rather than managing complex state subscriptions, use a simple event
emitter pattern. Financial services emit a FINANCIAL_STATE_CHANGED event
after any write that affects the balance. The DashboardService listens
for this event and re-queries the database to update
FinancialStateContext. This keeps the data flow simple and ensures the
dashboard always reflects the current database state.

## 18.3 Form State

Form inputs (purchase entry, bill creation, paycheck entry) are managed
with local component state and React Hook Form. Do not put form state in
global context. Validate inputs in the form before calling any service.

# Navigation & Screen Implementation Order

Build screens in the order that their dependencies are satisfied. A
screen cannot be correctly implemented until all the services it depends
on are complete and tested.

| **Sprint** | **Screen / Feature** | **Dependency** |
|----|----|----|
| Sprint 3 | Bottom navigation shell + empty states | Navigation library only |
| Sprint 3 | Dashboard screen (displays calculated values) | Financial engine + DashboardService complete |
| Sprint 4 | Purchase entry bottom sheet | Purchase service + safe-to-spend recalculation |
| Sprint 4 | Purchase history screen | Purchase repository |
| Sprint 4 | Bills screen (list + cycle grouping) | Bill service + bill_cycle_instances |
| Sprint 4 | Variable bill confirmation sheet | Bill instance service |
| Sprint 5 | Paychecks screen (cycle cards + swipe) | Paycheck service + cycle boundary engine |
| Sprint 5 | Add/edit paycheck | Paycheck service |
| Sprint 5 | Import flow screens | Import pipeline complete |
| Sprint 6 | Settings screen + reserve config | Profile service |
| Sprint 6 | Backup and restore UI | Backup service |
| Sprint 6 | Onboarding flow | All core services complete |

| **Do not build the onboarding flow until all core features work correctly. Onboarding is a wrapper around features that already exist — if those features have bugs, onboarding will surface them in confusing ways during testing.** |
|----|

# Import Pipeline Implementation

The import pipeline is one of the most security-sensitive features in
the application. It processes potentially sensitive financial files
on-device and must adhere strictly to the privacy requirements defined
in the Security and Privacy Design document.

## 20.1 Import Security Requirements

- All file processing occurs on-device only. No file content is ever
  transmitted externally.

- The parser extracts only: merchant/payee name, transaction amount,
  transaction date, and estimated frequency. All other fields — account
  numbers, routing numbers, full transaction descriptions, balance
  figures — are discarded during parsing and never written to the
  database.

- The raw uploaded file is deleted from device storage immediately after
  parsing is complete.

- Every detected recurring expense is a suggestion only. Nothing is
  activated without explicit user confirmation.

## 20.2 Import Processing Steps

34. User selects a CSV or PDF file via the device file picker.

35. Parser reads the file in memory, extracts only the required fields,
    and discards everything else.

36. The raw file is deleted from device storage immediately.

37. Detected recurring patterns are written to import_suggestions with
    status = 'pending'.

38. The import review screen displays each suggestion to the user.

39. For each confirmed suggestion, a new bills record is created and the
    import_suggestion status is set to 'confirmed'.

40. Rejected suggestions are soft-deleted from import_suggestions with
    no downstream effect.

## 20.3 Privacy Verification in Testing

The import privacy requirements must be verified in automated tests:

- Assert that parser output contains no account numbers, routing
  numbers, or balance figures.

- Assert that the uploaded file path is inaccessible (file does not
  exist) after processing completes.

- Assert that rejected suggestions produce zero database writes to the
  bills table.

# Backup and Restore Implementation

The backup and restore system is the user's protection against device
loss. It must be reliable, complete, and straightforward to implement —
the backup format is JSON, all operations are local, and the restore
process must reconstruct the exact application state.

## 21.1 Backup Export

The backup export function queries all Financial Core entities for the
current profile and serializes them to a single JSON object. The
structure follows the entity schema defined in the Database Design
Document v2. Local-only entities (activity_log, import_suggestions,
backup_metadata, sync_queue) are excluded from the backup payload — they
are device-local operational data, not financial records.

The backup file is written to the device's user-accessible Documents
directory. A backup_metadata record is written to the database recording
the export event, file name, and record count.

## 21.2 Backup Restore

The restore process reads a user-selected backup JSON file, validates
its structure against the expected schema, and then replaces the current
database state within a transaction. The restore must be atomic — if any
part of the restore fails, the transaction is rolled back and the
existing database is preserved intact.

| **Validate the backup file structure before beginning the restore transaction. A corrupted backup applied to a live database is worse than a failed restore. If the backup JSON does not match the expected schema, reject it with a clear error message before touching any database tables.** |
|----|

# Activity Log Implementation

The activity log is an append-only local audit trail. Records are
written but never modified or deleted. It is implemented as a
lightweight service that services call after significant financial
operations.

## 22.1 ActivityLogService

The ActivityLogService exposes a single public method: log(profileId,
eventType, entityType, entityId, summary). Services call this method as
the final step of any write operation. The method inserts a new
activity_log record and returns immediately — it must not block or fail
the calling operation. Wrap the INSERT in a try-catch and swallow any
activity log errors rather than propagating them to the user.

## 22.2 Event Types

The complete set of event_type values is defined in the Database Design
Document v2. Implement them as a TypeScript const enum in
/src/shared/activityEventTypes.ts to prevent typos and ensure
compile-time exhaustiveness checking.

# Notification Architecture

Budget Flow's notification system is deliberately minimal and calm. No
pressure-driven, repetitive, or emotionally aggressive notifications.
The implementation reflects this philosophy.

## 23.1 MVP Notification Scope

The MVP implements one type of notification: a single soft reminder when
a pending purchase has remained unresolved beyond the configured
threshold (default: 7 days). This is implemented as a local notification
scheduled by the app, not a server-side push notification.

## 23.2 Notification Settings

The notification_settings table (one record per profile) stores all
notification preferences. The NotificationService reads these settings
and schedules local notifications accordingly. If notifications_enabled
is 0, no notifications are scheduled. See the FRS for the complete
notification rules.

## 23.3 Premium Notification Deferral

Server-side notification delivery (for premium multi-device use cases)
is a Phase 3 feature handled by the Spring Boot notifications module.
The MVP local notification system must be designed so that premium
server-side notifications can be added without modifying the existing
local notification code path.

# Testing Implementation Strategy

| **Tests are written alongside the financial engine, not after it. The test suite is the specification for the engine's behavior.** |
|----|

The testing approach follows the structure defined in the Testing
Strategy document. The implementation order for tests mirrors the
implementation order for code — financial engine tests are written
first, followed by integration tests, followed by acceptance scenario
tests.

## 24.1 Test-First for Financial Logic

For every function in /src/engine/, write the test before writing the
implementation. This is not aspirational — it is a development gate. No
service may call a financial engine function that does not have passing
unit tests. The process:

41. Define the function signature and input/output types.

42. Write unit tests covering all input combinations (zero values,
    maximum reserve, negative results, multiple income sources).

43. Write the implementation until all tests pass.

44. Add edge case tests for cycle boundary month-spanning scenarios and
    semimonthly intervals.

## 24.2 Test Contracts for Phase 3 Parity

Financial engine unit tests must be structured around clearly named
input/output contracts. These contracts will be re-executed against the
Spring Boot backend calculation engine in Phase 3 to verify parity. Name
test cases descriptively —
'biweekly_cycle_with_variable_bill_unconfirmed_returns_estimated_deduction'
is more useful than 'test case 14'. The test name is the contract label.

# Unit Testing Plan by Module

| **Module** | **Required Tests** | **Coverage Target** |
|----|----|----|
| safeToSpend.ts | Zero balance, zero bills, maximum reserve, pending only, charged only, combined pending and charged, negative result, multiple bill instances, variable estimated vs confirmed, reserve deduction at all states | 100% |
| balance.ts | Confirmed paychecks only, confirmed + purchases, + paid bills, + manual adjustments, positive and negative adjustments | 100% |
| cycleBoundaries.ts | Weekly, biweekly, semimonthly (all month positions), monthly, cycles spanning year boundaries, shortest and longest months | 100% |
| billInstances.ts | Fixed bill generation, variable bill generation, paused bill exclusion, ended bill exclusion, duplicate prevention, due date within cycle, due date outside cycle | 100% |
| variableBills.ts | Default amount inheritance, confirmation update, recalculation after confirmation | 100% |
| dates.ts | ISO 8601 parsing, cycle membership, due date calculation | 95%+ |
| currency.ts | Integer arithmetic, display formatting, cent conversion, rounding edge cases | 100% |

# Integration Testing Plan

Integration tests use a real in-memory SQLite database. They verify that
the service layer, repository layer, and financial engine work correctly
together. Each integration test creates a fresh database, seeds it with
known data, executes an operation, and asserts the result.

| **Test Scenario** | **What It Verifies** |
|----|----|
| Purchase added — safe-to-spend updates | Service writes purchase, engine recalculates, dashboard state reflects new value |
| Paycheck confirmed — balance increases | is_received set to 1, running balance recalculates, safe-to-spend increases |
| Variable bill confirmed — safe-to-spend adjusts | cycle_amount_cents updated, is_variable_confirmed set to 1, recalculation triggers |
| Bill paused — removed from safe-to-spend | is_paused = 1, instance excluded from deductions, safe-to-spend increases |
| Soft-deleted purchase — excluded from calculations | deleted_at set, purchase excluded from all queries, safe-to-spend increases |
| Bill cycle instance generation — idempotency | Generation function called twice, no duplicate instances created |
| Backup export — complete and valid | JSON output matches expected schema, record counts correct |
| Backup restore — state reconstructed | Restored database produces same safe-to-spend as original |
| sync_queue written on create/update/delete | Every financial write produces a corresponding sync_queue row with status 'pending' |
| PRAGMA foreign_keys = ON enforced | Attempted orphan insert is rejected by the database |

# MVP Release Readiness Checklist

The following criteria must all be satisfied before any beta release is
considered ready. This checklist supplements the Testing Strategy's
Pre-Release QA Checklist.

## 27.1 Financial Engine

- 100% unit test coverage on all engine modules

- All seven acceptance test scenarios pass end-to-end

- Negative safe-to-spend displays correctly and does not crash

- Integer-cent arithmetic verified with display formatting tests

## 27.2 Data Layer

- PRAGMA foreign_keys = ON verified on all connections

- Soft-delete exclusion verified for every financial entity type

- sync_queue writes verified for all create/update/delete operations

- Backup export and restore cycle verified on physical devices (both
  platforms)

## 27.3 Offline Operation

- All core features tested with airplane mode enabled on physical
  devices

- No network calls made during any MVP operation (verified via network
  monitoring)

## 27.4 Privacy

- Import parser verified: no sensitive fields in extracted data

- Raw imported file deleted after processing (file path inaccessible)

- No financial data written to any network location

## 27.5 Platform

- iOS and Android both tested on physical mid-range devices

- Safe-to-spend recalculation performance acceptable on both platforms

- No platform-specific financial calculation divergence

# Common Architectural Mistakes to Avoid

The following mistakes are well-documented patterns in financial mobile
development. Each has been seen in production applications and each is
expensive to fix retroactively.

| **Mistake** | **Consequence** | **Prevention** |
|----|----|----|
| Floating-point arithmetic for money | Safe-to-spend displays \$127.99 instead of \$128.00; user trust destroyed | Store INTEGER cents everywhere. No exceptions. The currency.ts module is the only place decimal formatting happens. |
| Building UI before the financial engine is tested | Dashboard displays wrong values; hard to identify if bug is in engine, service, or screen | The financial engine must have 100% unit test coverage before Sprint 3 begins. |
| Hard-deleting financial records | Sync orphans in Phase 3; no audit trail; lost data on accidental delete | All financial entities use soft deletes (deleted_at). No DELETE SQL on financial tables. |
| Forgetting PRAGMA foreign_keys = ON | Orphaned records silently accumulate; referential integrity is not enforced | Enforce in the connection singleton. Verify in an integration test. |
| Querying the financial engine from a screen directly | Screen becomes untestable; engine cannot be swapped | Screens call services. Services call the engine. Never skip layers. |
| Not writing sync_queue rows in the MVP | Phase 3 requires a full data layer rewrite to retrofit sync support | Write sync_queue rows from the repository layer from day one. They are dormant and free during MVP. |
| Caching safe-to-spend between actions | Stale value displayed after a financial change | Always recalculate from the database. Never cache. The calculation is fast enough. |
| Mixing account and profile concepts | Confusion when Phase 3 introduces cloud authentication | profiles is the local financial data root. accounts is the future cloud auth identity. Never conflate them. |

# Future Premium Sync Integration Strategy

| **Phase 3 sync must be additive. It must not require changes to the MVP financial engine, the SQLite schema, or the repository layer. If it does, the MVP was not built correctly.** |
|----|

If the MVP was built correctly — with sync_queue writes in the
repository layer, UUID primary keys, ISO 8601 timestamps, sync_status
fields, and soft deletes — then Phase 3 reduces to: activate the sync
engine that reads from the sync_queue outbox that has been filling up
since day one.

## 29.1 What Already Exists at the Start of Phase 3

- sync_queue table — populated with every financial mutation since the
  app was first used

- sync_status fields on all sync-eligible entities — all currently set
  to 'local'

- UUID primary keys — no ID collision risk when associating with backend
  records

- soft-delete support — deletions can propagate via sync without
  tombstone management complexity

- ISO 8601 UTC timestamps — compatible with PostgreSQL TIMESTAMPTZ
  without conversion

## 29.2 New Code Needed in Phase 3

- SyncEngine class — reads from sync_queue WHERE status = 'pending'
  ORDER BY created_at ASC

- Authentication flow — account registration, login, token storage in
  device Keychain/Keystore

- POST /v1/sync/push integration — packages sync_queue rows into API
  request batches

- GET /v1/sync/pull integration — applies server-side changes to local
  SQLite on pull

- Sync status UI — last-synced timestamp in Settings; sync conflict
  display if needed

## 29.3 What Must Not Change in Phase 3

- The financial engine — no changes permitted. Mobile calculation
  authority is absolute.

- The SQLite schema — only additive changes (device_id column additions)
  permitted

- The repository layer's financial write paths — sync_queue writes are
  already there

- The MVP data flow — sync operations happen in the background, after
  the local write has succeeded

## 29.4 First-Sync Profile Linkage

When a user first enables premium sync after creating a cloud account,
the sync engine must link the local profiles.id UUID to the cloud
account's user_id. This association is stored on the backend and used to
route synchronized records to the correct account. The local profiles.id
does not change — it remains the financial data root throughout.

# Spring Boot Backend Implementation Strategy (Future Phase)

The Spring Boot backend is future infrastructure and must not be started
until the MVP is stable. When Phase 3 begins, the backend is built as a
modular monolith using Spring Boot, connecting to PostgreSQL. No
microservices.

## 30.1 Module Initialization Order

45. Project setup — Spring Boot, PostgreSQL schema matching
    sync-eligible SQLite entities with device_id and cloud_id columns
    added.

46. auth module — JWT authentication, registration, login, refresh,
    logout.

47. accounts module — premium account management, profile-to-account
    linking.

48. sync module — POST /v1/sync/push processing, conflict detection,
    PostgreSQL persistence.

49. safe_to_spend module — server-side calculation engine implementing
    the same rules as the mobile engine.

50. backup_restore module — cloud backup storage and retrieval.

51. notifications module — server-side notification scheduling for
    premium accounts.

## 30.2 Schema Alignment with SQLite

The PostgreSQL schema mirrors the SQLite schema for sync-eligible
entities, with two additions per table: device_id (VARCHAR, the UUID of
the originating device) and cloud_id (UUID, the PostgreSQL primary key).
The local SQLite id remains the device-side UUID. The backend stores
both to support bidirectional record matching during synchronization.

# Shared Business Rule Parity Strategy

The System Architecture Design establishes that mobile and backend
implementations must produce identical results for the same financial
input state. The implementation strategy for achieving this parity:

## 31.1 The Mobile Engine as the Canonical Reference

The /src/engine/ modules written in Sprint 2 are the canonical
implementation of the business rules. They are the specification for the
backend. When implementing the Spring Boot safe_to_spend module in Phase
3, use the mobile engine's test cases as acceptance criteria — not just
the FRS prose.

## 31.2 Test Contract Documentation

During Sprint 2, in addition to writing the unit tests, document the
calculation inputs and expected outputs for each of the seven acceptance
test scenarios (Scenarios A through G from the Testing Strategy) in a
structured format in /docs/calculation-contracts/. These contracts are
the parity test inputs for Phase 3.

## 31.3 Parity Verification in Sprint 14

For Sprint 14 parity testing, seed identical financial data into both
the local SQLite test database and the backend PostgreSQL test database.
Run both calculation engines against the identical state and assert that
safe-to-spend outputs are equal to the cent. Any divergence is a
blocking defect — not a tolerance issue.

# Deployment and Build Preparation

## 32.1 Build Configuration

Configure separate build variants for development, staging, and
production from the start of the project. The only differences between
variants during the MVP phase are: app bundle ID (to allow dev and
production builds to coexist on a device), app display name, and .env
file. Do not create separate build logic for each variant — use
environment variables.

## 32.2 App Store Preparation (Sprint 9)

- Both Apple Developer and Google Play Developer accounts must be
  registered before Sprint 9 begins.

- Privacy policy page must be published to a public URL before App Store
  submission — Budget Flow's policy should reflect the local-first,
  no-data-collection approach documented in the Security and Privacy
  Design.

- App Store and Google Play listings should be prepared during Sprint 9
  alongside beta preparation, not after.

- TestFlight (iOS) and Internal Testing (Android) tracks should be used
  for beta distribution before any public release.

## 32.3 Crash Reporting

Implement non-financial diagnostic crash reporting in Sprint 9.
Important constraints: the crash reporter must not transmit any
financial data, user financial records, or SQLite content. Configure it
to report only app version, device model, OS version, crash stack trace,
and non-sensitive breadcrumbs. Sentry with a custom beforeSend hook to
strip financial data is a reasonable choice.

# Long-Term Maintainability Notes

The most maintainable codebases are the ones that make the right thing
easy and the wrong thing hard. For Budget Flow, that means:

- The financial engine must never grow side effects. If a function in
  /src/engine/ ever needs to call a repository or trigger a
  notification, that logic belongs in a service, not the engine. Keep
  the engine pure.

- Database migrations are permanent. Write them carefully, name them
  descriptively (migration_003_add_import_suggestions_table.sql), and
  comment non-obvious schema decisions.

- Every time you add a new sync-eligible entity, verify that its
  repository writes to sync_queue. Do not rely on memory — add a test
  that asserts sync_queue is written on create/update/delete for every
  sync-eligible entity.

- The calculation-contracts documentation must be updated whenever
  business rules change. It is the source of truth for Phase 3 parity
  testing.

- Do not add network-dependent code to any MVP feature path. If a new
  feature requires networking during MVP operation, it is not an MVP
  feature — it is Phase 3 work.

# Recommended Development Workflow

For a two-person development effort, a lightweight but disciplined
workflow prevents the most common small-team coordination failures:

## 34.1 Pull Request Practice

- All code goes through a pull request, even with two developers. The
  review process catches architectural drift before it accumulates.

- No PR merges without passing tests. CI must be green before merge.

- Financial engine PRs require the second developer to review the test
  cases, not just the implementation.

- Schema migration PRs are reviewed by both developers before any
  migration is applied.

## 34.2 Code Review Focus Areas

When reviewing code, pay special attention to:

- Any use of floating-point arithmetic near monetary values — this is
  always a bug

- Any screen that directly imports from /src/engine/ or /src/database/ —
  should go through a service

- Any repository function that modifies financial data without also
  writing to sync_queue

- Any use of hard DELETE SQL on financial entities

- Any function that accesses the network during the MVP operational path

# Suggested Weekly Development Rhythm for Two Developers

This is a practical suggestion, not a mandate. Adjust based on your
actual working rhythm and velocity.

| **Day** | **Suggested Focus** |
|----|----|
| Monday | Sprint planning / backlog review. Agree on which tasks each developer owns for the week. Identify any blockers or dependencies. |
| Tuesday – Thursday | Primary development work. Each developer works on their assigned tasks. Raise blockers immediately — do not wait until end-of-week. |
| Thursday afternoon | Code review and PR merges. Both developers review open PRs together if possible. Merge everything that is ready. |
| Friday | Testing and integration. Run the full test suite. Test on physical devices if any new features were completed. Write or update integration tests for completed work. Brief retrospective: what slowed us down this week? |

At the start of each sprint, agree explicitly on the development gate:
what must be true before Sprint N+1 begins. For Sprint 2, the gate is
100% unit test coverage on the financial engine. For Sprint 3, the gate
is a working dashboard displaying real calculated values. These gates
prevent technical debt from being carried forward.

# Appendix A — Suggested Folder Structure

> BudgetFlow/
>
> ├── src/
>
> │ ├── engine/ \# Financial calculation engine — pure TypeScript, no
> React
>
> │ │ ├── safeToSpend.ts
>
> │ │ ├── balance.ts
>
> │ │ ├── cycleBoundaries.ts
>
> │ │ ├── billInstances.ts
>
> │ │ ├── variableBills.ts
>
> │ │ ├── projections.ts
>
> │ │ ├── dates.ts
>
> │ │ └── currency.ts
>
> │ ├── database/
>
> │ │ ├── connection.ts \# SQLite singleton, PRAGMA setup
>
> │ │ ├── migrations/ \# migration_001.sql, migration_002.sql, ...
>
> │ │ ├── schema/ \# Table creation SQL, indexed
>
> │ │ ├── repositories/
>
> │ │ │ ├── ProfileRepository.ts
>
> │ │ │ ├── PaycheckRepository.ts
>
> │ │ │ ├── BillRepository.ts
>
> │ │ │ ├── BillInstanceRepository.ts
>
> │ │ │ ├── PurchaseRepository.ts
>
> │ │ │ ├── BalanceAdjustmentRepository.ts
>
> │ │ │ ├── ActivityLogRepository.ts
>
> │ │ │ ├── NotificationSettingsRepository.ts
>
> │ │ │ ├── ImportSuggestionRepository.ts
>
> │ │ │ └── SyncQueueRepository.ts
>
> │ │ └── sync/ \# sync_queue write helpers (MVP: write only)
>
> │ ├── features/
>
> │ │ ├── dashboard/
>
> │ │ │ ├── DashboardService.ts
>
> │ │ │ └── DashboardScreen.tsx
>
> │ │ ├── purchases/
>
> │ │ │ ├── PurchaseService.ts
>
> │ │ │ ├── PurchasesScreen.tsx
>
> │ │ │ └── PurchaseEntryModal.tsx
>
> │ │ ├── bills/
>
> │ │ │ ├── BillService.ts
>
> │ │ │ ├── BillsScreen.tsx
>
> │ │ │ ├── BillEntryModal.tsx
>
> │ │ │ └── BillConfirmationModal.tsx
>
> │ │ ├── paychecks/
>
> │ │ │ ├── PaycheckService.ts
>
> │ │ │ ├── PaychecksScreen.tsx
>
> │ │ │ └── PaycheckEntryModal.tsx
>
> │ │ ├── settings/
>
> │ │ │ ├── SettingsService.ts
>
> │ │ │ └── SettingsScreen.tsx
>
> │ │ ├── import/
>
> │ │ │ ├── ImportService.ts
>
> │ │ │ ├── parsers/ (CsvParser, PdfParser)
>
> │ │ │ ├── ImportReviewSection.tsx
>
> │ │ │ └── ImportSuggestionConfirmModal.tsx
>
> │ │ ├── backup/
>
> │ │ │ ├── BackupService.ts
>
> │ │ │ └── services/BackupService.ts
>
> │ │ └── onboarding/
>
> │ │ └── onboarding/ \# Deferred until onboarding is implemented
>
> │ ├── shared/
>
> │ │ ├── components/ \# Shared UI components
>
> │ │ ├── hooks/ \# Shared React hooks
>
> │ │ ├── activityEventTypes.ts \# Const enum of all activity event
> types
>
> │ │ ├── constants.ts
>
> │ │ └── theme.ts \# Colors, typography, spacing
>
> │ ├── context/
>
> │ │ ├── ProfileContext.tsx
>
> │ │ ├── FinancialStateContext.tsx
>
> │ │ └── OnboardingContext.tsx
>
> │ └── navigation/
>
> │ ├── RootNavigator.tsx
>
> │ └── BottomTabNavigator.tsx
>
> ├── docs/
>
> │ └── calculation-contracts/ \# Named input/output contracts for Phase
> 3 parity
>
> ├── \_\_tests\_\_/ \# Mirrors /src structure
>
> ├── .env.development
>
> ├── .env.staging
>
> ├── .env.production
>
> └── jest.config.js

# Appendix B — Suggested Naming Conventions

| **Entity Type** | **Convention** | **Examples** |
|----|----|----|
| React screens | PascalCase + Screen suffix | DashboardScreen, BillsScreen |
| React bottom sheets | PascalCase + Sheet suffix | PurchaseEntrySheet, VariableBillConfirmSheet |
| Service classes | PascalCase + Service suffix | PurchaseService, BillService |
| Repository classes | PascalCase + Repository suffix | PurchaseRepository, BillRepository |
| Engine functions | camelCase, verb-first | calculateSafeToSpend, generateBillInstances |
| Database table names | snake_case plural | bill_cycle_instances, balance_adjustments |
| Database column names | snake_case with \_cents suffix for money | amount_cents, cycle_amount_cents, default_amount_cents |
| TypeScript interfaces | PascalCase, no prefix/suffix | PaycheckRecord, BillInstance |
| Context files | PascalCase + Context suffix | ProfileContext, FinancialStateContext |
| Event type constants | UPPER_SNAKE_CASE | PURCHASE_ADDED, PAYCHECK_CONFIRMED |
| Migration files | migration_NNN_description.sql | migration_001_initial_schema.sql |
| Test files | \*.test.ts adjacent to source | safeToSpend.test.ts next to safeToSpend.ts |

# Appendix C — Suggested Environment Configuration

The following .env structure applies across all three environments.
Values marked \[DEFERRED\] are not used during MVP operation — they are
placeholders to be populated in Phase 3.

> \# .env.development
>
> APP_ENV=development
>
> APP_NAME=BudgetFlow Dev
>
> APP_BUNDLE_ID=com.budgetflow.dev
>
> \# Phase 3 - leave empty during MVP
>
> API_BASE_URL=
>
> API_VERSION=v1
>
> \# Crash reporting - configure in Sprint 9
>
> CRASH_REPORTING_DSN=
>
> \# Feature flags - all Phase 3 features disabled during MVP
>
> FEATURE_PREMIUM_SYNC=false
>
> FEATURE_CLOUD_BACKUP=false
>
> FEATURE_WEB_CLIENT=false

Use a feature flag check (e.g. FEATURE_PREMIUM_SYNC === 'true') to gate
any Phase 3 code paths that are written in the codebase before Phase 3
begins. This ensures Phase 3 scaffolding cannot be accidentally
activated during MVP operation.

# Appendix D — Suggested Git Branching Strategy

A simple but disciplined branching model for two developers:

| **Branch** | **Purpose** | **Rules** |
|----|----|----|
| main | Production-ready code only | Only merged from release/. Never commit directly. Must pass all tests. |
| develop | Integration branch for completed features | All feature branches merge here first. CI must pass before merge. |
| feature/sprint-N-description | Individual feature work | One branch per sprint task or small feature group. Keep focused. |
| fix/description | Bug fixes | Branch from develop (or main for critical production fixes). |
| release/vX.Y | Sprint release preparation | Created from develop at end of sprint. Only bug fixes allowed. Merged to main and back to develop on release. |

Commit message convention: use conventional commits format (feat:, fix:,
test:, refactor:, docs:). For financial engine commits, prefix with
engine: to make the git log useful during future debugging. Example:
'engine: fix semimonthly cycle boundary for February'.

# Final Engineering Notes

Budget Flow is a genuinely useful application built on a deliberately
simple philosophy — help people understand how much money they can
safely spend before their next paycheck. The technical specifications
for this project are thorough and coherent. The implementation challenge
is not complexity; it is discipline.

The three disciplines that determine the outcome of this project:

- Build the financial engine first and test it exhaustively. Every hour
  spent on engine tests in Sprint 2 saves multiple hours of debugging in
  Sprints 4, 5, and 6.

- Never skip layers. Screens call services. Services call the engine.
  The engine calls nothing. This discipline is what makes the codebase
  maintainable and testable six months from now.

- Keep Phase 3 infrastructure dormant but present. sync_queue rows fill
  up silently. feature flags stay false. The Phase 3 activation should
  feel like turning on a switch, not performing surgery.

The specification suite for this project is complete. The architecture
is sound. The build order is clear. The remaining work is execution —
one sprint at a time, one test at a time, one function at a time.

| **Sprint 2 complete with 100% financial engine coverage is the most important milestone in the project. Everything built after that is a view over a proven foundation.** |
|----|
