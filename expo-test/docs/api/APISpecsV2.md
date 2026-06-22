**BUDGET FLOW**

**API Specification Document**

Premium Synchronization REST API — Version 2.0

Version 2.0 \| May 2025

# Document Overview

This API Specification defines the REST API contract for the Budget Flow
Spring Boot backend service. As established in the System Architecture
Design v3, the Spring Boot API is a future premium synchronization
service — it is not active during MVP local-only operation. This
document is written now to ensure that the on-device data model,
sync_queue outbox design, entity naming conventions, and sync_status
field conventions defined in the Database Design Document v2 are
reflected in the API contract, and to provide a clear engineering target
for the premium synchronization release.

All endpoints defined in this document are synchronization and account
management endpoints. They do not replicate on-device financial logic as
an operational requirement — the API validates, persists, and reconciles
state that originates on the device. During MVP local-only usage,
Safe-to-spend calculations, balance derivations, paycheck-cycle
projections, and all other financial computations execute exclusively
on-device. In future premium releases, Spring Boot services may
implement the same financial calculation rules to serve web clients,
validate synchronized state, and support multi-device consistency
checks. These backend calculations are a parallel implementation of
shared business rules and do not replace or override mobile offline
calculation authority in any way.

This document should be read alongside the System Architecture Design
v3, Database Design Document v2, and Functional Requirements
Specification.

# API Design Principles

The Budget Flow REST API is governed by the following design principles,
all of which derive directly from the product's local-first architecture
philosophy:

- The API is additive — it extends the application's capabilities for
  premium users without altering or replacing any on-device behavior

<!-- -->

- The device is the source of truth — the API receives, validates, and
  persists device-originated data; it does not push unsolicited
  mutations to the device

- Mobile offline calculation authority is absolute — during MVP and in
  all future releases, the mobile application executes financial
  calculations on-device without backend involvement. Future Spring Boot
  services may implement the same calculation rules for web clients and
  server-side consistency validation, but these are parallel
  implementations of shared business rules and do not replace local
  execution authority

- Failure is safe — API unavailability must never degrade local
  application functionality; all sync operations are best-effort and
  retried silently by the on-device sync engine

- Minimal surface area — endpoints are defined only for synchronization
  and account management; the API does not expose endpoints for
  operations that are performed entirely locally

- sync_queue is the outbox — the mobile application writes to its local
  sync_queue table whenever a financial entity changes; the sync engine
  reads from sync_queue and transmits those records to this API in
  chronological order

# Identity Model: Cloud Account vs Local Profile

Budget Flow uses two distinct identity concepts that must be understood
clearly before implementing any synchronization or account management
feature. They serve different purposes and exist at different layers of
the system.

## Local Profile (SQLite — MVP)

A local profile is the root entity of the on-device SQLite database. It
is represented by the profiles table in the Database Design Document v2.
Every financial record — paychecks, bills, purchases, balance
adjustments, and all others — is owned by a profile via a profile_id
foreign key. The profiles table is the single root of the entire
relational graph during MVP operation.

The local profile has no authentication identity. It exists entirely on
the user's device, requires no account creation, and is never
transmitted to any external service during MVP local-only usage. Its id
field is a UUID v4 generated on first application launch. This UUID
serves as the stable device-level identifier.

## Cloud Account (Spring Boot — Future Premium)

A cloud account is a premium authentication identity managed by the
Spring Boot backend. It is created when a user opts in to premium
synchronization and is authenticated via email and password with
JWT-based session management. The cloud account is represented by the
accounts module in the Spring Boot backend and the /v1/account endpoints
in this API.

The API uses user_id as the identifier for a cloud account. This is the
backend's primary key for the authenticated user and is distinct from
the local profiles.id UUID. The two identifiers are linked during the
first synchronization event: when a premium user registers and initiates
their first sync push, the backend associates their cloud user_id with
the device's local profile UUID. From that point forward, the backend
can route synchronized records to the correct cloud account.

## Relationship Between the Two Identities

The relationship is: one cloud account may be linked to one or more
local device profiles (for future multi-device support). Each local
profile syncs its financial records under its cloud account's user_id.
The financial data root is always the local profile — the cloud account
is solely an authentication and routing layer.

|  |  |  |  |  |
|----|----|----|----|----|
| **Layer** | **Entity** | **Identifier** | **Where It Lives** | **Purpose** |
| On-device (MVP) | profiles | profiles.id (UUID) | SQLite on device | Root of all financial data. Present in every MVP installation. |
| Cloud (Future Premium) | Cloud account | user_id (UUID) | Spring Boot / PostgreSQL | Authentication identity for premium sync. Only exists when user opts in. |

