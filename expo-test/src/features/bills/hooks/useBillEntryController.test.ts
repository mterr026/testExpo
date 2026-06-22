import { describe, expect, it } from "vitest";

import type { BillCycleInstance } from "@/database/repositories/types";
import type { Bill } from "@/shared/ui/types";

import { getPaidBillInstanceId } from "@/features/bills/billCycleResolution";

const paidBillInstance: BillCycleInstance = {
  id: "instance-paid",
  billId: "bill-1",
  paycheckCycleId: "paycheck-1",
  cycleAmountCents: 25000,
  isVariableConfirmed: true,
  isPaid: true,
  paidAt: "2026-06-05T12:00:00.000Z",
  dueDate: "2026-06-05",
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-05T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

describe("getPaidBillInstanceId", () => {
  it("uses_the_selected_paid_bill_instance_id", () => {
    const bill: Bill = {
      id: "instance-paid",
      billId: "bill-1",
      name: "Comcast",
      amountCents: 25000,
      dueDate: "2026-06-05",
      status: "Paid",
    };

    expect(getPaidBillInstanceId(bill, [paidBillInstance])).toBe("instance-paid");
  });

  it("finds_a_paid_instance_for_a_saved_bill_definition", () => {
    const bill: Bill = {
      id: "bill-1",
      billId: "bill-1",
      name: "Comcast",
      amountCents: 25000,
      dueDate: "2026-06-05",
      status: "Paid",
    };

    expect(getPaidBillInstanceId(bill, [paidBillInstance])).toBe("instance-paid");
  });

  it("finds_a_paid_instance_when_the_paid_item_is_outside_the_active_cycle", () => {
    const previousCyclePaidInstance: BillCycleInstance = {
      ...paidBillInstance,
      id: "instance-previous-paid",
      paycheckCycleId: "paycheck-previous",
    };
    const bill: Bill = {
      id: "bill-1",
      billId: "bill-1",
      name: "Comcast",
      amountCents: 25000,
      dueDate: "2026-06-05",
      status: "Paid",
    };

    expect(getPaidBillInstanceId(bill, [previousCyclePaidInstance])).toBe(
      "instance-previous-paid"
    );
  });

  it("returns_undefined_when_no_paid_cycle_instance_exists", () => {
    const bill: Bill = {
      id: "bill-2",
      billId: "bill-2",
      name: "Electric",
      amountCents: 14255,
      dueDate: "2026-06-22",
      status: "Paid",
    };

    expect(getPaidBillInstanceId(bill, [paidBillInstance])).toBeUndefined();
  });
});
