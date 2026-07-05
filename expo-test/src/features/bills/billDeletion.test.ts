import { describe, expect, it } from "vitest";

import { projectedBillCycleInstanceId } from "@/engine";
import type { Bill } from "@/shared/ui/types";

import {
  shouldDeleteEntireBillDefinition,
  shouldUpdateBillDefinitionOnly,
} from "./billDeletion";

function createBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "bill-1",
    billId: "bill-1",
    name: "Internet",
    amountCents: 9000,
    dueDate: "2026-06-05",
    status: "Due",
    ...overrides,
  };
}

describe("shouldDeleteEntireBillDefinition", () => {
  it("deletes_the_definition_for_projected_cycle_rows", () => {
    const bill = createBill({
      billId: "bill-1",
      dueDate: "2026-06-05",
      id: projectedBillCycleInstanceId("bill-1", "2026-06-05"),
      status: "Projected",
    });

    expect(shouldDeleteEntireBillDefinition(bill)).toBe(true);
  });

  it("deletes_the_definition_for_scheduled_and_paused_bills", () => {
    expect(
      shouldDeleteEntireBillDefinition(
        createBill({ id: "bill-1", billId: "bill-1", status: "Scheduled" })
      )
    ).toBe(true);
    expect(
      shouldDeleteEntireBillDefinition(
        createBill({ id: "instance-1", billId: "bill-1", isPaused: true })
      )
    ).toBe(true);
  });

  it("deletes_only_the_cycle_instance_for_saved_due_rows", () => {
    expect(
      shouldDeleteEntireBillDefinition(
        createBill({ id: "instance-1", billId: "bill-1", status: "Due" })
      )
    ).toBe(false);
  });
});

describe("shouldUpdateBillDefinitionOnly", () => {
  it("updates_definition_only_for_projected_scheduled_and_paused_bills", () => {
    expect(
      shouldUpdateBillDefinitionOnly(
        createBill({
          billId: "bill-1",
          dueDate: "2026-06-05",
          id: projectedBillCycleInstanceId("bill-1", "2026-06-05"),
          status: "Projected",
        })
      )
    ).toBe(true);
    expect(
      shouldUpdateBillDefinitionOnly(
        createBill({ id: "bill-1", billId: "bill-1", status: "Scheduled" })
      )
    ).toBe(true);
    expect(
      shouldUpdateBillDefinitionOnly(
        createBill({ id: "instance-1", billId: "bill-1", status: "Paused" })
      )
    ).toBe(true);
  });

  it("updates_cycle_instance_for_materialized_due_rows", () => {
    expect(
      shouldUpdateBillDefinitionOnly(
        createBill({ id: "instance-1", billId: "bill-1", status: "Due" })
      )
    ).toBe(false);
  });
});