Engineering note: the /v1/account endpoints in this document use user_id
to identify the cloud account. The /v1/sync/push and /v1/sync/pull
endpoints carry the device's local profile UUID within the sync record
payloads. Implementations must not conflate user_id (cloud auth) with
profile_id (local financial data root).

# Sync-Eligible and Local-Only Entities

Not all entities in the Budget Flow SQLite schema are candidates for
cloud synchronization. This section defines which entities are
sync-eligible and which are intentionally local-only, and explains the
rationale for each classification.

## Sync-Eligible Entities

The following entities carry a sync_status field and are written to the
sync_queue outbox when mutated. They will be transmitted to the Spring
Boot API during premium sync operation:

|  |  |  |
|----|----|----|
| **Entity** | **sync_queue entity_type value** | **Rationale** |
| profiles | 'profile' | Profile-level configuration (essential reserve, display name, currency) must be consistent across devices. |
| paychecks | 'paycheck' | Paycheck income records and cycle anchors must be shared across devices for consistent cycle projections. |
| bills | 'bill' | Recurring bill definitions must be shared so all devices show the same obligations. |
| bill_cycle_instances | 'bill_cycle_instance' | Per-cycle payment state (paid, confirmed variable amount) must be consistent across devices. |
| purchases | 'purchase' | Purchase entries affect safe-to-spend and must be visible across all linked devices. |
| balance_adjustments | 'balance_adjustment' | Manual balance corrections must propagate to maintain a consistent running balance. |
| notification_settings | 'notification_settings' | User notification preferences should be consistent across devices for a coherent experience. |

## Local-Only Entities (Not Synchronized)

The following entities are intentionally excluded from cloud
synchronization. They do not carry a sync_status field and are never
written to the sync_queue outbox:

|  |  |
|----|----|
| **Entity** | **Reason for Local-Only Classification** |
| activity_log | The activity log is a device-local audit trail and diagnostic history. It records events from the perspective of a single device's operation. Cross-device merge of activity logs would produce confusing, interleaved histories with no clear benefit to the user. Each device maintains its own independent event record. |
| import_suggestions | Import suggestions are transient workflow state generated by the on-device CSV/PDF import pipeline. They exist only until the user confirms or rejects each suggestion. Once resolved, the resulting bill record (if confirmed) is sync-eligible through the bills entity. There is no value in synchronizing the intermediate suggestion state. |
| backup_metadata | Backup metadata is a local record of backup export and restore events on a specific device. It is not financial data — it is a history of data management actions taken on one device. Cloud backup content is handled through the /v1/backup endpoints; the local event history of those actions does not need to be synchronized. |
| sync_queue | The sync_queue is the outbox mechanism itself. It is a local operational table that the sync engine reads from. It is never itself synchronized — doing so would create a circular dependency. Completed entries (status = 'synced') may be periodically purged from the local database as a housekeeping operation. |

# Base URL and Versioning

All API endpoints are versioned using URL path versioning to ensure
backward compatibility as the API evolves across premium releases.

|                     |                                                       |
|---------------------|-------------------------------------------------------|
| **Property**        | **Detail**                                            |
| Base URL            | https://api.budgetflow.app                            |
| API Version         | v1                                                    |
| Versioned Base Path | https://api.budgetflow.app/v1                         |
| Protocol            | HTTPS only. HTTP requests are rejected.               |
| Content Type        | application/json for all request and response bodies. |

# Authentication

All API endpoints require authentication via JSON Web Token (JWT).
Tokens are issued by the authentication endpoints upon successful
account login and must be included in the Authorization header of every
subsequent request. Authentication is applicable only to premium account
holders — local-only MVP users never interact with the authentication
system.

|  |  |
|----|----|
| **Property** | **Detail** |
| Header | Authorization: Bearer {token} |
| Token Type | JWT (JSON Web Token) |
| Token Expiry | Access tokens expire after 60 minutes. Refresh tokens expire after 30 days of inactivity. |
| Token Refresh | POST /v1/auth/refresh — accepts a valid refresh token and returns a new access token. |
| Unauthenticated Response | 401 Unauthorized with error code AUTH_TOKEN_MISSING or AUTH_TOKEN_EXPIRED. |

# Standard Response Structure

All API responses follow a consistent envelope structure to simplify
client-side parsing and error handling.

## Success Response

