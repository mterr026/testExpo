import type { Purchase as RepositoryPurchase } from "@/database/repositories/types";
import type { Purchase } from "@/shared/ui/types";

import { getTodayIsoDate } from "@/features/app/homeData";

export function mapRepositoryPurchaseToPrototype(
  purchase: RepositoryPurchase
): Purchase {
  const purchaseDate = purchase.purchaseDate || getTodayIsoDate();

  return {
    id: purchase.id,
    name: purchase.description ?? "Purchase",
    amountCents: Number.isInteger(purchase.amountCents) ? purchase.amountCents : 0,
    status: purchase.state === "pending" ? "Pending" : "Charged",
    date:
      purchaseDate === getTodayIsoDate()
        ? "Today"
        : purchaseDate,
    purchaseDate,
    paycheckCycleId: purchase.paycheckCycleId,
  };
}
