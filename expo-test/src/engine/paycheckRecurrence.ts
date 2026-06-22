import type { PaycheckRecurrenceInterval } from "./types";

export const DEFAULT_PAYCHECK_RECURRENCE_COUNT = 1;

export function findNextDistinctPaycheck<T extends { expectedDate: string }>(
  sortedPaychecks: T[],
  currentIndex: number
): T | null {
  const currentDate = sortedPaychecks[currentIndex]?.expectedDate;

  if (!currentDate) {
    return null;
  }

  return (
    sortedPaychecks
      .slice(currentIndex + 1)
      .find((paycheck) => paycheck.expectedDate > currentDate) ?? null
  );
}

export function findNextDistinctPaycheckDate<T extends { expectedDate: string }>(
  sortedPaychecks: T[],
  currentIndex: number
): string | null {
  return findNextDistinctPaycheck(sortedPaychecks, currentIndex)?.expectedDate ?? null;
}

export function generateUpcomingPaycheckDates({
  count = DEFAULT_PAYCHECK_RECURRENCE_COUNT,
  interval,
  startDate,
}: {
  count?: number;
  interval: PaycheckRecurrenceInterval;
  startDate: string;
}) {
  if (!isIsoDate(startDate)) {
    throw new Error("Recurring paycheck startDate must be an ISO date.");
  }

  if (!Number.isInteger(count) || count < 0) {
    throw new Error("Recurring paycheck count must be zero or greater.");
  }

  const dates: string[] = [];
  let currentDate = parseIsoDate(startDate);

  for (let index = 0; index < count; index += 1) {
    currentDate = getNextPaycheckDate(currentDate, interval);
    dates.push(formatIsoDate(currentDate));
  }

  return dates;
}

function getNextPaycheckDate(
  currentDate: Date,
  interval: PaycheckRecurrenceInterval
) {
  switch (interval) {
    case "weekly":
      return addDays(currentDate, 7);
    case "biweekly":
      return addDays(currentDate, 14);
    case "semimonthly":
      return addDays(currentDate, 15);
    case "monthly":
      return addMonthsClamped(currentDate, 1);
  }
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);

  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function addMonthsClamped(date: Date, months: number) {
  const nextDate = new Date(date);
  const originalDay = nextDate.getDate();

  nextDate.setDate(1);
  nextDate.setMonth(nextDate.getMonth() + months);
  nextDate.setDate(
    Math.min(originalDay, getLastDayOfMonth(nextDate.getFullYear(), nextDate.getMonth()))
  );

  return nextDate;
}

function getLastDayOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function parseIsoDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isIsoDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}
