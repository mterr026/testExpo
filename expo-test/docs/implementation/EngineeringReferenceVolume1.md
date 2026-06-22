**BUDGET FLOW**

**Engineering Companion Guide**

Volume 1 of 2

*Volume 1 of 2: Architecture, Database, Application Design & Security*

Version 1.0 — May 2025 — Reference

# Section 1 — Foundational Architecture

Before writing a single line of application code, you need to understand
the philosophy that governs how Budget Flow is structured. Architecture
isn't just a diagram — it's a set of decisions that determine what's
easy to build, what's easy to change, and what's painful to undo. This
section explains the foundational decisions and why they were made.

## 1.1 Local-First Architecture

### Concept Overview

Local-first means the device is in charge. The authoritative copy of the
user's financial data lives in SQLite on their phone — not on a server
somewhere. The application works completely, correctly, and permanently
without any network connection. If a server exists at all, it plays a
supporting role: sync, backup, multi-device access. It is never the
primary source of truth.

This is the opposite of how most modern web apps work. Most apps built
in the last decade are thin clients: they send requests to a server,
receive data, and render it. If the server goes down, the app stops
working. If the network is slow, the app feels slow. If the company
shuts down, your data is gone.

### Why Budget Flow Uses It

- Privacy. Your bank balance and bill history are sensitive. Local-first
  means Budget Flow genuinely cannot read your financial data — there's
  no server holding it.

- Reliability. The app works on a plane, in a tunnel, in a dead zone.
  Financial stress doesn't pause for bad Wi-Fi.

- Speed. SQLite reads on a modern phone happen in microseconds. No
  round-trip to a server, no waiting for a response.

- User trust. 'Your data stays on your device' is a statement you can
  actually prove, not just claim.

### How It Fits Into the Architecture

Every layer of Budget Flow is designed around this principle. The
database layer is SQLite. The financial engine reads from and writes to
SQLite. Services call repositories that query SQLite. The UI reads from
services. At no point in the MVP does any of this touch a network. The
sync infrastructure is scaffolded in (sync_queue, sync_status fields,
UUIDs) but entirely dormant — it accumulates data silently without
affecting any calculation or display.

| Local-first is not a feature. It is the architectural foundation. Every other decision in this document flows from it. |
|----|

### How It Affects Future Development

When Phase 3 adds the Spring Boot backend, it is strictly additive —
sync, backup, multi-device access. Financial calculations stay
on-device. PostgreSQL mirrors confirmed local state; it is never the
authority. Section 5 covers the sync mechanics in detail.

### Important Notes and Tradeoffs

| The one genuine tradeoff of local-first: if a user loses their phone without a backup, they lose their data. This is why local JSON backup is an MVP feature, not an afterthought. Cloud backup in Phase 3 solves this for premium users. |
|----|

## 1.2 Offline-First Design

### Concept Overview

Offline-first means connectivity is an enhancement, never a requirement.
The app does not degrade gracefully when offline — it functions
identically whether or not a network is present. This is a stronger
commitment than 'works offline sometimes.'

### Simple Technical Explanation

An offline-first app stores everything it needs locally. It never makes
a network call as part of the core operational path. If there's a
network and a backend, it may synchronise in the background — but that
sync is always asynchronous and never blocks the user from doing what
they came to do.

Budget Flow's MVP has no network calls in any user-facing operation
path. Adding a purchase writes to SQLite. Calculating safe-to-spend
reads from SQLite. Marking a paycheck received updates SQLite. None of
these touch a network.

### Real Workflow Example

User adds a purchase at a petrol station with no signal:

1.  User taps 'Add Purchase', types £45.00.

2.  PurchaseService.createPurchase() writes to SQLite (purchases table +
    sync_queue row).

3.  Safe-to-spend recalculates from SQLite immediately.

4.  Dashboard updates. The user sees their new balance.

5.  The sync_queue row sits with status='pending'. Nothing reads it yet.

6.  Later when signal returns and Phase 3 is active, the sync engine
    transmits it. The user never noticed the gap.

### How It Affects Future Development

When adding any new feature, ask yourself: 'Does this work with airplane
mode on?' If the answer is no, the feature is not designed correctly for
this architecture. Every service call must be able to complete using
only local SQLite data.

## 1.3 SQLite as the Authoritative Source of Truth

### Concept Overview

In a distributed system, a 'source of truth' is the system whose version
of the data is considered correct when versions conflict. For Budget
Flow's MVP, that system is SQLite on the device. Always.

### Why This Matters

Consider what would happen if you treated the server as authoritative.
Every time the app opened, it would need to fetch the current state from
the server. If the server is unavailable, the app can't show accurate
data. If the server has a bug, it can corrupt your local state. The
user's financial picture becomes contingent on infrastructure they don't
control.

With SQLite as authoritative, none of that applies. The app opens and
immediately has all the data it needs. No fetch required. No server
dependency. The user's data is exactly what they put in it.

### How This Changes in Phase 3

In Phase 3, PostgreSQL mirrors confirmed local state — it is never the
upstream authority. Pull results are applied to local SQLite and become
authoritative there. Section 5 covers the full sync lifecycle, including
how conflicts are resolved.

## 1.4 Why the Backend is Initially Optional

### Concept Overview

Most application backends exist because the application cannot function
without them. Budget Flow's backend exists to enable premium features.
This is a deliberate inversion of the normal relationship between app
and server.

### The Engineering Reasoning

Building a backend takes time, money, and ongoing operational effort. It
introduces infrastructure costs, deployment complexity, security
responsibilities, and uptime requirements. For a two-person indie
project building an MVP, deferring all of that until the core product is
proven is not laziness — it is sound engineering judgement.

The architecture was designed so that the Spring Boot backend can be
introduced in Phase 3 without rewriting anything in the mobile app. The
sync_queue table is already there. The UUIDs are already there. The
sync_status fields are already there. The backend slots in cleanly
because the schema was designed for it from the start.

### Interview-Level Explanation

"We deferred backend infrastructure to keep the MVP lean and the scope
realistic. The schema was designed for sync from day one — UUID keys,
sync_status fields, sync_queue outbox. When Phase 3 arrives, those
mechanisms activate without any changes to the mobile codebase. The
backend plugs into scaffolding that was always there."

## 1.5 Modular Monolith Architecture

### Concept Overview

A monolith is a single deployable unit of software. A monolith with good
internal structure — clean module boundaries, no tangled dependencies,
clear separation between domains — is called a modular monolith. Budget
Flow's React Native app and its eventual Spring Boot backend are both
modular monoliths.

### Why Not Microservices?

Microservices split an application into many separately deployable
services. This provides certain benefits at scale — independent
deployment, independent scaling, team autonomy — but introduces
significant operational complexity: service discovery, inter-service
networking, distributed tracing, coordinated deployments, and
dramatically more infrastructure to maintain.

For two developers building a personal finance app, microservices are
not a solution — they're a liability. The complexity overhead would
consume a disproportionate share of development time with no
corresponding benefit.

| A well-structured monolith can be refactored into services later if it becomes necessary. The reverse — untangling a poorly designed distributed system — is one of the hardest problems in software engineering. |
|----|

### How This Looks in Budget Flow

The mobile app is organised by feature domain: /src/features/purchases/,
/src/features/bills/, /src/features/paychecks/. Each domain contains its
service, its screens, and its local state. The financial engine
(/src/engine/) is a pure module with no dependencies on any feature. The
database layer (/src/database/) is shared infrastructure.

Within these boundaries, each module can evolve independently. You can
refactor the bills screen without touching anything in the purchases
module. You can update the financial engine without touching the
database layer. This is the practical benefit of modularity.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>graph TD</p>
<p>UI[Screen Layer] --&gt; SVC[Service Layer]</p>
<p>SVC --&gt; ENGINE[Financial Engine]</p>
<p>SVC --&gt; REPO[Repository Layer]</p>
<p>REPO --&gt; DB[(SQLite)]</p>
<p>ENGINE --&gt; |pure functions, no I/O| ENGINE</p>
<p>SQ[sync_queue] --&gt; |Phase 3 only| BACKEND[Spring Boot API]</p>
<p>REPO --&gt; SQ</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Separation of Concerns

