import { describe, expect, it } from "vitest";

import { SyncQueueRepository } from "./SyncQueueRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

describe("SyncQueueRepository", () => {
  it("enqueue_writes_pending_sync_queue_row_with_serialized_payload", async () => {
    const db = new FakeDatabase();
    const repo = new SyncQueueRepository(
      db,
      createIncrementingIdFactory("queue"),
      fixedClock
    );

    const entry = await repo.enqueue({
      profileId: "profile-1",
      entityType: "profile",
      entityId: "profile-1",
      operation: "create",
      payload: { id: "profile-1", displayName: "Matt" },
    });

    expect(entry).toEqual({
      id: "queue-1",
      profileId: "profile-1",
      entityType: "profile",
      entityId: "profile-1",
      operation: "create",
      payloadJson: JSON.stringify({ id: "profile-1", displayName: "Matt" }),
      status: "pending",
      attemptCount: 0,
      lastAttemptAt: null,
      errorMessage: null,
      createdAt: "2026-06-01T12:00:00.000Z",
    });
    expect(db.runCalls).toHaveLength(1);
    expect(db.runCalls[0].source).toContain("INSERT INTO sync_queue");
    expect(db.runCalls[0].params).toEqual([
      "queue-1",
      "profile-1",
      "profile",
      "profile-1",
      "create",
      JSON.stringify({ id: "profile-1", displayName: "Matt" }),
      "pending",
      0,
      null,
      null,
      "2026-06-01T12:00:00.000Z",
    ]);
  });

  it("findPending_maps_rows_in_chronological_order_query", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([
      {
        id: "queue-1",
        profile_id: "profile-1",
        entity_type: "profile",
        entity_id: "profile-1",
        operation: "update",
        payload_json: "{\"id\":\"profile-1\"}",
        status: "pending",
        attempt_count: 0,
        last_attempt_at: null,
        error_message: null,
        created_at: "2026-06-01T12:00:00.000Z",
      },
    ]);
    const repo = new SyncQueueRepository(db);

    await expect(repo.findPending("profile-1")).resolves.toEqual([
      {
        id: "queue-1",
        profileId: "profile-1",
        entityType: "profile",
        entityId: "profile-1",
        operation: "update",
        payloadJson: "{\"id\":\"profile-1\"}",
        status: "pending",
        attemptCount: 0,
        lastAttemptAt: null,
        errorMessage: null,
        createdAt: "2026-06-01T12:00:00.000Z",
      },
    ]);
    expect(db.getAllCalls[0].source).toContain("ORDER BY created_at ASC");
    expect(db.getAllCalls[0].params).toEqual(["profile-1"]);
  });
});
