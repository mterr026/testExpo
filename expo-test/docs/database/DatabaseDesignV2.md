**BUDGET FLOW**

**Database Design Document**

Version 2.0 — MVP Schema & Sync-Ready Data Architecture

Version 2.0 \| May 2025

# Document Overview

This Database Design Document defines the complete on-device data model
for the Budget Flow MVP. It specifies all entity schemas, field
definitions, data type rationale, relationship structure, indexing
strategy, and the synchronization scaffolding that supports a clean
future migration to optional PostgreSQL-backed cloud services.

All schema decisions are made in service of two non-negotiable product
requirements: the application must operate correctly and completely
without any network connectivity, and all financial calculations must
produce consistent, predictable results regardless of the order or
timing of user actions. Every structural choice in this document — from
UUID primary keys to integer-cent monetary storage to soft-delete fields
— exists to support one or both of those requirements.

This document should be read alongside the System Architecture Design,
Functional Requirements Specification, and API Specification. It is
structured to serve as a direct input to ERD generation — each entity
section contains a complete field inventory, constraint specification,
and relationship notation suitable for use with standard diagramming
tools such as Napkin AI, Eraser, or draw.io.

# Design Philosophy

|  |
|----|
| **SQLite is the authoritative operational database for the MVP. The schema is designed for local correctness first and synchronization compatibility second.** |

The following principles govern every schema decision in this document:

- Local-first operational ownership — every entity is fully usable from
  SQLite with no external service dependency. The schema is not a
  replica of a remote schema; it is the primary schema.

<!-- -->

- Offline completeness — all fields required for financial calculations,
  projections, and safe-to-spend derivations are stored on-device. No
  calculation requires a network fetch to complete.

- Financial integrity by constraint — NOT NULL rules, CHECK constraints,
  and enum validation are applied at the schema level rather than
  relying on application-layer validation alone. Invalid financial
  states must be structurally unrepresentable.

- Sync-readiness without over-engineering — UUID primary keys, ISO 8601
  timestamps, sync_status fields, and soft-delete support are built into
  the MVP schema. These fields are inert during local-only operation but
  eliminate the need for breaking schema migrations when the premium
  sync tier is introduced.

- Predictable financial arithmetic — all monetary values are stored as
  INTEGER cents. This eliminates floating-point rounding errors from
  financial calculations entirely. See Section 6 for full rationale.

- Append-only audit trail — the activity_log table is immutable by
  design. Financial events are recorded and never modified. This
  supports both user-facing history display and future debugging.

# Paycheck Terminology Reference

The paychecks table serves two distinct roles in the MVP schema. This
dual responsibility is a deliberate simplification that keeps the data
model lightweight for the MVP while still supporting the
paycheck-cycle-centred financial calculations the application requires.
Engineers reading this document should keep both roles in mind when
working with any entity that references paychecks.

The two terms used throughout this document are defined as follows:

- **Paycheck (income record)** — a record in the paychecks table
  representing expected or received income. The is_received flag
  determines whether the income amount contributes to the available
  balance and safe-to-spend calculation. Confirmed paychecks affect
  balance; projected paychecks do not.

<!-- -->

- **Paycheck cycle (cycle window)** — the budgeting window that begins
  on a paycheck record’s expected_date and ends immediately before the
  next paycheck record’s expected_date. Bills, purchases, and
  safe-to-spend calculations are all scoped to a cycle window. During
  the MVP, there is no separate cycle entity: the paycheck record itself
  serves as the cycle anchor, and its UUID is used as the
  paycheck_cycle_id foreign key on bill_cycle_instances and purchases.

Reading paycheck_cycle_id on any foreign key: interpret it as “the
paycheck record that anchors the cycle window this record belongs to” —
not as a direct reference to the income event itself, even though both
roles are held by the same record.

Future consideration: if cycle management requirements become more
complex — for example, if the application needs to support cycles that
are not directly tied to a single income event, or if multi-device
synchronisation introduces cycle boundary conflicts — a dedicated
paycheck_cycles table may be introduced. This would cleanly separate the
income record from the cycle window entity. No schema change is required
for the MVP, and this refactor can be performed without breaking any
existing foreign key relationships.

# Entity Groups

The Budget Flow schema is organized into four functional groups. This
grouping reflects the operational responsibility of each entity and is
intended to guide ERD layout — entities within the same group should be
clustered together in any generated diagram.

|  |  |  |
|----|----|----|
| **Group** | **Entities** | **Purpose** |
| Financial Core | profiles, paychecks, bills, bill_cycle_instances, purchases, balance_adjustments | Entities that directly participate in safe-to-spend calculations, balance derivations, and paycheck-cycle projections. |
| Operational Support | activity_log, notification_settings, backup_metadata, sync_queue | Entities that support application operation, user preference management, and data protection without directly contributing to financial calculations. |
| Import Processing | import_suggestions | Transient entities representing the intermediate state of CSV/PDF statement import workflows prior to user confirmation. |
| Sync Infrastructure | sync_status fields (all entities, active in MVP); device_id and cloud_id columns (deferred to premium sync release) | Cross-cutting synchronization scaffolding embedded within all financial and operational entities. The sync_queue table (see Operational Support group) serves as the dedicated outbox during MVP. device_id and cloud_id columns are deferred to the premium sync release. |

# Naming Conventions

The following naming conventions apply consistently across all tables
and columns in this schema:

- Table names use snake_case plural nouns — e.g. profiles, paychecks,
  bills, bill_cycle_instances.

- Column names use snake_case — e.g. created_at, sync_status,
  cycle_amount_cents.

- Primary keys are named id throughout. All id fields are TEXT UUIDs.

- Foreign keys follow the pattern {singular_table_name}\_id — e.g.
  profile_id, bill_id, paycheck_cycle_id.

- Boolean fields use INTEGER with values 0 (false) and 1 (true),
  consistent with SQLite's absence of a native boolean type.

- Timestamp fields use the \_at suffix for point-in-time events
  (created_at, deleted_at, paid_at) and the \_date suffix for calendar
  date fields (expected_date, due_date, purchase_date).

- The entity previously named 'users' is renamed profiles in this
  revision. In a local-first MVP with a single on-device profile, the
  term 'users' implies a multi-user or authentication context that does
  not exist. 'profiles' accurately reflects a local device profile
  without that implication.

