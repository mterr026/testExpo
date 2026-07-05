import { describe, expect, it } from "vitest";

import type { ImportSuggestion } from "@/database/repositories/types";

import {
  getBillStatusPresentation,
  getBillTimelineMetaLabel,
  getImportSuggestionMenuPresentation,
  getImportSuggestionRowPresentation,
  getPaycheckStatusPresentation,
  getPaycheckTimelineMetaLabel,
  getPurchaseStatusPresentation,
} from "./statusBadges";

describe("getBillStatusPresentation", () => {
  it("maps_bill_statuses_to_pill_labels_and_tones", () => {
    expect(getBillStatusPresentation("Due")).toEqual({
      label: "Due",
      tone: "accent",
    });
    expect(getBillStatusPresentation("Paid")).toEqual({
      label: "Paid",
      tone: "warm",
    });
    expect(getBillStatusPresentation("Needs confirmation")).toEqual({
      label: "Confirm",
      tone: "warning",
    });
    expect(getBillStatusPresentation("Paused")).toEqual({
      label: "Paused",
      tone: "warm",
    });
    expect(getBillStatusPresentation("Scheduled")).toEqual({
      label: "Scheduled",
      tone: "muted",
    });
    expect(getBillStatusPresentation("Projected")).toEqual({
      label: "Projected",
      tone: "muted",
    });
  });
});

describe("getBillTimelineMetaLabel", () => {
  it("uses_confirm_for_needs_confirmation", () => {
    expect(getBillTimelineMetaLabel("Needs confirmation")).toBe("Confirm");
  });

  it("uses_due_soon_for_due_bills", () => {
    expect(getBillTimelineMetaLabel("Due")).toBe("Due Soon");
  });

  it("describes_scheduled_and_projected_bills", () => {
    expect(getBillTimelineMetaLabel("Scheduled")).toBe("Upcoming Bill");
    expect(getBillTimelineMetaLabel("Projected")).toBe("Projected Bill");
  });
});

describe("getPurchaseStatusPresentation", () => {
  it("maps_pending_to_warning", () => {
    expect(getPurchaseStatusPresentation("Pending")).toEqual({
      label: "Pending",
      tone: "warning",
    });
  });

  it("maps_charged_to_warm", () => {
    expect(getPurchaseStatusPresentation("Charged")).toEqual({
      label: "Charged",
      tone: "warm",
    });
  });
});

describe("getPaycheckStatusPresentation", () => {
  it("maps_expected_and_received", () => {
    expect(getPaycheckStatusPresentation(false)).toEqual({
      label: "Expected",
      tone: "accent",
    });
    expect(getPaycheckStatusPresentation(true)).toEqual({
      label: "Received",
      tone: "warm",
    });
  });
});

describe("getPaycheckTimelineMetaLabel", () => {
  it("describes_income_state", () => {
    expect(getPaycheckTimelineMetaLabel(false)).toBe("Expected Income");
    expect(getPaycheckTimelineMetaLabel(true)).toBe("Received Income");
  });
});

describe("getImportSuggestionRowPresentation", () => {
  const baseSuggestion: ImportSuggestion = {
    id: "suggestion-1",
    confirmedBillId: null,
    createdAt: "2026-06-18T00:00:00.000Z",
    deletedAt: null,
    detectedInterval: "monthly",
    importSessionId: "import-session-1",
    occurrenceCount: 3,
    profileId: "profile-1",
    resolvedAt: null,
    status: "pending",
    suggestedAmountCents: 120000,
    suggestedDate: "2026-06-01",
    suggestedName: "Rent",
    suggestionKind: "bill",
  };

  it("maps_row_labels_and_tones", () => {
    expect(getImportSuggestionRowPresentation(baseSuggestion)).toEqual({
      label: "Bill",
      tone: "warning",
    });
    expect(
      getImportSuggestionRowPresentation({
        ...baseSuggestion,
        detectedInterval: "irregular",
      })
    ).toEqual({
      label: "Possible Bill",
      tone: "warning",
    });
    expect(
      getImportSuggestionRowPresentation({
        ...baseSuggestion,
        suggestionKind: "income",
      })
    ).toEqual({
      label: "Income",
      tone: "accent",
    });
  });
});

describe("getImportSuggestionMenuPresentation", () => {
  const baseSuggestion: ImportSuggestion = {
    id: "suggestion-1",
    confirmedBillId: null,
    createdAt: "2026-06-18T00:00:00.000Z",
    deletedAt: null,
    detectedInterval: "monthly",
    importSessionId: "import-session-1",
    occurrenceCount: 3,
    profileId: "profile-1",
    resolvedAt: null,
    status: "pending",
    suggestedAmountCents: 120000,
    suggestedDate: "2026-06-01",
    suggestedName: "Rent",
    suggestionKind: "bill",
  };

  it("maps_menu_labels_and_tones", () => {
    expect(getImportSuggestionMenuPresentation(baseSuggestion)).toEqual({
      label: "Likely Recurring Payment",
      tone: "warning",
    });
    expect(
      getImportSuggestionMenuPresentation({
        ...baseSuggestion,
        detectedInterval: "irregular",
      })
    ).toEqual({
      label: "Possible Bill",
      tone: "warning",
    });
    expect(
      getImportSuggestionMenuPresentation({
        ...baseSuggestion,
        suggestionKind: "income",
      })
    ).toEqual({
      label: "Likely Income",
      tone: "accent",
    });
  });
});
