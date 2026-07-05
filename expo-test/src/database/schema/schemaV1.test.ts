import { describe, expect, it } from "vitest";

import { DATABASE_VERSION, schemaV1, schemaV2, schemaV3, schemaV4, schemaV5, schemaV6, schemaV7, schemaV8, schemaV9 } from "./schemaV1";

const expectedTables = [
  "profiles",
  "paychecks",
  "bills",
  "bill_cycle_instances",
  "purchases",
  "balance_adjustments",
  "activity_log",
  "notification_settings",
  "budgeting_preferences",
  "envelopes",
  "import_suggestions",
  "backup_metadata",
  "sync_queue",
];

describe("database schema contract", () => {
  it("tracks_the_latest_schema_version", () => {
    expect(DATABASE_VERSION).toBe(9);
  });

  it("creates_all_sprint_1_tables", () => {
    for (const table of expectedTables) {
      expect(schemaV1).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it("enforces_core_financial_invariants", () => {
    expect(schemaV1).toContain(
      "essential_reserve INTEGER NOT NULL DEFAULT 0 CHECK (essential_reserve >= 0)"
    );
    expect(schemaV1).toContain(
      "amount_cents INTEGER NOT NULL CHECK (amount_cents > 0)"
    );
    expect(schemaV1).toContain(
      "cycle_amount_cents INTEGER NOT NULL CHECK (cycle_amount_cents >= 0)"
    );
    expect(schemaV1).toContain(
      "state TEXT NOT NULL DEFAULT 'charged' CHECK (state IN ('charged', 'pending'))"
    );
    expect(schemaV1).toContain(
      "sync_status TEXT NOT NULL DEFAULT 'local' CHECK (sync_status IN ('local', 'pending', 'synced'))"
    );
  });

  it("declares_expected_foreign_keys_for_financial_entities", () => {
    expect(schemaV1).toContain("profile_id TEXT NOT NULL REFERENCES profiles(id)");
    expect(schemaV1).toContain("bill_id TEXT NOT NULL REFERENCES bills(id)");
    expect(schemaV1).toContain(
      "paycheck_cycle_id TEXT NOT NULL REFERENCES paychecks(id)"
    );
    expect(schemaV1).toContain("paycheck_cycle_id TEXT REFERENCES paychecks(id)");
  });

  it("configures_indexes_for_cycle_lookup_and_sync_queue", () => {
    expect(schemaV1).toContain("idx_paychecks_profile_date");
    expect(schemaV1).toContain("idx_bill_instances_cycle");
    expect(schemaV1).toContain("idx_purchases_pending");
    expect(schemaV1).toContain("idx_sync_queue_pending");
  });

  it("does_not_change_journal_mode_inside_transactional_schema", () => {
    expect(schemaV1).not.toContain("journal_mode");
  });

  it("enforces_active_bill_instance_uniqueness_in_v2", () => {
    const uniquenessIndex =
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_bill_instances_uniqueness ON bill_cycle_instances(bill_id, paycheck_cycle_id, due_date) WHERE deleted_at IS NULL;";

    expect(schemaV2.trim()).toBe(uniquenessIndex);
    expect(schemaV1).toContain(uniquenessIndex);
  });

  it("adds_import_suggestion_kind_and_date_in_v3", () => {
    expect(schemaV3).toContain("ADD COLUMN suggestion_kind");
    expect(schemaV3).toContain("ADD COLUMN suggested_date");
    expect(schemaV1).toContain(
      "suggestion_kind TEXT NOT NULL DEFAULT 'bill' CHECK (suggestion_kind IN ('bill', 'income'))"
    );
    expect(schemaV1).toContain("suggested_date TEXT");
  });

  it("adds_opening_balance_cents_in_v4", () => {
    expect(schemaV4).toContain("ADD COLUMN opening_balance_cents");
    expect(schemaV1).toContain(
      "opening_balance_cents INTEGER NOT NULL DEFAULT 0"
    );
  });

  it("adds_is_primary_in_v5", () => {
    expect(schemaV5).toContain("ADD COLUMN is_primary");
    expect(schemaV1).toContain(
      "is_primary INTEGER NOT NULL DEFAULT 1 CHECK (is_primary IN (0, 1))"
    );
  });

  it("adds_tutorial_complete_in_v6", () => {
    expect(schemaV6).toContain("ADD COLUMN tutorial_complete");
    expect(schemaV6).toContain(
      "UPDATE profiles SET tutorial_complete = 1 WHERE onboarding_complete = 1"
    );
    expect(schemaV1).toContain(
      "tutorial_complete INTEGER NOT NULL DEFAULT 0 CHECK (tutorial_complete IN (0, 1))"
    );
  });

  it("adds_opening_balance_as_of_date_in_v7", () => {
    expect(schemaV7).toContain("ADD COLUMN opening_balance_as_of_date");
    expect(schemaV1).toContain("opening_balance_as_of_date TEXT");
  });

  it("backfills_opening_balance_anchor_timestamps_in_v8", () => {
    expect(schemaV8).toContain("length(opening_balance_as_of_date) = 10");
  });

  it("adds_envelope_budgeting_tables_and_purchase_assignment_in_v9", () => {
    expect(schemaV9).toContain("CREATE TABLE IF NOT EXISTS budgeting_preferences");
    expect(schemaV9).toContain("CREATE TABLE IF NOT EXISTS envelopes");
    expect(schemaV9).toContain("ALTER TABLE purchases ADD COLUMN envelope_id");
    expect(schemaV9).toContain("'budgeting_preferences', 'envelope'");
    expect(schemaV1).toContain(
      "envelopes_enabled INTEGER NOT NULL DEFAULT 0 CHECK (envelopes_enabled IN (0, 1))"
    );
    expect(schemaV1).toContain("envelope_id TEXT REFERENCES envelopes(id)");
    expect(schemaV1).toContain("idx_envelopes_profile");
    expect(schemaV1).toContain("idx_purchases_envelope");
  });
});
