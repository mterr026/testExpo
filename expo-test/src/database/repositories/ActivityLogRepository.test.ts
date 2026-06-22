import { describe, expect, it } from "vitest";

import { ActivityLogRepository } from "./ActivityLogRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const activityRow = {
  id: "activity-1",
  profile_id: "profile-1",
  event_type: "purchase_added",
  entity_type: "purchase",
  entity_id: "purchase-1",
  summary: "Added purchase: $12.34",
  created_at: "2026-06-01T12:00:00.000Z",
} as const;

describe("ActivityLogRepository", () => {
  it("findByProfileId_maps_activity_rows_newest_first_with_limit", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([
      activityRow,
      { ...activityRow, id: "activity-2", entity_id: "purchase-2" },
    ]);
    const repo = new ActivityLogRepository(db);

    const entries = await repo.findByProfileId("profile-1", 25);

    expect(entries).toEqual([
      {
        id: "activity-1",
        profileId: "profile-1",
        eventType: "purchase_added",
        entityType: "purchase",
        entityId: "purchase-1",
        summary: "Added purchase: $12.34",
        createdAt: "2026-06-01T12:00:00.000Z",
      },
      expect.objectContaining({ id: "activity-2", entityId: "purchase-2" }),
    ]);
    expect(db.getAllCalls[0].source).toContain("ORDER BY created_at DESC");
    expect(db.getAllCalls[0].source).toContain("LIMIT ?");
    expect(db.getAllCalls[0].params).toEqual(["profile-1", 25]);
  });

  it("findByProfileId_uses_default_limit", async () => {
    const db = new FakeDatabase();
    const repo = new ActivityLogRepository(db);

    await repo.findByProfileId("profile-1");

    expect(db.getAllCalls[0].params).toEqual(["profile-1", 100]);
  });

  it("create_inserts_local_only_activity_log_entry", async () => {
    const db = new FakeDatabase();
    const repo = new ActivityLogRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const entry = await repo.create({
      profileId: "profile-1",
      eventType: "purchase_added",
      entityType: "purchase",
      entityId: "purchase-1",
      summary: " Added purchase: $12.34 ",
    });

    expect(entry).toEqual({
      id: "id-1",
      profileId: "profile-1",
      eventType: "purchase_added",
      entityType: "purchase",
      entityId: "purchase-1",
      summary: "Added purchase: $12.34",
      createdAt: "2026-06-01T12:00:00.000Z",
    });
    expect(db.runCalls).toHaveLength(1);
    expect(db.runCalls[0].source).toContain("INSERT INTO activity_log");
    expect(db.runCalls[0].source).not.toContain("sync_queue");
    expect(db.runCalls[0].params).toEqual([
      "id-1",
      "profile-1",
      "purchase_added",
      "purchase",
      "purchase-1",
      "Added purchase: $12.34",
      "2026-06-01T12:00:00.000Z",
    ]);
  });

  it("create_allows_import_and_backup_events_without_entity_id", async () => {
    const db = new FakeDatabase();
    const repo = new ActivityLogRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const entry = await repo.create({
      profileId: "profile-1",
      eventType: "import_completed",
      entityType: "import",
    });

    expect(entry.entityId).toBeNull();
    expect(entry.summary).toBeNull();
    expect(db.runCalls[0].params?.[4]).toBeNull();
  });

  it("rejects_invalid_find_inputs", async () => {
    const repo = new ActivityLogRepository(new FakeDatabase());

    await expect(repo.findByProfileId("")).rejects.toThrow(
      "Activity log lookup requires a profileId."
    );
    await expect(repo.findByProfileId("profile-1", 0)).rejects.toThrow(
      "Activity log lookup limit must be greater than zero."
    );
  });

  it("rejects_invalid_activity_log_entries", async () => {
    const repo = new ActivityLogRepository(new FakeDatabase());

    await expect(
      repo.create({
        profileId: "",
        eventType: "purchase_added",
        entityType: "purchase",
        entityId: "purchase-1",
      })
    ).rejects.toThrow("Activity log entry requires a profileId.");
    await expect(
      repo.create({
        profileId: "profile-1",
        eventType: "purchase_added",
        entityType: "bill",
        entityId: "bill-1",
      })
    ).rejects.toThrow(
      "Activity event purchase_added must use entity type purchase."
    );
    await expect(
      repo.create({
        profileId: "profile-1",
        eventType: "purchase_added",
        entityType: "purchase",
      })
    ).rejects.toThrow("Activity entity purchase requires an entityId.");
  });
});
