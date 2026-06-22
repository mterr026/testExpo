import type { DashboardSnapshot } from "@/features/dashboard/services";

import { configureNotifications } from "../configureNotifications";

import type { ScheduledReminder } from "../types";
import {
  buildConfirmationReminders,
  isConfirmationReminderIdentifier,
  type ConfirmationReminderInput,
} from "./notificationSchedule";
import {
  loadExpoNotificationsModule,
  type ExpoNotificationsModule,
} from "./notificationRuntime";

export type SyncConfirmationRemindersInput = {
  snapshot: DashboardSnapshot;
  todayIsoDate: string;
  now?: Date;
  notificationsEnabled: boolean;
};

export type NotificationPermissionStatus =
  | "granted"
  | "denied"
  | "unavailable";

export class NotificationService {
  async requestNotificationPermission(): Promise<NotificationPermissionStatus> {
    const Notifications = await loadExpoNotificationsModule();

    if (!Notifications) {
      return "unavailable";
    }

    try {
      const currentPermissions = await Notifications.getPermissionsAsync();

      if (
        currentPermissions.granted ||
        currentPermissions.ios?.status ===
          Notifications.IosAuthorizationStatus.PROVISIONAL
      ) {
        return "granted";
      }

      const requestedPermissions =
        await Notifications.requestPermissionsAsync();

      if (
        requestedPermissions.granted ||
        requestedPermissions.ios?.status ===
          Notifications.IosAuthorizationStatus.PROVISIONAL
      ) {
        return "granted";
      }

      return "denied";
    } catch {
      return "unavailable";
    }
  }

  async requestPermissionsIfNeeded() {
    const permission = await this.requestNotificationPermission();

    return permission === "granted";
  }

  buildRemindersFromSnapshot(
    input: SyncConfirmationRemindersInput
  ): ScheduledReminder[] {
    return buildConfirmationReminders(
      this.toConfirmationReminderInput(input)
    );
  }

  async syncConfirmationReminders(input: SyncConfirmationRemindersInput) {
    const Notifications = await loadExpoNotificationsModule();

    if (!Notifications) {
      return;
    }

    try {
      await configureNotifications();

      await this.cancelConfirmationReminders(Notifications);

      if (!input.notificationsEnabled) {
        return;
      }

      const hasPermission = await this.requestPermissionsIfNeeded();

      if (!hasPermission) {
        return;
      }

      const reminders = this.buildRemindersFromSnapshot(input);

      await Promise.all(
        reminders.map((reminder) =>
          this.scheduleReminder(Notifications, reminder)
        )
      );
    } catch {
      // Native notifications may be unavailable until the app is rebuilt.
    }
  }

  async cancelConfirmationReminders(
    notifications?: ExpoNotificationsModule | null
  ) {
    const resolvedNotifications =
      notifications ?? (await loadExpoNotificationsModule());

    if (
      !resolvedNotifications ||
      typeof resolvedNotifications.getAllScheduledNotificationsAsync !==
        "function"
    ) {
      return;
    }

    const scheduledNotifications =
      await resolvedNotifications.getAllScheduledNotificationsAsync();

    await Promise.all(
      scheduledNotifications
        .filter((notification) =>
          isConfirmationReminderIdentifier(notification.identifier)
        )
        .map((notification) =>
          resolvedNotifications.cancelScheduledNotificationAsync(
            notification.identifier
          )
        )
    );
  }

  private toConfirmationReminderInput(
    input: SyncConfirmationRemindersInput
  ): ConfirmationReminderInput {
    return {
      todayIsoDate: input.todayIsoDate,
      now: input.now ?? new Date(),
      notificationsEnabled: input.notificationsEnabled,
      paychecks: input.snapshot.paychecks.map((paycheck) => ({
        id: paycheck.id,
        label: paycheck.label,
        expectedDate: paycheck.expectedDate,
        isReceived: paycheck.isReceived,
      })),
      billInstances: input.snapshot.allBillInstances.map((billInstance) => ({
        id: billInstance.id,
        billId: billInstance.billId,
        dueDate: billInstance.dueDate,
        isPaid: billInstance.isPaid,
        isVariableConfirmed: billInstance.isVariableConfirmed,
      })),
      bills: input.snapshot.bills.map((bill) => ({
        id: bill.id,
        name: bill.name,
        billType: bill.billType,
      })),
    };
  }

  private async scheduleReminder(
    Notifications: ExpoNotificationsModule,
    reminder: ScheduledReminder
  ) {
    if (typeof Notifications.scheduleNotificationAsync !== "function") {
      return;
    }

    await Notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: {
        title: reminder.title,
        body: reminder.body,
        data: reminder.data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.triggerAt,
      },
    });
  }
}
