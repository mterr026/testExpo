import { describe, expect, it, vi } from "vitest";

import { getPurchaseActions, getPurchaseSwipeActions } from "./purchaseActions";
import type { Purchase } from "@/shared/ui/types";

const pendingPurchase: Purchase = {
  id: "purchase-1",
  name: "Coffee",
  amountCents: 450,
  date: "2026-07-04",
  purchaseDate: "2026-07-04",
  status: "Pending",
  paycheckCycleId: "paycheck-1",
  envelopeId: null,
};

const chargedPurchase: Purchase = {
  ...pendingPurchase,
  id: "purchase-2",
  status: "Charged",
};

const handlers = {
  onDeletePurchase: vi.fn(),
  onEditPurchase: vi.fn(),
  onMarkCharged: vi.fn(),
  onMarkPending: vi.fn(),
};

describe("getPurchaseActions", () => {
  it("offers mark charged for pending purchases", () => {
    const actions = getPurchaseActions({
      purchase: pendingPurchase,
      ...handlers,
    });

    expect(actions.map((action) => action.label)).toEqual([
      "Mark Charged",
      "Edit Purchase",
      "Delete Purchase",
    ]);
  });

  it("offers mark pending for charged purchases", () => {
    const actions = getPurchaseActions({
      purchase: chargedPurchase,
      ...handlers,
    });

    expect(actions[0]?.label).toBe("Mark Pending");
  });
});

describe("getPurchaseSwipeActions", () => {
  it("keeps menu order so the primary action sits beside the row", () => {
    const menuActions = getPurchaseActions({
      purchase: pendingPurchase,
      ...handlers,
    });
    const swipeActions = getPurchaseSwipeActions({
      purchase: pendingPurchase,
      ...handlers,
    });

    expect(swipeActions.map((action) => action.label)).toEqual(
      menuActions.map((action) => action.label)
    );
  });
});
