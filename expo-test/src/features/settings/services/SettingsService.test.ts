import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ActivityLogRepository,
  BalanceAdjustmentRepository,
  NotificationSettingsRepository,
  ProfileRepository,
} from "@/database/repositories";
import type {
  BalanceAdjustment,
  NotificationSettings,
  Profile,
} from "@/database/repositories/types";
import { FINANCIAL_STATE_CHANGED } from "@/shared/events/financialEvents";

import { SettingsService } from "./SettingsService";

const profile: Profile = {
  id: "profile-1",
  displayName: "Matt",
  essentialReserveCents: 10000,
  currencyCode: "USD",
  onboardingComplete: true,
  openingBalanceCents: 0,
  tutorialComplete: true,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const notificationSettings: NotificationSettings = {
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
};

const balanceAdjustment: BalanceAdjustment = {
  id: "adjustment-1",
  profileId: "profile-1",
  previousBalanceCents: 100000,
  adjustedBalanceCents: 95000,
  deltaCents: -5000,
  reason: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

function createMocks() {
  return {
    profileRepository: {
      update: vi.fn(),
    },
    notificationSettingsRepository: {
      findByProfileId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    activityLogRepository: {
      create: vi.fn(),
    },
    balanceAdjustmentRepository: {
      create: vi.fn(),
    },
    eventBus: {
      emit: vi.fn(),
    },
  };
}

function createService(mocks: ReturnType<typeof createMocks>) {
  return new SettingsService(
    mocks.profileRepository as unknown as ProfileRepository,
    mocks.notificationSettingsRepository as unknown as NotificationSettingsRepository,
    mocks.activityLogRepository as unknown as ActivityLogRepository,
    mocks.balanceAdjustmentRepository as unknown as BalanceAdjustmentRepository,
    mocks.eventBus
  );
}

describe("SettingsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adjustCurrentBalance_creates_adjustment_logs_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.balanceAdjustmentRepository.create.mockResolvedValue(balanceAdjustment);
    const service = createService(mocks);

    const result = await service.adjustCurrentBalance("profile-1", 100000, 95000);

    expect(result).toBe(balanceAdjustment);
    expect(mocks.balanceAdjustmentRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      previousBalanceCents: 100000,
      adjustedBalanceCents: 95000,
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "balance_adjusted",
      entityType: "balance",
      entityId: "adjustment-1",
      summary: "Adjusted balance: $1,000.00 → $950.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("adjustCurrentBalance_returns_null_when_balance_unchanged", async () => {
    const mocks = createMocks();
    const service = createService(mocks);

    const result = await service.adjustCurrentBalance("profile-1", 95000, 95000);

    expect(result).toBeNull();
    expect(mocks.balanceAdjustmentRepository.create).not.toHaveBeenCalled();
    expect(mocks.activityLogRepository.create).not.toHaveBeenCalled();
    expect(mocks.eventBus.emit).not.toHaveBeenCalled();
  });

  it("adjustCurrentBalance_rejects_invalid_amount", async () => {
    const mocks = createMocks();
    const service = createService(mocks);

    await expect(
      service.adjustCurrentBalance("profile-1", 100000, -1)
    ).rejects.toThrow("Current balance must be zero or greater.");
    expect(mocks.balanceAdjustmentRepository.create).not.toHaveBeenCalled();
  });

  it("updateEssentialReserve_updates_profile_logs_activity_and_emits_change", async () => {
    const mocks = createMocks();
    mocks.profileRepository.update.mockResolvedValue({
      ...profile,
      essentialReserveCents: 12500,
    });
    const service = createService(mocks);

    const updated = await service.updateEssentialReserve("profile-1", 12500);

    expect(updated.essentialReserveCents).toBe(12500);
    expect(mocks.profileRepository.update).toHaveBeenCalledWith("profile-1", {
      essentialReserveCents: 12500,
    });
    expect(mocks.activityLogRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      eventType: "reserve_updated",
      entityType: "balance",
      entityId: "profile-1",
      summary: "Updated reserve: $125.00",
    });
    expect(mocks.eventBus.emit).toHaveBeenCalledWith(
      FINANCIAL_STATE_CHANGED,
      "profile-1"
    );
  });

  it("updateEssentialReserve_rejects_invalid_amount", async () => {
    const mocks = createMocks();
    const service = createService(mocks);

    await expect(
      service.updateEssentialReserve("profile-1", -1)
    ).rejects.toThrow("Essential reserve must be zero or greater.");
    expect(mocks.profileRepository.update).not.toHaveBeenCalled();
  });

  it("getOrCreateNotificationSettings_returns_existing_settings", async () => {
    const mocks = createMocks();
    mocks.notificationSettingsRepository.findByProfileId.mockResolvedValue(
      notificationSettings
    );
    const service = createService(mocks);

    await expect(
      service.getOrCreateNotificationSettings("profile-1")
    ).resolves.toBe(notificationSettings);
    expect(mocks.notificationSettingsRepository.create).not.toHaveBeenCalled();
  });

  it("getOrCreateNotificationSettings_creates_defaults_when_missing", async () => {
    const mocks = createMocks();
    mocks.notificationSettingsRepository.findByProfileId.mockResolvedValue(null);
    mocks.notificationSettingsRepository.create.mockResolvedValue(
      notificationSettings
    );
    const service = createService(mocks);

    await expect(
      service.getOrCreateNotificationSettings("profile-1")
    ).resolves.toBe(notificationSettings);
    expect(mocks.notificationSettingsRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
    });
  });

  it("updateNotificationSettings_ensures_row_then_updates_without_recalculation_event", async () => {
    const mocks = createMocks();
    mocks.notificationSettingsRepository.findByProfileId.mockResolvedValue(null);
    mocks.notificationSettingsRepository.create.mockResolvedValue(
      notificationSettings
    );
    mocks.notificationSettingsRepository.update.mockResolvedValue({
      ...notificationSettings,
      pendingReminderDays: 3,
    });
    const service = createService(mocks);

    const updated = await service.updateNotificationSettings("profile-1", {
      pendingReminderDays: 3,
    });

    expect(updated.pendingReminderDays).toBe(3);
    expect(mocks.notificationSettingsRepository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
    });
    expect(mocks.notificationSettingsRepository.update).toHaveBeenCalledWith(
      "profile-1",
      { pendingReminderDays: 3 }
    );
    expect(mocks.eventBus.emit).not.toHaveBeenCalled();
  });
});
