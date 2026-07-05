import { useMemo, useRef } from "react";

import type { DashboardSnapshot } from "@/features/dashboard/services";
import {
  generateBillCycleInstances,
  findNextDistinctPaycheckDate,
  OPEN_ENDED_PAYCHECK_CYCLE_DATE,
  projectedBillCycleInstanceId,
  resolvePaycheckCycleWindow,
} from "@/engine";
import type {
  Bill,
  NextCyclePreview,
  PaycheckBillCoverage,
} from "@/shared/ui/types";

import {
  filterPurchasesForCycle,
  getPurchaseSummaryForPurchases,
} from "@/features/purchases/purchaseCycles";
import {
  mapRepositoryBillInstanceToPrototype,
  mapRepositoryBillToPrototype,
} from "@/features/bills/adapters/billViewAdapters";
import { mapRepositoryPaycheckToListItem } from "@/features/paychecks/adapters/paycheckViewAdapters";
import { getPrimaryPaychecks } from "@/features/paychecks/paycheckSchedule";
import { mapRepositoryPurchaseToPrototype } from "@/features/purchases/adapters/purchaseViewAdapters";
import { formatDashboardCycleLabel } from "@/features/dashboard/dashboardCycleLabel";
import { getTodayIsoDate } from "@/shared/dates";

type UseHomeDerivedDataInput = {
  balanceCents: number;
  bills: Bill[];
  dashboardLoading: boolean;
  dashboardSnapshot: DashboardSnapshot | null;
  reserveCents: number;
};

export function resolveActiveDashboardSnapshot(
  currentSnapshot: DashboardSnapshot | null,
  cachedSnapshot: DashboardSnapshot | null
) {
  return currentSnapshot ?? cachedSnapshot;
}

export function buildLocalFallbackTotals({
  balanceCents,
  bills,
  purchases,
  reserveCents,
}: {
  balanceCents: number;
  bills: Bill[];
  purchases: DashboardSnapshot["purchases"];
  reserveCents: number;
}) {
  const unpaidBills = bills
    .filter((bill) => bill.status !== "Paid")
    .reduce((sum, bill) => sum + bill.amountCents, 0);
  const unpaidBillCount = bills.filter((bill) => bill.status !== "Paid").length;
  const paidBills = bills
    .filter((bill) => bill.status === "Paid")
    .reduce((sum, bill) => sum + bill.amountCents, 0);
  const purchaseTotal = purchases.reduce(
    (sum, purchase) => sum + purchase.amountCents,
    0
  );
  const runningBalance = balanceCents - purchaseTotal;
  const safeToSpend = runningBalance - unpaidBills - reserveCents;

  return {
    paidBills,
    purchaseTotal,
    runningBalance,
    safeToSpend,
    unpaidBills,
    unpaidBillCount,
  };
}

export function buildDashboardTotalsFromSnapshot(
  snapshot: DashboardSnapshot,
  dashboardLoading: boolean
) {
  const breakdown = snapshot.safeToSpend;
  const unpaidBills = breakdown.unpaidBillsCents;
  const upcomingPaycheck =
    snapshot.nextCycleAnchor ??
    snapshot.paychecks
      .filter((paycheck) => paycheck.expectedDate >= getTodayIsoDate())
      .sort((first, second) =>
        first.expectedDate.localeCompare(second.expectedDate)
      )[0] ??
    null;
  const projectedAfterPaycheckCents =
    breakdown.runningBalanceCents + (upcomingPaycheck?.amountCents ?? 0);
  const mappedPurchases = snapshot.purchases.map(mapRepositoryPurchaseToPrototype);
  const paycheckListItems = snapshot.paychecks.map(mapRepositoryPaycheckToListItem);
  const cyclePurchases = snapshot.activeCyclePaycheckId
    ? filterPurchasesForCycle(mappedPurchases, snapshot.activeCyclePaycheckId, {
        activeCyclePaycheckId: snapshot.activeCyclePaycheckId,
        activeCycleStartDate: snapshot.activeCycleStartDate,
        activeCycleEndDate: snapshot.activeCycleEndDate,
        paychecks: paycheckListItems,
      })
    : mappedPurchases;
  const cyclePurchaseSummary = getPurchaseSummaryForPurchases(cyclePurchases);

  return {
    balanceCents: breakdown.runningBalanceCents,
    nextPaycheckLabel: upcomingPaycheck?.expectedDate ?? "Not scheduled",
    paidBills: breakdown.paidBillsCents,
    projectedAfterPaycheckCents,
    purchaseTotal: cyclePurchaseSummary.totalSpentCents,
    reserveCents: breakdown.essentialReserveCents,
    runningBalanceCents: breakdown.runningBalanceCents,
    safeToSpend: breakdown.safeToSpendCents,
    unpaidBills,
    unpaidBillCount: snapshot.billInstances.filter(
      (billInstance) => !billInstance.isPaid
    ).length,
    updatedLabel: dashboardLoading ? "Loading" : "Current cycle",
  };
}

