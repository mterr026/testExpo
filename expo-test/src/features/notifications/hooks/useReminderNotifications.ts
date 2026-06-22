import { useEffect } from "react";

import type { DashboardSnapshot } from "@/features/dashboard/services";
import { getTodayIsoDate } from "@/features/app/homeData";
import { getAppRuntime } from "@/shared/services/appRuntime";

type UseReminderNotificationsInput = {
  dashboardSnapshot: DashboardSnapshot | null;
  notificationsEnabled: boolean | null | undefined;
};

export function useReminderNotifications({
  dashboardSnapshot,
  notificationsEnabled,
}: UseReminderNotificationsInput) {
  useEffect(() => {
    if (!dashboardSnapshot) {
      return;
    }

    let isActive = true;

    async function syncReminders() {
      const snapshot = dashboardSnapshot;

      if (!snapshot) {
        return;
      }

      const runtime = await getAppRuntime();

      if (!isActive) {
        return;
      }

      await runtime.services.notificationService.syncConfirmationReminders({
        snapshot,
        todayIsoDate: getTodayIsoDate(),
        notificationsEnabled: notificationsEnabled === true,
      });
    }

    syncReminders().catch(() => {
      // Native notifications may be unavailable until the app is rebuilt.
    });

    return () => {
      isActive = false;
    };
  }, [dashboardSnapshot, notificationsEnabled]);
}
