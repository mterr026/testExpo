import {
  mapNotificationSettingsRow,
  type NotificationSettingsRow,
} from "./rowMappers";
import { SyncQueueRepository } from "./SyncQueueRepository";
import type {
  Clock,
  IdFactory,
  NewNotificationSettings,
  NotificationSettings,
  NotificationSettingsChanges,
  TransactionalDatabaseExecutor,
} from "./types";

export class NotificationSettingsRepository {
  constructor(
    private readonly db: TransactionalDatabaseExecutor,
    private readonly idFactory: IdFactory = createDefaultId,
    private readonly now: Clock = () => new Date()
  ) {}

  async findByProfileId(profileId: string): Promise<NotificationSettings | null> {
    const row = await this.db.getFirstAsync<NotificationSettingsRow>(
      `${settingsSelectSql()} WHERE profile_id = ?`,
      [profileId]
    );

    return row ? mapNotificationSettingsRow(row) : null;
  }

  async create(input: NewNotificationSettings): Promise<NotificationSettings> {
    validateSettingsInput(input);

    const createdAt = this.now().toISOString();
    const settings: NotificationSettings = {
      id: this.idFactory(),
      profileId: input.profileId,
      notificationsEnabled: input.notificationsEnabled ?? true,
      pendingPurchaseReminder: input.pendingPurchaseReminder ?? true,
      pendingReminderDays: input.pendingReminderDays ?? 7,
      lowBalanceAlert: input.lowBalanceAlert ?? true,
      upcomingBillReminder: input.upcomingBillReminder ?? true,
      billReminderDaysBefore: input.billReminderDaysBefore ?? 2,
      createdAt,
      updatedAt: createdAt,
      syncStatus: "local",
    };

    validateSettingsInput(settings);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `INSERT INTO notification_settings (
          id,
          profile_id,
          notifications_enabled,
          pending_purchase_reminder,
          pending_reminder_days,
          low_balance_alert,
          upcoming_bill_reminder,
          bill_reminder_days_before,
          created_at,
          updated_at,
          sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        settingsToParams(settings)
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: settings.profileId,
        entityType: "notification_settings",
        entityId: settings.id,
        operation: "create",
        payload: settings,
      });
    });

    return settings;
  }

  async update(
    profileId: string,
    changes: NotificationSettingsChanges
  ): Promise<NotificationSettings> {
    const current = await this.findByProfileId(profileId);

    if (!current) {
      throw new Error(`Notification settings for profile ${profileId} not found.`);
    }

    const updated: NotificationSettings = {
      ...current,
      ...changes,
      updatedAt: this.now().toISOString(),
    };

    validateSettingsInput(updated);

    await this.db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.runAsync(
        `UPDATE notification_settings
        SET notifications_enabled = ?,
          pending_purchase_reminder = ?,
          pending_reminder_days = ?,
          low_balance_alert = ?,
          upcoming_bill_reminder = ?,
          bill_reminder_days_before = ?,
          updated_at = ?
        WHERE profile_id = ?`,
        [
          updated.notificationsEnabled ? 1 : 0,
          updated.pendingPurchaseReminder ? 1 : 0,
          updated.pendingReminderDays,
          updated.lowBalanceAlert ? 1 : 0,
          updated.upcomingBillReminder ? 1 : 0,
          updated.billReminderDaysBefore,
          updated.updatedAt,
          updated.profileId,
        ]
      );
      await new SyncQueueRepository(transaction, this.idFactory, this.now).enqueue({
        profileId: updated.profileId,
        entityType: "notification_settings",
        entityId: updated.id,
        operation: "update",
        payload: updated,
      });
    });

    return updated;
  }
}

function settingsSelectSql() {
  return `SELECT
    id,
    profile_id,
    notifications_enabled,
    pending_purchase_reminder,
    pending_reminder_days,
    low_balance_alert,
    upcoming_bill_reminder,
    bill_reminder_days_before,
    created_at,
    updated_at,
    sync_status
    FROM notification_settings`;
}

function settingsToParams(settings: NotificationSettings) {
  return [
    settings.id,
    settings.profileId,
    settings.notificationsEnabled ? 1 : 0,
    settings.pendingPurchaseReminder ? 1 : 0,
    settings.pendingReminderDays,
    settings.lowBalanceAlert ? 1 : 0,
    settings.upcomingBillReminder ? 1 : 0,
    settings.billReminderDaysBefore,
    settings.createdAt,
    settings.updatedAt,
    settings.syncStatus,
  ];
}

type SettingsInputShape = Pick<NotificationSettings, "profileId"> &
  Partial<
    Pick<NotificationSettings, "pendingReminderDays" | "billReminderDaysBefore">
  >;

function validateSettingsInput(input: SettingsInputShape) {
  if (!input.profileId.trim()) {
    throw new Error("Notification settings require a profileId.");
  }

  if (
    input.pendingReminderDays != null &&
    (!Number.isInteger(input.pendingReminderDays) || input.pendingReminderDays <= 0)
  ) {
    throw new Error("Notification pendingReminderDays must be greater than zero.");
  }

  if (
    input.billReminderDaysBefore != null &&
    (!Number.isInteger(input.billReminderDaysBefore) ||
      input.billReminderDaysBefore <= 0)
  ) {
    throw new Error(
      "Notification billReminderDaysBefore must be greater than zero."
    );
  }
}

function createDefaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("No notification settings idFactory was provided.");
}