export function useHomeDerivedData({
  balanceCents,
  bills,
  dashboardLoading,
  dashboardSnapshot,
  reserveCents,
}: UseHomeDerivedDataInput) {
  const cachedSnapshotRef = useRef<DashboardSnapshot | null>(null);

  if (dashboardSnapshot) {
    cachedSnapshotRef.current = dashboardSnapshot;
  }

  const activeSnapshot = resolveActiveDashboardSnapshot(
    dashboardSnapshot,
    cachedSnapshotRef.current
  );
  const cachedPurchases = activeSnapshot?.purchases ?? [];

  const totals = useMemo(
    () =>
      buildLocalFallbackTotals({
        balanceCents,
        bills,
        purchases: cachedPurchases,
        reserveCents,
      }),
    [balanceCents, bills, cachedPurchases, reserveCents]
  );

  const dashboardTotals = useMemo(() => {
    if (activeSnapshot) {
      return buildDashboardTotalsFromSnapshot(activeSnapshot, dashboardLoading);
    }

    return {
      balanceCents,
      nextPaycheckLabel: "Not scheduled",
      paidBills: totals.paidBills,
      projectedAfterPaycheckCents: totals.runningBalance,
      purchaseTotal: totals.purchaseTotal,
      reserveCents,
      runningBalanceCents: totals.runningBalance,
      safeToSpend: totals.safeToSpend,
      unpaidBills: totals.unpaidBills,
      unpaidBillCount: totals.unpaidBillCount,
      updatedLabel: dashboardLoading ? "Loading" : "No local data yet",
    };
  }, [
    activeSnapshot,
    balanceCents,
    dashboardLoading,
    reserveCents,
    totals,
  ]);

  const visiblePurchases = useMemo(() => {
    if (!activeSnapshot) {
      return [];
    }

    return activeSnapshot.purchases.map(mapRepositoryPurchaseToPrototype);
  }, [activeSnapshot]);

  const visiblePaychecks = useMemo(() => {
    if (!activeSnapshot) {
      return [];
    }

    return activeSnapshot.paychecks.map(mapRepositoryPaycheckToListItem);
  }, [activeSnapshot]);

  const visibleBills = useMemo(() => {
    return buildVisibleBills(activeSnapshot, bills);
  }, [activeSnapshot, bills]);

  const dashboardUpcomingBills = useMemo(() => {
    return buildDashboardUpcomingBills(activeSnapshot, bills);
  }, [activeSnapshot, bills]);

  const dashboardUpcomingPaychecks = useMemo(() => {
    return buildDashboardUpcomingPaychecks(activeSnapshot);
  }, [activeSnapshot]);

  const billCycleLabel = useMemo(() => {
    if (!activeSnapshot?.activeCycleStartDate) {
      return "No active paycheck cycle";
    }

    return formatDashboardCycleLabel(
      activeSnapshot.activeCycleStartDate,
      activeSnapshot.activeCycleEndDate
    );
  }, [activeSnapshot]);

  const nextCyclePreview = useMemo<NextCyclePreview>(() => {
    if (!activeSnapshot?.nextCycleAnchor) {
      return null;
    }

    const nextCycleAnchor = activeSnapshot.nextCycleAnchor;
    const followingCycleAnchor = activeSnapshot.paychecks
      .filter(
        (paycheck) => paycheck.expectedDate > nextCycleAnchor.expectedDate
      )
      .sort((first, second) =>
        first.expectedDate.localeCompare(second.expectedDate)
      )[0];
    const nextCycleBoundary = resolvePaycheckCycleWindow({
      expectedDate: nextCycleAnchor.expectedDate,
      recurrenceInterval: nextCycleAnchor.recurrenceInterval,
      nextPaycheckExpectedDate: followingCycleAnchor?.expectedDate ?? null,
    });
    const canProjectNextCycleBills =
      nextCycleBoundary.nextStartDate !== OPEN_ENDED_PAYCHECK_CYCLE_DATE;
    const projectedBills = canProjectNextCycleBills
      ? generateBillCycleInstances({
          bills: activeSnapshot.bills,
          cycle: {
            paycheckCycleId: nextCycleAnchor.id,
            startDate: nextCycleBoundary.startDate,
            nextStartDate: nextCycleBoundary.nextStartDate,
          },
        }).map((billInstance) => {
          const bill = activeSnapshot.bills.find(
            (candidate) => candidate.id === billInstance.billId
          );

          return {
            amountCents: billInstance.cycleAmountCents,
            dueDate: billInstance.dueDate,
            id: projectedBillCycleInstanceId(
              billInstance.billId,
              billInstance.dueDate
            ),
            name: bill?.name ?? "Bill",
          };
        })
      : [];

    return {
      amountCents: nextCycleAnchor.amountCents,
      canProjectBills: canProjectNextCycleBills,
      expectedDate: nextCycleAnchor.expectedDate,
      pendingPurchasesCents: activeSnapshot.safeToSpend.pendingPurchasesCents,
      projectedBills,
      projectedBillsTotalCents: projectedBills.reduce(
        (sum, bill) => sum + bill.amountCents,
        0
      ),
      sourceName: nextCycleAnchor.label ?? "Paycheck",
      startingSafeToSpendCents: activeSnapshot.safeToSpend.safeToSpendCents,
    };
  }, [activeSnapshot]);

  const paycheckBillCoverage = useMemo<PaycheckBillCoverage[]>(() => {
    return buildPaycheckBillCoverage(activeSnapshot);
  }, [activeSnapshot]);

  const purchaseCycleContext = useMemo(
    () => ({
      activeCyclePaycheckId: activeSnapshot?.activeCyclePaycheckId ?? null,
      activeCycleStartDate: activeSnapshot?.activeCycleStartDate ?? null,
      activeCycleEndDate: activeSnapshot?.activeCycleEndDate ?? null,
      paychecks: activeSnapshot
        ? activeSnapshot.paychecks.map(mapRepositoryPaycheckToListItem)
        : [],
    }),
    [activeSnapshot]
  );

  return {
    dashboardTotals,
    billCycleLabel,
    nextCyclePreview,
    paycheckBillCoverage,
    dashboardUpcomingBills,
    dashboardUpcomingPaychecks,
    visibleBills,
    visiblePaychecks,
    visiblePurchases,
    purchaseCycleContext,
  };
}

