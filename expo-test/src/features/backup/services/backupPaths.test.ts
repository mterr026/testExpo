import { describe, expect, it } from "vitest";

import { createBackupFileName } from "./backupPaths";

describe("createBackupFileName", () => {
  it("uses_a_human_readable_budget_flow_backup_name", () => {
    expect(createBackupFileName("2026-06-19T12:00:00.000Z")).toBe(
      "Budget Flow Backup 2026-06-19 1200.json"
    );
  });
});
