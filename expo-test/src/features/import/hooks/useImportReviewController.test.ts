import { describe, expect, it } from "vitest";

import type { DashboardSnapshot } from "@/features/dashboard/services";

import {
  getDefaultImportBillDueDate,
  getDefaultImportIncomeExpectedDate,
  getDefaultImportIncomeExpectedDateForRecurrence,
  getImportBillCycle,
} from "@/features/import/importBillCycle";

describe("getImportBillCycle", () => {
  it("uses_active_cycle_fields_when_no_current_anchor_exists_yet", () => {
    const snapshot = {
      activeCycleEndDate: "2026-07-01",
      activeCyclePaycheckId: "paycheck-next",
      activeCycleStartDate: "2026-06-21",
      currentCycleAnchor: null,
      nextCycleAnchor: {
        id: "paycheck-next",
        expectedDate: "2026-07-01",
      },
    } as DashboardSnapshot;

    expect(getImportBillCycle(snapshot)).toEqual({
      paycheckCycleId: "paycheck-next",
      startDate: "2026-06-21",
      nextStartDate: "2026-07-01",
    });
  });

  it("falls_back_to_current_cycle_anchor_when_active_fields_are_missing", () => {
    const snapshot = {
      activeCycleEndDate: null,
      activeCyclePaycheckId: null,
      activeCycleStartDate: null,
      currentCycleAnchor: {
        id: "paycheck-current",
        expectedDate: "2026-07-01",
      },
      nextCycleAnchor: {
        expectedDate: "2026-07-15",
      },
    } as DashboardSnapshot;

    expect(getImportBillCycle(snapshot)).toEqual({
      paycheckCycleId: "paycheck-current",
      startDate: "2026-07-01",
      nextStartDate: "2026-07-15",
    });
  });
});

describe("getDefaultImportBillDueDate", () => {
  it("advances_past_monthly_statement_dates_to_the_next_due_occurrence", () => {
    expect(
      getDefaultImportBillDueDate({
        detectedInterval: "monthly",
        suggestedDate: "2026-06-05",
        today: "2026-06-21",
      })
    ).toBe("2026-07-05");
  });

  it("advances_past_biweekly_statement_dates_to_the_next_due_occurrence", () => {
    expect(
      getDefaultImportBillDueDate({
        detectedInterval: "biweekly",
        suggestedDate: "2026-06-05",
        today: "2026-06-21",
      })
    ).toBe("2026-07-03");
  });

  it("keeps_future_imported_dates_for_upcoming_bills", () => {
    expect(
      getDefaultImportBillDueDate({
        suggestedDate: "2026-06-25",
        today: "2026-06-21",
      })
    ).toBe("2026-06-25");
  });
});

describe("getDefaultImportIncomeExpectedDate", () => {
  it("advances_past_monthly_statement_pay_dates_to_the_next_occurrence", () => {
    expect(
      getDefaultImportIncomeExpectedDate({
        detectedInterval: "monthly",
        suggestedDate: "2026-01-15",
        today: "2026-06-21",
      })
    ).toBe("2026-07-15");
  });

  it("preserves_the_statement_day_of_month_instead_of_drifting_a_day_ahead", () => {
    expect(
      getDefaultImportIncomeExpectedDate({
        detectedInterval: "monthly",
        suggestedDate: "2026-01-05",
        today: "2026-06-21",
      })
    ).toBe("2026-07-05");
  });

  it("advances_past_biweekly_statement_pay_dates_to_the_next_occurrence", () => {
    expect(
      getDefaultImportIncomeExpectedDate({
        detectedInterval: "biweekly",
        suggestedDate: "2026-01-03",
        today: "2026-06-21",
      })
    ).toBe("2026-07-04");
  });
});

describe("getDefaultImportIncomeExpectedDateForRecurrence", () => {
  it("uses_selected_biweekly_recurrence_instead_of_monthly_detection", () => {
    expect(
      getDefaultImportIncomeExpectedDateForRecurrence({
        detectedInterval: "monthly",
        recurrenceInterval: "biweekly",
        suggestedDate: "2026-06-05",
        today: "2026-06-21",
      })
    ).toBe("2026-07-03");
  });

  it("keeps_a_future_anchor_when_biweekly_is_selected", () => {
    expect(
      getDefaultImportIncomeExpectedDateForRecurrence({
        detectedInterval: "monthly",
        recurrenceInterval: "biweekly",
        suggestedDate: "2026-06-05",
        today: "2026-06-01",
      })
    ).toBe("2026-06-05");
  });
});
