import { describe, expect, it, vi } from "vitest";

import type { ImportSuggestionRepository } from "@/database/repositories";
import type {
  Bill,
  ImportSuggestion,
  NewImportSuggestion,
  Paycheck,
} from "@/database/repositories/types";
import type { BillService } from "@/features/bills/services";
import type { PaycheckService } from "@/features/paychecks/services";

import { ImportService } from "./ImportService";

describe("ImportService", () => {
  it("imports_csv_text_into_pending_import_suggestions", async () => {
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
          createdAt: "2026-06-18T00:00:00.000Z",
          resolvedAt: null,
          deletedAt: null,
        };

        createdSuggestions.push(suggestion);

        return suggestion;
      }),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-1",
      }
    );

    const result = await service.importCsvText({
      profileId: "profile-1",
      csvText: `Date,Description,Amount,Account
2026-01-05,Streaming Service Account 123456,-12.99,checking-001
2026-02-05,Streaming Service Account 123456,-12.99,checking-001`,
    });

    expect(result.importSessionId).toBe("import-session-1");
    expect(result.suggestions).toEqual(createdSuggestions);
    expect(repository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      suggestedName: "Streaming Service",
      suggestedAmountCents: 1299,
      suggestionKind: "bill",
      suggestedDate: "2026-02-05",
      detectedInterval: "monthly",
      occurrenceCount: 2,
      importSessionId: "import-session-1",
    });
    expect(JSON.stringify(repository.create.mock.calls)).not.toContain(
      "checking-001"
    );
    expect(JSON.stringify(repository.create.mock.calls)).not.toContain(
      "123456"
    );
  });

  it("returns_empty_session_when_no_recurring_candidates_are_detected", async () => {
    const repository = {
      create: vi.fn(),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-empty",
      }
    );

    const result = await service.importCsvText({
      profileId: "profile-1",
      csvText: `Date,Description,Amount
2026-01-05,Coffee,-5.00`,
    });

    expect(result).toEqual({
      importSessionId: "import-session-empty",
      suggestions: [],
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("imports_statement_text_through_the_shared_recurring_detection_pipeline", async () => {
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
          createdAt: "2026-06-18T00:00:00.000Z",
          resolvedAt: null,
          deletedAt: null,
        };

        createdSuggestions.push(suggestion);

        return suggestion;
      }),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-statement",
      }
    );

    const result = await service.importStatementText({
      profileId: "profile-1",
      statementText: `Posted,Details,Debit,Credit
01/05/2026,Streaming Service,12.99,
02/05/2026,Streaming Service,12.99,`,
    });

    expect(result).toEqual({
      importSessionId: "import-session-statement",
      suggestions: createdSuggestions,
    });
    expect(repository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      suggestedName: "Streaming Service",
      suggestedAmountCents: 1299,
      suggestionKind: "bill",
      suggestedDate: "2026-02-05",
      detectedInterval: "monthly",
      occurrenceCount: 2,
      importSessionId: "import-session-statement",
    });
  });

  it("imports_copied_statement_lines_through_the_shared_pipeline", async () => {
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
          createdAt: "2026-06-18T00:00:00.000Z",
          resolvedAt: null,
          deletedAt: null,
        };

        createdSuggestions.push(suggestion);

        return suggestion;
      }),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-lines",
      }
    );

    const result = await service.importStatementText({
      profileId: "profile-1",
      statementText: `01/15/2026 Electric Utility 114.22 Debit
02/15/2026 Electric Utility 119.80 Debit
03/15/2026 Electric Utility 121.10 Debit`,
    });

    expect(result).toEqual({
      importSessionId: "import-session-lines",
      suggestions: createdSuggestions,
    });
    expect(repository.create).toHaveBeenCalledWith({
      profileId: "profile-1",
      suggestedName: "Electric Utility",
      suggestedAmountCents: 12110,
      suggestionKind: "bill",
      suggestedDate: "2026-03-15",
      detectedInterval: "monthly",
      occurrenceCount: 3,
      importSessionId: "import-session-lines",
    });
  });

  it("rejects_missing_profile_id", async () => {
    const service = new ImportService(
      { create: vi.fn() } as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-1",
      }
    );

    await expect(
      service.importCsvText({
        profileId: " ",
        csvText: "Date,Description,Amount",
      })
    ).rejects.toThrow("CSV import requires a profileId.");
  });

  it("rejects_missing_profile_id_for_statement_text_imports", async () => {
    const service = new ImportService(
      { create: vi.fn() } as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-1",
      }
    );

    await expect(
      service.importStatementText({
        profileId: " ",
        statementText: "Date,Description,Amount",
      })
    ).rejects.toThrow("Statement import requires a profileId.");
  });

  it("loads_pending_suggestions_for_review", async () => {
    const suggestions = [importSuggestion()];
    const repository = {
      findPendingByProfile: vi.fn().mockResolvedValue(suggestions),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock()
    );

    await expect(service.getPendingSuggestions("profile-1")).resolves.toEqual(
      suggestions
    );
    expect(repository.findPendingByProfile).toHaveBeenCalledWith("profile-1");
  });

  it("rejects_missing_profile_id_when_loading_pending_suggestions", async () => {
    const repository = {
      findPendingByProfile: vi.fn(),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock()
    );

    await expect(service.getPendingSuggestions(" ")).rejects.toThrow(
      "Pending import suggestions require a profileId."
    );
    expect(repository.findPendingByProfile).not.toHaveBeenCalled();
  });

  it("clears_pending_suggestions_for_debug_reimports", async () => {
    const repository = {
      rejectPendingByProfile: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock()
    );

    await expect(service.clearPendingSuggestions("profile-1")).resolves.toBeUndefined();
    expect(repository.rejectPendingByProfile).toHaveBeenCalledWith("profile-1");
  });

  it("rejects_missing_profile_id_when_clearing_pending_suggestions", async () => {
    const repository = {
      rejectPendingByProfile: vi.fn(),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock()
    );

    await expect(service.clearPendingSuggestions(" ")).rejects.toThrow(
      "Pending import suggestions require a profileId."
    );
    expect(repository.rejectPendingByProfile).not.toHaveBeenCalled();
  });

  it("loads_import_session_suggestions_for_review", async () => {
    const suggestions = [importSuggestion()];
    const repository = {
      findBySession: vi.fn().mockResolvedValue(suggestions),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock()
    );

    await expect(
      service.getSessionSuggestions("import-session-1")
    ).resolves.toEqual(suggestions);
    expect(repository.findBySession).toHaveBeenCalledWith("import-session-1");
  });

  it("rejects_missing_import_session_id_when_loading_session_suggestions", async () => {
    const repository = {
      findBySession: vi.fn(),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock()
    );

    await expect(service.getSessionSuggestions(" ")).rejects.toThrow(
      "Import session suggestions require an importSessionId."
    );
    expect(repository.findBySession).not.toHaveBeenCalled();
  });

  it("confirms_pending_suggestion_by_creating_bill_and_resolving_suggestion", async () => {
    const suggestion = importSuggestion();
    const bill = billRecord();
    const repository = {
      findById: vi.fn().mockResolvedValue(suggestion),
      confirm: vi.fn().mockResolvedValue({
        ...suggestion,
        confirmedBillId: bill.id,
        status: "confirmed",
      }),
    };
    const billService = {
      createBill: vi.fn().mockResolvedValue(bill),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      billService as unknown as BillService,
      {
        createImportSessionId: () => "import-session-1",
      }
    );

    const result = await service.confirmSuggestionAsBill("suggestion-1", {
      dueDateAbsolute: "2026-07-05",
    });

    expect(billService.createBill).toHaveBeenCalledWith({
      profileId: "profile-1",
      name: "Streaming Service",
      billType: "fixed",
      defaultAmountCents: 1299,
      recurrenceInterval: "monthly",
      dueDateAbsolute: "2026-07-05",
      dueDayOfCycle: null,
      endDate: null,
    });
    expect(repository.confirm).toHaveBeenCalledWith("suggestion-1", "bill-1");
    expect(result.billId).toBe("bill-1");
    expect(result.suggestion.status).toBe("confirmed");
  });

  it("confirms_pending_suggestion_into_the_current_bill_cycle_when_cycle_is_available", async () => {
    const suggestion = importSuggestion();
    const bill = billRecord();
    const repository = {
      findById: vi.fn().mockResolvedValue(suggestion),
      confirm: vi.fn().mockResolvedValue({
        ...suggestion,
        confirmedBillId: bill.id,
        status: "confirmed",
      }),
    };
    const billService = createBillServiceMock();
    billService.createBillForCycle.mockResolvedValue({
      bill,
      billCycleInstance: null,
    });
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      billService
    );

    await service.confirmSuggestionAsBill("suggestion-1", {
      cycle: {
        paycheckCycleId: "paycheck-1",
        startDate: "2026-07-01",
        nextStartDate: "2026-07-15",
      },
      dueDateAbsolute: "2026-07-05",
    });

    expect(billService.createBillForCycle).toHaveBeenCalledWith(
      {
        profileId: "profile-1",
        name: "Streaming Service",
        billType: "fixed",
        defaultAmountCents: 1299,
        recurrenceInterval: "monthly",
        dueDateAbsolute: "2026-07-05",
        dueDayOfCycle: null,
        endDate: null,
      },
      {
        paycheckCycleId: "paycheck-1",
        startDate: "2026-07-01",
        nextStartDate: "2026-07-15",
      }
    );
    expect(billService.createBill).not.toHaveBeenCalled();
    expect(repository.confirm).toHaveBeenCalledWith("suggestion-1", "bill-1");
  });

  it("preserves_imported_bill_due_date_anchors_that_are_before_the_active_cycle", async () => {
    const suggestion = {
      ...importSuggestion(),
      suggestedDate: "2026-06-05",
    };
    const bill = billRecord();
    const repository = {
      findById: vi.fn().mockResolvedValue(suggestion),
      confirm: vi.fn().mockResolvedValue({
        ...suggestion,
        confirmedBillId: bill.id,
        status: "confirmed",
      }),
    };
    const billService = createBillServiceMock();
    billService.createBillForCycle.mockResolvedValue({
      bill,
      billCycleInstance: null,
    });
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      billService
    );

    await service.confirmSuggestionAsBill("suggestion-1", {
      cycle: {
        paycheckCycleId: "paycheck-1",
        startDate: "2026-06-21",
        nextStartDate: "2026-07-01",
      },
      dueDateAbsolute: "2026-06-05",
    });

    expect(billService.createBillForCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDateAbsolute: "2026-06-05",
      }),
      {
        paycheckCycleId: "paycheck-1",
        startDate: "2026-06-21",
        nextStartDate: "2026-07-01",
      }
    );
  });

  it("confirms_irregular_bill_suggestions_as_monthly_bills_by_default", async () => {
    const suggestion = {
      ...importSuggestion(),
      detectedInterval: "irregular" as const,
      occurrenceCount: 1,
      suggestedDate: "2026-07-05",
    };
    const bill = billRecord();
    const repository = {
      findById: vi.fn().mockResolvedValue(suggestion),
      confirm: vi.fn().mockResolvedValue({
        ...suggestion,
        confirmedBillId: bill.id,
        status: "confirmed",
      }),
    };
    const billService = createBillServiceMock();
    billService.createBill.mockResolvedValue(bill);
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      billService
    );

    await service.confirmSuggestionAsBill("suggestion-1", {
      dueDateAbsolute: "2026-07-05",
    });

    expect(billService.createBill).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDateAbsolute: "2026-07-05",
        endDate: null,
        recurrenceInterval: "monthly",
      })
    );
  });


  it("auto_confirms_only_pending_bill_suggestions", async () => {
    const billSuggestion = importSuggestion();
    const incomeSuggestion = {
      ...importSuggestion(),
      id: "suggestion-2",
      suggestionKind: "income" as const,
      suggestedName: "Payroll",
    };
    const repository = {
      findPendingByProfile: vi
        .fn()
        .mockResolvedValue([billSuggestion, incomeSuggestion]),
      findById: vi.fn().mockResolvedValue(billSuggestion),
      confirm: vi.fn().mockResolvedValue({
        ...billSuggestion,
        confirmedBillId: "bill-1",
        status: "confirmed",
      }),
    };
    const billService = createBillServiceMock();
    billService.createBill.mockResolvedValue(billRecord());
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      billService
    );

    const confirmedCount = await service.autoConfirmPendingBillSuggestions({
      profileId: "profile-1",
      resolveDueDate: () => "2026-07-05",
    });

    expect(confirmedCount).toBe(1);
    expect(billService.createBill).toHaveBeenCalledTimes(1);
    expect(repository.confirm).toHaveBeenCalledWith("suggestion-1", "bill-1");
  });

  it("auto_confirms_only_pending_income_suggestions", async () => {
    const incomeSuggestion = {
      ...importSuggestion(),
      suggestionKind: "income" as const,
      suggestedName: "Payroll",
      suggestedAmountCents: 180000,
      suggestedDate: "2026-07-01",
    };
    const billSuggestion = {
      ...importSuggestion(),
      id: "suggestion-2",
    };
    const repository = {
      findPendingByProfile: vi
        .fn()
        .mockResolvedValue([incomeSuggestion, billSuggestion]),
      findById: vi.fn().mockResolvedValue(incomeSuggestion),
      confirmIncome: vi.fn().mockResolvedValue({
        ...incomeSuggestion,
        status: "confirmed",
      }),
    };
    const paycheckService = {
      createPaycheck: vi.fn().mockResolvedValue(paycheckRecord()),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      paycheckService as unknown as PaycheckService,
      {
        createImportSessionId: () => "import-session-1",
      }
    );

    const confirmedCount = await service.autoConfirmPendingIncomeSuggestions({
      profileId: "profile-1",
      resolveExpectedDate: () => "2026-07-01",
    });

    expect(confirmedCount).toBe(1);
    expect(paycheckService.createPaycheck).toHaveBeenCalledTimes(1);
    expect(repository.confirmIncome).toHaveBeenCalledWith("suggestion-1");
  });

  it("confirms_pending_income_suggestion_by_creating_paycheck", async () => {
    const suggestion = {
      ...importSuggestion(),
      suggestionKind: "income" as const,
      suggestedName: "USPS Paycheck",
      suggestedAmountCents: 180000,
      suggestedDate: "2026-07-01",
    };
    const paycheck = paycheckRecord();
    const repository = {
      findById: vi.fn().mockResolvedValue(suggestion),
      confirmIncome: vi.fn().mockResolvedValue({
        ...suggestion,
        status: "confirmed",
      }),
    };
    const paycheckService = {
      createPaycheck: vi.fn().mockResolvedValue(paycheck),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      paycheckService as unknown as PaycheckService,
      {
        createImportSessionId: () => "import-session-1",
      }
    );

    const result = await service.confirmSuggestionAsIncome("suggestion-1", {
      expectedDate: "2026-07-02",
      label: "USPS",
    });

    expect(paycheckService.createPaycheck).toHaveBeenCalledWith({
      profileId: "profile-1",
      label: "USPS",
      amountCents: 180000,
      expectedDate: "2026-07-02",
      isPrimary: true,
      isReceived: false,
      isRecurring: true,
      recurrenceInterval: "monthly",
    });
    expect(repository.confirmIncome).toHaveBeenCalledWith("suggestion-1");
    expect(result.paycheckId).toBe("paycheck-1");
    expect(result.suggestion.status).toBe("confirmed");
  });

  it("confirmed_imported_income_can_override_the_detected_frequency", async () => {
    const suggestion = {
      ...importSuggestion(),
      suggestionKind: "income" as const,
      suggestedName: "USPS Payroll",
      suggestedAmountCents: 200000,
      detectedInterval: "biweekly" as const,
      suggestedDate: "2026-07-03",
    };
    const repository = {
      findById: vi.fn().mockResolvedValue(suggestion),
      confirmIncome: vi.fn().mockResolvedValue({
        ...suggestion,
        status: "confirmed",
      }),
    };
    const paycheckService = createPaycheckServiceMock();
    paycheckService.createPaycheck.mockResolvedValue(paycheckRecord());
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      paycheckService
    );

    await service.confirmSuggestionAsIncome("suggestion-1", {
      expectedDate: "2026-07-03",
      recurrenceInterval: "weekly",
    });

    expect(paycheckService.createPaycheck).toHaveBeenCalledWith(
      expect.objectContaining({
        isRecurring: true,
        recurrenceInterval: "weekly",
      })
    );
  });

  it("can_confirm_a_bill_labeled_suggestion_as_income_when_user_overrides_it", async () => {
    const paycheck = paycheckRecord();
    const repository = {
      findById: vi.fn().mockResolvedValue(importSuggestion()),
      confirmIncome: vi.fn().mockResolvedValue({
        ...importSuggestion(),
        status: "confirmed",
      }),
    };
    const paycheckService = createPaycheckServiceMock();
    paycheckService.createPaycheck.mockResolvedValue(paycheck);
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      paycheckService
    );

    const result = await service.confirmSuggestionAsIncome("suggestion-1", {
      expectedDate: "2026-07-05",
      label: "Corrected Income",
    });

    expect(paycheckService.createPaycheck).toHaveBeenCalledWith({
      profileId: "profile-1",
      label: "Corrected Income",
      amountCents: 1299,
      expectedDate: "2026-07-05",
      isPrimary: true,
      isReceived: false,
      isRecurring: true,
      recurrenceInterval: "monthly",
    });
    expect(repository.confirmIncome).toHaveBeenCalledWith("suggestion-1");
    expect(result.paycheckId).toBe("paycheck-1");
  });

  it("rejects_pending_suggestion_without_creating_bill", async () => {
    const suggestion = importSuggestion();
    const repository = {
      findById: vi.fn().mockResolvedValue(suggestion),
      reject: vi.fn().mockResolvedValue({
        ...suggestion,
        status: "rejected",
      }),
    };
    const billService = createBillServiceMock();
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      billService,
      {
        createImportSessionId: () => "import-session-1",
      }
    );

    const rejected = await service.rejectSuggestion("suggestion-1");

    expect(rejected.status).toBe("rejected");
    expect(repository.reject).toHaveBeenCalledWith("suggestion-1");
    expect(billService.createBill).not.toHaveBeenCalled();
  });

  it("does_not_confirm_already_resolved_suggestions", async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue({
        ...importSuggestion(),
        status: "confirmed",
      }),
    };
    const service = new ImportService(
      repository as unknown as ImportSuggestionRepository,
      createBillServiceMock(),
      {
        createImportSessionId: () => "import-session-1",
      }
    );

    await expect(
      service.confirmSuggestionAsBill("suggestion-1", {
        dueDateAbsolute: "2026-07-05",
      })
    ).rejects.toThrow("Only pending import suggestions can be confirmed.");
  });
});

