import type { BillCycleInstance } from "@/database/repositories/types";
import type { Bill } from "@/shared/ui/types";

export function getPaidBillInstanceId(
  billToMark: Bill,
  billInstances: BillCycleInstance[]
) {
  if (billToMark.billId && billToMark.id !== billToMark.billId) {
    return billToMark.id;
  }

  return billInstances.find(
    (billInstance) =>
      billInstance.billId === billToMark.billId && billInstance.isPaid
  )?.id;
}
