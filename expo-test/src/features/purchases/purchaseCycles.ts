import { OPEN_ENDED_PAYCHECK_CYCLE_DATE, resolvePaycheckCycleWindow } from "@/engine";
import type { PaycheckListItem, Purchase } from "@/shared/ui/types";

export type PurchaseCycleOption = {
  id: string;
  label: string;
  shortLabel: string;
  paycheckDateLabel: string;
  cycleWindowLabel: string;
  sortDate: string;
  isActive: boolean;
  totalSpentCents: number;
  pendingAmountCents: number;
  transactionCount: number;
};

export type PurchaseCycleContext = {
  activeCyclePaycheckId: string | null;
  activeCycleStartDate: string | null;
  activeCycleEndDate: string | null;
  paychecks: PaycheckListItem[];
};

export function getPaycheckCycleWindow(
  paycheckId: string,
  paychecks: PaycheckListItem[]
) {
  const sortedPaychecks = sortPaychecksByDate(paychecks);
  const paycheckIndex = sortedPaychecks.findIndex(
    (paycheck) => paycheck.id === paycheckId
  );

  if (paycheckIndex < 0) {
    return null;
  }

  const cyclePaycheck = sortedPaychecks[paycheckIndex];
  const nextPaycheck = sortedPaychecks[paycheckIndex + 1] ?? null;
  const boundary = resolvePaycheckCycleWindow({
    expectedDate: cyclePaycheck.expectedDate,
    recurrenceInterval: cyclePaycheck.recurrenceInterval,
    nextPaycheckExpectedDate: nextPaycheck?.expectedDate ?? null,
  });

  return {
    paycheckId: cyclePaycheck.id,
    startDate: boundary.startDate,
    endDate: boundary.nextStartDate,
  };
}

export function resolvePurchaseCycleId(
  purchase: Purchase,
  paychecks: PaycheckListItem[]
) {
  if (purchase.paycheckCycleId) {
    return purchase.paycheckCycleId;
  }

  const sortedPaychecks = sortPaychecksByDate(paychecks);

  for (let index = sortedPaychecks.length - 1; index >= 0; index -= 1) {
    const paycheck = sortedPaychecks[index];
    const cycleWindow = getPaycheckCycleWindow(paycheck.id, sortedPaychecks);

    if (
      cycleWindow &&
      isPurchaseDateInCycle(
        purchase.purchaseDate,
        cycleWindow.startDate,
        cycleWindow.endDate
      )
    ) {
      return paycheck.id;
    }
  }

  return null;
}

export function resolvePurchaseCycleIdFromContext(
  purchase: Purchase,
  context: PurchaseCycleContext
) {
  if (purchase.paycheckCycleId) {
    return purchase.paycheckCycleId;
  }

  if (
    context.activeCyclePaycheckId &&
    context.activeCycleStartDate &&
    context.activeCycleEndDate &&
    isPurchaseDateInCycle(
      purchase.purchaseDate,
      context.activeCycleStartDate,
      context.activeCycleEndDate
    )
  ) {
    return context.activeCyclePaycheckId;
  }

  return resolvePurchaseCycleId(purchase, context.paychecks) ?? "unassigned";
}

export function purchaseBelongsToCycle(
  purchase: Purchase,
  cycleId: string,
  context: PurchaseCycleContext
) {
  if (cycleId === "unassigned") {
    return resolvePurchaseCycleIdFromContext(purchase, context) === "unassigned";
  }

  if (purchase.paycheckCycleId) {
    return purchase.paycheckCycleId === cycleId;
  }

  const cycleWindow = getCycleWindowForId(cycleId, context);

  if (!cycleWindow) {
    return resolvePurchaseCycleIdFromContext(purchase, context) === cycleId;
  }

  return isPurchaseDateInCycle(
    purchase.purchaseDate,
    cycleWindow.startDate,
    cycleWindow.endDate
  );
}

export function getArchivedPurchaseCycleOptions(options: PurchaseCycleOption[]) {
  return options.filter(
    (option) => !option.isActive && option.id !== "unassigned" && option.transactionCount > 0
  );
}

export function buildPurchaseCycleOptions(
  purchases: Purchase[],
  context: PurchaseCycleContext
): PurchaseCycleOption[] {
  const purchasesByCycleId = new Map<string, Purchase[]>();

  for (const purchase of purchases) {
    const cycleId = resolvePurchaseCycleIdFromContext(purchase, context);
    const cyclePurchases = purchasesByCycleId.get(cycleId);

    if (cyclePurchases) {
      cyclePurchases.push(purchase);
      continue;
    }

    purchasesByCycleId.set(cycleId, [purchase]);
  }

  const cycleIds = new Set(purchasesByCycleId.keys());

  for (const paycheck of sortPaychecksByDate(context.paychecks)) {
    cycleIds.add(paycheck.id);
  }

  if (context.activeCyclePaycheckId) {
    cycleIds.add(context.activeCyclePaycheckId);
  }

  const options = [...cycleIds].map((cycleId) =>
    buildPurchaseCycleOption({
      cycleId,
      context,
      purchases: purchasesByCycleId.get(cycleId) ?? [],
    })
  );

  return options.sort(comparePurchaseCycleOptions);
}

