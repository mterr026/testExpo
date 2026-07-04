import { describe, expect, it } from "vitest";

import { formatPurchaseCycleHeaderSummary } from "./purchaseCycleHeader";

describe("formatPurchaseCycleHeaderSummary", () => {
  it("formats_date_range_spent_and_pending_count", () => {
    expect(
      formatPurchaseCycleHeaderSummary({
        cycleWindowLabel: "Jun 1 – Jun 15",
        totalSpentCents: 18700,
        pendingCount: 3,
      })
    ).toBe("Jun 1 – Jun 15 · $187.00 spent · 3 pending");
  });

  it("omits_pending_when_there_are_none", () => {
    expect(
      formatPurchaseCycleHeaderSummary({
        cycleWindowLabel: "Jun 1 – Jun 15",
        totalSpentCents: 18700,
        pendingCount: 0,
      })
    ).toBe("Jun 1 – Jun 15 · $187.00 spent");
  });

  it("uses_a_fallback_when_no_cycle_is_active", () => {
    expect(
      formatPurchaseCycleHeaderSummary({
        cycleWindowLabel: null,
        totalSpentCents: 0,
        pendingCount: 0,
      })
    ).toBe("No active cycle · $0.00 spent");
  });
});
