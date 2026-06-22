import { describe, expect, it, vi } from "vitest";

import type { ImportSuggestionRepository } from "@/database/repositories";
import type {
  ImportSuggestion,
  NewImportSuggestion,
} from "@/database/repositories/types";
import type { BillService } from "@/features/bills/services";

import { ImportService } from "./ImportService";
import { importExtractedPdfText } from "./PdfImportAdapter";

describe("importExtractedPdfText", () => {
  it("routes_extracted_pdf_text_through_the_statement_import_pipeline", async () => {
    const result = {
      importSessionId: "import-session-pdf",
      suggestions: [],
    };
    const importService = {
      importStatementText: vi.fn().mockResolvedValue(result),
    };

    await expect(
      importExtractedPdfText({
        extractedText: "01/15/2026 Electric Utility 114.22 Debit",
        importService,
        profileId: "profile-1",
      })
    ).resolves.toBe(result);
    expect(importService.importStatementText).toHaveBeenCalledWith({
      includeSingleOccurrenceCandidates: true,
      parseAsStatementText: true,
      profileId: "profile-1",
      statementText: "01/15/2026 Electric Utility 114.22 Debit",
    });
  });

  it("persists_sanitized_suggestions_from_extracted_pdf_text", async () => {
    const createdSuggestions: ImportSuggestion[] = [];
    const repository = {
      create: vi.fn(async (input: NewImportSuggestion) => {
        const suggestion: ImportSuggestion = {
          id: `suggestion-${createdSuggestions.length + 1}`,
          profileId: input.profileId,
          suggestedName: input.suggestedName,
          suggestedAmountCents: input.suggestedAmountCents,
          suggestionKind: input.suggestionKind ?? "bill",
          suggestedDate: input.suggestedDate ?? null,
          detectedInterval: input.detectedInterval,
          occurrenceCount: input.occurrenceCount,
          importSessionId: input.importSessionId,
          status: "pending",
          confirmedBillId: null,
          createdAt: "2026-06-19T00:00:00.000Z",
          resolvedAt: null,
          deletedAt: null,
        };

        createdSuggestions.push(suggestion);

        return suggestion;
      }),
    };
    const importService = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-pdf",
      }
    );

    const result = await importExtractedPdfText({
      extractedText: `01/10/2026 Water Utility Account 123456789 48.25 Debit
02/10/2026 Water Utility Account 987654321 48.25 Debit`,
      importService,
      profileId: "profile-1",
    });

    expect(result.suggestions).toEqual(createdSuggestions);
    expect(repository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      suggestedName: "Water Utility",
      suggestedAmountCents: 4825,
      suggestionKind: "bill",
      suggestedDate: "2026-02-10",
      detectedInterval: "monthly",
      occurrenceCount: 2,
      importSessionId: "import-session-pdf",
    });
    expect(JSON.stringify(repository.create.mock.calls)).not.toContain(
      "123456789"
    );
    expect(JSON.stringify(repository.create.mock.calls)).not.toContain(
      "987654321"
    );
  });

  it("imports_single_statement_pdf_bill_candidates_for_review", async () => {
    const createdSuggestions: ImportSuggestion[] = [];
    const repository = {
      create: vi.fn(async (input: NewImportSuggestion) => {
        const suggestion: ImportSuggestion = {
          id: `suggestion-${createdSuggestions.length + 1}`,
          profileId: input.profileId,
          suggestedName: input.suggestedName,
          suggestedAmountCents: input.suggestedAmountCents,
          suggestionKind: input.suggestionKind ?? "bill",
          suggestedDate: input.suggestedDate ?? null,
          detectedInterval: input.detectedInterval,
          occurrenceCount: input.occurrenceCount,
          importSessionId: input.importSessionId,
          status: "pending",
          confirmedBillId: null,
          createdAt: "2026-06-19T00:00:00.000Z",
          resolvedAt: null,
          deletedAt: null,
        };

        createdSuggestions.push(suggestion);

        return suggestion;
      }),
    };
    const importService = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-pdf",
      }
    );

    const result = await importExtractedPdfText({
      extractedText: `01/10/2026 Water Utility 48.25 Debit
01/11/2026 Coffee Shop 6.10 Debit`,
      importService,
      profileId: "profile-1",
    });

    expect(result.suggestions).toEqual(createdSuggestions);
    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      suggestedName: "Water Utility",
      suggestedAmountCents: 4825,
      suggestionKind: "bill",
      suggestedDate: "2026-01-10",
      detectedInterval: "irregular",
      occurrenceCount: 1,
      importSessionId: "import-session-pdf",
    });
  });

  it("does_not_require_csv_columns_for_ocr_text_with_commas", async () => {
    const createdSuggestions: ImportSuggestion[] = [];
    const repository = {
      create: vi.fn(async (input: NewImportSuggestion) => {
        const suggestion: ImportSuggestion = {
          id: `suggestion-${createdSuggestions.length + 1}`,
          profileId: input.profileId,
          suggestedName: input.suggestedName,
          suggestedAmountCents: input.suggestedAmountCents,
          suggestionKind: input.suggestionKind ?? "bill",
          suggestedDate: input.suggestedDate ?? null,
          detectedInterval: input.detectedInterval,
          occurrenceCount: input.occurrenceCount,
          importSessionId: input.importSessionId,
          status: "pending",
          confirmedBillId: null,
          createdAt: "2026-06-19T00:00:00.000Z",
          resolvedAt: null,
          deletedAt: null,
        };

        createdSuggestions.push(suggestion);

        return suggestion;
      }),
    };
    const importService = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-pdf",
      }
    );

    const result = await importExtractedPdfText({
      extractedText: "01/10/2026, Water Utility, 48.25 Debit",
      importService,
      profileId: "profile-1",
    });

    expect(result.suggestions).toEqual(createdSuggestions);
    expect(repository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      suggestedName: "Water Utility",
      suggestedAmountCents: 4825,
      suggestionKind: "bill",
      suggestedDate: "2026-01-10",
      detectedInterval: "irregular",
      occurrenceCount: 1,
      importSessionId: "import-session-pdf",
    });
  });

  it("rejects_missing_profile_id_before_importing", async () => {
    const importService = {
      importStatementText: vi.fn(),
    };

    await expect(
      importExtractedPdfText({
        extractedText: "01/15/2026 Electric Utility 114.22 Debit",
        importService,
        profileId: " ",
      })
    ).rejects.toThrow("PDF import requires a profileId.");
    expect(importService.importStatementText).not.toHaveBeenCalled();
  });

  it("rejects_empty_extracted_text_before_importing", async () => {
    const importService = {
      importStatementText: vi.fn(),
    };

    await expect(
      importExtractedPdfText({
        extractedText: " ",
        importService,
        profileId: "profile-1",
      })
    ).rejects.toThrow("PDF import requires extracted text.");
    expect(importService.importStatementText).not.toHaveBeenCalled();
  });
});

function createBillServiceMock() {
  return {
    createBill: vi.fn(),
  } as unknown as BillService;
}