- The foreign key previously named paycheck_id on bill_cycle_instances
  and purchases is renamed paycheck_cycle_id. This eliminates ambiguity
  between a reference to a specific paycheck income record and a
  reference to the paycheck record acting as the cycle anchor for a
  budgeting window. See Section 5.2 for a full explanation of the dual
  role a paycheck record plays during the MVP.

# Entity Schemas

Each entity is specified with its full field inventory, type,
constraints, and a description of the field's role in the application.
Relationship notation is provided at the end of each section.

## 5.1 profiles \[Financial Core\]

Stores the single on-device user profile and application-level financial
configuration. One record exists per device installation. This table is
the root of the entire relational graph — all other financial entities
reference it via profile_id.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. Generated on first application launch. Used as the stable device identifier for future sync registration. |
| display_name | TEXT | NULL | Optional user-provided display name. No authentication purpose — purely presentational. |
| essential_reserve | INTEGER | NOT NULL, DEFAULT 0, CHECK \>= 0 | Reserve buffer in cents. Deducted from safe-to-spend at all times. Must be zero or a positive integer. |
| currency_code | TEXT | NOT NULL, DEFAULT 'USD' | ISO 4217 currency code. USD only for the MVP. Field exists to avoid a schema migration when multi-currency support is introduced. |
| onboarding_complete | INTEGER | NOT NULL, DEFAULT 0 | Boolean (0/1). Set to 1 upon completion of the initial onboarding flow. Controls whether the app launches to onboarding or the dashboard. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. Set once on record creation. Never modified. |
| updated_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. Updated on every modification to this record. |
| deleted_at | TEXT | NULL | ISO 8601 UTC timestamp. NULL indicates an active record. Set when the profile is soft-deleted. Allows a soft-deleted profile record to propagate to the sync queue for cloud-tier account deletion when the premium sync service is active. |
| sync_status | TEXT | NOT NULL, DEFAULT 'local' | Enum: 'local' \| 'pending' \| 'synced'. Inert during MVP. Used by the future sync engine to track cloud persistence state. |

*Relationships: profiles is the root entity. All other tables reference
profiles via profile_id.*

## 5.2 paychecks \[Financial Core\]

Stores all paycheck entries, both confirmed and projected. Each record
serves two distinct roles in the MVP data model. As an income record, it
represents expected or received income — a confirmed paycheck event that
has been received and affects available balance, or a projected future
paycheck that is informational only. The is_received flag is the
authoritative gate controlling this role: no unconfirmed paycheck
contributes to available balance or safe-to-spend under any
circumstances.

As a cycle anchor, each paycheck record simultaneously defines a
budgeting window: the period beginning on this paycheck's expected_date
and ending immediately before the next paycheck's expected_date. This
window is referred to throughout this document as a paycheck cycle. Bill
cycle instances and purchases are assigned to a cycle via a
paycheck_cycle_id foreign key that references the paycheck record
anchoring that window. The paycheck record that anchors a cycle and the
income event it represents are the same record — there is no separate
cycle entity in the MVP schema. A future version may introduce a
dedicated paycheck_cycles table if cycle management requirements become
more complex, but this is not required for MVP delivery.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. |
| profile_id | TEXT | NOT NULL, FK → profiles.id | Owning profile. |
| label | TEXT | NULL | Optional descriptive label, e.g. 'Primary Employment', 'Freelance'. Supports multiple income source display. |
| amount_cents | INTEGER | NOT NULL, CHECK \> 0 | Expected or confirmed paycheck amount in cents. Must be a positive integer. |
| expected_date | TEXT | NOT NULL | ISO 8601 date string (YYYY-MM-DD). The date on which this paycheck is expected or was received. |
| is_received | INTEGER | NOT NULL, DEFAULT 0 | Boolean. 0 = projected only; does not affect balance. 1 = confirmed received; contributes to available balance and safe-to-spend. This flag is the sole gate between informational and operational financial state. |
| received_at | TEXT | NULL | ISO 8601 UTC timestamp. Set at the moment the user confirms receipt. NULL for unconfirmed paychecks. |
| is_recurring | INTEGER | NOT NULL, DEFAULT 0 | Boolean. 1 = this paycheck is part of a recurring schedule used to generate future projected paycheck records. |
| recurrence_interval | TEXT | NULL | Enum: 'weekly' \| 'biweekly' \| 'semimonthly' \| 'monthly' \| NULL. Required when is_recurring = 1. |
| notes | TEXT | NULL | Optional free-text notes. Not used in any financial calculation. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| updated_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| deleted_at | TEXT | NULL | ISO 8601 UTC soft-delete timestamp. Soft-deleted paychecks are excluded from all balance calculations and cycle projections. |
| sync_status | TEXT | NOT NULL, DEFAULT 'local' | Sync state enum. Inert during MVP. |

*Relationships: profiles 1:N paychecks. paychecks 1:N
bill_cycle_instances (via paycheck_cycle_id — the paycheck record acts
as the cycle anchor). paychecks 1:N purchases (via paycheck_cycle_id —
the paycheck record acts as the cycle anchor). Note: when reading
paycheck_cycle_id on any foreign key, interpret it as “the paycheck
record that defines the cycle window this record belongs to”, not as a
direct reference to the income event.*

## 5.3 bills \[Financial Core\]

