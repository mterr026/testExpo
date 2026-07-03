import type {
  BalanceAdjustmentRepository,
  BillCycleInstanceRepository,
  BillRepository,
  PaycheckRepository,
  ProfileRepository,
  PurchaseRepository,
} from "@/database/repositories";
import type {
  Bill,
  BillCycleInstance,
  Paycheck,
  Profile,
  Purchase,
} from "@/database/repositories/types";
import {
  calculateBillDueDateForCycle,
  calculateSafeToSpend,
  generateBillCycleInstances,
  isProjectedBillCycleInstance,
  OPEN_ENDED_PAYCHECK_CYCLE_DATE,
  projectedBillCycleInstanceId,
  resolvePaycheckCycleWindow,
  type GeneratedBillCycleInstance,
  type SafeToSpendBreakdown,
} from "@/engine";

export function createEmptySafeToSpendBreakdown(
  essentialReserveCents = 0,
  openingBalanceCents = 0
): SafeToSpendBreakdown {
  return calculateSafeToSpend({
    paychecks: [],
    purchases: [],
    billInstances: [],
    balanceAdjustments: [],
    essentialReserveCents,
    openingBalanceCents,
  });
}

export type DashboardSnapshot = {
  activeCycleEndDate: string | null;
  activeCyclePaycheckId: string | null;
  activeCycleStartDate: string | null;
  profile: Profile | null;
  currentCycleAnchor: Paycheck | null;
  nextCycleAnchor: Paycheck | null;
  paychecks: Paycheck[];
  bills: Bill[];
  purchases: Purchase[];
  allBillInstances: BillCycleInstance[];
  billInstances: BillCycleInstance[];
  safeToSpend: SafeToSpendBreakdown;
};

export class DashboardService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly paycheckRepository: PaycheckRepository,
    private readonly purchaseRepository: PurchaseRepository,
    private readonly billRepository: BillRepository,
    private readonly billCycleInstanceRepository: BillCycleInstanceRepository,
    private readonly balanceAdjustmentRepository: BalanceAdjustmentRepository
  ) {}

  async loadDashboardSnapshot(date: string): Promise<DashboardSnapshot> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Dashboard date must be an ISO date.");
    }

    const profile = await this.profileRepository.findActive();

    if (!profile) {
      return createEmptySnapshot();
    }

    const [paychecks, bills, purchases, balanceAdjustments] = await Promise.all([
      this.paycheckRepository.findAll(profile.id),
      this.billRepository.findAll(profile.id),
      this.purchaseRepository.findAll(profile.id),
      this.balanceAdjustmentRepository.findAll(profile.id),
    ]);
    const allExistingBillInstances =
      await this.billCycleInstanceRepository.findByProfile(profile.id);
    const cycle = findActivePaycheckCycle(paychecks, date);
    const billInstances = cycle
      ? await this.resolveCurrentCycleBillInstances(
          bills,
          cycle,
          allExistingBillInstances
        )
      : [];
    logDashboardBillDiagnostics({
      bills,
      billInstances,
      cycle,
      date,
    });
    const allBillInstances = mergeBillInstances(
      allExistingBillInstances,
      billInstances
    );
    const safeToSpendBillInstances = selectBillInstancesForSafeToSpend(
      allBillInstances,
      cycle
    );
    const safeToSpend = calculateSafeToSpend({
      paychecks,
      purchases,
      billInstances: safeToSpendBillInstances,
      balanceAdjustments: balanceAdjustments.map((adjustment) => ({
        deltaCents: adjustment.deltaCents,
      })),
      openingBalanceCents: profile.openingBalanceCents,
      essentialReserveCents: profile.essentialReserveCents,
    });

    return {
      activeCycleEndDate: cycle?.nextStartDate ?? null,
      activeCyclePaycheckId: cycle?.paycheckCycleId ?? null,
      activeCycleStartDate: cycle?.startDate ?? null,
      profile,
      currentCycleAnchor: cycle?.cycleAnchor ?? null,
      nextCycleAnchor: cycle?.nextCycleAnchor ?? null,
      paychecks,
      bills,
      purchases,
      allBillInstances,
      billInstances,
      safeToSpend,
    };
  }

  private async resolveCurrentCycleBillInstances(
    bills: Bill[],
    cycle: ActivePaycheckCycle,
    allExistingBillInstances: BillCycleInstance[]
  ) {
    const existingInstances = await this.billCycleInstanceRepository.findByCycle(
      cycle.paycheckCycleId
    );

    const generatedInstances = generateBillCycleInstances({
      bills,
      cycle: {
        paycheckCycleId: cycle.paycheckCycleId,
        startDate: cycle.startDate,
        nextStartDate: cycle.nextStartDate,
      },
      existingInstances,
    });

    if (generatedInstances.length === 0) {
      return existingInstances;
    }

    const projectedInstances: BillCycleInstance[] = [];

    for (const generatedInstance of generatedInstances) {
      const existingOccurrence = findExistingBillOccurrence(
        allExistingBillInstances,
        generatedInstance
      );

      if (existingOccurrence) {
        projectedInstances.push(existingOccurrence);
        continue;
      }

      projectedInstances.push(toProjectedBillCycleInstance(generatedInstance));
    }

    return [...existingInstances, ...projectedInstances].sort((first, second) =>
      first.dueDate === second.dueDate
        ? first.createdAt.localeCompare(second.createdAt)
        : first.dueDate.localeCompare(second.dueDate)
    );
  }
}

