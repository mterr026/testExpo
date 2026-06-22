import type {
  EngineBalanceAdjustment,
  EngineBillInstance,
  EnginePaycheck,
  EnginePurchase,
} from "./types";

function active<T extends { deletedAt?: string | null }>(items: T[]) {
  return items.filter((item) => !item.deletedAt);
}

function sumBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}

export function sumConfirmedIncome(paychecks: EnginePaycheck[]) {
  return sumBy(
    active(paychecks).filter((paycheck) => paycheck.isReceived),
    (paycheck) => paycheck.amountCents
  );
}

export function sumPurchasesByState(
  purchases: EnginePurchase[],
  state: EnginePurchase["state"]
) {
  return sumBy(
    active(purchases).filter((purchase) => purchase.state === state),
    (purchase) => purchase.amountCents
  );
}

export function sumBillInstances(
  billInstances: EngineBillInstance[],
  isPaid: boolean
) {
  return sumBy(
    active(billInstances).filter((billInstance) => billInstance.isPaid === isPaid),
    (billInstance) => billInstance.cycleAmountCents
  );
}

export function sumBalanceAdjustments(adjustments: EngineBalanceAdjustment[]) {
  return sumBy(active(adjustments), (adjustment) => adjustment.deltaCents);
}

export function computeRunningBalance({
  openingBalanceCents = 0,
  paychecks,
  purchases,
  billInstances,
  balanceAdjustments,
}: {
  openingBalanceCents?: number;
  paychecks: EnginePaycheck[];
  purchases: EnginePurchase[];
  billInstances: EngineBillInstance[];
  balanceAdjustments: EngineBalanceAdjustment[];
}) {
  const confirmedIncomeCents = sumConfirmedIncome(paychecks);
  const chargedPurchasesCents = sumPurchasesByState(purchases, "charged");
  const pendingPurchasesCents = sumPurchasesByState(purchases, "pending");
  const paidBillsCents = sumBillInstances(billInstances, true);
  const balanceAdjustmentsCents = sumBalanceAdjustments(balanceAdjustments);

  return (
    openingBalanceCents +
    confirmedIncomeCents -
    chargedPurchasesCents -
    pendingPurchasesCents -
    paidBillsCents +
    balanceAdjustmentsCents
  );
}
