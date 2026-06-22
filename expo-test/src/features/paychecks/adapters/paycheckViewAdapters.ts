import type { Paycheck as RepositoryPaycheck } from "@/database/repositories/types";
import type { PaycheckListItem } from "@/shared/ui/types";

export function mapRepositoryPaycheckToListItem(
  paycheck: RepositoryPaycheck
): PaycheckListItem {
  return {
    id: paycheck.id,
    label: paycheck.label ?? "Paycheck income",
    amountCents: paycheck.amountCents,
    expectedDate: paycheck.expectedDate,
    isReceived: paycheck.isReceived,
    isPrimary: paycheck.isPrimary,
    recurrenceInterval: paycheck.recurrenceInterval,
  };
}