export function isDateInActivePaycheckCycle(
  date: string,
  startDate: string,
  endDate: string
) {
  return (
    date >= startDate &&
    (endDate === OPEN_ENDED_PAYCHECK_CYCLE_DATE || date < endDate)
  );
}

export function buildDashboardUpcomingBills(
  dashboardSnapshot: DashboardSnapshot | null,
  fallbackBills: Bill[]
): Bill[] {
  if (!dashboardSnapshot) {
    return fallbackBills;
  }

  if (
    !dashboardSnapshot.activeCyclePaycheckId ||
    !dashboardSnapshot.activeCycleStartDate ||
    !dashboardSnapshot.activeCycleEndDate
  ) {
    return mapSavedBillsForDashboard(dashboardSnapshot.bills);
  }

  const activeCycleStartDate = dashboardSnapshot.activeCycleStartDate;
  const activeCycleEndDate = dashboardSnapshot.activeCycleEndDate;
  const dedupedBillInstances = mergeBillInstancesForDisplay(
    dashboardSnapshot.billInstances,
    dashboardSnapshot.allBillInstances
  );
  const activeCycleExistingInstances = dedupedBillInstances.filter(
    (billInstance) =>
      !billInstance.isPaid &&
      isDateInActivePaycheckCycle(
        billInstance.dueDate,
        activeCycleStartDate,
        activeCycleEndDate
      )
  );

  if (activeCycleExistingInstances.length > 0) {
    return activeCycleExistingInstances.map((billInstance) =>
      mapRepositoryBillInstanceToPrototype(billInstance, dashboardSnapshot.bills)
    );
  }

  const generatedBills = generateBillCycleInstances({
    bills: dashboardSnapshot.bills,
    cycle: {
      paycheckCycleId: dashboardSnapshot.activeCyclePaycheckId,
      startDate: activeCycleStartDate,
      nextStartDate: activeCycleEndDate,
    },
    existingInstances: dashboardSnapshot.allBillInstances,
  }).map((billInstance) =>
    mapRepositoryGeneratedBillInstanceToPrototype(
      billInstance,
      dashboardSnapshot.bills
    )
  );

  return generatedBills.length > 0 ? generatedBills : [];
}

