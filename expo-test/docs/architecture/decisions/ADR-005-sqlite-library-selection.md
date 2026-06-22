# ADR-005: SQLite Library Selection

Status: Accepted

Date: May 2025

## Context

Budget Flow is an Expo SDK 56 app with a local-first MVP architecture. The
mobile app must store and calculate financial data on-device with no backend
dependency. Repository APIs are asynchronous so future sync work can compose
cleanly with local database calls.

## Decision

Use `expo-sqlite` for the MVP SQLite data layer.

## Rationale

- It is compatible with the current Expo SDK 56 app.
- Its async API matches the repository pattern used throughout the app.
- It supports the local-first architecture without introducing backend or sync
  runtime dependencies.
- It keeps the database layer ready for future Spring Boot/PostgreSQL sync
  without changing service signatures.

## Consequences

- Repositories remain async even though all MVP reads and writes are local.
- The financial engine remains pure TypeScript and does not import SQLite.
- Future sync should build around the existing repository/service boundaries
  instead of replacing them.
