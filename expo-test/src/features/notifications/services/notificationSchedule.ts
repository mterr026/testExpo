import type { ScheduledReminder } from "../types";

export const CONFIRMATION_REMINDER_PREFIX = "bf-confirm:";
export const REMINDER_HOUR = 9;
export const REMINDER_MINUTE = 0;
export const MAX_SCHEDULE_HORIZON_DAYS = 90;
export const OVERDUE_REMINDER_DELAY_MS = 60_000;

export type ConfirmationReminderInput = {
  todayIsoDate: string;
  now: Date;
  notificationsEnabled: boolean;
  paychecks: Array<{
    id: string;
    label: string | null;
    expectedDate: string;
    isReceived: boolean;
  }>;
  billInstances: Array<{
    id: string;
    billId: string;
    dueDate: string;
    isPaid: boolean;
    isVariableConfirmed: boolean;
  }>;
  bills: Array<{
    id: string;
    name: string;
    billType: "fixed" | "variable";
  }>;
};

export function paycheckReminderId(paycheckId: string) {
  return `${CONFIRMATION_REMINDER_PREFIX}paycheck:${paycheckId}`;
}

export function variableBillReminderId(billInstanceId: string) {
  return `${CONFIRMATION_REMINDER_PREFIX}bill:${billInstanceId}`;
}

export function isConfirmationReminderIdentifier(identifier: string) {
  return identifier.startsWith(CONFIRMATION_REMINDER_PREFIX);
}

export function buildConfirmationReminders(
  input: ConfirmationReminderInput
): ScheduledReminder[] {
  if (!input.notificationsEnabled) {
    return [];
  }

  const reminders: ScheduledReminder[] = [];

  for (const paycheck of input.paychecks) {
    if (paycheck.isReceived) {
      continue;
    }

    if (!shouldScheduleReminderForDate(paycheck.expectedDate, input.todayIsoDate)) {
      continue;
    }

    reminders.push({
      identifier: paycheckReminderId(paycheck.id),
      title: "Paycheck due",
      body: `Confirm or update "${formatPaycheckLabel(paycheck.label)}" in Paychecks.`,
      triggerAt: resolveReminderTriggerAt({
        dueIsoDate: paycheck.expectedDate,
        todayIsoDate: input.todayIsoDate,
        now: input.now,
      }),
      data: {
        screen: "Paychecks",
        entityId: paycheck.id,
      },
    });
  }

  const billsById = new Map(input.bills.map((bill) => [bill.id, bill]));

  for (const billInstance of input.billInstances) {
    if (billInstance.isPaid || billInstance.isVariableConfirmed) {
      continue;
    }

    const bill = billsById.get(billInstance.billId);

    if (!bill || bill.billType !== "variable") {
      continue;
    }

    if (!shouldScheduleReminderForDate(billInstance.dueDate, input.todayIsoDate)) {
      continue;
    }

    reminders.push({
      identifier: variableBillReminderId(billInstance.id),
      title: "Bill needs confirmation",
      body: `Confirm or update "${bill.name}" in Bills.`,
      triggerAt: resolveReminderTriggerAt({
        dueIsoDate: billInstance.dueDate,
        todayIsoDate: input.todayIsoDate,
        now: input.now,
      }),
      data: {
        screen: "Bills",
        entityId: billInstance.id,
      },
    });
  }

  return reminders;
}

export function shouldScheduleReminderForDate(
  dueIsoDate: string,
  todayIsoDate: string
) {
  if (dueIsoDate <= todayIsoDate) {
    return true;
  }

  return daysBetweenIsoDates(todayIsoDate, dueIsoDate) <= MAX_SCHEDULE_HORIZON_DAYS;
}

export function resolveReminderTriggerAt({
  dueIsoDate,
  todayIsoDate,
  now,
}: {
  dueIsoDate: string;
  todayIsoDate: string;
  now: Date;
}) {
  const reminderIsoDate = dueIsoDate < todayIsoDate ? todayIsoDate : dueIsoDate;
  const scheduledAt = buildLocalReminderDate(reminderIsoDate);

  if (scheduledAt.getTime() <= now.getTime()) {
    return new Date(now.getTime() + OVERDUE_REMINDER_DELAY_MS);
  }

  return scheduledAt;
}

export function buildLocalReminderDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);

  return new Date(year, month - 1, day, REMINDER_HOUR, REMINDER_MINUTE, 0, 0);
}

function daysBetweenIsoDates(startIsoDate: string, endIsoDate: string) {
  const start = buildLocalReminderDate(startIsoDate).getTime();
  const end = buildLocalReminderDate(endIsoDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  return Math.round((end - start) / dayMs);
}

function formatPaycheckLabel(label: string | null) {
  return label?.trim() || "Paycheck";
}