Separation of concerns means each part of the codebase does one thing
and knows about as little as possible outside its own domain. The
financial engine knows nothing about SQLite. Screens know nothing about
the database. Services know nothing about how data is rendered. This
isolation is what makes the system testable, maintainable, and
changeable.

### Why This Fits a Two-Person Team

With two developers, you can divide work cleanly along module
boundaries. One developer can build the financial engine and its tests
while the other builds the database schema and repository layer. They
meet at the service layer. Neither needs to understand the other's
module internals — only the interface between them.

# Section 2 — Database Architecture

Section 1 established the philosophy: local-first, offline-first,
backend optional. Section 2 is where those principles become concrete
SQL decisions. UUID primary keys enable future sync. Soft deletes
protect audit integrity. The sync_queue sits dormant waiting for Phase
3. Every layer above — engine, services, screens — is built on this
schema.

The database layer is where every financial decision the user makes is
durably recorded. Get this layer right and the rest of the application
has a solid foundation. Get it wrong and you'll be fighting data
inconsistencies, broken calculations, and migration headaches for the
entire project.

## 2.1 Schemas, Tables and Entities

### Concept Overview

A schema is the structure of a database — the tables it contains, the
columns in those tables, the types of those columns, and the
relationships between tables. Defining the schema is the first
significant engineering decision in any new project.

### Why Budget Flow's Schema is Designed the Way It Is

The schema is designed around two constraints: it must support the MVP
perfectly with no backend, and it must support Phase 3 sync cleanly
without structural changes. This dual constraint shapes every table.
Every financial entity has a UUID primary key, a sync_status field,
soft-delete support, and ISO 8601 timestamps. None of these are needed
for MVP calculations — they are sync scaffolding that sits dormant until
Phase 3.

### The Core Entities

| **Table** | **Role** | **Notes** |
|----|----|----|
| profiles | One row — the local financial data root | Every other entity points here via profile_id |
| paychecks | Income records and cycle anchors | is_received gates whether they affect balance |
| bills | Recurring bill definitions | Template only — not per-cycle payment state |
| bill_cycle_instances | One bill occurrence per cycle | The table safe-to-spend actually queries |
| purchases | Manual transaction entries | Both charged and pending reduce safe-to-spend |
| balance_adjustments | Manual balance corrections | Immutable once written — append only |
| activity_log | Audit trail | Append only, never synced |
| notification_settings | Notification prefs | One row per profile |
| import_suggestions | Transient import workflow | Never synced, deleted after review |
| sync_queue | Sync outbox | Dormant in MVP, activated in Phase 3 |
| backup_metadata | Backup event log | Local only |

