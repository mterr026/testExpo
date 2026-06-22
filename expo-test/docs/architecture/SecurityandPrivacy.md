**BUDGET FLOW**

**Security & Privacy Design**

Application Security Model & Data Privacy Specification

Version 1.0 \| May 2025

# Document Overview

This Security and Privacy Design document defines the security
architecture, data privacy model, threat considerations, and protective
controls for the Budget Flow application across both the MVP local-only
phase and future premium cloud releases. It establishes the security
requirements that engineering must satisfy at every layer of the system
— on-device storage, data import processing, local backup handling, and
future API communication.

Budget Flow's security posture is shaped directly by its local-first
architecture. The MVP presents a fundamentally different threat surface
than a cloud-first application — the primary risks are on-device data
exposure and import processing misuse rather than server-side data
breach. This document addresses both the MVP reality and the future
premium surface in that order.

# Privacy Philosophy

Budget Flow is built on a privacy-first product philosophy that must be
reflected at every layer of the technical implementation. The core
privacy commitments are:

- User financial data belongs to the user — it is stored on their
  device, under their control, and never transmitted without their
  explicit consent

- No financial data is collected, aggregated, or analyzed by Budget Flow
  during MVP operation — there is no data pipeline, no analytics
  backend, and no telemetry that includes financial content

- The minimum data necessary is retained at every stage — imported
  statement data is stripped of sensitive identifiers immediately after
  recurring expense detection and the raw file is deleted

- Cloud features, when introduced, are fully opt-in — users who do not
  enable premium synchronization experience no change in their privacy
  posture

- Account creation is never required for core functionality — users who
  prefer complete local operation have no obligation to share any
  personal information with Budget Flow

# MVP Security Model

During the MVP phase, the Budget Flow threat surface is limited to the
user's device. There is no server, no network communication, and no
external data exposure path in the core application. The MVP security
model addresses four primary areas:

## 3.1 On-Device Data Storage

All financial data is stored in an SQLite database on the user's device.
The following controls apply to on-device data storage:

- The SQLite database file must be stored in the application's private
  data directory, inaccessible to other applications on the device under
  normal operating conditions

- On devices where the operating system supports it — iOS and modern
  Android — the application's private data directory is protected by the
  platform's application sandbox. Budget Flow relies on this sandbox as
  its primary storage protection mechanism during the MVP.

- The application must not write financial data to shared storage
  locations, external storage, temporary directories, or any path
  accessible to other applications

- Database file encryption at rest using SQLCipher or equivalent is
  noted as a recommended enhancement for a future security hardening
  release, particularly for devices where full-disk encryption is not
  guaranteed

## 3.2 CSV and PDF Import Processing

Statement import is the highest-risk operation in the MVP because it
involves reading externally sourced files that may contain sensitive
financial data beyond what the application requires. The following
controls govern import processing:

- All CSV and PDF processing must be performed entirely on-device — no
  file content, extracted data, or derived pattern information may be
  transmitted to any external service during the MVP phase

- The parser must extract only the fields required for recurring expense
  detection: merchant or payee name, transaction amount, transaction
  date, and estimated frequency. All other fields — including account
  numbers, routing numbers, full transaction descriptions containing
  personal identifiers, and balance figures — must be discarded during
  parsing and must never be written to the SQLite database

- The raw uploaded file must be deleted from device storage immediately
  upon completion of the parsing and detection step — it must not be
  retained in any temporary, cached, or application-accessible location
  after processing is complete

- Recurring expense suggestions derived from import parsing must require
  explicit user confirmation before any suggested item is written to the
  bills table — no item may be auto-activated

- The application must validate that uploaded files conform to expected
  CSV or PDF formats before processing begins, and must reject files
  that fail format validation with a clear user-facing error rather than
  attempting to parse potentially malformed or malicious content

## 3.3 Local Backup Files

Local backup export files contain a complete snapshot of the user's
financial data and must be treated with the same care as the primary
database. The following controls apply:

- Backup export files are written to the device's user-accessible
  storage at the user's direction — the user is explicitly informed that
  the backup file contains their complete financial data and should be
  stored securely

- The application must not automatically upload backup files to any
  cloud service, share them with other applications, or transmit them
  without the user's explicit action

- Backup files do not include account credentials, authentication
  tokens, or any data elements that would allow a third party to access
  the user's Budget Flow cloud account — they contain financial data
  only

- The restore operation must validate the backup file's structure and
  data integrity before applying it to the local database, rejecting
  malformed or corrupted backup files with a clear user-facing error

## 3.4 Input Validation

All user-provided input must be validated at the application layer
before being written to the SQLite database. The following validation
requirements apply across all financial entry points:

- Monetary amounts must be validated as positive numeric values within a
  reasonable practical range — negative amounts and implausibly large
  values must be rejected

- Date fields must be validated as valid calendar dates in the expected
  format — malformed date strings must be rejected before database write

- Text fields — including bill names, purchase descriptions, and display
  names — must be sanitized to prevent injection attacks, even though
  the MVP operates entirely locally

- Enum fields — such as bill_type, purchase state, and sync_status —
  must be validated against their defined value sets before persistence

# Future Premium Security Model

When optional premium cloud synchronization is introduced, the security
surface expands to include network communication, server-side data
storage, and account authentication. The following controls define the
security requirements for the premium tier.

## 4.1 Transport Security

All communication between the Budget Flow mobile application and the
Spring Boot API must be protected by the following transport-layer
controls:

