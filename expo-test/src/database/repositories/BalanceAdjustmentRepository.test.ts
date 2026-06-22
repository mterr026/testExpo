import { describe, expect, it } from "vitest";

import { BalanceAdjustmentRepository } from "./BalanceAdjustmentRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const adjustmentRow = {
  id: "adjustment-1",
  profile_id: "profile-1",
  previous_balance_cents: 100000,
  adjusted_balance_cents: 95000,
  delta_cents: -5000,
  reason: "Correction",
  created_at: "2026-06-01T12:00:00.000Z",
  deleted_at: null,
  sync_status: "local",
} as const;

describe("BalanceAdjustmentRepository", () => {
  it("findById_maps_active_adjustment_row", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(adjustmentRow);
    const repo = new BalanceAdjustmentRepository(db);

    await expect(repo.findById("adjustment-1")).resolves.toEqual({
      id: "adjustment-1",
      profileId: "profile-1",
      previousBalanceCents: 100000,
      adjustedBalanceCents: 95000,
      deltaCents: -5000,
      reason: "Correction",
      createdAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.getFirstCalls[0].source).toContain("deleted_at IS NULL");
    expect(db.getFirstCalls[0].params).toEqual(["adjustment-1"]);
  });

  it("findAll_returns_profile_adjustments_newest_first", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([
      adjustmentRow,
      { ...adjustmentRow, id: "adjustment-2" },
    ]);
    const repo = new BalanceAdjustmentRepository(db);

    const adjustments = await repo.findAll("profile-1");

    expect(adjustments.map((adjustment) => adjustment.id)).toEqual([
      "adjustment-1",
      "adjustment-2",
    ]);
    expect(db.getAllCalls[0].source).toContain("ORDER BY created_at DESC");
    expect(db.getAllCalls[0].params).toEqual(["profile-1"]);
  });

  it("create_inserts_adjustment_and_sync_queue_entry_in_one_transaction", async () => {
    const db = new FakeDatabase();
    const repo = new BalanceAdjustmentRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const adjustment = await repo.create({
      profileId: "profile-1",
      previousBalanceCents: 100000,
      adjustedBalanceCents: 95000,
      reason: " Correction ",
    });

    expect(adjustment).toEqual({
      id: "id-1",
      profileId: "profile-1",
      previousBalanceCents: 100000,
      adjustedBalanceCents: 95000,
      deltaCents: -5000,
      reason: "Correction",
      createdAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.transactionCount).toBe(1);
    expect(db.runCalls[0].source).toContain(
      "INSERT INTO balance_adjustments"
    );
    expect(db.runCalls[0].params).toEqual([
      "id-1",
      "profile-1",
      100000,
      95000,
      -5000,
      "Correction",
      "2026-06-01T12:00:00.000Z",
      null,
      "local",
    ]);
    expect(db.runCalls[1].source).toContain("INSERT INTO sync_queue");
    expect(db.runCalls[1].params?.[2]).toBe("balance_adjustment");
    expect(db.runCalls[1].params?.[4]).toBe("create");
  });

  it("create_allows_positive_delta_and_normalizes_empty_reason", async () => {
    const db = new FakeDatabase();
    const repo = new BalanceAdjustmentRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const adjustment = await repo.create({
      profileId: "profile-1",
      previousBalanceCents: 100000,
      adjustedBalanceCents: 101500,
      reason: " ",
    });

    expect(adjustment.deltaCents).toBe(1500);
    expect(adjustment.reason).toBeNull();
  });

  it("softDelete_sets_deleted_at_and_writes_delete_sync_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(adjustmentRow);
    const repo = new BalanceAdjustmentRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    await repo.softDelete("adjustment-1");

    expect(db.runCalls[0].source).toContain("SET deleted_at = ?");
    expect(db.runCalls[0].params).toEqual([
      "2026-06-01T12:00:00.000Z",
      "adjustment-1",
    ]);
    expect(db.runCalls[1].params?.[2]).toBe("balance_adjustment");
    expect(db.runCalls[1].params?.[4]).toBe("delete");
    expect(JSON.parse(String(db.runCalls[1].params?.[5]))).toEqual({
      entityId: "adjustment-1",
      deletedAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("rejects_invalid_adjustment_inputs", async () => {
    const repo = new BalanceAdjustmentRepository(new FakeDatabase());

    await expect(
      repo.create({
        profileId: "",
        previousBalanceCents: 100000,
        adjustedBalanceCents: 95000,
      })
    ).rejects.toThrow("Balance adjustment requires a profileId.");
    await expect(
      repo.create({
        profileId: "profile-1",
        previousBalanceCents: 100000.5,
        adjustedBalanceCents: 95000,
      })
    ).rejects.toThrow(
      "Balance adjustment previousBalanceCents must be an integer."
    );
    await expect(
      repo.create({
        profileId: "profile-1",
        previousBalanceCents: 100000,
        adjustedBalanceCents: 95000.5,
      })
    ).rejects.toThrow(
      "Balance adjustment adjustedBalanceCents must be an integer."
    );
  });

  it("softDelete_rejects_missing_adjustment", async () => {
    const repo = new BalanceAdjustmentRepository(new FakeDatabase());

    await expect(repo.softDelete("missing")).rejects.toThrow(
      "Balance adjustment missing not found."
    );
  });
});
