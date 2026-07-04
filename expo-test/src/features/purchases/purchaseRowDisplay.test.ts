import { describe, expect, it } from "vitest";

import {
  formatPurchaseDisplayName,
  getPurchaseStatusPresentation,
  getPurchaseStatusTone,
} from "./purchaseRowDisplay";

describe("formatPurchaseDisplayName", () => {
  it("normalizes_checkcard_import_strings", () => {
    expect(
      formatPurchaseDisplayName("CHECKCARD AMAZON.COM *1234 DES:Online Purchase")
    ).toBe("Amazon.Com");
  });

  it("strips_descriptor_suffix", () => {
    expect(formatPurchaseDisplayName("STARBUCKS DES:Purchase")).toBe("Starbucks");
  });

  it("returns_purchase_for_empty_names", () => {
    expect(formatPurchaseDisplayName("")).toBe("Purchase");
    expect(formatPurchaseDisplayName("   ")).toBe("Purchase");
  });
});

describe("getPurchaseStatusTone", () => {
  it("maps_pending_to_warning", () => {
    expect(getPurchaseStatusTone("Pending")).toBe("warning");
  });

  it("maps_charged_to_warm", () => {
    expect(getPurchaseStatusTone("Charged")).toBe("warm");
  });
});

describe("getPurchaseStatusPresentation", () => {
  it("returns_label_and_tone_together", () => {
    expect(getPurchaseStatusPresentation("Pending")).toEqual({
      label: "Pending",
      tone: "warning",
    });
  });
});