{ "success": true, "data": { ... }, "meta": { "timestamp":
"2025-05-01T12:00:00Z", "request_id": "uuid" } }

## Error Response

{ "success": false, "error": { "code": "ERROR_CODE", "message":
"Human-readable description.", "field": "field_name_if_applicable" },
"meta": { "timestamp": "2025-05-01T12:00:00Z", "request_id": "uuid" } }

# Standard HTTP Status Codes

|  |  |
|----|----|
| **Status Code** | **Usage** |
| 200 OK | Successful GET, PUT, or PATCH request. |
| 201 Created | Successful POST request that created a new resource. |
| 204 No Content | Successful DELETE request. |
| 400 Bad Request | Request body failed validation. Error response includes field-level detail. |
| 401 Unauthorized | Missing or expired authentication token. |
| 403 Forbidden | Authenticated user does not have permission to access the requested resource. |
| 404 Not Found | Requested resource does not exist or does not belong to the authenticated user. |
| 409 Conflict | Synchronization conflict detected. Conflict detail included in the error response. |
| 422 Unprocessable Entity | Request is well-formed but contains a data validation violation. |
| 429 Too Many Requests | Rate limit exceeded. Retry-After header included in the response. |
| 500 Internal Server Error | Unexpected server-side error. Request ID included for support reference. |

# Authentication Endpoints

## POST /v1/auth/register

Creates a new premium cloud account. Upon successful registration, the
returned user_id should be stored locally by the application and
associated with the device's profiles.id to support future
synchronization routing. The user_id is the cloud-layer identity;
profiles.id remains the local financial data root.

|  |  |
|----|----|
| **Property** | **Detail** |
| Request Body | { "email": "string", "password": "string", "display_name": "string (optional)" } |
| Success Response | 201 Created. Returns { "user_id": "uuid", "access_token": "string", "refresh_token": "string" }. |
| Error Codes | AUTH_EMAIL_TAKEN — email address is already registered. VALIDATION_ERROR — missing or invalid fields. |

## POST /v1/auth/login

Authenticates an existing premium account holder and returns access and
refresh tokens.

|  |  |
|----|----|
| **Property** | **Detail** |
| Request Body | { "email": "string", "password": "string" } |
| Success Response | 200 OK. Returns { "user_id": "uuid", "access_token": "string", "refresh_token": "string" }. |
| Error Codes | AUTH_INVALID_CREDENTIALS — email or password is incorrect. |

## POST /v1/auth/refresh

Exchanges a valid refresh token for a new access token. The refresh
token must not have expired or been invalidated by a prior logout.

|  |  |
|----|----|
| **Property** | **Detail** |
| Request Body | { "refresh_token": "string" } |
| Success Response | 200 OK. Returns { "access_token": "string" }. |
| Error Codes | AUTH_TOKEN_EXPIRED — refresh token has expired. AUTH_TOKEN_INVALID — refresh token is malformed or has been revoked. |

## POST /v1/auth/logout

Invalidates the current session's refresh token server-side. The client
must discard both the access token and refresh token from local storage
upon receiving a successful response.

|  |  |
|----|----|
| **Property** | **Detail** |
| Request Body | { "refresh_token": "string" } |
| Success Response | 204 No Content. |
| Notes | Access tokens are short-lived and expire naturally. Logout primarily serves to revoke the long-lived refresh token and prevent future session renewal. |

# Synchronization Endpoints

Synchronization endpoints transmit locally queued mutations from the
device to the backend for cloud persistence and enable the device to
receive changes from other linked devices. The on-device sync_queue
table (defined in the Database Design Document v2) serves as the outbox:
a row is written to sync_queue for every create, update, or soft-delete
operation on a sync-eligible financial entity. The sync engine reads
from sync_queue in ascending created_at order and transmits each pending
entry to this API.

For synchronization purposes, the API does not act as the operational
authority for financial calculations. It validates the structural
integrity of incoming sync_queue records, applies last-write-wins
conflict detection against the server-side state for the authenticated
account, persists confirmed records to PostgreSQL, and returns the
outcome per record so the device can update each sync_queue entry's
status accordingly. Separately, future Spring Boot services may apply
the same financial calculation rules to the synchronized PostgreSQL
state for web client rendering and cross-device consistency validation —
but these operations are independent of the sync push/pull flow and do
not affect mobile calculation authority.

## POST /v1/sync/push

Transmits a batch of pending sync_queue entries to the backend for
validation and cloud persistence. This is the primary synchronization
endpoint called by the mobile application when connectivity is available
and the user has an active premium account.

