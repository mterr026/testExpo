# Budget Flow — Development Tooling Setup

## Purpose

This document tracks the setup of core development tooling for the Budget Flow mobile application.

The goal is to enforce consistent formatting, catch code quality issues early, run automated tests, and prepare the project for CI validation before major feature development begins.

## Tools Being Configured

- ESLint — code quality and rule enforcement
- Prettier — automatic code formatting
- Jest — automated unit testing
- GitHub Actions — CI pipeline for automated checks on push and pull request

## Engineering Rationale

Budget Flow handles financial calculations, so correctness and consistency are higher priorities than speed of feature development.

These tools support:
- consistent code style
- early bug detection
- repeatable automated testing
- safer changes to financial logic
- professional team-style development workflow

## Status

- React Native initialized
- Jest scaffolded by React Native
- ESLint configuration pending
- Prettier configuration pending
- GitHub Actions CI pending

## Completed Configuration

### ESLint

Verified ESLint configuration provided by the React Native template.

Purpose:
- enforce TypeScript/React Native best practices
- identify code quality issues early
- maintain consistent development standards

Validation:
- `npm run lint`

Status:
- operational

---

### Prettier

Configured Prettier for automatic formatting consistency.

Rules:
- single quotes
- trailing commas
- semicolons enabled
- 100 character print width

Files excluded:
- ios/Pods
- node_modules
- vendor
- build artifacts

Validation:
- `npm run format:check`

Formatting:
- `npm run format`

Status:
- operational

---

### Jest

Verified Jest test runner scaffolded by React Native.

Purpose:
- protect financial engine logic
- support deterministic calculation testing
- prevent regressions during refactoring

Validation:
- `npm test`

Status:
- operational