export function buildDashboardUpcomingPaychecks(
  dashboardSnapshot: DashboardSnapshot | null
) {
  if (!dashboardSnapshot) {
    return [];
  }

  const unreceivedPaychecks = dashboardSnapshot.paychecks
    .map(mapRepositoryPaycheckToListItem)
    .filter((paycheck) => !paycheck.isReceived);

  if (
    !dashboardSnapshot.activeCyclePaycheckId ||
    !dashboardSnapshot.activeCycleStartDate ||
    !dashboardSnapshot.activeCycleEndDate
  ) {
    return unreceivedPaychecks;
  }

  return unreceivedPaychecks.filter((paycheck) =>
    isDateInActivePaycheckCycle(
      paycheck.expectedDate,
      dashboardSnapshot.activeCycleStartDate!,
      dashboardSnapshot.activeCycleEndDate!
    )
  );
}

function mapSavedBillsForDashboard(
  bills: DashboardSnapshot["bills"]
): Bill[] {
  return bills
    .filter((bill) => !bill.deletedAt && !bill.isPaused)
    .map(mapRepositoryBillToPrototype)
    .sort((first, second) =>
      first.dueDate === second.dueDate
        ? first.name.localeCompare(second.name)
        : first.dueDate.localeCompare(second.dueDate)
    );
}

function mapRepositoryGeneratedBillInstanceToPrototype(
  billInstance: ReturnType<typeof generateBillCycleInstances>[number],
  bills: DashboardSnapshot["bills"]
): Bill {
  const bill = bills.find((candidate) => candidate.id === billInstance.billId);

  return {
    id: projectedBillCycleInstanceId(billInstance.billId, billInstance.dueDate),
    billId: billInstance.billId,
    billType: bill?.billType,
    endDate: bill?.endDate,
    isPaused: bill?.isPaused ?? false,
    name: bill?.name ?? "Bill",
    amountCents: billInstance.cycleAmountCents,
    dueDate: billInstance.dueDate,
    status:
      billInstance.billType === "variable" && !billInstance.isVariableConfirmed
        ? "Needs confirmation"
        : "Projected",
  };
}

function resolvePaycheckBillReservationStatus({
  bill,
  activeReservedBillIds,
  projectedCoveredBillIds,
}: {
  bill: {
    id: string;
    status?: string;
  };
  activeReservedBillIds: Set<string>;
  projectedCoveredBillIds: Set<string>;
}) {
  if (bill.status === "Paid") {
    return "paid" as const;
  }

  if (activeReservedBillIds.has(bill.id)) {
    return "reserved" as const;
  }

  if (projectedCoveredBillIds.has(bill.id)) {
    return "projected" as const;
  }

  return undefined;
}

export function buildVisibleBills(
  dashboardSnapshot: DashboardSnapshot | null,
  fallbackBills: Bill[]
) {
  if (!dashboardSnapshot) {
    return fallbackBills;
  }

  const allVisibleBillInstances = mergeBillInstancesForDisplay(
    dashboardSnapshot.billInstances,
    dashboardSnapshot.allBillInstances
  );
  const cycleBills = allVisibleBillInstances.map((billInstance) =>
    mapRepositoryBillInstanceToPrototype(billInstance, dashboardSnapshot.bills)
  );
  const cycleBillIds = new Set(
    cycleBills.map((bill) => bill.billId).filter(Boolean)
  );
  const savedBillDefinitions = dashboardSnapshot.bills
    .filter((bill) => !cycleBillIds.has(bill.id))
    .map(mapRepositoryBillToPrototype);

  return [...cycleBills, ...savedBillDefinitions];
}

function mergeBillInstancesForDisplay(
  activeInstances: DashboardSnapshot["billInstances"],
  allInstances: DashboardSnapshot["allBillInstances"]
) {
  const merged = [...activeInstances];
  const existingIds = new Set(activeInstances.map((instance) => instance.id));

  for (const instance of allInstances) {
    if (!existingIds.has(instance.id)) {
      merged.push(instance);
      existingIds.add(instance.id);
    }
  }

  return merged.sort((first, second) =>
    first.dueDate === second.dueDate
      ? first.createdAt.localeCompare(second.createdAt)
      : first.dueDate.localeCompare(second.dueDate)
  );
}