export function filterPurchasesForCycle(
  purchases: Purchase[],
  cycleId: string,
  context: PurchaseCycleContext
) {
  return purchases.filter((purchase) =>
    purchaseBelongsToCycle(purchase, cycleId, context)
  );
}

export function filterPreviousCyclePurchases(
  purchases: Purchase[],
  context: PurchaseCycleContext
) {
  if (!context.activeCyclePaycheckId) {
    return purchases;
  }

  return purchases.filter(
    (purchase) =>
      !purchaseBelongsToCycle(
        purchase,
        context.activeCyclePaycheckId as string,
        context
      )
  );
}

export function getPurchaseSummaryForPurchases(purchases: Purchase[]) {
  return {
    pendingAmountCents: purchases
      .filter((purchase) => purchase.status === "Pending")
      .reduce(
        (total, purchase) => total + normalizePurchaseAmountCents(purchase.amountCents),
        0
      ),
    totalSpentCents: purchases.reduce(
      (total, purchase) => total + normalizePurchaseAmountCents(purchase.amountCents),
      0
    ),
    transactionCount: purchases.length,
  };
}

export function formatPurchaseCycleLabel(startDate: string, endDate: string) {
  if (endDate === OPEN_ENDED_PAYCHECK_CYCLE_DATE) {
    return `Starting ${formatShortDate(startDate)}`;
  }

  return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
}

function buildPurchaseCycleOption({
  cycleId,
  context,
  purchases,
}: {
  cycleId: string;
  context: PurchaseCycleContext;
  purchases: Purchase[];
}): PurchaseCycleOption {
  const summary = getPurchaseSummaryForPurchases(purchases);

  if (cycleId === "unassigned") {
    return {
      id: cycleId,
      label: "Unassigned purchases",
      shortLabel: "Unassigned",
      paycheckDateLabel: "Unassigned",
      cycleWindowLabel: "Outside any paycheck cycle",
      sortDate: "0000-01-01",
      isActive: false,
      ...summary,
    };
  }

  const cycleWindow =
    getPaycheckCycleWindow(cycleId, context.paychecks) ??
    (context.activeCyclePaycheckId === cycleId &&
    context.activeCycleStartDate &&
    context.activeCycleEndDate
      ? {
          paycheckId: cycleId,
          startDate: context.activeCycleStartDate,
          endDate: context.activeCycleEndDate,
        }
      : null);
  const paycheckDateLabel = cycleWindow
    ? formatShortDate(cycleWindow.startDate)
    : "Unknown";
  const cycleWindowLabel = cycleWindow
    ? formatPurchaseCycleLabel(cycleWindow.startDate, cycleWindow.endDate)
    : "Unknown cycle";
  const isActive = cycleId === context.activeCyclePaycheckId;
  const label = isActive
    ? `This cycle · ${cycleWindowLabel}`
    : `${paycheckDateLabel} paycheck · ${cycleWindowLabel}`;

  return {
    id: cycleId,
    label,
    shortLabel: paycheckDateLabel,
    paycheckDateLabel,
    cycleWindowLabel,
    sortDate: cycleWindow?.startDate ?? "0000-01-01",
    isActive,
    ...summary,
  };
}

function comparePurchaseCycleOptions(
  first: PurchaseCycleOption,
  second: PurchaseCycleOption
) {
  if (first.isActive !== second.isActive) {
    return first.isActive ? -1 : 1;
  }

  if (first.id === "unassigned") {
    return 1;
  }

  if (second.id === "unassigned") {
    return -1;
  }

  return second.sortDate.localeCompare(first.sortDate);
}

function getCycleWindowForId(cycleId: string, context: PurchaseCycleContext) {
  if (
    cycleId === context.activeCyclePaycheckId &&
    context.activeCycleStartDate &&
    context.activeCycleEndDate
  ) {
    return {
      startDate: context.activeCycleStartDate,
      endDate: context.activeCycleEndDate,
    };
  }

  const paycheckWindow = getPaycheckCycleWindow(cycleId, context.paychecks);

  if (!paycheckWindow) {
    return null;
  }

  return {
    startDate: paycheckWindow.startDate,
    endDate: paycheckWindow.endDate,
  };
}

function isPurchaseDateInCycle(
  purchaseDate: string | null | undefined,
  startDate: string,
  endDate: string
) {
  if (!purchaseDate) {
    return false;
  }

  return (
    purchaseDate >= startDate &&
    (endDate === OPEN_ENDED_PAYCHECK_CYCLE_DATE || purchaseDate < endDate)
  );
}

function normalizePurchaseAmountCents(amountCents: number | null | undefined): number {
  return typeof amountCents === "number" && Number.isInteger(amountCents)
    ? amountCents
    : 0;
}

function sortPaychecksByDate(paychecks: PaycheckListItem[]) {
  return [...paychecks].sort((first, second) =>
    first.expectedDate.localeCompare(second.expectedDate)
  );
}

function formatShortDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const [, month, day] = date.split("-");

  return `${formatMonth(Number(month))} ${Number(day)}`;
}

function formatMonth(month: number) {
  return [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][month - 1] ?? "";
}
