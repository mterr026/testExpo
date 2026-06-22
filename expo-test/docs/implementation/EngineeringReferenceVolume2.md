**BUDGET FLOW**

**Engineering Companion Guide**

Volume 2 of 2

*Volume 2 of 2: Sync Architecture, Testing & Quality, Development
Sequence*

Version 1.0 — May 2025 — Reference

# Section 5 — Sync Architecture

Synchronization is one of the hardest problems in distributed systems.
Budget Flow intentionally defers it to Phase 3, but the MVP schema is
designed for it from day one. This section explains how sync works
conceptually, how the sync_queue outbox powers it, and why conflict
resolution is handled the way it is.

## 5.1 Why Sync Is Hard

### The Fundamental Problem

When data lives on multiple devices, those devices can independently
modify the same record while disconnected from each other. When they
reconnect, both versions claim to be correct. There is no automatic
right answer — the system must have a defined rule for resolving this
disagreement.

Consider: you update your rent bill from £900 to £950 on your phone
while on the train. Your partner updates the same bill from £900 to £930
on their tablet at home. When both devices sync, which value wins?

### Why Budget Flow Uses Last-Write-Wins

Budget Flow uses last-write-wins (LWW) conflict resolution. The record
with the most recent updated_at timestamp prevails. This is not the only
possible strategy, but it is the most practical for a personal finance
app where:

- Most edits are personal and non-collaborative (one person, one phone,
  one device most of the time).

- Financial records are fact-like — the actual electricity bill amount
  is a fact, not an opinion. The most recent confirmation is the most
  accurate.

- Implementation complexity is kept low — LWW requires only timestamp
  comparison, no manual merge UI, no conflict queues.

| Last-write-wins is appropriate here because Budget Flow's financial records are facts about the user's life, not collaborative documents. The last person to update a bill amount presumably had the most current information. |
|----|

## 5.2 Push Sync

### Concept Overview

Before diving into each direction separately, here is how push and pull
relate to each other:

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>flowchart LR</p>
<p>subgraph Device[Mobile Device]</p>
<p>SQ[sync_queue pending rows]</p>
<p>SQLITE[(Local SQLite)]</p>
<p>end</p>
<p>subgraph Backend[Spring Boot + PostgreSQL]</p>
<p>API[/v1/sync/push|pull/]</p>
<p>PG[(PostgreSQL mirror)]</p>
<p>end</p>
<p>SQ --&gt;|PUSH: device sends mutations| API</p>
<p>API --&gt; PG</p>
<p>PG --&gt;|PULL: device receives other-device changes| SQLITE</p>
<p>note1[Push = outgoing local mutations]</p>
<p>note2[Pull = incoming remote changes]</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Push sync is when the device sends locally accumulated changes to the
backend. In Budget Flow, this means the sync engine reads from the
sync_queue table and transmits pending entries to POST /v1/sync/push on
the Spring Boot API.

### Step-by-Step Push Flow

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>sequenceDiagram</p>
<p>participant SyncEngine</p>
<p>participant SQLite</p>
<p>participant API as Spring Boot API</p>
<p>participant PG as PostgreSQL</p>
<p>SyncEngine-&gt;&gt;SQLite: SELECT * FROM sync_queue WHERE
status='pending' ORDER BY created_at ASC</p>
<p>SQLite--&gt;&gt;SyncEngine: [record1, record2, record3, ...]</p>
<p>SyncEngine-&gt;&gt;SQLite: UPDATE sync_queue SET status='syncing'
WHERE id IN [...]</p>
<p>SyncEngine-&gt;&gt;API: POST /v1/sync/push { device_id, profile_id,
records: [...] }</p>
<p>API-&gt;&gt;PG: Upsert each record (last-write-wins on
updated_at)</p>
<p>PG--&gt;&gt;API: Confirmed</p>
<p>API--&gt;&gt;SyncEngine: { results: [{ queue_entry_id, status:
'synced' }, ...] }</p>
<p>SyncEngine-&gt;&gt;SQLite: UPDATE sync_queue SET status='synced'
WHERE id IN [...]</p>
<p>SyncEngine-&gt;&gt;SQLite: UPDATE [entity] SET sync_status='synced'
WHERE id=[entity_id]</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### What Happens When a Push Fails

Network failure, timeout, or server error — the push fails. The sync
engine:

1.  Sets the sync_queue rows back to status='pending' (or leaves them as
    'syncing' until the retry).

2.  Increments attempt_count on each row.

3.  Records the error in error_message.

4.  Waits with exponential backoff before retrying: 30 seconds, then 2
    minutes, then 10 minutes, etc.

5.  After 5 failed attempts, marks the row as 'failed'. These are
    diagnostic — they don't affect local app behaviour.

Critically: a sync failure never affects the user's local data or
calculations. The financial data in SQLite is unchanged. The user
continues using the app normally. The sync engine silently retries in
the background.

