import type { Screen } from "@/shared/ui/types";

export type NotificationActionPayload = {
  screen: Extract<Screen, "Bills" | "Paychecks">;
  entityId: string;
};

export type ScheduledReminder = {
  identifier: string;
  title: string;
  body: string;
  triggerAt: Date;
  data: NotificationActionPayload;
};

export type NotificationTarget = NotificationActionPayload | null;
