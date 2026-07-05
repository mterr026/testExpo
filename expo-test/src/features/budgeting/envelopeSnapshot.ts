import type { Envelope, Paycheck, Purchase } from "@/database/repositories/types";
import type { EnvelopeSnapshot, EnvelopeSnapshotEntry } from "@/engine";
import { mapRepositoryPaycheckToListItem } from "@/features/paychecks/adapters/paycheckViewAdapters";
import { mapRepositoryPurchaseToPrototype } from "@/features/purchases/adapters/purchaseViewAdapters";
import { purchaseBelongsToCycle } from "@/features/purchases/purchaseCycles";

type BuildEnvelopeSnapshotInput = {
  envelopes: Envelope[];
  purchases: Purchase[];
  paychecks: Paycheck[];
  activeCyclePaycheckId: string | null;
  activeCycleStartDate: string | null;
  activeCycleEndDate: string | null;
  envelopesEnabled: boolean;
};

export function buildEnvelopeSnapshot(
  input: BuildEnvelopeSnapshotInput
): EnvelopeSnapshot {
  if (!input.envelopesEnabled) {
    return {
      envelopesEnabled: false,
      activeCyclePaycheckId: input.activeCyclePaycheckId,
      entries: [],
      totalReservedCents: 0,
    };
  }

  const purchaseCycleContext = {
    activeCyclePaycheckId: input.activeCyclePaycheckId,
    activeCycleStartDate: input.activeCycleStartDate,
    activeCycleEndDate: input.activeCycleEndDate,
    paychecks: input.paychecks.map(mapRepositoryPaycheckToListItem),
  };

  const activeEnvelopes = input.envelopes.filter(
    (envelope) => !envelope.deletedAt && !envelope.isPaused
  );

  const entries: EnvelopeSnapshotEntry[] = activeEnvelopes.map((envelope) => {
    const spentCents = sumEnvelopeSpent({
      envelopeId: envelope.id,
      purchases: input.purchases,
      purchaseCycleContext,
    });
    const allocatedCents = envelope.allocationCents;
    const remainingCents = allocatedCents - spentCents;
    const reservedCents = Math.max(0, remainingCents);

    return {
      envelopeId: envelope.id,
      allocatedCents,
      spentCents,
      remainingCents,
      reservedCents,
    };
  });

  return {
    envelopesEnabled: true,
    activeCyclePaycheckId: input.activeCyclePaycheckId,
    entries,
    totalReservedCents: entries.reduce(
      (total, entry) => total + entry.reservedCents,
      0
    ),
  };
}

function sumEnvelopeSpent({
  envelopeId,
  purchases,
  purchaseCycleContext,
}: {
  envelopeId: string;
  purchases: Purchase[];
  purchaseCycleContext: {
    activeCyclePaycheckId: string | null;
    activeCycleStartDate: string | null;
    activeCycleEndDate: string | null;
    paychecks: ReturnType<typeof mapRepositoryPaycheckToListItem>[];
  };
}) {
  return purchases.reduce((total, purchase) => {
    if (purchase.deletedAt || purchase.envelopeId !== envelopeId) {
      return total;
    }

    if (!purchaseCycleContext.activeCyclePaycheckId) {
      return total + purchase.amountCents;
    }

    const uiPurchase = mapRepositoryPurchaseToPrototype(purchase);

    if (
      !purchaseBelongsToCycle(
        uiPurchase,
        purchaseCycleContext.activeCyclePaycheckId,
        purchaseCycleContext
      )
    ) {
      return total;
    }

    return total + purchase.amountCents;
  }, 0);
}
