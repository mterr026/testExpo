import { describe, expect, it } from "vitest";

import { calculateSafeToSpend, generateBillCycleInstances } from "@/engine";

import {
  fixtureBillDefinition,
  fixtureCycle,
  fixturePurchase,
  safeToSpendFixture,
} from "./financialFixtures";

describe("financial fixtures", () => {
  it("safe_to_spend_fixture_represents_a_realistic_current_cycle", () => {
    expect(calculateSafeToSpend(safeToSpendFixture)).toEqual({
      openingBalanceCents: 0,
      confirmedIncomeCents: 450000,
      chargedPurchasesCents: 4500,
      pendingPurchasesCents: 8600,
      paidBillsCents: 0,
      unpaidBillsCents: 365500,
      balanceAdjustmentsCents: 0,
      runningBalanceCents: 436900,
      essentialReserveCents: 25000,
      safeToSpendCents: 46400,
    });
  });

  it("builders_allow_targeted_overrides_without_mutating_defaults", () => {
    expect(fixturePurchase({ amountCents: 1200, state: "pending" })).toEqual({
      amountCents: 1200,
      state: "pending",
    });

    expect(
      generateBillCycleInstances({
        bills: [fixtureBillDefinition({ id: "internet", dueDayOfCycle: 3 })],
        cycle: fixtureCycle(),
      })
    ).toEqual([
      {
        billId: "internet",
        billType: "fixed",
        paycheckCycleId: "paycheck-cycle-demo",
        cycleAmountCents: 47000,
        isVariableConfirmed: true,
        isPaid: false,
        dueDate: "2026-06-03",
      },
    ]);
  });
});
