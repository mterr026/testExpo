import type {
  BillRecurrenceInterval,
  BillCycleWindow,
  EngineBillDefinition,
  GenerateBillCycleInstancesInput,
  GeneratedBillCycleInstance,
} from "./types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const OPEN_ENDED_PAYCHECK_CYCLE_DATE = "9999-12-31";

export function projectedBillCycleInstanceId(billId: string, dueDate: string) {
  return `${billId}-${dueDate}`;
}

export function isProjectedBillCycleInstance(instance: {
  id: string;
  billId: string;
  dueDate: string;
}) {
  return instance.id === projectedBillCycleInstanceId(instance.billId, instance.dueDate);
}

export function generateBillCycleInstances({
  bills,
  cycle,
  existingInstances = [],
}: GenerateBillCycleInstancesInput): GeneratedBillCycleInstance[] {
  const cycleStart = parseIsoDate(cycle.startDate);
  const cycleNextStart = parseIsoDate(cycle.nextStartDate);

  if (cycleStart >= cycleNextStart) {
    throw new Error("Cycle nextStartDate must be after startDate.");
  }

  const existingKeys = new Set(
    existingInstances
      .filter((instance) => !instance.deletedAt)
      .map((instance) =>
        instanceKey(
          instance.billId,
          instance.paycheckCycleId,
          instance.dueDate
        )
      )
  );
  const generated: GeneratedBillCycleInstance[] = [];

  for (const bill of bills) {
    if (!isBillEligibleForCycle(bill, cycleStart)) {
      continue;
    }

    const dueDate = calculateBillDueDateForCycle(bill, cycle);

    if (!dueDate || !isDateInCycle(dueDate, cycle.startDate, cycle.nextStartDate)) {
      continue;
    }

    const key = instanceKey(bill.id, cycle.paycheckCycleId, dueDate);

    if (existingKeys.has(key)) {
      continue;
    }

    existingKeys.add(key);
    generated.push({
      billId: bill.id,
      billType: bill.billType,
      paycheckCycleId: cycle.paycheckCycleId,
      cycleAmountCents: bill.defaultAmountCents,
      isVariableConfirmed: bill.billType === "fixed",
      isPaid: false,
      dueDate,
    });
  }

  return generated;
}

export function calculateBillDueDateForCycle(
  bill: EngineBillDefinition,
  cycle: BillCycleWindow
) {
  if (bill.dueDayOfCycle != null) {
    if (!Number.isInteger(bill.dueDayOfCycle) || bill.dueDayOfCycle < 1) {
      throw new Error(`Invalid dueDayOfCycle for bill ${bill.id}.`);
    }

    return formatIsoDate(
      addDays(parseIsoDate(cycle.startDate), bill.dueDayOfCycle - 1)
    );
  }

  if (bill.dueDateAbsolute) {
    return calculateAbsoluteDueDateForCycle(bill, cycle);
  }

  throw new Error(`Bill ${bill.id} must define a due date.`);
}

function calculateAbsoluteDueDateForCycle(
  bill: EngineBillDefinition,
  cycle: BillCycleWindow
) {
  let dueDate = parseIsoDate(bill.dueDateAbsolute ?? "");
  const cycleStart = parseIsoDate(cycle.startDate);
  const cycleNextStart = parseIsoDate(cycle.nextStartDate);

  for (let attempts = 0; dueDate < cycleStart; attempts += 1) {
    if (attempts > 600) {
      throw new Error(`Unable to find due date for bill ${bill.id}.`);
    }

    dueDate = advanceDueDate(dueDate, bill);
  }

  return dueDate < cycleNextStart ? formatIsoDate(dueDate) : null;
}

function advanceDueDate(date: Date, bill: EngineBillDefinition) {
  switch (bill.recurrenceInterval) {
    case "weekly":
      return addDays(date, 7);
    case "biweekly":
      return addDays(date, 14);
    case "monthly":
      return addMonthsClamped(date, 1);
    case "quarterly":
      return addMonthsClamped(date, 3);
    case "custom":
      if (!bill.customIntervalDays) {
        throw new Error(`Custom bill ${bill.id} must define customIntervalDays.`);
      }

      return addDays(date, bill.customIntervalDays);
  }
}

function isBillEligibleForCycle(bill: EngineBillDefinition, cycleStart: Date) {
  if (bill.isPaused || bill.deletedAt) {
    return false;
  }

  if (!isSupportedBillType(bill.billType)) {
    throw new Error(`Unsupported bill type for bill ${bill.id}.`);
  }

  if (!isSupportedRecurrenceInterval(bill.recurrenceInterval)) {
    throw new Error(`Unsupported recurrence interval for bill ${bill.id}.`);
  }

  if (bill.endDate && parseIsoDate(bill.endDate) <= cycleStart) {
    return false;
  }

  return true;
}

function isDateInCycle(date: string, startDate: string, nextStartDate: string) {
  return date >= startDate && date < nextStartDate;
}

function instanceKey(billId: string, paycheckCycleId: string, dueDate: string) {
  return `${billId}:${paycheckCycleId}:${dueDate}`;
}

function isSupportedBillType(value: string): value is EngineBillDefinition["billType"] {
  return value === "fixed" || value === "variable";
}

function isSupportedRecurrenceInterval(
  value: string
): value is BillRecurrenceInterval {
  return (
    value === "weekly" ||
    value === "biweekly" ||
    value === "monthly" ||
    value === "quarterly" ||
    value === "custom"
  );
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
