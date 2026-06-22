import type {
  BillCycleWindow,
  EngineBalanceAdjustment,
  EngineBillDefinition,
  EngineBillInstance,
  EnginePaycheck,
  EnginePurchase,
  SafeToSpendInput,
} from "@/engine";

export const fixtureProfileId = "profile-local-demo";
export const fixtureCurrentCycleId = "paycheck-cycle-demo";
export const fixtureNow = "2026-06-01T12:00:00Z";

export function fixturePaycheck(
  overrides: Partial<EnginePaycheck> = {}
): EnginePaycheck {
  return {
    amountCents: 450000,
    isReceived: true,
    ...overrides,
  };
}

export function fixturePurchase(
  overrides: Partial<EnginePurchase> = {}
): EnginePurchase {
  return {
    amountCents: 4500,
    state: "charged",
    ...overrides,
  };
}

export function fixtureBillInstance(
  overrides: Partial<EngineBillInstance> = {}
): EngineBillInstance {
  return {
    cycleAmountCents: 47000,
    isPaid: false,
    ...overrides,
  };
}

export function fixtureBalanceAdjustment(
  overrides: Partial<EngineBalanceAdjustment> = {}
): EngineBalanceAdjustment {
  return {
    deltaCents: 0,
    ...overrides,
  };
}

export function fixtureBillDefinition(
  overrides: Partial<EngineBillDefinition> = {}
): EngineBillDefinition {
  return {
    id: "bill-demo",
    billType: "fixed",
    defaultAmountCents: 47000,
    recurrenceInterval: "monthly",
    dueDayOfCycle: 5,
    isPaused: false,
    ...overrides,
  };
}

export function fixtureCycle(
  overrides: Partial<BillCycleWindow> = {}
): BillCycleWindow {
  return {
    paycheckCycleId: fixtureCurrentCycleId,
    startDate: "2026-06-01",
    nextStartDate: "2026-06-15",
    ...overrides,
  };
}

export const safeToSpendFixture: SafeToSpendInput = {
  paychecks: [fixturePaycheck()],
  purchases: [
    fixturePurchase(),
    fixturePurchase({
      amountCents: 8600,
      state: "pending",
    }),
  ],
  billInstances: [
    fixtureBillInstance({
      cycleAmountCents: 300000,
    }),
    fixtureBillInstance(),
    fixtureBillInstance({
      cycleAmountCents: 18500,
    }),
  ],
  balanceAdjustments: [],
  openingBalanceCents: 0,
  essentialReserveCents: 25000,
};
