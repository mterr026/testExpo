import { isProjectedBillListItem } from "@/engine";
import type { Bill } from "@/shared/ui/types";

export function shouldDeleteEntireBillDefinition(bill: Bill) {
  return (
    bill.isPaused ||
    bill.id === bill.billId ||
    bill.status === "Scheduled" ||
    bill.status === "Projected" ||
    isProjectedBillListItem(bill)
  );
}

export function shouldUpdateBillDefinitionOnly(bill: Bill) {
  return (
    bill.status === "Paused" ||
    bill.id === bill.billId ||
    isProjectedBillListItem(bill)
  );
}
