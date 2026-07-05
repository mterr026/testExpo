import { describe, expect, it } from "vitest";

import {
  formatPurchaseDisplayName,
  getPurchaseRowMeta,
  getPurchaseStatusPresentation,
  getPurchaseStatusTone,
} from "./purchaseRowDisplay";
import type { Purchase } from "@/shared/ui/types";

const samplePurchase: Purchase = {
  id: "purchase-1",
  name: "Coffee",
  amountCents: 450,
  date: "2026-07-04",
  purchaseDate: "2026-07-04",
  status: "Pending",
  paycheckCycleId: "paycheck-1",
  envelopeId: null,
};

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

describe("getPurchaseRowMeta", () => {
  it("includes_date_and_pending_status", () => {
    expect(getPurchaseRowMeta(samplePurchase)).toBe("Jul 4 · Pending charge");
  });

  it("includes_charged_status", () => {
    expect(
      getPurchaseRowMeta({
        ...samplePurchase,
        status: "Charged",
      })
    ).toBe("Jul 4 · Charged");
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
