import type { ImportSuggestionRepository } from "@/database/repositories";
import type {
  ImportSuggestion,
  NewBill,
  PaycheckRecurrenceInterval,
} from "@/database/repositories/types";
import type { BillCycleWindow } from "@/engine";
import type { BillService } from "@/features/bills/services";
import {
  getDefaultImportIncomeExpectedDateForRecurrence,
} from "@/features/import/importBillCycle";
import { getTodayIsoDate } from "@/features/app/homeData";
import type { PaycheckService } from "@/features/paychecks/services";

import { parseCsvImportSuggestions } from "./CsvImportParser";

type ImportServiceOptions = {
  createImportSessionId?: () => string;
};

export class ImportService {
  private readonly options: ImportServiceOptions;
  private readonly paycheckService: PaycheckService | null;

  constructor(
    private readonly importSuggestionRepository: ImportSuggestionRepository,
    private readonly billService: BillService,
    paycheckServiceOrOptions: PaycheckService | ImportServiceOptions = {},
    options: ImportServiceOptions = {}
  ) {
    if (isPaycheckService(paycheckServiceOrOptions)) {
      this.paycheckService = paycheckServiceOrOptions;
      this.options = options;
    } else {
      this.paycheckService = null;
      this.options = paycheckServiceOrOptions;
    }
  }

  async importCsvText({
    csvText,
    profileId,
  }: {
    csvText: string;
    profileId: string;
  }): Promise<{
    importSessionId: string;
    suggestions: ImportSuggestion[];
  }> {
    if (!profileId.trim()) {
      throw new Error("CSV import requires a profileId.");
    }

    return this.importStatementText({
      profileId,
      statementText: csvText,
    });
  }

  async importStatementText({
    includeSingleOccurrenceCandidates = false,
    parseAsStatementText = false,
    profileId,
    statementText,
  }: {
    includeSingleOccurrenceCandidates?: boolean;
    parseAsStatementText?: boolean;
    profileId: string;
    statementText: string;
  }): Promise<{
    importSessionId: string;
    suggestions: ImportSuggestion[];
  }> {
    if (!profileId.trim()) {
      throw new Error("Statement import requires a profileId.");
    }

    const importSessionId = this.createImportSessionId();
    const candidates = parseCsvImportSuggestions(statementText, {
      includeSingleOccurrenceCandidates,
      parseAsStatementText,
    });
    const suggestions: ImportSuggestion[] = [];

    for (const candidate of candidates) {
      suggestions.push(
        await this.importSuggestionRepository.create({
          profileId,
          suggestedName: candidate.suggestedName,
          suggestedAmountCents: candidate.suggestedAmountCents,
          suggestionKind: candidate.suggestionKind,
          suggestedDate: candidate.suggestedDate,
          detectedInterval: candidate.detectedInterval,
          occurrenceCount: candidate.occurrenceCount,
          importSessionId,
        })
      );
    }

    return {
      importSessionId,
      suggestions,
    };
  }

  async getPendingSuggestions(profileId: string): Promise<ImportSuggestion[]> {
    if (!profileId.trim()) {
      throw new Error("Pending import suggestions require a profileId.");
    }

    return this.importSuggestionRepository.findPendingByProfile(profileId);
  }

  async getSessionSuggestions(
    importSessionId: string
  ): Promise<ImportSuggestion[]> {
    if (!importSessionId.trim()) {
      throw new Error("Import session suggestions require an importSessionId.");
    }

    return this.importSuggestionRepository.findBySession(importSessionId);
  }

  async clearPendingSuggestions(profileId: string): Promise<void> {
    if (!profileId.trim()) {
      throw new Error("Pending import suggestions require a profileId.");
    }

    await this.importSuggestionRepository.rejectPendingByProfile(profileId);
  }

  async confirmSuggestionAsBill(
    id: string,
    billDetails: {
      billType?: NewBill["billType"];
      cycle?: BillCycleWindow | null;
      dueDateAbsolute?: string | null;
      dueDayOfCycle?: number | null;
      name?: string;
      suggestedAmountCents?: number;
    }
  ): Promise<{
    billId: string;
    suggestion: ImportSuggestion;
  }>;
  async confirmSuggestionAsBill(
    id: string,
    billDetails: {
      billType?: NewBill["billType"];
      cycle?: BillCycleWindow | null;
      dueDateAbsolute?: string | null;
      dueDayOfCycle?: number | null;
      name?: string;
      suggestedAmountCents?: number;
    }
  ): Promise<{
    billId: string;
    suggestion: ImportSuggestion;
  }> {
    const suggestion = await this.importSuggestionRepository.findById(id);

    if (!suggestion) {
      throw new Error(`Import suggestion ${id} not found.`);
    }

    if (suggestion.status !== "pending") {
      throw new Error("Only pending import suggestions can be confirmed.");
    }

    const newBill: NewBill = {
      profileId: suggestion.profileId,
      name: billDetails.name?.trim() || suggestion.suggestedName,
      billType: billDetails.billType ?? "fixed",
      defaultAmountCents:
        billDetails.suggestedAmountCents ?? suggestion.suggestedAmountCents,
      recurrenceInterval: mapSuggestionIntervalToBillInterval(
        suggestion.detectedInterval
      ),
      dueDateAbsolute: billDetails.dueDateAbsolute ?? null,
      dueDayOfCycle: billDetails.dueDayOfCycle ?? null,
      endDate: null,
    };
    const bill = billDetails.cycle
      ? (await this.billService.createBillForCycle(newBill, billDetails.cycle)).bill
      : await this.billService.createBill(newBill);
    const confirmedSuggestion = await this.importSuggestionRepository.confirm(
      suggestion.id,
      bill.id
    );

    return {
      billId: bill.id,
      suggestion: confirmedSuggestion,
    };
  }