### Entity Relationship Overview

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>erDiagram</p>
<p>profiles ||--o{ paychecks : owns</p>
<p>profiles ||--o{ bills : owns</p>
<p>profiles ||--o{ purchases : owns</p>
<p>profiles ||--o{ balance_adjustments : owns</p>
<p>profiles ||--|| notification_settings : has</p>
<p>profiles ||--o{ activity_log : owns</p>
<p>profiles ||--o{ sync_queue : owns</p>
<p>bills ||--o{ bill_cycle_instances : generates</p>
<p>paychecks ||--o{ bill_cycle_instances : anchors</p>
<p>paychecks ||--o{ purchases : cycle-groups</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 2.2 Primary Keys, Foreign Keys and UUIDs

### Concept Overview

A primary key uniquely identifies a row in a table. A foreign key in one
table references the primary key of another, creating a relationship.
Together they enforce referential integrity — a bill_cycle_instance must
reference a bill that exists; a purchase must reference a profile that
exists.

### Why Budget Flow Uses UUID Primary Keys

The most common primary key is an auto-incrementing integer: 1, 2, 3, 4.
This is simple and efficient. So why use UUIDs instead?

Auto-incrementing integers work fine for a single database. They break
in a sync scenario. If Device A creates a purchase and assigns it ID 47,
and Device B also creates a purchase and assigns it ID 47, those are two
different records with the same ID. When you try to sync them to a
shared PostgreSQL database, you have a collision with no clean
resolution.

UUIDs are generated randomly using a standard algorithm (UUID v4). The
probability of two independently generated UUIDs colliding is
astronomically small — effectively zero in practice. Device A generates
7a3f8c2d-... and Device B generates b9e1f4a7-... They are globally
unique. Sync is clean.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>-- Every financial table uses this pattern:</p>
<p>CREATE TABLE purchases (</p>
<p>id TEXT PRIMARY KEY, -- UUID v4 string</p>
<p>profile_id TEXT NOT NULL</p>
<p>REFERENCES profiles(id), -- foreign key</p>
<p>amount_cents INTEGER NOT NULL CHECK (amount_cents &gt; 0),</p>
<p>state TEXT NOT NULL DEFAULT 'charged',</p>
<p>purchase_date TEXT NOT NULL,</p>
<p>deleted_at TEXT, -- soft delete</p>
<p>sync_status TEXT NOT NULL DEFAULT 'local',</p>
<p>created_at TEXT NOT NULL,</p>
<p>updated_at TEXT NOT NULL</p>
<p>);</p>
<p>-- Enable FK enforcement on every connection:</p>
<p>PRAGMA foreign_keys = ON;</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| SQLite does NOT enforce foreign keys by default. You must execute PRAGMA foreign_keys = ON on every database connection immediately after opening it. Forgetting this is a common mistake — orphaned records will silently accumulate. |
|----|

## 2.3 Soft Deletes

### Concept Overview

A hard delete executes a SQL DELETE statement and permanently removes a
row. A soft delete sets a deleted_at timestamp on the row, leaving the
data in the database but excluding it from normal queries via WHERE
deleted_at IS NULL.

### Why Budget Flow Uses Soft Deletes

Three reasons, each independently sufficient:

7.  Sync safety. If you hard-delete a purchase on Device A, there's no
    record to transmit to the sync backend. The backend can't tell
    Device B 'remove this purchase' because the purchase no longer
    exists locally. With soft delete, the deletion event creates a
    sync_queue entry: operation='delete', entity_id=\[the UUID\]. This
    propagates cleanly.

8.  Audit integrity. If a user accidentally deletes a bill that was used
    in last month's safe-to-spend calculation, soft delete lets you show
    that bill in history or restore it without data loss.

9.  Data safety. Deleting financial data permanently based on a swipe
    gesture is dangerous. Soft delete makes accidental deletion
    recoverable.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Soft delete in a repository — never use DELETE SQL on
financial entities</p>
<p>async softDelete(id: string): Promise&lt;void&gt; {</p>
<p>const now = new Date().toISOString();</p>
<p>await db.execute(</p>
<p>'UPDATE purchases SET deleted_at = ?, updated_at = ?, sync_status = ?
WHERE id = ?',</p>
<p>[now, now, 'pending', id]</p>
<p>);</p>
<p>await syncQueue.write('purchase', id, 'delete', { id, deleted_at: now
});</p>
<p>}</p>
<p>// Every SELECT on financial entities filters soft-deleted rows</p>
<p>async findAll(profileId: string): Promise&lt;Purchase[]&gt; {</p>
<p>return db.query(</p>
<p>'SELECT * FROM purchases WHERE profile_id = ? AND deleted_at IS NULL
ORDER BY purchase_date DESC',</p>
<p>[profileId]</p>
<p>);</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### How It Affects Future Development

Every repository you write must include WHERE deleted_at IS NULL in
every SELECT by default. The only exception is when you explicitly want
to include deleted records — for history views or backup exports. Make
this a code review checklist item.

## 2.4 Indexes and Query Optimisation

### Concept Overview

A database index is a data structure that speeds up lookups. Without an
index, a query that searches by a column must scan every row in the
table — this is called a full table scan. With an index, SQLite can jump
directly to matching rows.

### Why Indexes Matter for Budget Flow

The safe-to-spend calculation runs on every financial action. It queries
several tables simultaneously: bill_cycle_instances for the current
cycle, purchases for pending and charged transactions, paychecks for
confirmed income. If those queries are slow, the app feels sluggish. The
calculation must feel instant.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>-- The indexes that support fast safe-to-spend calculation:</p>
<p>-- Find paychecks by date (cycle boundary lookups)</p>
<p>CREATE INDEX idx_paychecks_profile_date</p>
<p>ON paychecks(profile_id, expected_date, deleted_at);</p>
<p>-- Find unpaid bill instances for a cycle</p>
<p>CREATE INDEX idx_bill_instances_cycle</p>
<p>ON bill_cycle_instances(paycheck_cycle_id, is_paid, deleted_at);</p>
<p>-- Find pending purchases (safe-to-spend deduction)</p>
<p>CREATE INDEX idx_purchases_pending</p>
<p>ON purchases(profile_id, state, deleted_at);</p>
<p>-- Enforce bill instance uniqueness (idempotency)</p>
<p>CREATE UNIQUE INDEX idx_bill_instance_unique</p>
<p>ON bill_cycle_instances(bill_id, paycheck_cycle_id, due_date)</p>
<p>WHERE deleted_at IS NULL;</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### The Safe-to-Spend Query Explained

The safe-to-spend calculation logically runs five queries and passes the
results to the financial engine. With proper indexes, all five run in
microseconds:

10. SUM of amount_cents from confirmed paychecks WHERE profile_id = ?
    AND is_received = 1 AND deleted_at IS NULL

11. SUM of amount_cents from purchases WHERE profile_id = ? AND
    deleted_at IS NULL

12. SUM of cycle_amount_cents from bill_cycle_instances WHERE
    paycheck_cycle_id = \[current\] AND is_paid = 0 AND deleted_at IS
    NULL

13. SUM of delta_cents from balance_adjustments WHERE profile_id = ? AND
    deleted_at IS NULL

14. profiles.essential_reserve for the current profile

These results are plain numbers passed to the financial engine as typed
inputs. The engine does integer arithmetic and returns a result. No
database call happens inside the engine itself.

## 2.5 Transactions and Rollback

### Concept Overview

A database transaction is a group of operations that either all succeed
or all fail together. This is described as atomicity — the 'A' in the
ACID properties of relational databases. If any operation in the group
fails, all previous operations in the group are rolled back, leaving the
database in the state it was before the transaction began.

### Why Budget Flow Needs Transactions

Consider what happens when a user adds a purchase. Two things must
happen:

15. INSERT a row into the purchases table.

16. INSERT a row into the sync_queue table.

If Step 1 succeeds and Step 2 fails, the purchase exists in the database
but there's no sync_queue entry for it. In Phase 3, this purchase will
never be synced to the backend. The local data and the cloud data are
inconsistent. This is a data integrity bug.

Wrapping both operations in a transaction guarantees atomicity: either
both rows are written or neither is. If Step 2 fails, Step 1 is rolled
back, and no inconsistent state is persisted.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Transaction wrapper in the database module</p>
<p>async function withTransaction&lt;T&gt;(fn: () =&gt;
Promise&lt;T&gt;): Promise&lt;T&gt; {</p>
<p>await db.execute('BEGIN TRANSACTION');</p>
<p>try {</p>
<p>const result = await fn();</p>
<p>await db.execute('COMMIT');</p>
<p>return result;</p>
<p>} catch (error) {</p>
<p>await db.execute('ROLLBACK');</p>
<p>throw error; // re-throw so the caller knows it failed</p>
<p>}</p>
<p>}</p>
<p>// Usage in PurchaseRepository.create()</p>
<p>async create(data: NewPurchase): Promise&lt;Purchase&gt; {</p>
<p>return withTransaction(async () =&gt; {</p>
<p>const purchase = { ...data, id: generateUUID(), created_at: now(),
updated_at: now() };</p>
<p>await db.execute('INSERT INTO purchases VALUES (?...)',
Object.values(purchase));</p>
<p>await syncQueue.write('purchase', purchase.id, 'create',
purchase);</p>
<p>await activityLog.write(data.profileId, 'purchase_added',
purchase.id);</p>
<p>return purchase;</p>
<p>});</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### What Happens at Runtime

When the user taps 'Save' on the purchase entry screen, this is what
happens under the hood in roughly 10 milliseconds:

17. PurchaseService.createPurchase(data) is called.

18. SQLite executes BEGIN TRANSACTION.

19. INSERT into purchases.

20. INSERT into sync_queue.

21. INSERT into activity_log.

22. SQLite executes COMMIT — all three rows are now durable.

23. Service emits FINANCIAL_STATE_CHANGED event.

24. DashboardService re-queries SQLite and updates safe-to-spend.

25. UI re-renders with new value.

If anything between steps 2 and 5 throws an error — perhaps a constraint
violation — ROLLBACK fires and none of the three rows exist. The
database is exactly as it was before the user tapped Save. An error
message is shown.

### Common Failure Cases — Transactions

Transactions fail in predictable ways. Knowing these patterns saves
hours:

- Missing transaction wrapper: purchases and sync_queue are written in
  two separate statements. If the sync_queue INSERT fails, the purchase
  exists with no sync entry. In Phase 3, this record will never reach
  the backend. Fix: always use withTransaction() for any write that
  touches more than one table.

- Error swallowed inside a transaction: code catches an exception inside
  the transaction callback but does not re-throw it. The transaction
  commits with partial or incorrect data. Fix: always re-throw inside
  transaction callbacks so the wrapper can ROLLBACK.

- Transaction scope too wide: a slow operation (validation, formatting,
  event emission) is placed inside the transaction. The database
  connection is held open longer than necessary. Fix: transactions
  should contain only database writes. Business logic goes before or
  after the transaction call.

## 2.6 Migrations

### Concept Overview

A database migration is a versioned, sequential script that makes a
change to the schema. Migrations are how you evolve a database schema
over time — adding tables, adding columns, creating indexes — without
losing existing data.

### Why Migrations Matter

Once your app is on a user's device with real data in it, you cannot
simply drop and recreate the database when you want to change the
schema. The user's data is in there. You need to make surgical,
backwards-compatible changes while preserving every existing row.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>-- migration_001_initial_schema.sql</p>
<p>CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY
KEY);</p>
<p>INSERT INTO schema_version VALUES (1);</p>
<p>CREATE TABLE IF NOT EXISTS profiles (</p>
<p>id TEXT PRIMARY KEY,</p>
<p>essential_reserve INTEGER NOT NULL DEFAULT 0,</p>
<p>currency_code TEXT NOT NULL DEFAULT 'USD',</p>
<p>onboarding_complete INTEGER NOT NULL DEFAULT 0,</p>
<p>created_at TEXT NOT NULL,</p>
<p>updated_at TEXT NOT NULL,</p>
<p>sync_status TEXT NOT NULL DEFAULT 'local'</p>
<p>);</p>
<p>-- migration_002_add_notification_settings.sql</p>
<p>UPDATE schema_version SET version = 2;</p>
<p>CREATE TABLE IF NOT EXISTS notification_settings (</p>
<p>id TEXT PRIMARY KEY,</p>
<p>profile_id TEXT NOT NULL REFERENCES profiles(id),</p>
<p>notifications_enabled INTEGER NOT NULL DEFAULT 1,</p>
<p>pending_reminder_days INTEGER NOT NULL DEFAULT 7,</p>
<p>created_at TEXT NOT NULL,</p>
<p>updated_at TEXT NOT NULL</p>
<p>);</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

<table style="width:100%;">
<colgroup>
<col style="width: 0%" />
<col style="width: 99%" />
<col style="width: 0%" />
</colgroup>
<thead>
<tr>
<th colspan="2"><p>// Migration runner — executes on every app start</p>
<p>async function runMigrations(): Promise&lt;void&gt; {</p>
<p>await db.execute(</p>
<p>'CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY
KEY)'</p>
<p>);</p>
<p>const result = await db.query('SELECT version FROM schema_version
LIMIT 1');</p>
<p>const currentVersion = result[0]?.version ?? 0;</p>
<p>const migrations = [</p>
<p>{ version: 1, file: 'migration_001_initial_schema.sql' },</p>
<p>{ version: 2, file: 'migration_002_add_notification_settings.sql'
},</p>
<p>];</p>
<p>for (const migration of migrations) {</p>
<p>if (migration.version &gt; currentVersion) {</p>
<p>const sql = readMigrationFile(migration.file);</p>
<p>await withTransaction(async () =&gt; {</p>
<p>await db.execute(sql);</p>
<p>});</p>
<p>console.log(`Applied migration ${migration.version}`);</p>
<p>}</p>
<p>}</p>
<p>}</p></th>
<th></th>
</tr>
</thead>
<tbody>
<tr>
<td></td>
<td colspan="2">Never modify a migration file that has already shipped
to devices. The migration runner checks the version number — if you
change migration_001.sql, devices that already applied it won't re-run
it, but the schema on new installs will differ from existing ones.
Always create a new migration to make corrections.</td>
</tr>
</tbody>
</table>

## 2.7 Monetary Storage — Integer Cents

### Concept Overview

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>flowchart TD</p>
<p>A[App launches] --&gt; B[Open SQLite connection]</p>
<p>B --&gt; C[PRAGMA foreign_keys = ON]</p>
<p>C --&gt; D{schema_version table exists?}</p>
<p>D --&gt;|No| E[Create schema_version]</p>
<p>E --&gt; F[Read current version = 0]</p>
<p>D --&gt;|Yes| F</p>
<p>F --&gt; G{Pending migrations?}</p>
<p>G --&gt;|None| H[App continues normally]</p>
<p>G --&gt;|Yes| I[BEGIN TRANSACTION]</p>
<p>I --&gt; J[Execute migration_NNN.sql]</p>
<p>J --&gt; K{Success?}</p>
<p>K --&gt;|Yes| L[UPDATE schema_version]</p>
<p>L --&gt; M[COMMIT]</p>
<p>M --&gt; G</p>
<p>K --&gt;|No| N[ROLLBACK]</p>
<p>N --&gt; O[Log error, halt startup]</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Common Failure Cases — Migrations

These are the migration issues most likely to bite you in development
and after shipping:

- Forgetting PRAGMA on the migration connection: FK constraints are
  silently unenforced during migration runs. Orphaned rows accumulate
  with no error. Fix: add PRAGMA foreign_keys = ON to the migration
  runner itself, not just the app connection.

- Modifying a shipped migration: you edit migration_001.sql after
  devices have applied it. New installs get the edited schema; existing
  devices keep the original. Symptom: subtle schema divergence that only
  surfaces under specific queries. Fix: never edit a shipped migration —
  create migration_002.sql.

- Non-atomic migration: a multi-statement migration fails halfway
  through. Symptom: schema is partially applied; app crashes on next
  start with ‘no such column’ errors. Fix: wrap every migration in a
  transaction inside the runner.

- Version gap: migration_003 exists but migration_002 does not. Devices
  at version 1 skip migration_003 entirely. Fix: version numbers must be
  sequential with no gaps.

All monetary values in Budget Flow are stored as INTEGER values
representing cents. £42.10 is stored as 4210. This is not a
simplification — it is a deliberate engineering decision to eliminate an
entire class of bugs.

### Why Floating-Point Is Wrong for Money

Computers represent floating-point numbers (decimals) in binary. Most
decimal values cannot be represented exactly in binary — there's always
a tiny rounding error. For most applications this doesn't matter. For
financial calculations it can be catastrophic.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// This is a real JavaScript bug:</p>
<p>0.1 + 0.2 // =&gt; 0.30000000000000004</p>
<p>// Now imagine this is your safe-to-spend calculation:</p>
<p>const balance = 127.50;</p>
<p>const billTotal = 45.30;</p>
<p>const safeToSpend = balance - billTotal; // =&gt;
82.19999999999999</p>
<p>// Displayed to the user as £82.19 instead of £82.20</p>
<p>// A penny error in a financial app destroys trust</p>
<p>// The fix — store and compute in integer cents:</p>
<p>const balance = 12750; // £127.50 in cents</p>
<p>const billTotal = 4530; // £45.30 in cents</p>
<p>const safeToSpend = balance - billTotal; // =&gt; 8220 exactly</p>
<p>const display = `£${(safeToSpend / 100).toFixed(2)}`; // '£82.20'</p>
<p>// Integer arithmetic is always exact</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Every amount field in the database has a \_cents suffix (amount_cents,
cycle_amount_cents, essential_reserve) to make this convention explicit.
The formatCurrency() utility in /src/shared/currency.ts is the only
place in the entire codebase where division by 100 happens, and only for
display.

## 2.8 The sync_queue and Outbox Pattern

### Concept Overview

The outbox pattern is a well-established technique for reliable
messaging in distributed systems. The idea: instead of sending a message
directly to an external system (which might fail), you write the message
to a local outbox table in the same database transaction as your main
operation. A background process reads the outbox and forwards messages
to the external system, retrying on failure.

### How Budget Flow Uses It

Every time a financial entity is created, updated, or soft-deleted, a
corresponding row is written to sync_queue within the same transaction.
During MVP, nothing reads from sync_queue — it just accumulates. In
Phase 3, the sync engine reads from sync_queue and transmits entries to
the Spring Boot API.

The sync_queue row contains everything the backend needs: entity_type
('purchase', 'bill', etc.), entity_id (UUID), operation
('create'/'update'/'delete'), payload_json (snapshot of the entity at
time of mutation), and created_at (for chronological ordering).

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// sync_queue table</p>
<p>CREATE TABLE sync_queue (</p>
<p>id TEXT PRIMARY KEY,</p>
<p>profile_id TEXT NOT NULL REFERENCES profiles(id),</p>
<p>entity_type TEXT NOT NULL,</p>
<p>entity_id TEXT NOT NULL,</p>
<p>operation TEXT NOT NULL, -- 'create' | 'update' | 'delete'</p>
<p>payload_json TEXT NOT NULL,</p>
<p>status TEXT NOT NULL DEFAULT 'pending', --
'pending'|'syncing'|'synced'|'failed'</p>
<p>attempt_count INTEGER NOT NULL DEFAULT 0,</p>
<p>last_attempt_at TEXT,</p>
<p>error_message TEXT,</p>
<p>created_at TEXT NOT NULL</p>
<p>);</p>
<p>// Writing to sync_queue (called inside transactions in
repositories)</p>
<p>async function writeSyncQueue(</p>
<p>entityType: string, entityId: string,</p>
<p>operation: 'create'|'update'|'delete', payload: object</p>
<p>): Promise&lt;void&gt; {</p>
<p>await db.execute(</p>
<p>'INSERT INTO sync_queue
(id,profile_id,entity_type,entity_id,operation,payload_json,created_at)</p>
<p>VALUES (?,?,?,?,?,?,?)',</p>
<p>[generateUUID(), profileId, entityType, entityId, operation,</p>
<p>JSON.stringify(payload), new Date().toISOString()]</p>
<p>);</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Why This Pattern Is Valuable

The alternative to the outbox pattern is making a direct API call when
the user performs an action. This fails if the network is unavailable.
It can leave local state and remote state inconsistent if the API call
succeeds but the local write fails (or vice versa). The outbox pattern
decouples the write from the transmission — they can happen at different
times, and the transmission can be retried as many times as needed
without risking data loss.

### Runtime Status Lifecycle

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>stateDiagram-v2</p>
<p>[*] --&gt; pending : written by repository</p>
<p>pending --&gt; syncing : sync engine picks up</p>
<p>syncing --&gt; synced : API confirms success</p>
<p>syncing --&gt; pending : transmission failed, retry</p>
<p>pending --&gt; failed : max_attempts reached</p>
<p>note right of pending</p>
<p>During MVP: stays here indefinitely</p>
<p>Phase 3: engine processes these</p>
<p>end note</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 2.9 Idempotency

### Concept Overview

An operation is idempotent if performing it multiple times produces the
same result as performing it once. In distributed systems, idempotency
is critical because operations sometimes get retried — due to network
failures, timeouts, or crashes.

### Where Budget Flow Needs Idempotency

Bill instance generation is the most important place. When a new
paycheck cycle is created, the app generates bill_cycle_instances for
every active bill. If something causes this process to run twice — a
crash mid-generation, a retry on app restart — you could end up with
duplicate bill instances. A bill that should deduct £100 once instead
deducts £200.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>-- The UNIQUE constraint that enforces idempotency</p>
<p>CREATE UNIQUE INDEX idx_bill_instance_unique</p>
<p>ON bill_cycle_instances(bill_id, paycheck_cycle_id, due_date)</p>
<p>WHERE deleted_at IS NULL;</p>
<p>-- Generation code checks for existence before inserting</p>
<p>async function generateInstanceIfNotExists(</p>
<p>billId: string, paycheckCycleId: string, dueDate: string, amount:
number</p>
<p>): Promise&lt;void&gt; {</p>
<p>const existing = await db.query(</p>
<p>`SELECT id FROM bill_cycle_instances</p>
<p>WHERE bill_id=? AND paycheck_cycle_id=? AND due_date=? AND deleted_at
IS NULL`,</p>
<p>[billId, paycheckCycleId, dueDate]</p>
<p>);</p>
<p>if (existing.length &gt; 0) return; // already exists, skip</p>
<p>await db.execute(</p>
<p>'INSERT INTO bill_cycle_instances (...) VALUES (...)',</p>
<p>[generateUUID(), billId, paycheckCycleId, dueDate, amount, ...]</p>
<p>);</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

The database-level UNIQUE constraint is the safety net. The
application-level existence check avoids relying on constraint
violations as control flow. Both layers working together make generation
completely safe to run multiple times.

# Section 3 — Application Architecture

The application architecture describes how code is organised and how
different layers communicate. Budget Flow uses a strict layered
architecture: screens → services → repositories + financial engine →
SQLite. Understanding why this layering exists — and what goes wrong
when you skip layers — is essential.

## 3.1 The Financial Engine

### Concept Overview

The financial engine is the most important module in the codebase. It
lives in /src/engine/ and contains every financial calculation the
application performs: safe-to-spend derivation, running balance, cycle
boundary calculations, bill instance generation logic.

### The Critical Rule: Pure Functions Only

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>sequenceDiagram</p>
<p>participant Screen</p>
<p>participant Service</p>
<p>participant Repo</p>
<p>participant SQLite</p>
<p>participant Engine</p>
<p>Screen-&gt;&gt;Service: createPurchase(data)</p>
<p>Service-&gt;&gt;Repo: create(data) [async]</p>
<p>Repo-&gt;&gt;SQLite: BEGIN TRANSACTION</p>
<p>Repo-&gt;&gt;SQLite: INSERT purchases</p>
<p>Repo-&gt;&gt;SQLite: INSERT sync_queue</p>
<p>Repo-&gt;&gt;SQLite: COMMIT</p>
<p>SQLite--&gt;&gt;Repo: rows committed</p>
<p>Repo--&gt;&gt;Service: Purchase object</p>
<p>Service-&gt;&gt;Engine: calculateSafeToSpend(inputs)</p>
<p>Note right of Engine: pure function, no I/O</p>
<p>Engine--&gt;&gt;Service: safeToSpend: number (cents)</p>
<p>Service-&gt;&gt;Screen: emit FINANCIAL_STATE_CHANGED</p>
<p>Screen-&gt;&gt;Screen: re-render with new safe-to-spend</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Every function in the financial engine is a pure function: it takes
input, returns output, and does nothing else. No database calls. No
network calls. No side effects. No React state. No randomness.

This purity is the engine's most important architectural property. Pure
functions are:

- Trivially testable — you call the function with inputs and assert the
  output. No mocking required.

- Deterministic — the same inputs always produce the same outputs.

- Portable — the same engine can run on the mobile app and on the Spring
  Boot backend for parity validation.

- Debuggable — if a calculation is wrong, you can reproduce it exactly
  by calling the function with the same inputs.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// src/engine/safeToSpend.ts — a pure financial calculation</p>
<p>interface SafeToSpendInputs {</p>
<p>confirmedPaychecks: Array&lt;{ amount_cents: number }&gt;;</p>
<p>chargedPurchases: Array&lt;{ amount_cents: number }&gt;;</p>
<p>pendingPurchases: Array&lt;{ amount_cents: number }&gt;;</p>
<p>unpaidBillInstances: Array&lt;{ cycle_amount_cents: number }&gt;;</p>
<p>balanceAdjustments: Array&lt;{ delta_cents: number }&gt;;</p>
<p>essentialReserve: number;</p>
<p>}</p>
<p>export function calculateSafeToSpend(inputs: SafeToSpendInputs):
number {</p>
<p>const confirmedIncome = inputs.confirmedPaychecks</p>
<p>.reduce((sum, p) =&gt; sum + p.amount_cents, 0);</p>
<p>const totalPurchases = [</p>
<p>...inputs.chargedPurchases,</p>
<p>...inputs.pendingPurchases</p>
<p>].reduce((sum, p) =&gt; sum + p.amount_cents, 0);</p>
<p>const totalBills = inputs.unpaidBillInstances</p>
<p>.reduce((sum, b) =&gt; sum + b.cycle_amount_cents, 0);</p>
<p>const adjustments = inputs.balanceAdjustments</p>
<p>.reduce((sum, a) =&gt; sum + a.delta_cents, 0);</p>
<p>const runningBalance = confirmedIncome - totalPurchases +
adjustments;</p>
<p>return runningBalance - totalBills - inputs.essentialReserve;</p>
<p>// Result may be negative — this is valid and meaningful</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| Build the financial engine before you build any screen. Test it exhaustively. The dashboard is just a view over engine outputs — if the engine is correct, the dashboard is correct. |
|----|

## 3.2 Repositories

### Concept Overview

A repository is a class that encapsulates all database interactions for
one entity. It is the only code that writes SQL. Everything above the
repository layer (services, screens) works with typed TypeScript objects
— it never sees raw SQL or raw database rows.

### Why This Separation Matters

If you write SQL directly in service functions or screen components,
several problems emerge immediately. The SQL is scattered across the
codebase and hard to find. Changing the schema requires updating SQL in
dozens of places. Testing requires a real database connection
everywhere. And there's no single place to enforce the deleted_at IS
NULL filter.

With repositories, all of this is centralised. One class, one entity,
all CRUD operations, consistent filtering, consistent sync_queue writes.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// src/database/repositories/PurchaseRepository.ts</p>
<p>export class PurchaseRepository {</p>
<p>constructor(private db: Database) {}</p>
<p>async findAll(profileId: string): Promise&lt;Purchase[]&gt; {</p>
<p>const rows = await this.db.query(</p>
<p>'SELECT * FROM purchases WHERE profile_id=? AND deleted_at IS
NULL</p>
<p>ORDER BY purchase_date DESC',</p>
<p>[profileId]</p>
<p>);</p>
<p>return rows.map(this.mapRow);</p>
<p>}</p>
<p>async create(data: NewPurchase): Promise&lt;Purchase&gt; {</p>
<p>return withTransaction(async () =&gt; {</p>
<p>const purchase: Purchase = {</p>
<p>id: generateUUID(),</p>
<p>...data,</p>
<p>created_at: utcNow(),</p>
<p>updated_at: utcNow(),</p>
<p>sync_status: 'local',</p>
<p>};</p>
<p>await this.db.execute(</p>
<p>'INSERT INTO purchases (id,profile_id,amount_cents,state,...) VALUES
(?,?,?,?,...)',</p>
<p>[purchase.id, purchase.profile_id, purchase.amount_cents,
purchase.state, ...]</p>
<p>);</p>
<p>await writeSyncQueue('purchase', purchase.id, 'create',
purchase);</p>
<p>return purchase;</p>
<p>});</p>
<p>}</p>
<p>async softDelete(id: string): Promise&lt;void&gt; {</p>
<p>return withTransaction(async () =&gt; {</p>
<p>const now = utcNow();</p>
<p>await this.db.execute(</p>
<p>'UPDATE purchases SET deleted_at=?, updated_at=?, sync_status=? WHERE
id=?',</p>
<p>[now, now, 'pending', id]</p>
<p>);</p>
<p>await writeSyncQueue('purchase', id, 'delete', { id, deleted_at: now
});</p>
<p>});</p>
<p>}</p>
<p>private mapRow(row: any): Purchase { /* map DB row to typed object */
}</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Async Repository Signatures — The Phase 3 Design Decision

All repository methods return Promises, even though the underlying
SQLite operations are local and fast. This is a deliberate
forward-looking decision. In Phase 3, services will mix repository calls
(local SQLite) with API calls (network). If repositories return Promises
from day one, adding network calls to services is clean composition. If
repositories are synchronous, every service signature needs rewriting
when Phase 3 arrives.

| The async overhead during MVP is negligible. The refactoring cost avoided in Phase 3 is significant. Return Promises from repositories from the start. |
|----|

## 3.3 Services

### Concept Overview

Services contain business logic — the operations that combine multiple
repository calls, call the financial engine, write to the activity log,
and emit recalculation events. A service function represents one
user-facing operation from start to finish.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// src/features/purchases/PurchaseService.ts</p>
<p>export class PurchaseService {</p>
<p>constructor(</p>
<p>private purchaseRepo: PurchaseRepository,</p>
<p>private paycheckRepo: PaycheckRepository,</p>
<p>private activityLog: ActivityLogService,</p>
<p>private eventBus: EventBus</p>
<p>) {}</p>
<p>async createPurchase(data: NewPurchaseInput): Promise&lt;Purchase&gt;
{</p>
<p>// 1. Determine which paycheck cycle this purchase belongs to</p>
<p>const cycleId = await
this.paycheckRepo.findCycleForDate(data.profileId,
data.purchaseDate);</p>
<p>// 2. Write to database (includes sync_queue write in
transaction)</p>
<p>const purchase = await this.purchaseRepo.create({</p>
<p>...data,</p>
<p>paycheck_cycle_id: cycleId ?? null,</p>
<p>});</p>
<p>// 3. Record in activity log</p>
<p>await this.activityLog.log(data.profileId, 'purchase_added',
'purchase', purchase.id,</p>
<p>`Added purchase: ${formatCurrency(data.amount_cents)}`);</p>
<p>// 4. Trigger recalculation</p>
<p>this.eventBus.emit('FINANCIAL_STATE_CHANGED', data.profileId);</p>
<p>return purchase;</p>
<p>}</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Dependency Injection

Notice that PurchaseService receives its dependencies (purchaseRepo,
paycheckRepo, activityLog, eventBus) via its constructor rather than
creating them internally. This is dependency injection.

The practical benefit: in tests, you can pass mock repositories to the
service. You don't need a real SQLite database to test service logic.
You pass a fake repository that returns predefined data, and assert that
the service calls the right methods with the right arguments.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// In a test — inject a mock repository</p>
<p>const mockPurchaseRepo = {</p>
<p>create: jest.fn().mockResolvedValue({ id: 'test-uuid', amount_cents:
4500, ... }),</p>
<p>findAll: jest.fn().mockResolvedValue([]),</p>
<p>};</p>
<p>const service = new PurchaseService(</p>
<p>mockPurchaseRepo as any,</p>
<p>mockPaycheckRepo as any,</p>
<p>mockActivityLog as any,</p>
<p>mockEventBus as any</p>
<p>);</p>
<p>const result = await service.createPurchase({ amount_cents: 4500, ...
});</p>
<p>expect(mockPurchaseRepo.create).toHaveBeenCalledWith(</p>
<p>expect.objectContaining({ amount_cents: 4500 })</p>
<p>);</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 3.4 DTOs — Data Transfer Objects

### Concept Overview

A DTO is a simple object used to carry data between layers. It defines
the shape of data at a boundary — what a service accepts as input, what
a repository returns as output, what an API endpoint receives in a
request body.

### Why DTOs Matter

Without DTOs, your database row structure leaks into your UI, and your
UI's form field structure leaks into your database. When the database
schema changes, UI code breaks. When UI requirements change, database
code has to change. DTOs create an explicit contract at each boundary,
isolating each layer from changes in other layers.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Three different shapes for a purchase at different
boundaries:</p>
<p>// 1. NewPurchaseInput — what the UI form gives to the service</p>
<p>interface NewPurchaseInput {</p>
<p>profileId: string;</p>
<p>amount_cents: number;</p>
<p>state: 'charged' | 'pending';</p>
<p>description?: string;</p>
<p>purchaseDate: string;</p>
<p>}</p>
<p>// 2. Purchase — what the repository returns (full database
record)</p>
<p>interface Purchase extends NewPurchaseInput {</p>
<p>id: string;</p>
<p>paycheck_cycle_id: string | null;</p>
<p>created_at: string;</p>
<p>updated_at: string;</p>
<p>deleted_at: string | null;</p>
<p>sync_status: string;</p>
<p>}</p>
<p>// 3. PurchaseDisplayItem — what the screen renders</p>
<p>interface PurchaseDisplayItem {</p>
<p>id: string;</p>
<p>displayAmount: string; // '£45.00' — already formatted</p>
<p>displayDate: string; // 'Today' or 'Mon 3 Jun'</p>
<p>description?: string;</p>
<p>isPending: boolean;</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 3.5 Async Operations and State Management

### Concept Overview

All repository calls return Promises. All service calls return Promises.
React Native screens use async/await to call services and update
component state. The financial engine itself is synchronous — it
receives plain data and returns plain data — but everything around it is
async because of the database layer.

### React Context for Financial State

Budget Flow uses React Context for three pieces of global state:

- ProfileContext — the current profile record, loaded once at startup.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>flowchart LR</p>
<p>A[User Action] --&gt; B[Service writes to SQLite]</p>
<p>B --&gt; C[EventBus.emit FINANCIAL_STATE_CHANGED]</p>
<p>C --&gt; D[FinancialStateContext listener]</p>
<p>D --&gt; E[DashboardService queries repositories]</p>
<p>E --&gt; F[Passes typed inputs to Engine]</p>
<p>F --&gt; G[Engine returns safe-to-spend int]</p>
<p>G --&gt; H[setState in FinancialStateContext]</p>
<p>H --&gt; I[All subscribed screens re-render]</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

FinancialStateContext — current safe-to-spend, running balance,
dashboard snapshot. Updated after every financial action via the
EventBus.

- OnboardingContext — whether onboarding is complete, drives initial
  navigation.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// FinancialStateContext — simplified</p>
<p>const FinancialStateContext = createContext&lt;FinancialState |
null&gt;(null);</p>
<p>export function FinancialStateProvider({ children }:
PropsWithChildren) {</p>
<p>const [state, setState] =
useState&lt;FinancialState&gt;(initialState);</p>
<p>const { profile } = useContext(ProfileContext)!;</p>
<p>// Re-query and recalculate whenever a financial action fires the
event</p>
<p>useEffect(() =&gt; {</p>
<p>const unsubscribe = eventBus.on('FINANCIAL_STATE_CHANGED', async ()
=&gt; {</p>
<p>const newState = await
dashboardService.loadDashboardState(profile.id);</p>
<p>setState(newState);</p>
<p>});</p>
<p>return unsubscribe;</p>
<p>}, [profile.id]);</p>
<p>return (</p>
<p>&lt;FinancialStateContext.Provider value={state}&gt;</p>
<p>{children}</p>
<p>&lt;/FinancialStateContext.Provider&gt;</p>
<p>);</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Optimistic Updates

An optimistic update is when the UI immediately shows the expected
result of an action before the operation completes, then corrects itself
if the operation fails. For a local SQLite app, most operations complete
in under 10 milliseconds, so optimistic updates are rarely necessary —
the real result arrives so fast that there's nothing to optimistically
show.

The one case where they're useful: the floating action button for adding
a purchase. The safe-to-spend display can optimistically show the new
reduced value while the SQLite write completes in the background. If the
write fails (constraint violation, unexpected error), the display
reverts to the pre-action value.

### Spring Boot Architecture Overview (Phase 3)

When the Spring Boot backend is introduced, it follows the same layered
pattern: controllers receive requests, services orchestrate logic,
repositories query PostgreSQL. The key difference is that the backend's
services operate on synchronised PostgreSQL state — they run the same
financial calculation rules as the mobile engine, but on cloud data for
web client rendering and consistency validation.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>graph LR</p>
<p>subgraph Mobile</p>
<p>UI --&gt; SVC[Service]</p>
<p>SVC --&gt; ENG[Financial Engine]</p>
<p>SVC --&gt; REPO[Repository]</p>
<p>REPO --&gt; SQLITE[(SQLite)]</p>
<p>REPO --&gt; SQ[sync_queue]</p>
<p>end</p>
<p>subgraph Phase3 Backend</p>
<p>CTRL[Controller] --&gt; BSVC[Service]</p>
<p>BSVC --&gt; BENG[Financial Engine]</p>
<p>BSVC --&gt; BREPO[Repository]</p>
<p>BREPO --&gt; PG[(PostgreSQL)]</p>
<p>end</p>
<p>SQ --&gt;|Phase 3 sync| CTRL</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Section 4 — Authentication and Security

Section 3 described the application architecture — services,
repositories, the financial engine — all of which functions with no
authentication in the MVP. That is intentional. Section 4 explains the
security model that exists without auth (which is stronger than you
might expect), then covers JWT authentication for Phase 3 premium
accounts.

Budget Flow's MVP has no authentication — no login, no tokens, no user
accounts. This is intentional and correct for a local-first application.
Section 4 covers how JWT authentication works for Phase 3, and why the
MVP's security model is simpler and stronger than you might expect.

## 4.1 MVP Security — Local-First Privacy

### Why No Auth is Sometimes Better Security

Traditional apps store your data on a server and authenticate you to
access it. The server is a central target — one breach exposes every
user's data. Budget Flow's MVP has no central server, which means there
is nothing to breach at the company level. Your financial data is on
your device, encrypted by the OS, and inaccessible to anyone who doesn't
have physical access to your unlocked phone.

This is a genuinely stronger privacy posture for the majority of users
than 'we store your data and protect it with a password.'

### What Security Exists in the MVP

- App sandbox — iOS and Android isolate app data directories. Other apps
  cannot read Budget Flow's SQLite database.

- Device encryption — Modern phones encrypt storage at rest. The
  database is encrypted when the device is locked.

- No network surface — There are no API endpoints to attack, no
  authentication to bypass, no server to compromise.

- Import privacy — CSV/PDF files are parsed locally and deleted
  immediately. Sensitive identifiers are stripped before anything is
  written to SQLite.

- Backup security — Local backup files contain financial data and must
  be stored securely by the user. The app should display a clear warning
  about this.

## 4.2 JWT Authentication — Phase 3

### Concept Overview

JWT stands for JSON Web Token. It is a compact, self-contained token
that represents a verified identity. JWTs are used in Phase 3 to
authenticate requests to the Spring Boot backend — proving that the
person making a request is who they claim to be.

### The Real-World Analogy

Think of a JWT like a concert wristband. When you arrive, the venue
checks your ticket and gives you a wristband. For the rest of the night,
security staff at every door just check your wristband — they don't need
to check your original ticket again. The wristband itself proves you've
been validated.

A JWT works the same way. When you log in, the server checks your email
and password, then gives you a token (the wristband). Every subsequent
API request sends that token. The server checks the token — it doesn't
need to look you up in the database again. The token itself contains
your identity.

### JWT Structure — Three Parts

A JWT looks like this: xxxxx.yyyyy.zzzzz — three base64-encoded sections
separated by dots.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// A real JWT (shortened for readability):</p>
<p>eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLXV1aWQiLCJleHAiOjE3...}.SIG</p>
<p>// Decoded, the three parts are:</p>
<p>// Part 1: HEADER — what algorithm was used to sign this token</p>
<p>{</p>
<p>"alg": "RS256", // RSA signature with SHA-256</p>
<p>"typ": "JWT"</p>
<p>}</p>
<p>// Part 2: PAYLOAD — the claims (who you are, when it expires)</p>
<p>{</p>
<p>"sub": "7a3f8c2d-...", // user_id — the subject of the token</p>
<p>"iat": 1716800000, // issued at (Unix timestamp)</p>
<p>"exp": 1716803600, // expires at (60 minutes later)</p>
<p>"type": "access"</p>
<p>}</p>
<p>// Part 3: SIGNATURE — cryptographic proof that parts 1+2 weren't
tampered with</p>
<p>// This is computed as: sign(base64(header) + '.' + base64(payload),
PRIVATE_KEY)</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### How Token Signing Works

The server has a secret key — a long random string or an RSA private
key. When it creates a JWT, it takes the header and payload, combines
them, and runs them through a cryptographic signing algorithm
(HMAC-SHA256 or RS256) with that secret key. The result is the
signature.

Anyone can decode the header and payload — they're just base64 encoded,
not encrypted. But nobody can produce a valid signature without the
secret key. If an attacker changes even one character in the payload
(e.g., changing their user_id to someone else's), the signature no
longer matches. The server catches this.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Simplified illustration of JWT creation (Spring Boot side)</p>
<p>// Step 1: User logs in with email + password</p>
<p>POST /v1/auth/login</p>
<p>{ email: 'user@example.com', password: 'secret' }</p>
<p>// Step 2: Server verifies password against hashed value in DB</p>
<p>// (Passwords stored as bcrypt hash — never plaintext)</p>
<p>boolean valid = BCrypt.verify(inputPassword, storedHash);</p>
<p>// Step 3: Server creates JWT with user_id as the subject</p>
<p>String token = Jwts.builder()</p>
<p>.subject(user.getId()) // user_id UUID</p>
<p>.issuedAt(new Date())</p>
<p>.expiration(new Date(now + 3600_000)) // 60 minutes</p>
<p>.signWith(privateKey) // RSA private key</p>
<p>.compact();</p>
<p>// Step 4: Server returns token to client</p>
<p>{ access_token: 'eyJhbGc...', refresh_token: 'eyJhbGc...' }</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### How Token Validation Works

When the mobile app makes an API request, it sends the JWT in the
Authorization header. The Spring Boot middleware validates the token
before the request reaches any controller:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Request from mobile app</p>
<p>GET /v1/sync/status</p>
<p>Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI3YT...</p>
<p>// Spring Boot JwtAuthFilter (middleware) — runs on every protected
request</p>
<p>@Component</p>
<p>public class JwtAuthFilter extends OncePerRequestFilter {</p>
<p>@Override</p>
<p>protected void doFilterInternal(HttpServletRequest request, ...)
{</p>
<p>String header = request.getHeader('Authorization');</p>
<p>if (header == null || !header.startsWith('Bearer ')) {</p>
<p>response.sendError(401, 'Missing token');</p>
<p>return;</p>
<p>}</p>
<p>String token = header.substring(7); // remove 'Bearer '</p>
<p>try {</p>
<p>Claims claims = Jwts.parser()</p>
<p>.verifyWith(publicKey) // RSA public key to verify signature</p>
<p>.build()</p>
<p>.parseSignedClaims(token)</p>
<p>.getPayload();</p>
<p>// Token is valid — extract user_id and put in request context</p>
<p>String userId = claims.getSubject();</p>
<p>SecurityContextHolder.getContext().setAuthentication(</p>
<p>new UsernamePasswordAuthenticationToken(userId, null, List.of())</p>
<p>);</p>
<p>filterChain.doFilter(request, response); // proceed to controller</p>
<p>} catch (ExpiredJwtException e) {</p>
<p>response.sendError(401, 'Token expired');</p>
<p>} catch (JwtException e) {</p>
<p>response.sendError(401, 'Invalid token');</p>
<p>}</p>
<p>}</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Why Fake Tokens Fail

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>sequenceDiagram</p>
<p>participant App as Mobile App</p>
<p>participant Filter as JwtAuthFilter</p>
<p>participant Ctrl as Controller</p>
<p>App-&gt;&gt;Filter: GET /v1/sync/status</p>
<p>Note right of App: Authorization: Bearer eyJ...</p>
<p>Filter-&gt;&gt;Filter: Extract token from header</p>
<p>Filter-&gt;&gt;Filter: base64-decode header + payload</p>
<p>Filter-&gt;&gt;Filter: Verify signature (RSA public key)</p>
<p>alt Token valid + not expired</p>
<p>Filter-&gt;&gt;Filter: Place userId in SecurityContext</p>
<p>Filter-&gt;&gt;Ctrl: Forward request</p>
<p>Ctrl--&gt;&gt;App: 200 OK</p>
<p>else Token expired</p>
<p>Filter--&gt;&gt;App: 401 TOKEN_EXPIRED</p>
<p>else Signature invalid (tampered)</p>
<p>Filter--&gt;&gt;App: 401 INVALID_TOKEN</p>
<p>else Missing header</p>
<p>Filter--&gt;&gt;App: 401 TOKEN_MISSING</p>
<p>end</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Suppose an attacker intercepts a JWT and modifies the payload, changing
the user_id to a different user's UUID to access their data. They encode
the modified payload in base64 and construct a new token. But they
cannot produce a valid signature for the modified payload because they
don't have the server's private key.

When the server runs verifyWith(publicKey) on the tampered token, the
signature check fails. The server rejects the request with 401. The
attacker cannot access the target user's data.

| The signature is the security guarantee. The token is only as secure as the private key. Never expose the private key, never log it, never put it in version control. |
|----|

### Why the Server Doesn't Need to Store Every Token

This is the stateless property of JWTs — one of their most useful
characteristics. A traditional session-based auth system stores a
session ID in a database and looks it up on every request. This requires
a database query per request and creates scaling challenges.

With JWTs, the token itself contains everything the server needs: who
you are (sub), when the token expires (exp), and a cryptographic proof
that this information wasn't tampered with (signature). The server
validates the signature mathematically — no database lookup needed. This
makes JWT-authenticated services fast and easy to scale horizontally.

### Token Storage on Mobile

### Common Failure Cases — JWT Authentication

- Token in AsyncStorage: unencrypted storage is accessible to other
  processes on rooted devices. Symptom: no visible error in development;
  exploitable in the wild. Fix: always use iOS Keychain / Android
  Keystore via react-native-keychain.

- No refresh logic: access token expires after 60 minutes. All API calls
  silently start returning 401. Symptom: sync stops working after the
  first hour of a session. Fix: intercept 401 responses in the API
  client, attempt token refresh, retry the original request. Force
  re-login if the refresh token has also expired.

- Private key in version control: any developer with repo access can
  sign arbitrary tokens and impersonate any user. Fix: keys live in
  environment variables only — never in code, never committed.

- Using HS256 (symmetric) instead of RS256 (asymmetric): with HS256, any
  service that verifies tokens can also create them. Fix: RS256 ensures
  only the server holding the private key can issue tokens —
  verification services only need the public key.

JWT tokens must be stored securely on the device. Never store them in
AsyncStorage or plain app storage — these are not encrypted. Use iOS
Keychain or Android Keystore, accessed via a library like
react-native-keychain:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>import Keychain from 'react-native-keychain';</p>
<p>// Store after login</p>
<p>await Keychain.setGenericPassword('access_token', accessToken);</p>
<p>await Keychain.setGenericPassword('refresh_token', refreshToken);</p>
<p>// Retrieve before making API request</p>
<p>const credentials = await Keychain.getGenericPassword();</p>
<p>const token = credentials ? credentials.password : null;</p>
<p>// Include in API request</p>
<p>const response = await fetch(API_URL + '/v1/sync/push', {</p>
<p>method: 'POST',</p>
<p>headers: {</p>
<p>'Authorization': `Bearer ${token}`,</p>
<p>'Content-Type': 'application/json',</p>
<p>},</p>
<p>body: JSON.stringify(payload),</p>
<p>});</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Token Expiry and Refresh

Access tokens expire after 60 minutes. This limits the window of
exposure if a token is somehow stolen. Refresh tokens last 30 days and
are used to get new access tokens without re-entering a password.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>sequenceDiagram</p>
<p>participant App</p>
<p>participant API</p>
<p>App-&gt;&gt;API: POST /auth/login (email, password)</p>
<p>API--&gt;&gt;App: { access_token (60min), refresh_token (30d) }</p>
<p>App-&gt;&gt;App: Store tokens in Keychain</p>
<p>Note over App: 60 minutes later...</p>
<p>App-&gt;&gt;API: GET /sync/status (expired access_token)</p>
<p>API--&gt;&gt;App: 401 Token Expired</p>
<p>App-&gt;&gt;API: POST /auth/refresh (refresh_token)</p>
<p>API--&gt;&gt;App: { new access_token }</p>
<p>App-&gt;&gt;API: GET /sync/status (new access_token)</p>
<p>API--&gt;&gt;App: 200 OK { sync data }</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Important Notes and Tradeoffs

- JWTs are not encrypted — anyone with the token can read the payload.
  Never put sensitive data (passwords, PII) in the payload. user_id is
  fine.

- Token revocation is harder with JWTs than sessions. A rogue token
  remains valid until it expires. Logout invalidates the refresh token
  server-side but the access token stays valid for its remaining
  lifetime.

- Budget Flow uses RS256 (asymmetric) rather than HS256 (symmetric).
  With HS256, any service that can verify tokens can also create them.
  With RS256, only the server holding the private key can sign tokens —
  verification services only need the public key.

## 4.3 The Authentication Flow End to End

### How It All Connects in Phase 3

When a user registers for premium and enables sync, this is the complete
flow:

26. User enters email and password in the premium setup screen.

27. App calls POST /v1/auth/register — Spring Boot creates account,
    hashes password with bcrypt, stores in PostgreSQL.

28. Spring Boot returns access_token and user_id. App stores token in
    Keychain. App associates user_id with local profiles.id (the
    profile_id to user_id mapping used for sync routing).

29. App calls POST /v1/sync/push with the first batch of sync_queue
    records. Request includes Authorization: Bearer {token} and
    profile_id in the body.

30. JwtAuthFilter validates token, extracts user_id, places it in
    security context.

31. SyncController receives request, calls SyncService.push(userId,
    profileId, records).

32. SyncService validates records, persists to PostgreSQL, returns
    results with queue_entry_id references.

33. App updates sync_queue rows: status='synced'. Profile's financial
    data is now mirrored in the cloud.
