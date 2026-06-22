import { useEffect, useState } from "react";
import { Platform } from "react-native";

import type { Screen } from "@/shared/ui/types";

import type { NotificationTarget } from "../types";
import { loadExpoNotificationsModule } from "../services/notificationRuntime";

function parseNotificationTarget(
  data: Record<string, unknown> | undefined
): NotificationTarget {
  if (
    data &&
    (data.screen === "Bills" || data.screen === "Paychecks") &&
    typeof data.entityId === "string" &&
    data.entityId.length > 0
  ) {
    return {
      screen: data.screen,
      entityId: data.entityId,
    };
  }

  return null;
}

export function useNotificationNavigation(
  changeScreen: (screen: Screen) => void
) {
  const [notificationTarget, setNotificationTarget] =
    useState<NotificationTarget>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let isActive = true;
    let subscription: { remove: () => void } | undefined;

    async function setupNotificationNavigation() {
      const Notifications = await loadExpoNotificationsModule();

      if (!isActive || !Notifications) {
        return;
      }

      const lastResponse =
        (await Notifications.getLastNotificationResponseAsync()) as {
          notification?: {
            request?: {
              content?: {
                data?: Record<string, unknown>;
              };
            };
          };
        } | null;
      const coldStartTarget = parseNotificationTarget(
        lastResponse?.notification?.request?.content?.data
      );

      if (coldStartTarget) {
        changeScreen(coldStartTarget.screen);
        setNotificationTarget(coldStartTarget);
        await Notifications.clearLastNotificationResponseAsync();
      }

      subscription = Notifications.addNotificationResponseReceivedListener(
        (response: unknown) => {
          const notificationResponse = response as {
            notification?: {
              request?: {
                content?: {
                  data?: Record<string, unknown>;
                };
              };
            };
          };
          const target = parseNotificationTarget(
            notificationResponse.notification?.request?.content?.data
          );

          if (!target) {
            return;
          }

          changeScreen(target.screen);
          setNotificationTarget(target);
        }
      );
    }

    setupNotificationNavigation().catch(() => {
      // Native notifications may be unavailable until the app is rebuilt.
    });

    return () => {
      isActive = false;
      subscription?.remove();
    };
  }, [changeScreen]);

  function clearNotificationTarget() {
    setNotificationTarget(null);
  }

  return {
    clearNotificationTarget,
    notificationTarget,
  };
}
