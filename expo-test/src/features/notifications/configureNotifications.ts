import { loadExpoNotificationsModule } from "./services/notificationRuntime";

let configured = false;

export async function configureNotifications() {
  if (configured) {
    return;
  }

  const Notifications = await loadExpoNotificationsModule();

  if (
    !Notifications ||
    typeof Notifications.setNotificationHandler !== "function"
  ) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  configured = true;
}
