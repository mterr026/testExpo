import { describe, expect, it } from "vitest";

import type { ImportSuggestion } from "@/database/repositories/types";

import { inferDefaultIncomeIsPrimary } from "./importIncomeDefaults";

function suggestion(name: string): ImportSuggestion {
  return {
    id: "suggestion-1",
    profileId: "profile-1",
    suggestedName: name,
    suggestedAmountCents: 100000,
    suggestionKind: "income",
    suggestedDate: "2026-01-15",
    detectedInterval: "monthly",
    occurrenceCount: 3,
    importSessionId: "session-1",
    status: "pending",
    confirmedBillId: null,
    createdAt: "2026-06-01T12:00:00.000Z",
    resolvedAt: null,
    deletedAt: null,
  };
}

describe("inferDefaultIncomeIsPrimary", () => {
  it("defaults_payroll_like_income_to_primary", () => {
    expect(inferDefaultIncomeIsPrimary(suggestion("ACME PAYROLL"))).toBe(true);
  });

  it("defaults_pension_and_disability_income_to_secondary", () => {
    expect(inferDefaultIncomeIsPrimary(suggestion("STATE PENSION"))).toBe(false);
    expect(inferDefaultIncomeIsPrimary(suggestion("SSA DISABILITY"))).toBe(false);
    expect(inferDefaultIncomeIsPrimary(suggestion("SOCIAL SECURITY"))).toBe(false);
  });
});