Stores recurring bill definitions. A bill record defines the identity,
recurrence schedule, type, and default amount of a recurring financial
obligation. It does not track payment state — that responsibility
belongs to bill_cycle_instances. Separating the bill definition from its
per-cycle instances allows variable amounts, confirmations, and paid
status to be managed independently for each cycle without mutating the
source record.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. |
| profile_id | TEXT | NOT NULL, FK → profiles.id | Owning profile. |
| name | TEXT | NOT NULL | Human-readable bill name, e.g. 'Rent', 'Electric Bill', 'Internet'. |
| bill_type | TEXT | NOT NULL | Enum: 'fixed' \| 'variable'. Fixed bills use a static amount each cycle. Variable bills inherit default_amount_cents as an estimate until the user confirms the actual amount for each instance. |
| default_amount_cents | INTEGER | NOT NULL, CHECK \>= 0 | Default or most recently confirmed amount in cents. Used as the opening estimate for all newly generated variable bill instances. Updated when the user confirms a new amount. |
| recurrence_interval | TEXT | NOT NULL | Enum: 'weekly' \| 'biweekly' \| 'monthly' \| 'quarterly' \| 'custom'. |
| custom_interval_days | INTEGER | NULL, CHECK \> 0 | Number of days between instances. Required when recurrence_interval = 'custom'. NULL otherwise. |
| due_day_of_cycle | INTEGER | NULL | Day within the paycheck cycle window on which this bill is due. Used to compute the bill's due date relative to the cycle's start date (the paycheck's expected_date). NULL for calendar-anchored bills that use due_date_absolute instead. |
| due_date_absolute | TEXT | NULL | ISO 8601 date string. Used for bills with a fixed calendar due date that is not computed relative to a cycle window boundary. NULL for cycle-relative bills that use due_day_of_cycle instead. Exactly one of due_day_of_cycle or due_date_absolute should be non-null per bill record. |
| end_date | TEXT | NULL | ISO 8601 date string. The last date on which a new bill_cycle_instance should be generated. NULL indicates an indefinite obligation. |
| is_paused | INTEGER | NOT NULL, DEFAULT 0 | Boolean. When 1, no new bill_cycle_instances are generated and existing future instances are excluded from safe-to-spend calculations. Allows temporary suspension without deletion. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| updated_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| deleted_at | TEXT | NULL | ISO 8601 UTC soft-delete timestamp. Soft-deleted bills cease generating new instances. Existing paid instances are retained for history. |
| sync_status | TEXT | NOT NULL, DEFAULT 'local' | Sync state enum. Inert during MVP. |

*Relationships: profiles 1:N bills. bills 1:N bill_cycle_instances.*

## 5.4 bill_cycle_instances \[Financial Core\]

Represents a single occurrence of a recurring bill within a specific
paycheck cycle window. A paycheck cycle window is defined by a paycheck
record: it begins on the paycheck's expected_date and ends immediately
before the next paycheck's expected_date. This is the operational
payment-tracking entity — it holds the cycle-specific amount,
confirmation state, and paid status for one bill within one cycle
window. Safe-to-spend calculations query this table directly, summing
cycle_amount_cents for all unpaid instances whose paycheck_cycle_id
references the current cycle's anchor paycheck record.

Separating bill definitions (bills) from their per-cycle occurrences
(bill_cycle_instances) allows each cycle to track its own payment state,
confirmation status, and cycle-specific amount independently — without
mutating the parent bill record. This separation is what makes variable
bill confirmation, paid status, and per-cycle amount overrides possible
without affecting the underlying recurring definition.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. |
| bill_id | TEXT | NOT NULL, FK → bills.id | Reference to the parent bill definition. |
| paycheck_cycle_id | TEXT | NOT NULL, FK → paychecks.id | Reference to the paycheck record that anchors the cycle window this instance belongs to. This is the same paycheck record that represents the income event opening that cycle. During MVP, paycheck record = cycle anchor. Reading this field: “the cycle window opened by this paycheck.” |
| cycle_amount_cents | INTEGER | NOT NULL, CHECK \>= 0 | The amount in cents applicable to this specific cycle. Initialized from bills.default_amount_cents. Updated when the user confirms a variable amount. |
| is_variable_confirmed | INTEGER | NOT NULL, DEFAULT 0 | Boolean. For variable bills: 0 = estimated amount in use; 1 = user has confirmed the actual amount for this cycle. Fixed bill instances are always treated as confirmed. |
| is_paid | INTEGER | NOT NULL, DEFAULT 0 | Boolean. 1 = user has marked this instance as paid for the current cycle. Paid instances are removed from the unpaid-bills deduction in safe-to-spend calculations. |
| paid_at | TEXT | NULL | ISO 8601 UTC timestamp. Set when is_paid transitions to 1. |
| due_date | TEXT | NOT NULL | ISO 8601 date string. The computed due date for this specific instance, derived from the parent bill's recurrence rules and the cycle window boundary (the anchoring paycheck's expected_date). |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| updated_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| deleted_at | TEXT | NULL | ISO 8601 UTC soft-delete timestamp. Supports sync-safe removal of incorrectly generated instances. |
| sync_status | TEXT | NOT NULL, DEFAULT 'local' | Sync state enum. Inert during MVP. |

*Relationships: bills 1:N bill_cycle_instances. paychecks 1:N
bill_cycle_instances (via paycheck_cycle_id — each paycheck record,
acting as a cycle anchor, owns the bill instances generated for its
cycle window).*

### Instance Generation Strategy

Bill instances are generated by the on-device application layer — there
is no background scheduler, no backend dependency, and no event-driven
trigger required. Instance generation is a deterministic, synchronous
operation called at two well-defined points: when a new paycheck record
is created (which simultaneously opens a new cycle window), and when an
existing cycle window is refreshed (for example, when a new bill is
added or a bill’s recurrence settings are changed while a cycle is
active).

The following rules govern which bills generate instances and how those
instances are initialised:

- Eligibility — only bills that are active (is_paused = 0), not
  soft-deleted (deleted_at IS NULL), and within their active date range
  (end_date IS NULL OR end_date \> cycle start date) are eligible to
  generate instances for a given cycle.

- Due date containment — a bill generates an instance for a cycle window
  only if its calculated due date falls within that window’s date range:
  on or after the anchor paycheck’s expected_date (cycle start), and
  before the next paycheck’s expected_date (next cycle start). Bills
  whose due date falls outside the cycle window boundaries do not
  generate an instance for that cycle.

- Fixed bill initialisation — instances generated from fixed bills
  (bill_type = ‘fixed’) are created with cycle_amount_cents set to the
  parent bill’s default_amount_cents and is_variable_confirmed set to 1.
  Fixed bills require no user confirmation and are treated as confirmed
  from the moment of creation.

- Variable bill initialisation — instances generated from variable bills
  (bill_type = ‘variable’) are created with cycle_amount_cents set to
  the parent bill’s default_amount_cents as an opening estimate and
  is_variable_confirmed set to 0. The estimate reduces safe-to-spend
  immediately. It remains in effect until the user reviews and confirms
  the actual amount for that cycle, at which point cycle_amount_cents is
  updated, is_variable_confirmed is set to 1, and safe-to-spend
  recalculates.

- Paused, deleted, and ended bills — bills with is_paused = 1, a
  non-null deleted_at, or an end_date that has passed do not generate
  new instances. Existing paid instances from these bills in prior
  cycles are preserved and unaffected.

### Uniqueness Constraint and Idempotency