Records must be drawn from the device's sync_queue table where status =
'pending', ordered by created_at ascending to preserve chronological
mutation order. The device should set the sync_queue row's status to
'syncing' before transmission to prevent duplicate dispatch if the sync
engine is re-entered.

|  |  |
|----|----|
| **Property** | **Detail** |
| Request Body | { "device_id": "string", "profile_id": "uuid", "records": \[ { "queue_entry_id": "uuid", "entity_type": "string", "entity_id": "uuid", "operation": "create \| update \| delete", "payload": { ... }, "client_updated_at": "ISO 8601 UTC" } \] } |
| Success Response | 200 OK. Returns { "results": \[ { "queue_entry_id": "uuid", "entity_id": "uuid", "status": "synced \| conflict", "server_updated_at": "ISO 8601 UTC", "conflict_detail": { ... } \| null } \] } |
| Batch Limit | Maximum 500 records per push request. Batches exceeding this limit are rejected with SYNC_BATCH_TOO_LARGE. |
| Ordering | Records must be submitted in ascending client_updated_at order. The backend processes records in the order received to maintain causal consistency. |
| Conflict Handling | Last-write-wins based on client_updated_at. If the server holds a more recent version of a record (from another device), the record is returned with status "conflict" and the server's current payload in conflict_detail. The client applies last-write-wins: if client_updated_at \> server's version, the client record prevails and the server updates. If server version is newer, the client discards its pending change and applies the server version locally. |
| device_id | Identifies the originating device for conflict detection and multi-device routing. This field lives in the API request, not in the MVP SQLite schema — see Database Design Document v2 Synchronization Readiness for the deferred device_id column distinction. |
| profile_id | The local profiles.id UUID from the device. The backend uses this to associate the incoming records with the correct cloud account and to scope conflict detection to the correct profile. |

## entity_type Values for sync/push

The entity_type field in each record must be one of the following
values, corresponding to the sync-eligible entities defined in Section 4
of this document and in the sync_queue schema in the Database Design
Document v2:

|  |  |  |
|----|----|----|
| **entity_type value** | **Source table** | **Notes** |
| 'profile' | profiles | Profile-level configuration changes (reserve amount, display name, currency code). |
| 'paycheck' | paychecks | All paycheck fields including is_received state and recurrence settings. |
| 'bill' | bills | Bill definition changes including default_amount_cents, recurrence, pause state, and soft-delete. |
| 'bill_cycle_instance' | bill_cycle_instances | Per-cycle payment state: cycle_amount_cents, is_variable_confirmed, is_paid, and soft-delete. |
| 'purchase' | purchases | Purchase entries including state transitions (pending → charged) and soft-delete. |
| 'balance_adjustment' | balance_adjustments | Manual balance correction records. Immutable once written — only create and delete operations apply. |
| 'notification_settings' | notification_settings | Notification preference changes. One record per profile — only update and delete operations apply after initial create. |

The following entity types are not valid in sync/push requests and must
not appear in the sync_queue: activity_log, import_suggestions,
backup_metadata, sync_queue. See Section 4 for the rationale for each
exclusion.

## GET /v1/sync/pull

Retrieves records modified on other linked devices since the client's
last successful pull. The client applies the returned records to its
local SQLite database, updating matching entities by entity_id within
the authenticated profile's data scope. This endpoint is used when a
premium user operates Budget Flow on more than one device and needs to
receive changes made elsewhere.

