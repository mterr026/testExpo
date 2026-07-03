import { describe, expect, it } from "vitest";

import { ProfileRepository } from "./ProfileRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const profileRow = {
  id: "profile-1",
  display_name: "Matt",
  essential_reserve: 25000,
  currency_code: "USD",
  onboarding_complete: 1,
  opening_balance_cents: 0,
  opening_balance_as_of_date: "2026-06-01",
  tutorial_complete: 1,
  created_at: "2026-06-01T12:00:00.000Z",
  updated_at: "2026-06-01T12:00:00.000Z",
  deleted_at: null,
  sync_status: "local",
};

describe("ProfileRepository", () => {
  it("findById_maps_active_profile_row", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(profileRow);
    const repo = new ProfileRepository(db);

    await expect(repo.findById("profile-1")).resolves.toEqual({
      id: "profile-1",
      displayName: "Matt",
      essentialReserveCents: 25000,
      currencyCode: "USD",
      onboardingComplete: true,
      openingBalanceCents: 0,
      openingBalanceAsOfDate: "2026-06-01",
      tutorialComplete: true,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.getFirstCalls[0].source).toContain("deleted_at IS NULL");
    expect(db.getFirstCalls[0].params).toEqual(["profile-1"]);
  });

  it("findActive_returns_oldest_active_profile", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push({ ...profileRow, onboarding_complete: 0 });
    const repo = new ProfileRepository(db);

    const profile = await repo.findActive();

    expect(profile?.onboardingComplete).toBe(false);
    expect(db.getFirstCalls[0].source).toContain("ORDER BY created_at ASC LIMIT 1");
  });

  it("create_inserts_profile_and_sync_queue_entry_in_one_transaction", async () => {
    const db = new FakeDatabase();
    const repo = new ProfileRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const profile = await repo.create({
      displayName: "Matt",
      essentialReserveCents: 25000,
      onboardingComplete: true,
    });

    expect(profile).toEqual({
      id: "id-1",
      displayName: "Matt",
      essentialReserveCents: 25000,
      currencyCode: "USD",
      onboardingComplete: true,
      openingBalanceCents: 0,
      openingBalanceAsOfDate: null,
      tutorialComplete: false,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      deletedAt: null,
      syncStatus: "local",
    });
    expect(db.transactionCount).toBe(1);
    expect(db.runCalls).toHaveLength(2);
    expect(db.runCalls[0].source).toContain("INSERT INTO profiles");
    expect(db.runCalls[0].params).toEqual([
      "id-1",
      "Matt",
      25000,
      "USD",
      1,
      0,
      null,
      0,
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      null,
      "local",
    ]);
    expect(db.runCalls[1].source).toContain("INSERT INTO sync_queue");
    expect(db.runCalls[1].params?.[0]).toBe("id-2");
    expect(db.runCalls[1].params?.[4]).toBe("create");
  });

  it("update_merges_changes_and_writes_sync_queue_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(profileRow);
    const repo = new ProfileRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const updated = await repo.update("profile-1", {
      displayName: "Budget Flow",
      essentialReserveCents: 30000,
      onboardingComplete: false,
    });

    expect(updated.displayName).toBe("Budget Flow");
    expect(updated.essentialReserveCents).toBe(30000);
    expect(updated.onboardingComplete).toBe(false);
    expect(db.runCalls[0].source).toContain("UPDATE profiles");
    expect(db.runCalls[0].params).toEqual([
      "Budget Flow",
      30000,
      "USD",
      0,
      0,
      "2026-06-01",
      1,
      "2026-06-01T12:00:00.000Z",
      "profile-1",
    ]);
    expect(db.runCalls[1].params?.[4]).toBe("update");
  });

  it("softDelete_sets_deleted_at_and_writes_minimal_delete_payload", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(profileRow);
    const repo = new ProfileRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    await repo.softDelete("profile-1");

    expect(db.runCalls[0].source).toContain("SET deleted_at = ?");
    expect(db.runCalls[0].params).toEqual([
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      "profile-1",
    ]);
    expect(db.runCalls[1].params?.[4]).toBe("delete");
    expect(JSON.parse(String(db.runCalls[1].params?.[5]))).toEqual({
      entityId: "profile-1",
      deletedAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("update_and_soft_delete_reject_missing_profile", async () => {
    const db = new FakeDatabase();
    const repo = new ProfileRepository(db);

    await expect(repo.update("missing", { displayName: "Nope" })).rejects.toThrow(
      "Profile missing not found."
    );
    await expect(repo.softDelete("missing")).rejects.toThrow(
      "Profile missing not found."
    );
  });
});
