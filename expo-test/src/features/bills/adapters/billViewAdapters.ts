import type {
  Bill as RepositoryBill,
  BillCycleInstance,
} from "@/database/repositories/types";
import { isProjectedBillCycleInstance } from "@/engine";
import type { Bill } from "@/shared/ui/types";

export function mapRepositoryBillInstanceToPrototype(
  billInstance: BillCycleInstance,
  bills: RepositoryBill[]
): Bill {
  const bill = bills.find((candidate) => candidate.id === billInstance.billId);

  return {
    id: billInstance.id,
    billId: billInstance.billId,
    billType: bill?.billType,
    endDate: bill?.endDate,
    isPaused: bill?.isPaused ?? false,
    name: bill?.name ?? "Bill",
    amountCents: billInstance.cycleAmountCents,
    dueDate: billInstance.dueDate,
    status: billInstance.isPaid
      ? "Paid"
      : bill?.billType === "variable" && !billInstance.isVariableConfirmed
        ? "Needs confirmation"
        : isProjectedBillCycleInstance(billInstance)
          ? "Projected"
          : "Due",
  };
}

export function mapRepositoryBillToPrototype(bill: RepositoryBill): Bill {
  return {
    id: bill.id,
    billId: bill.id,
    billType: bill.billType,
    endDate: bill.endDate,
    isPaused: bill.isPaused,
    name: bill.name,
    amountCents: bill.defaultAmountCents,
    dueDate: bill.dueDateAbsolute ?? formatBillDueDay(bill.dueDayOfCycle),
    status: bill.isPaused ? "Paused" : "Scheduled",
  };
}

function formatBillDueDay(dueDayOfCycle: number | null) {
  return dueDayOfCycle == null ? "Scheduled" : `Day ${dueDayOfCycle}`;
}