Instance generation must be idempotent. Calling the generation routine
multiple times for the same cycle — whether triggered by a bill update,
an app restart, or a cycle refresh — must produce no duplicate instances
and no error. This is enforced through a combination of a database-level
uniqueness constraint and an application-layer existence check.

A UNIQUE constraint is applied to the combination of (bill_id,
paycheck_cycle_id, due_date). This three-column key uniquely identifies
one bill occurrence within one cycle on one due date. Any attempt to
insert a duplicate row violates this constraint and is rejected at the
database level, providing a hard safety net independent of application
logic.

At the application layer, the generation routine performs an existence
check before each INSERT: if a non-deleted instance already exists for a
given (bill_id, paycheck_cycle_id, due_date) combination, that bill is
skipped and no INSERT is attempted. This keeps the routine safe to call
at any time without side effects, and avoids relying on constraint
violations as flow control.

Note: soft-deleted instances (deleted_at IS NOT NULL) are excluded from
the existence check. If a previously generated instance was
soft-deleted, a fresh instance may be re-generated for that same
(bill_id, paycheck_cycle_id, due_date) combination. The uniqueness
constraint only guards against duplicate active instances.

*Schema note: the UNIQUE constraint on (bill_id, paycheck_cycle_id,
due_date) should be defined as a named constraint in the CREATE TABLE
statement, e.g. CONSTRAINT uq_bill_cycle_instance UNIQUE (bill_id,
paycheck_cycle_id, due_date). A corresponding index —
idx_bill_instances_uniqueness on (bill_id, paycheck_cycle_id, due_date)
— is added to the indexing strategy in Section 11.*

## 5.5 purchases \[Financial Core\]

Stores all manually entered one-time transactions. Both Charged and
Pending purchases reduce safe-to-spend immediately upon insertion —
state does not gate financial impact. The state field exists to visually
distinguish settled transactions from unsettled holds, and to support
the pending-purchase reminder logic defined in the FRS.

Purchases are assigned to a paycheck cycle window via paycheck_cycle_id
at the time of entry. Assignment is determined by comparing the
purchase_date against the active cycle window boundaries: the anchor
paycheck's expected_date (inclusive) through the next paycheck's
expected_date (exclusive). The paycheck_cycle_id field stores a
reference to the paycheck record that anchors the window the purchase
falls within. This assignment determines which cycle window's projected
balance the purchase affects.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. |
| profile_id | TEXT | NOT NULL, FK → profiles.id | Owning profile. |
| amount_cents | INTEGER | NOT NULL, CHECK \> 0 | Purchase amount in cents. Must be a positive integer. Sign is implicitly negative — purchases always reduce balance. |
| state | TEXT | NOT NULL, DEFAULT 'charged' | Enum: 'charged' \| 'pending'. Both states reduce safe-to-spend immediately. 'pending' indicates an unsettled transaction that may still change (e.g. a restaurant tip hold or gas station authorization). |
| description | TEXT | NULL | Optional short user-provided description. No category field — consistent with the MVP's category-free budgeting model. |
| purchase_date | TEXT | NOT NULL | ISO 8601 date string. The date of the purchase as entered by the user. |
| paycheck_cycle_id | TEXT | NULL, FK → paychecks.id | Reference to the paycheck record that anchors the cycle window this purchase is assigned to. Assigned automatically based on purchase_date at entry time. NULL when no active cycle window contains the purchase_date (for example, before the first paycheck has been entered). Reading this field: “the cycle window opened by this paycheck.” |
| resolved_at | TEXT | NULL | ISO 8601 UTC timestamp. Set when a pending purchase is transitioned to charged or deleted, indicating the hold has settled. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| updated_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| deleted_at | TEXT | NULL | ISO 8601 UTC soft-delete timestamp. Soft-deleted purchases are excluded from all balance and safe-to-spend calculations but retained in the activity log. |
| sync_status | TEXT | NOT NULL, DEFAULT 'local' | Sync state enum. Inert during MVP. |

*Relationships: profiles 1:N purchases. paychecks 1:N purchases (via
paycheck_cycle_id — each paycheck record, acting as a cycle anchor, owns
the purchases assigned to its cycle window).*

## 5.6 balance_adjustments \[Financial Core\]

Records every manual balance override performed by the user. These
records are immutable once written — balance corrections are enacted by
creating new records, never by modifying existing ones. This append-only
design preserves a complete, auditable history of all balance
interventions and allows the application to reconstruct the adjustment
timeline at any point.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. |
| profile_id | TEXT | NOT NULL, FK → profiles.id | Owning profile. |
| previous_balance_cents | INTEGER | NOT NULL | The calculated balance in cents immediately prior to this adjustment. |
| adjusted_balance_cents | INTEGER | NOT NULL | The new balance in cents as set by the user. |
| delta_cents | INTEGER | NOT NULL | Computed difference: adjusted_balance_cents minus previous_balance_cents. May be negative. Stored for query efficiency. |
| reason | TEXT | NULL | Optional user-provided reason for the adjustment, e.g. 'Bank correction' or 'Forgot to log cash withdrawal'. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. Immutable once written. |
| deleted_at | TEXT | NULL | ISO 8601 UTC soft-delete timestamp. Allows a mistaken adjustment to be excluded from balance calculations without destroying the record. |
| sync_status | TEXT | NOT NULL, DEFAULT 'local' | Sync state enum. Inert during MVP. |

*Relationships: profiles 1:N balance_adjustments.*

## 5.7 activity_log \[Operational Support\]

A lightweight, append-only audit trail of significant financial and
operational events within the application. Records in this table are
never modified or deleted — it is a true event log. It serves two
purposes: providing the profile owner with a transparent history of all
meaningful state changes, and providing a diagnostic reference for
investigating financial discrepancies during development and testing.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. |
| profile_id | TEXT | NOT NULL, FK → profiles.id | Owning profile. |
| event_type | TEXT | NOT NULL | Enum of defined event types. Full set: 'purchase_added' \| 'purchase_updated' \| 'purchase_deleted' \| 'purchase_state_changed' \| 'paycheck_confirmed' \| 'paycheck_adjusted' \| 'paycheck_added' \| 'paycheck_deleted' \| 'bill_added' \| 'bill_updated' \| 'bill_paused' \| 'bill_resumed' \| 'bill_deleted' \| 'bill_paid' \| 'variable_bill_confirmed' \| 'balance_adjusted' \| 'reserve_updated' \| 'import_completed' \| 'backup_exported' \| 'backup_restored'. |
| entity_type | TEXT | NOT NULL | The entity category affected: 'purchase' \| 'paycheck' \| 'bill' \| 'bill_instance' \| 'balance' \| 'import' \| 'backup'. |
| entity_id | TEXT | NULL | UUID of the affected entity record, where applicable. NULL for aggregate or system-level events. |
| summary | TEXT | NULL | Human-readable event summary for display in the activity history view, e.g. 'Added purchase: \$24.50'. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp of the event. Immutable. Never updated. |

