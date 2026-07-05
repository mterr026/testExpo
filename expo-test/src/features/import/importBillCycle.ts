import {
  OPEN_ENDED_PAYCHECK_CYCLE_DATE,
  type BillCycleWindow,
} from "@/engine";
import type { PaycheckRecurrenceInterval } from "@/database/repositories/types";
import type { DashboardSnapshot } from "@/features/dashboard/services";

type ImportScheduleInterval =
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "irregular";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getImportBillCycle(
  dashboardSnapshot: DashboardSnapshot | null
): BillCycleWindow | null {
  if (!dashboardSnapshot) {
    return null;
  }

  if (
    dashboardSnapshot.activeCyclePaycheckId &&
    dashboardSnapshot.activeCycleStartDate &&
    dashboardSnapshot.activeCycleEndDate
  ) {
    return {
      paycheckCycleId: dashboardSnapshot.activeCyclePaycheckId,
      startDate: dashboardSnapshot.activeCycleStartDate,
      nextStartDate: dashboardSnapshot.activeCycleEndDate,
    };
  }

  if (dashboardSnapshot.currentCycleAnchor) {
    return {
      paycheckCycleId: dashboardSnapshot.currentCycleAnchor.id,
      startDate: dashboardSnapshot.currentCycleAnchor.expectedDate,
      nextStartDate:
        dashboardSnapshot.nextCycleAnchor?.expectedDate ??
        OPEN_ENDED_PAYCHECK_CYCLE_DATE,
    };
  }

  return null;
}

export function getDefaultImportBillDueDate({
  detectedInterval = "monthly",
  suggestedDate,
  today,
}: {
  detectedInterval?: ImportScheduleInterval;
  suggestedDate: string | null | undefined;
  today: string;
}) {
  return getDefaultImportScheduleDate({ detectedInterval, suggestedDate, today });
}

export function getDefaultImportIncomeExpectedDate({
  detectedInterval = "monthly",
  suggestedDate,
  today,
}: {
  detectedInterval?: ImportScheduleInterval;
  suggestedDate: string | null | undefined;
  today: string;
}) {
  return getDefaultImportScheduleDate({ detectedInterval, suggestedDate, today });
}

export function mapPaycheckRecurrenceIntervalToImportScheduleInterval(
  interval: PaycheckRecurrenceInterval | null | undefined
): ImportScheduleInterval | undefined {
  switch (interval) {
    case "weekly":
    case "biweekly":
    case "monthly":
      return interval;
    case "semimonthly":
      return "monthly";
    case undefined:
    case null:
      return undefined;
  }
}

export function getDefaultImportIncomeExpectedDateForRecurrence({
  detectedInterval = "monthly",
  recurrenceInterval,
  suggestedDate,
  today,
}: {
  detectedInterval?: ImportScheduleInterval;
  recurrenceInterval?: PaycheckRecurrenceInterval | null;
  suggestedDate: string | null | undefined;
  today: string;
}) {
  const scheduleInterval =
    mapPaycheckRecurrenceIntervalToImportScheduleInterval(recurrenceInterval) ??
    detectedInterval;

  return getDefaultImportIncomeExpectedDate({
    detectedInterval: scheduleInterval,
    suggestedDate,
    today,
  });
}

export function getDefaultImportScheduleDate({
  detectedInterval = "monthly",
  suggestedDate,
  today,
}: {
  detectedInterval?: ImportScheduleInterval;
  suggestedDate: string | null | undefined;
  today: string;
}) {
  if (!isIsoDate(today)) {
    return today;
  }

  if (!suggestedDate || !isIsoDate(suggestedDate)) {
    return today;
  }

  if (suggestedDate >= today) {
    return suggestedDate;
  }

  return advanceDateToTodayOrLater(suggestedDate, today, detectedInterval);
}

function isIsoDate(value: string) {
  return ISO_DATE_PATTERN.test(value);
}

function advanceDateToTodayOrLater(
  startDate: string,
  today: string,
  interval: ImportScheduleInterval
) {
  switch (interval) {
    case "weekly":
      return advanceByDaysUntilTodayOrLater(startDate, today, 7);
    case "biweekly":
      return advanceByDaysUntilTodayOrLater(startDate, today, 14);
    case "quarterly":
      return alignDayOfMonthToTodayOrLater(startDate, today, 3);
    case "monthly":
    case "irregular":
      return alignDayOfMonthToTodayOrLater(startDate, today, 1);
  }
}

function alignDayOfMonthToTodayOrLater(
  suggestedDate: string,
  today: string,
  monthStep: number
) {
  const targetDay = Number(suggestedDate.slice(8, 10));
  let [year, month] = suggestedDate.split("-").map(Number).slice(0, 2);
  let candidate = buildIsoDate(year, month, targetDay);

  for (let attempts = 0; candidate < today; attempts += 1) {
    if (attempts > 600) {
      return today;
    }

    [year, month] = addMonths(year, month, monthStep);
    candidate = buildIsoDate(year, month, targetDay);
  }

  return candidate;
}

function advanceByDaysUntilTodayOrLater(
  startDate: string,
  today: string,
  stepDays: number
) {
  let candidate = startDate;

  for (let attempts = 0; candidate < today; attempts += 1) {
    if (attempts > 600) {
      return today;
    }

    candidate = addCalendarDays(candidate, stepDays);
  }

  return candidate;
}

function buildIsoDate(year: number, month: number, day: number) {
  const clampedDay = Math.min(day, getDaysInMonth(year, month));

  return `${year}-${padMonth(month)}-${padDay(clampedDay)}`;
}

function addMonths(year: number, month: number, step: number) {
  const absoluteMonth = year * 12 + (month - 1) + step;

  return [Math.floor(absoluteMonth / 12), (absoluteMonth % 12) + 1] as const;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addCalendarDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day));

  nextDate.setUTCDate(nextDate.getUTCDate() + days);

  return buildIsoDate(
    nextDate.getUTCFullYear(),
    nextDate.getUTCMonth() + 1,
    nextDate.getUTCDate()
  );
}

function padMonth(value: number) {
  return `${value}`.padStart(2, "0");
}

function padDay(value: number) {
  return `${value}`.padStart(2, "0");
}
