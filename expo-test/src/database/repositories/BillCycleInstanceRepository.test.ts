import { describe, expect, it } from "vitest";

import { BillCycleInstanceRepository } from "./BillCycleInstanceRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const instanceRow = {
  id: "instance-1",
  bill_id: "bill-1",
  paycheck_cycle_id: "paycheck-1",
  cycle_amount_cents: 150000,
  is_variable_confirmed: 0,
  is_paid: 0,
  paid_at: null,
  due_date: "2026-06-01",
  created_at: "2026-06-01T12:00:00.000Z",
  updated_at: "2026-06-01T12:00:00.000Z",
  deleted_at: null,
  sync_status: "local",
} as const;

describe("BillCycleInstanceRepository", () => {
  it("findById_maps_active_instance_row", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(instanceRow);
    const repo = new BillCycleInstanceRepository(db);

    await expect(repo.findById("instance-1")).resolves.toEqual({
      id: "instance-1",
      billId: "bill-1",
      paycheckCycleId: "paycheck-1",
      cycleAmountCents: 150000,
      isVariableConfirmed: false,
      isPaid: false,
      paidAt: null,
      dueDate: "2026-06-01",
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.getFirstCalls[0].source).toContain("deleted_at IS NULL");
    expect(db.getFirstCalls[0].params).toEqual(["instance-1"]);
  });

  it("findByCycle_returns_instances_ordered_by_due_date", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([
      instanceRow,
      { ...instanceRow, id: "instance-2", due_date: "2026-06-05" },
    ]);
    const repo = new BillCycleInstanceRepository(db);

    const instances = await repo.findByCycle("paycheck-1");

    expect(instances.map((instance) => instance.id)).toEqual([
      "instance-1",
      "instance-2",
    ]);
    expect(db.getAllCalls[0].source).toContain(
      "ORDER BY due_date ASC, created_at ASC"
    );
    expect(db.getAllCalls[0].params).toEqual(["paycheck-1"]);
  });

  it("findByProfile_returns_instances_for_bills_owned_by_profile", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([
      instanceRow,
      { ...instanceRow, id: "instance-2", due_date: "2026-06-05" },
    ]);
    const repo = new BillCycleInstanceRepository(db);

    const instances = await repo.findByProfile("profile-1");

    expect(instances.map((instance) => instance.id)).toEqual([
      "instance-1",
      "instance-2",
    ]);
    expect(db.getAllCalls[0].source).toContain("SELECT id FROM bills");
    expect(db.getAllCalls[0].source).toContain("profile_id = ?");
    expect(db.getAllCalls[0].params).toEqual(["profile-1"]);
  });

  it("findExisting_matches_bill_cycle_and_due_date", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(instanceRow);
    const repo = new BillCycleInstanceRepository(db);

    await expect(
      repo.findExisting("bill-1", "paycheck-1", "2026-06-01")
    ).resolves.toEqual(expect.objectContaining({ id: "instance-1" }));
    expect(db.getFirstCalls[0].params).toEqual([
      "bill-1",
      "paycheck-1",
      "2026-06-01",
    ]);
  });

  it("create_inserts_instance_and_sync_queue_entry_in_one_transaction", async () => {
    const db = new FakeDatabase();
    const repo = new BillCycleInstanceRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const instance = await repo.create(
      {
        billId: "bill-1",
        paycheckCycleId: "paycheck-1",
        cycleAmountCents: 150000,
        dueDate: "2026-06-01",
      },
      "profile-1"
    );

    expect(instance).toEqual({
      id: "id-1",
      billId: "bill-1",
      paycheckCycleId: "paycheck-1",
      cycleAmountCents: 150000,
      isVariableConfirmed: false,
      isPaid: false,
      paidAt: null,
      dueDate: "2026-06-01",
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.transactionCount).toBe(1);
    expect(db.runCalls[0].source).toContain(
      "INSERT INTO bill_cycle_instances"
    );
    expect(db.runCalls[0].params).toEqual([
      "id-1",
      "bill-1",
      "paycheck-1",
      150000,
      0,
      0,
      null,
      "2026-06-01",
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      null,
      "local",
    ]);
    expect(db.runCalls[1].params?.[1]).toBe("profile-1");
    expect(db.runCalls[1].params?.[2]).toBe("bill_cycle_instance");
    expect(db.runCalls[1].params?.[4]).toBe("create");
  });

  it("update_merges_changes_and_writes_sync_queue_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(instanceRow);
    const repo = new BillCycleInstanceRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const updated = await repo.update(
      "instance-1",
      { cycleAmountCents: 155000, isVariableConfirmed: true },
      "profile-1"
    );

    expect(updated.cycleAmountCents).toBe(155000);
    expect(updated.isVariableConfirmed).toBe(true);
    expect(db.runCalls[0].source).toContain("UPDATE bill_cycle_instances");
    expect(db.runCalls[0].params).toEqual([
      155000,
      1,
      0,
      null,
      "2026-06-01",
      "2026-06-01T12:00:00.000Z",
      "instance-1",
    ]);
    expect(db.runCalls[1].params?.[4]).toBe("update");
  });

  it("markPaid_sets_paid_flag_and_timestamp", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(instanceRow);
    const repo = new BillCycleInstanceRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const paid = await repo.markPaid("instance-1", "profile-1");

    expect(paid.isPaid).toBe(true);
    expect(paid.paidAt).toBe("2026-06-01T12:00:00.000Z");
    expect(db.runCalls[0].params?.[2]).toBe(1);
    expect(db.runCalls[0].params?.[3]).toBe("2026-06-01T12:00:00.000Z");
  });

  it("markUnpaid_clears_paid_flag_and_timestamp", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push({
      ...instanceRow,
      is_paid: 1,
      paid_at: "2026-06-01T12:00:00.000Z",
    });
    const repo = new BillCycleInstanceRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const unpaid = await repo.markUnpaid("instance-1", "profile-1");

    expect(unpaid.isPaid).toBe(false);
    expect(unpaid.paidAt).toBeNull();
    expect(db.runCalls[0].params?.[2]).toBe(0);
    expect(db.runCalls[0].params?.[3]).toBeNull();
  });

  it("confirmVariableAmount_sets_amount_and_confirmation_flag", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(instanceRow);
    const repo = new BillCycleInstanceRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const confirmed = await repo.confirmVariableAmount(
      "instance-1",
      12345,
      "profile-1"
    );

    expect(confirmed.cycleAmountCents).toBe(12345);
    expect(confirmed.isVariableConfirmed).toBe(true);
    expect(db.runCalls[0].params?.[0]).toBe(12345);
    expect(db.runCalls[0].params?.[1]).toBe(1);
  });

  it("softDelete_sets_deleted_at_and_writes_delete_sync_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(instanceRow);
    const repo = new BillCycleInstanceRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    await repo.softDelete("instance-1", "profile-1");

    expect(db.runCalls[0].source).toContain("SET deleted_at = ?");
    expect(db.runCalls[0].params).toEqual([
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      "instance-1",
    ]);
    expect(db.runCalls[1].params?.[1]).toBe("profile-1");
    expect(db.runCalls[1].params?.[2]).toBe("bill_cycle_instance");
    expect(db.runCalls[1].params?.[4]).toBe("delete");
    expect(JSON.parse(String(db.runCalls[1].params?.[5]))).toEqual({
      entityId: "instance-1",
      deletedAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("rejects_invalid_instance_inputs", async () => {
    const repo = new BillCycleInstanceRepository(new FakeDatabase());

    await expect(
      repo.create(
        {
          billId: "",
          paycheckCycleId: "paycheck-1",
          cycleAmountCents: 1,
          dueDate: "2026-06-01",
        },
        "profile-1"
      )
    ).rejects.toThrow("Bill cycle instance requires a billId.");
    await expect(
      repo.create(
        {
          billId: "bill-1",
          paycheckCycleId: "",
          cycleAmountCents: 1,
          dueDate: "2026-06-01",
        },
        "profile-1"
      )
    ).rejects.toThrow("Bill cycle instance requires a paycheckCycleId.");
    await expect(
      repo.create(
        {
          billId: "bill-1",
          paycheckCycleId: "paycheck-1",
          cycleAmountCents: -1,
          dueDate: "2026-06-01",
        },
        "profile-1"
      )
    ).rejects.toThrow("Bill cycle instance amount must be zero or greater.");
    await expect(
      repo.create(
        {
          billId: "bill-1",
          paycheckCycleId: "paycheck-1",
          cycleAmountCents: 1,
          dueDate: "06/01/2026",
        },
        "profile-1"
      )
    ).rejects.toThrow("Bill cycle instance dueDate must be an ISO date.");
  });

  it("update_and_soft_delete_reject_missing_instance", async () => {
    const repo = new BillCycleInstanceRepository(new FakeDatabase());

    await expect(
      repo.update("missing", { cycleAmountCents: 1 }, "profile-1")
    ).rejects.toThrow("Bill cycle instance missing not found.");
    await expect(repo.softDelete("missing", "profile-1")).rejects.toThrow(
      "Bill cycle instance missing not found."
    );
  });
});
