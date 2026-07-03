import { describe, expect, it } from "vitest";

import type { PaycheckListItem, Purchase } from "@/shared/ui/types";

import {
  buildPurchaseCycleOptions,
  filterPreviousCyclePurchases,
  filterPurchasesForCycle,
  formatPurchaseCycleLabel,
  getArchivedPurchaseCycleOptions,
  getPaycheckCycleWindow,
  getPurchaseSummaryForPurchases,
  resolvePurchaseCycleId,
  resolvePurchaseCycleIdFromContext,
} from "./purchaseCycles";

const paychecks: PaycheckListItem[] = [
  {
    id: "paycheck-may",
    label: "May paycheck",
    amountCents: 200000,
    expectedDate: "2026-05-01",
    isReceived: true,
    isPrimary: true,
    recurrenceInterval: "biweekly",
  },
  {
    id: "paycheck-jun",
    label: "June paycheck",
    amountCents: 200000,
    expectedDate: "2026-06-01",
    isReceived: true,
    isPrimary: true,
    recurrenceInterval: "biweekly",
  },
  {
    id: "paycheck-jun-15",
    label: "Mid-June paycheck",
    amountCents: 200000,
    expectedDate: "2026-06-15",
    isReceived: false,
    isPrimary: true,
    recurrenceInterval: "biweekly",
  },
];

const currentCyclePurchase: Purchase = {
  id: "purchase-current",
  name: "Groceries",
  amountCents: 4500,
  status: "Charged",
  date: "2026-06-03",
  purchaseDate: "2026-06-03",
  paycheckCycleId: "paycheck-jun",
};

const priorCyclePurchase: Purchase = {
  id: "purchase-prior",
  name: "Gas",
  amountCents: 3200,
  status: "Pending",
  date: "2026-05-10",
  purchaseDate: "2026-05-10",
  paycheckCycleId: "paycheck-may",
};

const staleCycleIdPurchase: Purchase = {
  id: "purchase-stale-cycle",
  name: "Gap purchase",
  amountCents: 1500,
  status: "Charged",
  date: "2026-05-20",
  purchaseDate: "2026-05-20",
  paycheckCycleId: "paycheck-may",
};

describe("getPaycheckCycleWindow", () => {
  it("uses_recurrence_boundary_for_recurring_paychecks", () => {
    expect(getPaycheckCycleWindow("paycheck-jun", paychecks)).toEqual({
      paycheckId: "paycheck-jun",
      startDate: "2026-06-01",
      endDate: "2026-06-15",
    });
  });

  it("uses_recurrence_boundary_even_when_next_paycheck_row_is_later", () => {
    expect(getPaycheckCycleWindow("paycheck-may", paychecks)).toEqual({
      paycheckId: "paycheck-may",
      startDate: "2026-05-01",
      endDate: "2026-05-15",
    });
  });

  it("uses_next_paycheck_row_for_one_time_paychecks", () => {
    const oneTimePaychecks: PaycheckListItem[] = [
      {
        id: "paycheck-one-time",
        label: "Bonus",
        amountCents: 50000,
        expectedDate: "2026-06-01",
        isReceived: true,
        isPrimary: true,
        recurrenceInterval: null,
      },
      {
        id: "paycheck-next",
        label: "Primary",
        amountCents: 200000,
        expectedDate: "2026-07-01",
        isReceived: false,
        isPrimary: true,
        recurrenceInterval: "biweekly",
      },
    ];

    expect(getPaycheckCycleWindow("paycheck-one-time", oneTimePaychecks)).toEqual({
      paycheckId: "paycheck-one-time",
      startDate: "2026-06-01",
      endDate: "2026-07-01",
    });
  });
});

describe("resolvePurchaseCycleId", () => {
  it("uses_the_stored_paycheck_cycle_id_when_present", () => {
    expect(resolvePurchaseCycleId(currentCyclePurchase, paychecks)).toBe(
      "paycheck-jun"
    );
  });

  it("infers_the_cycle_from_purchase_date_when_paycheck_cycle_id_is_missing", () => {
    expect(
      resolvePurchaseCycleId(
        {
          ...currentCyclePurchase,
          paycheckCycleId: null,
        },
        paychecks
      )
    ).toBe("paycheck-jun");
  });

  it("returns_null_when_purchase_date_falls_between_recurrence_cycles", () => {
    expect(
      resolvePurchaseCycleId(
        {
          ...staleCycleIdPurchase,
          paycheckCycleId: null,
        },
        paychecks
      )
    ).toBeNull();
  });

  it("ignores_stale_paycheck_cycle_id_when_purchase_date_falls_in_a_gap", () => {
    expect(resolvePurchaseCycleId(staleCycleIdPurchase, paychecks)).toBeNull();
  });
});

