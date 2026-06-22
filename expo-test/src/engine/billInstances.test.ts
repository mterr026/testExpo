import { describe, expect, it } from "vitest";

import {
  calculateBillDueDateForCycle,
  generateBillCycleInstances,
} from "./billInstances";
import type {
  BillCycleWindow,
  EngineBillDefinition,
} from "./types";

const cycle: BillCycleWindow = {
  paycheckCycleId: "paycheck-1",
  startDate: "2026-06-01",
  nextStartDate: "2026-06-15",
};

function bill(
  overrides: Partial<EngineBillDefinition> = {}
): EngineBillDefinition {
  return {
    id: "bill-1",
    billType: "fixed",
    defaultAmountCents: 10000,
    recurrenceInterval: "monthly",
    dueDayOfCycle: 1,
    isPaused: false,
    ...overrides,
  };
}

describe("bill cycle instance generation", () => {
  it("fixed_bill_generation_returns_confirmed_unpaid_instance", () => {
    expect(
      generateBillCycleInstances({
        bills: [
          bill({
            id: "rent",
            defaultAmountCents: 125000,
            dueDayOfCycle: 3,
          }),
        ],
        cycle,
      })
    ).toEqual([
      {
        billId: "rent",
        billType: "fixed",
        paycheckCycleId: "paycheck-1",
        cycleAmountCents: 125000,
        isVariableConfirmed: true,
        isPaid: false,
        dueDate: "2026-06-03",
      },
    ]);
  });

  it("variable_bill_generation_returns_estimated_unconfirmed_instance", () => {
    expect(
      generateBillCycleInstances({
        bills: [
          bill({
            id: "electric",
            billType: "variable",
            defaultAmountCents: 18500,
            dueDayOfCycle: 8,
          }),
        ],
        cycle,
      })
    ).toEqual([
      {
        billId: "electric",
        billType: "variable",
        paycheckCycleId: "paycheck-1",
        cycleAmountCents: 18500,
        isVariableConfirmed: false,
        isPaid: false,
        dueDate: "2026-06-08",
      },
    ]);
  });

  it("paused_deleted_and_ended_bills_do_not_generate_instances", () => {
    expect(
      generateBillCycleInstances({
        bills: [
          bill({ id: "paused", isPaused: true }),
          bill({ id: "deleted", deletedAt: "2026-06-01T00:00:00Z" }),
          bill({ id: "ended", endDate: "2026-06-01" }),
        ],
        cycle,
      })
    ).toEqual([]);
  });

  it("bill_with_end_date_after_cycle_start_can_generate", () => {
    expect(
      generateBillCycleInstances({
        bills: [bill({ id: "installment", endDate: "2026-06-02" })],
        cycle,
      })
    ).toHaveLength(1);
  });

  it("due_day_of_cycle_outside_cycle_window_does_not_generate_instance", () => {
    expect(
      generateBillCycleInstances({
        bills: [bill({ id: "late", dueDayOfCycle: 15 })],
        cycle,
      })
    ).toEqual([]);
  });

  it("due_day_of_cycle_on_last_cycle_day_generates_instance", () => {
    expect(
      generateBillCycleInstances({
        bills: [bill({ id: "last-day", dueDayOfCycle: 14 })],
        cycle,
      })
    ).toEqual([
      {
        billId: "last-day",
        billType: "fixed",
        paycheckCycleId: "paycheck-1",
        cycleAmountCents: 10000,
        isVariableConfirmed: true,
        isPaid: false,
        dueDate: "2026-06-14",
      },
    ]);
  });

  it("existing_active_instance_prevents_duplicate_generation", () => {
    expect(
      generateBillCycleInstances({
        bills: [bill({ id: "rent", dueDayOfCycle: 3 })],
        cycle,
        existingInstances: [
          {
            billId: "rent",
            paycheckCycleId: "paycheck-1",
            dueDate: "2026-06-03",
          },
        ],
      })
    ).toEqual([]);
  });

  it("soft_deleted_existing_instance_allows_regeneration", () => {
    expect(
      generateBillCycleInstances({
        bills: [bill({ id: "rent", dueDayOfCycle: 3 })],
        cycle,
        existingInstances: [
          {
            billId: "rent",
            paycheckCycleId: "paycheck-1",
            dueDate: "2026-06-03",
            deletedAt: "2026-06-04T00:00:00Z",
          },
        ],
      })
    ).toHaveLength(1);
  });

  it("duplicate_bills_in_input_generate_only_one_active_instance", () => {
    expect(
      generateBillCycleInstances({
        bills: [
          bill({ id: "rent", dueDayOfCycle: 3 }),
          bill({ id: "rent", dueDayOfCycle: 3 }),
        ],
        cycle,
      })
    ).toHaveLength(1);
  });

  it("monthly_absolute_due_date_advances_to_occurrence_inside_cycle", () => {
    expect(
      generateBillCycleInstances({
        bills: [
          bill({
            id: "internet",
            dueDayOfCycle: null,
            dueDateAbsolute: "2026-01-05",
            recurrenceInterval: "monthly",
          }),
        ],
        cycle,
      })
    ).toEqual([
      {
        billId: "internet",
        billType: "fixed",
        paycheckCycleId: "paycheck-1",
        cycleAmountCents: 10000,
        isVariableConfirmed: true,
        isPaid: false,
        dueDate: "2026-06-05",
      },
    ]);
  });

  it("monthly_absolute_due_date_outside_cycle_does_not_generate", () => {
    expect(
      generateBillCycleInstances({
        bills: [
          bill({
            id: "internet",
            dueDayOfCycle: null,
            dueDateAbsolute: "2026-01-20",
            recurrenceInterval: "monthly",
          }),
        ],
        cycle,
      })
    ).toEqual([]);
  });

  it("weekly_absolute_due_date_advances_by_seven_days", () => {
    expect(
      calculateBillDueDateForCycle(
        bill({
          dueDayOfCycle: null,
          dueDateAbsolute: "2026-05-25",
          recurrenceInterval: "weekly",
        }),
        cycle
      )
    ).toBe("2026-06-01");
  });

  it("biweekly_absolute_due_date_advances_by_fourteen_days", () => {
    expect(
      calculateBillDueDateForCycle(
        bill({
          dueDayOfCycle: null,
          dueDateAbsolute: "2026-05-18",
          recurrenceInterval: "biweekly",
        }),
        cycle
      )
    ).toBe("2026-06-01");
  });

  it("quarterly_absolute_due_date_advances_by_three_months", () => {
    expect(
      calculateBillDueDateForCycle(
        bill({
          dueDayOfCycle: null,
          dueDateAbsolute: "2026-03-10",
          recurrenceInterval: "quarterly",
        }),
        cycle
      )
    ).toBe("2026-06-10");
  });

  it("custom_absolute_due_date_advances_by_custom_interval_days", () => {
    expect(
      calculateBillDueDateForCycle(
        bill({
          dueDayOfCycle: null,
          dueDateAbsolute: "2026-05-30",
          recurrenceInterval: "custom",
          customIntervalDays: 3,
        }),
        cycle
      )
    ).toBe("2026-06-02");
  });

  it("custom_bill_without_interval_throws", () => {
    expect(() =>
      calculateBillDueDateForCycle(
        bill({
          dueDayOfCycle: null,
          dueDateAbsolute: "2026-05-30",
          recurrenceInterval: "custom",
          customIntervalDays: null,
        }),
        cycle
      )
    ).toThrow("Custom bill bill-1 must define customIntervalDays.");
  });

  it("invalid_due_day_of_cycle_throws", () => {
    expect(() =>
      calculateBillDueDateForCycle(bill({ dueDayOfCycle: 0 }), cycle)
    ).toThrow("Invalid dueDayOfCycle for bill bill-1.");
  });

  it("bill_without_due_date_throws", () => {
    expect(() =>
      calculateBillDueDateForCycle(
        bill({ dueDayOfCycle: null, dueDateAbsolute: null }),
        cycle
      )
    ).toThrow("Bill bill-1 must define a due date.");
  });

  it("invalid_cycle_window_throws", () => {
    expect(() =>
      generateBillCycleInstances({
        bills: [bill()],
        cycle: {
          paycheckCycleId: "bad-cycle",
          startDate: "2026-06-15",
          nextStartDate: "2026-06-15",
        },
      })
    ).toThrow("Cycle nextStartDate must be after startDate.");
  });
});
