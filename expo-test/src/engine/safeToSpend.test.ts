import { describe, expect, it } from "vitest";

import { calculateSafeToSpend } from "./safeToSpend";

describe("safe-to-spend engine", () => {
  it("calculates a complete safe-to-spend breakdown from active records", () => {
    expect(
      calculateSafeToSpend({
        paychecks: [
          { amountCents: 300000, isReceived: true },
          { amountCents: 100000, isReceived: false },
        ],
        purchases: [
          { amountCents: 20000, state: "charged" },
          { amountCents: 12500, state: "pending" },
        ],
        billInstances: [
          { cycleAmountCents: 50000, isPaid: false },
          { cycleAmountCents: 30000, isPaid: true },
        ],
        balanceAdjustments: [{ deltaCents: 10000 }],
        essentialReserveCents: 25000,
      })
    ).toEqual({
      openingBalanceCents: 0,
      confirmedIncomeCents: 300000,
      chargedPurchasesCents: 20000,
      pendingPurchasesCents: 12500,
      paidBillsCents: 30000,
      unpaidBillsCents: 50000,
      balanceAdjustmentsCents: 10000,
      runningBalanceCents: 247500,
      essentialReserveCents: 25000,
      safeToSpendCents: 172500,
    });
  });

  it("includes opening balance in running balance and safe-to-spend", () => {
    const result = calculateSafeToSpend({
      paychecks: [{ amountCents: 100000, isReceived: true }],
      purchases: [{ amountCents: 10000, state: "charged" }],
      billInstances: [{ cycleAmountCents: 20000, isPaid: false }],
      balanceAdjustments: [],
      openingBalanceCents: 50000,
      essentialReserveCents: 5000,
    });

    expect(result.openingBalanceCents).toBe(50000);
    expect(result.runningBalanceCents).toBe(140000);
    expect(result.safeToSpendCents).toBe(115000);
  });

  it("counts_paid_bills_as_spent_without_reserving_them_again", () => {
    const result = calculateSafeToSpend({
      paychecks: [],
      purchases: [],
      billInstances: [{ cycleAmountCents: 45000, isPaid: true }],
      balanceAdjustments: [{ deltaCents: 120000 }],
      essentialReserveCents: 10000,
    });

    expect(result.paidBillsCents).toBe(45000);
    expect(result.unpaidBillsCents).toBe(0);
    expect(result.runningBalanceCents).toBe(75000);
    expect(result.safeToSpendCents).toBe(65000);
  });

  it("keeps_safe_to_spend_stable_when_an_upcoming_bill_is_marked_paid", () => {
    const unpaid = calculateSafeToSpend({
      paychecks: [],
      purchases: [],
      billInstances: [{ cycleAmountCents: 25500, isPaid: false }],
      balanceAdjustments: [{ deltaCents: 180000 }],
      essentialReserveCents: 0,
    });
    const paid = calculateSafeToSpend({
      paychecks: [],
      purchases: [],
      billInstances: [{ cycleAmountCents: 25500, isPaid: true }],
      balanceAdjustments: [{ deltaCents: 180000 }],
      essentialReserveCents: 0,
    });

    expect(unpaid.safeToSpendCents).toBe(154500);
    expect(paid.safeToSpendCents).toBe(154500);
  });

  it("does not deduct pending purchases twice from safe-to-spend", () => {
    const result = calculateSafeToSpend({
      paychecks: [{ amountCents: 100000, isReceived: true }],
      purchases: [{ amountCents: 10000, state: "pending" }],
      billInstances: [],
      balanceAdjustments: [],
      essentialReserveCents: 0,
    });

    expect(result.runningBalanceCents).toBe(90000);
    expect(result.safeToSpendCents).toBe(90000);
  });

  it("excludes soft-deleted records and allows negative safe-to-spend", () => {
    const result = calculateSafeToSpend({
      paychecks: [
        { amountCents: 50000, isReceived: true },
        { amountCents: 100000, isReceived: true, deletedAt: "2026-06-01T00:00:00Z" },
      ],
      purchases: [
        { amountCents: 5000, state: "charged", deletedAt: "2026-06-01T00:00:00Z" },
      ],
      billInstances: [{ cycleAmountCents: 80000, isPaid: false }],
      balanceAdjustments: [],
      essentialReserveCents: 10000,
    });

    expect(result.runningBalanceCents).toBe(50000);
    expect(result.safeToSpendCents).toBe(-40000);
  });

  it("scenario_f_counts_multiple_income_sources_only_after_each_is_received", () => {
    const baseInput = {
      purchases: [{ amountCents: 12000, state: "charged" as const }],
      billInstances: [{ cycleAmountCents: 45000, isPaid: false }],
      balanceAdjustments: [],
      essentialReserveCents: 25000,
    };

    const beforeBothReceived = calculateSafeToSpend({
      ...baseInput,
      paychecks: [
        { amountCents: 180000, isReceived: false },
        { amountCents: 65000, isReceived: false },
      ],
    });
    const afterPrimaryReceived = calculateSafeToSpend({
      ...baseInput,
      paychecks: [
        { amountCents: 180000, isReceived: true },
        { amountCents: 65000, isReceived: false },
      ],
    });
    const afterBothReceived = calculateSafeToSpend({
      ...baseInput,
      paychecks: [
        { amountCents: 180000, isReceived: true },
        { amountCents: 65000, isReceived: true },
      ],
    });

    expect(beforeBothReceived.confirmedIncomeCents).toBe(0);
    expect(beforeBothReceived.safeToSpendCents).toBe(-82000);
    expect(afterPrimaryReceived.confirmedIncomeCents).toBe(180000);
    expect(afterPrimaryReceived.safeToSpendCents).toBe(98000);
    expect(afterBothReceived.confirmedIncomeCents).toBe(245000);
    expect(afterBothReceived.safeToSpendCents).toBe(163000);
  });
});