export function buildPaycheckBillCoverage(
  dashboardSnapshot: DashboardSnapshot | null
): PaycheckBillCoverage[] {
  if (!dashboardSnapshot) {
    return [];
  }

  const sortedPaychecks = [...getPrimaryPaychecks(dashboardSnapshot.paychecks)].sort(
    (first, second) => first.expectedDate.localeCompare(second.expectedDate)
  );
  const currentSafeToSpendCents = dashboardSnapshot.safeToSpend.safeToSpendCents;
  const allBillInstances =
    dashboardSnapshot.allBillInstances.length > 0
      ? dashboardSnapshot.allBillInstances
      : dashboardSnapshot.billInstances;
  const projectedBillKeys = getNextProjectedBillKeys({
    bills: dashboardSnapshot.bills,
    existingInstances: allBillInstances,
    sortedPaychecks,
  });
  let runningProjectedSafeToSpendCents = currentSafeToSpendCents;

  return sortedPaychecks.map((paycheck, index) => {
    const cycleBoundary = resolvePaycheckCycleBoundaryForPaycheck(
      paycheck,
      sortedPaychecks,
      index
    );
    const cycleEndDate = cycleBoundary.nextStartDate;
    const nextPaycheckDate =
      cycleEndDate !== OPEN_ENDED_PAYCHECK_CYCLE_DATE ? cycleEndDate : null;
    const isCurrentCycle =
      dashboardSnapshot.activeCyclePaycheckId === paycheck.id;
    const existingCoveredBills = allBillInstances
      .filter(
        (billInstance) =>
          getBillInstanceDisplayPaycheckId(billInstance, sortedPaychecks) ===
          paycheck.id
      )
      .map((billInstance) => {
        const bill = dashboardSnapshot.bills.find(
          (candidate) => candidate.id === billInstance.billId
        );

        return {
          amountCents: billInstance.cycleAmountCents,
          billId: billInstance.billId,
          dueDate: billInstance.dueDate,
          id: billInstance.id,
          name: bill?.name ?? "Bill",
          status: billInstance.isPaid ? "Paid" : "Due",
        };
      });
    const existingBillKeys = new Set(
      existingCoveredBills.map((bill) => `${bill.name}:${bill.dueDate}`)
    );
    const activeReservedBillIds = new Set(
      dashboardSnapshot.billInstances
        .filter((billInstance) => !billInstance.isPaid)
        .map((billInstance) => billInstance.id)
    );
    const projectedCoveredBills = isValidCycleWindow(
      paycheck.expectedDate,
      cycleEndDate
    )
      ? generateBillCycleInstances({
          bills: dashboardSnapshot.bills,
          cycle: {
            paycheckCycleId: paycheck.id,
            startDate: paycheck.expectedDate,
            nextStartDate: cycleEndDate,
          },
          existingInstances:
            isCurrentCycle
              ? dashboardSnapshot.billInstances
              : [],
        })
          .map((billInstance) => {
            const bill = dashboardSnapshot.bills.find(
              (candidate) => candidate.id === billInstance.billId
            );

            return {
              amountCents: billInstance.cycleAmountCents,
              billId: billInstance.billId,
              dueDate: billInstance.dueDate,
              id: projectedBillCycleInstanceId(
              billInstance.billId,
              billInstance.dueDate
            ),
              name: bill?.name ?? "Bill",
              status: "Due",
            };
          })
          .filter((bill) => !existingBillKeys.has(`${bill.name}:${bill.dueDate}`))
      : [];
    const nextProjectedCoveredBills = projectedCoveredBills.filter((bill) =>
      projectedBillKeys.has(`${bill.billId}:${bill.dueDate}`)
    );
    const projectedCoveredBillIds = new Set(
      nextProjectedCoveredBills.map((bill) => bill.id)
    );
    const coveredBills = [...existingCoveredBills, ...nextProjectedCoveredBills]
      .map((bill) => ({
        ...bill,
        reservationStatus: resolvePaycheckBillReservationStatus({
          bill,
          activeReservedBillIds,
          projectedCoveredBillIds,
        }),
      }))
      .sort((first, second) =>
        first.dueDate === second.dueDate
          ? first.name.localeCompare(second.name)
          : first.dueDate.localeCompare(second.dueDate)
      );
    const totalCents = coveredBills.reduce(
      (sum, bill) => sum + (bill.status === "Paid" ? 0 : bill.amountCents),
      0
    );
    const currentCycleUnreservedBillCents = coveredBills.reduce(
      (sum, bill) =>
        bill.status === "Paid" || activeReservedBillIds.has(bill.id)
          ? sum
          : sum + bill.amountCents,
      0
    );
    const startingSafeToSpendCents = runningProjectedSafeToSpendCents;
    const paycheckImpactCents = paycheck.isReceived ? 0 : paycheck.amountCents;
    const billsImpactCents = isCurrentCycle
      ? currentCycleUnreservedBillCents
      : totalCents;
    let projectedSafeToSpendCents =
      startingSafeToSpendCents + paycheckImpactCents;

    if (isCurrentCycle) {
      projectedSafeToSpendCents =
        projectedSafeToSpendCents - currentCycleUnreservedBillCents;
    } else {
      projectedSafeToSpendCents =
        projectedSafeToSpendCents - totalCents;
    }

    runningProjectedSafeToSpendCents = projectedSafeToSpendCents;

    return {
      billsImpactCents,
      canProjectBills: true,
      coveredBills,
      isCurrentCycle,
      nextPaycheckDate,
      paycheckId: paycheck.id,
      paycheckImpactCents,
      projectedSafeToSpendCents,
      startingSafeToSpendCents,
      totalCents,
    };
  });
}