|  |  |
|----|----|
| **Property** | **Detail** |
| Query Parameters | since=ISO 8601 UTC — returns records whose server_updated_at is after this timestamp. device_id=string — excludes records that originated from the requesting device (avoids echoing the device's own changes back to itself). |
| Success Response | 200 OK. Returns { "records": \[ { "entity_type": "string", "entity_id": "uuid", "operation": "create \| update \| delete", "payload": { ... }, "server_updated_at": "ISO 8601 UTC" } \], "server_time": "ISO 8601 UTC" } |
| Applying pull results | For each returned record: if operation is "create" or "update", the client upserts the entity by entity_id within the matching local profile. If operation is "delete", the client sets deleted_at on the matching local record. The client must not apply pull records that would overwrite locally-pending (sync_queue status = "pending") changes — local pending changes take precedence until they have been successfully pushed. |
| Cursor management | The client stores server_time from each pull response and uses it as the since parameter for the next pull request. This ensures no records are missed between pull operations. |
| Scope | Only records belonging to the authenticated user's linked profiles are returned. Records from other users are never accessible. |

## GET /v1/sync/status

Returns the current synchronization status for the authenticated
account, including pending record counts and last successful operation
timestamps. Useful for displaying sync health in the application
settings screen.

|  |  |
|----|----|
| **Property** | **Detail** |
| Success Response | 200 OK. Returns { "last_push_at": "ISO 8601 UTC \| null", "last_pull_at": "ISO 8601 UTC \| null", "pending_record_count": integer, "device_count": integer } |
| Notes | "pending_record_count" reflects the number of records the server is aware of that have not yet been acknowledged by the requesting device. It does not reflect the device's local sync_queue pending count, which is managed entirely on-device. |

# Backup Endpoints

Cloud backup endpoints are available exclusively to premium account
holders. They provide server-side storage and retrieval of complete
financial data snapshots, complementing the local JSON backup
functionality available to all users regardless of account status. Local
backup export and restore operate entirely without these endpoints —
they are purely additive for premium users who want off-device backup
redundancy.

## POST /v1/backup

Uploads a complete local backup snapshot to cloud storage. The request
body is a JSON backup file in the same structure as the local export
format produced by the on-device backup_restore service, ensuring that
local and cloud backups are interchangeable for restore operations.

|  |  |
|----|----|
| **Property** | **Detail** |
| Request Body | Full JSON backup payload as produced by the local backup export function. Must include a complete snapshot of all Financial Core entities for the profile. |
| Success Response | 201 Created. Returns { "backup_id": "uuid", "record_count": integer, "created_at": "ISO 8601 UTC" }. |
| Storage Limit | Premium accounts retain the 10 most recent cloud backups. Older backups are removed automatically on a rolling basis when this limit is exceeded. |
| Notes | activity_log, import_suggestions, and backup_metadata records are not included in backup payloads — these are local-only entities. The backup contains Financial Core entities only: profiles, paychecks, bills, bill_cycle_instances, purchases, and balance_adjustments. |

## GET /v1/backup

Returns a list of available cloud backup snapshots for the authenticated
account.

|  |  |
|----|----|
| **Property** | **Detail** |
| Success Response | 200 OK. Returns { "backups": \[ { "backup_id": "uuid", "record_count": integer, "created_at": "ISO 8601 UTC" } \] }. |

## GET /v1/backup/{backup_id}

Downloads a specific cloud backup snapshot for restoration on the
requesting device. The returned payload is structurally identical to a
locally exported backup file and can be restored using the on-device
restore function.

|  |  |
|----|----|
| **Property** | **Detail** |
| Path Parameter | backup_id — UUID of the backup snapshot to retrieve. |
| Success Response | 200 OK. Returns the full JSON backup payload. |
| Error Codes | BACKUP_NOT_FOUND — the specified backup_id does not exist or does not belong to the authenticated user. |

# User Account Endpoints

Account endpoints manage the premium cloud account identity. They do not
manage the local SQLite profile — profile-level financial configuration
(such as essential_reserve and display_name) is managed on-device and
synchronized to the cloud via the sync/push endpoint.

## GET /v1/account

Returns the authenticated user's cloud account details.

|  |  |
|----|----|
| **Property** | **Detail** |
| Success Response | 200 OK. Returns { "user_id": "uuid", "email": "string", "display_name": "string \| null", "created_at": "ISO 8601 UTC", "subscription_status": "string" }. |
| Notes | user_id is the cloud account identifier. It is not the same as the local profiles.id — see Section 3 for the relationship between cloud account identity and local profile identity. |

## PATCH /v1/account

Updates cloud account fields. Note that display_name set here applies to
the cloud account record only. The local profiles.display_name is
managed on-device and synchronized via sync/push — the two values should
be kept consistent by the application but are stored separately at each
layer.

|  |  |
|----|----|
| **Property** | **Detail** |
| Request Body | { "display_name": "string (optional)", "email": "string (optional)" } |
| Success Response | 200 OK. Returns updated account details. |
| Error Codes | AUTH_EMAIL_TAKEN — the requested email address is already registered to another account. |

## DELETE /v1/account

Permanently deletes the authenticated user's premium cloud account and
all associated cloud-persisted data. This action is irreversible. Local
device data is not affected — the local SQLite database, all financial
records, and local backup files remain on the device until explicitly
cleared by the user through the application's settings.

|  |  |
|----|----|
| **Property** | **Detail** |
| Request Body | { "password": "string" } — password confirmation is required to prevent accidental deletion. |
| Success Response | 204 No Content. |
| Notes | Permanently removes: cloud backups, synchronized financial records stored in PostgreSQL, and all account credentials. The local SQLite database and any locally stored backup files are unaffected. The application continues operating in local-only mode after cloud account deletion. |

# Rate Limiting

The Budget Flow API applies rate limiting to protect service
availability and ensure equitable usage across all clients. Rate limits
are enforced per authenticated user account. Responses to rate-limited
requests return HTTP 429 Too Many Requests with a Retry-After header
indicating the number of seconds until the limit resets. The on-device
sync engine must respect this header and implement exponential backoff
for all retry logic.

|                          |                                        |
|--------------------------|----------------------------------------|
| **Endpoint Group**       | **Rate Limit**                         |
| Authentication endpoints | 10 requests per minute per IP address. |
| POST /v1/sync/push       | 30 requests per hour per user.         |
| GET /v1/sync/pull        | 60 requests per hour per user.         |
| Backup endpoints         | 20 requests per hour per user.         |
| Account endpoints        | 30 requests per hour per user.         |

# Error Code Reference

|  |  |  |
|----|----|----|
| **Error Code** | **HTTP Status** | **Description** |
| AUTH_TOKEN_MISSING | 401 | No Authorization header present in the request. |
| AUTH_TOKEN_EXPIRED | 401 | The provided JWT access or refresh token has expired. |
| AUTH_TOKEN_INVALID | 401 | The provided JWT is malformed or has an invalid signature. |
| AUTH_INVALID_CREDENTIALS | 401 | Email or password is incorrect during login. |
| AUTH_EMAIL_TAKEN | 409 | The provided email address is already registered to another account. |
| VALIDATION_ERROR | 400 | One or more request fields failed validation. Field-level detail is included in the error response. |
| RESOURCE_NOT_FOUND | 404 | The requested resource does not exist or does not belong to the authenticated user. |
| SYNC_CONFLICT | 409 | One or more records in a push request conflict with more recently synchronized versions. Conflict detail is included in the results array of the response. |
| SYNC_BATCH_TOO_LARGE | 400 | The push request exceeds the 500-record batch limit. |
| SYNC_INVALID_ENTITY_TYPE | 400 | A record in the push request specifies an entity_type that is not sync-eligible. Check the valid entity_type values defined in Section 10. |
| BACKUP_NOT_FOUND | 404 | The specified backup_id does not exist or does not belong to the authenticated user. |
| RATE_LIMIT_EXCEEDED | 429 | Request rate limit exceeded. Retry-After header is included in the response. |
| INTERNAL_ERROR | 500 | Unexpected server-side error. Request ID is included in the response meta for support reference. |

# 

## How This API Maps to the Database Design Document v2

|  |  |
|----|----|
| **API Concept** | **Database Design v2 Mapping** |
| user_id (auth responses) | Cloud account identifier. Maps to profiles.id on the local device via application-layer association. Not stored as a column in the MVP SQLite schema. |
| profile_id (sync/push body) | profiles.id — the UUID of the local SQLite profile. Root of all financial entities on the device. |
| entity_type in sync/push | sync_queue.entity_type enum values: 'profile' \| 'paycheck' \| 'bill' \| 'bill_cycle_instance' \| 'purchase' \| 'balance_adjustment' \| 'notification_settings'. |
| queue_entry_id in sync/push | sync_queue.id — the UUID of the sync_queue row being transmitted. Returned in push results so the device can update the correct row's status to 'synced' or 'failed'. |
| operation in sync/push | sync_queue.operation enum: 'create' \| 'update' \| 'delete'. 'delete' corresponds to a soft-delete event (deleted_at was set on the source entity). |
| payload in sync/push | sync_queue.payload_json — the JSON snapshot of the entity at the time of mutation. For 'delete' operations, contains entity_id and deleted_at only. |
| client_updated_at in sync/push | The updated_at timestamp of the source entity at the time the sync_queue row was written. Used for last-write-wins conflict resolution. |
| Non-synced entities (activity_log, import_suggestions, backup_metadata) | Local-only entities in the DB. Have no sync_status field. Never appear in sync_queue. Never transmitted to this API. |
| sync_queue (outbox) | DB Operational Support entity. The sync engine reads from this table in ascending created_at order to populate sync/push requests. sync_queue itself is never synchronized. |
| Backup payload | JSON snapshot of Financial Core entities: profiles, paychecks, bills, bill_cycle_instances, purchases, balance_adjustments. Matches local backup_restore export format. |
