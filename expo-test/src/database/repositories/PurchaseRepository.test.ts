import { describe, expect, it } from "vitest";

import { PurchaseRepository } from "./PurchaseRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const purchaseRow = {
  id: "purchase-1",
  profile_id: "profile-1",
  amount_cents: 1234,
  state: "pending",
  description: "Coffee",
  purchase_date: "2026-06-01",
  paycheck_cycle_id: "paycheck-1",
  resolved_at: null,
  created_at: "2026-06-01T12:00:00.000Z",
  updated_at: "2026-06-01T12:00:00.000Z",
  deleted_at: null,
  sync_status: "local",
} as const;

describe("PurchaseRepository", () => {
  it("findById_maps_active_purchase_row", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(purchaseRow);
    const repo = new PurchaseRepository(db);

    await expect(repo.findById("purchase-1")).resolves.toEqual({
      id: "purchase-1",
      profileId: "profile-1",
      amountCents: 1234,
      state: "pending",
      description: "Coffee",
      purchaseDate: "2026-06-01",
      paycheckCycleId: "paycheck-1",
      resolvedAt: null,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.getFirstCalls[0].source).toContain("deleted_at IS NULL");
    expect(db.getFirstCalls[0].params).toEqual(["purchase-1"]);
  });

  it("findAll_returns_profile_purchases_newest_first", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([
      purchaseRow,
      { ...purchaseRow, id: "purchase-2", purchase_date: "2026-05-30" },
    ]);
    const repo = new PurchaseRepository(db);

    const purchases = await repo.findAll("profile-1");

    expect(purchases.map((purchase) => purchase.id)).toEqual([
      "purchase-1",
      "purchase-2",
    ]);
    expect(db.getAllCalls[0].source).toContain(
      "ORDER BY purchase_date DESC, created_at DESC"
    );
    expect(db.getAllCalls[0].params).toEqual(["profile-1"]);
  });

  it("findByCycle_returns_cycle_purchases_newest_first", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([purchaseRow]);
    const repo = new PurchaseRepository(db);

    await expect(repo.findByCycle("paycheck-1")).resolves.toHaveLength(1);
    expect(db.getAllCalls[0].source).toContain("paycheck_cycle_id = ?");
    expect(db.getAllCalls[0].params).toEqual(["paycheck-1"]);
  });

  it("findPending_returns_profile_pending_purchases_oldest_first", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([purchaseRow]);
    const repo = new PurchaseRepository(db);

    await expect(repo.findPending("profile-1")).resolves.toHaveLength(1);
    expect(db.getAllCalls[0].source).toContain("state = 'pending'");
    expect(db.getAllCalls[0].source).toContain(
      "ORDER BY purchase_date ASC, created_at ASC"
    );
    expect(db.getAllCalls[0].params).toEqual(["profile-1"]);
  });

  it("create_inserts_purchase_and_sync_queue_entry_in_one_transaction", async () => {
    const db = new FakeDatabase();
    const repo = new PurchaseRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const purchase = await repo.create({
      profileId: "profile-1",
      amountCents: 1234,
      state: "pending",
      description: " Coffee ",
      purchaseDate: "2026-06-01",
      paycheckCycleId: "paycheck-1",
    });

    expect(purchase).toEqual({
      id: "id-1",
      profileId: "profile-1",
      amountCents: 1234,
      state: "pending",
      description: "Coffee",
      purchaseDate: "2026-06-01",
      paycheckCycleId: "paycheck-1",
      resolvedAt: null,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.transactionCount).toBe(1);
    expect(db.runCalls[0].source).toContain("INSERT INTO purchases");
    expect(db.runCalls[0].params).toEqual([
      "id-1",
      "profile-1",
      1234,
      "pending",
      "Coffee",
      "2026-06-01",
      "paycheck-1",
      null,
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      null,
      "local",
    ]);
    expect(db.runCalls[1].source).toContain("INSERT INTO sync_queue");
    expect(db.runCalls[1].params?.[2]).toBe("purchase");
    expect(db.runCalls[1].params?.[4]).toBe("create");
  });

  it("create_defaults_to_charged_and_normalizes_empty_description", async () => {
    const db = new FakeDatabase();
    const repo = new PurchaseRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const purchase = await repo.create({
      profileId: "profile-1",
      amountCents: 1234,
      description: " ",
      purchaseDate: "2026-06-01",
    });

    expect(purchase.state).toBe("charged");
    expect(purchase.description).toBeNull();
    expect(purchase.paycheckCycleId).toBeNull();
  });

  it("update_merges_changes_and_writes_sync_queue_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(purchaseRow);
    const repo = new PurchaseRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const updated = await repo.update("purchase-1", {
      amountCents: 2000,
      description: " Lunch ",
    });

    expect(updated.amountCents).toBe(2000);
    expect(updated.description).toBe("Lunch");
    expect(db.runCalls[0].source).toContain("UPDATE purchases");
    expect(db.runCalls[0].params).toEqual([
      2000,
      "pending",
      "Lunch",
      "2026-06-01",
      "paycheck-1",
      null,
      "2026-06-01T12:00:00.000Z",
      "purchase-1",
    ]);
    expect(db.runCalls[1].params?.[4]).toBe("update");
  });

  it("markCharged_sets_charged_state_and_resolved_timestamp", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(purchaseRow);
    const repo = new PurchaseRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const charged = await repo.markCharged("purchase-1");

    expect(charged.state).toBe("charged");
    expect(charged.resolvedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(db.runCalls[0].params?.[1]).toBe("charged");
    expect(db.runCalls[0].params?.[5]).toBe("2026-06-01T12:00:00.000Z");
  });

  it("markPending_sets_pending_state_and_clears_resolved_timestamp", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push({
      ...purchaseRow,
      state: "charged",
      resolved_at: "2026-06-01T12:00:00.000Z",
    });
    const repo = new PurchaseRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const pending = await repo.markPending("purchase-1");

    expect(pending.state).toBe("pending");
    expect(pending.resolvedAt).toBeNull();
    expect(db.runCalls[0].params?.[1]).toBe("pending");
    expect(db.runCalls[0].params?.[5]).toBeNull();
  });

  it("softDelete_sets_deleted_at_and_writes_delete_sync_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(purchaseRow);
    const repo = new PurchaseRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    await repo.softDelete("purchase-1");

    expect(db.runCalls[0].source).toContain("SET deleted_at = ?");
    expect(db.runCalls[0].params).toEqual([
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      "purchase-1",
    ]);
    expect(db.runCalls[1].params?.[2]).toBe("purchase");
    expect(db.runCalls[1].params?.[4]).toBe("delete");
    expect(JSON.parse(String(db.runCalls[1].params?.[5]))).toEqual({
      entityId: "purchase-1",
      deletedAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("rejects_invalid_purchase_inputs", async () => {
    const repo = new PurchaseRepository(new FakeDatabase());

    await expect(
      repo.create({
        profileId: "",
        amountCents: 1,
        purchaseDate: "2026-06-01",
      })
    ).rejects.toThrow("Purchase requires a profileId.");
    await expect(
      repo.create({
        profileId: "profile-1",
        amountCents: 0,
        purchaseDate: "2026-06-01",
      })
    ).rejects.toThrow("Purchase amountCents must be greater than zero.");
    await expect(
      repo.create({
        profileId: "profile-1",
        amountCents: 1,
        purchaseDate: "06/01/2026",
      })
    ).rejects.toThrow("Purchase purchaseDate must be an ISO date.");
  });

  it("update_and_soft_delete_reject_missing_purchase", async () => {
    const repo = new PurchaseRepository(new FakeDatabase());

    await expect(
      repo.update("missing", { description: "Nope" })
    ).rejects.toThrow("Purchase missing not found.");
    await expect(repo.softDelete("missing")).rejects.toThrow(
      "Purchase missing not found."
    );
  });
});