*Note: activity_log intentionally has no deleted_at or sync_status
fields. It is a local diagnostic and history record only. It is excluded
from future synchronization scope to keep the log device-local and free
of cross-device merge complexity.*

*Relationships: profiles 1:N activity_log.*

## 5.8 notification_settings \[Operational Support\]

Stores per-profile notification preferences. A single record exists per
profile, created with default values during onboarding. This table
separates notification configuration from the profiles table to keep
profile records lightweight and to allow notification preferences to
evolve independently.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. |
| profile_id | TEXT | NOT NULL, UNIQUE, FK → profiles.id | Owning profile. UNIQUE enforces the one-record-per-profile constraint at the database level. |
| notifications_enabled | INTEGER | NOT NULL, DEFAULT 1 | Boolean. Master toggle. When 0, all notification types are suppressed regardless of individual settings. |
| pending_purchase_reminder | INTEGER | NOT NULL, DEFAULT 1 | Boolean. When 1, a single soft reminder is issued for pending purchases that remain unresolved beyond the configured threshold. |
| pending_reminder_days | INTEGER | NOT NULL, DEFAULT 7, CHECK \> 0 | Number of days after which an unresolved pending purchase triggers a reminder. Default is 7 days. |
| low_balance_alert | INTEGER | NOT NULL, DEFAULT 1 | Boolean. When 1, an elevated (but calm) notification is issued when a projected negative balance is detected. |
| upcoming_bill_reminder | INTEGER | NOT NULL, DEFAULT 1 | Boolean. When 1, a reminder is issued for bills due within the configured advance notice window. |
| bill_reminder_days_before | INTEGER | NOT NULL, DEFAULT 2, CHECK \> 0 | Number of days before a bill due date at which an upcoming bill reminder is issued. Default is 2 days. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| updated_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| sync_status | TEXT | NOT NULL, DEFAULT 'local' | Sync state enum. Preferences will sync to cloud for multi-device consistency in the premium tier. |

*Relationships: profiles 1:1 notification_settings.*

## 5.9 import_suggestions \[Import Processing\]

Stores transient recurring expense suggestions generated by the CSV/PDF
import pipeline, pending user review and confirmation. Records in this
table are temporary — they represent the intermediate state of an import
workflow and are not financial data. Every record must be resolved
through user action (confirmed, edited, or rejected) before the import
workflow is considered complete.

Upon user confirmation, a confirmed suggestion is used to create a
corresponding bill record and the suggestion record is marked resolved.
Upon rejection, the record is soft-deleted with no downstream effect.
Raw imported file content is never stored in this table or anywhere in
the database — the parser extracts only the minimum fields necessary for
recurring expense detection.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. |
| profile_id | TEXT | NOT NULL, FK → profiles.id | Owning profile. |
| suggested_name | TEXT | NOT NULL | Merchant or payee name extracted from the import, used as the suggested bill name. |
| suggested_amount_cents | INTEGER | NOT NULL, CHECK \> 0 | Suggested recurring amount in cents, derived from the most recent detected occurrence. |
| detected_interval | TEXT | NOT NULL | Detected recurrence pattern: 'weekly' \| 'biweekly' \| 'monthly' \| 'quarterly' \| 'irregular'. 'irregular' indicates a recurring pattern was detected but the interval is inconsistent. |
| occurrence_count | INTEGER | NOT NULL, CHECK \> 0 | Number of occurrences detected in the imported statement. Higher counts indicate higher confidence in the suggestion. |
| import_session_id | TEXT | NOT NULL | UUID identifying the import session that generated this suggestion. Groups all suggestions from a single import for batch review display. |
| status | TEXT | NOT NULL, DEFAULT 'pending' | Enum: 'pending' \| 'confirmed' \| 'rejected'. 'pending' = awaiting user review. 'confirmed' = user approved and a bill record was created. 'rejected' = user dismissed. |
| confirmed_bill_id | TEXT | NULL, FK → bills.id | Reference to the bill record created upon confirmation. NULL until confirmed. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. |
| resolved_at | TEXT | NULL | ISO 8601 UTC timestamp. Set when status transitions from 'pending' to 'confirmed' or 'rejected'. |
| deleted_at | TEXT | NULL | ISO 8601 UTC soft-delete timestamp. Used for rejected suggestions to support sync-safe cleanup. |

*Note: import_suggestions has no sync_status field. Import workflow data
is strictly local and transient — it is not a candidate for cloud
synchronization.*

*Relationships: profiles 1:N import_suggestions. import_suggestions N:1
bills (via confirmed_bill_id, nullable).*

## 5.10 backup_metadata \[Operational Support\]

Records local backup export and restore events. Provides a lightweight
audit trail of backup activity and allows the application to report the
last backup timestamp to the user. Does not store backup file content.

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. |
| profile_id | TEXT | NOT NULL, FK → profiles.id | Owning profile. |
| event_type | TEXT | NOT NULL | Enum: 'export' \| 'restore'. |
| file_name | TEXT | NULL | File name of the backup file at time of export or restore. |
| record_count | INTEGER | NULL | Total number of financial entity records included in the backup snapshot at time of export. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp of the event. |

*Relationships: profiles 1:N backup_metadata.*

# Monetary Value Storage

|  |
|----|
| **All monetary values are stored as INTEGER cents. This is a deliberate engineering decision, not a simplification.** |

SQLite does not enforce column type constraints — it uses dynamic type
affinity rather than strict column types. In practice, this means that a
column declared as NUMERIC or DECIMAL provides no actual precision
guarantee at the storage layer. A value inserted as 42.10 may be stored
and retrieved as 42.09999999999999787 due to IEEE 754 floating-point
representation.

For a financial application where safe-to-spend calculations involve
summing multiple bills, purchases, and reserve amounts, floating-point
drift accumulates with each operation. The result is financial
calculations that produce results like \$127.99 instead of \$128.00 —
inconsistencies that are invisible to the database but produce incorrect
displays and erode user trust.

