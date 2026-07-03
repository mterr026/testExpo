import { describe, expect, it } from "vitest";

import {
  isExportableImportSuggestion,
  type ImportSuggestionFilterCandidate,
} from "./importSuggestionFilter";

function candidate(
  overrides: Partial<ImportSuggestionFilterCandidate> = {}
): ImportSuggestionFilterCandidate {
  return {
    category: "utility",
    description: "FPL ELECTRIC RECURRING",
    direction: "debit",
    occurrenceCount: 2,
    suggestedAmountCents: 12500,
    suggestedName: "FPL ELECTRIC",
    suggestionKind: "bill",
    suggestionType: "likely_bill",
    ...overrides,
  };
}

describe("isExportableImportSuggestion", () => {
  describe("hard-ignore patterns", () => {
    it.each([
      ["ZELLE PAYMENT TO FRIEND", "debit"],
      ["VENMO PAYMENT", "debit"],
      ["CASH APP TRANSFER", "debit"],
      ["TRANSFER TO SAV 1234", "debit"],
      ["OVERDRAFT FEE", "debit"],
      ["SERVICE FEE", "debit"],
      ["CAPITAL ONE DES:CRCARDPMT", "debit"],
    ] as const)("blocks export for %s", (description, direction) => {
      expect(
        isExportableImportSuggestion(
          candidate({
            description,
            direction,
            suggestedName: description,
          })
        )
      ).toBe(false);
    });

    it("blocks export when suggestedName matches hard-ignore pattern", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            description: "FPL ELECTRIC",
            suggestedName: "ZELLE PAYMENT TO FRIEND",
          })
        )
      ).toBe(false);
    });
  });

  describe("bill export", () => {
    it("exports bills with recurrence evidence from occurrence count", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "misc_purchase",
            occurrenceCount: 2,
            suggestionType: "possible_bill",
          })
        )
      ).toBe(true);
    });

    it("exports bills with recurrence evidence from description", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "misc_purchase",
            description: "NETFLIX RECURRING SUBSCRIPTION",
            occurrenceCount: 1,
            suggestionType: "possible_bill",
          })
        )
      ).toBe(true);
    });

    it.each([
      "utility",
      "rent",
      "mortgage",
      "insurance",
      "loan",
      "phone_internet",
    ] as const)("exports structural bill category %s without recurrence", (category) => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category,
            occurrenceCount: 1,
            suggestionType: "likely_bill",
          })
        )
      ).toBe(true);
    });

    it("exports subscription at or above $5 threshold without recurrence", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "subscription",
            occurrenceCount: 1,
            suggestedAmountCents: 500,
            suggestionType: "possible_bill",
          })
        )
      ).toBe(true);
    });

    it("exports installment at or above $5 threshold without recurrence", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "installment",
            occurrenceCount: 1,
            suggestedAmountCents: 999,
            suggestionType: "possible_bill",
          })
        )
      ).toBe(true);
    });

    it("rejects subscription below $5 threshold without recurrence or structural category", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "subscription",
            description: "MICRO SUBSCRIPTION",
            occurrenceCount: 1,
            suggestedAmountCents: 499,
            suggestionType: "possible_bill",
          })
        )
      ).toBe(false);
    });

    it("rejects non-recurring misc bill without structural category", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "misc_purchase",
            description: "ONE-OFF PURCHASE",
            occurrenceCount: 1,
            suggestionType: "possible_bill",
          })
        )
      ).toBe(false);
    });
  });

  describe("income export", () => {
    it("exports payroll income", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "payroll_income",
            description: "USPS PAYROLL DIRECT DEP",
            direction: "credit",
            suggestedName: "USPS PAYROLL DIRECT DEP",
            suggestionKind: "income",
            suggestionType: "likely_income",
          })
        )
      ).toBe(true);
    });

    it("exports possible income categories", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "business_income",
            direction: "credit",
            suggestionKind: "income",
            suggestionType: "possible_income",
          })
        )
      ).toBe(true);
    });

    it("excludes transfer_received income", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "transfer_received",
            direction: "credit",
            suggestionKind: "income",
            suggestionType: "possible_income",
          })
        )
      ).toBe(false);
    });
  });

  describe("non-exportable suggestion types", () => {
    it.each(["needs_review", "ignored_ordinary_spending"] as const)(
      "returns false for income with suggestionType %s",
      (suggestionType) => {
        expect(
          isExportableImportSuggestion(
            candidate({
              category: "payroll_income",
              direction: "credit",
              suggestionKind: "income",
              suggestionType,
            })
          )
        ).toBe(false);
      }
    );

    it("returns false for bill that lacks recurrence, structural category, and threshold", () => {
      expect(
        isExportableImportSuggestion(
          candidate({
            category: "misc_purchase",
            description: "ONE-OFF PURCHASE",
            occurrenceCount: 1,
            suggestedAmountCents: 200,
            suggestionKind: "bill",
            suggestionType: "needs_review",
          })
        )
      ).toBe(false);
    });
  });
});
