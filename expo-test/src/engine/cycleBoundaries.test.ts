import { describe, expect, it } from "vitest";

import { calculatePaycheckCycleBoundary, resolvePaycheckCycleWindow } from "./cycleBoundaries";

describe("paycheck cycle boundaries", () => {
  it("weekly_cycle_returns_six_day_inclusive_end_and_next_start", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2026-06-01",
        recurrenceInterval: "weekly",
      })
    ).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-07",
      nextStartDate: "2026-06-08",
    });
  });

  it("biweekly_cycle_returns_thirteen_day_inclusive_end_and_next_start", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2026-06-01",
        recurrenceInterval: "biweekly",
      })
    ).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-14",
      nextStartDate: "2026-06-15",
    });
  });

  it("semimonthly_cycle_from_first_half_ends_before_fifteenth", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2026-06-01",
        recurrenceInterval: "semimonthly",
      })
    ).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-14",
      nextStartDate: "2026-06-15",
    });
  });

  it("semimonthly_cycle_from_fifteenth_ends_at_month_end", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2026-06-15",
        recurrenceInterval: "semimonthly",
      })
    ).toEqual({
      startDate: "2026-06-15",
      endDate: "2026-06-30",
      nextStartDate: "2026-07-01",
    });
  });

  it("semimonthly_cycle_handles_february_in_a_leap_year", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2028-02-15",
        recurrenceInterval: "semimonthly",
      })
    ).toEqual({
      startDate: "2028-02-15",
      endDate: "2028-02-29",
      nextStartDate: "2028-03-01",
    });
  });

  it("semimonthly_cycle_handles_february_in_a_common_year", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2027-02-15",
        recurrenceInterval: "semimonthly",
      })
    ).toEqual({
      startDate: "2027-02-15",
      endDate: "2027-02-28",
      nextStartDate: "2027-03-01",
    });
  });

  it("semimonthly_cycle_from_late_month_ends_before_next_month", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2026-01-31",
        recurrenceInterval: "semimonthly",
      })
    ).toEqual({
      startDate: "2026-01-31",
      endDate: "2026-01-31",
      nextStartDate: "2026-02-01",
    });
  });

  it("monthly_cycle_uses_same_day_next_month_as_exclusive_next_start", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2026-06-05",
        recurrenceInterval: "monthly",
      })
    ).toEqual({
      startDate: "2026-06-05",
      endDate: "2026-07-04",
      nextStartDate: "2026-07-05",
    });
  });

  it("monthly_cycle_clamps_next_start_for_shorter_months", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2026-01-31",
        recurrenceInterval: "monthly",
      })
    ).toEqual({
      startDate: "2026-01-31",
      endDate: "2026-02-27",
      nextStartDate: "2026-02-28",
    });
  });

  it("cycle_spanning_year_boundary_returns_next_year_dates", () => {
    expect(
      calculatePaycheckCycleBoundary({
        expectedDate: "2026-12-25",
        recurrenceInterval: "biweekly",
      })
    ).toEqual({
      startDate: "2026-12-25",
      endDate: "2027-01-07",
      nextStartDate: "2027-01-08",
    });
  });

  it("invalid_iso_date_throws_before_boundary_calculation", () => {
    expect(() =>
      calculatePaycheckCycleBoundary({
        expectedDate: "2026-02-30",
        recurrenceInterval: "weekly",
      })
    ).toThrow("Invalid calendar date: 2026-02-30");

    expect(() =>
      calculatePaycheckCycleBoundary({
        expectedDate: "06/01/2026",
        recurrenceInterval: "weekly",
      })
    ).toThrow("Expected ISO date in YYYY-MM-DD format: 06/01/2026");
  });
});

describe("resolvePaycheckCycleWindow", () => {
  it("recurring_anchor_uses_recurrence_boundary_even_without_next_paycheck_row", () => {
    expect(
      resolvePaycheckCycleWindow({
        expectedDate: "2026-06-21",
        recurrenceInterval: "biweekly",
        nextPaycheckExpectedDate: null,
      })
    ).toEqual({
      startDate: "2026-06-21",
      endDate: "2026-07-04",
      nextStartDate: "2026-07-05",
    });
  });

  it("recurring_anchor_uses_recurrence_boundary_when_next_paycheck_row_is_later", () => {
    expect(
      resolvePaycheckCycleWindow({
        expectedDate: "2026-06-01",
        recurrenceInterval: "biweekly",
        nextPaycheckExpectedDate: "2026-07-01",
      })
    ).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-14",
      nextStartDate: "2026-06-15",
    });
  });

  it("one_time_anchor_uses_next_paycheck_row_when_present", () => {
    expect(
      resolvePaycheckCycleWindow({
        expectedDate: "2026-06-01",
        recurrenceInterval: null,
        nextPaycheckExpectedDate: "2026-07-01",
      })
    ).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      nextStartDate: "2026-07-01",
    });
  });

  it("one_time_anchor_without_next_paycheck_row_is_open_ended", () => {
    expect(
      resolvePaycheckCycleWindow({
        expectedDate: "2026-06-21",
        recurrenceInterval: null,
        nextPaycheckExpectedDate: null,
      })
    ).toEqual({
      startDate: "2026-06-21",
      endDate: "9999-12-31",
      nextStartDate: "9999-12-31",
    });
  });
});