Storing all monetary values as INTEGER cents eliminates this class of
error entirely. Integer arithmetic is exact in all languages and
environments. \$42.10 is stored as 4210. Summing 4210 + 1500 + 700
always produces 6410, which displays as \$64.10. There is no rounding,
no drift, and no edge case.

All amount fields in this schema follow the \_cents naming suffix to
make the storage convention explicit and to prevent future developers
from accidentally inserting dollar-denominated values. Display
formatting — converting 4210 to '\$42.10' — is handled exclusively at
the presentation layer.

# Timestamp and Date Conventions

Two distinct temporal field patterns are used throughout this schema:

- Timestamp fields (\_at suffix) — store full ISO 8601 UTC datetime
  strings in the format YYYY-MM-DDTHH:MM:SSZ. Used for audit fields
  (created_at, updated_at, deleted_at) and event timestamps (paid_at,
  received_at, resolved_at). Stored as TEXT in SQLite, sortable as
  strings due to the ISO 8601 format's lexicographic ordering
  properties.

- Date fields (\_date suffix) — store calendar dates only, in the format
  YYYY-MM-DD. Used for user-visible financial dates: expected_date,
  due_date, purchase_date. Date-only fields avoid time zone complexity
  for dates that represent a day in the user's local context rather than
  a precise moment in time.

All timestamps are stored in UTC. Time zone conversion for display
purposes is handled at the presentation layer using the device's local
time zone setting.

# Soft Delete Strategy

All primary financial entities in the current schema — profiles,
paychecks, bills, bill_cycle_instances, purchases, balance_adjustments,
and import_suggestions — include a deleted_at field for soft-delete
support. This is a present MVP design decision, enforced from the
initial schema, not a deferred enhancement. The rationale is as follows:

- Sync safety — hard deletes in a sync-ready schema create tombstone
  management problems. When a record is deleted on one device and the
  delete needs to propagate to another, the backend has no record to
  match against. Soft deletes allow the sync engine to transmit deletion
  events using the existing record's UUID, without requiring a separate
  tombstone table.

- Financial auditability — deleting a purchase or bill that was used in
  a previous safe-to-spend calculation removes context that may be
  needed to explain a historical balance state. Soft-deleted records are
  excluded from calculations but remain available for audit and
  diagnostic purposes.

- User error recovery — a soft-deleted record can be undeleted without
  data loss. This is particularly valuable for bill records, where a
  user might accidentally delete a recurring bill and expect to recover
  it.

Application-layer query convention: all queries against financial
entities must include a WHERE deleted_at IS NULL clause by default.
Queries that intentionally include soft-deleted records (e.g. history
display, backup export) must explicitly opt in by omitting this filter.

The activity_log and backup_metadata tables do not implement soft
deletes. They are append-only records and are never removed through
application logic.

# UUID Primary Key Strategy

All primary keys in this schema are TEXT fields storing UUID v4 values.
This decision is made specifically to support future synchronization,
not because SQLite requires it.

SQLite's default INTEGER ROWID primary key is efficient for local
operation but creates a fundamental problem for synchronization: two
devices independently creating records will generate the same integer
IDs, making it impossible to distinguish records by origin when syncing.
UUID v4 keys are statistically unique across all devices without
requiring coordination, which means records created offline on any
device can be safely merged into PostgreSQL without ID collision.

The performance overhead of TEXT UUID primary keys in SQLite is
negligible for the data volumes expected in a personal budgeting
application. The synchronization correctness benefit is concrete and
significant. UUID v4 values are generated in the application layer at
the time of record creation and stored as uppercase hyphenated strings
(e.g. 550E8400-E29B-41D4-A716-446655440000) for cross-platform
consistency.

# Entity Relationships

The following table provides a complete relationship inventory for ERD
generation. All foreign key constraints are enforced at the application
layer. SQLite foreign key enforcement must be explicitly activated per
connection via PRAGMA foreign_keys = ON — this is a required
initialization step for every database connection in the application.

|  |  |  |
|----|----|----|
| **Relationship** | **Cardinality** | **Notes** |
| profiles → paychecks | 1:N | A profile owns all paycheck records. Deletion of a profile soft-deletes all associated paychecks. |
| profiles → bills | 1:N | A profile owns all bill definitions. |
| profiles → purchases | 1:N | A profile owns all purchase records. |
| profiles → balance_adjustments | 1:N | A profile owns all manual balance correction records. |
| profiles → activity_log | 1:N | A profile owns all activity log entries. |
| profiles → notification_settings | 1:1 | Exactly one notification_settings record per profile. UNIQUE constraint on profile_id enforces this. |
| profiles → import_suggestions | 1:N | A profile owns all import suggestion records. |
| profiles → backup_metadata | 1:N | A profile owns all backup event records. |
| profiles → sync_queue | 1:N | A profile owns all sync queue entries. sync_queue accumulates local mutations during MVP operation; these rows are processed by the premium sync engine when it is activated. |
| bills → bill_cycle_instances | 1:N | Each active bill definition generates one instance per active paycheck cycle window. |
| paychecks → bill_cycle_instances | 1:N | Each paycheck record acts as a cycle anchor, defining the cycle window that owns the bill instances assigned to it (via paycheck_cycle_id). The paycheck record is simultaneously the income event and the cycle anchor in the MVP schema. |
| paychecks → purchases | 1:N | Purchases are assigned to the paycheck cycle window active at the time of entry (via paycheck_cycle_id, referencing the paycheck record anchoring that window). |
| import_suggestions → bills | N:1 | A confirmed import suggestion creates one bill. The resulting bill_id is stored on the suggestion record for traceability. |

# Indexing Strategy

The following indexes are defined to optimize the application's primary
query patterns. Safe-to-spend calculation is the most
performance-sensitive query path — it aggregates confirmed balance,
upcoming bills, pending purchases, and reserve settings in a single
logical operation. All indexes below are designed to support this path
and the secondary patterns of cycle rendering and history display.

