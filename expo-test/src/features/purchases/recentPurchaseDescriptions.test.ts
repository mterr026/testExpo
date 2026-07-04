import { describe, expect, it } from "vitest";

import type { Purchase } from "@/shared/ui/types";

import { getRecentPurchaseDescriptions } from "./recentPurchaseDescriptions";

function purchase(
  overrides: Partial<Purchase> & Pick<Purchase, "id" | "name">
): Purchase {
  return {
    amountCents: 500,
    status: "Charged",
    date: "2026-06-01",
    purchaseDate: "2026-06-01",
    paycheckCycleId: null,
    envelopeId: null,
    ...overrides,
  };
}

describe("getRecentPurchaseDescriptions", () => {
  it("returns unique descriptions from most recent purchases", () => {
    const descriptions = getRecentPurchaseDescriptions([
      purchase({ id: "1", name: "Coffee", date: "2026-06-03" }),
      purchase({ id: "2", name: "coffee", date: "2026-06-02" }),
      purchase({ id: "3", name: "Groceries", date: "2026-06-01" }),
    ]);

    expect(descriptions).toEqual(["Coffee", "Groceries"]);
  });

  it("skips blank and default descriptions", () => {
    const descriptions = getRecentPurchaseDescriptions([
      purchase({ id: "1", name: "Purchase", date: "2026-06-03" }),
      purchase({ id: "2", name: "   ", date: "2026-06-02" }),
      purchase({ id: "3", name: "Gas", date: "2026-06-01" }),
    ]);

    expect(descriptions).toEqual(["Gas"]);
  });

  it("respects the limit", () => {
    const descriptions = getRecentPurchaseDescriptions(
      [
        purchase({ id: "1", name: "One", date: "2026-06-05" }),
        purchase({ id: "2", name: "Two", date: "2026-06-04" }),
        purchase({ id: "3", name: "Three", date: "2026-06-03" }),
      ],
      2
    );

    expect(descriptions).toEqual(["One", "Two"]);
  });
});
