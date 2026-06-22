import { describe, expect, it } from "vitest";

import { calculateSafeToSpend, confirmVariableBillAmount } from "@/engine";
import {
  fixtureBillDefinition,
  fixturePaycheck,
} from "@/shared/fixtures/financialFixtures";

const variableBill = fixtureBillDefinition({
  id: "electric",
  billType: "variable",
  defaultAmountCents: 18500,
});

const variableInstance = {
  billId: "electric",
  billType: "variable" as const,
  paycheckCycleId: "cycle-1",
  cycleAmountCents: 18500,
  isVariableConfirmed: false,
  isPaid: false as const,
  dueDate: "2026-06-08",
};

describe("variable bill confirmation", () => {
  it("variable_bill_confirmation_updates_instance_and_future_default_amount", () => {
    expect(
      confirmVariableBillAmount({
        bill: variableBill,
        instance: variableInstance,
        confirmedAmountCents: 21150,
      })
    ).toEqual({
      bill: {
        ...variableBill,
        defaultAmountCents: 21150,
      },
      instance: {
        ...variableInstance,
        cycleAmountCents: 21150,
        isVariableConfirmed: true,
      },
    });
  });

  it("variable_bill_confirmation_changes_safe_to_spend_by_confirmed_delta", () => {
    const before = calculateSafeToSpend({
      paychecks: [fixturePaycheck({ amountCents: 100000 })],
      purchases: [],
      billInstances: [
        {
          cycleAmountCents: variableInstance.cycleAmountCents,
          isPaid: false,
        },
      ],
      balanceAdjustments: [],
      essentialReserveCents: 0,
    });
    const { instance } = confirmVariableBillAmount({
      bill: variableBill,
      instance: variableInstance,
      confirmedAmountCents: 21150,
    });
    const after = calculateSafeToSpend({
      paychecks: [fixturePaycheck({ amountCents: 100000 })],
      purchases: [],
      billInstances: [
        {
          cycleAmountCents: instance.cycleAmountCents,
          isPaid: false,
        },
      ],
      balanceAdjustments: [],
      essentialReserveCents: 0,
    });

    expect(before.safeToSpendCents).toBe(81500);
    expect(after.safeToSpendCents).toBe(78850);
  });

  it("rejects_confirmation_for_fixed_bill", () => {
    expect(() =>
      confirmVariableBillAmount({
        bill: fixtureBillDefinition({ id: "rent", billType: "fixed" }),
        instance: {
          ...variableInstance,
          billId: "rent",
          billType: "fixed",
        },
        confirmedAmountCents: 100000,
      })
    ).toThrow("Bill rent is not variable.");
  });

  it("rejects_instance_that_belongs_to_a_different_bill", () => {
    expect(() =>
      confirmVariableBillAmount({
        bill: variableBill,
        instance: {
          ...variableInstance,
          billId: "water",
        },
        confirmedAmountCents: 21150,
      })
    ).toThrow("Bill instance water does not belong to bill electric.");
  });

  it("rejects_non_variable_instance", () => {
    expect(() =>
      confirmVariableBillAmount({
        bill: variableBill,
        instance: {
          ...variableInstance,
          billType: "fixed",
        },
        confirmedAmountCents: 21150,
      })
    ).toThrow("Bill instance for electric is not variable.");
  });

  it("rejects_paid_instance", () => {
    expect(() =>
      confirmVariableBillAmount({
        bill: variableBill,
        instance: {
          ...variableInstance,
          isPaid: true,
        },
        confirmedAmountCents: 21150,
      })
    ).toThrow("Paid bill instance for electric cannot be confirmed.");
  });

  it("rejects_zero_or_non_integer_confirmed_amounts", () => {
    expect(() =>
      confirmVariableBillAmount({
        bill: variableBill,
        instance: variableInstance,
        confirmedAmountCents: 0,
      })
    ).toThrow("Confirmed variable bill amount must be greater than zero.");

    expect(() =>
      confirmVariableBillAmount({
        bill: variableBill,
        instance: variableInstance,
        confirmedAmountCents: 211.5,
      })
    ).toThrow("Confirmed variable bill amount must be greater than zero.");
  });
});
