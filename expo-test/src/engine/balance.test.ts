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

  it("excludes received paychecks on or before the opening balance anchor date", () => {
    const paychecks = [
      {
        amountCents: 398600,
        expectedDate: "2026-07-03",
        isReceived: true,
      },
      {
        amountCents: 248675,
        expectedDate: "2026-07-17",
        isReceived: true,
      },
    ];

    expect(sumConfirmedIncome(paychecks, "2026-07-03")).toBe(248675);
    expect(
      computeRunningBalance({
        openingBalanceCents: 398600,
        openingBalanceAsOfDate: "2026-07-03",
        paychecks,
        purchases: [],
        billInstances: [],
        balanceAdjustments: [],
      })
    ).toBe(647275);
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

  it("counts_paid_bills_after_the_opening_balance_anchor_instant", () => {
    const billInstances = [
      {
        cycleAmountCents: 8500,
        dueDate: "2026-07-03",
        isPaid: true,
        paidAt: "2026-07-03T19:00:00.000Z",
      },
      {
        cycleAmountCents: 14255,
        dueDate: "2026-07-03",
        isPaid: true,
        paidAt: "2026-07-03T08:00:00.000Z",
      },
    ];

    expect(
      sumBillInstances(billInstances, true, "2026-07-03T14:00:00.000Z")
    ).toBe(8500);
    expect(
      computeRunningBalance({
        openingBalanceCents: 398600,
        openingBalanceAsOfDate: "2026-07-03T14:00:00.000Z",
        paychecks: [],
        purchases: [],
        billInstances,
        balanceAdjustments: [],
      })
    ).toBe(390100);
  });

  it("counts same-day paycheck when receivedAt is after the opening balance anchor", () => {
    const paychecks = [
      {
        amountCents: 248675,
        expectedDate: "2026-07-03",
        isReceived: true,
        receivedAt: "2026-07-03T19:00:00.000Z",
      },
      {
        amountCents: 248675,
        expectedDate: "2026-07-17",
        isReceived: true,
      },
    ];

    expect(sumConfirmedIncome(paychecks, "2026-07-03T14:00:00.000Z")).toBe(
      497350
    );
  });

  it("excludes paid bills on or before the opening balance anchor date", () => {
    const billInstances = [
      { cycleAmountCents: 14255, dueDate: "2026-07-03", isPaid: true },
      { cycleAmountCents: 50000, dueDate: "2026-07-17", isPaid: true },
      { cycleAmountCents: 25500, dueDate: "2026-07-20", isPaid: false },
    ];

    expect(sumBillInstances(billInstances, true, "2026-07-03")).toBe(50000);
    expect(sumBillInstances(billInstances, false, "2026-07-03")).toBe(25500);
    expect(
      computeRunningBalance({
        openingBalanceCents: 398600,
        openingBalanceAsOfDate: "2026-07-03",
        paychecks: [],
        purchases: [],
        billInstances,
        balanceAdjustments: [],
      })
    ).toBe(348600);
  });

  it("counts same-day paid bills when paidAt is recorded after the opening balance anchor", () => {
    const billInstances = [
      {
        cycleAmountCents: 250000,
        dueDate: "2026-07-03",
        isPaid: true,
        paidAt: "2026-07-03T19:00:00.000Z",
      },
    ];

    expect(sumBillInstances(billInstances, true, "2026-07-03")).toBe(250000);
    expect(
      computeRunningBalance({
        openingBalanceCents: 398600,
        openingBalanceAsOfDate: "2026-07-03",
        paychecks: [],
        purchases: [],
        billInstances,
        balanceAdjustments: [],
      })
    ).toBe(148600);
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
