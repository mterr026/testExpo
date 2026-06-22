# Budget Flow Documentation

This folder is the working documentation set for Budget Flow. Markdown files
are the source of truth for day-to-day development. Matching `.docx` files are
kept as exported/reference copies when available.

Start here:

- `registry/DocumentRegistry.md` - document map, glossary, and lookup guide.
- `implementation/ImplementationGuide.md` - build order, architecture mapping,
  folder structure, and engineering rules.
- `architecture/SystemArchitectureV3.md` - local-first system architecture and
  future Spring Boot/PostgreSQL boundaries.
- `database/DatabaseDesignV2.md` - SQLite schema, sync-ready fields, and
  persistence rules.
- `requirements/FunctionalRequirements.md` - safe-to-spend, bills, purchases,
  paychecks, import, and notification behavior.
- `planning/SprintRoadmap.md` - sprint order and phase boundaries.

Development notes:

- MVP work stays phone-first and local-first.
- SQLite remains the source of truth until optional premium sync is introduced.
- Spring Boot and PostgreSQL are planned architecture, not active MVP runtime.
- Keep docs aligned with the current Expo app structure as implementation
  details evolve.
