import type {
  ActivityLogRepository,
  BalanceAdjustmentRepository,
  NotificationSettingsRepository,
  ProfileRepository,
} from "@/database/repositories";
import type {
  BalanceAdjustment,
  NotificationSettings,
  NotificationSettingsChanges,
  Profile,
} from "@/database/repositories/types";
import { formatCurrency } from "@/shared/currency";
import {
  FINANCIAL_STATE_CHANGED,
  type FinancialEventBus,
} from "@/shared/events/financialEvents";

export class SettingsService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly notificationSettingsRepository: NotificationSettingsRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly balanceAdjustmentRepository: BalanceAdjustmentRepository,
    private readonly eventBus: FinancialEventBus
  ) {}

  async adjustCurrentBalance(
    profileId: string,
    previousBalanceCents: number,
    adjustedBalanceCents: number
  ): Promise<BalanceAdjustment | null> {
    validateBalance(adjustedBalanceCents);

    if (previousBalanceCents === adjustedBalanceCents) {
      return null;
    }

    const adjustment = await this.balanceAdjustmentRepository.create({
      profileId,
      previousBalanceCents,
      adjustedBalanceCents,
    });

    await this.activityLogRepository.create({
      profileId,
      eventType: "balance_adjusted",
      entityType: "balance",
      entityId: adjustment.id,
      summary: `Adjusted balance: ${formatCurrency(previousBalanceCents)} → ${formatCurrency(adjustedBalanceCents)}`,
    });
    this.eventBus.emit(FINANCIAL_STATE_CHANGED, profileId);

    return adjustment;
  }

  async updateEssentialReserve(
    profileId: string,
    essentialReserveCents: number
  ): Promise<Profile> {
    validateReserve(essentialReserveCents);

    const profile = await this.profileRepository.update(profileId, {
      essentialReserveCents,
    });

    await this.activityLogRepository.create({
      profileId: profile.id,
      eventType: "reserve_updated",
      entityType: "balance",
      entityId: profile.id,
      summary: `Updated reserve: ${formatCurrency(essentialReserveCents)}`,
    });
    this.eventBus.emit(FINANCIAL_STATE_CHANGED, profile.id);

    return profile;
  }

  async getOrCreateNotificationSettings(
    profileId: string
  ): Promise<NotificationSettings> {
    const existing =
      await this.notificationSettingsRepository.findByProfileId(profileId);

    if (existing) {
      return existing;
    }

    return this.notificationSettingsRepository.create({ profileId });
  }

  async updateNotificationSettings(
    profileId: string,
    changes: NotificationSettingsChanges
  ): Promise<NotificationSettings> {
    await this.getOrCreateNotificationSettings(profileId);

    return this.notificationSettingsRepository.update(profileId, changes);
  }
}

function validateReserve(essentialReserveCents: number) {
  if (
    !Number.isInteger(essentialReserveCents) ||
    essentialReserveCents < 0
  ) {
    throw new Error("Essential reserve must be zero or greater.");
  }
}

function validateBalance(adjustedBalanceCents: number) {
  if (!Number.isInteger(adjustedBalanceCents) || adjustedBalanceCents < 0) {
    throw new Error("Current balance must be zero or greater.");
  }
}