function getNextProjectedBillKeys({
  bills,
  existingInstances,
  sortedPaychecks,
}: {
  bills: DashboardSnapshot["bills"];
  existingInstances: DashboardSnapshot["allBillInstances"];
  sortedPaychecks: DashboardSnapshot["paychecks"];
}) {
  const billsWithSavedInstances = new Set(
    existingInstances
      .filter((instance) => !instance.deletedAt)
      .map((instance) => instance.billId)
  );
  const projectedKeys = new Set<string>();
  const remainingBills = bills.filter(
    (bill) => !billsWithSavedInstances.has(bill.id)
  );

  for (let index = 0; index < sortedPaychecks.length; index += 1) {
    if (remainingBills.length === 0) {
      break;
    }

    const paycheck = sortedPaychecks[index];
    const cycleBoundary = resolvePaycheckCycleBoundaryForPaycheck(
      paycheck,
      sortedPaychecks,
      index
    );
    const cycleEndDate = cycleBoundary.nextStartDate;
    if (!isValidCycleWindow(paycheck.expectedDate, cycleEndDate)) {
      continue;
    }

    const generatedInstances = generateBillCycleInstances({
      bills: remainingBills,
      cycle: {
        paycheckCycleId: paycheck.id,
        startDate: paycheck.expectedDate,
        nextStartDate: cycleEndDate,
      },
    });

    for (const generatedInstance of generatedInstances) {
      projectedKeys.add(
        `${generatedInstance.billId}:${generatedInstance.dueDate}`
      );
      const projectedBillIndex = remainingBills.findIndex(
        (bill) => bill.id === generatedInstance.billId
      );

      if (projectedBillIndex >= 0) {
        remainingBills.splice(projectedBillIndex, 1);
      }
    }
  }

  return projectedKeys;
}

function isValidCycleWindow(startDate: string, nextStartDate: string) {
  return startDate < nextStartDate;
}

function resolvePaycheckCycleBoundaryForPaycheck(
  paycheck: {
    expectedDate: string;
    recurrenceInterval: DashboardSnapshot["paychecks"][number]["recurrenceInterval"];
  },
  sortedPaychecks: DashboardSnapshot["paychecks"],
  index: number
) {
  return resolvePaycheckCycleWindow({
    expectedDate: paycheck.expectedDate,
    recurrenceInterval: paycheck.recurrenceInterval,
    nextPaycheckExpectedDate:
      findNextDistinctPaycheckDate(sortedPaychecks, index),
  });
}

function getBillInstanceDisplayPaycheckId(
  billInstance: { dueDate: string; paycheckCycleId: string },
  sortedPaychecks: DashboardSnapshot["paychecks"]
) {
  return (
    findPaycheckCycleIdForDate(billInstance.dueDate, sortedPaychecks) ??
    billInstance.paycheckCycleId
  );
}

function findPaycheckCycleIdForDate(
  date: string,
  sortedPaychecks: DashboardSnapshot["paychecks"]
) {
  for (let index = sortedPaychecks.length - 1; index >= 0; index -= 1) {
    const paycheck = sortedPaychecks[index];
    const cycleBoundary = resolvePaycheckCycleBoundaryForPaycheck(
      paycheck,
      sortedPaychecks,
      index
    );

    if (
      paycheck.expectedDate <= date &&
      date < cycleBoundary.nextStartDate
    ) {
      return paycheck.id;
    }
  }

  return null;
}
