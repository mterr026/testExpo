export type NotificationsFacade = {
  addNotificationResponseReceivedListener: (
    listener: (response: unknown) => void
  ) => { remove: () => void };
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
  clearLastNotificationResponseAsync: () => Promise<void>;
  getAllScheduledNotificationsAsync: () => Promise<
    Array<{ identifier: string }>
  >;
  getLastNotificationResponseAsync: () => Promise<unknown>;
  getPermissionsAsync: () => Promise<{
    granted: boolean;
    ios?: { status: number };
  }>;
  IosAuthorizationStatus: {
    PROVISIONAL: number;
  };
  requestPermissionsAsync: () => Promise<{
    granted: boolean;
    ios?: { status: number };
  }>;
  scheduleNotificationAsync: (request: unknown) => Promise<string>;
  SchedulableTriggerInputTypes: {
    DATE: string;
  };
  setNotificationHandler: (handler: unknown) => void;
};

let notificationsFacade: NotificationsFacade | null | undefined;

function areNativeNotificationModulesAvailable(
  requireOptionalNativeModule: (moduleName: string) => unknown
) {
  return (
    requireOptionalNativeModule("ExpoNotificationScheduler") != null &&
    requireOptionalNativeModule("ExpoNotificationPermissionsModule") != null &&
    requireOptionalNativeModule("ExpoNotificationsHandlerModule") != null &&
    requireOptionalNativeModule("ExpoNotificationsEmitter") != null
  );
}

export async function loadExpoNotificationsModule(): Promise<NotificationsFacade | null> {
  if (notificationsFacade !== undefined) {
    return notificationsFacade;
  }

  try {
    const { requireOptionalNativeModule } = await import("expo-modules-core");

    if (!areNativeNotificationModulesAvailable(requireOptionalNativeModule)) {
      notificationsFacade = null;
      return notificationsFacade;
    }
    const [
      scheduleModule,
      listModule,
      cancelModule,
      permissionsModule,
      permissionTypesModule,
      handlerModule,
      emitterModule,
    ] = await Promise.all([
      import("expo-notifications/build/scheduleNotificationAsync"),
      import("expo-notifications/build/getAllScheduledNotificationsAsync"),
      import("expo-notifications/build/cancelScheduledNotificationAsync"),
      import("expo-notifications/build/NotificationPermissions"),
      import("expo-notifications/build/NotificationPermissions.types"),
      import("expo-notifications/build/NotificationsHandler"),
      import("expo-notifications/build/NotificationsEmitter"),
    ]);

    notificationsFacade = {
      addNotificationResponseReceivedListener:
        emitterModule.addNotificationResponseReceivedListener,
      cancelScheduledNotificationAsync:
        cancelModule.cancelScheduledNotificationAsync,
      clearLastNotificationResponseAsync:
        emitterModule.clearLastNotificationResponseAsync,
      getAllScheduledNotificationsAsync:
        listModule.getAllScheduledNotificationsAsync,
      getLastNotificationResponseAsync:
        emitterModule.getLastNotificationResponseAsync,
      getPermissionsAsync: permissionsModule.getPermissionsAsync,
      IosAuthorizationStatus: permissionTypesModule.IosAuthorizationStatus,
      requestPermissionsAsync: permissionsModule.requestPermissionsAsync,
      scheduleNotificationAsync: scheduleModule.scheduleNotificationAsync,
      SchedulableTriggerInputTypes: { DATE: "date" },
      setNotificationHandler: handlerModule.setNotificationHandler,
    } as NotificationsFacade;
  } catch {
    notificationsFacade = null;
  }

  return notificationsFacade ?? null;
}

export type { NotificationsFacade as ExpoNotificationsModule };
