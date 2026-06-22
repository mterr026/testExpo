import { describe, expect, it } from "vitest";

import { PaycheckRepository } from "./PaycheckRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const paycheckRow = {
  id: "paycheck-1",
  profile_id: "profile-1",
  label: "Primary",
  amount_cents: 200000,
  expected_date: "2026-06-01",
  is_received: 0,
  received_at: null,
  is_recurring: 1,
  recurrence_interval: "biweekly",
  is_primary: 1,
  notes: "Main job",
  created_at: "2026-06-01T12:00:00.000Z",
  updated_at: "2026-06-01T12:00:00.000Z",
  deleted_at: null,
  sync_status: "local",
};

describe("PaycheckRepository", () => {
  it("findById_maps_active_paycheck_row", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(paycheckRow);
    const repo = new PaycheckRepository(db);

    await expect(repo.findById("paycheck-1")).resolves.toEqual({
      id: "paycheck-1",
      profileId: "profile-1",
      label: "Primary",
      amountCents: 200000,
      expectedDate: "2026-06-01",
      isReceived: false,
      receivedAt: null,
      isRecurring: true,
      recurrenceInterval: "biweekly",
      isPrimary: true,
      notes: "Main job",
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.getFirstCalls[0].source).toContain("deleted_at IS NULL");
    expect(db.getFirstCalls[0].params).toEqual(["paycheck-1"]);
  });

  it("findAll_returns_profile_paychecks_ordered_by_expected_date", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([
      paycheckRow,
      {
        ...paycheckRow,
        id: "paycheck-2",
        expected_date: "2026-06-15",
      },
    ]);
    const repo = new PaycheckRepository(db);

    const paychecks = await repo.findAll("profile-1");

    expect(paychecks.map((paycheck) => paycheck.id)).toEqual([
      "paycheck-1",
      "paycheck-2",
    ]);
    expect(db.getAllCalls[0].source).toContain(
      "ORDER BY expected_date ASC, created_at ASC"
    );
    expect(db.getAllCalls[0].params).toEqual(["profile-1"]);
  });

  it("create_inserts_paycheck_and_sync_queue_entry_in_one_transaction", async () => {
    const db = new FakeDatabase();
    const repo = new PaycheckRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const paycheck = await repo.create({
      profileId: "profile-1",
      label: "Primary",
      amountCents: 200000,
      expectedDate: "2026-06-01",
      isRecurring: true,
      recurrenceInterval: "biweekly",
      isPrimary: true,
      notes: "Main job",
    });

    expect(paycheck).toEqual({
      id: "id-1",
      profileId: "profile-1",
      label: "Primary",
      amountCents: 200000,
      expectedDate: "2026-06-01",
      isReceived: false,
      receivedAt: null,
      isRecurring: true,
      recurrenceInterval: "biweekly",
      isPrimary: true,
      notes: "Main job",
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.transactionCount).toBe(1);
    expect(db.runCalls[0].source).toContain("INSERT INTO paychecks");
    expect(db.runCalls[0].params).toEqual([
      "id-1",
      "profile-1",
      "Primary",
      200000,
      "2026-06-01",
      0,
      null,
      1,
      "biweekly",
      1,
      "Main job",
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      null,
      "local",
    ]);
    expect(db.runCalls[1].source).toContain("INSERT INTO sync_queue");
    expect(db.runCalls[1].params?.[2]).toBe("paycheck");
    expect(db.runCalls[1].params?.[4]).toBe("create");
  });

  it("update_merges_changes_and_writes_sync_queue_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(paycheckRow);
    const repo = new PaycheckRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const updated = await repo.update("paycheck-1", {
      amountCents: 210000,
      notes: "Updated",
    });

    expect(updated.amountCents).toBe(210000);
    expect(updated.notes).toBe("Updated");
    expect(db.runCalls[0].source).toContain("UPDATE paychecks");
    expect(db.runCalls[0].params).toEqual([
      "Primary",
      210000,
      "2026-06-01",
      0,
      null,
      1,
      "biweekly",
      1,
      "Updated",
      "2026-06-01T12:00:00.000Z",
      "paycheck-1",
    ]);
    expect(db.runCalls[1].params?.[4]).toBe("update");
  });

  it("markReceived_sets_received_flag_and_timestamp", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(paycheckRow);
    const repo = new PaycheckRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const received = await repo.markReceived("paycheck-1");

    expect(received.isReceived).toBe(true);
    expect(received.receivedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(db.runCalls[0].params?.[3]).toBe(1);
    expect(db.runCalls[0].params?.[4]).toBe("2026-06-01T12:00:00.000Z");
  });

  it("markUnreceived_clears_received_flag_and_timestamp", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push({
      ...paycheckRow,
      is_received: 1,
      received_at: "2026-06-01T12:00:00.000Z",
    });
    const repo = new PaycheckRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const unreceived = await repo.markUnreceived("paycheck-1");

    expect(unreceived.isReceived).toBe(false);
    expect(unreceived.receivedAt).toBeNull();
    expect(db.runCalls[0].params?.[3]).toBe(0);
    expect(db.runCalls[0].params?.[4]).toBeNull();
  });

  it("softDelete_sets_deleted_at_and_writes_delete_sync_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(paycheckRow);
    const repo = new PaycheckRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    await repo.softDelete("paycheck-1");

    expect(db.runCalls[0].source).toContain("SET deleted_at = ?");
    expect(db.runCalls[0].params).toEqual([
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      "paycheck-1",
    ]);
    expect(db.runCalls[1].params?.[2]).toBe("paycheck");
    expect(db.runCalls[1].params?.[4]).toBe("delete");
    expect(JSON.parse(String(db.runCalls[1].params?.[5]))).toEqual({
      entityId: "paycheck-1",
      deletedAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("rejects_invalid_paycheck_inputs", async () => {
    const repo = new PaycheckRepository(new FakeDatabase());

    await expect(
      repo.create({
        profileId: "",
        amountCents: 1,
        expectedDate: "2026-06-01",
      })
    ).rejects.toThrow("Paycheck requires a profileId.");
    await expect(
      repo.create({
        profileId: "profile-1",
        amountCents: 0,
        expectedDate: "2026-06-01",
      })
    ).rejects.toThrow("Paycheck amountCents must be greater than zero.");
    await expect(
      repo.create({
        profileId: "profile-1",
        amountCents: 1,
        expectedDate: "06/01/2026",
      })
    ).rejects.toThrow("Paycheck expectedDate must be an ISO date.");
  });

  it("enforces_recurring_interval_shape", async () => {
    const repo = new PaycheckRepository(new FakeDatabase());

    await expect(
      repo.create({
        profileId: "profile-1",
        amountCents: 1,
        expectedDate: "2026-06-01",
        isRecurring: true,
      })
    ).rejects.toThrow("Recurring paychecks require a recurrenceInterval.");
    await expect(
      repo.create({
        profileId: "profile-1",
        amountCents: 1,
        expectedDate: "2026-06-01",
        recurrenceInterval: "weekly",
      })
    ).rejects.toThrow("Non-recurring paychecks cannot define a recurrenceInterval.");
  });

  it("update_and_soft_delete_reject_missing_paycheck", async () => {
    const repo = new PaycheckRepository(new FakeDatabase());

    await expect(repo.update("missing", { notes: "Nope" })).rejects.toThrow(
      "Paycheck missing not found."
    );
    await expect(repo.softDelete("missing")).rejects.toThrow(
      "Paycheck missing not found."
    );
  });
});
