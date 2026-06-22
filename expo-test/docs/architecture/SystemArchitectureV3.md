**BUDGET FLOW**

**System Architecture Design**

Version 3.0 — Local-First Architecture & Engineering Design

Version 3.0 \| May 2025

# Changes from Version 3.0

The following targeted changes were made in this revision to align the
document with the Database Design Document v2 and API Specification v2.
The core MVP architecture, local-first philosophy, tier separation, and
engineering principles are unchanged.

## Changes Made

- MVP Data Architecture — updated the sync-readiness bullet to name the
  sync_queue outbox table. Clarifies that mutations to sync-eligible
  entities write a row to sync_queue during MVP operation, and that
  these rows are dormant with no effect on financial calculations or
  user-facing behavior until the premium sync engine is activated.

- MVP Operational Data Flow Step 3 — now explicitly names sync_queue and
  describes both the sync_status field update and the sync_queue row
  write as part of the same step. Confirms both are inert during MVP
  local-only operation.

- Future Premium Synchronization Flow — all six steps rewritten to align
  with the sync_queue outbox design. Step 1: sync engine reads from
  sync_queue. Step 2: names POST /v1/sync/push and the transmitted
  fields (queue_entry_id, entity_type, entity_id, operation, payload,
  client_updated_at, device_id, profile_id). Step 3: clarified that the
  sync API does not act as the operational authority for financial
  calculations during sync processing — it validates and persists only.
  Future Spring Boot services may implement the same financial
  calculation rules for web client rendering, synchronized-state
  validation, premium notifications, and multi-device consistency, as a
  parallel implementation of shared business rules that does not replace
  mobile offline calculation authority. Step 4: PostgreSQL described as
  mirror of confirmed local state. Step 5: queue_entry_id named in
  confirmation response. Step 6: sync_queue status update and
  sync_status update both described; calculations confirmed unaffected.

- Backend Module Structure — three modules updated. users renamed to
  accounts (now describes cloud authentication identity, user_id, and
  the link to the local profiles record). safe_to_spend description
  updated to clarify that the module is inactive during MVP operation
  and does not replace mobile calculation authority. In Phase 3, it may
  implement the same shared safe-to-spend business rules for future web
  client rendering, synchronized-state validation, premium
  notifications, and backend parity testing. Mobile on-device
  calculation authority is preserved at all times. Sync module updated
  to reference sync_queue payloads, POST /v1/sync/push, last-write-wins
  conflict resolution, and queue_entry_id in responses.

- Authentication Architecture — added an identity layer clarification
  paragraph before the constraint list. Defines local SQLite profiles as
  the financial data root (no external service required) and cloud
  account/user_id as the premium authentication identity. States that
  the two are linked at first sync and are otherwise independent.

- Engineering Principles — sync-aware data model principle updated to
  list UUID primary keys, sync_status fields, and sync_queue outbox
  table as the three specific MVP schema mechanisms, replacing a vaguer
  description.

## What Was Not Changed

- Tier 1 / Tier 2 separation — React Native + SQLite remain the complete
  MVP system. Spring Boot and PostgreSQL remain future premium
  infrastructure only.

- On-device financial calculation authority — safe-to-spend, running
  balance, and all financial logic execute on-device and remain fully
  operational offline. The backend implements the same calculation rules
  for web client rendering and server-side consistency validation — this
  is a parallel implementation, not a replacement.

- Offline resilience requirements — no sync failure may compromise local
  data. PostgreSQL mirrors confirmed local state; it is not upstream
  authority.

- Other backend module names (auth, paychecks, bills, purchases,
  imports, notifications, backup_restore) are unchanged. No
  microservices patterns introduced.

- Authentication constraints — no account creation required for MVP
  features. JWT auth remains inactive during local-only usage and
  strictly optional for premium workflows.

# Executive Summary

Budget Flow is designed as a local-first, offline-capable personal
finance platform focused on simplified paycheck-to-paycheck cash flow
awareness. The architecture is built around a single foundational
principle: the mobile application must function as a complete,
self-sufficient financial tool with no external dependencies during the
MVP phase.

