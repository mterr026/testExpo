import { describe, expect, it } from "vitest";

import type { PaycheckBillCoverage, PaycheckListItem } from "@/shared/ui/types";

import { pickPaycheckIdForTutorialCoverage } from "./paycheckTutorial";

const paycheck = (
  id: string,
  expectedDate = "2026-07-03"
): PaycheckListItem => ({
  id,
  label: id,
  amountCents: 100000,
  expectedDate,
  isPrimary: true,
  isReceived: false,
  isRecurring: true,
  recurrenceInterval: "biweekly",
});

const coverage = (
  paycheckId: string,
  overrides: Partial<PaycheckBillCoverage> = {}
): PaycheckBillCoverage => ({
  billsImpactCents: 5000,
  canProjectBills: true,
  coveredBills: [
    {
      amountCents: 5000,
      dueDate: "2026-07-10",
      id: `${paycheckId}-bill`,
      name: "Bill",
    },
  ],
  isCurrentCycle: false,
  nextPaycheckDate: "2026-07-17",
  paycheckId,
  paycheckImpactCents: 100000,
  projectedSafeToSpendCents: 95000,
  startingSafeToSpendCents: 90000,
  totalCents: 5000,
  ...overrides,
});

describe("pickPaycheckIdForTutorialCoverage", () => {
  it("prefers_the_current_cycle_paycheck_with_projectable_bills", () => {
    expect(
      pickPaycheckIdForTutorialCoverage(
        [paycheck("future"), paycheck("current", "2026-06-20")],
        [
          coverage("future"),
          coverage("current", { isCurrentCycle: true }),
        ]
      )
    ).toBe("current");
  });

  it("falls_back_to_the_first_expected_paycheck_with_bills", () => {
    expect(
      pickPaycheckIdForTutorialCoverage([paycheck("first"), paycheck("second")], [
        coverage("second"),
      ])
    ).toBe("second");
  });

  it("returns_null_when_there_are_no_paychecks", () => {
    expect(pickPaycheckIdForTutorialCoverage([], [])).toBeNull();
  });
});
