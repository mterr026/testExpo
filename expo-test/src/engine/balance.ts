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

function openingBalanceAnchorDate(openingBalanceAsOfDate: string) {
  return openingBalanceAsOfDate.slice(0, 10);
}

function openingBalanceAnchorInstant(openingBalanceAsOfDate: string) {
  return openingBalanceAsOfDate.length === 10
    ? `${openingBalanceAsOfDate}T00:00:00.000Z`
    : openingBalanceAsOfDate;
}

export function shouldCountPaycheckTowardConfirmedIncome(
  paycheck: EnginePaycheck,
  openingBalanceAsOfDate?: string | null
) {
  if (!paycheck.isReceived) {
    return false;
  }

  if (!openingBalanceAsOfDate || !paycheck.expectedDate) {
    return true;
  }

  const anchorDate = openingBalanceAnchorDate(openingBalanceAsOfDate);

  if (paycheck.expectedDate > anchorDate) {
    return true;
  }

  if (paycheck.receivedAt) {
    return (
      paycheck.receivedAt >
      openingBalanceAnchorInstant(openingBalanceAsOfDate)
    );
  }

  return false;
}

export function sumConfirmedIncome(
  paychecks: EnginePaycheck[],
  openingBalanceAsOfDate?: string | null
) {
  return sumBy(
    active(paychecks).filter((paycheck) =>
      shouldCountPaycheckTowardConfirmedIncome(paycheck, openingBalanceAsOfDate)
    ),
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

export function shouldCountPaidBillTowardRunningBalance(
  billInstance: EngineBillInstance,
  openingBalanceAsOfDate?: string | null
) {
  if (!billInstance.isPaid) {
    return false;
  }

  if (!openingBalanceAsOfDate || !billInstance.dueDate) {
    return true;
  }

  const anchorDate = openingBalanceAnchorDate(openingBalanceAsOfDate);

  if (billInstance.dueDate > anchorDate) {
    return true;
  }

  if (billInstance.paidAt) {
    return (
      billInstance.paidAt >
      openingBalanceAnchorInstant(openingBalanceAsOfDate)
    );
  }

  return false;
}

export function sumBillInstances(
  billInstances: EngineBillInstance[],
  isPaid: boolean,
  openingBalanceAsOfDate?: string | null
) {
  return sumBy(
    active(billInstances).filter((billInstance) => {
      if (billInstance.isPaid !== isPaid) {
        return false;
      }

      if (!isPaid) {
        return true;
      }

      return shouldCountPaidBillTowardRunningBalance(
        billInstance,
        openingBalanceAsOfDate
      );
    }),
    (billInstance) => billInstance.cycleAmountCents
  );
}

export function sumBalanceAdjustments(adjustments: EngineBalanceAdjustment[]) {
  return sumBy(active(adjustments), (adjustment) => adjustment.deltaCents);
}

export function computeRunningBalance({
  openingBalanceCents = 0,
  openingBalanceAsOfDate = null,
  paychecks,
  purchases,
  billInstances,
  balanceAdjustments,
}: {
  openingBalanceCents?: number;
  openingBalanceAsOfDate?: string | null;
  paychecks: EnginePaycheck[];
  purchases: EnginePurchase[];
  billInstances: EngineBillInstance[];
  balanceAdjustments: EngineBalanceAdjustment[];
}) {
  const confirmedIncomeCents = sumConfirmedIncome(
    paychecks,
    openingBalanceAsOfDate
  );
  const chargedPurchasesCents = sumPurchasesByState(purchases, "charged");
  const pendingPurchasesCents = sumPurchasesByState(purchases, "pending");
  const paidBillsCents = sumBillInstances(
    billInstances,
    true,
    openingBalanceAsOfDate
  );
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
