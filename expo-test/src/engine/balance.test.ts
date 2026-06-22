import { describe, expect, it } from "vitest";

import {
  computeRunningBalance,
  sumBalanceAdjustments,
  sumBillInstances,
  sumConfirmedIncome,
  sumPurchasesByState,
} from "./balance";

describe("balance engine", () => {
  it("sums only active received paychecks", () => {
    expect(
      sumConfirmedIncome([
        { amountCents: 200000, isReceived: true },
        { amountCents: 100000, isReceived: false },
        { amountCents: 50000, isReceived: true, deletedAt: "2026-06-01T00:00:00Z" },
      ])
    ).toBe(200000);
  });

  it("sums purchases by state and excludes soft-deleted purchases", () => {
    const purchases = [
      { amountCents: 1200, state: "charged" as const },
      { amountCents: 3400, state: "pending" as const },
      { amountCents: 5600, state: "pending" as const, deletedAt: "2026-06-01T00:00:00Z" },
    ];

    expect(sumPurchasesByState(purchases, "charged")).toBe(1200);
    expect(sumPurchasesByState(purchases, "pending")).toBe(3400);
  });

  it("sums bill instances by paid state and excludes soft-deleted instances", () => {
    const billInstances = [
      { cycleAmountCents: 8000, isPaid: true },
      { cycleAmountCents: 12000, isPaid: false },
      { cycleAmountCents: 7000, isPaid: false, deletedAt: "2026-06-01T00:00:00Z" },
    ];

    expect(sumBillInstances(billInstances, true)).toBe(8000);
    expect(sumBillInstances(billInstances, false)).toBe(12000);
  });

  it("sums active balance adjustments", () => {
    expect(
      sumBalanceAdjustments([
        { deltaCents: 2500 },
        { deltaCents: -1000 },
        { deltaCents: 5000, deletedAt: "2026-06-01T00:00:00Z" },
      ])
    ).toBe(1500);
  });

  it("computes running balance from opening balance, income, purchases, paid bills, and adjustments", () => {
    expect(
      computeRunningBalance({
        openingBalanceCents: 50000,
        paychecks: [
          { amountCents: 300000, isReceived: true },
          { amountCents: 200000, isReceived: false },
        ],
        purchases: [
          { amountCents: 15000, state: "charged" },
          { amountCents: 7500, state: "pending" },
        ],
        billInstances: [
          { cycleAmountCents: 40000, isPaid: true },
          { cycleAmountCents: 50000, isPaid: false },
        ],
        balanceAdjustments: [{ deltaCents: 10000 }, { deltaCents: -2500 }],
      })
    ).toBe(295000);
  });

  it("defaults opening balance to zero when omitted", () => {
    expect(
      computeRunningBalance({
        paychecks: [{ amountCents: 100000, isReceived: true }],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [],
      })
    ).toBe(100000);
  });

  it("deducts paid bills from current balance", () => {
    expect(
      computeRunningBalance({
        paychecks: [],
        purchases: [],
        billInstances: [{ cycleAmountCents: 40000, isPaid: true }],
        balanceAdjustments: [{ deltaCents: 125000 }],
      })
    ).toBe(85000);
  });
});