export { isProjectedBillCycleInstance, projectedBillCycleInstanceId } from "@/engine";

function toProjectedBillCycleInstance(
  generated: GeneratedBillCycleInstance
): BillCycleInstance {
  const timestamp = `${generated.dueDate}T00:00:00.000Z`;

  return {
    id: projectedBillCycleInstanceId(generated.billId, generated.dueDate),
    billId: generated.billId,
    paycheckCycleId: generated.paycheckCycleId,
    cycleAmountCents: generated.cycleAmountCents,
    isVariableConfirmed: generated.isVariableConfirmed,
    isPaid: generated.isPaid,
    paidAt: null,
    dueDate: generated.dueDate,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    syncStatus: "local",
  };
}

function findExistingBillOccurrence(
  instances: BillCycleInstance[],
  generatedInstance: { billId: string; dueDate: string }
) {
  return instances.find(
    (instance) =>
      !instance.deletedAt &&
      instance.billId === generatedInstance.billId &&
      instance.dueDate === generatedInstance.dueDate
  );
}

function mergeBillInstances(
  existingInstances: BillCycleInstance[],
  activeCycleInstances: BillCycleInstance[]
) {
  const merged = [...existingInstances];
  const existingIds = new Set(existingInstances.map((instance) => instance.id));

  for (const activeCycleInstance of activeCycleInstances) {
    if (!existingIds.has(activeCycleInstance.id)) {
      merged.push(activeCycleInstance);
      existingIds.add(activeCycleInstance.id);
    }
  }

  return merged.sort((first, second) =>
    first.dueDate === second.dueDate
      ? first.createdAt.localeCompare(second.createdAt)
      : first.dueDate.localeCompare(second.dueDate)
  );
}

export function selectBillInstancesForSafeToSpend(
  allBillInstances: BillCycleInstance[],
  cycle: ActivePaycheckCycle | null
) {
  const activeInstances = allBillInstances.filter((instance) => !instance.deletedAt);
  const paidInstances = activeInstances.filter((instance) => instance.isPaid);
  const unpaidInstances = activeInstances.filter((instance) => {
    if (instance.isPaid) {
      return false;
    }

    if (!cycle) {
      return true;
    }

    if (cycle.nextStartDate === OPEN_ENDED_PAYCHECK_CYCLE_DATE) {
      return true;
    }

    return instance.dueDate < cycle.nextStartDate;
  });
  const instancesById = new Map<string, BillCycleInstance>();

  for (const instance of [...paidInstances, ...unpaidInstances]) {
    instancesById.set(instance.id, instance);
  }

  return [...instancesById.values()].sort((first, second) =>
    first.dueDate === second.dueDate
      ? first.createdAt.localeCompare(second.createdAt)
      : first.dueDate.localeCompare(second.dueDate)
  );
}

function logDashboardBillDiagnostics({
  bills,
  billInstances,
  cycle,
  date,
}: {
  bills: Bill[];
  billInstances: BillCycleInstance[];
  cycle: ActivePaycheckCycle | null;
  date: string;
}) {
  if (
    process.env.NODE_ENV === "test" ||
    bills.length === 0 ||
    billInstances.length > 0 ||
    !cycle
  ) {
    return;
  }

  const diagnostics = bills.map((bill) => {
    try {
      const dueDate = calculateBillDueDateForCycle(bill, {
        paycheckCycleId: cycle.paycheckCycleId,
        startDate: cycle.startDate,
        nextStartDate: cycle.nextStartDate,
      });

      return {
        billId: bill.id,
        dueDate,
        name: bill.name,
        reason: dueDate
          ? "Due date is outside active cycle or instance already exists as paid/deleted"
          : "No due date in active cycle",
      };
    } catch (error) {
      return {
        billId: bill.id,
        name: bill.name,
        reason: error instanceof Error ? error.message : "Unknown bill error",
      };
    }
  });

  console.info("Dashboard upcoming bills diagnostics", {
    activeCycleEndDate: cycle?.nextStartDate ?? null,
    activeCyclePaycheckId: cycle?.paycheckCycleId ?? null,
    activeCycleStartDate: cycle?.startDate ?? null,
    billCount: bills.length,
    date,
    diagnostics,
  });
}

