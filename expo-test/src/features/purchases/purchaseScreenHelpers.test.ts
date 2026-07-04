import { describe, expect, it } from "vitest";

import {
  getFilterLabel,
  getPurchaseSummaryTitle,
} from "./purchaseScreenHelpers";

describe("getPurchaseSummaryTitle", () => {
  it("returns Current cycle for the current cycle view", () => {
    expect(getPurchaseSummaryTitle()).toBe("Current cycle");
  });
});

describe("getFilterLabel", () => {
  it("adds pending count to the Pending filter", () => {
    expect(getFilterLabel("Pending", 3)).toBe("Pending (3)");
  });

  it("leaves Pending unchanged when count is zero", () => {
    expect(getFilterLabel("Pending", 0)).toBe("Pending");
  });

  it("returns other filters unchanged", () => {
    expect(getFilterLabel("All", 5)).toBe("All");
    expect(getFilterLabel("Charged", 5)).toBe("Charged");
  });
});
