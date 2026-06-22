import { describe, expect, it, vi } from "vitest";

import { FINANCIAL_STATE_CHANGED } from "./financialEvents";
import { SimpleFinancialEventBus } from "./SimpleFinancialEventBus";

describe("SimpleFinancialEventBus", () => {
  it("notifies_subscribers_and_allows_unsubscribe", () => {
    const eventBus = new SimpleFinancialEventBus();
    const listener = vi.fn();

    const unsubscribe = eventBus.subscribe(FINANCIAL_STATE_CHANGED, listener);

    eventBus.emit(FINANCIAL_STATE_CHANGED, "profile-1");
    unsubscribe();
    eventBus.emit(FINANCIAL_STATE_CHANGED, "profile-1");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("profile-1");
  });
});