During MVP operation, the React Native mobile application and its SQLite
database constitute the entire functional system. Spring Boot and
PostgreSQL are intentionally scoped as future premium synchronization
infrastructure — they are planned for, architecturally accommodated, and
deliberately absent from the MVP operational path.

The technical decisions documented in this specification are designed to
ensure that the application delivers reliable financial clarity today
while preserving a clean, low-friction upgrade path to optional cloud
services in future premium releases. This document should be read
alongside the Non-Functional Requirements and Functional Requirements
Specification.

# Architectural Philosophy

| **Core Principle: The mobile application is the system during MVP. SQLite is the authoritative database. The cloud is a future enhancement.** |
|----|

Budget Flow's architecture is deliberately tiered to match the product's
release roadmap. The MVP is a standalone mobile application. Future
premium tiers introduce optional synchronization services that enhance —
but never replace — local device operation. This distinction must be
preserved at every layer of the system, from data ownership to business
logic placement.

The architectural philosophy is governed by the following non-negotiable
constraints:

- The mobile application must remain fully operational with no backend
  connectivity at any point during MVP usage

- SQLite is the source of truth for all financial data during the MVP
  phase — not a cache, not a staging layer

- Spring Boot and PostgreSQL do not exist in the MVP operational path —
  they are future infrastructure, planned now to avoid architectural
  debt later

- No core MVP feature may depend on, degrade without, or be improved by
  a network connection

- Future synchronization services must be additive — their introduction
  must never alter the behavior, reliability, or data integrity of the
  local experience

# System Tiers and MVP Scope

The Budget Flow architecture is organized into two clearly separated
tiers, each with an explicit scope boundary:

## Tier 1 — MVP: Mobile Application (Active)

Tier 1 constitutes the complete Budget Flow MVP. It is the only
operational tier in the initial release and must function as a fully
self-contained financial planning system.

| **Component** | **Role in MVP** |
|----|----|
| React Native Mobile Application | The complete user-facing product. Responsible for all UI rendering, user interaction, financial workflow management, and offline-first operation. |
| SQLite Local Database | The authoritative operational database for the MVP. Stores all financial data — paychecks, bills, purchases, reserves, and safe-to-spend state — entirely on the user's device. |
| On-Device Business Logic | All financial calculations, safe-to-spend derivations, cycle assignments, and balance projections execute on-device during the MVP, without any backend dependency. |

## Tier 2 — Future Premium: Cloud Synchronization (Planned)

Tier 2 components are intentionally excluded from the MVP. They are
defined here to ensure the MVP architecture accommodates their future
introduction without requiring structural changes to Tier 1.

| **Component** | **Future Role** |
|----|----|
| Spring Boot REST API | Future premium synchronization service. Hosts validation logic for multi-device conflict resolution and coordinates cloud persistence when optional sync is enabled. |
| PostgreSQL Cloud Database | Future long-term persistence layer for users who have enabled premium cloud synchronization. Does not replace SQLite — mirrors confirmed local state to the cloud. |
| JWT Authentication | Future authentication mechanism for premium account holders. Architecturally present in the codebase but inactive during MVP local-only usage. |

# MVP Data Architecture

During the MVP phase, all application data is owned, stored, and managed
exclusively on the user's device. The following principles govern the
MVP data architecture:

| **SQLite is the authoritative operational database for the MVP. There is no secondary system of record during local-only operation.** |
|----|

- All financial data — paychecks, recurring bills, purchases, reserve
  settings, safe-to-spend state, and activity history — resides in the
  on-device SQLite database

- SQLite is not a cache or a temporary store. It is the complete and
  authoritative data store for the duration of MVP operation

- All reads, writes, and financial calculations are performed against
  the local SQLite database without network involvement

- The data model is designed from the outset to support future
  synchronization with PostgreSQL, using stable entity identifiers,
  timestamped mutation records, and a local sync_queue outbox table.
  Every mutation to a sync-eligible financial entity writes a row to
  sync_queue during MVP operation. These rows are dormant until the
  premium sync engine is activated — they have no effect on any
  financial calculation or user-facing behavior during the MVP