describe("buildPurchaseCycleOptions", () => {
  it("builds_cycle_options_with_the_active_cycle_first", () => {
    const options = buildPurchaseCycleOptions(
      [currentCyclePurchase, priorCyclePurchase],
      {
        activeCyclePaycheckId: "paycheck-jun",
        activeCycleStartDate: "2026-06-01",
        activeCycleEndDate: "2026-06-15",
        paychecks,
      }
    );

    expect(options.map((option) => option.id)).toEqual([
      "paycheck-jun",
      "paycheck-jun-15",
      "paycheck-may",
    ]);
    expect(options[0]).toMatchObject({
      isActive: true,
      paycheckDateLabel: "Jun 1",
      cycleWindowLabel: "Jun 1 – Jun 15",
      label: "This cycle · Jun 1 – Jun 15",
      totalSpentCents: 4500,
      transactionCount: 1,
    });
    expect(options.find((option) => option.id === "paycheck-may")).toMatchObject({
      isActive: false,
      paycheckDateLabel: "May 1",
      cycleWindowLabel: "May 1 – May 15",
      label: "May 1 paycheck · May 1 – May 15",
      totalSpentCents: 3200,
      pendingAmountCents: 3200,
      transactionCount: 1,
    });
  });

  it("includes_an_empty_active_cycle_option", () => {
    const options = buildPurchaseCycleOptions([priorCyclePurchase], {
      activeCyclePaycheckId: "paycheck-jun",
      activeCycleStartDate: "2026-06-01",
      activeCycleEndDate: "2026-06-15",
      paychecks,
    });

    expect(options.map((option) => option.id)).toEqual([
      "paycheck-jun",
      "paycheck-jun-15",
      "paycheck-may",
    ]);
    expect(options[0]).toMatchObject({
      isActive: true,
      transactionCount: 0,
      totalSpentCents: 0,
    });
  });

  it("handles_purchases_with_missing_purchase_dates_without_throwing", () => {
    expect(() =>
      buildPurchaseCycleOptions(
        [
          {
            ...currentCyclePurchase,
            purchaseDate: "",
          },
        ],
        {
          activeCyclePaycheckId: "paycheck-jun",
          activeCycleStartDate: "2026-06-01",
          activeCycleEndDate: "2026-06-15",
          paychecks,
        }
      )
    ).not.toThrow();
  });
});

describe("filterPurchasesForCycle", () => {
  const cycleContext = {
    activeCyclePaycheckId: "paycheck-jun",
    activeCycleStartDate: "2026-06-01",
    activeCycleEndDate: "2026-06-15",
    paychecks,
  };

  it("returns_only_purchases_for_the_selected_cycle", () => {
    expect(
      filterPurchasesForCycle(
        [currentCyclePurchase, priorCyclePurchase],
        "paycheck-jun",
        cycleContext
      ).map((purchase) => purchase.id)
    ).toEqual(["purchase-current"]);
  });

  it("includes_a_purchase_in_the_active_cycle_by_date_when_paycheck_cycle_id_is_stale", () => {
    expect(
      filterPurchasesForCycle(
        [
          {
            ...currentCyclePurchase,
            paycheckCycleId: "paycheck-may",
          },
        ],
        "paycheck-jun",
        cycleContext
      ).map((purchase) => purchase.id)
    ).toEqual(["purchase-current"]);
  });

  it("excludes_a_purchase_from_a_prior_cycle_when_paycheck_cycle_id_is_stale", () => {
    expect(
      filterPurchasesForCycle([staleCycleIdPurchase], "paycheck-may", cycleContext).map(
        (purchase) => purchase.id
      )
    ).toEqual([]);
  });

  it("includes_gap_purchases_in_the_unassigned_cycle", () => {
    expect(
      filterPurchasesForCycle([staleCycleIdPurchase], "unassigned", cycleContext).map(
        (purchase) => purchase.id
      )
    ).toEqual(["purchase-stale-cycle"]);
  });

  it("includes_a_purchase_in_the_active_cycle_by_date_when_paycheck_cycle_id_is_missing", () => {
    expect(
      filterPurchasesForCycle(
        [
          {
            ...currentCyclePurchase,
            paycheckCycleId: null,
          },
        ],
        "paycheck-jun",
        cycleContext
      ).map((purchase) => purchase.id)
    ).toEqual(["purchase-current"]);
  });
});