  async confirmSuggestionAsIncome(
    id: string,
    incomeDetails: {
      amountCents?: number;
      expectedDate?: string;
      isPrimary?: boolean;
      label?: string;
      recurrenceInterval?: PaycheckRecurrenceInterval | null;
    }
  ): Promise<{
    paycheckId: string;
    suggestion: ImportSuggestion;
  }> {
    const suggestion = await this.importSuggestionRepository.findById(id);

    if (!suggestion) {
      throw new Error(`Import suggestion ${id} not found.`);
    }

    if (suggestion.status !== "pending") {
      throw new Error("Only pending import suggestions can be confirmed.");
    }

    if (!this.paycheckService) {
      throw new Error("Income import confirmation requires a paycheck service.");
    }

    const recurrenceInterval =
      incomeDetails.recurrenceInterval ??
      mapSuggestionIntervalToPaycheckInterval(suggestion.detectedInterval);
    const today = getTodayIsoDate();
    const paycheck = await this.paycheckService.createPaycheck({
      profileId: suggestion.profileId,
      label: incomeDetails.label?.trim() || suggestion.suggestedName,
      amountCents: incomeDetails.amountCents ?? suggestion.suggestedAmountCents,
      expectedDate:
        incomeDetails.expectedDate ??
        getDefaultImportIncomeExpectedDateForRecurrence({
          detectedInterval: suggestion.detectedInterval,
          recurrenceInterval,
          suggestedDate: suggestion.suggestedDate,
          today,
        }),
      isPrimary: incomeDetails.isPrimary ?? true,
      isReceived: false,
      isRecurring: recurrenceInterval != null,
      recurrenceInterval,
    });
    const confirmedSuggestion =
      await this.importSuggestionRepository.confirmIncome(suggestion.id);

    return {
      paycheckId: paycheck.id,
      suggestion: confirmedSuggestion,
    };
  }

  async rejectSuggestion(id: string): Promise<ImportSuggestion> {
    const suggestion = await this.importSuggestionRepository.findById(id);

    if (!suggestion) {
      throw new Error(`Import suggestion ${id} not found.`);
    }

    if (suggestion.status !== "pending") {
      throw new Error("Only pending import suggestions can be rejected.");
    }

    return this.importSuggestionRepository.reject(id);
  }

  async autoConfirmPendingBillSuggestions({
    cycle = null,
    profileId,
    resolveDueDate,
  }: {
    cycle?: BillCycleWindow | null;
    profileId: string;
    resolveDueDate: (suggestion: ImportSuggestion) => string;
  }): Promise<number> {
    const pendingSuggestions = await this.getPendingSuggestions(profileId);
    let confirmedCount = 0;

    for (const suggestion of pendingSuggestions) {
      if (suggestion.suggestionKind !== "bill") {
        continue;
      }

      await this.confirmSuggestionAsBill(suggestion.id, {
        cycle,
        dueDateAbsolute: resolveDueDate(suggestion),
        name: suggestion.suggestedName,
        suggestedAmountCents: suggestion.suggestedAmountCents,
      });
      confirmedCount += 1;
    }

    return confirmedCount;
  }

  async autoConfirmPendingIncomeSuggestions({
    profileId,
    resolveExpectedDate,
  }: {
    profileId: string;
    resolveExpectedDate: (suggestion: ImportSuggestion) => string;
  }): Promise<number> {
    const pendingSuggestions = await this.getPendingSuggestions(profileId);
    let confirmedCount = 0;

    for (const suggestion of pendingSuggestions) {
      if (suggestion.suggestionKind !== "income") {
        continue;
      }

      await this.confirmSuggestionAsIncome(suggestion.id, {
        amountCents: suggestion.suggestedAmountCents,
        expectedDate: resolveExpectedDate(suggestion),
        label: suggestion.suggestedName,
        recurrenceInterval: mapSuggestionIntervalToPaycheckInterval(
          suggestion.detectedInterval
        ),
      });
      confirmedCount += 1;
    }

    return confirmedCount;
  }

  private createImportSessionId() {
    if (this.options.createImportSessionId) {
      return this.options.createImportSessionId();
    }

    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }

    throw new Error("No import session idFactory was provided.");
  }
}

function isPaycheckService(
  value: PaycheckService | ImportServiceOptions
): value is PaycheckService {
  return "createPaycheck" in value;
}

function mapSuggestionIntervalToPaycheckInterval(
  interval: ImportSuggestion["detectedInterval"]
): PaycheckRecurrenceInterval | null {
  switch (interval) {
    case "weekly":
    case "biweekly":
    case "monthly":
      return interval;
    case "quarterly":
    case "irregular":
      return null;
  }
}

function mapSuggestionIntervalToBillInterval(
  interval: ImportSuggestion["detectedInterval"]
) {
  switch (interval) {
    case "weekly":
    case "biweekly":
    case "monthly":
    case "quarterly":
      return interval;
    case "irregular":
      return "monthly";
  }
}
