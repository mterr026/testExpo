# Budget Flow — SQLite Setup

## Purpose

This document tracks the setup of SQLite for the Budget Flow mobile application.

SQLite is the authoritative operational database for the MVP. The app must remain fully functional offline, with all financial data stored locally on the device.

## Library Selected

Selected library:

```text
expo-sqlite
```

Expo SDK 56 bundles `expo-sqlite` at `~56.0.4`. The library provides async SQLite access and persists the database across app restarts, matching the local-first MVP requirement.