- Local JSON backup and restore functionality provides data portability
  and protection against device loss, entirely without cloud
  infrastructure

# On-Device Business Logic

This section defines how financial business logic is owned and executed
across both the mobile client and the future Spring Boot backend. The
governing principle is shared business rule definitions with execution
at the appropriate layer: on-device for all mobile and offline
operation, and on the backend for future web clients, sync validation,
and multi-device consistency. The same financial rules must produce the
same results regardless of where they execute.

## MVP: On-Device Logic (React Native)

During the MVP phase, all financial business logic executes on-device.
The mobile application is the sole execution environment for all
financial calculations — there is no backend, no network dependency, and
no fallback. The mobile application is responsible for:

- Safe-to-spend calculation: aggregating confirmed balance, upcoming
  bills, reserve settings, and pending purchases

- Recurring bill scheduling and paycheck-cycle assignment

- Paycheck-cycle boundary calculations and future projection generation

- Variable recurring bill estimation using the most recently confirmed
  amount

- Recurring expense pattern detection from locally processed CSV and PDF
  imports

- Financial consistency validation on all data mutations

- Local activity history recording for all significant financial events

This design ensures that the application delivers complete, accurate
financial functionality without any dependency on future backend
infrastructure. All seven responsibilities listed above are implemented
in the mobile application and must remain fully functional offline
regardless of whether the backend has been introduced.

## Future Premium: Backend Logic (Spring Boot)

When the Spring Boot backend is introduced in future premium releases,
its responsibilities will be additive. It will not own or replace the
mobile on-device logic defined above. However, in contrast to a pure
validation-only backend, Spring Boot will also implement the same
financial business rule definitions as the mobile application — enabling
server-side calculation for use cases the mobile client cannot serve
alone.

This is not a migration of financial logic away from the device. It is a
parallel implementation of the same rules at a second execution layer.
The mobile application’s offline calculation authority is absolute and
unaffected. The following describes both the synchronization-scoped and
calculation-capable responsibilities the backend will carry:

- Multi-device synchronization conflict detection and resolution using
  last-write-wins on client_updated_at, with the backend applying shared
  financial rule definitions to verify structural consistency of
  incoming records

- Server-side recalculation of safe-to-spend, paycheck-cycle boundaries,
  and balance projections using the same business rule definitions as
  the mobile client — enabling the backend to detect and flag records
  whose synchronized state would produce internally inconsistent
  financial results across devices

- Premium account authentication and session management via JWT

- Cloud-backed notification delivery for premium account holders, using
  server-side cycle and balance calculations to generate timely,
  accurate reminders independent of device state

- Coordination of PostgreSQL persistence for synchronized state,
  maintaining a server-side financial record that future web clients can
  query and render using the same calculation rules

| **The introduction of backend financial calculation capability must not weaken, replace, or create any dependency on the on-device logic defined above. Mobile offline calculation authority is absolute — the device must produce correct financial results at all times with no backend involvement. Backend calculations serve web clients and consistency validation; they are a parallel implementation of shared business rules, not a replacement for mobile execution.** |
|----|

# Backend Module Structure (Future Premium)

The following module structure is defined now to guide future Spring
Boot backend development and to ensure the MVP codebase is organized in
a manner compatible with eventual backend introduction. No module listed
below is active during MVP operation.

The Spring Boot backend will follow a feature-based modular monolith
architecture — each business domain encapsulated in a dedicated module
within a single deployable application. This avoids the operational
complexity of microservices while maintaining clean domain separation
and independent testability.

- auth — JWT authentication controller, service, repository, DTO, and
  model. Inactive during MVP local-only usage.

- accounts — Premium cloud account management: account registration,
  email and password credentials, account preferences, and subscription
  status. Manages the cloud authentication identity (user_id) that is
  linked to the device’s local profiles record when premium sync is
  enabled.