function createBillServiceMock() {
  return {
    createBill: vi.fn(),
    createBillForCycle: vi.fn(),
  } as unknown as BillService & {
    createBill: ReturnType<typeof vi.fn>;
    createBillForCycle: ReturnType<typeof vi.fn>;
  };
}

function createPaycheckServiceMock() {
  return {
    createPaycheck: vi.fn(),
  } as unknown as PaycheckService & {
    createPaycheck: ReturnType<typeof vi.fn>;
  };
}

function importSuggestion(): ImportSuggestion {
  return {
    id: "suggestion-1",
    profileId: "profile-1",
    suggestedName: "Streaming Service",
    suggestedAmountCents: 1299,
    detectedInterval: "monthly",
    occurrenceCount: 2,
    importSessionId: "import-session-1",
    status: "pending",
    confirmedBillId: null,
    suggestionKind: "bill",
    suggestedDate: "2026-02-05",
    createdAt: "2026-06-18T00:00:00.000Z",
    resolvedAt: null,
    deletedAt: null,
  };
}

function billRecord(): Bill {
  return {
    id: "bill-1",
    profileId: "profile-1",
    name: "Streaming Service",
    billType: "fixed",
    defaultAmountCents: 1299,
    recurrenceInterval: "monthly",
    customIntervalDays: null,
    dueDayOfCycle: null,
    dueDateAbsolute: "2026-07-05",
    endDate: null,
    isPaused: false,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    deletedAt: null,
    syncStatus: "local",
  };
}

function paycheckRecord(): Paycheck {
  return {
    id: "paycheck-1",
    profileId: "profile-1",
    label: "USPS",
    amountCents: 180000,
    expectedDate: "2026-07-02",
    isReceived: false,
    receivedAt: null,
    isRecurring: false,
    recurrenceInterval: null,
    isPrimary: true,
    notes: null,
    createdAt: "2026-06-18T00:00:00.000Z",
    updatedAt: "2026-06-18T00:00:00.000Z",
    deletedAt: null,
    syncStatus: "local",
  };
}
