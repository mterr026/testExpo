import { describe, expect, it, vi } from "vitest";

import { getPaycheckActions, getPaycheckSwipeActions } from "./paycheckActions";
import type { PaycheckListItem } from "@/shared/ui/types";

const expectedPaycheck: PaycheckListItem = {
  id: "paycheck-1",
  label: "Acme Corp",
  amountCents: 250000,
  expectedDate: "2026-07-04",
  isReceived: false,
  isPrimary: true,
  recurrenceInterval: null,
};

const receivedPaycheck: PaycheckListItem = {
  ...expectedPaycheck,
  id: "paycheck-2",
  isReceived: true,
};

const handlers = {
  onConfirmPaycheck: vi.fn(),
  onDeletePaycheck: vi.fn(),
  onEditPaycheck: vi.fn(),
  onMarkPaycheckUnreceived: vi.fn(),
};

describe("getPaycheckActions", () => {
  it("offers_confirm_received_for_expected_paychecks", () => {
    const actions = getPaycheckActions({
      paycheck: expectedPaycheck,
      ...handlers,
    });

    expect(actions.map((action) => action.label)).toEqual([
      "Confirm received",
      "Edit Paycheck",
      "Delete Paycheck",
    ]);
  });

  it("offers_mark_unreceived_for_received_paychecks", () => {
    const actions = getPaycheckActions({
      paycheck: receivedPaycheck,
      ...handlers,
    });

    expect(actions.map((action) => action.label)).toEqual([
      "Mark unreceived",
      "Edit Paycheck",
      "Delete Paycheck",
    ]);
  });
});

describe("getPaycheckSwipeActions", () => {
  it("keeps_menu_order_so_the_primary_action_sits_beside_the_row", () => {
    const menuActions = getPaycheckActions({
      paycheck: expectedPaycheck,
      ...handlers,
    });
    const swipeActions = getPaycheckSwipeActions({
      paycheck: expectedPaycheck,
      ...handlers,
    });

    expect(swipeActions.map((action) => action.label)).toEqual(
      menuActions.map((action) => action.label)
    );
  });
});
