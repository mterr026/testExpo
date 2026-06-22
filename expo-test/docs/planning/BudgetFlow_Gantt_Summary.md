# Budget Flow Gantt Summary

## Purpose

This document summarizes the high-level development roadmap for the Budget Flow MVP and future premium architecture phases.

The project is designed for a two-person independent development team following a local-first architecture philosophy.

---

# MVP Development Phases

## Sprint 1 — Project Setup & Data Foundation

### Goals
- Initialize React Native project
- Configure repository structure
- Integrate SQLite
- Create initial schema
- Create repository layer foundation

### Major Deliverables
- SQLite database initialization
- Core tables created
- UUID strategy implemented
- Monetary fixed-decimal storage implemented
- Local profile structure completed

---

## Sprint 2 — Core Financial Logic

### Goals
- Build financial calculation engine
- Implement Safe-to-Spend logic
- Implement paycheck cycle calculations
- Implement recurring bill generation

### Major Deliverables
- Safe-to-Spend calculation service
- Bill cycle instance generation
- Financial engine validation
- Repository/service interaction layer

---

## Sprint 3 — Navigation & Dashboard

### Goals
- Build navigation shell
- Create dashboard UI
- Connect financial engine to dashboard rendering

### Major Deliverables
- Main dashboard screen
- Running balance visualization
- Safe-to-Spend display
- Paycheck cycle overview

---

## Sprint 4 — Purchases & Bills

### Goals
- Implement purchases workflows
- Implement bills workflows
- Connect bill generation engine

### Major Deliverables
- Purchases CRUD
- Bills CRUD
- Variable bill handling
- Bill cycle linking

---

## Sprint 5 — Paychecks & Import

### Goals
- Implement paycheck workflows
- Implement CSV/PDF import processing

### Major Deliverables
- Paycheck management
- Import parser pipeline
- Recurring transaction detection assistance

---

## Sprint 6 — Backup, Settings & Notifications

### Goals
- Backup and restore
- User preferences
- Notification configuration

### Major Deliverables
- Local backup export/import
- Variable bill notifications
- Settings management

---

# Beta Polish Phase

### Goals
- QA hardening
- UI polish
- performance optimization
- testing validation

---

# Future Premium Phase

## Planned Features

- Spring Boot backend
- PostgreSQL sync mirror
- Optional account system
- Multi-device sync
- /v1/sync/push
- /v1/sync/pull
- Backend financial rule parity
- Optional web support

---

# Architecture Principles

- Local-first
- Offline-first
- SQLite authoritative during MVP
- Shared financial logic architecture
- Modular monolith design
- Calm/simple financial UX
- No category-based budgeting
- No backend dependency during MVP
