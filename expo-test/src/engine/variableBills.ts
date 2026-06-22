import { isPositiveCents } from "@/shared/currency";

import type {
  ConfirmVariableBillInput,
  ConfirmVariableBillResult,
} from "./types";

export function confirmVariableBillAmount({
  bill,
  instance,
  confirmedAmountCents,
}: ConfirmVariableBillInput): ConfirmVariableBillResult {
  if (bill.billType !== "variable") {
    throw new Error(`Bill ${bill.id} is not variable.`);
  }

  if (instance.billId !== bill.id) {
    throw new Error(
      `Bill instance ${instance.billId} does not belong to bill ${bill.id}.`
    );
  }

  if (instance.billType !== "variable") {
    throw new Error(`Bill instance for ${instance.billId} is not variable.`);
  }

  if (instance.isPaid) {
    throw new Error(`Paid bill instance for ${instance.billId} cannot be confirmed.`);
  }

  if (!isPositiveCents(confirmedAmountCents)) {
    throw new Error("Confirmed variable bill amount must be greater than zero.");
  }

  return {
    bill: {
      ...bill,
      defaultAmountCents: confirmedAmountCents,
    },
    instance: {
      ...instance,
      cycleAmountCents: confirmedAmountCents,
      isVariableConfirmed: true,
    },
  };
}
