import type { Cents } from "@/shared/currency";

import { OPEN_ENDED_PAYCHECK_CYCLE_DATE } from "./cycleBoundaries";
import type { PurchaseState } from "./types";

export type EngineEnvelope = {
  id: string;
  allocationCents: Cents;
  isPaused: boolean;
  deletedAt?: string | null;
};

export type EngineEnvelopePurchase = {
  amountCents: Cents;
  state: PurchaseState;
  envelopeId?: string | null;
  paycheckCycleId?: string | null;
  purchaseDate?: string;
  deletedAt?: string | null;
};

export type EnvelopeSnapshotEntry = {
  envelopeId: string;
  allocatedCents: Cents;
  spentCents: Cents;
  remainingCents: Cents;
  reservedCents: Cents;
};

export type EnvelopeSnapshot = {
  envelopesEnabled: boolean;
  activeCyclePaycheckId: string | null;
  entries: EnvelopeSnapshotEntry[];
  totalReservedCents: Cents;
};

export type ComputeEnvelopeSnapshotInput = {
  envelopes: EngineEnvelope[];
  purchases: EngineEnvelopePurchase[];
  activeCyclePaycheckId: string | null;
  activeCycleStartDate?: string | null;
  activeCycleEndDate?: string | null;
  envelopesEnabled: boolean;
};

export function computeEnvelopeSnapshot(
  input: ComputeEnvelopeSnapshotInput
): EnvelopeSnapshot {
  if (!input.envelopesEnabled) {
    return {
      envelopesEnabled: false,
      activeCyclePaycheckId: input.activeCyclePaycheckId,
      entries: [],
      totalReservedCents: 0,
    };
  }

  const activeEnvelopes = input.envelopes.filter(
    (envelope) => !envelope.deletedAt && !envelope.isPaused
  );
  const entries = activeEnvelopes.map((envelope) => {
    const spentCents = sumEnvelopeSpent({
      envelopeId: envelope.id,
      purchases: input.purchases,
      activeCyclePaycheckId: input.activeCyclePaycheckId,
      activeCycleStartDate: input.activeCycleStartDate ?? null,
      activeCycleEndDate: input.activeCycleEndDate ?? null,
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
  activeCyclePaycheckId,
  activeCycleStartDate,
  activeCycleEndDate,
}: {
  envelopeId: string;
  purchases: EngineEnvelopePurchase[];
  activeCyclePaycheckId: string | null;
  activeCycleStartDate: string | null;
  activeCycleEndDate: string | null;
}) {
  if (!activeCyclePaycheckId) {
    return 0;
  }

  return purchases.reduce((total, purchase) => {
    if (purchase.deletedAt || purchase.envelopeId !== envelopeId) {
      return total;
    }

    if (!purchaseBelongsToActiveCycle(purchase, {
      activeCyclePaycheckId,
      activeCycleStartDate,
      activeCycleEndDate,
    })) {
      return total;
    }

    return total + purchase.amountCents;
  }, 0);
}

function purchaseBelongsToActiveCycle(
  purchase: EngineEnvelopePurchase,
  {
    activeCyclePaycheckId,
    activeCycleStartDate,
    activeCycleEndDate,
  }: {
    activeCyclePaycheckId: string;
    activeCycleStartDate: string | null;
    activeCycleEndDate: string | null;
  }
) {
  if (purchase.paycheckCycleId === activeCyclePaycheckId) {
    return true;
  }

  if (
    !purchase.purchaseDate ||
    !activeCycleStartDate ||
    !activeCycleEndDate
  ) {
    return false;
  }

  return isPurchaseDateInCycle(
    purchase.purchaseDate,
    activeCycleStartDate,
    activeCycleEndDate
  );
}

function isPurchaseDateInCycle(
  purchaseDate: string,
  startDate: string,
  endDate: string
) {
  return (
    purchaseDate >= startDate &&
    (endDate === OPEN_ENDED_PAYCHECK_CYCLE_DATE || purchaseDate < endDate)
  );
}