- paychecks — Server-side paycheck schedule validation and multi-device
  cycle reconciliation.

- bills — Recurring bill synchronization, conflict detection, and
  server-side cycle assignment validation.

- purchases — Purchase synchronization and multi-device state
  reconciliation.

- safe_to_spend — Server-side safe-to-spend calculation and consistency
  engine. Implements the same safe-to-spend business rules as the mobile
  application: confirmed balance minus upcoming bill deductions minus
  essential reserve, applied to the synchronized PostgreSQL state. Used
  to render safe-to-spend for future web clients, validate that
  synchronized records produce internally consistent financial results
  across devices, and support server-side notifications. Mobile
  on-device calculation is unaffected — this module operates on
  server-held state and does not alter or override the mobile
  calculation in any way.

- imports — Server-side recurring expense detection support for future
  AI-assisted onboarding features.

- sync — Synchronization queue processing: receives sync_queue payloads
  from the mobile client via POST /v1/sync/push, manages timestamped
  change ordering, executes last-write-wins conflict resolution,
  coordinates PostgreSQL persistence, and returns per-record outcomes
  referenced by queue_entry_id.

- notifications — Premium notification scheduling, cross-device
  delivery, and suppression management.

- backup_restore — Cloud backup storage, versioning, and account-based
  restoration for premium users.

# MVP Operational Data Flow

The following describes the complete end-to-end data flow for any
financial action during MVP operation. No network connectivity is
involved at any step.

1.  User initiates a financial action in the React Native interface
    (e.g., adds a purchase, confirms a paycheck, updates a recurring
    bill)

2.  The mobile application validates the input locally and updates the
    in-memory application state

3.  The action is persisted to the on-device SQLite database. The
    entity’s sync_status field is set to ‘pending’, and a corresponding
    row is written to the local sync_queue outbox table with a
    timestamp, the entity_type, entity_id, operation type, and a JSON
    payload snapshot of the record

4.  On-device business logic recalculates all affected financial values:
    safe-to-spend, running balance, and cycle projections

5.  The updated values are reflected in the UI immediately

6.  A local activity history record is written for the action

Steps 1 through 6 constitute the complete MVP operational cycle. The
sync_status field and the sync_queue row written in Step 3 are inert
during MVP local-only operation — they have no effect on any financial
calculation, balance display, or user-facing behavior. They exist solely
as scaffolding for the future premium sync engine.

# Future Premium Synchronization Flow

The following synchronization flow applies only to users who have
enabled optional premium cloud synchronization in a future release. This
flow is additive and must not alter the MVP operational flow defined
above.

7.  The on-device sync engine reads pending rows from the local
    sync_queue outbox in ascending created_at order. These are records
    whose status is ‘pending’, written during normal MVP operation
    whenever a sync-eligible entity was created, updated, or
    soft-deleted

8.  Each sync_queue row is transmitted to the Spring Boot REST API via
    POST /v1/sync/push. The request includes the device’s device_id, the
    local profile_id, and the sync_queue entry’s queue_entry_id,
    entity_type, entity_id, operation, payload, and client_updated_at
    timestamp

9.  The Spring Boot API validates each incoming record for structural
    integrity and checks it against the server-side state for the
    authenticated account. Conflict detection uses last-write-wins based
    on client_updated_at: if the server holds a more recent version from
    another device, the response flags the record as conflicted. During
    sync processing, the API does not act as the operational authority
    for the user’s financial calculations. Future backend services may
    apply the same shared business rules for synchronized-state
    validation, web client rendering, premium notifications, and
    multi-device consistency, but these calculations do not replace or
    override mobile on-device calculation authority.

10. Validated and reconciled records are persisted to PostgreSQL, which
    mirrors the confirmed local state of the sync-eligible entities for
    the authenticated account. PostgreSQL is never treated as an
    upstream source of truth — it mirrors what the device has confirmed

11. The Spring Boot API returns a result per record, referencing each
    queue_entry_id, with status ‘synced’ or ‘conflict’ and a
    server_updated_at timestamp