## 5.3 Pull Sync

### Concept Overview

Pull sync is when the device retrieves changes that were made on other
devices. This is how Device B (your tablet) gets the purchase you added
on Device A (your phone). The sync engine calls GET /v1/sync/pull with a
'since' timestamp, receives a list of records modified since that
timestamp, and applies them to the local SQLite database.

### Applying Pull Results

For each record returned by the pull:

- If operation is 'create' or 'update' — upsert the entity by entity_id
  in the local SQLite database. Apply last-write-wins: only update if
  the incoming server_updated_at is more recent than the local
  updated_at.

- If operation is 'delete' — set deleted_at on the matching local
  record. This is why soft deletes exist — pull results can propagate
  deletions by setting a timestamp, not by executing DELETE SQL.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Applying a pull result to local SQLite</p>
<p>async function applyPullRecord(record: SyncPullRecord):
Promise&lt;void&gt; {</p>
<p>if (record.operation === 'delete') {</p>
<p>await db.execute(</p>
<p>`UPDATE ${record.entity_type}s SET deleted_at=?, updated_at=?</p>
<p>WHERE id=? AND deleted_at IS NULL`,</p>
<p>[record.server_updated_at, record.server_updated_at,
record.entity_id]</p>
<p>);</p>
<p>return;</p>
<p>}</p>
<p>// For create/update: last-write-wins</p>
<p>const local = await repo.findById(record.entity_id);</p>
<p>if (!local) {</p>
<p>// New record from another device — insert it</p>
<p>await repo.insertFromSync(record.payload);</p>
<p>return;</p>
<p>}</p>
<p>// Record exists — only overwrite if server version is newer</p>
<p>if (record.server_updated_at &gt; local.updated_at) {</p>
<p>await repo.updateFromSync(record.entity_id, record.payload);</p>
<p>}</p>
<p>// If local is newer, our pending sync_queue entry will win when we
push</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Common Failure Cases — Pull Sync

- Overwriting a pending local change: a pull result arrives for an
  entity that has a pending sync_queue entry. If the pull blindly
  overwrites the local record, the user's unsent change is lost. Fix:
  before applying any pull record, check whether a pending sync_queue
  entry exists for that entity_id. If yes, skip the pull update — the
  local version will push and win via last-write-wins.

- Clock skew between devices: Device A's clock is 3 minutes ahead. Its
  updated_at timestamps are consistently later than Device B's, so
  Device A always wins conflicts even when Device B made the change most
  recently by wall-clock time. Fix: use server_updated_at from the API
  response for LWW comparison, not the device clock. The server is the
  authoritative time source for conflict resolution.

- Pull cursor not advanced: the device stores the server_time from each
  pull response and uses it as the since parameter next time. If the
  cursor is not saved (e.g. app crashes after a successful pull), the
  next pull will re-fetch already-applied records. Fix: save the cursor
  to SQLite atomically with applying the pull results, inside a
  transaction.

An Important Rule: Local Pending Beats Pull

If a sync_queue row is pending for a given entity, that entity has a
local change that hasn't been pushed yet. Applying a pull result from
the server should NOT overwrite a locally-pending change. The local
change will push soon and win via LWW (because it's more recent). This
rule prevents a pull from clobbering an in-flight local edit.

| Before applying a pull record: check whether a pending sync_queue entry exists for that entity_id. If yes, skip the pull update — the local version will push and win. |
|----|

## 5.4 Conflict Resolution in Detail

### The Realistic Conflict Scenario

This scenario happens in real life with multi-device use:

Tuesday morning: You have a variable electricity bill. The estimate is
£85 (last month's amount). You're offline on the train. You confirm the
actual amount as £92 on your phone at 09:14.

Tuesday morning: Your partner is at home with signal. They see the
estimated bill and confirm it as £88, thinking that's this month's
amount, at 09:11.

Tuesday afternoon: Both devices come online and sync. Phone (£92, 09:14)
pushes its change. Tablet (£88, 09:11) pushes its change. The backend
receives both.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Backend conflict resolution in SyncService</p>
<p>for (const record of incomingRecords) {</p>
<p>const existing = await pgRepo.findById(record.entity_id);</p>
<p>if (!existing) {</p>
<p>// No conflict — insert</p>
<p>await pgRepo.insert(record.payload);</p>
<p>results.push({ queue_entry_id: record.queue_entry_id, status:
'synced' });</p>
<p>continue;</p>
<p>}</p>
<p>if (record.client_updated_at &gt; existing.updated_at) {</p>
<p>// Incoming record is newer — it wins</p>
<p>await pgRepo.update(record.entity_id, record.payload);</p>
<p>results.push({ queue_entry_id: record.queue_entry_id, status:
'synced' });</p>
<p>} else {</p>
<p>// Existing record is newer — conflict, incoming loses</p>
<p>results.push({</p>
<p>queue_entry_id: record.queue_entry_id,</p>
<p>status: 'conflict',</p>
<p>conflict_detail: { server_version: existing }</p>
<p>});</p>
<p>}</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Result: Phone's £92 value (09:14) beats Tablet's £88 value (09:11)
because 09:14 \> 09:11. PostgreSQL stores £92. When Tablet next pulls,
it receives the £92 value and updates its local record. Both devices now
agree: £92.

### UUID's Role in Conflict Resolution

UUIDs ensure that 'the same record' is identifiable across devices. When
Device A creates a purchase with id='7a3f8c2d-...', that UUID is
globally unique. When that purchase syncs to PostgreSQL and then pulls
to Device B, Device B can look up the same UUID and correctly identify
it as the same record — not a new one, not a duplicate.

Without UUIDs, Device A might create purchase with integer id=47 and
Device B might independently create a different purchase with the same
id=47. There would be no way to distinguish them.

## 5.5 Eventual Consistency

### Concept Overview

Eventual consistency means that if you stop making changes, all devices
will eventually converge to the same state. It does not mean all devices
are always in sync — there will be periods where Device A and Device B
show different data. But given enough time and connectivity, they will
agree.

This is acceptable for a personal finance app. It is not acceptable for
a banking system where someone's live balance must be instantly
consistent across all access points. Budget Flow's use case — personal
paycheck-cycle budgeting, manual data entry — tolerates brief periods of
divergence gracefully.

### Practical Impact on Development

Eventual consistency means you should never write code that assumes all
devices have the same state right now. A purchase added on the phone
might not appear on the tablet for a few minutes. Design screens to
reflect the local device's current SQLite state, not an assumed global
state.

## 5.6 The Complete Sync Lifecycle

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p><em>[ Mermaid Diagram — paste into mermaid.live to render
]</em></p>
<p>graph TD</p>
<p>A[User performs financial action] --&gt; B[Repository writes to
SQLite]</p>
<p>B --&gt; C[sync_queue row written: status=pending]</p>
<p>C --&gt; D{Network available?}</p>
<p>D --&gt;|No| E[Row stays pending indefinitely]</p>
<p>D --&gt;|Yes| F[Sync engine picks up pending rows]</p>
<p>F --&gt; G[Set status=syncing]</p>
<p>G --&gt; H[POST /v1/sync/push to Spring Boot]</p>
<p>H --&gt; I{API response}</p>
<p>I --&gt;|success| J[Set status=synced]</p>
<p>I --&gt;|conflict| K[Server version wins, local updated on next
pull]</p>
<p>I --&gt;|failure| L[Set status=pending, increment attempt_count]</p>
<p>L --&gt; M{Max attempts?}</p>
<p>M --&gt;|Yes| N[Set status=failed]</p>
<p>M --&gt;|No| O[Exponential backoff, retry]</p>
<p>J --&gt; P[GET /v1/sync/pull since last_pull]</p>
<p>P --&gt; Q[Apply incoming changes with LWW rule]</p>
<p>Q --&gt; R[Update local SQLite from other devices]</p>
<p>R --&gt; S[Emit FINANCIAL_STATE_CHANGED]</p>
<p>S --&gt; T[UI recalculates and re-renders]</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Section 6 — Testing and Engineering Quality

### Common Failure Cases — sync_queue Processing

- Row stuck in 'syncing': the app sets status='syncing' before
  transmission but crashes during the push. On restart, the row is in
  'syncing' state but was never actually sent. Fix: on sync engine
  start, reset any rows with status='syncing' back to 'pending'. A row
  is only 'synced' after the API confirms it.

- Sending out-of-order: the sync engine sends rows in random order
  rather than ascending created_at. A bill update arrives at the server
  before the bill creation it depends on. The server rejects it. Fix:
  always ORDER BY created_at ASC when querying sync_queue for
  transmission.

- Payload stale at transmission time: the payload_json in sync_queue is
  a snapshot from the time of the write. If the user edits the same
  record again before the first push completes, two sync_queue entries
  exist for the same entity. The server processes them in order — the
  second (newer) update wins via LWW. This is correct behaviour, but it
  means duplicate queue entries per entity are normal and expected.

#### Section 5 → 6: From Sync to Quality

Section 5 covered the mechanics of how data moves between devices.
Section 6 covers how you prove that the data moving through those
mechanics is always correct — both in the financial calculations and in
the sync operations themselves.

Financial applications have zero tolerance for calculation errors. A
budgeting app that shows the wrong safe-to-spend amount actively harms
users. Testing is not optional — it is the mechanism that makes
financial correctness provable and maintainable over time.

## 6.1 Unit Testing

### Concept Overview

A unit test verifies one function in isolation. It provides specific
inputs and asserts that the output matches exactly what is expected.
Unit tests are fast (milliseconds each), require no database or network,
and serve as the specification for the behaviour of each function.

### Why the Financial Engine Has 100% Test Coverage

The financial engine is pure TypeScript with no dependencies. Every
function takes plain inputs and returns plain outputs. There is nothing
easier to test in the entire codebase. And because safe-to-spend is the
application's primary value — the single number users trust to make
spending decisions — it must be proven correct under every possible
input combination.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// src/engine/safeToSpend.test.ts</p>
<p>import { calculateSafeToSpend } from './safeToSpend';</p>
<p>describe('calculateSafeToSpend', () =&gt; {</p>
<p>test('zero everything returns zero', () =&gt; {</p>
<p>expect(calculateSafeToSpend({</p>
<p>confirmedPaychecks: [],</p>
<p>chargedPurchases: [],</p>
<p>pendingPurchases: [],</p>
<p>unpaidBillInstances: [],</p>
<p>balanceAdjustments: [],</p>
<p>essentialReserve: 0,</p>
<p>})).toBe(0);</p>
<p>});</p>
<p>test('income minus bills minus reserve', () =&gt; {</p>
<p>expect(calculateSafeToSpend({</p>
<p>confirmedPaychecks: [{ amount_cents: 200000 }], // £2000</p>
<p>chargedPurchases: [{ amount_cents: 5000 }], // £50</p>
<p>pendingPurchases: [],</p>
<p>unpaidBillInstances: [{ cycle_amount_cents: 90000 }], // £900
rent</p>
<p>balanceAdjustments: [],</p>
<p>essentialReserve: 5000, // £50 reserve</p>
<p>})).toBe(100000); // £1000</p>
<p>});</p>
<p>test('pending purchases reduce safe-to-spend immediately', () =&gt;
{</p>
<p>const withPending = calculateSafeToSpend({</p>
<p>confirmedPaychecks: [{ amount_cents: 100000 }],</p>
<p>chargedPurchases: [],</p>
<p>pendingPurchases: [{ amount_cents: 4500 }], // £45 pending</p>
<p>unpaidBillInstances: [],</p>
<p>balanceAdjustments: [],</p>
<p>essentialReserve: 0,</p>
<p>});</p>
<p>expect(withPending).toBe(95500); // £955 — pending deducted</p>
<p>});</p>
<p>test('result can be negative', () =&gt; {</p>
<p>expect(calculateSafeToSpend({</p>
<p>confirmedPaychecks: [{ amount_cents: 50000 }], // £500</p>
<p>chargedPurchases: [],</p>
<p>pendingPurchases: [],</p>
<p>unpaidBillInstances: [{ cycle_amount_cents: 90000 }], // £900
bill</p>
<p>balanceAdjustments: [],</p>
<p>essentialReserve: 0,</p>
<p>})).toBe(-40000); // -£400 — negative is valid</p>
<p>});</p>
<p>test('unconfirmed paycheck does not affect result', () =&gt; {</p>
<p>// Projected paychecks should NOT be in confirmedPaychecks input</p>
<p>// This is enforced at the service layer — only is_received=1
paychecks</p>
<p>// are passed to the engine. This test documents the contract.</p>
<p>expect(calculateSafeToSpend({</p>
<p>confirmedPaychecks: [], // zero confirmed — projected excluded</p>
<p>chargedPurchases: [],</p>
<p>pendingPurchases: [],</p>
<p>unpaidBillInstances: [],</p>
<p>balanceAdjustments: [],</p>
<p>essentialReserve: 0,</p>
<p>})).toBe(0);</p>
<p>});</p>
<p>test('variable estimated bill deducts same as confirmed', () =&gt;
{</p>
<p>// is_variable_confirmed=false should still deduct
cycle_amount_cents</p>
<p>// Both estimated and confirmed instances are passed to the
engine</p>
<p>expect(calculateSafeToSpend({</p>
<p>confirmedPaychecks: [{ amount_cents: 100000 }],</p>
<p>chargedPurchases: [],</p>
<p>pendingPurchases: [],</p>
<p>unpaidBillInstances: [{ cycle_amount_cents: 8500 }], // £85
estimated</p>
<p>balanceAdjustments: [],</p>
<p>essentialReserve: 0,</p>
<p>})).toBe(91500); // £915</p>
<p>});</p>
<p>});</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 6.2 Integration Testing

### Concept Overview

An integration test verifies that multiple components work correctly
together. Unlike unit tests, integration tests use real dependencies — a
real SQLite database, real repositories, real services. They are slower
than unit tests but provide much higher confidence that the system works
end-to-end.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Integration test — purchase creation + safe-to-spend
recalculation</p>
<p>describe('PurchaseService integration', () =&gt; {</p>
<p>let db: Database;</p>
<p>let purchaseService: PurchaseService;</p>
<p>let profileId: string;</p>
<p>beforeEach(async () =&gt; {</p>
<p>// Create a fresh in-memory SQLite database for each test</p>
<p>db = await createTestDatabase();</p>
<p>await runMigrations(db);</p>
<p>// Seed a test profile and confirmed paycheck</p>
<p>profileId = generateUUID();</p>
<p>await db.execute(</p>
<p>'INSERT INTO profiles (id, essential_reserve, ...) VALUES
(?,0,...)',</p>
<p>[profileId]</p>
<p>);</p>
<p>await db.execute(</p>
<p>'INSERT INTO paychecks (id, profile_id, amount_cents,
is_received,...) VALUES (?,?,200000,1,...)',</p>
<p>[generateUUID(), profileId]</p>
<p>);</p>
<p>// Create service with real repositories</p>
<p>purchaseService = new PurchaseService(</p>
<p>new PurchaseRepository(db),</p>
<p>new PaycheckRepository(db),</p>
<p>new ActivityLogService(db),</p>
<p>new EventBus(),</p>
<p>);</p>
<p>});</p>
<p>test('creating a purchase writes to sync_queue', async () =&gt; {</p>
<p>await purchaseService.createPurchase({</p>
<p>profileId, amount_cents: 5000, state: 'charged',</p>
<p>purchaseDate: '2025-06-01'</p>
<p>});</p>
<p>const queueRows = await db.query('SELECT * FROM sync_queue');</p>
<p>expect(queueRows).toHaveLength(1);</p>
<p>expect(queueRows[0].entity_type).toBe('purchase');</p>
<p>expect(queueRows[0].operation).toBe('create');</p>
<p>expect(queueRows[0].status).toBe('pending');</p>
<p>});</p>
<p>test('soft-deleted purchase excluded from safe-to-spend', async ()
=&gt; {</p>
<p>const purchase = await purchaseService.createPurchase({</p>
<p>profileId, amount_cents: 5000, state: 'charged',</p>
<p>purchaseDate: '2025-06-01'</p>
<p>});</p>
<p>await purchaseService.deletePurchase(purchase.id);</p>
<p>const purchases = await new
PurchaseRepository(db).findAll(profileId);</p>
<p>expect(purchases).toHaveLength(0); // soft-deleted, excluded from
findAll</p>
<p>// Safe-to-spend should NOT deduct the deleted purchase</p>
<p>const safeToSpend = await
dashboardService.getSafeToSpend(profileId);</p>
<p>expect(safeToSpend).toBe(200000); // full paycheck amount, no
deduction</p>
<p>});</p>
<p>});</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 6.3 The 7 Acceptance Test Scenarios

### What They Are

The Testing Strategy document defines 7 named end-to-end financial
scenarios (Scenario A through Scenario G). These are complete realistic
user situations — a full paycheck cycle with all the things that can
happen in it. They are the most important tests in the test suite.

| **Scenario** | **What It Tests** |
|----|----|
| A — Standard biweekly cycle | One paycheck, three fixed bills, five purchases. STS correct at each state change. |
| B — Variable bill cycle | One paycheck, one fixed bill, one variable (estimated then confirmed). STS reflects estimate then confirmed amount. |
| C — Pending purchase resolution | Purchase added as pending, resolved to charged, then deleted. STS tracks each state. |
| D — Unconfirmed paycheck | Scheduled paycheck not yet received — STS unchanged. Then received — STS increases. |
| E — Negative projected balance | Bills exceed balance — STS correctly negative, no crash. |
| F — Multiple income sources | Two paycheck sources, both must be individually confirmed. |
| G — Manual balance adjustment | Override balance, STS recalculates from corrected starting point. |

### Why These Scenarios Are Also Phase 3 Parity Tests

In Phase 3, these same 7 scenarios are run against the Spring Boot
backend financial engine. The same inputs are seeded into PostgreSQL,
the backend calculation runs, and the output must match the mobile
engine output to the cent. Any divergence is a blocking defect.

## 6.4 Regression Testing

### Concept Overview

A regression is when a change to the code breaks something that was
previously working. Regression tests are tests you add specifically to
prevent a fixed bug from returning.

### The Regression Rule

Every financial calculation bug fix must come with a new test that:

6.  Fails on the broken code (proving the test catches the bug).

7.  Passes on the fixed code (proving the fix works).

8.  Is named descriptively so future developers know exactly what it
    prevents.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Example: a regression test for a specific bug</p>
<p>// Bug: variable bills with is_variable_confirmed=false were being
excluded</p>
<p>// from safe-to-spend instead of using their estimate amount.</p>
<p>test('regression: unconfirmed variable bills still deduct estimated
amount', () =&gt; {</p>
<p>// This test was added when the bug was found and fixed.</p>
<p>// It ensures the bug never returns.</p>
<p>const result = calculateSafeToSpend({</p>
<p>confirmedPaychecks: [{ amount_cents: 100000 }],</p>
<p>chargedPurchases: [],</p>
<p>pendingPurchases: [],</p>
<p>unpaidBillInstances: [</p>
<p>{ cycle_amount_cents: 8500, is_variable_confirmed: false } //
unconfirmed</p>
<p>],</p>
<p>balanceAdjustments: [],</p>
<p>essentialReserve: 0,</p>
<p>});</p>
<p>// Bug: this was returning 100000 (not deducting estimated bill)</p>
<p>// Fix: unconfirmed variable bills are included in the deduction</p>
<p>expect(result).toBe(91500);</p>
<p>});</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 6.5 CI Pipelines and GitHub Actions

### Concept Overview

Continuous Integration (CI) is the practice of automatically running
your test suite every time code is pushed to the repository. If any test
fails, the CI pipeline fails and the developer is notified before the
broken code can be merged.

### Why CI Is Essential for a Financial App

Without CI, a developer could accidentally push a change that breaks the
safe-to-spend calculation and not notice until a user reports it. With
CI, the regression would be caught within seconds of the push — before
it ever reaches a user's device.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p># .github/workflows/test.yml</p>
<p>name: Test Suite</p>
<p>on:</p>
<p>push:</p>
<p>branches: [main, develop]</p>
<p>pull_request:</p>
<p>branches: [develop]</p>
<p>jobs:</p>
<p>test:</p>
<p>runs-on: ubuntu-latest</p>
<p>steps:</p>
<p>- uses: actions/checkout@v4</p>
<p>- name: Setup Node.js</p>
<p>uses: actions/setup-node@v4</p>
<p>with:</p>
<p>node-version: '20'</p>
<p>cache: 'npm'</p>
<p>- name: Install dependencies</p>
<p>run: npm ci</p>
<p>- name: Run financial engine unit tests</p>
<p>run: npm run test:engine</p>
<p># Fails build if coverage drops below 100% for engine modules</p>
<p>- name: Run integration tests</p>
<p>run: npm run test:integration</p>
<p>- name: Run acceptance scenarios</p>
<p>run: npm run test:scenarios</p>
<p>- name: TypeScript type check</p>
<p>run: npx tsc --noEmit</p>
<p>- name: Lint</p>
<p>run: npm run lint</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### Development Gate Rule

No pull request merges to develop unless the CI pipeline passes. No
exceptions. On a two-person project this is enforced by agreement rather
than branch protection rules, but it's just as important. The CI
pipeline is the shared quality contract between both developers.

## 6.6 Mocking in Tests

### Concept Overview

A mock is a fake version of a dependency used in tests. Instead of using
a real database or real network call, you provide a mock that returns
predefined data. This makes tests fast, deterministic, and isolated.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// Mocking the PurchaseRepository to test PurchaseService in
isolation</p>
<p>const mockRepo = {</p>
<p>create: jest.fn().mockResolvedValue({</p>
<p>id: 'test-uuid', amount_cents: 5000, state: 'charged',</p>
<p>created_at: '2025-06-01T09:00:00Z', sync_status: 'local'</p>
<p>}),</p>
<p>findAll: jest.fn().mockResolvedValue([]),</p>
<p>softDelete: jest.fn().mockResolvedValue(undefined),</p>
<p>};</p>
<p>test('createPurchase calls repository.create with correct data',
async () =&gt; {</p>
<p>const service = new PurchaseService(mockRepo, mockPaycheckRepo,
...);</p>
<p>await service.createPurchase({</p>
<p>profileId: 'profile-uuid',</p>
<p>amount_cents: 5000,</p>
<p>state: 'charged',</p>
<p>purchaseDate: '2025-06-01'</p>
<p>});</p>
<p>expect(mockRepo.create).toHaveBeenCalledTimes(1);</p>
<p>expect(mockRepo.create).toHaveBeenCalledWith(</p>
<p>expect.objectContaining({ amount_cents: 5000, state: 'charged' })</p>
<p>);</p>
<p>});</p>
<p>// Financial engine tests NEVER use mocks — they test the real
function</p>
<p>// with real inputs and assert real outputs.</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Section 7 — Development Sequence

Section 6 established that the financial engine must have 100% test
coverage before screens are built. Section 7 explains exactly how that
principle maps to a realistic sprint sequence — what gets built first,
what depends on what, and why the order is non-negotiable.

Implementation order matters enormously. Each layer of the application
depends on the layer beneath it. Building in the wrong order means you
build features on unstable foundations, discover architectural problems
late, and waste time rewriting code that worked differently than you
expected.

## 7.1 Why Schema Comes First

### The Reasoning

The schema defines the shape of every piece of data in the application.
The financial engine is designed around the schema's field names and
types. Repositories query the schema. Services interpret repository
results. If the schema changes mid-development, every layer above it
needs updating.

Defining the full schema before writing any other code means you make
all the structural data decisions at once, when you have the most
context about what the application needs. The Database Design Document
v2 is the output of that up-front thinking. Follow it.

### Schema First, Then Infrastructure

Before writing any feature code, the following infrastructure must exist
and be verified on both iOS and Android:

9.  SQLite connection singleton with PRAGMA foreign_keys = ON.

10. Migration runner that applies numbered migration files in order.

11. Full schema applied via migration_001.sql.

12. A test that verifies the schema applied correctly (correct tables,
    correct columns).

13. A test that verifies PRAGMA foreign_keys is active (attempt an
    orphan insert, assert it fails).

| Do not write any feature code until you have verified that the migration runner works correctly on both iOS and Android simulators with real SQLite. Framework-specific quirks with SQLite initialisation have surprised many developers. |
|----|

## 7.2 Financial Engine Before Any Screen

### The Non-Negotiable Rule

The financial engine is the second thing built, immediately after schema
and infrastructure. Before Sprint 3's navigation shell. Before Sprint
4's screens. Before any UI exists at all.

The reason is simple: every screen is a view over financial engine
outputs. If the engine is correct, and the service layer correctly feeds
it data from the database, the screens will display correct values. If
the engine has a bug that you discover three sprints later when you're
debugging a screen, tracing the bug back through the stack is
dramatically harder than catching it in a pure unit test during Sprint
2.

### The Sprint 2 Gate

Sprint 2 does not end until:

- 100% unit test coverage on all engine modules: safeToSpend.ts,
  balance.ts, cycleBoundaries.ts, billInstances.ts, currency.ts.

- All seven acceptance scenarios pass as unit tests against the engine.

- Test contracts documented in /docs/calculation-contracts/ for Phase 3
  parity verification.

| A developer who has proven the financial engine correct with 100% test coverage has the most valuable thing in the project: confidence. Every sprint after Sprint 2 builds on that confidence. |
|----|

## 7.3 Repositories Before Services

### Why This Order

Services call repositories. You cannot meaningfully test a service until
the repositories it depends on exist. Build all repositories for the
entities needed by a feature before building the service for that
feature.

Repository implementation order follows the dependency chain:

14. ProfileRepository — simplest entity, single row, establishes the
    pattern.

15. PaycheckRepository — needed first because cycle boundary logic
    depends on it.

16. BillRepository and BillInstanceRepository together — instances
    depend on bills.

17. PurchaseRepository — straightforward CRUD with soft delete.

18. BalanceAdjustmentRepository — append-only, no update.

19. ActivityLogRepository — append-only, no update or delete.

20. NotificationSettingsRepository — single row per profile.

21. SyncQueueRepository — write path only during MVP.

## 7.4 Why Sync Complexity Should Be Deferred

### The Business Logic Argument

Sync is complex. Conflict resolution, retry logic, pull application,
multi-device state management — these are genuinely hard problems.
Solving them in Sprint 1 alongside the database schema means solving the
hardest problem in the project at the moment of maximum uncertainty.

The architectural genius of Budget Flow's design is that sync complexity
is deferred until Phase 3 without any cost to the MVP. The sync_queue
rows accumulate. The sync_status fields sit at 'local'. Nothing breaks.
Phase 3 activates the engine that reads them. The MVP ships clean.

### What 'Deferred' Actually Means in Code

Deferred does not mean 'not thought about.' It means:

- sync_queue table exists from migration_001. Present but empty and
  unread during MVP.

- Every repository writes to sync_queue in the same transaction as the
  financial write.

- Feature flags gate any Phase 3 code paths: FEATURE_PREMIUM_SYNC=false
  in .env during MVP.

- SyncEngine class is stubbed as a no-op in MVP: start() does nothing,
  no network calls are ever made.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th><p>// The no-op sync engine stub during MVP</p>
<p>// src/sync/SyncEngine.ts</p>
<p>export class SyncEngine {</p>
<p>start(): void {</p>
<p>if (process.env.FEATURE_PREMIUM_SYNC !== 'true') {</p>
<p>console.log('[SyncEngine] Sync disabled in MVP — engine
dormant');</p>
<p>return;</p>
<p>}</p>
<p>// Phase 3: activate real sync engine here</p>
<p>this.startPushLoop();</p>
<p>this.startPullLoop();</p>
<p>}</p>
<p>private startPushLoop(): void { /* Phase 3 implementation */ }</p>
<p>private startPullLoop(): void { /* Phase 3 implementation */ }</p>
<p>}</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## 7.5 How Spring Boot Gets Added Without Rewriting the App

### The Phase 3 Activation

If the MVP was built correctly, adding Phase 3 feels like turning a
switch rather than surgery. Here is what exists at the start of Phase 3
that makes this possible:

- sync_queue has been filling up since day one — every financial
  mutation is already in there.

- UUIDs are already on every entity — no ID collision risk with
  PostgreSQL.

- sync_status fields are on every entity — the sync engine knows what
  needs pushing.

- Soft deletes are on every entity — deletions propagate as delete
  operations, not missing records.

- ISO 8601 UTC timestamps are on every entity — compatible with
  PostgreSQL without conversion.

Phase 3 adds three things:

22. The Spring Boot backend (new repository, built separately, connects
    to PostgreSQL).

23. The SyncEngine activation (FEATURE_PREMIUM_SYNC=true, implement
    startPushLoop and startPullLoop).

24. Authentication flow (registration, login, token storage in
    Keychain).

The mobile app's financial logic does not change. The repository layer
does not change. The financial engine does not change. Every existing
test continues to pass. The backend is purely additive.

| This is the payoff for the up-front investment in sync scaffolding. Two developers who built the MVP correctly get Phase 3 sync for the cost of implementing the sync engine and backend, not for the cost of restructuring the entire codebase. |
|----|

## 7.6 The Realistic Implementation Sequence

| **Sprint** | **Primary Focus** | **Gate Before Moving On** |
|----|----|----|
| 1 | Project setup, SQLite, full schema, migration runner, test infrastructure | Migrations verified on iOS + Android. FK enforcement verified. Test runner green. |
| 2 | Financial engine — all modules, all unit tests, all 7 acceptance scenarios | 100% engine coverage. All 7 scenarios pass. Test contracts documented. |
| 3 | Navigation shell, Dashboard screen using real engine outputs | Dashboard shows correct STS from real SQLite data. EventBus recalculation working. |
| 4 | Purchases screen, Bills screen, variable bill confirmation | All financial actions recalculate STS correctly. Soft deletes working. |
| 5 | Paychecks screen, cycle cards, import pipeline | Import privacy verified. Raw file deletion verified. Cycle assignment correct. |
| 6 | Settings, backup/restore, onboarding, notifications | Backup export + restore cycle verified on physical devices. Onboarding complete. |
| 7 | Internal QA — all 7 acceptance scenarios end-to-end, offline verification | All scenarios pass on physical devices. No network calls in MVP path confirmed. |
| 8 | UX refinement, performance, accessibility | STS recalculation \< 50ms on mid-range devices. Accessibility review passed. |
| 9 | Beta prep, crash reporting, App Store submission readiness | Pre-release checklist signed off. Beta distribution active. |
| 10+ | Phase 3: Spring Boot, sync, authentication, cloud backup | Parity tests passing. MVP regression tests still green. |

## 7.7 Interview Preparation — Architecture Explanation

### How to Explain This Architecture in an Interview

If asked to describe Budget Flow's architecture in a technical
interview, here is how to frame it clearly and confidently:

"Budget Flow is a local-first, offline-capable personal finance
application built with React Native and SQLite. The core architectural
principle is that the device is authoritative — all financial
calculations happen on-device using a pure TypeScript engine, and the
SQLite database is the single source of truth during the MVP."

"The codebase follows strict layered architecture: screens call
services, services call the financial engine and repositories,
repositories query SQLite. The financial engine is a pure module with no
side effects, which makes it trivially testable and portable to the
future backend."

"For future premium sync, we use the outbox pattern — a local sync_queue
table that records every financial mutation. In Phase 3, a Spring Boot
backend reads from this queue and synchronises to PostgreSQL. The mobile
app's behaviour doesn't change for non-premium users, and the sync is
fully additive. Conflict resolution uses last-write-wins on updated_at
timestamps, which is appropriate for a personal finance app where
financial facts are updated by a single user."

"Security in the MVP is local-first privacy — no server means no breach
surface. In Phase 3, we use JWT authentication with RS256 signing. The
mobile app stores tokens in the device Keychain. The Spring Boot
middleware validates the token signature on every request without a
database lookup — that's the stateless property of JWTs."

## 7.8 Key Principles — Final Summary

| These are the principles to return to whenever you're unsure about an implementation decision. |
|----|

- Local-first by architecture. The device is always authoritative. The
  backend is always additive. This is not a setting or a mode — it is
  the structural guarantee the entire codebase is built around.

- Financial engine pure. No side effects, no database calls, no network
  calls inside /src/engine/.

- Test the engine like it handles real money. Because it does.

- Repositories are async. Even when SQLite is synchronous. Phase 3 will
  thank you.

- Soft deletes everywhere. No DELETE SQL on financial entities. Ever.

- Integer cents everywhere. No floats near money. The \_cents suffix is
  your reminder.

- sync_queue from day one. Write the rows even before anything reads
  them.

- PRAGMA foreign_keys = ON on every connection. Without it, SQLite
  silently ignores referential integrity.

- Schema migrations are immutable once shipped. Fix forward, never
  backward.

- CI is the quality contract. No merge without green tests.
