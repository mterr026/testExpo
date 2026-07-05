import { describe, expect, it } from "vitest";

import type {
  BalanceAdjustment,
  Bill,
  BillCycleInstance,
  BudgetingPreferences,
  Envelope,
  NotificationSettings,
  Paycheck,
  Profile,
  Purchase,
} from "@/database/repositories/types";
import { FakeDatabase } from "@/database/repositories/testUtils";

import { restoreBackupPayload } from "./BackupRestoreWriter";
import type { BudgetFlowBackupPayload } from "./BackupService";

const profile: Profile = {
  id: "profile-1",
  displayName: "Matt",
  essentialReserveCents: 25000,
  currencyCode: "USD",
  onboardingComplete: true,
  openingBalanceCents: 0,
  openingBalanceAsOfDate: null,
  tutorialComplete: true,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const paycheck: Paycheck = {
  id: "paycheck-1",
  profileId: "profile-1",
  label: "Primary",
  amountCents: 180000,
  expectedDate: "2026-06-15",
  isReceived: false,
  receivedAt: null,
  isRecurring: true,
  recurrenceInterval: "biweekly",
  isPrimary: true,
  notes: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const bill: Bill = {
  id: "bill-1",
  profileId: "profile-1",
  name: "Rent",
  billType: "fixed",
  defaultAmountCents: 90000,
  recurrenceInterval: "monthly",
  customIntervalDays: null,
  dueDayOfCycle: null,
  dueDateAbsolute: "2026-06-20",
  endDate: null,
  isPaused: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const billCycleInstance: BillCycleInstance = {
  id: "bill-instance-1",
  billId: "bill-1",
  paycheckCycleId: "paycheck-1",
  cycleAmountCents: 90000,
  isVariableConfirmed: false,
  isPaid: false,
  paidAt: null,
  dueDate: "2026-06-20",
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const envelope: Envelope = {
  id: "envelope-1",
  profileId: "profile-1",
  name: "Groceries",
  allocationCents: 40000,
  sortOrder: 0,
  isPaused: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const purchase: Purchase = {
  id: "purchase-1",
  profileId: "profile-1",
  amountCents: 4200,
  state: "pending",
  description: "Gas",
  purchaseDate: "2026-06-10",
  paycheckCycleId: "paycheck-1",
  envelopeId: "envelope-1",
  resolvedAt: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const balanceAdjustment: BalanceAdjustment = {
  id: "adjustment-1",
  profileId: "profile-1",
  previousBalanceCents: 100000,
  adjustedBalanceCents: 125000,
  deltaCents: 25000,
  reason: "Manual balance adjustment",
  createdAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const notificationSettings: NotificationSettings = {
  id: "notification-settings-1",
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
};

const budgetingPreferences: BudgetingPreferences = {
  id: "budgeting-preferences-1",
  profileId: "profile-1",
  envelopesEnabled: true,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  syncStatus: "local",
};

function createPayload(): BudgetFlowBackupPayload {
  const records = {
    balanceAdjustments: [balanceAdjustment],
    billCycleInstances: [billCycleInstance],
    bills: [bill],
    budgetingPreferences,
    envelopes: [envelope],
    notificationSettings,
    paychecks: [paycheck],
    purchases: [purchase],
  };

  return {
    schemaVersion: 2,
    exportedAt: "2026-06-19T12:00:00.000Z",
    profile,
    records,
    recordCount: 8,
  };
}

describe("restoreBackupPayload", () => {
  it("clears_existing_profile_data_and_inserts_backup_records", async () => {
    const db = new FakeDatabase();

    await expect(
      restoreBackupPayload(db, createPayload(), "profile-1", "backup.json")
    ).resolves.toEqual({
      fileName: "backup.json",
      profileId: "profile-1",
      recordCount: 8,
    });

    expect(db.transactionCount).toBe(1);
    expect(db.runCalls.some((call) => call.source.includes("DELETE FROM purchases"))).toBe(
      true
    );
    expect(db.runCalls.some((call) => call.source.includes("INSERT INTO envelopes"))).toBe(
      true
    );
    expect(
      db.runCalls.some((call) => call.source.includes("INSERT INTO budgeting_preferences"))
    ).toBe(true);
    expect(db.runCalls.some((call) => call.source.includes("UPDATE profiles"))).toBe(true);
  });

  it("remaps_backup_profile_ids_to_the_active_profile", async () => {
    const db = new FakeDatabase();

    await restoreBackupPayload(db, createPayload(), "profile-active", "backup.json");

    const purchaseInsert = db.runCalls.find((call) =>
      call.source.includes("INSERT INTO purchases")
    );

    expect(purchaseInsert?.params?.[1]).toBe("profile-active");
  });

  it("inserts_purchases_with_nulled_orphan_envelope_references", async () => {
    const db = new FakeDatabase();
    const payload = createPayload();

    payload.records.envelopes = [];
    payload.records.purchases = [
      {
        ...purchase,
        envelopeId: "missing-envelope",
      },
    ];

    await restoreBackupPayload(db, payload, "profile-1", "backup.json");

    const purchaseInsert = db.runCalls.find((call) =>
      call.source.includes("INSERT INTO purchases")
    );

    expect(purchaseInsert?.params?.[7]).toBeNull();
  });
});
