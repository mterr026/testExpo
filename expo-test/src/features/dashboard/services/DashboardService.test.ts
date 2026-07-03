import { describe, expect, it, vi } from "vitest";

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
  BalanceAdjustment,
  Paycheck,
  Profile,
  Purchase,
} from "@/database/repositories/types";

import { DashboardService, findActivePaycheckCycle, projectedBillCycleInstanceId, selectBillInstancesForSafeToSpend } from "./DashboardService";

const profile: Profile = {
  id: "profile-1",
  displayName: "Matt",
  essentialReserveCents: 10000,
  currencyCode: "USD",
  onboardingComplete: true,
  openingBalanceCents: 0,
  tutorialComplete: true,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const paycheck: Paycheck = {
  id: "paycheck-1",
  profileId: "profile-1",
  label: "Primary",
  amountCents: 200000,
  expectedDate: "2026-06-01",
  isReceived: true,
  receivedAt: "2026-06-01T12:00:00.000Z",
  isRecurring: true,
  recurrenceInterval: "biweekly",
  isPrimary: true,
  notes: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const purchase: Purchase = {
  id: "purchase-1",
  profileId: "profile-1",
  amountCents: 2500,
  state: "charged",
  description: "Coffee",
  purchaseDate: "2026-06-02",
  paycheckCycleId: "paycheck-1",
  resolvedAt: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const billInstance: BillCycleInstance = {
  id: "instance-1",
  billId: "bill-1",
  paycheckCycleId: "paycheck-1",
  cycleAmountCents: 50000,
  isVariableConfirmed: false,
  isPaid: false,
  paidAt: null,
  dueDate: "2026-06-10",
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const bill: Bill = {
  id: "bill-1",
  profileId: "profile-1",
  name: "Rent",
  billType: "fixed",
  defaultAmountCents: 50000,
  recurrenceInterval: "monthly",
  customIntervalDays: null,
  dueDayOfCycle: null,
  dueDateAbsolute: "2026-06-10",
  endDate: null,
  isPaused: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

function createMocks() {
  return {
    profileRepository: {
      findActive: vi.fn(),
    },
    paycheckRepository: {
      findAll: vi.fn(),
      findCycleForDate: vi.fn(),
    },
    purchaseRepository: {
      findAll: vi.fn(),
    },
    billRepository: {
      findAll: vi.fn(),
    },
    billCycleInstanceRepository: {
      findByCycle: vi.fn(),
      findByProfile: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    balanceAdjustmentRepository: {
      findAll: vi.fn().mockResolvedValue([]),
    },
  };
}

function createService(mocks: ReturnType<typeof createMocks>) {
  return new DashboardService(
    mocks.profileRepository as unknown as ProfileRepository,
    mocks.paycheckRepository as unknown as PaycheckRepository,
    mocks.purchaseRepository as unknown as PurchaseRepository,
    mocks.billRepository as unknown as BillRepository,
    mocks.billCycleInstanceRepository as unknown as BillCycleInstanceRepository,
    mocks.balanceAdjustmentRepository as unknown as BalanceAdjustmentRepository
  );
}

function projectedBillInstance(
  overrides: Partial<BillCycleInstance> &
    Pick<BillCycleInstance, "billId" | "dueDate">
): BillCycleInstance {
  const { billId, dueDate } = overrides;
  const timestamp = `${dueDate}T00:00:00.000Z`;

  return {
    id: projectedBillCycleInstanceId(billId, dueDate),
    paycheckCycleId: "paycheck-1",
    cycleAmountCents: 50000,
    isVariableConfirmed: true,
    isPaid: false,
    paidAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
    syncStatus: "local",
    ...overrides,
  };
}

describe("DashboardService", () => {
  it("loadDashboardSnapshot_assembles_current_cycle_and_safe_to_spend", async () => {
    const mocks = createMocks();
    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([paycheck]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([purchase]);
    mocks.paycheckRepository.findCycleForDate.mockResolvedValue({
      cycleAnchor: paycheck,
      nextCycleAnchor: null,
    });
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([
      billInstance,
    ]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-03");

    expect(snapshot.profile).toBe(profile);
    expect(snapshot.currentCycleAnchor).toBe(paycheck);
    expect(snapshot.nextCycleAnchor).toBeNull();
    expect(snapshot.paychecks).toEqual([paycheck]);
    expect(snapshot.bills).toEqual([bill]);
    expect(snapshot.purchases).toEqual([purchase]);
    expect(snapshot.billInstances).toEqual([billInstance]);
    expect(snapshot.safeToSpend).toEqual({
      openingBalanceCents: 0,
      confirmedIncomeCents: 200000,
      chargedPurchasesCents: 2500,
      pendingPurchasesCents: 0,
      paidBillsCents: 0,
      unpaidBillsCents: 50000,
      balanceAdjustmentsCents: 0,
      runningBalanceCents: 197500,
      essentialReserveCents: 10000,
      safeToSpendCents: 137500,
    });
    expect(mocks.billCycleInstanceRepository.findByCycle).toHaveBeenCalledWith(
      "paycheck-1"
    );
    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
  });

  it("loadDashboardSnapshot_includes_profile_opening_balance_in_safe_to_spend", async () => {
    const mocks = createMocks();
    const profileWithOpeningBalance = {
      ...profile,
      openingBalanceCents: 75000,
    };

    mocks.profileRepository.findActive.mockResolvedValue(profileWithOpeningBalance);
    mocks.paycheckRepository.findAll.mockResolvedValue([paycheck]);
    mocks.billRepository.findAll.mockResolvedValue([]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByProfile.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-03");

    expect(snapshot.safeToSpend.openingBalanceCents).toBe(75000);
    expect(snapshot.safeToSpend.runningBalanceCents).toBe(275000);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(265000);
  });

  it("loadDashboardSnapshot_includes_balance_adjustments_in_safe_to_spend", async () => {
    const mocks = createMocks();
    const balanceAdjustments: BalanceAdjustment[] = [
      {
        id: "adjustment-1",
        profileId: "profile-1",
        previousBalanceCents: 197500,
        adjustedBalanceCents: 200000,
        deltaCents: 2500,
        reason: null,
        createdAt: "2026-06-02T12:00:00.000Z",
        deletedAt: null,
        syncStatus: "local",
      },
    ];

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([paycheck]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([purchase]);
    mocks.balanceAdjustmentRepository.findAll.mockResolvedValue(balanceAdjustments);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([billInstance]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-03");

    expect(mocks.balanceAdjustmentRepository.findAll).toHaveBeenCalledWith("profile-1");
    expect(snapshot.safeToSpend.balanceAdjustmentsCents).toBe(2500);
    expect(snapshot.safeToSpend.runningBalanceCents).toBe(200000);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(140000);
  });

  it("loadDashboardSnapshot_never_persists_bill_instances_on_read", async () => {
    const nextPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-2",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
    };
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([paycheck, nextPaycheck]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    await service.loadDashboardSnapshot("2026-06-03");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
  });

  it("loadDashboardSnapshot_projects_due_bills_into_current_paycheck_cycle", async () => {
    const nextPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-2",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
    };
    const projectedInstance = projectedBillInstance({
      billId: "bill-1",
      dueDate: "2026-06-10",
      paycheckCycleId: "paycheck-1",
      cycleAmountCents: 50000,
      isVariableConfirmed: true,
    });
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([paycheck, nextPaycheck]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.paycheckRepository.findCycleForDate.mockResolvedValue({
      cycleAnchor: paycheck,
      nextCycleAnchor: nextPaycheck,
    });
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-03");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([projectedInstance]);
    expect(snapshot.allBillInstances).toEqual([projectedInstance]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(50000);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(140000);
  });

  it("loadDashboardSnapshot_prefers_existing_db_instances_over_projections", async () => {
    const nextPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-2",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
    };
    const persistedInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-persisted",
      cycleAmountCents: 42000,
      isVariableConfirmed: false,
    };
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([paycheck, nextPaycheck]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByProfile.mockResolvedValue([
      persistedInstance,
    ]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([
      persistedInstance,
    ]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-03");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([persistedInstance]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(42000);
  });

  it("loadDashboardSnapshot_reuses_existing_bill_occurrence_from_another_cycle", async () => {
    const previousPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-previous",
      expectedDate: "2026-05-18",
    };
    const currentPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-current",
      expectedDate: "2026-06-01",
    };
    const nextPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-next",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
    };
    const existingOccurrenceInPreviousCycle: BillCycleInstance = {
      ...billInstance,
      id: "instance-existing-occurrence",
      paycheckCycleId: "paycheck-previous",
      dueDate: "2026-06-10",
    };
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([
      previousPaycheck,
      currentPaycheck,
      nextPaycheck,
    ]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByProfile.mockResolvedValue([
      existingOccurrenceInPreviousCycle,
    ]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-03");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([existingOccurrenceInPreviousCycle]);
    expect(snapshot.allBillInstances).toEqual([existingOccurrenceInPreviousCycle]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(50000);
  });

  it("loadDashboardSnapshot_includes_scheduled_bill_due_inside_active_paycheck_cycle", async () => {
    const julyFirstPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-jul-1",
      expectedDate: "2026-07-01",
    };
    const julyFifteenthPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const comcastBill: Bill = {
      ...bill,
      id: "bill-comcast",
      name: "Comcast",
      defaultAmountCents: 25000,
      dueDateAbsolute: "2026-07-02",
    };
    const fplBill: Bill = {
      ...bill,
      id: "bill-fpl",
      name: "Florida Power & Light",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const projectedComcastInstance = projectedBillInstance({
      billId: "bill-comcast",
      dueDate: "2026-07-02",
      paycheckCycleId: "paycheck-jul-1",
      cycleAmountCents: 25000,
      isVariableConfirmed: true,
    });
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([
      julyFirstPaycheck,
      julyFifteenthPaycheck,
    ]);
    mocks.billRepository.findAll.mockResolvedValue([comcastBill, fplBill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.paycheckRepository.findCycleForDate.mockResolvedValue({
      cycleAnchor: julyFirstPaycheck,
      nextCycleAnchor: julyFifteenthPaycheck,
    });
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-07-03");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([projectedComcastInstance]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(25000);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(165000);
  });

  it("loadDashboardSnapshot_includes_bill_due_before_next_expected_paycheck_when_no_paycheck_is_received", async () => {
    const nextExpectedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const followingExpectedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-jul-29",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const comcastBill: Bill = {
      ...bill,
      id: "bill-comcast",
      name: "Comcast",
      defaultAmountCents: 25000,
      dueDateAbsolute: "2026-07-02",
    };
    const projectedComcastInstance = projectedBillInstance({
      billId: "bill-comcast",
      dueDate: "2026-07-02",
      paycheckCycleId: "paycheck-jul-15",
      cycleAmountCents: 25000,
      isVariableConfirmed: true,
    });
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([
      nextExpectedPaycheck,
      followingExpectedPaycheck,
    ]);
    mocks.billRepository.findAll.mockResolvedValue([comcastBill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-20");

    expect(snapshot.activeCyclePaycheckId).toBe("paycheck-jul-15");
    expect(snapshot.activeCycleStartDate).toBe("2026-06-20");
    expect(snapshot.activeCycleEndDate).toBe("2026-07-15");
    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([projectedComcastInstance]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(25000);
  });

  it("loadDashboardSnapshot_excludes_scheduled_bill_due_outside_active_paycheck_cycle", async () => {
    const julyFirstPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-jul-1",
      expectedDate: "2026-07-01",
    };
    const julyFifteenthPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const fplBill: Bill = {
      ...bill,
      id: "bill-fpl",
      name: "Florida Power & Light",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([
      julyFirstPaycheck,
      julyFifteenthPaycheck,
    ]);
    mocks.billRepository.findAll.mockResolvedValue([fplBill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.paycheckRepository.findCycleForDate.mockResolvedValue({
      cycleAnchor: julyFirstPaycheck,
      nextCycleAnchor: julyFifteenthPaycheck,
    });
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-07-03");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(0);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(190000);
  });

  it("loadDashboardSnapshot_moves_next_window_bill_into_safe_to_spend_when_that_cycle_is_active", async () => {
    const julyFifteenthPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
    };
    const julyTwentyNinthPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-jul-29",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const fplBill: Bill = {
      ...bill,
      id: "bill-fpl",
      name: "Florida Power & Light",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const projectedFplInstance = projectedBillInstance({
      billId: "bill-fpl",
      dueDate: "2026-07-22",
      paycheckCycleId: "paycheck-jul-15",
      cycleAmountCents: 14255,
      isVariableConfirmed: true,
    });
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([
      julyFifteenthPaycheck,
      julyTwentyNinthPaycheck,
    ]);
    mocks.billRepository.findAll.mockResolvedValue([fplBill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.paycheckRepository.findCycleForDate.mockResolvedValue({
      cycleAnchor: julyFifteenthPaycheck,
      nextCycleAnchor: julyTwentyNinthPaycheck,
    });
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-07-16");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([projectedFplInstance]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(14255);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(175745);
  });

  it("loadDashboardSnapshot_syncs_due_bills_into_the_last_known_paycheck_cycle", async () => {
    const lastKnownPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-last",
      expectedDate: "2026-06-20",
    };
    const billAfterPaycheck: Bill = {
      ...bill,
      id: "bill-after-paycheck",
      name: "Phone",
      defaultAmountCents: 7500,
      dueDateAbsolute: "2026-06-22",
    };
    const projectedInstance = projectedBillInstance({
      billId: "bill-after-paycheck",
      dueDate: "2026-06-22",
      paycheckCycleId: "paycheck-last",
      cycleAmountCents: 7500,
      isVariableConfirmed: true,
    });
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([lastKnownPaycheck]);
    mocks.billRepository.findAll.mockResolvedValue([billAfterPaycheck]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.paycheckRepository.findCycleForDate.mockResolvedValue({
      cycleAnchor: lastKnownPaycheck,
      nextCycleAnchor: null,
    });
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-20");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([projectedInstance]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(7500);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(182500);
  });

  it("loadDashboardSnapshot_does_not_duplicate_existing_cycle_bill_instances", async () => {
    const nextPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-2",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
    };
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([paycheck, nextPaycheck]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.paycheckRepository.findCycleForDate.mockResolvedValue({
      cycleAnchor: paycheck,
      nextCycleAnchor: nextPaycheck,
    });
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([
      billInstance,
    ]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-03");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([billInstance]);
  });

  it("loadDashboardSnapshot_returns_empty_snapshot_without_active_profile", async () => {
    const mocks = createMocks();
    mocks.profileRepository.findActive.mockResolvedValue(null);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-03");

    expect(snapshot.profile).toBeNull();
    expect(snapshot.paychecks).toEqual([]);
    expect(snapshot.bills).toEqual([]);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(0);
    expect(mocks.paycheckRepository.findAll).not.toHaveBeenCalled();
  });

  it("loadDashboardSnapshot_allows_missing_current_cycle", async () => {
    const mocks = createMocks();
    const futureExpectedPaycheck = {
      ...paycheck,
      isReceived: false,
      receivedAt: null,
    };
    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([futureExpectedPaycheck]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([purchase]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-05-01");

    expect(snapshot.currentCycleAnchor).toBeNull();
    expect(snapshot.activeCyclePaycheckId).toBe("paycheck-1");
    expect(snapshot.activeCycleStartDate).toBe("2026-05-01");
    expect(snapshot.activeCycleEndDate).toBe("2026-06-01");
    expect(snapshot.billInstances).toEqual([]);
    expect(mocks.billCycleInstanceRepository.findByCycle).toHaveBeenCalledWith(
      "paycheck-1"
    );
  });

  it("loadDashboardSnapshot_keeps_active_cycle_when_paycheck_is_past_due_and_unreceived", async () => {
    const overduePaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-overdue",
      expectedDate: "2026-06-01",
      isReceived: false,
      receivedAt: null,
    };
    const overdueBillInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-overdue-cycle",
      paycheckCycleId: "paycheck-overdue",
      cycleAmountCents: 50000,
      dueDate: "2026-06-10",
    };
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([overduePaycheck]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([
      overdueBillInstance,
    ]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-10");

    expect(snapshot.currentCycleAnchor).toBe(overduePaycheck);
    expect(snapshot.activeCyclePaycheckId).toBe("paycheck-overdue");
    expect(snapshot.activeCycleStartDate).toBe("2026-06-01");
    expect(snapshot.activeCycleEndDate).toBe("2026-06-15");
    expect(snapshot.billInstances).toEqual([overdueBillInstance]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(50000);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(-60000);
  });

  it("loadDashboardSnapshot_uses_today_expected_paycheck_as_active_cycle_anchor", async () => {
    const todayExpectedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-today",
      expectedDate: "2026-06-21",
      isReceived: false,
      receivedAt: null,
    };
    const billDueAfterToday: Bill = {
      ...bill,
      id: "bill-imported",
      name: "Imported Utility",
      defaultAmountCents: 12500,
      dueDateAbsolute: "2026-06-22",
    };
    const projectedInstance = projectedBillInstance({
      billId: "bill-imported",
      dueDate: "2026-06-22",
      paycheckCycleId: "paycheck-today",
      cycleAmountCents: 12500,
      isVariableConfirmed: true,
    });
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([todayExpectedPaycheck]);
    mocks.billRepository.findAll.mockResolvedValue([billDueAfterToday]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-21");

    expect(snapshot.activeCyclePaycheckId).toBe("paycheck-today");
    expect(snapshot.activeCycleStartDate).toBe("2026-06-21");
    expect(snapshot.activeCycleEndDate).toBe("2026-07-05");
    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([projectedInstance]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(12500);
  });

  it("loadDashboardSnapshot_skips_same_day_expected_paycheck_after_received_anchor", async () => {
    const receivedTodayPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-received-today",
      expectedDate: "2026-06-21",
      isReceived: true,
      receivedAt: "2026-06-21T12:00:00.000Z",
    };
    const sameDayExpectedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-same-day-expected",
      expectedDate: "2026-06-21",
      isReceived: false,
      receivedAt: null,
    };
    const laterExpectedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-later-expected",
      expectedDate: "2026-07-05",
      isReceived: false,
      receivedAt: null,
    };
    const billDueAfterToday: Bill = {
      ...bill,
      id: "bill-after-today",
      defaultAmountCents: 13000,
      dueDateAbsolute: "2026-06-24",
    };
    const projectedInstance = projectedBillInstance({
      billId: "bill-after-today",
      dueDate: "2026-06-24",
      paycheckCycleId: "paycheck-received-today",
      cycleAmountCents: 13000,
      isVariableConfirmed: true,
    });
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([
      receivedTodayPaycheck,
      sameDayExpectedPaycheck,
      laterExpectedPaycheck,
    ]);
    mocks.billRepository.findAll.mockResolvedValue([billDueAfterToday]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-21");

    expect(snapshot.activeCyclePaycheckId).toBe("paycheck-received-today");
    expect(snapshot.activeCycleStartDate).toBe("2026-06-21");
    expect(snapshot.activeCycleEndDate).toBe("2026-07-05");
    expect(snapshot.nextCycleAnchor).toBe(laterExpectedPaycheck);
    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([projectedInstance]);
  });

  it("loadDashboardSnapshot_advances_imported_recurring_bill_into_active_cycle", async () => {
    const currentPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-current",
      expectedDate: "2026-07-15",
    };
    const nextPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-next",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const importedBill: Bill = {
      ...bill,
      id: "bill-imported",
      name: "Imported Utility",
      defaultAmountCents: 12500,
      dueDateAbsolute: "2026-06-22",
      endDate: null,
    };
    const projectedInstance = projectedBillInstance({
      billId: "bill-imported",
      dueDate: "2026-07-22",
      paycheckCycleId: "paycheck-current",
      cycleAmountCents: 12500,
      isVariableConfirmed: true,
    });
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([
      currentPaycheck,
      nextPaycheck,
    ]);
    mocks.billRepository.findAll.mockResolvedValue([importedBill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-07-16");

    expect(mocks.billCycleInstanceRepository.create).not.toHaveBeenCalled();
    expect(snapshot.billInstances).toEqual([projectedInstance]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(12500);
  });

  it("loadDashboardSnapshot_preserves_multiple_income_source_statuses", async () => {
    const secondaryPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-2",
      label: "Side work",
      amountCents: 65000,
      expectedDate: "2026-06-03",
      isReceived: false,
      receivedAt: null,
    };
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([
      paycheck,
      secondaryPaycheck,
    ]);
    mocks.billRepository.findAll.mockResolvedValue([bill]);
    mocks.purchaseRepository.findAll.mockResolvedValue([purchase]);
    mocks.paycheckRepository.findCycleForDate.mockResolvedValue({
      cycleAnchor: paycheck,
      nextCycleAnchor: secondaryPaycheck,
    });
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([
      billInstance,
    ]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-02");

    expect(snapshot.paychecks).toEqual([paycheck, secondaryPaycheck]);
    expect(snapshot.nextCycleAnchor).toBe(secondaryPaycheck);
    expect(snapshot.safeToSpend.confirmedIncomeCents).toBe(200000);
    expect(snapshot.safeToSpend.runningBalanceCents).toBe(197500);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(50000);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(137500);
  });

  it("loadDashboardSnapshot_rejects_invalid_date", async () => {
    const service = createService(createMocks());

    await expect(service.loadDashboardSnapshot("06/03/2026")).rejects.toThrow(
      "Dashboard date must be an ISO date."
    );
  });

  it("loadDashboardSnapshot_includes_overdue_unpaid_bills_from_prior_cycles_in_safe_to_spend", async () => {
    const currentPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-current",
      expectedDate: "2026-06-01",
      isReceived: true,
      receivedAt: "2026-06-01T12:00:00.000Z",
    };
    const nextPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-next",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
    };
    const overdueInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-overdue",
      billId: "bill-1",
      paycheckCycleId: "paycheck-previous",
      cycleAmountCents: 30000,
      dueDate: "2026-05-28",
      isPaid: false,
    };
    const mocks = createMocks();

    mocks.profileRepository.findActive.mockResolvedValue(profile);
    mocks.paycheckRepository.findAll.mockResolvedValue([currentPaycheck, nextPaycheck]);
    mocks.billRepository.findAll.mockResolvedValue([]);
    mocks.purchaseRepository.findAll.mockResolvedValue([]);
    mocks.billCycleInstanceRepository.findByProfile.mockResolvedValue([
      overdueInstance,
    ]);
    mocks.billCycleInstanceRepository.findByCycle.mockResolvedValue([]);
    const service = createService(mocks);

    const snapshot = await service.loadDashboardSnapshot("2026-06-03");

    expect(snapshot.billInstances).toEqual([]);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(30000);
    expect(snapshot.safeToSpend.safeToSpendCents).toBe(160000);
  });
});

describe("selectBillInstancesForSafeToSpend", () => {
  it("includes_all_paid_instances_and_unpaid_bills_due_before_the_next_paycheck", () => {
    const cycle = {
      cycleAnchor: paycheck,
      nextCycleAnchor: null,
      nextStartDate: "2026-06-15",
      paycheckCycleId: "paycheck-1",
      startDate: "2026-06-01",
    };
    const instances: BillCycleInstance[] = [
      {
        ...billInstance,
        id: "paid-current",
        dueDate: "2026-06-05",
        isPaid: true,
        paidAt: "2026-06-05T12:00:00.000Z",
      },
      {
        ...billInstance,
        id: "unpaid-current",
        dueDate: "2026-06-10",
        isPaid: false,
      },
      {
        ...billInstance,
        id: "unpaid-overdue",
        paycheckCycleId: "paycheck-previous",
        dueDate: "2026-05-28",
        isPaid: false,
      },
      {
        ...billInstance,
        id: "unpaid-future",
        dueDate: "2026-06-20",
        isPaid: false,
      },
    ];

    expect(selectBillInstancesForSafeToSpend(instances, cycle).map((item) => item.id)).toEqual([
      "unpaid-overdue",
      "paid-current",
      "unpaid-current",
    ]);
  });

  it("includes_all_unpaid_instances_when_no_active_paycheck_cycle_exists", () => {
    const instances: BillCycleInstance[] = [
      {
        ...billInstance,
        id: "unpaid-overdue",
        dueDate: "2026-05-01",
        isPaid: false,
      },
      {
        ...billInstance,
        id: "unpaid-future",
        dueDate: "2026-08-01",
        isPaid: false,
      },
    ];

    expect(selectBillInstancesForSafeToSpend(instances, null).map((item) => item.id)).toEqual([
      "unpaid-overdue",
      "unpaid-future",
    ]);
  });
});

describe("findActivePaycheckCycle", () => {
  it("uses_recurrence_boundary_for_received_recurring_anchor_without_next_paycheck_row", () => {
    const receivedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-received",
      expectedDate: "2026-06-21",
      isReceived: true,
      receivedAt: "2026-06-21T12:00:00.000Z",
      recurrenceInterval: "biweekly",
    };

    expect(findActivePaycheckCycle([receivedPaycheck], "2026-06-21")).toEqual({
      cycleAnchor: receivedPaycheck,
      nextCycleAnchor: null,
      nextStartDate: "2026-07-05",
      paycheckCycleId: "paycheck-received",
      startDate: "2026-06-21",
    });
  });

  it("uses_recurrence_boundary_when_next_paycheck_row_is_later_than_recurrence", () => {
    const receivedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-received",
      expectedDate: "2026-06-01",
      isReceived: true,
      receivedAt: "2026-06-01T12:00:00.000Z",
      recurrenceInterval: "biweekly",
    };
    const distantExpectedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-distant",
      expectedDate: "2026-07-01",
      isReceived: false,
      receivedAt: null,
      recurrenceInterval: "biweekly",
    };

    expect(
      findActivePaycheckCycle(
        [receivedPaycheck, distantExpectedPaycheck],
        "2026-06-10"
      )?.nextStartDate
    ).toBe("2026-06-15");
  });

  it("keeps_pre_first_paycheck_waiting_window_on_next_expected_paycheck_date", () => {
    const futureExpectedPaycheck: Paycheck = {
      ...paycheck,
      isReceived: false,
      receivedAt: null,
      expectedDate: "2026-06-01",
    };

    expect(findActivePaycheckCycle([futureExpectedPaycheck], "2026-05-01")).toEqual({
      cycleAnchor: null,
      nextCycleAnchor: futureExpectedPaycheck,
      nextStartDate: "2026-06-01",
      paycheckCycleId: "paycheck-1",
      startDate: "2026-05-01",
    });
  });

  it("uses_next_paycheck_row_for_one_time_anchor_without_recurrence", () => {
    const oneTimePaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-one-time",
      expectedDate: "2026-06-01",
      isReceived: true,
      receivedAt: "2026-06-01T12:00:00.000Z",
      isRecurring: false,
      recurrenceInterval: null,
    };
    const nextOneTimePaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-one-time-next",
      expectedDate: "2026-07-01",
      isReceived: false,
      receivedAt: null,
      isRecurring: false,
      recurrenceInterval: null,
    };

    expect(
      findActivePaycheckCycle(
        [oneTimePaycheck, nextOneTimePaycheck],
        "2026-06-10"
      )?.nextStartDate
    ).toBe("2026-07-01");
  });

  it("prefers_primary_income_when_choosing_the_active_cycle", () => {
    const secondaryReceivedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-pension",
      label: "Pension",
      expectedDate: "2026-06-21",
      isPrimary: false,
      isReceived: true,
      receivedAt: "2026-06-21T12:00:00.000Z",
      recurrenceInterval: "monthly",
    };
    const primaryExpectedPaycheck: Paycheck = {
      ...paycheck,
      id: "paycheck-primary",
      label: "Main job",
      expectedDate: "2026-06-15",
      isPrimary: true,
      isReceived: false,
      receivedAt: null,
      recurrenceInterval: "biweekly",
    };

    expect(
      findActivePaycheckCycle(
        [secondaryReceivedPaycheck, primaryExpectedPaycheck],
        "2026-06-21"
      )
    ).toEqual({
      cycleAnchor: primaryExpectedPaycheck,
      nextCycleAnchor: null,
      nextStartDate: "2026-06-29",
      paycheckCycleId: "paycheck-primary",
      startDate: "2026-06-15",
    });
  });
});