function createEmptySnapshot(): DashboardSnapshot {
  return {
    activeCycleEndDate: null,
    activeCyclePaycheckId: null,
    activeCycleStartDate: null,
    profile: null,
    currentCycleAnchor: null,
    nextCycleAnchor: null,
    paychecks: [],
    bills: [],
    purchases: [],
    allBillInstances: [],
    billInstances: [],
    safeToSpend: createEmptySafeToSpendBreakdown(),
  };
}

type ActivePaycheckCycle = {
  cycleAnchor: Paycheck | null;
  nextCycleAnchor: Paycheck | null;
  nextStartDate: string;
  paycheckCycleId: string;
  startDate: string;
};

export function findActivePaycheckCycle(
  paychecks: Paycheck[],
  date: string
): ActivePaycheckCycle | null {
  const cyclePaychecks = paychecksForCycleAnchor(paychecks);
  const sortedPaychecks = [...cyclePaychecks].sort((first, second) =>
    first.expectedDate.localeCompare(second.expectedDate)
  );

  if (sortedPaychecks.length === 0) {
    return null;
  }

  const nextExpectedPaycheck = sortedPaychecks.find(
    (paycheck) => !paycheck.isReceived && paycheck.expectedDate >= date
  );
  const latestReceivedPaycheck = [...sortedPaychecks]
    .reverse()
    .find((paycheck) => paycheck.isReceived && paycheck.expectedDate <= date);

  if (latestReceivedPaycheck) {
    const nextExpectedAfterReceived = sortedPaychecks.find(
      (paycheck) =>
        !paycheck.isReceived &&
        paycheck.expectedDate > latestReceivedPaycheck.expectedDate
    );

    return {
      cycleAnchor: latestReceivedPaycheck,
      nextCycleAnchor: nextExpectedAfterReceived ?? null,
      nextStartDate: resolvePaycheckCycleWindow({
        expectedDate: latestReceivedPaycheck.expectedDate,
        recurrenceInterval: latestReceivedPaycheck.recurrenceInterval,
        nextPaycheckExpectedDate: nextExpectedAfterReceived?.expectedDate ?? null,
      }).nextStartDate,
      paycheckCycleId: latestReceivedPaycheck.id,
      startDate: latestReceivedPaycheck.expectedDate,
    };
  }

  const overdueUnreceivedPaycheck = [...sortedPaychecks]
    .reverse()
    .find(
      (paycheck) => !paycheck.isReceived && paycheck.expectedDate < date
    );

  if (overdueUnreceivedPaycheck) {
    const nextUnreceivedAfterOverdue = sortedPaychecks.find(
      (paycheck) =>
        !paycheck.isReceived &&
        paycheck.expectedDate > overdueUnreceivedPaycheck.expectedDate
    );

    return {
      cycleAnchor: overdueUnreceivedPaycheck,
      nextCycleAnchor: nextUnreceivedAfterOverdue ?? null,
      nextStartDate: resolvePaycheckCycleWindow({
        expectedDate: overdueUnreceivedPaycheck.expectedDate,
        recurrenceInterval: overdueUnreceivedPaycheck.recurrenceInterval,
        nextPaycheckExpectedDate: nextUnreceivedAfterOverdue?.expectedDate ?? null,
      }).nextStartDate,
      paycheckCycleId: overdueUnreceivedPaycheck.id,
      startDate: overdueUnreceivedPaycheck.expectedDate,
    };
  }

  if (!nextExpectedPaycheck) {
    return null;
  }

  const nextCycleAnchor =
    nextExpectedPaycheck.expectedDate === date
      ? sortedPaychecks.find(
          (paycheck) =>
            !paycheck.isReceived &&
            paycheck.expectedDate > nextExpectedPaycheck.expectedDate
        ) ?? null
      : nextExpectedPaycheck;

  const isPaydayAnchor = nextExpectedPaycheck.expectedDate === date;

  return {
    cycleAnchor: isPaydayAnchor ? nextExpectedPaycheck : null,
    nextCycleAnchor,
    nextStartDate: isPaydayAnchor
      ? resolvePaycheckCycleWindow({
          expectedDate: nextExpectedPaycheck.expectedDate,
          recurrenceInterval: nextExpectedPaycheck.recurrenceInterval,
          nextPaycheckExpectedDate: nextCycleAnchor?.expectedDate ?? null,
        }).nextStartDate
      : (nextCycleAnchor?.expectedDate ?? OPEN_ENDED_PAYCHECK_CYCLE_DATE),
    paycheckCycleId: nextExpectedPaycheck.id,
    startDate: isPaydayAnchor ? nextExpectedPaycheck.expectedDate : date,
  };
}

function paychecksForCycleAnchor(paychecks: Paycheck[]) {
  const primaryPaychecks = paychecks.filter((paycheck) => paycheck.isPrimary);

  return primaryPaychecks.length > 0 ? primaryPaychecks : paychecks;
}
