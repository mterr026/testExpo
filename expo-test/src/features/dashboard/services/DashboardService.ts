import type {
  BalanceAdjustmentRepository,
  BillCycleInstanceRepository,
  BillRepository,
  BudgetingPreferencesRepository,
  EnvelopeRepository,
  PaycheckRepository,
  ProfileRepository,
  PurchaseRepository,
} from "@/database/repositories";
import type {
  Bill,
  BillCycleInstance,
  BudgetingPreferences,
  Envelope,
  Paycheck,
  Profile,
  Purchase,
} from "@/database/repositories/types";
import {
  calculateBillDueDateForCycle,
  calculateSafeToSpend,
  createEmptySafeToSpendBreakdown,
  generateBillCycleInstances,
  isProjectedBillCycleInstance,
  OPEN_ENDED_PAYCHECK_CYCLE_DATE,
  projectedBillCycleInstanceId,
  resolvePaycheckCycleWindow,
  type EnvelopeSnapshot,
  type GeneratedBillCycleInstance,
  type SafeToSpendBreakdown,
} from "@/engine";
import { buildEnvelopeSnapshot } from "@/features/budgeting/envelopeSnapshot";
import {
  findActivePaycheckCycle,
  type ActivePaycheckCycle,
} from "@/features/paychecks/activePaycheckCycle";

export { findActivePaycheckCycle } from "@/features/paychecks/activePaycheckCycle";

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
  budgetingPreferences: BudgetingPreferences | null;
  envelopes: Envelope[];
  envelopeSnapshot: EnvelopeSnapshot;
  safeToSpend: SafeToSpendBreakdown;
};

export class DashboardService {
  constructor(
    private readonly profileRepository: ProfileRepository,
    private readonly paycheckRepository: PaycheckRepository,
    private readonly purchaseRepository: PurchaseRepository,
    private readonly billRepository: BillRepository,
    private readonly billCycleInstanceRepository: BillCycleInstanceRepository,
    private readonly balanceAdjustmentRepository: BalanceAdjustmentRepository,
    private readonly budgetingPreferencesRepository: BudgetingPreferencesRepository,
    private readonly envelopeRepository: EnvelopeRepository
  ) {}

  async loadDashboardSnapshot(date: string): Promise<DashboardSnapshot> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Dashboard date must be an ISO date.");
    }

    const profile = await this.profileRepository.findActive();

    if (!profile) {
      return createEmptySnapshot();
    }

    const [paychecks, bills, purchases, balanceAdjustments, budgetingPreferences, envelopes] =
      await Promise.all([
      this.paycheckRepository.findAll(profile.id),
      this.billRepository.findAll(profile.id),
      this.purchaseRepository.findAll(profile.id),
      this.balanceAdjustmentRepository.findAll(profile.id),
      this.budgetingPreferencesRepository.findByProfileId(profile.id),
      this.envelopeRepository.findAll(profile.id),
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
    const envelopeSnapshot = buildEnvelopeSnapshot({
      envelopes,
      purchases,
      paychecks,
      activeCyclePaycheckId: cycle?.paycheckCycleId ?? null,
      activeCycleStartDate: cycle?.startDate ?? null,
      activeCycleEndDate: cycle?.nextStartDate ?? null,
      envelopesEnabled: budgetingPreferences?.envelopesEnabled ?? false,
    });
    const safeToSpend = calculateSafeToSpend({
      paychecks,
      purchases,
      billInstances: safeToSpendBillInstances,
      balanceAdjustments: balanceAdjustments.map((adjustment) => ({
        deltaCents: adjustment.deltaCents,
      })),
      openingBalanceCents: profile.openingBalanceCents,
      openingBalanceAsOfDate: profile.openingBalanceAsOfDate,
      essentialReserveCents: profile.essentialReserveCents,
      envelopeReservedCents: envelopeSnapshot.totalReservedCents,
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
      budgetingPreferences,
      envelopes,
      envelopeSnapshot,
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
    budgetingPreferences: null,
    envelopes: [],
    envelopeSnapshot: {
      envelopesEnabled: false,
      activeCyclePaycheckId: null,
      entries: [],
      totalReservedCents: 0,
    },
    safeToSpend: createEmptySafeToSpendBreakdown(),
  };
}