- HTTPS with TLS 1.2 or higher is required for all API communication —
  plaintext HTTP connections must be rejected by both client and server

- Certificate pinning is recommended for the mobile application to
  protect against man-in-the-middle attacks on compromised network
  infrastructure — this is particularly important given that the
  application handles personal financial data

- The mobile application must validate the server's TLS certificate
  against the expected certificate or public key pin on every connection
  — connections to servers presenting unexpected certificates must be
  terminated

## 4.2 Authentication and Session Management

Premium account authentication must implement the following controls:

- Passwords must be hashed server-side using bcrypt with a minimum cost
  factor of 12 before storage — plaintext or weakly hashed passwords
  must never be persisted

- JWT access tokens must be short-lived with a maximum expiry of 60
  minutes — refresh tokens must expire after no more than 30 days of
  inactivity

- Refresh tokens must be stored securely on the device using the
  platform's secure credential storage — iOS Keychain or Android
  Keystore — not in plain application storage

- JWT tokens must be signed using RS256 or ES256 asymmetric algorithms —
  symmetric HMAC signing is not acceptable for production use

- The API must implement token revocation on logout by maintaining a
  server-side refresh token denylist or equivalent mechanism

- Failed authentication attempts must be rate-limited per IP address to
  mitigate credential stuffing attacks

## 4.3 Server-Side Data Protection

Financial data persisted to PostgreSQL in the premium tier must be
protected by the following controls:

- The PostgreSQL database must not be directly accessible from the
  public internet — all database access must be mediated exclusively
  through the Spring Boot API service

- Database credentials must be managed through environment variables or
  a secrets management service — credentials must never be hardcoded in
  application source code or configuration files committed to version
  control

- Database connections must use TLS encryption in transit between the
  Spring Boot service and the PostgreSQL instance

- Row-level access controls must ensure that API queries are always
  scoped to the authenticated user's user_id — cross-user data access
  must be architecturally impossible

## 4.4 API Security Controls

The Spring Boot REST API must implement the following security controls:

- All endpoints except /v1/auth/register and /v1/auth/login must require
  a valid JWT — unauthenticated requests must be rejected with HTTP 401

- Rate limiting must be applied to all endpoints as defined in the API
  Specification Document, with particular emphasis on authentication
  endpoints to prevent brute-force attacks

- Request body size limits must be enforced to prevent denial-of-service
  attacks via excessively large payloads — sync push requests are
  subject to the 500-record batch limit defined in the API specification

- The API must validate that all resource access requests reference
  entities belonging to the authenticated user — requests referencing
  another user's entity IDs must be rejected with HTTP 404 rather than
  HTTP 403 to avoid confirming the existence of another user's data

- Security-relevant HTTP response headers must be set on all API
  responses, including Strict-Transport-Security,
  X-Content-Type-Options, X-Frame-Options, and Content-Security-Policy

## 4.5 Cloud Backup Security

Cloud backup storage must implement the following protective controls:

- Cloud backup files must be stored encrypted at rest using AES-256 or
  equivalent — the encryption key must be derived from the user's
  account credentials or a separately managed key, not stored alongside
  the backup data

- Backup access must be restricted to the authenticated owner account —
  no cross-account backup access is permitted under any circumstances

- Backup upload and download endpoints must enforce the authentication
  and rate limiting controls defined in the API Specification Document

# Data Retention and Deletion

The following data retention and deletion policies apply across both MVP
and premium tiers:

| **Data Type** | **Retention Policy** |
|----|----|
| On-device SQLite data | Retained indefinitely on the user's device. Deleted only by the user through the application's data clearing function or by uninstalling the application. |
| Imported CSV/PDF files | Deleted immediately from device storage after recurring expense detection is complete. No retention period. |
| Local backup files | Retained in user-accessible storage until explicitly deleted by the user. The application does not manage local backup file lifecycle after export. |
| Premium cloud data | Retained for the duration of the user's premium account. Permanently deleted within 30 days of account deletion. Users may request immediate deletion. |
| Cloud backup snapshots | The 10 most recent snapshots are retained. Older snapshots are automatically removed on a rolling basis. |
| Authentication logs | Retained for 90 days for security monitoring purposes. Not linked to financial data. |

# Incident Response Considerations

The following considerations apply in the event of a security incident
affecting Budget Flow systems:

- A device-level security incident — such as device theft or loss —
  affects only the data on that specific device. Users should be advised
  to use device-level encryption and screen lock as the primary
  protection against physical device compromise.

- A cloud-tier security incident affecting premium user data must
  trigger immediate notification to affected users, refresh token
  revocation for all affected accounts, and a thorough investigation
  before service restoration.

- Because financial data is stored locally and not transmitted during
  MVP operation, a server-side incident during the MVP phase does not
  expose financial data — only account credentials would be at risk if
  the authentication service were compromised.

# Security Engineering Principles

The following principles summarize the security engineering values that
must be maintained across all Budget Flow development phases:

- Least privilege — the application requests only the device permissions
  it requires; the API enforces per-user data scoping at every query

- Defense in depth — multiple protective layers are applied at each tier
  rather than relying on any single control

- Privacy by default — the most private configuration is the default;
  users must opt in to data sharing, not opt out

- Fail secure — when a security control fails or a validation check
  cannot be completed, the system rejects the operation rather than
  proceeding with unvalidated data

- Minimal data collection — only the data required for the application's
  stated financial awareness purpose is collected and retained

- Transparency — security-relevant behaviors, particularly around import
  data handling and backup content, are clearly communicated to the user
  in plain language
