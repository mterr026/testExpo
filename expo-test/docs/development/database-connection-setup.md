# Budget Flow — Database Connection Setup

## Purpose

This document tracks the implementation of the Budget Flow SQLite connection layer.

## SQLite Library

Budget Flow uses:

- `expo-sqlite`

This matches the Expo SDK 56 dependency in `package.json` and the async connection layer in `src/database/connection.ts`.

## Architecture Rules

- SQLite access must stay inside `src/database`
- UI components must never call SQLite directly
- repositories expose async functions
- services call repositories
- the financial engine remains pure TypeScript with no database access

## Initial Database Foundation

Planned files:

```text
mobile/src/database/
├── connection/
│   └── database.ts
├── migrations/
│   └── migrationRunner.ts
├── schema/
│   └── schemaVersion.ts
└── repositories/