|  |  |  |  |
|----|----|----|----|
| **Index Name** | **Table** | **Columns** | **Purpose** |
| idx_paychecks_profile_date | paychecks | profile_id, expected_date, deleted_at | Supports cycle window boundary lookups (finding which paycheck anchor defines the current active window) and upcoming income event queries. deleted_at included to filter soft-deleted records efficiently. |
| idx_paychecks_received | paychecks | profile_id, is_received, deleted_at | Supports confirmed-paycheck balance calculations. |
| idx_bills_profile_active | bills | profile_id, is_paused, deleted_at | Supports active bill enumeration for cycle instance generation and projection queries. |
| idx_bill_instances_cycle | bill_cycle_instances | paycheck_cycle_id, is_paid, deleted_at | Primary safe-to-spend query index. Retrieves all unpaid instances for a given cycle. |
| idx_bill_instances_unconfirmed | bill_cycle_instances | bill_id, is_variable_confirmed, deleted_at | Identifies variable bill instances requiring user confirmation. |
| idx_bill_instances_uniqueness | bill_cycle_instances | bill_id, paycheck_cycle_id, due_date | Enforces instance uniqueness. Supports the application-layer existence check performed before each INSERT during instance generation. Prevents duplicate active instances for the same bill, cycle, and due date combination. |
| idx_purchases_profile_date | purchases | profile_id, purchase_date, deleted_at | Supports purchase history chronological display. |
| idx_purchases_pending | purchases | profile_id, state, deleted_at | Supports pending purchase identification for safe-to-spend deduction and reminder logic. |
| idx_purchases_cycle | purchases | paycheck_cycle_id, deleted_at | Supports per-cycle purchase aggregation for projected balance calculations. |
| idx_import_suggestions_session | import_suggestions | import_session_id, status | Supports batch review display — retrieves all suggestions from a single import session grouped by status. |
| idx_activity_log_profile | activity_log | profile_id, created_at | Supports chronological activity history display. |
| idx_notification_settings_profile | notification_settings | profile_id | Supports the 1:1 profile lookup for loading notification preferences on application start and settings screen display. The UNIQUE constraint on profile_id in the table definition already provides implicit index coverage; this named index makes the lookup explicit and queryable. |

# Safe-to-Spend Calculation Query Model

Safe-to-spend is the application's primary computed value. It is not
persisted as a column — it is derived on demand from the current state
of the database. The following describes the logical query model that
the on-device calculation engine executes:

1.  Confirmed balance = SUM of amount_cents from paychecks WHERE
    is_received = 1 AND deleted_at IS NULL, MINUS SUM of amount_cents
    from purchases WHERE deleted_at IS NULL, MINUS SUM of delta_cents
    from balance_adjustments WHERE deleted_at IS NULL and delta is
    negative, PLUS SUM of delta_cents from balance_adjustments where
    delta is positive.

<!-- -->

1.  Upcoming bill deductions = SUM of cycle_amount_cents from
    bill_cycle_instances WHERE paycheck_cycle_id = \[UUID of the
    paycheck record anchoring the current cycle window\] AND is_paid = 0
    AND deleted_at IS NULL. Both estimated (is_variable_confirmed = 0)
    and confirmed instances are included, ensuring variable bills reduce
    safe-to-spend from the moment their cycle window opens.

2.  Pending purchase deductions = SUM of amount_cents from purchases
    WHERE state = 'pending' AND deleted_at IS NULL. Note: pending
    purchases are also included in the confirmed balance calculation
    above — this step is only relevant when safe-to-spend is calculated
    against a projected future balance.

3.  Essential reserve deduction = profiles.essential_reserve from the
    active profile record.

4.  Safe-to-spend = Confirmed balance MINUS Upcoming bill deductions
    MINUS Essential reserve deduction.

The result may be negative. A negative safe-to-spend value is a valid
and meaningful output indicating that confirmed obligations exceed
available balance. The application must display this state clearly and
without judgment — it is information, not an error condition.

# Synchronization Readiness

The MVP schema is designed to be adopted by a PostgreSQL-backed
synchronization service in a future premium release with the minimum
possible migration surface. The following design decisions in this
schema specifically serve that goal:

- UUID primary keys — all records carry globally unique identifiers that
  do not require coordination between devices or between SQLite and
  PostgreSQL. No ID remapping is required during synchronization.

- ISO 8601 UTC timestamps — all temporal fields are stored in a format
  that is unambiguous across time zones and directly compatible with
  PostgreSQL TIMESTAMPTZ semantics.

- sync_status field on all financial entities — the sync engine reads
  this field to identify records requiring transmission. No additional
  schema change is needed to begin synchronization.

- Soft deletes on all financial entities — deletions propagate as status
  changes rather than as gaps in the record set. The sync engine can
  transmit a soft-delete event using the record's UUID without requiring
  a separate tombstone table.

- Stable field naming — all field names in this schema are chosen to be
  compatible with PostgreSQL column naming conventions. No renaming will
  be required when the schema is mirrored to the cloud tier.

Two fields are deferred to the premium sync release and are
intentionally absent from the MVP schema:

- device_id — a stable identifier for the originating device, added to
  all financial entities when the sync engine is introduced. Required
  for multi-device conflict detection.

- cloud_id — the PostgreSQL primary key corresponding to a local record.
  Added when synchronization is activated to support bidirectional
  record matching. In the MVP, the local UUID serves as the only
  identifier.

# ERD Generation Notes

This section provides structural guidance for generating an Entity
Relationship Diagram from this specification. The following layout
recommendations will produce a readable diagram:

- Place profiles at the center or top of the diagram. It is the root
  entity — all other tables connect to it directly via profile_id.

- Group the Financial Core entities (paychecks, bills,
  bill_cycle_instances, purchases, balance_adjustments) in a cluster
  below or around profiles. This cluster contains the highest
  relationship density and should be visually prominent.

- bill_cycle_instances sits at the intersection of bills and paychecks —
  position it between those two tables. Annotate the paycheck_cycle_id
  relationship line with a note clarifying that paychecks acts as both
  the income entity and the cycle anchor in the MVP schema. This dual
  role is intentional and should be visible in the diagram rather than
  hidden.

- Group Operational Support entities (activity_log,
  notification_settings, backup_metadata, sync_queue) in a separate
  cluster, connected to profiles but visually separated from the
  financial core. sync_queue has no diagram relationships to financial
  entities — its entity_type and entity_id fields are logical references
  only.

- Place import_suggestions as a standalone cluster connected only to
  profiles and bills (via confirmed_bill_id). Its transient nature and
  limited relationships make it a peripheral entity in the diagram.

- All relationships from profiles outward are 1:N except
  notification_settings, which is 1:1. Use standard crow's foot notation
  throughout.