12. The sync engine updates the corresponding sync_queue row’s status to
    ‘synced’ (or ‘failed’ on error) and updates the sync_status field on
    the source entity record in SQLite. The local device’s financial
    data and calculations are unaffected by this step — the sync
    operation is a background housekeeping action only

| **Synchronization enhances the local experience for premium users. It never replaces it. If connectivity is lost at any point during synchronization, the application continues operating normally from local SQLite state.** |
|----|

# Authentication Architecture

Authentication infrastructure is included in the system design from the
outset in order to avoid structural rework when premium features are
introduced. However, the authentication layer is deliberately inactive
during MVP local-only usage and must impose no requirement or constraint
on non-premium users.

Budget Flow uses two distinct identity layers that must never be
conflated in implementation. The local SQLite profiles table is the
financial data root — every paycheck, bill, purchase, and calculation is
owned by a profile record on the device. No external service is required
to create or use a local profile. The cloud account (managed by the
accounts module and identified by user_id in the API) is a premium
authentication identity that exists only when the user opts in to
synchronization. When premium sync is enabled, the device’s profiles.id
UUID is associated with the cloud account’s user_id, allowing the
backend to route synchronized records to the correct account. Outside of
that association, the two identities are independent and serve different
purposes.

The following architectural constraints govern authentication design:

- No account creation, login, or credential entry of any kind may be
  required to access any MVP feature

- Core local budgeting functionality must operate identically regardless
  of whether authentication infrastructure is present in the codebase

- The authentication layer is strictly additive — its presence must be
  undetectable to users who have not enabled premium features

- JWT-based session management will be introduced when premium
  synchronization is released, scoped exclusively to premium account
  workflows

# Offline Resilience and Synchronization Safety

The synchronization design must guarantee that no failure in the cloud
tier can compromise the integrity or availability of local financial
data. The following resilience requirements apply:

- The application must detect loss of connectivity gracefully and
  continue operating from local SQLite state without user notification
  or interruption in core functionality

- Synchronization failures — including partial sync, API errors, or
  network interruptions — must be logged locally and retried silently on
  next connectivity restoration

- No local financial record may be deleted, overwritten, or marked as
  invalid as a result of a synchronization failure or conflict

- Conflict resolution must always prefer preserving user-authored local
  changes over overwriting with server state, absent explicit user
  instruction to the contrary

- PostgreSQL state must be treated as a mirror of confirmed local state
  — not as an upstream source of truth

# Engineering Principles

The following principles govern all architectural and implementation
decisions for the Budget Flow platform across both the MVP phase and
future premium releases:

- Local-first, mobile-first — the mobile application is the primary
  system; everything else is supplementary

- SQLite as operational source of truth — during MVP, SQLite owns all
  data; PostgreSQL mirrors it in future premium tiers

- Offline-first by requirement, not by default — core features must
  function without connectivity; sync is a premium addition

- On-device financial calculation authority — safe-to-spend and all
  balance logic execute on-device during the MVP and must remain fully
  operational offline regardless of backend availability. The backend
  may implement the same calculation rules for web clients and
  server-side consistency validation, but mobile offline authority is
  never delegated, diminished, or made conditional on backend
  connectivity

- Additive cloud architecture — future backend introduction must enhance
  without replacing; local behavior must be invariant across premium and
  non-premium users

- Modular monolith backend — clean feature-domain separation within a
  single deployable Spring Boot application avoids premature
  microservices complexity

- Financial correctness over engineering elegance — accuracy and
  consistency are never compromised for architectural convenience

- Stable, maintainable codebase — module organization reflects product
  domains; code is written for long-term readability

- Sync-aware data model from day one — UUID primary keys, ISO 8601
  timestamps, sync_status fields, and the sync_queue outbox table are
  built into the MVP schema. These are dormant during local-only
  operation and require no schema migration when the premium sync engine
  is introduced

- User trust through predictability — system behavior must be
  consistent, transparent, and unaffected by infrastructure changes the
  user did not request
