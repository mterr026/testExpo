import { describe, expect, it } from "vitest";

import { BillRepository } from "./BillRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const billRow = {
  id: "bill-1",
  profile_id: "profile-1",
  name: "Rent",
  bill_type: "fixed",
  default_amount_cents: 150000,
  recurrence_interval: "monthly",
  custom_interval_days: null,
  due_day_of_cycle: 1,
  due_date_absolute: null,
  end_date: null,
  is_paused: 0,
  created_at: "2026-06-01T12:00:00.000Z",
  updated_at: "2026-06-01T12:00:00.000Z",
  deleted_at: null,
  sync_status: "local",
} as const;

describe("BillRepository", () => {
  it("findById_maps_active_bill_row", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(billRow);
    const repo = new BillRepository(db);

    await expect(repo.findById("bill-1")).resolves.toEqual({
      id: "bill-1",
      profileId: "profile-1",
      name: "Rent",
      billType: "fixed",
      defaultAmountCents: 150000,
      recurrenceInterval: "monthly",
      customIntervalDays: null,
      dueDayOfCycle: 1,
      dueDateAbsolute: null,
      endDate: null,
      isPaused: false,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.getFirstCalls[0].source).toContain("deleted_at IS NULL");
    expect(db.getFirstCalls[0].params).toEqual(["bill-1"]);
  });

  it("findAll_returns_profile_bills_ordered_by_name", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([
      billRow,
      { ...billRow, id: "bill-2", name: "Utilities" },
    ]);
    const repo = new BillRepository(db);

    const bills = await repo.findAll("profile-1");

    expect(bills.map((bill) => bill.id)).toEqual(["bill-1", "bill-2"]);
    expect(db.getAllCalls[0].source).toContain(
      "ORDER BY name ASC, created_at ASC"
    );
    expect(db.getAllCalls[0].params).toEqual(["profile-1"]);
  });

  it("findActiveForCycle_excludes_paused_deleted_and_ended_bills", async () => {
    const db = new FakeDatabase();
    db.getAllRows.push([billRow]);
    const repo = new BillRepository(db);

    await expect(
      repo.findActiveForCycle("profile-1", "2026-06-01")
    ).resolves.toHaveLength(1);
    expect(db.getAllCalls[0].source).toContain("is_paused = 0");
    expect(db.getAllCalls[0].source).toContain(
      "(end_date IS NULL OR end_date > ?)"
    );
    expect(db.getAllCalls[0].params).toEqual(["profile-1", "2026-06-01"]);
  });

  it("create_inserts_bill_and_sync_queue_entry_in_one_transaction", async () => {
    const db = new FakeDatabase();
    const repo = new BillRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const bill = await repo.create({
      profileId: "profile-1",
      name: " Rent ",
      billType: "fixed",
      defaultAmountCents: 150000,
      recurrenceInterval: "monthly",
      dueDayOfCycle: 1,
    });

    expect(bill).toEqual({
      id: "id-1",
      profileId: "profile-1",
      name: "Rent",
      billType: "fixed",
      defaultAmountCents: 150000,
      recurrenceInterval: "monthly",
      customIntervalDays: null,
      dueDayOfCycle: 1,
      dueDateAbsolute: null,
      endDate: null,
      isPaused: false,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.transactionCount).toBe(1);
    expect(db.runCalls[0].source).toContain("INSERT INTO bills");
    expect(db.runCalls[0].params).toEqual([
      "id-1",
      "profile-1",
      "Rent",
      "fixed",
      150000,
      "monthly",
      null,
      1,
      null,
      null,
      0,
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      null,
      "local",
    ]);
    expect(db.runCalls[1].source).toContain("INSERT INTO sync_queue");
    expect(db.runCalls[1].params?.[2]).toBe("bill");
    expect(db.runCalls[1].params?.[4]).toBe("create");
  });

  it("update_merges_changes_and_writes_sync_queue_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(billRow);
    const repo = new BillRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const updated = await repo.update("bill-1", {
      defaultAmountCents: 155000,
      name: " Apartment ",
    });

    expect(updated.name).toBe("Apartment");
    expect(updated.defaultAmountCents).toBe(155000);
    expect(db.runCalls[0].source).toContain("UPDATE bills");
    expect(db.runCalls[0].params).toEqual([
      "Apartment",
      "fixed",
      155000,
      "monthly",
      null,
      1,
      null,
      null,
      0,
      "2026-06-01T12:00:00.000Z",
      "bill-1",
    ]);
    expect(db.runCalls[1].params?.[4]).toBe("update");
  });

  it("pause_sets_paused_flag_through_update", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(billRow);
    const repo = new BillRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const paused = await repo.pause("bill-1");

    expect(paused.isPaused).toBe(true);
    expect(db.runCalls[0].params?.[8]).toBe(1);
  });

  it("softDelete_sets_deleted_at_and_writes_delete_sync_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(billRow);
    const repo = new BillRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    await repo.softDelete("bill-1");

    expect(db.runCalls[0].source).toContain("SET deleted_at = ?");
    expect(db.runCalls[0].params).toEqual([
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      "bill-1",
    ]);
    expect(db.runCalls[1].params?.[2]).toBe("bill");
    expect(db.runCalls[1].params?.[4]).toBe("delete");
    expect(JSON.parse(String(db.runCalls[1].params?.[5]))).toEqual({
      entityId: "bill-1",
      deletedAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("rejects_invalid_bill_inputs", async () => {
    const repo = new BillRepository(new FakeDatabase());

    await expect(
      repo.create({
        profileId: "",
        name: "Rent",
        billType: "fixed",
        defaultAmountCents: 1,
        recurrenceInterval: "monthly",
        dueDayOfCycle: 1,
      })
    ).rejects.toThrow("Bill requires a profileId.");
    await expect(
      repo.create({
        profileId: "profile-1",
        name: "",
        billType: "fixed",
        defaultAmountCents: 1,
        recurrenceInterval: "monthly",
        dueDayOfCycle: 1,
      })
    ).rejects.toThrow("Bill requires a name.");
    await expect(
      repo.create({
        profileId: "profile-1",
        name: "Rent",
        billType: "fixed",
        defaultAmountCents: -1,
        recurrenceInterval: "monthly",
        dueDayOfCycle: 1,
      })
    ).rejects.toThrow("Bill defaultAmountCents must be zero or greater.");
  });

  it("enforces_custom_interval_and_due_date_shape", async () => {
    const repo = new BillRepository(new FakeDatabase());

    await expect(
      repo.create({
        profileId: "profile-1",
        name: "Rent",
        billType: "fixed",
        defaultAmountCents: 1,
        recurrenceInterval: "custom",
        dueDayOfCycle: 1,
      })
    ).rejects.toThrow("Custom bills require customIntervalDays.");
    await expect(
      repo.create({
        profileId: "profile-1",
        name: "Rent",
        billType: "fixed",
        defaultAmountCents: 1,
        recurrenceInterval: "monthly",
        customIntervalDays: 10,
        dueDayOfCycle: 1,
      })
    ).rejects.toThrow("Only custom bills can define customIntervalDays.");
    await expect(
      repo.create({
        profileId: "profile-1",
        name: "Rent",
        billType: "fixed",
        defaultAmountCents: 1,
        recurrenceInterval: "monthly",
      })
    ).rejects.toThrow("Bill must define exactly one due date field.");
    await expect(
      repo.create({
        profileId: "profile-1",
        name: "Rent",
        billType: "fixed",
        defaultAmountCents: 1,
        recurrenceInterval: "monthly",
        dueDayOfCycle: 1,
        dueDateAbsolute: "2026-06-01",
      })
    ).rejects.toThrow("Bill must define exactly one due date field.");
  });

  it("update_and_soft_delete_reject_missing_bill", async () => {
    const repo = new BillRepository(new FakeDatabase());

    await expect(repo.update("missing", { name: "Nope" })).rejects.toThrow(
      "Bill missing not found."
    );
    await expect(repo.softDelete("missing")).rejects.toThrow(
      "Bill missing not found."
    );
  });
});
