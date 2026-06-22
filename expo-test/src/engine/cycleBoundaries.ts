import { OPEN_ENDED_PAYCHECK_CYCLE_DATE } from "./billInstances";
import type {
  PaycheckCycleBoundary,
  PaycheckCycleBoundaryInput,
  PaycheckRecurrenceInterval,
} from "./types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculatePaycheckCycleBoundary({
  expectedDate,
  recurrenceInterval,
}: PaycheckCycleBoundaryInput): PaycheckCycleBoundary {
  const start = parseIsoDate(expectedDate);
  const nextStart = calculateNextStartDate(start, recurrenceInterval);
  const end = addDays(nextStart, -1);

  return {
    startDate: formatIsoDate(start),
    endDate: formatIsoDate(end),
    nextStartDate: formatIsoDate(nextStart),
  };
}

export type ResolvePaycheckCycleWindowInput = {
  expectedDate: string;
  recurrenceInterval: PaycheckRecurrenceInterval | null;
  nextPaycheckExpectedDate?: string | null;
};

/**
 * Resolves the canonical paycheck cycle window for a cycle anchor.
 * Recurring paychecks use recurrence-based boundaries (ImplementationGuide §14.1).
 * One-time paychecks fall back to the next paycheck row, or open-ended when absent.
 */
export function resolvePaycheckCycleWindow({
  expectedDate,
  recurrenceInterval,
  nextPaycheckExpectedDate = null,
}: ResolvePaycheckCycleWindowInput): PaycheckCycleBoundary {
  if (recurrenceInterval) {
    return calculatePaycheckCycleBoundary({
      expectedDate,
      recurrenceInterval,
    });
  }

  if (!nextPaycheckExpectedDate) {
    return {
      startDate: expectedDate,
      endDate: OPEN_ENDED_PAYCHECK_CYCLE_DATE,
      nextStartDate: OPEN_ENDED_PAYCHECK_CYCLE_DATE,
    };
  }

  const start = parseIsoDate(expectedDate);
  const nextStart = parseIsoDate(nextPaycheckExpectedDate);

  if (nextStart.getTime() <= start.getTime()) {
    throw new Error("Cycle nextStartDate must be after startDate.");
  }

  return {
    startDate: formatIsoDate(start),
    endDate: formatIsoDate(addDays(nextStart, -1)),
    nextStartDate: formatIsoDate(nextStart),
  };
}

function calculateNextStartDate(
  start: Date,
  recurrenceInterval: PaycheckCycleBoundaryInput["recurrenceInterval"]
) {
  switch (recurrenceInterval) {
    case "weekly":
      return addDays(start, 7);
    case "biweekly":
      return addDays(start, 14);
    case "semimonthly":
      return calculateSemimonthlyNextStartDate(start);
    case "monthly":
      return addMonthsClamped(start, 1);
  }
}

function calculateSemimonthlyNextStartDate(start: Date) {
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();

  if (day < 15) {
    return createUtcDate(year, month, 15);
  }

  return createUtcDate(year, month + 1, 1);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function addMonthsClamped(date: Date, months: number) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const lastDayOfTargetMonth = getLastDayOfMonth(year, month);

  return createUtcDate(year, month, Math.min(day, lastDayOfTargetMonth));
}

function parseIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`Expected ISO date in YYYY-MM-DD format: ${value}`);
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = createUtcDate(year, month - 1, day);

  if (formatIsoDate(date) !== value) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return date;
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createUtcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function getLastDayOfMonth(year: number, month: number) {
  return createUtcDate(year, month + 1, 0).getUTCDate();
}