- Recommended tools: Napkin AI (paste section content for
  auto-generation), Eraser (engineering-focused, supports direct schema
  input), draw.io (manual but precise for final documentation diagrams).

# sync_queue Table

## Purpose and Operational Context

The sync_queue table is an Operational Support entity that tracks local
data mutations destined for future transmission to the Spring Boot
backend. It is included in the MVP SQLite schema now — not deferred — so
that the premium synchronization tier can be introduced without any
structural change to the on-device database.

During local-only MVP operation, this table is effectively dormant. A
row is written to sync_queue every time a financial entity is created,
updated, or soft-deleted — but nothing reads from it, nothing processes
it, and it has no effect on any financial calculation or user-facing
behavior. It accumulates a chronological record of every local mutation,
waiting silently until the sync engine is activated in a future premium
release.

When the premium sync tier is introduced, the sync engine reads pending
rows from this table, transmits them to the Spring Boot API in
chronological order, and updates each row’s status to reflect the
outcome. No other table in the schema needs to change. The sync_queue is
the only addition the sync engine requires from the data layer.

This design intentionally avoids event sourcing, CQRS, message brokers,
or any other complex synchronization pattern. The sync_queue is a simple
outbox table: write a row when something changes locally, read and
transmit it later when connectivity and a premium account are available.
It is the minimum viable foundation for reliable eventual consistency
between SQLite and PostgreSQL.

Entity group: Operational Support. No financial calculations read from
this table under any circumstances.

## Schema

|  |  |  |  |
|----|----|----|----|
| **Field** | **Type** | **Constraints** | **Description** |
| id | TEXT | PRIMARY KEY | UUID v4. Unique identifier for this queue entry. |
| profile_id | TEXT | NOT NULL, FK → profiles.id | Owning profile. Scopes sync entries to the local device profile. |
| entity_type | TEXT | NOT NULL | The table the affected record belongs to. Enum: ‘profile’ \| ‘paycheck’ \| ‘bill’ \| ‘bill_cycle_instance’ \| ‘purchase’ \| ‘balance_adjustment’ \| ‘notification_settings’. The sync engine uses this field to determine which backend API endpoint to call. |
| entity_id | TEXT | NOT NULL | UUID of the affected record in its source table. Combined with entity_type, uniquely identifies the record requiring synchronization. |
| operation | TEXT | NOT NULL | Enum: ‘create’ \| ‘update’ \| ‘delete’. Indicates the type of mutation. ‘delete’ entries correspond to soft-delete events — the deleted_at field having been set on the source record — and carry a minimal payload containing only the entity_id and deleted_at timestamp. |
| payload_json | TEXT | NOT NULL | A JSON snapshot of the entity record at the time the mutation occurred. For ‘create’ and ‘update’ operations, this is the full serialized entity. For ‘delete’ operations, this contains only the entity_id and deleted_at. The payload is what the sync engine sends to the Spring Boot API. |
| status | TEXT | NOT NULL, DEFAULT ‘pending’ | Enum: ‘pending’ \| ‘syncing’ \| ‘synced’ \| ‘failed’. ‘pending’ = written locally, awaiting transmission. ‘syncing’ = currently being transmitted (guards against duplicate dispatch). ‘synced’ = confirmed persisted to PostgreSQL. ‘failed’ = transmission failed after the maximum attempt count; requires manual inspection or retry. All rows default to ‘pending’ on creation and remain there indefinitely during MVP local-only use. |
| attempt_count | INTEGER | NOT NULL, DEFAULT 0 | Number of transmission attempts made by the sync engine. Incremented on each attempt. The sync engine transitions status to ‘failed’ after a configurable maximum (recommended: 5). Zero during MVP local-only operation. |
| last_attempt_at | TEXT | NULL | ISO 8601 UTC timestamp of the most recent transmission attempt. NULL when no attempt has been made. Used by the sync engine to implement exponential backoff between retries. |
| error_message | TEXT | NULL | The error response or exception message from the most recent failed transmission attempt. NULL when no error has occurred. Populated on failure for diagnostic purposes; not displayed to the user. |
| created_at | TEXT | NOT NULL | ISO 8601 UTC timestamp. Set at the moment the mutation is written to the queue. Used to order entries chronologically for transmission — the sync engine processes entries in ascending created_at order to ensure the backend receives changes in the correct sequence. |

## Status Lifecycle

Every sync_queue row begins in ‘pending’ status when written. During MVP
local-only operation it remains in ‘pending’ indefinitely — it is never
read, never processed, and has no operational effect. When the premium
sync engine is activated, the following lifecycle applies:

- pending → syncing: the sync engine selects the next pending row, sets
  status to ‘syncing’ to prevent concurrent dispatch, and begins
  transmission to the Spring Boot API.

- syncing → synced: the API confirms successful persistence to
  PostgreSQL. The row is marked ‘synced’ and is no longer processed.

- syncing → pending (retry): the transmission fails. The row is returned
  to ‘pending’, attempt_count is incremented, last_attempt_at and
  error_message are updated, and the sync engine applies exponential
  backoff before the next attempt.

- pending → failed: attempt_count reaches the configured maximum. The
  row is marked ‘failed’ and excluded from automatic retry. Failed rows
  are surfaced to the engineering diagnostic layer only — they are never
  displayed to the user.

## Indexing

Two indexes support the sync engine’s primary query patterns when it
becomes active in the premium release:

- idx_sync_queue_pending: (profile_id, status, created_at) — supports
  the primary sync engine query: SELECT pending rows for a profile in
  chronological order.

- idx_sync_queue_entity: (entity_type, entity_id) — supports
  deduplication checks: before writing a new queue entry for a given
  entity, the application can verify whether a pending entry for that
  entity already exists and coalesce them into a single update entry
  rather than accumulating redundant records.

## Relationship and ERD Notes

- profiles 1:N sync_queue — a profile owns all of its queue entries.

- sync_queue has no direct foreign keys to financial entities. The
  entity_type and entity_id fields are a logical reference, not a
  referential constraint. This is intentional: enforcing a foreign key
  from sync_queue to every financial table would complicate soft-delete
  handling and add no operational value during the MVP phase.

- For ERD layout: position sync_queue in the Operational Support cluster
  alongside activity_log and notification_settings, connected only to
  profiles. Do not draw relationship lines from sync_queue to financial
  entities — the logical reference is represented in the entity_type and
  entity_id column descriptions, not as a diagram relationship.
