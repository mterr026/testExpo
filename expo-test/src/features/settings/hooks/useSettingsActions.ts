import { useEffect, useState } from "react";

import type { NotificationSettings } from "@/database/repositories/types";
import { getAppRuntime } from "@/shared/services/appRuntime";

import { getOrCreateActiveProfile, getTodayIsoDate } from "@/features/app/homeData";

type UseSettingsActionsInput = {
  onSettingsChanged?: () => void | Promise<void>;
  profileId?: string;
  setBalanceCents: (balanceCents: number) => void;
  setReserveCents: (reserveCents: number) => void;
};

export function useSettingsActions({
  onSettingsChanged,
  profileId,
  setBalanceCents,
  setReserveCents,
}: UseSettingsActionsInput) {
  const [backupExportError, setBackupExportError] = useState("");
  const [backupExportMessage, setBackupExportMessage] = useState("");
  const [isBackupExporting, setIsBackupExporting] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings | null>(null);
  const [isNotificationSaving, setIsNotificationSaving] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadNotificationSettings() {
      if (!profileId) {
        setNotificationSettings(null);
        setNotificationError("");
        return;
      }

      try {
        const runtime = await getAppRuntime();
        const settings =
          await runtime.services.settingsService.getOrCreateNotificationSettings(
            profileId
          );

        if (isActive) {
          setNotificationSettings(settings);
          setNotificationError("");
        }
      } catch {
        if (isActive) {
          setNotificationError("Notification settings could not be loaded.");
        }
      }
    }

    loadNotificationSettings();

    return () => {
      isActive = false;
    };
  }, [profileId]);

  async function updateBalance(targetBalanceCents: number) {
    const runtime = await getAppRuntime();
    const profile = await getOrCreateActiveProfile(runtime);
    const snapshot = await runtime.services.dashboardService.loadDashboardSnapshot(
      getTodayIsoDate()
    );
    const previousBalanceCents = snapshot.safeToSpend.runningBalanceCents;

    await runtime.services.settingsService.adjustCurrentBalance(
      profile.id,
      previousBalanceCents,
      targetBalanceCents
    );
    setBalanceCents(targetBalanceCents);
    await onSettingsChanged?.();
  }

  async function updateReserve(nextReserveCents: number) {
    const runtime = await getAppRuntime();
    const profile = await getOrCreateActiveProfile(runtime);

    await runtime.services.settingsService.updateEssentialReserve(
      profile.id,
      nextReserveCents
    );
    setReserveCents(nextReserveCents);
    await onSettingsChanged?.();
  }

  async function toggleNotifications() {
    const runtime = await getAppRuntime();
    const profile = await getOrCreateActiveProfile(runtime);
    const currentSettings =
      notificationSettings ??
      (await runtime.services.settingsService.getOrCreateNotificationSettings(
        profile.id
      ));
    const turningOn = !currentSettings.notificationsEnabled;

    try {
      setIsNotificationSaving(true);
      setNotificationError("");

      if (turningOn) {
        const permission =
          await runtime.services.notificationService.requestNotificationPermission();

        if (permission === "unavailable") {
          setNotificationError(
            "Notifications are not available in this build. Rebuild the app with npx expo run:ios, then try again."
          );
          return;
        }

        if (permission === "denied") {
          setNotificationError(
            "Notifications are blocked. Open iOS Settings → Notifications → expo-test and allow alerts."
          );
          return;
        }
      }

      const updatedSettings =
        await runtime.services.settingsService.updateNotificationSettings(
          profile.id,
          {
            notificationsEnabled: turningOn,
          }
        );

      setNotificationSettings(updatedSettings);
      setNotificationError("");
      await onSettingsChanged?.();
    } catch {
      setNotificationError("Notification settings could not be saved.");
    } finally {
      setIsNotificationSaving(false);
    }
  }

  async function exportBackup() {
    try {
      setIsBackupExporting(true);
      setBackupExportError("");
      setBackupExportMessage("");

      const runtime = await getAppRuntime();
      const result = await runtime.services.backupService.exportToDevice();

      setBackupExportMessage(
        result.shared
          ? `Exported ${result.fileName} with ${result.recordCount} records.`
          : `Saved ${result.fileName} locally with ${result.recordCount} records. Rebuild the iPhone app to enable the share sheet.`
      );
    } catch {
      setBackupExportError(
        "Backup could not be exported. Reload the app and try again."
      );
    } finally {
      setIsBackupExporting(false);
    }
  }

  return {
    backupExportError,
    backupExportMessage,
    exportBackup,
    isBackupExporting,
    isNotificationSaving,
    notificationError,
    notificationSettings,
    toggleNotifications,
    updateBalance,
    updateReserve,
  };
}
