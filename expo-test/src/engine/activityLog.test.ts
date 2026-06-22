import { describe, expect, it } from "vitest";

import {
  activityLogEntityTypes,
  activityLogEventTypes,
  createActivityLogEntry,
  getExpectedActivityLogEntityType,
} from "./activityLog";

const schemaEventTypes = [
  "purchase_added",
  "purchase_updated",
  "purchase_deleted",
  "purchase_state_changed",
  "paycheck_confirmed",
  "paycheck_adjusted",
  "paycheck_added",
  "paycheck_deleted",
  "bill_added",
  "bill_updated",
  "bill_paused",
  "bill_resumed",
  "bill_deleted",
  "bill_paid",
  "variable_bill_confirmed",
  "balance_adjusted",
  "reserve_updated",
  "import_completed",
  "backup_exported",
  "backup_restored",
];

const schemaEntityTypes = [
  "purchase",
  "paycheck",
  "bill",
  "bill_instance",
  "balance",
  "import",
  "backup",
];

describe("activity log entry builder", () => {
  it("defines_the_complete_schema_event_and_entity_sets", () => {
    expect(activityLogEventTypes).toEqual(schemaEventTypes);
    expect(activityLogEntityTypes).toEqual(schemaEntityTypes);
  });

  it("creates_append_only_activity_log_entry_shape", () => {
    expect(
      createActivityLogEntry({
        profileId: "profile-1",
        eventType: "purchase_added",
        entityType: "purchase",
        entityId: "purchase-1",
        summary: " Added purchase: $12.00 ",
        idFactory: () => "activity-1",
        now: () => new Date("2026-06-01T12:00:00Z"),
      })
    ).toEqual({
      id: "activity-1",
      profileId: "profile-1",
      eventType: "purchase_added",
      entityType: "purchase",
      entityId: "purchase-1",
      summary: "Added purchase: $12.00",
      createdAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("normalizes_empty_summary_and_optional_system_entity_id", () => {
    expect(
      createActivityLogEntry({
        profileId: "profile-1",
        eventType: "backup_exported",
        entityType: "backup",
        summary: "   ",
        idFactory: () => "activity-2",
        now: () => new Date("2026-06-01T12:00:00Z"),
      })
    ).toMatchObject({
      entityId: null,
      summary: null,
    });
  });

  it("maps_every_event_type_to_the_expected_entity_type", () => {
    expect(
      Object.fromEntries(
        activityLogEventTypes.map((eventType) => [
          eventType,
          getExpectedActivityLogEntityType(eventType),
        ])
      )
    ).toEqual({
      purchase_added: "purchase",
      purchase_updated: "purchase",
      purchase_deleted: "purchase",
      purchase_state_changed: "purchase",
      paycheck_confirmed: "paycheck",
      paycheck_adjusted: "paycheck",
      paycheck_added: "paycheck",
      paycheck_deleted: "paycheck",
      bill_added: "bill",
      bill_updated: "bill",
      bill_paused: "bill",
      bill_resumed: "bill",
      bill_deleted: "bill",
      bill_paid: "bill_instance",
      variable_bill_confirmed: "bill_instance",
      balance_adjusted: "balance",
      reserve_updated: "balance",
      import_completed: "import",
      backup_exported: "backup",
      backup_restored: "backup",
    });
  });

  it("rejects_blank_profile_id", () => {
    expect(() =>
      createActivityLogEntry({
        profileId: "  ",
        eventType: "purchase_added",
        entityType: "purchase",
        entityId: "purchase-1",
        idFactory: () => "activity-1",
      })
    ).toThrow("Activity log entry requires a profileId.");
  });

  it("rejects_event_entity_mismatch", () => {
    expect(() =>
      createActivityLogEntry({
        profileId: "profile-1",
        eventType: "purchase_added",
        entityType: "bill",
        entityId: "purchase-1",
        idFactory: () => "activity-1",
      })
    ).toThrow("Activity event purchase_added must use entity type purchase.");
  });

  it("requires_entity_id_for_financial_entities", () => {
    expect(() =>
      createActivityLogEntry({
        profileId: "profile-1",
        eventType: "bill_paid",
        entityType: "bill_instance",
        entityId: "",
        idFactory: () => "activity-1",
      })
    ).toThrow("Activity entity bill_instance requires an entityId.");
  });

  it("uses_global_crypto_random_uuid_when_no_id_factory_is_provided", () => {
    expect(
      createActivityLogEntry({
        profileId: "profile-1",
        eventType: "import_completed",
        entityType: "import",
        now: () => new Date("2026-06-01T12:00:00Z"),
      }).id
    ).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
