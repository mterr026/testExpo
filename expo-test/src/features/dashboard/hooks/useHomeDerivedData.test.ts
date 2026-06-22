import { describe, expect, it } from "vitest";

import type {
  Bill as RepositoryBill,
  BillCycleInstance,
  Paycheck,
  Profile,
  Purchase,
} from "@/database/repositories/types";
import { calculateSafeToSpend } from "@/engine";
import type { DashboardSnapshot } from "@/features/dashboard/services";

import {
  buildDashboardTotalsFromSnapshot,
  buildLocalFallbackTotals,
  buildDashboardUpcomingBills,
  buildDashboardUpcomingPaychecks,
  buildPaycheckBillCoverage,
  buildVisibleBills,
  resolveActiveDashboardSnapshot,
} from "./useHomeDerivedData";

const profile: Profile = {
  id: "profile-1",
  displayName: "Matt",
  essentialReserveCents: 0,
  currencyCode: "USD",
  onboardingComplete: true,
  openingBalanceCents: 0,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const currentPaycheck: Paycheck = {
  id: "paycheck-1",
  profileId: "profile-1",
  label: "Primary",
  amountCents: 200000,
  expectedDate: "2026-06-01",
  isReceived: true,
  receivedAt: null,
    isRecurring: false,
    recurrenceInterval: null,
    isPrimary: true,
    notes: null,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const currentCycleBill: RepositoryBill = {
  id: "bill-current",
  profileId: "profile-1",
  name: "Internet",
  billType: "fixed",
  defaultAmountCents: 9000,
  recurrenceInterval: "monthly",
  customIntervalDays: null,
  dueDayOfCycle: null,
  dueDateAbsolute: "2026-06-05",
  endDate: null,
  isPaused: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const futureOneTimeBill: RepositoryBill = {
  id: "bill-future",
  profileId: "profile-1",
  name: "Car repair",
  billType: "fixed",
  defaultAmountCents: 45000,
  recurrenceInterval: "monthly",
  customIntervalDays: null,
  dueDayOfCycle: null,
  dueDateAbsolute: "2026-07-02",
  endDate: "2026-07-03",
  isPaused: false,
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

const billInstance: BillCycleInstance = {
  id: "instance-1",
  billId: "bill-current",
  paycheckCycleId: "paycheck-1",
  cycleAmountCents: 9000,
  isVariableConfirmed: true,
  isPaid: false,
  paidAt: null,
  dueDate: "2026-06-05",
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  deletedAt: null,
  syncStatus: "local",
};

function createSnapshot(): DashboardSnapshot {
  return {
    activeCycleEndDate: "9999-12-31",
    activeCyclePaycheckId: "paycheck-1",
    activeCycleStartDate: "2026-06-01",
    profile,
    currentCycleAnchor: currentPaycheck,
    nextCycleAnchor: null,
    paychecks: [currentPaycheck],
    bills: [currentCycleBill, futureOneTimeBill],
    purchases: [],
    allBillInstances: [billInstance],
    billInstances: [billInstance],
    safeToSpend: calculateSafeToSpend({
      paychecks: [currentPaycheck],
      purchases: [],
      billInstances: [billInstance],
      balanceAdjustments: [],
      essentialReserveCents: 0,
    }),
  };
}

describe("buildVisibleBills", () => {
  it("keeps_future_one_time_bills_visible_when_they_are_not_in_the_current_cycle", () => {
    const visibleBills = buildVisibleBills(createSnapshot(), []);

    expect(visibleBills.map((bill) => bill.name)).toEqual([
      "Internet",
      "Car repair",
    ]);
    expect(visibleBills[0]).toMatchObject({
      billId: "bill-current",
      id: "instance-1",
      status: "Due",
    });
    expect(visibleBills[1]).toMatchObject({
      billId: "bill-future",
      dueDate: "2026-07-02",
      endDate: "2026-07-03",
      status: "Scheduled",
    });
  });

  it("uses_paid_cycle_instances_instead_of_saved_bill_definitions_for_paid_rows", () => {
    const paidInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-paid",
      isPaid: true,
      paidAt: "2026-06-05T12:00:00.000Z",
    };
    const visibleBills = buildVisibleBills(
      {
        ...createSnapshot(),
        allBillInstances: [paidInstance],
        billInstances: [],
        safeToSpend: calculateSafeToSpend({
          paychecks: [currentPaycheck],
          purchases: [],
          billInstances: [],
          balanceAdjustments: [],
          essentialReserveCents: 0,
        }),
      },
      []
    );

    expect(visibleBills).toEqual([
      expect.objectContaining({
        billId: "bill-current",
        id: "instance-paid",
        status: "Paid",
      }),
      expect.objectContaining({
        billId: "bill-future",
        id: "bill-future",
        status: "Scheduled",
      }),
    ]);
  });
});

describe("buildDashboardUpcomingBills", () => {
  it("uses_current_paycheck_cycle_bills_instead_of_all_saved_bills", () => {
    const dashboardBills = buildDashboardUpcomingBills(createSnapshot(), []);

    expect(dashboardBills.map((bill) => bill.name)).toEqual(["Internet"]);
    expect(dashboardBills[0]).toMatchObject({
      amountCents: 9000,
      dueDate: "2026-06-05",
      id: "instance-1",
      status: "Due",
    });
  });

  it("shows_the_next_bill_occurrence_when_the_active_cycle_is_open_ended", () => {
    const dashboardBills = buildDashboardUpcomingBills(
      {
        ...createSnapshot(),
        billInstances: [],
        safeToSpend: calculateSafeToSpend({
          paychecks: [currentPaycheck],
          purchases: [],
          billInstances: [],
          balanceAdjustments: [],
          essentialReserveCents: 0,
        }),
      },
      []
    );

    expect(dashboardBills).toEqual([
      expect.objectContaining({
        amountCents: 9000,
        dueDate: "2026-06-05",
        name: "Internet",
        status: "Due",
      }),
    ]);
  });

  it("shows_saved_confirmed_bills_when_no_active_paycheck_cycle_exists_yet", () => {
    const dashboardBills = buildDashboardUpcomingBills(
      {
        ...createSnapshot(),
        activeCycleEndDate: null,
        activeCyclePaycheckId: null,
        activeCycleStartDate: null,
        currentCycleAnchor: null,
        nextCycleAnchor: null,
        paychecks: [],
        billInstances: [],
        allBillInstances: [],
        safeToSpend: calculateSafeToSpend({
          paychecks: [],
          purchases: [],
          billInstances: [],
          balanceAdjustments: [],
          essentialReserveCents: 0,
        }),
      },
      []
    );

    expect(dashboardBills).toEqual([
      expect.objectContaining({
        amountCents: 9000,
        dueDate: "2026-06-05",
        name: "Internet",
        status: "Scheduled",
      }),
      expect.objectContaining({
        amountCents: 45000,
        dueDate: "2026-07-02",
        name: "Car repair",
        status: "Scheduled",
      }),
    ]);
  });

  it("labels_generated_active_cycle_bills_as_projected_for_timeline_clarity", () => {
    const nextPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-next",
      expectedDate: "2026-06-15",
      isReceived: false,
      receivedAt: null,
    };
    const dashboardBills = buildDashboardUpcomingBills(
      {
        ...createSnapshot(),
        activeCycleEndDate: "2026-06-15",
        nextCycleAnchor: nextPaycheck,
        paychecks: [currentPaycheck, nextPaycheck],
        billInstances: [],
        allBillInstances: [],
        safeToSpend: calculateSafeToSpend({
          paychecks: [currentPaycheck, nextPaycheck],
          purchases: [],
          billInstances: [],
          balanceAdjustments: [],
          essentialReserveCents: 0,
        }),
      },
      []
    );

    expect(dashboardBills).toEqual([
      expect.objectContaining({
        amountCents: 9000,
        dueDate: "2026-06-05",
        name: "Internet",
        status: "Projected",
      }),
    ]);
  });

  it("does_not_show_paid_bills_as_dashboard_upcoming_bills", () => {
    const paidInstance: BillCycleInstance = {
      ...billInstance,
      isPaid: true,
      paidAt: "2026-06-05T12:00:00.000Z",
    };
    const dashboardBills = buildDashboardUpcomingBills(
      {
        ...createSnapshot(),
        activeCycleEndDate: "2026-06-15",
        billInstances: [paidInstance],
        allBillInstances: [paidInstance],
      },
      []
    );

    expect(dashboardBills).toEqual([]);
  });

  it("matches_active_cycle_safe_to_spend_unpaid_bill_total", () => {
    const internetBill = {
      ...currentCycleBill,
      defaultAmountCents: 9000,
    };
    const phoneBill = {
      ...currentCycleBill,
      id: "bill-phone",
      name: "Phone",
      defaultAmountCents: 7500,
      dueDateAbsolute: "2026-06-08",
    };
    const internetInstance = {
      ...billInstance,
      cycleAmountCents: 9000,
    };
    const phoneInstance = {
      ...billInstance,
      id: "instance-phone",
      billId: "bill-phone",
      cycleAmountCents: 7500,
      dueDate: "2026-06-08",
    };
    const snapshot = {
      ...createSnapshot(),
      bills: [internetBill, phoneBill],
      allBillInstances: [internetInstance, phoneInstance],
      billInstances: [internetInstance, phoneInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [currentPaycheck],
        purchases: [],
        billInstances: [internetInstance, phoneInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };
    const dashboardBills = buildDashboardUpcomingBills(snapshot, []);
    const dashboardBillTotal = dashboardBills.reduce(
      (total, bill) => total + bill.amountCents,
      0
    );

    expect(dashboardBillTotal).toBe(snapshot.safeToSpend.unpaidBillsCents);
  });

  it("excludes_bill_instances_outside_the_active_paycheck_cycle_window", () => {
    const currentCycleInstance = billInstance;
    const nextCycleInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-next-cycle",
      dueDate: "2026-07-02",
      paycheckCycleId: "paycheck-next",
    };
    const dashboardBills = buildDashboardUpcomingBills(
      {
        ...createSnapshot(),
        activeCycleEndDate: "2026-06-15",
        billInstances: [currentCycleInstance, nextCycleInstance],
        allBillInstances: [currentCycleInstance, nextCycleInstance],
      },
      []
    );

    expect(dashboardBills.map((bill) => bill.dueDate)).toEqual(["2026-06-05"]);
  });
});

describe("buildDashboardUpcomingPaychecks", () => {
  it("excludes_paychecks_outside_the_active_paycheck_cycle_window", () => {
    const cycleStartPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
      isReceived: true,
      receivedAt: "2026-07-15T12:00:00.000Z",
    };
    const inCyclePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-20",
      label: "Bonus",
      expectedDate: "2026-07-20",
      isReceived: false,
      receivedAt: null,
    };
    const cycleEndPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-29",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const laterCyclePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-aug-12",
      expectedDate: "2026-08-12",
      isReceived: false,
      receivedAt: null,
    };
    const upcomingPaychecks = buildDashboardUpcomingPaychecks({
      ...createSnapshot(),
      activeCyclePaycheckId: "paycheck-jul-15",
      activeCycleStartDate: "2026-07-15",
      activeCycleEndDate: "2026-07-29",
      currentCycleAnchor: cycleStartPaycheck,
      nextCycleAnchor: cycleEndPaycheck,
      paychecks: [
        cycleStartPaycheck,
        inCyclePaycheck,
        cycleEndPaycheck,
        laterCyclePaycheck,
      ],
      billInstances: [],
      allBillInstances: [],
      safeToSpend: calculateSafeToSpend({
        paychecks: [
          cycleStartPaycheck,
          inCyclePaycheck,
          cycleEndPaycheck,
          laterCyclePaycheck,
        ],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    });

    expect(upcomingPaychecks.map((paycheck) => paycheck.expectedDate)).toEqual([
      "2026-07-20",
    ]);
  });
});

describe("buildPaycheckBillCoverage", () => {
  it("builds_coverage_for_primary_paychecks_only_when_primary_exists", () => {
    const primaryPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-primary",
      expectedDate: "2026-07-01",
      isPrimary: true,
    };
    const additionalPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-additional",
      label: "Bonus",
      expectedDate: "2026-07-08",
      amountCents: 50000,
      isReceived: false,
      receivedAt: null,
      isPrimary: false,
    };
    const nextPrimaryPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-primary-next",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
      isPrimary: true,
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-primary",
      activeCycleStartDate: "2026-07-01",
      profile,
      currentCycleAnchor: primaryPaycheck,
      nextCycleAnchor: nextPrimaryPaycheck,
      paychecks: [primaryPaycheck, additionalPaycheck, nextPrimaryPaycheck],
      bills: [currentCycleBill],
      purchases: [],
      allBillInstances: [billInstance],
      billInstances: [billInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [primaryPaycheck, additionalPaycheck, nextPrimaryPaycheck],
        purchases: [],
        billInstances: [billInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    expect(buildPaycheckBillCoverage(snapshot).map((item) => item.paycheckId)).toEqual([
      "paycheck-primary",
      "paycheck-primary-next",
    ]);
  });

  it("falls_back_to_all_paychecks_when_no_primary_paycheck_exists", () => {
    const firstAdditional: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-additional-1",
      expectedDate: "2026-07-01",
      isPrimary: false,
    };
    const secondAdditional: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-additional-2",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
      isPrimary: false,
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-additional-1",
      activeCycleStartDate: "2026-07-01",
      profile,
      currentCycleAnchor: firstAdditional,
      nextCycleAnchor: secondAdditional,
      paychecks: [firstAdditional, secondAdditional],
      bills: [currentCycleBill],
      purchases: [],
      allBillInstances: [billInstance],
      billInstances: [billInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [firstAdditional, secondAdditional],
        purchases: [],
        billInstances: [billInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    expect(buildPaycheckBillCoverage(snapshot).map((item) => item.paycheckId)).toEqual([
      "paycheck-additional-1",
      "paycheck-additional-2",
    ]);
  });

  it("does_not_subtract_active_cycle_bills_twice_from_projected_safe_to_spend", () => {
    const activePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-active",
      expectedDate: "2026-07-01",
    };
    const nextPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-next",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const activeBillInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-active",
      paycheckCycleId: "paycheck-active",
      cycleAmountCents: 25000,
      dueDate: "2026-07-02",
    };
    const activeBill: RepositoryBill = {
      ...currentCycleBill,
      defaultAmountCents: 25000,
      dueDateAbsolute: "2026-07-02",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-active",
      activeCycleStartDate: "2026-07-01",
      profile,
      currentCycleAnchor: activePaycheck,
      nextCycleAnchor: nextPaycheck,
      paychecks: [activePaycheck, nextPaycheck],
      bills: [activeBill],
      purchases: [],
      allBillInstances: [activeBillInstance],
      billInstances: [activeBillInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [activePaycheck, nextPaycheck],
        purchases: [],
        billInstances: [activeBillInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const [activeCoverage] = buildPaycheckBillCoverage(snapshot);

    expect(snapshot.safeToSpend.safeToSpendCents).toBe(175000);
    expect(activeCoverage).toMatchObject({
      paycheckId: "paycheck-active",
      projectedSafeToSpendCents: 175000,
      totalCents: 25000,
    });
  });

  it("adds_an_unreceived_current_paycheck_to_projected_safe_to_spend", () => {
    const activePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-active",
      amountCents: 200000,
      expectedDate: "2026-07-01",
      isReceived: false,
      receivedAt: null,
    };
    const nextPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-next",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const activeBillInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-active",
      paycheckCycleId: "paycheck-active",
      cycleAmountCents: 13000,
      dueDate: "2026-07-02",
    };
    const activeBill: RepositoryBill = {
      ...currentCycleBill,
      defaultAmountCents: 13000,
      dueDateAbsolute: "2026-07-02",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-active",
      activeCycleStartDate: "2026-07-01",
      profile,
      currentCycleAnchor: activePaycheck,
      nextCycleAnchor: nextPaycheck,
      paychecks: [activePaycheck, nextPaycheck],
      bills: [activeBill],
      purchases: [],
      allBillInstances: [activeBillInstance],
      billInstances: [activeBillInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [activePaycheck, nextPaycheck],
        purchases: [],
        billInstances: [activeBillInstance],
        balanceAdjustments: [{ deltaCents: 13000 }],
        essentialReserveCents: 0,
      }),
    };

    const [activeCoverage] = buildPaycheckBillCoverage(snapshot);

    expect(snapshot.safeToSpend.safeToSpendCents).toBe(0);
    expect(activeCoverage).toMatchObject({
      paycheckId: "paycheck-active",
      projectedSafeToSpendCents: 200000,
      totalCents: 13000,
    });
  });

  it("subtracts_current_paycheck_bills_when_they_are_not_already_reserved", () => {
    const activePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-active",
      amountCents: 200000,
      expectedDate: "2026-07-01",
      isReceived: false,
      receivedAt: null,
    };
    const nextPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-next",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const activeBillInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-active",
      paycheckCycleId: "paycheck-active",
      cycleAmountCents: 13000,
      dueDate: "2026-07-02",
    };
    const activeBill: RepositoryBill = {
      ...currentCycleBill,
      defaultAmountCents: 13000,
      dueDateAbsolute: "2026-07-02",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-active",
      activeCycleStartDate: "2026-07-01",
      profile,
      currentCycleAnchor: activePaycheck,
      nextCycleAnchor: nextPaycheck,
      paychecks: [activePaycheck, nextPaycheck],
      bills: [activeBill],
      purchases: [],
      allBillInstances: [activeBillInstance],
      billInstances: [],
      safeToSpend: calculateSafeToSpend({
        paychecks: [activePaycheck, nextPaycheck],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const [activeCoverage] = buildPaycheckBillCoverage(snapshot);

    expect(snapshot.safeToSpend.safeToSpendCents).toBe(0);
    expect(activeCoverage).toMatchObject({
      paycheckId: "paycheck-active",
      projectedSafeToSpendCents: 187000,
      totalCents: 13000,
    });
  });

  it("projects_future_paychecks_as_a_running_safe_to_spend_timeline", () => {
    const firstFuturePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-first-future",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const secondFuturePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-second-future",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const thirdFuturePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-third-future",
      expectedDate: "2026-08-12",
      isReceived: false,
      receivedAt: null,
    };
    const fplBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-fpl",
      name: "Florida Power & Light",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const phoneBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-phone",
      name: "Phone",
      defaultAmountCents: 7500,
      dueDateAbsolute: "2026-08-02",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-1",
      activeCycleStartDate: "2026-06-01",
      profile,
      currentCycleAnchor: currentPaycheck,
      nextCycleAnchor: firstFuturePaycheck,
      paychecks: [
        currentPaycheck,
        firstFuturePaycheck,
        secondFuturePaycheck,
        thirdFuturePaycheck,
      ],
      bills: [fplBill, phoneBill],
      purchases: [],
      allBillInstances: [],
      billInstances: [],
      safeToSpend: calculateSafeToSpend({
        paychecks: [currentPaycheck, firstFuturePaycheck, secondFuturePaycheck],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [{ deltaCents: 100000 }],
        essentialReserveCents: 0,
      }),
    };

    const coverage = buildPaycheckBillCoverage(snapshot);

    expect(snapshot.safeToSpend.safeToSpendCents).toBe(300000);
    expect(coverage.map((item) => item.projectedSafeToSpendCents)).toEqual([
      300000,
      485745,
      678245,
      878245,
    ]);
  });

  it("does_not_crash_when_multiple_paychecks_share_the_same_expected_date", () => {
    const firstSameDayPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-same-day-1",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const secondSameDayPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-same-day-2",
      amountCents: 50000,
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const nextPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-next",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const billDueAfterSameDayPaychecks: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-fpl",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-1",
      activeCycleStartDate: "2026-06-01",
      profile,
      currentCycleAnchor: currentPaycheck,
      nextCycleAnchor: firstSameDayPaycheck,
      paychecks: [
        currentPaycheck,
        firstSameDayPaycheck,
        secondSameDayPaycheck,
        nextPaycheck,
      ],
      bills: [billDueAfterSameDayPaychecks],
      purchases: [],
      allBillInstances: [],
      billInstances: [],
      safeToSpend: calculateSafeToSpend({
        paychecks: [currentPaycheck],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const coverage = buildPaycheckBillCoverage(snapshot);

    expect(coverage.map((item) => item.nextPaycheckDate)).toEqual([
      "2026-07-15",
      "2026-07-29",
      "2026-07-29",
      null,
    ]);
    expect(
      coverage.find((item) => item.paycheckId === "paycheck-same-day-1")
        ?.coveredBills
    ).toHaveLength(1);
  });

  it("matches_dashboard_upcoming_bills_total_for_the_active_paycheck_cycle", () => {
    const currentCyclePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
    };
    const nextCyclePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-29",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const fplBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-fpl",
      name: "Florida Power & Light",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const fplInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-fpl",
      billId: "bill-fpl",
      paycheckCycleId: "paycheck-jul-15",
      cycleAmountCents: 14255,
      dueDate: "2026-07-22",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-29",
      activeCyclePaycheckId: "paycheck-jul-15",
      activeCycleStartDate: "2026-07-15",
      profile,
      currentCycleAnchor: currentCyclePaycheck,
      nextCycleAnchor: nextCyclePaycheck,
      paychecks: [currentCyclePaycheck, nextCyclePaycheck],
      bills: [fplBill],
      purchases: [],
      allBillInstances: [fplInstance],
      billInstances: [fplInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [currentCyclePaycheck, nextCyclePaycheck],
        purchases: [],
        billInstances: [fplInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const dashboardUpcomingTotal = buildDashboardUpcomingBills(
      snapshot,
      []
    ).reduce((total, bill) => total + bill.amountCents, 0);
    const [activePaycheckCoverage] = buildPaycheckBillCoverage(snapshot);

    expect(dashboardUpcomingTotal).toBe(14255);
    expect(activePaycheckCoverage).toMatchObject({
      paycheckId: "paycheck-jul-15",
      totalCents: dashboardUpcomingTotal,
    });
  });

  it("does_not_project_saved_recurring_bills_into_every_future_paycheck_summary", () => {
    const julyFirstPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-1",
      expectedDate: "2026-07-01",
    };
    const julyFifteenthPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const julyTwentyNinthPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-29",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const comcastBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-comcast",
      name: "Comcast",
      defaultAmountCents: 25000,
      dueDateAbsolute: "2026-07-02",
      endDate: null,
    };
    const comcastInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-comcast",
      billId: "bill-comcast",
      paycheckCycleId: "paycheck-jul-1",
      cycleAmountCents: 25000,
      dueDate: "2026-07-02",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-jul-1",
      activeCycleStartDate: "2026-07-01",
      profile,
      currentCycleAnchor: julyFirstPaycheck,
      nextCycleAnchor: julyFifteenthPaycheck,
      paychecks: [
        julyFirstPaycheck,
        julyFifteenthPaycheck,
        julyTwentyNinthPaycheck,
      ],
      bills: [comcastBill],
      purchases: [],
      allBillInstances: [comcastInstance],
      billInstances: [comcastInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [
          julyFirstPaycheck,
          julyFifteenthPaycheck,
          julyTwentyNinthPaycheck,
        ],
        purchases: [],
        billInstances: [comcastInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const coverage = buildPaycheckBillCoverage(snapshot);

    expect(
      coverage.map((item) => ({
        paycheckId: item.paycheckId,
        bills: item.coveredBills.map((bill) => bill.name),
      }))
    ).toEqual([
      {
        paycheckId: "paycheck-jul-1",
        bills: ["Comcast"],
      },
      {
        paycheckId: "paycheck-jul-15",
        bills: [],
      },
      {
        paycheckId: "paycheck-jul-29",
        bills: [],
      },
    ]);
  });

  it("keeps_unpaid_and_paid_bills_in_their_paycheck_dropdown_with_status", () => {
    const currentCyclePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
    };
    const nextCyclePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-29",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const comcastBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-comcast",
      name: "Comcast",
      defaultAmountCents: 25000,
      dueDateAbsolute: "2026-07-18",
    };
    const fplBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-fpl",
      name: "Florida Power & Light",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const paidComcastInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-comcast",
      billId: "bill-comcast",
      paycheckCycleId: "paycheck-jul-15",
      cycleAmountCents: 25000,
      dueDate: "2026-07-18",
      isPaid: true,
      paidAt: "2026-07-18T15:00:00.000Z",
    };
    const unpaidFplInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-fpl",
      billId: "bill-fpl",
      paycheckCycleId: "paycheck-jul-15",
      cycleAmountCents: 14255,
      dueDate: "2026-07-22",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-29",
      activeCyclePaycheckId: "paycheck-jul-15",
      activeCycleStartDate: "2026-07-15",
      profile,
      currentCycleAnchor: currentCyclePaycheck,
      nextCycleAnchor: nextCyclePaycheck,
      paychecks: [currentCyclePaycheck, nextCyclePaycheck],
      bills: [comcastBill, fplBill],
      purchases: [],
      allBillInstances: [paidComcastInstance, unpaidFplInstance],
      billInstances: [paidComcastInstance, unpaidFplInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [currentCyclePaycheck, nextCyclePaycheck],
        purchases: [],
        billInstances: [paidComcastInstance, unpaidFplInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const [coverage] = buildPaycheckBillCoverage(snapshot);
    const dashboardUpcomingTotal = buildDashboardUpcomingBills(
      snapshot,
      []
    ).reduce(
      (total, bill) => total + (bill.status === "Paid" ? 0 : bill.amountCents),
      0
    );

    expect(coverage.coveredBills).toEqual([
      expect.objectContaining({
        name: "Comcast",
        status: "Paid",
      }),
      expect.objectContaining({
        name: "Florida Power & Light",
        status: "Due",
      }),
    ]);
    expect(coverage.totalCents).toBe(14255);
    expect(dashboardUpcomingTotal).toBe(14255);
    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(14255);
  });

  it("keeps_paid_bills_in_their_due_date_paycheck_cycle", () => {
    const julyFirstPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-1",
      expectedDate: "2026-07-01",
    };
    const julyFifteenthPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const julyTwentyNinthPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-29",
      expectedDate: "2026-07-29",
      isReceived: false,
      receivedAt: null,
    };
    const comcastBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-comcast",
      name: "Comcast",
      defaultAmountCents: 25000,
      dueDateAbsolute: "2026-07-22",
    };
    const electricBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-electric",
      name: "Electric",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const earlyPaidInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-early",
      billId: "bill-comcast",
      paycheckCycleId: "paycheck-jul-15",
      cycleAmountCents: 25000,
      dueDate: "2026-07-22",
      isPaid: true,
      paidAt: "2026-07-10T15:00:00.000Z",
    };
    const latePaidInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-late",
      billId: "bill-electric",
      paycheckCycleId: "paycheck-jul-15",
      cycleAmountCents: 14255,
      dueDate: "2026-07-22",
      isPaid: true,
      paidAt: "2026-07-30T15:00:00.000Z",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-29",
      activeCyclePaycheckId: "paycheck-jul-15",
      activeCycleStartDate: "2026-07-15",
      profile,
      currentCycleAnchor: julyFifteenthPaycheck,
      nextCycleAnchor: julyTwentyNinthPaycheck,
      paychecks: [
        julyFirstPaycheck,
        julyFifteenthPaycheck,
        julyTwentyNinthPaycheck,
      ],
      bills: [comcastBill, electricBill],
      purchases: [],
      allBillInstances: [earlyPaidInstance, latePaidInstance],
      billInstances: [earlyPaidInstance, latePaidInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [
          julyFirstPaycheck,
          julyFifteenthPaycheck,
          julyTwentyNinthPaycheck,
        ],
        purchases: [],
        billInstances: [earlyPaidInstance, latePaidInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const coverage = buildPaycheckBillCoverage(snapshot);
    const dueCycleCoverage = coverage.find(
      (item) => item.paycheckId === "paycheck-jul-15"
    );
    const earlyCycleCoverage = coverage.find(
      (item) => item.paycheckId === "paycheck-jul-1"
    );
    const lateCycleCoverage = coverage.find(
      (item) => item.paycheckId === "paycheck-jul-29"
    );

    expect(earlyCycleCoverage?.coveredBills).toEqual([]);
    expect(dueCycleCoverage?.coveredBills).toEqual([
      expect.objectContaining({
        id: "instance-early",
        status: "Paid",
      }),
      expect.objectContaining({
        id: "instance-late",
        status: "Paid",
      }),
    ]);
    expect(lateCycleCoverage?.coveredBills).toEqual([]);
    expect(earlyCycleCoverage?.totalCents).toBe(0);
    expect(
      dueCycleCoverage?.coveredBills
        .filter((bill) => bill.status === "Paid")
        .reduce((sum, bill) => sum + bill.amountCents, 0)
    ).toBe(39255);
    expect(dueCycleCoverage?.totalCents).toBe(0);
    expect(lateCycleCoverage?.totalCents).toBe(0);
  });

  it("assigns_bills_after_the_last_known_paycheck_to_that_paycheck_dropdown", () => {
    const lastKnownPaycheck = {
      ...currentPaycheck,
      id: "paycheck-last",
      expectedDate: "2026-06-20",
    };
    const billAfterPaycheck = {
      ...futureOneTimeBill,
      id: "bill-after-paycheck",
      name: "Phone",
      defaultAmountCents: 7500,
      dueDateAbsolute: "2026-06-22",
      endDate: null,
    };
    const coverage = buildPaycheckBillCoverage({
      activeCycleEndDate: "9999-12-31",
      activeCyclePaycheckId: "paycheck-last",
      activeCycleStartDate: "2026-06-20",
      profile,
      currentCycleAnchor: lastKnownPaycheck,
      nextCycleAnchor: null,
      paychecks: [lastKnownPaycheck],
      bills: [billAfterPaycheck],
      purchases: [],
      allBillInstances: [],
      billInstances: [],
      safeToSpend: calculateSafeToSpend({
        paychecks: [lastKnownPaycheck],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    });

    expect(coverage).toEqual([
      expect.objectContaining({
        coveredBills: [
          expect.objectContaining({
            amountCents: 7500,
            billId: "bill-after-paycheck",
            dueDate: "2026-06-22",
            id: "bill-after-paycheck-2026-06-22",
            name: "Phone",
          }),
        ],
        paycheckId: "paycheck-last",
        totalCents: 7500,
      }),
    ]);
  });

  it("uses_recurrence_boundary_for_recurring_paychecks_without_a_next_row", () => {
    const recurringPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-biweekly",
      expectedDate: "2026-06-01",
      isRecurring: true,
      recurrenceInterval: "biweekly",
    };
    const billInCycle: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-in-cycle",
      name: "Rent",
      defaultAmountCents: 120000,
      dueDateAbsolute: "2026-06-10",
    };
    const billAfterCycle: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-after-cycle",
      name: "Insurance",
      defaultAmountCents: 15000,
      dueDateAbsolute: "2026-06-20",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-06-15",
      activeCyclePaycheckId: "paycheck-biweekly",
      activeCycleStartDate: "2026-06-01",
      profile,
      currentCycleAnchor: recurringPaycheck,
      nextCycleAnchor: null,
      paychecks: [recurringPaycheck],
      bills: [billInCycle, billAfterCycle],
      purchases: [],
      allBillInstances: [],
      billInstances: [],
      safeToSpend: calculateSafeToSpend({
        paychecks: [recurringPaycheck],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const [coverage] = buildPaycheckBillCoverage(snapshot);

    expect(coverage).toMatchObject({
      paycheckId: "paycheck-biweekly",
      nextPaycheckDate: "2026-06-15",
      coveredBills: [
        expect.objectContaining({
          name: "Rent",
          dueDate: "2026-06-10",
        }),
      ],
    });
    expect(coverage.coveredBills.map((bill) => bill.name)).not.toContain(
      "Insurance"
    );
  });

  it("uses_recurrence_boundary_instead_of_a_later_next_paycheck_row", () => {
    const recurringPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-biweekly",
      expectedDate: "2026-06-01",
      isRecurring: true,
      recurrenceInterval: "biweekly",
    };
    const laterPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-later",
      expectedDate: "2026-07-01",
      isReceived: false,
      receivedAt: null,
      isRecurring: true,
      recurrenceInterval: "biweekly",
    };
    const billInRecurrenceWindow: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-in-window",
      name: "Utilities",
      defaultAmountCents: 8000,
      dueDateAbsolute: "2026-06-10",
    };
    const billAfterRecurrenceWindow: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-after-window",
      name: "Car payment",
      defaultAmountCents: 35000,
      dueDateAbsolute: "2026-06-20",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-06-15",
      activeCyclePaycheckId: "paycheck-biweekly",
      activeCycleStartDate: "2026-06-01",
      profile,
      currentCycleAnchor: recurringPaycheck,
      nextCycleAnchor: laterPaycheck,
      paychecks: [recurringPaycheck, laterPaycheck],
      bills: [billInRecurrenceWindow, billAfterRecurrenceWindow],
      purchases: [],
      allBillInstances: [],
      billInstances: [],
      safeToSpend: calculateSafeToSpend({
        paychecks: [recurringPaycheck, laterPaycheck],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const [coverage] = buildPaycheckBillCoverage(snapshot);

    expect(coverage).toMatchObject({
      paycheckId: "paycheck-biweekly",
      nextPaycheckDate: "2026-06-15",
      coveredBills: [
        expect.objectContaining({
          name: "Utilities",
          dueDate: "2026-06-10",
        }),
      ],
    });
    expect(coverage.coveredBills.map((bill) => bill.name)).not.toContain(
      "Car payment"
    );
  });

  it("exposes_projection_step_fields_for_paycheck_coverage_rows", () => {
    const activePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-active",
      amountCents: 200000,
      expectedDate: "2026-07-01",
      isReceived: false,
      receivedAt: null,
    };
    const nextPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-next",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const activeBillInstance: BillCycleInstance = {
      ...billInstance,
      id: "instance-active",
      paycheckCycleId: "paycheck-active",
      cycleAmountCents: 13000,
      dueDate: "2026-07-02",
    };
    const activeBill: RepositoryBill = {
      ...currentCycleBill,
      defaultAmountCents: 13000,
      dueDateAbsolute: "2026-07-02",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-active",
      activeCycleStartDate: "2026-07-01",
      profile,
      currentCycleAnchor: activePaycheck,
      nextCycleAnchor: nextPaycheck,
      paychecks: [activePaycheck, nextPaycheck],
      bills: [activeBill],
      purchases: [],
      allBillInstances: [activeBillInstance],
      billInstances: [activeBillInstance],
      safeToSpend: calculateSafeToSpend({
        paychecks: [activePaycheck, nextPaycheck],
        purchases: [],
        billInstances: [activeBillInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    const [activeCoverage, nextCoverage] = buildPaycheckBillCoverage(snapshot);

    expect(activeCoverage).toMatchObject({
      isCurrentCycle: true,
      startingSafeToSpendCents: snapshot.safeToSpend.safeToSpendCents,
      paycheckImpactCents: 200000,
      billsImpactCents: 0,
      projectedSafeToSpendCents:
        snapshot.safeToSpend.safeToSpendCents + 200000,
      coveredBills: [
        expect.objectContaining({
          id: "instance-active",
          reservationStatus: "reserved",
        }),
      ],
    });
    expect(nextCoverage).toMatchObject({
      isCurrentCycle: false,
      startingSafeToSpendCents: activeCoverage.projectedSafeToSpendCents,
      paycheckImpactCents: nextPaycheck.amountCents,
      billsImpactCents: 0,
    });
  });

  it("marks_projected_cycle_bills_with_reservation_status", () => {
    const firstFuturePaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-first-future",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const fplBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-fpl",
      name: "Florida Power & Light",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-1",
      activeCycleStartDate: "2026-06-01",
      profile,
      currentCycleAnchor: currentPaycheck,
      nextCycleAnchor: firstFuturePaycheck,
      paychecks: [currentPaycheck, firstFuturePaycheck],
      bills: [fplBill],
      purchases: [],
      allBillInstances: [],
      billInstances: [],
      safeToSpend: calculateSafeToSpend({
        paychecks: [currentPaycheck, firstFuturePaycheck],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [{ deltaCents: 100000 }],
        essentialReserveCents: 0,
      }),
    };

    const futureCoverage = buildPaycheckBillCoverage(snapshot).find(
      (coverage) => coverage.paycheckId === "paycheck-first-future"
    );

    expect(futureCoverage).toMatchObject({
      isCurrentCycle: false,
      billsImpactCents: 14255,
      coveredBills: [
        expect.objectContaining({
          name: "Florida Power & Light",
          reservationStatus: "projected",
        }),
      ],
    });
  });
});

describe("resolveActiveDashboardSnapshot", () => {
  it("returns_the_cached_snapshot_when_the_current_snapshot_is_null", () => {
    const snapshot = createSnapshot();

    expect(resolveActiveDashboardSnapshot(null, snapshot)).toBe(snapshot);
    expect(resolveActiveDashboardSnapshot(snapshot, null)).toBe(snapshot);
  });
});

describe("buildLocalFallbackTotals", () => {
  it("includes_purchases_in_the_fallback_running_balance", () => {
    const purchases: Purchase[] = [
      {
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
      },
    ];

    expect(
      buildLocalFallbackTotals({
        balanceCents: 100000,
        bills: [],
        purchases,
        reserveCents: 10000,
      })
    ).toEqual({
      paidBills: 0,
      purchaseTotal: 2500,
      runningBalance: 97500,
      safeToSpend: 87500,
      unpaidBills: 0,
      unpaidBillCount: 0,
    });
  });
});

describe("buildDashboardTotalsFromSnapshot", () => {
  it("includes_purchase_totals_from_the_engine_breakdown", () => {
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
    const snapshot: DashboardSnapshot = {
      ...createSnapshot(),
      purchases: [purchase],
      safeToSpend: calculateSafeToSpend({
        paychecks: [currentPaycheck],
        purchases: [purchase],
        billInstances: [billInstance],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };

    expect(buildDashboardTotalsFromSnapshot(snapshot, false).purchaseTotal).toBe(
      2500
    );
    expect(buildDashboardTotalsFromSnapshot(snapshot, false).safeToSpend).toBe(
      188500
    );
  });

  it("uses_engine_unpaid_bills_even_when_projected_upcoming_bills_exist", () => {
    const julyFirstPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-1",
      expectedDate: "2026-07-01",
    };
    const julyFifteenthPaycheck: Paycheck = {
      ...currentPaycheck,
      id: "paycheck-jul-15",
      expectedDate: "2026-07-15",
      isReceived: false,
      receivedAt: null,
    };
    const fplBill: RepositoryBill = {
      ...currentCycleBill,
      id: "bill-fpl",
      name: "Florida Power & Light",
      defaultAmountCents: 14255,
      dueDateAbsolute: "2026-07-22",
    };
    const snapshot: DashboardSnapshot = {
      activeCycleEndDate: "2026-07-15",
      activeCyclePaycheckId: "paycheck-jul-1",
      activeCycleStartDate: "2026-07-01",
      profile,
      currentCycleAnchor: julyFirstPaycheck,
      nextCycleAnchor: julyFifteenthPaycheck,
      paychecks: [julyFirstPaycheck, julyFifteenthPaycheck],
      bills: [fplBill],
      purchases: [],
      allBillInstances: [],
      billInstances: [],
      safeToSpend: calculateSafeToSpend({
        paychecks: [julyFirstPaycheck, julyFifteenthPaycheck],
        purchases: [],
        billInstances: [],
        balanceAdjustments: [],
        essentialReserveCents: 0,
      }),
    };
    const projectedUpcomingBillTotal = buildDashboardUpcomingBills(
      snapshot,
      []
    ).reduce((total, bill) => total + bill.amountCents, 0);
    const totals = buildDashboardTotalsFromSnapshot(snapshot, false);

    expect(snapshot.safeToSpend.unpaidBillsCents).toBe(0);
    expect(projectedUpcomingBillTotal).toBe(0);
    expect(totals.unpaidBills).toBe(0);
    expect(totals.unpaidBillCount).toBe(0);
  });
});
