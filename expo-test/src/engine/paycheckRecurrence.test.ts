import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAYCHECK_RECURRENCE_COUNT,
  generateUpcomingPaycheckDates,
} from "./paycheckRecurrence";

describe("paycheck recurrence engine", () => {
  it("generates_biweekly_expected_paycheck_dates", () => {
    expect(
      generateUpcomingPaycheckDates({
        count: 3,
        interval: "biweekly",
        startDate: "2026-06-05",
      })
    ).toEqual(["2026-06-19", "2026-07-03", "2026-07-17"]);
  });

  it("defaults_to_the_next_expected_paycheck", () => {
    expect(DEFAULT_PAYCHECK_RECURRENCE_COUNT).toBe(1);
    expect(
      generateUpcomingPaycheckDates({
        interval: "biweekly",
        startDate: "2026-06-05",
      })
    ).toEqual(["2026-06-19"]);
  });

  it("generates_weekly_and_semimonthly_dates", () => {
    expect(
      generateUpcomingPaycheckDates({
        count: 2,
        interval: "weekly",
        startDate: "2026-06-05",
      })
    ).toEqual(["2026-06-12", "2026-06-19"]);
    expect(
      generateUpcomingPaycheckDates({
        count: 2,
        interval: "semimonthly",
        startDate: "2026-06-05",
      })
    ).toEqual(["2026-06-20", "2026-07-05"]);
  });

  it("clamps_monthly_dates_to_the_end_of_shorter_months", () => {
    expect(
      generateUpcomingPaycheckDates({
        count: 2,
        interval: "monthly",
        startDate: "2026-01-31",
      })
    ).toEqual(["2026-02-28", "2026-03-28"]);
  });

  it("rejects_invalid_input", () => {
    expect(() =>
      generateUpcomingPaycheckDates({
        interval: "biweekly",
        startDate: "06/05/2026",
      })
    ).toThrow("Recurring paycheck startDate must be an ISO date.");
    expect(() =>
      generateUpcomingPaycheckDates({
        count: -1,
        interval: "biweekly",
        startDate: "2026-06-05",
      })
    ).toThrow("Recurring paycheck count must be zero or greater.");
  });
});
