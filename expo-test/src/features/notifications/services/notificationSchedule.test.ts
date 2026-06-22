import { describe, expect, it } from "vitest";

import {
  buildConfirmationReminders,
  buildLocalReminderDate,
  paycheckReminderId,
  resolveReminderTriggerAt,
  shouldScheduleReminderForDate,
  variableBillReminderId,
} from "./notificationSchedule";

const today = "2026-06-21";
const now = new Date(2026, 5, 21, 8, 0, 0, 0);

describe("buildConfirmationReminders", () => {
  it("returns_no_reminders_when_notifications_are_disabled", () => {
    expect(
      buildConfirmationReminders({
        todayIsoDate: today,
        now,
        notificationsEnabled: false,
        paychecks: [
          {
            id: "paycheck-1",
            label: "Primary",
            expectedDate: today,
            isReceived: false,
          },
        ],
        billInstances: [],
        bills: [],
      })
    ).toEqual([]);
  });

  it("schedules_a_paycheck_reminder_on_the_expected_date", () => {
    const reminders = buildConfirmationReminders({
      todayIsoDate: today,
      now,
      notificationsEnabled: true,
      paychecks: [
        {
          id: "paycheck-1",
          label: "Primary",
          expectedDate: "2026-06-25",
          isReceived: false,
        },
      ],
      billInstances: [],
      bills: [],
    });

    expect(reminders).toEqual([
      {
        identifier: paycheckReminderId("paycheck-1"),
        title: "Paycheck due",
        body: 'Confirm or update "Primary" in Paychecks.',
        triggerAt: buildLocalReminderDate("2026-06-25"),
        data: {
          screen: "Paychecks",
          entityId: "paycheck-1",
        },
      },
    ]);
  });

  it("skips_received_paychecks", () => {
    expect(
      buildConfirmationReminders({
        todayIsoDate: today,
        now,
        notificationsEnabled: true,
        paychecks: [
          {
            id: "paycheck-1",
            label: "Primary",
            expectedDate: today,
            isReceived: true,
          },
        ],
        billInstances: [],
        bills: [],
      })
    ).toEqual([]);
  });

  it("schedules_variable_bill_instances_that_need_confirmation", () => {
    const reminders = buildConfirmationReminders({
      todayIsoDate: today,
      now,
      notificationsEnabled: true,
      paychecks: [],
      billInstances: [
        {
          id: "instance-1",
          billId: "bill-1",
          dueDate: today,
          isPaid: false,
          isVariableConfirmed: false,
        },
      ],
      bills: [
        {
          id: "bill-1",
          name: "Electric",
          billType: "variable",
        },
      ],
    });

    expect(reminders).toEqual([
      {
        identifier: variableBillReminderId("instance-1"),
        title: "Bill needs confirmation",
        body: 'Confirm or update "Electric" in Bills.',
        triggerAt: buildLocalReminderDate(today),
        data: {
          screen: "Bills",
          entityId: "instance-1",
        },
      },
    ]);
  });

  it("skips_fixed_bills_and_confirmed_variable_bills", () => {
    expect(
      buildConfirmationReminders({
        todayIsoDate: today,
        now,
        notificationsEnabled: true,
        paychecks: [],
        billInstances: [
          {
            id: "fixed-instance",
            billId: "fixed-bill",
            dueDate: today,
            isPaid: false,
            isVariableConfirmed: false,
          },
          {
            id: "confirmed-instance",
            billId: "variable-bill",
            dueDate: today,
            isPaid: false,
            isVariableConfirmed: true,
          },
        ],
        bills: [
          {
            id: "fixed-bill",
            name: "Rent",
            billType: "fixed",
          },
          {
            id: "variable-bill",
            name: "Electric",
            billType: "variable",
          },
        ],
      })
    ).toEqual([]);
  });
});

describe("shouldScheduleReminderForDate", () => {
  it("schedules_overdue_and_today_items", () => {
    expect(shouldScheduleReminderForDate("2026-06-20", today)).toBe(true);
    expect(shouldScheduleReminderForDate(today, today)).toBe(true);
  });

  it("schedules_future_items_within_the_horizon", () => {
    expect(shouldScheduleReminderForDate("2026-07-01", today)).toBe(true);
    expect(shouldScheduleReminderForDate("2026-10-01", today)).toBe(false);
  });
});

describe("resolveReminderTriggerAt", () => {
  it("uses_today_for_overdue_items_past_the_reminder_hour", () => {
    const overdueNow = new Date(2026, 5, 21, 10, 0, 0, 0);

    expect(
      resolveReminderTriggerAt({
        dueIsoDate: "2026-06-18",
        todayIsoDate: today,
        now: overdueNow,
      }).getTime()
    ).toBe(overdueNow.getTime() + 60_000);
  });
});
