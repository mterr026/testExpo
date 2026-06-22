import { describe, expect, it } from "vitest";

import { NotificationSettingsRepository } from "./NotificationSettingsRepository";
import {
  createIncrementingIdFactory,
  FakeDatabase,
  fixedClock,
} from "./testUtils";

const settingsRow = {
  id: "settings-1",
  profile_id: "profile-1",
  notifications_enabled: 1,
  pending_purchase_reminder: 1,
  pending_reminder_days: 7,
  low_balance_alert: 1,
  upcoming_bill_reminder: 1,
  bill_reminder_days_before: 2,
  created_at: "2026-06-01T12:00:00.000Z",
  updated_at: "2026-06-01T12:00:00.000Z",
  sync_status: "local",
} as const;

describe("NotificationSettingsRepository", () => {
  it("findByProfileId_maps_settings_row", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(settingsRow);
    const repo = new NotificationSettingsRepository(db);

    await expect(repo.findByProfileId("profile-1")).resolves.toEqual({
      id: "settings-1",
      profileId: "profile-1",
      notificationsEnabled: true,
      pendingPurchaseReminder: true,
      pendingReminderDays: 7,
      lowBalanceAlert: true,
      upcomingBillReminder: true,
      billReminderDaysBefore: 2,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      syncStatus: "local",
    });
    expect(db.getFirstCalls[0].params).toEqual(["profile-1"]);
  });

  it("create_inserts_defaults_and_sync_queue_entry_in_one_transaction", async () => {
    const db = new FakeDatabase();
    const repo = new NotificationSettingsRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const settings = await repo.create({ profileId: "profile-1" });

    expect(settings).toEqual({
      id: "id-1",
      profileId: "profile-1",
      notificationsEnabled: true,
      pendingPurchaseReminder: true,
      pendingReminderDays: 7,
      lowBalanceAlert: true,
      upcomingBillReminder: true,
      billReminderDaysBefore: 2,
      createdAt: "2026-06-01T12:00:00.000Z",
      updatedAt: "2026-06-01T12:00:00.000Z",
      syncStatus: "local",
    });
    expect(db.transactionCount).toBe(1);
    expect(db.runCalls[0].source).toContain("INSERT INTO notification_settings");
    expect(db.runCalls[0].params).toEqual([
      "id-1",
      "profile-1",
      1,
      1,
      7,
      1,
      1,
      2,
      "2026-06-01T12:00:00.000Z",
      "2026-06-01T12:00:00.000Z",
      "local",
    ]);
    expect(db.runCalls[1].source).toContain("INSERT INTO sync_queue");
    expect(db.runCalls[1].params?.[2]).toBe("notification_settings");
    expect(db.runCalls[1].params?.[4]).toBe("create");
  });

  it("update_merges_changes_and_writes_sync_queue_entry", async () => {
    const db = new FakeDatabase();
    db.getFirstRows.push(settingsRow);
    const repo = new NotificationSettingsRepository(
      db,
      createIncrementingIdFactory("id"),
      fixedClock
    );

    const updated = await repo.update("profile-1", {
      notificationsEnabled: false,
      pendingReminderDays: 3,
    });

    expect(updated.notificationsEnabled).toBe(false);
    expect(updated.pendingReminderDays).toBe(3);
    expect(db.runCalls[0].source).toContain("UPDATE notification_settings");
    expect(db.runCalls[0].params).toEqual([
      0,
      1,
      3,
      1,
      1,
      2,
      "2026-06-01T12:00:00.000Z",
      "profile-1",
    ]);
    expect(db.runCalls[1].params?.[4]).toBe("update");
  });

  it("rejects_invalid_settings_inputs", async () => {
    const repo = new NotificationSettingsRepository(new FakeDatabase());

    await expect(repo.create({ profileId: "" })).rejects.toThrow(
      "Notification settings require a profileId."
    );
    await expect(
      repo.create({ profileId: "profile-1", pendingReminderDays: 0 })
    ).rejects.toThrow(
      "Notification pendingReminderDays must be greater than zero."
    );
    await expect(
      repo.create({ profileId: "profile-1", billReminderDaysBefore: 0 })
    ).rejects.toThrow(
      "Notification billReminderDaysBefore must be greater than zero."
    );
  });

  it("update_rejects_missing_settings", async () => {
    const repo = new NotificationSettingsRepository(new FakeDatabase());

    await expect(
      repo.update("missing", { notificationsEnabled: false })
    ).rejects.toThrow("Notification settings for profile missing not found.");
  });
});