describe("filterPreviousCyclePurchases", () => {
  const cycleContext = {
    activeCyclePaycheckId: "paycheck-jun",
    activeCycleStartDate: "2026-06-01",
    activeCycleEndDate: "2026-06-15",
    paychecks,
  };

  it("returns purchases outside the active cycle", () => {
    expect(
      filterPreviousCyclePurchases(
        [currentCyclePurchase, priorCyclePurchase],
        cycleContext
      ).map((purchase) => purchase.id)
    ).toEqual(["purchase-prior"]);
  });

  it("includes unassigned purchases", () => {
    const unassignedPurchase: Purchase = {
      id: "purchase-unassigned",
      name: "Misc",
      amountCents: 1000,
      status: "Charged",
      date: "2020-01-01",
      purchaseDate: "2020-01-01",
      paycheckCycleId: null,
    };

    expect(
      filterPreviousCyclePurchases(
        [currentCyclePurchase, unassignedPurchase],
        cycleContext
      ).map((purchase) => purchase.id)
    ).toEqual(["purchase-unassigned"]);
  });

  it("returns all purchases when there is no active cycle", () => {
    expect(
      filterPreviousCyclePurchases(
        [currentCyclePurchase, priorCyclePurchase],
        {
          ...cycleContext,
          activeCyclePaycheckId: null,
        }
      ).map((purchase) => purchase.id)
    ).toEqual(["purchase-current", "purchase-prior"]);
  });
});

describe("getArchivedPurchaseCycleOptions", () => {
  it("returns_only_non_active_cycles_with_transactions", () => {
    const options = buildPurchaseCycleOptions(
      [currentCyclePurchase, priorCyclePurchase],
      {
        activeCyclePaycheckId: "paycheck-jun",
        activeCycleStartDate: "2026-06-01",
        activeCycleEndDate: "2026-06-15",
        paychecks,
      }
    );

    expect(getArchivedPurchaseCycleOptions(options).map((option) => option.id)).toEqual([
      "paycheck-may",
    ]);
  });

  it("excludes_unassigned_purchases_from_previous_cycles", () => {
    const unassignedPurchase: Purchase = {
      id: "purchase-unassigned",
      name: "Misc",
      amountCents: 1000,
      status: "Charged",
      date: "2020-01-01",
      purchaseDate: "2020-01-01",
      paycheckCycleId: null,
    };
    const options = buildPurchaseCycleOptions(
      [currentCyclePurchase, priorCyclePurchase, unassignedPurchase],
      {
        activeCyclePaycheckId: "paycheck-jun",
        activeCycleStartDate: "2026-06-01",
        activeCycleEndDate: "2026-06-15",
        paychecks,
      }
    );

    expect(getArchivedPurchaseCycleOptions(options).map((option) => option.id)).toEqual([
      "paycheck-may",
    ]);
    expect(options.find((option) => option.id === "unassigned")).toMatchObject({
      cycleWindowLabel: "Outside any paycheck cycle",
      transactionCount: 1,
    });
  });

  it("excludes_stale_cycle_purchases_from_archived_options", () => {
    const options = buildPurchaseCycleOptions(
      [currentCyclePurchase, staleCycleIdPurchase],
      {
        activeCyclePaycheckId: "paycheck-jun",
        activeCycleStartDate: "2026-06-01",
        activeCycleEndDate: "2026-06-15",
        paychecks,
      }
    );

    expect(getArchivedPurchaseCycleOptions(options).map((option) => option.id)).toEqual([]);
    expect(
      resolvePurchaseCycleIdFromContext(staleCycleIdPurchase, {
        activeCyclePaycheckId: "paycheck-jun",
        activeCycleStartDate: "2026-06-01",
        activeCycleEndDate: "2026-06-15",
        paychecks,
      })
    ).toBe("unassigned");
    expect(options.find((option) => option.id === "unassigned")).toMatchObject({
      cycleWindowLabel: "Outside any paycheck cycle",
      transactionCount: 1,
    });
  });
});

describe("getPurchaseSummaryForPurchases", () => {
  it("summarizes_pending_and_total_amounts", () => {
    expect(
      getPurchaseSummaryForPurchases([currentCyclePurchase, priorCyclePurchase])
    ).toEqual({
      pendingAmountCents: 3200,
      totalSpentCents: 7700,
      transactionCount: 2,
    });
  });

  it("ignores_invalid_amount_cents_instead_of_producing_nan", () => {
    expect(
      getPurchaseSummaryForPurchases([
        {
          ...currentCyclePurchase,
          amountCents: undefined as unknown as number,
        },
      ])
    ).toEqual({
      pendingAmountCents: 0,
      totalSpentCents: 0,
      transactionCount: 1,
    });
  });
});

describe("formatPurchaseCycleLabel", () => {
  it("formats_a_closed_cycle_window", () => {
    expect(formatPurchaseCycleLabel("2026-06-01", "2026-06-15")).toBe(
      "Jun 1 – Jun 15"
    );
  });
});
